-- Supabase Storage 버킷 생성
insert into storage.buckets (id, name, public)
values ('underline-images', 'underline-images', true)
on conflict (id) do nothing;

-- 인증된 사용자만 자신의 폴더에 업로드 가능
create policy "사용자 본인 이미지 업로드"
on storage.objects for insert
with check (
  bucket_id = 'underline-images'
  and auth.uid()::text = split_part(name, '/', 1)
);

-- 누구나 이미지 조회 가능 (public 버킷)
create policy "누구나 이미지 조회"
on storage.objects for select
using (bucket_id = 'underline-images');

-- 본인 이미지만 삭제 가능
create policy "사용자 본인 이미지 삭제"
on storage.objects for delete
using (
  bucket_id = 'underline-images'
  and auth.uid()::text = split_part(name, '/', 1)
);
