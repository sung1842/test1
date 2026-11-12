import { DSkeleton } from "@/components/desk/console/ui";

// 화면 코드를 받는 동안 본문 자리에 보이는 로딩 (사이드바는 layout 이 유지)
export default function Loading() {
  return <DSkeleton rows={4} label="화면을 여는 중" />;
}
