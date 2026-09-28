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
| `js/pricing.js` | Renders the page from config: billing toggle, calculator, table, FAQ, critters, logo eyes. |
| `public/` | Critter SVGs and favicon from dev.sloosh.ai. |
| `tools/build-single.mjs` | Inlines everything into `dist/pricing.html`. |

## Placeholders — replace before shipping

- Annual prices: 15 / 39 / 79 (in `js/config.js` → `PLANS[].annual`)
- Credit cost per generation: every value in `COST`

## Fixed vs the live page

- Cards were a fixed 640px tall with dead space; now content-height with a reserved critter zone.
- No plan was recommended; Pro is now the featured plan (badge, yellow CTA, yellow checks).
- Annual toggle showed no saving; now shows −20%, strike-through price, yearly total and saving.
- The credits "i" icon did nothing useful; it now shows what the credits buy.
- Enterprise was a half-width orphan card with lowercase bullets; now a full-width band.
- Mixed title/sentence case ("Talk to Us", "Custom Pricing"); now sentence case throughout.
- Added: credit calculator, cost list, compare table, FAQ, closing CTA.

## Agents only

- Tokens are HSL channel triplets: use `hsl(var(--token))` or `hsl(var(--token) / .5)`.
- Headings are weight 400, system font stack — matches the app. Do not add a display font.
- Critter positions in `js/pricing.js` are copied from the live DOM (`[data-testid^=plan-critters]`).
- `window.PRICING_ASSETS` is only set by the single-file build; otherwise assets load from `public/`.
