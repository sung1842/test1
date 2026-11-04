export type WorkItem = {
  id: string;
  title: string;
  kind: "case" | "shot" | "repo";
  note: string;
  image: string;
};

export type JobPost = {
  id: string;
  company: string;
  title: string;
  location: string;
  stack: string[];
  note: string;
  url?: string; // 원문 공고 (크롤 공고)
  deadline?: string; // YYYY-MM-DD
};

export type JobLane = "watch" | "apply" | "hold";

export type CompanyBrief = {
  id: string;
  company: string;
  role: string;
  must: string[];
  people: string[];
};

export const SEED_WORKS: WorkItem[] = [
  { id: "w1", title: "SaaS billing console", kind: "case", note: "구독·정산 화면. Next + Node.", image: "/slides/1.webp" },
  { id: "w2", title: "3D product lookbook", kind: "shot", note: "Three.js 인터랙션 컷.", image: "/slides/2.webp" },
  { id: "w3", title: "Open-source CLI", kind: "repo", note: "배포 파이프라인 정리.", image: "/slides/3.webp" },
];

export const JOBS: JobPost[] = [
  { id: "j1", company: "Northline", title: "Frontend Engineer", location: "서울 · Hybrid", stack: ["React", "TypeScript", "Next.js"], note: "디자인 시스템 리빌드" },
  { id: "j2", company: "Harbor", title: "Product Designer", location: "원격", stack: ["Figma", "UX Research"], note: "B2B 온보딩 개편" },
  { id: "j3", company: "Kite", title: "Backend Engineer", location: "판교", stack: ["Go", "Kubernetes"], note: "이벤트 파이프라인" },
  { id: "j4", company: "Lumen", title: "iOS Engineer", location: "서울", stack: ["Swift", "SwiftUI"], note: "앱 리디자인 동반" },
  { id: "j5", company: "Orchid", title: "AI Engineer", location: "서울 · Hybrid", stack: ["Python", "PyTorch"], note: "사내 검색 RAG" },
  { id: "j6", company: "Fieldnote", title: "Brand Designer", location: "성수", stack: ["Illustrator", "Motion"], note: "시리즈 A 리브랜딩" },
];

export const SEED_BRIEFS: CompanyBrief[] = [
  { id: "b1", company: "Northline", role: "시니어 프론트 · 시리즈 B", must: ["React", "TypeScript", "디자인시스템"], people: ["001", "002"] },
  { id: "b2", company: "Harbor", role: "프로덕트 디자이너", must: ["B2B", "리서치", "Figma"], people: ["007"] },
];

export function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}


export const KIND_LABEL: Record<WorkItem["kind"], string> = {
  case: "케이스",
  shot: "샷",
  repo: "레포",
};

export const LANE_LABEL: Record<JobLane, string> = {
  watch: "관심",
  apply: "지원할 곳",
  hold: "보류",
};

export function skillHit(skill: string, needles: string[]) {
  const s = skill.trim().toLowerCase();
  // 빈 직함·소개("")는 모든 조건의 부분 문자열이라 전부 충족으로 잡혔다 → 빈 값·한 글자는 매칭하지 않는다
  if (s.length < 2) return false;
  return needles.some((n) => {
    const q = n.trim().toLowerCase();
    if (q.length < 2) return false;
    return s.includes(q) || q.includes(s);
  });
}
