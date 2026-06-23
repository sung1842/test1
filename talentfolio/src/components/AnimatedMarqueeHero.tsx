"use client";

import React, { useRef } from "react";
import { motion, useAnimationFrame, useMotionValue } from "framer-motion";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

interface AnimatedMarqueeHeroProps {
  tagline: string;
  title: React.ReactNode;
  description: string;
  ctaText?: string;
  images: string[];
  className?: string;
  onCtaClick?: () => void;
}

function fadeUp(delay: number) {
  return {
    initial: { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: "easeOut" as const, delay },
  };
}

function Marquee({ images }: { images: string[] }) {
  const duplicated = [...images, ...images, ...images];
  const x = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useAnimationFrame((_, delta) => {
    const el = containerRef.current;
    if (!el) return;
    const third = el.scrollWidth / 3;
    let next = x.get() - 0.4 * (delta / 16);
    if (next <= -third) next += third;
    x.set(next);
  });

  return (
    <div className="overflow-hidden w-full">
      <motion.div
        ref={containerRef}
        style={{ x, display: "flex", gap: "16px", willChange: "transform" }}
      >
        {duplicated.map((src, i) => (
          <div
            key={i}
            className="relative flex-shrink-0"
            style={{
              width: 200,
              height: 260,
              transform: `rotate(${i % 3 === 0 ? -2 : i % 3 === 1 ? 3 : -1}deg)`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={`UI showcase ${i + 1}`}
              className="w-full h-full object-cover rounded-2xl"
              style={{
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
              loading="lazy"
            />
            <div
              className="absolute inset-0 rounded-2xl"
              style={{
                background:
                  "linear-gradient(160deg, rgba(255,255,255,0.04) 0%, transparent 60%)",
              }}
            />
          </div>
        ))}
      </motion.div>
    </div>
  );
}

export const AnimatedMarqueeHero: React.FC<AnimatedMarqueeHeroProps> = ({
  title,
  description,
  images,
  className,
  onCtaClick,
}) => {
  return (
    <section
      className={cn(
        "relative w-full min-h-screen overflow-hidden flex flex-col items-center justify-center text-center",
        className
      )}
      style={{ backgroundColor: "var(--background)" }}
    >
      {/* Radial accent glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 45%, rgba(246,4,46,0.1) 0%, transparent 70%)",
        }}
      />

      {/* Subtle grid texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(var(--border-color) 1px, transparent 1px), linear-gradient(90deg, var(--border-color) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Text block */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 pb-8 pt-24 md:pt-32 w-full">
        {/* Main title */}
        <motion.h1
          {...fadeUp(0.15)}
          className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] text-center w-full"
          style={{ fontFamily: "DM Sans, sans-serif", color: "var(--text-primary)" }}
        >
          {title}
        </motion.h1>

        {/* Description */}
        <motion.p
          {...fadeUp(0.3)}
          className="mt-6 max-w-lg text-base md:text-lg leading-relaxed text-center"
          style={{ color: "var(--text-secondary)" }}
        >
          {description}
        </motion.p>

        {/* Stats row */}
        <motion.div
          {...fadeUp(0.42)}
          className="mt-10 flex items-center gap-6 sm:gap-10"
        >
          {[
            { value: "10+", label: "후보자" },
            { value: "2", label: "직군" },
            { value: "100%", label: "무료 열람" },
          ].map(({ value, label }, i) => (
            <React.Fragment key={label}>
              {i > 0 && (
                <div
                  className="w-px h-8 self-center"
                  style={{ backgroundColor: "var(--border-color)" }}
                />
              )}
              <div className="flex flex-col items-center gap-0.5">
                <span
                  className="text-2xl font-bold"
                  style={{ fontFamily: "DM Sans, sans-serif", color: "var(--text-primary)" }}
                >
                  {value}
                </span>
                <span
                  className="text-xs"
                  style={{ color: "var(--text-secondary)", fontFamily: "DM Sans, sans-serif" }}
                >
                  {label}
                </span>
              </div>
            </React.Fragment>
          ))}
        </motion.div>
      </div>

      {/* Image marquee strip */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.65 }}
        className="relative w-full mt-4"
        style={{
          maskImage:
            "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
        }}
      >
        <Marquee images={images} />
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.3, duration: 0.6 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 cursor-pointer"
        onClick={onCtaClick}
        style={{ color: "var(--text-secondary)" }}
      >
        <span
          className="text-xs"
          style={{ fontFamily: "DM Sans, sans-serif" }}
        >
          scroll
        </span>
        <motion.div
          animate={{ y: [0, 5, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronDown className="w-4 h-4" />
        </motion.div>
      </motion.div>
    </section>
  );
};
