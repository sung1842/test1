// 일회성: 방가방가 계정을 프로덕트 디자이너 이력으로 채운다. 사용: node scripts/_seed_designer.mjs <email> <password> <imgDir>
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]));
const [email, password, imgDir] = process.argv.slice(2);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const { data: s, error: le } = await sb.auth.signInWithPassword({ email, password });
if (le) throw le;
const uid = s.user.id;
const f = sb.schema("fit");
const ok = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r.data; };

// ---------- 1) 계정 프로필: 디자이너로 ----------
ok(await sb.from("profiles").update({
  role: "designer",
  title: "프로덕트 디자이너 (UX/UI)",
  short_bio: "사용자 인터뷰에서 시작해 디자인 시스템으로 끝내는 4년 차 프로덕트 디자이너입니다. 핀테크·커머스 앱의 전환율을 숫자로 올려 본 경험이 있습니다.",
  long_bio: `안녕하세요, 4년 차 프로덕트 디자이너 방가방가입니다.

핀테크 스타트업에서 송금·카드 신청 플로우를, 커머스 회사에서 상품 상세와 결제 경험을 맡아 왔습니다. 화면을 예쁘게 만드는 것보다 "왜 사용자가 여기서 멈추는지"를 먼저 찾는 걸 좋아합니다. 그래서 매 프로젝트를 사용성 테스트·퍼널 데이터·CS 문의 분석으로 시작하고, 가설과 지표를 문서로 남긴 뒤 디자인에 들어갑니다.

- 카드 신청 플로우 리디자인으로 완료율 41% → 58% (A/B 테스트 4주)
- 디자인 시스템 'Pebble' 구축: 컴포넌트 120여 개, Figma Variables 기반 라이트/다크 토큰, 개발 핸드오프 시간 약 30% 단축
- 커머스 상품 상세 개편으로 장바구니 담기율 12% 상승

개발자와 같은 언어로 이야기하기 위해 HTML/CSS와 React 기초를 공부했고, Framer·Protopie로 인터랙션을 직접 프로토타이핑합니다. 접근성(WCAG 2.1 AA)을 기본값으로 두는 팀에서 일하고 싶습니다.`,
  skills: ["Figma", "Figma Variables", "디자인 시스템", "UX 리서치", "사용성 테스트", "Protopie", "Framer", "Adobe Illustrator", "Photoshop", "After Effects", "HTML/CSS", "접근성(WCAG)", "Amplitude", "Notion", "Jira"],
  is_public: true,
}).eq("id", uid), "profiles");

// ---------- 2) 이력서 기본 정보 ----------
ok(await f.from("resume_basics").upsert({
  user_id: uid,
  headline: "데이터로 근거를 찾고 디자인 시스템으로 확장하는 4년 차 프로덕트 디자이너",
  email: "123@talentfolio.com",
  phone: "010-2481-7735",
  region_sido: "서울",
  region_sigungu: "마포구",
  birth_year: 1996,
  desired_categories: ["design", "planning_strategy"],
  desired_regions: ["서울", "경기"],
  desired_employment_types: ["정규직"],
  desired_salary_text: "5,200만 원 이상 (협의 가능)",
  available_from: "2026-12-15",
  job_search_status: "active",
  military_status: "not_applicable",
  public_fields: ["headline", "region_sido", "desired_categories", "desired_regions", "desired_employment_types", "job_search_status"],
}), "resume_basics");

// 기존 이력 항목 정리 후 다시 넣는다 (재실행해도 중복 없게)
for (const t of ["resume_experiences", "resume_educations", "resume_certifications", "resume_misc"]) ok(await f.from(t).delete().eq("user_id", uid), `clear ${t}`);
const ins = async (t, rows) => ok(await f.from(t).insert(rows.map((r, i) => ({ visibility: "public", sort: i, ...r, user_id: uid }))), t);

await ins("resume_experiences", [
  {
    company: "주식회사 핀레이어", department: "프로덕트디자인팀", position_title: "프로덕트 디자이너 (선임)", employment_type: "정규직",
    start_on: "2023-04-03", end_on: null, is_current: true,
    duties: `- 송금·카드 신청·자산 조회 등 핵심 금융 플로우 UX/UI 리드 (디자이너 4명 중 리드 1)
- 디자인 시스템 'Pebble' 기획·구축·운영: Figma Variables 기반 토큰(색상·타이포·간격), 컴포넌트 120여 개, 라이트/다크 모드
- 월 2회 사용성 테스트 운영 (5~7명, 스크립트 작성·진행·리포트), Amplitude 퍼널 분석으로 개선 과제 발굴
- PM·개발자와 2주 스프린트, 디자인 QA 체크리스트 도입`,
    achievements: `- 카드 신청 플로우 단계 축소(9→6단계)·입력 자동화로 완료율 41% → 58% (A/B 4주, 표본 약 3.2만 명)
- 디자인 시스템 도입 후 신규 화면 핸드오프 시간 평균 5일 → 3.5일, 프론트 UI 버그 리포트 월 38건 → 17건
- 접근성 개선(명도 대비·스크린리더 라벨)으로 2024년 모바일 앱 접근성 인증 획득에 기여
- 사내 디자인 리뷰 문화 'Crit Friday' 시작, 1년 넘게 매주 운영`,
  },
  {
    company: "주식회사 오늘의상점", department: "커머스UX팀", position_title: "UI/UX 디자이너", employment_type: "정규직",
    start_on: "2021-07-12", end_on: "2023-03-31", is_current: false,
    duties: `- 상품 상세·장바구니·결제 화면 UX/UI 디자인
- 기획전·이벤트 배너 및 프로모션 페이지 디자인 (월 평균 15건)
- 앱 리뷰·CS 문의 정성 분석으로 개선 백로그 관리`,
    achievements: `- 상품 상세 정보 구조 개편(옵션 선택 영역 상단 고정, 리뷰 요약 카드)으로 장바구니 담기율 12% 상승
- 결제 단계 오류 메시지 문구·위치 개선 후 결제 이탈 관련 CS 문의 월 210건 → 120건
- 배너 템플릿 시스템을 만들어 프로모션 제작 시간 건당 평균 3시간 → 1시간`,
  },
  {
    company: "스튜디오 몽글", department: "디자인팀", position_title: "디자인 인턴", employment_type: "인턴",
    start_on: "2020-12-28", end_on: "2021-06-30", is_current: false,
    duties: `- 클라이언트(카페·로컬 브랜드) 웹사이트 UI 및 SNS 콘텐츠 디자인
- 브랜드 가이드 문서 정리, 아이콘·일러스트 제작 보조`,
    achievements: `- 로컬 베이커리 반응형 웹사이트 리뉴얼 참여 (메인·메뉴·매장 안내 페이지 담당)
- 인스타그램 콘텐츠 템플릿 20종 제작, 클라이언트 재계약에 기여`,
  },
]);

await ins("resume_educations", [
  { school: "홍익대학교", major: "시각디자인과", degree: "bachelor", status: "graduated", start_on: "2015-03-02", end_on: "2021-02-19", gpa: "3.82 / 4.5" },
  { school: "서울 한빛고등학교", major: null, degree: "high", status: "graduated", start_on: "2012-03-02", end_on: "2015-02-10", gpa: null },
]);

await ins("resume_certifications", [
  { kind: "license", name: "컴퓨터그래픽스운용기능사", issuer: "한국산업인력공단", acquired_on: "2018-08-24" },
  { kind: "license", name: "GTQ 그래픽기술자격 1급", issuer: "한국생산성본부", acquired_on: "2017-11-11" },
  { kind: "license", name: "웹디자인개발기능사", issuer: "한국산업인력공단", acquired_on: "2020-06-19" },
  { kind: "license", name: "Google UX Design Professional Certificate", issuer: "Google / Coursera", acquired_on: "2022-09-30" },
  { kind: "language", name: "TOEIC Speaking", score: "IH (150)", acquired_on: "2025-05-18" },
  { kind: "language", name: "TOEIC", score: "865", acquired_on: "2024-10-27" },
]);

await ins("resume_misc", [
  { kind: "project", title: "디자인 시스템 'Pebble' 구축", org: "핀레이어", start_on: "2023-09-01", end_on: "2024-06-30",
    description: "Figma Variables로 색상·타이포·간격 토큰을 정의하고 컴포넌트 120여 개를 설계. 개발팀과 토큰 이름 규칙을 맞추고 Storybook 문서와 연결. 도입 후 핸드오프 시간 약 30% 단축.", url: null },
  { kind: "project", title: "카드 신청 플로우 리디자인", org: "핀레이어", start_on: "2024-08-01", end_on: "2024-11-30",
    description: "사용성 테스트 7명·퍼널 분석으로 이탈 지점 3곳을 찾아 단계 축소와 입력 자동화 설계. A/B 테스트로 완료율 41%→58% 확인.", url: null },
  { kind: "project", title: "상품 상세 페이지 개편", org: "오늘의상점", start_on: "2022-03-01", end_on: "2022-07-31",
    description: "리뷰 요약 카드와 옵션 선택 고정 영역을 도입해 장바구니 담기율 12% 상승.", url: null },
  { kind: "award", title: "사내 해커톤 최우수상 (팀 '세 번 누르면 송금')", org: "핀레이어", start_on: "2024-03-22", end_on: null,
    description: "3탭 송금 콘셉트를 이틀 만에 Protopie 프로토타입으로 구현, 이후 실제 '빠른 송금' 기능으로 출시.", url: null },
  { kind: "award", title: "홍익대학교 졸업전시 우수작", org: "홍익대학교 시각디자인과", start_on: "2020-11-20", end_on: null,
    description: "1인 가구 식재료 공유 서비스 '나눔냉장고' 앱 UX 및 브랜딩.", url: null },
  { kind: "training", title: "UX 리서치 실무 과정 (40시간)", org: "패스트캠퍼스", start_on: "2022-01-08", end_on: "2022-02-26",
    description: "인터뷰 설계, 어피니티 다이어그램, 사용성 테스트 리포트 작성 실습.", url: null },
  { kind: "training", title: "웹 접근성 전문가 교육", org: "한국지능정보사회진흥원", start_on: "2024-04-15", end_on: "2024-04-19",
    description: "WCAG 2.1, 스크린리더 테스트, 접근성 진단 실습 수료.", url: null },
  { kind: "activity", title: "디자인 스터디 'Figma 딥다이브' 운영진", org: "커뮤니티", start_on: "2023-01-01", end_on: null,
    description: "현업 디자이너 12명과 격주로 Variables·Auto Layout·플러그인 활용법을 공유. 발표 9회.", url: null },
  { kind: "activity", title: "대학생 연합 UX 동아리 'UXD' 7기", org: "UXD", start_on: "2019-03-01", end_on: "2019-12-31",
    description: "공공 앱 UX 개선 제안 프로젝트 2건, 기업 연계 사용성 테스트 참여.", url: null },
]);

// ---------- 3) 기본 자기소개서 ----------
const letters = ok(await f.from("cover_letters").select("id, kind").eq("kind", "base"), "letters");
const letterId = letters[0].id;
const answers = [
  `[숫자로 증명한 카드 신청 플로우 개선]
핀레이어에서 카드 신청 완료율이 41%에 머물러 있다는 문제를 맡았습니다. 처음엔 화면 디자인을 바꾸면 해결될 거라 생각했지만, Amplitude 퍼널을 보니 이탈의 60%가 '직장 정보 입력'과 '본인 인증 재시도' 두 단계에 몰려 있었습니다.

원인을 확인하려고 실제 사용자 7명과 사용성 테스트를 진행했습니다. 직장 주소를 직접 입력해야 하고, 인증 실패 시 처음 단계로 돌아가는 구조가 가장 큰 불만이었습니다. 저는 세 가지를 제안했습니다. 첫째, 회사명 검색으로 주소를 자동 채우기. 둘째, 인증 실패 시 해당 단계에서만 재시도. 셋째, 9단계를 의미 단위로 묶어 6단계로 축소.

개발 공수가 큰 자동 채우기는 PM과 우선순위를 다시 협의해 2차로 미루고, 나머지 두 개를 먼저 배포해 A/B 테스트를 했습니다. 4주 동안 약 3.2만 명 표본에서 완료율이 58%로 올랐고, 2차 배포 후에는 61%까지 올라갔습니다.

이 경험으로 '좋은 디자인'은 근거가 있는 디자인이라는 것을 배웠습니다. 귀사에서도 데이터와 사용자 목소리를 함께 보며 결정의 근거를 남기는 디자이너가 되겠습니다.`,
  `[디자인 시스템이 쓰이지 않던 문제]
입사 초기 핀레이어에는 디자인 시스템이 있었지만 아무도 쓰지 않았습니다. 같은 버튼이 Figma에 14종류, 코드에 9종류가 있었고 화면마다 간격과 색이 조금씩 달랐습니다. 개발자들은 "디자인 파일을 믿을 수 없다"고 했습니다.

저는 먼저 왜 안 쓰이는지 디자이너 3명, 프론트엔드 개발자 5명을 인터뷰했습니다. 결론은 단순했습니다. 컴포넌트 이름이 디자인과 코드에서 달랐고, 수정 이력이 남지 않아 최신본을 알 수 없었습니다.

그래서 시스템을 '다시 만드는 것'보다 '같이 쓰는 규칙'에 집중했습니다. 토큰 이름을 개발팀과 함께 정해 Figma Variables와 코드 변수를 1:1로 맞췄고, 변경은 주간 릴리즈 노트로만 배포했습니다. 반대가 많았던 기존 화면 일괄 교체 대신, 새로 만드는 화면부터 적용하는 방식으로 부담을 줄였습니다.

10개월 뒤 컴포넌트는 120여 개로 정리됐고, 핸드오프 시간은 평균 5일에서 3.5일로, UI 버그 리포트는 월 38건에서 17건으로 줄었습니다. 문제를 기술이 아니라 사람 사이의 약속에서 풀 수 있다는 걸 배운 경험입니다.`,
  `[함께 일하고 싶은 방식과 목표]
저는 디자이너가 화면을 넘기는 사람이 아니라 문제를 같이 정의하는 사람이어야 한다고 생각합니다. 그래서 기획 초기 회의부터 참여해 가설과 성공 지표를 먼저 문서로 정리하고, 출시 후에는 지표를 다시 확인하는 회고까지 챙깁니다.

앞으로 3년 동안 두 가지를 이루고 싶습니다. 첫째, 접근성을 '추가 작업'이 아닌 기본값으로 만드는 팀 문화를 만드는 것입니다. 웹 접근성 전문가 교육을 수료한 뒤 사내 체크리스트를 만들어 운영하고 있는데, 이를 더 큰 조직에서 시스템 단위로 적용해 보고 싶습니다. 둘째, 리서치 역량을 깊게 하는 것입니다. 정량 데이터와 인터뷰를 함께 해석하는 능력을 키워, 팀이 '무엇을 만들지'를 결정하는 데 기여하는 디자이너가 되겠습니다.

매주 디자인 리뷰를 열고 스터디를 운영해 온 것처럼, 배운 것을 팀과 나누며 함께 성장하겠습니다.`,
];
const items = ok(await f.from("cover_letter_items").select("id, seq").eq("letter_id", letterId).order("seq"), "items");
for (const it of items) {
  const a = answers[it.seq - 1];
  if (a) ok(await f.from("cover_letter_items").update({ answer: a }).eq("id", it.id), "letter item");
}
ok(await f.from("cover_letters").update({ visibility: "public" }).eq("id", letterId), "letter vis");

// ---------- 4) 근거 카드 (활동 + 공개 카드) ----------
ok(await f.from("evidence_cards").delete().eq("user_id", uid), "clear cards");
ok(await f.from("activities").delete().eq("user_id", uid), "clear activities");
const cards = [
  { title: "카드 신청 플로우 완료율 41%→58%", on: "2024-11-28", tags: ["UX", "A/B 테스트", "핀테크"],
    claim: "상황: 카드 신청 완료율이 41%에 머물렀고 이탈의 60%가 직장 정보 입력·본인 인증 재시도 두 단계에 몰려 있었다.\n역할: 프로덕트 디자이너(리드), PM 1·개발자 3과 협업.\n행동: 사용성 테스트 7명으로 원인을 확인하고, 9단계를 6단계로 묶고 인증 실패 시 해당 단계에서만 재시도하도록 설계했다.\n결과: 4주 A/B 테스트(약 3.2만 명)에서 완료율 58%, 2차 배포 후 61%.\n배운 점: 화면보다 이탈 지점을 먼저 찾아야 한다.",
    links: [] },
  { title: "디자인 시스템 Pebble 구축", on: "2024-06-28", tags: ["디자인 시스템", "Figma Variables"],
    claim: "상황: 같은 버튼이 Figma 14종·코드 9종으로 흩어져 개발자가 디자인 파일을 믿지 않았다.\n역할: 디자인 시스템 오너.\n행동: 디자이너·개발자 8명 인터뷰 후 토큰 이름을 Figma Variables와 코드 변수 1:1로 맞추고, 변경은 주간 릴리즈 노트로만 배포했다.\n결과: 컴포넌트 120여 개 정리, 핸드오프 5일→3.5일, UI 버그 리포트 월 38→17건.\n배운 점: 시스템은 파일이 아니라 팀의 약속이다.",
    links: [] },
  { title: "상품 상세 개편으로 장바구니 담기율 12%↑", on: "2022-07-29", tags: ["커머스", "정보 구조"],
    claim: "상황: 상품 상세에서 옵션을 찾느라 스크롤을 오래 내리고 이탈하는 사용자가 많았다.\n역할: UI/UX 디자이너.\n행동: 리뷰 1,200건을 분류해 자주 묻는 정보를 요약 카드로 만들고, 옵션 선택 영역을 하단 고정했다.\n결과: 장바구니 담기율 12% 상승, 옵션 관련 문의 감소.\n배운 점: 리뷰와 CS가 가장 솔직한 리서치 자료다.",
    links: [] },
  { title: "모바일 앱 접근성 개선", on: "2024-09-13", tags: ["접근성", "WCAG"],
    claim: "상황: 명도 대비 부족과 스크린리더 라벨 누락으로 접근성 인증 심사 기준을 못 맞췄다.\n역할: 접근성 개선 담당 디자이너.\n행동: 핵심 화면 42개를 점검표로 진단하고 색상 토큰을 대비 4.5:1 이상으로 조정, 아이콘 버튼마다 라벨 가이드를 만들었다.\n결과: 모바일 앱 접근성 인증 획득에 기여, 이후 신규 화면에 체크리스트 기본 적용.\n배운 점: 접근성은 나중에 붙이는 게 아니라 토큰에서 시작한다.",
    links: [] },
  { title: "해커톤 '3탭 송금' 최우수상", on: "2024-03-22", tags: ["프로토타이핑", "Protopie"],
    claim: "상황: 송금까지 평균 7번의 탭이 필요해 자주 보내는 사람에게도 번거로웠다.\n역할: 팀 디자이너(4인 팀).\n행동: 최근 수취인·금액 추천으로 3탭 송금 콘셉트를 이틀 만에 Protopie로 구현해 발표했다.\n결과: 사내 해커톤 최우수상, 이후 '빠른 송금' 기능으로 실제 출시.\n배운 점: 빠르게 만져 볼 수 있는 프로토타입이 설득을 대신한다.",
    links: [] },
];
for (const c of cards) {
  const act = ok(await f.from("activities").insert({ user_id: uid, title: c.title, occurred_on: c.on, tags: c.tags, summary: c.claim.split("\n")[0].replace(/^상황:\s*/, "") }).select("id").single(), "activity");
  ok(await f.from("evidence_cards").insert({
    user_id: uid, activity_id: act.id, claim: c.claim, visibility: "public", trust_level: "self", source: "web",
    recorded_at: `${c.on}T18:30:00+09:00`, links: c.links, published_at: new Date().toISOString(),
  }), "card");
}

// ---------- 5) 작업물 (공개 버킷 works, /api/profile/works 와 같은 형식) ----------
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: bucket } = await admin.storage.getBucket("works");
if (!bucket) ok(await admin.storage.createBucket("works", { public: true, fileSizeLimit: 8 * 1024 * 1024, allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif", "application/json"] }), "bucket");
const old = (await admin.storage.from("works").list(uid, { limit: 100 })).data ?? [];
for (const d of old) {
  const inner = (await admin.storage.from("works").list(`${uid}/${d.name}`)).data ?? [];
  const paths = inner.length ? inner.map((x) => `${uid}/${d.name}/${x.name}`) : [`${uid}/${d.name}`];
  await admin.storage.from("works").remove(paths);
}
const mime = { png: "image/png", jpg: "image/jpeg" };
const works = [
  { title: "Pebble 디자인 시스템 — 대시보드 컴포넌트", files: ["sidebar.png", "features.png"], role: "디자인 시스템 오너 · 기여도 70%", tools: ["Figma", "Figma Variables", "Storybook", "Notion"], year: "2023.09 — 2024.06",
    description: "흩어진 버튼 14종을 하나의 토큰 체계로 정리한 사내 디자인 시스템입니다.\n\n문제: 디자인과 코드의 컴포넌트 이름이 달라 핸드오프마다 재작업이 생겼습니다.\n과정: 개발자와 토큰 이름 규칙을 함께 정하고, 사이드바·카드·피처 그리드 같은 레이아웃 컴포넌트를 Auto Layout과 Variables로 재설계했습니다. 라이트/다크 모드를 토큰 교체만으로 전환합니다.\n결과: 컴포넌트 120여 개, 핸드오프 5일 → 3.5일, UI 버그 리포트 절반 이하." },
  { title: "요금제 페이지 리디자인 (B2B SaaS)", files: ["pricing1.png", "pricing2.png"], role: "UX/UI 디자인 단독", tools: ["Figma", "Amplitude", "Hotjar"], year: "2024.02 — 2024.03",
    description: "요금제 비교가 어려워 문의만 늘던 페이지를 다시 설계했습니다.\n\n히트맵에서 사용자가 기능 비교표를 끝까지 보지 않는 걸 확인하고, '누구에게 맞는 플랜인지'를 카드 상단에 한 줄로 먼저 보여 주는 구조로 바꿨습니다. 연간/월간 토글은 절약 금액을 바로 보이게 했습니다.\n\n결과: 요금제 페이지 → 결제 시작 전환율 2.1% → 3.4%, 요금 관련 문의 30% 감소." },
  { title: "로그인·온보딩 플로우 개선", files: ["signin.jpg"], role: "UX 리서치 · UI 디자인", tools: ["Figma", "Protopie", "Maze"], year: "2024.05",
    description: "첫 로그인에서 이탈이 많던 온보딩을 단순화했습니다.\n\n사용성 테스트 6명으로 '비밀번호 규칙 안내가 늦게 나온다', '소셜 로그인이 잘 안 보인다'는 문제를 찾았습니다. 입력 중 실시간 규칙 안내, 소셜 로그인 상단 배치, 오류 문구를 '무엇을 하면 되는지' 중심으로 다시 썼습니다.\n\n결과: 가입 완료율 9%p 상승, 로그인 오류 관련 CS 감소." },
  { title: "AI 기능 소개 랜딩 — 이미지 아코디언", files: ["accordion.jpg", "carousel.jpg"], role: "비주얼 · 인터랙션 디자인", tools: ["Figma", "Framer", "After Effects"], year: "2025.01 — 2025.02",
    description: "여러 AI 기능을 한 화면에서 비교하도록 만든 랜딩 페이지입니다.\n\n세로로 접힌 카드에 마우스를 올리면 펼쳐지는 아코디언으로 5개 기능을 한눈에 보여 주고, 모바일에서는 가로 캐러셀로 바뀌도록 반응형 규칙을 정의했습니다. Framer로 실제 인터랙션을 만들어 개발팀에 전달했습니다.\n\n결과: 랜딩 평균 체류 시간 38초 → 1분 12초, 문의 버튼 클릭률 1.6배." },
  { title: "브랜드 캠페인 히어로 & 모션 가이드", files: ["hero.jpg", "animhero.png", "footer.png"], role: "모션 디자인 · 아트 디렉션", tools: ["Framer", "After Effects", "Photoshop", "Figma"], year: "2025.06 — 2025.08",
    description: "여름 여행 캠페인용 스크롤 확장 히어로와 모션 가이드입니다.\n\n스크롤하면 가운데 영상이 화면 전체로 커지는 연출로 몰입감을 주고, 텍스트 회전 히어로와 푸터 모션까지 하나의 이징·지속 시간 규칙으로 묶었습니다. 모션 접근성을 위해 '동작 줄이기' 설정 시 정적 이미지로 대체되게 했습니다.\n\n결과: 캠페인 페이지 스크롤 완주율 54%, 이벤트 참여 전환 2.3배." },
  { title: "커머스 리뷰 섹션 3D 카드", files: ["testi.jpg", "logos.png"], role: "UI 디자인 · 프로토타이핑", tools: ["Figma", "Protopie", "Spline"], year: "2022.05 — 2022.06",
    description: "구매 후기를 신뢰감 있게 보여 주기 위한 리뷰 섹션 실험입니다.\n\n리뷰 1,200건을 분류해 '사이즈·배송·품질' 세 축으로 요약하고, 대표 후기를 입체 카드로 넘겨 보게 했습니다. 입점 브랜드 로고 클라우드로 신뢰 요소를 보강했습니다.\n\n결과: 상품 상세 체류 시간 증가, 장바구니 담기율 12% 상승에 기여." },
];
const manifest = [];
for (const w of works) {
  const id = crypto.randomUUID();
  const images = [];
  for (const [i, file] of w.files.entries()) {
    const ext = file.split(".").pop();
    const p = `${uid}/${id}/${i + 1}-${Date.now()}.${ext}`;
    ok(await admin.storage.from("works").upload(p, fs.readFileSync(path.join(imgDir, file)), { contentType: mime[ext] }), `upload ${file}`);
    images.push(admin.storage.from("works").getPublicUrl(p).data.publicUrl);
  }
  manifest.push({ id, title: w.title, description: w.description, role: w.role, tools: w.tools, year: w.year, url: "", images, created_at: new Date().toISOString() });
}
ok(await admin.storage.from("works").upload(`${uid}/works.json`, Buffer.from(JSON.stringify(manifest)), { contentType: "application/json", upsert: true, cacheControl: "0" }), "manifest");

console.log("done", { uid, works: manifest.length, cards: cards.length });
