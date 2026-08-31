-- 예매 1매당 적용 단가를 예매 행에 남긴다.
--
-- 왜 필요한가: 현장 예매 가격(events.onsite_price)이 생기면서 "이 예매에 얼마가
-- 적용됐는가"를 스테이지 가격만으로는 알 수 없게 됐다. 하류 로직(셀프 취소 차단,
-- 명단 금액, CSV, 환불 금액)이 전부 events.price로 추정하는 바람에
--   · 현장에서 15,000원을 받고 확정한 예약이 "무료 예약"으로 판정돼 셀프 취소가 열리고
--   · 정산 금액이 온라인 가격으로 집계되는
-- 결함이 생겼다. 단가를 예매 시점에 못 박아 추정을 없앤다.
--
-- ⚠️ 코드 배포 **전에** 적용할 것 — 새 코드가 bookings.unit_price를 읽는다.

alter table public.bookings
  add column if not exists unit_price integer
  check (unit_price is null or unit_price >= 0);

comment on column public.bookings.unit_price is
  '이 예매에 적용된 1매 단가(원). 예매 시점에 확정한다. 공개 예매는 events.price, 현장 예매는 coalesce(events.onsite_price, events.price). 과거 행은 events.price로 백필.';

-- 기존 예매 백필 — onsite_price 도입 전에는 현장 예매도 온라인 가격을 받았으므로
-- events.price가 역사적으로 정확하다.
update public.bookings b
set unit_price = e.price
from public.events e
where e.id = b.event_id
  and b.unit_price is null;

-- ── 공개 예매: 온라인 가격을 적용 ──────────────────────────────────────────────
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
  v_price integer;
  v_booked integer;
  v_booking_id uuid;
begin
  if p_quantity < 1 or p_quantity > 20 then
    raise exception 'INVALID_QUANTITY';
  end if;

  select capacity, status, price into v_capacity, v_status, v_price
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
    depositor_name, deposited_at, quantity, custom_answers, status, unit_price
  ) values (
    p_event_id, p_user_id, p_name, p_email, p_password_hash,
    p_depositor_name, p_deposited_at, p_quantity, p_custom_answers, p_status, v_price
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

-- ── 현장 예매: 현장 가격을 적용 (미설정이면 온라인 가격) ──────────────────────
create or replace function public.create_onsite_booking(
  p_event_id uuid,
  p_name text,
  p_email text,
  p_password_hash text,
  p_quantity integer,
  p_status text,
  p_allow_duplicate boolean,
  p_custom_answers jsonb
) returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_capacity integer;
  v_price integer;
  v_booked integer;
  v_booking_id uuid;
begin
  if p_quantity < 1 or p_quantity > 20 then
    raise exception 'INVALID_QUANTITY';
  end if;

  if p_status not in ('pending', 'confirmed') then
    raise exception 'INVALID_STATUS';
  end if;

  -- 이벤트 행 잠금 — 공개 예매와 좌석 경쟁을 직렬화
  select capacity, coalesce(onsite_price, price)
    into v_capacity, v_price
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
    depositor_name, deposited_at, quantity, custom_answers, status, unit_price
  ) values (
    p_event_id, null, p_name, p_email, p_password_hash,
    p_name, '현장 예매', p_quantity, p_custom_answers, p_status, v_price
  )
  returning id into v_booking_id;

  insert into booking_tickets (booking_id, ticket_number)
  select v_booking_id, gs
  from generate_series(1, p_quantity) as gs;

  return v_booking_id;
end;
$$;

revoke all on function public.create_onsite_booking(
  uuid, text, text, text, integer, text, boolean, jsonb
) from public, anon, authenticated;
