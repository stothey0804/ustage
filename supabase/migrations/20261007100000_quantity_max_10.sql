-- 예매 1건당 매수 상한 20 → 10 (create_booking / create_onsite_booking)
do $$
declare
  r record;
  def text;
  patched int := 0;
begin
  for r in
    select p.oid
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('create_booking', 'create_onsite_booking')
  loop
    def := pg_get_functiondef(r.oid);
    if position('p_quantity > 20' in def) > 0 then
      execute replace(def, 'p_quantity > 20', 'p_quantity > 10');
      patched := patched + 1;
      raise notice 'patched: %', r.oid::regprocedure;
    end if;
  end loop;

  if patched = 0 then
    raise exception '상한 20 패턴을 찾지 못했습니다 — 변경 없음';
  end if;
end $$;
