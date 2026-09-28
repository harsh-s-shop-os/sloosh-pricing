// Bundles index.html + css + js + svg assets into one self-contained file:
//   dist/pricing.html  (used for the Claude artifact preview / sharing)
// Usage: node tools/build-single.mjs
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(join(root, p), 'utf8');
const dataUri = p => 'data:image/svg+xml;base64,' + Buffer.from(read(p)).toString('base64');

let html = read('index.html');
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, href) => `<style>\n${read(href)}\n</style>`);
html = html.replace('href="public/favicon/sloosh.svg"', `href="${dataUri('public/favicon/sloosh.svg')}"`);

const assets = {};
for (const f of readdirSync(join(root, 'public/pricing'))) assets[`pricing/${f}`] = dataUri(`public/pricing/${f}`);
const assetScript = `<script>window.PRICING_ASSETS=${JSON.stringify(assets)};</script>`;
html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, src) => `<script>\n${read(src)}\n</script>`);
html = html.replace('<script>', assetScript + '\n<script>');

mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist/pricing.html'), html);
console.log('dist/pricing.html', (html.length / 1024).toFixed(1) + ' KB');
