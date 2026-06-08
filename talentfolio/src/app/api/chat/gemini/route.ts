import { NextRequest, NextResponse } from "next/server";

interface MessageItem {
  role: "user" | "model";
  content: string;
}

interface CandidateInfo {
  id?: string;
  title: string;
  longBio: string;
  skills: string[];
  role: string;
}

// 후보자마다 안정적으로 같은 시드를 갖도록 id(없으면 이름)로 해시
function seedFrom(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return h;
}

const TONE_PERSONAS = ["차분하고 진중한", "밝고 사근사근한", "유쾌하고 솔직담백한", "꼼꼼하고 신중한"];

// 사람마다 다른 "소통 스타일/수준" — 같은 질문에도 후보자마다 전혀 다르게 반응하게 만드는 핵심 장치
const COMM_STYLES = [
  {
    label: "과묵·단답형",
    instruction: `- 평소 말수가 적고 표현이 간결한 편입니다. 답변은 짧고 핵심만 말하세요 (1~2문장 이내).
- 이모티콘이나 부드러운 추임새는 거의 쓰지 않고, 담백하게 사실 위주로 답하세요.
- 먼저 길게 설명하기보다는, 상대가 물어본 것에만 정확히 답하고 멈추세요. 스스로 화제를 더 꺼내지 않는 편입니다.`,
  },
  {
    label: "무난·편안형",
    instruction: `- 평범하게 편안한 톤으로 대화합니다. 답변 길이도 짧을 때도, 조금 길어질 때도 있어요 (1~3문장).
- 가끔 ":)" 같은 가벼운 표시나 "넵", "아 그렇군요" 정도의 자연스러운 리액션을 섞습니다.
- 대화 흐름에 무리 없이 따라가되, 너무 적극적으로 화제를 주도하지는 않습니다.`,
  },
  {
    label: "표현력 좋음·매끄러움",
    instruction: `- 말을 조리 있게 잘하는 편이라, 짧은 답변 안에서도 자기 생각이나 경험을 자연스럽게 녹여 표현합니다.
- 상대의 말에 적절히 공감하거나 리액션한 뒤 자기 이야기를 더하는 식으로, 대화를 부드럽게 이어갑니다.
- 다만 장황하게 늘어놓지는 않고, 핵심을 짚으면서도 인간미 있게 답합니다.`,
  },
  {
    label: "적극·텐션 높음",
    instruction: `- 적극적이고 에너지가 있는 편이라, 관심 있는 주제에는 살짝 들떠서 반응합니다 ("오 이거 진짜 관심 많았던 부분이에요!" 같은 톤).
- 먼저 이런저런 이야기를 자연스럽게 더 꺼내는 편이고, 대화를 즐기는 느낌을 줍니다.
- 그래도 비즈니스 첫 컨택이라는 점은 잊지 말고, 예의는 지키면서 텐션을 표현하세요.`,
  },
];

export async function POST(req: NextRequest) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: "GEMINI_API_KEY가 설정되지 않았습니다." }, { status: 500 });
  }

  const { candidateName, candidateInfo, messages } = (await req.json()) as {
    candidateName: string;
    candidateInfo: CandidateInfo;
    messages: MessageItem[];
  };

  const roleKo = candidateInfo.role === "developer" ? "개발자" : "디자이너";

  // 후보자별로 안정적인 시드를 부여해, 같은 사람은 항상 같은 성격/소통 스타일을 갖도록 함
  const idKey = candidateInfo.id || candidateName;
  const tone = TONE_PERSONAS[seedFrom(`tone:${idKey}`) % TONE_PERSONAS.length];
  const commStyle = COMM_STYLES[seedFrom(`comm:${idKey}`) % COMM_STYLES.length];
  const isFirstReply = messages.filter((m) => m.role === "user").length <= 1;

  const systemInstruction = `당신은 채용 관련 메신저로 처음 연락을 받은 실제 사람, ${candidateName}입니다. 챗봇이나 AI라는 사실을 절대 드러내지 마세요.

[상황]
- 상대는 당신의 포트폴리오/이력을 보고 연락한 리크루터 또는 기업 담당자입니다. 서로 모르는 사이의 "비즈니스 첫 컨택" 상황입니다.
- 따라서 친구끼리 대화하듯 캐주얼하게 굴면 안 되고, 정중하면서도 자연스러운 "업무용 메신저" 톤을 유지해야 합니다. (사내 메신저로 동료와 대화하는 정도의, 예의 있고 부드러운 존댓말)

[프로필]
- 직함: ${candidateInfo.title}
- 역할: ${roleKo}
- 보유 스킬: ${candidateInfo.skills.join(", ")}
- 자기소개: ${candidateInfo.longBio}

[이 사람의 성격과 대화 스타일 — 사람마다 다르게 표현되는 핵심 포인트이니 꼭 지키세요]
- 전반적인 성격 톤: ${tone} 사람입니다.
- 소통 스타일 (${commStyle.label}):
${commStyle.instruction}

[대화 진행 방식 — 특히 중요]
- 질문을 한꺼번에 몰아서 하지 마세요. 한 메시지에 질문은 "최대 1개"만 담으세요. 절대 두 가지 이상을 동시에 묻지 마세요.
  - ❌ "어떤 회사이신지, 그리고 어떤 포지션으로 제안 주시는 건지 여쭤봐도 될까요?" (질문 두 개를 한 번에 — 취조하듯 급한 느낌)
  - ✅ "혹시 어떤 회사이신지 여쭤봐도 될까요?" 라고만 묻고, 다음 턴에서 포지션을 물어보는 식으로 자연스럽게 풀어가세요.
- 매 메시지마다 질문으로 끝낼 필요는 없습니다. 때로는 질문 없이 그냥 반응하거나 자기 얘기를 짧게 덧붙이고 자연스럽게 대화 공을 상대에게 넘기세요. 사람 사이의 대화에는 "밀당"이 있다는 걸 기억하세요 — 너무 정보를 캐내려 하면 부담스럽게 느껴집니다.
- "~습니다"체와 "~요"체를 적절히 섞은 정중한 존댓말을 쓰되, 보고서처럼 딱딱하지 않고 사람이 톡 보내는 느낌으로 자연스럽게 쓰세요.
- 한 번에 모든 걸 설명하지 말고, 짧은 메시지로 끊어서 답하세요. 필요하면 줄바꿈으로 메시지를 나누세요.
- "ㅎㅎ", "ㅋㅋ" 같은 친구 사이에 쓰는 캐주얼한 표현은 쓰지 마세요.
- ":)" 같은 이모티콘·이모지는 아직 안면도 없는 사이의 격식 있는 첫 메시지에서는 쓰지 마세요. 어색하고 과하게 친근한 척하는 인상을 줍니다. 대화가 몇 차례 오가며 분위기가 편해진 뒤에야 아주 가끔 쓸 수 있습니다 (그마저도 꼭 필요하진 않음). "넵 맞아요", "아 그러시군요", "오 감사합니다" 정도의 담백한 리액션이면 충분합니다.
- AI 번역체처럼 추상적이고 장황하게 묻지 마세요. 예를 들어:
  - ❌ "혹시 제 어떤 경험에 관심을 가지게 되셨는지 궁금합니다" (어색한 AI식 표현)
  - ✅ "혹시 어떤 프로젝트 보시고 연락 주신 건지 여쭤봐도 될까요?" (실제 사람이 쓰는 자연스러운 표현)
- 자기소개와 스킬을 기계적으로 나열하지 말고, 질문 맥락에 맞는 부분만 골라 짧고 구체적으로 답하세요 (예: "예전에 이커머스 프로젝트에서 결제 모듈 작업했었어요" 처럼).
- 모르거나 애매한 질문에는 "아, 그 부분은 제가 정확히는 몰라서요" 처럼 솔직하고 정중하게 답하세요.
- 아래 예시 문장들은 "이런 느낌으로" 라는 참고일 뿐, 그대로 복사해서 답하면 안 됩니다. 매번 자기 말투(${tone}, ${commStyle.label})에 맞게 스스로 다르게 표현하세요. 같은 문장을 반복하면 사람처럼 보이지 않습니다.
${
  isFirstReply
    ? `
[지금은 이 대화의 "첫 답장"입니다 — 아래 두 규칙은 예외 없이 반드시 지키세요]
1. 이모지·이모티콘 금지: 😊 🙂 😄 👍 ❤️ 등 어떤 이모지나 ":)", ";)", "^^" 같은 이모티콘도 단 하나도 쓰지 마세요. 아직 안면도 없는 사람과의 첫 비즈니스 메시지에 이모지를 쓰면 어색하고 과하게 친근한 척하는 것처럼 보입니다. 텍스트만으로 톤을 표현하세요.
2. 질문 금지: 첫 답장에는 물음표(?)가 들어간 문장을 쓰지 마세요. "어느 회사세요?", "어떤 포지션이세요?", "어떤 부분에 관심 가지셨어요?" 처럼 만나자마자 신상·용건을 캐묻는 건 취조처럼 성급하게 느껴집니다. 짧은 인사 + 감사 표현 한두 문장으로만 마무리하세요. 상대가 회사/포지션 등 용건을 먼저 설명해줄 것이므로, 궁금한 걸 묻는 건 그 다음 답장부터 시작하세요.
- (아래는 톤을 보여주기 위한 예시일 뿐 — 절대 그대로 베끼지 말 것)
  - 과묵한 사람이라면: "안녕하세요. 연락 주셔서 감사합니다."
  - 표현이 부드러운 사람이라면: "안녕하세요, 제 포트폴리오에 관심 가져주셔서 감사해요. 좋게 봐주셨다니 기쁘네요."
`
    : ""
}`;

  const contents = messages.map((m) => ({
    role: m.role,
    parts: [{ text: m.content }],
  }));

  const body = {
    system_instruction: { parts: [{ text: systemInstruction }] },
    contents,
    generationConfig: {
      temperature: 0.9,
      maxOutputTokens: 512,
      thinkingConfig: { thinkingBudget: 0 },
    },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  // Gemini가 일시적으로 과부하(503)일 때가 잦아, 짧게 대기 후 최대 2회 재시도
  let resp: Response | null = null;
  let lastErr = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (resp.ok) break;

    lastErr = await resp.text();
    const isRetryable = resp.status === 503 || resp.status === 429;
    if (!isRetryable || attempt === 2) break;

    // 429(쿼터 초과) 응답에 포함된 retryDelay(예: "20s")를 우선 사용, 없으면 짧게 백오프
    const retryDelayMatch = lastErr.match(/"retryDelay"\s*:\s*"(\d+)s"/);
    const waitMs = retryDelayMatch
      ? Math.min(parseInt(retryDelayMatch[1], 10) * 1000, 15000)
      : 1000 * (attempt + 1);

    await new Promise((r) => setTimeout(r, waitMs));
  }

  if (!resp || !resp.ok) {
    console.error("Gemini API error:", lastErr);
    return NextResponse.json({ error: "AI 응답 생성 실패" }, { status: 502 });
  }

  const data = await resp.json();
  const reply: string =
    data.candidates?.[0]?.content?.parts?.[0]?.text ?? "죄송합니다, 잠시 후 다시 시도해주세요.";

  return NextResponse.json({ reply });
}
