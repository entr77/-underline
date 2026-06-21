import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "10MB 이하 파일만 업로드할 수 있습니다." }, { status: 400 });

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `card-bg/${user.id}-${Date.now()}.${ext}`;
  const bytes = await file.arrayBuffer();

  const admin = createAdminClient();
  const { error } = await admin.storage.from("underline-images").upload(path, bytes, {
    contentType: file.type,
    upsert: false,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: { publicUrl } } = admin.storage.from("underline-images").getPublicUrl(path);
  return NextResponse.json({ url: publicUrl });
}
