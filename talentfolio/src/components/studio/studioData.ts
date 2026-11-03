import { lifeApi } from "@/lib/lifeApi";
import { notifyProfileChanged } from "@/lib/profileNormalizeHook";
import { supabase } from "@/lib/supabase";

/**
 * /studio 데이터 (SQL 016, jd-fit-analyzer docs/architecture/sql). Supabase fit 스키마를 사용자 토큰으로 직접 읽고 쓴다.
 * 행 범위는 RLS 가 본인으로 제한한다 (공고·직군·문항은 로그인 사용자 읽기).
 * 근거 카드는 공개/철회 때 서버 잡(임베딩·캐시 무효화)이 필요해서 lifeApi(orchestrator) 를 쓴다.
 */
function fit() {
  if (!supabase) throw new Error("Supabase 가 설정되지 않았습니다");
  return supabase.schema("fit");
}
function check<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}

export type Visibility = "private" | "public";

// ---------- 이력서 ----------
export interface ResumeBasics {
  user_id: string;
  headline: string | null;
  email: string | null;
  phone: string | null;
  region_sido: string | null;
  region_sigungu: string | null;
  birth_year: number | null;
  desired_categories: string[];
  desired_regions: string[];
  desired_employment_types: string[];
  desired_salary_text: string | null;
  available_from: string | null;
  job_search_status: "active" | "open" | "closed";
  military_status: string | null;
  public_fields: string[];
}
export interface Experience {
  id: string;
  company: string;
  department: string | null;
  position_title: string | null;
  employment_type: string | null;
  start_on: string;
  end_on: string | null;
  is_current: boolean;
  duties: string | null;
  achievements: string | null;
  visibility: Visibility;
  sort: number;
}
export interface Education {
  id: string;
  school: string;
  major: string | null;
  degree: "high" | "associate" | "bachelor" | "master" | "doctor" | "other";
  status: "graduated" | "expected" | "enrolled" | "leave" | "dropped";
  start_on: string | null;
  end_on: string | null;
  gpa: string | null;
  visibility: Visibility;
  sort: number;
}
export interface Certification {
  id: string;
  kind: "license" | "language";
  name: string;
  issuer: string | null;
  score: string | null;
  acquired_on: string | null;
  visibility: Visibility;
  sort: number;
}
export interface MiscItem {
  id: string;
  kind: "project" | "award" | "training" | "activity";
  title: string;
  org: string | null;
  start_on: string | null;
  end_on: string | null;
  description: string | null;
  url: string | null;
  visibility: Visibility;
  sort: number;
}
export type ResumeTable = "resume_experiences" | "resume_educations" | "resume_certifications" | "resume_misc";

export const DEGREE_LABEL: Record<Education["degree"], string> = {
  high: "고등학교", associate: "전문학사", bachelor: "학사", master: "석사", doctor: "박사", other: "기타",
};
export const EDU_STATUS_LABEL: Record<Education["status"], string> = {
  graduated: "졸업", expected: "졸업 예정", enrolled: "재학", leave: "휴학", dropped: "중퇴",
};
export const MISC_LABEL: Record<MiscItem["kind"], string> = { project: "프로젝트", award: "수상", training: "교육 이수", activity: "대외활동" };
export const SEARCH_STATUS_LABEL: Record<ResumeBasics["job_search_status"], string> = {
  active: "적극 구직 중", open: "좋은 제안이면 검토", closed: "구직 안 함",
};

export async function loadResume(userId: string) {
  const [basics, experiences, educations, certifications, misc] = await Promise.all([
    fit().from("resume_basics").select("*").eq("user_id", userId).maybeSingle(),
    fit().from("resume_experiences").select("*").order("sort").order("start_on", { ascending: false }),
    fit().from("resume_educations").select("*").order("sort"),
    fit().from("resume_certifications").select("*").order("sort"),
    fit().from("resume_misc").select("*").order("kind").order("sort"),
  ]);
  return {
    basics: check(basics) as ResumeBasics | null,
    experiences: (check(experiences) ?? []) as Experience[],
    educations: (check(educations) ?? []) as Education[],
    certifications: (check(certifications) ?? []) as Certification[],
    misc: (check(misc) ?? []) as MiscItem[],
  };
}

export async function saveBasics(userId: string, patch: Partial<ResumeBasics>) {
  const saved = check(await fit().from("resume_basics").upsert({ ...patch, user_id: userId }).select().single()) as ResumeBasics;
  // 추천 입력(희망 직군·지역·고용형태)이 바뀌었을 때만 서버에 재계산을 요청한다. 실패해도 저장은 유지 (야간 배치가 따라잡는다)
  if (["desired_categories", "desired_regions", "desired_employment_types"].some((k) => k in patch)) {
    lifeApi.refreshRecommendations().catch(() => undefined);
  }
  notifyProfileChanged(); // 매칭 정규화 예약 (비차단, 서버 큐가 디바운스)
  return saved;
}

export async function saveItem<T extends { id?: string }>(table: ResumeTable, userId: string, item: T) {
  const row = { ...item, user_id: userId };
  if (!item.id) delete (row as { id?: string }).id;
  const saved = check(await fit().from(table).upsert(row).select().single()) as T & { id: string };
  notifyProfileChanged();
  return saved;
}

export async function deleteItem(table: ResumeTable, id: string) {
  check(await fit().from(table).delete().eq("id", id));
  notifyProfileChanged();
}

// ---------- 자기소개서 ----------
export interface Letter {
  id: string;
  kind: "base" | "posting";
  job_posting_id: string | null;
  title: string;
  visibility: Visibility;
  updated_at: string;
}
export interface LetterItem {
  id?: string;
  letter_id: string;
  seq: number;
  question_id: string | null;
  question_text: string;
  char_limit: number | null;
  answer: string;
  cited_card_ids: string[];
}
export interface EssayQuestion {
  id: string;
  job_posting_id: string;
  seq: number;
  question: string;
  char_limit: number | null;
  source: "company_page" | "manual";
  source_url: string | null;
}

/** 기본 자기소개서 1개 (기업 탐색용) — 없으면 기본 문항 3개로 만든다 */
const BASE_QUESTIONS = [
  { q: "지원 분야와 관련해 가장 자신 있는 경험을 근거와 함께 소개해 주세요.", limit: 1000 },
  { q: "어려운 문제를 해결했던 과정과 그 결과를 알려 주세요.", limit: 1000 },
  { q: "앞으로 일하고 싶은 방식과 성장 목표를 적어 주세요.", limit: 800 },
];

export async function loadLetters(userId: string) {
  let letters = (check(await fit().from("cover_letters").select("*").order("updated_at", { ascending: false })) ?? []) as Letter[];
  if (!letters.some((l) => l.kind === "base")) {
    const base = check(await fit().from("cover_letters").insert({ user_id: userId, kind: "base", title: "기본 자기소개서" }).select().single()) as Letter;
    check(await fit().from("cover_letter_items").insert(
      BASE_QUESTIONS.map((b, i) => ({ letter_id: base.id, user_id: userId, seq: i + 1, question_text: b.q, char_limit: b.limit })),
    ));
    letters = [base, ...letters];
  }
  return letters.sort((a, b) => (a.kind === "base" ? -1 : b.kind === "base" ? 1 : 0));
}

export async function loadLetterItems(letterId: string) {
  return (check(await fit().from("cover_letter_items").select("*").eq("letter_id", letterId).order("seq")) ?? []) as LetterItem[];
}

export async function saveLetterItem(userId: string, item: LetterItem) {
  const row = { ...item, user_id: userId };
  if (!item.id) delete row.id;
  return check(await fit().from("cover_letter_items").upsert(row).select().single()) as LetterItem;
}

export async function deleteLetterItem(id: string) {
  check(await fit().from("cover_letter_items").delete().eq("id", id));
}

export async function setLetterVisibility(letterId: string, visibility: Visibility) {
  check(await fit().from("cover_letters").update({ visibility }).eq("id", letterId));
}

export async function deleteLetter(letterId: string) {
  check(await fit().from("cover_letters").delete().eq("id", letterId));
}

/** 공고별 버전: 그 공고에 등록된 문항으로 시작 (없으면 빈 문항 1개) */
export async function createPostingLetter(userId: string, posting: { id: string; company: string | null; title: string }) {
  const letter = check(await fit().from("cover_letters").insert({
    user_id: userId, kind: "posting", job_posting_id: posting.id,
    title: `${posting.company ?? "회사"} · ${posting.title}`.slice(0, 160),
  }).select().single()) as Letter;
  const qs = await loadEssayQuestions(posting.id);
  const items = qs.length
    ? qs.map((q) => ({ letter_id: letter.id, user_id: userId, seq: q.seq, question_id: q.id as string | null, question_text: q.question, char_limit: q.char_limit }))
    : [{ letter_id: letter.id, user_id: userId, seq: 1, question_id: null as string | null, question_text: "문항을 입력하세요", char_limit: null as number | null }];
  check(await fit().from("cover_letter_items").insert(items));
  return letter;
}

export async function loadEssayQuestions(jobPostingId: string) {
  return (check(await fit().from("posting_essay_questions").select("*").eq("job_posting_id", jobPostingId).order("seq")) ?? []) as EssayQuestion[];
}

/** 기업 채용 홈페이지에서 본 문항을 사람이 붙여 넣는다 (자동 수집 안 함) */
export async function addEssayQuestions(
  userId: string,
  jobPostingId: string,
  questions: { question: string; char_limit: number | null }[],
  sourceUrl: string | null,
) {
  const existing = await loadEssayQuestions(jobPostingId);
  const start = existing.reduce((m, q) => Math.max(m, q.seq), 0);
  const rows = questions.map((q, i) => ({
    job_posting_id: jobPostingId, seq: start + i + 1, question: q.question, char_limit: q.char_limit,
    source: sourceUrl ? "company_page" : "manual", source_url: sourceUrl, entered_by: userId,
  }));
  return (check(await fit().from("posting_essay_questions").insert(rows).select()) ?? []) as EssayQuestion[];
}

// ---------- 공고 ----------
export interface Posting {
  id: string;
  company: string | null;
  title: string;
  url: string | null;
  skills: string[];
  location: string | null;
  employment_type: string | null;
  experience_level: string | null;
  salary: string | null;
  expires_at: string | null;
  category_codes: string[];
  career_min: number | null;
  career_max: number | null;
  newcomer_ok: boolean | null;
  education_level: string | null;
  employment_types: string[];
  region_sido: string | null;
  deadline_type: string | null;
  salary_disclosed: boolean | null;
  first_seen_at: string;
}
export type Lane = "watch" | "apply" | "hold";
export const LANE_LABEL: Record<Lane, string> = { watch: "관심", apply: "지원할 곳", hold: "보류" };

export interface PostingFilter {
  q?: string;
  categories?: string[];
  career?: "newcomer" | "1-3" | "3-5" | "5-10" | "10+" | "";
  education?: string;
  employment?: string;
  region?: string;
  salaryOpen?: boolean;
  sort?: "recent" | "deadline";
  page?: number;
}
export const PAGE_SIZE = 20;

const POSTING_COLS =
  "id, company, title, url, skills, location, employment_type, experience_level, salary, expires_at, category_codes, career_min, career_max, newcomer_ok, education_level, employment_types, region_sido, deadline_type, salary_disclosed, first_seen_at";

/** 전체 공고 + 필터 (분류 기준: 수집처 검색 필터의 직군·경력·학력·고용형태·지역) */
export async function searchPostings(f: PostingFilter) {
  let q = fit().from("job_postings").select(POSTING_COLS, { count: "exact" })
    .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`);
  if (f.q?.trim()) {
    const s = f.q.trim().replace(/[%,()]/g, " ");
    q = q.or(`title.ilike.%${s}%,company.ilike.%${s}%`);
  }
  if (f.categories?.length) q = q.overlaps("category_codes", f.categories);
  if (f.employment) q = q.contains("employment_types", [f.employment]);
  if (f.region) q = q.eq("region_sido", f.region);
  if (f.education) q = q.in("education_level", f.education === "any" ? ["any"] : ["any", "high", "associate", "bachelor", "master", "doctor"].slice(0, ["any", "high", "associate", "bachelor", "master", "doctor"].indexOf(f.education) + 1));
  if (f.salaryOpen) q = q.eq("salary_disclosed", true);
  switch (f.career) {
    case "newcomer": q = q.eq("newcomer_ok", true); break;
    case "1-3": q = q.lte("career_min", 3).or("career_max.is.null,career_max.gte.1"); break;
    case "3-5": q = q.lte("career_min", 5).or("career_max.is.null,career_max.gte.3"); break;
    case "5-10": q = q.lte("career_min", 10).or("career_max.is.null,career_max.gte.5"); break;
    case "10+": q = q.or("career_max.is.null,career_max.gte.10"); break;
  }
  q = f.sort === "deadline"
    ? q.order("expires_at", { ascending: true, nullsFirst: false })
    : q.order("first_seen_at", { ascending: false });
  const page = f.page ?? 0;
  const r = await q.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
  if (r.error) throw new Error(r.error.message);
  return { postings: (r.data ?? []) as Posting[], total: r.count ?? 0 };
}

export async function loadPostingsByIds(ids: string[]) {
  if (!ids.length) return [];
  return (check(await fit().from("job_postings").select(POSTING_COLS).in("id", ids)) ?? []) as Posting[];
}

export async function loadCategories() {
  return (check(await fit().from("job_categories").select("code, name").is("parent_id", null).order("sort_order")) ?? []) as { code: string; name: string }[];
}

export async function loadPins() {
  return (check(await fit().from("job_pins").select("job_posting_id, lane")) ?? []) as { job_posting_id: string; lane: Lane }[];
}
export async function setPin(userId: string, jobPostingId: string, lane: Lane | null) {
  if (lane === null) check(await fit().from("job_pins").delete().eq("job_posting_id", jobPostingId));
  else check(await fit().from("job_pins").upsert({ user_id: userId, job_posting_id: jobPostingId, lane }));
}

export const EDUCATION_LABEL: Record<string, string> = {
  any: "학력무관", high: "고졸", associate: "초대졸", bachelor: "대졸(4년)", master: "석사", doctor: "박사",
};
export const REGIONS = ["서울", "경기", "인천", "부산", "대구", "광주", "대전", "울산", "세종", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"];
export const EMPLOYMENT_OPTIONS = ["정규직", "계약직", "인턴", "파견직", "프리랜서"];

export function ddayLabel(expiresAt: string | null, deadlineType: string | null) {
  if (!expiresAt) return deadlineType === "rolling" ? "상시" : deadlineType === "until_filled" ? "채용 시 마감" : "";
  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
  return days <= 0 ? "D-day" : `D-${days}`;
}

// ---------- 근거 카드 ★ 대표 (SQL 017, 최대 3장 — DB 트리거가 막는다) ----------
export async function setCardFeatured(cardId: string, featured: boolean) {
  const r = await fit().from("evidence_cards").update({ featured }).eq("id", cardId);
  if (r.error) throw new Error(r.error.message.includes("3장") ? "대표 카드는 3장까지예요" : r.error.message);
}

/** "상황: … 행동: …" 처럼 여섯 칸 이름으로 시작하는 구간을 나눠 굵게 보여 줄 때 쓴다 */
const SLOT_RE = /(상황|역할|행동|어려움|결과|배운 점)\s*:\s*/g;
export function splitSlots(text: string): { label: string | null; text: string }[] {
  const parts: { label: string | null; text: string }[] = [];
  let last = 0;
  let label: string | null = null;
  for (const m of text.matchAll(SLOT_RE)) {
    const chunk = text.slice(last, m.index).trim();
    if (chunk) parts.push({ label, text: chunk });
    label = m[1];
    last = (m.index ?? 0) + m[0].length;
  }
  const rest = text.slice(last).trim();
  if (rest) parts.push({ label, text: rest });
  return parts;
}

export const fmtDate = (v: string | null | undefined) => (v ? v.slice(0, 10).replace(/-/g, ".") : "");
export const fmtYm = (v: string | null | undefined) => (v ? v.slice(0, 7).replace("-", ".") : "");

/** ★ 대표 먼저, 그다음 최근 기록 순 */
export function sortCards<T extends { featured?: boolean; recorded_at: string }>(cards: T[]): T[] {
  return [...cards].sort((a, b) => Number(!!b.featured) - Number(!!a.featured) || b.recorded_at.localeCompare(a.recorded_at));
}

// ---------- 근거 파일 (SQL 018 비공개 버킷 evidence, 본인만) ----------
export const EVIDENCE_MAX_BYTES = 10 * 1024 * 1024;
export const EVIDENCE_ACCEPT = "image/png,image/jpeg,image/webp,image/gif,application/pdf";

/** 사진·PDF 를 올리고 카드 links 에 넣을 항목을 돌려준다 (url = storage://evidence/<경로>) */
export async function uploadEvidence(userId: string, cardId: string, file: File) {
  if (!supabase) throw new Error("Supabase 가 설정되지 않았습니다");
  if (file.size > EVIDENCE_MAX_BYTES) throw new Error("10MB 이하 파일만 올릴 수 있어요");
  if (!EVIDENCE_ACCEPT.split(",").includes(file.type)) throw new Error("사진(PNG·JPG·WEBP·GIF)이나 PDF 만 올릴 수 있어요");
  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const path = `${userId}/${cardId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("evidence").upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(error.message);
  return { url: `storage://evidence/${path}`, label: file.name.slice(0, 200), kind: (file.type.startsWith("image/") ? "image" : "file") as "image" | "file" };
}

export const isStoredEvidence = (url: string) => url.startsWith("storage://evidence/");

/** 본인 파일 보기용 임시 주소 (1시간) */
export async function evidenceUrl(url: string) {
  if (!isStoredEvidence(url)) return url;
  if (!supabase) return null;
  const { data } = await supabase.storage.from("evidence").createSignedUrl(url.slice("storage://evidence/".length), 3600);
  return data?.signedUrl ?? null;
}

export async function removeEvidenceFile(url: string) {
  if (!supabase || !isStoredEvidence(url)) return;
  await supabase.storage.from("evidence").remove([url.slice("storage://evidence/".length)]);
}

// ---------- 프로필 사진 (공개 버킷 avatars → profiles.avatar_url, 23 문서 G8) ----------
export const PHOTO_ACCEPT = "image/png,image/jpeg,image/webp";

export async function uploadProfilePhoto(file: File): Promise<string> {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch("/api/profile/photo", { method: "POST", body });
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !data.url) throw new Error(data.error ?? "사진을 올리지 못했어요");
  return data.url;
}

export async function removeProfilePhoto(): Promise<void> {
  const res = await fetch("/api/profile/photo", { method: "DELETE" });
  if (!res.ok) throw new Error("사진을 지우지 못했어요");
}

// ---------- 공고 상세 (목록은 요약 컬럼만, 상세는 열 때 1건씩) ----------
export interface PostingDetail extends Posting {
  description: string | null;
}
const detailCache = new Map<string, PostingDetail>();
export async function loadPostingDetail(id: string): Promise<PostingDetail> {
  const hit = detailCache.get(id);
  if (hit) return hit;
  const row = check(await fit().from("job_postings").select(`${POSTING_COLS}, description`).eq("id", id).single()) as PostingDetail;
  detailCache.set(id, row);
  return row;
}

// ---------- 카드 수정 ----------
export const SLOT_LABELS = ["상황", "역할", "행동", "어려움", "결과", "배운 점"] as const;
export const CLAIM_MAX = 1000; // orchestrator LifeCardPatchSchema 상한

/** 여섯 칸 → "상황: …\n행동: …" (빈 칸은 뺀다). 칸 이름이 없던 앞부분은 상황으로 둔다 */
export function joinSlots(slots: Record<string, string>) {
  return SLOT_LABELS.filter((l) => slots[l]?.trim()).map((l) => `${l}: ${slots[l].trim()}`).join("\n");
}
export function slotsOf(claim: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const s of splitSlots(claim)) {
    const k = s.label ?? "상황";
    out[k] = out[k] ? `${out[k]} ${s.text}` : s.text;
  }
  return out;
}

/** 카드 제목 = 활동 제목 (fit.activities, 본인 RLS) */
export async function updateActivityTitle(activityId: string, title: string) {
  const r = await fit().from("activities").update({ title: title.trim().slice(0, 200) }).eq("id", activityId);
  if (r.error) throw new Error(r.error.message);
}
