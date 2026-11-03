// 라이프 로그(기록함) — orchestrator /api/v1/life/* 클라이언트 (19 문서 2·4·5절)
// 계약 원본: jd-fit-analyzer/orchestrator/src/lib/lifeRoutes.ts, schemas.ts (Life*)
// 인증: Authorization: Bearer <supabase access token>
import { getJdAnalyzerUrl } from "@/lib/features";
import { supabase } from "@/lib/supabase";

export type TrustLevel = "self" | "attached" | "confirmed";
export type ConsentPurpose = "self_ai" | "matching";

export interface LifeSession {
  id: string;
  source: "app" | "web" | "import";
  title: string | null;
  started_at: string;
  ended_at: string | null;
}
export interface LifeActivity {
  id: string;
  session_id: string | null;
  title: string;
  summary: string | null;
  occurred_on: string | null;
  tags: string[];
  created_at: string;
}
/** slot: 1 상황, 2 역할, 3 행동, 4 어려움, 5 결과, 6 배운 점. quotes = 근거 life_messages.id */
export interface LifeDraftSentence {
  slot: number;
  text: string;
  quotes: string[];
}
export interface LifeDraft {
  id: string;
  activity_id: string | null;
  session_id: string | null;
  draft: { sentences?: LifeDraftSentence[] };
  quotes: string[];
  status: string;
  created_at: string;
}
export interface LifeCardLink {
  url: string; // https://… 또는 storage://evidence/<uid>/… (SQL 018 비공개 버킷)
  label?: string;
  kind?: "link" | "image" | "file";
}
export interface LifeCard {
  id: string;
  activity_id: string | null;
  claim: string;
  links: LifeCardLink[];
  visibility: "private" | "public";
  trust_level: TrustLevel;
  recorded_at: string;
  source: string | null;
  ai_edited: boolean;
  published_at: string | null;
  updated_at: string;
  featured?: boolean; // ★ 대표 (SQL 017, 최대 3장)
}
export interface LifeDraftsResponse {
  activities: LifeActivity[];
  drafts: LifeDraft[];
  cards: LifeCard[];
}
export interface LifeMatchReport {
  id: string;
  jdHeadline: string | null;
  status: string;
  overallScore: number | null;
  verdict: string | null;
  createdAt: string;
  evidenceCards: { id: string; claim: string; trust_level: TrustLevel; recorded_at: string; ai_edited: boolean }[];
}
export interface LifeSourcingAction {
  id: string;
  status: string;
  jdHeadline: string | null;
  createdAt: string;
}
export interface LifeMatchesResponse {
  reports: LifeMatchReport[];
  sourcingActions: LifeSourcingAction[];
}

/** 코드·사전 매칭 공고 추천 (orchestrator SQL 022). 서버가 미리 계산해 둔 결과만 읽는다 */
export interface LifeRecommendation {
  rank: number;
  score: number;
  reasons: string[];
  posting: {
    id: string; company: string | null; title: string; location: string | null; experience_level: string | null;
    employment_type: string | null; salary: string | null; expires_at: string | null; deadline_type: string | null;
    skills: string[]; url: string | null;
  } | null;
}
export interface LifeRecommendationsResponse {
  recommendations: LifeRecommendation[];
  computedAt: string | null;
  candidates: number;
  jobId?: string;
}

export const DRAFT_SLOT_LABELS: Record<number, string> = {
  1: "상황",
  2: "역할",
  3: "행동",
  4: "어려움",
  5: "결과",
  6: "배운 점",
};

/** 신뢰 등급 표시 (SQL 015: self | attached | confirmed) */
export function trustLabel(level: string | null | undefined): string {
  if (level === "confirmed") return "확인됨";
  if (level === "attached") return "첨부";
  return "본인주장";
}

/** 기록 시점 배지: web 회고 입력은 입력일 기준임을 숨기지 않는다 */
export function sourceLabel(source: string | null | undefined): string {
  return source === "web" ? "회고 입력(입력일 기준)" : "활동 당시 작성";
}

/** jsonb links 정규화: {url,label}[] (구형 string[] 도 허용) */
export function normalizeLinks(raw: unknown): LifeCardLink[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((l): LifeCardLink[] => {
    if (typeof l === "string") return l ? [{ url: l }] : [];
    if (l && typeof l === "object" && typeof (l as { url?: unknown }).url === "string") {
      const { url, label, kind } = l as { url: string; label?: unknown; kind?: unknown };
      return [{
        url,
        ...(typeof label === "string" && label ? { label } : {}),
        ...(kind === "link" || kind === "image" || kind === "file" ? { kind } : {}),
      }];
    }
    return [];
  });
}

/** 403 consent_required 등 서버 오류 코드를 보존하는 에러 */
export class LifeApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly purpose?: ConsentPurpose,
  ) {
    super(message);
    this.name = "LifeApiError";
  }
}

export function isConsentRequired(err: unknown): err is LifeApiError {
  return err instanceof LifeApiError && err.code === "consent_required";
}

export function lifeApiBase(): string {
  return getJdAnalyzerUrl();
}

async function accessToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = await accessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/**
 * orchestrator 원본 응답이 필요한 호출용 fetch — Bearer 만 붙인다 (23 문서 G2).
 * talentfolio → orchestrator 호출은 이것이나 lifeFetch 만 쓴다. plain fetch 금지.
 */
export async function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = await accessToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(url, { ...init, headers });
}

/** 헤더를 못 싣는 브라우저 이동·EventSource 용 (?access_token= 허용 경로만) */
export async function withAccessToken(url: string): Promise<string> {
  const token = await accessToken();
  return token ? `${url}${url.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(token)}` : url;
}

export async function lifeFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const base = lifeApiBase();
  if (!base) throw new Error("분석 서버가 연결되지 않았습니다");
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { ...(await authHeaders()), ...(init.headers as Record<string, string> | undefined) },
  });
  if (!res.ok) {
    let msg = `요청 실패 (${res.status})`;
    let code: string | undefined;
    let purpose: ConsentPurpose | undefined;
    try {
      const body = (await res.json()) as { error?: string; message?: string; code?: string; purpose?: ConsentPurpose };
      msg = body.error ?? body.message ?? msg;
      code = body.code;
      purpose = body.purpose;
    } catch {
      /* 본문 없음 */
    }
    if (res.status === 401) msg = "로그인이 필요합니다";
    throw new LifeApiError(msg, res.status, code, purpose);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

const post = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });
const enc = encodeURIComponent;

export const lifeApi = {
  /** 종류·기간·역할은 title 에 담는다 (계약: {source,title}) */
  createSession: (title?: string) =>
    lifeFetch<{ session: LifeSession }>("/api/v1/life/sessions", post({ source: "web", ...(title ? { title } : {}) })),
  /** 웹 간이 입력: AI 응답 없이 저장만 (201 {messageId}) */
  addMessage: (sessionId: string, content: string) =>
    lifeFetch<{ messageId: string }>(`/api/v1/life/sessions/${enc(sessionId)}/messages`, post({ content, reply: false })),
  closeSession: (sessionId: string) =>
    lifeFetch<{ jobId: string }>(`/api/v1/life/sessions/${enc(sessionId)}/close`, post({})),
  drafts: async (): Promise<LifeDraftsResponse> => {
    const r = await lifeFetch<LifeDraftsResponse>("/api/v1/life/drafts");
    return {
      activities: r?.activities ?? [],
      drafts: r?.drafts ?? [],
      cards: (r?.cards ?? []).map((c) => ({ ...c, links: normalizeLinks(c.links) })),
    };
  },
  editCard: (id: string, patch: { claim?: string; links?: LifeCardLink[]; visibility?: "private" }) =>
    lifeFetch<{ card: LifeCard }>(`/api/v1/life/cards/${enc(id)}`, { method: "PATCH", body: JSON.stringify(patch) }),
  polishCard: (id: string) => lifeFetch<{ jobId: string }>(`/api/v1/life/cards/${enc(id)}/polish`, post({})),
  /** 200 { card, matchingConsent, jobId } — jobId = life-publish 잡(임베딩 + fit 캐시 무효화) */
  publishCard: (id: string) =>
    lifeFetch<{
      card: Pick<LifeCard, "id" | "visibility" | "published_at" | "recorded_at" | "ai_edited" | "trust_level">;
      matchingConsent: boolean;
      jobId: string;
    }>(`/api/v1/life/cards/${enc(id)}/publish`, post({})),
  unpublishCard: (id: string) => lifeFetch<{ jobId: string }>(`/api/v1/life/cards/${enc(id)}/unpublish`, post({})),
  matches: async (): Promise<LifeMatchesResponse> => {
    const r = await lifeFetch<LifeMatchesResponse>("/api/v1/life/matches");
    return { reports: r?.reports ?? [], sourcingActions: r?.sourcingActions ?? [] };
  },
  recommendations: async (): Promise<LifeRecommendationsResponse> => {
    const r = await lifeFetch<LifeRecommendationsResponse>("/api/v1/life/recommendations");
    return { recommendations: r?.recommendations ?? [], computedAt: r?.computedAt ?? null, candidates: r?.candidates ?? 0, jobId: r?.jobId };
  },
  /** 희망 조건 저장·추천 제외 직후 본인 추천만 다시 계산 (202 {jobId}) */
  refreshRecommendations: () => lifeFetch<{ jobId: string }>("/api/v1/life/recommendations/refresh", post({})),
  /** jobPostingId null = 전체 매칭 제외. 중복이면 200 {duplicated:true} */
  addExclusion: (jobPostingId: string | null) =>
    lifeFetch<{ exclusion?: { id: string; job_posting_id: string | null; created_at: string }; duplicated?: boolean }>(
      "/api/v1/life/match-exclusions",
      post({ jobPostingId }),
    ),
  /**
   * 동의 철회: revoked_at=now() (서버가 사용자 토큰 RLS 로). matching 이면 공개 카드마다 life-unpublish 잡
   * (임베딩 삭제 + fit 캐시 무효화) → 202 { revoked, jobIds }. self_ai·이미 철회됨 → 200 { revoked, jobIds: [] }
   */
  revokeConsent: (purpose: ConsentPurpose) =>
    lifeFetch<{ revoked: number; jobIds: string[] }>(`/api/v1/life/consents/${enc(purpose)}/revoke`, post({})),
  removeExclusion: (jobPostingId: string | null) =>
    lifeFetch<{ deleted: number }>("/api/v1/life/match-exclusions", {
      method: "DELETE",
      body: JSON.stringify({ jobPostingId }),
    }),
};

// ---------- 동의 조회·부여 (supabase fit.consents, RLS 본인). 철회는 lifeApi.revokeConsent (잡 큐잉 때문에 orchestrator) ----------
function fitDb() {
  if (!supabase) throw new Error("Supabase 가 설정되지 않았습니다");
  return supabase.schema("fit");
}

async function currentUserId(): Promise<string> {
  if (!supabase) throw new Error("Supabase 가 설정되지 않았습니다");
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("로그인이 필요합니다");
  return data.user.id;
}

/** 유효(철회 안 된) 동의 목적 */
export async function getConsents(): Promise<Record<ConsentPurpose, boolean>> {
  const userId = await currentUserId();
  const { data, error } = await fitDb()
    .from("consents")
    .select("purpose")
    .eq("user_id", userId)
    .is("revoked_at", null);
  if (error) throw new Error("동의 상태를 불러오지 못했습니다");
  const set = new Set((data ?? []).map((r: { purpose: string }) => r.purpose));
  return { self_ai: set.has("self_ai"), matching: set.has("matching") };
}

/** 체크된 목적만 새로 동의 저장 (이미 유효한 목적은 건너뜀) */
export async function grantConsents(purposes: ConsentPurpose[]): Promise<void> {
  if (purposes.length === 0) return;
  const userId = await currentUserId();
  const current = await getConsents();
  const rows = purposes.filter((p) => !current[p]).map((purpose) => ({ user_id: userId, purpose }));
  if (rows.length === 0) return;
  const { error } = await fitDb().from("consents").insert(rows);
  if (error) throw new Error("동의를 저장하지 못했습니다");
}

/**
 * 잡 진행 SSE 구독: GET /api/v1/life/jobs/:jobId/stream?access_token=…
 * 이벤트 progress / completed / failed. completed → resolve(returnvalue), failed → reject.
 */
export async function streamJob(
  jobId: string,
  onProgress?: (data: unknown) => void,
  signal?: AbortSignal,
): Promise<unknown> {
  const base = lifeApiBase();
  if (!base) throw new Error("분석 서버가 연결되지 않았습니다");
  const token = await accessToken();
  if (!token) throw new Error("로그인이 필요합니다");
  const url = `${base}/api/v1/life/jobs/${enc(jobId)}/stream?access_token=${enc(token)}`;
  const parse = (s: string): unknown => {
    try {
      return JSON.parse(s);
    } catch {
      return s;
    }
  };
  return new Promise((resolve, reject) => {
    const es = new EventSource(url);
    const finish = (fn: () => void) => {
      es.close();
      signal?.removeEventListener("abort", onAbort);
      fn();
    };
    const onAbort = () => finish(() => reject(new Error("취소되었습니다")));
    signal?.addEventListener("abort", onAbort);
    es.addEventListener("progress", (e) => onProgress?.(parse((e as MessageEvent<string>).data)));
    es.addEventListener("completed", (e) => finish(() => resolve(parse((e as MessageEvent<string>).data))));
    es.addEventListener("failed", (e) => {
      const d = parse((e as MessageEvent<string>).data);
      const reason =
        d && typeof d === "object" && typeof (d as { reason?: unknown }).reason === "string"
          ? (d as { reason: string }).reason
          : "작업이 실패했습니다";
      finish(() => reject(new Error(reason)));
    });
    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) finish(() => reject(new Error("진행 상황 연결이 끊겼습니다")));
    };
  });
}

/** 동의 철회 (orchestrator). matching 철회 시 큐잉된 잡 id 를 돌려준다. */
export function revokeConsent(purpose: ConsentPurpose): Promise<{ revoked: number; jobIds: string[] }> {
  return lifeApi.revokeConsent(purpose);
}

/** 전체 매칭 제외(job_posting_id null) 여부 — supabase fit.match_exclusions (RLS 본인 select) */
export async function getExcludedAll(): Promise<boolean> {
  const userId = await currentUserId();
  const { data, error } = await fitDb()
    .from("match_exclusions")
    .select("id")
    .eq("user_id", userId)
    .is("job_posting_id", null)
    .limit(1);
  if (error) throw new Error("추천 제외 상태를 불러오지 못했습니다");
  return (data ?? []).length > 0;
}
