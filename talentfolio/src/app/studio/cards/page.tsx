"use client";

import { LoadError, SkeletonList, StateView } from "@/components/state/StateView";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ProductShell } from "@/components/product/ProductShell";
import { ConsentCard } from "@/components/studio/ConsentCard";
import {
  DRAFT_SLOT_LABELS,
  isConsentRequired,
  lifeApi,
  sourceLabel,
  streamJob,
  trustLabel,
  type LifeActivity,
  type LifeCard,
  type LifeDraft,
} from "@/lib/lifeApi";

export default function LifeCardsPage() {
  const [activities, setActivities] = useState<LifeActivity[]>([]);
  const [drafts, setDrafts] = useState<LifeDraft[]>([]);
  const [cards, setCards] = useState<LifeCard[]>([]);
  const [needConsent, setNeedConsent] = useState(false);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await lifeApi.drafts();
      setActivities(res.activities);
      setDrafts(res.drafts);
      setCards(res.cards);
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

  const orphanCards = cards.filter((c) => !c.activity_id || !activities.some((a) => a.id === c.activity_id));

  return (
    <ProductShell crumble="스튜디오 · 내 카드">
      <div className="product-page" style={{ maxWidth: 1000 }}>
        <p className="product-eyebrow">스튜디오 · 내 카드</p>
        <h1 className="product-title" style={{ fontSize: 30 }}>내 카드</h1>
        <p className="product-muted studio-lede">
          초안은 내가 쓴 문장을 칸별로 나눈 것입니다. 카드는 직접 고칠 수 있고, 공개한 카드만 기업에 보입니다.
          <Link href="/studio/log" style={{ marginLeft: 6, textDecoration: "underline" }}>기록 추가</Link>
        </p>

        {needConsent && <ConsentCard required="self_ai" onSaved={() => setNeedConsent(false)} />}

        {state === "loading" ? (
          <SkeletonList rows={3} label="내 카드를 불러오는 중" />
        ) : state === "error" ? (
          <LoadError what="내 카드" error={error} />
        ) : activities.length === 0 && cards.length === 0 ? (
          <StateView
            art="kite"
            title="아직 카드가 없어요"
            note="오늘 한 일 한 줄이면 충분해요"
            body="기록을 남기면 AI가 근거 카드로 정리해 여기에 모아 둬요."
            action={{ href: "/studio/log", label: "첫 기록 쓰기" }}
          />
        ) : (
          <div style={{ display: "grid", gap: 18, marginTop: 24 }}>
            {activities.map((a) => (
              <section key={a.id} className="product-panel">
                <div className="studio-work-head">
                  <strong>{a.title}</strong>
                  <span>{[a.occurred_on, ...(a.tags ?? [])].filter(Boolean).join(" · ")}</span>
                </div>
                {a.summary && <p className="studio-help" style={{ marginTop: 0 }}>{a.summary}</p>}
                {drafts
                  .filter((d) => d.activity_id === a.id)
                  .map((d) => {
                    const sentences = [...(d.draft?.sentences ?? [])].sort((x, y) => x.slot - y.slot);
                    if (sentences.length === 0) return null;
                    return (
                      <div key={d.id} style={{ display: "grid", gap: 10, marginBottom: 12 }}>
                        <span className="studio-label">초안 (검토 대기)</span>
                        {sentences.map((st, i) => (
                          <div key={`${st.slot}-${i}`}>
                            <div className="studio-kind">{DRAFT_SLOT_LABELS[st.slot] ?? `칸 ${st.slot}`}</div>
                            <p style={{ margin: "4px 0", fontSize: 14, whiteSpace: "pre-wrap" }}>{st.text}</p>
                            {st.quotes?.length > 0 && (
                              <div className="studio-help">내 원문 인용 {st.quotes.length}건 근거</div>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                <div style={{ display: "grid", gap: 10 }}>
                  {cards
                    .filter((c) => c.activity_id === a.id)
                    .map((c) => (
                      <CardEditor key={`${c.id}:${c.claim}`} card={c} onChanged={load} onConsentRequired={() => setNeedConsent(true)} />
                    ))}
                </div>
              </section>
            ))}
            {orphanCards.length > 0 && (
              <section className="product-panel">
                <div className="studio-work-head"><strong>활동 미지정 카드</strong></div>
                <div style={{ display: "grid", gap: 10 }}>
                  {orphanCards.map((c) => (
                    <CardEditor key={`${c.id}:${c.claim}`} card={c} onChanged={load} onConsentRequired={() => setNeedConsent(true)} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </ProductShell>
  );
}

// claim 이 서버에서 바뀌면(AI 교정·저장) key 가 바뀌어 편집 버퍼를 서버 값으로 다시 시작한다
function CardEditor({
  card,
  onChanged,
  onConsentRequired,
}: {
  card: LifeCard;
  onChanged: () => Promise<void>;
  onConsentRequired: () => void;
}) {
  const origLinks = (card.links ?? []).map((l) => l.url).join("\n");
  const [claim, setClaim] = useState(card.claim);
  const [links, setLinks] = useState(origLinks);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const isPublic = card.visibility === "public";
  const parsedLinks = links.split("\n").map((l) => l.trim()).filter(Boolean);
  const dirty = claim !== card.claim || parsedLinks.join("\n") !== origLinks;

  const run = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(label);
    setError(null);
    setNotice(null);
    try {
      await fn();
      await onChanged();
    } catch (err) {
      if (isConsentRequired(err)) {
        onConsentRequired();
        setError("AI 교정을 쓰려면 위 동의 카드에서 AI 기록 정리에 동의하세요.");
        return;
      }
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="product-panel" style={{ padding: 14 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        <span className="product-skill">{sourceLabel(card.source)}</span>
        <span className="product-skill">신뢰 등급: {trustLabel(card.trust_level)}</span>
        {card.ai_edited && <span className="product-skill">AI 교정</span>}
        <span className="product-skill">{isPublic ? "공개" : "비공개"}</span>
        {card.recorded_at && <span className="studio-help">{card.recorded_at.slice(0, 10)}</span>}
      </div>
      <textarea
        className="product-field"
        value={claim}
        onChange={(e) => setClaim(e.target.value)}
        aria-label="카드 문장"
        style={{ minHeight: 64, resize: "vertical" }}
      />
      <textarea
        className="product-field"
        value={links}
        onChange={(e) => setLinks(e.target.value)}
        aria-label="근거 링크 (한 줄에 하나)"
        placeholder="근거 링크 (한 줄에 하나)"
        style={{ minHeight: 40, resize: "vertical" }}
      />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          className="product-chip"
          disabled={!dirty || !!busy}
          onClick={() => run("save", () => lifeApi.editCard(card.id, {
                claim: claim.trim(),
                links: parsedLinks.map((url) => card.links.find((l) => l.url === url) ?? { url }),
              }))}
        >
          {busy === "save" ? "저장 중" : "저장"}
        </button>
        <button
          type="button"
          className="product-chip"
          disabled={!!busy}
          title="맞춤법·문장만 다듬습니다. 교정된 카드에는 AI 교정 표시가 남습니다."
          onClick={() =>
            run("polish", async () => {
              const { jobId } = await lifeApi.polishCard(card.id);
              await streamJob(jobId);
            })
          }
        >
          {busy === "polish" ? "교정 중" : "AI 교정"}
        </button>
        {isPublic ? (
          <button type="button" className="product-chip" disabled={!!busy} onClick={() =>
              run("unpub", async () => {
                const { jobId } = await lifeApi.unpublishCard(card.id);
                await streamJob(jobId).catch(() => undefined);
              })
            }>
            {busy === "unpub" ? "철회 중" : "공개 철회"}
          </button>
        ) : (
          <button
            type="button"
            className="product-chip"
            disabled={!!busy || dirty}
            title={dirty ? "먼저 저장하세요" : undefined}
            onClick={() =>
              run("pub", async () => {
                const res = await lifeApi.publishCard(card.id);
                // life-publish 잡(임베딩·캐시 무효화) 완료까지 대기. 실패해도 공개 자체는 반영됨.
                if (res.jobId) await streamJob(res.jobId).catch(() => undefined);
                if (!res.matchingConsent) {
                  setNotice("공개했지만 매칭 동의 전엔 기업에 노출되지 않습니다.");
                  onConsentRequired();
                }
              })
            }
          >
            {busy === "pub" ? "공개 중" : "공개"}
          </button>
        )}
      </div>
      {notice && <p className="studio-help" aria-live="polite">{notice}</p>}
      {error && <p className="studio-help" style={{ color: "#b91c1c" }}>{error}</p>}
    </div>
  );
}
