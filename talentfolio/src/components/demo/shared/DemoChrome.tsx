"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import "./demo-chrome.css";

export function DemoChrome({
  children,
  variant,
  accent,
}: {
  children: ReactNode;
  variant: "spec" | "enterprise" | "masterpiece";
  accent: string;
}) {
  const labels = {
    spec: "A · SPEC",
    enterprise: "B · ENTERPRISE",
    masterpiece: "C · MASTERPIECE",
  };

  return (
    <div className={`demo-root demo-${variant}`}>
      <div className="demo-topbar">
        <Link href="/demo" className="demo-back">시안 목록</Link>
        <span className="demo-badge" style={{ color: accent }}>{labels[variant]}</span>
        <Link href="/" className="demo-back">기존 메인</Link>
      </div>
      {children}
    </div>
  );
}
