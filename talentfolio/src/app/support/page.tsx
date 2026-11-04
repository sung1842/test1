import { LegalPage } from "@/components/site/LegalPage";
import { BIZ, v } from "@/lib/legal";

export const metadata = { title: "고객센터 · talentfolio" };

export default function SupportPage() {
  return (
    <LegalPage title="고객센터" dated={false}>
      <table><tbody>
        <tr><th>이메일</th><td><a href={`mailto:${BIZ.email}`}>{BIZ.email}</a></td></tr>
        <tr><th>전화</th><td>{v(BIZ.phone)}</td></tr>
        <tr><th>운영 시간</th><td>{BIZ.hours}</td></tr>
      </tbody></table>
      <h2>Q. 구직자 계정과 기업 계정을 바꿀 수 있나요?</h2>
      <p>계정 유형은 가입 때 정해지며 바꿀 수 없습니다. 다른 유형이 필요하면 다른 이메일로 새로 가입해 주세요.</p>
      <h2>Q. 내 정보가 기업에 어디까지 보이나요?</h2>
      <p>스튜디오의 프로필 탭에서 항목마다 공개 여부를 고를 수 있습니다. 연락처는 기업의 연락을 수락한 뒤에만 공개됩니다.</p>
      <h2>Q. AI 분석 결과에 이의가 있어요.</h2>
      <p>이메일로 설명을 요청하시면 30일 안에 답합니다. 채용 연락은 언제나 기업 담당자가 직접 판단해서 보냅니다.</p>
      <h2>Q. 탈퇴하고 싶어요.</h2>
      <p><a href="/account-deletion">계정 삭제 안내</a>를 참고하세요.</p>
    </LegalPage>
  );
}
