"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { readRole, writeRole } from "@/lib/productData";
import { SiteHeader } from "@/components/site/SiteHeader";
import "@/components/start/start.css";

const DOORS = [
  {
    cls: "a",
    href: "/studio",
    role: "talent" as const,
    k: "구직자",
    title: "포트폴리오로 시작하기",
    sub: "작업물을 올려 두면, 기업이 먼저 제안해 와요.",
    steps: ["포트폴리오·이력서를 올리고 정리해요", "관심 있는 공고는 관심·지원·보류로 모아요", "내게 맞는 기업의 제안과 핏 리포트를 받아요"],
    go: "포트폴리오 입력하기",
  },
  {
    cls: "b",
    href: "/desk",
    role: "hunter" as const,
    k: "기업",
    title: "JD로 시작하기",
    sub: "JD만 넣어 두면, AI가 후보를 먼저 찾아 와요.",
    steps: ["채용하려는 포지션의 JD를 입력해요", "AI가 찾은 후보를 핏 %와 리포트로 받아요", "후보를 나란히 비교하고 제안을 보내요"],
    go: "JD 입력하기",
  },
];

export default function StartPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  // 이미 로그인했다면 입구를 다시 고르게 하지 않고 내 홈으로 보낸다.
  useEffect(() => {
    if (!loading && user) router.replace(readRole() === "hunter" ? "/desk" : "/studio");
  }, [loading, user, router]);

  return (
    <div className="tf-start">
      <SiteHeader crumb="입장 선택" />
      <main id="main">
        <section className="intro">
          <span className="label">시작하기</span>
          <h1>어느 쪽으로 시작할까요?</h1>
          <p className="lead">입장에 맞는 화면만 보여 드려요. 선택은 언제든 다시 바꿀 수 있어요.</p>
        </section>

        <div className="doors">
          {DOORS.map((d) => (
            <Link key={d.cls} className={`door ${d.cls}`} href={d.href} onClick={() => writeRole(d.role)}>
              <div className="head">
                <span className="k">{d.k}</span>
                <span className="arrow" aria-hidden="true">→</span>
              </div>
              <div>
                <h2 className="big">{d.title}</h2>
                <p className="sub">{d.sub}</p>
              </div>
              <ol className="steps">
                {d.steps.map((s) => <li key={s}>{s}</li>)}
              </ol>
              <span className="go">{d.go} →</span>
            </Link>
          ))}
        </div>
        <p className="note">이미 계정이 있나요? <Link href="/login">로그인</Link></p>
      </main>
    </div>
  );
}
