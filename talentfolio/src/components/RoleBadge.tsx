interface RoleBadgeProps {
  role: "developer" | "designer";
}

export default function RoleBadge({ role }: RoleBadgeProps) {
  const isDev = role === "developer";
  return (
    <span
      style={{
        backgroundColor: isDev ? "rgba(var(--dev-color-rgb), 0.12)" : "rgba(var(--des-color-rgb), 0.1)",
        color: isDev ? "var(--dev-color)" : "var(--des-color)",
        border: `1px solid ${isDev ? "rgba(var(--dev-color-rgb), 0.35)" : "rgba(var(--des-color-rgb), 0.3)"}`,
        fontFamily: "Pretendard Variable, sans-serif",
      }}
      className="text-xs px-2.5 py-1 rounded-full font-medium"
    >
      {isDev ? "개발자" : "디자이너"}
    </span>
  );
}
