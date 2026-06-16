"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, ArrowLeft, Send, Trash2, LogIn, Loader2, Bot } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { Candidate } from "@/types/candidate";
import AuthModal from "@/components/AuthModal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UIParticipant {
  id: string;
  name: string;
  role: "developer" | "designer";
  title: string;
  is_online: boolean;
}

interface UIMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface UIConversation {
  id: string;
  participant: UIParticipant;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  messages: UIMessage[];
  isAI?: boolean;
  candidateInfo?: Candidate;
}

interface PendingTarget {
  name: string;
  email: string;
  isDummy?: boolean;
  candidateInfo?: Candidate;
  supabaseId?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SPRING = { type: "spring" as const, stiffness: 360, damping: 28 };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return "방금";
  if (mins < 60) return `${mins}분 전`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}시간 전`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days}일 전`;
  return format(new Date(iso), "M월 d일");
}

function clockTime(iso: string): string {
  return format(new Date(iso), "a h:mm", { locale: ko });
}

// ─── UserAvatar ───────────────────────────────────────────────────────────────

function UserAvatar({ user, size = 38 }: { user: UIParticipant; size?: number }) {
  const isDev  = user.role === "developer";
  const color  = isDev ? "#f6042e" : "#ffae2e";
  const bg     = isDev ? "rgba(246,4,46,0.15)" : "rgba(255,174,46,0.12)";
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      backgroundColor: bg, border: `1.5px solid ${color}40`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "DM Sans, sans-serif", color, fontWeight: 700, fontSize: size * 0.38,
    }}>
      {user.name.slice(0, 2)}
    </div>
  );
}

function OnlineDot({ online }: { online: boolean }) {
  return (
    <div style={{
      width: 9, height: 9, borderRadius: "50%",
      border: "2px solid #020005",
      backgroundColor: online ? "#22c55e" : "#3a2a4a",
    }} />
  );
}

function TypingDots() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "10px 14px", background: "#0b0812", border: "1px solid #271c32", borderRadius: "4px 16px 16px 16px", width: "fit-content" }}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{ y: [0, -5, 0] }}
          transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.18, ease: "easeInOut" as const }}
          style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#3a2a4a" }}
        />
      ))}
    </div>
  );
}

// ─── ConversationList ─────────────────────────────────────────────────────────

function ConversationList({ conversations, loading, onSelect, onDelete }: {
  conversations: UIConversation[];
  loading: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "var(--text-secondary)", fontFamily: "JetBrains Mono, monospace", fontSize: 12 }}>
        <Loader2 size={18} style={{ animation: "spin 1s linear infinite", color: "var(--accent)" }} />
        불러오는 중...
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: "var(--text-secondary)" }}>
        <MessageSquare size={28} opacity={0.25} />
        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12 }}>아직 대화가 없습니다</span>
        <span style={{ fontFamily: "DM Sans, sans-serif", fontSize: 11, opacity: 0.6, textAlign: "center", padding: "0 20px" }}>
          인재 카드의 메시지 버튼으로<br />대화를 시작해보세요
        </span>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "6px 0" }}>
      <AnimatePresence>
        {conversations.map((conv) => {
                        const roleColor = conv.participant.role === "developer" ? "#f6042e" : "#ffae2e";
          const isHov = hovered === conv.id;
          return (
            <motion.div
              key={conv.id} layout
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={SPRING}
              style={{ position: "relative" }}
              onMouseEnter={() => setHovered(conv.id)}
              onMouseLeave={() => setHovered(null)}
            >
              <button
                onClick={() => onSelect(conv.id)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px",
                  background: isHov ? "rgba(255,255,255,0.05)" : "transparent",
                  border: "none", cursor: "pointer", textAlign: "left",
                  transition: "background 0.15s",
                }}
              >
                <div style={{ position: "relative" }}>
                  <UserAvatar user={conv.participant} size={42} />
                  <div style={{ position: "absolute", bottom: 1, right: 1 }}>
                    <OnlineDot online={conv.participant.is_online} />
                  </div>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>
                        {conv.participant.name}
                      </span>
                        {conv.isAI && (
                        <span style={{ display: "flex", alignItems: "center", gap: 2, padding: "1px 5px", background: "rgba(246,4,46,0.12)", border: "1px solid rgba(246,4,46,0.25)", borderRadius: 4, fontSize: 9, color: "#f6042e", fontFamily: "JetBrains Mono, monospace" }}>
                          <Bot size={8} /> AI
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: 10, color: "var(--text-secondary)", fontFamily: "JetBrains Mono, monospace", flexShrink: 0, marginLeft: 8 }}>
                      {conv.lastMessageAt ? relativeTime(conv.lastMessageAt) : ""}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                    <span style={{
                      fontSize: 11.5, color: "var(--text-secondary)", fontFamily: "DM Sans, sans-serif",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1,
                    }}>
                      {conv.lastMessage || "대화를 시작해보세요"}
                    </span>
                    {conv.unreadCount > 0 && (
                      <span style={{
                        minWidth: 18, height: 18, borderRadius: 9, padding: "0 5px",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: "linear-gradient(135deg, #f6042e, #c0001e)",
                        color: "white", fontSize: 10, fontWeight: 700,
                        fontFamily: "JetBrains Mono, monospace", flexShrink: 0,
                      }}>
                        {formatBadgeCount(conv.unreadCount)}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: 10, color: roleColor, fontFamily: "JetBrains Mono, monospace" }}>
                    {conv.participant.role === "developer" ? "개발자" : "디자이너"}
                  </span>
                </div>
              </button>

              <AnimatePresence>
                {isHov && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }}
                    transition={{ duration: 0.13 }}
                    onClick={(e) => { e.stopPropagation(); onDelete(conv.id); }}
                    style={{
                      position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                      background: "rgba(246,4,46,0.1)", border: "1px solid rgba(246,4,46,0.3)",
                      borderRadius: 8, padding: 6, cursor: "pointer", color: "#f6042e", display: "flex",
                    }}
                  >
                    <Trash2 size={12} />
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// ─── MessageArea ──────────────────────────────────────────────────────────────

function MessageArea({ conversation, myId, isAIThinking, onBack, onSend }: {
  conversation: UIConversation;
  myId: string;
  isAIThinking: boolean;
  onBack: () => void;
  onSend: (convId: string, content: string) => void;
}) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation.messages.length, isAIThinking]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isAIThinking) return;
    onSend(conversation.id, text);
    setInput("");
  };

  const roleColor = conversation.participant.role === "developer" ? "#f6042e" : "#ffae2e";

  const shouldShowTime = (i: number) =>
    i === conversation.messages.length - 1 ||
    conversation.messages[i + 1]?.sender_id !== conversation.messages[i].sender_id;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Sub-header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "9px 12px", borderBottom: "1px solid #271c32", flexShrink: 0,
      }}>
        <button onClick={onBack} style={{
          background: "rgba(255,255,255,0.03)", border: "1px solid #271c32",
          borderRadius: 8, padding: "5px 6px", cursor: "pointer",
          color: "var(--text-secondary)", display: "flex", transition: "color 0.15s",
        }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--text-primary)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--text-secondary)")}
        >
          <ArrowLeft size={14} />
        </button>

        <UserAvatar user={conversation.participant} size={32} />

        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>
              {conversation.participant.name}
            </span>
              {conversation.isAI ? (
              <span style={{ display: "flex", alignItems: "center", gap: 3, padding: "1px 6px", background: "rgba(246,4,46,0.12)", border: "1px solid rgba(246,4,46,0.25)", borderRadius: 5, fontSize: 9, color: "#f6042e", fontFamily: "JetBrains Mono, monospace" }}>
                <Bot size={9} /> AI 채팅
              </span>
            ) : (
              <OnlineDot online={conversation.participant.is_online} />
            )}
          </div>
          <span style={{ fontSize: 10, color: roleColor, fontFamily: "JetBrains Mono, monospace" }}>
            {conversation.participant.title}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 6px", display: "flex", flexDirection: "column", gap: 3 }}>
        {conversation.isAI && conversation.messages.length === 0 && (
          <div style={{ textAlign: "center", color: "var(--text-secondary)", fontFamily: "DM Sans, sans-serif", fontSize: 12, marginTop: 20, padding: "0 12px" }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>👋</div>
            <strong style={{ color: "var(--text-primary)" }}>{conversation.participant.name}</strong>와 AI 채팅을 시작하세요.<br />
            <span style={{ opacity: 0.6, fontSize: 11 }}>Gemini가 해당 인물 역할로 답변합니다</span>
          </div>
        )}
        {!conversation.isAI && conversation.messages.length === 0 && (
          <div style={{ textAlign: "center", color: "var(--text-secondary)", fontFamily: "DM Sans, sans-serif", fontSize: 12, marginTop: 30, opacity: 0.7 }}>
            대화를 시작해보세요 👋
          </div>
        )}

        {conversation.messages.map((msg, i) => {
          const isOwn = msg.sender_id === myId;
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={SPRING}
              style={{ display: "flex", flexDirection: "column", alignItems: isOwn ? "flex-end" : "flex-start" }}
            >
              <div style={{
                maxWidth: "80%", padding: "8px 12px",
                borderRadius: isOwn ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
                background: isOwn ? "linear-gradient(135deg, #f6042e, #c0001e)" : "#0f0b18",
                border: isOwn ? "none" : "1px solid #271c32",
                color: isOwn ? "white" : "var(--text-primary)",
                fontSize: 13, fontFamily: "DM Sans, sans-serif", lineHeight: 1.5,
                boxShadow: isOwn ? "0 4px 12px rgba(246,4,46,0.3)" : "none",
                wordBreak: "break-word",
              }}>
                {msg.content}
              </div>
              {shouldShowTime(i) && (
                <span style={{ fontSize: 10, color: "var(--text-secondary)", fontFamily: "JetBrains Mono, monospace", marginTop: 3, padding: "0 3px" }}>
                  {clockTime(msg.created_at)}
                </span>
              )}
            </motion.div>
          );
        })}

        {/* AI 타이핑 인디케이터 */}
        <AnimatePresence>
          {isAIThinking && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
              transition={SPRING}
              style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}
            >
              <TypingDots />
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: "10px 12px", borderTop: "1px solid #271c32",
        flexShrink: 0, display: "flex", gap: 8, alignItems: "center",
      }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder={isAIThinking ? "AI가 응답 중..." : "메시지를 입력하세요..."}
          disabled={isAIThinking}
          style={{
            flex: 1, background: "#0b0812", border: "1px solid #271c32",
            borderRadius: 10, padding: "8px 12px",
            color: "var(--text-primary)", fontFamily: "DM Sans, sans-serif",
            fontSize: 13, outline: "none", transition: "border-color 0.15s",
            opacity: isAIThinking ? 0.5 : 1,
          }}
          onFocus={e => (e.currentTarget.style.borderColor = "rgba(246,4,46,0.5)")}
          onBlur={e  => (e.currentTarget.style.borderColor = "#271c32")}
        />
        <motion.button
          whileHover={{ scale: isAIThinking ? 1 : 1.08 }} whileTap={{ scale: isAIThinking ? 1 : 0.92 }}
          onClick={handleSend}
          disabled={isAIThinking}
          style={{
            width: 36, height: 36, borderRadius: 10, border: "none",
            cursor: (input.trim() && !isAIThinking) ? "pointer" : "default",
            background: (input.trim() && !isAIThinking) ? "linear-gradient(135deg, #f6042e, #c0001e)" : "#0b0812",
            color: (input.trim() && !isAIThinking) ? "white" : "#3a2a4a",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, transition: "background 0.2s, color 0.2s",
            boxShadow: (input.trim() && !isAIThinking) ? "0 4px 12px rgba(246,4,46,0.35)" : "none",
          }}
        >
          {isAIThinking ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={15} />}
        </motion.button>
      </div>
    </div>
  );
}

function formatBadgeCount(n: number): string {
  return n > 99 ? "99+" : String(n);
}

// ─── FloatingChat (main) ──────────────────────────────────────────────────────

export default function FloatingChat({
  pendingTarget,
  onTargetHandled,
}: {
  pendingTarget?: PendingTarget | null;
  onTargetHandled?: () => void;
}) {
  const { user, onlineUserIds } = useAuth();

  const [isOpen, setIsOpen]                 = useState(false);
  const [showAuthModal, setShowAuthModal]   = useState(false);
  const [conversations, setConversations]   = useState<UIConversation[]>([]);
  const [activeConvId, setActiveConvId]     = useState<string | null>(null);
  const [loadingConvs, setLoadingConvs]     = useState(false);
  const [aiThinkingIds, setAiThinkingIds]   = useState<Set<string>>(new Set());

  const totalUnread   = conversations.reduce((s, c) => s + c.unreadCount, 0);
  const activeConv    = conversations.find(c => c.id === activeConvId) ?? null;
  const isAIThinking  = activeConvId ? aiThinkingIds.has(activeConvId) : false;

  const activeConvIdRef = useRef<string | null>(null);
  useEffect(() => { activeConvIdRef.current = activeConvId; }, [activeConvId]);

  // ── Presence 기반 온라인 상태 실시간 반영 ────────────────────────────────
  useEffect(() => {
    setConversations(prev =>
      prev.map(c => ({
        ...c,
        participant: {
          ...c.participant,
          is_online: c.isAI ? true : onlineUserIds.has(c.participant.id),
        },
      }))
    );
  }, [onlineUserIds]);

  // ── Supabase 대화 목록 로드 ───────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    if (!user) return;
    setLoadingConvs(true);

    const { data: convData } = await supabase
      .from("conversations")
      .select("*")
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (!convData) { setLoadingConvs(false); return; }

    const uiConvs: UIConversation[] = await Promise.all(
      convData.map(async (conv) => {
        const otherId = conv.user_a === user.id ? conv.user_b : conv.user_a;

        const { data: profile } = await supabase
          .from("profiles").select("*").eq("id", otherId).single();

        const { data: msgs } = await supabase
          .from("messages").select("*")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: true });

        const messages: UIMessage[] = msgs || [];
        const lastMsg    = messages[messages.length - 1];
        const unreadCount = messages.filter(m => !m.is_read && m.sender_id !== user.id).length;

        return {
          id: conv.id,
          participant: {
            id:        profile?.id        || otherId,
            name:      profile?.name      || "알 수 없음",
            role:     (profile?.role as "developer" | "designer") || "developer",
            title:     profile?.title     || "",
            is_online: profile?.is_online || false,
          },
          lastMessage:   lastMsg?.content    || "",
          lastMessageAt: lastMsg?.created_at || conv.created_at,
          unreadCount,
          messages,
          isAI: false,
        };
      })
    );

    // 기존 AI 대화는 유지하면서 Supabase 대화만 교체
    setConversations(prev => {
      const aiConvs = prev.filter(c => c.isAI);
      return [...aiConvs, ...uiConvs];
    });
    setLoadingConvs(false);
  }, [user]);

  // ── AI 대화 시작 (더미 후보자) ────────────────────────────────────────────
  const startAIConversation = useCallback((candidate: Candidate) => {
    const aiConvId = `ai-${candidate.id}`;

    setConversations(prev => {
      const existing = prev.find(c => c.id === aiConvId);
      if (existing) return prev;
      const newConv: UIConversation = {
        id: aiConvId,
        participant: {
          id: candidate.id,
          name: candidate.name,
          role: candidate.role,
          title: candidate.title,
          is_online: true,
        },
        lastMessage: "",
        lastMessageAt: new Date().toISOString(),
        unreadCount: 0,
        messages: [],
        isAI: true,
        candidateInfo: candidate,
      };
      return [newConv, ...prev];
    });

    setIsOpen(true);
    setActiveConvId(aiConvId);
  }, []);

  // ── Supabase 대화 시작 (실제 유저) ───────────────────────────────────────
  const startRealConversation = useCallback(async (target: PendingTarget) => {
    if (!user) return;

    let targetId: string | undefined = target.supabaseId;

    if (!targetId) {
      // 이름으로 폴백 검색
      const { data: p } = await supabase
        .from("profiles").select("id").eq("name", target.name).single();
      targetId = p?.id;
    }

    if (!targetId) {
      // 플랫폼 미가입 → 그냥 패널 열기
      setIsOpen(true);
      return;
    }

    // 자기 자신에게 채팅 방지
    if (targetId === user.id) return;

    const { data: existing } = await supabase
      .from("conversations").select("id")
      .or(`and(user_a.eq.${user.id},user_b.eq.${targetId}),and(user_a.eq.${targetId},user_b.eq.${user.id})`)
      .maybeSingle();

    let convId = existing?.id as string | undefined;

    if (!convId) {
      const { data: newConv } = await supabase
        .from("conversations").insert({ user_a: user.id, user_b: targetId })
        .select("id").single();
      convId = newConv?.id;
    }

    if (!convId) return;

    await loadConversations();
    setIsOpen(true);
    setActiveConvId(convId);
  }, [user, loadConversations]);

  // pendingTarget 처리
  useEffect(() => {
    if (!pendingTarget || !user) return;
    if (pendingTarget.isDummy && pendingTarget.candidateInfo) {
      startAIConversation(pendingTarget.candidateInfo);
    } else {
      startRealConversation(pendingTarget);
    }
    onTargetHandled?.();
  }, [pendingTarget, user, startAIConversation, startRealConversation, onTargetHandled]);

  // 패널 열릴 때 Supabase 대화 로드
  useEffect(() => {
    if (isOpen && user) loadConversations();
  }, [isOpen, user, loadConversations]);

  // 로그아웃 시 초기화 (AI 대화는 유지할 수 없으므로 모두 초기화)
  useEffect(() => {
    if (!user) { setIsOpen(false); setConversations([]); setActiveConvId(null); }
  }, [user]);

  // ── Realtime: 활성 Supabase 대화 ────────────────────────────────────────
  useEffect(() => {
    if (!user || !activeConvId || activeConvId.startsWith("ai-")) return;

    const channel = supabase
      .channel(`conv-${activeConvId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages",
        filter: `conversation_id=eq.${activeConvId}`,
      }, (payload) => {
        const newMsg = payload.new as UIMessage;
        if (newMsg.sender_id !== user.id) {
          setConversations(prev =>
            prev.map(c =>
              c.id === activeConvId
                ? { ...c, messages: [...c.messages, newMsg], lastMessage: newMsg.content, lastMessageAt: newMsg.created_at }
                : c
            )
          );
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, activeConvId]);

  // ── 글로벌 인박스 구독 ───────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`inbox-${user.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages",
      }, (payload) => {
        const newMsg = payload.new as UIMessage;
        if (newMsg.sender_id === user.id) return;

        const isActive = newMsg.conversation_id === activeConvIdRef.current;

        setConversations(prev => {
          const convIdx = prev.findIndex(c => c.id === newMsg.conversation_id);
          if (convIdx === -1) { loadConversations(); return prev; }
          return prev.map(c => {
            if (c.id !== newMsg.conversation_id) return c;
            return {
              ...c,
              lastMessage: newMsg.content,
              lastMessageAt: newMsg.created_at,
              unreadCount: isActive ? c.unreadCount : c.unreadCount + 1,
            };
          });
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, loadConversations]);

  // ── 대화 선택 + 읽음 처리 ────────────────────────────────────────────────
  const selectConversation = (id: string) => {
    setActiveConvId(id);
    setConversations(prev => prev.map(c => c.id === id ? { ...c, unreadCount: 0 } : c));
    if (user && !id.startsWith("ai-")) {
      supabase.from("messages")
        .update({ is_read: true })
        .eq("conversation_id", id)
        .neq("sender_id", user.id)
        .then(() => {});
    }
  };

  // ── 대화 삭제 ────────────────────────────────────────────────────────────
  const deleteConversation = async (id: string) => {
    if (id.startsWith("ai-")) {
      setConversations(prev => prev.filter(c => c.id !== id));
    } else {
      await supabase.from("conversations").delete().eq("id", id);
      setConversations(prev => prev.filter(c => c.id !== id));
    }
    if (activeConvId === id) setActiveConvId(null);
  };

  // ── AI 메시지 전송 (Gemini) ───────────────────────────────────────────────
  const sendAIMessage = async (convId: string, content: string, conv: UIConversation) => {
    if (!user) return;

    const userMsg: UIMessage = {
      id: `user-${Date.now()}`,
      conversation_id: convId,
      sender_id: user.id,
      content,
      is_read: true,
      created_at: new Date().toISOString(),
    };

    setConversations(prev =>
      prev.map(c => c.id === convId
        ? { ...c, messages: [...c.messages, userMsg], lastMessage: content, lastMessageAt: userMsg.created_at }
        : c
      )
    );

    setAiThinkingIds(prev => new Set(prev).add(convId));

    const history = [
      ...conv.messages.map(m => ({
        role: (m.sender_id === user.id ? "user" : "model") as "user" | "model",
        content: m.content,
      })),
      { role: "user" as const, content },
    ];

    try {
      const res = await fetch("/api/chat/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateName: conv.participant.name,
          candidateInfo: conv.candidateInfo,
          messages: history,
        }),
      });

      const { reply, error } = await res.json();

      const aiMsg: UIMessage = {
        id: `ai-${Date.now()}`,
        conversation_id: convId,
        sender_id: "ai",
        content: reply ?? error ?? "응답을 생성할 수 없습니다.",
        is_read: true,
        created_at: new Date().toISOString(),
      };

      setConversations(prev =>
        prev.map(c => c.id === convId
          ? { ...c, messages: [...c.messages, aiMsg], lastMessage: aiMsg.content, lastMessageAt: aiMsg.created_at }
          : c
        )
      );
    } catch {
      const errMsg: UIMessage = {
        id: `ai-err-${Date.now()}`,
        conversation_id: convId,
        sender_id: "ai",
        content: "네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
        is_read: true,
        created_at: new Date().toISOString(),
      };
      setConversations(prev =>
        prev.map(c => c.id === convId ? { ...c, messages: [...c.messages, errMsg] } : c)
      );
    } finally {
      setAiThinkingIds(prev => { const s = new Set(prev); s.delete(convId); return s; });
    }
  };

  // ── Supabase 메시지 전송 ─────────────────────────────────────────────────
  const sendSupabaseMessage = async (convId: string, content: string) => {
    if (!user) return;

    const tempId  = `temp-${Date.now()}`;
    const tempMsg: UIMessage = {
      id: tempId, conversation_id: convId, sender_id: user.id,
      content, is_read: false, created_at: new Date().toISOString(),
    };

    setConversations(prev =>
      prev.map(c =>
        c.id === convId
          ? { ...c, messages: [...c.messages, tempMsg], lastMessage: content, lastMessageAt: tempMsg.created_at }
          : c
      )
    );

    const { data } = await supabase
      .from("messages")
      .insert({ conversation_id: convId, sender_id: user.id, content, is_read: false })
      .select().single();

    if (data) {
      setConversations(prev =>
        prev.map(c =>
          c.id === convId
            ? { ...c, messages: c.messages.map(m => m.id === tempId ? (data as UIMessage) : m) }
            : c
        )
      );
    }
  };

  // ── 통합 메시지 전송 ──────────────────────────────────────────────────────
  const sendMessage = async (convId: string, content: string) => {
    const conv = conversations.find(c => c.id === convId);
    if (!conv) return;

    if (conv.isAI) {
      await sendAIMessage(convId, content, conv);
    } else {
      await sendSupabaseMessage(convId, content);
    }
  };

  // ── 버튼 클릭 ────────────────────────────────────────────────────────────
  const handleButtonClick = () => {
    if (!user) {
      setShowAuthModal(true);
    } else {
      setIsOpen(v => !v);
      if (isOpen) setActiveConvId(null);
    }
  };

  const closePanel = () => { setIsOpen(false); setActiveConvId(null); };
  const panelOpen  = isOpen && !!user;

  return (
    <>
      {/* ── 채팅 패널 ── */}
      <AnimatePresence>
        {panelOpen && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.94 }}
            transition={SPRING}
            style={{
              position: "fixed",
              bottom: 84,
              left: 16,
              zIndex: 200,
              width: "min(360px, calc(100vw - 32px))",
              height: "min(520px, calc(100svh - 120px))",
              background: "rgba(2,0,5,0.97)",
              border: "1px solid #271c32", borderRadius: 20,
              backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)",
              boxShadow: "0 28px 60px rgba(0,0,0,0.85), 0 0 0 1px rgba(246,4,46,0.06)",
              display: "flex", flexDirection: "column", overflow: "hidden",
            }}
          >
            {/* 패널 헤더 */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "13px 14px", borderBottom: "1px solid #271c32", flexShrink: 0,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: "linear-gradient(135deg, #f6042e, #c0001e)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 4px 10px rgba(246,4,46,0.4)",
                }}>
                  <MessageSquare size={14} color="white" />
                </div>
                <span style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 800, fontSize: 15, color: "var(--text-primary)" }}>
                  메시지
                </span>
                {!activeConv && totalUnread > 0 && (
                  <span style={{
                    background: "linear-gradient(135deg, #f6042e, #c0001e)",
                    color: "white", fontSize: 10, fontWeight: 700,
                    borderRadius: 10, padding: "1px 7px",
                    fontFamily: "JetBrains Mono, monospace",
                  }}>
                    {formatBadgeCount(totalUnread)}
                  </span>
                )}
              </div>
              <button onClick={closePanel} style={{
                background: "rgba(245,237,228,0.06)", border: "1px solid #5c3828",
                borderRadius: 8, padding: 6, cursor: "pointer",
                color: "var(--text-secondary)", display: "flex", transition: "all 0.15s",
              }}
                onMouseEnter={e => { e.currentTarget.style.color = "var(--text-primary)"; e.currentTarget.style.background = "rgba(245,237,228,0.1)"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.background = "rgba(245,237,228,0.06)"; }}
              >
                <X size={14} />
              </button>
            </div>

            {/* 패널 바디 */}
            <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
              <AnimatePresence mode="wait">
                {activeConv ? (
                  <motion.div key="msg"
                    initial={{ x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 60, opacity: 0 }}
                    transition={SPRING}
                    style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}
                  >
                    <MessageArea
                      conversation={activeConv}
                      myId={user!.id}
                      isAIThinking={isAIThinking}
                      onBack={() => setActiveConvId(null)}
                      onSend={sendMessage}
                    />
                  </motion.div>
                ) : (
                  <motion.div key="list"
                    initial={{ x: -60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -60, opacity: 0 }}
                    transition={SPRING}
                    style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}
                  >
                    <ConversationList
                      conversations={conversations}
                      loading={loadingConvs}
                      onSelect={selectConversation}
                      onDelete={deleteConversation}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 플로팅 버튼 ── */}
      <motion.button
        whileHover={{ scale: 1.1, rotate: panelOpen ? 0 : 8 }}
        whileTap={{ scale: 0.92 }}
        onClick={handleButtonClick}
        title={!user ? "로그인 후 채팅 이용 가능" : "메시지"}
        style={{
          position: "fixed",
          bottom: "max(24px, env(safe-area-inset-bottom, 24px))",
          left: 16,
          zIndex: 201,
          width: 52, height: 52, borderRadius: 16,
          border: panelOpen ? "1px solid rgba(232,41,74,0.35)" : "none",
          cursor: "pointer",
          background: panelOpen
            ? "rgba(232,41,74,0.1)"
            : "linear-gradient(135deg, #e8294a, #b5182d)",
          color: "white",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: panelOpen
            ? "0 0 0 1px rgba(232,41,74,0.2)"
            : "0 8px 24px rgba(232,41,74,0.45)",
          transition: "background 0.2s, box-shadow 0.2s, border 0.2s",
        } as React.CSSProperties}
      >
        <AnimatePresence mode="wait">
          {panelOpen ? (
            <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X size={20} color="#e8294a" />
            </motion.span>
          ) : !user ? (
            <motion.span key="login" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} transition={{ duration: 0.15 }}>
              <LogIn size={20} color="white" />
            </motion.span>
          ) : (
            <motion.span key="chat" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} transition={{ duration: 0.15 }}>
              <MessageSquare size={20} color="white" />
            </motion.span>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {!panelOpen && totalUnread > 0 && user && (
            <motion.span
              key={totalUnread}
              initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }}
              style={{
                position: "absolute", top: -5, right: -5,
                minWidth: 18, height: 18, borderRadius: 9, padding: "0 4px",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "#e8294a", color: "white",
                fontSize: 10, fontWeight: 700, fontFamily: "JetBrains Mono, monospace",
                border: "2px solid #080808",
              }}
            >
              {formatBadgeCount(totalUnread)}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}
    </>
  );
}
