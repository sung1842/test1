"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import { supabase, Profile } from "@/lib/supabase";

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  onlineUserIds: Set<string>;
  signUp: (email: string, password: string, name: string, role: "developer" | "designer", title: string) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]             = useState<User | null>(null);
  const [profile, setProfile]       = useState<Profile | null>(null);
  const [loading, setLoading]       = useState(true);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (data) setProfile(data as Profile);
  }, []);

  useEffect(() => {
    // 초기 세션 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      setLoading(false);
    });

    // 세션 변화 구독
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signUp = async (
    email: string,
    password: string,
    name: string,
    role: "developer" | "designer",
    title: string,
  ): Promise<string | null> => {
    // name, role, title을 메타데이터로 전달 → DB 트리거가 자동으로 profiles INSERT
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role, title } },
    });
    if (error) return error.message;
    if (data.user) {
      // 트리거가 profiles를 만들 때까지 잠깐 대기
      await new Promise(r => setTimeout(r, 500));
      await fetchProfile(data.user.id);
    }
    return null;
  };

  // ── Supabase Presence: 실시간 온라인 상태 추적 ────────────────────────────
  useEffect(() => {
    if (!user) {
      setOnlineUserIds(new Set());
      return;
    }

    const channel = supabase.channel("online-users");

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ user_id: string }>();
        const ids = new Set(
          Object.values(state).flat().map((p) => p.user_id)
        );
        setOnlineUserIds(ids);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ user_id: user.id });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const signIn = async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return error.message;
    // is_online 업데이트
    const { data: { user: u } } = await supabase.auth.getUser();
    if (u) {
      await supabase.from("profiles").update({ is_online: true }).eq("id", u.id);
      await fetchProfile(u.id);
    }
    return null;
  };

  const signOut = async () => {
    if (user) {
      await supabase.from("profiles").update({ is_online: false }).eq("id", user.id);
    }
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, onlineUserIds, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
