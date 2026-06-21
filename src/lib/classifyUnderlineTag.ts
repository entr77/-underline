export const EMOTION_TAGS = [
  "위로", "사랑", "인생", "성장",
  "비즈니스", "재테크", "테크/AI",
  "사회", "육아", "종교", "유머",
] as const;
export type EmotionTag = typeof EMOTION_TAGS[number];

const PROMPT = (contents: string[]) => `다음 밑줄 문장들을 각각 아래 태그 중 하나로 분류하세요.
태그: 위로, 사랑, 인생, 성장, 비즈니스, 재테크, 테크/AI, 사회, 육아, 종교, 유머

위로: 공감·위안·혼자가 아님을 느끼게 하는 문장
사랑: 연애·이별·사람 사이 감정
인생: 존재·삶의 의미·철학적 통찰
성장: 노력·변화·자기계발·더 나아지기
비즈니스: 창업·경영·마케팅·직장·리더십
재테크: 투자·부동산·돈·경제적 자유
테크/AI: 기술·AI·디지털 트렌드·미래
사회: 정치·역사·사회구조·세상 읽기
육아: 아이·부모·가족·양육
종교: 신앙·영성·명상·마음 수련
유머: 재치·웃음·가벼운 통찰

문장 목록:
${contents.map((c, i) => `${i + 1}. ${c}`).join("\n")}

JSON 배열만 반환. 순서 유지. 예: ["위로", "비즈니스", "인생"]`;

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
      (EMOTION_TAGS as readonly string[]).includes(tags[i]) ? tags[i] : ""
    );
  } catch {
    return contents.map(() => "");
  }
}
