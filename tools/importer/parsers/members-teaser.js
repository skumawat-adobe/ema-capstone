/* eslint-disable */
/* global WebImporter */
/**
 * Parser for members-teaser. Base block: members-teaser (custom).
 * Source: https://wknd.site/us/en/magazine.html (.teaser.cmp-teaser--secure)
 * Generated: 2026-09-08
 *
 * The Magazine "Members Only" section holds locked teaser cards, each a
 * `.cmp-teaser--secure` containing:
 *   - .cmp-teaser__title            -> title (h2)
 *   - .cmp-teaser__description      -> description (p)
 *   - .cmp-teaser__action-container -> "Read More" (plain text; content is
 *                                      locked so there is no destination href)
 *   - .cmp-teaser__image img        -> preview image
 *
 * The secure teasers are siblings. This parser is passed the FIRST secure teaser
 * of the run; it consumes that teaser and all consecutive secure siblings into a
 * single block (one row per teaser) so they render as a card grid.
 */
export default function parse(element, { document }) {
  const isSecure = (el) => el
    && el.nodeType === 1
    && el.matches('.cmp-teaser--secure, .teaser.cmp-teaser--secure');

  // Only act on the first secure teaser of a run.
  let prev = element.previousElementSibling;
  while (prev && prev.nodeType === 1 && !prev.textContent.trim() && !isSecure(prev)) {
    prev = prev.previousElementSibling;
  }
  if (isSecure(prev)) return;

  const teasers = [];
  let node = element;
  while (node) {
    if (isSecure(node)) {
      teasers.push(node);
    } else if (node.nodeType === 1 && node.textContent.trim()) {
      break;
    }
    node = node.nextElementSibling;
  }
  if (!teasers.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];

  teasers.forEach((teaser) => {
    const img = teaser.querySelector('.cmp-teaser__image img, .cmp-image img, img');

    const content = [];

    const title = teaser.querySelector('.cmp-teaser__title');
    if (title && title.textContent.trim()) {
      const h = document.createElement('h2');
      h.textContent = title.textContent.trim();
      content.push(h);
    }

    const description = teaser.querySelector('.cmp-teaser__description');
    if (description && description.textContent.trim()) {
      const p = document.createElement('p');
      p.textContent = description.textContent.trim();
      content.push(p);
    }

    // "Read More" call to action. The source content is locked (no destination),
    // so emit the label as a bold paragraph the block styles as a button.
    const action = teaser.querySelector('.cmp-teaser__action-container, .cmp-teaser__action-link');
    const actionText = action ? action.textContent.trim() : '';
    if (actionText) {
      const p = document.createElement('p');
      const strong = document.createElement('strong');
      strong.textContent = actionText;
      p.appendChild(strong);
      content.push(p);
    }

    cells.push([content, img || '']);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'members-teaser', cells });
  element.replaceWith(block);
  teasers.slice(1).forEach((t) => t.remove());
}
