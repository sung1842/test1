import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  name: string;
  role: "developer" | "designer";
  title: string | null;
  avatar_url: string | null;
  is_online: boolean;
  created_at: string;
  // 프로필 등록 기능 추가 컬럼 (DB migration 필요)
  short_bio?: string | null;
  long_bio?: string | null;
  skills?: string[] | null;
  github_url?: string | null;
  portfolio_url?: string | null;
  behance_url?: string | null;
  linkedin_url?: string | null;
  is_public?: boolean;
}

export interface Conversation {
  id: string;
  user_a: string;
  user_b: string;
  created_at: string;
  // joined
  other_profile?: Profile;
  last_message?: string;
  last_message_at?: string;
  unread_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}
