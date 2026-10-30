import { StateView } from "@/components/state/StateView";

interface EmptyStateProps {
  query: string;
}

export default function EmptyState({ query }: EmptyStateProps) {
  return (
    <StateView
      art="search"
      title={<>&ldquo;{query}&rdquo;에 맞는 후보가 없어요</>}
      note="조건을 조금 풀어볼까요"
      body="태그를 하나 빼거나, 직군을 '전체'로 바꿔 보세요."
    />
  );
}
