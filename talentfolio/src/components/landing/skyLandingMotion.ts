// Motion for the "맑은 아침 하늘" landing. Ported from the static mockup
// (jd-fit-analyzer/docs/design/talentfolio-main/drafts/D_sky). Every element gets its own
// enter/exit choreography; nothing here is a uniform fade-up.
import { animate, createTimeline, stagger, onScroll, utils } from "animejs";

type Revertible = { revert: () => unknown };

const SPRITE = "/images/peeps/all-peeps.png";
// Sprite cells (15 x 7 grid) that show a person holding a knife.
const EXCLUDED_PEEPS = new Set([17, 72, 92, 100]);

const WORKS: [string, string, string, string][] = [
  ["WEB", "디자인 시스템 리뉴얼", "React · Storybook", "c1"],
  ["APP", "오프라인 우선 가계부", "Flutter", "c2"],
  ["BRAND", "동네 서점 아이덴티티", "Figma · 일러스트", "c3"],
  ["DATA", "지하철 혼잡도 대시보드", "D3 · Python", ""],
  ["UX", "시니어 키오스크 리서치", "인터뷰 18건", "c2"],
  ["BACKEND", "주문 큐 장애 대응기", "BullMQ · Redis", "c1"],
  ["MOTION", "온보딩 모션 가이드", "After Effects", ""],
  ["WEB", "접근성 감사 리포트", "WCAG 2.2", "c3"],
];

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Wires all landing motion inside `root`. Returns a cleanup that stops loops and reverts styles. */
export function initSkyLanding(root: HTMLElement, heroFontFamily: string): () => void {
  const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = root) => r.querySelector(s) as T;
  const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = root) => [...r.querySelectorAll(s)] as T[];

  const disposers: (() => void)[] = [];
  const anims: Revertible[] = [];
  const keep = <T extends Revertible>(a: T) => (anims.push(a), a);
  const on = <K extends keyof WindowEventMap>(type: K, fn: (e: WindowEventMap[K]) => void, opts?: AddEventListenerOptions) => {
    addEventListener(type, fn, opts);
    disposers.push(() => removeEventListener(type, fn));
  };
  let alive = true;

  /* ---------- Crowd (Skiper39 port, gsap -> rAF) ---------- */
  type Peep = { r: number[]; w: number; h: number; y0: number; dir: number; sx: number; ex: number; speed: number; t: number };
  function crowd(canvas: HTMLCanvasElement, { cap = 36, onFrame, scale = 1 }: { cap?: number; onFrame?: () => void; scale?: number } = {}) {
    let visible = true, running = true;
    const ctx = canvas.getContext("2d")!;
    const img = new Image();
    const stage = { w: 0, h: 0 };
    let all: Peep[] = [], avail: Peep[] = [], walking: Peep[] = [], ok = false;
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    function reset(p: Peep) {
      const dir = Math.random() > 0.5 ? 1 : -1;
      const offY = (100 - 250 * Math.random() ** 2) * scale;
      // keep heads inside the canvas so the top of the crowd is never clipped
      p.y0 = Math.max(12, stage.h - p.h + offY);
      p.dir = dir;
      p.sx = dir === 1 ? -p.w : stage.w + p.w;
      p.ex = dir === 1 ? stage.w : 0;
      p.speed = rnd(0.5, 1.5);
      p.t = 0;
    }
    function add(progress = 0) {
      const p = avail.splice((Math.random() * avail.length) | 0, 1)[0];
      if (!p) return;
      reset(p);
      p.t = progress * 10;
      walking.push(p);
      walking.sort((a, b) => a.y0 - b.y0);
    }
    function resize() {
      stage.w = canvas.clientWidth;
      stage.h = canvas.clientHeight;
      canvas.width = stage.w * devicePixelRatio;
      canvas.height = stage.h * devicePixelRatio;
      if (!ok) return;
      walking = [];
      avail = [...all];
      const n = Math.min(stage.w < 600 ? 16 : cap, avail.length);
      for (let i = 0; i < n; i++) add(Math.random());
    }
    let last = performance.now();
    function frame(now: number) {
      if (!alive) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(devicePixelRatio, devicePixelRatio);
      for (const p of [...walking]) {
        if (!RM) p.t += dt * p.speed;
        const k = p.t / 10;
        if (k >= 1) {
          walking.splice(walking.indexOf(p), 1);
          avail.push(p);
          add(0);
          continue;
        }
        const x = lerp(p.sx, p.ex, k);
        const bob = Math.abs(Math.sin(((p.t / 0.25) * Math.PI) / 2)) * 10;
        ctx.save();
        ctx.translate(x, p.y0 - bob);
        ctx.scale(p.dir, 1);
        ctx.drawImage(img, p.r[0], p.r[1], p.r[2], p.r[3], 0, 0, p.w, p.h);
        ctx.restore();
      }
      onFrame?.();
      if (visible && !RM) requestAnimationFrame(frame);
      else running = false;
    }
    img.onload = () => {
      const rows = 15, cols = 7, rw = img.naturalWidth / rows, rh = img.naturalHeight / cols;
      for (let i = 0; i < rows * cols; i++) {
        if (EXCLUDED_PEEPS.has(i)) continue;
        all.push({ r: [(i % rows) * rw, ((i / rows) | 0) * rh, rw, rh], w: rw * scale, h: rh * scale, y0: 0, dir: 1, sx: 0, ex: 0, speed: 1, t: 0 });
      }
      ok = true;
      resize();
      if (!running && alive) {
        running = true;
        requestAnimationFrame(frame);
      }
    };
    img.src = SPRITE;
    on("resize", resize);
    resize();
    requestAnimationFrame(frame);
    const io = new IntersectionObserver((es) => {
      visible = es[0].isIntersecting;
      if (visible && !running && !RM && alive) {
        running = true;
        last = performance.now();
        requestAnimationFrame(frame);
      }
    });
    io.observe(canvas);
    disposers.push(() => io.disconnect());
  }

  /* ---------- Mask word: crowd seen through the letters "연결" ---------- */
  const crowdCv = $<HTMLCanvasElement>("#crowd");
  const maskCv = $<HTMLCanvasElement>("#maskWord");
  const mctx = maskCv.getContext("2d")!;
  const tmp = document.createElement("canvas"), tctx = tmp.getContext("2d")!;
  let mx = 0, my = 0;
  function sizeMask() {
    const h = maskCv.clientHeight;
    mctx.font = `400 ${h}px ${heroFontFamily}`;
    const w = Math.ceil(mctx.measureText("연결").width + h * 0.08);
    maskCv.style.width = w + "px";
    maskCv.width = w * devicePixelRatio;
    maskCv.height = h * devicePixelRatio;
  }
  function drawMask() {
    const W = maskCv.width, H = maskCv.height;
    if (!W) return;
    mctx.setTransform(1, 0, 0, 1, 0, 0);
    mctx.globalCompositeOperation = "source-over";
    mctx.clearRect(0, 0, W, H);
    const g = mctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#4AA3F2");
    g.addColorStop(1, "#1F4FD6");
    mctx.font = `400 ${H}px ${heroFontFamily}`;
    mctx.textBaseline = "alphabetic";
    mctx.fillStyle = g;
    mctx.fillText("연결", H * 0.02, H * 0.86);
    mctx.globalCompositeOperation = "source-atop";
    const s = crowdCv.width ? crowdCv.height / H : 1;
    const sw = W * s * 0.6, sh = H * s * 0.6;
    if (tmp.width !== W || tmp.height !== H) {
      tmp.width = W;
      tmp.height = H;
    }
    tctx.globalCompositeOperation = "source-over";
    tctx.clearRect(0, 0, W, H);
    try {
      tctx.drawImage(crowdCv, (crowdCv.width - sw) / 2 + mx * 40, crowdCv.height - sh, sw, sh, 0, 0, W, H);
    } catch {}
    tctx.globalCompositeOperation = "source-in";
    tctx.fillStyle = "#0B1C45";
    tctx.fillRect(0, 0, W, H);
    mctx.drawImage(tmp, 0, 0);
  }
  document.fonts.ready.then(() => {
    if (!alive) return;
    sizeMask();
    (maskCv.previousElementSibling as HTMLElement).style.opacity = "0";
  });
  on("resize", sizeMask);
  crowd(crowdCv, { onFrame: drawMask, scale: 0.85 });
  crowd($<HTMLCanvasElement>("#crowd2"), { cap: 24, scale: 0.8 });

  /* ---------- Split helper (splitText is not in animejs 4.0.2) ---------- */
  $$("[data-split]").forEach((el) => {
    el.innerHTML = [...(el.textContent ?? "")]
      .map((c) => (c === " " ? " " : `<span class="ch" aria-hidden="true">${c}</span>`))
      .join("");
  });

  /* ---------- Generic scroll progress (for pinned/sticky scrubs) ---------- */
  const scrubs: { el: HTMLElement; fn: (p: number, r: DOMRect) => void }[] = [];
  const scrub = (el: HTMLElement, fn: (p: number, r: DOMRect) => void) => scrubs.push({ el, fn });
  function tick() {
    const vh = innerHeight;
    for (const { el, fn } of scrubs) {
      const r = el.getBoundingClientRect();
      const total = r.height - vh;
      fn(clamp(-r.top / (total > 0 ? total : r.height)), r);
    }
  }
  let ticking = false;
  on("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      if (alive) tick();
    });
  }, { passive: true });

  /* ---------- HERO intro + pinned exit ---------- */
  if (!RM) {
    keep(
      createTimeline({ defaults: { ease: "outExpo" } })
        .add($$("#hTitle .line:first-child .ch"), { y: ["110%", "0%"], rotate: [12, 0], duration: 1100, delay: stagger(55) })
        .add($$("#hTitle .mask-row .ch"), { y: ["-110%", "0%"], duration: 900, delay: stagger(60) }, "-=800")
        .add(maskCv, { clipPath: ["inset(0 100% 0 0)", "inset(0 0% 0 0)"], duration: 1200, ease: "inOutQuart" }, "-=700")
        .add($("#handNote"), { opacity: [0, 1], rotate: [-25, -4], scale: [0.6, 1], duration: 700, ease: "outBack(2)" }, "-=400")
        .add($("#heroLabel"), { opacity: [0, 1], letterSpacing: [".6em", ".18em"], duration: 900 }, 0)
        .add($("#heroSub"), { opacity: [0, 1], filter: ["blur(8px)", "blur(0px)"], duration: 700 }, 200)
        .add($$("#heroCta .btn"), { opacity: [0, 1], scale: [0.85, 1], delay: stagger(90), duration: 500, ease: "outBack(1.6)" }, 300)
        .add($("#backWord"), { opacity: [0, 1], x: ["-8%", "0%"], duration: 1800 }, 0)
        .add($("#sun"), { opacity: [0, 1], scale: [0.6, 1], duration: 2000, ease: "outQuad" }, 0),
    );

    // pointer parallax: back word and copy move at different depths (crowd stays = middle layer)
    if (matchMedia("(hover: hover)").matches) {
      on("pointermove", (e) => {
        mx = e.clientX / innerWidth - 0.5;
        my = e.clientY / innerHeight - 0.5;
        utils.set($("#backWord"), { translateX: mx * -40, translateY: my * -20 });
        utils.set($("#heroCopy"), { translateX: mx * 14, translateY: my * 8 });
      });
    }

    // pinned exit: sun rises, title letters scatter upward at different speeds, crowd sinks
    const chars = $$("#hTitle .ch");
    const seeds = chars.map(() => Math.random() * 2 - 1);
    const sun = $("#sun"), backWord = $("#backWord"), mw = $(".mask-wrap");
    const heroSub = $("#heroSub"), heroCta = $("#heroCta"), skip = $(".skip"), handNote = $("#handNote");
    scrub($("#hero"), (p) => {
      sun.style.transform = `translate(-50%, ${-10 - p * 90}%) scale(${1 + p * 0.8})`;
      backWord.style.letterSpacing = `${p * 0.2}em`;
      const q = clamp((p - 0.1) / 0.9);
      chars.forEach((c, i) => {
        c.style.transform = `translate(${seeds[i] * q * 60}px, ${-q * (120 + i * 18)}px) rotate(${seeds[i] * q * 30}deg)`;
        c.style.opacity = String(1 - q * 1.4);
      });
      mw.style.transformOrigin = "left bottom";
      mw.style.transform = `scale(${1 + clamp(p - 0.2) * 2})`;
      mw.style.opacity = String(1 - clamp((p - 0.6) * 2.5));
      heroSub.style.opacity = heroCta.style.opacity = String(1 - clamp((p - 0.35) * 3));
      skip.style.opacity = String(1 - clamp(p * 3));
      handNote.style.transform = `rotate(${-4 + p * 40}deg) translateX(${p * 200}px)`;
      crowdCv.style.transform = `translateY(${p * 25}%)`;
    });
  }

  /* ---------- Observer helper: different enter + exit per element ---------- */
  function watch(el: Element, enter: (t: Element) => void, leave: ((t: Element) => void) | null, threshold = 0.3) {
    if (RM) return;
    const io = new IntersectionObserver((es) =>
      es.forEach((e) => {
        if (e.isIntersecting) enter(e.target);
        else if (e.boundingClientRect.top < 0) leave?.(e.target);
      }),
    { threshold });
    io.observe(el);
    disposers.push(() => io.disconnect());
  }

  /* ---------- ROLES: horizontal slide from opposite sides; exit = clip collapse ---------- */
  if (!RM) {
    const roleA = $("#roleA"), roleB = $("#roleB"), rh = $("#rolesHead");
    utils.set(roleA, { opacity: 0, x: "-30%", rotate: -3 });
    utils.set(roleB, { opacity: 0, x: "30%", rotate: 3 });
    utils.set(rh, { clipPath: "inset(0 0 100% 0)" });
    watch($("#roles"), () => {
      keep(animate(rh, { clipPath: "inset(0 0 0% 0)", duration: 900, ease: "inOutCubic" }));
      keep(animate(roleA, { opacity: 1, x: "0%", rotate: 0, clipPath: "inset(0% 0% 0% 0% round 28px)", duration: 1100, ease: "outExpo", delay: 150 }));
      keep(animate(roleB, { opacity: 1, x: "0%", rotate: 0, clipPath: "inset(0% 0% 0% 0% round 28px)", duration: 1100, ease: "outExpo", delay: 300 }));
    }, () => {
      keep(animate(roleA, { clipPath: "inset(0% 0% 0% 100% round 28px)", duration: 700, ease: "inQuart" }));
      keep(animate(roleB, { clipPath: "inset(0% 100% 0% 0% round 28px)", duration: 700, ease: "inQuart" }));
    }, 0.25);
  }

  /* ---------- DEMO: sticky pin + scrub through 4 states ---------- */
  const cands = $$(".cand"), lis = $$("#stepsTxt li");
  const scores = $$(".score"), bars = $$(".bar i");
  const board = $("#board"), stamp = $("#stamp"), jd = $("#jd");
  let stage = -1;
  function demoStage(s: number) {
    if (s === stage) return;
    stage = s;
    board?.dispatchEvent(new CustomEvent("sky-demo", { detail: s }));
    lis.forEach((l, i) => l.classList.toggle("on", i <= s));
    if (RM) return;
    if (s >= 0) keep(animate(jd, { scale: [0.94, 1], opacity: [0.4, 1], duration: 500, ease: "outBack" }));
    if (s >= 1) keep(animate(cands, { opacity: 1, x: 0, delay: stagger(110), duration: 700, ease: "outExpo" }));
    else keep(animate(cands, { opacity: 0, x: 40, duration: 300 }));
    if (s >= 2) {
      scores.forEach((el) => {
        const o = { v: 0 };
        keep(animate(o, { v: +(el.dataset.v ?? 0), duration: 1200, ease: "outCubic", modifier: utils.round(0), onUpdate: () => { el.textContent = String(o.v); } }));
      });
      bars.forEach((b) => keep(animate(b, { width: b.dataset.w + "%", duration: 1200, ease: "outCubic" })));
    } else {
      scores.forEach((el) => (el.textContent = "0"));
      bars.forEach((b) => (b.style.width = "0"));
    }
    if (s >= 3) keep(animate(stamp, { opacity: [0, 1], scale: [2.4, 1], rotate: [-40, -14], duration: 500, ease: "outBack(3)" }));
    else keep(animate(stamp, { opacity: 0, scale: 2.4, duration: 200 }));
  }
  if (RM) {
    demoStage(3);
    scores.forEach((el) => (el.textContent = el.dataset.v ?? ""));
    bars.forEach((b) => (b.style.width = b.dataset.w + "%"));
  } else if (matchMedia("(max-width: 860px)").matches) {
    watch(board, () => demoStage(3), null, 0.4);
  } else {
    scrub($("#demo"), (p) => {
      demoStage(Math.min(3, Math.floor(p * 4.4) - (p < 0.05 ? 1 : 0)));
      board.style.transform = `perspective(1200px) rotateY(${(1 - clamp(p * 4)) * -18}deg) rotateX(${clamp((p - 0.85) * 6) * 8}deg)`;
    });
  }

  /* ---------- LOOP: line drawing synced to scroll, dots pop with scale ---------- */
  const path = $<SVGPathElement>("#loopPath");
  const len = path.getTotalLength();
  path.style.strokeDasharray = String(len);
  path.style.strokeDashoffset = RM ? "0" : String(len);
  if (!RM) {
    keep(animate(path, { strokeDashoffset: [len, 0], ease: "linear",
      autoplay: keep(onScroll({ target: $("#loop"), enter: "bottom top", leave: "center center", sync: true })) }));
    const dots = $$("#loopDots circle"), items = $$(".loop-item");
    utils.set(dots, { scale: 0, transformOrigin: "center", transformBox: "fill-box" });
    utils.set(items, { opacity: 0, rotateX: 70, transformOrigin: "50% 0%" });
    watch($("#loop"), () => {
      keep(animate(dots, { scale: [0, 1.4, 1], delay: stagger(260, { start: 300 }), duration: 700, ease: "outBack" }));
      keep(animate(items, { opacity: 1, rotateX: 0, delay: stagger(260, { start: 400 }), duration: 900, ease: "outExpo" }));
    }, () => keep(animate(items, { opacity: 0, y: -30, delay: stagger(60, { from: "last" }), duration: 400 })), 0.4);
  }

  /* ---------- STATEMENT (pinned): words light up, proof objects fly in from four sides,
     a dotted arrow draws from the company side back to the maker, then everything drifts apart ---------- */
  const isNarrow = matchMedia("(max-width: 860px)").matches;
  const stmt = $("#stmt");
  stmt.innerHTML = (stmt.dataset.words ?? "").split("|")
    .map((w) => (w === "/" ? "<br>" : w.startsWith("*") ? `<span class="w blue">${w.slice(1)}</span>` : `<span class="w">${w}</span>`))
    .join(" ");
  const words = $$(".w", stmt);
  const floats = $$(".float");
  const kicker = $("#stmtKicker"), stmtSub = $("#stmtSub"), revArrow = $(".reverse-arrow"), revHead = $("#revHead"), fSun = $("#fSun");
  // Each float enters from its own side with its own twist.
  const FROM: Record<string, (e: number) => string> = {
    left: (e) => `translateX(${-55 * e}vw) rotate(${-6 - 24 * e}deg)`,
    top: (e) => `translateY(${-70 * e}vh) scale(${1 + 0.6 * e}) rotate(${4 * e}deg)`,
    bottom: (e) => `translateY(${60 * e}vh) skewY(${10 * e}deg)`,
    right: (e) => `translateX(${55 * e}vw) rotate(${18 * e}deg)`,
  };
  if (RM || isNarrow) {
    words.forEach((w) => w.classList.add("lit"));
    if (!RM) {
      utils.set(floats, { opacity: 0, scale: 0.8 });
      watch(stmt, () => {
        words.forEach((w) => w.classList.add("lit"));
        keep(animate(floats, { opacity: 1, scale: 1, delay: stagger(140), duration: 800, ease: "outBack(1.6)" }));
      }, null, 0.4);
    }
  } else {
    scrub($("#statement"), (p) => {
      kicker.style.clipPath = `inset(0 ${100 - clamp(p / 0.1) * 100}% 0 0)`;
      const wp = clamp((p - 0.05) / 0.45);
      words.forEach((w, i) => w.classList.toggle("lit", wp * words.length > i));
      stmtSub.style.opacity = String(clamp((p - 0.45) / 0.12));
      stmtSub.style.transform = `translateY(${(1 - clamp((p - 0.45) / 0.12)) * 24}px)`;
      const out = clamp((p - 0.86) / 0.14);
      floats.forEach((f, i) => {
        const e = 1 - clamp((p - 0.08 - i * 0.07) / 0.22);
        const dir = f.dataset.from ?? "left";
        const drift = dir === "left" || dir === "bottom" ? -1 : 1;
        f.style.transform = `${FROM[dir](e)} translate(${drift * out * 8}vw, ${-out * 6}vh) scale(${1 - out * 0.15})`;
        f.style.opacity = String(Math.min(1 - e * 0.9, 1 - out));
      });
      const a = clamp((p - 0.3) / 0.35);
      revArrow.style.clipPath = `inset(0 0 0 ${100 - a * 100}%)`;
      revHead.style.opacity = String(clamp((a - 0.9) * 10) * (1 - out));
      fSun.style.transform = `translateY(${(1 - p) * 30}vh) scale(${0.6 + p * 1.4})`;
      $(".stmt-core").style.transform = `scale(${1 - out * 0.06})`;
      $(".stmt-core").style.opacity = String(1 - out * 0.7);
    });
  }

  /* ---------- WORKS (pinned): vertical scroll drives a horizontal slide, cards tilt like a deck ---------- */
  const track = $("#worksTrack"), worksNo = $("#worksNo"), worksBar = $("#worksBar");
  track.innerHTML = WORKS.map(([t, h, g, c]) => `<div class="card ${c}"><span class="t">${t} · 예시</span><h4>${h}</h4><span class="tags">${g}</span></div>`).join("");
  const cards = $$(".card", track);
  const setCount = (i: number) => { worksNo.textContent = String(i + 1).padStart(2, "0"); };
  if (RM || isNarrow) {
    const scroller = $(".works-scroller");
    const onSlide = () => {
      const k = scroller.scrollLeft / Math.max(1, scroller.scrollWidth - scroller.clientWidth);
      setCount(Math.round(k * (cards.length - 1)));
      worksBar.style.width = `${k * 100}%`;
    };
    scroller.addEventListener("scroll", onSlide, { passive: true });
    disposers.push(() => scroller.removeEventListener("scroll", onSlide));
  } else {
    const head = $(".works-head");
    utils.set(head, { clipPath: "inset(0 0 100% 0)" });
    watch($("#works"), () => keep(animate(head, { clipPath: "inset(0 0 0% 0)", duration: 900, ease: "inOutCubic" })), null, 0.15);
    scrub($("#works"), (p) => {
      const span = track.scrollWidth - innerWidth;
      // hold briefly at both ends so the section reads as "pinned, then slides, then moves on"
      const k = clamp((p - 0.08) / 0.84);
      track.style.transform = `translateX(${-k * span}px)`;
      const mid = innerWidth / 2;
      let nearest = 0, best = Infinity;
      cards.forEach((c, i) => {
        const r = c.getBoundingClientRect();
        const d = (r.left + r.width / 2 - mid) / innerWidth; // -0.5..0.5 on screen
        if (Math.abs(d) < best) { best = Math.abs(d); nearest = i; }
        c.style.transform = `translateY(${Math.abs(d) * 60}px) rotate(${d * -8}deg) scale(${1 - Math.min(0.12, Math.abs(d) * 0.18)})`;
      });
      setCount(nearest);
      worksBar.style.width = `${k * 100}%`;
    });
  }

  /* ---------- NUMBERS: odometer rolling digits ---------- */
  $$(".odo").forEach((el) => {
    const digits = String(el.dataset.n).split("");
    el.innerHTML = digits
      .map((d) => `<span class="col" data-d="${d}">${"0123456789".split("").map((x) => `<span>${x}</span>`).join("")}</span>`)
      .join("") + `<span class="suf">${el.dataset.suf}</span>`;
    const cols = $$(".col", el);
    const go = () => cols.forEach((c, i) => keep(animate(c, { translateY: `${-(c.dataset.d ?? 0)}em`, duration: 1600 + i * 300, ease: "outExpo", delay: i * 120 })));
    if (RM) cols.forEach((c) => (c.style.transform = `translateY(${-(c.dataset.d ?? 0)}em)`));
    else watch(el, go, () => cols.forEach((c) => keep(animate(c, { translateY: "0em", duration: 500, ease: "inQuad" }))), 0.6);
  });

  /* ---------- CTA: circular clip-path expands with scroll ---------- */
  if (!RM) {
    const cta = $("#cta"), ctaTitle = $(".cta-in h2");
    scrub(cta, (_p, r) => {
      const k = clamp(1 - r.top / innerHeight);
      cta.style.clipPath = `circle(${8 + k * 80}% at 50% ${60 - k * 10}%)`;
    });
    utils.set(ctaTitle, { opacity: 0, letterSpacing: "-.12em" });
    watch(cta, () => keep(animate(ctaTitle, { opacity: 1, letterSpacing: "-.03em", duration: 1400, ease: "outExpo" })), null, 0.6);
  }
  tick();

  return () => {
    alive = false;
    disposers.forEach((d) => d());
    anims.forEach((a) => { try { a.revert(); } catch {} });
  };
}
