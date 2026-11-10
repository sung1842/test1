// 제안 서신 API (orchestrator lib/offerMail.ts). 기업은 /api/desk/offers/*, 후보는 /api/v1/life/offers/*.
import { lifeFetch } from "@/lib/lifeApi";

export type OfferStage = "draft" | "sent" | "viewed" | "interested" | "interview" | "declined" | "no_response" | "withdrawn" | "discarded";

export interface OfferMail {
  id: string;
  from: "company" | "candidate";
  subject: string;
  body: string;
  interviewSlots: string[];
  pickedSlot: string | null;
  readAt: string | null;
  sentAt: string;
}

export interface DeskOfferSummary {
  id: string;
  stage: OfferStage;
  candidateId: string | null;
  candidateName: string | null;
  caseId: string | null;
  caseTitle: string;
  client: string | null;
  preview: string;
  createdAt: string;
  sentAt: string | null;
  viewedAt: string | null;
  respondedAt: string | null;
  interviewAt: string | null;
  lastAt: string;
  mails: number;
  unread: number;
}

export interface DeskOfferDetail {
  offer: Omit<DeskOfferSummary, "preview" | "lastAt" | "mails" | "unread"> & { fitReportId: string | null; sharedCards: number };
  mails: OfferMail[];
  events: { to: string; at: string }[];
}

export interface StudioOfferSummary {
  id: string;
  stage: OfferStage;
  company: string;
  title: string;
  preview: string;
  sentAt: string | null;
  lastAt: string;
  interviewAt: string | null;
  unread: number;
}

export interface StudioOfferDetail {
  offer: { id: string; stage: OfferStage; company: string; title: string; sentAt: string | null; response: string | null; interviewAt: string | null };
  posting: { id: string | null; title: string; company: string; description: string | null; skills: string[] } | null;
  mails: OfferMail[];
}

const post = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });
const id = encodeURIComponent;

export const deskOfferApi = {
  overview: () => lifeFetch<{ offers: DeskOfferSummary[] }>("/api/desk/offers/overview"),
  detail: (offerId: string) => lifeFetch<DeskOfferDetail>(`/api/desk/offers/${id(offerId)}`),
  send: (offerId: string, mail: { subject: string; body: string; interviewSlots?: string[] }) =>
    lifeFetch<{ mail: OfferMail }>(`/api/desk/offers/${id(offerId)}/messages`, post(mail)),
  withdraw: (offerId: string) => lifeFetch<{ stage: OfferStage }>(`/api/desk/offers/${id(offerId)}/withdraw`, post({})),
};

export const studioOfferApi = {
  inbox: () => lifeFetch<{ offers: StudioOfferSummary[] }>("/api/v1/life/offers"),
  detail: (offerId: string) => lifeFetch<StudioOfferDetail>(`/api/v1/life/offers/${id(offerId)}`),
  reply: (offerId: string, reply: { body: string; response?: "interested" | "declined"; pickedSlot?: string }) =>
    lifeFetch<{ mail: OfferMail; response: string | null; interviewAt: string | null }>(`/api/v1/life/offers/${id(offerId)}/reply`, post(reply)),
};

export const STAGE_LABEL: Record<OfferStage, string> = {
  draft: "발송 승인 대기",
  sent: "발송함",
  viewed: "열람함",
  interested: "관심 회신",
  interview: "면접 확정",
  declined: "거절 회신",
  no_response: "무응답",
  withdrawn: "철회함",
  discarded: "반려함",
};

/** 상태 색은 뜻으로만 쓴다: 진행(파랑) · 좋은 소식(초록) · 내 차례(노랑) · 끝남(회색) */
export const STAGE_TONE: Record<OfferStage, "todo" | "wait" | "good" | "done"> = {
  draft: "todo",
  sent: "wait",
  viewed: "wait",
  interested: "good",
  interview: "good",
  declined: "done",
  no_response: "done",
  withdrawn: "done",
  discarded: "done",
};

const DAY = new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "short" });
const TIME = new Intl.DateTimeFormat("ko-KR", { hour: "numeric", minute: "2-digit" });
const SHORT = new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric" });

export function fullDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${DAY.format(d)} ${TIME.format(d)}`;
}

export function shortDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay ? TIME.format(d) : SHORT.format(d);
}
