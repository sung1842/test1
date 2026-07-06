"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Database, ExternalLink, Loader2, Unlink } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { isJdAnalyzerConfigured } from "@/lib/features";
import ServiceUnavailable from "@/components/ServiceUnavailable";
import AuthModal from "@/components/AuthModal";
import {
  disconnectNotion,
  fetchNotionDatabases,
  fetchNotionIntegration,
  notionOAuthStartUrl,
  saveNotionDatabase,
} from "@/lib/notionApi";
import type { NotionIntegrationPublic } from "@/types/notion";

const DEFAULT_MAPPING: NotionIntegrationPublic["propertyMapping"] = {
  name: "Name",
  overallScore: "Score",
  verdict: "Verdict",
  ceoSummary: "CEO Summary",
  matchedSkills: "Matched Skills",
  talentfolioLink: "TalentFolio",
  externalId: "External ID",
};

function IntegrationsContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [showAuth, setShowAuth] = useState(false);
  const [integration, setIntegration] = useState<NotionIntegrationPublic | null>(null);
  const [databases, setDatabases] = useState<{ id: string; title: string; url: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbLoading, setDbLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedDb, setSelectedDb] = useState("");

  const notionParam = searchParams.get("notion");
  const notionReason = searchParams.get("reason");

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchNotionIntegration(user.id);
      setIntegration(data);
      setSelectedDb(data.dataSourceId ?? "");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "연동 상태 로드 실패");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (notionParam === "connected") setNotice("Notion 연동이 완료되었습니다. 후보 DB를 선택해 주세요.");
    if (notionParam === "error") setNotice(`Notion 연동 실패: ${notionReason ?? "unknown"}`);
  }, [notionParam, notionReason]);

  const loadDatabases = async () => {
    if (!user) return;
    setDbLoading(true);
    setNotice(null);
    try {
      const dbs = await fetchNotionDatabases(user.id);
      setDatabases(dbs);
      if (dbs.length === 0) {
        setNotice("접근 가능한 Notion DB가 없습니다. Integration에 DB를 연결했는지 확인하세요.");
      }
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "DB 목록 조회 실패");
    } finally {
      setDbLoading(false);
    }
  };

  const handleConnect = () => {
    if (!user) {
      setShowAuth(true);
      return;
    }
    window.location.href = notionOAuthStartUrl(user.id);
  };

  const handleSaveDb = async () => {
    if (!user || !selectedDb) return;
    setSaving(true);
    setNotice(null);
    try {
      const updated = await saveNotionDatabase(user.id, selectedDb);
      setIntegration(updated);
      setNotice("Notion 후보 DB가 저장되었습니다. Slack 승인 시 자동 sync됩니다.");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await disconnectNotion(user.id);
      setIntegration({
        connected: false,
        workspaceName: null,
        dataSourceId: null,
        propertyMapping: integration?.propertyMapping ?? DEFAULT_MAPPING,
      });
      setDatabases([]);
      setSelectedDb("");
      setNotice("Notion 연동이 해제되었습니다.");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "연동 해제 실패");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <section
        className="rounded-2xl p-6"
        style={{ background: "var(--surface)", border: "1px solid var(--border-color)" }}
      >
        <div className="flex items-start gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(var(--accent-rgb), 0.12)", color: "var(--accent)" }}
          >
            <Database size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)", fontFamily: "DM Sans, sans-serif" }}>
              Notion 연동
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
              JD 쇼트리스트 Slack 승인 후 개인 Notion 후보 DB에 자동 sync합니다.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            <Loader2 size={16} className="animate-spin" /> 불러오는 중...
          </div>
        ) : !user ? (
          <button
            type="button"
            onClick={() => setShowAuth(true)}
            className="btn-brand btn-brand--shadow-btn px-4 py-2.5 rounded-xl text-sm font-semibold"
          >
            로그인 후 연동하기
          </button>
        ) : integration?.connected ? (
          <div className="space-y-4">
            <p className="text-sm" style={{ color: "var(--text-primary)" }}>
              워크스페이스: <strong>{integration.workspaceName ?? "—"}</strong>
            </p>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={loadDatabases}
                disabled={dbLoading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium"
                style={{ border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
              >
                {dbLoading ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}
                DB 목록 불러오기
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm"
                style={{ border: "1px solid var(--border-color)", color: "#f6042e" }}
              >
                <Unlink size={14} /> 연동 해제
              </button>
            </div>

            {databases.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                  후보 DB 선택
                </label>
                <select
                  value={selectedDb}
                  onChange={(e) => setSelectedDb(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-sm"
                  style={{
                    background: "#0b0812",
                    border: "1px solid #271c32",
                    color: "var(--text-primary)",
                    fontFamily: "DM Sans, sans-serif",
                  }}
                >
                  <option value="">선택...</option>
                  {databases.map((db) => (
                    <option key={db.id} value={db.id}>{db.title}</option>
                  ))}
                </select>
                {databases.find((d) => d.id === selectedDb)?.url && (
                  <a
                    href={databases.find((d) => d.id === selectedDb)!.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs"
                    style={{ color: "var(--accent)" }}
                  >
                    Notion에서 열기 <ExternalLink size={11} />
                  </a>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={handleSaveDb}
              disabled={!selectedDb || saving}
              className="btn-brand btn-brand--shadow-btn px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40"
            >
              {saving ? "저장 중..." : "DB 선택 저장"}
            </button>

            <div
              className="rounded-xl px-3 py-3 text-xs leading-relaxed"
              style={{ background: "#0b0812", border: "1px solid #271c32", color: "var(--text-secondary)" }}
            >
              <p className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Notion DB 필수 컬럼</p>
              <p>Name (title), Score (number), Verdict, CEO Summary, Matched Skills, TalentFolio (url), External ID (text)</p>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleConnect}
            className="btn-brand btn-brand--shadow-btn px-4 py-2.5 rounded-xl text-sm font-semibold"
          >
            Notion OAuth 연결
          </button>
        )}

        {notice && (
          <p className="text-xs mt-4 px-1" style={{ color: notice.includes("실패") ? "#f6042e" : "#22c55e" }}>
            {notice}
          </p>
        )}
      </section>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  );
}

export default function IntegrationsSettingsPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <header
        className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3 border-b"
        style={{ background: "var(--surface)", borderColor: "var(--border-color)" }}
      >
        <Link href="/" className="flex items-center gap-1.5 text-sm" style={{ color: "var(--text-secondary)" }}>
          <ArrowLeft size={16} /> TalentFolio
        </Link>
        <span style={{ color: "var(--border-color)" }}>|</span>
        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>연동 설정</span>
      </header>

      <main className="max-w-xl mx-auto px-4 py-8">
        {!isJdAnalyzerConfigured() ? (
          <ServiceUnavailable title="연동 설정" description="jd-fit-analyzer가 배포되면 Notion·Slack 연동을 설정할 수 있습니다." />
        ) : (
        <Suspense fallback={<p className="text-sm" style={{ color: "var(--text-secondary)" }}>로딩 중...</p>}>
          <IntegrationsContent />
        </Suspense>
        )}
      </main>
    </div>
  );
}
