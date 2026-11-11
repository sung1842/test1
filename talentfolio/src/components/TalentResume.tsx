"use client";

/**
 * 후보 프로필(/talent/[id])의 이력서 영역. 구직자 스튜디오 "기업에게 보이는 화면"과 같은 범위(공개로 둔 것만)를 보여 준다.
 * 이력서 표는 본인만 읽을 수 있어 orchestrator(GET /api/candidates/:id/public-resume, 기업 계정 전용)를 거친다.
 * 기업 계정이 아니면 아무것도 그리지 않는다.
 */
import { useEffect, useState } from "react";
import { lifeFetch } from "@/lib/lifeApi";
import { DEGREE_LABEL, EDU_STATUS_LABEL, MISC_LABEL, SEARCH_STATUS_LABEL, fmtYm } from "@/components/studio/studioData";

type Row = Record<string, unknown>;
interface PublicResume { basics: Row; experiences: Row[]; educations: Row[]; certifications: Row[]; misc: Row[] }

const s = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);
const list = (v: unknown) => (Array.isArray(v) ? (v as string[]).filter(Boolean) : []);
const MILITARY: Record<string, string> = { served: "군필", exempt: "면제", serving: "복무 중", not_applicable: "해당 없음" };

interface Item { key: string; time: string; head: string; body: string | null }

export default function TalentResume({ userId }: { userId: string }) {
  const [r, setR] = useState<PublicResume | null>(null);

  useEffect(() => {
    let alive = true;
    lifeFetch<PublicResume>(`/api/candidates/${encodeURIComponent(userId)}/public-resume`)
      .then((d) => { if (alive) setR(d); })
      .catch(() => undefined); // 기업 계정이 아니거나 서버가 꺼져 있으면 영역을 숨긴다
    return () => { alive = false; };
  }, [userId]);

  if (!r) return null;
  const b = r.basics;

  const facts: [string, string][] = [
    ["구직 상태", s(b.job_search_status) ? SEARCH_STATUS_LABEL[b.job_search_status as keyof typeof SEARCH_STATUS_LABEL] ?? "" : ""],
    ["지역", [s(b.region_sido), s(b.region_sigungu)].filter(Boolean).join(" ")],
    ["희망 직군", list(b.desired_categories).join(", ")],
    ["희망 지역", list(b.desired_regions).join(", ")],
    ["고용 형태", list(b.desired_employment_types).join(", ")],
    ["희망 연봉", s(b.desired_salary_text) ?? ""],
    ["입사 가능", s(b.available_from) ? fmtYm(b.available_from as string) : ""],
    ["출생", typeof b.birth_year === "number" ? `${b.birth_year}년` : ""],
    ["병역", s(b.military_status) ? MILITARY[b.military_status as string] ?? "" : ""],
    ["이메일", s(b.email) ?? ""],
    ["연락처", s(b.phone) ?? ""],
  ].filter((x): x is [string, string] => Boolean(x[1]));

  const sections: { title: string; items: Item[] }[] = [
    {
      title: "경력",
      items: r.experiences.map((x, i) => ({
        key: String(x.id ?? i),
        time: `${fmtYm(s(x.start_on))} — ${x.is_current ? "현재" : fmtYm(s(x.end_on))}`,
        head: [s(x.company), s(x.department), s(x.position_title), s(x.employment_type)].filter(Boolean).join(" · "),
        body: [s(x.duties), s(x.achievements) && `성과 · ${x.achievements}`].filter(Boolean).join("\n") || null,
      })),
    },
    {
      title: "학력",
      items: r.educations.map((x, i) => ({
        key: String(x.id ?? i),
        time: fmtYm(s(x.end_on)).slice(0, 4),
        head: [s(x.school), s(x.major), EDU_STATUS_LABEL[x.status as keyof typeof EDU_STATUS_LABEL]].filter(Boolean).join(" "),
        body: [DEGREE_LABEL[x.degree as keyof typeof DEGREE_LABEL], s(x.gpa) && `학점 ${x.gpa}`].filter(Boolean).join(" · ") || null,
      })),
    },
    {
      title: "자격",
      items: r.certifications.filter((x) => x.kind !== "language").map((x, i) => ({
        key: String(x.id ?? i), time: fmtYm(s(x.acquired_on)).slice(0, 4), head: String(x.name ?? ""), body: s(x.issuer),
      })),
    },
    {
      title: "어학",
      items: r.certifications.filter((x) => x.kind === "language").map((x, i) => ({
        key: String(x.id ?? i), time: fmtYm(s(x.acquired_on)), head: [s(x.name), s(x.score)].filter(Boolean).join(" "), body: null,
      })),
    },
    {
      title: "프로젝트 · 수상 · 교육 · 활동",
      items: r.misc.map((x, i) => ({
        key: String(x.id ?? i),
        time: fmtYm(s(x.start_on)),
        head: `${MISC_LABEL[x.kind as keyof typeof MISC_LABEL] ? `[${MISC_LABEL[x.kind as keyof typeof MISC_LABEL]}] ` : ""}${x.title ?? ""}${s(x.org) ? ` · ${x.org}` : ""}`,
        body: [s(x.description), s(x.url)].filter(Boolean).join("\n") || null,
      })),
    },
  ].filter((sec) => sec.items.length > 0);

  if (!s(b.headline) && facts.length === 0 && sections.length === 0) return null;

  const muted = { color: "var(--text-secondary)" };
  return (
    <section id="resume" className="max-w-3xl mx-auto px-6 py-10" aria-labelledby="h-resume">
      <h2 id="h-resume" className="text-lg font-semibold mb-1" style={{ color: "var(--text-primary)" }}>이력서</h2>
      <p className="text-xs mb-5" style={muted}>구직자가 기업에게 공개로 둔 항목만 보입니다.</p>
      {s(b.headline) && <p className="text-base mb-5" style={{ color: "var(--text-primary)" }}>{b.headline as string}</p>}

      {facts.length > 0 && (
        <dl className="grid grid-cols-[80px_1fr] sm:grid-cols-[96px_1fr] gap-x-4 gap-y-2 text-sm mb-8 rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border-color)" }}>
          {facts.map(([k, v]) => (
            <div key={k} className="contents">
              <dt style={muted}>{k}</dt>
              <dd style={{ color: "var(--text-primary)" }}>{v}</dd>
            </div>
          ))}
        </dl>
      )}

      {sections.map((sec) => (
        <div key={sec.title} className="mb-8">
          <h3 className="text-sm font-semibold mb-3 pb-2" style={{ color: "var(--text-primary)", borderBottom: "1px solid var(--border-color)" }}>{sec.title}</h3>
          <ul className="grid gap-4">
            {sec.items.map((it) => (
              <li key={it.key} className="grid gap-1 sm:grid-cols-[110px_1fr] sm:gap-4 text-sm">
                <span className="tabular-nums" style={muted}>{it.time}</span>
                <div>
                  <p className="font-medium" style={{ color: "var(--text-primary)" }}>{it.head}</p>
                  {it.body && <p className="mt-1 whitespace-pre-wrap leading-relaxed" style={muted}>{it.body}</p>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
