"use client";

// 데스크 화면들이 같이 쓰는 데이터 (캐시 key + fetcher). 같은 key 는 화면을 옮겨도 다시 받지 않고 캐시를 먼저 그린다.
import { lifeFetch } from "@/lib/lifeApi";
import { deskApi } from "@/lib/deskApi";
import { revalidate, useCached } from "@/lib/useCached";
import type { FitReportRecord } from "@/types/fitReport";

export type CaseInfo = { title: string | null; clientName: string | null; closed: boolean };
export type FitReportsPayload = { reports: FitReportRecord[]; cases?: Record<string, CaseInfo> };

export const KEY = {
  reports: "fit-reports",
  cases: "scout-cases",
  summary: (range: number) => `desk-summary:${range}`,
  offers: "desk-offers",
} as const;

export const fetchReports = () => lifeFetch<FitReportsPayload>("/api/fit-reports");

/** 승인함·인재풀·탭 배지가 같이 쓰는 분석 결과 목록 (분석 중인 건이 있으면 20초마다 갱신) */
export function useFitReports(refreshMs = 20_000) {
  return useCached(KEY.reports, fetchReports, { refreshMs });
}

const REVIEWABLE = new Set(["completed", "pending_review"]);
/** 미처리 = 검토 대기이면서 보류하지 않은 후보 */
export function isUnprocessed(r: FitReportRecord) {
  return !!r.report && REVIEWABLE.has(r.status) && !r.report.hold;
}

export function usePendingCount(): number | null {
  const { data } = useFitReports(60_000);
  return data ? data.reports.filter(isUnprocessed).length : null;
}

export function useDeskSummary(range: 7 | 30) {
  return useCached(KEY.summary(range), () => deskApi.summary(range), { refreshMs: 60_000 });
}

export function useDeskOffers() {
  return useCached(KEY.offers, () => deskApi.offers(), { refreshMs: 60_000 });
}

/** 승인·거절·더 찾기 등 데이터를 바꾼 뒤: 관련 화면 캐시를 뒤에서 새로 */
export function refreshDesk() {
  revalidate(KEY.reports, fetchReports);
  revalidate(KEY.cases);
  revalidate(KEY.summary(7));
  revalidate(KEY.summary(30));
  revalidate(KEY.offers);
}
