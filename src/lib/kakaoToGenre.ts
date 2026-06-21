export function kakaoToGenre(categoryName: string | undefined | null): string {
  const c = categoryName ?? "";
  if (c.includes("에세이")) return "에세이";
  if (c.includes("소설")) return "소설";
  if (c.includes("시/희곡") || c.includes("시집")) return "시";
  if (c.includes("자기계발")) return "자기계발";
  if (c.includes("경제") || c.includes("경영")) return "경제/경영";
  if (c.includes("심리")) return "심리";
  if (c.includes("철학") || c.includes("인문")) return "인문";
  if (c.includes("역사")) return "역사";
  if (c.includes("과학")) return "과학";
  return "기타";
}
