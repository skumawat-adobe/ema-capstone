/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import carouselHeroParser from './parsers/carousel-hero.js';
import columnsFeaturedParser from './parsers/columns-featured.js';
import cardsArticleParser from './parsers/cards-article.js';
import heroBannerParser from './parsers/hero-banner.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/wknd-cleanup.js';

// PARSER REGISTRY
const parsers = {
  'carousel-hero': carouselHeroParser,
  'columns-featured': columnsFeaturedParser,
  'cards-article': cardsArticleParser,
  'hero-banner': heroBannerParser,
};

// TRANSFORMER REGISTRY
const transformers = [
  cleanupTransformer,
];

// PAGE TEMPLATE CONFIGURATION (embedded from page-templates.json)
const PAGE_TEMPLATE = {
  name: 'homepage',
  description: 'Locale landing page: full-width carousel, stacked hero banners and a cards feature grid.',
  urls: [
    'https://wknd.site/ca/en.html',
    'https://wknd.site/ca/fr.html',
    'https://wknd.site/ch/de.html',
    'https://wknd.site/ch/fr.html',
    'https://wknd.site/ch/it.html',
    'https://wknd.site/de/de.html',
    'https://wknd.site/es/es.html',
    'https://wknd.site/fr/fr.html',
    'https://wknd.site/it/it.html',
    'https://wknd.site/us/en.html',
    'https://wknd.site/us/es.html',
  ],
  blocks: [
    { name: 'carousel-hero', instances: ['.carousel.cmp-carousel--hero', '.cmp-carousel--hero'] },
    { name: 'columns-featured', instances: ['.teaser.cmp-teaser--featured', '.cmp-teaser--featured'] },
    { name: 'cards-article', instances: ['.image-list.list'] },
    { name: 'hero-banner', instances: ['.teaser.cmp-teaser--hero.cmp-teaser--imagebottom', '.cmp-teaser--hero.cmp-teaser--imagebottom'] },
  ],
};

/**
 * Execute all page transformers for a specific hook.
 * @param {string} hookName 'beforeTransform' | 'afterTransform'
 * @param {Element} element DOM element to transform
 * @param {Object} payload { document, url, html, params }
 */
function executeTransformers(hookName, element, payload) {
  const enhancedPayload = { ...payload, template: PAGE_TEMPLATE };
  transformers.forEach((transformerFn) => {
    try {
      transformerFn.call(null, hookName, element, enhancedPayload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

/**
 * Find all blocks on the page based on the embedded template configuration.
 * De-duplicates elements matched by multiple selectors.
 */
function findBlocksOnPage(document, template) {
  const pageBlocks = [];
  const seen = new Set();
  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      document.querySelectorAll(selector).forEach((element) => {
        if (seen.has(element)) return;
        seen.add(element);
        pageBlocks.push({ name: blockDef.name, selector, element });
      });
    });
  });
  return pageBlocks;
}

export default {
  transform: (payload) => {
    const {
      document, url, html, params,
    } = payload;

    const main = document.body;

    // 1. beforeTransform cleanup
    executeTransformers('beforeTransform', main, payload);

    // 2. find blocks on page
    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);

    // 3. parse each block (skip elements already replaced by a prior parser)
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return;
      const parser = parsers[block.name];
      if (parser) {
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      } else {
        console.warn(`No parser found for block: ${block.name}`);
      }
    });

    // 4. afterTransform cleanup
    executeTransformers('afterTransform', main, payload);

    // 4b. Replace each curated cards-article grid with a DYNAMIC config stub so
    // the homepage grids are query-index driven (first N from the index). The
    // homepage has two grids — "Recent Articles" (magazine) and "Where do you
    // want to go?" (adventures) — told apart by the detail links inside each.
    // Curated homepage grids show a small fixed count and no category filter.
    // Homepage path e.g. /us/en(.html) → locale prefix /us/en/. The homepage is
    // the locale root, so its own path IS the locale folder.
    const localePrefix = `${new URL(params.originalURL).pathname
      .replace(/\.html?$/, '')
      .replace(/\/+$/, '')}/`;
    [...main.querySelectorAll('table')]
      .filter((t) => {
        const head = t.querySelector('tr');
        return head && /^cards[\s-]article$/i.test(head.textContent.trim());
      })
      .forEach((table) => {
        const links = [...table.querySelectorAll('a[href]')].map((a) => a.getAttribute('href') || '');
        const isMagazine = links.some((h) => /\/magazine\//.test(h));
        const isAdventures = links.some((h) => /\/adventures\//.test(h));
        // Ambiguous/empty grids are left untouched.
        if (!isMagazine && !isAdventures) return;
        const filter = isMagazine ? 'article' : 'adventure';
        const stub = WebImporter.Blocks.createBlock(document, {
          name: 'cards-article',
          cells: [
            ['source', `${localePrefix}/`],
            ['filter', filter],
            ['limit', '4'],
            ['filters', 'false'],
          ],
        });
        table.replaceWith(stub);
      });

    // 5. WebImporter built-in rules
    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 6. sanitized path (root/homepage → /index to avoid empty-path crash)
    const rawPath = new URL(params.originalURL).pathname
      .replace(/\/$/, '')
      .replace(/\.html?$/, '');
    const path = WebImporter.FileUtils.sanitizePath(rawPath === '' ? '/index' : rawPath);

    return [{
      element: main,
      path,
      report: {
        title: document.title,
        template: PAGE_TEMPLATE.name,
        blocks: pageBlocks.map((b) => b.name),
      },
    }];
  },
};
