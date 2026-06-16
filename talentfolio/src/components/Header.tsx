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
  const bgOpacity = useTransform(scrollY, [0, 80], [0, 0.97]);
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
      {/* Backdrop fill */}
      <motion.div
        style={{ opacity: bgOpacity }}
        aria-hidden
        className="absolute inset-0 pointer-events-none"
      >
        <div className="absolute inset-0" style={{ backgroundColor: "#020005" }} />
      </motion.div>

      {/* Bottom border — crimson accent line */}
      <motion.div
        style={{ opacity: borderOpacity }}
        aria-hidden
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
      >
        <div
          className="h-px"
          style={{
            background:
              "linear-gradient(to right, transparent, rgba(246,4,46,0.5), transparent)",
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
            {/* Brand title — SerreriaSobria (logo only) */}
            <span
              style={{
                fontFamily: "var(--font-serreria), serif",
                fontSize: 23,
                fontWeight: 400,
                letterSpacing: "0.03em",
                color: "#f0ecf8",
                lineHeight: 1,
              }}
            >
              Talent
              <span style={{ color: "#f6042e" }}>Folio</span>
            </span>
            {/* Subtitle — AlanisHand (logo only) */}
            <span
              style={{
                fontFamily: "var(--font-alanis), cursive",
                fontSize: 12,
                color: "var(--text-secondary)",
                letterSpacing: "0.04em",
                lineHeight: 1.4,
                marginTop: 1,
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
                  backgroundColor: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div style={{
                  width: 22, height: 22, borderRadius: "50%",
                  backgroundColor:
                    profile.role === "developer"
                      ? "rgba(246,4,46,0.18)"
                      : "rgba(255,174,46,0.18)",
                  border: `1px solid ${
                    profile.role === "developer"
                      ? "rgba(246,4,46,0.45)"
                      : "rgba(255,174,46,0.45)"
                  }`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 700,
                  fontFamily: "DM Sans, sans-serif",
                  color:
                    profile.role === "developer"
                      ? "#f6042e"
                      : "#ffae2e",
                }}>
                  {profile.name.slice(0, 1)}
                </div>
                <span className="text-sm" style={{ fontFamily: "DM Sans, sans-serif", color: "#f0ecf8" }}>
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
                background: "linear-gradient(135deg, #f6042e, #c0001e)",
                color: "white",
                border: "none",
                boxShadow: "0 4px 16px rgba(246,4,46,0.4)",
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
                ? "rgba(255,174,46,0.1)"
                : "rgba(255,255,255,0.04)",
              border: `1px solid ${
                showBookmarksOnly
                  ? "rgba(255,174,46,0.4)"
                  : "rgba(255,255,255,0.08)"
              }`,
              color: showBookmarksOnly ? "#ffae2e" : "var(--text-secondary)",
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
                  background: "linear-gradient(135deg, #f6042e, #c0001e)",
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
