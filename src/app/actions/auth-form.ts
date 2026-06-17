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
  const supabase = await createClient();

  const username = formData.get("username") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
    },
  });

  if (error) {
    return { error: error.message };
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
