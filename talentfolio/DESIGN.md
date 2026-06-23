# TalentFolio — DESIGN.md

> This file encodes the complete design system for **TalentFolio**, a developer & designer talent discovery platform. It is machine-readable and intended for use with Google Stitch, Cursor, and other AI design/coding tools.

---

## 1. Brand Identity

| Property | Value |
|---|---|
| Product name | TalentFolio |
| Tagline | Talent Discovery |
| Target users | HR teams, recruiters |
| Core concept | Dark, high-intensity UI that signals technical credibility |
| Tone | Bold · Professional · High-contrast · Minimal clutter |

---

## 2. Color Palette

**Combination B — Midnight × Crimson × Amber**

> Rule: Midnight dominates (~80%), Crimson is the main accent (~15%), Amber is used sparingly as a point color only (~5%).

### Base Colors

| Token | Hex | Usage |
|---|---|---|
| `--background` | `#020005` | Page background (midnight) |
| `--surface` | `#0b0812` | Cards, list rows |
| `--surface-elevated` | `#16101f` | Modals, dropdowns, popovers |
| `--border-color` | `#271c32` | All borders and dividers |

### Accent Colors

| Token | Hex | Usage |
|---|---|---|
| `--accent` | `#f6042e` | Primary CTA buttons, active states, developer role |
| `--accent-dark` | `#c0001e` | Gradient endpoint, hover state of crimson |
| `--accent-alt` | `#ffae2e` | Designer role only — amber, use at minimum |

### Text Colors

| Token | Hex | Usage |
|---|---|---|
| `--text-primary` | `#f0ecf8` | Headings, body text, labels |
| `--text-secondary` | `#7a6a8a` | Subtitles, meta info, placeholders |

### Role Colors

| Role | Color | Hex |
|---|---|---|
| Developer | Crimson | `#f6042e` |
| Designer | Amber | `#ffae2e` |

### Semantic Colors

| Use | Color | Hex |
|---|---|---|
| Success / Saved | Green | `#22c55e` |
| Error / Danger | Red | `#f87171` |
| Online indicator | Green | `#22c55e` |
| Offline indicator | Muted purple | `#3a2a4a` |

### Shadow & Glow

```
Default card shadow:    0 4px 24px rgba(0,0,0,0.4)
Selected card glow:     0 0 0 1px #f6042e, 0 8px 40px rgba(246,4,46,0.2)
Crimson button shadow:  0 4px 16px rgba(246,4,46,0.4)
Modal shadow:           0 28px 60px rgba(0,0,0,0.85), 0 0 0 1px rgba(246,4,46,0.06)
```

---

## 3. Typography

### Font Families

| Role | Font | Source | Usage |
|---|---|---|---|
| Body / UI | `DM Sans` | Google Fonts | All body text, buttons, labels, inputs |
| Code / Mono | `JetBrains Mono` | Google Fonts | Skill tags, badges, counts, meta data |
| Logo title | `SerreriaSobria` | Local (`/src/app/fonts/`) | Logo wordmark ONLY |
| Logo subtitle | `AlanisHand` | Local (`/src/app/fonts/`) | Logo tagline ONLY |

> ⚠️ SerreriaSobria and AlanisHand are **exclusive to the logo**. Do not use elsewhere.

### Type Scale

| Element | Font | Size | Weight | Color |
|---|---|---|---|---|
| Hero H1 | DM Sans | 56–72px (responsive) | 700 | `--text-primary` |
| Section heading | DM Sans | 18–20px | 700 | `--text-primary` |
| Body text | DM Sans | 13–15px | 400 | `--text-secondary` |
| Button label | DM Sans | 13–14px | 600–700 | white |
| Badge / Tag | JetBrains Mono | 10–12px | 500 | role color |
| Logo title | SerreriaSobria | 23px | 400 | `#f0ecf8` + `#f6042e` on "Folio" |
| Logo subtitle | AlanisHand | 12px | 400 | `--text-secondary` |

### Letter Spacing

| Context | Value |
|---|---|
| Logo title | `0.03em` |
| Logo subtitle | `0.04em` |
| Uppercase labels | `0.05–0.08em` |
| Normal body | default |

---

## 4. Spacing & Layout

### Grid

- Max content width: `1280px` (`max-w-7xl`)
- Page horizontal padding: `16px` (mobile) / `24px` (desktop)
- Card grid: 1 column (mobile) → 2 columns (tablet) → 3 columns (desktop)
- Card gap: `24px`

### Border Radius

| Element | Radius |
|---|---|
| Cards | `16px` (`rounded-2xl`) |
| Buttons | `12px` |
| Input fields | `10px` |
| Badges / Pills | `9999px` (full round) |
| Skill tags | `9999px` (full round) |
| Modals | `20px` |
| Avatar | `50%` (circle) |
| Icon buttons | `8–10px` |

### Z-Index Layers

| Layer | Z-index |
|---|---|
| Floating chat panel | 200 |
| Header | 100 |
| Detail panel | 50 |
| Modals / Backdrops | 300 |

---

## 5. Components

### 5.1 Header

- **Position**: Fixed top, full-width
- **Height**: ~64px (auto)
- **Background**: Transparent → `#020005` at 97% opacity on scroll (blur backdrop filter)
- **Bottom border**: Crimson gradient line `linear-gradient(to right, transparent, rgba(246,4,46,0.5), transparent)`
- **Logo**: Left-aligned, two lines — "Talent**Folio**" (SerreriaSobria 23px) + "Talent Discovery" (AlanisHand 12px)
- **Right actions**: Login button (crimson gradient) | Bookmark toggle | Profile button

### 5.2 Hero Section (AnimatedMarqueeHero)

- **Background**: `#020005`
- **Radial glow**: `radial-gradient(ellipse 60% 40% at 50% 45%, rgba(246,4,46,0.1) 0%, transparent 70%)`
- **Grid texture**: `opacity-[0.025]` subtle grid lines
- **Title**: DM Sans 700, 56–72px
- **Accent word**: Crimson `#f6042e`
- **Marquee strip**: Portfolio preview images rotating at slight angle, auto-scrolling
- **Scroll indicator**: Bouncing chevron at bottom center

### 5.3 Filter Tabs

- **Style**: Underline tabs (not pill tabs)
- **Active — all / developer**: Crimson `#f6042e` underline + white text
- **Active — designer**: Amber `#ffae2e` underline + amber text
- **Inactive**: `--text-secondary` text, no underline
- **Count badge**: Role-colored background pill with monospace number
- **Border bottom**: `1px solid --border-color` under full tab bar

### 5.4 Candidate Card

- **Size**: Fixed ratio, `rounded-2xl`
- **Background**: `--surface` (`#0b0812`)
- **Border**: `1px solid --border-color` → crimson on selected
- **Top image area**: 176px tall, portfolio screenshot with gradient overlay
- **Top color strip**: 2px line — crimson for developer, amber for designer
- **Bookmark button**: Top-right, amber fill when bookmarked
- **Avatar**: Circle, role-colored background
- **Role badge**: Pill, monospace, role color
- **Skill tags**: Horizontal scroll, brand-colored pills with icons
- **Message button**: Crimson gradient, bottom-right
- **Email/link buttons**: Ghost border, warm beige hover

### 5.5 Detail Panel (Side panel)

- **Width**: 400px, slides in from right
- **Background**: `--surface-elevated`
- **Sections**: Bio · Skills · Links · Contact
- **Section labels**: DM Sans, 11px, uppercase, `--text-secondary`
- **Close button**: Top-right X icon

### 5.6 Modals (AuthModal / ProfileEditModal)

- **Width**: `min(440px, 92vw)`
- **Background**: `#0d0918`
- **Border**: `1px solid #271c32`
- **Backdrop**: `rgba(2,0,5,0.9)` with blur(6px)
- **Tab switcher**: Crimson gradient fill on active
- **Input fields**: `#0f0b18` bg, `#271c32` border → crimson border on focus
- **Primary button**: `linear-gradient(135deg, #f6042e, #c0001e)` with crimson shadow
- **Role selector**: Developer (crimson) / Designer (amber)

### 5.7 Floating Chat Panel

- **Position**: Fixed bottom-left, `16px` from edge
- **Size**: `min(360px, 100vw - 32px)` × `min(520px, 100svh - 120px)`
- **Background**: `rgba(2,0,5,0.97)` with blur(28px)
- **Border**: `1px solid #271c32`
- **Header icon**: Crimson gradient square with MessageSquare icon
- **Sent messages**: Crimson gradient bubble (right)
- **Received messages**: `#0f0b18` with dark border (left)
- **Input**: `#0b0812` bg, crimson border on focus
- **Send button**: Crimson gradient when input has text
- **Online dot**: Green `#22c55e` / Offline `#3a2a4a`

### 5.8 Badges

#### Role Badge
```
Developer: bg rgba(246,4,46,0.12) | border rgba(246,4,46,0.35) | text #f6042e
Designer:  bg rgba(255,174,46,0.1) | border rgba(255,174,46,0.3) | text #ffae2e
Font: JetBrains Mono | Size: 12px | Padding: 4px 10px | Radius: 9999px
```

#### Skill Tag
- Each skill has a brand color (e.g., React → `#61DAFB`, TypeScript → `#3178C6`)
- Background is `color + "12"` (12% opacity)
- Border is `color + "30"` (18% opacity)
- Icon + label in JetBrains Mono

---

## 6. Motion & Animation

| Element | Animation | Duration |
|---|---|---|
| Card entrance | `fadeInUp` + blur(6px→0) | spring (stiffness 280, damping 28) |
| Card hover | scale 1.025, y -5px | spring |
| Hero text | `fadeInUp` staggered | 0.15s, 0.3s, 0.42s delay |
| Detail panel | `slideInRight` | 0.3s ease-out |
| Modal | scale 0.93→1 + opacity | spring |
| Scroll indicator | y bounce loop | 1.5s infinite |
| Marquee images | continuous x scroll | 0.4px/frame |
| Bookmark badge | scale pop | spring |

---

## 7. Iconography

- **Icon library**: Lucide React (UI icons) + React Icons `si` (brand/skill icons)
- **Default size**: 16px (UI) / 12px (inline tags)
- **Color**: Inherits from context (text-secondary by default, role color in tags)

---

## 8. Page Structure

```
/ (Home)
├── <Header />          — fixed, full-width
├── <AnimatedMarqueeHero />   — full-height hero with marquee
├── <FilterTabs />      — sticky below hero
├── <SearchBar />       — InputWithTags component
├── [CandidateCard grid]  — masonry-like 3-col grid
│   └── <CandidateCard />  ×N
├── <DetailPanel />     — right side panel (appears on card click)
├── <FloatingChat />    — bottom-left floating panel
├── <AuthModal />       — login/signup overlay
└── <ProfileEditModal /> — profile edit overlay
```

---

## 9. Responsive Breakpoints

| Breakpoint | Width | Layout |
|---|---|---|
| Mobile | < 640px | 1-col grid, compact header, hidden labels |
| Tablet | 640–1024px | 2-col grid |
| Desktop | > 1024px | 3-col grid, detail panel visible |

---

## 10. Accessibility & UX Rules

- All interactive elements have `:hover` and `:focus` states
- Tap highlight disabled on mobile (`-webkit-tap-highlight-color: transparent`)
- `prefers-reduced-motion` respected — animations disabled if user preference set
- Scrollbar styled to match theme (6px, `--border-color`)
- Custom scrollbar thumb turns crimson on hover
