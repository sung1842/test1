"use client";

import { useCallback, useEffect, useState } from "react";
import { getConsents, getExcludedAll, grantConsents, lifeApi, type ConsentPurpose } from "@/lib/lifeApi";
import {
  DEGREE_LABEL, EDU_STATUS_LABEL, EMPLOYMENT_OPTIONS, MISC_LABEL, REGIONS, SEARCH_STATUS_LABEL,
  deleteItem, fmtYm, loadCategories, loadResume, saveBasics, saveItem,
  type ResumeBasics, type ResumeTable, type Visibility,
} from "./studioData";

type FieldType = "text" | "textarea" | "date" | "select" | "checkbox";
interface FieldDef { key: string; label: string; type: FieldType; options?: Record<string, string>; required?: boolean }
type Row = Record<string, unknown> & { id?: string; visibility?: Visibility };
interface SectionDef {
  table: ResumeTable;
  title: string;
  addLabel: string;
  fixed?: Record<string, string>;
  fields: FieldDef[];
  time: (r: Row) => string;
  head: (r: Row) => string;
  body: (r: Row) => string | null;
  warn?: (r: Row) => string | null;
}

const str = (v: unknown) => (typeof v === "string" && v ? v : null);

const SECTIONS: SectionDef[] = [
  {
    table: "resume_experiences", title: "경력", addLabel: "+ 경력 추가",
    fields: [
      { key: "company", label: "회사", type: "text", required: true },
      { key: "department", label: "부서", type: "text" },
      { key: "position_title", label: "직급·직책", type: "text" },
      { key: "employment_type", label: "고용형태", type: "select", options: Object.fromEntries(EMPLOYMENT_OPTIONS.map((e) => [e, e])) },
      { key: "start_on", label: "입사", type: "date", required: true },
      { key: "end_on", label: "퇴사", type: "date" },
      { key: "is_current", label: "재직 중", type: "checkbox" },
      { key: "duties", label: "담당 업무", type: "textarea" },
      { key: "achievements", label: "성과", type: "textarea" },
    ],
    time: (r) => `${fmtYm(str(r.start_on))} — ${r.is_current ? "현재" : fmtYm(str(r.end_on))}`,
    head: (r) => [r.company, r.position_title].filter(Boolean).join(" · "),
    body: (r) => [str(r.duties), str(r.achievements) && `성과 · ${r.achievements}`].filter(Boolean).join("\n") || null,
  },
  {
    table: "resume_educations", title: "학력", addLabel: "+ 학력 추가",
    fields: [
      { key: "school", label: "학교", type: "text", required: true },
      { key: "major", label: "전공", type: "text" },
      { key: "degree", label: "학위", type: "select", options: DEGREE_LABEL },
      { key: "status", label: "상태", type: "select", options: EDU_STATUS_LABEL },
      { key: "start_on", label: "입학", type: "date" },
      { key: "end_on", label: "졸업", type: "date" },
      { key: "gpa", label: "학점 (선택)", type: "text" },
    ],
    time: (r) => fmtYm(str(r.end_on)).slice(0, 4),
    head: (r) => `${r.school}${r.major ? ` ${r.major}` : ""} ${EDU_STATUS_LABEL[r.status as keyof typeof EDU_STATUS_LABEL] ?? ""}`,
    body: (r) => [DEGREE_LABEL[r.degree as keyof typeof DEGREE_LABEL], str(r.gpa) && `학점 ${r.gpa}`].filter(Boolean).join(" · ") || null,
  },
  {
    table: "resume_certifications", title: "자격", addLabel: "+ 자격증 추가", fixed: { kind: "license" },
    fields: [
      { key: "name", label: "자격명", type: "text", required: true },
      { key: "issuer", label: "발행처", type: "text" },
      { key: "acquired_on", label: "취득일", type: "date" },
    ],
    time: (r) => fmtYm(str(r.acquired_on)).slice(0, 4),
    head: (r) => String(r.name ?? ""),
    body: (r) => str(r.issuer), // 증빙은 받지 않는다 — 확인은 면접·입사 서류 단계에서
  },
  {
    table: "resume_certifications", title: "어학", addLabel: "+ 어학 추가", fixed: { kind: "language" },
    fields: [
      { key: "name", label: "시험", type: "text", required: true },
      { key: "score", label: "점수·등급", type: "text" },
      { key: "acquired_on", label: "응시일", type: "date" },
    ],
    time: (r) => fmtYm(str(r.acquired_on)),
    head: (r) => `${r.name} ${r.score ?? ""}`,
    body: () => null,
  },
  {
    table: "resume_misc", title: "프로젝트 · 수상 · 교육 · 활동", addLabel: "+ 항목 추가",
    fields: [
      { key: "kind", label: "종류", type: "select", options: MISC_LABEL, required: true },
      { key: "title", label: "이름", type: "text", required: true },
      { key: "org", label: "기관·회사", type: "text" },
      { key: "start_on", label: "시작", type: "date" },
      { key: "end_on", label: "끝", type: "date" },
      { key: "description", label: "내용", type: "textarea" },
      { key: "url", label: "링크", type: "text" },
    ],
    time: (r) => fmtYm(str(r.start_on)),
    head: (r) => `[${MISC_LABEL[r.kind as keyof typeof MISC_LABEL] ?? ""}] ${r.title}${r.org ? ` · ${r.org}` : ""}`,
    body: (r) => str(r.description),
  },
];

const PUBLIC_KEYS = ["headline", "region_sido", "desired_categories", "desired_regions", "desired_employment_types", "job_search_status"];

export function StudioProfile({ userId, name, preview, onChange }: { userId: string; name: string; preview: boolean; onChange: () => void }) {
  const [b, setB] = useState<Partial<ResumeBasics>>({});
  const [rows, setRows] = useState<Record<string, Row[]>>({});
  const [cats, setCats] = useState<{ code: string; name: string }[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await loadResume(userId);
    setB(r.basics ?? { public_fields: PUBLIC_KEYS, desired_categories: [], desired_regions: [], desired_employment_types: [], job_search_status: "open" });
    setRows({
      resume_experiences: r.experiences as unknown as Row[],
      resume_educations: r.educations as unknown as Row[],
      resume_certifications: r.certifications as unknown as Row[],
      resume_misc: r.misc as unknown as Row[],
    });
  }, [userId]);

  useEffect(() => {
    load().catch((e) => setMsg(String(e instanceof Error ? e.message : e)));
    loadCategories().then(setCats).catch(() => undefined);
  }, [load]);

  const isPub = (k: string) => (b.public_fields ?? []).includes(k);
  const set = <K extends keyof ResumeBasics>(k: K, v: ResumeBasics[K]) => setB((x) => ({ ...x, [k]: v }));
  const togglePub = (k: string) => setB((x) => ({ ...x, public_fields: isPub(k) ? (x.public_fields ?? []).filter((y) => y !== k) : [...(x.public_fields ?? []), k] }));
  const toggleIn = (k: "desired_categories" | "desired_regions" | "desired_employment_types", v: string) =>
    setB((x) => { const cur = (x[k] as string[]) ?? []; return { ...x, [k]: cur.includes(v) ? cur.filter((y) => y !== v) : [...cur, v] }; });

  async function saveBasicsNow() {
    try {
      const { user_id: _u, ...rest } = b as ResumeBasics;
      void _u;
      setB(await saveBasics(userId, rest));
      setMsg("기본 정보를 저장했어요.");
      onChange();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  }

  /** 한 줄: 라벨 | (입력 + 공개 표시). 기업 미리보기에서는 비공개 줄을 숨긴다 */
  const row = (label: string, input: React.ReactNode, visKey?: string, fixedNote?: string, warn?: boolean) => {
    if (preview && (fixedNote || (visKey && !isPub(visKey)))) return null;
    return (
      <div className="row">
        <label>{label}</label>
        <div className="vis">
          {input}
          {fixedNote ? <small>{fixedNote}</small>
            : visKey && !preview ? (
              <button className="link" style={{ fontSize: 12, color: isPub(visKey) ? "var(--green)" : "var(--mute)", whiteSpace: "nowrap" }} onClick={() => togglePub(visKey)}>
                {isPub(visKey) ? "공개" : "비공개"}
              </button>
            ) : null}
          {warn && !preview && <small style={{ color: "#C27A12" }}>비어 있음</small>}
        </div>
      </div>
    );
  };
  const chips = (k: "desired_categories" | "desired_regions" | "desired_employment_types", opts: [string, string][]) => (
    <div className="filters" style={{ flexWrap: "wrap" }}>
      {opts.filter(([v]) => !preview || ((b[k] as string[]) ?? []).includes(v)).map(([v, l]) => (
        <button key={v} className="chip" data-on={((b[k] as string[]) ?? []).includes(v)} disabled={preview} onClick={() => toggleIn(k, v)}>{l}</button>
      ))}
    </div>
  );

  return (
    <section className="view on">
      <div className="head">
        <div>
          <p className="eyebrow">프로필</p>
          <h1>기본 정보와 경력</h1>
          <p className="lede">항목마다 기업에게 보일지 정할 수 있어요. 연락처는 기본으로 숨겨 둬요.</p>
        </div>
        <button className="btn edit-only" onClick={() => window.print()}>PDF로 내보내기</button>
      </div>
      {msg && <p className="note" role="status">{msg}</p>}

      <p className="sec-t" style={{ marginTop: 0 }}>기본 정보</p>
      <div className="card form-card">
        {row("이름", <input className="field" value={name} disabled />, undefined, "공개 · 계정 이름")}
        {row("한 줄 소개", <input className="field" maxLength={120} disabled={preview} value={b.headline ?? ""} onChange={(e) => set("headline", e.target.value)} />, "headline", undefined, !b.headline)}
        {row("이메일", <input className="field" type="email" value={b.email ?? ""} onChange={(e) => set("email", e.target.value)} />, undefined, "연락 수락 후 공개")}
        {row("연락처", <input className="field" value={b.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />, undefined, "연락 수락 후 공개")}
        {row("출생 연도", <input className="field" type="number" min={1940} max={2015} value={b.birth_year ?? ""} onChange={(e) => set("birth_year", e.target.value ? Number(e.target.value) : null)} />, undefined, "비공개")}
        {row("거주 지역", (
          <span style={{ display: "flex", gap: 8, width: "100%", maxWidth: 420 }}>
            <select className="field" disabled={preview} value={b.region_sido ?? ""} onChange={(e) => set("region_sido", e.target.value || null)}>
              <option value="">시·도</option>{REGIONS.map((r) => <option key={r}>{r}</option>)}
            </select>
            {!preview && <input className="field" placeholder="시·군·구" value={b.region_sigungu ?? ""} onChange={(e) => set("region_sigungu", e.target.value)} />}
          </span>
        ), "region_sido", undefined, !b.region_sido)}
        {row("희망 직군", chips("desired_categories", cats.map((c) => [c.code, c.name])), "desired_categories", undefined, !(b.desired_categories ?? []).length)}
        {row("희망 근무 지역", chips("desired_regions", REGIONS.map((r) => [r, r])), "desired_regions", undefined, !(b.desired_regions ?? []).length)}
        {row("희망 고용형태", chips("desired_employment_types", EMPLOYMENT_OPTIONS.map((r) => [r, r])), "desired_employment_types")}
        {row("희망 연봉", <input className="field" maxLength={60} value={b.desired_salary_text ?? ""} onChange={(e) => set("desired_salary_text", e.target.value)} />, undefined, "비공개")}
        {row("입사 가능일", <input className="field" type="date" value={b.available_from ?? ""} onChange={(e) => set("available_from", e.target.value || null)} />, undefined, "비공개")}
        {row("병역", (
          <select className="field" value={b.military_status ?? ""} onChange={(e) => set("military_status", e.target.value || null)}>
            <option value="">선택 안 함</option><option value="served">군필</option><option value="exempt">면제</option><option value="serving">복무 중</option><option value="not_applicable">해당 없음</option>
          </select>
        ), undefined, "비공개")}
        {row("구직 상태", (
          <select className="field" disabled={preview} value={b.job_search_status ?? "open"} onChange={(e) => set("job_search_status", e.target.value as ResumeBasics["job_search_status"])}>
            {Object.entries(SEARCH_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        ), "job_search_status")}
        {!preview && <div className="row"><span /><div><button className="btn pri" onClick={() => void saveBasicsNow()}>기본 정보 저장</button></div></div>}
      </div>

      {SECTIONS.map((s) => (
        <ItemSection key={s.title} def={s} userId={userId} preview={preview}
          rows={(rows[s.table] ?? []).filter((r) => !s.fixed || Object.entries(s.fixed).every(([k, v]) => r[k] === v))}
          onSaved={() => { void load(); onChange(); }} />
      ))}

      <div className="edit-only"><Consents /></div>
    </section>
  );
}

function ItemSection({ def, userId, preview, rows, onSaved }: { def: SectionDef; userId: string; preview: boolean; rows: Row[]; onSaved: () => void }) {
  const [editing, setEditing] = useState<Row | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const shown = preview ? rows.filter((r) => r.visibility === "public") : rows;
  if (preview && shown.length === 0) return null;

  async function save() {
    if (!editing) return;
    const missing = def.fields.find((f) => f.required && !editing[f.key]);
    if (missing) return setErr(`${missing.label}을(를) 입력하세요.`);
    const r: Row = { visibility: "public", ...def.fixed, ...editing };
    for (const f of def.fields) if (r[f.key] === "") r[f.key] = null;
    try {
      await saveItem(def.table, userId, r);
      setEditing(null);
      setErr(null);
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <>
      <p className="sec-t">{def.title} {!preview && <button className="link edit-only" onClick={() => setEditing({})}>{def.addLabel}</button>}</p>
      <ul className="card career">
        {shown.map((r) => (
          <li key={r.id}>
            <time>{def.time(r)}</time>
            <div>
              <strong>{def.head(r)}</strong>
              {def.body(r) && <p style={{ whiteSpace: "pre-line" }}>{def.body(r)}</p>}
              {def.warn?.(r) && !preview && <p style={{ color: "#C27A12" }}>{def.warn(r)}</p>}
            </div>
            {preview ? <span /> : (
              <span className="edit-only" style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <button className="vis-tg" aria-pressed={r.visibility === "public"}
                  onClick={async () => { await saveItem(def.table, userId, { ...r, visibility: r.visibility === "public" ? "private" : "public" }); onSaved(); }}>
                  <span className="sw" /><span>{r.visibility === "public" ? "공개" : "비공개"}</span>
                </button>
                <button className="link" onClick={() => setEditing(r)}>편집</button>
                <button className="link" onClick={async () => { if (r.id && confirm("이 항목을 지울까요?")) { await deleteItem(def.table, r.id); onSaved(); } }}>삭제</button>
              </span>
            )}
          </li>
        ))}
        {shown.length === 0 && !editing && <li><time /><div><p>아직 없어요.</p></div><span /></li>}
      </ul>
      {editing && !preview && (
        <div className="card form-card" style={{ marginTop: 10 }}>
          {def.fields.map((f) => (
            <div className="row" key={f.key}>
              <label>{f.label}{f.required ? " *" : ""}</label>
              {f.type === "textarea" ? (
                <textarea className="field" style={{ height: 80, padding: 10 }} value={String(editing[f.key] ?? "")} onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })} />
              ) : f.type === "select" ? (
                <select className="field" value={String(editing[f.key] ?? "")} onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })}>
                  <option value="">선택</option>
                  {Object.entries(f.options ?? {}).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              ) : f.type === "checkbox" ? (
                <input type="checkbox" checked={!!editing[f.key]} onChange={(e) => setEditing({ ...editing, [f.key]: e.target.checked })} />
              ) : (
                <input className="field" type={f.type} value={String(editing[f.key] ?? "").slice(0, f.type === "date" ? 10 : undefined)} onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })} />
              )}
            </div>
          ))}
          <div className="row"><span />
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button className="btn pri" onClick={() => void save()}>저장</button>
              <button className="btn" onClick={() => { setEditing(null); setErr(null); }}>취소</button>
              {err && <small style={{ color: "#B23B3B" }}>{err}</small>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** 목업 "동의와 내 데이터": self_ai·matching 동의 + 공고 추천 받기(전체 매칭 제외의 반대) */
function Consents() {
  const [c, setC] = useState<Record<ConsentPurpose, boolean>>({ self_ai: false, matching: false });
  const [recs, setRecs] = useState(true);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setC(await getConsents());
    setRecs(!(await getExcludedAll()));
  }, []);
  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  async function toggle(p: ConsentPurpose) {
    setBusy(true);
    try {
      if (c[p]) await lifeApi.revokeConsent(p);
      else await grantConsents([p]);
      await load();
    } finally {
      setBusy(false);
    }
  }
  async function toggleRecs() {
    setBusy(true);
    try {
      if (recs) await lifeApi.addExclusion(null);
      else await lifeApi.removeExclusion(null);
      await load();
    } finally {
      setBusy(false);
    }
  }
  const tg = (on: boolean, fn: () => void) => (
    <button className="vis-tg" aria-pressed={on} disabled={busy} onClick={fn}><span className="sw" /><span>{on ? "동의함" : "동의 안 함"}</span></button>
  );
  return (
    <>
      <p className="sec-t">동의와 내 데이터 <span>언제든 바꿀 수 있어요</span></p>
      <ul className="card cons">
        <li><div><strong>AI 기록 정리 <small style={{ color: "var(--mute)", fontWeight: 400 }}>self_ai</small></strong><p>내 답을 칸별로 나누고 맞춤법을 다듬는 데만 써요. 끄면 AI 버튼이 꺼지고 원문은 남아요.</p></div>{tg(c.self_ai, () => void toggle("self_ai"))}</li>
        <li><div><strong>기업 매칭 노출 <small style={{ color: "var(--mute)", fontWeight: 400 }}>matching</small></strong><p>공개 카드·이력서·기본 자기소개서를 기업 검색·추천·공고 분석에 써요. 철회하면 모두 빠져요.</p></div>{tg(c.matching, () => void toggle("matching"))}</li>
        <li><div><strong>공고 추천 받기</strong><p>공개 카드를 근거로 공고를 추천받아요. 끄면 모든 공고 매칭에서 빠져요.</p></div>{tg(recs, () => void toggleRecs())}</li>
      </ul>
    </>
  );
}
