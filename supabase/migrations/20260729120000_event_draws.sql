-- 현장 추첨 기록 (라운드별 당첨자 1행)
--
-- 적용 방법: Supabase 대시보드 SQL Editor에서 전체 실행 또는 `supabase db push`
--
-- 왜 저장하는가: "추첨은 여러 번, 이전 당첨자 제외 여부를 고른다"가 요구사항이라
-- 회차와 당첨자가 새로고침·재접속을 넘어 남아야 한다. 현장 분쟁 시 근거도 된다.
-- 추첨 자체는 서버(node:crypto)에서 수행한다.
--
-- booking_no를 함께 스냅샷으로 남긴다 — 예매가 삭제되면 booking_id는 사라지지만
-- "몇 번이 당첨됐다"는 기록은 유지되어야 한다.

create table if not exists public.event_draws (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  booking_no integer not null,
  round      integer not null,
  created_at timestamptz not null default now()
);

create index if not exists event_draws_event_round_idx
  on public.event_draws (event_id, round);

alter table public.event_draws enable row level security;

-- 주최자만 자기 스테이지의 추첨 기록을 읽고 쓴다. UPDATE 정책은 열지 않는다(기록 불변) —
-- 다시 뽑고 싶으면 회차를 더하거나 DELETE로 초기화한다.
drop policy if exists event_draws_select_host on public.event_draws;
create policy event_draws_select_host on public.event_draws
  for select to authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = event_draws.event_id
        and e.performer_id = auth.uid()
    )
  );

drop policy if exists event_draws_insert_host on public.event_draws;
create policy event_draws_insert_host on public.event_draws
  for insert to authenticated
  with check (
    exists (
      select 1 from public.events e
      where e.id = event_draws.event_id
        and e.performer_id = auth.uid()
    )
  );

drop policy if exists event_draws_delete_host on public.event_draws;
create policy event_draws_delete_host on public.event_draws
  for delete to authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = event_draws.event_id
        and e.performer_id = auth.uid()
    )
  );
