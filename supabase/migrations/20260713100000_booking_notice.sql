-- 신청(예매) 폼 상단에 노출할 주의사항 — CKEditor HTML
alter table public.events
  add column if not exists booking_notice text;
