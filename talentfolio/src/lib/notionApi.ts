import { JD_ANALYZER_URL, isJdAnalyzerConfigured } from "@/types/fitReport";
import type { NotionIntegrationPublic } from "@/types/notion";
import { BACKEND_UNAVAILABLE_MSG } from "@/lib/features";

function assertJdAnalyzer(): void {
  if (!isJdAnalyzerConfigured() || !JD_ANALYZER_URL) {
    throw new Error(BACKEND_UNAVAILABLE_MSG);
  }
}

export async function fetchNotionIntegration(userId: string): Promise<NotionIntegrationPublic> {
  assertJdAnalyzer();
  const res = await fetch(`${JD_ANALYZER_URL}/api/notion/integrations?userId=${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error("Notion 연동 상태를 불러오지 못했습니다.");
  return res.json();
}

export async function fetchNotionDatabases(userId: string): Promise<{ id: string; title: string; url: string }[]> {
  assertJdAnalyzer();
  const res = await fetch(`${JD_ANALYZER_URL}/api/notion/databases?userId=${encodeURIComponent(userId)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Notion DB 목록 조회 실패");
  return data.databases ?? [];
}

export async function saveNotionDatabase(userId: string, dataSourceId: string): Promise<NotionIntegrationPublic> {
  assertJdAnalyzer();
  const res = await fetch(`${JD_ANALYZER_URL}/api/notion/integrations`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, dataSourceId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Notion DB 저장 실패");
  return data;
}

export async function disconnectNotion(userId: string): Promise<void> {
  assertJdAnalyzer();
  const res = await fetch(`${JD_ANALYZER_URL}/api/notion/integrations?userId=${encodeURIComponent(userId)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? "Notion 연동 해제 실패");
  }
}

export function notionOAuthStartUrl(userId: string): string {
  assertJdAnalyzer();
  return `${JD_ANALYZER_URL}/api/notion/oauth/start?userId=${encodeURIComponent(userId)}`;
}
