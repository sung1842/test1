"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Lock, User, Briefcase, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface AuthModalProps {
  onClose: () => void;
}

const SPRING = { type: "spring" as const, stiffness: 340, damping: 28 };

export default function AuthModal({ onClose }: AuthModalProps) {
  const { signIn, signUp } = useAuth();

  const [mode, setMode]         = useState<"login" | "signup">("login");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [name, setName]         = useState("");
  const [role, setRole]         = useState<"developer" | "designer">("developer");
  const [title, setTitle]       = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  // 모달 열릴 때 페이지 스크롤 막기
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // ESC 닫기
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    let err: string | null = null;

    if (mode === "login") {
      err = await signIn(email, password);
    } else {
      if (!name.trim())  { setError("이름을 입력해주세요.");  setLoading(false); return; }
      if (!title.trim()) { setError("직함을 입력해주세요."); setLoading(false); return; }
      err = await signUp(email, password, name.trim(), role, title.trim());
    }

    setLoading(false);
    if (err) {
      if (err.includes("Invalid login"))       setError("이메일 또는 비밀번호가 올바르지 않습니다.");
      else if (err.includes("already registered")) setError("이미 가입된 이메일입니다.");
      else if (err.includes("Password should"))    setError("비밀번호는 6자 이상이어야 합니다.");
      else setError(err);
    } else {
      onClose();
    }
  };

  const baseInputStyle: React.CSSProperties = {
    width: "100%", background: "#1a1a1a",
    border: "1px solid #2a2a2a", borderRadius: 10,
    padding: "10px 12px 10px 38px",
    color: "var(--text-primary)", fontFamily: "DM Sans, sans-serif",
    fontSize: 14, outline: "none", boxSizing: "border-box",
    transition: "border-color 0.15s",
  };

  return (
    <AnimatePresence>
      {/* ── Backdrop ── */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 300,
          backgroundColor: "rgba(0,0,0,0.75)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          // 정가운데 정렬 컨테이너
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        {/* ── Modal (스크롤 가능한 컨테이너) ── */}
        <motion.div
          key="modal"
          initial={{ opacity: 0, scale: 0.93 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.93 }}
          transition={SPRING}
          onClick={e => e.stopPropagation()}
          style={{
            width: "min(440px, 92vw)",
            maxHeight: "90vh",          // 화면 높이의 90%로 제한
            overflowY: "auto",          // 내용이 길면 모달 내부에서 스크롤
            background: "#0f0f0f",
            border: "1px solid #242424",
            borderRadius: 20,
            boxShadow: "0 28px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)",
            // 스크롤바 스타일링
            scrollbarWidth: "thin",
            scrollbarColor: "#2a2a2a transparent",
          } as React.CSSProperties}
        >
          {/* ── 헤더 ── */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "18px 20px", borderBottom: "1px solid #1e1e1e",
            position: "sticky", top: 0, background: "#0f0f0f", zIndex: 1,
          }}>
            <div>
              <h2 style={{
                fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 18,
                color: "var(--text-primary)", margin: 0,
              }}>
                {mode === "login" ? "로그인" : "회원가입"}
              </h2>
              <p style={{
                fontFamily: "JetBrains Mono, monospace", fontSize: 11,
                color: "var(--text-secondary)", margin: "3px 0 0",
              }}>
                {mode === "login" ? "Talento에 오신 걸 환영합니다" : "새 계정을 만들어보세요"}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.06)", border: "1px solid #2a2a2a",
                borderRadius: 8, padding: 7, cursor: "pointer",
                color: "var(--text-secondary)", display: "flex", transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.color = "var(--text-primary)"; e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
            >
              <X size={15} />
            </button>
          </div>

          {/* ── 폼 바디 ── */}
          <form onSubmit={handleSubmit} style={{ padding: "20px" }}>

            {/* 탭 전환 */}
            <div style={{
              display: "flex", background: "#1a1a1a", borderRadius: 10,
              padding: 3, marginBottom: 20, border: "1px solid #242424",
            }}>
              {(["login", "signup"] as const).map(m => (
                <button
                  key={m} type="button"
                  onClick={() => { setMode(m); setError(null); }}
                  style={{
                    flex: 1, padding: "8px 0", borderRadius: 8, border: "none",
                    cursor: "pointer", fontFamily: "DM Sans, sans-serif",
                    fontSize: 13, fontWeight: 600, transition: "all 0.2s",
                    background: mode === m ? "linear-gradient(135deg, #e879f9, #c026d3)" : "transparent",
                    color: mode === m ? "white" : "var(--text-secondary)",
                    boxShadow: mode === m ? "0 4px 12px rgba(232,121,249,0.3)" : "none",
                  }}
                >
                  {m === "login" ? "로그인" : "회원가입"}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

              {/* 회원가입 전용 필드 */}
              <AnimatePresence initial={false}>
                {mode === "signup" && (
                  <motion.div
                    key="signup-fields"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.22 }}
                    style={{ overflow: "hidden", display: "flex", flexDirection: "column", gap: 12 }}
                  >
                    {/* 이름 */}
                    <div style={{ position: "relative" }}>
                      <User size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)", pointerEvents: "none" }} />
                      <input
                        type="text" placeholder="이름" value={name}
                        onChange={e => setName(e.target.value)}
                        style={baseInputStyle}
                        onFocus={e => (e.currentTarget.style.borderColor = "rgba(232,121,249,0.5)")}
                        onBlur={e  => (e.currentTarget.style.borderColor = "#2a2a2a")}
                      />
                    </div>

                    {/* 직군 선택 */}
                    <div style={{ display: "flex", gap: 8 }}>
                      {(["developer", "designer"] as const).map(r => {
                        const active = role === r;
                        const color  = r === "developer" ? "#a78bfa" : "#fb923c";
                        return (
                          <button
                            key={r} type="button" onClick={() => setRole(r)}
                            style={{
                              flex: 1, padding: "9px 0", borderRadius: 10, cursor: "pointer",
                              fontFamily: "JetBrains Mono, monospace", fontSize: 11, fontWeight: 600,
                              border: `1px solid ${active ? color + "60" : "#2a2a2a"}`,
                              background: active ? color + "15" : "#1a1a1a",
                              color: active ? color : "var(--text-secondary)",
                              transition: "all 0.15s",
                            }}
                          >
                            {r === "developer" ? "👨‍💻 개발자" : "🎨 디자이너"}
                          </button>
                        );
                      })}
                    </div>

                    {/* 직함 */}
                    <div style={{ position: "relative" }}>
                      <Briefcase size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)", pointerEvents: "none" }} />
                      <input
                        type="text" placeholder="직함 (예: 풀스택 개발자, UI/UX 디자이너)"
                        value={title} onChange={e => setTitle(e.target.value)}
                        style={baseInputStyle}
                        onFocus={e => (e.currentTarget.style.borderColor = "rgba(232,121,249,0.5)")}
                        onBlur={e  => (e.currentTarget.style.borderColor = "#2a2a2a")}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 이메일 */}
              <div style={{ position: "relative" }}>
                <Mail size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)", pointerEvents: "none" }} />
                <input
                  type="email" placeholder="이메일" value={email}
                  onChange={e => setEmail(e.target.value)} required
                  style={baseInputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = "rgba(232,121,249,0.5)")}
                  onBlur={e  => (e.currentTarget.style.borderColor = "#2a2a2a")}
                />
              </div>

              {/* 비밀번호 */}
              <div style={{ position: "relative" }}>
                <Lock size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)", pointerEvents: "none" }} />
                <input
                  type={showPw ? "text" : "password"} placeholder="비밀번호 (6자 이상)"
                  value={password} onChange={e => setPassword(e.target.value)} required
                  style={{ ...baseInputStyle, paddingRight: 40 }}
                  onFocus={e => (e.currentTarget.style.borderColor = "rgba(232,121,249,0.5)")}
                  onBlur={e  => (e.currentTarget.style.borderColor = "#2a2a2a")}
                />
                <button type="button" onClick={() => setShowPw(v => !v)} style={{
                  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--text-secondary)", display: "flex", padding: 4,
                }}>
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>

              {/* 에러 메시지 */}
              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    style={{
                      margin: 0, padding: "8px 12px", borderRadius: 8,
                      background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)",
                      color: "#f87171", fontFamily: "DM Sans, sans-serif", fontSize: 13,
                    }}
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              {/* 제출 버튼 */}
              <motion.button
                type="submit"
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                disabled={loading}
                style={{
                  width: "100%", padding: "12px 0", borderRadius: 12, border: "none",
                  cursor: loading ? "default" : "pointer",
                  background: loading ? "#2a2a2a" : "linear-gradient(135deg, #e879f9, #c026d3)",
                  color: loading ? "var(--text-secondary)" : "white",
                  fontFamily: "DM Sans, sans-serif", fontSize: 14, fontWeight: 700,
                  boxShadow: loading ? "none" : "0 6px 20px rgba(232,121,249,0.35)",
                  transition: "all 0.2s", marginTop: 4,
                }}
              >
                {loading ? "처리 중..." : mode === "login" ? "로그인" : "회원가입"}
              </motion.button>

              {/* 하단 안내 */}
              <p style={{
                margin: 0, textAlign: "center", fontSize: 12,
                color: "var(--text-secondary)", fontFamily: "DM Sans, sans-serif",
              }}>
                {mode === "login" ? (
                  <>계정이 없으신가요?{" "}
                    <button type="button" onClick={() => { setMode("signup"); setError(null); }}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent)", fontWeight: 600, padding: 0, fontSize: 12 }}>
                      회원가입
                    </button>
                  </>
                ) : (
                  <>이미 계정이 있으신가요?{" "}
                    <button type="button" onClick={() => { setMode("login"); setError(null); }}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent)", fontWeight: 600, padding: 0, fontSize: 12 }}>
                      로그인
                    </button>
                  </>
                )}
              </p>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
