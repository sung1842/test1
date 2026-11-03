"use client";

import { createPortal } from "react-dom";
import { useSyncExternalStore } from "react";
import {
  DEGREE_LABEL, EDU_STATUS_LABEL, MISC_LABEL, fmtYm,
  type Certification, type Education, type Experience, type MiscItem, type ResumeBasics,
} from "./studioData";

/**
 * 인쇄(PDF 내보내기) 전용 이력서. 화면에는 보이지 않고 @media print 에서만 이것만 찍힌다 (studio.css).
 * 편집 UI·안내 문구·빈 칸 표시 없이, 값이 있는 항목만 표준 이력서 순서로 그린다.
 * 본인이 직접 내보내는 문서라 공개/비공개 설정과 관계없이 입력한 내용을 모두 넣는다.
 */
const MILITARY_LABEL: Record<string, string> = { served: "군필", exempt: "면제", serving: "복무 중", not_applicable: "해당 없음" };

export interface ResumeData {
  name: string;
  photoUrl: string | null;
  basics: Partial<ResumeBasics>;
  experiences: Experience[];
  educations: Education[];
  certifications: Certification[];
  misc: MiscItem[];
  categoryName: (code: string) => string;
}

const noop = () => () => {};

export function ResumePrint(d: ResumeData) {
  // 포털은 브라우저에서만 (서버 렌더에는 document 가 없다)
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  if (!mounted) return null;
  return createPortal(<Sheet {...d} />, document.body);
}

const period = (a: string | null, b: string | null, current?: boolean) =>
  [fmtYm(a), current ? "재직 중" : fmtYm(b)].filter((x) => x && x !== "—").join(" ~ ");

/** 경력 기간 합계 (예: 5년 3개월) */
function totalCareer(xs: Experience[]) {
  const months = xs.reduce((sum, x) => {
    const s = new Date(x.start_on);
    const e = x.is_current || !x.end_on ? new Date() : new Date(x.end_on);
    return sum + Math.max(0, (e.getFullYear() - s.getFullYear()) * 12 + e.getMonth() - s.getMonth() + 1);
  }, 0);
  if (!months) return null;
  const y = Math.floor(months / 12), m = months % 12;
  return [y && `${y}년`, m && `${m}개월`].filter(Boolean).join(" ");
}

function Sheet({ name, photoUrl, basics: b, experiences, educations, certifications, misc, categoryName }: ResumeData) {
  const licenses = certifications.filter((c) => c.kind === "license");
  const languages = certifications.filter((c) => c.kind === "language");
  const region = [b.region_sido, b.region_sigungu].filter(Boolean).join(" ");
  const info: [string, string | null | undefined][] = [
    ["이메일", b.email],
    ["연락처", b.phone],
    ["출생 연도", b.birth_year ? `${b.birth_year}년` : null],
    ["거주지", region],
    ["병역", b.military_status ? MILITARY_LABEL[b.military_status] : null],
  ];
  const wish: [string, string | null | undefined][] = [
    ["희망 직무", (b.desired_categories ?? []).map(categoryName).join(", ")],
    ["희망 근무지", (b.desired_regions ?? []).join(", ")],
    ["고용 형태", (b.desired_employment_types ?? []).join(", ")],
    ["희망 연봉", b.desired_salary_text],
    ["입사 가능일", b.available_from?.replaceAll("-", ".")],
  ];
  const career = totalCareer(experiences);

  return (
    <div className="resume-print-root" aria-hidden="true">
      <article className="rp">
        <h1 className="rp-doc">이 력 서</h1>
        <header className="rp-head">
          <div className="rp-photo">
            {photoUrl ? <img src={photoUrl} alt="" /> : <DefaultPhoto />}
          </div>
          <div className="rp-id">
            <p className="rp-name">{name}</p>
            {b.headline && <p className="rp-headline">{b.headline}</p>}
            <table className="rp-info"><tbody>
              {info.filter(([, v]) => v).map(([k, v]) => <tr key={k}><th>{k}</th><td>{v}</td></tr>)}
            </tbody></table>
          </div>
        </header>

        {wish.some(([, v]) => v) && (
          <Section title="희망 근무 조건">
            <table className="rp-kv"><tbody>
              {wish.filter(([, v]) => v).map(([k, v]) => <tr key={k}><th>{k}</th><td>{v}</td></tr>)}
            </tbody></table>
          </Section>
        )}

        {experiences.length > 0 && (
          <Section title="경력" note={career ? `총 ${career}` : undefined}>
            {experiences.map((x) => (
              <div className="rp-item" key={x.id}>
                <div className="rp-when">{period(x.start_on, x.end_on, x.is_current)}</div>
                <div className="rp-what">
                  <p className="rp-t">{x.company}<span>{[x.department, x.position_title, x.employment_type].filter(Boolean).join(" · ")}</span></p>
                  {x.duties && <p className="rp-d"><b>담당 업무</b>{x.duties}</p>}
                  {x.achievements && <p className="rp-d"><b>주요 성과</b>{x.achievements}</p>}
                </div>
              </div>
            ))}
          </Section>
        )}

        {educations.length > 0 && (
          <Section title="학력">
            <table className="rp-grid">
              <thead><tr><th>기간</th><th>학교명</th><th>전공</th><th>학위</th><th>구분</th><th>학점</th></tr></thead>
              <tbody>
                {educations.map((e) => (
                  <tr key={e.id}>
                    <td>{period(e.start_on, e.end_on)}</td><td>{e.school}</td><td>{e.major}</td>
                    <td>{DEGREE_LABEL[e.degree]}</td><td>{EDU_STATUS_LABEL[e.status]}</td><td>{e.gpa}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {licenses.length > 0 && (
          <Section title="자격증">
            <table className="rp-grid">
              <thead><tr><th>취득일</th><th>자격명</th><th>발행처</th></tr></thead>
              <tbody>{licenses.map((c) => <tr key={c.id}><td>{fmtYm(c.acquired_on)}</td><td>{c.name}</td><td>{c.issuer}</td></tr>)}</tbody>
            </table>
          </Section>
        )}

        {languages.length > 0 && (
          <Section title="어학">
            <table className="rp-grid">
              <thead><tr><th>응시일</th><th>시험</th><th>점수·등급</th></tr></thead>
              <tbody>{languages.map((c) => <tr key={c.id}><td>{fmtYm(c.acquired_on)}</td><td>{c.name}</td><td>{c.score}</td></tr>)}</tbody>
            </table>
          </Section>
        )}

        {misc.length > 0 && (
          <Section title="프로젝트 · 수상 · 교육 · 활동">
            {misc.map((m) => (
              <div className="rp-item" key={m.id}>
                <div className="rp-when">{period(m.start_on, m.end_on)}</div>
                <div className="rp-what">
                  <p className="rp-t">{m.title}<span>{[MISC_LABEL[m.kind], m.org].filter(Boolean).join(" · ")}</span></p>
                  {m.description && <p className="rp-d">{m.description}</p>}
                  {m.url && <p className="rp-d rp-url">{m.url}</p>}
                </div>
              </div>
            ))}
          </Section>
        )}

        <footer className="rp-foot">위 기재 사항은 사실과 다름없음을 확인합니다.<span>{new Date().toLocaleDateString("ko-KR")}　　작성자 {name}</span></footer>
      </article>
    </div>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="rp-sec">
      <h2>{title}{note && <small>{note}</small>}</h2>
      {children}
    </section>
  );
}

/** 사진이 없을 때 쓰는 기본 실루엣 */
export function DefaultPhoto() {
  return (
    <svg viewBox="0 0 90 120" role="img" aria-label="기본 프로필 사진" width="100%" height="100%">
      <rect width="90" height="120" fill="#E9EDF3" />
      <circle cx="45" cy="46" r="20" fill="#B9C2D0" />
      <path d="M10 120c2-26 17-40 35-40s33 14 35 40z" fill="#B9C2D0" />
    </svg>
  );
}
