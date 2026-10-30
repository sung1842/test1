import candidatesData from "@/data/candidates.json";
import { supabase } from "@/lib/supabase";
import { isSupabaseConfigured } from "@/lib/features";
import type { Candidate } from "@/types/candidate";

function profileToCandidate(p: {
  id: string;
  name: string;
  role: string;
  title: string | null;
  avatar_url: string | null;
  short_bio?: string | null;
  long_bio?: string | null;
  skills?: string[] | null;
  github_url?: string | null;
  portfolio_url?: string | null;
  behance_url?: string | null;
  linkedin_url?: string | null;
}): Candidate {
  return {
    id: p.id,
    name: p.name,
    role: (p.role as "developer" | "designer") || "developer",
    title: p.title || "",
    avatar: p.avatar_url || "",
    shortBio: p.short_bio || "",
    longBio: p.long_bio || "",
    skills: p.skills || [],
    links: {
      github: p.github_url || "",
      portfolio: p.portfolio_url || "",
      behance: p.behance_url || "",
      linkedin: p.linkedin_url || "",
    },
    email: "",
    source: "profile",
    supabaseId: p.id,
  };
}

/** 정적 JSON + Supabase profiles에서 후보 조회 (Brief·OG unfurl용) */
export async function getCandidateById(id: string): Promise<Candidate | null> {
  const staticMatch = (candidatesData as Candidate[]).find((c) => c.id === id);
  if (staticMatch) {
    return { ...staticMatch, source: "static" };
  }

  if (!isSupabaseConfigured() || !supabase) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, name, role, title, avatar_url, short_bio, long_bio, skills, github_url, portfolio_url, behance_url, linkedin_url"
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return profileToCandidate(data);
}

/** 공개 근거 카드 (Supabase 뷰 public_evidence_cards — 공개+매칭 동의 사용자만 노출) */
export interface PublicEvidenceCard {
  id: string;
  claim: string;
  /** SQL 015: self(본인주장) | attached(첨부) | confirmed(확인됨) */
  trust_level: "self" | "attached" | "confirmed";
  recorded_at: string;
  source: string;
  links: string[];
  ai_edited: boolean;
}

const TRUST_LEVELS = ["self", "attached", "confirmed"] as const;
function toTrustLevel(v: unknown): PublicEvidenceCard["trust_level"] {
  return TRUST_LEVELS.includes(v as PublicEvidenceCard["trust_level"]) ? (v as PublicEvidenceCard["trust_level"]) : "self";
}

/** links jsonb = {url,label}[] → url 문자열 목록 */
function toLinkUrls(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((l) =>
    typeof l === "string" ? [l] : l && typeof l === "object" && typeof (l as { url?: unknown }).url === "string" ? [(l as { url: string }).url] : [],
  );
}

/** 뷰(fit.public_evidence_cards)가 없거나 오류면 조용히 빈 목록 */
export async function getPublicEvidenceCards(userId: string): Promise<PublicEvidenceCard[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  try {
    const { data, error } = await supabase
      .schema("fit")
      .from("public_evidence_cards")
      .select("id, claim, trust_level, recorded_at, source, links, ai_edited")
      .eq("user_id", userId)
      .order("recorded_at", { ascending: false })
      .limit(50);
    if (error || !data) return [];
    return (data as (Omit<PublicEvidenceCard, "links" | "trust_level"> & { links: unknown; trust_level: unknown })[]).map((c) => ({
      ...c,
      trust_level: toTrustLevel(c.trust_level),
      links: toLinkUrls(c.links),
    }));
  } catch {
    return [];
  }
}
