import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TalentFolio — 개발자·디자이너 이력서 열람 플랫폼",
  description: "기업 인사팀을 위한 개발자·디자이너 포트폴리오 열람 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
