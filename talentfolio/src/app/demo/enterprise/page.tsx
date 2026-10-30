"use client";

import { useMemo, useState } from "react";
import { Inter } from "next/font/google";
import { BarChart3, Bookmark, GitBranch, Search, Users } from "lucide-react";
import candidatesData from "@/data/candidates.json";
import type { Candidate } from "@/types/candidate";
import { DemoChrome } from "@/components/demo/shared/DemoChrome";
import { Skiper39 } from "@/components/demo/shared/skiper39";
import { FOLDER_PALETTES, ProfileFolderCard } from "@/components/demo/shared/ProfileFolderCard";
import { BrandLogo } from "@/components/brand/BrandLogo";

const inter = Inter({ subsets: ["latin"], display: "swap" });

const ACCENT = "#3B6FFE";
const INK = "#111827";
const MUTED = "#64748B";
const LINE = "#E6E8EC";
const CANVAS = "#F6F7F9";
const staticCandidates = candidatesData as Candidate[];

const NAV = [
  { label: "인재 검색", icon: Users },
  { label: "쇼트리스트", icon: Bookmark },
  { label: "파이프라인", icon: GitBranch },
  { label: "리포트", icon: BarChart3 },
] as const;

const ROLES = [
  { key: "all" as const, label: "All" },
  { key: "developer" as const, label: "Developer" },
  { key: "designer" as const, label: "Designer" },
];

export default function EnterpriseDemoPage() {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<"all" | "developer" | "designer">("all");

  const developers = staticCandidates.filter((c) => c.role === "developer").length;
  const designers = staticCandidates.filter((c) => c.role === "designer").length;

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return staticCandidates.filter((c) => {
      if (role !== "all" && c.role !== role) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.skills.some((s) => s.toLowerCase().includes(q))
      );
    });
  }, [query, role]);

  return (
    <DemoChrome variant="enterprise" accent={ACCENT}>
      <style>{`
        .demo-enterprise { color: ${INK}; background: ${CANVAS}; }
        .demo-enterprise .demo-topbar {
          padding: 7px 18px;
          background: rgba(255,255,255,0.88);
          border-bottom: 1px solid ${LINE};
          backdrop-filter: blur(12px) saturate(140%);
        }
        @media (max-width: 640px) {
          .ent-shell { grid-template-columns: minmax(0, 1fr) !important; }
          .ent-aside { display: none !important; }
        }
      `}</style>

      <div
        className={`ent-shell ${inter.className}`}
        style={{
          display: "grid",
          gridTemplateColumns: "220px minmax(0, 1fr)",
          minHeight: "calc(100vh - 37px)",
          background: CANVAS,
          color: INK,
        }}
      >
        <aside
          className="ent-aside"
          style={{
            borderRight: `1px solid ${LINE}`,
            background: "#FBFBFC",
            padding: "18px 12px 16px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ padding: "4px 8px 0" }}>
            <BrandLogo size={20} />
            <div style={{ fontSize: 11, color: MUTED, marginTop: 3 }}>Acme · Recruiting</div>
          </div>

          <nav style={{ marginTop: 22, display: "grid", gap: 2 }}>
            {NAV.map((item, i) => {
              const Icon = item.icon;
              const active = i === 0;
              return (
                <div
                  key={item.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "7px 8px",
                    borderRadius: 7,
                    fontSize: 13,
                    background: active ? "rgba(59,111,254,0.09)" : "transparent",
                    color: active ? ACCENT : "#334155",
                    fontWeight: active ? 600 : 450,
                  }}
                >
                  <Icon size={14} strokeWidth={1.75} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                </div>
              );
            })}
          </nav>

          <div style={{ margin: "22px 8px 8px", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "#94A3B8" }}>
            Views
          </div>
          <div style={{ display: "grid", gap: 2 }}>
            {[
              { label: "All people", key: "all" as const, n: staticCandidates.length },
              { label: "Developers", key: "developer" as const, n: developers },
              { label: "Designers", key: "designer" as const, n: designers },
            ].map((view) => {
              const on = role === view.key;
              return (
                <button
                  key={view.label}
                  type="button"
                  onClick={() => setRole(view.key)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "6px 8px",
                    borderRadius: 7,
                    fontSize: 12.5,
                    border: 0,
                    width: "100%",
                    textAlign: "left",
                    cursor: "pointer",
                    color: on ? INK : MUTED,
                    background: on ? "rgba(15,23,42,0.04)" : "transparent",
                    fontWeight: on ? 600 : 450,
                  }}
                >
                  <span>{view.label}</span>
                  <span style={{ fontVariantNumeric: "tabular-nums", fontSize: 11 }}>{view.n}</span>
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: "auto", padding: "12px 8px 4px", borderTop: `1px solid ${LINE}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  background: "rgba(59,111,254,0.14)",
                  color: ACCENT,
                  fontSize: 10,
                  fontWeight: 650,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                KR
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>Kim Recruiter</div>
                <div style={{ fontSize: 10, color: MUTED }}>Hiring · Seoul</div>
              </div>
            </div>
          </div>
        </aside>

        <div style={{ position: "relative", minWidth: 0 }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              opacity: 0.18,
              WebkitMaskImage: "linear-gradient(to bottom, transparent 12%, black 62%)",
              maskImage: "linear-gradient(to bottom, transparent 12%, black 62%)",
            }}
          >
            <Skiper39 />
          </div>
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              background: "linear-gradient(180deg, rgba(246,247,249,0.94) 0%, rgba(246,247,249,0.42) 48%, rgba(246,247,249,0.08) 100%)",
            }}
          />

          <div style={{ position: "relative", zIndex: 2, padding: "18px 28px 72px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: MUTED, letterSpacing: "0.02em" }}>People</div>
                <h1 style={{ fontSize: 22, letterSpacing: "-0.03em", margin: "2px 0 0", fontWeight: 600, lineHeight: 1.2 }}>
                  인재 디렉터리
                </h1>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: MUTED,
                  border: `1px solid ${LINE}`,
                  background: "rgba(255,255,255,0.7)",
                  borderRadius: 6,
                  padding: "4px 8px",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {list.length} profiles
              </div>
            </div>

            <div
              style={{
                marginTop: 16,
                display: "flex",
                alignItems: "center",
                gap: 10,
                height: 40,
                padding: "0 6px 0 12px",
                background: "rgba(255,255,255,0.78)",
                backdropFilter: "blur(10px) saturate(140%)",
                border: `1px solid ${LINE}`,
                borderRadius: 8,
              }}
            >
              <Search size={14} color={MUTED} strokeWidth={1.75} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search people, skills, titles"
                style={{
                  flex: 1,
                  border: 0,
                  outline: "none",
                  background: "transparent",
                  fontSize: 13,
                  color: INK,
                  minWidth: 0,
                }}
              />
              <div
                style={{
                  display: "flex",
                  border: `1px solid ${LINE}`,
                  borderRadius: 7,
                  overflow: "hidden",
                  background: "#fff",
                }}
              >
                {ROLES.map((item) => {
                  const on = role === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => setRole(item.key)}
                      style={{
                        border: 0,
                        borderRight: item.key !== "designer" ? `1px solid ${LINE}` : 0,
                        background: on ? ACCENT : "transparent",
                        color: on ? "#fff" : "#334155",
                        padding: "6px 10px",
                        fontSize: 12,
                        cursor: "pointer",
                        fontWeight: on ? 600 : 450,
                      }}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              style={{
                marginTop: 28,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "18px 14px",
                justifyItems: "center",
              }}
            >
              {list.map((c, i) => (
                <ProfileFolderCard key={c.id} candidate={c} delay={i * 32} palette={FOLDER_PALETTES.enterprise} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </DemoChrome>
  );
}
