/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import heroBannerParser from './parsers/hero-banner.js';
import cardsArticleParser from './parsers/cards-article.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/wknd-cleanup.js';

// PARSER REGISTRY
const parsers = {
  'hero-banner': heroBannerParser,
  'cards-article': cardsArticleParser,
};

// TRANSFORMER REGISTRY
const transformers = [
  cleanupTransformer,
];

// PAGE TEMPLATE CONFIGURATION (embedded from page-templates.json)
const PAGE_TEMPLATE = {
  name: 'category-listing',
  description: 'Listing page: hero banner + a grid of linked adventure cards (active tab set).',
  urls: [
    'https://wknd.site/ca/en/adventures.html',
    'https://wknd.site/us/en/adventures.html',
  ],
  blocks: [
    { name: 'hero-banner', instances: ['.teaser.cmp-teaser--hero', '.cmp-teaser--hero'] },
    { name: 'cards-article', instances: ['.cmp-tabs__tabpanel--active .image-list.list'] },
  ],
};

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

    executeTransformers('beforeTransform', main, payload);

    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);

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

    executeTransformers('afterTransform', main, payload);

    // Replace the parsed cards-article grid with a DYNAMIC config stub so the
    // listing is driven by query-index.json (source = this listing's folder).
    // The cards-article block reads the stub, fetches the index, and renders +
    // filters cards at runtime.
    const listingPath = new URL(params.originalURL).pathname
      .replace(/\/$/, '')
      .replace(/\.html?$/, '');
    // createBlock emits a <table> whose first row is the block name; find the
    // cards-article table by that header cell.
    const cardsBlock = [...main.querySelectorAll('table')]
      .find((t) => {
        const head = t.querySelector('tr');
        // createBlock humanizes the name: "cards-article" -> "Cards Article".
        return head && /^cards[\s-]article$/i.test(head.textContent.trim());
      });
    if (cardsBlock) {
      const stub = WebImporter.Blocks.createBlock(document, {
        name: 'cards-article',
        cells: [
          ['source', `${listingPath}/`],
          ['filter', 'adventure'],
        ],
      });
      cardsBlock.replaceWith(stub);
    }

    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

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
