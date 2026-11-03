"use client";

// 스카우트 건 만들기 — 사람인 공고와 같은 조건 항목(지역·경력·학력·고용형태·급여·마감) + 본문.
// 본문은 크롤 공고와 같은 정규화(orchestrator getJobRequirements)를 거쳐 키워드(확인할 역량)를 뽑는다.
// 흐름: 조건·본문 입력 → AI 키워드 정리(draft) → 키워드 손보기 → 공고만 등록 또는 등록하고 후보 찾기 → 승인함(/review?jd=)
// 공고만 등록해 둔 건은 아래 "등록한 스카우트 건" 목록에서 나중에 후보 찾기(JD 매칭)를 돌린다.
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Sparkles, X, ArrowRight } from "lucide-react";
import { lifeFetch } from "@/lib/lifeApi";
import { composePostingText, splitPostingText, toItems } from "@/lib/postingFormat";

const inputBase: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border-color)",
  color: "var(--text-primary)",
  fontFamily: "Pretendard Variable, sans-serif",
  padding: "10px 12px",
  borderRadius: 12,
  outline: "none",
};

const SIDO = ["서울", "경기", "인천", "부산", "대구", "광주", "대전", "울산", "세종", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"];
// 사람인 상세의 학력 표기 (orchestrator postingFacets.parseEducation 이 읽는 문자열)
const EDUCATION = ["학력무관", "고졸 이상", "초대졸(2,3년제) 이상", "대졸(4년제) 이상", "석사 이상", "박사 이상"];
const EMPLOYMENT = ["정규직", "계약직", "인턴", "파견직", "프리랜서"];
const EDU_LABEL: Record<string, string> = { any: "학력무관", high: "고졸", associate: "초대졸", bachelor: "대졸", master: "석사", doctor: "박사" };

type Career = "newcomer" | "experienced" | "both" | "any";
type Salary = "rule" | "interview" | "custom";
type Deadline = "date" | "rolling" | "until_filled";

interface Requirement {
  label: string;
  required: boolean;
}
interface CaseRequirements {
  items: Requirement[];
  role: string | null;
  legacy_role: "developer" | "designer";
  years_min: number | null;
  years_max: number | null;
  locations: string[];
  remote_ok: boolean | null;
}
interface Facets {
  career_min: number | null;
  career_max: number | null;
  newcomer_ok: boolean | null;
  education_level: string | null;
  employment_types: string[];
  region_sido: string | null;
  region_sigungu: string[];
  salary_disclosed: boolean | null;
}
interface Draft {
  title: string | null;
  requirements: CaseRequirements;
  facets: Facets | null;
  jdText: string;
  cached: boolean;
}

function careerText(kind: Career, min: string, max: string): string {
  const range = min && max ? `${min}~${max}년` : min ? `${min}년 ↑` : "";
  if (kind === "newcomer") return "신입";
  if (kind === "any") return "경력무관";
  if (kind === "both") return range ? `신입·경력 ${range}` : "신입·경력";
  return range ? `경력 ${range}` : "경력";
}

const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
    {children}
  </label>
);

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className="text-xs px-3 py-2 rounded-xl font-semibold"
      style={{
        border: `1px solid ${on ? "rgba(var(--accent-rgb), 0.45)" : "var(--border-color)"}`,
        background: on ? "rgba(var(--accent-rgb), 0.1)" : "var(--surface)",
        color: on ? "var(--accent)" : "var(--text-secondary)",
      }}
    >
      {children}
    </button>
  );
}

export function ScoutCaseForm() {
  const [title, setTitle] = useState("");
  const [client, setClient] = useState("");
  const [sido, setSido] = useState("서울");
  const [sigungu, setSigungu] = useState("");
  const [career, setCareer] = useState<Career>("experienced");
  const [yMin, setYMin] = useState("");
  const [yMax, setYMax] = useState("");
  const [education, setEducation] = useState("학력무관");
  const [employment, setEmployment] = useState<string[]>(["정규직"]);
  const [salary, setSalary] = useState<Salary>("rule");
  const [salaryCustom, setSalaryCustom] = useState("");
  const [deadlineKind, setDeadlineKind] = useState<Deadline>("date");
  const [deadline, setDeadline] = useState("");
  const [workHours, setWorkHours] = useState("");
  // 본문 = 표준 양식 3칸 (크롤 공고와 같은 주요업무·자격요건·우대사항)
  const [duties, setDuties] = useState("");
  const [must, setMust] = useState("");
  const [nice, setNice] = useState("");
  const [paste, setPaste] = useState("");
  const body = composePostingText({ summary: null, key_duties: toItems(duties), must_have: toItems(must), nice_to_have: toItems(nice) });

  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState<"draft" | "create" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState<{ jdHash: string; queued: number; matched: number } | null>(null);
  const [saved, setSaved] = useState(false);
  const [listKey, setListKey] = useState(0); // 등록 후 목록 새로고침
  const [newKeyword, setNewKeyword] = useState("");

  const posting = {
    location_text: sido ? `${sido}${sigungu.trim() ? ` ${sigungu.trim()}` : ""}` : null,
    career_text: careerText(career, yMin, yMax),
    education_text: education,
    employment_type_text: employment.join(", ") || null,
    salary_text: salary === "rule" ? "회사내규에 따름" : salary === "interview" ? "면접 후 결정" : salaryCustom.trim() || null,
    deadline_text: deadlineKind === "rolling" ? "상시채용" : deadlineKind === "until_filled" ? "채용시 마감" : null,
    work_hours_text: workHours.trim() || null,
  };

  // 사람인 공고를 통째로 붙여넣으면 3칸으로 나눈다
  function splitPaste() {
    const s = splitPostingText(paste);
    setDuties([...(s.summary ? [s.summary] : []), ...s.key_duties].join("\n"));
    setMust(s.must_have.join("\n"));
    setNice(s.nice_to_have.join("\n"));
    setPaste("");
    setDraft(null);
    setStarted(null);
    setSaved(false);
  }
  const deadlineDate = deadlineKind === "date" && deadline ? deadline : null;

  // 조건이나 본문을 바꾸면 이전 키워드 정리는 무효
  const edit = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setDraft(null);
    setStarted(null);
    setSaved(false);
  };

  async function runDraft() {
    if (body.trim().length < 20 || busy) return;
    setBusy("draft");
    setError(null);
    try {
      const d = await lifeFetch<Draft>("/api/scout-cases/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jdText: body, posting, title: title.trim() || undefined, deadline: deadlineDate }),
      });
      setDraft(d);
      if (!title.trim() && d.title) setTitle(d.title);
    } catch (err) {
      setError(err instanceof Error ? err.message : "키워드를 정리하지 못했습니다.");
    } finally {
      setBusy(null);
    }
  }

  function setItems(items: Requirement[]) {
    setDraft((d) => (d ? { ...d, requirements: { ...d.requirements, items } } : d));
  }

  async function createCase(start: boolean) {
    if (!draft || draft.requirements.items.length === 0 || busy) return;
    setBusy("create");
    setError(null);
    try {
      const { case: c } = await lifeFetch<{ case: { id: string; jdHash: string } }>("/api/scout-cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jdText: body,
          posting,
          title: title.trim() || null,
          clientName: client.trim() || null,
          deadline: deadlineDate,
          requirements: draft.requirements,
        }),
      });
      setSaved(true);
      setListKey((k) => k + 1);
      if (start) {
        const s = await startScout(c.id);
        setStarted({ jdHash: c.jdHash, queued: s.queued, matched: s.matched });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "스카우트 건을 만들지 못했습니다.");
    } finally {
      setBusy(null);
    }
  }

  const f = draft?.facets;
  const facetLine = f
    ? [
        f.region_sigungu.join(", ") || f.region_sido,
        f.newcomer_ok && f.career_min === 0 && f.career_max === 0
          ? "신입"
          : f.career_min != null
            ? `경력 ${f.career_min}${f.career_max != null ? `~${f.career_max}` : "+"}년${f.newcomer_ok ? " (신입 가능)" : ""}`
            : null,
        f.education_level ? EDU_LABEL[f.education_level] : null,
        f.employment_types.join("·") || null,
        f.salary_disclosed === false ? "급여 비공개" : f.salary_disclosed ? "급여 공개" : null,
      ].filter(Boolean)
    : [];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>공고 제목</Label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 백엔드 개발자 (Java/Spring)" className="w-full text-sm" style={inputBase} />
        </div>
        <div>
          <Label>고객사 (선택)</Label>
          <input value={client} onChange={(e) => setClient(e.target.value)} placeholder="비공개면 비워 두세요" className="w-full text-sm" style={inputBase} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>지역</Label>
          <div className="flex gap-2">
            <select value={sido} onChange={(e) => edit(setSido)(e.target.value)} className="text-sm" style={inputBase} aria-label="시·도">
              {SIDO.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <input value={sigungu} onChange={(e) => edit(setSigungu)(e.target.value)} placeholder="시·군·구 (예: 강남구)" className="flex-1 min-w-0 text-sm" style={inputBase} aria-label="시·군·구" />
          </div>
        </div>
        <div>
          <Label>학력</Label>
          <select value={education} onChange={(e) => edit(setEducation)(e.target.value)} className="w-full text-sm" style={inputBase}>
            {EDUCATION.map((x) => (
              <option key={x} value={x}>{x}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <Label>경력</Label>
        <div className="flex flex-wrap items-center gap-2">
          {([["newcomer", "신입"], ["experienced", "경력"], ["both", "신입·경력"], ["any", "경력무관"]] as const).map(([k, l]) => (
            <Chip key={k} on={career === k} onClick={() => edit(setCareer)(k)}>{l}</Chip>
          ))}
          {(career === "experienced" || career === "both") && (
            <span className="flex items-center gap-1.5 text-sm" style={{ color: "var(--text-secondary)" }}>
              <input type="number" min={0} max={40} value={yMin} onChange={(e) => edit(setYMin)(e.target.value)} placeholder="최소" className="w-20 text-sm" style={inputBase} aria-label="최소 경력(년)" />
              ~
              <input type="number" min={0} max={40} value={yMax} onChange={(e) => edit(setYMax)(e.target.value)} placeholder="최대" className="w-20 text-sm" style={inputBase} aria-label="최대 경력(년)" />
              년
            </span>
          )}
        </div>
      </div>

      <div>
        <Label>고용형태</Label>
        <div className="flex flex-wrap gap-2">
          {EMPLOYMENT.map((x) => (
            <Chip key={x} on={employment.includes(x)} onClick={() => edit(setEmployment)(employment.includes(x) ? employment.filter((e) => e !== x) : [...employment, x])}>
              {x}
            </Chip>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>급여</Label>
          <div className="flex gap-2">
            <select value={salary} onChange={(e) => edit(setSalary)(e.target.value as Salary)} className="text-sm" style={inputBase}>
              <option value="rule">회사내규에 따름</option>
              <option value="interview">면접 후 결정</option>
              <option value="custom">직접 입력</option>
            </select>
            {salary === "custom" && (
              <input value={salaryCustom} onChange={(e) => edit(setSalaryCustom)(e.target.value)} placeholder="예: 연봉 5,000만원 이상" className="flex-1 min-w-0 text-sm" style={inputBase} />
            )}
          </div>
        </div>
        <div>
          <Label>마감</Label>
          <div className="flex gap-2">
            <select value={deadlineKind} onChange={(e) => edit(setDeadlineKind)(e.target.value as Deadline)} className="text-sm" style={inputBase}>
              <option value="date">마감일</option>
              <option value="rolling">상시채용</option>
              <option value="until_filled">채용시 마감</option>
            </select>
            {deadlineKind === "date" && (
              <input type="date" value={deadline} onChange={(e) => edit(setDeadline)(e.target.value)} className="flex-1 min-w-0 text-sm" style={inputBase} aria-label="마감일" />
            )}
          </div>
        </div>
      </div>

      <div>
        <Label>근무시간 (선택)</Label>
        <input value={workHours} onChange={(e) => edit(setWorkHours)(e.target.value)} placeholder="예: 주 5일(월~금) 10:00~19:00" className="w-full text-sm" style={inputBase} />
      </div>

      <div>
        <Label>사람인 공고 붙여넣기 (선택)</Label>
        <div className="flex gap-2">
          <textarea
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            rows={2}
            placeholder="공고 본문을 통째로 붙여넣고 「칸 나누기」를 누르면 아래 세 칸으로 나눠 드려요."
            className="flex-1 min-w-0 text-sm resize-y"
            style={inputBase}
          />
          <button type="button" onClick={splitPaste} disabled={!paste.trim()} className="text-xs px-3 rounded-xl font-semibold disabled:opacity-40 shrink-0" style={{ border: "1px solid var(--border-color)", color: "var(--text-primary)" }}>
            칸 나누기
          </button>
        </div>
      </div>

      {([
        ["주요업무", duties, setDuties, "- 주문·결제 API 설계 및 구현"],
        ["자격요건", must, setMust, "- Java, Spring Boot 실무 3년 이상"],
        ["우대사항", nice, setNice, "- Kafka, Redis 운영 경험"],
      ] as const).map(([label, value, set, ph]) => (
        <div key={label}>
          <Label>{label} (한 줄에 하나)</Label>
          <textarea value={value} onChange={(e) => edit(set)(e.target.value)} rows={3} placeholder={ph} className="w-full text-sm resize-y" style={inputBase} />
        </div>
      ))}

      <div className="flex items-center justify-between gap-3">
        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
          크롤링한 사람인 공고와 같은 양식·같은 정규화로 키워드를 뽑아요.
        </span>
        <button
          type="button"
          onClick={runDraft}
          disabled={body.trim().length < 20 || busy !== null}
          className="btn-brand btn-brand--shadow-btn flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40"
          style={{ color: "white", fontFamily: "Pretendard Variable, sans-serif" }}
        >
          {busy === "draft" ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
          AI 키워드 정리
        </button>
      </div>

      {draft && (
        <div className="rounded-xl p-4 space-y-3" style={{ border: "1px solid var(--border-color)", background: "var(--surface)" }}>
          <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
            직무 {draft.requirements.role ?? "미분류"}
            {facetLine.length > 0 && ` · ${facetLine.join(" · ")}`}
            {draft.cached && " · 저장된 정리 결과"}
          </div>
          <div className="flex flex-wrap gap-2">
            {draft.requirements.items.map((it, i) => (
              <span
                key={it.label}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg"
                style={{
                  border: `1px solid ${it.required ? "rgba(var(--accent-rgb), 0.45)" : "var(--border-color)"}`,
                  color: it.required ? "var(--accent)" : "var(--text-secondary)",
                }}
              >
                <button
                  type="button"
                  title="필수/우대 바꾸기"
                  onClick={() => setItems(draft.requirements.items.map((x, j) => (j === i ? { ...x, required: !x.required } : x)))}
                >
                  {it.required ? "필수" : "우대"} · {it.label}
                </button>
                <button type="button" aria-label={`${it.label} 빼기`} onClick={() => setItems(draft.requirements.items.filter((_, j) => j !== i))}>
                  <X size={12} />
                </button>
              </span>
            ))}
            <input
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter" || !newKeyword.trim()) return;
                e.preventDefault();
                if (!draft.requirements.items.some((x) => x.label.toLowerCase() === newKeyword.trim().toLowerCase()))
                  setItems([...draft.requirements.items, { label: newKeyword.trim(), required: false }]);
                setNewKeyword("");
              }}
              placeholder="+ 키워드 추가 (Enter)"
              className="text-xs w-40"
              style={{ ...inputBase, padding: "6px 10px" }}
            />
          </div>
          <div className="flex items-center justify-between gap-3 pt-1">
            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
              키워드를 눌러 필수/우대를 바꿀 수 있어요. 학력은 공고 조건으로만 쓰고 후보 거르기엔 쓰지 않아요.
            </span>
            <span className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => void createCase(false)}
                disabled={draft.requirements.items.length === 0 || busy !== null || saved}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40"
                style={{ border: "1px solid var(--border-color)", color: "var(--text-primary)", fontFamily: "Pretendard Variable, sans-serif" }}
              >
                공고만 등록
              </button>
              <button
                type="button"
                onClick={() => void createCase(true)}
                disabled={draft.requirements.items.length === 0 || busy !== null || started !== null}
                className="btn-brand btn-brand--shadow-btn flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40"
                style={{ color: "white", fontFamily: "Pretendard Variable, sans-serif" }}
              >
                {busy === "create" ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
                {saved ? "후보 찾기" : "등록하고 후보 찾기"}
              </button>
            </span>
          </div>
        </div>
      )}

      {started && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm" style={{ background: "rgba(var(--ok-rgb), 0.08)", border: "1px solid rgba(var(--ok-rgb), 0.3)", color: "var(--ok)" }}>
          <span>
            {started.queued > 0
              ? `조건에 맞는 후보 ${started.matched}명 중 ${started.queued}명 분석을 시작했어요. 끝나면 승인함에 쌓여요.`
              : "새로 분석할 후보가 없어요. 조건이나 키워드를 넓혀 보세요."}
          </span>
          <Link href={`/review?jd=${encodeURIComponent(started.jdHash)}`} className="font-semibold shrink-0">
            승인함 보기 →
          </Link>
        </div>
      )}
      {saved && !started && (
        <p className="text-sm" style={{ color: "var(--ok)" }}>공고를 등록했어요. 구직자 공고 목록에도 올라가고, 아래 목록에서 언제든 후보 찾기를 돌릴 수 있어요.</p>
      )}
      {error && (
        <p className="text-sm" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
      <ScoutCaseList key={listKey} />
    </div>
  );
}

function startScout(id: string) {
  return lifeFetch<{ queued: number; matched: number }>(`/api/scout-cases/${encodeURIComponent(id)}/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
}

interface CaseSummary {
  id: string;
  jdHash: string;
  title: string;
  status: string;
  deadline: string | null;
  clientName: string | null;
  counts: { matched: number; analyzed: number; pending: number; approved: number };
}

/** 등록한 스카우트 건 — 공고만 올려 둔 건(draft)도 여기서 나중에 후보 찾기를 돌린다 */
function ScoutCaseList() {
  const [cases, setCases] = useState<CaseSummary[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [note, setNote] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    lifeFetch<{ cases: CaseSummary[] }>("/api/scout-cases")
      .then((r) => setCases(r.cases))
      .catch(() => setCases([]));
  }, []);
  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  async function run(c: CaseSummary) {
    setBusyId(c.id);
    try {
      const s = await startScout(c.id);
      setNote((n) => ({ ...n, [c.id]: s.queued > 0 ? `${s.queued}명 분석 시작` : "새로 분석할 후보 없음" }));
      load();
    } catch (err) {
      setNote((n) => ({ ...n, [c.id]: err instanceof Error ? err.message : "시작 실패" }));
    } finally {
      setBusyId(null);
    }
  }

  async function toggleClose(c: CaseSummary) {
    const reopen = c.status === "closed";
    if (!reopen && !window.confirm(`「${c.title}」 건을 종료할까요? 구직자 공고 목록에서도 내려갑니다. 나중에 다시 열 수 있어요.`)) return;
    setBusyId(c.id);
    try {
      await lifeFetch(`/api/scout-cases/${encodeURIComponent(c.id)}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reopen }),
      });
      setNote((n) => ({ ...n, [c.id]: reopen ? "다시 열었어요" : "종료했어요" }));
      load();
    } catch (err) {
      setNote((n) => ({ ...n, [c.id]: err instanceof Error ? err.message : "상태 변경 실패" }));
    } finally {
      setBusyId(null);
    }
  }

  if (!cases || cases.length === 0) return null;
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border-color)" }}>
      <div className="px-4 py-2.5 text-xs font-semibold" style={{ background: "var(--surface)", color: "var(--text-secondary)" }}>
        등록한 스카우트 건 {cases.length}
      </div>
      {cases.map((c) => (
        <div key={c.id} className="flex items-center gap-3 px-4 py-3" style={{ borderTop: "1px solid var(--border-color)", background: "var(--surface)" }}>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
              {c.title}
              {c.clientName && <span style={{ color: "var(--text-secondary)" }}> · {c.clientName}</span>}
            </div>
            <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
              {c.status === "draft" ? "공고만 등록됨" : c.status === "closed" ? "종료" : `분석 ${c.counts.analyzed}/${c.counts.matched} · 대기 ${c.counts.pending} · 승인 ${c.counts.approved}`}
              {c.deadline && ` · ~${c.deadline.slice(5).replace("-", ".")}`}
              {note[c.id] && ` · ${note[c.id]}`}
            </div>
          </div>
          {c.status !== "closed" && (
            <button
              type="button"
              onClick={() => void run(c)}
              disabled={busyId !== null}
              className="text-xs px-3 py-2 rounded-xl font-semibold disabled:opacity-40 shrink-0"
              style={{ border: "1px solid rgba(var(--accent-rgb), 0.45)", color: "var(--accent)" }}
            >
              {busyId === c.id ? "시작 중…" : c.status === "draft" ? "후보 찾기" : "더 찾기"}
            </button>
          )}
          <button
            type="button"
            onClick={() => void toggleClose(c)}
            disabled={busyId !== null}
            className="text-xs font-semibold shrink-0 disabled:opacity-40"
            style={{ color: "var(--text-secondary)" }}
          >
            {c.status === "closed" ? "다시 열기" : "종료"}
          </button>
          {c.counts.matched > 0 && (
            <Link href={`/review?jd=${encodeURIComponent(c.jdHash)}`} className="text-xs font-semibold shrink-0" style={{ color: "var(--text-secondary)" }}>
              승인함 →
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
