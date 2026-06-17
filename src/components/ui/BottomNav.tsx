import { createClient } from "@/lib/supabase/server";
import BottomNavClient from "./BottomNavClient";

export default async function BottomNav() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("username")
    .eq("id", user.id)
    .single();

  const username = (profile as { username: string } | null)?.username ?? "";

  return <BottomNavClient profileHref={`/profile/${username}`} />;
}
