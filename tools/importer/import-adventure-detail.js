/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import carouselHeroParser from './parsers/carousel-hero.js';
import columnsDetailParser from './parsers/columns-detail.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/wknd-cleanup.js';

// PARSER REGISTRY
const parsers = {
  'carousel-hero': carouselHeroParser,
  'columns-detail': columnsDetailParser,
};

// TRANSFORMER REGISTRY
const transformers = [
  cleanupTransformer,
];

// Adventure → categories, matching WKND's source filter tabs, keyed by the
// detail-page slug. Emitted as a Category metadata row so the AEM query index
// (and thus the Adventures filter tabs) get each adventure's categories.
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

// PAGE TEMPLATE CONFIGURATION (embedded from page-templates.json)
const PAGE_TEMPLATE = {
  name: 'adventure-detail',
  description: 'Adventure detail: image carousel + two-column spec/itinerary body.',
  urls: [
    'https://wknd.site/us/en/adventures/downhill-skiing-wyoming.html',
  ],
  blocks: [
    { name: 'carousel-hero', instances: ['.carousel.cmp-carousel--mini', '.cmp-carousel--mini', '.carousel.panelcontainer'] },
    { name: 'columns-detail', instances: ['main.cmp-layout-container--fixed .aem-Grid--default--12:has(> .tabs)', '.cmp-layout-container--fixed > .cmp-container > .aem-Grid'] },
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
      let matched;
      try {
        matched = document.querySelectorAll(selector);
      } catch (e) {
        return; // ignore unsupported selectors (e.g. :has in some parsers)
      }
      matched.forEach((element) => {
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

    const hr = document.createElement('hr');
    main.appendChild(hr);
    const metaBlock = WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // Append a Category row (keyed by slug) to the page's Metadata block so each
    // adventure carries its category into the AEM query index that drives the
    // Adventures filter tabs. createMetadata returns the block table; fall back
    // to locating it in the DOM if the return value is unavailable.
    const slug = new URL(params.originalURL).pathname
      .replace(/\/$/, '')
      .replace(/\.html?$/, '')
      .split('/')
      .pop();
    const cats = ADVENTURE_CATS[slug];
    if (cats && cats.length) {
      let table = metaBlock && metaBlock.tagName === 'TABLE' ? metaBlock : null;
      if (!table) {
        table = [...main.querySelectorAll('table')].find((t) => {
          const head = t.querySelector('tr');
          return head && /^metadata$/i.test(head.textContent.trim());
        });
      }
      if (table) {
        const tr = document.createElement('tr');
        const keyCell = document.createElement('td');
        keyCell.textContent = 'Category';
        const valCell = document.createElement('td');
        valCell.textContent = cats.join(', ');
        tr.append(keyCell, valCell);
        (table.querySelector('tbody') || table).appendChild(tr);
      }
    }

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
