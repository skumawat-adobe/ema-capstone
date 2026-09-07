/* eslint-disable */
/* global WebImporter */
/**
 * Parser for accordion-faq. Base: accordion.
 * Source: WKND faq template (AEM .cmp-accordion component).
 * Generated: 2026-09-07
 *
 * Block table: 2 columns. First row is the block name.
 * Each subsequent row is one accordion item:
 *   cell 1 = question (title text), cell 2 = answer (panel content).
 */
export default function parse(element, { document }) {
  // Each accordion item holds a header (button/title) and a panel (answer content).
  const items = element.querySelectorAll('.cmp-accordion__item');

  const cells = [];

  items.forEach((item) => {
    // Question: title span, then button, then header as fallbacks.
    const titleEl = item.querySelector(
      '.cmp-accordion__title, .cmp-accordion__button, .cmp-accordion__header',
    );

    // Answer: prefer the inner text component content, then the panel container.
    const answerEl = item.querySelector(
      '.cmp-accordion__panel .cmp-text, .cmp-accordion__panel .cmp-container, .cmp-accordion__panel',
    );

    // Skip items with no title and no content.
    if (!titleEl && !answerEl) return;

    const titleCell = titleEl ? titleEl.textContent.trim() : '';

    // Collect the answer's meaningful child elements; fall back to the element itself.
    let contentCell;
    if (answerEl) {
      const children = Array.from(answerEl.children);
      contentCell = children.length ? children : [answerEl];
    } else {
      contentCell = '';
    }

    cells.push([titleCell, contentCell]);
  });

  // Empty-block guard: nothing extracted, leave content in place.
  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, {
    name: 'accordion-faq',
    cells,
  });
  element.replaceWith(block);
}
