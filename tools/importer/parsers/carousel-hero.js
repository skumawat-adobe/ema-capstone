/* eslint-disable */
/* global WebImporter */
/**
 * Parser for carousel-hero. Base: carousel.
 * Source: https://wknd.site/us/en.html (.carousel.cmp-carousel--hero)
 * Generated: 2026-09-07
 *
 * Library structure (Carousel): 2 columns, multiple rows. First row = block name.
 * Each subsequent row is a slide: cell 1 = image (mandatory), cell 2 = text content
 * (optional title/description/CTA).
 */
export default function parse(element, { document }) {
  // Each carousel slide is a .cmp-carousel__item wrapping a teaser.
  const slides = Array.from(element.querySelectorAll('.cmp-carousel__item'));

  const cells = [];

  slides.forEach((slide) => {
    // Slide image (first cell)
    const image = slide.querySelector('.cmp-teaser__image img, .cmp-image img, img');

    // Slide text content (second cell)
    const contentCell = [];
    const title = slide.querySelector('.cmp-teaser__title, h1, h2, h3');
    const description = slide.querySelector('.cmp-teaser__description, p');
    const cta = slide.querySelector('.cmp-teaser__action-link, a.button, a');

    if (title) contentCell.push(title);
    if (description) contentCell.push(description);
    if (cta) contentCell.push(cta);

    // Only add a slide row if it has meaningful content
    if (image || contentCell.length) {
      cells.push([image || '', contentCell]);
    }
  });

  // Empty-block guard
  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'carousel-hero', cells });
  element.replaceWith(block);
}
