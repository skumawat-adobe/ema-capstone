/* eslint-disable */
/* global WebImporter */
/**
 * Parser for contributors. Base block: contributors (custom).
 * Source: https://wknd.site/us/en/about-us.html
 * Generated: 2026-09-08
 *
 * Each contributor is a `<section class="cmp-experience-fragment--contributor">`
 * containing:
 *   - .image img            -> circular profile photo
 *   - .title h3             -> name
 *   - .title h5             -> role line (e.g. "Artist | Photographer | Traveler")
 *   - .buildingblock a.cmp-button (x3) -> Facebook / Twitter / Instagram links,
 *     labelled by the trailing .cmp-button__text span.
 *
 * The section elements are siblings that follow each intro heading ("Our
 * Contributors", "WKND Guides"). One parser invocation is passed the FIRST
 * contributor section of a group; it consumes that section and all immediately
 * following contributor siblings into a single block (one row per contributor),
 * so each heading gets its own card grid.
 */
export default function parse(element, { document }) {
  const isContributor = (el) => el
    && el.nodeType === 1
    && el.matches('.cmp-experience-fragment--contributor, .experiencefragment.cmp-experience-fragment--contributor');

  // Only act on the first contributor of a run; skip if the previous sibling is
  // also a contributor (it was already consumed by the earlier invocation).
  let prev = element.previousElementSibling;
  while (prev && prev.nodeType === 1 && !prev.textContent.trim() && !isContributor(prev)) {
    prev = prev.previousElementSibling;
  }
  if (isContributor(prev)) return;

  // Gather this contributor and the consecutive contributor siblings.
  const sections = [];
  let node = element;
  while (node) {
    if (isContributor(node)) {
      sections.push(node);
    } else if (node.nodeType === 1 && node.textContent.trim()) {
      break; // a non-contributor element ends the run
    }
    node = node.nextElementSibling;
  }
  if (!sections.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];

  sections.forEach((section) => {
    const img = section.querySelector('.image img, .cmp-image img, img');

    const name = section.querySelector('.title:not(.cmp-title--black) .cmp-title__text, .title h3, h3');
    const role = section.querySelector('.title.cmp-title--black .cmp-title__text, .title h5, h5');

    const content = [];
    if (name && name.textContent.trim()) {
      const h = document.createElement('h3');
      h.textContent = name.textContent.trim();
      content.push(h);
    }
    if (role && role.textContent.trim()) {
      const h = document.createElement('h5');
      h.textContent = role.textContent.trim();
      content.push(h);
    }

    // Social links: rebuild fresh anchors labelled by network (icon-only source
    // buttons have separate .cmp-button__text for the name).
    section.querySelectorAll('.buildingblock a[href], a.cmp-button[href]').forEach((a) => {
      const href = a.getAttribute('href');
      if (!href) return;
      const iconSpan = a.querySelector('[class*="cmp-button__icon--"]');
      let label = '';
      if (iconSpan) {
        const m = [...iconSpan.classList].find((c) => c.startsWith('cmp-button__icon--'));
        if (m) label = m.replace('cmp-button__icon--', '');
      }
      if (!label) {
        const txt = a.querySelector('.cmp-button__text');
        label = (txt ? txt.textContent : a.textContent).trim();
      }
      if (!label) label = (a.getAttribute('aria-label') || '').split(' ')[0];
      label = label.charAt(0).toUpperCase() + label.slice(1);
      const p = document.createElement('p');
      const link = document.createElement('a');
      link.setAttribute('href', href);
      link.textContent = label;
      p.appendChild(link);
      content.push(p);
    });

    cells.push([img || '', content]);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'contributors', cells });
  // Replace the first section with the block, and remove the rest.
  element.replaceWith(block);
  sections.slice(1).forEach((s) => s.remove());
}
