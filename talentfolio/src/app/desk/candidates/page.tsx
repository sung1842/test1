"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence } from "framer-motion";
import candidatesData from "@/data/candidates.json";
import type { Candidate } from "@/types/candidate";
import type { FitReport } from "@/types/fitReport";
import { isJdAnalyzerConfigured } from "@/lib/features";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { ProductShell } from "@/components/product/ProductShell";
import { DeskTabs } from "@/components/desk/DeskTabs";
import { CandidateTile } from "@/components/desk/CandidateTile";
import JdMatchModal, { type JdFormState, EMPTY_JD_FORM } from "@/components/JdMatchModal";
import FitScoreBadge from "@/components/FitScoreBadge";
import { SEED_BRIEFS, loadJson, saveJson, skillHit, type CompanyBrief } from "@/lib/productData";

const staticPeople = (candidatesData as Candidate[]).map((c) => ({ ...c, source: "static" as const }));
const COMPARE_CAP = 3;

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

function parseSkills(text: string) {
  return text.split(/[,\n·/|]+/).map((s) => s.trim()).filter(Boolean);
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
  const [briefs, setBriefs] = useState<CompanyBrief[]>(SEED_BRIEFS);
  const [activeBrief, setActiveBrief] = useState(SEED_BRIEFS[0]?.id ?? "");
  const [company, setCompany] = useState("");
  const [briefRole, setBriefRole] = useState("");
  const [mustInput, setMustInput] = useState("");
  const [fitOnly, setFitOnly] = useState(false);
  const [ready, setReady] = useState(false);
  const [livePeople, setLivePeople] = useState<Candidate[]>([]);
  const [showJdModal, setShowJdModal] = useState(false);
  const [jdForm, setJdForm] = useState<JdFormState>(EMPTY_JD_FORM);
  const [fitResults, setFitResults] = useState<Map<string, FitReport>>(new Map());
  const [sortByFit, setSortByFit] = useState(false);
  const jdReady = isJdAnalyzerConfigured();

  const people = useMemo(() => [...staticPeople, ...livePeople], [livePeople]);

  const loadLive = useCallback(async () => {
    if (!isSupabaseConfigured() || !supabase) return;
    const { data } = await supabase.from("profiles").select("*").eq("is_public", true);
    if (data && data.length > 0) setLivePeople(data.map(profileToCandidate));
  }, []);

  useEffect(() => {
    void loadLive();
  }, [loadLive]);

  useEffect(() => {
    const saved = loadJson<CompanyBrief[]>("tf-briefs", SEED_BRIEFS);
    const next = Array.isArray(saved) && saved.length > 0 ? saved : SEED_BRIEFS;
    setBriefs(next);
    const remembered = loadJson<string>("tf-desk-brief", next[0]?.id ?? "");
    setActiveBrief(next.some((b) => b.id === remembered) ? remembered : (next[0]?.id ?? ""));
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) saveJson("tf-briefs", briefs);
  }, [briefs, ready]);
  useEffect(() => {
    if (ready) saveJson("tf-desk-brief", activeBrief);
  }, [activeBrief, ready]);

  const brief = briefs.find((b) => b.id === activeBrief);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return people
      .filter((c) => {
        if (role !== "all" && c.role !== role) return false;
        if (q && !(c.name.includes(q) || c.title.toLowerCase().includes(q) || c.skills.some((s) => s.toLowerCase().includes(q)))) {
          return false;
        }
        if (fitOnly && brief?.must.length) {
          return matchCount(c, brief.must) > 0;
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
        return brief ? matchCount(b, brief.must) - matchCount(a, brief.must) : 0;
      });
  }, [query, role, fitOnly, brief, people, sortByFit, fitResults]);

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

  const toggleBriefPerson = (id: string) => {
    if (!brief) return;
    setBriefs((prev) =>
      prev.map((b) => {
        if (b.id !== brief.id) return b;
        return b.people.includes(id)
          ? { ...b, people: b.people.filter((x) => x !== id) }
          : { ...b, people: [...b.people, id] };
      }),
    );
  };

  const addBrief = () => {
    if (!company.trim() || !briefRole.trim()) return;
    const next: CompanyBrief = {
      id: crypto.randomUUID(),
      company: company.trim(),
      role: briefRole.trim(),
      must: [],
      people: [],
    };
    setBriefs((prev) => [next, ...prev]);
    setActiveBrief(next.id);
    setCompany("");
    setBriefRole("");
  };

  const addMust = () => {
    if (!brief || !mustInput.trim()) return;
    const value = mustInput.trim();
    setBriefs((prev) =>
      prev.map((b) => (b.id === brief.id && !b.must.includes(value) ? { ...b, must: [...b.must, value] } : b)),
    );
    setMustInput("");
  };

  const mergeJdSkillsIntoBrief = (skills: string[]) => {
    if (!brief || skills.length === 0) return;
    setBriefs((prev) =>
      prev.map((b) => {
        if (b.id !== brief.id) return b;
        const must = [...b.must];
        for (const skill of skills) {
          if (!must.some((m) => m.toLowerCase() === skill.toLowerCase())) must.push(skill);
        }
        return { ...b, must };
      }),
    );
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
              찾기 {list.length}명 · 비교 {compare.length}/{COMPARE_CAP} · 회사 건 {briefs.length}
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
              <button type="button" className="product-chip" data-on={fitOnly} onClick={() => setFitOnly((v) => !v)} disabled={!brief?.must.length}>
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
              {briefs.length === 0 ? (
                <span className="product-muted" style={{ fontSize: 12 }}>활성 건 없음 · 회사 건 탭에서 만드세요</span>
              ) : (
                <>
                  <select
                    className="product-field"
                    value={brief?.id ?? ""}
                    onChange={(e) => setActiveBrief(e.target.value)}
                    aria-label="활성 회사 건"
                    style={{ marginBottom: 0, width: "auto", minWidth: 240, height: 36, padding: "0 10px" }}
                  >
                    {briefs.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.company} · {b.role}
                      </option>
                    ))}
                  </select>
                  {brief ? (
                    <span className="product-muted" style={{ fontSize: 12 }}>
                      {brief.people.length}명
                      {brief.must.length ? ` · ${brief.must.join(" / ")}` : ""}
                    </span>
                  ) : null}
                </>
              )}
            </div>
            {list.length === 0 ? (
              <EmptyState title="맞는 사람이 없습니다">
                검색어, 직무, 또는 「이 건 조건」을 바꿔 보세요.
              </EmptyState>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, marginTop: 24, justifyItems: "center", paddingBottom: compared.length > 0 ? 88 : 0 }}>
                {list.map((c, i) => {
                  const hits = brief ? matchCount(c, brief.must) : 0;
                  const inCompare = compare.includes(c.id);
                  const inBrief = Boolean(brief?.people.includes(c.id));
                  const compareBlocked = !inCompare && compareFull;
                  const report = fitFor(c, fitResults);
                  return (
                    <div key={c.id} style={{ width: 300 }}>
                      <CandidateTile candidate={c} />
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, margin: "8px 0 6px" }}>
                        <div className="product-muted" style={{ fontSize: 12 }}>
                          {brief && brief.must.length ? `조건 ${hits}/${brief.must.length}` : c.role === "developer" ? "개발자" : "디자이너"}
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
                        <button
                          type="button"
                          className={inBrief ? "product-cta ghost" : "product-cta"}
                          style={{ flex: 1 }}
                          disabled={!brief}
                          onClick={() => toggleBriefPerson(c.id)}
                        >
                          {!brief ? "회사 건 없음" : inBrief ? "이 건에서 빼기" : `${brief.company}에 넣기`}
                        </button>
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
                    const inBrief = Boolean(brief?.people.includes(c.id));
                    const report = fitFor(c, fitResults);
                    return (
                      <article key={c.id} className="product-panel" style={{ padding: 16 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                          <div className="product-eyebrow">{c.role === "developer" ? "개발자" : "디자이너"}</div>
                          {report ? <FitScoreBadge report={report} compact /> : null}
                        </div>
                        <h2 style={{ fontSize: 20, margin: "4px 0" }}>{c.name}</h2>
                        <div className="product-muted" style={{ fontSize: 13 }}>{c.title}</div>
                        {brief && brief.must.length ? (
                          <div className="product-muted" style={{ fontSize: 12, marginTop: 8 }}>
                            {brief.company} 조건 {matchCount(c, brief.must)}/{brief.must.length}
                          </div>
                        ) : null}
                        <p style={{ fontSize: 13, lineHeight: 1.55, marginTop: 10 }}>{c.shortBio}</p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                          {c.skills.map((s) => (
                            <span key={s} className={`product-skill${overlap.includes(s) ? " hit" : ""}`}>{s}</span>
                          ))}
                        </div>
                        <button
                          type="button"
                          className={inBrief ? "product-cta ghost wide" : "product-cta wide"}
                          style={{ marginTop: 14 }}
                          disabled={!brief}
                          onClick={() => toggleBriefPerson(c.id)}
                        >
                          {!brief ? "회사 건을 먼저 만드세요" : inBrief ? `${brief.company} 건에서 빼기` : `${brief.company} 건에 넣기`}
                        </button>
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
          <div className="desk-shell" style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16, marginTop: 22 }}>
            <aside className="product-panel" style={{ padding: 14 }}>
              <div style={{ fontWeight: 650, marginBottom: 10 }}>회사 건</div>
              <input className="product-field" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="회사" />
              <input className="product-field" value={briefRole} onChange={(e) => setBriefRole(e.target.value)} placeholder="포지션 / 의뢰 한 줄" />
              <button
                type="button"
                className="product-cta wide"
                onClick={addBrief}
                disabled={!company.trim() || !briefRole.trim()}
              >
                건 만들기
              </button>
              <div style={{ marginTop: 14, display: "grid", gap: 6 }}>
                {briefs.length === 0 ? (
                  <p className="product-muted" style={{ margin: 0, fontSize: 13 }}>
                    아직 회사 건이 없습니다. 위 칸에 회사와 포지션을 적고 만드세요.
                  </p>
                ) : (
                  briefs.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setActiveBrief(b.id)}
                      className="product-panel"
                      style={{
                        textAlign: "left",
                        padding: 10,
                        background: b.id === activeBrief ? "#EEF2FF" : "#fff",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontWeight: 650, fontSize: 13 }}>{b.company}</div>
                      <div className="product-muted" style={{ fontSize: 12 }}>{b.role}</div>
                      <div className="product-muted" style={{ fontSize: 12, marginTop: 4 }}>{b.people.length}명 · 조건 {b.must.length}</div>
                    </button>
                  ))
                )}
              </div>
            </aside>
            <section className="product-panel" style={{ padding: 18 }}>
              {brief ? (
                <>
                  <div className="product-eyebrow">{brief.company}</div>
                  <h2 style={{ margin: "4px 0 8px" }}>{brief.role}</h2>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                    {brief.must.map((m) => (
                      <button
                        key={m}
                        type="button"
                        className="product-skill hit"
                        onClick={() =>
                          setBriefs((prev) =>
                            prev.map((b) => (b.id === brief.id ? { ...b, must: b.must.filter((x) => x !== m) } : b)),
                          )
                        }
                        style={{ border: 0, cursor: "pointer" }}
                      >
                        {m} ×
                      </button>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                    <input
                      className="product-field"
                      value={mustInput}
                      onChange={(e) => setMustInput(e.target.value)}
                      placeholder="필수 조건 추가"
                      style={{ marginBottom: 0 }}
                    />
                    <button type="button" className="product-cta ghost" onClick={addMust} disabled={!mustInput.trim()}>
                      조건 추가
                    </button>
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {brief.people.length === 0 ? (
                      <EmptyState title="아직 사람이 없습니다">
                        찾기에서 「{brief.company}에 넣기」를 누르면 여기로 옵니다.
                      </EmptyState>
                    ) : (
                      brief.people.map((id) => {
                        const c = people.find((p) => p.id === id);
                        if (!c) return null;
                        const inCompare = compare.includes(id);
                        const compareBlocked = !inCompare && compareFull;
                        const report = fitFor(c, fitResults);
                        return (
                          <div key={id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "10px 0", borderBottom: "1px solid #F1F5F9", alignItems: "center" }}>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ fontWeight: 650 }}>{c.name}</div>
                                {report ? <FitScoreBadge report={report} compact /> : null}
                              </div>
                              <div className="product-muted" style={{ fontSize: 12 }}>
                                {c.title} · 조건 {matchCount(c, brief.must)}/{brief.must.length} · {c.skills.slice(0, 3).join(", ")}
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                              <button
                                type="button"
                                disabled={compareBlocked}
                                title={compareBlocked ? `비교는 ${COMPARE_CAP}명까지` : undefined}
                                onClick={() => toggleCompare(id)}
                                style={{ border: 0, background: "transparent", color: compareBlocked ? "#CBD5E1" : "#64748B", cursor: compareBlocked ? "not-allowed" : "pointer", fontSize: 12 }}
                              >
                                {inCompare ? "비교에서 뺌" : compareBlocked ? "비교 가득" : "비교에 담기"}
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleBriefPerson(id)}
                                style={{ border: 0, background: "transparent", color: "#94A3B8", cursor: "pointer", fontSize: 12 }}
                              >
                                빼기
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              ) : (
                <EmptyState title="선택된 건이 없습니다">왼쪽에서 건을 만드세요.</EmptyState>
              )}
            </section>
          </div>
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
              mergeJdSkillsIntoBrief(parseSkills(jdForm.requiredSkills));
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
