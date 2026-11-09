import { redirect } from "next/navigation";

// Slack 발송 승인 화면은 웹에서 노출하지 않는다 (2026-11-10). 후보 결정은 승인함에서.
// 이전 화면 코드는 git 기록에 남아 있다.
export default function SlackReviewRedirect() {
  redirect("/review");
}
