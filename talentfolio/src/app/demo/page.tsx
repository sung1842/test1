import Link from "next/link";

const DEMOS = [
  {
    href: "/demo/spec",
    tag: "A · SPEC",
    title: "말한 대로",
    body: "흰 바탕 + 청록 포인트. skiper39 군중 배경, 글라스 래퍼, 폴더 프로필 카드.",
  },
  {
    href: "/demo/enterprise",
    tag: "B · ENTERPRISE",
    title: "대형 웹 양식",
    body: "Linear / Notion / LinkedIn Talent 쪽이 쓰는 밀도, 정렬, 여백.",
  },
  {
    href: "/demo/masterpiece",
    tag: "C · MASTERPIECE",
    title: "래퍼런스 걸작",
    body: "Apple / Vercel / Arc 쪽 타이포와 글라스 레이어를 한 장으로.",
  },
] as const;

export default function DemoIndexPage() {
  return (
    <main style={{ minHeight: "100vh", background: "#f4f7f5", color: "#10231c", padding: "72px 24px 96px" }}>
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <p style={{ fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.5 }}>
          Temporary design loop · 채택 후 src/app/demo 삭제
        </p>
        <h1 style={{ fontSize: 40, letterSpacing: "-0.04em", margin: "12px 0 8px", fontWeight: 650 }}>
          Talentfolio 시안 3장
        </h1>
        <p style={{ maxWidth: 560, lineHeight: 1.6, opacity: 0.7 }}>
          메인(`/`)은 그대로 둡니다. 아래 세 경로만 갈아엎은 데모입니다. 안 쓰는 두 개는 폴더째 지우면 됩니다.
        </p>
        <div style={{ display: "grid", gap: 16, marginTop: 36 }}>
          {DEMOS.map((demo) => (
            <Link
              key={demo.href}
              href={demo.href}
              style={{
                display: "block",
                padding: "22px 24px",
                borderRadius: 22,
                background: "rgba(255,255,255,0.62)",
                border: "1px solid rgba(16,35,28,0.08)",
                boxShadow: "0 18px 40px -28px rgba(16,35,28,0.35)",
                backdropFilter: "blur(16px)",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div style={{ fontSize: 11, letterSpacing: "0.16em", opacity: 0.5 }}>{demo.tag}</div>
              <div style={{ fontSize: 22, fontWeight: 650, marginTop: 6 }}>{demo.title}</div>
              <div style={{ fontSize: 14, opacity: 0.68, marginTop: 6, lineHeight: 1.5 }}>{demo.body}</div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
