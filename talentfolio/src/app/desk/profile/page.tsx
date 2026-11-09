"use client";

/**
 * 기업 프로필 — 헤드헌터/기업이 자기 회사 정보를 관리한다. 승인한 후보에게 제안을 보낼 때 이 정보가 함께 보인다.
 * 저장: 공통 항목은 본인 profiles 행(회사명·한 줄 소개·소개·기술·웹사이트·로고, RLS 본인 갱신),
 *       기업 전용 항목(업종·규모·설립·위치·복지·담당자)은 auth user_metadata.company (스키마 변경 없음).
 * 기업 계정의 profiles 행은 항상 비공개(is_public=false)라 인재풀에는 섞이지 않는다.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { animate, createScope, stagger, utils } from "animejs";
import {
  Building2,
  Globe,
  ImagePlus,
  Loader2,
  MapPin,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { ProductShell } from "@/components/product/ProductShell";
import { LoadError, SkeletonList } from "@/components/state/StateView";
import "../../../components/desk/desk.css";
import "./profile.css";

const INDUSTRIES = [
  "IT·플랫폼",
  "SI·솔루션",
  "게임",
  "핀테크·금융",
  "커머스·유통",
  "제조·하드웨어",
  "헬스케어·바이오",
  "교육",
  "미디어·콘텐츠",
  "모빌리티·물류",
  "공공·비영리",
  "헤드헌팅·HR",
  "기타",
];
const SIZES = ["1~10명", "11~50명", "51~200명", "201~1,000명", "1,000명 이상"];
const SIDO = [
  "서울",
  "경기",
  "인천",
  "부산",
  "대구",
  "광주",
  "대전",
  "울산",
  "세종",
  "강원",
  "충북",
  "충남",
  "전북",
  "전남",
  "경북",
  "경남",
  "제주",
  "원격 근무",
];
const PERK_SUGGEST = [
  "유연 근무",
  "재택 근무",
  "점심 제공",
  "교육비 지원",
  "장비 지원",
  "스톡옵션",
  "건강검진",
  "자율 휴가",
];

interface CompanyMeta {
  name: string;
  tagline: string;
  about: string;
  website: string;
  stack: string[];
  industry: string;
  size: string;
  founded: string;
  location: string;
  careersUrl: string;
  perks: string[];
  contactName: string;
  contactEmail: string;
  contactPhone: string;
}
type Form = CompanyMeta;

const str = (v: unknown) => (typeof v === "string" ? v : "");
const arr = (v: unknown) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
const urlOk = (v: string) =>
  !v || /^https?:\/\/[^\s.]+\.[^\s]+$/i.test(v.trim());
const emailOk = (v: string) =>
  !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

// 구직자에게 보이는 항목 기준 완성도 (담당자 연락처는 내부용이라 제외)
const SCORED: (keyof Form)[] = [
  "name",
  "tagline",
  "about",
  "industry",
  "size",
  "location",
  "website",
  "stack",
  "perks",
];

export default function CompanyProfilePage() {
  const {
    user,
    profile,
    refreshProfile,
    loading: authLoading,
    accountType,
  } = useAuth();
  const [form, setForm] = useState<Form | null>(null);
  const [saved, setSaved] = useState<Form | null>(null);
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [logo, setLogo] = useState<string | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const meter = useRef<HTMLSpanElement>(null);

  // 처음 한 번 계정 정보로 폼을 채운다
  useEffect(() => {
    if (!user || form) return;
    let alive = true;
    // 세션에 든 사용자 정보는 오래됐을 수 있어 서버에서 최신 메타데이터를 다시 받는다
    void (
      supabase
        ? supabase.auth.getUser().then((r) => r.data.user ?? user)
        : Promise.resolve(user)
    ).then((fresh) => {
      if (!alive) return;
      const m = (fresh.user_metadata?.company ?? {}) as Record<string, unknown>;
      const f: Form = {
        // 기업 정보는 user_metadata.company 를 우선 (가입 때 채워진 profiles 의 개인용 값보다 정확)
        name: str(m.name) || profile?.name || str(user.user_metadata?.name),
        tagline: str(m.tagline) || profile?.title || "",
        about: str(m.about) || profile?.long_bio || "",
        website: str(m.website) || profile?.portfolio_url || "",
        stack: arr(m.stack).length ? arr(m.stack) : (profile?.skills ?? []),
        industry: str(m.industry),
        size: str(m.size),
        founded: str(m.founded),
        location: str(m.location),
        careersUrl: str(m.careersUrl),
        perks: arr(m.perks),
        contactName: str(m.contactName),
        contactEmail: str(m.contactEmail) || (user.email ?? ""),
        contactPhone: str(m.contactPhone),
      };
      setForm(f);
      setSaved(f);
      setLogo(profile?.avatar_url ?? null);
    });
    return () => {
      alive = false;
    };
  }, [user, profile, form]);

  const score = useMemo(() => {
    if (!form) return 0;
    const filled = SCORED.filter((k) =>
      Array.isArray(form[k])
        ? (form[k] as string[]).length > 0
        : String(form[k]).trim().length > 0,
    ).length;
    return Math.round((filled / SCORED.length) * 100);
  }, [form]);
  const dirty = !!form && JSON.stringify(form) !== JSON.stringify(saved);

  // 진입 스태거 (anime.js v4 · reduced-motion 이면 생략)
  useEffect(() => {
    if (!form || !root.current) return;
    const rm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (rm) return;
    const scope = createScope({ root }).add(() => {
      animate(".cp-sec, .cp-preview", {
        opacity: [0, 1],
        y: [12, 0],
        duration: 380,
        ease: "outQuad",
        delay: stagger(50),
      });
    });
    return () => scope.revert();
    // 폼이 처음 채워질 때 한 번만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!form]);

  // 완성도 카운트업
  useEffect(() => {
    const el = meter.current;
    if (!el) return;
    const from = Number(el.dataset.v ?? 0);
    const o = { v: from };
    const rm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const a = animate(o, {
      v: score,
      duration: rm ? 0 : 500,
      ease: "outQuad",
      modifier: utils.round(0),
      onUpdate: () => {
        el.textContent = `${o.v}%`;
        el.dataset.v = String(o.v);
      },
    });
    return () => {
      a.pause();
    };
  }, [score]);

  if (authLoading)
    return (
      <ProductShell>
        <div className="cp">
          <SkeletonList rows={4} label="기업 프로필을 불러오는 중" />
        </div>
      </ProductShell>
    );
  if (!user)
    return (
      <ProductShell>
        <div className="cp">
          <LoadError what="기업 프로필" error="로그인이 필요합니다" />
        </div>
      </ProductShell>
    );
  if (accountType && accountType !== "company") {
    return (
      <ProductShell>
        <div className="cp">
          <p className="cp-muted">
            기업 계정만 쓸 수 있는 화면이에요.{" "}
            <Link href="/studio">스튜디오로 가기</Link>
          </p>
        </div>
      </ProductShell>
    );
  }
  if (!form)
    return (
      <ProductShell>
        <div className="cp">
          <SkeletonList rows={4} label="기업 프로필을 불러오는 중" />
        </div>
      </ProductShell>
    );

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => (f ? { ...f, [k]: v } : f));
    setState("idle");
  };
  const problems = [
    !form.name.trim() && "회사명을 입력하세요.",
    !urlOk(form.website) && "웹사이트 주소를 https:// 로 시작하게 적어 주세요.",
    !urlOk(form.careersUrl) &&
      "채용 페이지 주소를 https:// 로 시작하게 적어 주세요.",
    !emailOk(form.contactEmail) && "담당자 이메일 형식을 확인하세요.",
  ].filter(Boolean) as string[];

  async function save() {
    if (!form || !supabase || !user) return;
    if (problems.length) {
      setError(problems[0]);
      return;
    }
    setState("saving");
    setError(null);
    try {
      const { error: e1 } = await supabase
        .from("profiles")
        .update({
          name: form.name.trim(),
          title: form.tagline.trim() || null,
          long_bio: form.about.trim() || null,
          short_bio: form.tagline.trim() || null,
          portfolio_url: form.website.trim() || null,
          skills: form.stack,
        })
        .eq("id", user.id);
      if (e1) throw new Error(e1.message);
      const company: CompanyMeta = {
        name: form.name.trim(),
        tagline: form.tagline.trim(),
        about: form.about.trim(),
        website: form.website.trim(),
        stack: form.stack,
        industry: form.industry,
        size: form.size,
        founded: form.founded.trim(),
        location: form.location,
        careersUrl: form.careersUrl.trim(),
        perks: form.perks,
        contactName: form.contactName.trim(),
        contactEmail: form.contactEmail.trim(),
        contactPhone: form.contactPhone.trim(),
      };
      const { error: e2 } = await supabase.auth.updateUser({
        data: { company },
      });
      if (e2) throw new Error(e2.message);
      await refreshProfile();
      setSaved(form);
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장하지 못했어요");
      setState("idle");
    }
  }

  async function uploadLogo(file: File) {
    setLogoBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/profile/photo", {
        method: "POST",
        body: fd,
      });
      const body = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!res.ok || !body.url)
        throw new Error(body.error ?? "로고를 올리지 못했어요");
      setLogo(body.url);
      await refreshProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : "로고를 올리지 못했어요");
    } finally {
      setLogoBusy(false);
    }
  }

  async function removeLogo() {
    setLogoBusy(true);
    try {
      await fetch("/api/profile/photo", { method: "DELETE" });
      setLogo(null);
      await refreshProfile();
    } finally {
      setLogoBusy(false);
    }
  }

  return (
    <ProductShell crumble="데스크 · 기업 프로필">
      <div className="cp" ref={root}>
        <header className="cp-head">
          <div>
            <p className="cp-eyebrow">기업 프로필</p>
            <h1>
              후보가 만나는 <em>우리 회사</em>
            </h1>
            <p className="cp-sub">
              제안을 받은 후보가 이 정보를 보고 회사를 판단해요. 담당자 연락처는
              내부용이라 공개되지 않아요.
            </p>
          </div>
          <div className="cp-meter" aria-label={`프로필 완성도 ${score}%`}>
            <span className="cp-meter-k">완성도</span>
            <span className="cp-meter-v" ref={meter} data-v="0">
              0%
            </span>
            <span className="cp-meter-bar">
              <i style={{ width: `${score}%` }} />
            </span>
          </div>
        </header>

        <div className="cp-grid">
          <div className="cp-form">
            <section className="cp-sec" aria-labelledby="cp-basic">
              <h2 id="cp-basic">기본 정보</h2>
              <div className="cp-logo-row">
                <div className="cp-logo" aria-hidden={!logo}>
                  {logo ? (
                    <img src={logo} alt="회사 로고" />
                  ) : (
                    <Building2 size={26} />
                  )}
                </div>
                <div className="cp-logo-acts">
                  <label className="cp-btn">
                    {logoBusy ? (
                      <Loader2 size={15} className="cp-spin" />
                    ) : (
                      <ImagePlus size={15} />
                    )}
                    {logo ? "로고 바꾸기" : "로고 올리기"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      hidden
                      disabled={logoBusy}
                      onChange={(e) =>
                        e.target.files?.[0] &&
                        void uploadLogo(e.target.files[0])
                      }
                    />
                  </label>
                  {logo && (
                    <button
                      type="button"
                      className="cp-btn ghost"
                      disabled={logoBusy}
                      onClick={() => void removeLogo()}
                    >
                      삭제
                    </button>
                  )}
                  <span className="cp-muted">
                    PNG·JPG·WEBP, 5MB 이하. 정사각형이 가장 잘 보여요.
                  </span>
                </div>
              </div>
              <Field label="회사명" required>
                <input
                  value={form.name}
                  maxLength={60}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="예: 미래로시스템"
                />
              </Field>
              <Field label="한 줄 소개" hint={`${form.tagline.length}/80`}>
                <input
                  value={form.tagline}
                  maxLength={80}
                  onChange={(e) => set("tagline", e.target.value)}
                  placeholder="예: 공공·금융 시스템을 만드는 Java 전문 SI"
                />
              </Field>
              <div className="cp-two">
                <Field label="업종">
                  <select
                    value={form.industry}
                    onChange={(e) => set("industry", e.target.value)}
                  >
                    <option value="">선택</option>
                    {INDUSTRIES.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </Field>
                <Field label="규모">
                  <select
                    value={form.size}
                    onChange={(e) => set("size", e.target.value)}
                  >
                    <option value="">선택</option>
                    {SIZES.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </Field>
                <Field label="본사 위치">
                  <select
                    value={form.location}
                    onChange={(e) => set("location", e.target.value)}
                  >
                    <option value="">선택</option>
                    {SIDO.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </Field>
                <Field label="설립 연도">
                  <input
                    value={form.founded}
                    inputMode="numeric"
                    maxLength={4}
                    onChange={(e) =>
                      set("founded", e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="예: 2015"
                  />
                </Field>
              </div>
            </section>

            <section className="cp-sec" aria-labelledby="cp-about">
              <h2 id="cp-about">회사 소개</h2>
              <Field label="소개" hint={`${form.about.length}/1500`}>
                <textarea
                  value={form.about}
                  maxLength={1500}
                  rows={6}
                  onChange={(e) => set("about", e.target.value)}
                  placeholder="무엇을 만드는 회사인지, 팀은 어떻게 일하는지, 이번 채용으로 어떤 문제를 풀고 싶은지 적어 주세요."
                />
              </Field>
              <Field label="기술 스택" hint="Enter 로 추가" group>
                <ChipInput
                  value={form.stack}
                  onChange={(v) => set("stack", v)}
                  placeholder="예: Java, Spring Boot, Oracle"
                  max={20}
                />
              </Field>
              <Field label="복지·문화" hint="Enter 로 추가" group>
                <ChipInput
                  value={form.perks}
                  onChange={(v) => set("perks", v)}
                  placeholder="예: 유연 근무"
                  max={12}
                  suggest={PERK_SUGGEST}
                />
              </Field>
              <div className="cp-two">
                <Field label="웹사이트">
                  <input
                    value={form.website}
                    type="url"
                    onChange={(e) => set("website", e.target.value)}
                    placeholder="https://"
                    aria-invalid={!urlOk(form.website)}
                  />
                </Field>
                <Field label="채용 페이지">
                  <input
                    value={form.careersUrl}
                    type="url"
                    onChange={(e) => set("careersUrl", e.target.value)}
                    placeholder="https://"
                    aria-invalid={!urlOk(form.careersUrl)}
                  />
                </Field>
              </div>
            </section>

            <section className="cp-sec" aria-labelledby="cp-contact">
              <h2 id="cp-contact">
                채용 담당자 <span className="cp-lock">내부용 · 비공개</span>
              </h2>
              <div className="cp-two">
                <Field label="이름">
                  <input
                    value={form.contactName}
                    maxLength={30}
                    onChange={(e) => set("contactName", e.target.value)}
                    placeholder="홍길동"
                  />
                </Field>
                <Field label="연락처">
                  <input
                    value={form.contactPhone}
                    maxLength={20}
                    inputMode="tel"
                    onChange={(e) => set("contactPhone", e.target.value)}
                    placeholder="02-000-0000"
                  />
                </Field>
              </div>
              <Field label="이메일">
                <input
                  value={form.contactEmail}
                  type="email"
                  onChange={(e) => set("contactEmail", e.target.value)}
                  aria-invalid={!emailOk(form.contactEmail)}
                />
              </Field>
            </section>
          </div>

          <aside className="cp-side">
            <div className="cp-preview" aria-label="후보에게 보이는 모습">
              <p className="cp-preview-k">후보에게 보이는 모습</p>
              <div className="cp-card">
                <div className="cp-card-top">
                  <div className="cp-logo sm">
                    {logo ? <img src={logo} alt="" /> : <Building2 size={20} />}
                  </div>
                  <div>
                    <strong>{form.name || "회사명"}</strong>
                    <span>{form.tagline || "한 줄 소개가 여기에 보여요"}</span>
                  </div>
                </div>
                <ul className="cp-facts">
                  {form.industry && (
                    <li>
                      <Building2 size={13} />
                      {form.industry}
                    </li>
                  )}
                  {form.size && (
                    <li>
                      <Users size={13} />
                      {form.size}
                    </li>
                  )}
                  {form.location && (
                    <li>
                      <MapPin size={13} />
                      {form.location}
                    </li>
                  )}
                  {form.website && (
                    <li>
                      <Globe size={13} />
                      {form.website
                        .replace(/^https?:\/\//, "")
                        .replace(/\/$/, "")}
                    </li>
                  )}
                </ul>
                {form.about && <p className="cp-card-about">{form.about}</p>}
                {form.stack.length > 0 && (
                  <div className="cp-tags">
                    {form.stack.slice(0, 8).map((s) => (
                      <span key={s}>{s}</span>
                    ))}
                  </div>
                )}
                {form.perks.length > 0 && (
                  <div className="cp-tags perk">
                    {form.perks.slice(0, 6).map((s) => (
                      <span key={s}>{s}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="cp-save">
              {error && (
                <p className="cp-err" role="alert">
                  {error}
                </p>
              )}
              {state === "done" && !dirty && (
                <p className="cp-ok" role="status">
                  저장했어요.
                </p>
              )}
              <button
                type="button"
                className="cp-btn pri wide"
                disabled={!dirty || state === "saving"}
                onClick={() => void save()}
              >
                {state === "saving" ? (
                  <>
                    <Loader2 size={15} className="cp-spin" /> 저장 중
                  </>
                ) : dirty ? (
                  "변경 사항 저장"
                ) : (
                  "저장됨"
                )}
              </button>
              {dirty && (
                <button
                  type="button"
                  className="cp-btn ghost wide"
                  onClick={() => {
                    setForm(saved);
                    setError(null);
                  }}
                >
                  되돌리기
                </button>
              )}
            </div>
          </aside>
        </div>
      </div>
    </ProductShell>
  );
}

function Field({
  label,
  hint,
  required,
  group,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  group?: boolean;
  children: React.ReactNode;
}) {
  const head = (
    <span className="cp-label">
      {label}
      {required && <b aria-label="필수"> *</b>}
      {hint && <small>{hint}</small>}
    </span>
  );
  // 칩 입력처럼 버튼이 여럿 든 칸은 label 대신 group (label 안 버튼 클릭이 입력으로 새지 않게)
  if (group) {
    return (
      <div className="cp-field" role="group" aria-label={label}>
        {head}
        {children}
      </div>
    );
  }
  return (
    <label className="cp-field">
      {head}
      {children}
    </label>
  );
}

function ChipInput({
  value,
  onChange,
  placeholder,
  max,
  suggest,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
  max: number;
  suggest?: string[];
}) {
  const [draft, setDraft] = useState("");
  const add = (raw: string) => {
    const v = raw.trim().replace(/,$/, "");
    if (
      !v ||
      value.length >= max ||
      value.some((x) => x.toLowerCase() === v.toLowerCase())
    )
      return;
    onChange([...value, v]);
  };
  return (
    <div className="cp-chips">
      <div className="cp-chipbox">
        {value.map((v) => (
          <span key={v} className="cp-chip">
            {v}
            <button
              type="button"
              aria-label={`${v} 빼기`}
              onClick={() => onChange(value.filter((x) => x !== v))}
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(draft);
              setDraft("");
            } else if (e.key === "Backspace" && !draft && value.length)
              onChange(value.slice(0, -1));
          }}
          onBlur={() => {
            add(draft);
            setDraft("");
          }}
          placeholder={value.length ? "" : placeholder}
          disabled={value.length >= max}
        />
      </div>
      {suggest && (
        <div className="cp-suggest">
          {suggest
            .filter((s) => !value.includes(s))
            .map((s) => (
              <button key={s} type="button" onClick={() => add(s)}>
                + {s}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
