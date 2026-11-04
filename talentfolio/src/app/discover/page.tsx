import { redirect } from "next/navigation";

// 인재 탐색은 데스크 인재 작업대 한 곳으로 모은다 (2026-11-03).
// 옛 /discover 는 같은 후보 풀을 보여주면서 「건에 담기」가 없고 구 SNS「메시지」만 있어 흐름이 갈렸다.
export default function DiscoverRedirect() {
  redirect("/desk/candidates");
}
