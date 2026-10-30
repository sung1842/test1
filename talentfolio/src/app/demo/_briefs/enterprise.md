# B · ENTERPRISE

Recruiter workspace. Not a landing page. Not a portfolio gallery.

## Read

Linear density + Notion sidebar + LinkedIn Talent people search.

A hiring manager opens this on Monday, filters, and starts clicking folders. The chrome is the product. The folders are the records.

## Steal / refuse

Steal

- Linear: 40–48px header band, 13px UI type, hairline borders, almost no shadow, indigo-blue as a quiet selected state.
- Notion: persistent left rail, workspace name at the top, nested views, one active item with a wash — not a filled button.
- LinkedIn Talent: people count, role facets, search sitting in the same row as filters.

Refuse

- Marketing hero, huge display type, glass as decoration.
- Teal / mint / copper / crimson / amber. Those belong to other surfaces.
- A search field that lifts and sparkles on hover. Recruiter tools do not wink.

## Surfaces

| Token | Value | Use |
| --- | --- | --- |
| Canvas | `#F6F7F9` | Main pane |
| Sidebar | `#FBFBFC` | Rail, slightly cooler than white |
| Ink | `#111827` | Titles, active labels |
| Muted | `#64748B` | Meta, counts, idle nav |
| Line | `#E6E8EC` | All dividers |
| Accent | `#3B6FFE` | Selected nav wash, active facet, badge |
| Glass | `rgba(255,255,255,0.78)` + 10px blur | Toolbar only |

Type: Inter (UI), system Korean fallback. Never serif here.

## Layout

```
[demo topbar — compact, white, 1px line]
[ 220px rail | main ]
         rail: mark, workspace, nav + counts, views, user chip
         main: 22px page title · 40px toolbar · folder grid
```

- Rail is always there on desktop. Collapse under 900px; do not keep a 240px column on a phone.
- Page title is 22px / 600 / -0.03em. If it looks like a hero, it is wrong.
- Toolbar is one 40px row: search + segmented role + live count.
- Grid is denser than a marketing mosaic: `minmax(260px, 1fr)`, 16–20px gap, left-biased, not a carnival of centered cards.

## Materials

Crowd canvas
- Already in the main pane.
- Opacity ≤ 0.16. Mask it so it lives in the lower half.
- White veil over the top so type and toolbar stay crisp.
- It is weather. It is not a feature.

Glass
- One quiet bar around search/filters.
- Radius 8–10. No rim theatre, no hover lift.
- If GlassCard’s padding fights density, do not use GlassCard. A 1px line + blur is enough.

Folders
- Records on a desk you already own. Do not restyle the engine.
- They will still feel a bit precious next to Linear chrome. That tension is acceptable; wrapping them in more glass is not.

## Copy

Product copy only. No “this is Linear-like” captions in the rail.

- Title: 인재 디렉터리
- Nav: 인재 검색 / 쇼트리스트 / 파이프라인 / 리포트
- Search: Search people, skills, titles

## Success test

From the doorway: sidebar, cool gray, blue tick. Then people. Then, maybe, a crowd in the distance.

If the first thing you notice is glass, folders, or a walking crowd, it failed.
