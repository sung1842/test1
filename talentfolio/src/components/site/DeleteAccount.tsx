"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

/** 회원 탈퇴 (구직자 스튜디오·기업 설정 공통). "탈퇴" 를 직접 입력해야 버튼이 켜진다 */
export function DeleteAccount({ accountLabel }: { accountLabel: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/account", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ confirm: text }) });
    if (!res.ok) {
      setErr(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "탈퇴하지 못했습니다.");
      setBusy(false);
      return;
    }
    await supabase?.auth.signOut().catch(() => {});
    window.location.assign("/?deleted=1");
  }

  return (
    <section className="del-acct" aria-labelledby="del-acct-h">
      <h3 id="del-acct-h">회원 탈퇴</h3>
      <p>{accountLabel} 계정과 등록한 모든 정보(프로필·이력·작업물·기록·공고·분석 결과)가 바로 삭제되며 되돌릴 수 없습니다.</p>
      {!open ? (
        <button type="button" className="del-acct-btn" onClick={() => setOpen(true)}>회원 탈퇴</button>
      ) : (
        <div className="del-acct-box">
          <label htmlFor="del-acct-in">확인을 위해 <b>탈퇴</b>를 입력하세요</label>
          <input id="del-acct-in" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" />
          <div className="del-acct-row">
            <button type="button" onClick={() => { setOpen(false); setText(""); setErr(null); }} disabled={busy}>취소</button>
            <button type="button" className="del-acct-btn" disabled={text !== "탈퇴" || busy} onClick={() => void run()}>{busy ? "삭제 중…" : "영구 삭제"}</button>
          </div>
          {err && <p className="del-acct-err" role="alert">{err}</p>}
        </div>
      )}
      <style>{`
.del-acct{margin-top:40px;padding:20px;border:1px solid #F1C7C7;border-radius:12px;background:#FFF8F8}
.del-acct h3{font-size:15px;font-weight:700;color:#B42318}
.del-acct p{margin-top:6px;font-size:13px;color:#5B6B8C;line-height:1.6}
.del-acct-btn{margin-top:12px;padding:8px 16px;border-radius:8px;border:1px solid #B42318;background:#fff;color:#B42318;font-weight:600;cursor:pointer}
.del-acct-btn:disabled{opacity:.45;cursor:not-allowed}
.del-acct-box{margin-top:12px;display:grid;gap:8px;max-width:360px}
.del-acct-box label{font-size:13px}
.del-acct-box input{padding:8px 10px;border:1px solid #D6DEEE;border-radius:8px}
.del-acct-row{display:flex;gap:8px}
.del-acct-row button:not(.del-acct-btn){margin-top:12px;padding:8px 16px;border-radius:8px;border:1px solid #D6DEEE;background:#fff;cursor:pointer}
.del-acct-err{color:#B42318!important}
`}</style>
    </section>
  );
}
