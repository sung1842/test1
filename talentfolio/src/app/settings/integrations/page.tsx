"use client";

import { SkeletonList } from "@/components/state/StateView";
import { SiteHeader } from "@/components/site/SiteHeader";
import { DeskTabs } from "@/components/desk/DeskTabs";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Database, ExternalLink, Hash, Loader2, Unlink } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { isJdAnalyzerConfigured } from "@/lib/features";
import ServiceUnavailable from "@/components/ServiceUnavailable";
import AuthModal from "@/components/AuthModal";
import { DeleteAccount } from "@/components/site/DeleteAccount";
import {
  disconnectNotion,
  fetchNotionDatabases,
  fetchNotionIntegration,
  notionOAuthStartUrl,
  saveNotionDatabase,
} from "@/lib/notionApi";
import {
  deleteSlackChannelConfig,
  fetchSlackChannelConfigs,
  saveSlackChannelConfig,
  type SlackChannelConfig,
} from "@/lib/slackChannelApi";
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

  const [slackConfigs, setSlackConfigs] = useState<SlackChannelConfig[]>([]);
  const [slackChannelId, setSlackChannelId] = useState("");
  const [slackJdText, setSlackJdText] = useState("");
  const [slackSaving, setSlackSaving] = useState(false);

  const notionParam = searchParams.get("notion");
  const notionReason = searchParams.get("reason");

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [data, slack] = await Promise.all([
        fetchNotionIntegration(user.id),
        fetchSlackChannelConfigs(user.id).catch(() => [] as SlackChannelConfig[]),
      ]);
      setIntegration(data);
      setSelectedDb(data.dataSourceId ?? "");
      setSlackConfigs(slack);
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
    void notionOAuthStartUrl(user.id).then((url) => { window.location.href = url; });
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

  const handleSaveSlackChannel = async () => {
    if (!user || !slackChannelId.trim() || !slackJdText.trim()) return;
    setSlackSaving(true);
    setNotice(null);
    try {
      await saveSlackChannelConfig({
        channelId: slackChannelId.trim(),
        userId: user.id,
        jdText: slackJdText.trim(),
      });
      const slack = await fetchSlackChannelConfigs(user.id);
      setSlackConfigs(slack);
      setSlackChannelId("");
      setSlackJdText("");
      setNotice("Slack 채널 자동 소싱 설정이 저장되었습니다. 해당 채널에 봇을 초대하면 자동으로 후보 분석·승인 요청이 시작됩니다.");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Slack 설정 저장 실패");
    } finally {
      setSlackSaving(false);
    }
  };

  const handleDeleteSlackChannel = async (channelId: string) => {
    if (!user) return;
    setSlackSaving(true);
    try {
      await deleteSlackChannelConfig(channelId, user.id);
      setSlackConfigs((prev) => prev.filter((c) => c.slackChannelId !== channelId));
      setNotice("채널 설정을 삭제했습니다.");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "삭제 실패");
    } finally {
      setSlackSaving(false);
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
            <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
              Notion
            </h2>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
              Slack에서 승인한 후보를 내 Notion 후보 표에 자동으로 옮겨 적어요.
            </p>
          </div>
        </div>

        {loading ? (
          <SkeletonList rows={2} label="연동 상태를 불러오는 중" />
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
                style={{ border: "1px solid var(--border-color)", color: "var(--dev-color)" }}
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
                    background: "var(--surface)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-primary)",
                    fontFamily: "Pretendard Variable, sans-serif",
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
              style={{ background: "var(--surface)", border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}
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
          <p className="text-xs mt-4 px-1" style={{ color: notice.includes("실패") ? "var(--dev-color)" : "var(--ok)" }}>
            {notice}
          </p>
        )}
      </section>

      <section
        className="rounded-2xl p-6 mt-6"
        style={{ background: "var(--surface)", border: "1px solid var(--border-color)" }}
      >
        <div className="flex items-start gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(var(--des-color-rgb), 0.12)", color: "var(--des-color)" }}
          >
            <Hash size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)", fontFamily: "Pretendard Variable, sans-serif" }}>
              Slack 채널 자동 소싱
            </h2>
            <p className="text-sm mt-1 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              채널 ID와 JD를 등록한 뒤 봇을 초대하면, 후보를 분석해 승인 요청 카드를 보냅니다.
              채널 ID는 Slack 채널 상세 → 하단 ID에서 확인 (C로 시작).
            </p>
          </div>
        </div>

        {!user ? (
          <button
            type="button"
            onClick={() => setShowAuth(true)}
            className="btn-brand btn-brand--shadow-btn px-4 py-2.5 rounded-xl text-sm font-semibold"
          >
            로그인 후 설정
          </button>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: "var(--text-secondary)" }}>
                Slack 채널 ID
              </label>
              <input
                value={slackChannelId}
                onChange={(e) => setSlackChannelId(e.target.value)}
                placeholder="C0123456789"
                className="w-full rounded-xl text-sm px-3 py-2.5 outline-none"
                style={{ background: "var(--surface)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: "var(--text-secondary)" }}>
                채용 JD (자동 소싱 기준)
              </label>
              <textarea
                value={slackJdText}
                onChange={(e) => setSlackJdText(e.target.value)}
                rows={6}
                placeholder={"[채용공고]\n모집 직군: 개발자\n[필수 기술]\nReact\nTypeScript\n..."}
                className="w-full rounded-xl text-sm px-3 py-2.5 outline-none resize-y"
                style={{ background: "var(--surface)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
              />
            </div>
            <button
              type="button"
              onClick={handleSaveSlackChannel}
              disabled={slackSaving || !slackChannelId.trim() || !slackJdText.trim()}
              className="btn-brand btn-brand--shadow-btn px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40"
            >
              {slackSaving ? "저장 중..." : "채널 설정 저장"}
            </button>

            {slackConfigs.length > 0 && (
              <ul className="space-y-2 pt-2">
                {slackConfigs.map((c) => (
                  <li
                    key={c.slackChannelId}
                    className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm"
                    style={{ background: "var(--surface)", border: "1px solid var(--border-color)" }}
                  >
                    <span style={{ color: "var(--text-primary)", fontFamily: "Pretendard Variable, monospace" }}>
                      {c.slackChannelId}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteSlackChannel(c.slackChannelId)}
                      disabled={slackSaving}
                      className="text-xs shrink-0"
                      style={{ color: "var(--dev-color)" }}
                    >
                      삭제
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  );
}

export default function IntegrationsSettingsPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <SiteHeader crumb="연동" />

      <main id="main" className="max-w-xl mx-auto px-4 pb-16" style={{ paddingTop: 88 }}>
        <div className="dk" style={{ padding: 0, maxWidth: "none" }}><DeskTabs /></div>
        <span className="tf-label">데스크 · 설정</span>
        <h1 className="tf-h1" style={{ fontSize: "clamp(28px,4vw,40px)" }}>연동</h1>
        <p className="tf-lead" style={{ marginBottom: 24 }}>승인한 후보를 Slack으로 알리고 Notion에 기록하도록 연결해요.</p>
        {!isJdAnalyzerConfigured() ? (
          <ServiceUnavailable title="연동 설정" description="jd-fit-analyzer가 배포되면 Notion·Slack 연동을 설정할 수 있습니다." />
        ) : (
        <Suspense fallback={<SkeletonList rows={2} />}>
          <IntegrationsContent />
        </Suspense>
        )}
        <DeleteAccount accountLabel="기업" />
      </main>
    </div>
  );
}
