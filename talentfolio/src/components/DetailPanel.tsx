"use client";

import { useEffect } from "react";
import { X, Bookmark, Mail, MessageSquare, GitBranch, Globe, ExternalLink, Link } from "lucide-react";
import { Candidate } from "@/types/candidate";
import Avatar from "./Avatar";
import RoleBadge from "./RoleBadge";
import SkillTag from "./SkillTag";

interface DetailPanelProps {
  candidate: Candidate | null;
  isBookmarked: boolean;
  onClose: () => void;
  onBookmark: (id: string) => void;
  onSkillClick: (skill: string) => void;
  onMessage?: (candidate: Candidate) => void;
}

function LinkButton({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        border: "1px solid var(--border-color)",
        color: "var(--text-secondary)",
        fontFamily: "DM Sans, sans-serif",
      }}
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200 hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[rgba(91,110,245,0.1)]"
    >
      <Icon className="w-4 h-4" />
      {label}
    </a>
  );
}

export default function DetailPanel({
  candidate,
  isBookmarked,
  onClose,
  onBookmark,
  onSkillClick,
  onMessage,
}: DetailPanelProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!candidate) return null;

  const links = [
    candidate.links.github && {
      href: candidate.links.github,
      icon: GitBranch,
      label: "GitHub",
    },
    candidate.links.portfolio && {
      href: candidate.links.portfolio,
      icon: Globe,
      label: "Portfolio",
    },
    candidate.links.behance && {
      href: candidate.links.behance,
      icon: ExternalLink,
      label: "Behance",
    },
    candidate.links.linkedin && {
      href: candidate.links.linkedin,
      icon: Link,
      label: "LinkedIn",
    },
  ].filter(Boolean) as { href: string; icon: React.ComponentType<{ className?: string }>; label: string }[];

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        onClick={onClose}
      />
      <aside
        className="fixed right-0 top-0 h-full z-50 overflow-y-auto animate-slideInRight"
        style={{
          width: "min(420px, 100vw)",
          backgroundColor: "var(--surface-elevated)",
          borderLeft: "1px solid var(--border-color)",
        }}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <span
              style={{
                color: "var(--text-secondary)",
                fontFamily: "JetBrains Mono, monospace",
              }}
              className="text-xs"
            >
              후보자 프로필
            </span>
            <button
              onClick={onClose}
              style={{ color: "var(--text-secondary)" }}
              className="p-1.5 rounded-lg transition-colors hover:text-[var(--text-primary)] hover:bg-[var(--border-color)]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-start gap-4 mb-6">
            <Avatar
              name={candidate.name}
              avatar={candidate.avatar}
              size="lg"
              role={candidate.role}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h2
                  style={{
                    fontFamily: "Syne, sans-serif",
                    color: "var(--text-primary)",
                  }}
                  className="text-2xl font-bold leading-tight"
                >
                  {candidate.name}
                </h2>
                <button
                  onClick={() => onBookmark(candidate.id)}
                  style={{
                    color: isBookmarked ? "var(--accent-alt)" : "var(--text-secondary)",
                    backgroundColor: isBookmarked
                      ? "rgba(245,166,35,0.1)"
                      : "transparent",
                    border: `1px solid ${isBookmarked ? "var(--accent-alt)" : "var(--border-color)"}`,
                  }}
                  className="p-2 rounded-lg transition-all duration-200 hover:border-[var(--accent-alt)] hover:text-[var(--accent-alt)] flex-shrink-0"
                >
                  <Bookmark
                    className="w-4 h-4"
                    fill={isBookmarked ? "currentColor" : "none"}
                  />
                </button>
              </div>
              <p
                style={{
                  fontFamily: "JetBrains Mono, monospace",
                  color: "var(--text-secondary)",
                }}
                className="text-sm mt-1"
              >
                {candidate.title}
              </p>
              <div className="mt-2">
                <RoleBadge role={candidate.role} />
              </div>
            </div>
          </div>

          <div
            className="mb-6 pb-6"
            style={{ borderBottom: "1px solid var(--border-color)" }}
          >
            <h3
              style={{
                fontFamily: "Syne, sans-serif",
                color: "var(--text-secondary)",
              }}
              className="text-xs font-semibold uppercase tracking-wider mb-3"
            >
              소개
            </h3>
            <p
              style={{ color: "var(--text-secondary)" }}
              className="text-sm leading-relaxed"
            >
              {candidate.longBio}
            </p>
          </div>

          <div
            className="mb-6 pb-6"
            style={{ borderBottom: "1px solid var(--border-color)" }}
          >
            <h3
              style={{
                fontFamily: "Syne, sans-serif",
                color: "var(--text-secondary)",
              }}
              className="text-xs font-semibold uppercase tracking-wider mb-3"
            >
              스킬
            </h3>
            <div className="flex flex-wrap gap-2">
              {candidate.skills.map((skill) => (
                <SkillTag
                  key={skill}
                  skill={skill}
                  onClick={(s) => {
                    onSkillClick(s);
                    onClose();
                  }}
                />
              ))}
            </div>
          </div>

          {links.length > 0 && (
            <div
              className="mb-6 pb-6"
              style={{ borderBottom: "1px solid var(--border-color)" }}
            >
              <h3
                style={{
                  fontFamily: "Syne, sans-serif",
                  color: "var(--text-secondary)",
                }}
                className="text-xs font-semibold uppercase tracking-wider mb-3"
              >
                링크
              </h3>
              <div className="flex flex-wrap gap-2">
                {links.map((link) => (
                  <LinkButton key={link.label} {...link} />
                ))}
              </div>
            </div>
          )}

          <div>
            <h3
              style={{
                fontFamily: "Syne, sans-serif",
                color: "var(--text-secondary)",
              }}
              className="text-xs font-semibold uppercase tracking-wider mb-3"
            >
              연락하기
            </h3>
            <div className="flex gap-2">
              {/* 메시지 보내기 버튼 */}
              <button
                onClick={() => onMessage?.(candidate)}
                style={{
                  background: "linear-gradient(135deg, #e879f9, #c026d3)",
                  color: "white",
                  fontFamily: "DM Sans, sans-serif",
                  border: "none",
                  boxShadow: "0 6px 20px rgba(232,121,249,0.35)",
                  cursor: "pointer",
                }}
                className="flex items-center justify-center gap-2 flex-1 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:opacity-90 hover:shadow-lg"
              >
                <MessageSquare className="w-4 h-4" />
                메시지 보내기
              </button>
              {/* 이메일 보내기 버튼 */}
              <a
                href={`mailto:${candidate.email}`}
                style={{
                  border: "1px solid var(--border-color)",
                  color: "var(--text-secondary)",
                  fontFamily: "DM Sans, sans-serif",
                }}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                <Mail className="w-4 h-4" />
              </a>
            </div>
            <p
              style={{ color: "var(--text-secondary)" }}
              className="text-xs text-center mt-2"
            >
              {candidate.email}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
