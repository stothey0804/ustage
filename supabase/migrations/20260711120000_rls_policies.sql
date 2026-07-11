-- Row Level Security 정책 — events / bookings / booking_tickets
--
-- 적용 방법 (둘 중 하나):
--   1) Supabase 대시보드 → SQL Editor에서 이 파일 전체 실행
--   2) supabase CLI 연결 후 `supabase db push`
--
-- 배경: 기존에 RLS가 코드(마이그레이션)로 버전관리되지 않아 인가 모델을 검증할 수
--       없었다. anon 키는 클라이언트 번들에 노출되는 공개값이므로, RLS가 없으면
--       누구나 anon 키로 REST API에 직접 질의해 bookings의 PII(email, password_hash 등)를
--       덤프할 수 있다. 이 마이그레이션이 그 방어선을 DB 레벨에서 명시·강제한다.
--
-- 설계 원칙 (실제 코드 접근 경로에 정확히 맞춤):
--   • 예매 생성·티켓 생성·비회원 조회·QR 체크인·잔여석 합산·상태 자동전환·rate limit 은
--     전부 service_role(admin) 경유이며 RLS 를 우회한다 → 정책을 열 필요가 없다.
--   • 브라우저 anon 클라이언트는 auth/storage 만 사용 — 이 세 테이블에 직접 접근하지 않는다.
--   • cookie 기반 서버 클라이언트(서버 컴포넌트/서버 액션)만 RLS 적용 대상이다.
--
-- service_role 은 bypassrls 이므로 아래 정책과 무관하게 모든 접근이 허용된다.

-- ===========================================================================
-- events
--   • SELECT: 누구나(익명 포함) — 공개 예매 페이지 /e/[slug], 예매 API 가 로그인 없이 조회
--   • INSERT/UPDATE/DELETE: 소유자(performer_id = auth.uid())만
--     (상태 자동전환은 service_role 로 우회하므로 익명 UPDATE 를 열지 않는다)
-- ===========================================================================
alter table public.events enable row level security;

drop policy if exists events_select_public on public.events;
create policy events_select_public
  on public.events
  for select
  using (true);

drop policy if exists events_insert_own on public.events;
create policy events_insert_own
  on public.events
  for insert
  to authenticated
  with check (performer_id = auth.uid());

drop policy if exists events_update_own on public.events;
create policy events_update_own
  on public.events
  for update
  to authenticated
  using (performer_id = auth.uid())
  with check (performer_id = auth.uid());

drop policy if exists events_delete_own on public.events;
create policy events_delete_own
  on public.events
  for delete
  to authenticated
  using (performer_id = auth.uid());

-- ===========================================================================
-- bookings
--   • 익명 접근·INSERT 는 전부 service_role 경유이므로 열지 않는다(기본 deny).
--   • SELECT: 본인 예약(user_id = auth.uid()) 또는 자기 이벤트의 주최자
--   • UPDATE/DELETE: 자기 이벤트의 주최자만 (상태변경·비밀번호 초기화·취소)
-- ===========================================================================
alter table public.bookings enable row level security;

drop policy if exists bookings_select_own_or_host on public.bookings;
create policy bookings_select_own_or_host
  on public.bookings
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.events e
      where e.id = bookings.event_id
        and e.performer_id = auth.uid()
    )
  );

drop policy if exists bookings_update_host on public.bookings;
create policy bookings_update_host
  on public.bookings
  for update
  to authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = bookings.event_id
        and e.performer_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.events e
      where e.id = bookings.event_id
        and e.performer_id = auth.uid()
    )
  );

drop policy if exists bookings_delete_host on public.bookings;
create policy bookings_delete_host
  on public.bookings
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = bookings.event_id
        and e.performer_id = auth.uid()
    )
  );

-- ===========================================================================
-- booking_tickets
--   • 생성·본인 QR 표시·체크인·비회원 조회는 전부 service_role 경유이므로 열지 않는다.
--   • cookie 클라이언트 접근은 주최자의 명단 조회(nested SELECT)와 강제 체크인(UPDATE)뿐.
--   • 소속 booking → event 의 주최자(performer_id = auth.uid())에게만 SELECT/UPDATE 허용.
-- ===========================================================================
alter table public.booking_tickets enable row level security;

drop policy if exists booking_tickets_select_host on public.booking_tickets;
create policy booking_tickets_select_host
  on public.booking_tickets
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.bookings b
      join public.events e on e.id = b.event_id
      where b.id = booking_tickets.booking_id
        and e.performer_id = auth.uid()
    )
  );

drop policy if exists booking_tickets_update_host on public.booking_tickets;
create policy booking_tickets_update_host
  on public.booking_tickets
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.bookings b
      join public.events e on e.id = b.event_id
      where b.id = booking_tickets.booking_id
        and e.performer_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.bookings b
      join public.events e on e.id = b.event_id
      where b.id = booking_tickets.booking_id
        and e.performer_id = auth.uid()
    )
  );

-- rate_limits 는 이미 RLS 활성(20260707130000)이며 service_role 만 접근 → 정책 불필요.
