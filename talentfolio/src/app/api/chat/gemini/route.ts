import { NextRequest, NextResponse } from "next/server";

interface MessageItem {
  role: "user" | "model";
  content: string;
}

interface CandidateInfo {
  title: string;
  longBio: string;
  skills: string[];
  role: string;
}

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

  const systemInstruction = `당신은 ${candidateName}입니다. 다음은 당신의 프로필입니다:
- 직함: ${candidateInfo.title}
- 역할: ${roleKo}
- 보유 스킬: ${candidateInfo.skills.join(", ")}
- 자기소개: ${candidateInfo.longBio}

지금 리크루터나 기업 담당자와 채팅하고 있습니다. ${candidateName}의 관점에서 자연스럽고 전문적으로 한국어로 대화하세요.
- 자신의 경험과 스킬에 대해 구체적이고 솔직하게 이야기하세요
- 너무 길지 않게 2~4문장 내외로 답변하세요
- 가끔은 상대방에게 역으로 질문하는 것도 좋습니다
- 마치 실제 취업 후보자처럼 진짜 사람답게 대화하세요`;

  const contents = messages.map((m) => ({
    role: m.role,
    parts: [{ text: m.content }],
  }));

  const body = {
    system_instruction: { parts: [{ text: systemInstruction }] },
    contents,
    generationConfig: {
      temperature: 0.9,
      maxOutputTokens: 256,
    },
  };

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  if (!resp.ok) {
    const err = await resp.text();
    console.error("Gemini API error:", err);
    return NextResponse.json({ error: "AI 응답 생성 실패" }, { status: 502 });
  }

  const data = await resp.json();
  const reply: string =
    data.candidates?.[0]?.content?.parts?.[0]?.text ?? "죄송합니다, 잠시 후 다시 시도해주세요.";

  return NextResponse.json({ reply });
}
