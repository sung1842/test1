"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence } from "framer-motion";
import type { Candidate } from "@/types/candidate";
import type { FitReport, FitReportRecord } from "@/types/fitReport";
import { isJdAnalyzerConfigured } from "@/lib/features";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import JdMatchModal, { type JdFormState, EMPTY_JD_FORM } from "@/components/JdMatchModal";
import { Search, X } from "lucide-react";
import { loadJson, saveJson, skillHit } from "@/lib/productData";
import { lifeFetch } from "@/lib/lifeApi";
import { useCached } from "@/lib/useCached";
import { KEY, refreshDesk, useFitReports } from "@/lib/deskData";
import { DLoadError, DSkeleton, DState, VerdictPill } from "@/components/desk/console/ui";

const COMPARE_CAP = 3;

/** 서버 스카우트 건 (jd_runs, /sourcing 에서 사람인 형식으로 등록) */
interface ScoutCase {
  id: string;
  jdHash: string;
  title: string;
  status: string;
  clientName: string | null;
  deadline: string | null;
  requirements: { items: { label: string; required: boolean }[] } | null;
  counts: { matched: number; analyzed: number; pending: number; approved: number };
}

const mustOf = (c: ScoutCase | undefined) => (c?.requirements?.items ?? []).filter((i) => i.required).map((i) => i.label);
const caseLabel = (c: ScoutCase) => (c.clientName ? `${c.clientName} · ${c.title}` : c.title);

function reportState(r: FitReportRecord): { text: string; tone: "ok" | "wait" | "bad" } {
  if (r.status === "failed") return { text: "분석 실패", tone: "bad" };
  if (!r.report) return { text: "분석 중", tone: "wait" };
  if (r.status === "approved") return { text: "승인됨 · 제안 가능", tone: "ok" };
  if (r.status === "rejected") return { text: "반려", tone: "bad" };
  return { text: "승인 대기", tone: "wait" };
}

const POOL_PAGE = 30;

function profileToCandidate(p: {
  id: string; name: string; role: string; title: string | null;
  avatar_url: string | null; short_bio?: string | null; long_bio?: string | null;
  skills?: string[] | null; github_url?: string | null; portfolio_url?: string | null;
  behance_url?: string | null; linkedin_url?: string | null;
}): Candidate {
  return {
    id: p.id,
    name: p.name,
    role: (p.role as "developer" | "designer") || "developer",
    title: p.title || "",
    avatar: p.avatar_url || "",
    shortBio: p.short_bio || "",
    longBio: p.long_bio || "",
    skills: p.skills || [],
    links: {
      github: p.github_url || "",
      portfolio: p.portfolio_url || "",
      behance: p.behance_url || "",
      linkedin: p.linkedin_url || "",
    },
    email: "",
    source: "profile",
    supabaseId: p.id,
  };
}

function fitFor(c: Candidate, map: Map<string, FitReport>): FitReport | undefined {
  if (c.supabaseId && map.has(c.supabaseId)) return map.get(c.supabaseId);
  if (map.has(c.id)) return map.get(c.id);
  for (const report of map.values()) {
    if (report.candidateName === c.name) return report;
  }
  return undefined;
}

type Tab = "find" | "compare" | "briefs";

const ROLE_FILTERS = [
  { key: "all" as const, label: "전체" },
  { key: "developer" as const, label: "개발자" },
  { key: "designer" as const, label: "디자이너" },
];

function matchCount(c: Candidate, must: string[]) {
  if (!must.length) return 0;
  return must.filter((m) => c.skills.some((s) => skillHit(s, [m])) || skillHit(c.title, [m]) || skillHit(c.shortBio, [m])).length;
}

function sharedSkills(list: Candidate[]) {
  if (list.length < 2) return [];
  const first = list[0].skills;
  return first.filter((s) => list.every((p) => p.skills.some((x) => x.toLowerCase() === s.toLowerCase())));
}

export default function DeskPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("find");
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<"all" | "developer" | "designer">("all");
  const [compare, setCompare] = useState<string[]>([]);
  const [activeBrief, setActiveBrief] = useState("");
  const [fitOnly, setFitOnly] = useState(false);
  const [caseNote, setCaseNote] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [showJdModal, setShowJdModal] = useState(false);
  const [jdForm, setJdForm] = useState<JdFormState>(EMPTY_JD_FORM);
  const [fitResults, setFitResults] = useState<Map<string, FitReport>>(new Map());
  const [sortByFit, setSortByFit] = useState(false);
  const jdReady = isJdAnalyzerConfigured();

  // 인재풀은 서버에서 나눠 받는다 (전체를 한 번에 받지 않음). 검색어·직무는 서버 조건으로 걸고,
  // 「더 보기」로 다음 묶음을 이어 받는다. 후보가 수천 명이어도 첫 화면은 한 묶음만 기다린다.
  const [serverQ, setServerQ] = useState("");
  const [pageCount, setPageCount] = useState(1);
  useEffect(() => {
    const t = setTimeout(() => { setServerQ(query.trim()); setPageCount(1); }, 300);
    return () => clearTimeout(t);
  }, [query]);
  const poolKey = `pool:profiles:${role}:${serverQ}:${pageCount}`;
  const pool = useCached<{ rows: Candidate[]; total: number }>(poolKey, async () => {
    if (!isSupabaseConfigured() || !supabase) return { rows: [], total: 0 };
    let q = supabase
      .from("profiles")
      .select("id, name, role, title, avatar_url, short_bio, long_bio, skills, github_url, portfolio_url, behance_url, linkedin_url", { count: "estimated" })
      .eq("is_public", true)
      // 기업 계정 제외 (SQL 030)
      .or("account_type.is.null,account_type.neq.company")
      .order("id")
      .range(0, pageCount * POOL_PAGE - 1);
    if (role !== "all") q = q.eq("role", role);
    if (serverQ) {
      const term = serverQ.replace(/[%,(){}"]/g, " ").trim();
      if (term) q = q.or(`name.ilike.%${term}%,title.ilike.%${term}%,skills.cs.{"${term}"}`);
    }
    const { data, error, count } = await q;
    if (error) throw new Error(error.message);
    return { rows: (data ?? []).map(profileToCandidate), total: count ?? data?.length ?? 0 };
  }, { staleMs: 60_000 });
  // 이전 묶음을 보여 주면서 다음 묶음을 받는다 (더 보기 때 목록이 비지 않게)
  const [kept, setKept] = useState<{ rows: Candidate[]; total: number } | null>(null);
  // 비교함에 담은 후보는 검색을 바꿔도 남도록 따로 기억한다
  const [seen, setSeen] = useState<Map<string, Candidate>>(() => new Map());
  if (pool.data && pool.data !== kept) {
    setKept(pool.data);
    setSeen((m) => { const n = new Map(m); for (const c of pool.data!.rows) n.set(c.id, c); return n; });
  }
  const poolData = pool.data ?? kept;
  const people = useMemo(() => poolData?.rows ?? [], [poolData]);
  const poolTotal = poolData?.total ?? 0;

  // 회사 건 = 서버 스카우트 건. 담긴 후보 = 그 건 JD 의 fit_reports (브라우저 저장 아님)
  const casesQ = useCached<{ cases: ScoutCase[] }>(user ? KEY.cases : null, () => lifeFetch<{ cases: ScoutCase[] }>("/api/scout-cases"), { refreshMs: 30_000 });
  const reportsQ = useFitReports();
  const cases = useMemo(() => (casesQ.data?.cases ?? []).filter((x) => x.status !== "closed"), [casesQ.data]);
  const caseReports = useMemo(() => reportsQ.data?.reports ?? [], [reportsQ.data]);

  // 승인함에서 ?jd=<해시> 로 넘어오면 그 건을 "회사 건" 탭에서 바로 연다
  const [jdParam, setJdParam] = useState<string | null>(null);
  useEffect(() => {
    const t = setTimeout(() => {
      const q = new URLSearchParams(window.location.search);
      const jd = q.get("jd");
      if (jd) {
        setJdParam(jd);
        setTab("briefs");
      }
    }, 0);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (!cases.length) return;
    const t = setTimeout(() => {
      setActiveBrief((cur) => {
        const fromJd = jdParam ? cases.find((x) => x.jdHash === jdParam)?.id : undefined;
        if (fromJd) return fromJd;
        if (cases.some((x) => x.id === cur)) return cur;
        const remembered = loadJson<string>("tf-desk-case", "");
        return cases.some((x) => x.id === remembered) ? remembered : (cases[0]?.id ?? "");
      });
      if (jdParam) setJdParam(null);
    }, 0);
    return () => clearTimeout(t);
  }, [cases, jdParam]);
  useEffect(() => {
    if (activeBrief) saveJson("tf-desk-case", activeBrief);
  }, [activeBrief]);

  const brief = cases.find((b) => b.id === activeBrief);
  const briefMust = useMemo(() => mustOf(brief), [brief]);
  /** 건별 담긴 후보 id */
  const caseMembers = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const r of caseReports) {
      const set = m.get(r.jdHash) ?? new Set<string>();
      set.add(r.candidateId);
      m.set(r.jdHash, set);
    }
    return m;
  }, [caseReports]);
  const casesOf = (candidateId: string) => cases.filter((c) => caseMembers.get(c.jdHash)?.has(candidateId)).map((c) => c.id);

  const addToCases = async (candidateId: string, caseIds: string[]) => {
    let queued = 0;
    const errors: string[] = [];
    for (const id of caseIds) {
      try {
        const r = await lifeFetch<{ queued: number }>(`/api/scout-cases/${encodeURIComponent(id)}/candidates`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ candidateIds: [candidateId] }),
        });
        queued += r.queued;
      } catch (err) {
        errors.push(err instanceof Error ? err.message : "담기 실패");
      }
    }
    setCaseNote(errors.length ? errors[0] : `${cases.filter((c) => caseIds.includes(c.id)).map(caseLabel).join(", ")} 건에 담았습니다. 분석이 끝나면 승인함에서 제안까지 이어집니다.`);
    if (queued > 0) refreshDesk();
  };

  const startCase = async (c: ScoutCase) => {
    setStartingId(c.id);
    try {
      const r = await lifeFetch<{ queued: number; matched: number }>(`/api/scout-cases/${encodeURIComponent(c.id)}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      setCaseNote(r.queued > 0 ? `조건에 맞는 ${r.matched}명 중 ${r.queued}명 분석을 시작했습니다.` : "새로 분석할 후보가 없습니다.");
      refreshDesk();
    } catch (err) {
      setCaseNote(err instanceof Error ? err.message : "후보 찾기 실패");
    } finally {
      setStartingId(null);
    }
  };

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return people
      .filter((c) => {
        if (role !== "all" && c.role !== role) return false;
        if (q && !(c.name.includes(q) || c.title.toLowerCase().includes(q) || c.skills.some((s) => s.toLowerCase().includes(q)))) {
          return false;
        }
        if (fitOnly && briefMust.length) {
          return matchCount(c, briefMust) > 0;
        }
        return true;
      })
      .slice()
      .sort((a, b) => {
        if (sortByFit && fitResults.size > 0) {
          const sa = fitFor(a, fitResults)?.overallScore ?? -1;
          const sb = fitFor(b, fitResults)?.overallScore ?? -1;
          if (sb !== sa) return sb - sa;
        }
        return briefMust.length ? matchCount(b, briefMust) - matchCount(a, briefMust) : 0;
      });
  }, [query, role, fitOnly, briefMust, people, sortByFit, fitResults]);

  const compared = compare
    .map((id) => seen.get(id))
    .filter((c): c is Candidate => Boolean(c));
  const overlap = sharedSkills(compared);
  const compareFull = compare.length >= COMPARE_CAP;

  const toggleCompare = (id: string) => {
    setCompare((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= COMPARE_CAP) return prev;
      return [...prev, id];
    });
  };

  const TABS: [Tab, string][] = [["find", "찾기"], ["compare", `비교 ${compare.length}/${COMPARE_CAP}`], ["briefs", "회사 건"]];

  return (
    <>
      <header className="lc-top" data-in>
        <h1>인재풀</h1>
        <span className="lc-sub">찾기 {list.length}명 · 비교 {compare.length}/{COMPARE_CAP} · 회사 건 {cases.length}</span>
        <div className="lc-actions">
          <div className="lc-seg" role="group" aria-label="보기">
            {TABS.map(([key, label]) => <button key={key} type="button" aria-pressed={tab === key} onClick={() => setTab(key)}>{label}</button>)}
          </div>
        </div>
      </header>

      {tab === "find" && (
        <>
          <div className="lc-toolbar" data-in>
            <label className="lc-search">
              <Search size={14} aria-hidden="true" />
              <span className="lc-sr">이름, 직무, 스킬로 찾기</span>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="이름, 직무, 스킬" />
            </label>
            <div className="lc-seg" role="group" aria-label="직무">
              {ROLE_FILTERS.map((item) => <button key={item.key} type="button" aria-pressed={role === item.key} onClick={() => { setRole(item.key); setPageCount(1); }}>{item.label}</button>)}
            </div>
            <button type="button" className="lc-btn" aria-pressed={fitOnly} onClick={() => setFitOnly((v) => !v)} disabled={!briefMust.length} style={fitOnly ? { borderColor: "var(--mint)", color: "var(--mint)" } : undefined}>이 건 조건</button>
            {cases.length === 0 ? (
              <span className="lc-cap" style={{ margin: 0 }}>열린 건 없음 · <Link href="/sourcing" style={{ color: "var(--mint)" }}>스카우트 건에서 만드세요</Link></span>
            ) : (
              <>
                <label className="lc-sr" htmlFor="lc-case">활성 회사 건</label>
                <select id="lc-case" className="lc-select" value={brief?.id ?? ""} onChange={(e) => setActiveBrief(e.target.value)}>
                  {cases.map((b) => <option key={b.id} value={b.id}>{caseLabel(b)}</option>)}
                </select>
                {brief ? <span className="lc-cap" style={{ margin: 0 }}>담긴 후보 {caseMembers.get(brief.jdHash)?.size ?? 0}명{briefMust.length ? ` · 필수 ${briefMust.join(" / ")}` : ""}</span> : null}
              </>
            )}
            {jdReady ? (
              <button type="button" className="lc-btn is-primary" style={{ marginLeft: "auto" }} onClick={() => setShowJdModal(true)}>
                {fitResults.size > 0 ? `JD 매칭 (${fitResults.size})` : "JD 매칭"}
              </button>
            ) : null}
          </div>
          {caseNote && <p className="lc-ok" role="status" style={{ marginTop: 0, marginBottom: 12 }}>{caseNote}</p>}

          <section className="lc-panel" aria-label="후보 목록" data-in>
            {pool.error && !poolData ? (
              <DLoadError what="인재풀" error={pool.error} />
            ) : !poolData ? (
              <DSkeleton rows={5} label="인재풀을 불러오는 중" />
            ) : list.length === 0 ? (
              <DState title="맞는 사람이 없습니다" body="검색어, 직무, 또는 「이 건 조건」을 바꿔 보세요." />
            ) : (
              <table className="lc-table">
                <thead><tr>
                  <th>후보</th>
                  <th className="lc-hide-m">스킬</th>
                  <th className="num lc-hide-m">{briefMust.length ? "조건" : "직무"}</th>
                  <th className="num">{sortByFit && fitResults.size > 0 ? "적합도순" : "적합도"}</th>
                  <th className="num"><span className="lc-sr">동작</span></th>
                </tr></thead>
                <tbody>
                  {list.map((c) => {
                    const inCompare = compare.includes(c.id);
                    const compareBlocked = !inCompare && compareFull;
                    const report = fitFor(c, fitResults);
                    return (
                      <tr key={c.id}>
                        <td>
                          <Link className="t-main" href={`/talent/${c.id}`}>{c.name}</Link>
                          <div className="t-sub">{c.title || (c.role === "developer" ? "개발자" : "디자이너")}</div>
                        </td>
                        <td className="lc-hide-m">
                          <div className="lc-skillrow">
                            {c.skills.slice(0, 4).map((s) => <span key={s} className={`lc-chip${briefMust.some((m) => skillHit(s, [m])) ? " is-hit" : ""}`}>{s}</span>)}
                            {c.skills.length > 4 && <span className="t-sub">+{c.skills.length - 4}</span>}
                          </div>
                        </td>
                        <td className="num lc-hide-m t-sub">{briefMust.length ? `${matchCount(c, briefMust)}/${briefMust.length}` : c.role === "developer" ? "개발자" : "디자이너"}</td>
                        <td className="num">{report ? <VerdictPill verdict={report.verdict} score={report.overallScore} /> : <span className="t-sub">—</span>}</td>
                        <td className="num">
                          <div className="lc-row-acts" style={{ justifyContent: "flex-end" }}>
                            <button type="button" className="lc-btn is-sm is-ghost" disabled={compareBlocked} title={compareBlocked ? `비교는 ${COMPARE_CAP}명까지` : undefined} onClick={() => toggleCompare(c.id)} aria-pressed={inCompare}>
                              {inCompare ? "비교에서 뺌" : "비교"}
                            </button>
                            <AddToCaseButton active={brief} inCase={Boolean(brief && casesOf(c.id).includes(brief.id))} onAdd={() => addToCases(c.id, brief ? [brief.id] : [])} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            {poolData && people.length > 0 && (
              <div className="lc-more">
                <span className="t-sub">{people.length}명 표시{poolTotal > people.length ? ` · 전체 약 ${poolTotal}명` : ""}</span>
                {poolTotal > people.length && (
                  <button type="button" className="lc-btn" disabled={!pool.data} onClick={() => setPageCount((n) => n + 1)}>
                    {pool.data ? `${POOL_PAGE}명 더 보기` : "불러오는 중…"}
                  </button>
                )}
              </div>
            )}
          </section>
          {compared.length > 0 && <CompareTray slots={compared} cap={COMPARE_CAP} onRemove={toggleCompare} onOpen={() => setTab("compare")} />}
        </>
      )}

      {tab === "compare" && (
        <div data-in>
          {compared.length === 0 ? (
            <section className="lc-panel">
              <DState title="비교할 사람이 없습니다" body={`찾기에서 2~${COMPARE_CAP}명을 담으면 스킬과 소개를 나란히 봅니다.`} action={{ onClick: () => setTab("find"), label: "찾기로 가서 담기" }} />
            </section>
          ) : (
            <>
              <section className="lc-panel" style={{ marginBottom: 12 }}>
                <div className="lc-pb" style={{ paddingTop: 14 }}>
                  {compared.length < 2 ? (
                    <p style={{ margin: 0, color: "var(--ink-2)" }}>{compared[0].name}만 담겼습니다. 한 명 더 담으면 나란히 비교합니다.</p>
                  ) : (
                    <>
                      <h2 style={{ fontSize: 14, fontWeight: 600 }}>겹치는 스킬</h2>
                      <div className="lc-tags">
                        {overlap.length === 0 ? <span className="t-sub" style={{ color: "var(--mute)", fontSize: 13 }}>공통 태그가 없습니다. 차이를 보고 고르세요.</span> : overlap.map((s) => <span key={s} className="lc-chip is-hit">{s}</span>)}
                      </div>
                    </>
                  )}
                </div>
              </section>
              <div className="lc-compare" style={{ gridTemplateColumns: `repeat(${compared.length}, minmax(0, 1fr))` }}>
                {compared.map((c) => {
                  const report = fitFor(c, fitResults);
                  return (
                    <article key={c.id} className="lc-panel">
                      <div className="lc-pb" style={{ paddingTop: 16 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                          <span className="lc-cap" style={{ margin: 0 }}>{c.role === "developer" ? "개발자" : "디자이너"}</span>
                          {report ? <VerdictPill verdict={report.verdict} score={report.overallScore} /> : null}
                        </div>
                        <h2><Link href={`/talent/${c.id}`}>{c.name}</Link></h2>
                        <div className="lc-cap" style={{ marginTop: 2 }}>{c.title}</div>
                        {brief && briefMust.length ? <div className="lc-cap" style={{ marginTop: 6 }}>{caseLabel(brief)} 조건 {matchCount(c, briefMust)}/{briefMust.length}</div> : null}
                        <p style={{ fontSize: 13, lineHeight: 1.55, marginTop: 10, color: "var(--ink-2)" }}>{c.shortBio}</p>
                        <div className="lc-tags">{c.skills.map((s) => <span key={s} className={`lc-chip${overlap.includes(s) ? " is-hit" : ""}`}>{s}</span>)}</div>
                        <div className="lc-row-acts" style={{ marginTop: 14 }}>
                          <AddToCaseButton active={brief} inCase={Boolean(brief && casesOf(c.id).includes(brief.id))} onAdd={() => addToCases(c.id, brief ? [brief.id] : [])} />
                          <button type="button" className="lc-btn is-sm is-ghost" onClick={() => toggleCompare(c.id)}>비교에서 빼기</button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {tab === "briefs" && (
        <CasesPanel cases={cases} activeId={activeBrief} onSelect={setActiveBrief} reports={caseReports} people={people} note={caseNote} startingId={startingId} onStart={startCase} />
      )}

      <AnimatePresence>
        {showJdModal && (
          <JdMatchModal
            userId={user?.id ?? null}
            form={jdForm}
            onFormChange={setJdForm}
            onClose={() => setShowJdModal(false)}
            onResults={(results) => {
              setFitResults((prev) => new Map([...prev, ...results]));
              setSortByFit(true);
            }}
            onViewResults={() => {
              setShowJdModal(false);
              setSortByFit(true);
              setTab("find");
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function CompareTray({ slots, cap, onRemove, onOpen }: { slots: Candidate[]; cap: number; onRemove: (id: string) => void; onOpen: () => void }) {
  const ready = slots.length >= 2;
  return (
    <div className="lc-tray" role="region" aria-label="비교 담기">
      {Array.from({ length: cap }, (_, i) => {
        const person = slots[i];
        return person
          ? <button key={person.id} type="button" className="lc-btn is-sm" title="비교에서 뺌" onClick={() => onRemove(person.id)}>{person.name}<X aria-hidden="true" /><span className="lc-sr">비교에서 빼기</span></button>
          : <span key={`empty-${i}`} className="slot">빈 자리</span>;
      })}
      <span className="lc-cap" style={{ margin: 0 }}>{slots.length}/{cap}</span>
      <button type="button" className="lc-btn is-sm is-primary" style={{ marginLeft: "auto" }} disabled={!ready} onClick={onOpen}>{ready ? "나란히 보기" : "2명부터 비교"}</button>
    </div>
  );
}

/** 위에서 고른 활성 건에 바로 담기 */
function AddToCaseButton({ active, inCase, onAdd }: { active: ScoutCase | undefined; inCase: boolean; onAdd: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  if (!active) return <Link href="/sourcing" className="lc-btn is-sm">건 만들기</Link>;
  return (
    <button
      type="button"
      className={`lc-btn is-sm${inCase ? " is-ghost" : ""}`}
      disabled={inCase || busy}
      title={caseLabel(active)}
      onClick={async () => { setBusy(true); await onAdd(); setBusy(false); }}
    >
      {inCase ? "이 건에 담김" : busy ? "담는 중…" : "건에 담기"}
    </button>
  );
}

interface CaseScore {
  candidateId: string;
  rankScore: number;
  stage: string;
  items: Record<string, number>;
  excluded: string[];
  mustUnmet: boolean;
}

const SCORE_LABEL: Record<string, string> = { must: "필수", nice: "우대", years: "경력", role: "직무", vector: "경험 유사도", activity: "최근 활동" };

/** 회사 건 탭 — 서버 스카우트 건과 담긴 후보, 다음 작업(포트폴리오·리포트·제안) */
function CasesPanel({ cases, activeId, onSelect, reports, people, note, startingId, onStart }: {
  cases: ScoutCase[];
  activeId: string;
  onSelect: (id: string) => void;
  reports: FitReportRecord[];
  people: Candidate[];
  note: string | null;
  startingId: string | null;
  onStart: (c: ScoutCase) => void;
}) {
  const active = cases.find((c) => c.id === activeId);
  const members = active ? reports.filter((r) => r.jdHash === active.jdHash) : [];
  const [scores, setScores] = useState<Map<string, CaseScore>>(new Map());
  const [watch, setWatch] = useState<{ enabled: boolean; active: boolean; until: string | null } | null | "unavailable">(null);
  const [watchBusy, setWatchBusy] = useState(false);
  useEffect(() => {
    if (!activeId) return;
    let alive = true;
    const t = setTimeout(() => {
      lifeFetch<{ scores: CaseScore[] }>(`/api/scout-cases/${encodeURIComponent(activeId)}/scores`)
        .then((r) => alive && setScores(new Map(r.scores.map((x) => [x.candidateId, x]))))
        .catch(() => alive && setScores(new Map()));
      lifeFetch<{ settings: { enabled: boolean; active: boolean; until: string | null } }>(`/api/jd-runs/${encodeURIComponent(activeId)}/watch`)
        .then((r) => alive && setWatch(r.settings))
        .catch(() => alive && setWatch("unavailable"));
    }, 0);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [activeId]);
  const toggleWatch = async () => {
    if (!active || !watch || watch === "unavailable") return;
    setWatchBusy(true);
    try {
      const r = await lifeFetch<{ enabled: boolean; until: string | null }>(`/api/jd-runs/${encodeURIComponent(active.id)}/watch`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !watch.enabled }),
      });
      setWatch({ enabled: r.enabled, active: r.enabled, until: r.until });
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "상시 수색 설정을 바꾸지 못했습니다.");
    } finally {
      setWatchBusy(false);
    }
  };
  const ranked = members
    .filter((r) => r.report)
    .map((r) => ({ id: r.candidateId, label: people.find((x) => x.id === r.candidateId)?.name ?? r.candidateName ?? "후보", score: r.report!.overallScore }))
    .sort((a, b) => b.score - a.score);

  return (
    <div className="lc-cases" data-in>
      <aside className="lc-panel" aria-labelledby="h-open-cases">
        <div className="lc-ph"><h2 id="h-open-cases">열린 회사 건</h2></div>
        <div className="lc-pb" style={{ display: "grid", gap: 4 }}>
          <Link href="/sourcing" className="lc-btn is-primary" style={{ justifyContent: "center", marginBottom: 8 }}>새 건 · 공고 등록</Link>
          {cases.length === 0 ? (
            <p className="lc-cap" style={{ margin: 0 }}>열린 건이 없습니다. 공고 등록에서 사람인 형식으로 건을 만드세요.</p>
          ) : cases.map((b) => {
            const n = reports.filter((r) => r.jdHash === b.jdHash).length;
            return (
              <button key={b.id} type="button" className="lc-case-btn" aria-pressed={b.id === activeId} onClick={() => onSelect(b.id)}>
                <b>{b.clientName ?? "고객사 미정"}</b>
                <span>{b.title}</span>
                <span>후보 {n}명 · 승인 대기 {b.counts.pending}{b.deadline ? ` · ~${b.deadline.slice(5).replace("-", ".")}` : ""}</span>
              </button>
            );
          })}
        </div>
      </aside>
      <section className="lc-panel" aria-label="선택한 회사 건">
        {active ? (
          <div className="lc-pb" style={{ paddingTop: 16 }}>
            <div className="lc-cap" style={{ margin: 0 }}>{active.clientName ?? "고객사 미정"}</div>
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: "2px 0 10px" }}>{active.title}</h2>
            <div className="lc-tags" style={{ marginBottom: 12 }}>
              {(active.requirements?.items ?? []).map((m) => <span key={m.label} className={`lc-chip${m.required ? " is-hit" : ""}`}>{m.label}{m.required ? "" : " (우대)"}</span>)}
            </div>
            <div className="lc-row-acts">
              <button type="button" className="lc-btn is-primary" disabled={startingId !== null} onClick={() => onStart(active)}>{startingId === active.id ? "찾는 중…" : "JD 매칭 · 후보 찾기"}</button>
              <Link href={`/review?jd=${encodeURIComponent(active.jdHash)}`} className="lc-btn">승인함 · 제안</Link>
              {watch && watch !== "unavailable" && (
                <button type="button" className="lc-btn" aria-pressed={watch.enabled} disabled={watchBusy} onClick={() => void toggleWatch()} style={watch.enabled ? { borderColor: "var(--mint)", color: "var(--mint)" } : undefined}
                  title="켜 두면 새로 들어오거나 바뀐 후보를 에이전트가 매일 찾아 승인함에 올립니다 (하루 분석 상한 있음)">
                  {watchBusy ? "바꾸는 중…" : watch.enabled ? `상시 수색 켜짐${watch.until ? ` · ~${watch.until.slice(5, 10).replace("-", ".")}` : ""}` : "상시 수색 켜기"}
                </button>
              )}
            </div>
            <p className="lc-cap">「JD 매칭 · 후보 찾기」는 이 건 공고로 후보 풀을 걸러 상위 후보를 분석합니다. 찾기 탭에서 직접 고른 후보도 「건에 담기」로 여기 들어옵니다.{note ? ` · ${note}` : ""}</p>
            {ranked.length > 1 && (
              <>
                <h3 style={{ fontSize: 13, fontWeight: 600, margin: "16px 0 8px" }}>적합도</h3>
                <div className="lc-rank">
                  {ranked.map((x) => (
                    <button key={x.id} type="button" onClick={() => { window.location.href = `/talent/${x.id}`; }} aria-label={`${x.label} ${x.score}점, 포트폴리오 보기`}>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.label}</span>
                      <span className="bt"><i data-grow style={{ width: `${x.score}%` }} /></span>
                      <span className="n">{x.score}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
            <div style={{ marginTop: 8 }}>
              {members.length === 0 ? (
                <DState title="아직 담긴 후보가 없습니다" body="「JD 매칭 · 후보 찾기」를 누르거나, 찾기 탭에서 「건에 담기」를 쓰세요." />
              ) : members.map((r) => {
                const p = people.find((x) => x.id === r.candidateId);
                const st = reportState(r);
                const sc = scores.get(r.candidateId);
                return (
                  <div key={r.id} className="lc-member">
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <b style={{ fontWeight: 600 }}>{p?.name ?? r.candidateName ?? "후보"}</b>
                        {r.report ? <VerdictPill verdict={r.report.verdict} score={r.report.overallScore} /> : null}
                        <span className={`lc-tone-${st.tone}`} style={{ fontSize: 12 }}>{st.text}</span>
                      </div>
                      <div className="lc-cap" style={{ marginTop: 2 }}>{p ? `${p.title} · ${p.skills.slice(0, 3).join(", ")}` : "인재풀에서 비공개로 바뀐 후보"}</div>
                      <div className="lc-cap" style={{ marginTop: 2 }} title={sc ? "코드 사전필터 순위 점수의 항목별 충족도 (0~100%)" : undefined}>
                        {sc
                          ? `순위 ${Math.round(sc.rankScore)}점 · ${Object.entries(sc.items).filter(([k]) => !sc.excluded.includes(k)).map(([k, v]) => `${SCORE_LABEL[k] ?? k} ${Math.round(v * 100)}%`).join(" · ")}${sc.mustUnmet ? " · 필수 미충족" : ""}`
                          : "직접 담은 후보 · 순위 점수 없음"}
                      </div>
                    </div>
                    <div className="acts">
                      <Link href={`/talent/${r.candidateId}`}>포트폴리오</Link>
                      {r.report && <Link href={`/review?jd=${encodeURIComponent(r.jdHash)}`}>리포트·제안</Link>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <DState title="선택된 건이 없습니다" body="왼쪽에서 건을 고르거나 새로 만드세요." />
        )}
      </section>
    </div>
  );
}
