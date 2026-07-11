-- RLS 정책 리셋 — events / bookings / booking_tickets
--
-- 적용 방법: Supabase 대시보드 SQL Editor에서 전체 실행 또는 `supabase db push`
--
-- 왜 필요한가:
--   20260711120000_rls_policies.sql 적용 후 익명 검증에서 다음이 확인됨.
--     • booking_tickets 익명 SELECT 로 모든 qr_token 이 노출됨
--     • bookings / booking_tickets 익명 INSERT 가 통과됨 (RLS 거부 42501 이 아닌 컬럼 제약 23502)
--   원인: 예전 설계("bookings INSERT 누구나 가능", 공개 QR 조회)의 느슨한 정책이
--   테이블에 남아 있었고, PostgreSQL RLS 정책은 OR 로 결합되므로 새 제한 정책을 무력화했다.
--   앞선 마이그레이션은 "자기가 만든 이름"의 정책만 교체해 예전 정책을 지우지 못했다.
--
-- 이 마이그레이션은 세 테이블의 **모든 기존 정책을 이름과 무관하게 제거**한 뒤,
-- 실제 코드 접근 경로에 맞는 정책만 재정의한다. 적용 후 이 파일이 정책의 단일 출처가 된다.
--
-- 접근 경로 요약(이 정책들이 커버해야 하는 전부):
--   • 예매 생성/티켓 생성/비회원 조회/QR 체크인/잔여석 합산/자동 상태전환/rate limit
--     → 전부 service_role(admin) 경유. service_role 은 bypassrls 이므로 정책과 무관하게 허용.
--   • 브라우저 anon 클라이언트는 auth/storage 만 사용 — 이 세 테이블 직접 접근 없음.
--   • cookie 서버 클라이언트: events 공개 SELECT + 로그인 소유자/본인 한정 접근만.

-- ---------------------------------------------------------------------------
-- 0) 세 테이블의 기존 정책 전부 제거 (이름 불명이어도 동적으로 삭제)
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in ('events', 'bookings', 'booking_tickets')
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- ===========================================================================
-- events — 누구나 SELECT(공개 예매 페이지), CUD 는 소유자만
-- ===========================================================================
alter table public.events enable row level security;

create policy events_select_public
  on public.events
  for select
  using (true);

create policy events_insert_own
  on public.events
  for insert
  to authenticated
  with check (performer_id = auth.uid());

create policy events_update_own
  on public.events
  for update
  to authenticated
  using (performer_id = auth.uid())
  with check (performer_id = auth.uid());

create policy events_delete_own
  on public.events
  for delete
  to authenticated
  using (performer_id = auth.uid());

-- ===========================================================================
-- bookings — 익명·INSERT 는 service_role 전용(정책 없음 = deny).
--   SELECT: 본인(user_id) 또는 자기 이벤트 주최자. UPDATE/DELETE: 주최자만.
-- ===========================================================================
alter table public.bookings enable row level security;

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
-- booking_tickets — 익명·생성·본인 QR·체크인·비회원 조회는 service_role 전용.
--   cookie 접근은 주최자 명단 조회(SELECT)와 강제 체크인(UPDATE)뿐 → 주최자만 허용.
--   ※ 익명 SELECT 를 반드시 막아야 qr_token 열람(위조 QR 입장)을 차단한다.
-- ===========================================================================
alter table public.booking_tickets enable row level security;

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

-- rate_limits 는 이미 RLS 활성이며 service_role 전용 → 정책 불필요.
