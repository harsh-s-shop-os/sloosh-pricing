# Sloosh pricing — prototype

A standalone rebuild of `dev.sloosh.ai/pricing`.
Design system from the live Sloosh app, content from the pricing content prototype.

## Run it

Open `index.html` in a browser, or:

```
npm run dev      # http://localhost:4321
npm run build    # dist/pricing.html — one self-contained file for sharing
```

No framework, no dependencies.

## Where things live

| File | What it is |
| --- | --- |
| `js/config.js` | **All prices, credits, features, compare rows and FAQ copy.** Edit this first. |
| `css/tokens.css` | Sloosh design tokens, copied 1:1 from dev.sloosh.ai (neutral scale, `.dark` theme, yellow, motion). |
| `css/pricing.css` | Page styles. Uses only tokens. |
| `js/pricing.js` | Renders the page from config: billing toggle, calculator, table, FAQ, critters, logo eyes, footer trail. |
| `js/peek.js` | Footer animals: one at a time peeks into the card from a random edge, eyes follow the cursor. |
| `js/image-trail.js` | Cursor image trail in the footer. Vanilla port of the 21st.dev `ImageTrail` React component (same options and defaults). |
| `public/` | Critter SVGs and favicon from dev.sloosh.ai. |
| `tools/build-single.mjs` | Inlines everything into `dist/pricing.html`. |

## Placeholders — replace before shipping

- Annual prices: 15 / 39 / 79 (in `js/config.js` → `PLANS[].annual`)
- Credit cost per generation: every value in `COST`

## Section contrast

Only the backgrounds change. Layout, cards and type sizes are the same on every section.

| Section | Background |
| --- | --- |
| Plans, Enterprise, Compare, Closing | Dark (unchanged) |
| Credits | Full-width yellow band; the calculator card stays dark on it |
| Gallery | Full-width rows of images |
| FAQ | Light band; same cards and layout |

Gallery and plan-card images are Lummi 3D placeholders. Swap them for real Spacelab work before shipping.

## Fixed vs the live page

- Cards were a fixed 640px tall with dead space; now content-height with a reserved critter zone.
- No plan was recommended; Pro is now the featured plan (badge, yellow CTA, yellow checks).
- Annual toggle showed no saving; now shows −20%, strike-through price, yearly total and saving.
- The credits "i" icon did nothing useful; it now shows what the credits buy.
- Enterprise was a half-width orphan card with lowercase bullets; now a full-width band.
- Mixed title/sentence case ("Talk to Us", "Custom Pricing"); now sentence case throughout.
- Added: credit calculator, cost list, compare table, FAQ, closing CTA.

## Agents only

- Light and yellow sections re-map tokens inside the section (`.band-light`, `.band-brand` in `css/pricing.css`). Components need no variants. Do not change layout when changing a section's surface.

- Tokens are HSL channel triplets: use `hsl(var(--token))` or `hsl(var(--token) / .5)`.
- Page and section titles (`.hero h1`, `.block h2`, `.closing h2`) are weight 700, white, 36px (30px on phones), system font stack. The Credits title on the yellow band stays near-black. Plan names (`.plan-title h2`) and the live plan price (`.price-amt`, white) are also 700; the struck-through price (`.price-was`) stays 400 and grey. The calculator credit number (`.calc-big`) and the compare-table plan names (`.compare thead th`, price line stays 400) are also 700. Other headings are weight 400. Do not add a display font.
- Critter positions in `js/pricing.js` are copied from the live DOM (`[data-testid^=plan-critters]`).
- Footer: full-width `<footer>` holds the image trail; the CTA is a centred glass card (`.closing`, 55% card colour + 24px backdrop blur, 96px padding on all sides). Animals come from `js/peek.js`, not the old `#closing-critters` row. Their SVGs are fetched and inlined so pupils can move; opened from disk (file://) the fetch fails and they fall back to still images.
- `window.PRICING_ASSETS` is only set by the single-file build; otherwise assets load from `public/`.
