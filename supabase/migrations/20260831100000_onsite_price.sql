-- 현장 예매 가격 — 온라인 예매 가격과 다르게 받을 수 있다.
-- NULL이면 온라인 가격(events.price)과 동일한 것으로 본다.
-- ⚠️ 코드 배포 **전에** 반드시 적용할 것 — 새 코드가 lib/event-access.ts 등에서
-- onsite_price를 명시적으로 select하므로, 컬럼이 없으면 주최자 액션 전반이 실패한다.

alter table public.events
  add column if not exists onsite_price integer
  check (onsite_price is null or onsite_price >= 0);

comment on column public.events.onsite_price is
  '현장 예매 1매 가격(원). NULL이면 price와 동일. 현장 예매(create_onsite_booking) 금액 안내에만 쓰인다.';
