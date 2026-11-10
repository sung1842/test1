"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { deleteWork, loadWorks, uploadWork, WORK_ACCEPT, type PortfolioWork } from "@/lib/portfolioWorks";

/**
 * 작업물 (포트폴리오 갤러리). 이미지·설명을 올리면 공개 포트폴리오(/talent/[id])와 기업 화면에 그대로 보인다.
 * 저장: /api/profile/works (공개 버킷 works).
 */
export function StudioWorks({ userId, preview, onChange }: { userId: string; preview: boolean; onChange?: () => void }) {
  const [works, setWorks] = useState<PortfolioWork[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<PortfolioWork | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const load = useCallback(async () => {
    try {
      setWorks(await loadWorks(userId));
    } catch (e) {
      setWorks([]);
      setMsg(e instanceof Error ? e.message : "작업물을 불러오지 못했어요");
    }
  }, [userId]);
  useEffect(() => { void load(); }, [load]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!files.length) { setMsg("이미지를 한 장 이상 골라 주세요."); return; }
    const fd = new FormData(e.currentTarget);
    fd.delete("files");
    for (const f of files) fd.append("files", f);
    setBusy(true);
    try {
      await uploadWork(fd);
      formRef.current?.reset();
      setFiles([]);
      setOpen(false);
      setMsg("작업물을 올렸어요.");
      await load();
      onChange?.();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "작업물을 올리지 못했어요");
    } finally {
      setBusy(false);
    }
  }

  async function remove(w: PortfolioWork) {
    if (!confirm(`'${w.title}' 작업물을 지울까요? 이미지도 함께 지워져요.`)) return;
    try {
      await deleteWork(w.id);
      setView(null);
      setMsg("작업물을 지웠어요.");
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "지우지 못했어요");
    }
  }

  return (
    <section className="view on">
      <div className="head">
        <div>
          <p className="eyebrow">작업물</p>
          <h1>내가 만든 것들</h1>
          <p className="lede">작업 이미지와 맡은 역할을 올려 두면 공개 포트폴리오와 기업 검색 화면에 그대로 보여요.</p>
        </div>
        {!preview && <button className="btn pri" onClick={() => setOpen((v) => !v)}>{open ? "닫기" : "+ 작업물 올리기"}</button>}
      </div>
      {msg && <p className="note" role="status">{msg}</p>}

      {open && !preview && (
        <form ref={formRef} className="card form-card" onSubmit={(e) => void submit(e)} style={{ marginBottom: 20 }}>
          <div className="row"><label>제목</label><div className="vis"><input className="field" name="title" required maxLength={120} placeholder="예: 핀테크 앱 온보딩 리디자인" /></div></div>
          <div className="row"><label>이미지</label><div className="vis" style={{ flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
            <input ref={fileRef} type="file" name="files" accept={WORK_ACCEPT} multiple hidden onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 6))} />
            <button type="button" className="btn" onClick={() => fileRef.current?.click()}>{files.length ? `${files.length}장 선택됨 · 다시 고르기` : "이미지 고르기"}</button>
            <small style={{ color: "var(--mute)" }}>PNG·JPG·WEBP·GIF · 최대 6장 · 한 장 8MB까지 · 첫 장이 대표 이미지</small>
          </div></div>
          <div className="row"><label>맡은 역할</label><div className="vis"><input className="field" name="role" maxLength={120} placeholder="예: UX 리서치 · UI 디자인 (기여도 80%)" /></div></div>
          <div className="row"><label>사용 도구</label><div className="vis"><input className="field" name="tools" maxLength={400} placeholder="쉼표로 구분 · 예: Figma, Protopie, Notion" /></div></div>
          <div className="row"><label>작업 시기</label><div className="vis"><input className="field" name="year" maxLength={20} placeholder="예: 2025.03 — 2025.06" /></div></div>
          <div className="row"><label>링크</label><div className="vis"><input className="field" name="url" type="url" maxLength={500} placeholder="https:// (Behance·Figma·라이브 서비스)" /></div></div>
          <div className="row"><label>설명</label><div className="vis"><textarea className="field" name="description" rows={6} maxLength={2000} placeholder="문제 → 과정 → 결과 순으로 적으면 읽기 좋아요" /></div></div>
          <div className="row"><span /><div><button className="btn pri" disabled={busy}>{busy ? "올리는 중..." : "작업물 저장"}</button></div></div>
        </form>
      )}

      {works === null ? <p className="note">불러오는 중…</p> : works.length === 0 ? (
        <div className="card" style={{ padding: 28, textAlign: "center", color: "var(--mute)" }}>
          아직 올린 작업물이 없어요. 대표작 3개만 올려도 기업이 훨씬 빨리 이해해요.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
          {works.map((w) => (
            <button key={w.id} className="card" onClick={() => setView(w)} style={{ padding: 0, overflow: "hidden", textAlign: "left", display: "flex", flexDirection: "column" }}>
              <span style={{ display: "block", aspectRatio: "4 / 3", background: "var(--line2)", overflow: "hidden" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={w.images[0]} alt={w.title} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </span>
              <span style={{ padding: "12px 14px", display: "grid", gap: 4 }}>
                <strong style={{ fontSize: 15 }}>{w.title}</strong>
                <small style={{ color: "var(--mute)" }}>{[w.year, w.role].filter(Boolean).join(" · ")}</small>
                {w.tools.length > 0 && (
                  <span style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                    {w.tools.slice(0, 4).map((t) => <span key={t} className="tag">{t}</span>)}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}

      {view && (
        <div className="modal-bg" onClick={() => setView(null)} style={{ position: "fixed", inset: 0, background: "rgba(11,28,69,.45)", zIndex: 50, display: "grid", placeItems: "center", padding: 16 }}>
          <div className="card" role="dialog" aria-label={view.title} onClick={(e) => e.stopPropagation()}
            style={{ width: "min(880px, 100%)", maxHeight: "90vh", overflow: "auto", padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
              <div>
                <h2 style={{ fontSize: 20 }}>{view.title}</h2>
                <small style={{ color: "var(--mute)" }}>{[view.year, view.role].filter(Boolean).join(" · ")}</small>
              </div>
              <button className="btn" onClick={() => setView(null)}>닫기</button>
            </div>
            {view.tools.length > 0 && <p style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 10 }}>{view.tools.map((t) => <span key={t} className="tag">{t}</span>)}</p>}
            {view.description && <p style={{ whiteSpace: "pre-wrap", marginTop: 14, color: "var(--ink2)" }}>{view.description}</p>}
            {view.url && <p style={{ marginTop: 10 }}><a className="link" href={view.url} target="_blank" rel="noopener noreferrer">{view.url}</a></p>}
            <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {view.images.map((src, i) => <img key={src} src={src} alt={`${view.title} ${i + 1}`} style={{ width: "100%", borderRadius: 8, border: "1px solid var(--line)" }} />)}
            </div>
            {!preview && <div style={{ marginTop: 16, textAlign: "right" }}><button className="btn danger" onClick={() => void remove(view)}>작업물 지우기</button></div>}
          </div>
        </div>
      )}
    </section>
  );
}
