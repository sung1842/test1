import { SkeletonList } from "@/components/state/StateView";

// 화면 코드를 받는 동안 탭 줄 아래에 보이는 로딩 (헤더·탭은 DeskFrame 이 유지)
export default function Loading() {
  return (
    <div className="dk-route-loading" aria-busy="true">
      <SkeletonList rows={4} label="화면을 여는 중" />
    </div>
  );
}
