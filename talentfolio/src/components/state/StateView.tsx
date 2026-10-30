import Link from "next/link";
import type { ReactNode } from "react";
import { Illustration, type IllustrationName } from "./Illustration";

/**
 * 빈 상태·비로그인·오류 공용 화면. 손그림 + 제목 + 손글씨 한 줄 + pill 버튼.
 * 오류 원문을 그대로 보여주지 말고, 무엇을 하면 되는지 한 줄로 말한다.
 */
export function StateView({
  art,
  title,
  note,
  body,
  action,
  secondary,
  compact = false,
  level = 2,
}: {
  art: IllustrationName;
  title: ReactNode;
  note?: string;
  body?: ReactNode;
  action?: { href: string; label: string } | { onClick: () => void; label: string };
  secondary?: { href: string; label: string };
  compact?: boolean;
  /** 페이지의 유일한 제목일 때 1 */
  level?: 1 | 2;
}) {
  const H = level === 1 ? "h1" : "h2";
  return (
    <div className="tf-state" data-compact={compact || undefined}>
      <Illustration name={art} size={compact ? 140 : 200} />
      <H className="tf-state-title">{title}</H>
      {note ? <p className="tf-state-note">{note}</p> : null}
      {body ? <p className="tf-state-body">{body}</p> : null}
      {action || secondary ? (
        <div className="tf-state-acts">
          {action ? (
            "href" in action ? (
              <Link className="tf-btn fill" href={action.href}>{action.label}</Link>
            ) : (
              <button type="button" className="tf-btn fill" onClick={action.onClick}>{action.label}</button>
            )
          ) : null}
          {secondary ? <Link className="tf-btn" href={secondary.href}>{secondary.label}</Link> : null}
        </div>
      ) : null}
    </div>
  );
}

/** 목록 자리 스켈레톤. "불러오는 중" 텍스트 대신 쓴다. */
export function SkeletonList({ rows = 3, label = "불러오는 중" }: { rows?: number; label?: string }) {
  return (
    <div role="status" aria-live="polite" aria-label={label} className="tf-skel-list">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="tf-card tf-skel-row">
          <div className="tf-skeleton" style={{ width: 40, height: 40, borderRadius: 999 }} />
          <div style={{ flex: 1, display: "grid", gap: 8 }}>
            <div className="tf-skeleton" style={{ height: 12, width: `${60 - i * 8}%` }} />
            <div className="tf-skeleton" style={{ height: 10, width: "85%" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** 불러오기 실패 화면. 로그인 문제면 로그인으로 안내하고, 그 밖의 오류 원문은 보여주지 않는다. */
export function LoadError({ what, error, level }: { what: string; error?: string | null; level?: 1 | 2 }) {
  const needLogin = !!error && /로그인|401|인증|unauthor/i.test(error);
  return needLogin ? (
    <StateView
      compact
      level={level}
      art="door"
      title="로그인이 필요해요"
      body={`${what}은(는) 로그인한 뒤에 볼 수 있어요.`}
      action={{ href: "/login", label: "로그인" }}
    />
  ) : (
    <StateView
      compact
      level={level}
      art="umbrella"
      title={`${what}을(를) 불러오지 못했어요`}
      body="잠시 후 새로고침해 주세요. 계속되면 연결 상태를 확인해 주세요."
    />
  );
}
