"use client";

import Link from "next/link";
import Avatar from "@/components/Avatar";
import type { Candidate } from "@/types/candidate";

/**
 * 데스크 인재풀 카드 (아침 하늘 규격). demo 유리 폴더 카드 대체:
 * 블러 이미지 없이 이름·직무·소개·스킬만 크게 보여주고, 상세는 공개 포트폴리오로 연결한다.
 */
export function CandidateTile({ candidate }: { candidate: Candidate }) {
  return (
    <article className="tf-card dk-tile">
      <div className="dk-tile-head">
        <Avatar name={candidate.name} avatar={candidate.avatar} role={candidate.role} size="sm" />
        <div style={{ minWidth: 0 }}>
          <h3 className="dk-tile-name">{candidate.name}</h3>
          <p className="dk-tile-title">
            {candidate.role === "developer" ? "개발자" : "디자이너"}
            {candidate.title ? ` · ${candidate.title}` : ""}
          </p>
        </div>
      </div>
      {candidate.shortBio ? <p className="dk-tile-bio">{candidate.shortBio}</p> : null}
      {candidate.skills.length ? (
        <ul className="dk-tile-skills" aria-label="주요 스킬">
          {candidate.skills.slice(0, 4).map((s) => <li key={s}>{s}</li>)}
        </ul>
      ) : null}
      <Link className="dk-tile-link" href={`/talent/${candidate.id}`}>포트폴리오 보기 →</Link>
    </article>
  );
}
