"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("users")
    .update({ bio: bio || null, occupation: occupation || null })
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
