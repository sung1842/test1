import { ExternalLink, GitBranch, Globe, Mail, Sparkles } from "lucide-react";
import type { Candidate } from "@/types/candidate";
import RoleBadge from "./RoleBadge";
import SkillTag from "./SkillTag";

interface TalentPortfolioShowcaseProps {
  candidate: Candidate;
  /** 공유·Slack unfurl용 공개 ID */
  publicId: string;
}

const roleAccent = {
  developer: { color: "var(--dev-color)", glow: "rgba(var(--dev-color-rgb), 0.25)" },
  designer: { color: "var(--des-color)", glow: "rgba(var(--des-color-rgb), 0.25)" },
};

export default function TalentPortfolioShowcase({ candidate, publicId }: TalentPortfolioShowcaseProps) {
  const accent = roleAccent[candidate.role];
  const initials = candidate.name.slice(0, 1);

  const externalLinks = [
    candidate.links.github && { href: candidate.links.github, label: "GitHub", Icon: GitBranch },
    candidate.links.portfolio && { href: candidate.links.portfolio, label: "Portfolio", Icon: Globe },
    candidate.links.behance && { href: candidate.links.behance, label: "Behance", Icon: ExternalLink },
    candidate.links.linkedin && { href: candidate.links.linkedin, label: "LinkedIn", Icon: ExternalLink },
  ].filter(Boolean) as { href: string; label: string; Icon: typeof GitBranch }[];

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <div
        className="relative overflow-hidden"
        style={{
          background: `linear-gradient(165deg, ${accent.glow} 0%, var(--background) 55%)`,
          borderBottom: "1px solid var(--border-color)",
        }}
      >
        <div className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle at 20% 20%, rgba(var(--accent-rgb), 0.15), transparent 45%)",
          }}
        />

        <div className="relative z-10 max-w-3xl mx-auto px-4 pb-10 pt-2">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div
              className="w-24 h-24 rounded-2xl shrink-0 flex items-center justify-center text-3xl font-bold overflow-hidden"
              style={{
                background: `${accent.color}18`,
                border: `2px solid ${accent.color}55`,
                color: accent.color,
                fontFamily: "Pretendard Variable, sans-serif",
                boxShadow: `0 0 40px ${accent.glow}`,
              }}
            >
              {candidate.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={candidate.avatar} alt={candidate.name} className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <h1
                  className="text-3xl font-bold"
                  style={{ color: "var(--text-primary)", fontFamily: "Wanted Sans Variable, sans-serif" }}
                >
                  {candidate.name}
                </h1>
                <RoleBadge role={candidate.role} />
              </div>
              {candidate.title && (
                <p className="text-base mb-3" style={{ color: accent.color, fontFamily: "Pretendard Variable, sans-serif" }}>
                  {candidate.title}
                </p>
              )}
              {candidate.shortBio && (
                <p className="text-sm leading-relaxed max-w-xl" style={{ color: "var(--text-primary)" }}>
                  {candidate.shortBio}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <main id="main" className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {candidate.skills.length > 0 && (
          <section>
            <h2
              className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider mb-4"
              style={{ color: "var(--text-secondary)", fontFamily: "Pretendard Variable, sans-serif" }}
            >
              <Sparkles size={14} style={{ color: accent.color }} />
              기술 &amp; 스킬
            </h2>
            <div
              className="rounded-2xl p-5"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border-color)" }}
            >
              <div className="flex flex-wrap gap-2">
                {candidate.skills.map((skill) => (
                  <SkillTag key={skill} skill={skill} />
                ))}
              </div>
            </div>
          </section>
        )}

        {candidate.longBio && (
          <section>
            <h2
              className="text-xs font-semibold uppercase tracking-wider mb-4"
              style={{ color: "var(--text-secondary)", fontFamily: "Pretendard Variable, sans-serif" }}
            >
              소개
            </h2>
            <div
              className="rounded-2xl p-6"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border-color)" }}
            >
              <p
                className="text-sm leading-relaxed whitespace-pre-wrap"
                style={{ color: "var(--text-primary)", fontFamily: "Pretendard Variable, sans-serif" }}
              >
                {candidate.longBio}
              </p>
            </div>
          </section>
        )}

        {(externalLinks.length > 0 || candidate.email) && (
          <section>
            <h2
              className="text-xs font-semibold uppercase tracking-wider mb-4"
              style={{ color: "var(--text-secondary)", fontFamily: "Pretendard Variable, sans-serif" }}
            >
              작업물 &amp; 연락처
            </h2>
            <div
              className="rounded-2xl p-5 flex flex-wrap gap-2"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border-color)" }}
            >
              {externalLinks.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90"
                  style={{
                    background: "rgba(11, 28, 69, 0.04)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-primary)",
                    fontFamily: "Pretendard Variable, sans-serif",
                  }}
                >
                  <Icon size={16} style={{ color: accent.color }} />
                  {label}
                  <ExternalLink size={12} style={{ color: "var(--text-secondary)" }} />
                </a>
              ))}
              {candidate.email && (
                <a
                  href={`mailto:${candidate.email}`}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
                  style={{
                    background: "rgba(11, 28, 69, 0.04)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-primary)",
                    fontFamily: "Pretendard Variable, sans-serif",
                  }}
                >
                  <Mail size={16} style={{ color: accent.color }} />
                  이메일
                </a>
              )}
            </div>
          </section>
        )}

        <p className="text-center text-xs pt-4 pb-8" style={{ color: "var(--text-secondary)" }}>
          TalentFolio · {publicId}
        </p>
      </main>
    </div>
  );
}
