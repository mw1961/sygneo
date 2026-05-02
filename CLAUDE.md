# SYGNEO — Design Rules & System Reference

## Architecture

- **Framework:** Next.js 16 App Router, TypeScript, Tailwind v4
- **Generation:** Claude Sonnet API → 6 SVGs per batch as JSON
- **Storage:** Upstash Redis (prefix `sygneo:`)
- **Master prompt:** `app/lib/seal-prompt.ts` (Sections A–H + BATCH_VOCABULARY)
- **API route:** `app/api/generate-recraft/route.ts`

---

## Generation Layout — 6 SVGs per batch

| # | Border | Lead motif |
|---|--------|-----------|
| 1 | Circle | Origin |
| 2 | Square | Occupation |
| 3 | Circle | Values |
| 4 | Square | Synthesis (all three) |
| 5 | Square | Maze bracket pattern |
| 6 | Square | Maze bracket pattern (different arrangement) |

**2 batches maximum per session → 12 seals total.**
Claude has full creative freedom for SVGs 1–4 (no style constraint).

---

## Core Design Principle

Every seal must **synthesize** all family parameters — origin + occupation + values — into one coherent geometric language. Not a generic pattern; unique to this family.

Multiple origins (e.g. Morocco + Poland): **layer or interlock** their geometric metaphors — ignore none.

---

## Stamp Production Constraints (NEVER RELAX)

- `viewBox="0 0 300 300"`, background `<rect width="300" height="300" fill="white"/>`
- Circle border: `<circle cx="150" cy="150" r="132" fill="none" stroke="black" stroke-width="12"/>`
- Square border: `<rect x="18" y="18" width="264" height="264" fill="none" stroke="black" stroke-width="12"/>`
- **Minimum stroke-width="9"** everywhere — thinner lines collapse in rubber/metal engraving
- **Maximum 5 shapes per SVG** (including border); Maze uses border + 1 path = 2 shapes
- Safe zone: radius 108 for circle, 15px inset for square
- **Minimum 6px gap** between any two strokes — closer lines merge when pressed into rubber
- **No overlapping shapes** — shapes must be nested or clearly separated, never crossing
- **No connecting lines between shapes** — lines from one shape's corner to another's always create X patterns
- All shapes must be closed or clearly bounded
- Only `fill="black"`, `fill="none"`, or `fill="white"` (white only for weave over/under illusions)
- Every design must have a **solid anchor** — a shape with clear visual weight, not just thin rings + floating accent

---

## Absolutely Forbidden Content (NEVER REMOVE A BAN)

| What | Why |
|------|-----|
| Crosshair (lines through center 150,150) | Gun sight |
| Bullseye (concentric rings + centered filled dot) | Weapon target |
| Triangle / pyramid shapes | Masonic/Illuminati symbol |
| Star shapes | Offensive connotation |
| Eye shapes / iris / lens + dot | Eye of Providence — Illuminati |
| Religious symbols (cross, crescent, Star of David, OM, ankh) | Offensive |
| National symbols / flags | Offensive |
| Text, letters, numbers | Not a seal |
| Animals, faces, figures, hands | Not geometric |
| Masonic symbols (compass, pyramid, all-seeing eye) | Offensive |
| X shapes (two diagonal crossing lines) | Cross / weapon sight |
| Standalone open arc as only inner motif | Not stamp-producible |
| Off-center filled dots | Creates eye effect |
| Thin-only compositions (rings + tiny floating element) | Vanishes in rubber |

---

## Allowed SVG Elements Only

```
<circle>  — rings, dots (centered only for fill="black")
<rect>    — squares and rectangles (rotate with transform="rotate(N 150 150)")
<line>    — straight lines (NEVER through center 150,150)
<path>    — arcs (A command), curves (C command), and maze multi-subpaths (M...L)
```

**Banned elements:** `<polygon>`, `<polyline>`, `<ellipse>`

---

## Code Validation (route.ts) — Auto-fallback Triggers

| Check | Detection |
|-------|-----------|
| `<polygon>` / `<polyline>` | Regex match |
| Triangle path | `M L L Z` with 3 vertices |
| Line through center | `segmentPassesThroughCenter()` — proper segment intersection |
| Off-center filled dot | `fill="black"` circle with `dist > 20` and `r < 20` |
| Lollipop (off-center medium circle) | `dist > 35` and `r` 15–80 |
| Bullseye | 2+ concentric rings + centered filled dot |
| 3+ overlapping rotated rects | 3+ `<rect transform="rotate...">` |
| X-shape paths | 2 path segments both passing through center |
| Thin-only composition | 3+ circles, no rect, trivial path (`d.length < 60`) |

---

## Maze Bracket Rules (SVGs 5–6)

**Grid:** 5×5 of 44px cells
**Cell origins:** x ∈ {55, 96, 137, 178, 219} × y ∈ {55, 96, 137, 178, 219}
**Fill:** 19–22 of 25 cells (skip 3–6 for breathing room)
**Bracket size:** 22px span per bracket
**Margin from border:** ~30px white band on all sides (prevents ink bleed)
**Stroke:** `stroke-width="10"` `fill="none"` `stroke-linejoin="round"`

Bracket types:
```
L-open-right:  M cx cy      L cx cy+22    L cx+22 cy+22
L-open-left:   M cx+22 cy   L cx+22 cy+22 L cx cy+22
L-open-up:     M cx cy+22   L cx cy       L cx+22 cy
L-open-down:   M cx cy      L cx+22 cy    L cx+22 cy+22
C-bracket:     M cx+22 cy   L cx cy       L cx cy+22  L cx+22 cy+22
Short dash:    M cx cy+11   L cx+20 cy+11
Tiny L (12px): M cx cy      L cx cy+12    L cx+12 cy+12
```

SVG 6 must differ from SVG 5 in cell selection and orientation mix.

---

## Visual Metaphor Library

### Origin
| Country | Motif |
|---------|-------|
| Morocco | Interlocking octagon grid (Zellige) |
| Poland | Nested diamond + angular folk ornament |
| Israel | Interlaced hexagonal ring |
| Japan | Single bold arc + dot (Ma) |
| Germany | Precision interlocked rectangles |
| Italy | Circular wedge rosette |
| Russia | Bold concentric squares |
| UK/Ireland | Triple arc spiral (Celtic) |
| Greece | Angular meander pattern |
| France | Radial wedge + bold outer ring |
| Spain | 8-segment circle (Mozarab) |
| Turkey | 12-segment concentric ring (Ottoman) |
| Default | Concentric bold rings |

### Occupation
| Role | Motif |
|------|-------|
| Farmer | 8 radiating spokes (harvest wheel, not through center) |
| Carpenter/Builder | Interlocking L-shapes (joinery) |
| Merchant | Two balanced semicircles facing each other |
| Scholar | Nested squares at 45° offset |
| Sailor | Octagon + 4 diagonal lines |
| Engineer | Octagon with flat-cut edges (gear) |
| Musician | 3 concentric arcs on one side |
| Physician | Two circles + bold ring + open top arc |
| Craftsman | Diamond rotated inside ring |
| Blacksmith | Bold pentagon + centered dot |

### Values
| Value | Motif |
|-------|-------|
| Resilience | Concentric rings growing outward |
| Freedom | Open spiral from center |
| Harmony | Two interlocking arcs (lens) |
| Loyalty | Two interlocked rings |
| Wisdom | Hexagon inside hexagon rotated 30° |
| Courage | Bold diamond pointing upward |
| Creativity | Irregular balanced arcs offset from center |
| Justice | Two equal arcs on horizontal axis |
| Prosperity | Expanding octagon rings |
| Community | Three overlapping equal circles |
| Honor | Octagon inside circle + bold ring |
| Truth | Three concentric perfect circles |

---

## Archived Styles (not active — can be re-enabled)

- **Japanese** — max 3 shapes, large empty space, one dominant shape
- **Modern** — 3–4 shapes, perfect symmetry, nested rings/rotated squares
- **Ancient** — 4–5 shapes, layered dense ornament, concentric rings
- **Abstract** — 3–4 shapes, asymmetric balanced, offset arcs/partial rings

To re-enable: uncomment `SECTION_F` styles in `app/lib/seal-prompt.ts` and restore `STYLES` array in `app/page.tsx`.

---

## Cost Reference

| Event | Cost |
|-------|------|
| 1 batch (6 seals) | ~$0.08–0.12 |
| Full session (2 batches) | ~$0.20 max |
| Save to Redis | Free (Upstash free tier) |

---

## Questionnaire (4 steps)

1. `lineageStart` — מהעבר / מהיום
2. `origin` — dropdown + free text, up to 3 countries
3. `occupation` — multiselect up to 3 + free text
4. `values` — multiselect 2–3 values

*(style and shape questions removed — style is free, shape is fixed per column)*

---

## Legal, Privacy & Compliance (PERMANENT — never remove)

### Pages
- **`/terms`** — Terms of Use + Privacy Policy (combined page)
- Link appears in confirmation modal with mandatory consent checkbox

### GDPR & International Privacy Compliance
- **Lawful basis:** Contractual necessity (order fulfilment)
- **Data minimisation:** only name, address, family profile, optional notes collected
- **No third-party sharing** except courier for delivery — explicitly stated in policy
- **No tracking cookies** — only essential session cookie for admin auth
- **No advertising or profiling** — no analytics scripts
- **Retention:** 3 years maximum, then permanent deletion
- **Data subject rights:** access, rectification, erasure, portability, objection — contact hello@sygneo.com
- **Children:** service not directed to under-16s

### Consent
- Confirmation modal requires explicit checkbox: "I have read and agree to Terms of Use & Privacy Policy"
- Checkbox records agreement to: terms, privacy policy, no-ink shipping notice, variable delivery times
- `termsAccepted` state must be `true` before `handleConfirm` can proceed

### Shipping Disclaimer (must always be visible)
- Stamp ships WITHOUT ink — postal/export regulations
- No guaranteed delivery date — postal delays, customs, holidays
- Incorrect address = re-shipping cost on customer

### Security Headers (next.config.ts — never remove)
- `X-Frame-Options: SAMEORIGIN` — prevents clickjacking
- `X-Content-Type-Options: nosniff` — prevents MIME sniffing
- `Strict-Transport-Security` — enforces HTTPS for 2 years
- `Content-Security-Policy` — restricts resource origins
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` — disables camera, mic, geolocation

### Accessibility (WCAG 2.1 AA — maintain always)
- `lang="en"` on `<html>` element
- All interactive elements have accessible labels (`aria-label`, `aria-required`)
- Form fields have associated `<label>` elements
- Color contrast: gold `#8B7355` on white `#FFFFFF` = 3.8:1 (AA for large text)
- All images/SVGs use `dangerouslySetInnerHTML` — add `role="img"` and `aria-label` if SVGs become `<img>` tags
- Keyboard navigation: all buttons and links are natively focusable
- No content relies solely on color to convey meaning
- Error messages are text (not color only)

### Data Storage Security
- Upstash Redis: encrypted at rest + in transit (TLS)
- Vercel hosting: SOC 2 Type II compliant
- Admin routes protected by HMAC session cookie (`app/lib/admin-auth.ts`)
- No sensitive data logged to console in production
