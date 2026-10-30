"use client";

import { cn } from "@/lib/utils";
import { motion, useReducedMotion, useSpring } from "framer-motion";
import {
  type CSSProperties,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useId,
  useState,
} from "react";

const SPRING = { damping: 34, mass: 0.5, stiffness: 250 } as const;

const ringMask = (width: number): CSSProperties => ({
  boxSizing: "border-box",
  maskClip: "content-box, border-box",
  maskComposite: "exclude",
  maskImage:
    "linear-gradient(oklch(0 0 0), oklch(0 0 0)), linear-gradient(oklch(0 0 0), oklch(0 0 0))",
  padding: width,
  WebkitMaskClip: "content-box, border-box",
  WebkitMaskComposite: "xor",
  WebkitMaskImage:
    "linear-gradient(oklch(0 0 0), oklch(0 0 0)), linear-gradient(oklch(0 0 0), oklch(0 0 0))",
});

export interface GlassCardProps {
  blur?: number;
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  radius?: number;
  rimWidth?: number;
  tint?: string;
}

/** 21st.dev @educalvolpz/glass-card — ported to framer-motion */
export default function GlassCard({
  blur = 14,
  children,
  className,
  interactive = true,
  radius = 24,
  rimWidth = 10,
  tint = "oklch(1 0 0 / 0.22)",
}: GlassCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const rawId = useId();
  const filterId = `demo-glass-${rawId.replace(/:/g, "")}`;
  const [isHoverDevice, setIsHoverDevice] = useState(false);
  const specularX = useSpring(0, SPRING);
  const specularY = useSpring(0, SPRING);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const query = window.matchMedia("(hover: hover) and (pointer: fine)");
    setIsHoverDevice(query.matches);
    const onChange = (event: MediaQueryListEvent) => setIsHoverDevice(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const tracks = interactive && isHoverDevice && !shouldReduceMotion;

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      specularX.set(event.clientX - rect.left - rect.width * 0.3);
      specularY.set(event.clientY - rect.top - rect.height * 0.28);
    },
    [specularX, specularY],
  );

  const bodyFilters = `blur(${blur}px) saturate(160%) brightness(1.04)`;

  return (
    <motion.div
      className={cn("relative overflow-hidden", className)}
      onPointerMove={tracks ? handlePointerMove : undefined}
      onPointerLeave={tracks ? () => { specularX.set(0); specularY.set(0); } : undefined}
      style={{
        borderRadius: radius,
        boxShadow: "0 22px 50px -24px oklch(0.35 0.04 180 / 0.28), 0 8px 20px -14px oklch(0.4 0.03 200 / 0.18)",
      }}
      whileHover={tracks ? { y: -3, scale: 1.006 } : undefined}
    >
      <svg aria-hidden className="pointer-events-none absolute h-0 w-0">
        <filter id={filterId}>
          <feTurbulence baseFrequency="0.016 0.024" numOctaves={2} result="noise" seed={7} type="fractalNoise" />
          <feGaussianBlur in="noise" result="soft" stdDeviation={1.4} />
          <feDisplacementMap in="SourceGraphic" in2="soft" scale={18} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <div
        aria-hidden
        className="absolute"
        style={{
          backdropFilter: bodyFilters,
          WebkitBackdropFilter: bodyFilters,
          backgroundColor: tint,
          borderRadius: Math.max(radius - rimWidth, 8),
          inset: rimWidth,
          boxShadow: "inset 0 1px 0 oklch(1 0 0 / 0.55), inset 0 0 0 1px oklch(1 0 0 / 0.18)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 rounded-[inherit]"
        style={{
          ...ringMask(rimWidth),
          backdropFilter: `url(#${filterId}) blur(1px) saturate(170%)`,
          WebkitBackdropFilter: `url(#${filterId}) blur(1px) saturate(170%)`,
        }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          backgroundImage: "radial-gradient(closest-side, oklch(1 0 0 / 0.45), transparent 74%)",
          height: 240,
          width: 240,
          left: "30%",
          top: "28%",
          marginLeft: -120,
          marginTop: -120,
          mixBlendMode: "plus-lighter",
          x: specularX,
          y: specularY,
        }}
      />
      <div className="relative" style={{ padding: Math.max(20, rimWidth + 8) }}>
        {children}
      </div>
    </motion.div>
  );
}
