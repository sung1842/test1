import { type SupabaseClient } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";
import { isSupabaseConfigured } from "@/lib/features";

export { isSupabaseConfigured };

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

/**
 * Supabase 미설정 시 null — 호출 전 isSupabaseConfigured() 확인.
 * 세션은 쿠키에 저장한다(@supabase/ssr). 그래야 src/proxy.ts 가 서버에서 로그인·계정 유형을 판정할 수 있다.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createBrowserClient(supabaseUrl, supabaseKey)
  : null;

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
