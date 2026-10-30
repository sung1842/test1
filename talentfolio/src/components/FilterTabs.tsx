"use client";

type FilterType = "all" | "developer" | "designer";

interface FilterTabsProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  counts: { all: number; developer: number; designer: number };
}

const tabs: { label: string; value: FilterType }[] = [
  { label: "전체", value: "all" },
  { label: "개발자", value: "developer" },
  { label: "디자이너", value: "designer" },
];

export default function FilterTabs({
  activeFilter,
  onFilterChange,
  counts,
}: FilterTabsProps) {
  return (
    <div
      style={{ borderBottom: "1px solid var(--border-color)" }}
      className="px-6 overflow-x-auto"
    >
      <div className="max-w-7xl mx-auto flex items-center gap-1 min-w-max sm:min-w-0">
        {tabs.map((tab) => {
          const isActive = activeFilter === tab.value;
          const activeLine =
            tab.value === "developer" ? "var(--dev-color)" : tab.value === "designer" ? "var(--des-color)" : "var(--accent)";
          const activeBadgeBg =
            tab.value === "developer" ? "rgba(var(--dev-color-rgb), 0.15)" : tab.value === "designer" ? "rgba(var(--des-color-rgb), 0.15)" : "rgba(var(--accent-rgb), 0.15)";
          const activeBadgeColor =
            tab.value === "developer" ? "var(--dev-color)" : tab.value === "designer" ? "var(--des-color)" : "var(--accent)";

          return (
            <button
              key={tab.value}
              onClick={() => onFilterChange(tab.value)}
              style={{
                color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                borderBottom: isActive
                  ? `2px solid ${activeLine}`
                  : "2px solid transparent",
                fontFamily: "Pretendard Variable, sans-serif",
              }}
              className="flex items-center gap-2 px-4 py-4 text-sm font-medium transition-all duration-200 hover:text-[var(--text-primary)]"
            >
              {tab.label}
              <span
                style={{
                  backgroundColor: isActive ? activeBadgeBg : "var(--tag-bg)",
                  color: isActive ? activeBadgeColor : "var(--text-secondary)",
                  fontFamily: "Pretendard Variable, sans-serif",
                }}
                className="text-xs px-2 py-0.5 rounded-full"
              >
                {counts[tab.value]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
