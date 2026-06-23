"use client";

import { SlidersHorizontal } from "lucide-react";

type FilterType = "all" | "developer" | "designer";

interface FilterSidebarProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  counts: { all: number; developer: number; designer: number };
  activeSkillTags: string[];
  onSkillToggle: (skill: string) => void;
}

const QUICK_SKILLS = [
  "React", "TypeScript", "Next.js", "Node.js", "Python", "Go",
  "Figma", "Framer", "Three.js", "Tailwind", "Docker", "Rust",
];

const ROLE_OPTIONS: { value: FilterType; label: string }[] = [
  { value: "all",       label: "전체" },
  { value: "developer", label: "개발자" },
  { value: "designer",  label: "디자이너" },
];

export default function FilterSidebar({
  activeFilter,
  onFilterChange,
  counts,
  activeSkillTags,
  onSkillToggle,
}: FilterSidebarProps) {
  return (
    <aside className="w-56 shrink-0 hidden md:block">
      <div
        className="sticky top-24 rounded-2xl p-5 space-y-6"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border-color)",
        }}
      >
        {/* Title */}
        <div className="flex items-center gap-2">
          <SlidersHorizontal
            size={15}
            style={{ color: "var(--text-secondary)" }}
          />
          <span
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: "var(--text-secondary)", fontFamily: "DM Sans, sans-serif" }}
          >
            Advanced Filters
          </span>
        </div>

        {/* Role Type */}
        <div>
          <p
            className="text-[10px] font-semibold uppercase tracking-widest mb-3"
            style={{ color: "var(--text-secondary)", fontFamily: "DM Sans, sans-serif" }}
          >
            Role Type
          </p>
          <div className="space-y-1.5">
            {ROLE_OPTIONS.map(({ value, label }) => {
              const isActive = activeFilter === value;
              const dot =
                value === "developer" ? "#f6042e" :
                value === "designer"  ? "#ffae2e" :
                "var(--text-secondary)";
              return (
                <button
                  key={value}
                  onClick={() => onFilterChange(value)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200"
                  style={{
                    background: isActive
                      ? value === "developer" ? "rgba(246,4,46,0.1)"
                      : value === "designer"  ? "rgba(255,174,46,0.08)"
                      : "rgba(255,255,255,0.04)"
                      : "transparent",
                    border: `1px solid ${
                      isActive
                        ? value === "developer" ? "rgba(246,4,46,0.35)"
                        : value === "designer"  ? "rgba(255,174,46,0.3)"
                        : "rgba(255,255,255,0.08)"
                        : "transparent"
                    }`,
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: dot, opacity: isActive ? 1 : 0.35 }}
                    />
                    <span
                      className="text-sm"
                      style={{
                        color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                        fontFamily: "DM Sans, sans-serif",
                        fontWeight: isActive ? 600 : 400,
                      }}
                    >
                      {label}
                    </span>
                  </div>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full"
                    style={{
                      fontFamily: "DM Sans, sans-serif",
                      background: isActive ? (
                        value === "developer" ? "rgba(246,4,46,0.18)" :
                        value === "designer"  ? "rgba(255,174,46,0.15)" :
                        "rgba(255,255,255,0.06)"
                      ) : "var(--surface-elevated)",
                      color: isActive ? (
                        value === "developer" ? "#f6042e" :
                        value === "designer"  ? "#ffae2e" :
                        "var(--text-primary)"
                      ) : "var(--text-secondary)",
                    }}
                  >
                    {counts[value]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "var(--border-color)" }} />

        {/* Tech Stack Quick Filter */}
        <div>
          <p
            className="text-[10px] font-semibold uppercase tracking-widest mb-3"
            style={{ color: "var(--text-secondary)", fontFamily: "DM Sans, sans-serif" }}
          >
            Tech Stack
          </p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_SKILLS.map((skill) => {
              const isActive = activeSkillTags.includes(skill);
              return (
                <button
                  key={skill}
                  onClick={() => onSkillToggle(skill)}
                  className="text-[11px] px-2.5 py-1 rounded-full transition-all duration-200"
                  style={{
                    fontFamily: "DM Sans, sans-serif",
                    background: isActive ? "rgba(246,4,46,0.15)" : "var(--surface-elevated)",
                    border: `1px solid ${isActive ? "rgba(246,4,46,0.4)" : "var(--border-color)"}`,
                    color: isActive ? "#f6042e" : "var(--text-secondary)",
                    fontWeight: isActive ? 600 : 400,
                  }}
                >
                  {skill}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}
