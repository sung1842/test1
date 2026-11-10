"use client";

// 스카우트 건 만들기. 헤더·탭은 DeskFrame, 등록한 건의 분석 현황은 /sourcing/cases 에서 관리한다.
import { isJdAnalyzerConfigured, JD_ANALYZER_URL } from "@/types/fitReport";
import ServiceUnavailable from "@/components/ServiceUnavailable";
import { ScoutCaseForm } from "@/components/desk/ScoutCaseForm";
import { SourcingNav } from "@/components/desk/SourcingNav";

export default function SourcingPage() {
  const available = isJdAnalyzerConfigured() && Boolean(JD_ANALYZER_URL);
  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "28px 20px 80px" }}>
      <SourcingNav />
      <div className="mb-8">
        <span className="tf-label">데스크 · 스카우트 건</span>
        <h1 className="tf-h1" style={{ fontSize: "clamp(28px,4vw,40px)" }}>
          스카우트 건 <em>만들기</em>
        </h1>
        <p className="tf-lead">
          공고 조건과 본문을 넣으면 AI가 키워드를 정리하고 후보를 찾아 승인함에 올려요. <b>승인 전에는 후보에게 아무것도 나가지 않아요.</b>
        </p>
      </div>
      {available ? (
        <ScoutCaseForm />
      ) : (
        <ServiceUnavailable title="스카우트 건" description="jd-fit-analyzer 가 연결되면 스카우트 건을 만들 수 있습니다." />
      )}
    </div>
  );
}
