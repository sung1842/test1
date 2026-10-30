import { animate, stagger, utils } from "animejs";

/* eslint-disable @typescript-eslint/no-explicit-any */
// Behaviour ported 1:1 from the S_studio mockup script. Demo data only (nothing is saved).
// Every listener is bound to one AbortController so StrictMode re-runs don't double up.
export function initStudio(root: HTMLElement): () => void {
  const ac = new AbortController();
  const on = (el: Element | null, ev: string, fn: (e: any) => void) => el?.addEventListener(ev, fn, { signal: ac.signal });
  const $ = (s: string, r: ParentNode = root): any => r.querySelector(s);
  const $$ = (s: string, r: ParentNode = root): any[] => [...r.querySelectorAll(s)];
  const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const D = (ms: number) => (RM ? 0 : ms);

  // mobile tabs mirror the side nav
  const mt = $("#mtabs");
  $$("#nav button").forEach((b) => { const c = document.createElement("button"); c.dataset.v = b.dataset.v; c.textContent = b.childNodes[0].textContent.trim(); mt.append(c); });

  function go(v: string) {
    $$("#nav button, #mtabs button").forEach((b) => b.setAttribute("aria-current", String(b.dataset.v === v)));
    $$(".view").forEach((s) => s.classList.toggle("on", s.id === "v-" + v));
    const view = $("#v-" + v);
    animate(view, { opacity: [0, 1], y: [6, 0], duration: D(220), ease: "outQuad" });
    if (v === "overview") $$("[data-n]", view).forEach((el) => {
      const o = { n: 0 }; animate(o, { n: +el.dataset.n, duration: D(600), ease: "outQuad", modifier: utils.round(0), onUpdate: () => (el.textContent = String(o.n)) });
    });
    scrollTo({ top: 0, behavior: RM ? "auto" : "smooth" });
  }
  $$("#nav button, #mtabs button").forEach((b) => on(b, "click", () => go(b.dataset.v)));
  $$("[data-go]").forEach((b) => on(b, "click", () => go(b.dataset.go)));
  $$('[data-act="focus"]').forEach((b) => on(b, "click", () => { go("pieces"); $("#askText").focus(); }));

  // completeness meter
  const pct = { v: 0 };
  animate(pct, { v: 72, duration: D(800), delay: D(200), ease: "outQuad", modifier: utils.round(0), onUpdate: () => ($("#pct").textContent = pct.v + "%") });
  animate($("#pctBar"), { width: ["0%", "72%"], duration: D(800), delay: D(200), ease: "outQuad" });

  // board entrance
  animate($$(".board > *"), { opacity: [0, 1], y: [8, 0], duration: D(260), delay: stagger(D(40)), ease: "outQuad" });

  // 6-cell canvas: one open question at a time (no leading questions)
  const CELLS = ["상황", "역할", "행동", "어려움", "결과", "배운 점"];
  const QS = ["최근에 기억에 남는 일, 어떤 상황이었나요?", "그 안에서 서연 님은 어떤 자리에 있었나요?", "그때 무엇을 했나요?", "어려웠던 점이 있었다면 무엇이었나요?", "어떻게 끝났나요?", "그 일로 알게 된 게 있나요?"];
  const ans = ["작년 연말 금요일, 예약이 140석이었는데 라인 쿡 한 명이 아파서 빠졌어요.", "", "", "", "", ""];
  let cur = 0;
  const ta = $("#askText"); ta.value = ans[0];
  function setStep(i: number) {
    ans[cur] = ta.value.trim(); cur = Math.max(0, Math.min(5, i));
    $$("#steps button").forEach((b, k) => { b.setAttribute("aria-current", String(k === cur)); b.dataset.st = ans[k] ? "done" : ""; });
    $("#stepNo").textContent = cur + 1; $("#qText").textContent = QS[cur]; ta.value = ans[cur];
    $("#nextQ").textContent = cur === 5 ? "마지막 질문" : "다음 질문";
    animate($("#qText"), { opacity: [0, 1], duration: D(180) });
  }
  $$("#steps button").forEach((b, k) => on(b, "click", () => setStep(k)));
  on($("#nextQ"), "click", () => setStep(cur + 1));
  on($("#recBtn"), "click", (e) => {
    const b = e.currentTarget, isOn = b.getAttribute("aria-pressed") !== "true";
    b.setAttribute("aria-pressed", String(isOn)); b.querySelector("span").textContent = isOn ? "녹음 중 · 멈추기" : "녹음";
    if (!isOn) { ta.value = (ta.value + " 오후 3시에 프렙 순서를 다시 짰어요.").trim(); toast("녹음을 글로 옮겼어요 · 원문 그대로예요"); }
  });
  let curF = "all";
  function applyFilter() {
    const all = $$("#board .piece"), pub = all.filter((p) => p.dataset.pub === "true");
    const n: Record<string, number> = { all: all.length, pub: pub.length, priv: all.length - pub.length };
    $$("#filters .chip").forEach((c) => (c.querySelector("i").textContent = n[c.dataset.f]));
    $("#navCnt").textContent = n.all;
    all.forEach((p) => (p.style.display = curF === "all" || (curF === "pub") === (p.dataset.pub === "true") ? "" : "none"));
    renderScout();
  }
  function renderScout() {
    const pubs = $$("#board .piece").filter((p) => p.dataset.pub === "true");
    const star = pubs.filter((p) => p.querySelector('.star-btn[aria-pressed="true"]'));
    $("#scoutCards").innerHTML = star.slice(0, 3).map((p) => `<div>${p.querySelector(".badges").outerHTML}<h4 style="margin:8px 0 4px">${p.querySelector("h4").innerHTML}</h4><p style="font-size:13px;color:var(--ink2)">${p.querySelector("p.d").innerHTML}</p></div>`).join("") || '<p class="note">대표(★)로 고른 공개 카드가 없어요</p>';
  }
  $$("#filters .chip").forEach((c) => on(c, "click", () => {
    $$("#filters .chip").forEach((x) => (x.dataset.on = String(x === c))); curF = c.dataset.f; applyFilter();
  }));
  const aiOn = () => $('.cons-tg[data-k="AI 기록 정리"]').getAttribute("aria-pressed") === "true";
  function syncAI() {
    const isOn = aiOn(); $("#draftBtn").disabled = !isOn; $("#draftBtn").title = isOn ? "" : "AI 기록 정리 동의가 꺼져 있어요";
    $$(".ai-btn:not([data-done])").forEach((b) => (b.disabled = !isOn));
  }

  // AI split draft (demo): quotes are the user's own words
  const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
  const esc = (t: string) => t.replace(/[&<>"]/g, (m) => ESC[m]);
  const dr = $("#drafts");
  let timer: ReturnType<typeof setTimeout> | undefined;
  on($("#draftBtn"), "click", (e) => {
    if (!aiOn()) return toast("AI 기록 정리 동의가 꺼져 있어요");
    ans[cur] = ta.value.trim();
    const b = e.currentTarget; b.textContent = "칸 나누는 중…"; b.disabled = true;
    timer = setTimeout(() => {
      b.textContent = "다시 나누기"; b.disabled = false;
      $("#canvas6").innerHTML = CELLS.map((c, k) => ans[k]
        ? `<div class="cell"><b>${c}</b><textarea>${esc(ans[k])}</textarea><q>${esc(ans[k])}</q></div>`
        : `<div class="cell empty"><b>${c}</b><textarea placeholder="비워 둬도 돼요"></textarea><q>원문 없음 · AI가 채우지 않았어요</q></div>`).join("");
      dr.classList.add("on");
      animate($$(".cell"), { opacity: [0, 1], y: [8, 0], duration: D(240), delay: stagger(D(50)), ease: "outQuad" });
      dr.scrollIntoView({ behavior: RM ? "auto" : "smooth", block: "nearest" });
    }, D(700));
  });
  on($("#drop"), "click", () => dr.classList.remove("on"));
  on($("#useBtn"), "click", () => {
    const parts = $$("#canvas6 .cell").map((c) => [c.querySelector("b").textContent, c.querySelector("textarea").value.trim()]).filter((p) => p[1]);
    if (!parts.length) return toast("한 칸 이상 채워 주세요");
    const d = new Date(), today = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
    const art = document.createElement("article"); art.className = "piece priv-card edit-only"; art.dataset.pub = "false";
    art.innerHTML = `<div class="piece-b"><div class="badges"><span class="bd t-retro">회고 입력 · ${today} 입력</span><span class="bd r-self">본인 주장</span></div><h4>${esc(parts[0][1].slice(0, 22))}…</h4><p class="d">${parts.map((p) => `<b>${p[0]}</b> ${esc(p[1])}`).join(" ")}</p><p class="src">근거 없음 · 링크를 붙이면 '첨부'가 돼요</p><div class="card-acts"><button class="mini ai-btn">AI 교정</button><button class="mini att-btn">근거 링크 첨부</button></div><div class="piece-foot"><button class="vis-tg" aria-pressed="false"><span class="sw"></span><span>비공개</span></button><button class="star-btn" aria-pressed="false">☆ 대표</button></div></div>`;
    $("#board").prepend(art); bindCard(art); syncAI(); applyFilter(); dr.classList.remove("on");
    animate(art, { opacity: [0, 1], y: [-6, 0], duration: D(260), ease: "outQuad" });
    toast("근거 카드로 저장했어요 · 비공개 상태예요");
  });

  // card actions
  function bindCard(r: ParentNode = root) {
    $$(".star-btn", r).forEach((s) => on(s, "click", () => {
      const isOn = s.getAttribute("aria-pressed") === "true";
      if (!isOn && $$('#board .star-btn[aria-pressed="true"]').length >= 3) return toast("대표는 3개까지예요. 하나를 먼저 빼 주세요");
      if (!isOn && s.closest(".piece").dataset.pub !== "true") return toast("공개한 카드만 대표로 고를 수 있어요");
      s.setAttribute("aria-pressed", String(!isOn)); s.textContent = !isOn ? "★ 대표" : "☆ 대표"; renderScout();
      animate(s, { scale: [0.9, 1], duration: D(180), ease: "outBack" });
    }));
    $$(".vis-tg", r).filter((t) => t.closest("#board")).forEach((t) => on(t, "click", () => {
      const isOn = t.getAttribute("aria-pressed") !== "true", card = t.closest(".piece");
      t.setAttribute("aria-pressed", String(isOn)); t.lastElementChild.textContent = isOn ? "공개" : "비공개";
      card.dataset.pub = String(isOn); card.classList.toggle("priv-card", !isOn); card.classList.toggle("edit-only", !isOn);
      const st = card.querySelector(".star-btn"); if (!isOn && st.getAttribute("aria-pressed") === "true") { st.setAttribute("aria-pressed", "false"); st.textContent = "☆ 대표"; }
      applyFilter();
      toast(isOn ? "공개했어요 · 기업에게 배지와 함께 보여요" : "비공개로 바꿨어요");
    }));
    $$(".ai-btn:not([data-done])", r).forEach((a) => on(a, "click", () => {
      if (!aiOn()) return toast("AI 기록 정리 동의가 꺼져 있어요");
      const bd = a.closest(".piece").querySelector(".badges");
      if (!bd.querySelector(".ai")) bd.insertAdjacentHTML("beforeend", '<span class="bd ai">AI 교정</span>');
      a.disabled = true; a.dataset.done = "1"; a.textContent = "AI 교정됨"; renderScout(); toast("맞춤법·문장만 다듬었어요 · 'AI 교정' 배지가 붙어요");
    }));
    $$(".att-btn:not([disabled])", r).forEach((a) => on(a, "click", () => {
      const card = a.closest(".piece"), self = card.querySelector(".r-self");
      if (self) { self.className = "bd r-att"; self.textContent = "첨부"; }
      card.querySelector(".src").textContent = "근거: 첨부한 링크 1개"; toast("근거를 붙여 '첨부' 등급이 됐어요"); renderScout();
    }));
  }
  bindCard();

  // letters: card order
  on($("#picks"), "click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    const row = b.closest(".pick"), box = $("#picks");
    if (b.classList.contains("up") && row.previousElementSibling) box.insertBefore(row, row.previousElementSibling);
    if (b.classList.contains("dn") && row.nextElementSibling) box.insertBefore(row.nextElementSibling, row);
    $$(".pick em", box).forEach((m, k) => (m.textContent = k + 1));
  });
  const LV: { t: string; p: string[]; s: [string, string, number][] }[] = [
    { t: "숫자로 관리하는 주방을 만듭니다", p: ["140석 금요일, 한 명 없이", "발주표를 바꿔 폐기 줄이기", "봄 코스 첫 접시, 원가율 맞추기"], s: [["바쁜 날일수록 라인 전원과 10분 먼저 순서를 맞춥니다. 140석 예약에 결원이 생긴 날에도 이 방식으로 컴플레인 없이 마쳤습니다.", "140석 금요일", 0], ["주간 발주표와 폐기 기록을 바꿔 식재료 폐기를 14% 줄였습니다.", "발주표 카드", 1], ["호텔 연회의 큰 물량도 순서로 다룰 수 있다고 생각합니다.", "", 0]] },
    { t: "작은 주방일수록 기록이 힘입니다", p: ["발주표를 바꿔 폐기 줄이기", "평범한 화요일의 프렙 분담"], s: [["재료가 남는 패턴은 매일 적어야 보였습니다. 그래서 폐기를 매일 기록합니다.", "발주표 카드", 0], ["프렙은 후배 둘과 말로 먼저 순서를 맞추고 나눕니다.", "화요일 프렙 분담", 0]] },
    { t: "맛만큼 순서가 중요합니다", p: ["봄 코스 첫 접시, 원가율 맞추기", "140석 금요일, 한 명 없이"], s: [["원가율 안에서 한 접시를 세 번 고쳐 완성했습니다.", "봄 코스 첫 접시", 1], ["결원이 생긴 날에도 순서표로 서비스를 지켰습니다.", "140석 금요일", 0]] },
  ];
  function renderLetter(i: number) {
    const v = LV[i]; $("#lTitle").textContent = v.t;
    $("#picks").innerHTML = v.p.map((x, k) => `<div class="pick"><em>${k + 1}</em><span>${x}</span><span class="o edit-only"><button class="mini up">↑</button><button class="mini dn">↓</button></span></div>`).join("");
    $("#sents").innerHTML = v.s.map(([t, c, ai]) => `<div class="sent"><p>${t}</p><div class="m">${c ? `<span class="lk">근거 · ${c}</span>` : '<span class="lk none">연결된 카드 없음</span>'}${ai ? '<span class="bd ai">AI 교정</span>' : '<span class="bd r-self">본인 작성</span>'}</div></div>`).join("");
  }
  $$(".ver button").forEach((v) => on(v, "click", () => { $$(".ver button").forEach((x) => x.setAttribute("aria-current", String(x === v))); renderLetter(+v.dataset.l); }));
  renderLetter(0);

  // jobs: recommendation opt-out
  const recsHTML = $("#recs").innerHTML;
  function setRecs(isOn: boolean) {
    const t = $('.cons-tg[data-k="공고 추천 받기"]'); t.setAttribute("aria-pressed", String(isOn)); t.lastElementChild.textContent = isOn ? "동의함" : "동의 안 함";
    $("#recs").innerHTML = isOn ? recsHTML : '<p class="note">공고 추천을 받지 않고 있어요. 프로필 › 동의에서 다시 켤 수 있어요.</p>';
    if (isOn) bindRecs();
  }
  function bindRecs() {
    $$("#recs .ex1").forEach((b) => on(b, "click", () => { b.closest(".rec-job").remove(); toast("이 공고는 다시 추천하지 않아요"); }));
    $$("#recs .exall").forEach((b) => on(b, "click", () => { setRecs(false); toast("공고 추천을 모두 껐어요"); }));
  }
  bindRecs();

  // profile: consents (separate) and delete
  $$(".cons-tg").forEach((t) => on(t, "click", () => {
    const isOn = t.getAttribute("aria-pressed") !== "true";
    t.setAttribute("aria-pressed", String(isOn)); t.lastElementChild.textContent = isOn ? "동의함" : "동의 안 함";
    if (t.dataset.k === "AI 기록 정리") syncAI();
    if (t.dataset.k === "공고 추천 받기") setRecs(isOn);
    toast(`${t.dataset.k} · ${isOn ? "동의했어요" : "철회했어요"}`);
  }));
  on($("#delBtn"), "click", () => { if (confirm("녹음·답·근거 카드를 모두 지울까요? 되돌릴 수 없어요.")) toast("삭제 요청을 받았어요 (시안)"); });

  syncAI(); applyFilter();
  function toast(t: string) { const el = $("#toast"); el.textContent = t; animate(el, { opacity: [0, 1, 1, 0], y: [20, 0, 0, 0], duration: D(2200) || 1, ease: "outQuad" }); }

  // company preview
  const togglePv = () => { const isOn = root.classList.toggle("preview"); $("#pvBtn").setAttribute("aria-pressed", String(isOn)); };
  on($("#pvBtn"), "click", togglePv);
  $$('[data-act="pv"]').forEach((b) => on(b, "click", togglePv));

  return () => { ac.abort(); clearTimeout(timer); root.classList.remove("preview"); };
}
