"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Bookmark, Mail, MessageSquare, GitBranch, Globe, ExternalLink, Link } from "lucide-react";
import { Candidate } from "@/types/candidate";
import { cn } from "@/lib/utils";
import Avatar from "./Avatar";
import RoleBadge from "./RoleBadge";
import SkillTag from "./SkillTag";

interface CandidateCardProps {
  candidate: Candidate;
  isSelected: boolean;
  isBookmarked: boolean;
  onSelect: (candidate: Candidate) => void;
  onBookmark: (id: string, e: React.MouseEvent) => void;
  onSkillClick: (skill: string) => void;
  onMessage?: (candidate: Candidate) => void;
  animationDelay: number;
}

const SPRING_MAIN = { type: "spring" as const, stiffness: 280, damping: 28, mass: 0.8 };
const SPRING_CHILD = { type: "spring" as const, stiffness: 380, damping: 28, mass: 0.6 };

const containerVariants = {
  hidden: { opacity: 0, y: 32, scale: 0.96, filter: "blur(6px)" },
  visible: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: SPRING_MAIN },
  rest: { scale: 1, y: 0 },
  hover: { scale: 1.025, y: -5, transition: SPRING_MAIN },
};

const childVariants = {
  hidden: { opacity: 0, y: 14, filter: "blur(4px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: SPRING_CHILD },
};

const linkIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  github: GitBranch,
  portfolio: Globe,
  behance: ExternalLink,
  linkedin: Link,
};

/** Map candidate id → slide image (cycles through 1–12) */
function getCardImage(id: string): string {
  const n = ((parseInt(id, 10) - 1) % 12) + 1;
  return `/slides/${n}.webp`;
}

export default function CandidateCard({
  candidate,
  isSelected,
  isBookmarked,
  onSelect,
  onBookmark,
  onSkillClick,
  onMessage,
  animationDelay,
}: CandidateCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const activeLinks = Object.entries(candidate.links).filter(([, v]) => v) as [string, string][];
  const cardImage = getCardImage(candidate.id);

  return (
    <motion.div
      initial={shouldReduceMotion ? "visible" : "hidden"}
      animate="visible"
      whileHover="hover"
      variants={containerVariants}
      transition={{ delay: animationDelay / 1000 }}
      onClick={() => onSelect(candidate)}
      className={cn("relative rounded-2xl overflow-hidden cursor-pointer")}
      style={{
        backgroundColor: "var(--surface)",
        border: `1px solid ${isSelected ? "var(--accent)" : "var(--border-color)"}`,
        boxShadow: isSelected
          ? "0 0 0 1px var(--accent), 0 8px 40px rgba(232,121,249,0.2)"
          : "0 4px 24px rgba(0,0,0,0.4)",
      }}
    >
      {/* ── Top image area ── */}
      <motion.div
        variants={shouldReduceMotion ? {} : childVariants}
        className="relative h-44 overflow-hidden"
      >
        {/* Portfolio image */}
        <motion.img
          src={cardImage}
          alt={`${candidate.name}의 포트폴리오`}
          className="w-full h-full object-cover"
          initial={{ scale: 1 }}
          whileHover={{ scale: 1.06 }}
          transition={SPRING_MAIN}
          loading="lazy"
        />

        {/* Dark overlay so text is readable */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.6) 60%, var(--surface) 100%)",
          }}
        />

        {/* Accent tint strip — role color */}
        <div
          className="absolute top-0 left-0 right-0 h-0.5"
          style={{
            background: candidate.role === "developer"
              ? "linear-gradient(to right, transparent, var(--dev-color), transparent)"
              : "linear-gradient(to right, transparent, var(--des-color), transparent)",
          }}
        />

        {/* Bookmark — top right */}
        <motion.button
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => onBookmark(candidate.id, e)}
          className="absolute top-3 right-3 z-10 p-2 rounded-xl"
          style={{
            backgroundColor: isBookmarked ? "rgba(251,146,60,0.2)" : "rgba(0,0,0,0.5)",
            border: `1px solid ${isBookmarked ? "rgba(251,146,60,0.5)" : "rgba(255,255,255,0.1)"}`,
            color: isBookmarked ? "var(--accent-alt)" : "rgba(255,255,255,0.6)",
            backdropFilter: "blur(8px)",
          }}
        >
          <Bookmark className="w-3.5 h-3.5" fill={isBookmarked ? "currentColor" : "none"} />
        </motion.button>

        {/* Avatar — bottom center, overlapping the image/body seam */}
        <div className="absolute -bottom-6 left-5 z-10">
          <Avatar
            name={candidate.name}
            avatar={candidate.avatar}
            size="md"
            role={candidate.role}
          />
        </div>

        {/* Role badge — bottom right */}
        <div className="absolute bottom-3 right-4 z-10">
          <RoleBadge role={candidate.role} />
        </div>
      </motion.div>

      {/* ── Card body ── */}
      <div className="px-5 pt-9 pb-5 space-y-4">
        {/* Name + title */}
        <motion.div variants={shouldReduceMotion ? {} : childVariants}>
          <h3
            className="text-lg font-bold leading-tight"
            style={{ fontFamily: "Syne, sans-serif", color: "var(--text-primary)" }}
          >
            {candidate.name}
          </h3>
          <p
            className="text-[11px] mt-0.5"
            style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--text-secondary)" }}
          >
            {candidate.title}
          </p>
        </motion.div>

        {/* Short bio */}
        <motion.p
          variants={shouldReduceMotion ? {} : childVariants}
          className="text-sm leading-relaxed line-clamp-2"
          style={{ color: "var(--text-secondary)" }}
        >
          {candidate.shortBio}
        </motion.p>

        {/* Skills */}
        <motion.div
          variants={shouldReduceMotion ? {} : childVariants}
          className="flex flex-wrap gap-1.5"
        >
          {candidate.skills.slice(0, 4).map((skill) => (
            <SkillTag key={skill} skill={skill} small onClick={onSkillClick} />
          ))}
          {candidate.skills.length > 4 && (
            <span
              className="text-[10px] px-2 py-0.5 self-center rounded-full"
              style={{
                color: "var(--text-secondary)",
                backgroundColor: "var(--tag-bg)",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              +{candidate.skills.length - 4}
            </span>
          )}
        </motion.div>

        {/* Divider */}
        <div style={{ height: 1, background: "linear-gradient(to right, var(--border-color), transparent)" }} />

        {/* Links + email */}
        <motion.div
          variants={shouldReduceMotion ? {} : childVariants}
          className="flex items-center justify-between gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-1.5">
            {activeLinks.slice(0, 3).map(([key, href]) => {
              const Icon = linkIcons[key];
              return Icon ? (
                <a
                  key={key}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg transition-all duration-200 group/link"
                  style={{ color: "var(--text-secondary)", border: "1px solid var(--border-color)" }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.color = "var(--accent)";
                    el.style.borderColor = "rgba(232,121,249,0.4)";
                    el.style.backgroundColor = "rgba(232,121,249,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.color = "var(--text-secondary)";
                    el.style.borderColor = "var(--border-color)";
                    el.style.backgroundColor = "transparent";
                  }}
                >
                  <Icon className="w-3.5 h-3.5" />
                </a>
              ) : null;
            })}
          </div>

          <div className="flex items-center gap-2">
            {/* 메시지 버튼 */}
            <motion.button
              whileHover={{ scale: 1.08, y: -1 }}
              whileTap={{ scale: 0.94 }}
              onClick={(e) => { e.stopPropagation(); onMessage?.(candidate); }}
              title="메시지 보내기"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold"
              style={{
                background: "linear-gradient(135deg, #e879f9, #c026d3)",
                color: "white",
                fontFamily: "DM Sans, sans-serif",
                boxShadow: "0 4px 14px rgba(232,121,249,0.35)",
                border: "none",
                cursor: "pointer",
              }}
            >
              <MessageSquare className="w-3 h-3" />
              메시지
            </motion.button>
            {/* 이메일 버튼 */}
            <motion.a
              href={`mailto:${candidate.email}`}
              whileHover={{ scale: 1.08, y: -1 }}
              whileTap={{ scale: 0.94 }}
              title="이메일 보내기"
              className="flex items-center p-2 rounded-xl"
              style={{
                border: "1px solid var(--border-color)",
                color: "var(--text-secondary)",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.color = "var(--accent)";
                el.style.borderColor = "rgba(232,121,249,0.4)";
                el.style.backgroundColor = "rgba(232,121,249,0.08)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.color = "var(--text-secondary)";
                el.style.borderColor = "var(--border-color)";
                el.style.backgroundColor = "transparent";
              }}
            >
              <Mail className="w-3.5 h-3.5" />
            </motion.a>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
