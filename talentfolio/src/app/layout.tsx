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
  title: "Talentfolio · 작업물로 만나는 채용",
  description: "구직자는 작업물로 보여 주고, 기업은 JD 한 장으로 AI가 먼저 찾아 둔 후보를 만나는 채용 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${serreriaSobria.variable} ${alanisHand.variable}`}>
      <body>
        <a className="tf-skip" href="#main">본문으로 건너뛰기</a>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
