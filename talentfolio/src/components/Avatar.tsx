"use client";

interface AvatarProps {
  name: string;
  avatar: string;
  size?: "sm" | "md" | "lg";
  role: "developer" | "designer";
}

const sizeMap = {
  sm: { container: "w-10 h-10", text: "text-base" },
  md: { container: "w-14 h-14", text: "text-xl" },
  lg: { container: "w-20 h-20", text: "text-3xl" },
};

export default function Avatar({ name, avatar, size = "md", role }: AvatarProps) {
  const initials = Array.from(name.trim())[0] ?? "?";

  const { container, text } = sizeMap[size];
  // 메인 랜딩 후보 아바타와 같은 문법: 하늘 계열 배경 + 손글씨 이니셜. 같은 이름이면 항상 같은 색.
  const tints = ["#DCEBFF", "#BFDDFF", "#FFE7A3", "#EFE4FA"];
  const hash = Array.from(name).reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const bgColor = tints[hash % tints.length];
  const textColor = role === "developer" ? "var(--dev-color)" : "var(--des-color)";

  if (avatar) {
    return (
      <div
        className={`${container} rounded-full overflow-hidden flex-shrink-0`}
        style={{ border: `2px solid var(--border-color)` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatar} alt={name} className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div
      className={`${container} rounded-full flex items-center justify-center flex-shrink-0`}
      style={{
        backgroundColor: bgColor,
        fontFamily: "var(--f-hand)",
        color: textColor,
      }}
    >
      <span className={text} style={{ fontSize: "1.35em", lineHeight: 1 }} aria-hidden="true">{initials}</span>
    </div>
  );
}
