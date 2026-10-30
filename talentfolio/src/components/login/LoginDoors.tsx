"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { Lora } from "next/font/google";
import { useAuth } from "@/context/AuthContext";
import "./login-doors.css";
import { SiteHeader } from "@/components/site/SiteHeader";

const lora = Lora({ weight: ["500", "700"], style: ["italic"], subsets: ["latin"], display: "swap", variable: "--font-sky-lora" });
const PRETENDARD = "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css";
const WANTED_SANS = "https://cdn.jsdelivr.net/gh/wanteddev/wanted-sans@v1.0.3/packages/wanted-sans/fonts/webfonts/variable/split/WantedSansVariable.min.css";
const MARU_BURI = "https://hangeul.pstatic.net/hangeul_static/css/maru-buri.css";

type Door = "seeker" | "company";

const DOORS: Record<Door, { k: string; t: string; d: string; submit: string; placeholder: string; next: string }> = {
  seeker: {
    k: "FOR TALENT",
    t: "구직자로 로그인",
    d: "포트폴리오를 관리하고, 내게 온 제안과 핏 리포트를 확인합니다.",
    submit: "구직자로 로그인",
    placeholder: "name@example.com",
    next: "/studio",
  },
  company: {
    k: "FOR TEAMS",
    t: "기업 · 헤드헌터로 로그인",
    d: "스카우트 건을 열고, AI가 찾은 후보를 검토·승인합니다.",
    submit: "기업 계정으로 로그인",
    placeholder: "name@company.com",
    next: "/desk",
  },
};

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function toKoreanError(err: string) {
  if (err.includes("Invalid login")) return "이메일 또는 비밀번호가 올바르지 않습니다.";
  if (err.includes("Password should")) return "비밀번호는 6자 이상이어야 합니다.";
  return err;
}

function DoorForm({ door }: { door: Door }) {
  const { signIn } = useAuth();
  const router = useRouter();
  const cfg = DOORS[door];
  const id = (s: string) => `${door}-${s}`;
  const emailRef = useRef<HTMLInputElement>(null);
  const pwRef = useRef<HTMLInputElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [emailErr, setEmailErr] = useState("");
  const [pwErr, setPwErr] = useState("");
  const [alert, setAlert] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const v = email.trim();
    const eMsg = !v ? "이메일을 입력해 주세요." : !EMAIL_RE.test(v) ? "이메일 형식이 올바르지 않습니다. 예: name@company.com" : "";
    const pMsg = !pw ? "비밀번호를 입력해 주세요." : pw.length < 6 ? "비밀번호는 6자 이상이어야 합니다." : "";
    setEmailErr(eMsg);
    setPwErr(pMsg);
    setAlert("");
    if (eMsg) return emailRef.current?.focus();
    if (pMsg) return pwRef.current?.focus();

    setBusy(true);
    const err = await signIn(v, pw);
    setBusy(false);
    if (err) {
      setAlert(toKoreanError(err));
      requestAnimationFrame(() => alertRef.current?.focus());
      return;
    }
    router.push(cfg.next);
  };

  return (
    <form noValidate aria-label={cfg.t} onSubmit={onSubmit}>
      {alert && (
        <div className="alert" role="alert" tabIndex={-1} ref={alertRef}>
          <span aria-hidden="true">!</span><span>{alert}</span>
        </div>
      )}
      <div className="field">
        <label htmlFor={id("email")}>이메일</label>
        <input ref={emailRef} className="input" id={id("email")} name="email" type="email" autoComplete="email" inputMode="email"
          placeholder={cfg.placeholder} value={email} onChange={(e) => setEmail(e.target.value)}
          aria-invalid={!!emailErr} aria-describedby={id("email-err")} />
        <p className="err" id={id("email-err")} aria-live="polite">{emailErr}</p>
      </div>
      <div className="field">
        <label htmlFor={id("pw")}>비밀번호</label>
        <div className="pw">
          <input ref={pwRef} className="input" id={id("pw")} name="password" type={showPw ? "text" : "password"} autoComplete="current-password"
            value={pw} onChange={(e) => setPw(e.target.value)}
            aria-invalid={!!pwErr} aria-describedby={`${id("pw-err")} ${id("pw-hint")}`} />
          <button type="button" aria-controls={id("pw")} aria-pressed={showPw} onClick={() => setShowPw((s) => !s)}>
            {showPw ? "숨기기" : "보기"}
          </button>
        </div>
        <p className="err" id={id("pw-err")} aria-live="polite">{pwErr}</p>
        <span className="sr-only" id={id("pw-hint")}>6자 이상</span>
      </div>
      <div className="row">
        <label className="check"><input type="checkbox" name="remember" defaultChecked /> 로그인 상태 유지</label>
      </div>
      <button className="btn" type="submit" disabled={busy}>
        {busy ? "로그인 중..." : <>{cfg.submit} <i aria-hidden="true">→</i></>}
      </button>
    </form>
  );
}

export function LoginDoors() {
  const { authAvailable } = useAuth();
  const [open, setOpen] = useState<Door>("seeker");
  const companyHead = useRef<HTMLButtonElement>(null);

  const openDoor = (door: Door) => {
    setOpen(door);
    requestAnimationFrame(() =>
      document.getElementById(`${door}-email`)?.focus({ preventScroll: !matchMedia("(min-width:761px)").matches }),
    );
  };

  return (
    <div className={`tf-login ${lora.variable}`}>
      <link rel="stylesheet" href={PRETENDARD} precedence="default" />
      <link rel="stylesheet" href={WANTED_SANS} precedence="default" />
      <link rel="stylesheet" href={MARU_BURI} precedence="default" />
      
      <SiteHeader crumb="로그인" />

      <main id="main" className="wrap">
        <div className="top">
          <h1>어느 문으로<br /><span className="acc">들어오시나요?</span></h1>
          <p>입장에 맞는 화면으로 바로 안내해 드려요. 로그인 뒤에도 메뉴에서 입장을 바꿀 수 있어요.</p>
        </div>
        {!authAvailable && (
          <div className="alert" role="status" style={{ marginBottom: 20 }}>
            <span aria-hidden="true">!</span><span>지금은 로그인 서버에 연결되어 있지 않아요. 잠시 후 다시 시도해 주세요.</span>
          </div>
        )}
        <p className="jump">
          <button type="button" onClick={() => { openDoor("company"); companyHead.current?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); }}>
            기업 · 헤드헌터이신가요? <span aria-hidden="true">↓</span>
          </button>
        </p>

        <div className="doors">
          {(["seeker", "company"] as const).map((door) => {
            const cfg = DOORS[door];
            const isOpen = open === door;
            return (
              <section key={door} className={`door ${door}`} data-open={isOpen} aria-labelledby={`h-${door}`}>
                <h2 className="dh">
                  <button ref={door === "company" ? companyHead : undefined} className="door-head" type="button"
                    aria-expanded={isOpen} aria-controls={`b-${door}`} onClick={() => openDoor(door)}>
                    <span className="k">{cfg.k}</span>
                    <span className="t" id={`h-${door}`}>{cfg.t}</span>
                    <span className="d">{cfg.d}</span>
                    <span className="go">이 문으로 →</span>
                  </button>
                </h2>
                {isOpen && (
                  <div className="door-body" id={`b-${door}`}>
                    <DoorForm door={door} />
                    {/* 소셜·SSO 로그인은 연결되면 다시 노출한다 (안 되는 버튼은 보여주지 않는다) */}
                  </div>
                )}
              </section>
            );
          })}
        </div>
        <p className="foot2">계정이 없나요? <Link href="/start">구직자로 시작하기</Link> · <Link href="/desk">기업 데스크 둘러보기</Link></p>
      </main>
    </div>
  );
}
