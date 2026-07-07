-- 예매 동시성 가드: 정원 초과·중복 예매 레이스 방지
--
-- 적용 방법 (둘 중 하나):
--   1) Supabase 대시보드 → SQL Editor에서 이 파일 전체 실행
--   2) supabase CLI 연결 후 `supabase db push`
--
-- 적용 전 확인: 기존 데이터에 (이벤트, 이메일) 중복이 있으면 1번 인덱스 생성이 실패한다.
-- 아래 조회로 중복을 먼저 찾아 정리할 것:
--   select event_id, lower(email), count(*)
--   from public.bookings
--   where status != 'cancelled'
--   group by 1, 2
--   having count(*) > 1;

-- ---------------------------------------------------------------------------
-- 1) 동일 이벤트 + 동일 이메일 중복 예매 방지 (취소된 예매는 재예매 허용)
--    API의 사전 체크는 read-then-insert라 동시 제출을 못 막는다 — DB 제약이 최종 방어선.
-- ---------------------------------------------------------------------------
create unique index if not exists bookings_event_email_active_uniq
  on public.bookings (event_id, lower(email))
  where status != 'cancelled';

-- ---------------------------------------------------------------------------
-- 2) 정원 검사 + 예매 + 티켓 생성을 단일 트랜잭션으로 처리하는 RPC
--    이벤트 행을 FOR UPDATE로 잠가 같은 이벤트의 동시 예매를 직렬화한다.
--    호출은 service_role 전용 (API Route /api/bookings에서만).
--
--    발생 가능한 예외 (API에서 메시지로 분기):
--      EVENT_NOT_FOUND        이벤트 없음
--      EVENT_NOT_OPEN         open 상태가 아님
--      INVALID_QUANTITY       매수 범위(1~10) 위반
--      CAPACITY_EXCEEDED:<n>  정원 초과 (n = 잔여 좌석)
--      unique_violation(23505) 중복 이메일 (위 인덱스)
-- ---------------------------------------------------------------------------
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
  if p_quantity < 1 or p_quantity > 10 then
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

-- service_role 전용으로 제한 (함수는 기본적으로 PUBLIC에 EXECUTE가 열려 있음)
revoke all on function public.create_booking(
  uuid, uuid, text, text, text, text, text, integer, jsonb, text
) from public, anon, authenticated;
