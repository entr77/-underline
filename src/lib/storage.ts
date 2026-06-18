import { createClient } from "./supabase/client";

const BUCKET = "underline-images";

function readExifOrientation(buffer: ArrayBuffer): number {
  const view = new DataView(buffer);
  if (view.getUint16(0, false) !== 0xFFD8) return 1;
  let offset = 2;
  while (offset < view.byteLength) {
    const marker = view.getUint16(offset, false);
    offset += 2;
    if (marker === 0xFFE1) {
      if (view.getUint32(offset + 2, false) !== 0x45786966) return 1;
      const little = view.getUint16(offset + 8, false) === 0x4949;
      const ifdOffset = view.getUint32(offset + 12, little);
      const dirStart = offset + 8 + ifdOffset;
      const numEntries = view.getUint16(dirStart, little);
      for (let i = 0; i < numEntries; i++) {
        const pos = dirStart + 2 + i * 12;
        if (view.getUint16(pos, little) === 0x0112) {
          return view.getUint16(pos + 8, little);
        }
      }
      return 1;
    }
    if ((marker & 0xFF00) !== 0xFF00) break;
    const segLen = view.getUint16(offset, false);
    if (segLen < 2) break;
    offset += segLen;
  }
  return 1;
}

// EXIF orientation → canvas 변환 행렬 적용 (5-8은 width/height 스왑 필요)
function applyExifTransform(
  ctx: CanvasRenderingContext2D,
  orientation: number,
  w: number,
  h: number
) {
  switch (orientation) {
    case 2: ctx.transform(-1, 0, 0, 1, w, 0); break;
    case 3: ctx.transform(-1, 0, 0, -1, w, h); break;
    case 4: ctx.transform(1, 0, 0, -1, 0, h); break;
    case 5: ctx.transform(0, 1, 1, 0, 0, 0); break;
    case 6: ctx.transform(0, 1, -1, 0, h, 0); break;   // 90° CW — 모바일 세로 촬영
    case 7: ctx.transform(0, -1, -1, 0, h, w); break;
    case 8: ctx.transform(0, -1, 1, 0, 0, w); break;
  }
}

export async function imageFileToBase64(file: File): Promise<string> {
  const headerBuf = await file.slice(0, 64 * 1024).arrayBuffer();
  const orientation = readExifOrientation(headerBuf);

  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const swapped = orientation >= 5 && orientation <= 8;
      const canvas = document.createElement("canvas");
      canvas.width = swapped ? h : w;
      canvas.height = swapped ? w : h;
      const ctx = canvas.getContext("2d")!;
      applyExifTransform(ctx, orientation, w, h);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export async function uploadImage(file: File, userId: string): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${userId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
