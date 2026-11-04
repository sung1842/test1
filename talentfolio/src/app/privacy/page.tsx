import { LegalPage } from "@/components/site/LegalPage";
import { BIZ, v } from "@/lib/legal";

export const metadata = { title: "개인정보처리방침 · talentfolio" };

export default function PrivacyPage() {
  return (
    <LegalPage title="개인정보처리방침">
      <p>{v(BIZ.companyName)}(이하 &quot;회사&quot;)는 「개인정보 보호법」에 따라 이용자의 개인정보를 보호하고 관련 고충을 신속히 처리하기 위해 다음과 같이 처리방침을 둡니다.</p>
      <h2>1. 처리하는 개인정보 항목</h2>
      <table><tbody>
        <tr><th>공통 (필수)</th><td>이메일, 비밀번호(암호화), 이름, 계정 유형</td></tr>
        <tr><th>구직자 (선택)</th><td>사진, 연락처, 거주 지역, 학력·경력·자격·어학, 희망 근무 조건, 작업물·기록</td></tr>
        <tr><th>기업 (필수)</th><td>담당자 이름·이메일, 회사명, 채용 공고 내용</td></tr>
        <tr><th>자동 수집</th><td>접속 기록, 쿠키(로그인 유지), 기기·브라우저 정보</td></tr>
      </tbody></table>
      <h2>2. 처리 목적</h2>
      <ul>
        <li>회원 관리와 본인 확인</li>
        <li>구직자-공고 매칭, AI 적합도 분석, 기업 제안 전달 (구직자가 &quot;기업 매칭 노출&quot;에 동의한 경우에만)</li>
        <li>고객 문의 응대, 서비스 개선, 부정 이용 방지</li>
      </ul>
      <h2>3. 보유·이용 기간</h2>
      <p>회원 탈퇴 시 지체 없이 파기합니다. 단, 관련 법령이 보존을 요구하는 정보는 해당 기간 동안 보관합니다 (예: 전자상거래법상 계약·청약철회 기록 5년, 접속 기록 3개월).</p>
      <h2>4. 제3자 제공</h2>
      <p>구직자가 공개를 허용한 항목은 기업 회원에게 보여집니다. 연락처는 구직자가 기업의 연락을 수락한 뒤에만 공개됩니다. 그 밖에는 법령에 근거가 있는 경우를 빼고 제3자에게 제공하지 않습니다.</p>
      <h2>5. 처리 위탁</h2>
      <table><tbody>
        <tr><th>데이터 저장·인증</th><td>Supabase Inc.</td></tr>
        <tr><th>AI 분석</th><td>Google LLC (Gemini), Anthropic PBC (Claude)</td></tr>
        <tr><th>호스팅</th><td>{v(BIZ.hosting)}</td></tr>
      </tbody></table>
      <p>일부 수탁자는 국외(미국 등)에서 개인정보를 처리합니다. 이전 국가·일시·방법 등 국외 이전 세부 사항은 시행 전에 이 방침에 추가합니다.</p>
      <h2>6. 자동화된 결정</h2>
      <p>AI는 후보 추천과 적합도 분석에 쓰이며, 최종 연락·채용 판단은 기업 담당자가 직접 합니다. 이용자는 분석 결과에 대한 설명을 요구하거나 거부할 수 있습니다.</p>
      <h2>7. 이용자의 권리</h2>
      <p>이용자는 언제든 개인정보 열람·정정·삭제·처리정지를 요구할 수 있고, 스튜디오에서 공개 범위와 동의를 직접 바꿀 수 있습니다. 탈퇴는 <a href="/account-deletion">계정 삭제 안내</a>를 참고하세요.</p>
      <h2>8. 파기 절차와 방법</h2>
      <p>전자 파일은 복구할 수 없는 방법으로 삭제하고, 출력물은 분쇄하거나 소각합니다.</p>
      <h2>9. 안전성 확보 조치</h2>
      <p>비밀번호 암호화, 접근 권한 최소화(계정 유형별 접근 제한), 전송 구간 암호화(HTTPS), 접속 기록 보관을 시행합니다.</p>
      <h2>10. 쿠키</h2>
      <p>로그인 상태 유지를 위해 쿠키를 씁니다. 브라우저 설정에서 거부할 수 있으나, 이 경우 로그인이 필요한 기능을 이용할 수 없습니다.</p>
      <h2>11. 개인정보 보호책임자</h2>
      <table><tbody>
        <tr><th>책임자</th><td>{v(BIZ.privacyOfficer)}</td></tr>
        <tr><th>연락처</th><td>{BIZ.privacyOfficerContact || BIZ.email}</td></tr>
      </tbody></table>
      <p>개인정보 침해 신고·상담: 개인정보침해신고센터(privacy.kisa.or.kr, 국번 없이 118), 개인정보분쟁조정위원회(kopico.go.kr, 1833-6972).</p>
      <p className="legal-note">이 방침은 초안입니다. 게시 전 법률 검토를 받아야 합니다.</p>
    </LegalPage>
  );
}
