/* eslint-disable */
/**
 * build-query-index.js
 *
 * Generates a static query-index.json (committed at the repo root, served like
 * head.html) that powers the dynamic cards-article listings. It scans the
 * migrated DETAIL pages under content/{loc}/en/{adventures,magazine}/*.plain.html
 * and reads each page's own Title / Description metadata and first content image,
 * emitting one index row per page. Adventure categories come from ADVENTURE_CATS
 * below (captured from WKND's source category tabs).
 *
 * This is the repo-side stand-in for the EDS indexer normally configured at
 * tools.aem.live. Because it reads the detail pages (not the listing pages), the
 * listings can be dynamic stubs and new detail pages appear automatically on the
 * next run:
 *   node tools/importer/build-query-index.js
 */
import {
  readFileSync, writeFileSync, readdirSync, existsSync,
} from 'fs';
import { resolve, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

// Sections to index, discovered across every locale under content/*/en/. Each
// listing's stub points at its own locale folder, so all locales are indexed.
const SECTION_TYPES = [
  { name: 'adventures', template: 'adventure' },
  { name: 'magazine', template: 'article' },
];

function discoverSections() {
  const contentDir = resolve(ROOT, 'content');
  if (!existsSync(contentDir)) return [];
  const out = [];
  readdirSync(contentDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .forEach((locale) => {
      SECTION_TYPES.forEach(({ name, template }) => {
        const dir = `content/${locale.name}/en/${name}`;
        if (existsSync(resolve(ROOT, dir))) out.push({ dir, template });
      });
    });
  return out;
}

const SECTIONS = discoverSections();

// Adventure → categories, matching WKND's source filter tabs. Keyed by the
// detail-page slug. Adventures with no entry appear only under "All".
const ADVENTURE_CATS = {
  'bali-surf-camp': ['Surfing'],
  'beervana-portland': ['Travel'],
  'climbing-new-zealand': ['Climbing'],
  'colorado-rock-climbing': ['Climbing'],
  'cycling-southern-utah': [],
  'cycling-tuscany': ['Cycling', 'Travel'],
  'downhill-skiing-wyoming': ['Skiing'],
  'gastronomic-marais-tour': ['Travel'],
  'napa-wine-tasting': ['Travel'],
  'riverside-camping-australia': ['Travel'],
  'ski-touring-mont-blanc': ['Skiing'],
  'surf-camp-costa-rica': ['Surfing'],
  'tahoe-skiing': ['Skiing'],
  'west-coast-cycling': ['Cycling'],
  'whistler-mountain-biking': ['Cycling'],
  'yosemite-backpacking': ['Travel'],
};

function text(html) {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

/** Read the value of a metadata row (Title, Description, …) from a plain.html. */
function metaValue(html, key) {
  const re = new RegExp(`<div><div>${key}</div><div>([\\s\\S]*?)</div></div>`, 'i');
  const m = html.match(re);
  return m ? text(m[1]) : '';
}

const data = [];
SECTIONS.forEach(({ dir, template }) => {
  const full = resolve(ROOT, dir);
  if (!existsSync(full)) {
    // eslint-disable-next-line no-console
    console.warn(`skip (missing): ${dir}`);
    return;
  }
  const files = readdirSync(full).filter((f) => f.endsWith('.plain.html'));
  files.forEach((file) => {
    const html = readFileSync(resolve(full, file), 'utf8');
    const slug = basename(file, '.plain.html');
    const title = metaValue(html, 'Title');
    const description = metaValue(html, 'Description');
    const imgMatch = html.match(/<img[^>]*src="([^"]+)"[^>]*>/);
    const image = imgMatch ? imgMatch[1] : '';
    const path = `/${dir.replace('content/', '')}/${slug}`;
    if (!title) return;
    const cats = template === 'adventure' ? (ADVENTURE_CATS[slug] || []) : [];
    data.push({
      path,
      title,
      description,
      image,
      template,
      category: cats.join(', '),
    });
  });
});

// Stable order: by template then title, so the grid is deterministic.
data.sort((a, b) => (a.template === b.template
  ? a.title.localeCompare(b.title)
  : a.template.localeCompare(b.template)));

const index = {
  total: data.length,
  offset: 0,
  limit: data.length,
  data,
  ':type': 'sheet',
};

const out = resolve(ROOT, 'query-index.json');
writeFileSync(out, `${JSON.stringify(index, null, 2)}\n`);
// eslint-disable-next-line no-console
console.log(`wrote ${out} (${data.length} entries)`);
