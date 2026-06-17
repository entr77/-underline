import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import BottomNavClient from "./BottomNavClient";

export default async function BottomNav() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  let { data: profile } = await supabase
    .from("users")
    .select("username")
    .eq("id", user.id)
    .single();

  // public.users 행이 없는 기존 계정 자동 복구
  if (!profile) {
    const username = user.email?.split("@")[0] ?? user.id.slice(0, 8);
    const admin = createAdminClient();
    const { data: created } = await admin
      .from("users")
      .upsert({ id: user.id, username }, { onConflict: "id" })
      .select("username")
      .single();
    profile = created as { username: string } | null;
  }

  const username = (profile as { username: string } | null)?.username ?? "";

  return <BottomNavClient profileHref={username ? `/profile/${username}` : "/feed"} />;
}
