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
