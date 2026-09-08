import { createOptimizedPicture } from '../../scripts/aem.js';

const CATEGORY_PREFIX = 'wknd-categories:';

/**
 * Pull the category marker (emitted by the import for the Adventures listing)
 * out of a card, returning its categories and removing the sentinel paragraph.
 * Cards without a marker (homepage/magazine) return an empty list.
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
 * Build the category filter tab bar for the Adventures listing and wire it to
 * show/hide cards. Runs only when at least one card carries categories.
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

export default function decorate(block) {
  /* change to ul, li */
  const ul = document.createElement('ul');
  const categorySet = [];

  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) div.className = 'cards-article-card-image';
      else div.className = 'cards-article-card-body';
    });

    // Adventures listing: capture per-card categories for the filter tabs.
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

  // Only the Adventures listing has categories; keep source tab order.
  if (categorySet.length) {
    const order = ['Climbing', 'Cycling', 'Skiing', 'Surfing', 'Travel'];
    const ordered = [
      ...order.filter((c) => categorySet.includes(c)),
      ...categorySet.filter((c) => !order.includes(c)),
    ];
    buildFilter(block, ul, ordered);
  }
}
