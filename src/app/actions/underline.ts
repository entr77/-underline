"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";

type CreateUnderlineData = {
  bookKakaoId: string;
  bookTitle: string;
  bookAuthor: string;
  bookPublisher?: string;
  bookCoverUrl?: string;
  content: string;
  pageNumber?: number;
  imageUrl?: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

export async function createUnderline(data: CreateUnderlineData) {
  const supabase = await createClient();

  // Check auth
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "로그인이 필요합니다." };
  }

  const adminClient: AnyClient = createAdminClient();

  // 1. Upsert book by kakao_id
  const bookResult = await adminClient
    .from("books")
    .upsert(
      {
        kakao_id: data.bookKakaoId,
        title: data.bookTitle,
        author: data.bookAuthor,
        publisher: data.bookPublisher ?? null,
        cover_url: data.bookCoverUrl ?? null,
      },
      { onConflict: "kakao_id", ignoreDuplicates: false }
    )
    .select("id")
    .single();

  if (bookResult.error || !bookResult.data) {
    console.error("Book upsert error:", bookResult.error);
    return { error: "책 정보를 저장하는 데 실패했습니다." };
  }

  const bookId = (bookResult.data as { id: string }).id;

  // 2. Insert underline (cast supabase client to any to bypass type inference)
  const supabaseAny: AnyClient = supabase;
  const underlineResult = await supabaseAny
    .from("underlines")
    .insert({
      user_id: user.id,
      book_id: bookId,
      content: data.content,
      page_number: data.pageNumber ?? null,
      image_url: data.imageUrl ?? null,
      is_public: true,
    })
    .select("id")
    .single();

  if (underlineResult.error || !underlineResult.data) {
    console.error("Underline insert error:", underlineResult.error);
    return { error: "밑줄을 저장하는 데 실패했습니다." };
  }

  const underlineId = (underlineResult.data as { id: string }).id;

  revalidatePath("/feed");
  return { id: underlineId };
}
