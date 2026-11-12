"use client";

// 데스크 공용 상태 조각 (다크 콘솔 톤). StateView 와 같은 규칙: 오류 원문은 보이지 않고 할 일을 한 줄로 말한다.
import Link from "next/link";
import type { ReactNode } from "react";

export function DState({ title, body, action, level = 2 }: {
  title: ReactNode;
  body?: ReactNode;
  action?: { href: string; label: string } | { onClick: () => void; label: string };
  level?: 1 | 2;
}) {
  const H = level === 1 ? "h1" : "h2";
  return (
    <div className="lc-state">
      <H>{title}</H>
      {body ? <p>{body}</p> : null}
      {action ? ("href" in action
        ? <Link className="lc-btn is-primary" href={action.href}>{action.label}</Link>
        : <button type="button" className="lc-btn is-primary" onClick={action.onClick}>{action.label}</button>) : null}
    </div>
  );
}

export function DSkeleton({ rows = 4, label = "불러오는 중" }: { rows?: number; label?: string }) {
  return (
    <div className="lc-skel" role="status" aria-live="polite" aria-label={label}>
      {Array.from({ length: rows * 2 }, (_, i) => <i key={i} />)}
    </div>
  );
}

/** 불러오기 실패. 로그인 문제면 로그인으로 안내한다 */
export function DLoadError({ what, error, level }: { what: string; error?: string | null; level?: 1 | 2 }) {
  const needLogin = !!error && /로그인|401|인증|unauthor/i.test(error);
  return needLogin
    ? <DState level={level} title="로그인이 필요해요" body={`${what}은(는) 로그인한 뒤에 볼 수 있어요.`} action={{ href: "/login", label: "로그인" }} />
    : <DState level={level} title={`${what}을(를) 불러오지 못했어요`} body="잠시 후 새로고침해 주세요. 계속되면 연결 상태를 확인해 주세요." />;
}

export const VERDICT = { strong_fit: "잘 맞음", possible_fit: "부분 일치", weak_fit: "덜 맞음" } as const;
export type Verdict = keyof typeof VERDICT;

/** 판정: 기호(도트) + 말. 색만으로 구분하지 않는다 */
export function VerdictPill({ verdict, score }: { verdict: Verdict; score?: number }) {
  return (
    <span className={`lc-pill${verdict === "strong_fit" ? " is-strong" : ""}`}>
      <i className={`lc-vm vm-${verdict}`} aria-hidden="true" />
      {score !== undefined ? `${score} · ` : ""}{VERDICT[verdict]}
    </span>
  );
}
