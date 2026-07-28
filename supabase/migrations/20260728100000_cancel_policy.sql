-- 취소·환불 규정 — 신청(예매) 시 안내하고 취소 시 다시 확인시킨다. CKEditor HTML
alter table public.events
  add column if not exists cancel_policy text;
