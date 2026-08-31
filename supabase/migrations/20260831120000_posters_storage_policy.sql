-- 포스터 Storage 버킷 정책을 코드로 버전관리한다.
--
-- 지금까지 이 설정은 Supabase 대시보드에만 있어 저장소에서 확인할 수 없었다.
-- 브라우저가 anon 키로 직접 업로드하는 구조라(EventForm), 타입·크기·경로 제약이
-- 클라이언트 코드에만 있으면 실질적인 방어가 아니다 — Storage API를 직접 호출하면
-- 임의 파일을 임의 경로에 올릴 수 있다. 아래 정책이 서버 측 강제를 담당한다.
--
-- 적용은 멱등하다. 이미 대시보드에서 같은 설정을 해 뒀다면 값이 덮어써질 뿐이다.

-- 버킷 — 공개 읽기(예매 페이지·OG 이미지가 URL로 가져간다),
-- 업로드는 이미지 타입만, 파일당 20MB 상한(클라이언트 검증과 같은 값).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'posters',
  'posters',
  true,
  20971520,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- 읽기: 누구나 (버킷이 public이라 URL로도 열리지만 정책을 명시해 둔다)
drop policy if exists posters_read_public on storage.objects;
create policy posters_read_public
  on storage.objects
  for select
  to public
  using (bucket_id = 'posters');

-- 업로드: 로그인 사용자가 **자기 폴더(<uid>/…)에만**.
-- EventForm이 `${userId}/${timestamp}.jpg` 경로를 쓰는데, 그 규칙이 클라이언트에만
-- 있으면 남의 폴더에 올리는 것을 막지 못한다.
drop policy if exists posters_insert_own on storage.objects;
create policy posters_insert_own
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'posters'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 수정·삭제: 자기 폴더의 파일만. (교체·정리 흐름이 remove를 호출한다)
drop policy if exists posters_update_own on storage.objects;
create policy posters_update_own
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'posters'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'posters'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists posters_delete_own on storage.objects;
create policy posters_delete_own
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'posters'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
