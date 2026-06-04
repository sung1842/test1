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

## 개발 서버 실행

```bash
cd C:\ClaudeWorkspace\main\talentfolio
npm run dev
# → http://localhost:3000
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
