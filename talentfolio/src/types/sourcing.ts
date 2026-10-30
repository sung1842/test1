// jd-fit-analyzer shared/types.ts의 B2B 소싱 타입 미러 (talentfolio용)
// orchestrator(JD_ANALYZER_URL, 기본 http://localhost:3001)의 /api/sourcing/* 를 호출한다.

export interface CandidateSourcingSummary {
  id: string;
  name: string;
  role: "developer" | "designer";
  title: string | null;
  skills: string[];
}

export type SourcingActionStatus = "pending" | "approved" | "rejected" | "executed" | "failed";

export interface SlackNotifyPayload {
  channel: string;
  text: string;
  candidateIds?: string[];
  candidateNames?: string[];
  autoSource?: "jd_analysis" | "jd_manual" | "manual" | "channel_invite";
}

export interface SourcingActionRecord {
  id: string;
  type: "slack_notify";
  payload: SlackNotifyPayload;
  status: SourcingActionStatus;
  result: Record<string, unknown> | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export const SOURCING_STATUS_LABEL: Record<SourcingActionStatus, string> = {
  pending: "승인 대기",
  approved: "승인됨",
  rejected: "반려됨",
  executed: "전송 완료",
  failed: "전송 실패",
};
