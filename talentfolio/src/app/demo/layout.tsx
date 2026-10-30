import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

// 이전 디자인 시안 모음. 개발 환경에서만 열고, 배포본에서는 404 + 검색 제외.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function DemoLayout({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_SHOW_DEMO !== "1") notFound();
  return children;
}
