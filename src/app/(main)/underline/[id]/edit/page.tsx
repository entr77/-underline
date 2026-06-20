import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EditForm from "./EditForm";

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [{ data }, { data: profile }] = await Promise.all([
    (supabase as any).from("underlines").select("id, content, page_number, card_style, book_display, card_bg, card_bg_url, image_url, user_id, book:books(title, author, cover_url)").eq("id", id).single(),
    (supabase as any).from("users").select("username").eq("id", user?.id ?? "").single(),
  ]);
  if (!user || !data || data.user_id !== user.id) notFound();
  return (
    <EditForm
      id={id}
      initialContent={data.content}
      initialPageNumber={data.page_number}
      initialBookDisplay={data.book_display ?? "full"}
      initialCardBg={data.card_bg ?? "cover"}
      initialCardBgUrl={data.card_bg_url ?? undefined}
      bookTitle={data.book?.title ?? ""}
      bookAuthor={data.book?.author ?? ""}
      bookCoverUrl={data.book?.cover_url ?? ""}
      username={profile?.username ?? user.email?.split("@")[0] ?? "user"}
      hasImage={!!data.image_url}
      imageUrl={data.image_url ?? undefined}
    />
  );
}
