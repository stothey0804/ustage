-- 현장 예매: 주최자가 명단에서 비회원 예매를 대신 만든다.
--
-- 적용 방법: Supabase 대시보드 SQL Editor에서 전체 실행 또는 `supabase db push`
--
-- create_booking을 고치지 않고 별도 함수를 두는 이유:
--   현장 예매는 행사 당일(보통 closed/ended)에 쓰므로 `status = 'open'` 검사를 통과할 수
--   없다. 기존 함수에 플래그를 더하면 시그니처가 바뀌어 호출부·PostgREST 캐시까지
--   흔들리므로, 상태 검사만 뺀 별도 함수로 분리한다.
--
-- 그대로 유지하는 것: 이벤트 행 FOR UPDATE 잠금(참석자 동시 예매와 직렬화),
--   정원 검사(좌석은 물리적 제약이라 주최자도 초과 불가), 중복 이메일 검사,
--   quantity 범위, 티켓 생성. booking_no는 bookings_assign_no 트리거가 채운다.
--
-- 호출 전에 서버 액션이 반드시 이벤트 소유자를 확인한다(이 함수는 권한을 검사하지 않음).

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

  -- 이벤트 행 잠금 — 공개 예매와 좌석 경쟁을 직렬화
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
    select coalesce(sum(quantity), 0) into v_booked
    from bookings
    where event_id = p_event_id
      and status != 'cancelled';

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

-- service_role만 호출한다 (서버 액션에서 소유자 확인 후 admin 클라이언트로 호출)
revoke all on function public.create_onsite_booking(
  uuid, text, text, text, integer, text, boolean
) from public, anon, authenticated;
