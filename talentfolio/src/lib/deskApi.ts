// orchestrator /api/desk/* 클라이언트 (21 문서). 타입은 orchestrator/src/lib/deskMetrics.ts 미러.
// null = 데이터 준비 중(SQL 017 미적용 등) → 화면은 숫자 대신 "준비 중".
import { lifeFetch } from "@/lib/lifeApi";

export interface Ratio { n: number; d: number; rate: number | null; small: boolean }

export interface DeskCase {
  jdHash: string;
  title: string;
  client: string | null;
  owner: string | null;
  deadline: string | null;
  daysLeft: number | null;
  matched: number;
  analyzed: number;
  approved: number;
  pending: number;
  replied: number | null;
}

export interface DeskSummary {
  rangeDays: number;
  generatedAt: string;
  pending: { count: number; oldestWaitHours: number | null };
  approval: Ratio & { prevRate: number | null };
  overrides: Ratio;
  rejectReasons: { label: string; count: number }[];
  funnel: { matched: number; analyzed: number; approved: number; decided: number; offered: number | null; replied: number | null; interviewed: number | null };
  cases: DeskCase[];
  deadlineSoon: number | null;
  firstOfferDays: number | null;
  responses: Ratio | null;
  interviews: Ratio | null;
  quality: {
    viewedBeforeApproval: Ratio | null;
    medianReviewSec: number | null;
    approvedWithoutEvidence: number | null;
    explanations: { open: number; nearestDueDays: number | null } | null;
  };
  supplyDemand: {
    supply: { developer: number; designer: number };
    demand: { developer: number; designer: number };
    skillGap: { skill: string; demand: number; cards: number }[];
  };
  todo: { approvals: number; responses: number | null };
  feed: DeskFeedItem[];
}

export type DeskFeedKind = "agent" | "response" | "team" | "alert";
export interface DeskFeedItem { kind: DeskFeedKind; at: string | null; text: string; href: string }

export interface DeskOffer {
  id: string;
  candidate_id: string | null;
  status: string;
  sent_at: string | null;
  response: string | null;
  responded_at: string | null;
  interview_at: string | null;
  created_at: string;
  payload: { candidateName?: string; jdHash?: string; message?: string } | null;
}

const post = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });

export const deskApi = {
  summary: (range: 7 | 30) => lifeFetch<DeskSummary>(`/api/desk/summary?range=${range}`),
  feed: () => lifeFetch<{ items: DeskFeedItem[] }>("/api/desk/feed"),
  offers: () => lifeFetch<{ offers: DeskOffer[] | null }>("/api/desk/offers"),
  createOffer: (fitReportId: string, message: string) => lifeFetch<{ id: string }>("/api/desk/offers", post({ fitReportId, message })),
  decideOffer: (id: string, action: "approve" | "reject") => lifeFetch<{ status: string }>(`/api/desk/offers/${encodeURIComponent(id)}/decision`, post({ action })),
  respondOffer: (id: string, response: "interested" | "declined" | "no_response", interview = false) =>
    lifeFetch<{ response: string }>(`/api/desk/offers/${encodeURIComponent(id)}/response`, post({ response, interview })),
  /** 열람 기록은 실패해도 화면을 막지 않는다 */
  recordView: (fitReportId: string, cardId?: string) =>
    lifeFetch("/api/desk/views", post({ fitReportId, cardId })).catch(() => undefined),
};

/** 분모가 작으면 n/N, 충분하면 % */
export function ratioText(r: Ratio, unit = "명"): { main: string; small: string } {
  if (r.d === 0) return { main: "0", small: "아직 없음" };
  if (r.small || r.rate === null) return { main: `${r.n}/${r.d}${unit}`, small: "표본 부족 · 30 이상부터 %로 표시" };
  return { main: `${Math.round(r.rate * 100)}%`, small: `${r.n} ÷ ${r.d}` };
}

export function relTime(iso: string | null): string {
  if (!iso) return "확인 필요";
  const diff = Date.now() - Date.parse(iso);
  const m = Math.round(diff / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.round(h / 24);
  return d === 1 ? "어제" : `${d}일 전`;
}
