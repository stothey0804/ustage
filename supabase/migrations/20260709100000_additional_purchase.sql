-- 추가 구매 지원: 동일 이메일 중복 예매를 "허용 플래그"가 있을 때만 허용
--
-- 적용 방법: Supabase 대시보드 SQL Editor에서 전체 실행 또는 `supabase db push`
--
-- 변경 내용:
-- 1) (event_id, lower(email)) 부분 유니크 인덱스 제거
--    — 추가 구매는 같은 이메일의 예약을 하나 더 만드는 방식이라 인덱스와 공존 불가.
-- 2) 중복 검사를 create_booking 함수 내부로 이동.
--    함수 전체가 이벤트 행 FOR UPDATE 잠금으로 직렬화되므로
--    함수 안의 검사-후-삽입은 레이스 없이 안전하다 (인덱스 백스톱 불필요).
-- 3) p_allow_duplicate 파라미터 추가 — true(추가 구매, 서버에서 본인 확인 후)일 때만
--    중복 검사를 건너뛴다.

drop index if exists public.bookings_event_email_active_uniq;

-- 시그니처가 바뀌므로(파라미터 추가) 기존 함수를 제거 후 재생성.
-- default 파라미터로 두 시그니처가 공존하면 PostgREST 호출이 모호해지는 문제 방지.
drop function if exists public.create_booking(
  uuid, uuid, text, text, text, text, text, integer, jsonb, text
);

create function public.create_booking(
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

  -- 동일 이메일 중복 예매 차단 (추가 구매 경로만 예외)
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

-- 새 함수이므로 실행 권한 재설정 (service_role 전용)
revoke all on function public.create_booking(
  uuid, uuid, text, text, text, text, text, integer, jsonb, text, boolean
) from public, anon, authenticated;
