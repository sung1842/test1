interface RoleBadgeProps {
  role: "developer" | "designer";
}

export default function RoleBadge({ role }: RoleBadgeProps) {
  const isDev = role === "developer";
  return (
    <span
      style={{
        backgroundColor: isDev ? "rgba(246,4,46,0.12)" : "rgba(255,174,46,0.1)",
        color: isDev ? "#f6042e" : "#ffae2e",
        border: `1px solid ${isDev ? "rgba(246,4,46,0.35)" : "rgba(255,174,46,0.3)"}`,
        fontFamily: "JetBrains Mono, monospace",
      }}
      className="text-xs px-2.5 py-1 rounded-full font-medium"
    >
      {isDev ? "개발자" : "디자이너"}
    </span>
  );
}
