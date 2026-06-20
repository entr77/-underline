import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EditForm from "./EditForm";

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: { user } }, { data }] = await Promise.all([
    supabase.auth.getUser(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from("underlines").select("id, content, page_number, card_style, image_url, user_id").eq("id", id).single(),
  ]);
  if (!user || !data || data.user_id !== user.id) notFound();
  return (
    <EditForm
      id={id}
      initialContent={data.content}
      initialPageNumber={data.page_number}
      initialCardStyle={data.card_style ?? "text"}
      hasImage={!!data.image_url}
    />
  );
}
