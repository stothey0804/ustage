-- 인원(티켓) 단위 예매번호
--
-- 적용 방법: Supabase 대시보드 SQL Editor에서 전체 실행 또는 `supabase db push`
-- **반드시 새 코드 배포 전에 적용한다** — 새 코드가 booking_tickets.attendee_no를 조회한다.
--
-- 무엇이 바뀌나:
--   예매번호는 예매 1건이 아니라 **사람 1명(티켓 1장)**당 하나다.
--   1번째 예매자 1매 → #1 / 2번째 예매자 2매 → #2, #3 / 3번째 예매자 1매 → #4
--
-- 설계 — "범위 예약":
--   1) bookings_assign_no 트리거가 events.booking_seq를 quantity만큼 증분해 예매에
--      연속 번호 범위를 예약하고, bookings.booking_no에 그 **첫 번호**를 넣는다.
--   2) 각 티켓 번호는 attendee_no = booking_no + ticket_number - 1로 **계산**된다.
--      행 순서에 의존하지 않으므로 create_booking / create_onsite_booking의
--      `insert ... select generate_series(...)`와 API의 비원자 폴백 경로 모두
--      **코드 수정 없이** 정확한 번호를 얻는다.
--   3) 스테이지별 유일성은 (a) events 행 잠금으로 범위가 겹치지 않고
--      (b) (booking_id, ticket_number) UNIQUE + 범위 검증으로 범위 안이 겹치지 않아
--      booking_tickets에 event_id를 비정규화하지 않고도 보장된다.
--
-- 전 구간 재실행 안전(idempotent)하게 작성했다.

-- ─────────────────────────────────────────────
-- 1) 예매 트리거: 카운터를 quantity만큼 증분해 범위를 예약
-- ─────────────────────────────────────────────
create or replace function public.assign_booking_no()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.booking_no is null then
    update events
    set booking_seq = booking_seq + greatest(new.quantity, 1)
    where id = new.event_id
    returning booking_seq - greatest(new.quantity, 1) + 1 into new.booking_no;

    if new.booking_no is null then
      raise exception 'EVENT_NOT_FOUND';
    end if;
  end if;
  return new;
end;
$$;

-- ─────────────────────────────────────────────
-- 2) 티켓 번호 컬럼 + 채움 트리거
-- ─────────────────────────────────────────────
alter table public.booking_tickets
  add column if not exists attendee_no integer;

create or replace function public.assign_attendee_no()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_first integer;
  v_quantity integer;
begin
  if new.attendee_no is null then
    select booking_no, quantity into v_first, v_quantity
    from bookings
    where id = new.booking_id;

    if v_first is null then
      raise exception 'BOOKING_NOT_FOUND';
    end if;

    -- 예매가 예약한 범위를 벗어난 ticket_number는 다른 예매의 번호를 침범한다
    if new.ticket_number < 1 or new.ticket_number > v_quantity then
      raise exception 'INVALID_TICKET_NUMBER';
    end if;

    new.attendee_no := v_first + new.ticket_number - 1;
  end if;
  return new;
end;
$$;

drop trigger if exists booking_tickets_assign_attendee_no on public.booking_tickets;
create trigger booking_tickets_assign_attendee_no
  before insert on public.booking_tickets
  for each row execute function public.assign_attendee_no();

-- 예매 안에서 ticket_number 중복 금지 (attendee_no 유일성의 절반)
create unique index if not exists booking_tickets_booking_ticket_uniq
  on public.booking_tickets (booking_id, ticket_number);

-- ─────────────────────────────────────────────
-- 3) 기존 데이터 backfill — 인원 단위 연속 번호로 전면 재부여
--    데이터 초기화가 예정되어 있어 "원래 순서 복원"보다 정합성·재실행 안전을 우선한다.
--    이미 발송된 메일의 번호와는 어긋날 수 있다(사용자 확인된 트레이드오프).
-- ─────────────────────────────────────────────

-- 3-1) 임시 음수화: 한 번의 UPDATE 안에서 (event_id, booking_no) UNIQUE가
--      일시 충돌(새 번호 = 다른 행의 옛 번호)하는 것을 피한다.
update public.bookings set booking_no = -booking_no where booking_no > 0;

-- 3-2) created_at(동률은 id) 순서로 quantity 누적합 → 각 예매의 첫 번호
with numbered as (
  select id,
         1 + coalesce(sum(quantity) over (
               partition by event_id
               order by created_at asc nulls first, id asc
               rows between unbounded preceding and 1 preceding
             ), 0) as first_no
  from public.bookings
)
update public.bookings b
set booking_no = n.first_no
from numbered n
where b.id = n.id;

-- 3-3) 티켓 번호 (결정적 계산이라 몇 번 돌려도 같은 결과)
update public.booking_tickets t
set attendee_no = b.booking_no + t.ticket_number - 1
from public.bookings b
where t.booking_id = b.id
  and t.attendee_no is distinct from b.booking_no + t.ticket_number - 1;

alter table public.booking_tickets
  alter column attendee_no set not null;

-- 3-4) 카운터를 "마지막으로 발급된 인원 번호"로 맞춘다.
--      greatest로 감아서 번호 재사용을 원천 차단한다.
update public.events e
set booking_seq = greatest(
  e.booking_seq,
  coalesce(
    (select max(b.booking_no + b.quantity - 1)
     from public.bookings b
     where b.event_id = e.id),
    0
  )
);

-- ─────────────────────────────────────────────
-- 4) 추첨 기록을 티켓 단위로 확장
--    booking_no는 구 코드 호환을 위해 남기고 NOT NULL만 푼다(쓰기는 중단).
-- ─────────────────────────────────────────────
alter table public.event_draws
  add column if not exists ticket_id uuid
    references public.booking_tickets(id) on delete set null,
  add column if not exists attendee_no integer;

-- 기존 기록(예매 단위 추첨)은 대표 번호를 승계한 뒤, 살아있는 예매는 새 번호로 갱신
update public.event_draws set attendee_no = booking_no where attendee_no is null;
update public.event_draws d
set attendee_no = b.booking_no
from public.bookings b
where d.booking_id = b.id;

alter table public.event_draws alter column attendee_no set not null;
alter table public.event_draws alter column booking_no drop not null;

-- 같은 회차에 같은 티켓이 두 번 저장되는 것만 막는다
-- (회차를 넘긴 재당첨은 '이전 당첨자 제외'를 끈 경우의 의도된 동작이라 막지 않는다)
create unique index if not exists event_draws_round_ticket_uniq
  on public.event_draws (event_id, round, ticket_id)
  where ticket_id is not null;
