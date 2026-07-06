# Talento — 프로젝트 현황 & 개발 핸드오프 문서

> 새 채팅에서 이 파일을 먼저 읽고 개발을 이어가세요.

---

## 프로젝트 개요

**Talento** — 개발자·디자이너 인재 발견 플랫폼  
개발자/디자이너가 포트폴리오를 등록하고, 기업/리크루터가 열람·메시지를 보낼 수 있는 커뮤니티 HR 플랫폼

- **레포 경로**: `C:\ClaudeWorkspace\main\talentfolio\`
- **배포**: Vercel (vercel.json에 `rootDirectory: "talentfolio"` 설정됨)
- **프로젝트 이름**: Talento (사이트명), TalentFolio (레포명)

---

## 기술 스택

| 항목 | 기술 |
|------|------|
| 프레임워크 | Next.js App Router (v16.2.6), TypeScript |
| 스타일링 | Tailwind CSS v4, CSS Variables, inline style 혼용 |
| 애니메이션 | framer-motion v12 |
| 백엔드 | Supabase (PostgreSQL + Auth + Realtime) |
| 배포 | Vercel |
| 폰트 | Syne (제목), DM Sans (본문), JetBrains Mono (코드/태그) |

### framer-motion v12 주의사항
```typescript
// ✅ 올바른 방법
{ type: "spring" as const, stiffness: 340, damping: 28 }
{ ease: "easeOut" as const }

// ❌ 안 됨 (v12 breaking change)
{ ease: (t) => t * t }  // 함수형 ease 사용 불가
```

---

## 환경변수 (.env.local — gitignore됨)

```env
NEXT_PUBLIC_SUPABASE_URL=https://xbirvfebdwsjzohwoymm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_CpyLffFI43CDI90qCgyKJw_FgVecwHb
```

> ⚠️ Secret key (`sb_secret_...`)는 절대 커밋하지 말 것

---

## 파일 구조

```
talentfolio/
├── src/
│   ├── app/
│   │   ├── layout.tsx          — AuthProvider 래핑
│   │   ├── page.tsx            — 메인 페이지 (전체 상태 관리)
│   │   └── globals.css         — CSS 변수, 전역 스타일, 애니메이션
│   ├── components/
│   │   ├── Header.tsx          — 상단 네비 (로그인/로그아웃 auth-aware)
│   │   ├── AuthModal.tsx       — 로그인/회원가입 모달
│   │   ├── CandidateCard.tsx   — 후보자 카드 (메시지 버튼 포함)
│   │   ├── DetailPanel.tsx     — 우측 상세 패널 (메시지 버튼 포함)
│   │   ├── FilterTabs.tsx      — 개발자/디자이너 필터
│   │   ├── AnimatedMarqueeHero.tsx — 히어로 섹션
│   │   ├── Avatar.tsx
│   │   ├── RoleBadge.tsx
│   │   ├── SkillTag.tsx
│   │   ├── EmptyState.tsx
│   │   ├── chat/
│   │   │   └── FloatingChat.tsx  — 채팅 패널 (Supabase Realtime 연동)
│   │   └── ui/
│   │       ├── input-with-tags.tsx
│   │       ├── button.tsx
│   │       └── hover-button.tsx
│   ├── context/
│   │   └── AuthContext.tsx     — 전역 인증 상태 (Supabase Auth)
│   ├── lib/
│   │   ├── supabase.ts         — Supabase 클라이언트 + 공용 타입
│   │   └── utils.ts
│   ├── types/
│   │   └── candidate.ts        — Candidate 인터페이스
│   └── data/
│       └── candidates.json     — 더미 후보자 데이터 (20명)
├── public/
│   └── slides/                 — 1.webp ~ 12.webp (히어로/카드 이미지)
├── .env.local                  — 환경변수 (gitignore)
├── vercel.json                 — { "rootDirectory": "talentfolio" }
└── CLAUDE.md                   — 이 파일
```

---

## CSS 디자인 토큰 (globals.css)

```css
--background: #080808;
--surface: #111111;
--surface-elevated: #181818;
--border-color: #242424;
--accent: #e879f9;        /* fuchsia-400 — 메인 포인트 컬러 */
--accent-rgb: 232,121,249;
--accent-alt: #fb923c;    /* orange-400 — 보조 포인트 */
--dev-color: #a78bfa;     /* violet-400 — 개발자 뱃지 */
--des-color: #fb923c;     /* orange-400 — 디자이너 뱃지 */
--text-primary: #f5f5f5;
--text-secondary: #737373;
--tag-bg: #1a1a1a;
```

---

## Supabase DB 스키마

### profiles 테이블
```sql
id          uuid PRIMARY KEY (= auth.users.id)
name        text
role        text  ('developer' | 'designer')
title       text  (직함, 예: "풀스택 개발자")
avatar_url  text  NULL
is_online   boolean DEFAULT false
created_at  timestamptz DEFAULT now()
```

### conversations 테이블
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_a      uuid REFERENCES profiles(id) ON DELETE CASCADE
user_b      uuid REFERENCES profiles(id) ON DELETE CASCADE
created_at  timestamptz DEFAULT now()
```

### messages 테이블
```sql
id               uuid PRIMARY KEY DEFAULT gen_random_uuid()
conversation_id  uuid REFERENCES conversations(id) ON DELETE CASCADE
sender_id        uuid REFERENCES profiles(id) ON DELETE CASCADE
content          text NOT NULL
is_read          boolean DEFAULT false
created_at       timestamptz DEFAULT now()
```

### DB 트리거 (회원가입 시 profiles 자동 생성)
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role, title, is_online)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'name',
    COALESCE(new.raw_user_meta_data->>'role', 'developer'),
    new.raw_user_meta_data->>'title',
    true
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

### RLS 정책
- profiles: 모든 유저가 SELECT 가능, 본인만 UPDATE
- conversations: 참여자(user_a or user_b)만 SELECT/INSERT/DELETE
- messages: 해당 conversation 참여자만 SELECT/INSERT/UPDATE

---

## 구현 완료 기능

### ✅ 인증 시스템
- Supabase Auth 기반 이메일/비밀번호 로그인·회원가입
- AuthContext로 전역 세션 관리 (Spring Boot JWT와 동일 역할)
- 회원가입 시: name, role(developer/designer), title 메타데이터 → DB 트리거로 profiles 자동 생성
- 이메일 인증 비활성화 (Supabase 대시보드에서 설정됨)
- 로그인 시 Header에서 이름 표시 + 로그아웃 버튼 자동 전환

### ✅ 채팅 시스템 (FloatingChat.tsx)
- 로그인 전: 버튼 클릭 → 로그인 모달 표시
- 로그인 후: 채팅 패널 열기
- 내 계정에 속한 대화만 불러옴 (RLS + user_a/user_b 필터)
- 낙관적 업데이트: 메시지 전송 즉시 UI 반영, 이후 실제 DB ID로 교체
- Supabase Realtime: 활성 대화 신규 메시지 실시간 수신
- 글로벌 인박스 구독: 비활성 대화 unreadCount 실시간 업데이트
- 읽음 처리: 대화 열면 is_read = true 업데이트
- 대화 삭제 기능

### ✅ 후보자 카드 메시지 연동
- CandidateCard: "메시지" 버튼 (보라 그라디언트)
- DetailPanel: "메시지 보내기" 버튼 (크게, 메인 CTA)
- 클릭 시: 비로그인 → 로그인 모달 / 로그인 → profiles 조회 후 대화 생성·오픈
- page.tsx의 chatTarget 상태로 FloatingChat과 통신

---

## 구현 완료 기능 (추가)

### ✅ 듀얼 채팅 시스템 (2026-06-03 완료)
- **더미 후보자** (id: "001"~"020"): 메시지 → Gemini 1.5 Flash가 해당 인물 역할로 응답
  - API Route: `src/app/api/chat/gemini/route.ts`
  - 환경변수 필요: `GEMINI_API_KEY` (서버사이드 전용, `NEXT_PUBLIC_` 붙이지 말 것)
  - AI 대화는 세션 메모리만 유지 (DB 저장 안 함)
  - AI 타이핑 인디케이터 (점 3개 애니메이션)
  - 대화 목록에 "AI" 뱃지 표시
- **실제 유저**: 기존 Supabase 실시간 채팅 유지

### ✅ 실제 유저 포트폴리오 등록 (2026-06-03 완료)
- `ProfileEditModal.tsx`: 로그인 시 Header "내 프로필" 버튼 → 편집 모달
  - 필드: 한 줄 소개, 상세 소개, 스킬 태그, GitHub/포트폴리오/Behance/LinkedIn, 공개 여부
- 메인 후보자 목록: `candidates.json` (더미 20명) + Supabase `profiles` (is_public=true) 동적 합산
- 실제 유저는 `source: "profile"`, 더미는 `source: "static"` 구분

### ⚠️ DB Migration 필요 (Supabase 대시보드 SQL Editor에서 실행)
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS short_bio text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS long_bio text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS skills text[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS github_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS portfolio_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS behance_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true;
```

---

## 다음에 구현해야 할 기능

### ~~🔴 최우선: 듀얼 채팅 시스템~~ ✅ 완료

#### A. Gemini AI 채팅 구현
```
사용 모델: Gemini 1.5 Flash (무료: 분당 15회, 일 1500회)
API 키: Google AI Studio (aistudio.google.com) 에서 발급
환경변수 추가: GEMINI_API_KEY=...  (서버사이드만, NEXT_PUBLIC_ 붙이지 말 것)
```

구현 방법:
1. `src/app/api/chat/gemini/route.ts` — Next.js API Route 생성
   - POST 요청: `{ candidateId, candidateName, candidateInfo, messages }`
   - Gemini에게 해당 후보자 역할 시스템 프롬프트 주입
   - 응답 스트리밍 또는 단순 JSON 반환
2. FloatingChat에서 더미 후보자 대화는 Supabase 대신 이 API 호출
3. 더미 대화는 DB 저장 안 해도 됨 (세션 메모리만 유지)

더미 후보자 판별: `candidate.id`가 "001"~"020" 형식이면 더미

#### B. 실제 유저 포트폴리오 등록 (B방향)

**DB 변경 필요:**
```sql
-- profiles 테이블에 컬럼 추가
ALTER TABLE profiles ADD COLUMN short_bio text;
ALTER TABLE profiles ADD COLUMN long_bio text;
ALTER TABLE profiles ADD COLUMN skills text[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN github_url text;
ALTER TABLE profiles ADD COLUMN portfolio_url text;
ALTER TABLE profiles ADD COLUMN behance_url text;
ALTER TABLE profiles ADD COLUMN linkedin_url text;
ALTER TABLE profiles ADD COLUMN is_public boolean DEFAULT true;
```

**구현 순서:**
1. 헤더에 "내 프로필 편집" 버튼 추가 (로그인 시)
2. ProfileEditModal.tsx 생성 — 스킬, 소개, 링크 등 입력
3. 메인 후보자 목록 소스 변경:
   - 현재: `candidates.json` (정적)
   - 변경: `candidates.json` + Supabase `profiles` WHERE `is_public = true` 동적 합산
4. 실제 유저 후보자는 기존 Supabase 채팅으로 메시지 연결

**후보자 타입 통합:**
```typescript
// 더미 후보자: source = "static"
// 실제 유저: source = "profile", supabaseId = profiles.id
interface UnifiedCandidate extends Candidate {
  source: "static" | "profile";
  supabaseId?: string;  // 실제 유저만
}
```

### 🟡 Presence 연동 (Task #7)
실시간 온라인 상태: Supabase Presence 채널 (웹소켓 heartbeat)
현재는 signIn/signOut 시에만 is_online 업데이트 → 브라우저 닫으면 갱신 안 됨

```typescript
// FloatingChat.tsx에 추가
const presenceChannel = supabase.channel('online-users')
presenceChannel.track({ user_id: user.id, online_at: new Date().toISOString() })
```

### 🟢 이후 작업
- 프로필 편집 후 메인 목록 즉시 반영 (Realtime 또는 revalidation)
- 미가입 후보자(더미)에게 메시지 → "AI와 채팅 중" 배지 표시
- 모바일 반응형 점검

---

## 중요한 기술 결정사항 & 버그 해결 기록

### AuthModal 중앙 정렬
```tsx
// backdrop을 flex container로 → framer-motion transform과 충돌 없음
<motion.div style={{ position:"fixed", inset:0, display:"flex", 
  alignItems:"center", justifyContent:"center" }}>
  <motion.div> // 모달 (transform: translate 없음)
```

### 회원가입 RLS 오류 해결
프로필 INSERT 시 `permission denied` → security definer 트리거로 해결  
(auth.uid()가 아직 세팅 안 된 상태에서 INSERT 불가능했던 문제)

### FloatingChat ↔ page.tsx 통신 패턴
```typescript
// page.tsx
const [chatTarget, setChatTarget] = useState<{name:string, email:string} | null>(null)
<FloatingChat pendingTarget={chatTarget} onTargetHandled={() => setChatTarget(null)} />

// FloatingChat.tsx
useEffect(() => {
  if (!pendingTarget || !user) return;
  startConversationWith(pendingTarget.name); // profiles 테이블 이름 조회
  onTargetHandled?.();
}, [pendingTarget]);
```

### Supabase Realtime 이중 구독 구조
- **per-conversation 구독** (`conv-${activeConvId}`): 활성 대화 메시지 실시간 표시
- **글로벌 인박스 구독** (`inbox-${user.id}`): 전체 대화 unread count 업데이트
- activeConvId는 `useRef`로 관리 → 구독 재생성 없이 최신값 참조

---

## MCP 확장 계획 (Talentfolio × jd-fit-analyzer 연동)

> jd-fit-analyzer(`C:\ClaudeWorkspace\jd-fit-analyzer`)가 Talentfolio의 Supabase `profiles`를
> 읽기 전용으로 연결하는 별도 백엔드 서비스다. 아래 4개 Phase는 두 프로젝트를 MCP로
> 연결해 "AI 채용 어시스턴트 플랫폼"으로 격상하는 로드맵이다.
>
> **작업 순서는 Phase 번호를 따른다.** 각 Phase 시작 전에 아래 체크리스트를 확인할 것.

---

### ⏩ 현재 진행 상태 & 다음 작업 인계 (2026-06-24 기준)

**완료**
- ✅ **Phase M1 (JD 핏 스코어) 완료** — 아래 M1 상세 참고. 추가로 다음 개선까지 반영됨:
  - `JdMatchModal`: 자유 텍스트 폼(직군/인원/필수기술/우대/담당업무/조직문화), 입력값을 부모(`page.tsx`) 메모리에 보존(모달 닫아도 유지, 새로고침/로그아웃 시 초기화), 모달 열릴 때 배경 스크롤 잠금(`html`+`body`).
  - 3단계 퍼널: `/api/jd/plan`(직군·키워드 확보 → 코드 기반 키워드 매칭/랭킹) → 상위 N명만 `5명 배치` LLM 분석.
  - 결과 노출: 분석 완료 시 메인 목록을 **"JD 적합도순"** 정렬로 자동 전환 + `결과 확인하기`가 후보 섹션으로 스크롤.
  - `CandidateCard`: 적합도(verdict)별 테두리/글로우/3D 강조, `strong_fit`은 CSS 펄스(`fit-pulse-strong`).
  - `FitReportDetail`(신규) → `DetailPanel` 상단에 "왜 적합한지"(종합점수/CEO총평 + 기술·경험·컬처핏별 점수/적합·보완 항목/근거) 표시.

**실제 구성 메모 (문서와 코드 차이 주의)**
- 포트: **orchestrator = 3001**, **mcp-server = 3002**. talentfolio는 `JD_ANALYZER_URL`(기본 `http://localhost:3001`, `src/types/fitReport.ts`)로 **orchestrator(3001)** 를 호출함. (아래 M1 본문의 일부 포트 표기는 옛 기준이라 코드가 우선)
- 실행 순서: mcp-server(3002) → orchestrator(3001) → talentfolio(3000). Redis(Docker) 필수.
- Gemini 키: `jd-fit-analyzer/.env.local`의 `GEMINI_API_KEY`만 사용(전역 env 없음). Tier1 선불 키 사용 중 — 잔액 소진 시 AI Studio에서 충전 필요. 키 변경 시 **mcp-server 재시작** 필수(키는 시작 시 1회 로드).

- ✅ **Phase M2 (Slack HIL 인터랙티브 승인 게이트) — 코드 구현 완료** (2026-06-24). 아래 M2 상세 참고.
  - jd-fit-analyzer: `notify_slack_approval`/`update_slack_decision` MCP tool, orchestrator `reviewSourcingAction` 공용 함수 + 액션 생성 시 Block Kit 승인요청 자동 발송 + `POST /api/slack/interactivity`(서명 검증·ack·승인/반려).
  - talentfolio: `/sourcing`(후보 검색 + Slack 승인요청 작성), `/sourcing/review`(HIL 폴링 승인/반려), `Header`에 "소싱" 진입점.
  - **남은 것은 코드가 아니라 외부 설정**: Slack App Interactivity 활성화 + `SLACK_SIGNING_SECRET` 등록 + 공개 터널(ngrok 등). 아래 M2 "남은 외부 설정" 참고.

**다음 작업 우선순위** (2026-06-24 수정안 반영):

| 순위 | Phase | 내용 | 상태 |
|------|-------|------|------|
| 1 | **M2.5** | JD 분석 완료 → `strong_fit` 임계값 쇼트리스트 → `sourcing_actions` + Slack HIL 자동 요청 | ✅ 코드 완료 |
| 2 | **M2.6** | Slack Block Kit **Card/Carousel** + Talentfolio `/brief/[id]` unfurl 페이지 | ✅ 코드 완료 |
| 3 | **M4** | **리크루터별 Notion OAuth** + `candidate_assessments` 정규화 → 개인 DB sync | ✅ 코드 완료 |
| 4 | **M3** | GitHub MCP enrich → Slack Card / DetailPanel | ⏳ 대기 |
| 5 | (후순위) | 주간 digest, 저장 JD 재매칭 | ⏳ 대기 |

**이상 플로우 (목표 UX)**:
```
리크루터 JD 입력 (이벤트 — 상시 사냥 ❌)
  → keyword plan (저비용) → 상위 K명만 LLM (비용 캡)
  → strong_fit 임계값 + max 5명 쇼트리스트 (고정 N명 ❌)
  → Slack Card/Carousel 승인 요청 (M2.6) + (선택) Notion sync (M4)
  → 리크루터 ✅/❌ (Slack 또는 /sourcing/review)
  → 승인 시 팀 채널에 리치 카드 발송
```

**운영 원칙 (사업·비용)**:
- **Always-on LLM 사냥 금지** — JD 제출·분석 완료 같은 **이벤트**에서만 고비용 작업 실행
- 프로필 변경 시 **임베딩만** 갱신 (LLM 없음)은 추후 허용
- `/sourcing` 수동 검색 UI는 **축소 예정** → `/sourcing/review`(승인·이력) 중심

---

### Phase M1 — JD 핏 스코어 카드 ✅ 완료

**목표**: Talentfolio 메인 페이지에 "JD 매칭 분석" 기능 추가. 리크루터가 채용공고(JD)를
입력하면 후보자 카드에 `strong_fit` / `possible_fit` / `weak_fit` 뱃지 + 점수가 실시간으로 표시.

**연결 지점**:
- jd-fit-analyzer MCP 서버: `POST http://localhost:3002/api/analyze` → `202 Accepted + jobId`
- SSE 진행률: `GET http://localhost:3002/api/analyze/:jobId/stream`
- 분석 엔진: Gemini Flash 3개 에이전트(기술스택/경험/컬처핏) + Claude Sonnet CEO

**필요 환경변수 (talentfolio .env.local 추가)**:
```env
JD_ANALYZER_URL=http://localhost:3002   # jd-fit-analyzer orchestrator 주소
```

**UI 구현 위치**:
- `src/components/JdMatchPanel.tsx` — JD 입력 텍스트에리어 + "분석 시작" 버튼 (사이드바 하단 또는 모달)
- `src/components/FitScoreBadge.tsx` — `strong_fit`(초록) / `possible_fit`(주황) / `weak_fit`(빨강) 뱃지
- `CandidateCard.tsx` — `fitScore?: FitScore` prop 추가, 카드 상단 오른쪽에 뱃지 오버레이
- `page.tsx` — `jdAnalysisResults: Map<candidateId, FitReport>` 상태 추가

**구현 순서**:
1. `JdMatchPanel` 컴포넌트 (JD 입력 UI)
2. `page.tsx`에 `/api/analyze` 호출 + SSE 구독 로직
3. `FitScoreBadge` 컴포넌트
4. `CandidateCard`에 뱃지 오버레이 통합
5. 로딩 인디케이터 (SSE 진행 상황: "기술 분석 중..." → "경험 분석 중..." → "최종 판정 중...")

**주의사항**:
- jd-fit-analyzer 오케스트레이터가 반드시 먼저 실행 중이어야 함 (`cd jd-fit-analyzer/orchestrator && npm run dev`)
- 동일 `(JD 해시, candidateId)` 조합은 Redis 캐시 재사용 (jd-fit-analyzer 자체 처리)
- CORS 설정 필요: jd-fit-analyzer orchestrator에서 `http://localhost:3000` 허용

---

### Phase M2 — Slack HIL 인터랙티브 승인 게이트 ✅ 코드 완료 / ⏳ 외부 설정 대기

**목표**: 현재 단방향 Slack 알림(talentfolio → Slack)을 **양방향 인터랙티브**로 확장.
리크루터가 Slack에서 "✅ 승인" / "❌ 거절" 버튼 클릭 → jd-fit-analyzer HIL 상태 업데이트 →
talentfolio `/sourcing/review` 화면에 반영.

**⚙️ 실제 구현 메모 (코드가 문서보다 우선)**
- Phase 5에서 sourcing tool은 **별도 `sourcing-mcp-server`가 아니라 메인 `mcp-server`(:3002)** 에 들어있음. M2도 여기에 추가.
- `sourcing_actions.status` enum은 `pending → approved/rejected/executed/failed` (문서의 `draft/pending_review/expired`는 미구현). 테이블은 **jd-fit-analyzer 자체 Supabase**(`bnezesulvtblzkaiipns`, service_role).
- **흐름**: talentfolio `/sourcing`에서 `POST /api/sourcing/actions`(pending 생성) → orchestrator가 **같은 채널**로 ✅/❌ 버튼 Block Kit 승인요청 자동 발송(`notify_slack_approval`, ts를 `result.approval`에 저장) → 리크루터가 **Slack 버튼** 또는 **웹 `/sourcing/review`** 에서 승인 → 둘 다 orchestrator `reviewSourcingAction()` 공용 로직을 타고, 승인 시에만 `notify_slack`으로 실제 메시지 전송(`executed`) + 승인요청 카드를 `update_slack_decision`(chat.update)으로 갱신.
- Slack 콜백 수신: orchestrator `POST /api/slack/interactivity` — `SLACK_SIGNING_SECRET`으로 HMAC 서명 검증 후 3초 내 200 ack, 이후 비동기 처리(Anti-Blocking). raw body가 필요해 이 라우트에만 `express.raw` 적용(전역 `express.json`은 urlencoded를 소비하지 않음).

**🔧 남은 외부 설정 (코드 외 — 사용자 직접)**
1. **Slack App**: api.slack.com/apps → 앱 생성/선택 → **Interactivity & Shortcuts** ON → Request URL에 `https://<공개주소>/api/slack/interactivity` 등록. Bot Token Scopes에 `chat:write`. 워크스페이스에 install.
2. **`.env.local`** (jd-fit-analyzer): `SLACK_SIGNING_SECRET=`(Basic Information > Signing Secret) 추가. **변경 시 orchestrator 재시작** 필수. (`SLACK_BOT_TOKEN`은 이미 설정됨)
3. **공개 터널**: 로컬 orchestrator(:3001)는 Slack이 직접 못 부르므로 `ngrok http 3001`(또는 cloudflared) 등으로 노출 후 그 URL을 1번 Request URL에 사용.
4. **(선택) n8n 경유**: Slack Request URL을 n8n Webhook으로 두고, n8n에서 payload의 `actions[0].value`(=actionId)와 `action_id`(approve_sourcing/reject_sourcing)를 파싱해 orchestrator `POST /api/sourcing/actions/:id/review { action, decidedBy }`를 호출. 이 경우 서명 검증은 n8n 단에서 수행(또는 생략). 직접 수신 엔드포인트와 동일한 `reviewSourcingAction` 로직을 타므로 승인 카드 갱신도 동일하게 동작.
5. **테스트 채널**: `/sourcing`의 기본 채널은 `#recruiting` — 봇이 초대된 실제 채널명으로 변경해 사용.

**연결 지점**:
- jd-fit-analyzer `sourcing_actions` 테이블 (status: `draft` → `pending_review` → `approved/rejected`)
- n8n 워크플로우: `Webhook`(POST) → Slack Block Kit 메시지 발송
- Slack Interactivity Webhook → n8n → `/api/sourcing-actions/:id/review` (PATCH)
- jd-fit-analyzer의 기존 `sourcing-mcp-server/` (Phase 5 완료 코드 재사용)

**필요 환경변수**:
```env
SLACK_BOT_TOKEN=xoxb-...           # Slack Bot OAuth (chat:write 스코프)
SLACK_SIGNING_SECRET=...           # Interactivity 검증용
N8N_SLACK_WEBHOOK_URL=...          # n8n → Slack 발송 트리거
```

**UI 구현 위치**:
- `src/app/sourcing/page.tsx` — 후보자 쇼트리스트 구성 + Slack 발송 요청
- `src/app/sourcing/review/page.tsx` — HIL 승인 대기 목록 (jd-fit-analyzer의 기존 `/review` 화면 포팅)

**Slack Block Kit 메시지 구조**:
```json
{
  "blocks": [
    { "type": "section", "text": "후보자 [이름] 연락 승인 요청" },
    { "type": "actions", "elements": [
      { "type": "button", "text": "✅ 승인", "action_id": "approve_sourcing" },
      { "type": "button", "text": "❌ 거절", "action_id": "reject_sourcing", "style": "danger" }
    ]}
  ]
}
```

**구현 순서 (코드 부분 완료 체크)**:
1. ✅ Block Kit 인터랙티브 메시지 발송 (`mcp-server`: `notify_slack_approval`, `update_slack_decision`)
2. ✅ orchestrator 승인/반려 공용 로직(`reviewSourcingAction`) + 액션 생성 시 승인요청 자동 발송
3. ✅ Slack Interactivity 수신 엔드포인트 `POST /api/slack/interactivity`(서명 검증) — n8n 경유도 동일 `reviewSourcingAction` 재사용
4. ✅ talentfolio `/sourcing` 화면 (후보 검색 + Slack 승인요청 작성)
5. ✅ talentfolio `/sourcing/review` 화면 (HIL 상태 4초 폴링, Slack 결정도 반영)
6. ⏳ (외부) Slack App Interactivity 활성화 + `SLACK_SIGNING_SECRET` 등록 + 공개 터널 — 위 "남은 외부 설정" 참고

**변경된 파일**:
- jd-fit-analyzer: `mcp-server/src/lib/slack.ts`, `mcp-server/src/tools/notifySlack.ts`, `mcp-server/src/index.ts`, `orchestrator/src/server.ts`, `orchestrator/src/lib/slackVerify.ts`(신규)
- talentfolio: `src/app/sourcing/page.tsx`, `src/app/sourcing/review/page.tsx`(신규), `src/types/sourcing.ts`(신규), `src/components/Header.tsx`(소싱 링크)

---

### Phase M2.5 — JD 완료 시 자동 쇼트리스트 → Slack HIL ✅ 코드 완료

**목표**: 리크루터가 JD 분석을 마치면 `strong_fit` + `overallScore ≥ 75` 후보(최대 5명)만 자동으로
`sourcing_actions`에 등록하고 Slack 승인 요청을 보낸다. **고정 N명 자동 확정 ❌**, **임계값 + 상한 ✅**.

**트리거 (이벤트 기반)**:
- `JdMatchModal`에서 전체 후보 분석 완료 시, 또는 **「결과 확인하기」** 클릭 시
- 동일 `(jdHash, userId)` pending 액션이 있으면 중복 생성 안 함

**API**:
- `POST /api/sourcing/auto-from-jd` — body: `{ jd, userId, channel?, reports: FitReport[] }`
- 응답: `{ created, reason?, action?, shortlist?, approvalWarning? }`

**쇼트리스트 규칙** (`shared/lib/shortlist.ts`):
```typescript
verdict === "strong_fit" && overallScore >= 75 → sort desc → slice(0, 5)
```

**환경변수** (jd-fit-analyzer, 선택):
```env
SLACK_DEFAULT_CHANNEL=#recruiting   # auto-from-jd 기본 채널
```

**변경 파일**:
- jd-fit-analyzer: `shared/lib/shortlist.ts`, `orchestrator/src/lib/autoSourcing.ts`, `orchestrator/src/lib/createSourcingWithApproval.ts`, `orchestrator/src/server.ts`, `shared/types.ts`
- talentfolio: `src/components/JdMatchModal.tsx`

**UI 축소 (후속)**:
- `/sourcing` 수동 검색 → 이력 조회 위주로 축소 (M2.6 이후)

---

### Phase M2.6 — Slack 리치 카드 + Talentfolio Brief 페이지 ✅ 코드 완료

**목표**: 단순 mrkdwn 대신 채용팀이 한눈에 볼 수 있는 **Block Kit Card/Carousel** 승인 카드.
상세는 Talentfolio `/brief/[candidateId]?jd=<jdHash>` OG unfurl 링크.

**3층 출력**:
1. Slack Card/Carousel (요약: 점수, matched 스킬, CEO 한 줄) + Brief 보기 버튼
2. Talentfolio `/brief/...` (풀 FitReport + 프로필, OG meta)
3. (M4) Notion 페이지 링크

**구현 위치**:
- `jd-fit-analyzer/mcp-server/src/lib/slack.ts` — `buildCandidateCardBlocks`, `buildShortlistCarouselBlocks`, `buildShortlistApprovalBlocks`, `buildShortlistPublishedBlocks`
- `jd-fit-analyzer/shared/lib/shortlist.ts` — `fitReportToBriefCard`, `fitReportsToBriefCards`
- `jd-fit-analyzer/orchestrator` — `GET /api/brief?candidateId=&jdHash=`, 승인 시 리치 Card 전송
- `talentfolio/src/app/brief/[candidateId]/page.tsx` — Brief UI + Open Graph
- `talentfolio/src/lib/getCandidate.ts`, `src/lib/briefReport.ts`

**환경변수** (jd-fit-analyzer `.env.local`):
```env
TALENTFOLIO_URL=http://localhost:3000   # Slack Card Brief 링크·unfurl 기준 URL
```

**Gemini 없이 테스트 가능**:
- Brief 페이지: `http://localhost:3000/brief/001` (프로필만)
- Slack Card 빌더: cards 배열이 payload에 있으면 mrkdwn 대신 Carousel (수동 `/api/sourcing/actions`에 cards JSON 전달 가능)

---

### Phase M3 — GitHub MCP 개발자 프로필 자동 보강

**목표**: `github_url`이 등록된 개발자 후보자 카드에 실제 GitHub 활동 데이터 표시.
- 주요 사용 언어 비율 (Language bar)
- 최근 30일 커밋 수
- 대표 레포 star 수
- 마지막 활동일 → "Active 3 days ago" 뱃지

**연결 지점**:
- `@modelcontextprotocol/server-github` (공식 GitHub MCP 서버)
- jd-fit-analyzer `mcp-server/src/tools/`에 `enrich_github_profile` tool 추가
- talentfolio DetailPanel에서 `GET /api/github-enrich?candidateId=...` 호출

**필요 환경변수 (jd-fit-analyzer)**:
```env
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_...   # public repo 읽기 전용으로 충분
```

**구현 위치**:
- jd-fit-analyzer: `mcp-server/src/tools/enrichGithubProfile.ts` (신규 tool)
- talentfolio: `src/components/GitHubActivityBar.tsx` (언어 비율 시각화)
- talentfolio: `DetailPanel.tsx`에 GitHub 활동 섹션 추가

**구현 순서**:
1. jd-fit-analyzer에 `enrich_github_profile` MCP tool 구현
2. GitHub API 응답 prune 어댑터 (절대 규칙 3 준수)
3. talentfolio `GitHubActivityBar` 컴포넌트
4. `DetailPanel`에 통합 (캐싱: 24시간 Redis TTL)

---

### Phase M4 — Notion 개인 DB 연동 (리크루터별 OAuth) ✅ 코드 완료

**목표**: 각 리크루터가 **자신의 Notion 워크스페이스·후보 DB**에 OAuth로 연결하고,
JD 분석 결과(승인 후)를 **개인 Notion database**에 sync.

**DB Migration** (jd-fit-analyzer Supabase SQL Editor):
- `docs/architecture/sql/008_m4_notion.sql` 실행

**API** (orchestrator :3001):
- `GET /api/notion/oauth/start?userId=` → Notion OAuth redirect
- `GET /api/notion/oauth/callback` → 토큰 저장 → talentfolio `/settings/integrations?notion=connected`
- `GET /api/notion/integrations?userId=` — 연동 상태 (토큰 미노출)
- `PATCH /api/notion/integrations` — `{ userId, dataSourceId }` DB 선택
- `GET /api/notion/databases?userId=` — 접근 가능 DB 목록
- `POST /api/notion/sync` — `{ userId, jdRunId, candidateIds[] }` 수동 sync
- MCP tool: `sync_candidates_to_notion`

**자동 sync**: Slack HIL 승인(`reviewSourcingAction` executed) + `payload.jdRunId` 있을 때 Notion sync 시도 (실패해도 Slack은 완료)

**Talentfolio UI**: `/settings/integrations` — OAuth 연결 + DB 선택 (Header 「연동」)

**환경변수** (jd-fit-analyzer):
```env
NOTION_CLIENT_ID=
NOTION_CLIENT_SECRET=
NOTION_REDIRECT_URI=http://localhost:3001/api/notion/oauth/callback
```

**Notion DB 필수 컬럼**: Name(title), Score(number), Verdict, CEO Summary, Matched Skills, TalentFolio(url), External ID(text)

---

## 개발 서버 실행

```bash
# Talentfolio (메인 앱)
cd C:\ClaudeWorkspace\test1-main\talentfolio
npm run dev
# → http://localhost:3000
```

```bash
# MCP 확장 기능 사용 시 — jd-fit-analyzer도 함께 실행 필요
# 터미널 1: MCP 서버 (반드시 오케스트레이터보다 먼저)
cd C:\ClaudeWorkspace\jd-fit-analyzer\mcp-server && npm run dev
# → http://localhost:3002/mcp

# 터미널 2: 오케스트레이터 (BullMQ 워커 포함)
cd C:\ClaudeWorkspace\jd-fit-analyzer\orchestrator && npm run dev

# 터미널 3: jd-fit-analyzer 웹 UI (Phase M1 핏 분석 결과 확인용)
cd C:\ClaudeWorkspace\jd-fit-analyzer\web && npm run dev
# → http://localhost:3001
```

```bash
# 타입 체크
npx tsc --noEmit
```

---

## 테스트 계정

개발 중 실제 이메일 불필요 (이메일 인증 비활성화됨)  
테스트 계정 예시:
- `test@test.com` / `test123`
- `dev@test.com` / `test123`

> 실제 개인 계정으로 가입하지 말 것 (앱 보안 감사 미완료)
