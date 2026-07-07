-- 공개 API rate limit 카운터 (비회원 조회 브루트포스·예매 스팸 방지)
--
-- 적용 방법: Supabase 대시보드 SQL Editor에서 전체 실행 또는 `supabase db push`
-- 호출은 service_role 전용 (src/lib/rate-limit.ts → API Route에서만).

create table if not exists public.rate_limits (
  key          text primary key,   -- 예: "lookup:ip:1.2.3.4", "lookup:acct:<event>:<email>"
  window_start timestamptz not null,
  count        integer not null
);

-- 정책 없이 RLS만 활성화 → service_role 외 접근 차단
alter table public.rate_limits enable row level security;

-- 고정 윈도우 카운터: 윈도우 내 count를 증가시키고 허용 여부를 반환.
-- upsert가 행 잠금으로 직렬화되므로 동시 요청에도 정확하게 센다.
create or replace function public.hit_rate_limit(
  p_key text,
  p_max integer,
  p_window_seconds integer
) returns boolean
language plpgsql
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_allowed boolean;
begin
  insert into rate_limits as rl (key, window_start, count)
  values (p_key, v_now, 1)
  on conflict (key) do update
  set count = case
        when rl.window_start < v_now - make_interval(secs => p_window_seconds)
          then 1
        else rl.count + 1
      end,
      window_start = case
        when rl.window_start < v_now - make_interval(secs => p_window_seconds)
          then v_now
        else rl.window_start
      end
  returning count <= p_max into v_allowed;

  -- 만료 행 누적 방지: 호출 중 약 2% 확률로 하루 지난 카운터 정리
  if random() < 0.02 then
    delete from rate_limits where window_start < v_now - interval '1 day';
  end if;

  return v_allowed;
end;
$$;

revoke all on function public.hit_rate_limit(text, integer, integer)
  from public, anon, authenticated;
