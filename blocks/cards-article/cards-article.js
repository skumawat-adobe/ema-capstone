import { createOptimizedPicture } from '../../scripts/aem.js';

const CATEGORY_PREFIX = 'wknd-categories:';
const QUERY_INDEX = '/query-index.json';

/**
 * Pull the category marker (emitted by the import for the Adventures listing)
 * out of an authored card, returning its categories and removing the sentinel
 * paragraph. Cards without a marker return an empty list.
 * @param {Element} li
 * @returns {string[]}
 */
function extractCategories(li) {
  const marker = [...li.querySelectorAll('p')]
    .find((p) => p.textContent.trim().toLowerCase().startsWith(CATEGORY_PREFIX));
  if (!marker) return [];
  const cats = marker.textContent.trim().slice(CATEGORY_PREFIX.length).split(',')
    .map((c) => c.trim())
    .filter(Boolean);
  marker.remove();
  return cats;
}

/**
 * Build the category filter tab bar and wire it to show/hide cards. Runs only
 * when at least one card carries categories.
 * @param {Element} block
 * @param {Element} ul
 * @param {string[]} allCategories ordered unique category names
 */
function buildFilter(block, ul, allCategories) {
  const tablist = document.createElement('div');
  tablist.className = 'cards-article-filter';
  tablist.setAttribute('role', 'tablist');

  const labels = ['All', ...allCategories];
  labels.forEach((label, idx) => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'cards-article-filter-tab';
    tab.textContent = label;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', idx === 0 ? 'true' : 'false');
    tab.addEventListener('click', () => {
      tablist.querySelectorAll('.cards-article-filter-tab')
        .forEach((t) => t.setAttribute('aria-selected', t === tab ? 'true' : 'false'));
      ul.querySelectorAll(':scope > li').forEach((li) => {
        const cats = (li.dataset.categories || '').split(',').filter(Boolean);
        const show = label === 'All' || cats.includes(label);
        li.hidden = !show;
      });
    });
    tablist.append(tab);
  });

  block.prepend(tablist);
}

const KNOWN_ORDER = ['Climbing', 'Cycling', 'Skiing', 'Surfing', 'Travel'];

/** Order categories by the source tab order, then any extras alphabetically. */
function orderCategories(set) {
  return [
    ...KNOWN_ORDER.filter((c) => set.includes(c)),
    ...set.filter((c) => !KNOWN_ORDER.includes(c)).sort(),
  ];
}

/**
 * Read a dynamic config from the block. A dynamic listing is authored as a
 * single-cell block whose text holds `key: value` lines, e.g.
 *   source: /us/en/adventures/
 *   filter: adventure
 * Returns null for authored (static) card blocks.
 * @param {Element} block
 */
function readConfig(block) {
  const rows = [...block.children];
  // A static card block's first row has an image cell; a config stub does not.
  if (rows.some((r) => r.querySelector('picture, img'))) return null;
  const cfg = {};
  let sawKey = false;
  rows.forEach((row) => {
    const cells = [...row.children];
    // Two-column config row: key | value.
    if (cells.length >= 2) {
      const key = cells[0].textContent.trim().toLowerCase();
      const value = cells[1].textContent.trim();
      if (/^[a-z-]+$/.test(key) && value) { cfg[key] = value; sawKey = true; }
      return;
    }
    // Single-cell "key: value" row.
    const t = row.textContent.trim();
    const m = t.match(/^([a-z-]+)\s*:\s*(.+)$/i);
    if (m) { cfg[m[1].toLowerCase()] = m[2].trim(); sawKey = true; }
  });
  return sawKey ? cfg : null;
}

/** Build one card <li> from an index entry. */
function cardFromEntry(entry) {
  const li = document.createElement('li');
  if (entry.category) li.dataset.categories = entry.category.split(',').map((c) => c.trim()).join(',');

  const imageCell = document.createElement('div');
  imageCell.className = 'cards-article-card-image';
  if (entry.image) {
    const a = document.createElement('a');
    a.href = entry.path;
    a.append(createOptimizedPicture(entry.image, entry.title, false, [{ width: '750' }]));
    imageCell.append(a);
  }

  const body = document.createElement('div');
  body.className = 'cards-article-card-body';
  const h3 = document.createElement('h3');
  const titleLink = document.createElement('a');
  titleLink.href = entry.path;
  titleLink.textContent = entry.title;
  h3.append(titleLink);
  body.append(h3);
  if (entry.description) {
    const p = document.createElement('p');
    p.textContent = entry.description;
    body.append(p);
  }

  li.append(imageCell, body);
  return li;
}

/** Render a dynamic, query-index-driven listing. */
async function decorateDynamic(block, cfg) {
  const ul = document.createElement('ul');
  block.textContent = '';
  block.append(ul);

  let entries = [];
  try {
    const resp = await fetch(QUERY_INDEX);
    if (resp.ok) {
      const json = await resp.json();
      entries = Array.isArray(json.data) ? json.data : [];
    }
  } catch (e) {
    // Index unavailable — leave the grid empty rather than break the page.
    entries = [];
  }

  const source = (cfg.source || '').replace(/\.html?$/, '');
  const filterTemplate = (cfg.filter || cfg.template || '').toLowerCase();
  entries = entries.filter((e) => {
    if (source && !(e.path || '').startsWith(source)) return false;
    if (filterTemplate && (e.template || '').toLowerCase() !== filterTemplate) return false;
    return true;
  });

  if (cfg.sort === 'title') {
    entries.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  }
  const limit = parseInt(cfg.limit, 10);
  if (!Number.isNaN(limit) && limit > 0) entries = entries.slice(0, limit);

  const categorySet = [];
  entries.forEach((entry) => {
    ul.append(cardFromEntry(entry));
    (entry.category ? entry.category.split(',').map((c) => c.trim()) : [])
      .filter(Boolean)
      .forEach((c) => { if (!categorySet.includes(c)) categorySet.push(c); });
  });

  // Show the category filter when configured and categories exist.
  if (cfg.filters !== 'false' && categorySet.length) {
    buildFilter(block, ul, orderCategories(categorySet));
  }
}

/** Render authored (static) cards — the original behavior. */
function decorateStatic(block) {
  const ul = document.createElement('ul');
  const categorySet = [];

  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) div.className = 'cards-article-card-image';
      else div.className = 'cards-article-card-body';
    });

    const cats = extractCategories(li);
    if (cats.length) {
      li.dataset.categories = cats.join(',');
      cats.forEach((c) => { if (!categorySet.includes(c)) categorySet.push(c); });
    }

    ul.append(li);
  });

  ul.querySelectorAll('picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    img.closest('picture').replaceWith(optimizedPic);
  });

  block.textContent = '';
  block.append(ul);

  if (categorySet.length) buildFilter(block, ul, orderCategories(categorySet));
}

export default function decorate(block) {
  const cfg = readConfig(block);
  if (cfg) return decorateDynamic(block, cfg);
  return decorateStatic(block);
}
