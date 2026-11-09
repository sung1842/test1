"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { AnimatePresence } from "framer-motion";
import type { Candidate } from "@/types/candidate";
import type { FitReport, FitReportRecord } from "@/types/fitReport";
import { isJdAnalyzerConfigured } from "@/lib/features";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { ProductShell } from "@/components/product/ProductShell";
import { DeskTabs } from "@/components/desk/DeskTabs";
import { CandidateTile } from "@/components/desk/CandidateTile";
import JdMatchModal, { type JdFormState, EMPTY_JD_FORM } from "@/components/JdMatchModal";
import FitScoreBadge from "@/components/FitScoreBadge";
import { ScoreColumns } from "@/components/charts/ScoreCharts";
import { loadJson, saveJson, skillHit } from "@/lib/productData";
import { lifeFetch } from "@/lib/lifeApi";
import { useCached } from "@/lib/useCached";
import { KEY, refreshDesk, useFitReports } from "@/lib/deskData";

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

  // 데모 JSON 후보는 섞지 않는다 (서버 후보 풀과 같은 수).
  // 후보 풀·건·분석 목록은 캐시를 먼저 그리고 뒤에서 갱신한다 (탭을 오갈 때 다시 기다리지 않게)
  const pool = useCached<Candidate[]>("pool:profiles", async () => {
    if (!isSupabaseConfigured() || !supabase) return [];
    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, role, title, avatar_url, short_bio, long_bio, skills, github_url, portfolio_url, behance_url, linkedin_url")
      .eq("is_public", true)
      // 기업 계정 제외 (SQL 030)
      .or("account_type.is.null,account_type.neq.company");
    if (error) throw new Error(error.message);
    return (data ?? []).map(profileToCandidate);
  }, { staleMs: 60_000 });
  const people = useMemo(() => pool.data ?? [], [pool.data]);

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
    .map((id) => people.find((c) => c.id === id))
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

  return (
    <ProductShell crumble="데스크 · 인재풀">
      <div className="product-page">
        <div className="dk" style={{ padding: 0, maxWidth: "none" }}><DeskTabs /></div>
        <div className="product-head">
          <div>
            <div className="product-eyebrow">데스크 · 인재풀</div>
            <h1 className="product-title" style={{ fontSize: 28 }}>인재 작업대</h1>
            <p className="product-muted" style={{ marginTop: 6, fontSize: 13 }}>
              찾기 {list.length}명 · 비교 {compare.length}/{COMPARE_CAP} · 회사 건 {cases.length}
            </p>
          </div>
          <div className="product-tabs" style={{ height: 40 }}>
            {([
              ["find", "찾기"],
              ["compare", `비교 ${compare.length}/${COMPARE_CAP}`],
              ["briefs", "회사 건"],
            ] as const).map(([key, label]) => (
              <button key={key} type="button" data-on={tab === key} onClick={() => setTab(key)}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {tab === "find" && (
          <>
            <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap", alignItems: "center" }}>
              <input
                className="product-field"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="이름, 직무, 스킬"
                style={{ maxWidth: 280, marginBottom: 0 }}
              />
              {ROLE_FILTERS.map((item) => (
                <button key={item.key} type="button" className="product-chip" data-on={role === item.key} onClick={() => setRole(item.key)}>
                  {item.label}
                </button>
              ))}
              <button type="button" className="product-chip" data-on={fitOnly} onClick={() => setFitOnly((v) => !v)} disabled={!briefMust.length}>
                이 건 조건
              </button>
              {jdReady ? (
                <button
                  type="button"
                  className="product-cta"
                  onClick={() => setShowJdModal(true)}
                >
                  {fitResults.size > 0 ? `JD 매칭 (${fitResults.size})` : "JD 매칭"}
                </button>
              ) : null}
              {sortByFit && fitResults.size > 0 ? (
                <span className="product-muted" style={{ fontSize: 12 }}>적합도순</span>
              ) : null}
              {cases.length === 0 ? (
                <span className="product-muted" style={{ fontSize: 12 }}>
                  열린 건 없음 · <Link href="/sourcing">공고 등록에서 만드세요</Link>
                </span>
              ) : (
                <>
                  <select
                    className="product-field"
                    value={brief?.id ?? ""}
                    onChange={(e) => setActiveBrief(e.target.value)}
                    aria-label="활성 회사 건"
                    style={{ marginBottom: 0, width: "auto", minWidth: 240, height: 36, padding: "0 10px" }}
                  >
                    {cases.map((b) => (
                      <option key={b.id} value={b.id}>
                        {caseLabel(b)}
                      </option>
                    ))}
                  </select>
                  {brief ? (
                    <span className="product-muted" style={{ fontSize: 12 }}>
                      담긴 후보 {caseMembers.get(brief.jdHash)?.size ?? 0}명
                      {briefMust.length ? ` · ${briefMust.join(" / ")}` : ""}
                    </span>
                  ) : null}
                </>
              )}
            </div>
            {caseNote && (
              <p className="product-muted" style={{ fontSize: 12, marginTop: 10 }}>{caseNote}</p>
            )}
            {list.length === 0 ? (
              <EmptyState title="맞는 사람이 없습니다">
                검색어, 직무, 또는 「이 건 조건」을 바꿔 보세요.
              </EmptyState>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, marginTop: 24, justifyItems: "center", paddingBottom: compared.length > 0 ? 88 : 0 }}>
                {list.map((c, i) => {
                  const hits = matchCount(c, briefMust);
                  const inCompare = compare.includes(c.id);
                  const compareBlocked = !inCompare && compareFull;
                  const report = fitFor(c, fitResults);
                  return (
                    <div key={c.id} style={{ width: 300 }}>
                      <CandidateTile candidate={c} />
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, margin: "8px 0 6px" }}>
                        <div className="product-muted" style={{ fontSize: 12 }}>
                          {briefMust.length ? `조건 ${hits}/${briefMust.length}` : c.role === "developer" ? "개발자" : "디자이너"}
                        </div>
                        {report ? <FitScoreBadge report={report} compact /> : null}
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          type="button"
                          className="product-cta ghost"
                          style={{ flex: 1 }}
                          disabled={compareBlocked}
                          title={compareBlocked ? `비교는 ${COMPARE_CAP}명까지` : undefined}
                          onClick={() => toggleCompare(c.id)}
                        >
                          {inCompare ? "비교에서 뺌" : compareBlocked ? `비교 ${COMPARE_CAP}명까지` : "비교에 담기"}
                        </button>
                        <AddToCaseButton active={brief} inCase={Boolean(brief && casesOf(c.id).includes(brief.id))} onAdd={() => addToCases(c.id, brief ? [brief.id] : [])} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {compared.length > 0 && (
              <CompareTray
                slots={compared}
                cap={COMPARE_CAP}
                onRemove={toggleCompare}
                onOpen={() => setTab("compare")}
              />
            )}
          </>
        )}

        {tab === "compare" && (
          <div style={{ marginTop: 22 }}>
            {compared.length === 0 ? (
              <EmptyState title="비교할 사람이 없습니다">
                찾기에서 2~{COMPARE_CAP}명을 담으면 스킬과 소개를 나란히 봅니다.
                <button type="button" className="product-cta" style={{ marginTop: 14 }} onClick={() => setTab("find")}>
                  찾기로 가서 담기
                </button>
              </EmptyState>
            ) : (
              <>
                {compared.length < 2 ? (
                  <div className="product-panel" style={{ padding: 14, marginBottom: 14 }}>
                    <p className="product-muted" style={{ margin: 0 }}>
                      {compared[0].name}만 담겼습니다. 한 명 더 담으면 나란히 비교합니다.
                    </p>
                  </div>
                ) : (
                  <div className="product-panel" style={{ padding: 14, marginBottom: 14 }}>
                    <div className="product-eyebrow">겹치는 스킬</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                      {overlap.length === 0 ? (
                        <span className="product-muted" style={{ fontSize: 13 }}>공통 태그가 없습니다. 차이를 보고 고르세요.</span>
                      ) : (
                        overlap.map((s) => (
                          <span key={s} className="product-skill hit">{s}</span>
                        ))
                      )}
                    </div>
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${compared.length}, minmax(0, 1fr))`, gap: 12 }}>
                  {compared.map((c) => {
                    const report = fitFor(c, fitResults);
                    return (
                      <article key={c.id} className="product-panel" style={{ padding: 16 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                          <div className="product-eyebrow">{c.role === "developer" ? "개발자" : "디자이너"}</div>
                          {report ? <FitScoreBadge report={report} compact /> : null}
                        </div>
                        <h2 style={{ fontSize: 20, margin: "4px 0" }}>{c.name}</h2>
                        <div className="product-muted" style={{ fontSize: 13 }}>{c.title}</div>
                        {brief && briefMust.length ? (
                          <div className="product-muted" style={{ fontSize: 12, marginTop: 8 }}>
                            {caseLabel(brief)} 조건 {matchCount(c, briefMust)}/{briefMust.length}
                          </div>
                        ) : null}
                        <p style={{ fontSize: 13, lineHeight: 1.55, marginTop: 10 }}>{c.shortBio}</p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                          {c.skills.map((s) => (
                            <span key={s} className={`product-skill${overlap.includes(s) ? " hit" : ""}`}>{s}</span>
                          ))}
                        </div>
                        <div style={{ marginTop: 14, display: "flex" }}>
                          <AddToCaseButton active={brief} inCase={Boolean(brief && casesOf(c.id).includes(brief.id))} onAdd={() => addToCases(c.id, brief ? [brief.id] : [])} />
                        </div>
                        <button
                          type="button"
                          className="product-cta ghost wide"
                          style={{ marginTop: 8 }}
                          onClick={() => toggleCompare(c.id)}
                        >
                          비교에서 빼기
                        </button>
                      </article>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {tab === "briefs" && (
          <CasesPanel
            cases={cases}
            activeId={activeBrief}
            onSelect={setActiveBrief}
            reports={caseReports}
            people={people}
            note={caseNote}
            startingId={startingId}
            onStart={startCase}
          />
        )}
      </div>

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
    </ProductShell>
  );
}

function CompareTray({
  slots,
  cap,
  onRemove,
  onOpen,
}: {
  slots: Candidate[];
  cap: number;
  onRemove: (id: string) => void;
  onOpen: () => void;
}) {
  const ready = slots.length >= 2;
  return (
    <div className="desk-tray">
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {Array.from({ length: cap }, (_, i) => {
          const person = slots[i];
          if (!person) {
            return (
              <span key={`empty-${i}`} className="desk-tray-slot">
                빈 자리
              </span>
            );
          }
          return (
            <button key={person.id} type="button" className="desk-tray-chip" title="비교에서 뺌" onClick={() => onRemove(person.id)}>
              {person.name} ×
            </button>
          );
        })}
        <span className="product-muted" style={{ fontSize: 12 }}>{slots.length}/{cap}</span>
      </div>
      <button type="button" className="product-cta" disabled={!ready} onClick={onOpen}>
        {ready ? "나란히 보기" : "2명부터 비교"}
      </button>
    </div>
  );
}

function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="product-empty" style={{ marginTop: 24 }}>
      <strong>{title}</strong>
      <div>{children}</div>
    </div>
  );
}

/** 위에서 고른 활성 건에 바로 담기 */
function AddToCaseButton({ active, inCase, onAdd }: { active: ScoutCase | undefined; inCase: boolean; onAdd: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  if (!active) {
    return (
      <Link href="/sourcing" className="product-cta ghost" style={{ flex: 1, textAlign: "center" }}>
        건 만들기
      </Link>
    );
  }
  return (
    <button
      type="button"
      className={inCase ? "product-cta ghost" : "product-cta"}
      style={{ flex: 1 }}
      disabled={inCase || busy}
      title={caseLabel(active)}
      onClick={async () => {
        setBusy(true);
        await onAdd();
        setBusy(false);
      }}
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
function CasesPanel({
  cases, activeId, onSelect, reports, people, note, startingId, onStart,
}: {
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
  const toneColor = { ok: "#047857", wait: "#64748B", bad: "#B91C1C" } as const;
  return (
    <div className="desk-shell" style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16, marginTop: 22 }}>
      <aside className="product-panel" style={{ padding: 14 }}>
        <div style={{ fontWeight: 650, marginBottom: 10 }}>열린 회사 건</div>
        <Link href="/sourcing" className="product-cta wide" style={{ display: "block", textAlign: "center" }}>
          새 건 · 공고 등록
        </Link>
        <div style={{ marginTop: 14, display: "grid", gap: 6 }}>
          {cases.length === 0 ? (
            <p className="product-muted" style={{ margin: 0, fontSize: 13 }}>열린 건이 없습니다. 공고 등록에서 사람인 형식으로 건을 만드세요.</p>
          ) : (
            cases.map((b) => {
              const n = reports.filter((r) => r.jdHash === b.jdHash).length;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => onSelect(b.id)}
                  className="product-panel"
                  style={{ textAlign: "left", padding: 10, background: b.id === activeId ? "#EEF2FF" : "#fff", cursor: "pointer" }}
                >
                  <div style={{ fontWeight: 650, fontSize: 13 }}>{b.clientName ?? "고객사 미정"}</div>
                  <div className="product-muted" style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.title}</div>
                  <div className="product-muted" style={{ fontSize: 12, marginTop: 4 }}>
                    후보 {n}명 · 승인 대기 {b.counts.pending}
                    {b.deadline ? ` · ~${b.deadline.slice(5).replace("-", ".")}` : ""}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>
      <section className="product-panel" style={{ padding: 18 }}>
        {active ? (
          <>
            <div className="product-eyebrow">{active.clientName ?? "고객사 미정"}</div>
            <h2 style={{ margin: "4px 0 8px" }}>{active.title}</h2>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {(active.requirements?.items ?? []).map((m) => (
                <span key={m.label} className={`product-skill${m.required ? " hit" : ""}`}>{m.label}{m.required ? "" : " (우대)"}</span>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
              <button type="button" className="product-cta" disabled={startingId !== null} onClick={() => onStart(active)}>
                {startingId === active.id ? "찾는 중…" : "JD 매칭 · 후보 찾기"}
              </button>
              <Link href={`/review?jd=${encodeURIComponent(active.jdHash)}`} className="product-cta ghost">승인함 · 제안</Link>
              {watch && watch !== "unavailable" && (
                <button type="button" className={watch.enabled ? "product-cta" : "product-cta ghost"} disabled={watchBusy} onClick={() => void toggleWatch()}
                  title="켜 두면 새로 들어오거나 바뀐 후보를 에이전트가 매일 찾아 승인함에 올립니다 (하루 분석 상한 있음)">
                  {watchBusy ? "바꾸는 중…" : watch.enabled ? `상시 수색 켜짐${watch.until ? ` · ~${watch.until.slice(5, 10).replace("-", ".")}` : ""}` : "상시 수색 켜기"}
                </button>
              )}
            </div>
            <p className="product-muted" style={{ fontSize: 12, margin: "0 0 14px" }}>
              「JD 매칭 · 후보 찾기」는 이 건 공고로 후보 풀을 걸러 상위 후보를 분석합니다. 찾기 탭에서 직접 고른 후보도 「건에 담기」로 여기 들어옵니다.
              {note ? ` · ${note}` : ""}
            </p>
            {(() => {
              const ranked = members
                .filter((r) => r.report)
                .map((r) => ({ id: r.candidateId, label: people.find((x) => x.id === r.candidateId)?.name ?? r.candidateName ?? "후보", score: r.report!.overallScore }))
                .sort((a, b) => b.score - a.score);
              return ranked.length > 1 ? (
                <div style={{ marginBottom: 10 }}>
                  <ScoreColumns items={ranked} onSelect={(i) => { window.location.href = `/talent/${ranked[i].id}`; }} />
                </div>
              ) : null;
            })()}
            <div style={{ display: "grid", gap: 8 }}>
              {members.length === 0 ? (
                <EmptyState title="아직 담긴 후보가 없습니다">「JD 매칭 · 후보 찾기」를 누르거나, 찾기 탭에서 「건에 담기」를 쓰세요.</EmptyState>
              ) : (
                members.map((r) => {
                  const p = people.find((x) => x.id === r.candidateId);
                  const st = reportState(r);
                  const sc = scores.get(r.candidateId);
                  return (
                    <div key={r.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "10px 0", borderBottom: "1px solid #F1F5F9", alignItems: "center" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ fontWeight: 650 }}>{p?.name ?? r.candidateName ?? "후보"}</div>
                          {r.report ? <FitScoreBadge report={r.report} compact /> : null}
                          <span style={{ fontSize: 12, color: toneColor[st.tone] }}>{st.text}</span>
                        </div>
                        <div className="product-muted" style={{ fontSize: 12 }}>
                          {p ? `${p.title} · ${p.skills.slice(0, 3).join(", ")}` : "인재풀에서 비공개로 바뀐 후보"}
                        </div>
                        {sc ? (
                          <div className="product-muted" style={{ fontSize: 11, marginTop: 2 }} title="코드 사전필터 순위 점수의 항목별 충족도 (0~100%)">
                            순위 {Math.round(sc.rankScore)}점 ·{" "}
                            {Object.entries(sc.items)
                              .filter(([k]) => !sc.excluded.includes(k))
                              .map(([k, v]) => `${SCORE_LABEL[k] ?? k} ${Math.round(v * 100)}%`)
                              .join(" · ")}
                            {sc.mustUnmet ? " · 필수 미충족" : ""}
                          </div>
                        ) : (
                          <div className="product-muted" style={{ fontSize: 11, marginTop: 2 }}>직접 담은 후보 · 순위 점수 없음</div>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 10, flexShrink: 0, fontSize: 12 }}>
                        <Link href={`/talent/${r.candidateId}`}>포트폴리오</Link>
                        {r.report && <Link href={`/review?jd=${encodeURIComponent(r.jdHash)}`}>리포트·제안</Link>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <EmptyState title="선택된 건이 없습니다">왼쪽에서 건을 고르거나 새로 만드세요.</EmptyState>
        )}
      </section>
    </div>
  );
}
