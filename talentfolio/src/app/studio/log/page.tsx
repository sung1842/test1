"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ProductShell } from "@/components/product/ProductShell";
import { ConsentCard } from "@/components/studio/ConsentCard";
import { isConsentRequired, lifeApi, streamJob } from "@/lib/lifeApi";
import { statusLabel } from "@/lib/labels";

const ACTIVITY_KINDS = ["프로젝트", "업무", "동아리·학회", "공모전·해커톤", "봉사", "기타"];

type Phase = "idle" | "sending" | "running" | "done" | "error" | "consent";

export default function LifeLogPage() {
  const [text, setText] = useState("");
  const [kind, setKind] = useState(ACTIVITY_KINDS[0]);
  const [period, setPeriod] = useState("");
  const [role, setRole] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const canSubmit = text.trim().length > 0 && phase !== "sending" && phase !== "running";

  // 동의 대기 중 재시도용: 이미 저장된 세션 id (메시지까지 저장됨)
  const pendingSessionRef = useRef<string | null>(null);

  const runJob = async (sessionId: string) => {
    const { jobId } = await lifeApi.closeSession(sessionId);
    pendingSessionRef.current = null;
    setPhase("running");
    setProgress((p) => [...p, "정리 작업을 시작했습니다"]);
    abortRef.current = new AbortController();
    await streamJob(
      jobId,
      (ev) => {
        const d = ev as { stage?: unknown; message?: unknown } | null;
        const msg =
          d && typeof d === "object"
            ? typeof d.message === "string"
              ? d.message
              : typeof d.stage === "string"
                ? statusLabel(d.stage)
                : null
            : typeof ev === "number"
              ? `진행 ${ev}%`
              : null;
        if (msg) setProgress((p) => (p[p.length - 1] === msg ? p : [...p, msg]));
      },
      abortRef.current.signal,
    );
    setPhase("done");
    setText("");
  };

  const handleError = (err: unknown) => {
    if (isConsentRequired(err)) {
      setPhase("consent");
      setProgress((p) => [...p, "AI 정리 동의가 필요합니다"]);
      return;
    }
    setError(err instanceof Error ? err.message : String(err));
    setPhase("error");
  };

  const submit = async () => {
    if (!canSubmit) return;
    setPhase("sending");
    setError(null);
    setProgress(["회고를 보내는 중"]);
    try {
      // 계약상 세션은 {source,title} 뿐 → 종류·기간·역할은 title 과 본문 머리에 담는다
      const meta = [kind, period.trim(), role.trim()].filter(Boolean).join(" · ");
      const header = [`활동 종류: ${kind}`, period.trim() && `기간: ${period.trim()}`, role.trim() && `역할: ${role.trim()}`]
        .filter(Boolean)
        .join("\n");
      const { session } = await lifeApi.createSession(meta.slice(0, 200));
      await lifeApi.addMessage(session.id, `${header}\n\n${text.trim()}`.slice(0, 4000));
      pendingSessionRef.current = session.id;
      await runJob(session.id);
    } catch (err) {
      handleError(err);
    }
  };

  const retryAfterConsent = async () => {
    const sid = pendingSessionRef.current;
    if (!sid) {
      setPhase("idle");
      return;
    }
    setPhase("sending");
    try {
      await runJob(sid);
    } catch (err) {
      handleError(err);
    }
  };

  return (
    <ProductShell crumble="스튜디오 · 기록하기">
      <div className="product-page" style={{ maxWidth: 820 }}>
        <p className="product-eyebrow">스튜디오 · 기록하기</p>
        <h1 className="product-title" style={{ fontSize: 30 }}>오늘 한 일 기록하기</h1>
        <p className="product-muted studio-lede">
          이미 써 둔 회고를 그대로 붙여넣으세요. 내용을 칸별로 나누고 인용을 표시할 뿐, 없는 경험을 지어내지 않습니다.
          회고로 넣은 기록은 입력한 날짜 기준으로 표시됩니다.
        </p>

        <form
          className="product-panel"
          style={{ marginTop: 24 }}
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <span className="studio-label">활동 종류</span>
          <div className="studio-seg" role="group" aria-label="활동 종류">
            {ACTIVITY_KINDS.map((k) => (
              <button key={k} type="button" className="product-chip" data-on={kind === k} onClick={() => setKind(k)}>
                {k}
              </button>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="studio-label" htmlFor="log-period">기간</label>
              <input
                id="log-period"
                className="product-field"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                placeholder="예: 2025.03 ~ 2025.08"
              />
            </div>
            <div>
              <label className="studio-label" htmlFor="log-role">역할</label>
              <input
                id="log-role"
                className="product-field"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="예: 백엔드 담당"
              />
            </div>
          </div>
          <label className="studio-label" htmlFor="log-text">회고 본문</label>
          <textarea
            id="log-text"
            className="product-field"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="직접 쓴 회고를 붙여넣으세요"
            maxLength={3700}
            style={{ minHeight: 240, resize: "vertical" }}
          />
          <button className="product-cta wide" type="submit" disabled={!canSubmit}>
            {phase === "sending" || phase === "running" ? "정리하는 중" : "기록 보내기"}
          </button>
        </form>

        {progress.length > 0 && (
          <div className="product-panel" style={{ marginTop: 16 }} aria-live="polite">
            <div style={{ fontSize: 13, fontWeight: 650, marginBottom: 8 }}>진행 상황</div>
            <ul className="studio-help" style={{ margin: 0, paddingLeft: 18 }}>
              {progress.map((p, i) => (
                <li key={`${i}-${p}`}>{p}</li>
              ))}
            </ul>
          </div>
        )}

        {phase === "consent" && <ConsentCard required="self_ai" onSaved={() => void retryAfterConsent()} />}

        {phase === "done" && (
          <div className="product-empty" style={{ marginTop: 16 }}>
            <strong>정리가 끝났습니다</strong>
            <p>
              <Link href="/studio/cards" style={{ textDecoration: "underline" }}>내 카드</Link>에서 초안을 확인하고 직접 고치세요.
              공개하기 전까지 아무에게도 보이지 않습니다.
            </p>
          </div>
        )}
        {phase === "error" && error && (
          <div className="product-empty" style={{ marginTop: 16 }}>
            <strong>보내지 못했습니다</strong>
            <p>{error}</p>
          </div>
        )}
      </div>
    </ProductShell>
  );
}
