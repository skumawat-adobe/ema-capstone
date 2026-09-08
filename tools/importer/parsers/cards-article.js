/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-article. Base: cards.
 * Source: https://wknd.site/us/en.html (.image-list.list)
 * Generated: 2026-09-07
 *
 * Library structure (Cards): 2 columns, multiple rows. First row = block name.
 * Each subsequent row is a card: cell 1 = image (mandatory), cell 2 = text content
 * (title, description, optional CTA).
 */
export default function parse(element, { document }) {
  const items = Array.from(element.querySelectorAll('.cmp-image-list__item, li'));

  const cells = [];

  items.forEach((item) => {
    const image = item.querySelector('.cmp-image-list__item-image img, .cmp-image img, img');

    const contentCell = [];

    // Title: prefer the linked title so the card links to the article.
    const titleLink = item.querySelector('a.cmp-image-list__item-title-link');
    const titleSpan = item.querySelector('.cmp-image-list__item-title');
    if (titleLink && titleSpan) {
      // Preserve the heading semantics with the link.
      const heading = document.createElement('h3');
      const link = document.createElement('a');
      link.href = titleLink.getAttribute('href');
      link.textContent = titleSpan.textContent.trim();
      heading.append(link);
      contentCell.push(heading);
    } else if (titleSpan) {
      const heading = document.createElement('h3');
      heading.textContent = titleSpan.textContent.trim();
      contentCell.push(heading);
    }

    const description = item.querySelector('.cmp-image-list__item-description');
    if (description) contentCell.push(description);

    // Category-listing (Adventures) only: the cleanup transformer stamps each
    // card with its categories (read from the source tab panels). Emit them as a
    // sentinel paragraph the cards-article block reads to build the filter tabs;
    // cards without categories (homepage/magazine) are unaffected.
    const cats = item.getAttribute && item.getAttribute('data-categories');
    if (cats) {
      const p = document.createElement('p');
      p.textContent = `wknd-categories: ${cats}`;
      contentCell.push(p);
    }

    // Only add a card row if it has meaningful content.
    if (image || contentCell.length) {
      cells.push([image || '', contentCell]);
    }
  });

  // Empty-block guard
  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-article', cells });
  element.replaceWith(block);
}
