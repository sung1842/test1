# Spec A — mint paper desk

White / mint paper. Teal-green accent. Crowd is atmosphere, not a theme.
No dark, no yellow / red / crimson / copper.

## Palette

| Token | Value | Use |
| --- | --- | --- |
| Paper | `#F7FBF9` | Page, hero fades, folder band |
| Wash TL | `rgba(45,212,191,0.20)` | Radial, top-left |
| Wash TR | `rgba(13,148,136,0.12)` | Radial, top-right — blue-green, not sky-blue |
| Ink | `#10231C` | Display, body |
| Ink 62 | `#10231C` @ 0.62 | Lead |
| Ink 42 | `#10231C` @ 0.42 | Meta |
| Accent | `#0F766E` | Eyebrow, chips on, badge |
| Accent wash | `rgba(15,118,110,0.10)` | Chips off |
| Glass tint | `oklch(0.99 0.014 175 / 0.62)` | Search / filter GlassCard — frost the crowd, do not milk it |
| Hairline | `rgba(16,35,28,0.08)` | Rules only |

Forbidden: `#020005`, `#E07A5F`, `#f6042e`, `#ffae2e`.

## Type (DM Sans)

- Eyebrow: 11px, 0.22em, uppercase, accent, weight 650
- Display: `clamp(40px, 5.6vw, 64px)`, lh 1.02, tracking -0.04em, weight 600
- Lead: 16px / 1.65, ink 62, max 28em
- Section: 20px, tracking -0.03em, weight 600
- Meta: 12px, ink 42
- Input: 15px, ink
- Chip: 11px

Keep display above the crowd. Do not put body copy on ink peeps.

## Spacing

- Gutter 28px
- Hero max 1040px; pad 72 / 28 / 168; min-height 78vh
- Mint wash: paper on type, open mid for crowd, dissolve only the last ~8% into the folder band
- Search max 520px; chips on a second row inside the glass
- Folder band max 1180px; pad 12 / 28 / 120; paper fill so the crowd does not run under the grid
- Grid: `minmax(300px, 1fr)`, gap 44px 28px, justify center
- Head → grid 28px

## Layers

1. Paper + radials
2. skiper39, untouched, bottom atmosphere
3. Mint wash (top readable, bottom dissolve into paper)
4. Glass search
5. Folder objects on paper

## Chrome

`.demo-spec` paints paper so midnight body does not leak.
`.demo-spec .demo-topbar` is mint glass, not generic white 55% over `#020005`.
