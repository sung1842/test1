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
  const bgOpacity = useTransform(scrollY, [0, 80], [0, 0.95]);
  const borderOpacity = useTransform(scrollY, [0, 80], [0, 1]);

  useEffect(() => {
    const unsub = scrollY.on("change", (y) => setScrolled(y > 20));
    return unsub;
  }, [scrollY]);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-[100] transition-all duration-300"
      style={{
        backdropFilter: scrolled ? "blur(24px) saturate(180%)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(24px) saturate(180%)" : "none",
      }}
    >
      <motion.div
        style={{ opacity: bgOpacity }}
        aria-hidden
        className="absolute inset-0 pointer-events-none"
      >
        <div className="absolute inset-0" style={{ backgroundColor: "#2c1810" }} />
      </motion.div>

      <motion.div
        style={{ opacity: borderOpacity }}
        aria-hidden
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
      >
        <div
          className="h-px"
          style={{
            background:
              "linear-gradient(to right, transparent, rgba(232,41,74,0.3), transparent)",
          }}
        />
      </motion.div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        {/* ── Logo wordmark ── */}
        <button onClick={onLogoClick} className="flex flex-col leading-none cursor-pointer group">
          <motion.div
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex flex-col leading-none"
          >
            {/* Brand title — SerreriaSobria */}
            <span
              style={{
                fontFamily: "SerreriaSobria, serif",
                fontSize: 22,
                fontWeight: 400,
                letterSpacing: "0.04em",
                color: "var(--text-primary)",
                lineHeight: 1,
              }}
            >
              Talent
              <span style={{ color: "var(--accent)" }}>Folio</span>
            </span>
            {/* Subtitle — AlanisHand */}
            <span
              style={{
                fontFamily: "AlanisHand, cursive",
                fontSize: 11,
                color: "var(--text-secondary)",
                letterSpacing: "0.06em",
                lineHeight: 1.4,
                marginTop: 2,
              }}
            >
              Talent Discovery
            </span>
          </motion.div>
        </button>

        {/* ── Right side: auth + bookmark ── */}
        <div className="flex items-center gap-2">

          {/* 로그인/프로필 버튼 */}
          {user && profile ? (
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={onEditProfile}
                title="내 프로필 편집"
                className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer"
                style={{
                  backgroundColor: "rgba(245,237,228,0.06)",
                  border: "1px solid rgba(245,237,228,0.1)",
                }}
              >
                <div style={{
                  width: 22, height: 22, borderRadius: "50%",
                  backgroundColor:
                    profile.role === "developer"
                      ? "rgba(232,41,74,0.2)"
                      : "rgba(196,144,110,0.2)",
                  border: `1px solid ${
                    profile.role === "developer"
                      ? "rgba(232,41,74,0.4)"
                      : "rgba(196,144,110,0.4)"
                  }`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 700,
                  fontFamily: "SerreriaSobria, serif",
                  color:
                    profile.role === "developer"
                      ? "var(--dev-color)"
                      : "var(--des-color)",
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
                  backgroundColor: "rgba(245,237,228,0.04)",
                  border: "1px solid rgba(245,237,228,0.08)",
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
                background: "linear-gradient(135deg, #e8294a, #b5182d)",
                color: "white",
                border: "none",
                boxShadow: "0 4px 14px rgba(232,41,74,0.35)",
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
              backgroundColor: showBookmarksOnly
                ? "rgba(196,144,110,0.12)"
                : "rgba(245,237,228,0.04)",
              border: `1px solid ${
                showBookmarksOnly
                  ? "rgba(196,144,110,0.4)"
                  : "rgba(245,237,228,0.08)"
              }`,
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
                  background: "linear-gradient(135deg, #e8294a, #c4906e)",
                  color: "white",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {bookmarkCount}
              </motion.span>
            )}
          </motion.button>

        </div>
      </div>
    </header>
  );
}
