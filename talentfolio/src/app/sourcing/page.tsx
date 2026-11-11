"use client";

// 스카우트 건 만들기. 사이드바 셸은 DeskFrame, 등록한 건의 분석 현황은 /sourcing/cases 에서 관리한다.
import { isJdAnalyzerConfigured, JD_ANALYZER_URL } from "@/types/fitReport";
import ServiceUnavailable from "@/components/ServiceUnavailable";
import { ScoutCaseForm } from "@/components/desk/ScoutCaseForm";
import { SourcingNav } from "@/components/desk/SourcingNav";

export default function SourcingPage() {
  const available = isJdAnalyzerConfigured() && Boolean(JD_ANALYZER_URL);
  return (
    <>
      <header className="lc-top" data-in>
        <h1>스카우트 건</h1>
        <SourcingNav />
      </header>
      <div className="lc-split">
        <section className="lc-panel sc-form" aria-label="새 스카우트 건" data-in>
          <div className="lc-pb" style={{ paddingTop: 16 }}>
            {available ? (
              <ScoutCaseForm />
            ) : (
              <ServiceUnavailable title="스카우트 건" description="jd-fit-analyzer 가 연결되면 스카우트 건을 만들 수 있습니다." />
            )}
          </div>
        </section>
        <aside className="lc-panel lc-detail" aria-labelledby="sc-how" data-in>
          <div className="lc-ph"><h2 id="sc-how">만들면 이렇게 진행돼요</h2></div>
          <div className="lc-pb">
            <ol className="sc-steps">
              <li>공고 조건과 본문을 넣으면 AI가 키워드를 정리합니다.</li>
              <li>인재풀에서 조건에 맞는 후보를 찾아 분석합니다.</li>
              <li>분석이 끝난 후보는 승인함에 근거와 함께 올라옵니다.</li>
            </ol>
            <p className="lc-callout"><b>승인 전에는 후보에게 아무것도 나가지 않아요.</b></p>
          </div>
        </aside>
      </div>
    </>
  );
}
