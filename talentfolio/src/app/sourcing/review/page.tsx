"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Check, X, Loader2, Hash, Users, RefreshCw, Inbox } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { JD_ANALYZER_URL, isJdAnalyzerConfigured } from "@/types/fitReport";
import ServiceUnavailable from "@/components/ServiceUnavailable";
import { SOURCING_STATUS_LABEL } from "@/types/sourcing";
import type { SourcingActionRecord, SourcingActionStatus } from "@/types/sourcing";

const POLL_MS = 4000;

const STATUS_COLOR: Record<SourcingActionStatus, string> = {
  pending: "#ffae2e",
  approved: "#ffae2e",
  rejected: "#737373",
  executed: "#4ade80",
  failed: "#f87171",
};

export default function SourcingReviewPage() {
  const { profile, user } = useAuth();
  const sourcingAvailable = isJdAnalyzerConfigured() && Boolean(JD_ANALYZER_URL);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [actions, setActions] = useState<SourcingActionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const filterRef = useRef(filter);
  filterRef.current = filter;

  const load = useCallback(async () => {
    if (!sourcingAvailable) {
      setActions([]);
      setLoading(false);
      return;
    }
    try {
      const params = new URLSearchParams();
      if (filterRef.current === "pending") params.set("status", "pending");
      if (filterRef.current === "all" && user?.id) params.set("userId", user.id);
      const qs = params.toString();
      const res = await fetch(`${JD_ANALYZER_URL}/api/sourcing/actions${qs ? `?${qs}` : ""}`);
      const data = await res.json();
      let list = (data.actions ?? []) as SourcingActionRecord[];
      if (filterRef.current === "all" && user?.id) {
        list = list.filter((a) => a.userId === user.id);
      }
      setActions(list);
    } catch {
      setActions([]);
    } finally {
      setLoading(false);
    }
  }, [sourcingAvailable, user?.id]);

  // 폴링: Slack에서 승인/반려된 결정도 화면에 반영
  useEffect(() => {
    setLoading(true);
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load, filter]);

  async function review(id: string, action: "approve" | "reject") {
    setBusyId(id);
    try {
      await fetch(`${JD_ANALYZER_URL}/api/sourcing/actions/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, decidedBy: profile?.name ?? user?.email ?? "talentfolio-web" }),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#060309" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px 80px" }}>
        {!sourcingAvailable ? (
          <ServiceUnavailable title="승인 검토" />
        ) : (
        <>
        {/* ── Top nav ── */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/sourcing"
            className="flex items-center gap-1.5 text-sm"
            style={{ color: "var(--text-secondary)", fontFamily: "DM Sans, sans-serif" }}
          >
            <ArrowLeft size={15} />
            소싱 화면으로
          </Link>
          <button
            onClick={load}
            className="flex items-center gap-1.5 text-sm"
            style={{ color: "var(--text-secondary)", fontFamily: "DM Sans, sans-serif" }}
          >
            <RefreshCw size={14} />
            새로고침
          </button>
        </div>

        {/* ── Title + filter ── */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1.5" style={{ color: "var(--text-primary)", fontFamily: "Syne, sans-serif" }}>
              소싱 승인 검토
            </h1>
            <p className="text-sm" style={{ color: "var(--text-secondary)", fontFamily: "DM Sans, sans-serif" }}>
              승인하면 Slack으로 실제 전송됩니다. Slack 버튼으로 처리한 결과도 자동 반영됩니다.
            </p>
          </div>
          <div className="flex rounded-lg overflow-hidden shrink-0" style={{ border: "1px solid #271c32" }}>
            {(["pending", "all"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-3 py-1.5 text-xs font-semibold transition-colors"
                style={{
                  background: filter === f ? "rgba(var(--accent-rgb), 0.15)" : "transparent",
                  color: filter === f ? "var(--accent)" : "var(--text-secondary)",
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                {f === "pending" ? "승인 대기" : "전체"}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-16" style={{ color: "var(--text-secondary)" }}>
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm">불러오는 중...</span>
          </div>
        )}

        {!loading && actions.length === 0 && (
          <div className="text-center py-16" style={{ color: "var(--text-secondary)" }}>
            <Inbox size={28} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">{filter === "pending" ? "승인 대기 중인 요청이 없습니다." : "등록된 소싱 액션이 없습니다."}</p>
          </div>
        )}

        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {actions.map((action) => {
              const isPending = action.status === "pending";
              return (
                <motion.div
                  key={action.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="rounded-2xl p-5"
                  style={{ background: "#0d0918", border: "1px solid #271c32" }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "DM Sans, sans-serif" }}>
                      <Hash size={14} style={{ color: "var(--text-secondary)" }} />
                      {action.payload.channel.replace(/^#/, "")}
                    </div>
                    <span
                      className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
                      style={{
                        background: `${STATUS_COLOR[action.status]}1f`,
                        color: STATUS_COLOR[action.status],
                        fontFamily: "DM Sans, sans-serif",
                      }}
                    >
                      {SOURCING_STATUS_LABEL[action.status]}
                    </span>
                  </div>

                  <pre
                    className="text-sm whitespace-pre-wrap mb-3"
                    style={{ color: "var(--text-primary)", fontFamily: "DM Sans, sans-serif", margin: 0 }}
                  >
                    {action.payload.text}
                  </pre>

                  {action.payload.candidateNames && action.payload.candidateNames.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs mb-3" style={{ color: "var(--text-secondary)" }}>
                      <Users size={12} />
                      {action.payload.candidateNames.join(", ")}
                    </div>
                  )}

                  {isPending ? (
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => review(action.id, "approve")}
                        disabled={busyId === action.id}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40"
                        style={{ background: "linear-gradient(135deg, #16a34a, #15803d)", color: "white", fontFamily: "DM Sans, sans-serif" }}
                      >
                        {busyId === action.id ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                        승인 (Slack 전송)
                      </button>
                      <button
                        onClick={() => review(action.id, "reject")}
                        disabled={busyId === action.id}
                        className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40"
                        style={{ background: "var(--surface-elevated)", border: "1px solid #271c32", color: "var(--text-secondary)", fontFamily: "DM Sans, sans-serif" }}
                      >
                        <X size={15} />
                        반려
                      </button>
                    </div>
                  ) : (
                    <div className="text-[11px] pt-1" style={{ color: "var(--text-secondary)" }}>
                      {new Date(action.updatedAt).toLocaleString("ko-KR")}
                      {typeof action.result?.decidedBy === "string" && action.result.decidedBy ? ` · 처리자: ${action.result.decidedBy}` : ""}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
        </>
        )}
      </div>
    </div>
  );
}
