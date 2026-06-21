"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { classifyUnderlineTags } from "@/lib/classifyUnderlineTag";

type CreateUnderlineData = {
  bookKakaoId: string;
  bookTitle: string;
  bookAuthor: string;
  bookPublisher?: string;
  bookCoverUrl?: string;
  bookGenre?: string;
  content: string;
  pageNumber?: number;
  imageUrl?: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

export async function suggestTags(
  contents: string[],
  book: { title: string; author: string }
): Promise<string[]> {
  const results = await classifyUnderlineTags(contents, book);
  // 모든 문장의 태그를 합쳐 중복 제거 후 반환
  const all = results.flat();
  return Array.from(new Set(all));
}

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
        ...(data.bookGenre ? { genre: data.bookGenre } : {}),
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

type BulkCreateData = {
  bookKakaoId: string;
  bookTitle: string;
  bookAuthor: string;
  bookPublisher?: string;
  bookCoverUrl?: string;
  bookGenre?: string;
  contents: string[];
  pageNumber?: number;
  imageUrl?: string;
  cardStyle?: string;
  bookDisplay?: string;
  cardBg?: string;
  cardBgUrl?: string;
  cardFont?: string;
  cardAlign?: string;
  cardVAlign?: string;
  tags?: string[]; // 사용자가 직접 선택한 경우 AI 분류 건너뜀
};

export async function createUnderlinesBulk(data: BulkCreateData) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "로그인이 필요합니다." };

  const adminClient: AnyClient = createAdminClient();

  const bookResult = await adminClient
    .from("books")
    .upsert(
      {
        kakao_id: data.bookKakaoId,
        title: data.bookTitle,
        author: data.bookAuthor,
        publisher: data.bookPublisher ?? null,
        cover_url: data.bookCoverUrl ?? null,
        ...(data.bookGenre ? { genre: data.bookGenre } : {}),
      },
      { onConflict: "kakao_id", ignoreDuplicates: false }
    )
    .select("id")
    .single();

  if (bookResult.error || !bookResult.data) {
    return { error: "책 정보를 저장하는 데 실패했습니다." };
  }

  const bookId = (bookResult.data as { id: string }).id;
  const supabaseAny: AnyClient = supabase;

  // 사용자가 직접 태그를 선택했으면 그대로, 아니면 AI 분류
  const tagResults: string[][] = data.tags !== undefined
    ? data.contents.map(() => data.tags!)
    : await classifyUnderlineTags(data.contents, { title: data.bookTitle, author: data.bookAuthor });

  const rows = data.contents.map((content, i) => ({
    user_id: user.id,
    book_id: bookId,
    content,
    page_number: data.pageNumber ?? null,
    image_url: data.imageUrl ?? null,
    is_public: true,
    card_style: data.cardStyle ?? "text",
    book_display: data.bookDisplay ?? "full",
    card_bg: data.cardBg ?? "none",
    card_bg_url: data.cardBgUrl ?? null,
    card_font: data.cardFont ?? "serif",
    card_align: data.cardAlign ?? "center",
    card_valign: data.cardVAlign ?? "bottom",
    tags: tagResults[i] ?? [],
  }));

  const { data: inserted, error } = await supabaseAny
    .from("underlines")
    .insert(rows)
    .select("id");

  if (error || !inserted) {
    return { error: "밑줄을 저장하는 데 실패했습니다." };
  }

  revalidatePath("/feed");
  return { ids: (inserted as { id: string }[]).map((r) => r.id) };
}

export async function updateUnderline(
  id: string,
  data: { content?: string; pageNumber?: number | null; cardStyle?: string; bookDisplay?: string; cardBg?: string; cardBgUrl?: string | null; cardFont?: string; cardAlign?: string; cardVAlign?: string; cardAnimation?: string }
) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "로그인이 필요합니다." };

  let newTags: string[] | undefined;
  if (data.content !== undefined) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: row } = await (supabase as any)
      .from("underlines")
      .select("book:books(title, author)")
      .eq("id", id)
      .single();
    const book = row?.book as { title: string; author: string } | null;
    const [t] = await classifyUnderlineTags([data.content], book ?? undefined);
    newTags = t ?? [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("underlines")
    .update({
      ...(data.content !== undefined && { content: data.content }),
      ...(newTags !== undefined && { tags: newTags }),
      ...(data.pageNumber !== undefined && { page_number: data.pageNumber }),
      ...(data.cardStyle !== undefined && { card_style: data.cardStyle }),
      ...(data.bookDisplay !== undefined && { book_display: data.bookDisplay }),
      ...(data.cardBg !== undefined && { card_bg: data.cardBg }),
      ...(data.cardBgUrl !== undefined && { card_bg_url: data.cardBgUrl }),
      ...(data.cardFont !== undefined && { card_font: data.cardFont }),
      ...(data.cardAlign !== undefined && { card_align: data.cardAlign }),
      ...(data.cardVAlign !== undefined && { card_valign: data.cardVAlign }),
      ...(data.cardAnimation !== undefined && { card_animation: data.cardAnimation }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: "수정에 실패했습니다." };

  // 테마 관련 필드가 바뀌었으면 같은 image_url의 다른 밑줄에도 동일하게 적용
  const themeChanged =
    data.cardStyle !== undefined ||
    data.cardBg !== undefined ||
    data.cardBgUrl !== undefined ||
    data.cardFont !== undefined ||
    data.cardAlign !== undefined ||
    data.cardVAlign !== undefined ||
    data.cardAnimation !== undefined ||
    data.bookDisplay !== undefined;

  if (themeChanged) {
    const { data: self } = await (supabase as any)
      .from("underlines")
      .select("image_url")
      .eq("id", id)
      .single();

    if (self?.image_url) {
      const siblingUpdate: Record<string, unknown> = {};
      if (data.cardStyle !== undefined) siblingUpdate.card_style = data.cardStyle;
      if (data.cardBg !== undefined) siblingUpdate.card_bg = data.cardBg;
      if (data.cardBgUrl !== undefined) siblingUpdate.card_bg_url = data.cardBgUrl;
      if (data.cardFont !== undefined) siblingUpdate.card_font = data.cardFont;
      if (data.cardAlign !== undefined) siblingUpdate.card_align = data.cardAlign;
      if (data.cardVAlign !== undefined) siblingUpdate.card_valign = data.cardVAlign;
      if (data.cardAnimation !== undefined) siblingUpdate.card_animation = data.cardAnimation;
      if (data.bookDisplay !== undefined) siblingUpdate.book_display = data.bookDisplay;

      await (supabase as any)
        .from("underlines")
        .update(siblingUpdate)
        .eq("image_url", self.image_url)
        .eq("user_id", user.id)
        .neq("id", id);
    }
  }

  revalidatePath(`/underline/${id}`);
  revalidatePath("/feed");
  return { success: true };
}

export async function deleteUnderline(underlineId: string) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "로그인이 필요합니다." };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("underlines")
    .delete()
    .eq("id", underlineId)
    .eq("user_id", user.id);

  if (error) {
    return { error: "삭제에 실패했습니다." };
  }

  revalidatePath("/feed");
  redirect("/feed");
}
