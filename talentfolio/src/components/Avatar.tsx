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
  const initials = name
    .split("")
    .slice(0, 2)
    .join("");

  const { container, text } = sizeMap[size];
  const bgColor = role === "developer" ? "rgba(232,41,74,0.15)" : "rgba(196,144,110,0.15)";
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
        border: `2px solid ${textColor}30`,
        fontFamily: "DM Sans, sans-serif",
        color: textColor,
      }}
    >
      <span className={`${text} font-bold`}>{initials}</span>
    </div>
  );
}
