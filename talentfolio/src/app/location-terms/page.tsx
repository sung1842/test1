import { LegalPage } from "@/components/site/LegalPage";
import { BIZ, v } from "@/lib/legal";

export const metadata = { title: "위치기반서비스 이용약관 · talentfolio" };

export default function LocationTermsPage() {
  return (
    <LegalPage title="위치기반서비스 이용약관">
      <h2>제1조 (목적)</h2>
      <p>이 약관은 {v(BIZ.companyName)}가 제공하는 위치기반서비스의 이용 조건을 정합니다.</p>
      <h2>제2조 (현재 제공 범위)</h2>
      <p>현재 서비스는 단말기의 위치 정보(GPS 등)를 수집하지 않습니다. 회원이 직접 입력한 거주 지역·희망 근무 지역만 공고 추천에 씁니다.</p>
      <h2>제3조 (위치 정보를 쓰게 될 경우)</h2>
      <p>앱에서 &quot;내 주변 공고&quot; 등 단말기 위치를 쓰는 기능을 도입하면, 「위치정보의 보호 및 이용 등에 관한 법률」에 따라 사전에 신고하고 회원의 별도 동의를 받습니다. 위치 정보는 목적 달성 즉시 파기하며, 동의는 언제든 철회할 수 있습니다.</p>
      <h2>제4조 (위치정보관리책임자)</h2>
      <p>{v(BIZ.privacyOfficer)} · {BIZ.privacyOfficerContact || BIZ.email}</p>
      <p className="legal-note">이 약관은 초안입니다. 게시 전 법률 검토를 받아야 합니다.</p>
    </LegalPage>
  );
}
