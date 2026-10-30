"use client";

import { useCallback, useEffect, useState } from "react";
import type { LifeActivity, LifeCard } from "@/lib/lifeApi";
import {
  addEssayQuestions, createPostingLetter, deleteLetter, deleteLetterItem, loadEssayQuestions, loadLetterItems, loadLetters,
  saveLetterItem, searchPostings, setLetterVisibility, sortCards, splitSlots,
  type EssayQuestion, type Letter, type LetterItem, type Posting,
} from "./studioData";

/**
 * 자기소개서. 왼쪽 버전 목록 · 가운데 문항별 내 문장 · 오른쪽 참고 패널(지금 쓰는 문항의 근거 카드 전체 내용 + 카드 고르기).
 * 카드를 만드는 이유는 자소서에 녹이기 위해서라, 쓰는 동안 카드 원문을 옆에 펼쳐 둔다 (창 이동 없음).
 * 기본본(kind=base)은 공개로 두면 기업 인재 탐색·JD 분석에 쓰인다(fit.public_cover_letters, matching 동의 필요). 공고별 버전은 본인만.
 * 문항은 기업 채용 홈페이지를 보고 사람이 넣는다 (외부 사이트 자동 수집 안 함). AI 가 대신 쓰지 않는다.
 */
export function StudioLetters({ userId, cards, activities, preview, onChange }: {
  userId: string; cards: LifeCard[]; activities: LifeActivity[]; preview: boolean; onChange: () => void;
}) {
  const [letters, setLetters] = useState<Letter[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [items, setItems] = useState<LetterItem[]>([]);
  const [dirty, setDirty] = useState<Set<number>>(new Set()); // 저장 안 한 문항 seq
  const [activeSeq, setActiveSeq] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const ls = await loadLetters(userId);
    setLetters(ls);
    setCurrent((cur) => (ls.some((l) => l.id === cur) ? cur : ls[0]?.id ?? null));
  }, [userId]);

  useEffect(() => {
    load().catch((e) => setMsg(String(e instanceof Error ? e.message : e)));
  }, [load]);

  const visible = preview ? letters.filter((l) => l.kind === "base" && l.visibility === "public") : letters;
  const letter = visible.find((l) => l.id === current) ?? visible[0] ?? null;

  useEffect(() => {
    if (!letter) return;
    loadLetterItems(letter.id)
      .then((xs) => { setItems(xs); setDirty(new Set()); setActiveSeq(xs[0]?.seq ?? null); })
      .catch((e) => setMsg(String(e)));
  }, [letter?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const titleOf = (c: LifeCard) => activities.find((a) => a.id === c.activity_id)?.title ?? c.claim.slice(0, 30);
  const cardTitle = (id: string) => {
    const c = cards.find((x) => x.id === id);
    return c ? titleOf(c) : "삭제된 카드";
  };
  const picks = [...new Set(items.flatMap((i) => i.cited_card_ids))];
  const cardCount = (l: Letter) => (l.id === letter?.id ? picks.length : null);
  const active = items.find((i) => i.seq === activeSeq) ?? items[0] ?? null;

  const patch = (seq: number, p: Partial<LetterItem>) => {
    setItems((xs) => xs.map((x) => (x.seq === seq ? { ...x, ...p } : x)));
    setDirty((d) => new Set(d).add(seq));
  };

  async function saveItem(it: LetterItem) {
    try {
      const saved = await saveLetterItem(userId, it);
      setItems((xs) => xs.map((x) => (x.seq === saved.seq ? saved : x)));
      setDirty((d) => { const n = new Set(d); n.delete(saved.seq); return n; });
      setMsg(`${saved.seq}번 문항을 저장했어요.`);
      onChange();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  }

  async function addItem() {
    if (!letter) return;
    const seq = items.reduce((m, i) => Math.max(m, i.seq), 0) + 1;
    setItems([...items, await saveLetterItem(userId, { letter_id: letter.id, seq, question_id: null, question_text: "새 문항", char_limit: null, answer: "", cited_card_ids: [] })]);
    setActiveSeq(seq);
  }

  const toggleCite = (cardId: string) => {
    if (!active) return;
    const ids = active.cited_card_ids.includes(cardId) ? active.cited_card_ids.filter((x) => x !== cardId) : [...active.cited_card_ids, cardId];
    patch(active.seq, { cited_card_ids: ids });
  };

  return (
    <section className="view on">
      <div className="head">
        <div>
          <p className="eyebrow">자기소개서</p>
          <h1>지원처마다 버전을 따로</h1>
          <p className="lede">AI가 대신 쓰지 않아요. 문항을 누르면 오른쪽에 근거 카드 내용이 펼쳐져서, 보면서 내 문장으로 써요.</p>
        </div>
        <button className="btn pri edit-only" onClick={() => setCreating(true)}>+ 새 버전</button>
      </div>
      {msg && <p className="note" role="status">{msg}</p>}

      {creating && !preview && (
        <NewPostingLetter userId={userId} onCancel={() => setCreating(false)}
          onCreated={async (l) => { setCreating(false); await load(); setCurrent(l.id); onChange(); }} />
      )}

      <div className="letters">
        <div className="card ver">
          {visible.map((l) => (
            <button key={l.id} aria-current={letter?.id === l.id}
              onClick={() => { if (dirty.size && !confirm("저장하지 않은 문항이 있어요. 다른 버전으로 갈까요?")) return; setCurrent(l.id); }}>
              <strong>{l.kind === "base" ? "기본본" : l.title}</strong>
              <span>
                {new Date(l.updated_at).toLocaleDateString("ko-KR", { month: "long", day: "numeric" })} 수정
                {cardCount(l) != null ? ` · 카드 ${cardCount(l)}장` : ""}
                {l.kind === "base" ? ` · ${l.visibility === "public" ? "기업 공개" : "비공개"}` : ""}
              </span>
            </button>
          ))}
          {visible.length === 0 && <p className="note" style={{ padding: 12 }}>공개한 기본 자기소개서가 없어요.</p>}
        </div>

        {letter && (
          <div className="card editor">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
              <h3>{letter.kind === "base" ? "기본 자기소개서" : letter.title}</h3>
              {letter.kind === "base" && !preview && (
                <button className="vis-tg edit-only" aria-pressed={letter.visibility === "public"}
                  onClick={async () => { await setLetterVisibility(letter.id, letter.visibility === "public" ? "private" : "public"); await load(); onChange(); }}>
                  <span className="sw" /><span>{letter.visibility === "public" ? "기업 공개" : "비공개"}</span>
                </button>
              )}
              {letter.kind === "posting" && !preview && (
                <button className="mini edit-only" onClick={async () => { if (confirm("이 버전을 지울까요?")) { await deleteLetter(letter.id); setCurrent(null); await load(); onChange(); } }}>버전 삭제</button>
              )}
            </div>
            {letter.kind === "base" && <p>기업이 인재를 찾을 때 보는 자기소개서예요. 공개하려면 기업 매칭 동의가 필요해요.</p>}

            <div className={preview ? "" : "write"}>
              <div>
                {items.map((it) => (
                  <Sentence key={it.id ?? it.seq} item={it} active={!preview && it.seq === active?.seq} dirty={dirty.has(it.seq)} cardTitle={cardTitle} preview={preview}
                    onFocus={() => setActiveSeq(it.seq)} onPatch={(p) => patch(it.seq, p)} onSave={() => void saveItem(it)}
                    onDelete={async () => { if (it.id && confirm(`${it.seq}번 문항을 지울까요?`)) { await deleteLetterItem(it.id); setItems((xs) => xs.filter((x) => x.id !== it.id)); } }} />
                ))}
                <div className="ask-row edit-only">
                  <small>공고에 맞춰 다시 쓰기는 없어요. 맞춤법 교정만 할 수 있어요.</small>
                  <button className="btn" onClick={() => void addItem()}>문항 추가</button>
                </div>
              </div>
              {!preview && active && <RefPanel item={active} cards={cards} titleOf={titleOf} onToggle={toggleCite} />}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function Sentence({ item, active, dirty, cardTitle, preview, onFocus, onPatch, onSave, onDelete }: {
  item: LetterItem; active: boolean; dirty: boolean; cardTitle: (id: string) => string; preview: boolean;
  onFocus: () => void; onPatch: (p: Partial<LetterItem>) => void; onSave: () => void; onDelete: () => void;
}) {
  const len = [...item.answer].length;
  const over = item.char_limit != null && len > item.char_limit;

  if (preview) {
    return (
      <div className="sent">
        <p><b>{item.seq}. {item.question_text}</b></p>
        <p style={{ whiteSpace: "pre-wrap" }}>{item.answer || "(답 없음)"}</p>
      </div>
    );
  }
  return (
    <div className={`sent${active ? " on" : ""}`} onFocusCapture={onFocus} onClick={onFocus}>
      <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
        <input className="field" style={{ maxWidth: "none", height: 32, fontWeight: 600 }} value={item.question_text} disabled={!!item.question_id}
          onChange={(e) => onPatch({ question_text: e.target.value })} aria-label={`${item.seq}번 문항`} />
        <input className="field" type="number" min={1} placeholder="자" style={{ width: 80, height: 32 }} value={item.char_limit ?? ""}
          onChange={(e) => onPatch({ char_limit: e.target.value ? Number(e.target.value) : null })} aria-label="글자 수 제한" />
      </div>
      <textarea className="field" style={{ maxWidth: "none", height: 140, padding: 10, resize: "vertical" }} value={item.answer}
        onChange={(e) => onPatch({ answer: e.target.value })} placeholder="오른쪽 근거 카드를 보면서 내 문장으로 써 주세요." />
      <div className="m" style={{ marginTop: 6 }}>
        <span style={{ color: over ? "#B23B3B" : undefined }}>{len}{item.char_limit ? ` / ${item.char_limit}자` : "자"}</span>
        {item.cited_card_ids.map((id) => <span key={id} className="bd r-att">근거 · {cardTitle(id)}</span>)}
        {item.cited_card_ids.length === 0 && <span>근거 카드 없음 · 오른쪽에서 골라요</span>}
        <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <button className={`mini${dirty ? " pri-mini" : ""}`} onClick={(e) => { e.stopPropagation(); onSave(); }}>{dirty ? "저장 *" : "저장"}</button>
          <button className="mini danger" onClick={(e) => { e.stopPropagation(); onDelete(); }}>삭제</button>
        </span>
      </div>
    </div>
  );
}

/** 지금 쓰는 문항의 근거 카드 전체 내용 + 다른 카드 미리보기·고르기 */
function RefPanel({ item, cards, titleOf, onToggle }: {
  item: LetterItem; cards: LifeCard[]; titleOf: (c: LifeCard) => string; onToggle: (id: string) => void;
}) {
  const [peek, setPeek] = useState<string | null>(null);
  const cited = item.cited_card_ids.map((id) => cards.find((c) => c.id === id)).filter((c): c is LifeCard => !!c);
  const others = sortCards(cards.filter((c) => !item.cited_card_ids.includes(c.id)));
  return (
    <aside className="ref" aria-label="참고 카드">
      <p className="ref-h">{item.seq}번 문항의 근거 <span>{cited.length}장</span></p>
      {cited.length === 0 && <p className="note" style={{ marginTop: 4 }}>아래 내 카드에서 이 문항에 쓸 카드를 골라요.</p>}
      {cited.map((c) => (
        <div className="ref-card on" key={c.id}>
          <div className="ref-t"><b>{titleOf(c)}</b><button className="mini" onClick={() => onToggle(c.id)}>빼기</button></div>
          <CardBody card={c} />
        </div>
      ))}
      <p className="ref-h" style={{ marginTop: 14 }}>내 카드 <span>눌러서 내용 보기</span></p>
      {others.map((c) => (
        <div className="ref-card" key={c.id}>
          <div className="ref-t">
            <button className="ref-peek" aria-expanded={peek === c.id} onClick={() => setPeek(peek === c.id ? null : c.id)}>{c.featured ? "★ " : ""}{titleOf(c)}</button>
            <button className="mini" onClick={() => onToggle(c.id)}>이 문항에 쓰기</button>
          </div>
          {peek === c.id && <CardBody card={c} />}
        </div>
      ))}
      {cards.length === 0 && <p className="note">카드가 없어요. 나를 보여주기에서 먼저 만들어 주세요.</p>}
    </aside>
  );
}

function CardBody({ card }: { card: LifeCard }) {
  return (
    <div className="ref-body">
      {splitSlots(card.claim).map((s, i) => <p key={i}>{s.label && <b>{s.label} </b>}{s.text}</p>)}
      <small>{card.visibility === "public" ? "공개" : "비공개"} 카드 · {card.links.length ? `근거 ${card.links.length}개` : "근거 없음"}</small>
    </div>
  );
}

/** 공고를 고르고, 그 공고의 문항(없으면 직접 붙여 넣기)으로 버전을 만든다 */
function NewPostingLetter({ userId, onCancel, onCreated }: { userId: string; onCancel: () => void; onCreated: (l: Letter) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Posting[]>([]);
  const [posting, setPosting] = useState<Posting | null>(null);
  const [questions, setQuestions] = useState<EssayQuestion[]>([]);
  const [paste, setPaste] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function addPasted() {
    if (!posting) return;
    const re = /\((\d{2,5})\s*자(?:\s*이내)?\)\s*$/;
    const parsed = paste.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => ({
      question: l.replace(/^\d+[.)]\s*/, "").replace(re, "").trim().slice(0, 1000),
      char_limit: l.match(re) ? Number(l.match(re)![1]) : null,
    }));
    if (!parsed.length) return;
    const url = sourceUrl.trim() || null;
    if (url && !/^https?:\/\//.test(url)) return setErr("출처 주소는 http(s):// 로 시작해야 해요.");
    try {
      await addEssayQuestions(userId, posting.id, parsed, url);
      setQuestions(await loadEssayQuestions(posting.id));
      setPaste("");
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="card" style={{ padding: "18px 22px", marginBottom: 14 }}>
      <p className="sec-t" style={{ marginTop: 0 }}>공고별 새 버전 <span>문항은 기업 채용 홈페이지에 공개된 것을 보고 붙여 넣어요</span></p>
      {!posting ? (
        <>
          <div style={{ display: "flex", gap: 8 }}>
            <input className="field" placeholder="회사·공고 제목 검색" value={q} onChange={(e) => setQ(e.target.value)}
              onKeyDown={async (e) => { if (e.key === "Enter") setResults((await searchPostings({ q, page: 0 })).postings); }} />
            <button className="btn" onClick={async () => setResults((await searchPostings({ q, page: 0 })).postings)}>검색</button>
            <button className="btn" onClick={onCancel}>취소</button>
          </div>
          <ul className="feed" style={{ padding: 0 }}>
            {results.map((p) => (
              <li key={p.id} style={{ padding: "10px 0" }}>
                <span><b>{p.company}</b> · {p.title}</span>
                <button className="link" onClick={async () => { setPosting(p); setQuestions(await loadEssayQuestions(p.id)); }}>선택</button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <p><b>{posting.company}</b> · {posting.title} <button className="link" onClick={() => setPosting(null)}>다른 공고</button></p>
          <div className="picks">
            {questions.map((x) => <div className="pick" key={x.id}><em>{x.seq}</em><span>{x.question}{x.char_limit ? ` (${x.char_limit}자)` : ""}</span></div>)}
            {questions.length === 0 && <p className="note" style={{ margin: 0 }}>등록된 문항이 없어요. 아래에 붙여 넣거나 빈 문항으로 시작할 수 있어요.</p>}
          </div>
          <textarea className="field" style={{ maxWidth: "none", height: 90, padding: 10 }} value={paste} onChange={(e) => setPaste(e.target.value)}
            placeholder={"한 줄에 문항 하나, 끝에 (500자)처럼 쓰면 글자 수로 읽어요.\n1. 지원 동기를 적어 주세요. (700자)"} />
          <input className="field" style={{ maxWidth: "none", marginTop: 8 }} placeholder="문항을 본 채용 페이지 주소 (선택)" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} />
          {err && <p className="note" style={{ color: "#B23B3B" }}>{err}</p>}
          <div className="ask-row">
            <button className="btn" onClick={() => void addPasted()}>문항 등록</button>
            <span style={{ display: "flex", gap: 8 }}>
              <button className="btn" onClick={onCancel}>취소</button>
              <button className="btn pri" onClick={async () => onCreated(await createPostingLetter(userId, posting))}>이 공고로 버전 만들기</button>
            </span>
          </div>
        </>
      )}
    </div>
  );
}
