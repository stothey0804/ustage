-- 스테이지별 예매 순번 (bookings.booking_no)
--
-- 적용 방법: Supabase 대시보드 SQL Editor에서 전체 실행 또는 `supabase db push`
--
-- 왜 카운터 + 트리거인가:
-- 1) 예매 생성 경로가 셋(create_booking RPC / api 비원자 폴백 / create_onsite_booking)이라
--    번호 부여를 코드 세 곳에 중복하지 않으려면 DB가 채우는 편이 안전하다.
-- 2) max(booking_no)+1 대신 events.booking_seq 카운터를 쓴다 — 마지막 예매가 삭제돼도
--    번호를 재사용하지 않는다. 추첨 기록(event_draws)이 번호를 근거로 남기 때문에
--    같은 번호가 다른 사람에게 다시 붙으면 안 된다.
-- 3) 트리거의 `update events ... returning`이 이벤트 행 잠금을 잡아 같은 스테이지의
--    동시 INSERT를 직렬화한다. create_booking은 이미 같은 행을 FOR UPDATE로 잠근
--    트랜잭션 안이라 충돌하지 않는다. (event_id, booking_no) 유니크가 백스톱.
-- 4) 취소된 예매도 번호를 유지한다 — 순번은 "예매 순서" 기록이다.

alter table public.events
  add column if not exists booking_seq integer not null default 0;

alter table public.bookings
  add column if not exists booking_no integer;

-- 기존 예매 backfill: 스테이지별 created_at 오름차순.
-- created_at이 같거나 NULL인 행은 id로 안정 정렬한다 — 데이터만으로는 실제 접수 순서를
-- 더 정확히 복원할 방법이 없다(한계를 남겨둔다).
with numbered as (
  select id,
         row_number() over (
           partition by event_id
           order by created_at asc nulls first, id asc
         ) as rn
  from public.bookings
)
update public.bookings b
set booking_no = n.rn
from numbered n
where b.id = n.id
  and b.booking_no is null;

update public.events e
set booking_seq = coalesce(
  (select max(b.booking_no) from public.bookings b where b.event_id = e.id),
  0
);

alter table public.bookings
  alter column booking_no set not null;

create unique index if not exists bookings_event_booking_no_uniq
  on public.bookings (event_id, booking_no);

-- security definer: 예매 INSERT는 현재 전부 service_role 경유지만, 나중에 다른 롤로
-- INSERT를 열더라도 카운터 증분(events UPDATE)이 RLS에 막히지 않도록 소유자 권한으로
-- 실행한다. 하는 일은 해당 이벤트의 카운터 +1 뿐이다.
create or replace function public.assign_booking_no()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.booking_no is null then
    update events
    set booking_seq = booking_seq + 1
    where id = new.event_id
    returning booking_seq into new.booking_no;

    if new.booking_no is null then
      raise exception 'EVENT_NOT_FOUND';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_assign_no on public.bookings;
create trigger bookings_assign_no
  before insert on public.bookings
  for each row execute function public.assign_booking_no();
