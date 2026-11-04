"use client";

import { useCallback, useEffect, useState } from "react";
import { lifeApi, type LifeRecommendationsResponse } from "@/lib/lifeApi";
import {
  EDUCATION_LABEL, EMPLOYMENT_OPTIONS, LANE_LABEL, PAGE_SIZE, REGIONS,
  EDUCATION_LABEL as EDU, ddayLabel, loadCategories, loadPins, loadPostingDetail, loadPostingsByIds, searchPostings, setPin,
  type Lane, type Posting, type PostingDetail, type PostingFilter,
} from "./studioData";

const REC_PREVIEW = 4; // 공고 화면에는 추천 4개까지, 나머지는 더보기(?recs=all)
const MOVE_LABEL: Record<Lane, string> = { watch: "관심으로", apply: "지원할 곳으로", hold: "보류로" };
const CAREER_OPTIONS: [NonNullable<PostingFilter["career"]>, string][] = [
  ["", "경력 전체"], ["newcomer", "신입 가능"], ["1-3", "1~3년"], ["3-5", "3~5년"], ["5-10", "5~10년"], ["10+", "10년 이상"],
];

/**
 * 공고 (세 칸 + 추천 공고) + 전체 공고 목록·필터.
 * 칸은 fit.job_pins, 필터 분류는 수집처 검색 필터 기준(직군 대분류·경력·학력·고용형태·지역, SQL 016 필터 컬럼).
 * 추천 공고는 서버가 코드·사전 매칭으로 미리 계산해 둔 fit.job_recommendations 를 읽기만 한다 (LLM 0회, SQL 022·023).
 */
export function StudioJobs({ userId, onChange }: { userId: string; onChange: () => void }) {
  const [pins, setPins] = useState<Record<string, Lane>>({});
  const [pinned, setPinned] = useState<Posting[]>([]);
  const [cats, setCats] = useState<{ code: string; name: string }[]>([]);
  const [filter, setFilter] = useState<PostingFilter>({ sort: "recent", page: 0, career: "" });
  const [list, setList] = useState<{ postings: Posting[]; total: number }>({ postings: [], total: 0 });
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [hidden, setHidden] = useState<string[]>([]);
  const [recs, setRecs] = useState<LifeRecommendationsResponse>({ recommendations: [], computedAt: null, candidates: 0 });
  const [toast, setToast] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null); // 공고 상세 서랍 (열 때 1건만 불러온다)
  const [allRecs, setAllRecs] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("recs") === "all");

  useEffect(() => {
    const onPop = () => setAllRecs(new URLSearchParams(window.location.search).get("recs") === "all");
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const loadPinned = useCallback(async () => {
    const ps = await loadPins();
    setPins(Object.fromEntries(ps.map((p) => [p.job_posting_id, p.lane])));
    setPinned(await loadPostingsByIds(ps.map((p) => p.job_posting_id)));
  }, []);

  useEffect(() => {
    loadPinned().catch(() => undefined);
    loadCategories().then(setCats).catch(() => undefined);
    lifeApi.recommendations().then(setRecs).catch(() => undefined);
  }, [loadPinned]);

  useEffect(() => {
    let alive = true;
    setState("loading");
    searchPostings(filter)
      .then((r) => { if (alive) { setList(r); setState("ready"); } })
      .catch(() => { if (alive) setState("error"); });
    return () => { alive = false; };
  }, [filter]);

  const say = (m: string) => { setToast(m); window.setTimeout(() => setToast(null), 2400); };
  const visibleRecs = recs.recommendations.filter((r) => r.posting && !hidden.includes(r.posting.id));

  async function excludeRec(postingId: string) {
    setHidden((h) => [...h, postingId]);
    await lifeApi.addExclusion(postingId);
    lifeApi.refreshRecommendations().catch(() => undefined); // 빈자리는 서버가 다음 순위로 채운다
    say("이 공고는 추천에서 뺐어요");
  }

  async function pin(p: Pick<Posting, "id">, lane: Lane | null) {
    await setPin(userId, p.id, lane);
    await loadPinned();
    onChange();
    say(lane ? `${LANE_LABEL[lane]}에 넣었어요` : "칸에서 뺐어요");
  }

  const set = (patch: Partial<PostingFilter>) => setFilter((f) => ({ ...f, ...patch, page: patch.page ?? 0 }));
  const toggleCat = (code: string) => {
    const cur = filter.categories ?? [];
    set({ categories: cur.includes(code) ? cur.filter((c) => c !== code) : [...cur, code] });
  };
  const pages = Math.max(1, Math.ceil(list.total / PAGE_SIZE));
  const meta = (p: Posting) => [p.location?.split(",")[0], p.expires_at ? `~${p.expires_at.slice(5, 10).replace("-", ".")}` : ddayLabel(null, p.deadline_type)].filter(Boolean).join(" · ");

  async function excludeAll() {
    await lifeApi.addExclusion(null);
    lifeApi.refreshRecommendations().catch(() => undefined);
    setHidden((h) => [...h, ...visibleRecs.map((x) => x.posting!.id)]);
    say("추천을 모두 끄도록 저장했어요");
  }

  // 추천 공고 전체 목록은 ?recs=all 로 연다 (뒤로 가기로 돌아온다)
  function showAllRecs(on: boolean) {
    const url = new URL(window.location.href);
    if (on) url.searchParams.set("recs", "all"); else url.searchParams.delete("recs");
    window.history.pushState(null, "", url);
    setAllRecs(on);
    window.scrollTo({ top: 0 });
  }

  const computedLabel = recs.computedAt ? ` · ${recs.computedAt.slice(5, 16).replace("-", ".").replace("T", " ")} 기준` : "";
  const recCard = (r: (typeof visibleRecs)[number]) => {
    const p = r.posting!;
    return (
      <div className="card rec-job" key={p.id}>
        <h4>
          <button className="job-open" onClick={() => setOpenId(p.id)}>{p.company} · {p.title}</button>{" "}
          <small style={{ fontWeight: 400, color: "var(--mute)" }}>· 맞춤 {r.score}점</small>
        </h4>
        <div className="why">{r.reasons.map((s) => <span key={s}>· {s}</span>)}</div>
        <div className="card-acts">
          <button className="mini" onClick={() => void excludeRec(p.id)}>이 공고 추천 제외</button>
        </div>
      </div>
    );
  };
  const recEmpty = (
    <div className="card rec-job"><p className="note" style={{ margin: 0 }}>
      {recs.computedAt ? "조건에 맞는 공고가 아직 없어요. 이력서의 기술·희망 조건을 채우면 더 잘 맞춰 드려요." : "추천을 준비하고 있어요. 잠시 뒤 다시 열어 주세요."}
    </p></div>
  );
  const drawer = openId && <PostingDrawer id={openId} lane={pins[openId] ?? null} onPin={async (lane) => {
    await pin({ id: openId }, lane); // 추천 공고는 목록·칸에 없을 수 있어 id 로 넣는다
  }} onClose={() => setOpenId(null)} />;
  const toastEl = toast && <div className="toast" style={{ opacity: 1, transform: "translate(-50%,0)" }}>{toast}</div>;

  if (allRecs) {
    return (
      <section className="view on">
        <div className="head">
          <div>
            <p className="eyebrow">공고 · 추천</p>
            <h1>추천 공고 전체</h1>
            <p className="lede">내 기술·경력·희망 조건과 공고 조건을 맞춰 본 결과예요{computedLabel}.</p>
          </div>
          <button className="btn" onClick={() => showAllRecs(false)}>공고로 돌아가기</button>
        </div>
        <div>
          {visibleRecs.map(recCard)}
          {visibleRecs.length === 0 && recEmpty}
        </div>
        {visibleRecs.length > 0 && (
          <div className="card-acts" style={{ justifyContent: "flex-end", marginTop: 8 }}>
            <button className="mini" onClick={() => void excludeAll()}>추천 전체 받지 않기</button>
          </div>
        )}
        {drawer}
        {toastEl}
      </section>
    );
  }

  return (
    <section className="view on">
      <div className="head">
        <div>
          <p className="eyebrow">공고</p>
          <h1>둘러본 공고 정리</h1>
          <p className="lede">관심, 지원할 곳, 보류 세 칸으로 나눠 둬요. 아래에서 전체 공고를 조건으로 찾아 칸에 넣어요.</p>
        </div>
        <input className="field edit-only" placeholder="회사, 공고 제목" style={{ maxWidth: 260 }} value={filter.q ?? ""} onChange={(e) => set({ q: e.target.value })} />
      </div>

      <div className="lanes">
        {(Object.keys(LANE_LABEL) as Lane[]).map((lane) => {
          const items = pinned.filter((p) => pins[p.id] === lane);
          return (
            <div className="card lane" key={lane}>
              <div className="lane-h">{LANE_LABEL[lane]} <span>{items.length}</span></div>
              {items.map((p) => (
                <div className="ji" key={p.id}>
                  <button className="job-open" onClick={() => setOpenId(p.id)}>{p.company} · {p.title}</button>
                  <small>{meta(p)}</small>
                  <p className="gap" style={{ display: "flex", gap: 8 }}>
                    {(Object.keys(LANE_LABEL) as Lane[]).filter((l) => l !== lane).map((l) => (
                      <button key={l} className="link" style={{ fontSize: 12 }} onClick={() => void pin(p, l)}>{MOVE_LABEL[l]}</button>
                    ))}
                    <button className="link" style={{ fontSize: 12 }} onClick={() => void pin(p, null)}>빼기</button>
                  </p>
                </div>
              ))}
              {items.length === 0 && <p className="note" style={{ marginTop: 4 }}>아래 공고에서 {LANE_LABEL[lane]}에 넣으면 여기로 와요.</p>}
            </div>
          );
        })}
      </div>

      <p className="sec-t">추천 공고 <span>내 기술·경력·희망 조건과 공고 조건을 맞춰 본 결과예요{computedLabel}</span></p>
      <div>
        {visibleRecs.slice(0, REC_PREVIEW).map(recCard)}
        {visibleRecs.length === 0 && recEmpty}
      </div>
      {visibleRecs.length > 0 && (
        <div className="card-acts" style={{ justifyContent: "flex-end", marginTop: 8 }}>
          <button className="mini" onClick={() => void excludeAll()}>추천 전체 받지 않기</button>
          {visibleRecs.length > REC_PREVIEW && <button className="mini" onClick={() => showAllRecs(true)}>더보기 ({visibleRecs.length})</button>}
        </div>
      )}

      <p className="sec-t">전체 공고 <span>{list.total}건 · 직군·경력·학력·고용형태·지역으로 걸러 봐요</span></p>
      <div className="card" style={{ padding: "16px 20px" }}>
        <div className="filters" style={{ flexWrap: "wrap", marginBottom: 10 }}>
          {cats.map((c) => (
            <button key={c.code} className="chip" data-on={(filter.categories ?? []).includes(c.code)} onClick={() => toggleCat(c.code)}>{c.name}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <select className="field" style={{ width: "auto" }} aria-label="경력" value={filter.career ?? ""} onChange={(e) => set({ career: e.target.value as PostingFilter["career"] })}>
            {CAREER_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select className="field" style={{ width: "auto" }} aria-label="학력" value={filter.education ?? ""} onChange={(e) => set({ education: e.target.value || undefined })}>
            <option value="">학력 전체</option>
            {Object.entries(EDUCATION_LABEL).map(([k, v]) => <option key={k} value={k}>{k === "any" ? v : `${v} 이하 조건`}</option>)}
          </select>
          <select className="field" style={{ width: "auto" }} aria-label="고용형태" value={filter.employment ?? ""} onChange={(e) => set({ employment: e.target.value || undefined })}>
            <option value="">고용형태 전체</option>
            {EMPLOYMENT_OPTIONS.map((e) => <option key={e}>{e}</option>)}
          </select>
          <select className="field" style={{ width: "auto" }} aria-label="지역" value={filter.region ?? ""} onChange={(e) => set({ region: e.target.value || undefined })}>
            <option value="">지역 전체</option>
            {REGIONS.map((r) => <option key={r}>{r}</option>)}
          </select>
          <button className="chip" data-on={!!filter.salaryOpen} onClick={() => set({ salaryOpen: !filter.salaryOpen })}>급여 공개만</button>
          <select className="field" style={{ width: "auto", marginLeft: "auto" }} aria-label="정렬" value={filter.sort} onChange={(e) => set({ sort: e.target.value as PostingFilter["sort"] })}>
            <option value="recent">최신순</option>
            <option value="deadline">마감 임박순</option>
          </select>
          <button className="link" onClick={() => setFilter({ sort: "recent", page: 0, career: "" })}>초기화</button>
        </div>
      </div>

      <ul className="card feed" style={{ marginTop: 10 }}>
        {state === "loading" && <li><span className="note" style={{ margin: 0 }}>불러오는 중…</span></li>}
        {state === "error" && <li><span>공고를 불러오지 못했어요.</span></li>}
        {state === "ready" && list.postings.length === 0 && <li><span>조건에 맞는 공고가 없어요.</span></li>}
        {list.postings.map((p) => (
          <li key={p.id} style={{ alignItems: "flex-start" }}>
            <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
              <button className="job-open" onClick={() => setOpenId(p.id)}><b>{p.company}</b> · {p.title}</button>
              <small style={{ color: "var(--mute)" }}>{[p.location, p.experience_level, p.employment_type, p.salary].filter(Boolean).join(" · ")}</small>
              {p.skills.length > 0 && (
                <span style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {p.skills.slice(0, 6).map((s) => <span key={s} className="bd r-self">{s}</span>)}
                </span>
              )}
            </div>
            <div style={{ display: "grid", gap: 6, justifyItems: "end", flex: "none" }}>
              <time>{ddayLabel(p.expires_at, p.deadline_type)}</time>
              <span style={{ display: "flex", gap: 4 }}>
                {(Object.keys(LANE_LABEL) as Lane[]).map((lane) => (
                  <button key={lane} className="chip" data-on={pins[p.id] === lane} onClick={() => void pin(p, pins[p.id] === lane ? null : lane)}>{LANE_LABEL[lane]}</button>
                ))}
              </span>
              {p.url && <a className="link" style={{ fontSize: 12 }} href={p.url} target="_blank" rel="noopener noreferrer">원문 공고 보기 ↗</a>}
            </div>
          </li>
        ))}
      </ul>
      {pages > 1 && (
        <div style={{ display: "flex", gap: 8, justifyContent: "center", alignItems: "center", marginTop: 12 }}>
          <button className="btn" disabled={(filter.page ?? 0) === 0} onClick={() => set({ page: (filter.page ?? 0) - 1 })}>이전</button>
          <small>{(filter.page ?? 0) + 1} / {pages}</small>
          <button className="btn" disabled={(filter.page ?? 0) + 1 >= pages} onClick={() => set({ page: (filter.page ?? 0) + 1 })}>다음</button>
        </div>
      )}
      {drawer}
      {toastEl}
    </section>
  );
}

/**
 * 공고 상세 서랍. 목록은 요약 컬럼만 불러오고, 여기서 1건의 정리된 본문(주요업무·자격요건·우대·근무조건)을 연다.
 * 페이지를 떠나지 않고 훑어본 뒤, 더 궁금하면 원문으로 간다 (새 탭).
 */
function PostingDrawer({ id, lane, onPin, onClose }: { id: string; lane: Lane | null; onPin: (lane: Lane | null) => Promise<void>; onClose: () => void }) {
  const [p, setP] = useState<PostingDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    loadPostingDetail(id).then((d) => alive && setP(d)).catch((e) => alive && setErr(e instanceof Error ? e.message : String(e)));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => { alive = false; window.removeEventListener("keydown", onKey); };
  }, [id, onClose]);

  const facts: [string, string | null | undefined][] = p ? [
    ["지역", p.location], ["경력", p.experience_level], ["학력", p.education_level ? EDU[p.education_level] : null],
    ["고용형태", p.employment_type], ["급여", p.salary], ["마감", p.expires_at ? `${p.expires_at.slice(0, 10)} (${ddayLabel(p.expires_at, p.deadline_type)})` : ddayLabel(null, p.deadline_type)],
  ] : [];

  return (
    <>
      <div className="drawer-bg" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="공고 상세">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="eyebrow" style={{ margin: 0 }}>공고 상세</span>
          <button className="mini" onClick={onClose}>닫기</button>
        </div>
        {err && <p className="note">공고를 불러오지 못했어요: {err}</p>}
        {!p && !err && <p className="note">불러오는 중…</p>}
        {p && (
          <>
            <p style={{ marginTop: 12, color: "var(--ink2)" }}>{p.company}</p>
            <h3>{p.title}</h3>
            {p.skills.length > 0 && (
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{p.skills.map((s) => <span key={s} className="bd r-self">{s}</span>)}</div>
            )}
            <dl className="facts">
              {facts.filter(([, v]) => v).map(([k, v]) => <div key={k} style={{ display: "contents" }}><dt>{k}</dt><dd>{v}</dd></div>)}
            </dl>
            <div className="desc">{p.description || "정리된 본문이 없어요. 원문 공고에서 확인해 주세요."}</div>
            <div className="drawer-foot">
              {(Object.keys(LANE_LABEL) as Lane[]).map((l) => (
                <button key={l} className="chip" data-on={lane === l} onClick={() => void onPin(lane === l ? null : l)}>{LANE_LABEL[l]}</button>
              ))}
              {p.url && <a className="btn pri" style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center" }} href={p.url} target="_blank" rel="noopener noreferrer">원문 공고 보기 ↗</a>}
            </div>
            <p className="note">요약 정보이며 원문이 우선해요.</p>
          </>
        )}
      </aside>
    </>
  );
}
