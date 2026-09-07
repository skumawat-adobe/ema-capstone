/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-featured. Base: columns.
 * Source: https://wknd.site/us/en.html (.teaser.cmp-teaser--featured)
 * Generated: 2026-09-07
 *
 * Library structure (Columns): multiple columns/rows. First row = block name.
 * Content is grouped into columns based on natural visual grouping.
 * Featured teaser = 2 columns: [text content (pretitle, title, description, CTA)] | [image].
 */
export default function parse(element, { document }) {
  const image = element.querySelector('.cmp-teaser__image img, .cmp-image img, img');

  const pretitle = element.querySelector('.cmp-teaser__pretitle');
  const title = element.querySelector('.cmp-teaser__title, h1, h2, h3');
  const description = element.querySelector('.cmp-teaser__description, p:not(.cmp-teaser__pretitle)');
  const cta = element.querySelector('.cmp-teaser__action-link, a.button, a');

  const textCell = [];
  if (pretitle) textCell.push(pretitle);
  if (title) textCell.push(title);
  if (description) textCell.push(description);
  if (cta) textCell.push(cta);

  // Empty-block guard
  if (!textCell.length && !image) {
    element.replaceWith(...element.childNodes);
    return;
  }

  // Single 2-column row: text content | image
  const cells = [[textCell, image || '']];

  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-featured', cells });
  element.replaceWith(block);
}
