"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const AVAILABLE_TAGS = ["소설", "철학", "에세이", "심리학", "역사", "과학", "경제", "자기계발", "시", "고전"];

export type ProfileFormState = { error?: string; success?: boolean } | null;

export async function updateProfile(
  _prevState: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "로그인이 필요해요" };

  const bio = (formData.get("bio") as string | null)?.trim() ?? "";
  const occupation = (formData.get("occupation") as string | null)?.trim() ?? "";
  const tags = AVAILABLE_TAGS.filter((t) => formData.get(`tag_${t}`) === "on");

  const { error } = await supabase
    .from("users")
    .update({ bio: bio || null, occupation: occupation || null, tags })
    .eq("id", user.id);

  if (error) return { error: "저장에 실패했어요" };

  const { data: profile } = await supabase
    .from("users")
    .select("username")
    .eq("id", user.id)
    .single();

  revalidatePath(`/profile/${(profile as { username: string } | null)?.username ?? ""}`);
  return { success: true };
}
