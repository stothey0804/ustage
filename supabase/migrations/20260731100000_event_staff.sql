-- 스테이지별 스태프(공동 관리자)
--
-- 적용 방법: Supabase 대시보드 SQL Editor에서 전체 실행 또는 `supabase db push`
-- **새 코드 배포 전에 적용한다** — 새 코드가 event_staff와 감사 컬럼을 조회한다.
--
-- 설계 요지
--  - 역할은 1종("스태프"). 소규모 공연의 지인 1~2명을 전제로 하고,
--    동작 단위 허용은 코드의 순수 함수(lib/staff-permissions.ts)가 단일 관문으로 판정한다.
--  - RLS는 "무엇을 볼/바꿀 수 있나"의 거친 경계만 담당한다. 소유자 판정을
--    `can_manage_event()` 보안 함수로 감싸 정책 상호 참조(events 정책 ↔ event_staff 정책)로
--    인한 재귀를 원천 차단한다. security definer라 함수 내부는 RLS를 우회한다.
--  - **파괴적 동작은 DB에서도 소유자로 제한한다**(이중 방어):
--    예매 삭제, 이벤트 CUD, 추첨 기록 초기화 정책은 손대지 않는다.
--  - event_staff에는 **쓰기 정책을 만들지 않는다**. 초대·수락·제거는 서버 액션이
--    service_role로만 수행한다 → 스태프가 스태프를 추가하는 권한 상승 경로가 없다.
--
-- 적용 후 수동 확인 (스태프 JWT + anon 키로 REST 직접 호출):
--   1) 남의 스테이지 bookings 조회 → 거부
--   2) 내가 스태프인 스테이지 bookings 조회 → 허용
--   3) bookings DELETE → 거부
--   4) event_staff INSERT → 거부

create table if not exists public.event_staff (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references public.events(id) on delete cascade,
  -- 초대한 이메일. 수락 전에는 이것만 있고, 수락 시 user_id가 채워진다.
  invited_email text not null,
  user_id       uuid references auth.users(id) on delete cascade,
  invite_token  uuid not null default gen_random_uuid(),
  status        text not null default 'pending'
                  check (status in ('pending', 'accepted')),
  expires_at    timestamptz not null default now() + interval '7 days',
  invited_at    timestamptz not null default now(),
  accepted_at   timestamptz
);

create unique index if not exists event_staff_token_key
  on public.event_staff (invite_token);
create unique index if not exists event_staff_event_email_key
  on public.event_staff (event_id, lower(invited_email));
create unique index if not exists event_staff_event_user_key
  on public.event_staff (event_id, user_id)
  where user_id is not null;
-- can_manage_event()의 스태프 판정 경로
create index if not exists event_staff_user_accepted_idx
  on public.event_staff (user_id, event_id)
  where status = 'accepted';

alter table public.event_staff enable row level security;

-- 소유자는 자기 스테이지의 스태프 목록을, 스태프는 자기 행만 읽는다.
drop policy if exists event_staff_select_owner on public.event_staff;
create policy event_staff_select_owner
  on public.event_staff
  for select
  to authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = event_staff.event_id
        and e.performer_id = auth.uid()
    )
  );

drop policy if exists event_staff_select_self on public.event_staff;
create policy event_staff_select_self
  on public.event_staff
  for select
  to authenticated
  using (user_id = auth.uid());

-- INSERT/UPDATE/DELETE 정책 없음 = service_role 전용

-- ---------------------------------------------------------------------------
-- 소유자 or 수락된 스태프 판정. stable + 인덱스 룩업 2회로 끝난다.
-- ---------------------------------------------------------------------------
create or replace function public.can_manage_event(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from events e
    where e.id = p_event_id
      and e.performer_id = auth.uid()
  ) or exists (
    select 1 from event_staff s
    where s.event_id = p_event_id
      and s.user_id = auth.uid()
      and s.status = 'accepted'
  );
$$;

revoke execute on function public.can_manage_event(uuid) from public, anon;
grant execute on function public.can_manage_event(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 감사 추적 최소 컬럼 — 스태프가 생기면 "누가 처리했나"가 분쟁에서 필요해진다.
-- FK를 걸지 않는다: 처리자가 탈퇴해도 기록은 남아야 한다.
-- ---------------------------------------------------------------------------
alter table public.bookings
  add column if not exists status_updated_by uuid;
alter table public.booking_tickets
  add column if not exists checked_in_by uuid;

-- ---------------------------------------------------------------------------
-- 기존 정책 교체: 소유자 → 소유자 or 스태프
-- (events / bookings DELETE / event_draws DELETE 정책은 그대로 = 소유자 전용)
-- ---------------------------------------------------------------------------
drop policy if exists bookings_select_own_or_host on public.bookings;
create policy bookings_select_own_or_host
  on public.bookings
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.can_manage_event(event_id)
  );

drop policy if exists bookings_update_host on public.bookings;
create policy bookings_update_host
  on public.bookings
  for update
  to authenticated
  using (public.can_manage_event(event_id))
  with check (public.can_manage_event(event_id));

drop policy if exists booking_tickets_select_host on public.booking_tickets;
create policy booking_tickets_select_host
  on public.booking_tickets
  for select
  to authenticated
  using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_tickets.booking_id
        and public.can_manage_event(b.event_id)
    )
  );

drop policy if exists booking_tickets_update_host on public.booking_tickets;
create policy booking_tickets_update_host
  on public.booking_tickets
  for update
  to authenticated
  using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_tickets.booking_id
        and public.can_manage_event(b.event_id)
    )
  )
  with check (
    exists (
      select 1 from public.bookings b
      where b.id = booking_tickets.booking_id
        and public.can_manage_event(b.event_id)
    )
  );

drop policy if exists event_draws_select_host on public.event_draws;
create policy event_draws_select_host
  on public.event_draws
  for select
  to authenticated
  using (public.can_manage_event(event_id));

drop policy if exists event_draws_insert_host on public.event_draws;
create policy event_draws_insert_host
  on public.event_draws
  for insert
  to authenticated
  with check (public.can_manage_event(event_id));
