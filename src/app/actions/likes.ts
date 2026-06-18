"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function toggleLike(underlineId: string) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "로그인이 필요합니다." };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any;

  const { data: existing } = await supabaseAny
    .from("likes")
    .select("id")
    .eq("user_id", user.id)
    .eq("underline_id", underlineId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabaseAny
      .from("likes")
      .delete()
      .eq("user_id", user.id)
      .eq("underline_id", underlineId);

    if (error) return { error: "좋아요 취소에 실패했습니다." };

    revalidatePath("/feed");
    revalidatePath(`/underline/${underlineId}`);
    return { liked: false };
  } else {
    const { error } = await supabaseAny
      .from("likes")
      .insert({ user_id: user.id, underline_id: underlineId });

    if (error) return { error: "좋아요에 실패했습니다." };

    revalidatePath("/feed");
    revalidatePath(`/underline/${underlineId}`);
    return { liked: true };
  }
}
