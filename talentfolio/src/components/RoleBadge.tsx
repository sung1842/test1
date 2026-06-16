interface RoleBadgeProps {
  role: "developer" | "designer";
}

export default function RoleBadge({ role }: RoleBadgeProps) {
  const isDev = role === "developer";
  return (
    <span
      style={{
        backgroundColor: isDev ? "rgba(232,41,74,0.12)" : "rgba(196,144,110,0.12)",
        color: isDev ? "var(--dev-color)" : "var(--des-color)",
        border: `1px solid ${isDev ? "rgba(232,41,74,0.35)" : "rgba(196,144,110,0.35)"}`,
        fontFamily: "JetBrains Mono, monospace",
      }}
      className="text-xs px-2.5 py-1 rounded-full font-medium"
    >
      {isDev ? "개발자" : "디자이너"}
    </span>
  );
}
