import { LegalPage } from "@/components/site/LegalPage";
import { BIZ } from "@/lib/legal";

export const metadata = { title: "계정 삭제 안내 · talentfolio" };

/** 앱스토어(App Store 5.1.1(v)·Google Play 계정 삭제 정책)가 요구하는 웹 안내 페이지 */
export default function AccountDeletionPage() {
  const subject = encodeURIComponent(`[${BIZ.serviceName}] 계정 삭제 요청`);
  return (
    <LegalPage title="계정 삭제 안내" dated={false}>
      <h2>앱·웹에서 바로 탈퇴</h2>
      <ol>
        <li>구직자: 스튜디오 → 프로필 탭 맨 아래 &quot;회원 탈퇴&quot;</li>
        <li>기업: 데스크 → 설정(연동) 맨 아래 &quot;회원 탈퇴&quot;</li>
        <li>확인 문구로 <b>탈퇴</b>를 입력하면 즉시 삭제됩니다.</li>
      </ol>
      <h2>로그인할 수 없을 때</h2>
      <ol>
        <li>가입한 이메일로 <a href={`mailto:${BIZ.email}?subject=${subject}`}>{BIZ.email}</a>에 &quot;계정 삭제 요청&quot;을 보내 주세요.</li>
        <li>본인 확인 후 영업일 기준 7일 안에 삭제하고 결과를 메일로 알려 드립니다.</li>
      </ol>
      <h2>삭제되는 정보</h2>
      <ul>
        <li>계정(이메일·이름), 프로필 사진, 이력·작업물·기록, 자기소개서, 공고 정리 내역</li>
        <li>기업 계정: 등록한 공고·스카우트 건, 분석 결과, 제안 기록</li>
      </ul>
      <h2>보관되는 정보</h2>
      <p>법령이 보존을 요구하는 정보(예: 접속 기록 3개월)는 해당 기간 동안 분리 보관한 뒤 파기합니다. 이미 기업에 전달된 제안 응답은 기업 쪽 채용 기록에 남을 수 있습니다.</p>
    </LegalPage>
  );
}
