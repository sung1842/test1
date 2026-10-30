import { getJdAnalyzerUrl, isJdAnalyzerConfigured } from "@/lib/features";
import type { JobPost } from "@/lib/productData";

/** jd-fit-analyzer GET /api/public/job-postings 응답 (크롤 검수에서 승인된 공고만) */
interface PublicJobPosting {
  id: string;
  source: string;
  url: string | null;
  company: string | null;
  title: string;
  skills: string[];
  location: string | null;
  employmentType: string | null;
  experienceLevel: string | null;
  salary: string | null;
  expiresAt: string | null;
}

function toJobPost(p: PublicJobPosting): JobPost {
  return {
    id: p.id,
    company: p.company ?? "회사명 미기재",
    title: p.title,
    location: p.location ?? "지역 미기재",
    stack: p.skills,
    note: [p.experienceLevel, p.employmentType, p.salary].filter(Boolean).join(" · "),
    url: p.url ?? undefined,
    deadline: p.expiresAt ? p.expiresAt.slice(0, 10) : undefined,
  };
}

/**
 * 승인된 크롤 공고. jd-fit-analyzer 미연결(데모 배포)이면 null → 호출부가 샘플 공고로 대체한다.
 * 연결됐는데 실패하면 throw (화면에 오류 표시).
 */
export async function fetchPublicJobPosts(): Promise<JobPost[] | null> {
  if (!isJdAnalyzerConfigured()) return null;
  const base = getJdAnalyzerUrl();
  if (!base) return null;
  const res = await fetch(`${base}/api/public/job-postings?limit=200`);
  if (!res.ok) throw new Error(`공고 목록을 불러오지 못했습니다 (HTTP ${res.status})`);
  const data = (await res.json()) as { postings?: PublicJobPosting[] };
  return (data.postings ?? []).map(toJobPost);
}
