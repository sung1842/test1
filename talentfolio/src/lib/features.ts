/** 배포 환경에서 Supabase / jd-fit-analyzer 미연결 시 기능을 끄기 위한 플래그 */

function envEnabled(value: string | undefined): boolean {
  if (!value?.trim()) return false;
  const v = value.trim().toLowerCase();
  return v !== "false" && v !== "0" && v !== "off" && v !== "disabled" && v !== "none";
}

/** NEXT_PUBLIC_SUPABASE_URL + ANON_KEY 가 모두 있을 때만 true */
export function isSupabaseConfigured(): boolean {
  return (
    envEnabled(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    envEnabled(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}

/**
 * jd-fit-analyzer orchestrator 연동.
 * - 프로덕션: NEXT_PUBLIC_JD_ANALYZER_URL 미설정 또는 false → 비활성
 * - 로컬 dev: 미설정 시 localhost:3001 기본
 */
export function isJdAnalyzerConfigured(): boolean {
  const raw = process.env.NEXT_PUBLIC_JD_ANALYZER_URL?.trim();
  if (raw === "false" || raw === "disabled" || raw === "") return false;
  if (raw) return true;
  return process.env.NODE_ENV === "development";
}

export function getJdAnalyzerUrl(): string {
  const raw = process.env.NEXT_PUBLIC_JD_ANALYZER_URL?.trim();
  if (raw && raw !== "false" && raw !== "disabled") return raw.replace(/\/$/, "");
  if (process.env.NODE_ENV === "development") return "http://localhost:3001";
  return "";
}

/** Vercel 서버 API — GEMINI_API_KEY 없으면 AI 채팅 비활성 */
export function isGeminiChatConfigured(): boolean {
  return envEnabled(process.env.GEMINI_API_KEY);
}

export const BACKEND_UNAVAILABLE_MSG =
  "이 기능은 현재 데모 모드에서는 사용할 수 없습니다. (백엔드 미배포)";
