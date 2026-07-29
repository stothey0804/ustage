-- 비밀번호 재설정 요청 시 "가입된 계정 이메일인지"를 확인하기 위한 함수.
--
-- auth 스키마는 PostgREST로 조회할 수 없어 security definer 함수로 감싼다.
-- 반환값은 boolean 하나뿐이고, 호출 권한은 service_role(서버 액션)만 갖는다.
-- 계정 열거를 막기 위해 anon/authenticated에는 execute를 주지 않는다.
--
-- user_metadata.contact_email은 사용자가 스스로 수정할 수 있어 신뢰 경계가
-- 아니므로 여기서는 보지 않는다 — 재설정 링크는 계정 이메일로만 나간다.

create or replace function public.account_email_exists(p_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from auth.users u
    where lower(u.email) = lower(trim(p_email))
      and u.deleted_at is null
  );
$$;

revoke all on function public.account_email_exists(text) from public;
revoke all on function public.account_email_exists(text) from anon;
revoke all on function public.account_email_exists(text) from authenticated;
grant execute on function public.account_email_exists(text) to service_role;

comment on function public.account_email_exists(text) is
  '계정 이메일 존재 여부. service_role 전용 — 비밀번호 재설정 요청 검증에 쓴다.';
