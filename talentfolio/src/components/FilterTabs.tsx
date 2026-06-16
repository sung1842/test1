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
          return (
            <button
              key={tab.value}
              onClick={() => onFilterChange(tab.value)}
              style={{
                color: isActive ? "#f5ede4" : "var(--text-secondary)",
                borderBottom: isActive
                  ? "2px solid #f5ede4"
                  : "2px solid transparent",
                fontFamily: "DM Sans, sans-serif",
              }}
              className="flex items-center gap-2 px-4 py-4 text-sm font-medium transition-all duration-200 hover:text-[var(--text-primary)]"
            >
              {tab.label}
              <span
                style={{
                  backgroundColor: isActive
                    ? "rgba(245,237,228,0.18)"
                    : "var(--tag-bg)",
                  color: isActive ? "#f5ede4" : "var(--text-secondary)",
                  fontFamily: "JetBrains Mono, monospace",
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
