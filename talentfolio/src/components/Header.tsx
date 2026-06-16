"use client";

import { useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Bookmark, LogIn, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface HeaderProps {
  bookmarkCount: number;
  showBookmarksOnly: boolean;
  onToggleBookmarks: () => void;
  onLogoClick: () => void;
  onLoginClick: () => void;
  onEditProfile?: () => void;
}

/** TalentFolio mark — rounded square badge with a sparkle (talent-spotlight) cut out */
function TalentFolioLogo() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0.5" y="0.5" width="29" height="29" rx="8" fill="var(--accent)" />
      <path
        d="M15 6.5L17.1 12.9L23.5 15L17.1 17.1L15 23.5L12.9 17.1L6.5 15L12.9 12.9Z"
        fill="#080808"
      />
    </svg>
  );
}

/** Sparkle glyph used in place of the second "o" in "Folio" — ties the wordmark to the icon */
function SparkleO({ size = 13 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ display: "inline-block", verticalAlign: "middle", marginBottom: 2, flexShrink: 0 }}
    >
      <circle cx="12" cy="12" r="11" fill="var(--accent)" />
      <path d="M12 5L13.7 10.3L19 12L13.7 13.7L12 19L10.3 13.7L5 12L10.3 10.3Z" fill="#080808" />
    </svg>
  );
}

export default function Header({
  bookmarkCount,
  showBookmarksOnly,
  onToggleBookmarks,
  onLogoClick,
  onLoginClick,
  onEditProfile,
}: HeaderProps) {
  const { user, profile, signOut } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();
  const bgOpacity = useTransform(scrollY, [0, 80], [0, 0.92]);
  const borderOpacity = useTransform(scrollY, [0, 80], [0, 1]);

  useEffect(() => {
    const unsub = scrollY.on("change", (y) => setScrolled(y > 20));
    return unsub;
  }, [scrollY]);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-[100] transition-all duration-300"
      style={{
        backdropFilter: scrolled ? "blur(24px) saturate(200%)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(24px) saturate(200%)" : "none",
      }}
    >
      <motion.div
        style={{ opacity: bgOpacity }}
        aria-hidden
        className="absolute inset-0 pointer-events-none"
      >
        <div className="absolute inset-0" style={{ backgroundColor: "#080808" }} />
      </motion.div>

      <motion.div
        style={{ opacity: borderOpacity }}
        aria-hidden
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
      >
        <div className="h-px" style={{ background: "linear-gradient(to right, transparent, var(--border-color), transparent)" }} />
      </motion.div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        {/* Logo + wordmark */}
        <button onClick={onLogoClick} className="flex items-center gap-3 cursor-pointer group">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}>
            <TalentFolioLogo />
          </motion.div>
          <div className="hidden sm:flex flex-col leading-none">
            <div
              className="flex items-baseline text-base"
              style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, letterSpacing: "-0.01em" }}
            >
              <span style={{ color: "var(--text-primary)" }}>Talent</span>
              <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>Foli</span>
              <SparkleO size={13} />
            </div>
            <span
              className="text-[9px] tracking-[0.32em] uppercase"
              style={{ color: "var(--text-secondary)", fontFamily: "Montserrat, sans-serif", fontWeight: 500 }}
            >
              Talent Discovery
            </span>
          </div>
        </button>

        {/* Right side: auth + bookmark */}
        <div className="flex items-center gap-2">

        {/* 로그인/프로필 버튼 */}
        {user && profile ? (
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={onEditProfile}
              title="내 프로필 편집"
              className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer"
              style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{
                width: 22, height: 22, borderRadius: "50%",
                backgroundColor: profile.role === "developer" ? "rgba(167,139,250,0.2)" : "rgba(251,146,60,0.2)",
                border: `1px solid ${profile.role === "developer" ? "rgba(167,139,250,0.4)" : "rgba(251,146,60,0.4)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 700, fontFamily: "Syne, sans-serif",
                color: profile.role === "developer" ? "var(--dev-color)" : "var(--des-color)",
              }}>
                {profile.name.slice(0, 1)}
              </div>
              <span className="text-sm" style={{ fontFamily: "DM Sans, sans-serif", color: "var(--text-primary)" }}>
                {profile.name}
              </span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={signOut}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl cursor-pointer"
              style={{
                backgroundColor: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "var(--text-secondary)",
              }}
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm hidden sm:block" style={{ fontFamily: "DM Sans, sans-serif" }}>로그아웃</span>
            </motion.button>
          </div>
        ) : (
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={onLoginClick}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl cursor-pointer"
            style={{
              background: "linear-gradient(135deg, #e879f9, #c026d3)",
              color: "white",
              border: "none",
              boxShadow: "0 4px 14px rgba(232,121,249,0.35)",
              fontFamily: "DM Sans, sans-serif",
              fontSize: 14, fontWeight: 600,
            }}
          >
            <LogIn className="w-4 h-4" />
            <span className="text-sm hidden sm:block">로그인</span>
          </motion.button>
        )}

        {/* Bookmark toggle */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onToggleBookmarks}
          className="relative flex items-center gap-2 px-3 py-2 rounded-xl transition-colors duration-200 cursor-pointer"
          style={{
            backgroundColor: showBookmarksOnly ? "rgba(251,146,60,0.12)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${showBookmarksOnly ? "rgba(251,146,60,0.4)" : "rgba(255,255,255,0.08)"}`,
            color: showBookmarksOnly ? "var(--accent-alt)" : "var(--text-secondary)",
          }}
        >
          <Bookmark className="w-4 h-4" fill={showBookmarksOnly ? "currentColor" : "none"} />
          <span className="text-sm hidden sm:block" style={{ fontFamily: "DM Sans, sans-serif" }}>
            북마크
          </span>
          {bookmarkCount > 0 && (
            <motion.span
              key={bookmarkCount}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #e879f9, #fb923c)",
                color: "white",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              {bookmarkCount}
            </motion.span>
          )}
        </motion.button>

        </div>{/* end right-side flex */}
      </div>
    </header>
  );
}
