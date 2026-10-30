"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ProductShell } from "@/components/product/ProductShell";
import { ConsentCard } from "@/components/studio/ConsentCard";
import { lifeApi, trustLabel, type LifeMatchReport, type LifeSourcingAction } from "@/lib/lifeApi";
import { statusLabel, verdictLabel } from "@/lib/labels";
import { LoadError, SkeletonList, StateView } from "@/components/state/StateView";

export default function LifeMatchesPage() {
  const [reports, setReports] = useState<LifeMatchReport[]>([]);
  const [actions, setActions] = useState<LifeSourcingAction[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [excludedAll, setExcludedAll] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const m = await lifeApi.matches();
      setReports(m.reports);
      setActions(m.sourcingActions);
      setState("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setState("error");
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  // 응답에 공고 식별자(job_posting_id)가 없어 공고별 제외는 제공하지 않고 전체 제외만 둔다
  const toggleAll = async () => {
    setNotice(null);
    setBusy(true);
    try {
      if (excludedAll) {
        await lifeApi.removeExclusion(null);
        setExcludedAll(false);
        setNotice("전체 제외를 해제했습니다.");
      } else {
        await lifeApi.addExclusion(null);
        setExcludedAll(true);
        setNotice("앞으로 모든 공고 추천에서 제외됩니다.");
      }
    } catch (err) {
      setNotice(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ProductShell crumble="스튜디오 · 받은 추천">
      <div className="product-page" style={{ maxWidth: 1000 }}>
        <p className="product-eyebrow">스튜디오 · 받은 추천</p>
        <h1 className="product-title" style={{ fontSize: 30 }}>받은 추천</h1>
        <p className="product-muted studio-lede">
          내 공개 카드가 어떤 공고 추천에 근거로 쓰였는지 보여줍니다. 원하지 않으면 모든 추천에서 제외할 수 있습니다.
        </p>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button type="button" className="product-chip" onClick={() => void toggleAll()} disabled={busy}>
            {excludedAll ? "전체 제외 해제" : "모든 추천 제외"}
          </button>
          <Link href="/studio/cards" className="product-chip">내 카드</Link>
        </div>
        {notice && <p className="studio-help" aria-live="polite">{notice}</p>}

        <ConsentCard required="matching" />

        {state === "loading" ? (
          <SkeletonList rows={3} label="받은 추천을 불러오는 중" />
        ) : state === "error" ? (
          <LoadError what="받은 추천" error={error} />
        ) : reports.length === 0 && actions.length === 0 ? (
          <StateView
            art="plane"
            title="아직 받은 추천이 없어요"
            note="공개한 카드가 공고와 맞으면 알려 드려요"
            action={{ href: "/studio/cards", label: "내 카드 공개하기" }}
          />
        ) : (
          <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
            {reports.map((r) => (
              <article key={r.id} className="product-panel studio-job">
                <div className="role">{r.jdHeadline ?? "공고 제목 없음"}</div>
                <div className="meta">
                  {[
                    r.verdict ? verdictLabel(r.verdict) : null,
                    r.overallScore != null ? `${r.overallScore}점` : null,
                    statusLabel(r.status),
                    r.createdAt.slice(0, 10),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
                <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
                  <span className="studio-label">근거로 쓰인 카드</span>
                  {r.evidenceCards.length === 0 ? (
                    <span className="studio-help">인용된 카드 없음</span>
                  ) : (
                    r.evidenceCards.map((c) => (
                      <div key={c.id} className="studio-help">
                        “{c.claim}” · {trustLabel(c.trust_level)}
                        {c.ai_edited && " · AI 교정"}
                        {c.recorded_at && ` · ${c.recorded_at.slice(0, 10)}`}
                      </div>
                    ))
                  )}
                </div>
              </article>
            ))}
            {actions.length > 0 && (
              <section className="product-panel">
                <span className="studio-label">헤드헌터 제안 진행</span>
                {actions.map((a) => (
                  <div key={a.id} className="studio-help">
                    {a.jdHeadline ?? "공고"} · {statusLabel(a.status)} · {a.createdAt.slice(0, 10)}
                  </div>
                ))}
              </section>
            )}
          </div>
        )}
      </div>
    </ProductShell>
  );
}
