"use client";

// 제안 서신함 (기업). 승인한 후보에게 보낸 제안을 한곳에서 관리한다: 발송 승인 → 열람 확인 → 회신 → 면접 일정.
// 연락은 메일 형식으로만 한다 (실시간 채팅 없음). 목록은 ↑↓ 로 옮겨 다닐 수 있다.
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { DLoadError, DSkeleton, DState } from "@/components/desk/console/ui";
import { deskApi } from "@/lib/deskApi";
import { refreshDesk } from "@/lib/deskData";
import { deskOfferApi, fullDate, shortDate, STAGE_LABEL, STAGE_TONE, type DeskOfferDetail, type OfferMail, type OfferStage } from "@/lib/offerApi";
import { useCached } from "@/lib/useCached";

type FilterKey = "all" | "draft" | "waiting" | "replied" | "interview" | "closed";
const FILTERS: { key: FilterKey; label: string; stages: OfferStage[] | null }[] = [
  { key: "all", label: "전체", stages: null },
  { key: "draft", label: "발송 승인 대기", stages: ["draft"] },
  { key: "waiting", label: "답장 기다림", stages: ["sent", "viewed"] },
  { key: "replied", label: "회신 옴", stages: ["interested"] },
  { key: "interview", label: "면접", stages: ["interview"] },
  { key: "closed", label: "종료", stages: ["declined", "no_response", "withdrawn", "discarded"] },
];

const INTERVIEW_TEMPLATE = (name: string) =>
  `${name} 님, 안녕하세요.\n\n제안에 관심 가져 주셔서 감사합니다.\n아래 시각 중 편하신 때를 골라 주시면 면접 일정을 확정하겠습니다.\n\n· 진행 방식: \n· 예상 소요 시간: \n· 준비하실 것: \n\n일정이 맞지 않으면 가능한 시각을 회신으로 알려 주세요.\n감사합니다.`;

export default function DeskOffersPage() {
  const list = useCached("desk-offers-overview", () => deskOfferApi.overview(), { refreshMs: 30_000 });
  const offers = useMemo(() => list.data?.offers ?? null, [list.data]);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  // 주소의 ?id= 로 특정 제안을 바로 연다 (데스크 홈·알림에서 넘어올 때)
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) return;
    const t = setTimeout(() => setOpenId(id), 0);
    return () => clearTimeout(t);
  }, []);

  const counts = useMemo(() => {
    const c = new Map<FilterKey, number>();
    for (const f of FILTERS) c.set(f.key, (offers ?? []).filter((o) => !f.stages || f.stages.includes(o.stage)).length);
    return c;
  }, [offers]);
  const shown = useMemo(() => {
    const stages = FILTERS.find((f) => f.key === filter)?.stages;
    return (offers ?? []).filter((o) => !stages || stages.includes(o.stage));
  }, [offers, filter]);

  const select = useCallback((id: string | null) => {
    setOpenId(id);
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("id", id);
    else url.searchParams.delete("id");
    window.history.replaceState(null, "", url);
  }, []);

  const listRef = useRef<HTMLUListElement>(null);
  const onListKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const rows = [...(listRef.current?.querySelectorAll<HTMLButtonElement>("button.lc-orow") ?? [])];
    const at = rows.findIndex((r) => r === document.activeElement);
    const next = rows[Math.min(rows.length - 1, Math.max(0, at + (e.key === "ArrowDown" ? 1 : -1)))];
    if (next) {
      e.preventDefault();
      next.focus();
    }
  };

  const waitingOnMe = (offers ?? []).filter((o) => o.stage === "draft" || o.unread > 0).length;

  return (
    <>
      <header className="lc-top" data-in>
        <h1>제안</h1>
        <span className="lc-sub">
          {offers === null
            ? "승인한 후보에게 보낸 제안과 회신을 한곳에서 봅니다."
            : waitingOnMe > 0
              ? `확인할 서신 ${waitingOnMe}건 · 발송 승인과 회신 확인부터`
              : "지금 확인할 서신은 없습니다"}
        </span>
        <div className="lc-actions">
          <Link href="/review" className="lc-btn is-primary">승인한 후보에게 제안 쓰기</Link>
        </div>
      </header>

      {list.error && !offers ? (
        <section className="lc-panel"><DLoadError what="제안 서신함" error={list.error} /></section>
      ) : offers === null ? (
        <section className="lc-panel"><DSkeleton rows={4} label="제안 서신함을 불러오는 중" /></section>
      ) : offers.length === 0 ? (
        <section className="lc-panel"><DState title="아직 보낸 제안이 없습니다" body="승인함에서 후보를 승인한 뒤 제안을 쓰면 여기에서 발송과 회신을 관리합니다." action={{ href: "/review", label: "승인함으로 가기" }} /></section>
      ) : (
        <>
          <div className="lc-toolbar" data-in>
            <div className="lc-seg" role="group" aria-label="제안 걸러 보기" style={{ flexWrap: "wrap" }}>
              {FILTERS.map((f) => (
                <button key={f.key} type="button" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
                  {f.label} <span style={{ color: "var(--mute)" }}>{counts.get(f.key) ?? 0}</span>
                </button>
              ))}
            </div>
            <span className="lc-hint lc-hide-m" style={{ marginTop: 0, marginLeft: "auto" }}><span><span className="lc-kbd">↑</span><span className="lc-kbd">↓</span> 목록 이동</span></span>
          </div>
          <div className={`lc-mailbox${openId ? " is-reading" : ""}`}>
            <section className="lc-panel lc-olist-wrap" aria-label="제안 목록" data-in>
              {shown.length === 0 ? (
                <p className="lc-empty">이 단계에 해당하는 제안이 없습니다.</p>
              ) : (
                <ul className="lc-olist" ref={listRef} onKeyDown={onListKey}>
                  {shown.map((o) => (
                    <li key={o.id}>
                      <button type="button" className="lc-orow" aria-current={openId === o.id ? "true" : undefined} onClick={() => select(o.id)}>
                        <span className="who">{o.unread > 0 ? <i className="lc-dot" aria-hidden="true" /> : null}{o.candidateName ?? "후보"} 님{o.unread > 0 ? <span className="lc-sr"> (새 회신 {o.unread}통)</span> : null}</span>
                        <time dateTime={o.lastAt}>{shortDate(o.lastAt)}</time>
                        <span className="what">{o.caseTitle}{o.client ? ` · ${o.client}` : ""}</span>
                        <span className="line"><StageBadge stage={o.stage} /><span className="peek">{o.preview || "본문 없음"}</span></span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            {openId ? (
              <Letter key={openId} offerId={openId} onBack={() => select(null)} onChanged={async () => { await list.reload(); refreshDesk(); }} />
            ) : (
              <section className="lc-panel lc-hide-m" aria-live="polite"><p className="lc-empty">왼쪽 목록에서 제안을 고르면 주고받은 서신이 여기에 열립니다.</p></section>
            )}
          </div>
        </>
      )}
    </>
  );
}

const TONE_CLASS = { todo: " is-todo", wait: "", good: " is-good", done: " is-done" } as const;
function StageBadge({ stage }: { stage: OfferStage }) {
  return <span className={`lc-pill${TONE_CLASS[STAGE_TONE[stage]]}`}>{STAGE_LABEL[stage]}</span>;
}

interface TrackStep { label: string; at?: string | null; done: boolean }
/** 초안 → 발송 → 열람 → 회신 → 면접. 끝난 제안은 다음 칸에 종료 사유 */
function StageTrack({ steps, closed }: { steps: TrackStep[]; closed?: string }) {
  const lastDone = steps.reduce((acc, s, i) => (s.done ? i : acc), -1);
  return (
    <ol className="lc-track" aria-label="진행 단계">
      {steps.map((s, i) => (
        <li key={s.label} className={s.done ? (i === lastDone ? "on now" : "on") : ""} aria-current={i === lastDone ? "step" : undefined}>
          <span>{!s.done && closed && i === lastDone + 1 ? closed : s.label}</span>
          {s.done && s.at ? <time dateTime={s.at}>{fullDate(s.at)}</time> : null}
        </li>
      ))}
    </ol>
  );
}

function MailThread({ mails, names }: { mails: OfferMail[]; names: { company: string; candidate: string } }) {
  const picked = new Set(mails.map((m) => m.pickedSlot).filter(Boolean) as string[]);
  return (
    <ol className="lc-thread">
      {mails.map((m) => {
        const mine = m.from === "company";
        return (
          <li key={m.id} className={`lc-mail${mine ? "" : " theirs"}`}>
            <div className="top"><b>{mine ? names.company : names.candidate}</b><time dateTime={m.sentAt}>{fullDate(m.sentAt)}</time></div>
            <h3>{m.subject}</h3>
            <p className="body">{m.body || "본문 없이 근거 카드만 보냈습니다."}</p>
            {m.interviewSlots.length > 0 && (
              <div className="slots">
                면접 가능 시각
                <ul>{m.interviewSlots.map((s) => <li key={s} className={picked.has(s) ? "picked" : undefined}><time dateTime={s}>{fullDate(s)}</time>{picked.has(s) ? " · 확정" : ""}</li>)}</ul>
              </div>
            )}
            {m.pickedSlot && (
              <div className="slots">면접 시각을 골랐습니다<ul><li className="picked"><time dateTime={m.pickedSlot}>{fullDate(m.pickedSlot)}</time></li></ul></div>
            )}
            {mine && <p className="read">{m.readAt ? `읽음 · ${fullDate(m.readAt)}` : "아직 읽지 않음"}</p>}
          </li>
        );
      })}
    </ol>
  );
}

function trackOf(d: DeskOfferDetail): { steps: TrackStep[]; closed?: string } {
  const o = d.offer;
  const sent = !!o.sentAt;
  const replied = o.stage === "interested" || o.stage === "interview";
  const steps: TrackStep[] = [
    { label: "초안", at: o.createdAt, done: true },
    { label: "발송", at: o.sentAt, done: sent },
    { label: "열람", at: o.viewedAt, done: sent && (!!o.viewedAt || !!o.respondedAt) },
    { label: "회신", at: o.respondedAt, done: replied },
    { label: "면접", at: o.interviewAt, done: o.stage === "interview" },
  ];
  const closed = o.stage === "declined" ? "거절" : o.stage === "withdrawn" ? "철회" : o.stage === "discarded" ? "반려" : o.stage === "no_response" ? "무응답" : undefined;
  return { steps, closed };
}

function Letter({ offerId, onBack, onChanged }: { offerId: string; onBack: () => void; onChanged: () => Promise<void> }) {
  const [detail, setDetail] = useState<DeskOfferDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setDetail(await deskOfferApi.detail(offerId));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [offerId]);
  useEffect(() => {
    // 열면 회신이 읽음으로 바뀌므로 목록의 새 회신 표시도 같이 새로 고친다
    const t = setTimeout(() => void load().then(() => onChanged()), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  const act = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true);
    setNotice(null);
    try {
      await fn();
      await Promise.all([load(), onChanged()]);
      setNotice({ ok: true, text: done });
    } catch (e) {
      setNotice({ ok: false, text: e instanceof Error ? e.message : "오류가 발생했습니다. 다시 시도해 주세요." });
    } finally {
      setBusy(false);
    }
  };

  if (error && !detail) return <section className="lc-panel"><div className="lc-pb" style={{ paddingTop: 12 }}><button type="button" className="lc-btn is-sm is-ghost lc-back" onClick={onBack}><ArrowLeft aria-hidden="true" /> 목록</button></div><DLoadError what="서신" error={error} level={2} /></section>;
  if (!detail) return <section className="lc-panel"><DSkeleton rows={3} label="서신을 불러오는 중" /></section>;

  const o = detail.offer;
  const name = o.candidateName ?? "후보";
  const { steps, closed } = trackOf(detail);
  const canWrite = o.stage === "sent" || o.stage === "viewed" || o.stage === "interested" || o.stage === "interview" || o.stage === "no_response";
  const canWithdraw = o.stage === "sent" || o.stage === "viewed";

  return (
    <section className="lc-panel lc-letter" aria-label={`${name} 님에게 보낸 제안`}>
      <div className="lc-pb" style={{ paddingTop: 16 }}>
        <button type="button" className="lc-btn is-sm is-ghost lc-back" onClick={onBack} style={{ marginBottom: 8 }}><ArrowLeft aria-hidden="true" /> 목록</button>
        <h2>{o.caseTitle}</h2>
        <dl className="lc-meta">
          <dt>받는 분</dt>
          <dd>{name} 님{o.candidateId ? <> · <Link href={`/talent/${o.candidateId}`}>프로필 보기</Link></> : null}</dd>
          {o.client ? (<><dt>의뢰 기업</dt><dd>{o.client}</dd></>) : null}
          <dt>함께 보낸 근거</dt>
          <dd>{o.sharedCards > 0 ? `공개 근거 카드 ${o.sharedCards}장` : "없음"}</dd>
        </dl>
        <StageTrack steps={steps} closed={closed} />

        <MailThread mails={detail.mails} names={{ company: "보낸 서신", candidate: `${name} 님의 회신` }} />

        <div className="lc-compose">
          {o.stage === "draft" ? (
            <>
              <h3>발송 전 확인</h3>
              <p className="lc-cap" style={{ margin: 0 }}>위 본문이 {name} 님에게 그대로 전달됩니다. 발송한 뒤에는 본문을 고칠 수 없습니다.</p>
              <div className="lc-row-acts">
                <button type="button" className="lc-btn is-primary" disabled={busy} onClick={() => void act(() => deskApi.decideOffer(o.id, "approve"), "제안을 발송했습니다.")}>발송 승인</button>
                <button type="button" className="lc-btn is-ghost is-danger" disabled={busy} onClick={() => { if (window.confirm(`${name} 님에게 보낼 제안을 반려할까요? 되돌릴 수 없습니다.`)) void act(() => deskApi.decideOffer(o.id, "reject"), "제안을 반려했습니다."); }}>반려</button>
              </div>
            </>
          ) : canWrite ? (
            <Composer
              name={name}
              caseTitle={o.caseTitle}
              busy={busy}
              onSend={(mail) => act(() => deskOfferApi.send(o.id, mail), mail.interviewSlots?.length ? "면접 일정을 제안했습니다." : "메일을 보냈습니다.")}
            />
          ) : (
            <p className="lc-cap" style={{ margin: 0 }}>종료된 제안입니다. 더 보낼 수 있는 메일이 없습니다.</p>
          )}

          {(o.stage === "sent" || o.stage === "viewed") && (
            <div className="lc-row-acts" style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
              <span className="lc-cap" style={{ margin: 0, flex: "1 1 220px" }}>전화나 다른 경로로 답을 받았다면 직접 기록하세요.</span>
              <button type="button" className="lc-btn is-sm" disabled={busy} onClick={() => void act(() => deskApi.respondOffer(o.id, "interested"), "관심 회신으로 기록했습니다.")}>관심 있음</button>
              <button type="button" className="lc-btn is-sm" disabled={busy} onClick={() => void act(() => deskApi.respondOffer(o.id, "declined"), "거절로 기록했습니다.")}>거절</button>
              <button type="button" className="lc-btn is-sm" disabled={busy} onClick={() => void act(() => deskApi.respondOffer(o.id, "no_response"), "무응답으로 기록했습니다.")}>무응답</button>
              {canWithdraw && (
                <button type="button" className="lc-btn is-sm is-ghost is-danger" disabled={busy} onClick={() => { if (window.confirm(`${name} 님에게 보낸 제안을 철회할까요? 후보의 제안함에서 사라집니다.`)) void act(() => deskOfferApi.withdraw(o.id), "제안을 철회했습니다."); }}>제안 철회</button>
              )}
            </div>
          )}
          {notice && <p className={notice.ok ? "lc-ok" : "lc-warn"} role="status">{notice.text}</p>}
        </div>
      </div>
    </section>
  );
}

function Composer({ name, caseTitle, busy, onSend }: { name: string; caseTitle: string; busy: boolean; onSend: (mail: { subject: string; body: string; interviewSlots?: string[] }) => Promise<void> }) {
  const [subject, setSubject] = useState(`Re: [제안] ${caseTitle}`);
  const [body, setBody] = useState("");
  const [withSlots, setWithSlots] = useState(false);
  const [slots, setSlots] = useState<string[]>(["", "", ""]);
  const [error, setError] = useState<string | null>(null);

  const toggleSlots = () => {
    const next = !withSlots;
    setWithSlots(next);
    if (next) {
      setSubject(`[면접 일정] ${caseTitle}`);
      if (!body.trim()) setBody(INTERVIEW_TEMPLATE(name));
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const picked = withSlots ? slots.filter(Boolean).map((s) => new Date(s)) : [];
    if (!subject.trim() || !body.trim()) return setError("제목과 본문을 입력하세요.");
    if (withSlots && picked.length === 0) return setError("면접 가능 시각을 하나 이상 넣어 주세요.");
    if (picked.some((d) => !(d.getTime() > Date.now()))) return setError("면접 시각은 지금 이후로 넣어 주세요.");
    setError(null);
    await onSend({ subject: subject.trim(), body: body.trim(), interviewSlots: picked.map((d) => d.toISOString()) });
    setBody("");
    setWithSlots(false);
    setSlots(["", "", ""]);
  };

  return (
    <form onSubmit={(e) => void submit(e)} style={{ display: "grid", gap: 12 }}>
      <h3>{name} 님에게 메일 쓰기</h3>
      <div className="lc-field">
        <label htmlFor="lc-subj">제목</label>
        <input id="lc-subj" className="lc-input" type="text" value={subject} maxLength={120} onChange={(e) => { setSubject(e.target.value); setError(null); }} />
      </div>
      <div className="lc-field">
        <label htmlFor="lc-body">본문<span>{body.length}/4000</span></label>
        <textarea id="lc-body" className="lc-input" value={body} maxLength={4000} placeholder={`${name} 님, 안녕하세요.`} onChange={(e) => { setBody(e.target.value); setError(null); }} />
      </div>
      {withSlots && (
        <fieldset className="lc-field" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ fontSize: 12, color: "var(--ink-2)", marginBottom: 6 }}>면접 가능 시각 (최대 3개 · 후보가 하나를 고릅니다)</legend>
          <div className="lc-slots">
            {slots.map((s, i) => (
              <input key={i} className="lc-input" type="datetime-local" aria-label={`면접 가능 시각 ${i + 1}`} value={s} onChange={(e) => { setSlots(slots.map((x, j) => (j === i ? e.target.value : x))); setError(null); }} />
            ))}
          </div>
        </fieldset>
      )}
      <div className="lc-row-acts">
        <button type="submit" className="lc-btn is-primary" disabled={busy}>{busy ? "보내는 중" : withSlots ? "면접 일정 보내기" : "메일 보내기"}</button>
        <button type="button" className="lc-btn is-ghost" aria-expanded={withSlots} onClick={toggleSlots}>{withSlots ? "면접 일정 빼기" : "면접 일정 제안하기"}</button>
      </div>
      {error && <p className="lc-warn" role="alert" style={{ margin: 0 }}>{error}</p>}
    </form>
  );
}
