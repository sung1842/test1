"use client";

import { useMemo, useState } from "react";
import candidatesData from "@/data/candidates.json";
import type { Candidate } from "@/types/candidate";
import { DemoChrome } from "@/components/demo/shared/DemoChrome";
import { Skiper39 } from "@/components/demo/shared/skiper39";
import GlassCard from "@/components/demo/shared/glass-card";
import { FOLDER_PALETTES, ProfileFolderCard } from "@/components/demo/shared/ProfileFolderCard";

const PAPER = "#F7FBF9";
const INK = "#10231C";
const ACCENT = "#0F766E";
const staticCandidates = candidatesData as Candidate[];

export default function SpecDemoPage() {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<"all" | "developer" | "designer">("all");

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
    <DemoChrome variant="spec" accent={ACCENT}>
      <div
        style={{
          position: "relative",
          minHeight: "100vh",
          background:
            `radial-gradient(1100px 560px at 8% -8%, rgba(45,212,191,0.20), transparent 56%), radial-gradient(880px 480px at 92% 0%, rgba(13,148,136,0.12), transparent 52%), ${PAPER}`,
          color: INK,
        }}
      >
        <section style={{ position: "relative", minHeight: "78vh", overflow: "hidden" }}>
          <Skiper39 />
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 1,
              pointerEvents: "none",
              background:
                `linear-gradient(180deg, ${PAPER} 0%, rgba(247,251,249,0.86) 18%, rgba(247,251,249,0.22) 38%, rgba(247,251,249,0.06) 58%, rgba(247,251,249,0.12) 78%, rgba(247,251,249,0.88) 94%, ${PAPER} 100%)`,
            }}
          />
          <div
            style={{
              position: "relative",
              zIndex: 2,
              maxWidth: 1040,
              margin: "0 auto",
              padding: "72px 28px 168px",
            }}
          >
            <p
              style={{
                fontSize: 11,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: ACCENT,
                fontWeight: 650,
              }}
            >
              Talent discovery
            </p>
            <h1
              style={{
                fontSize: "clamp(40px, 5.6vw, 64px)",
                lineHeight: 1.02,
                letterSpacing: "-0.04em",
                fontWeight: 600,
                margin: "12px 0 16px",
                maxWidth: 680,
              }}
            >
              사람을 찾는 화면을
              <br />
              유리처럼 열어두다
            </h1>
            <p style={{ maxWidth: "28em", lineHeight: 1.65, color: "rgba(16,35,28,0.62)", fontSize: 16 }}>
              이름과 스킬로 찾고, 폴더를 열어 사람과 작업을 같이 본다.
            </p>
            <div style={{ marginTop: 28, maxWidth: 520 }}>
              <GlassCard radius={22} rimWidth={10} blur={16} tint="oklch(0.99 0.014 175 / 0.28)">
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="이름, 스킬, 직함"
                    style={{
                      width: "100%",
                      border: 0,
                      outline: "none",
                      background: "transparent",
                      fontSize: 15,
                      color: INK,
                    }}
                  />
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {(["all", "developer", "designer"] as const).map((key) => (
                      <button
                        key={key}
                        onClick={() => setRole(key)}
                        style={{
                          border: 0,
                          borderRadius: 999,
                          padding: "6px 12px",
                          fontSize: 11,
                          cursor: "pointer",
                          background: role === key ? ACCENT : "rgba(15,118,110,0.10)",
                          color: role === key ? "#fff" : ACCENT,
                          fontWeight: role === key ? 650 : 500,
                        }}
                      >
                        {key === "all" ? "전체" : key === "developer" ? "개발" : "디자인"}
                      </button>
                    ))}
                  </div>
                </div>
              </GlassCard>
            </div>
          </div>
        </section>

        <section
          style={{
            position: "relative",
            zIndex: 3,
            padding: "12px 28px 120px",
            background: `linear-gradient(180deg, rgba(247,251,249,0.72) 0%, ${PAPER} 64px)`,
          }}
        >
          <div style={{ maxWidth: 1180, margin: "0 auto" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 28,
                gap: 16,
              }}
            >
              <h2 style={{ fontSize: 20, letterSpacing: "-0.03em", fontWeight: 600 }}>폴더</h2>
              <span style={{ fontSize: 12, color: "rgba(16,35,28,0.42)" }}>{list.length}명</span>
            </div>
            {list.length === 0 ? (
              <p style={{ fontSize: 14, color: "rgba(16,35,28,0.42)", padding: "48px 0" }}>
                해당하는 폴더가 없습니다.
              </p>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                  gap: "44px 28px",
                  justifyItems: "center",
                }}
              >
                {list.map((c, i) => (
                  <ProfileFolderCard key={c.id} candidate={c} delay={i * 70} palette={FOLDER_PALETTES.spec} />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </DemoChrome>
  );
}
