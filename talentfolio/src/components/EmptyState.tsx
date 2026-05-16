import { Search } from "lucide-react";

interface EmptyStateProps {
  query: string;
}

export default function EmptyState({ query }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border-color)" }}
      >
        <Search className="w-7 h-7" style={{ color: "var(--text-secondary)" }} />
      </div>
      <h3
        style={{ fontFamily: "Syne, sans-serif", color: "var(--text-primary)" }}
        className="text-lg font-semibold mb-2"
      >
        찾을 수 없습니다
      </h3>
      <p style={{ color: "var(--text-secondary)" }} className="text-sm max-w-xs">
        &ldquo;{query}&rdquo; 에 해당하는 후보자가 없습니다. 다른 키워드로 검색해보세요.
      </p>
    </div>
  );
}
