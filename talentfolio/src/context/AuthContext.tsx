"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import { supabase, Profile } from "@/lib/supabase";
import { BACKEND_UNAVAILABLE_MSG, isSupabaseConfigured } from "@/lib/features";
import { accountTypeOf, type AccountType } from "@/lib/accountType";
import type { JobCategory } from "@/lib/jobCategories";

export interface SignUpInput {
  email: string;
  password: string;
  name: string;
  title: string;
  accountType: AccountType;
  role?: "developer" | "designer";
  /** 구직자 직군 (lib/jobCategories). 있으면 role 은 서버가 이 값에서 정한다 */
  jobCategory?: JobCategory;
}

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  /** app_metadata.account_type. 미분류(레거시) 계정이면 null */
  accountType: AccountType | null;
  loading: boolean;
  onlineUserIds: Set<string>;
  authAvailable: boolean;
  signUp: (input: SignUpInput) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  /** profiles 행을 다시 읽는다 (사진·공개 설정 변경 후) */
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const authAvailable = isSupabaseConfigured() && supabase !== null;

  const fetchProfile = useCallback(async (userId: string) => {
    if (!supabase) return;
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (data) setProfile(data as Profile);
  }, []);

  useEffect(() => {
    if (!authAvailable || !supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, [authAvailable, fetchProfile]);

  // 계정 유형은 서버가 app_metadata 에 넣어야 해서 Supabase signUp 대신 /api/auth/signup 을 거친다.
  const signUp = async (input: SignUpInput): Promise<string | null> => {
    if (!authAvailable || !supabase) return BACKEND_UNAVAILABLE_MSG;
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }).catch(() => null);
    if (!res) return "회원가입 서버에 연결하지 못했습니다.";
    if (!res.ok) return ((await res.json().catch(() => null))?.error as string) ?? "회원가입에 실패했습니다.";
    return signIn(input.email, input.password);
  };

  const accountType = accountTypeOf(user);

  // 기업 계정은 인재풀(profiles.is_public)에 후보로 노출되지 않게 한다.
  useEffect(() => {
    if (!supabase || !user || accountType !== "company" || profile?.is_public === false) return;
    if (!profile) return;
    supabase.from("profiles").update({ is_public: false }).eq("id", user.id).then(() => fetchProfile(user.id));
  }, [user, accountType, profile, fetchProfile]);

  useEffect(() => {
    if (!authAvailable || !supabase || !user) {
      setOnlineUserIds(new Set());
      return;
    }

    const client = supabase;
    const channel = client.channel("online-users");

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ user_id: string }>();
        const ids = new Set(Object.values(state).flat().map((p) => p.user_id));
        setOnlineUserIds(ids);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ user_id: user.id });
        }
      });

    return () => {
      client.removeChannel(channel);
    };
  }, [authAvailable, user]);

  const signIn = async (email: string, password: string): Promise<string | null> => {
    if (!authAvailable || !supabase) return BACKEND_UNAVAILABLE_MSG;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return error.message;
    const { data: { user: u } } = await supabase.auth.getUser();
    if (u) {
      await supabase.from("profiles").update({ is_online: true }).eq("id", u.id);
      await fetchProfile(u.id);
    }
    return null;
  };

  const signOut = async () => {
    if (!supabase) {
      setUser(null);
      setProfile(null);
      return;
    }
    if (user) {
      await supabase.from("profiles").update({ is_online: false }).eq("id", user.id);
    }
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    // 비로그인은 메인만 볼 수 있으니(src/proxy.ts) 지금 화면에 남지 않고 메인으로 나간다.
    window.location.assign("/");
  };

  return (
    <AuthContext.Provider value={{ user, profile, accountType, refreshProfile: async () => { if (user) await fetchProfile(user.id); }, loading, onlineUserIds, authAvailable, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
