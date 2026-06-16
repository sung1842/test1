"use client";

import { useState, useEffect, KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Check } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

interface ProfileEditModalProps {
  onClose: () => void;
  onSaved?: () => void;
}

const SPRING = { type: "spring" as const, stiffness: 360, damping: 28 };

export default function ProfileEditModal({ onClose, onSaved }: ProfileEditModalProps) {
  const { user, profile } = useAuth();

  const [shortBio, setShortBio]         = useState("");
  const [longBio, setLongBio]           = useState("");
  const [skills, setSkills]             = useState<string[]>([]);
  const [skillInput, setSkillInput]     = useState("");
  const [githubUrl, setGithubUrl]       = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [behanceUrl, setBehanceUrl]     = useState("");
  const [linkedinUrl, setLinkedinUrl]   = useState("");
  const [isPublic, setIsPublic]         = useState(true);

  const [loading, setSaving] = useState(false);
  const [saved, setSaved]    = useState(false);
  const [error, setError]    = useState("");

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).single().then(({ data }) => {
      if (!data) return;
      setShortBio(data.short_bio ?? "");
      setLongBio(data.long_bio ?? "");
      setSkills(data.skills ?? []);
      setGithubUrl(data.github_url ?? "");
      setPortfolioUrl(data.portfolio_url ?? "");
      setBehanceUrl(data.behance_url ?? "");
      setLinkedinUrl(data.linkedin_url ?? "");
      setIsPublic(data.is_public ?? true);
    });
  }, [user]);

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !skills.includes(s)) setSkills((prev) => [...prev, s]);
    setSkillInput("");
  };

  const removeSkill = (s: string) => setSkills((prev) => prev.filter((x) => x !== s));

  const handleSkillKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addSkill(); }
    if (e.key === "Backspace" && !skillInput && skills.length > 0) {
      setSkills((prev) => prev.slice(0, -1));
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError("");

    const { error: err } = await supabase.from("profiles").update({
      short_bio:     shortBio || null,
      long_bio:      longBio  || null,
      skills:        skills,
      github_url:    githubUrl    || null,
      portfolio_url: portfolioUrl || null,
      behance_url:   behanceUrl   || null,
      linkedin_url:  linkedinUrl  || null,
      is_public:     isPublic,
    }).eq("id", user.id);

    setSaving(false);
    if (err) {
      setError("저장 중 오류가 발생했습니다: " + err.message);
      return;
    }
    setSaved(true);
    onSaved?.();
    setTimeout(() => { setSaved(false); onClose(); }, 1000);
  };

  const roleColor = profile?.role === "developer" ? "#f6042e" : "#ffae2e";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        backgroundColor: "rgba(2,0,5,0.9)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 32, scale: 0.95 }}
        transition={SPRING}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 560, maxHeight: "90vh",
          overflowY: "auto",
          background: "#0d0918",
          border: "1px solid #271c32",
          borderRadius: 20,
          padding: "28px 28px 24px",
          display: "flex", flexDirection: "column", gap: 20,
        }}
      >
        {/* 헤더 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h2 style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 700, fontSize: 18, color: "var(--text-primary)", margin: 0 }}>
              내 프로필 편집
            </h2>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
              {profile?.name} · <span style={{ color: roleColor }}>{profile?.role === "developer" ? "개발자" : "디자이너"}</span>
            </p>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid #271c32", borderRadius: 8, padding: 7, cursor: "pointer", color: "var(--text-secondary)", display: "flex" }}>
            <X size={15} />
          </button>
        </div>

        {/* 공개 여부 토글 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid #271c32", borderRadius: 12 }}>
          <div>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, fontSize: 13, color: "var(--text-primary)", margin: 0 }}>인재 목록에 공개</p>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: 11, color: "var(--text-secondary)", margin: "2px 0 0" }}>켜면 메인 페이지 목록에 표시됩니다</p>
          </div>
          <button
            onClick={() => setIsPublic((v) => !v)}
            style={{
              width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
              background: isPublic ? "linear-gradient(135deg, #f6042e, #c0001e)" : "#16101f",
              position: "relative", transition: "background 0.2s", flexShrink: 0,
            }}
          >
            <motion.div
              animate={{ x: isPublic ? 22 : 2 }}
              transition={{ type: "spring" as const, stiffness: 500, damping: 30 }}
              style={{ position: "absolute", top: 2, width: 20, height: 20, borderRadius: "50%", background: "white" }}
            />
          </button>
        </div>

        {/* 한 줄 소개 */}
        <Field label="한 줄 소개" hint="카드에 표시되는 짧은 소개 (60자 이내)">
          <input
            value={shortBio}
            onChange={(e) => setShortBio(e.target.value)}
            maxLength={80}
            placeholder="예: React·Node 5년차, SaaS 제품 다수 출시 경험"
            style={inputStyle}
          />
        </Field>

        {/* 상세 소개 */}
        <Field label="상세 소개" hint="프로필 상세 패널에 표시됩니다">
          <textarea
            value={longBio}
            onChange={(e) => setLongBio(e.target.value)}
            rows={4}
            placeholder="경력, 프로젝트, 관심사 등을 자유롭게 작성하세요..."
            style={{ ...inputStyle, resize: "vertical", minHeight: 100 }}
          />
        </Field>

        {/* 스킬 */}
        <Field label="스킬 태그" hint="Enter 또는 쉼표로 추가">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "8px 10px", background: "#0b0812", border: "1px solid #271c32", borderRadius: 10 }}>
            {skills.map((s) => (
              <span key={s} style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", background: "rgba(246,4,46,0.1)", border: "1px solid rgba(246,4,46,0.25)", borderRadius: 6, fontSize: 12, color: "#f6042e", fontFamily: "JetBrains Mono, monospace" }}>
                {s}
                <button onClick={() => removeSkill(s)} style={{ background: "none", border: "none", cursor: "pointer", color: "#f6042e", opacity: 0.6, padding: 0, display: "flex", lineHeight: 1 }}>
                  <X size={11} />
                </button>
              </span>
            ))}
            <input
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={handleSkillKeyDown}
              placeholder={skills.length === 0 ? "React, TypeScript, Figma..." : ""}
              style={{ background: "none", border: "none", outline: "none", color: "var(--text-primary)", fontFamily: "DM Sans, sans-serif", fontSize: 13, minWidth: 120, flex: 1 }}
            />
          </div>
        </Field>

        {/* 링크들 */}
        <Field label="링크">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <LinkInput label="GitHub" value={githubUrl} onChange={setGithubUrl} placeholder="https://github.com/username" />
            <LinkInput label="포트폴리오" value={portfolioUrl} onChange={setPortfolioUrl} placeholder="https://myportfolio.com" />
            <LinkInput label="Behance" value={behanceUrl} onChange={setBehanceUrl} placeholder="https://behance.net/username" />
            <LinkInput label="LinkedIn" value={linkedinUrl} onChange={setLinkedinUrl} placeholder="https://linkedin.com/in/username" />
          </div>
        </Field>

        {/* 에러 */}
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ fontFamily: "DM Sans, sans-serif", fontSize: 12, color: "#f87171", margin: 0 }}
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        {/* 저장 버튼 */}
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          disabled={loading}
          style={{
            width: "100%", padding: "12px",
            background: saved ? "linear-gradient(135deg, #22c55e, #16a34a)" : "linear-gradient(135deg, #f6042e, #c0001e)",
            border: "none", borderRadius: 12, cursor: "pointer",
            color: "white", fontFamily: "DM Sans, sans-serif", fontWeight: 700, fontSize: 14,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            transition: "background 0.3s",
          }}
        >
          {loading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : saved ? <Check size={16} /> : null}
          {loading ? "저장 중..." : saved ? "저장 완료!" : "저장하기"}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <label style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, fontSize: 13, color: "var(--text-primary)" }}>{label}</label>
        {hint && <span style={{ fontFamily: "DM Sans, sans-serif", fontSize: 11, color: "var(--text-secondary)" }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function LinkInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "var(--text-secondary)", minWidth: 64, textAlign: "right" }}>{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ ...inputStyle, flex: 1 }}
      />
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#0f0b18",
  border: "1px solid #271c32",
  borderRadius: 10,
  padding: "9px 12px",
  color: "var(--text-primary)",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
};
