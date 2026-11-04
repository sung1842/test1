import Link from "next/link";
import { SiteFooter } from "@/components/site/SiteFooter";
import { BIZ } from "@/lib/legal";
import "./legal-page.css";

/** 법적 고지 페이지 공통 틀 (비로그인 공개). 본문은 초안 — 게시 전 법률 검토 필요 */
export function LegalPage({ title, children, dated = true }: { title: string; children: React.ReactNode; dated?: boolean }) {
  return (
    <>
      <main className="legal">
        <Link className="legal-home" href="/">← {BIZ.serviceName}</Link>
        <h1>{title}</h1>
        {dated && <p className="legal-date">시행일 {BIZ.effectiveDate}</p>}
        <div className="legal-body">{children}</div>
      </main>
      <SiteFooter />
    </>
  );
}
