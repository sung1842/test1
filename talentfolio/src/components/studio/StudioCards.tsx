"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ConsentCard } from "./ConsentCard";
import { isConsentRequired, lifeApi, streamJob, type LifeActivity, type LifeCard, type LifeCardLink } from "@/lib/lifeApi";
import {
  CLAIM_MAX, EVIDENCE_ACCEPT, SLOT_LABELS, evidenceUrl, fmtDate, isStoredEvidence, joinSlots, removeEvidenceFile, setCardFeatured, slotsOf,
  sortCards, splitSlots, updateActivityTitle, uploadEvidence,
} from "./studioData";

const STEPS = ["상황", "역할", "행동", "어려움", "결과", "배운 점"] as const;
const QUESTIONS = [
  "최근에 기억에 남는 일, 어떤 상황이었나요?",
  "그 일에서 내가 맡은 역할은 무엇이었나요?",
  "구체적으로 무엇을 했나요?",
  "어려웠던 점은 무엇이었나요?",
  "결과는 어땠나요? 숫자가 있으면 좋아요.",
  "다음에 다르게 한다면 무엇을 바꿀까요?",
];

/**
 * 근거 카드 (SQL 015·017·018). 질문 여섯 칸에 답하면 orchestrator life-structure 잡이 카드로 나눈다 (AI 는 칸만 나누고 내용을 더하지 않음).
 * 공개 카드만 기업 검색·추천·JD 분석에 쓰인다. 근거는 링크·사진·문서(비공개 버킷) — 파일은 기업에게 열리지 않고 "첨부 N개" 로만 보인다.
 */
export function StudioCards({ userId, preview, onChange }: { userId: string; preview: boolean; onChange: () => void }) {
  const [cards, setCards] = useState<LifeCard[]>([]);
  const [activities, setActivities] = useState<LifeActivity[]>([]);
  const [filter, setFilter] = useState<"all" | "pub" | "priv">("all");
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [toast, setToast] = useState<string | null>(null);
  const [consent, setConsent] = useState<"self_ai" | "matching" | null>(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>(["", "", "", "", "", ""]);
  const [busy, setBusy] = useState<Record<string, string>>({}); // 카드 id → 진행 중 문구 (카드를 잠근다)
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await lifeApi.drafts();
      setCards(r.cards);
      setActivities(r.activities);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const say = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(null), 2600);
  };

  async function act(id: string, label: string, fn: () => Promise<unknown>, done: string, consentFor?: "self_ai" | "matching") {
    setBusy((b) => ({ ...b, [id]: label }));
    try {
      await fn();
      await load();
      onChange();
      say(done);
    } catch (e) {
      if (isConsentRequired(e) && consentFor) setConsent(consentFor);
      else say(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy((b) => { const n = { ...b }; delete n[id]; return n; });
    }
  }

  /** 여섯 칸 답 → 세션 메시지 → 세션 닫기(구조화 잡) → 카드 */
  const draft = () =>
    act("ask", "칸 나누는 중…", async () => {
      const filled = answers.map((a, i) => (a.trim() ? `${STEPS[i]}: ${a.trim()}` : "")).filter(Boolean);
      if (!filled.length) throw new Error("한 칸 이상 적어 주세요.");
      const { session } = await lifeApi.createSession(answers[0].trim().slice(0, 60) || "근거 카드");
      for (const m of filled) await lifeApi.addMessage(session.id, m);
      const { jobId } = await lifeApi.closeSession(session.id);
      await streamJob(jobId);
      setAnswers(["", "", "", "", "", ""]);
      setStep(0);
    }, "근거 카드로 저장했어요 (비공개)", "self_ai");

  const ops: CardOps = {
    // 내용 수정. 공개 카드면 다시 공개 처리(life-publish 잡)로 기업 검색·분석용 임베딩을 새 내용으로 맞춘다
    edit: (c, newTitle, claim) => act(c.id, "저장 중…", async () => {
      if (newTitle !== null && c.activity_id) await updateActivityTitle(c.activity_id, newTitle);
      if (claim !== c.claim) await lifeApi.editCard(c.id, { claim });
      if (c.visibility === "public" && claim !== c.claim) await lifeApi.publishCard(c.id);
    }, "수정했어요"),
    toggle: (c) => act(c.id, c.visibility === "public" ? "비공개로 바꾸는 중…" : "공개하는 중…", async () => {
      if (c.visibility === "public") await lifeApi.unpublishCard(c.id);
      else if (!(await lifeApi.publishCard(c.id)).matchingConsent) setConsent("matching");
    }, c.visibility === "public" ? "비공개로 바꿨어요" : "공개했어요", "matching"),
    star: (c) => act(c.id, "저장 중…", () => setCardFeatured(c.id, !c.featured), c.featured ? "대표에서 뺐어요" : "대표로 정했어요"),
    polish: (c) => act(c.id, "AI 교정 중… 맞춤법·문장만 다듬어요", async () => {
      const { jobId } = await lifeApi.polishCard(c.id);
      await streamJob(jobId);
    }, "맞춤법·문장만 다듬었어요", "self_ai"),
    addLink: (c, url, label) => act(c.id, "근거 붙이는 중…", () => lifeApi.editCard(c.id, { links: [...c.links, { url, kind: "link", ...(label ? { label } : {}) }] }), "근거 링크를 붙였어요"),
    addFile: (c, file) => act(c.id, "파일 올리는 중…", async () => {
      const ev = await uploadEvidence(userId, c.id, file);
      await lifeApi.editCard(c.id, { links: [...c.links, ev] });
    }, "근거 파일을 붙였어요"),
    removeEvidence: (c, link) => act(c.id, "근거 빼는 중…", async () => {
      await lifeApi.editCard(c.id, { links: c.links.filter((l) => l.url !== link.url) });
      await removeEvidenceFile(link.url);
    }, "근거를 뺐어요"),
  };

  const pub = cards.filter((c) => c.visibility === "public");
  const shown = sortCards(cards).filter((c) => (preview ? c.visibility === "public" : filter === "all" || (filter === "pub") === (c.visibility === "public")));
  const featured = cards.filter((c) => c.featured).length;
  const title = (c: LifeCard) => activities.find((a) => a.id === c.activity_id)?.title;
  const open = cards.find((c) => c.id === openId) ?? null;

  return (
    <section className="view on">
      <div className="head">
        <div>
          <p className="eyebrow">나를 보여주기</p>
          <h1>내가 한 일을 근거 카드로</h1>
          <p className="lede">질문에 답하면 여섯 칸으로 나눠 근거 카드로 만들어요.</p>
        </div>
        <button className="btn pri edit-only" onClick={() => document.getElementById("askText")?.focus()}>+ 카드 만들기</button>
      </div>

      {consent && (
        <div className="edit-only" style={{ marginBottom: 16 }}>
          <ConsentCard required={consent} onSaved={() => { setConsent(null); void load(); }} />
        </div>
      )}

      <div className="ask edit-only" style={{ position: "relative" }}>
        <div>
          <p className="q-label">오늘의 질문 · {step + 1}/6 <span className="priv">· 나만 보기</span></p>
          <div className="steps">
            {STEPS.map((s, i) => (
              <button key={s} aria-current={i === step} data-st={answers[i].trim() ? "done" : undefined} onClick={() => setStep(i)}>{s}</button>
            ))}
          </div>
          <p className="q">{QUESTIONS[step]}</p>
          <textarea id="askText" placeholder="말하듯 적어 주세요. 정답은 없어요." value={answers[step]} disabled={!!busy.ask}
            onChange={(e) => setAnswers((a) => a.map((x, i) => (i === step ? e.target.value : x)))} />
          <div className="ask-row">
            <button className="btn" onClick={() => setStep((s) => (s + 1) % 6)}>다음 질문</button>
            <button className="btn pri" disabled={!!busy.ask} onClick={() => void draft()}>{busy.ask ?? "AI로 칸 나누기"}</button>
          </div>
          <small className="note" style={{ display: "block" }}>답은 원문 그대로 저장되고 칸마다 내 원문을 인용해 보여 줘요. AI는 칸만 나누고 내용을 더하지 않으며, 교정은 맞춤법·문장만 해요.</small>
        </div>
        <div className="ask-side"><b>이렇게 쓰여요</b>여섯 칸을 다 채우지 않아도 돼요. 저장한 카드는 공개로 바꾸기 전까지 나만 봐요.</div>
      </div>

      <div className="sec-t">
        <span style={{ color: "var(--ink)", fontSize: 13, fontWeight: 650 }}>내 근거 카드</span>
        <span>공개한 카드만 기업에게 보여요 · ★ {featured}개가 맨 앞 · 카드를 누르면 전체 내용</span>
      </div>
      <div className="filters edit-only" id="filters" style={{ marginBottom: 12 }}>
        {([["all", "전체", cards.length], ["pub", "공개", pub.length], ["priv", "비공개", cards.length - pub.length]] as const).map(([k, l, n]) => (
          <button key={k} className="chip" data-on={filter === k} onClick={() => setFilter(k)}>{l} <i>{n}</i></button>
        ))}
      </div>

      {state === "loading" && <p className="note">불러오는 중…</p>}
      {state === "error" && <p className="note">카드를 불러오지 못했어요. 분석 서버(orchestrator)가 켜져 있는지 확인해 주세요.</p>}
      {state === "ready" && shown.length === 0 && <p className="note">{preview ? "공개한 카드가 없어요." : "아직 카드가 없어요. 위 질문에 답해 첫 카드를 만들어 보세요."}</p>}

      <div className="board">
        {shown.map((c) => (
          <CardPiece key={c.id} card={c} title={title(c)} busy={busy[c.id]} readOnly={preview} onOpen={() => setOpenId(c.id)} ops={ops} />
        ))}
      </div>
      <p className="note edit-only">배지(기록 시점·신뢰 등급·AI 교정)는 기업 화면에도 그대로 보이고 숨길 수 없어요. 사진·문서는 기업에게 열리지 않고, 연락 수락·면접 때 직접 보여 주면 돼요.</p>

      {open && <CardModal card={open} title={title(open)} busy={busy[open.id]} readOnly={preview} ops={ops} onClose={() => setOpenId(null)} />}
      {toast && <div className="toast" style={{ opacity: 1, transform: "translate(-50%,0)" }}>{toast}</div>}
    </section>
  );
}

interface CardOps {
  toggle: (c: LifeCard) => Promise<void>;
  star: (c: LifeCard) => Promise<void>;
  polish: (c: LifeCard) => Promise<void>;
  addLink: (c: LifeCard, url: string, label?: string) => Promise<void>;
  addFile: (c: LifeCard, file: File) => Promise<void>;
  removeEvidence: (c: LifeCard, link: LifeCardLink) => Promise<void>;
  edit: (c: LifeCard, title: string | null, claim: string) => Promise<void>;
}

const TRUST_BADGE: Record<string, [string, string]> = { confirmed: ["r-ok", "확인됨"], attached: ["r-att", "첨부"], self: ["r-self", "본인 주장"] };
const KIND_LABEL: Record<string, string> = { link: "링크", image: "사진", file: "문서" };
const kindOf = (l: LifeCardLink) => l.kind ?? (isStoredEvidence(l.url) ? "file" : "link");

function Badges({ card }: { card: LifeCard }) {
  const [tCls, tLabel] = TRUST_BADGE[card.trust_level] ?? TRUST_BADGE.self;
  return (
    <div className="badges">
      {card.source === "web"
        ? <span className="bd t-retro">회고 입력 · {fmtDate(card.recorded_at)} 입력</span>
        : <span className="bd t-live">활동 당시 작성</span>}
      <span className={`bd ${tCls}`}>{tLabel}</span>
      {card.ai_edited && <span className="bd ai">AI 교정</span>}
    </div>
  );
}

function evidenceSummary(card: LifeCard) {
  if (!card.links.length) return "근거 없음 · 링크나 사진을 붙이면 '첨부'가 돼요";
  const n: Record<string, number> = {};
  for (const l of card.links) n[kindOf(l)] = (n[kindOf(l)] ?? 0) + 1;
  return `근거: ${Object.entries(n).map(([k, v]) => `${KIND_LABEL[k]} ${v}`).join(" · ")} · ${fmtDate(card.recorded_at)} 기록`;
}

/** 목업 .piece 카드. 본문은 두 칸까지만 보이고, 누르면 모달로 전체 내용. 진행 중이면 카드 전체를 잠근다 */
export function CardPiece({ card, title, busy, readOnly, onOpen, ops }: {
  card: LifeCard; title?: string; busy?: string; readOnly?: boolean; onOpen?: () => void; ops?: CardOps;
}) {
  const pub = card.visibility === "public";
  const slots = splitSlots(card.claim);
  return (
    <article className={`piece${pub ? "" : " priv-card edit-only"}${busy ? " is-busy" : ""}`} data-pub={pub} aria-busy={!!busy}>
      {busy && <div className="piece-busy" role="status"><span className="spin" />{busy}</div>}
      <div className="piece-b">
        <Badges card={card} />
        <button className="piece-open" onClick={onOpen} disabled={!onOpen} aria-label={`${title ?? "카드"} 자세히 보기`}>
          <h4>{title ?? slots[0]?.text.slice(0, 40)}</h4>
          <p className="d clamp">
            {slots.slice(0, 2).map((s, i) => <span key={i}>{s.label && <b>{s.label} </b>}{s.text} </span>)}
          </p>
          {(slots.length > 2 || card.claim.length > 140) && <span className="more">더 보기</span>}
        </button>
        <p className="src">{evidenceSummary(card)}</p>
        {!readOnly && ops && (
          <>
            <div className="card-acts edit-only">
              <button className="mini" disabled={!!busy || card.ai_edited} onClick={() => void ops.polish(card)}>{card.ai_edited ? "AI 교정됨" : "AI 교정"}</button>
              <button className="mini" disabled={!!busy} onClick={onOpen}>수정 · 근거 첨부</button>
            </div>
            <div className="piece-foot">
              <button className="vis-tg" aria-pressed={pub} disabled={!!busy} onClick={() => void ops.toggle(card)}><span className="sw" /><span>{pub ? "공개" : "비공개"}</span></button>
              <button className="star-btn" aria-pressed={!!card.featured} disabled={!!busy} onClick={() => void ops.star(card)}>{card.featured ? "★" : "☆"} 대표</button>
            </div>
          </>
        )}
      </div>
    </article>
  );
}

/** 카드 전체 내용 + 근거(링크·사진·문서) 관리 */
function CardModal({ card, title, busy, readOnly, ops, onClose }: {
  card: LifeCard; title?: string; busy?: string; readOnly: boolean; ops: CardOps; onClose: () => void;
}) {
  const [urls, setUrls] = useState<Record<string, string | null>>({});
  const [link, setLink] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title ?? "");
  const [draftSlots, setDraftSlots] = useState<Record<string, string>>(() => slotsOf(card.claim));
  const draftClaim = joinSlots(draftSlots);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // 비공개 버킷 파일은 열 때만 임시 주소를 만든다
  useEffect(() => {
    let alive = true;
    for (const l of card.links.filter((x) => isStoredEvidence(x.url))) {
      evidenceUrl(l.url).then((u) => alive && setUrls((m) => ({ ...m, [l.url]: u })));
    }
    return () => { alive = false; };
  }, [card.links]);

  const slots = splitSlots(card.claim);
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal card" role="dialog" aria-modal="true" aria-label={title ?? "근거 카드"} onClick={(e) => e.stopPropagation()}>
        {busy && <div className="piece-busy" role="status"><span className="spin" />{busy}</div>}
        <div className="modal-h">
          <Badges card={card} />
          <button className="mini" onClick={onClose} aria-label="닫기">닫기</button>
        </div>
        {editing ? (
          <div className="slots">
            {card.activity_id && (
              <label><b>제목</b><input className="field" style={{ maxWidth: "none" }} maxLength={200} value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} /></label>
            )}
            {SLOT_LABELS.map((l) => (
              <label key={l}><b>{l}</b>
                <textarea className="field" style={{ maxWidth: "none", height: 64, padding: 8, resize: "vertical" }} value={draftSlots[l] ?? ""}
                  placeholder="비워 두면 이 칸은 빠져요" onChange={(e) => setDraftSlots((d) => ({ ...d, [l]: e.target.value }))} />
              </label>
            ))}
            <div className="ask-row" style={{ marginTop: 0 }}>
              <small style={{ color: draftClaim.length > CLAIM_MAX ? "#B23B3B" : undefined }}>{draftClaim.length} / {CLAIM_MAX}자{card.visibility === "public" ? " · 공개 카드라 저장하면 기업 화면에도 바로 반영돼요" : ""}</small>
              <span style={{ display: "flex", gap: 8 }}>
                <button className="btn" onClick={() => { setEditing(false); setDraftSlots(slotsOf(card.claim)); setDraftTitle(title ?? ""); }}>취소</button>
                <button className="btn pri" disabled={!!busy || !draftClaim || draftClaim.length > CLAIM_MAX}
                  onClick={() => void ops.edit(card, card.activity_id && draftTitle.trim() && draftTitle !== title ? draftTitle : null, draftClaim).then(() => setEditing(false))}>저장</button>
              </span>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
              <h3>{title ?? "근거 카드"}</h3>
              {!readOnly && <button className="mini" disabled={!!busy} onClick={() => setEditing(true)}>내용 수정</button>}
            </div>
            <div className="slots">
              {slots.map((s, i) => (
                <div key={i}>{s.label && <b>{s.label}</b>}<p>{s.text}</p></div>
              ))}
            </div>
          </>
        )}

        <p className="sec-t" style={{ marginTop: 18 }}>근거 <span>{readOnly ? "기업에게는 첨부 수만 보여요" : "사진·문서는 나만 볼 수 있어요"}</span></p>
        {card.links.length === 0 && <p className="note" style={{ marginTop: 0 }}>아직 근거가 없어요.</p>}
        <ul className="evidence">
          {card.links.map((l) => {
            const k = kindOf(l);
            const href = isStoredEvidence(l.url) ? urls[l.url] : l.url;
            return (
              <li key={l.url}>
                {k === "image" && href ? <img src={href} alt={l.label ?? "근거 사진"} /> : <span className="ev-kind">{KIND_LABEL[k]}</span>}
                <div style={{ minWidth: 0 }}>
                  {readOnly && isStoredEvidence(l.url)
                    ? <span>{KIND_LABEL[k]} 1개 첨부</span>
                    : href ? <a className="link" href={href} target="_blank" rel="noopener noreferrer">{l.label ?? l.url}</a> : <span>{l.label ?? "불러오는 중…"}</span>}
                </div>
                {!readOnly && <button className="mini danger" disabled={!!busy} onClick={() => void ops.removeEvidence(card, l)}>빼기</button>}
              </li>
            );
          })}
        </ul>

        {!readOnly && (
          <div className="ev-add">
            <div style={{ display: "flex", gap: 8 }}>
              <input className="field" style={{ maxWidth: "none" }} placeholder="https:// 근거 링크 (레포·문서·기사 등)" value={link} onChange={(e) => setLink(e.target.value)} />
              <button className="btn" disabled={!!busy} onClick={() => {
                if (!/^https?:\/\//.test(link.trim())) return setErr("http(s):// 로 시작하는 주소를 넣어 주세요.");
                setErr(null);
                void ops.addLink(card, link.trim()).then(() => setLink(""));
              }}>링크 붙이기</button>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
              <input ref={fileRef} type="file" accept={EVIDENCE_ACCEPT} hidden onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void ops.addFile(card, f);
              }} />
              <button className="btn" disabled={!!busy} onClick={() => fileRef.current?.click()}>사진·문서 올리기</button>
              <small className="note" style={{ margin: 0 }}>사진(메뉴판·작업물·현장)이나 PDF(수료증·결과 보고서), 10MB까지</small>
            </div>
            {err && <p className="note" style={{ color: "#B23B3B" }}>{err}</p>}
          </div>
        )}

        {!readOnly && (
          <div className="ask-row" style={{ marginTop: 18 }}>
            <button className="mini" disabled={!!busy || card.ai_edited} onClick={() => void ops.polish(card)}>{card.ai_edited ? "AI 교정됨" : "AI 교정 (맞춤법·문장만)"}</button>
            <span style={{ display: "flex", gap: 10 }}>
              <button className="vis-tg" aria-pressed={card.visibility === "public"} disabled={!!busy} onClick={() => void ops.toggle(card)}><span className="sw" /><span>{card.visibility === "public" ? "공개" : "비공개"}</span></button>
              <button className="star-btn" aria-pressed={!!card.featured} disabled={!!busy} onClick={() => void ops.star(card)}>{card.featured ? "★" : "☆"} 대표</button>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
