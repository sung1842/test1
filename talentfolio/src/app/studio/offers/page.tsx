"use client";

// 받은 제안함 (구직자). 기업이 보낸 제안을 열어 공고를 확인하고, 메일 형식으로 회신한다.
// 회신할 때 관심·거절을 함께 밝히고, 기업이 면접 시각을 제안했으면 그중 하나를 고른다.
import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ProductShell } from "@/components/product/ProductShell";
import { MailThread, StageBadge } from "@/components/offers/OfferParts";
import { LoadError, SkeletonList, StateView } from "@/components/state/StateView";
import { fullDate, shortDate, studioOfferApi, type OfferMail, type OfferStage, type StudioOfferDetail } from "@/lib/offerApi";
import { useCached } from "@/lib/useCached";

// 받는 쪽 말로 바꾼 단계 이름
const MY_STAGE: Record<OfferStage, string> = {
  draft: "받은 제안",
  sent: "새 제안",
  viewed: "답장 전",
  interested: "관심 있다고 답함",
  interview: "면접 확정",
  declined: "거절함",
  no_response: "답장 전",
  withdrawn: "철회된 제안",
  discarded: "철회된 제안",
};

type Intent = "interested" | "declined" | "reply";

export default function StudioOffersPage() {
  const list = useCached("studio-offers", () => studioOfferApi.inbox(), { refreshMs: 60_000 });
  const offers = useMemo(() => list.data?.offers ?? null, [list.data]);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) return;
    const t = setTimeout(() => setOpenId(id), 0);
    return () => clearTimeout(t);
  }, []);

  const select = useCallback((id: string | null) => {
    setOpenId(id);
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("id", id);
    else url.searchParams.delete("id");
    window.history.replaceState(null, "", url);
  }, []);

  const unread = (offers ?? []).reduce((n, o) => n + (o.unread > 0 ? 1 : 0), 0);

  return (
    <ProductShell crumble="스튜디오 · 받은 제안">
      <div className="of">
        <header className="of-head">
          <div>
            <h1>받은 <em>제안</em></h1>
            <p>
              {offers === null
                ? "기업이 보낸 제안을 확인하고 회신합니다."
                : unread > 0
                  ? `아직 읽지 않은 서신이 ${unread}건 있습니다.`
                  : "기업이 내 공개 카드를 보고 보낸 제안입니다. 회신은 보낸 기업에만 전달됩니다."}
            </p>
          </div>
        </header>

        {list.error && !offers ? (
          <LoadError what="받은 제안" error={list.error} />
        ) : offers === null ? (
          <SkeletonList rows={3} label="받은 제안을 불러오는 중" />
        ) : offers.length === 0 ? (
          <StateView art="plane" title="아직 받은 제안이 없습니다" note="공개한 카드가 기업의 채용 건과 맞으면 제안이 이곳으로 옵니다." action={{ href: "/studio/cards", label: "내 카드 공개하기" }} />
        ) : (
          <div className={`of-panes${openId ? " reading" : ""}`}>
            <ul className="of-list" aria-label="받은 제안 목록">
              {offers.map((o) => (
                <li key={o.id}>
                  <button type="button" className={`of-row${o.unread > 0 ? " unread" : ""}`} aria-current={openId === o.id ? "true" : undefined} onClick={() => select(o.id)}>
                    <span className="who">{o.company}{o.unread > 0 ? <span className="sr"> (읽지 않음)</span> : null}</span>
                    <time className="when" dateTime={o.lastAt}>{shortDate(o.lastAt)}</time>
                    <span className="what">{o.title}</span>
                    <span className="line">
                      <StageBadge stage={o.stage} label={MY_STAGE[o.stage]} />
                      <span className="peek">{o.preview}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {openId ? (
              <Letter key={openId} offerId={openId} onBack={() => select(null)} onChanged={() => list.reload()} />
            ) : (
              <section className="of-letter of-empty" aria-live="polite">목록에서 제안을 고르면 내용과 공고가 여기에 열립니다.</section>
            )}
          </div>
        )}
      </div>
    </ProductShell>
  );
}

function Letter({ offerId, onBack, onChanged }: { offerId: string; onBack: () => void; onChanged: () => Promise<unknown> }) {
  const [detail, setDetail] = useState<StudioOfferDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setDetail(await studioOfferApi.detail(offerId));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [offerId]);
  useEffect(() => {
    // 열면 읽음으로 바뀌므로 목록의 읽지 않음 표시도 같이 새로 고친다
    const t = setTimeout(() => void load().then(() => onChanged()), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  const back = (
    <button type="button" className="of-back" onClick={onBack}>
      <ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" /> 목록
    </button>
  );
  if (error && !detail) return <section className="of-letter"><div className="of-compose">{back}<LoadError what="제안" error={error} level={2} /></div></section>;
  if (!detail) return <section className="of-letter"><div className="of-compose"><SkeletonList rows={3} label="제안을 불러오는 중" /></div></section>;

  const o = detail.offer;
  const p = detail.posting;
  // 아직 고르지 않은 마지막 면접 제안
  const alreadyPicked = detail.mails.some((m) => m.pickedSlot);
  const openProposal: OfferMail | undefined = alreadyPicked ? undefined : [...detail.mails].reverse().find((m) => m.from === "company" && m.interviewSlots.length > 0);

  return (
    <section className="of-letter swap" aria-label={`${o.company}의 제안`}>
      <div className="of-letter-head">
        {back}
        <h2>{o.title}</h2>
        <dl className="of-meta">
          <dt>보낸 곳</dt>
          <dd>{o.company}</dd>
          <dt>받은 날</dt>
          <dd><time dateTime={o.sentAt ?? undefined}>{fullDate(o.sentAt)}</time></dd>
          {o.interviewAt ? (<><dt>면접</dt><dd><time dateTime={o.interviewAt}>{fullDate(o.interviewAt)}</time></dd></>) : null}
        </dl>
      </div>

      {p && (
        <details className="of-posting">
          <summary>
            <div>
              <strong>{p.title}</strong>
              {p.skills.length > 0 && <ul className="skills">{p.skills.slice(0, 6).map((s) => <li key={s}>{s}</li>)}</ul>}
            </div>
            {p.description ? <span>공고 전문</span> : null}
          </summary>
          {p.description ? <pre>{p.description}</pre> : null}
        </details>
      )}

      <MailThread mails={detail.mails} me="candidate" names={{ company: o.company, candidate: "내 회신" }} />

      {o.response === "declined" ? (
        <div className="of-compose"><p className="of-note">거절로 회신한 제안입니다.</p></div>
      ) : (
        <ReplyForm key={detail.mails.length} offerId={o.id} company={o.company} answered={o.response === "interested"} proposal={openProposal} onSent={async () => { await load(); await onChanged(); }} />
      )}
    </section>
  );
}

function ReplyForm({ offerId, company, answered, proposal, onSent }: { offerId: string; company: string; answered: boolean; proposal?: OfferMail; onSent: () => Promise<void> }) {
  const [intent, setIntent] = useState<Intent>(answered ? "reply" : "interested");
  const [slot, setSlot] = useState<string>("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return setError("회신 내용을 입력하세요.");
    if (intent === "declined" && !window.confirm("이 제안을 거절로 회신할까요? 보낸 뒤에는 되돌릴 수 없습니다.")) return;
    setBusy(true);
    setError(null);
    try {
      await studioOfferApi.reply(offerId, {
        body: body.trim(),
        ...(intent !== "reply" ? { response: intent } : {}),
        ...(slot && intent !== "declined" ? { pickedSlot: slot } : {}),
      });
      await onSent();
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다. 다시 시도해 주세요.");
      setBusy(false);
    }
  };

  return (
    <form className="of-compose" onSubmit={(e) => void submit(e)}>
      <h3>{company}에 회신하기</h3>
      {!answered && (
        <fieldset className="of-choice">
          <legend>제안에 대한 답</legend>
          <label><input type="radio" name="intent" checked={intent === "interested"} onChange={() => setIntent("interested")} />관심 있습니다</label>
          <label><input type="radio" name="intent" checked={intent === "reply"} onChange={() => setIntent("reply")} />먼저 질문이 있습니다</label>
          <label><input type="radio" name="intent" checked={intent === "declined"} onChange={() => setIntent("declined")} />정중히 거절합니다</label>
        </fieldset>
      )}
      {proposal && intent !== "declined" && (
        <div className="of-slots" style={{ margin: "0 0 14px" }}>
          <p>면접 시각 고르기</p>
          <ul>
            {proposal.interviewSlots.map((s) => (
              <li key={s}>
                <label><input type="radio" name="slot" checked={slot === s} onChange={() => setSlot(s)} /><time dateTime={s}>{fullDate(s)}</time></label>
              </li>
            ))}
            <li><label><input type="radio" name="slot" checked={slot === ""} onChange={() => setSlot("")} />맞는 시각이 없습니다 (본문에 가능한 때를 적어 주세요)</label></li>
          </ul>
        </div>
      )}
      <label className="of-field">
        <span>본문</span>
        <textarea value={body} maxLength={4000} placeholder="안녕하세요. 제안 주셔서 감사합니다." onChange={(e) => { setBody(e.target.value); setError(null); }} />
      </label>
      <div className="of-actions">
        <button type="submit" className="tf-btn fill" disabled={busy}>{busy ? "보내는 중" : "회신 보내기"}</button>
      </div>
      {error && <p className="of-error" role="alert">{error}</p>}
    </form>
  );
}
