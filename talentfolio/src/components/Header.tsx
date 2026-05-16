"use client";

import { useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Bookmark } from "lucide-react";

interface HeaderProps {
  bookmarkCount: number;
  showBookmarksOnly: boolean;
  onToggleBookmarks: () => void;
  onLogoClick: () => void;
}

/** Talento wordmark SVG logo */
function TalentoLogo() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer hexagon */}
      <path
        d="M16 2L29 9.5V22.5L16 30L3 22.5V9.5L16 2Z"
        fill="url(#logo-grad)"
        opacity="0.15"
      />
      <path
        d="M16 2L29 9.5V22.5L16 30L3 22.5V9.5L16 2Z"
        stroke="url(#logo-grad)"
        strokeWidth="1.5"
        fill="none"
      />
      {/* Inner T mark */}
      <path
        d="M10 11H22M16 11V21"
        stroke="url(#logo-grad)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Spark dot */}
      <circle cx="22" cy="11" r="2" fill="url(#logo-grad)" />
      <defs>
        <linearGradient id="logo-grad" x1="3" y1="2" x2="29" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#e879f9" />
          <stop offset="1" stopColor="#fb923c" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function Header({
  bookmarkCount,
  showBookmarksOnly,
  onToggleBookmarks,
  onLogoClick,
}: HeaderProps) {
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

      <div className="relative max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo + wordmark */}
        <button onClick={onLogoClick} className="flex items-center gap-3 cursor-pointer group">
          <motion.div whileHover={{ scale: 1.08, rotate: 5 }} whileTap={{ scale: 0.95 }}>
            <TalentoLogo />
          </motion.div>
          <div className="hidden sm:flex flex-col leading-none">
            <span
              className="text-base font-black tracking-[0.15em] uppercase"
              style={{
                fontFamily: "Syne, sans-serif",
                background: "linear-gradient(to right, #e879f9, #fb923c)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Talento
            </span>
            <span
              className="text-[9px] tracking-[0.3em] uppercase"
              style={{ color: "var(--text-secondary)", fontFamily: "JetBrains Mono, monospace" }}
            >
              talent discovery
            </span>
          </div>
        </button>

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
      </div>
    </header>
  );
}
