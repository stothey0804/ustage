-- 스태프·소유자의 예매 쓰기 권한을 **컬럼 단위로** 좁힌다.
--
-- 문제: `bookings_update_host` / `booking_tickets_update_host` 정책은
-- `can_manage_event(event_id)`로 **행**만 통제하고 컬럼 제약이 없다. 게다가 이 두
-- 테이블에는 지금까지 revoke가 없어 Supabase 기본 grant(anon·authenticated에 ALL)가
-- 살아 있다. 그래서 스태프가 앱이 아니라 공개 anon 키 + 본인 JWT로 PostgREST에 직접
-- PATCH를 보내면, 자기가 관리하는 스테이지 범위에서 앱이 지키는 불변식을 우회할 수 있다:
--   · 입장 완료된 티켓에 cancelled_at을 세워 "당첨 티켓 = 입장 티켓"을 깨뜨린다
--     (cancel_booking_tickets RPC와 forceCheckIn이 막는 것을 DB에서 뚫는다)
--   · bookings의 email·name·booking_no·quantity·unit_price·custom_answers·user_id 조작
--   · qr_token·attendee_no 위조
--
-- 해법: RLS는 행, **컬럼 권한은 열**을 담당한다. 둘은 별개 레이어이고 PostgREST는
-- PostgreSQL 권한을 그대로 따르므로, 허용되지 않은 컬럼을 건드리는 요청은
-- `42501 permission denied for column`으로 거절된다. 코드 변경은 필요 없다.
--
-- ⚠️ 아래 컬럼 목록은 **사용자 세션 클라이언트로 UPDATE하는 코드 경로와 짝**이다.
--    이 테이블에 새로 쓰는 컬럼이 생기면 grant를 함께 넓혀야 하고, 빠뜨리면 그 기능이
--    프로덕션에서 403으로 죽는다. 현재 경로(2026-08-31 전수 확인):
--      bookings         : updateBookingStatus/Bulk → status, status_updated_by
--                         resetBookingPassword     → password_hash
--      booking_tickets  : forceCheckIn             → checked_in, checked_in_at, checked_in_by
--    그 밖의 쓰기(취소 API, QR 체크인 API, 부분취소 RPC, 탈퇴 시 user_id 해제)는
--    service_role이라 이 grant와 무관하다.

-- 테이블 전체 UPDATE 회수 — anon은 UPDATE 정책이 아예 없어 실질 영향이 없지만
-- 기본 grant를 남겨둘 이유도 없다(심층 방어).
revoke update on public.bookings from anon, authenticated;
revoke update on public.booking_tickets from anon, authenticated;

-- 앱이 실제로 쓰는 컬럼만 다시 부여
grant update (status, status_updated_by, password_hash)
  on public.bookings to authenticated;

grant update (checked_in, checked_in_at, checked_in_by)
  on public.booking_tickets to authenticated;

-- 적용 확인 (행이 위 목록과 일치해야 한다):
--   select table_name, column_name
--   from information_schema.column_privileges
--   where grantee = 'authenticated' and privilege_type = 'UPDATE'
--     and table_name in ('bookings', 'booking_tickets')
--   order by table_name, column_name;
--
-- 되돌리기(기능이 403으로 막히는 등 문제가 생겼을 때):
--   grant update on public.bookings to authenticated;
--   grant update on public.booking_tickets to authenticated;
