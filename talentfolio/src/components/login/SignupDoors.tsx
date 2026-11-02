"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { Lora } from "next/font/google";
import { useAuth } from "@/context/AuthContext";
import { homeOf, type AccountType } from "@/lib/accountType";
import { JOB_CATEGORIES, type JobCategory } from "@/lib/jobCategories";
import "./login-doors.css";
import { SiteHeader } from "@/components/site/SiteHeader";

const lora = Lora({ weight: ["500", "700"], style: ["italic"], subsets: ["latin"], display: "swap", variable: "--font-sky-lora" });
const PRETENDARD = "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css";
const WANTED_SANS = "https://cdn.jsdelivr.net/gh/wanteddev/wanted-sans@v1.0.3/packages/wanted-sans/fonts/webfonts/variable/split/WantedSansVariable.min.css";

const DOORS: Record<AccountType, { k: string; t: string; d: string; submit: string; placeholder: string; titleLabel: string; titlePh: string }> = {
  seeker: {
    k: "FOR TALENT",
    t: "구직자로 가입",
    d: "포트폴리오를 올리고, 기업의 제안과 핏 리포트를 받습니다.",
    submit: "구직자 계정 만들기",
    placeholder: "name@example.com",
    titleLabel: "직함",
    titlePh: "예: 프론트엔드 개발자",
  },
  company: {
    k: "FOR TEAMS",
    t: "기업 · 헤드헌터로 가입",
    d: "스카우트 건을 열고, AI가 찾은 후보를 검토·승인합니다.",
    submit: "기업 계정 만들기",
    placeholder: "name@company.com",
    titleLabel: "회사명",
    titlePh: "예: 탤런트폴리오",
  },
};

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function SignupForm({ door }: { door: AccountType }) {
  const { signUp } = useAuth();
  const cfg = DOORS[door];
  const id = (s: string) => `su-${door}-${s}`;
  const alertRef = useRef<HTMLDivElement>(null);
  const [f, setF] = useState({ name: "", title: "", email: "", pw: "" });
  const [jobCategory, setJobCategory] = useState<JobCategory | "">("");
  const [showPw, setShowPw] = useState(false);
  const [alert, setAlert] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((s) => ({ ...s, [k]: e.target.value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const email = f.email.trim();
    const msg = !f.name.trim() ? "이름을 입력해 주세요."
      : !f.title.trim() ? `${cfg.titleLabel}을 입력해 주세요.`
      : door === "seeker" && !jobCategory ? "직군을 선택해 주세요."
      : !EMAIL_RE.test(email) ? "이메일 형식이 올바르지 않습니다."
      : f.pw.length < 6 ? "비밀번호는 6자 이상이어야 합니다." : "";
    if (msg) {
      setAlert(msg);
      requestAnimationFrame(() => alertRef.current?.focus());
      return;
    }
    setAlert("");
    setBusy(true);
    const err = await signUp({ email, password: f.pw, name: f.name.trim(), title: f.title.trim(), accountType: door, jobCategory: jobCategory || undefined });
    setBusy(false);
    if (err) {
      setAlert(err);
      requestAnimationFrame(() => alertRef.current?.focus());
      return;
    }
    window.location.assign(homeOf(door));
  };

  return (
    <form noValidate aria-label={cfg.t} onSubmit={onSubmit}>
      {alert && (
        <div className="alert" role="alert" tabIndex={-1} ref={alertRef}>
          <span aria-hidden="true">!</span><span>{alert}</span>
        </div>
      )}
      <div className="field">
        <label htmlFor={id("name")}>{door === "company" ? "담당자 이름" : "이름"}</label>
        <input className="input" id={id("name")} autoComplete="name" value={f.name} onChange={set("name")} />
      </div>
      <div className="field">
        <label htmlFor={id("title")}>{cfg.titleLabel}</label>
        <input className="input" id={id("title")} autoComplete={door === "company" ? "organization" : "organization-title"}
          placeholder={cfg.titlePh} value={f.title} onChange={set("title")} />
      </div>
      {door === "seeker" && (
        <div className="field">
          <label htmlFor={id("job")}>직군</label>
          <select className="input" id={id("job")} value={jobCategory} onChange={(e) => setJobCategory(e.target.value as JobCategory)}>
            <option value="" disabled>직군을 선택해 주세요</option>
            {JOB_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      )}
      <div className="field">
        <label htmlFor={id("email")}>이메일</label>
        <input className="input" id={id("email")} type="email" autoComplete="email" inputMode="email"
          placeholder={cfg.placeholder} value={f.email} onChange={set("email")} />
      </div>
      <div className="field">
        <label htmlFor={id("pw")}>비밀번호 (6자 이상)</label>
        <div className="pw">
          <input className="input" id={id("pw")} type={showPw ? "text" : "password"} autoComplete="new-password" value={f.pw} onChange={set("pw")} />
          <button type="button" aria-controls={id("pw")} aria-pressed={showPw} onClick={() => setShowPw((s) => !s)}>
            {showPw ? "숨기기" : "보기"}
          </button>
        </div>
      </div>
      <button className="btn" type="submit" disabled={busy}>
        {busy ? "가입 중..." : <>{cfg.submit} <i aria-hidden="true">→</i></>}
      </button>
    </form>
  );
}

export function SignupDoors() {
  const { authAvailable } = useAuth();
  const params = useSearchParams();
  const [open, setOpen] = useState<AccountType>(params.get("type") === "company" ? "company" : "seeker");

  return (
    <div className={`tf-login ${lora.variable}`}>
      <link rel="stylesheet" href={PRETENDARD} precedence="default" />
      <link rel="stylesheet" href={WANTED_SANS} precedence="default" />

      <SiteHeader crumb="회원가입" />

      <main id="main" className="wrap">
        <div className="top">
          <h1>어떤 계정으로<br /><span className="acc">시작할까요?</span></h1>
          <p>구직자 계정은 스튜디오만, 기업 계정은 데스크만 쓸 수 있어요. 가입 뒤에는 유형을 바꿀 수 없어요.</p>
        </div>
        {!authAvailable && (
          <div className="alert" role="status" style={{ marginBottom: 20 }}>
            <span aria-hidden="true">!</span><span>지금은 로그인 서버에 연결되어 있지 않아요. 잠시 후 다시 시도해 주세요.</span>
          </div>
        )}
        <div className="doors">
          {(["seeker", "company"] as const).map((door) => {
            const cfg = DOORS[door];
            const isOpen = open === door;
            return (
              <section key={door} className={`door ${door}`} data-open={isOpen} aria-labelledby={`su-h-${door}`}>
                <h2 className="dh">
                  <button className="door-head" type="button" aria-expanded={isOpen} aria-controls={`su-b-${door}`} onClick={() => setOpen(door)}>
                    <span className="k">{cfg.k}</span>
                    <span className="t" id={`su-h-${door}`}>{cfg.t}</span>
                    <span className="d">{cfg.d}</span>
                    <span className="go">이 문으로 →</span>
                  </button>
                </h2>
                {isOpen && (
                  <div className="door-body" id={`su-b-${door}`}>
                    <SignupForm door={door} />
                  </div>
                )}
              </section>
            );
          })}
        </div>
        <p className="foot2">이미 계정이 있나요? <Link href="/login">로그인</Link></p>
      </main>
    </div>
  );
}
