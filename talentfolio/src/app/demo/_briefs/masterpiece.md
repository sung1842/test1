# C · MASTERPIECE

A reference site. One desk. One line of type. Objects you can pick up.

## Read

Apple editorial scale + Vercel emptiness + Arc glass as weather.

This is not a SaaS shell with prettier type. It is a page you would screenshot and send to a designer who asked “what should talent feel like.”

## Steal / refuse

Steal

- Apple: one idea per viewport, serif display, huge tracking-tight type, almost no chrome.
- Vercel: black ink on paper, no accent rainbow, no extra boxes to prove hierarchy.
- Arc: milk glass as atmosphere, objects sitting in space, warmth instead of neon.

Refuse

- Spec teal, mint gradient, green ink, copper, crimson, amber, yellow.
- A card around the search field.
- A uniform product grid of folders.
- Crowd canvas as the hero. If people walking is louder than the headline, kill the opacity.

## Surfaces

| Token | Value | Use |
| --- | --- | --- |
| Paper | `#F6F3ED` → `#E8E2D6` | Warm sheet, cooling toward the desk |
| Ink | `#161513` | Display and body |
| Whisper | `#161513` at 40–55% | Kicker, count |
| Glass | white 0.22–0.32, blur 28px | A plane behind type, not a component |
| Accent | none. Demo badge uses ink. |

Type: Instrument Serif for display and search. Sans only inside the folders (engine, do not touch). Korean glyphs fall back to system serif — acceptable, do not mix a second display face.

Display: `clamp(64px, 9vw, 112px)`, line-height 0.88, tracking -0.055em, weight 400. Italic kicker above it, 15–16px, 50% ink.

## Layout

```
[demo topbar — dissolve it: no fill, no border]
[ hero: type, then a breath, then a line to type into ]
[ desk: folders as objects, not a catalog ]
```

- Max width ~1240. Huge left-aligned type. Do not center the manifesto.
- Search is an underline, not a field. 20px serif, no box, no rim, no lift.
- No role pills. Filtering is typing.
- No section heading that explains the metaphor. A caption is enough: how many objects are on the desk.
- Folders sit on a surface: staggered Y, slight rotation (±6°), generous gaps, a soft ground shadow under the group. They are things you would have to move aside to write.
- Perspective is a hint, not a CSS stunt. If it looks like a 2016 hero mock, flatten it.

## Materials

Crowd canvas
- Horizon only. Lower 55% of the hero, opacity ~0.24, fade up into paper.
- Subordinate to type. Always.

Glass
- One large rounded plane parked behind the headline, pointer-events none.
- It frosts the crowd. It does not wrap UI.

Folders
- Engine unchanged. The page supplies placement, rotation, air.
- Skill-chip green inside the folder is an engine leftover — live with it or the loop has to change the engine later.

## Copy

- Kicker: A desk of people, not a feed of cards.
- Display: Quiet glass. / Loud talent.
- Search: Who are you looking for?
- Caption: N on the desk.

No paragraph about Apple, Vercel, or Arc. If the page has to name its references, the page failed.

## Success test

From the doorway: a sentence you can read from across the room. Then glass weather. Then folders you could pick up. The crowd is a rumor at the bottom of the window.

If you see a toolbar, a mint wash, or a grid of equal tiles, it failed.
