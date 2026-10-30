"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, Send, Loader2, ArrowLeft, ClipboardCheck, Hash, Users, CheckCircle2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { JD_ANALYZER_URL, isJdAnalyzerConfigured } from "@/types/fitReport";
import ServiceUnavailable from "@/components/ServiceUnavailable";
import type { CandidateSourcingSummary } from "@/types/sourcing";
import { SiteHeader } from "@/components/site/SiteHeader";
import { DeskTabs } from "@/components/desk/DeskTabs";

const inputBase: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border-color)",
  color: "var(--text-primary)",
  fontFamily: "Pretendard Variable, sans-serif",
  padding: "10px 12px",
  borderRadius: 12,
  outline: "none",
};

export default function SourcingPage() {
  const { user, profile } = useAuth();

  const [query, setQuery] = useState("");
  const [role, setRole] = useState<"" | "developer" | "designer">("");
  const [candidates, setCandidates] = useState<CandidateSourcingSummary[]>([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [channel, setChannel] = useState("#recruiting");
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ kind: "ok" | "warn" | "error"; message: string } | null>(null);

  const selectedNames = candidates.filter((c) => selectedIds.includes(c.id)).map((c) => c.name);
  const sourcingAvailable = isJdAnalyzerConfigured() && Boolean(JD_ANALYZER_URL);

  async function search() {
    if (!sourcingAvailable) return;
    setSearching(true);
    setResult(null);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("query", query.trim());
      if (role) params.set("role", role);
      const res = await fetch(`${JD_ANALYZER_URL}/api/sourcing/candidates?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setCandidates([]);
        setSearched(true);
        setResult({ kind: "error", message: data.error ?? `검색 실패 (${res.status})` });
        return;
      }
      setCandidates(data.candidates ?? []);
      setSearched(true);
    } catch {
      setCandidates([]);
      setSearched(true);
      setResult({ kind: "error", message: "검색에 실패했습니다. 분석 서버가 연결되어 있는지 확인하세요." });
    } finally {
      setSearching(false);
    }
  }

  function toggleCandidate(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  async function submitAction(e: React.FormEvent) {
    e.preventDefault();
    if (!sourcingAvailable || !channel.trim() || !text.trim() || submitting) return;
    setSubmitting(true);
    setResult(null);

    const userId = user?.id ?? "demo-user";
    try {
      const res = await fetch(`${JD_ANALYZER_URL}/api/sourcing/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: channel.trim(),
          text: text.trim(),
          candidateIds: selectedIds,
          candidateNames: selectedNames,
          userId,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setText("");
        if (data.approvalWarning) {
          setResult({
            kind: "warn",
            message: `승인 요청이 등록됐지만 Slack 발송에 실패했습니다 (${data.approvalWarning}). 검토 화면에서 승인할 수 있습니다.`,
          });
        } else {
          setResult({
            kind: "ok",
            message: "Slack에 승인 요청을 보냈습니다. Slack 버튼이나 아래 '승인 검토' 화면에서 승인하면 실제로 전송됩니다.",
          });
        }
      } else {
        setResult({ kind: "error", message: `등록 실패: ${data.error ?? res.statusText}` });
      }
    } catch {
      setResult({ kind: "error", message: "등록에 실패했습니다. 분석 서버 연결을 확인하세요." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)" }}>
      <SiteHeader crumb="스카우트 건" />
      <main id="main" style={{ maxWidth: 720, margin: "0 auto", padding: "88px 20px 80px" }}>
        <div className="dk" style={{ padding: 0, maxWidth: "none" }}><DeskTabs /></div>
        {!sourcingAvailable ? (
          <ServiceUnavailable title="소싱 기능" description="jd-fit-analyzer·Slack 연동이 배포되면 후보 검색과 Slack 승인 요청을 사용할 수 있습니다." />
        ) : (
        <>
        {/* ── Top nav ── */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/desk"
            className="flex items-center gap-1.5 text-sm min-h-[44px]"
            style={{ color: "var(--text-secondary)", fontFamily: "Pretendard Variable, sans-serif" }}
          >
            <ArrowLeft size={15} />
            데스크로
          </Link>
          <Link
            href="/sourcing/review"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold"
            style={{
              background: "rgba(var(--des-color-rgb), 0.1)",
              border: "1px solid rgba(var(--des-color-rgb), 0.3)",
              color: "var(--des-color)",
              fontFamily: "Pretendard Variable, sans-serif",
            }}
          >
            <ClipboardCheck size={15} />
            Slack 발송 승인
          </Link>
        </div>

        {/* ── Title ── */}
        <div className="mb-8">
          <span className="tf-label">데스크 · 스카우트 건</span>
          <h1 className="tf-h1" style={{ fontSize: "clamp(28px,4vw,40px)" }}>
            스카우트 건 <em>만들기</em>
          </h1>
          <p className="tf-lead">
            후보를 찾아 고르고, 팀에 연락 승인을 요청하세요. <b>승인 전에는 후보에게 아무것도 나가지 않아요.</b>
          </p>
        </div>

        {/* ── 1. Search ── */}
        <section className="mb-8">
          <h2 className="flex items-center gap-2 text-sm font-bold mb-3" style={{ color: "var(--text-primary)", fontFamily: "Pretendard Variable, sans-serif" }}>
            <span
              className="w-5 h-5 rounded-md flex items-center justify-center text-xs"
              style={{ background: "rgba(var(--accent-rgb), 0.15)", border: "1px solid rgba(var(--accent-rgb), 0.35)", color: "var(--accent)" }}
            >
              1
            </span>
            인재 DB 검색
          </h2>
          <div className="flex gap-2 mb-4">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="이름 / 직함 / 기술 스택 키워드"
              className="flex-1 text-sm"
              style={inputBase}
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "" | "developer" | "designer")}
              className="text-sm"
              style={{ ...inputBase, padding: "10px 10px" }}
            >
              <option value="">전체</option>
              <option value="developer">개발자</option>
              <option value="designer">디자이너</option>
            </select>
            <button
              type="button"
              onClick={search}
              disabled={searching}
              className="btn-brand btn-brand--shadow-btn flex items-center gap-1.5 px-4 rounded-xl text-sm font-semibold disabled:opacity-40"
              style={{ color: "white", fontFamily: "Pretendard Variable, sans-serif" }}
            >
              {searching ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
              검색
            </button>
          </div>

          {searched && candidates.length === 0 && (
            <p className="text-sm py-6 text-center" style={{ color: "var(--text-secondary)" }}>
              검색 결과가 없습니다.
            </p>
          )}

          {candidates.length > 0 && (
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border-color)" }}>
              <div
                className="px-4 py-2.5 flex items-center justify-between text-xs font-semibold"
                style={{ background: "var(--surface)", color: "var(--text-secondary)" }}
              >
                <span>{candidates.length}명 검색됨</span>
                <span className="flex items-center gap-1" style={{ color: selectedIds.length > 0 ? "var(--accent)" : "inherit" }}>
                  <Users size={12} />
                  {selectedIds.length}명 선택
                </span>
              </div>
              <div style={{ background: "var(--surface)" }}>
                {candidates.map((c) => {
                  const active = selectedIds.includes(c.id);
                  return (
                    <label
                      key={c.id}
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors"
                      style={{ borderTop: "1px solid #1a1322", background: active ? "rgba(var(--accent-rgb), 0.06)" : "transparent" }}
                    >
                      <input type="checkbox" checked={active} onChange={() => toggleCandidate(c.id)} className="accent-[var(--accent)]" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate" style={{ color: "var(--text-primary)", fontFamily: "Pretendard Variable, sans-serif" }}>
                            {c.name}
                          </span>
                          <span
                            className="text-xs px-1.5 py-0.5 rounded shrink-0"
                            style={{
                              background: c.role === "developer" ? "rgba(var(--dev-color-rgb), 0.12)" : "rgba(var(--des-color-rgb), 0.12)",
                              color: c.role === "developer" ? "var(--dev-color)" : "var(--des-color)",
                            }}
                          >
                            {c.role === "developer" ? "개발자" : "디자이너"}
                          </span>
                          {c.title && (
                            <span className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                              {c.title}
                            </span>
                          )}
                        </div>
                        {c.skills.length > 0 && (
                          <div className="text-xs mt-0.5 truncate" style={{ color: "var(--text-secondary)" }}>
                            {c.skills.join(" · ")}
                          </div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* ── 2. Compose ── */}
        <section>
          <h2 className="flex items-center gap-2 text-sm font-bold mb-3" style={{ color: "var(--text-primary)", fontFamily: "Pretendard Variable, sans-serif" }}>
            <span
              className="w-5 h-5 rounded-md flex items-center justify-center text-xs"
              style={{ background: "rgba(var(--accent-rgb), 0.15)", border: "1px solid rgba(var(--accent-rgb), 0.35)", color: "var(--accent)" }}
            >
              2
            </span>
            Slack 승인 요청 작성
          </h2>
          <form onSubmit={submitAction} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Slack 채널
              </label>
              <div className="flex items-center" style={{ ...inputBase, padding: 0 }}>
                <span className="pl-3 pr-1" style={{ color: "var(--text-secondary)" }}>
                  <Hash size={14} />
                </span>
                <input
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  className="flex-1 bg-transparent text-sm outline-none py-2.5 pr-3"
                  style={{ color: "var(--text-primary)", fontFamily: "Pretendard Variable, sans-serif" }}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
                메시지 내용
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={5}
                placeholder={
                  selectedNames.length > 0
                    ? `선택된 후보자(${selectedNames.length}명): ${selectedNames.join(", ")}\n\n연락 사유와 메시지를 입력하세요.`
                    : "후보자를 선택하고 메시지를 입력하세요."
                }
                className="w-full text-sm resize-y"
                style={inputBase}
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                작성자: {profile?.name ?? user?.email ?? "demo-user"}
              </span>
              <motion.button
                type="submit"
                whileTap={{ scale: 0.97 }}
                disabled={!channel.trim() || !text.trim() || submitting}
                className="btn-brand btn-brand--shadow-btn flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  color: "white",
                  fontFamily: "Pretendard Variable, sans-serif",
                }}
              >
                {submitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                승인 요청 보내기
              </motion.button>
            </div>
          </form>

          {result && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 flex items-start gap-2 px-4 py-3 rounded-xl text-sm"
              style={{
                background:
                  result.kind === "ok"
                    ? "rgba(var(--ok-rgb), 0.08)"
                    : result.kind === "warn"
                      ? "rgba(var(--des-color-rgb), 0.08)"
                      : "rgba(var(--accent-rgb), 0.08)",
                border: `1px solid ${
                  result.kind === "ok"
                    ? "rgba(var(--ok-rgb), 0.3)"
                    : result.kind === "warn"
                      ? "rgba(var(--des-color-rgb), 0.3)"
                      : "rgba(var(--accent-rgb), 0.3)"
                }`,
                color: result.kind === "ok" ? "var(--ok)" : result.kind === "warn" ? "var(--des-color)" : "var(--danger)",
                fontFamily: "Pretendard Variable, sans-serif",
              }}
            >
              {result.kind === "ok" ? (
                <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              )}
              <span>{result.message}</span>
            </motion.div>
          )}
        </section>
        </>
        )}
      </main>
    </div>
  );
}
