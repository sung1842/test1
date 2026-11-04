/**
 * 회원가입 직군. 크롤러가 쓰는 공고 상위 직무 분류와 같은 목록이다
 * (jd-fit-analyzer/crawler/jdcrawler/platforms/board_a.py TOP_CATEGORIES). 바꿀 때 둘을 같이 고칠 것.
 */
export const JOB_CATEGORIES = [
  "기획·전략", "마케팅·홍보·조사", "회계·세무·재무", "인사·노무·HRD", "총무·법무·사무", "IT개발·데이터",
  "디자인", "영업·판매·무역", "고객상담·TM", "구매·자재·물류", "상품기획·MD", "운전·운송·배송",
  "서비스", "생산", "건설·건축", "의료", "연구·R&D", "교육", "미디어·문화·스포츠", "금융·보험", "공공·복지",
] as const;

export type JobCategory = (typeof JOB_CATEGORIES)[number];

export function isJobCategory(v: unknown): v is JobCategory {
  return typeof v === "string" && (JOB_CATEGORIES as readonly string[]).includes(v);
}

/** profiles.role 은 기존 화면이 developer/designer 두 값만 다루므로 직군을 거기에 접어 넣는다. */
export function legacyRoleOf(category: JobCategory): "developer" | "designer" {
  return category === "디자인" ? "designer" : "developer";
}
