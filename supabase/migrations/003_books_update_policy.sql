-- books 테이블 UPDATE 정책 추가
-- upsert(onConflict) 시 UPDATE가 필요한데 기존에 정책이 없었음
create policy "인증 사용자 책 수정" on public.books
  for update using (auth.uid() is not null);
