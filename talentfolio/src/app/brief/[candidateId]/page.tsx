import { SiteHeader } from "@/components/site/SiteHeader";
import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { getCandidateById, getPublicEvidenceCards } from "@/lib/getCandidate";
import { evidenceCardHref, fetchBriefReport } from "@/lib/briefReport";
import { sourceLabel, trustLabel } from "@/lib/lifeApi";
import FitReportDetail from "@/components/FitReportDetail";
import RoleBadge from "@/components/RoleBadge";
import SkillTag from "@/components/SkillTag";

interface PageProps {
  params: Promise<{ candidateId: string }>;
  searchParams: Promise<{ jd?: string }>;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { candidateId } = await params;
  const { jd: jdHash } = await searchParams;

  const candidate = await getCandidateById(candidateId);
  const brief = jdHash ? await fetchBriefReport(candidateId, jdHash) : null;
  const report = brief?.report;

  const name = candidate?.name ?? "후보자";
  const title = report
    ? `${name} · JD ${report.overallScore}점 (${report.verdict.replace("_", " ")})`
    : `${name} · TalentFolio Brief`;

  const description = report
    ? report.ceoSummary.slice(0, 160)
    : candidate?.shortBio?.slice(0, 160) ?? "TalentFolio 후보자 브리프";

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const pageUrl = `${siteUrl}/brief/${candidateId}${jdHash ? `?jd=${jdHash}` : ""}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: "TalentFolio",
      type: "profile",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function BriefPage({ params, searchParams }: PageProps) {
  const { candidateId } = await params;
  const { jd: jdHash } = await searchParams;

  const candidate = await getCandidateById(candidateId);
  const brief = jdHash ? await fetchBriefReport(candidateId, jdHash) : null;
  const evidence = candidate ? await getPublicEvidenceCards(candidate.supabaseId ?? candidate.id) : [];

  if (!candidate) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: "var(--background)" }}>
        <p className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>후보를 찾을 수 없습니다</p>
        <Link href="/" className="text-sm" style={{ color: "var(--accent)" }}>메인으로 돌아가기</Link>
      </div>
    );
  }

  const report = brief?.report;
  const jdHeadline = brief?.jdHeadline;

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <SiteHeader crumb="Candidate Brief" />

      <main id="main" className="max-w-2xl mx-auto px-4 pb-8" style={{ paddingTop: 88 }}>
        {jdHeadline && (
          <p
            className="text-xs font-semibold uppercase tracking-wider mb-4 px-3 py-2 rounded-lg"
            style={{
              background: "rgba(var(--accent-rgb), 0.1)",
              border: "1px solid rgba(var(--accent-rgb), 0.25)",
              color: "var(--accent)",
            }}
          >
            JD: {jdHeadline}
          </p>
        )}

        <div
          className="rounded-2xl p-6 mb-6"
          style={{ background: "var(--surface)", border: "1px solid var(--border-color)" }}
        >
          <div className="flex items-start gap-4 mb-4">
            <div
              className="w-14 h-14 rounded-xl shrink-0 flex items-center justify-center text-lg font-bold"
              style={{ background: "var(--surface-elevated)", color: "var(--accent)" }}
            >
              {candidate.name.slice(0, 1)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "Pretendard Variable, sans-serif" }}>
                  {candidate.name}
                </h1>
                <RoleBadge role={candidate.role} />
              </div>
              {candidate.title && (
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{candidate.title}</p>
              )}
              {candidate.shortBio && (
                <p className="text-sm mt-2 leading-relaxed" style={{ color: "var(--text-primary)" }}>
                  {candidate.shortBio}
                </p>
              )}
            </div>
          </div>

          {candidate.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {candidate.skills.map((s) => (
                <SkillTag key={s} skill={s} small />
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {candidate.links.github && (
              <a
                href={candidate.links.github}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                style={{ border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}
              >
                GitHub <ExternalLink size={11} />
              </a>
            )}
            {candidate.links.portfolio && (
              <a
                href={candidate.links.portfolio}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                style={{ border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}
              >
                Portfolio <ExternalLink size={11} />
              </a>
            )}
          </div>
        </div>

        {report ? (
          <div
            className="rounded-2xl p-6"
            style={{ background: "var(--surface)", border: "1px solid var(--border-color)" }}
          >
            <FitReportDetail report={report} />
          </div>
        ) : (
          <div
            className="rounded-2xl px-6 py-10 text-center"
            style={{ background: "var(--surface)", border: "1px dashed var(--border-color)" }}
          >
            <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>
              JD 적합도 리포트 없음
            </p>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              {jdHash
                ? "해당 JD에 대한 분석 결과가 아직 저장되지 않았습니다."
                : "데스크의 승인함에서 공고를 고른 뒤 열면 이 후보의 적합도 근거가 함께 보여요."}
            </p>
          </div>
        )}

        {candidate.longBio && (
          <section className="mt-6">
            <h2
              className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: "var(--text-secondary)" }}
            >
              상세 소개
            </h2>
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-primary)" }}>
              {candidate.longBio}
            </p>
          </section>
        )}

        {evidence.length > 0 && (
          <section className="mt-6">
            <h2
              className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: "var(--text-secondary)" }}
            >
              근거 카드 {evidence.length}
            </h2>
            <ul className="grid gap-2">
              {evidence.map((c) => (
                <li key={c.id}>
                  <a
                    href={evidenceCardHref(candidateId, c.id)}
                    className="block rounded-xl px-4 py-3 text-sm transition-opacity hover:opacity-80"
                    style={{ background: "var(--surface)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
                  >
                    {c.claim}
                    <span className="block mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                      {sourceLabel(c.source)} · 신뢰 등급: {trustLabel(c.trust_level)}
                      {c.ai_edited && " · AI 교정"}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
