/**
 * 화면에 보이는 말 사전. 내부 키(strong_fit, self_ai, status 원문 등)는 UI 에 그대로 렌더링하지 않고
 * 반드시 여기를 거친다. 용어는 "스카우트 건 → 후보 → 승인 → 제안" 으로 통일.
 */

export type FitTone = "ok" | "warn" | "muted";

/** 적합도 판정. 색에만 의존하지 않도록 기호(● ◐ ○)를 함께 쓴다. weak 를 빨강으로 쓰지 않는다. */
export const VERDICT_LABEL: Record<string, { label: string; mark: string; tone: FitTone }> = {
  strong_fit: { label: "잘 맞음", mark: "●", tone: "ok" },
  possible_fit: { label: "부분 일치", mark: "◐", tone: "warn" },
  partial_fit: { label: "부분 일치", mark: "◐", tone: "warn" },
  weak_fit: { label: "덜 맞음", mark: "○", tone: "muted" },
};

export function verdictLabel(v?: string | null): string {
  if (!v) return "판정 전";
  return VERDICT_LABEL[v]?.label ?? "판정 전";
}

export const TONE_STYLE: Record<FitTone, { color: string; bg: string }> = {
  ok: { color: "var(--ok)", bg: "var(--ok-bg)" },
  warn: { color: "var(--warn)", bg: "var(--warn-bg)" },
  muted: { color: "var(--text-secondary)", bg: "#E8EDF5" },
};

/** 동의 목적 */
export const CONSENT_LABEL: Record<string, string> = {
  self_ai: "내 기록 AI 정리",
  matching: "기업 추천에 내 카드 보여주기",
};

/** 진행·상태값 (sourcing_actions, recommendations, 정리 작업 stage 등) */
const STATUS_LABEL: Record<string, string> = {
  pending: "대기 중",
  pending_approval: "승인 대기",
  approved: "승인됨",
  rejected: "반려됨",
  sent: "보냄",
  failed: "보내지 못함",
  expired: "기한 지남",
  draft: "초안",
  published: "공개 중",
  withdrawn: "공개 철회",
  queued: "차례를 기다리는 중",
  running: "정리하는 중",
  processing: "정리하는 중",
  done: "완료",
  completed: "완료",
  error: "문제가 생겼어요",
  proposed: "제안 검토 중",
  contacted: "연락함",
  accepted: "수락함",
  declined: "거절함",
  interview: "면접 진행",
  split: "문장 나누는 중",
  extract: "근거 찾는 중",
  polish: "문장 다듬는 중",
  save: "저장하는 중",
};

export function statusLabel(s?: string | null): string {
  if (!s) return "";
  return STATUS_LABEL[s] ?? STATUS_LABEL[s.toLowerCase()] ?? "진행 중";
}
