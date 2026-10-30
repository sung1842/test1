# Talentfolio · DESIGN.md

> 전 사이트 디자인 기준. 메인 랜딩(`src/components/landing/sky-landing.css`)의 **"맑은 아침 하늘"** 이 원본이고,
> 전역 토큰은 `src/app/globals.css` `:root` 에 있다. 새 화면은 hex 를 직접 쓰지 말고 아래 토큰만 쓴다.
> 2026-10-31 디자인 통합(5인 감사 → 적용)으로 구 다크(midnight·copper·crimson·DM Sans) 사양을 폐기했다.

---

## 1. 브랜드

| 항목 | 값 |
|---|---|
| 이름 | Talentfolio (`talent` + 이탤릭 `folio`) |
| 한 줄 | 작업물로 만나는 채용 |
| 대상 | 구직자(스튜디오) · 기업/헤드헌터(데스크) |
| 톤 | 밝고 따뜻함 · 손맛(손그림·손글씨) · 정돈된 UI · 사람이 승인하는 AI |

---

## 2. 색 (흰 바탕 대비, 모두 WCAG AA 이상)

### 표면
| 토큰 | 값 | 용도 |
|---|---|---|
| `--background` | `#F5F9FF` | 페이지 바탕 (회색 `#F6F7F9` 금지) |
| `--surface` | `#FFFFFF` | 카드·패널 |
| `--surface-2` | `#EEF5FF` | 카드 안 구획, 표 머리 |
| `--mist` / `--sky` | `#DCEBFF` / `#BFDDFF` | 칩·태그 배경, 히어로 그라데이션 |
| `--border-color` | `#D3E3F7` | 1.5px 카드 테두리 |
| `--border-strong` | `#0B1C45` | 외곽선 버튼, 포커스 강조 |
| `--sun` | `#FFE7A3` | 하이라이트, 해, 북마크 |

### 글자·브랜드
| 토큰 | 값 | 대비 | 용도 |
|---|---|---|---|
| `--text-primary` | `#0B1C45` | 16.6 | 제목·본문 |
| `--text-secondary` | `#44527A` | 7.7 | 보조 글 |
| `--text-3` | `#5C6A8E` | 5.4 | 캡션 |
| `--accent` | `#1F4FD6` | 6.7 | CTA, 링크, 개발자 직군 |
| `--cerulean` | `#4AA3F2` | 2.7 | **텍스트 금지** — 장식·포커스 링 |
| `--des-color` | `#7A3FB0` | 6.6 | 디자이너 직군 |

### 상태 (색만으로 전달하지 않는다 — 기호·라벨 병기)
| 의미 | 전경 / 배경 | 기호 |
|---|---|---|
| 잘 맞음 (strong_fit) · 성공 | `--ok #0B6B45` / `--ok-bg #DDF3E7` | ● |
| 부분 일치 (possible_fit) · 경고 | `--warn #7A4E00` / `--warn-bg #FFEFC2` | ◐ |
| 덜 맞음 (weak_fit) | `#44527A` / `#E8EDF5` | ○ (빨강 금지) |
| 위험·삭제 | `--danger #A82A23` / `--danger-bg #FDE3E0` | |

라벨은 `src/lib/labels.ts` 만 거친다.

### 그림자
- 카드: `--shadow-card` (얕은 파란 그림자) · 떠 있는 요소: `--shadow-pop`
- **글로우·네온·무한 펄스·유리 블러 금지** (2026 "AI 생성 느낌" 패턴)

---

## 3. 타이포

| 역할 | 폰트 | 토큰 |
|---|---|---|
| 본문·UI | Pretendard Variable | `--f-body` |
| 제목 | Wanted Sans Variable 800, letter-spacing -0.045em | `--f-display` |
| 강조 단어 (제목 안 1~2단어) | MaruBuri, cobalt | `--f-accent` |
| 손글씨 메모 (장식, 본문 금지) | Nanum Pen Script | `--f-hand` |
| 영문 이탤릭 숫자·배경 단어 (랜딩) | Lora | `--font-sky-lora` |

- 최소 크기: 본문 14px, 캡션 **12px** (12px 미만 금지)
- 라벨: 12px, uppercase, letter-spacing .18em, cobalt (`.tf-label`)
- 금지: DM Sans, Syne, Noto Sans KR, Tailwind 기본 `ui-sans-serif`

---

## 4. 모양·간격

| 요소 | 규칙 |
|---|---|
| 버튼 | pill(999px), 1.5px ink 테두리, 채움은 cobalt, hover 시 위로 2px, 높이 **44px** (`.tf-btn`, `.tf-btn.fill`) |
| 칩 | pill, 최소 32px (`.tf-chip`, 선택 시 cobalt 채움) |
| 카드 | radius 24px, 1.5px `--border-color`, `--shadow-card` (`.tf-card`) |
| 입력 | radius 14px, 1.5px `#8FA6CC` (비텍스트 대비 3:1) |
| 포커스 | 3px cerulean outline, offset 3px |
| 탭 타깃 | 44px (문장 안 링크 제외) |
| 콘텐츠 폭 | 1200px, 좌우 24px (모바일 16px) |

---

## 5. 공용 컴포넌트

| 컴포넌트 | 위치 | 용도 |
|---|---|---|
| `SiteHeader` | `components/site` | 모든 페이지 공용. 경로로 역할 구역(랜딩·스튜디오·데스크)을 정해 메뉴를 바꾸고, 모바일 메뉴도 같은 데이터를 쓴다 |
| `DeskTabs` | `components/desk` | 기업 화면 공통 탭: 홈 · 승인함 · 스카우트 건 · 인재풀 · 연동 |
| `ProductShell` | `components/product` | 스튜디오·데스크 셸 (`<main id="main">`) |
| `StateView`, `LoadError`, `SkeletonList` | `components/state` | 빈 상태·비로그인·오류·로딩. "불러오는 중" 텍스트 대신 스켈레톤, 오류 원문 노출 금지 |
| `Illustration` | `components/state` | 손그림 스팟: door(비로그인) · search(결과 없음) · kite(로딩) · map(404) · umbrella(오류) · plane(완료) |
| `.tf-page-head` | globals.css | 작업 화면 머리말 (100vh 히어로 대신) |
| `FitScoreBadge` | `components` | 기호 + 한글 판정 + 점수 |
| `Avatar` | `components` | 하늘 계열 4색(이름 해시 고정) + 손글씨 이니셜 |

---

## 6. 모션

- anime.js v4 (랜딩 스크롤 연출) — 규칙은 `.claude/skills/anime-ui`
- 제품 화면은 **목적 있는 모션만**: 상태 전환, 패널 슬라이드, hover 위로 2px
- 진입 블러(`filter: blur`), 무한 펄스, 과한 scale hover 금지
- `prefers-reduced-motion` 에서 모든 반복 모션 정지

---

## 7. 아이콘·그림

- UI 아이콘: lucide-react, stroke 1.75, 16/20/24px, 기본 `--text-secondary`
- 스킬 아이콘: react-icons `si`, 색은 브랜드색 대신 cobalt 하나로 통일
- 이모지 아이콘 금지 (손글씨 기호 `✎ ☀ ✓ ↗ ★` 는 허용)
- 일러스트: 2px ink 선, 둥근 끝, sky·mist·sun·cobalt 소량, 해 한 점

---

## 8. 정보 구조

```
구직자  /studio(?tab=)  ·  /studio/log 기록하기  ·  /studio/cards 내 카드  ·  /studio/matches 받은 추천
        /talent/[id]   공개 포트폴리오
기업    /desk 홈  ·  /review 승인함(+ /sourcing/review Slack 발송)  ·  /sourcing 스카우트 건
        /desk/candidates 인재풀(+ /discover)  ·  /settings/integrations 연동  ·  /brief/[id] 공유용 브리프
공통    /  ·  /start  ·  /login  ·  not-found  ·  error
/demo/* 이전 시안 — 배포본에서는 404 (NEXT_PUBLIC_SHOW_DEMO=1 일 때만)
```

용어: **스카우트 건 → 후보 → 승인 → 제안**. 내부 키(strong_fit, self_ai, SQL 번호, jdHash)는 화면에 쓰지 않는다.

---

## 9. 접근성 체크리스트

- 페이지마다 `<main id="main">` 하나, `h1` 하나, 전역 "본문으로 건너뛰기" 링크
- 아이콘만 있는 버튼은 `aria-label`, 토글은 `aria-pressed`, 현재 위치는 `aria-current`
- 로딩은 `role="status"`
- 다크 모드: 1차는 라이트 단일. 토큰만 다크 대응 구조로 유지 (2차에 `/desk` 한정 검토)
