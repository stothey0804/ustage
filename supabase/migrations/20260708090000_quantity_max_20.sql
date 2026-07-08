-- 예매 매수 상한 10 → 20 (create_booking RPC의 검증만 변경)
--
-- 적용 방법: Supabase 대시보드 SQL Editor에서 전체 실행 또는 `supabase db push`
-- CREATE OR REPLACE는 기존 함수의 실행 권한(service_role 전용)을 유지한다.

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
  p_status text
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

  -- 이벤트 행 잠금: 같은 이벤트의 동시 예매를 직렬화
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

  if v_capacity is not null then
    select coalesce(sum(quantity), 0) into v_booked
    from bookings
    where event_id = p_event_id and status != 'cancelled';

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
