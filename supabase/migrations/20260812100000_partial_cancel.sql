-- 부분(티켓 단위) 취소 — 1차: 주최자·스태프 전용
--
-- 적용 방법: Supabase 대시보드 SQL Editor에서 전체 실행 또는 `supabase db push`
-- **반드시 새 코드 배포 전에 적용한다** — 새 코드가 cancelled_at / cancelled_quantity를 조회한다.
--
-- 왜 이 모델인가 (티켓 행에 취소 표시 + 예매에 취소 매수 비정규화):
--   티켓 행을 지우거나 booking_id를 옮기거나 bookings.quantity를 줄이는 방식은
--   attendee_no = booking_no + ticket_number - 1 계산식, (booking_id, ticket_number) UNIQUE,
--   트리거의 범위 검증, event_draws.ticket_id 링크를 한꺼번에 깨뜨린다.
--   아무것도 지우지 않는 이 방식만 기존 불변식을 전부 보존한다.
--
-- 핵심 규칙:
--   1) bookings.quantity는 **구매 이력값으로 불변**. 유효 매수 = quantity - cancelled_quantity.
--   2) cancelled_quantity는 코드가 아니라 **트리거가 계산**한다(예매 생성 경로가 3개였던 교훈).
--   3) 좌석 점유 = sum(quantity - cancelled_quantity) where status != 'cancelled'.
--      → 이 마이그레이션만 먼저 적용해도 기존 데이터는 cancelled_quantity = 0이라 동작 불변.
--   4) 취소 판정은 항상 OR: 예매 status='cancelled' **또는** 티켓 cancelled_at 존재.
--      기존 전체 취소 예매의 티켓에 cancelled_at을 백필하지 않는다 — 채우면 '누가 언제'가 조작된다.
--   5) 마지막 티켓까지 취소되면 예매를 cancelled로 승격한다. 빼먹으면 중복 이메일 검사가
--      재예매를 영구 차단한다.

-- ─────────────────────────────────────────────
-- 1) 컬럼
-- ─────────────────────────────────────────────
alter table public.booking_tickets
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid;

alter table public.bookings
  add column if not exists cancelled_quantity integer not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'bookings_cancelled_quantity_range'
  ) then
    alter table public.bookings
      add constraint bookings_cancelled_quantity_range
      check (cancelled_quantity >= 0 and cancelled_quantity <= quantity);
  end if;
end $$;

-- 취소되지 않은 티켓만 세는 조회가 잦다
create index if not exists booking_tickets_active_idx
  on public.booking_tickets (booking_id)
  where cancelled_at is null;

-- ─────────────────────────────────────────────
-- 2) cancelled_quantity 동기화 트리거
--    호스트 RLS로 booking_tickets UPDATE가 열려 있어(RPC를 우회한 직접 갱신 가능)
--    카운터의 최후 방어선이 필요하다.
-- ─────────────────────────────────────────────
create or replace function public.sync_cancelled_quantity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking_id uuid;
begin
  v_booking_id := coalesce(new.booking_id, old.booking_id);

  update bookings b
  set cancelled_quantity = (
    select count(*)
    from booking_tickets t
    where t.booking_id = v_booking_id
      and t.cancelled_at is not null
  )
  where b.id = v_booking_id;

  return null;
end;
$$;

drop trigger if exists booking_tickets_sync_cancelled on public.booking_tickets;
create trigger booking_tickets_sync_cancelled
  after insert or delete or update of cancelled_at on public.booking_tickets
  for each row execute function public.sync_cancelled_quantity();

-- ─────────────────────────────────────────────
-- 3) 좌석 점유 계산 — SQL 쪽 단일 출처
--    (TypeScript 쪽 단일 출처는 src/lib/seats.ts)
-- ─────────────────────────────────────────────
create or replace function public.event_booked_seats(p_event_id uuid)
returns integer
language sql
stable
set search_path = public
as $$
  select coalesce(
    sum(greatest(quantity - coalesce(cancelled_quantity, 0), 0)),
    0
  )::integer
  from bookings
  where event_id = p_event_id
    and status != 'cancelled';
$$;

-- ─────────────────────────────────────────────
-- 4) 티켓 취소 RPC (service_role 전용 — 서버 액션이 권한을 먼저 확인한다)
--    입장 처리된 티켓은 취소하지 않는다: "당첨 티켓 = 입장 티켓" 불변식이 깨진다.
--    되돌릴 일은 예매 전체 취소로 처리한다.
-- ─────────────────────────────────────────────
create or replace function public.cancel_booking_tickets(
  p_booking_id uuid,
  p_ticket_ids uuid[],
  p_actor uuid
) returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_status text;
  v_quantity integer;
  v_requested integer := coalesce(array_length(p_ticket_ids, 1), 0);
  v_cancelled integer;
  v_total integer;
  v_promoted boolean := false;
begin
  if v_requested = 0 then
    raise exception 'NO_TICKETS';
  end if;

  -- 예매 행 잠금 — 동시 취소·동시 QR 스캔과 직렬화
  select status, quantity into v_status, v_quantity
  from bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'BOOKING_NOT_FOUND';
  end if;

  if v_status = 'cancelled' then
    raise exception 'ALREADY_CANCELLED';
  end if;

  -- 조건부 갱신: 이미 취소됨 / 입장 처리됨 / 다른 예매의 티켓은 갱신되지 않는다
  update booking_tickets
  set cancelled_at = now(),
      cancelled_by = p_actor
  where booking_id = p_booking_id
    and id = any(p_ticket_ids)
    and cancelled_at is null
    and checked_in = false;

  get diagnostics v_cancelled = row_count;

  if v_cancelled <> v_requested then
    raise exception 'TICKET_NOT_CANCELLABLE';
  end if;

  select count(*) into v_total
  from booking_tickets
  where booking_id = p_booking_id
    and cancelled_at is not null;

  -- 전량 취소 → 예매 자체를 취소로 승격
  if v_total >= v_quantity then
    update bookings
    set status = 'cancelled',
        status_updated_by = p_actor
    where id = p_booking_id;
    v_promoted := true;
  end if;

  return jsonb_build_object(
    'cancelled', v_cancelled,
    'cancelled_total', v_total,
    'remaining', greatest(v_quantity - v_total, 0),
    'promoted', v_promoted
  );
end;
$$;

revoke all on function public.cancel_booking_tickets(uuid, uuid[], uuid)
  from public, anon, authenticated;

-- ─────────────────────────────────────────────
-- 5) 예매 생성 RPC 2종 — 좌석 합산을 event_booked_seats로 교체
--    (그 외 로직은 이전 정의와 동일하게 유지한다)
-- ─────────────────────────────────────────────
create or replace function public.create_booking(
  p_event_id uuid,
  p_user_id uuid,
  p_name text,
  p_email text,
  p_password_hash text,
  p_depositor_name text,
  p_deposited_at text,
  p_quantity integer,
  p_custom_answers jsonb,
  p_status text,
  p_allow_duplicate boolean
) returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_capacity integer;
  v_status text;
  v_booked integer;
  v_booking_id uuid;
begin
  if p_quantity < 1 or p_quantity > 20 then
    raise exception 'INVALID_QUANTITY';
  end if;

  select capacity, status into v_capacity, v_status
  from events
  where id = p_event_id
  for update;

  if not found then
    raise exception 'EVENT_NOT_FOUND';
  end if;

  if v_status != 'open' then
    raise exception 'EVENT_NOT_OPEN';
  end if;

  if not p_allow_duplicate then
    if exists (
      select 1 from bookings
      where event_id = p_event_id
        and lower(email) = lower(p_email)
        and status != 'cancelled'
    ) then
      raise exception 'DUPLICATE_EMAIL';
    end if;
  end if;

  if v_capacity is not null then
    v_booked := event_booked_seats(p_event_id);

    if v_booked + p_quantity > v_capacity then
      raise exception 'CAPACITY_EXCEEDED:%', greatest(v_capacity - v_booked, 0);
    end if;
  end if;

  insert into bookings (
    event_id, user_id, name, email, password_hash,
    depositor_name, deposited_at, quantity, custom_answers, status
  ) values (
    p_event_id, p_user_id, p_name, p_email, p_password_hash,
    p_depositor_name, p_deposited_at, p_quantity, p_custom_answers, p_status
  )
  returning id into v_booking_id;

  insert into booking_tickets (booking_id, ticket_number)
  select v_booking_id, gs
  from generate_series(1, p_quantity) as gs;

  return v_booking_id;
end;
$$;

revoke all on function public.create_booking(
  uuid, uuid, text, text, text, text, text, integer, jsonb, text, boolean
) from public, anon, authenticated;

create or replace function public.create_onsite_booking(
  p_event_id uuid,
  p_name text,
  p_email text,
  p_password_hash text,
  p_quantity integer,
  p_status text,
  p_allow_duplicate boolean
) returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_capacity integer;
  v_booked integer;
  v_booking_id uuid;
begin
  if p_quantity < 1 or p_quantity > 20 then
    raise exception 'INVALID_QUANTITY';
  end if;

  if p_status not in ('pending', 'confirmed') then
    raise exception 'INVALID_STATUS';
  end if;

  select capacity into v_capacity
  from events
  where id = p_event_id
  for update;

  if not found then
    raise exception 'EVENT_NOT_FOUND';
  end if;

  if not p_allow_duplicate then
    if exists (
      select 1 from bookings
      where event_id = p_event_id
        and lower(email) = lower(p_email)
        and status != 'cancelled'
    ) then
      raise exception 'DUPLICATE_EMAIL';
    end if;
  end if;

  if v_capacity is not null then
    v_booked := event_booked_seats(p_event_id);

    if v_booked + p_quantity > v_capacity then
      raise exception 'CAPACITY_EXCEEDED:%', greatest(v_capacity - v_booked, 0);
    end if;
  end if;

  insert into bookings (
    event_id, user_id, name, email, password_hash,
    depositor_name, deposited_at, quantity, custom_answers, status
  ) values (
    p_event_id, null, p_name, p_email, p_password_hash,
    p_name, '현장 예매', p_quantity, null, p_status
  )
  returning id into v_booking_id;

  insert into booking_tickets (booking_id, ticket_number)
  select v_booking_id, gs
  from generate_series(1, p_quantity) as gs;

  return v_booking_id;
end;
$$;

revoke all on function public.create_onsite_booking(
  uuid, text, text, text, integer, text, boolean
) from public, anon, authenticated;
