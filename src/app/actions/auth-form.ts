"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signInWithGoogle as _signInWithGoogle } from "@/app/actions/auth";

export type AuthFormState = { error?: string } | null;

/**
 * useActionState-compatible wrapper for email sign-in.
 * Signature: (prevState, formData) => State | Promise<State>
 */
export async function signInWithEmailAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/feed");
}

/**
 * useActionState-compatible wrapper for email sign-up.
 * Signature: (prevState, formData) => State | Promise<State>
 */
export async function signUpWithEmailAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const username = formData.get("username") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  // 이메일 확인 없이 즉시 활성화
  const { createAdminClient } = await import("@/lib/supabase/server");
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username },
  });

  if (error) {
    return { error: error.message };
  }

  // 세션 발급: 생성 직후 로그인
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    return { error: signInError.message };
  }

  revalidatePath("/", "layout");
  redirect("/feed");
}

/**
 * void wrapper for signInWithGoogle — usable directly as form action.
 */
export async function signInWithGoogleAction(): Promise<void> {
  await _signInWithGoogle();
}
