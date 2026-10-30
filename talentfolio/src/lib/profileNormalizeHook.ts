// 후보 프로필·이력 저장 뒤 jd-fit orchestrator 에 "정규화 예약"을 알린다 (매칭 엔진 22 문서 Q2, 레인 C F2).
// - 비차단: 저장 결과에 영향 없음. 실패·미설정이면 조용히 넘어간다 (orchestrator 매일 sweep 이 따라잡음).
// - 인증: Supabase 사용자 토큰. 서버는 토큰의 sub(본인)만 예약한다 — body 로 id 를 보내지 않는다.
// - 디바운스는 서버 큐가 한다. 여기서는 연속 저장(이력 항목 여러 개)을 2초로 묶어 요청 수만 줄인다.
import { getJdAnalyzerUrl, isJdAnalyzerConfigured } from "@/lib/features";
import { supabase } from "@/lib/supabase";

const COALESCE_MS = 2000;
const TIMEOUT_MS = 5000;
let timer: ReturnType<typeof setTimeout> | null = null;

async function send(): Promise<void> {
  if (!supabase || !isJdAnalyzerConfigured()) return;
  const base = getJdAnalyzerUrl();
  if (!base) return;
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    await fetch(`${base}/api/candidates/me/normalize`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: "{}",
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(t);
  }
}

/** 저장 성공 직후 호출. 절대 throw 하지 않는다. */
export function notifyProfileChanged(): void {
  if (typeof window === "undefined") return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    send().catch(() => undefined);
  }, COALESCE_MS);
}
