-- 현장 예매도 커스텀 필드 답변을 받는다.
--
-- 적용 방법: Supabase 대시보드 SQL Editor에서 전체 실행 또는 `supabase db push`
-- **반드시 새 코드 배포 전에 적용한다** — 새 코드가 p_custom_answers를 넘긴다.
--
-- 왜 필요한가: create_onsite_booking이 custom_answers를 null로 하드코딩해서,
-- 주최자가 현장에서 만든 예매만 커스텀 답변이 비어 있었다. 필수 항목이 있는
-- 스테이지에서도 그 답변이 영구히 빈 상태로 남는다(예매 수정 UI가 없다).
--
-- 시그니처가 바뀌므로 기존 함수를 제거 후 재생성한다 — default 파라미터로 두 시그니처가
-- 공존하면 PostgREST 호출이 모호해진다(20260709100000에서 같은 이유로 drop 후 생성했다).

drop function if exists public.create_onsite_booking(
  uuid, text, text, text, integer, text, boolean
);

create function public.create_onsite_booking(
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
    p_name, '현장 예매', p_quantity, p_custom_answers, p_status
  )
  returning id into v_booking_id;

  insert into booking_tickets (booking_id, ticket_number)
  select v_booking_id, gs
  from generate_series(1, p_quantity) as gs;

  return v_booking_id;
end;
$$;

-- 새 함수이므로 실행 권한 재설정 (service_role 전용 — 서버 액션이 소유자를 먼저 확인한다)
revoke all on function public.create_onsite_booking(
  uuid, text, text, text, integer, text, boolean, jsonb
) from public, anon, authenticated;
