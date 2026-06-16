import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

// ── Brand fonts (logo only) ──────────────────────────────────────────────────
const serreriaSobria = localFont({
  src: "./fonts/SerreriaSobria.ttf",
  variable: "--font-serreria",
  display: "swap",
});

const alanisHand = localFont({
  src: "./fonts/AlanisHand.ttf",
  variable: "--font-alanis",
  display: "swap",
});

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
    <html lang="ko" className={`${serreriaSobria.variable} ${alanisHand.variable}`}>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
