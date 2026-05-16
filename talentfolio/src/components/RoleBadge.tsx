interface RoleBadgeProps {
  role: "developer" | "designer";
}

export default function RoleBadge({ role }: RoleBadgeProps) {
  const isDev = role === "developer";
  return (
    <span
      style={{
        backgroundColor: isDev ? "rgba(167,139,250,0.15)" : "rgba(251,146,60,0.15)",
        color: isDev ? "var(--dev-color)" : "var(--des-color)",
        border: `1px solid ${isDev ? "rgba(167,139,250,0.35)" : "rgba(251,146,60,0.35)"}`,
        fontFamily: "JetBrains Mono, monospace",
      }}
      className="text-xs px-2.5 py-1 rounded-full font-medium"
    >
      {isDev ? "개발자" : "디자이너"}
    </span>
  );
}
