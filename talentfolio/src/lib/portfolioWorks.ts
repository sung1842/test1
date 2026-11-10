/** 포트폴리오 작업물 (/api/profile/works). 공개 버킷이라 누구나 uid 로 읽을 수 있다 */
export interface PortfolioWork {
  id: string;
  title: string;
  description: string;
  role: string;
  tools: string[];
  year: string;
  url: string;
  images: string[];
  created_at: string;
}

export const WORK_ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

export async function loadWorks(uid: string): Promise<PortfolioWork[]> {
  const res = await fetch(`/api/profile/works?uid=${encodeURIComponent(uid)}`, { cache: "no-store" });
  if (!res.ok) throw new Error("작업물을 불러오지 못했어요");
  return ((await res.json()) as { works?: PortfolioWork[] }).works ?? [];
}

export async function uploadWork(form: FormData): Promise<PortfolioWork> {
  const res = await fetch("/api/profile/works", { method: "POST", body: form });
  const data = (await res.json().catch(() => ({}))) as { work?: PortfolioWork; error?: string };
  if (!res.ok || !data.work) throw new Error(data.error ?? "작업물을 올리지 못했어요");
  return data.work;
}

export async function deleteWork(id: string): Promise<void> {
  const res = await fetch(`/api/profile/works?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok) throw new Error("작업물을 지우지 못했어요");
}

/** 서버 컴포넌트용: 공개 버킷의 목록 파일을 직접 읽는다 (없으면 빈 목록) */
export async function fetchPublicWorks(uid: string): Promise<PortfolioWork[]> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!base || !/^[0-9a-f-]{36}$/i.test(uid)) return [];
  try {
    const res = await fetch(`${base}/storage/v1/object/public/works/${uid}/works.json?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return [];
    const list = await res.json();
    return Array.isArray(list) ? (list as PortfolioWork[]) : [];
  } catch {
    return [];
  }
}
