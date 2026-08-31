-- 추첨 회차를 원자적으로 발급한다.
--
-- 지금까지는 코드가 `max(round) + 1`을 읽어 썼다. 소유자와 스태프가 동시에 추첨하면
-- 둘 다 같은 회차를 읽어 저장하고((event_id, round, ticket_id) UNIQUE는 티켓이 다르면
-- 통과한다), 서로 다른 두 번의 추첨이 한 회차로 합쳐진 기록이 남는다.
-- 현장 분쟁의 근거로 쓰는 기록이라 회차가 섞이면 안 된다.
--
-- events 행에 카운터를 두고 UPDATE ... RETURNING으로 발급하면 행 잠금이 동시 호출을
-- 직렬화해 같은 번호가 두 번 나오지 않는다.

alter table public.events
  add column if not exists draw_seq integer not null default 0;

comment on column public.events.draw_seq is
  '추첨 회차 발급 카운터. next_draw_round()가 증분해 반환한다. 기록 초기화 시 0으로 되돌린다.';

-- 기존 스테이지는 지금까지 쌓인 최대 회차로 맞춘다 (이어서 발급되도록)
update public.events e
set draw_seq = coalesce(
  (select max(d.round) from public.event_draws d where d.event_id = e.id),
  0
)
where e.draw_seq = 0;

create or replace function public.next_draw_round(p_event_id uuid)
returns integer
language sql
set search_path = public
as $$
  update events
  set draw_seq = draw_seq + 1
  where id = p_event_id
  returning draw_seq;
$$;

-- service_role 전용 — 서버 액션이 추첨 권한을 먼저 확인한다
revoke all on function public.next_draw_round(uuid) from public, anon, authenticated;
