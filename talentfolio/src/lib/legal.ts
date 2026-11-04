/**
 * 푸터·법적 고지 페이지가 함께 쓰는 사업자 정보.
 * 사업자 등록 전이라 값이 비어 있다 — 채우면 푸터와 모든 고지 페이지에 한 번에 반영된다.
 * 빈 값은 화면에 "등록 예정" 으로 보인다.
 */
export const BIZ = {
  serviceName: "talentfolio",
  companyName: "", // 상호
  ceo: "", // 대표자
  bizRegNo: "", // 사업자등록번호 (숫자 10자리, 하이픈 없이도 됨)
  mailOrderNo: "", // 통신판매업 신고번호
  jobInfoNo: "", // 직업정보제공사업 신고번호 (직업안정법)
  address: "", // 사업장 주소
  phone: "", // 고객센터 전화
  email: "sungwoo0723@naver.com", // 문의 이메일
  hosting: "", // 호스팅 서비스 제공자
  privacyOfficer: "", // 개인정보 보호책임자 이름
  privacyOfficerContact: "", // 보호책임자 연락처 (비우면 문의 이메일)
  hours: "평일 10:00–18:00 (주말·공휴일 휴무)",
  effectiveDate: "2026-11-04", // 약관·방침 시행일
  appStoreUrl: "", // 출시 후 App Store 주소
  playStoreUrl: "", // 출시 후 Google Play 주소
  social: [] as { label: string; href: string }[], // 예: { label: "Instagram", href: "https://..." }
};

export const TBD = "등록 예정";
export const v = (s: string) => (s.trim() ? s : TBD);

/** 공정위 사업자정보 확인 (번호가 있을 때만) */
export function bizCheckUrl(): string | null {
  const no = BIZ.bizRegNo.replace(/\D/g, "");
  return no.length === 10 ? `https://www.ftc.go.kr/bizCommPop.do?wrkr_no=${no}` : null;
}

export const LEGAL_LINKS = [
  { href: "/terms", label: "이용약관" },
  { href: "/privacy", label: "개인정보처리방침", strong: true },
  { href: "/location-terms", label: "위치기반서비스 이용약관" },
  { href: "/youth-policy", label: "청소년보호정책" },
  { href: "/support", label: "고객센터" },
  { href: "/account-deletion", label: "계정 삭제 안내" },
] as const;
