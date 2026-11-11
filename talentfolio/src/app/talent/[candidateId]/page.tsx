import type { Metadata } from "next";
import Link from "next/link";
import { getCandidateById, getPublicEvidenceCards } from "@/lib/getCandidate";
import { sourceLabel, trustLabel } from "@/lib/lifeApi";
import TalentPortfolioShowcase from "@/components/TalentPortfolioShowcase";
import { SiteHeader } from "@/components/site/SiteHeader";
import { fetchPublicWorks } from "@/lib/portfolioWorks";
import TalentResume from "@/components/TalentResume";

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

  const [evidence, works] = await Promise.all([
    getPublicEvidenceCards(candidate.supabaseId ?? candidate.id),
    candidate.supabaseId ? fetchPublicWorks(candidate.supabaseId) : Promise.resolve([]),
  ]);

  return (
    <>
      <SiteHeader crumb="포트폴리오" />
      <TalentPortfolioShowcase candidate={candidate} publicId={candidateId} />
      {candidate.supabaseId && <TalentResume userId={candidate.supabaseId} />}
      {works.length > 0 && (
        <section id="works" className="max-w-5xl mx-auto px-6 py-10">
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-secondary)" }}>
            작업물 {works.length}
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {works.map((w) => (
              <article key={w.id} className="rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border-color)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={w.images[0]} alt={w.title} loading="lazy" className="w-full aspect-[4/3] object-cover" />
                <div className="p-4">
                  <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>{w.title}</h3>
                  <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>{[w.year, w.role].filter(Boolean).join(" · ")}</p>
                  {w.description && (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap mt-2 line-clamp-6" style={{ color: "var(--text-primary)" }}>{w.description}</p>
                  )}
                  {w.tools.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {w.tools.map((t) => (
                        <span key={t} className="text-xs px-2 py-0.5 rounded-md" style={{ border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>{t}</span>
                      ))}
                    </div>
                  )}
                  {w.images.length > 1 && (
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      {w.images.slice(1, 4).map((src) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={src} src={src} alt="" loading="lazy" className="w-full aspect-[4/3] object-cover rounded-md" />
                      ))}
                    </div>
                  )}
                  {w.url && (
                    <a href={w.url} target="_blank" rel="noopener noreferrer" className="inline-block text-xs underline mt-3" style={{ color: "var(--accent)" }}>
                      작업물 보러 가기
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
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
