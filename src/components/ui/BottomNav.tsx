import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import BottomNavClient from "./BottomNavClient";

export default async function BottomNav() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any;
  const { data: rawProfile } = await supabaseAny
    .from("users")
    .select("username")
    .eq("id", user.id)
    .single();

  let profileData = rawProfile as { username: string } | null;

  // public.users 행이 없는 기존 계정 자동 복구
  if (!profileData) {
    const username = user.email?.split("@")[0] ?? user.id.slice(0, 8);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = createAdminClient() as any;
    const { data: created } = await admin
      .from("users")
      .upsert({ id: user.id, username }, { onConflict: "id" })
      .select("username")
      .single();
    profileData = created as { username: string } | null;
  }

  const username = profileData?.username ?? "";

  return <BottomNavClient profileHref={username ? `/profile/${username}` : "/feed"} />;
}
