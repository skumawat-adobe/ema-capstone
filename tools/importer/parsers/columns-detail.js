/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-detail.
 * Base block: columns.
 * Source: https://wknd.site/us/en/adventures/downhill-skiing-wyoming.html (adventure-detail template)
 * Generated: 2026-09-07
 *
 * Two-column adventure-detail body:
 *   - Left  cell: narrow "spec" column (Activity, Adventure Type, Trip Length, Group Size,
 *                 Difficulty, Price) plus the "Share this Adventure" heading and share links.
 *   - Right cell: wide content column. Source is a tabs component (Overview / Itinerary /
 *                 What to Bring). Per David's Model, EDS blocks do not nest, so the tabbed
 *                 content is FLATTENED into sequential content (a heading per tab followed by
 *                 the tab's headings, prose, lists and images) within a single cell.
 */
export default function parse(element, { document }) {
  // Scope the two source regions. The block element is the 12-col grid that wraps the
  // <main> spec column and the .tabs content column.
  const specColumn = element.querySelector('main') || element;
  const tabsColumn = element.querySelector('.tabs') || element;

  // Structural detection. instances[] in page-templates.json includes a broad fallback
  // selector that can falsely match unrelated grids (e.g. the site footer) on some pages.
  // Only treat this element as a columns-detail block when the spec dl and/or tabbed
  // content are actually present; otherwise bail via the empty-block guard below.
  const specElements = specColumn.querySelectorAll('.cmp-contentfragment__element');
  const tabPanels = tabsColumn.querySelectorAll('.cmp-tabs__tabpanel');
  if (specElements.length === 0 && tabPanels.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  // ---- LEFT CELL: spec column ------------------------------------------------------------
  const leftCell = [];

  // Definition-list style spec elements (dt/dd pairs). Singular class ".cmp-contentfragment__element"
  // only exists in the spec dl (tab panels use the plural "__elements" wrapper).
  specElements.forEach((el) => {
    const title = el.querySelector('.cmp-contentfragment__element-title');
    const value = el.querySelector('.cmp-contentfragment__element-value');
    const titleText = title ? title.textContent.trim() : '';
    const valueText = value ? value.textContent.trim() : '';
    if (!titleText && !valueText) return;
    const p = document.createElement('p');
    if (titleText) {
      const strong = document.createElement('strong');
      strong.textContent = titleText;
      p.appendChild(strong);
      p.appendChild(document.createTextNode(`: ${valueText}`));
    } else {
      p.textContent = valueText;
    }
    leftCell.push(p);
  });

  // "Share this Adventure" heading.
  const shareHeading = specColumn.querySelector('.title .cmp-title__text');
  if (shareHeading && shareHeading.textContent.trim()) leftCell.push(shareHeading);

  // Share links (Facebook/Pinterest). Anchors may have empty text in source; use href as label.
  const shareLinks = specColumn.querySelectorAll('.sharing a[href]');
  shareLinks.forEach((a) => {
    const href = a.getAttribute('href');
    if (!href) return;
    if (!a.textContent.trim()) a.textContent = href;
    leftCell.push(a);
  });

  // ---- RIGHT CELL: flattened tabbed content ----------------------------------------------
  const rightCell = [];

  const tabLabels = tabsColumn.querySelectorAll('.cmp-tabs__tab');
  const panels = tabsColumn.querySelectorAll('.cmp-tabs__tabpanel');
  panels.forEach((panel, i) => {
    // Section heading = the tab's label (Overview / Itinerary / What to Bring).
    const label = tabLabels[i] ? tabLabels[i].textContent.trim() : '';
    if (label) {
      const heading = document.createElement('h2');
      heading.textContent = label;
      rightCell.push(heading);
    }

    // Extract meaningful content in document order. The repeated content-fragment title is an
    // <h3> (".cmp-contentfragment__title") and is excluded by selecting only h2/p/ul/ol/img.
    const nodes = panel.querySelectorAll('h2, h3.cmp-contentfragment__title, p, ul, ol, img');
    nodes.forEach((node) => {
      // Skip the redundant, repeated content-fragment title.
      if (node.classList && node.classList.contains('cmp-contentfragment__title')) return;
      if (node.tagName === 'IMG') {
        rightCell.push(node);
        return;
      }
      // Skip empty text nodes.
      if (!node.textContent.trim()) return;
      rightCell.push(node);
    });
  });

  // ---- Empty-block guard -----------------------------------------------------------------
  if (leftCell.length === 0 && rightCell.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  // ---- Build cells: single content row, two columns (spec | flattened content) -----------
  const cells = [];
  cells.push([leftCell, rightCell]);

  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-detail', cells });
  element.replaceWith(block);
}
