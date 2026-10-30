import type { Metadata } from "next";
import Link from "next/link";
import { getCandidateById, getPublicEvidenceCards } from "@/lib/getCandidate";
import { sourceLabel, trustLabel } from "@/lib/lifeApi";
import TalentPortfolioShowcase from "@/components/TalentPortfolioShowcase";
import { SiteHeader } from "@/components/site/SiteHeader";

interface PageProps {
  params: Promise<{ candidateId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { candidateId } = await params;
  const candidate = await getCandidateById(candidateId);

  const name = candidate?.name ?? "후보자";
  const title = `${name} · Portfolio`;
  const description =
    candidate?.shortBio?.slice(0, 160) ??
    candidate?.longBio?.slice(0, 160) ??
    "TalentFolio 후보자 포트폴리오";

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const pageUrl = `${siteUrl}/talent/${candidateId}`;

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

export default async function TalentPortfolioPage({ params }: PageProps) {
  const { candidateId } = await params;
  const candidate = await getCandidateById(candidateId);

  if (!candidate) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: "var(--background)" }}>
        <p className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
          후보를 찾을 수 없습니다
        </p>
        <Link href="/" className="text-sm" style={{ color: "var(--accent)" }}>
          메인으로 돌아가기
        </Link>
      </div>
    );
  }

  const evidence = await getPublicEvidenceCards(candidate.supabaseId ?? candidate.id);

  return (
    <>
      <SiteHeader crumb="포트폴리오" />
      <TalentPortfolioShowcase candidate={candidate} publicId={candidateId} />
      {evidence.length > 0 && (
        <section id="evidence" className="max-w-3xl mx-auto px-6 py-10">
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-secondary)" }}>
            근거 카드
          </h2>
          <div className="grid gap-3">
            {evidence.map((c) => (
              <div
                key={c.id}
                id={`card-${c.id}`}
                className="rounded-xl p-4"
                style={{ background: "var(--surface)", border: "1px solid var(--border-color)" }}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-primary)" }}>
                  {c.claim}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                  <span className="px-2 py-0.5 rounded-md" style={{ border: "1px solid var(--border-color)" }}>{sourceLabel(c.source)}</span>
                  <span className="px-2 py-0.5 rounded-md" style={{ border: "1px solid var(--border-color)" }}>신뢰 등급: {trustLabel(c.trust_level)}</span>
                  {c.ai_edited && (
                    <span className="px-2 py-0.5 rounded-md" style={{ border: "1px solid var(--border-color)" }}>AI 교정</span>
                  )}
                  {c.recorded_at && <span className="px-2 py-0.5">{c.recorded_at.slice(0, 10)}</span>}
                </div>
                {c.links.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {c.links.map((l) => (
                      <a key={l} href={l} target="_blank" rel="noopener noreferrer" className="text-xs underline" style={{ color: "var(--accent)" }}>
                        {l}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
