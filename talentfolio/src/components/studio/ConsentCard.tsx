"use client";

import { useEffect, useState } from "react";
import { getConsents, grantConsents, revokeConsent, type ConsentPurpose } from "@/lib/lifeApi";

/**
 * 동의 카드: 목적 self_ai(내 기록 AI 정리) / matching(기업 매칭 노출)을 분리해 받는다.
 * 403 consent_required 를 받았거나 매칭 동의가 없을 때 studio 화면에 띄운다.
 * 이미 동의한 항목은 "철회" 버튼(확인창)으로 철회한다. matching 철회 시 서버가 공개 카드 임베딩 삭제 잡을 큐잉한다.
 * 필요한 목적에 동의돼 있으면 카드 대신 간단한 동의 관리 줄만 보인다.
 */
export function ConsentCard({
  required = "self_ai",
  onSaved,
  onRevoked,
}: {
  required?: ConsentPurpose;
  onSaved?: () => void;
  onRevoked?: (purpose: ConsentPurpose) => void;
}) {
  const [checked, setChecked] = useState<Record<ConsentPurpose, boolean>>({ self_ai: false, matching: false });
  const [granted, setGranted] = useState<Record<ConsentPurpose, boolean>>({ self_ai: false, matching: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    getConsents()
      .then((c) => {
        if (!alive) return;
        setGranted(c);
        setChecked(c);
        setLoaded(true);
      })
      .catch(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, []);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const purposes = (Object.keys(checked) as ConsentPurpose[]).filter((p) => checked[p] && !granted[p]);
      await grantConsents(purposes);
      setGranted((g) => ({ ...g, ...Object.fromEntries(purposes.map((p) => [p, true])) }));
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const LABELS: Record<ConsentPurpose, string> = { self_ai: "AI 기록 정리", matching: "기업 매칭 노출" };
  const revoke = async (purpose: ConsentPurpose) => {
    const warn =
      purpose === "matching"
        ? "기업 매칭 노출 동의를 철회할까요? 공개한 카드가 기업 화면과 매칭 근거에서 즉시 빠집니다."
        : "AI 기록 정리 동의를 철회할까요? 이후 기록 정리·AI 교정을 쓸 수 없습니다.";
    if (!window.confirm(warn)) return;
    setBusy(true);
    setError(null);
    try {
      await revokeConsent(purpose);
      setGranted((g) => ({ ...g, [purpose]: false }));
      setChecked((c) => ({ ...c, [purpose]: false }));
      onRevoked?.(purpose);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };
  const revokeButton = (purpose: ConsentPurpose) => (
    <button
      type="button"
      className="product-chip"
      disabled={busy}
      onClick={(e) => {
        e.preventDefault();
        void revoke(purpose);
      }}
    >
      철회
    </button>
  );

  const item = (purpose: ConsentPurpose, title: string, desc: string) => (
    <label style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10 }}>
      <input
        type="checkbox"
        checked={checked[purpose]}
        disabled={granted[purpose] || busy}
        onChange={(e) => setChecked((c) => ({ ...c, [purpose]: e.target.checked }))}
      />
      <span>
        <strong style={{ fontSize: 14 }}>
          {title}
          {purpose === required && !granted[purpose] && " (필수)"}
          {granted[purpose] && " · 동의함"}
        </strong>
        <span className="studio-help" style={{ display: "block" }}>{desc}</span>
      </span>
      {granted[purpose] && revokeButton(purpose)}
    </label>
  );

  const canSave = (Object.keys(checked) as ConsentPurpose[]).some((p) => checked[p] && !granted[p]);

  if (!loaded) return null;
  // 필요한 목적에 이미 동의했으면 큰 카드 대신 동의 관리 줄만 (철회 가능)
  if (granted[required]) {
    const active = (Object.keys(granted) as ConsentPurpose[]).filter((p) => granted[p]);
    return (
      <div className="studio-help" style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }} role="region" aria-label="동의 관리">
        {active.map((p) => (
          <span key={p} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
            {LABELS[p]} · 동의함 {revokeButton(p)}
          </span>
        ))}
        {error && <span style={{ color: "#b91c1c" }}>{error}</span>}
      </div>
    );
  }

  return (
    <div className="product-panel" style={{ marginTop: 16 }} role="region" aria-label="동의">
      <div style={{ fontSize: 15, fontWeight: 650, marginBottom: 8 }}>동의가 필요합니다</div>
      {item(
        "self_ai",
        "내 기록 AI 정리",
        "내가 쓴 기록을 AI가 칸별로 나누고 문장을 다듬는 데만 씁니다. 결과는 나에게만 보입니다.",
      )}
      {item(
        "matching",
        "기업 추천에 내 카드 보여주기",
        "공개한 카드만 공고 추천 근거로 기업에 보여줍니다. 동의하지 않으면 공개 카드도 기업에 노출되지 않습니다.",
      )}
      <button type="button" className="product-cta" disabled={!canSave || busy} onClick={() => void save()}>
        {busy ? "저장 중" : "동의 저장"}
      </button>
      {error && <p className="studio-help" style={{ color: "#b91c1c" }}>{error}</p>}
    </div>
  );
}
