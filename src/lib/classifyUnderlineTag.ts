export const EMOTION_TAGS = ["위로", "사랑", "성장", "철학", "사회", "유머"] as const;
export type EmotionTag = typeof EMOTION_TAGS[number];

const PROMPT = (contents: string[]) => `다음 밑줄 문장들을 각각 아래 태그 중 하나로 분류하세요.
태그: 위로, 사랑, 성장, 철학, 사회, 유머

위로: 공감·위안·혼자가 아님을 느끼게 하는 문장
사랑: 관계·연애·사람과 사람 사이
성장: 노력·변화·더 나아지기
철학: 존재·의미·삶의 본질에 대한 생각
사회: 돈·일·세상·구조에 대한 시각
유머: 재치·웃음·가벼운 통찰

문장 목록:
${contents.map((c, i) => `${i + 1}. ${c}`).join("\n")}

JSON 배열만 반환. 순서 유지. 예: ["위로", "성장", "철학"]`;

export async function classifyUnderlineTags(contents: string[]): Promise<string[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || contents.length === 0) return contents.map(() => "");

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 256,
        messages: [{ role: "user", content: PROMPT(contents) }],
      }),
    });

    if (!res.ok) return contents.map(() => "");

    const data = await res.json();
    const text: string = data.content?.[0]?.text ?? "";
    const match = text.match(/\[[\s\S]*?\]/);
    if (!match) return contents.map(() => "");

    const tags: string[] = JSON.parse(match[0]);
    return contents.map((_, i) =>
      EMOTION_TAGS.includes(tags[i] as EmotionTag) ? tags[i] : ""
    );
  } catch {
    return contents.map(() => "");
  }
}
