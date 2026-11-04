import { LegalPage } from "@/components/site/LegalPage";
import { BIZ, v } from "@/lib/legal";

export const metadata = { title: "청소년보호정책 · talentfolio" };

export default function YouthPolicyPage() {
  return (
    <LegalPage title="청소년보호정책">
      <p>{v(BIZ.companyName)}는 청소년이 유해한 정보와 부당한 채용 제안으로부터 보호받도록 다음과 같이 정책을 운영합니다.</p>
      <h2>1. 유해 공고 차단</h2>
      <p>청소년 고용이 금지된 업종(「청소년 보호법」 제29조)의 공고, 근로기준법상 연소자 보호 규정에 어긋나는 공고는 등록·노출을 제한합니다.</p>
      <h2>2. 기업 회원의 의무</h2>
      <p>만 18세 미만 구직자에게 제안할 때는 근로기준법이 정한 근로시간·업종 제한과 친권자 동의 요건을 지켜야 합니다.</p>
      <h2>3. 신고와 조치</h2>
      <p>유해 공고나 부적절한 연락을 발견하면 고객센터로 신고해 주세요. 확인 즉시 공고를 내리고 해당 기업의 이용을 제한합니다.</p>
      <h2>4. 청소년보호책임자</h2>
      <p>{v(BIZ.privacyOfficer)} · {BIZ.privacyOfficerContact || BIZ.email}</p>
      <p className="legal-note">이 정책은 초안입니다. 게시 전 법률 검토를 받아야 합니다.</p>
    </LegalPage>
  );
}
