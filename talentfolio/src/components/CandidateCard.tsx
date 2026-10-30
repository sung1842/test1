"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Bookmark, Mail, MessageSquare, GitBranch, Globe, ExternalLink, Link } from "lucide-react";
import { Candidate } from "@/types/candidate";
import { cn } from "@/lib/utils";
import type { FitReport } from "@/types/fitReport";
import Avatar from "./Avatar";
import RoleBadge from "./RoleBadge";
import SkillTag from "./SkillTag";
import FitScoreBadge from "./FitScoreBadge";

interface CandidateCardProps {
  candidate: Candidate;
  isSelected: boolean;
  isBookmarked: boolean;
  fitReport?: FitReport;
  onSelect: (candidate: Candidate) => void;
  onBookmark: (id: string, e: React.MouseEvent) => void;
  onSkillClick: (skill: string) => void;
  onMessage?: (candidate: Candidate) => void;
  animationDelay: number;
}

const SPRING_MAIN = { type: "spring" as const, stiffness: 280, damping: 28, mass: 0.8 };
const SPRING_CHILD = { type: "spring" as const, stiffness: 380, damping: 28, mass: 0.6 };

const containerVariants = {
  hidden: { opacity: 0, y: 32, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1, transition: SPRING_MAIN },
  rest: { scale: 1, y: 0 },
  hover: { scale: 1.025, y: -5, transition: SPRING_MAIN },
};

const childVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: SPRING_CHILD },
};

const linkIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  github: GitBranch,
  portfolio: Globe,
  behance: ExternalLink,
  linkedin: Link,
};

/** Map candidate id → slide image (cycles through 1–12).
 *  Static candidates use numeric ids ("001"~"020").
 *  Real users have UUID ids — fall back to a char-code hash. */
function getCardImage(id: string): string {
  const num = parseInt(id, 10);
  if (!isNaN(num)) {
    const n = ((num - 1) % 12) + 1;
    return `/slides/${n}.webp`;
  }
  // UUID: derive a stable index from character codes
  const hash = id.replace(/-/g, "").split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const n = (hash % 12) + 1;
  return `/slides/${n}.webp`;
}

export default function CandidateCard({
  candidate,
  isSelected,
  isBookmarked,
  fitReport,
  onSelect,
  onBookmark,
  onSkillClick,
  onMessage,
  animationDelay,
}: CandidateCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const [isHovered, setIsHovered] = useState(false);
  const activeLinks = Object.entries(candidate.links).filter(([, v]) => v) as [string, string][];
  const cardImage = getCardImage(candidate.id);

  const glowColor = candidate.role === "developer"
    ? { shadow: "rgba(var(--dev-color-rgb), 0.3)", border: "var(--dev-color)" }
    : { shadow: "rgba(var(--des-color-rgb), 0.3)", border: "var(--des-color)" };

  // JD 분석 결과가 있으면 적합도(verdict)에 따라 카드를 강하게 강조한다.
  const fitAccent = fitReport
    ? {
        strong_fit:   { color: "var(--ok)", glow: "rgba(var(--ok-rgb), 0.55)",  soft: "rgba(var(--ok-rgb), 0.22)" },
        possible_fit: { color: "var(--warn)", glow: "",  soft: "" },
        weak_fit:     { color: "var(--border-color)", glow: "",   soft: "" },
      }[fitReport.verdict]
    : null;

  // 글로우 없음. 선택·적합도는 테두리 색과 얕은 그림자로만 표시한다.
  const boxShadow = fitAccent || isSelected
    ? `0 0 0 1px ${fitAccent ? fitAccent.color : glowColor.border}, var(--shadow-card)`
    : isHovered
    ? "var(--shadow-pop)"
    : "var(--shadow-card)";

  const borderColor = fitAccent
    ? fitAccent.color
    : isSelected
    ? glowColor.border
    : isHovered
    ? glowColor.border
    : "var(--border-color)";


  return (
    <motion.div
      initial={shouldReduceMotion ? "visible" : "hidden"}
      animate="visible"
      whileHover={{ y: -4 }}
      variants={containerVariants}
      transition={{ delay: animationDelay / 1000 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={() => onSelect(candidate)}
      className="relative overflow-hidden cursor-pointer"
      style={{
        backgroundColor: "var(--surface)",
        borderRadius: "var(--r-card)",
        border: `1.5px solid ${borderColor}`,
        boxShadow,
        transformStyle: "preserve-3d",
        transition: "box-shadow 0.25s ease, border-color 0.25s ease",
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
              "linear-gradient(to bottom, rgba(255,255,255,0) 55%, var(--surface) 100%)",
          }}
        />

        {/* Accent tint strip — JD 적합도 색상 우선, 없으면 직군 색상 */}
        <div
          className="absolute top-0 left-0 right-0"
          style={{
            height: fitAccent ? 3 : 2,
            background: fitAccent
              ? fitAccent.color
              : candidate.role === "developer"
              ? "var(--dev-color)"
              : "var(--des-color)",
          }}
        />

        {/* Bookmark — top right */}
        <motion.button
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => onBookmark(candidate.id, e)}
          aria-label={isBookmarked ? "북마크 해제" : "북마크"}
          aria-pressed={isBookmarked}
          className="absolute top-3 right-3 z-10 p-2 rounded-full grid place-items-center"
          style={{
            backgroundColor: isBookmarked ? "var(--sun)" : "rgba(255,255,255,0.92)",
            border: "1.5px solid var(--border-color)",
            color: isBookmarked ? "var(--warn)" : "var(--text-secondary)",
            minWidth: 36, minHeight: 36,
          }}
        >
          <Bookmark className="w-3.5 h-3.5" fill={isBookmarked ? "currentColor" : "none"} />
        </motion.button>

        {/* FitScore badge — top left (JD 매칭 분석 결과) */}
        {fitReport && (
          <div className="absolute top-3 left-3 z-10">
            <FitScoreBadge report={fitReport} compact />
          </div>
        )}

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
            style={{ fontFamily: "Pretendard Variable, sans-serif", color: "var(--text-primary)" }}
          >
            {candidate.name}
          </h3>
          <p
            className="text-xs mt-0.5"
            style={{ fontFamily: "Pretendard Variable, sans-serif", color: "var(--text-secondary)" }}
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
              className="text-xs px-2 py-0.5 self-center rounded-full"
              style={{
                color: "var(--text-secondary)",
                backgroundColor: "var(--tag-bg)",
                fontFamily: "Pretendard Variable, sans-serif",
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
                  aria-label={`${candidate.name} ${key}`}
                  onClick={(e) => e.stopPropagation()}
                  className="grid place-items-center w-9 h-9 rounded-full transition-colors duration-200 hover:bg-[var(--mist)] hover:text-[var(--accent)]"
                  style={{ color: "var(--text-secondary)", border: "1.5px solid var(--border-color)" }}
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
              className="btn-brand btn-brand--shadow-sm flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold"
              style={{
                fontFamily: "Pretendard Variable, sans-serif",
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
                el.style.color = "#f5ede4";
                el.style.borderColor = "rgba(245,237,228,0.3)";
                el.style.backgroundColor = "rgba(245,237,228,0.06)";
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
