import Link from "next/link";
import { BIZ, LEGAL_LINKS, TBD, bizCheckUrl, v } from "@/lib/legal";
import "./site-footer.css";

// 메인 시안(docs/design/main-mockup.html)의 "연락처가 헤드라인" 푸터. 시안의 코발트 바탕/흰 글씨를 반전해 흰 바탕/코발트 글씨.
// 아래쪽에 법정 고지(사업자 정보·직업정보제공사업 신고번호·약관/방침 링크)와 앱 다운로드를 둔다. 값은 lib/legal.ts 한 곳에서.
const [MAIL_USER, MAIL_DOMAIN] = BIZ.email.split("@");

function StoreBadge({ href, store }: { href: string; store: "App Store" | "Google Play" }) {
  const body = <><small>{store === "App Store" ? "Download on the" : "GET IT ON"}</small>{store}</>;
  return href
    ? <a className="store" href={href} target="_blank" rel="noopener noreferrer">{body}</a>
    : <span className="store soon" aria-disabled="true">{body}<em>출시 예정</em></span>;
}

/** crowd: 메인에서 군중 캔버스(#crowd2, skyLandingMotion이 그림)를 바닥에 깐다. 메인이 아니면 화면 높이를 채우지 않는다 */
export function SiteFooter({ crowd = false }: { crowd?: boolean }) {
  const check = bizCheckUrl();
  return (
    <footer className={`site-ftr${crowd ? "" : " compact"}`}>
      {crowd && <canvas id="crowd2" aria-hidden="true" />}
      <div className="top">
        <div><b>{BIZ.serviceName}</b><br />작업물로 연결되는 채용</div>
        <div>{BIZ.hours}<br />기업 문의는 하루 안에 답합니다</div>
      </div>
      {crowd && <a className="mail" href={`mailto:${BIZ.email}`}>{MAIL_USER}@<br />{MAIL_DOMAIN}</a>}
      <div className="mid">
        <nav className="cols" aria-label="푸터 메뉴">
          <Link href="/signup">구직자 시작하기</Link>
          <Link href="/signup?type=company">기업으로 시작하기</Link>
          <Link href="/desk">기업 데스크</Link>
          <Link href="/login">로그인</Link>
        </nav>
        <div className="apps" aria-label="앱 다운로드">
          <StoreBadge href={BIZ.appStoreUrl} store="App Store" />
          <StoreBadge href={BIZ.playStoreUrl} store="Google Play" />
        </div>
      </div>
      <div className="ftr-bottom">
      <nav className="legal-links" aria-label="약관 및 정책">
        {LEGAL_LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={"strong" in l && l.strong ? "strong" : undefined}>{l.label}</Link>
        ))}
      </nav>
      <address className="biz">
        <span>상호 {v(BIZ.companyName)}</span>
        <span>대표 {v(BIZ.ceo)}</span>
        <span>
          사업자등록번호 {v(BIZ.bizRegNo)}
          {check && <> <a href={check} target="_blank" rel="noopener noreferrer">사업자정보 확인</a></>}
        </span>
        <span>통신판매업 신고 {v(BIZ.mailOrderNo)}</span>
        <span>직업정보제공사업 신고 {v(BIZ.jobInfoNo)}</span>
        <span>주소 {v(BIZ.address)}</span>
        <span>고객센터 {v(BIZ.phone)}</span>
        <span>이메일 <a href={`mailto:${BIZ.email}`}>{BIZ.email}</a></span>
        <span>개인정보 보호책임자 {v(BIZ.privacyOfficer)}</span>
        <span>호스팅 제공 {v(BIZ.hosting)}</span>
      </address>
      <div className="meta">
        <span>© 2026 {BIZ.companyName || BIZ.serviceName}. All rights reserved.</span>
        {BIZ.social.length > 0 && (
          <span className="social">{BIZ.social.map((s) => <a key={s.href} href={s.href} target="_blank" rel="noopener noreferrer">{s.label}</a>)}</span>
        )}
        <span>Illustrations by openpeeps.com</span>
      </div>
      {!BIZ.companyName && <p className="tbd-note">&quot;{TBD}&quot; 항목은 사업자 등록 후 채워집니다.</p>}
      </div>
    </footer>
  );
}
