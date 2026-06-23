/**
 * Supabase 가짜 후보자 프로필 시드 스크립트
 * 실행: node scripts/seed-profiles.mjs
 *
 * 동작:
 *  1. Supabase Auth signUp → auth.users + 트리거로 profiles 자동 생성
 *  2. signIn → JWT 획득
 *  3. JWT로 short_bio/long_bio/skills/links/is_public 업데이트
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://xbirvfebdwsjzohwoymm.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_CpyLffFI43CDI90qCgyKJw_FgVecwHb";
const SEED_PASSWORD = "Seed@2026!Talentfolio";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── 개발자 8명 ──────────────────────────────────────────────────────────────
const DEVELOPERS = [
  {
    email: "seed.dev01@talentfolio.test",
    name: "김태현",
    role: "developer",
    title: "Frontend Engineer",
    short_bio: "React·TypeScript 4년차, 디자인 시스템 및 성능 최적화 전문",
    long_bio:
      "대형 이커머스 플랫폼의 프론트엔드를 담당하며 React, TypeScript, Next.js를 주력으로 사용해왔습니다. 컴포넌트 라이브러리를 처음부터 설계해 팀 전체 개발 속도를 35% 향상시켰습니다. Core Web Vitals 최적화로 LCP를 2.1초에서 0.8초로 단축한 경험이 있으며, Storybook 기반 디자인 시스템 관리에도 능숙합니다. 사이드 프로젝트로 GitHub Star 800개의 React 훅 라이브러리를 오픈소스로 공개하고 있습니다.",
    skills: ["React", "TypeScript", "Next.js", "Tailwind CSS", "Storybook", "Vite"],
    github_url: "https://github.com/ktaehyun-dev",
    portfolio_url: "https://ktaehyun.dev",
    behance_url: null,
    linkedin_url: "https://linkedin.com/in/ktaehyun",
  },
  {
    email: "seed.dev02@talentfolio.test",
    name: "박수빈",
    role: "developer",
    title: "Full-Stack Engineer",
    short_bio: "Next.js·Supabase 풀스택, SaaS MVP 2주 안에 만드는 사람",
    long_bio:
      "스타트업에서 Next.js와 Supabase를 결합해 빠르게 제품을 만드는 풀스택 개발자입니다. 창업 팀에서 혼자서 MVP를 설계·개발·배포한 경험이 3회 있으며, 그 중 한 제품은 론칭 2개월 만에 유료 고객 200명을 달성했습니다. Vercel, Cloudflare Workers를 활용한 엣지 컴퓨팅 경험도 보유하고 있으며, AI API(OpenAI, Gemini) 연동에도 익숙합니다.",
    skills: ["Next.js", "Supabase", "TypeScript", "Prisma", "tRPC", "Vercel"],
    github_url: "https://github.com/subin-builds",
    portfolio_url: "https://subin.works",
    behance_url: null,
    linkedin_url: "https://linkedin.com/in/subin-park",
  },
  {
    email: "seed.dev03@talentfolio.test",
    name: "이도윤",
    role: "developer",
    title: "Backend Engineer",
    short_bio: "NestJS·PostgreSQL 5년차, API 설계 및 성능 튜닝 전문",
    long_bio:
      "NestJS와 PostgreSQL을 주력으로 하는 백엔드 엔지니어입니다. 일 100만 건의 트랜잭션을 처리하는 B2B SaaS 플랫폼의 핵심 API를 설계·운영하고 있습니다. CQRS 패턴, 이벤트 소싱, 도메인 주도 설계(DDD)를 실무에 적용한 경험이 있으며, Jest 기반 테스트 커버리지 90% 이상 유지를 원칙으로 합니다. 오픈소스 NestJS 플러그인 2개를 운영하고 있으며 npm 주간 다운로드 2만 건을 기록하고 있습니다.",
    skills: ["NestJS", "TypeScript", "PostgreSQL", "Redis", "Jest", "Docker"],
    github_url: "https://github.com/doyun-server",
    portfolio_url: null,
    behance_url: null,
    linkedin_url: "https://linkedin.com/in/doyun-lee",
  },
  {
    email: "seed.dev04@talentfolio.test",
    name: "최지훈",
    role: "developer",
    title: "AI/ML Engineer",
    short_bio: "LLM 파인튜닝·RAG 시스템 전문, Python·LangChain",
    long_bio:
      "LLM 기반 AI 제품 개발에 특화된 ML 엔지니어입니다. GPT-4, Claude, Gemini를 활용한 AI 어시스턴트, 문서 분석 시스템, 코드 리뷰 봇을 실무에서 구축했습니다. LangChain, LlamaIndex를 이용한 RAG 파이프라인 최적화 경험이 풍부하며, pgvector와 Pinecone을 활용한 벡터 검색 시스템도 설계한 경험이 있습니다. 현재 한국어 특화 LLM 파인튜닝 프로젝트를 진행하고 있습니다.",
    skills: ["Python", "LangChain", "FastAPI", "PyTorch", "pgvector", "OpenAI API"],
    github_url: "https://github.com/jihun-ai",
    portfolio_url: "https://jihun-ai.notion.site",
    behance_url: null,
    linkedin_url: "https://linkedin.com/in/jihun-choi",
  },
  {
    email: "seed.dev05@talentfolio.test",
    name: "한민서",
    role: "developer",
    title: "DevOps / Platform Engineer",
    short_bio: "AWS·Kubernetes 전문, 제로다운타임 배포 파이프라인 설계",
    long_bio:
      "스타트업 초창기부터 인프라를 혼자 설계·운영한 경험을 가진 플랫폼 엔지니어입니다. EKS 기반 Kubernetes 클러스터를 구성하고 ArgoCD, GitHub Actions를 이용한 GitOps 파이프라인을 구축해 배포 시간을 40분에서 5분으로 단축했습니다. Terraform으로 멀티 리전 인프라를 코드로 관리하며, Datadog·PagerDuty 기반 온콜 시스템도 직접 구축했습니다. AWS 솔루션스 아키텍트 Professional 자격증을 보유하고 있습니다.",
    skills: ["AWS", "Kubernetes", "Terraform", "ArgoCD", "Prometheus", "Golang"],
    github_url: "https://github.com/minseo-ops",
    portfolio_url: null,
    behance_url: null,
    linkedin_url: "https://linkedin.com/in/minseo-han",
  },
  {
    email: "seed.dev06@talentfolio.test",
    name: "오준혁",
    role: "developer",
    title: "Android Engineer",
    short_bio: "Kotlin·Jetpack Compose 전문, 200만 DAU 앱 운영 경험",
    long_bio:
      "Kotlin과 Jetpack Compose를 주력으로 하는 안드로이드 개발자입니다. 일간 활성 사용자 200만 명의 커머스 앱에서 핵심 구매 플로우를 담당했습니다. Clean Architecture, MVI 패턴 기반의 모듈화 프로젝트 구조 설계 경험이 있으며, Baseline Profiles를 적용해 앱 시작 시간을 30% 단축한 경험이 있습니다. Google I/O Extended Seoul 2024 연사로 참여하기도 했습니다.",
    skills: ["Kotlin", "Jetpack Compose", "Coroutines", "Room", "Hilt", "Firebase"],
    github_url: "https://github.com/junhyuk-android",
    portfolio_url: "https://junhyuk.dev",
    behance_url: null,
    linkedin_url: "https://linkedin.com/in/junhyuk-oh",
  },
  {
    email: "seed.dev07@talentfolio.test",
    name: "임예나",
    role: "developer",
    title: "Web3 / Blockchain Developer",
    short_bio: "Solidity·EVM 전문, DeFi 프로토콜 2개 론칭 경험",
    long_bio:
      "이더리움 생태계의 스마트컨트랙트 개발을 전문으로 하는 Web3 개발자입니다. Uniswap V3 포크 기반 DEX와 NFT 파이낸셜 프로토콜 개발에 참여했으며, 두 프로젝트 모두 TVL 50억 원 이상을 달성했습니다. Foundry, Hardhat 기반 테스트 자동화에 능숙하며, The Graph를 이용한 온체인 데이터 인덱싱 경험도 보유하고 있습니다.",
    skills: ["Solidity", "Hardhat", "ethers.js", "The Graph", "TypeScript", "IPFS"],
    github_url: "https://github.com/yena-web3",
    portfolio_url: "https://yena-web3.xyz",
    behance_url: null,
    linkedin_url: null,
  },
  {
    email: "seed.dev08@talentfolio.test",
    name: "정승민",
    role: "developer",
    title: "Rust / Systems Engineer",
    short_bio: "Rust 전문, 초저지연 거래 시스템 및 CLI 툴 개발",
    long_bio:
      "Rust를 주력으로 하는 시스템 프로그래머입니다. 핀테크 스타트업에서 마이크로초 단위 지연 시간이 요구되는 거래 매칭 엔진을 Rust로 구현했으며, 기존 Go 기반 시스템 대비 지연 시간을 60% 줄이는 성과를 냈습니다. 크로스 플랫폼 CLI 툴을 Rust로 개발해 GitHub Star 1200개를 받았습니다. 메모리 안전성과 성능에 대해 깊이 있는 이해를 가지고 있습니다.",
    skills: ["Rust", "Tokio", "gRPC", "PostgreSQL", "Redis", "Linux"],
    github_url: "https://github.com/seungmin-rs",
    portfolio_url: null,
    behance_url: null,
    linkedin_url: "https://linkedin.com/in/seungmin-jung",
  },
];

// ── 디자이너 7명 ──────────────────────────────────────────────────────────────
const DESIGNERS = [
  {
    email: "seed.des01@talentfolio.test",
    name: "윤지아",
    role: "designer",
    title: "Product Designer",
    short_bio: "Figma·사용자 리서치 전문, 0→1 앱 디자인 경험 다수",
    long_bio:
      "유저 리서치부터 최종 프로덕션 디자인까지 혼자 해내는 프로덕트 디자이너입니다. 핀테크, 헬스케어, 이커머스 도메인에서 모바일 앱 3개의 0→1 디자인을 주도했으며, 그 중 1개는 App Store 생산성 카테고리 1위를 기록했습니다. Jobs-to-be-Done 프레임워크를 활용한 유저 인터뷰와 데이터 분석으로 전환율을 35% 개선한 경험이 있습니다. Figma Variables와 Auto Layout에 능숙합니다.",
    skills: ["Figma", "UX Research", "Prototyping", "Design System", "Framer", "Maze"],
    github_url: null,
    portfolio_url: "https://jia-ux.com",
    behance_url: null,
    linkedin_url: "https://linkedin.com/in/jia-yun",
  },
  {
    email: "seed.des02@talentfolio.test",
    name: "강예원",
    role: "designer",
    title: "Brand Identity Designer",
    short_bio: "스타트업 브랜딩 전문, BI·패키지 디자인 50+ 프로젝트",
    long_bio:
      "스타트업과 중소기업의 브랜드를 처음부터 만들어온 브랜드 아이덴티티 디자이너입니다. 로고, 컬러 팔레트, 타이포그래피, 브랜드 가이드라인, 패키지 디자인까지 전 영역을 담당합니다. 특히 테크·스타트업 브랜딩에 강점이 있으며 지금까지 50개 이상의 브랜드 아이덴티티를 개발했습니다. Dribbble 팔로워 3500명을 보유하고 있으며, 에이전시와 프리랜서 경력을 병행해왔습니다.",
    skills: ["Illustrator", "Photoshop", "Figma", "Branding", "Typography", "Packaging"],
    github_url: null,
    portfolio_url: "https://yeawon-brand.com",
    behance_url: "https://behance.net/yeawon",
    linkedin_url: "https://linkedin.com/in/yeawon-kang",
  },
  {
    email: "seed.des03@talentfolio.test",
    name: "서채린",
    role: "designer",
    title: "Motion & Interactive Designer",
    short_bio: "After Effects·Rive 전문, 앱 온보딩 애니메이션 전문가",
    long_bio:
      "모션 그래픽과 인터랙티브 애니메이션 제작에 특화된 디자이너입니다. After Effects, Rive, Lottie를 활용해 앱 온보딩, 마이크로 인터랙션, 광고 애니메이션을 제작해왔습니다. 유저 리텐션 개선을 목표로 설계한 온보딩 애니메이션으로 D7 리텐션을 18% 향상시킨 사례가 있습니다. 현재는 AI를 활용한 제너러티브 모션 아트 프로젝트도 병행하고 있습니다.",
    skills: ["After Effects", "Rive", "Figma", "Lottie", "Spline", "Principle"],
    github_url: null,
    portfolio_url: "https://chaerin-motion.com",
    behance_url: "https://behance.net/chaerin",
    linkedin_url: "https://linkedin.com/in/chaerin-seo",
  },
  {
    email: "seed.des04@talentfolio.test",
    name: "김현수",
    role: "designer",
    title: "UX Engineer",
    short_bio: "Figma + 코드 가능한 UX 엔지니어, React 컴포넌트 직접 구현",
    long_bio:
      "디자인과 프론트엔드 개발을 모두 다루는 UX 엔지니어입니다. Figma로 디자인하고 직접 React/CSS로 구현할 수 있어 디자인-개발 핸드오프 없이 고품질 UI를 빠르게 제작합니다. Radix UI, Headless UI 기반의 접근성 높은 컴포넌트 라이브러리를 팀 내에서 운영하고 있으며, 애니메이션은 Framer Motion을 주로 사용합니다. 이전 회사에서는 디자인 시스템 1.0부터 3.0까지 3년간 총괄했습니다.",
    skills: ["Figma", "React", "CSS", "Framer Motion", "Accessibility", "Design System"],
    github_url: "https://github.com/hyunsoo-ux",
    portfolio_url: "https://hyunsoo.design",
    behance_url: null,
    linkedin_url: "https://linkedin.com/in/hyunsoo-kim",
  },
  {
    email: "seed.des05@talentfolio.test",
    name: "박나연",
    role: "designer",
    title: "3D Visualization Designer",
    short_bio: "Blender·Cinema 4D 전문, 제품 렌더링 및 AR 콘텐츠 제작",
    long_bio:
      "제품 3D 비주얼라이제이션과 증강현실(AR) 콘텐츠 제작에 특화된 디자이너입니다. 전자제품, 뷰티, 식품 브랜드의 제품 렌더링과 론칭 캠페인용 3D 모션 콘텐츠를 제작해왔습니다. WebAR 기술을 이용한 가상 트라이온 경험을 주요 뷰티 브랜드에 납품했으며, Blender 3.x에 능숙하고 물리 기반 렌더링(PBR)에 대한 깊은 이해를 가지고 있습니다.",
    skills: ["Blender", "Cinema 4D", "Substance Painter", "Three.js", "AR Quick Look", "Figma"],
    github_url: null,
    portfolio_url: "https://nayeon3d.com",
    behance_url: "https://behance.net/nayeon3d",
    linkedin_url: "https://linkedin.com/in/nayeon-park",
  },
  {
    email: "seed.des06@talentfolio.test",
    name: "이수아",
    role: "designer",
    title: "Service UX Designer",
    short_bio: "B2B SaaS UX 전문, 복잡한 대시보드·데이터 시각화 설계",
    long_bio:
      "복잡한 엔터프라이즈 SaaS 제품의 UX를 단순하게 만드는 것을 전문으로 합니다. HR 테크, 물류 관제, 금융 분석 플랫폼의 관리자 대시보드를 설계했으며, 특히 방대한 데이터를 한눈에 파악할 수 있는 데이터 시각화 UI 설계에 강점이 있습니다. IA(정보 구조) 설계부터 Figma 최종 핸드오프까지 체계적인 디자인 프로세스를 갖추고 있습니다. UXPA 회원이며 CX 케이스 스터디를 정기적으로 작성합니다.",
    skills: ["Figma", "Information Architecture", "Data Visualization", "Wireframing", "Zeplin", "Notion"],
    github_url: null,
    portfolio_url: "https://sua-ux.notion.site",
    behance_url: null,
    linkedin_url: "https://linkedin.com/in/sua-lee",
  },
  {
    email: "seed.des07@talentfolio.test",
    name: "조민기",
    role: "designer",
    title: "Generative & AI Designer",
    short_bio: "AI 생성 이미지·Stable Diffusion 전문, 캠페인 비주얼 제작",
    long_bio:
      "AI 생성 이미지 기술을 크리에이티브 광고에 접목한 선도적인 디자이너입니다. Stable Diffusion, Midjourney, Adobe Firefly를 활용해 전통 포토그래피 비용의 10분의 1로 고품질 캠페인 비주얼을 제작합니다. AI 툴로 생성한 이미지를 Photoshop·Illustrator에서 완성도 높게 후처리하는 능력을 보유하고 있으며, 패션·뷰티·F&B 분야 주요 브랜드와 함께한 레퍼런스가 있습니다.",
    skills: ["Stable Diffusion", "Midjourney", "Photoshop", "Illustrator", "ComfyUI", "Figma"],
    github_url: "https://github.com/mingi-ai-design",
    portfolio_url: "https://mingi.design",
    behance_url: "https://behance.net/mingidesign",
    linkedin_url: "https://linkedin.com/in/mingi-jo",
  },
];

const ALL_PROFILES = [...DEVELOPERS, ...DESIGNERS];

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function seedProfile(profile) {
  const { email, name, role, title, short_bio, long_bio, skills, github_url, portfolio_url, behance_url, linkedin_url } = profile;

  // 1. 회원가입
  console.log(`\n[${name}] 가입 중...`);
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password: SEED_PASSWORD,
    options: {
      data: { name, role, title },
    },
  });

  if (signUpError) {
    if (signUpError.message.includes("already registered")) {
      console.log(`  → 이미 존재, 로그인으로 전환`);
    } else {
      console.error(`  ✗ 가입 실패: ${signUpError.message}`);
      return false;
    }
  } else {
    console.log(`  → 가입 성공 (id: ${signUpData.user?.id})`);
    await sleep(300);
  }

  // 2. 로그인
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: SEED_PASSWORD,
  });

  if (signInError || !signInData.user) {
    console.error(`  ✗ 로그인 실패: ${signInError?.message}`);
    return false;
  }

  const userId = signInData.user.id;
  console.log(`  → 로그인 성공 (id: ${userId})`);

  // 3. 프로필 업데이트
  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      short_bio,
      long_bio,
      skills,
      github_url: github_url ?? null,
      portfolio_url: portfolio_url ?? null,
      behance_url: behance_url ?? null,
      linkedin_url: linkedin_url ?? null,
      is_public: true,
    })
    .eq("id", userId);

  if (updateError) {
    console.error(`  ✗ 프로필 업데이트 실패: ${updateError.message}`);
    return false;
  }

  console.log(`  ✓ [${role === "developer" ? "DEV" : "DES"}] ${name} — ${title} 완료`);
  await supabase.auth.signOut();
  await sleep(200);
  return true;
}

async function main() {
  console.log("=== Talentfolio 프로필 시드 시작 ===");
  console.log(`총 ${ALL_PROFILES.length}명 (개발자 ${DEVELOPERS.length}명 + 디자이너 ${DESIGNERS.length}명)\n`);

  let success = 0;
  let fail = 0;

  for (const profile of ALL_PROFILES) {
    const ok = await seedProfile(profile);
    if (ok) success++; else fail++;
  }

  console.log(`\n=== 완료: 성공 ${success}명 / 실패 ${fail}명 ===`);
  process.exit(0);
}

main().catch((err) => {
  console.error("시드 스크립트 오류:", err);
  process.exit(1);
});
