"use client";

import GlassFolder from "@/components/demo/shared/glass-folder-cards";
import type { Candidate } from "@/types/candidate";

function getCardImage(id: string, offset = 0): string {
  const num = parseInt(id, 10);
  const hash = Number.isNaN(num)
    ? id.replace(/-/g, "").split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
    : num - 1;
  const n = ((hash + offset) % 12) + 1;
  return `/slides/${n}.webp`;
}

export type FolderPalette = {
  avatarDev: string;
  avatarDes: string;
  chipBg: string;
  chipInk: string;
};

export const FOLDER_PALETTES = {
  spec: {
    avatarDev: "#0F766E",
    avatarDes: "#0E7490",
    chipBg: "rgba(15, 118, 110, 0.10)",
    chipInk: "#115E59",
  },
  enterprise: {
    avatarDev: "#3B6FFE",
    avatarDes: "#475569",
    chipBg: "rgba(15, 23, 42, 0.06)",
    chipInk: "#334155",
  },
  masterpiece: {
    avatarDev: "#161513",
    avatarDes: "#6B6256",
    chipBg: "rgba(22, 21, 19, 0.07)",
    chipInk: "#3F3A33",
  },
} satisfies Record<string, FolderPalette>;

/** Product Avatar uses midnight CSS vars; those wash out to a crimson smear on milk glass. */
function LightGlassAvatar({
  name,
  avatar,
  role,
  palette,
}: {
  name: string;
  avatar: string;
  role: Candidate["role"];
  palette: FolderPalette;
}) {
  const initials = Array.from(name.replace(/\s+/g, "")).slice(0, 2).join("");
  const isDev = role === "developer";
  const fill = isDev ? palette.avatarDev : palette.avatarDes;

  return (
    <div
      aria-hidden
      style={{
        width: 42,
        height: 42,
        borderRadius: 999,
        overflow: "hidden",
        flexShrink: 0,
        display: "grid",
        placeItems: "center",
        background: avatar ? "#fff" : fill,
        border: avatar ? `1.5px solid ${fill}` : "1.5px solid rgba(255,255,255,0.55)",
        color: "#fff",
        fontSize: initials.length > 1 ? 13 : 16,
        fontWeight: 650,
        letterSpacing: "-0.04em",
        lineHeight: 1,
        boxShadow: "0 1px 2px rgba(16,35,28,0.12)",
      }}
    >
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        initials
      )}
    </div>
  );
}

export function ProfileFolderCard({
  candidate,
  delay = 0,
  onOpen,
  palette = FOLDER_PALETTES.spec,
}: {
  candidate: Candidate;
  delay?: number;
  onOpen?: (candidate: Candidate) => void;
  palette?: FolderPalette;
}) {
  const project = getCardImage(candidate.id, 0);
  const files = [
    { name: candidate.skills[0] || "Project 01", meta: "대표 작업", image: getCardImage(candidate.id, 1) },
    { name: candidate.skills[1] || "Project 02", meta: "케이스", image: getCardImage(candidate.id, 2) },
    { name: candidate.skills[2] || "Project 03", meta: "포트폴리오", image: getCardImage(candidate.id, 3) },
  ];

  return (
    <GlassFolder
      tall
      tone="light"
      action="none"
      label={candidate.name}
      meta={candidate.title}
      image={project}
      files={files}
      appearDelay={delay}
      width={300}
      art="glacier"
      onOpenChange={(open) => {
        if (open) onOpen?.(candidate);
      }}
      frontContent={
        <div className="flex flex-col gap-2" style={{ color: "#10231c", minWidth: 0 }}>
          <LightGlassAvatar name={candidate.name} avatar={candidate.avatar} role={candidate.role} palette={palette} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 650, letterSpacing: "-0.02em", lineHeight: 1.15 }}>
              {candidate.name}
            </div>
            <div style={{ fontSize: 11, opacity: 0.62, marginTop: 2 }}>{candidate.title}</div>
          </div>
          <p
            style={{
              fontSize: 12,
              lineHeight: 1.45,
              opacity: 0.78,
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {candidate.shortBio}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {candidate.skills.slice(0, 3).map((skill) => (
              <span
                key={skill}
                style={{
                  fontSize: 10,
                  padding: "3px 7px",
                  borderRadius: 999,
                  background: palette.chipBg,
                  color: palette.chipInk,
                }}
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      }
    />
  );
}
