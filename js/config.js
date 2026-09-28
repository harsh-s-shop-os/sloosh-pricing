/* ============================================================
   PRICING CONFIG — the only file you should need to edit for
   prices, credits, features and copy.

   ⚠ PLACEHOLDERS (inherited from the content prototype):
     - annual prices (15 / 39 / 79)
     - every value in COST (credits per generation)
   Swap in real numbers before this ships.
   ============================================================ */

const COST = {
  img2k: 3,        // one 2K image
  img4k: 6,        // one 4K image
  upscale: 2,
  edit: 2,
  video8: 30,      // one 8-second video
  videoPerSec: 4,  // longer video, per second
};

const PLANS = [
  {
    id: 'creator',
    name: 'Creator',
    for: 'For one person making things.',
    monthly: 19,
    annual: 15,
    per: 'per month',
    perShort: 'month',
    credits: 285,
    creditsLabel: 'credits a month',
    cta: 'Subscribe to Creator',
    href: '/sign-up?redirect=%2Fpricing&plan=creator',
    eyebrow: 'Includes',
    feats: [
      'Unlimited saved canvases',
      'Publish to Spacelab',
      'Up to 2K images, 8-second videos',
      '3 concurrent runs',
      'Credit top-ups',
    ],
    seats: { min: 1, max: 1, default: 1 },
    critters: 'creator',
  },
  {
    id: 'pro',
    name: 'Pro',
    for: 'For teams shipping every week.',
    monthly: 49,
    annual: 39,
    per: 'per seat per month',
    perShort: 'seat / month',
    credits: 735,
    creditsLabel: 'credits per seat',
    cta: 'Subscribe to Pro',
    href: '/sign-up?redirect=%2Fpricing&plan=pro',
    featured: true,
    eyebrow: 'Everything in Creator, and:',
    feats: [
      'Team seats (up to 10)',
      '4K outputs, any video length',
      'Batch up to 50 items',
      'Agent MCP access',
      '6 concurrent runs',
      'Unused credits roll over 3 months',
    ],
    seats: { min: 1, max: 10, default: 1 },
    critters: 'pro',
  },
  {
    id: 'max',
    name: 'Max',
    for: 'For brands running at scale.',
    monthly: 99,
    annual: 79,
    per: 'per seat per month',
    perShort: 'seat / month',
    credits: 1485,
    creditsLabel: 'credits per seat',
    cta: 'Subscribe to Max',
    href: '/sign-up?redirect=%2Fpricing&plan=max',
    eyebrow: 'Everything in Creator, Pro, and:',
    feats: [
      'Batch up to 200 items',
      '12 concurrent runs',
      '2x the credits of Pro per seat',
    ],
    seats: { min: 1, max: 10, default: 1 },
    critters: 'max',
  },
];

const ENTERPRISE = {
  eyebrow: 'Enterprise',
  title: 'Custom pricing',
  body: 'For brands with 11 or more people making content.',
  items: ['11 or more seats', 'Custom credits', 'Single sign-on', 'Invoicing'],
  cta: 'Talk to us',
  href: 'https://shopos.ai/contact-sales',
};

/* What one generation costs, shown next to the calculator. */
const COST_ROWS = [
  { what: '2K image', cost: COST.img2k, icon: 'image' },
  { what: '4K image', cost: COST.img4k, icon: 'image-hd', proOnly: true },
  { what: 'Upscale', cost: COST.upscale, icon: 'upscale' },
  { what: 'Image edit', cost: COST.edit, icon: 'edit' },
  { what: '8-second video', cost: COST.video8, icon: 'video' },
  { what: 'Longer video (per second)', cost: COST.videoPerSec, icon: 'film', proOnly: true },
];

/* Compare table. `null` renders as a dash, `true` as a check. */
const COMPARE = [
  {
    group: 'Credits',
    rows: [
      ['Monthly credits', '285', '735 per seat', '1,485 per seat'],
      ['Credit top-ups', true, true, true],
      ['Unused credits roll over', null, '3 months', '3 months'],
    ],
  },
  {
    group: 'Output',
    rows: [
      ['Max image resolution', '2K', '4K', '4K'],
      ['Max video length', '8 seconds', 'Any length', 'Any length'],
      ['Batch size', null, '50 items', '200 items'],
      ['Concurrent runs', '3', '6', '12'],
    ],
  },
  {
    group: 'Workspace',
    rows: [
      ['Saved canvases', 'Unlimited', 'Unlimited', 'Unlimited'],
      ['Publish to Spacelab', true, true, true],
      ['Team seats', '1', 'Up to 10', 'Up to 10'],
      ['Agent MCP access', null, true, true],
    ],
  },
];

const FAQ = [
  {
    id: 'plans',
    title: 'Plans',
    items: [
      ['Which plan should I pick?', 'Pick Creator if you make content on your own. Pick Pro when a team shares the work or you need 4K, longer video, or batches. Pick Max when you run large batches and many generations at once.'],
      ['What is a concurrent run?', 'A run is one generation in progress. Creator runs three at a time, Pro runs six, Max runs 12. Anything past that waits in a queue and starts as a slot frees up.'],
      ['What does batch mean?', 'Batch runs one workflow across many items at once. Give it 50 products and get 50 sets of images back. Pro batches up to 50 items. Max batches up to 200.'],
      ['What is Agent MCP access?', 'It lets your AI agents use Sloosh directly. Connect Claude or another agent and it can generate, batch and publish work for you. Available on Pro and Max.'],
    ],
  },
  {
    id: 'credits',
    title: 'Credits',
    items: [
      ['How are credits counted?', 'Each generation costs credits. Higher resolution and longer video cost more. You see the cost before you run anything.'],
      ['What happens when I run out?', 'Buy a top-up and keep going. Your plan refills at the start of the next billing month.'],
      ['Do unused credits carry over?', 'On Pro and Max, unused credits roll over for three months. Creator credits reset each month.'],
    ],
  },
  {
    id: 'teams',
    title: 'Teams',
    items: [
      ['How do seats work?', 'Each seat is one person. Every seat brings its own monthly credits. Pro and Max support up to 10 seats. Past 10, talk to us about Enterprise.'],
      ['Do I need Enterprise for single sign-on?', 'Yes. Enterprise adds single sign-on, custom credits and invoicing for teams of 11 or more.'],
    ],
  },
  {
    id: 'billing',
    title: 'Billing',
    items: [
      ['Is annual billing cheaper?', 'Yes. Annual plans cost less per month and are billed once a year.'],
    ],
  },
];

window.PRICING = { COST, PLANS, ENTERPRISE, COST_ROWS, COMPARE, FAQ };
