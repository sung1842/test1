"use client";

import { useMemo, useState } from "react";
import { Instrument_Serif } from "next/font/google";
import candidatesData from "@/data/candidates.json";
import type { Candidate } from "@/types/candidate";
import { DemoChrome } from "@/components/demo/shared/DemoChrome";
import { Skiper39 } from "@/components/demo/shared/skiper39";
import { FOLDER_PALETTES, ProfileFolderCard } from "@/components/demo/shared/ProfileFolderCard";

const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

const INK = "#161513";
const PAPER = "#F6F3ED";
const staticCandidates = candidatesData as Candidate[];

const DESK = [
  { r: -5.4, y: 28, s: 1.06, z: 3 },
  { r: 3.6, y: 4, s: 0.9, z: 1 },
  { r: -1.8, y: 40, s: 1.0, z: 2 },
  { r: 5.8, y: 12, s: 0.86, z: 1 },
  { r: -4.2, y: 32, s: 1.08, z: 4 },
  { r: 2.1, y: 0, s: 0.94, z: 2 },
  { r: -6.2, y: 20, s: 1.02, z: 3 },
  { r: 4.4, y: 36, s: 0.88, z: 1 },
  { r: -2.6, y: 8, s: 1.1, z: 5 },
  { r: 5.0, y: 24, s: 0.92, z: 2 },
] as const;

export default function MasterpieceDemoPage() {
  const [query, setQuery] = useState("");
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return staticCandidates;
    return staticCandidates.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.skills.some((s) => s.toLowerCase().includes(q)),
    );
  }, [query]);

  return (
    <DemoChrome variant="masterpiece" accent={INK}>
      <style>{`
        .demo-masterpiece { color: ${INK}; background: ${PAPER}; }
        .demo-masterpiece .demo-topbar {
          padding: 14px 28px;
          background: transparent;
          border-bottom: 0;
          backdrop-filter: none;
        }
        .demo-masterpiece .demo-back { opacity: 0.38; }
      `}</style>

      <div
        className={serif.className}
        style={{
          minHeight: "100vh",
          color: INK,
          background:
            "radial-gradient(900px 420px at 50% 118%, rgba(40,32,24,0.10), transparent 70%), linear-gradient(180deg, #F7F4EE 0%, #F0EBE3 48%, #E8E2D6 100%)",
        }}
      >
        <section style={{ position: "relative", minHeight: "86vh", overflow: "hidden" }}>
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: "58%",
              opacity: 0.16,
              pointerEvents: "none",
              WebkitMaskImage: "linear-gradient(to top, black 18%, transparent 100%)",
              maskImage: "linear-gradient(to top, black 18%, transparent 100%)",
            }}
          >
            <Skiper39 />
          </div>

          <div
            aria-hidden
            style={{
              position: "absolute",
              top: 48,
              left: "4%",
              width: "min(820px, 86vw)",
              height: 520,
              borderRadius: 64,
              background: "rgba(255,255,255,0.18)",
              backdropFilter: "blur(36px) saturate(130%)",
              boxShadow: "none",
              pointerEvents: "none",
            }}
          />

          <div
            style={{
              position: "relative",
              zIndex: 2,
              maxWidth: 1240,
              margin: "0 auto",
              padding: "92px 28px 0",
            }}
          >
            <p
              style={{
                fontSize: 16,
                fontStyle: "italic",
                opacity: 0.48,
                margin: 0,
              }}
            >
              A desk of people, not a feed of cards.
            </p>
            <h1
              style={{
                fontSize: "clamp(64px, 9vw, 112px)",
                lineHeight: 0.88,
                letterSpacing: "-0.055em",
                fontWeight: 400,
                margin: "18px 0 0",
                maxWidth: 920,
              }}
            >
              Quiet glass.
              <br />
              Loud talent.
            </h1>

            <label
              style={{
                display: "block",
                marginTop: 56,
                maxWidth: 420,
                borderBottom: "1px solid rgba(22,21,19,0.22)",
                paddingBottom: 10,
              }}
            >
              <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
                Search
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Who are you looking for?"
                style={{
                  width: "100%",
                  border: 0,
                  outline: "none",
                  background: "transparent",
                  fontSize: 20,
                  fontFamily: "inherit",
                  color: INK,
                  padding: 0,
                }}
              />
            </label>
          </div>
        </section>

        <section style={{ position: "relative", zIndex: 3, padding: "56px 28px 140px" }}>
          <div style={{ maxWidth: 1240, margin: "0 auto" }}>
            <p
              style={{
                fontSize: 15,
                fontStyle: "italic",
                opacity: 0.42,
                margin: "0 0 8px",
              }}
            >
              {list.length} on the desk
            </p>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                columnGap: 0,
                rowGap: 56,
                paddingTop: 28,
                filter: "drop-shadow(0 28px 28px rgba(40,32,24,0.10))",
              }}
            >
              {list.map((c, i) => {
                const pose = DESK[i % DESK.length];
                return (
                  <div
                    key={c.id}
                    style={{
                      margin: "0 -22px",
                      transform: `rotate(${pose.r}deg) translateY(${pose.y}px) scale(${pose.s})`,
                      transformOrigin: "50% 86%",
                      zIndex: pose.z,
                    }}
                  >
                    <ProfileFolderCard candidate={c} delay={i * 80} palette={FOLDER_PALETTES.masterpiece} />
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </DemoChrome>
  );
}
