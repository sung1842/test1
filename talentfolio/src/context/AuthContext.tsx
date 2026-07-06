"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import { supabase, Profile } from "@/lib/supabase";
import { BACKEND_UNAVAILABLE_MSG, isSupabaseConfigured } from "@/lib/features";

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  onlineUserIds: Set<string>;
  authAvailable: boolean;
  signUp: (email: string, password: string, name: string, role: "developer" | "designer", title: string) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
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

  const signUp = async (
    email: string,
    password: string,
    name: string,
    role: "developer" | "designer",
    title: string,
  ): Promise<string | null> => {
    if (!authAvailable || !supabase) return BACKEND_UNAVAILABLE_MSG;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role, title } },
    });
    if (error) return error.message;
    if (data.user) {
      await new Promise((r) => setTimeout(r, 500));
      await fetchProfile(data.user.id);
    }
    return null;
  };

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
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, onlineUserIds, authAvailable, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
