import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Contributors block — a grid of profile cards (circular photo, name, role, and
 * a dark social-icon bar). Content-first: the parser emits one row per person as
 * [image] [h3 name, h5 role, social link paragraphs]; this module only adds
 * structural classes/hooks and renders the social links as CSS-masked glyphs.
 * @param {Element} block
 */
export default function decorate(block) {
  const ul = document.createElement('ul');

  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    li.className = 'contributors-card';
    while (row.firstElementChild) li.append(row.firstElementChild);

    [...li.children].forEach((cell) => {
      if (cell.querySelector('picture, img')) {
        cell.className = 'contributors-card-image';
      } else {
        cell.className = 'contributors-card-body';
      }
    });

    // Group the social link paragraphs into a single icon bar.
    const body = li.querySelector('.contributors-card-body');
    if (body) {
      const socialLinks = [...body.querySelectorAll('p > a')].filter((a) => {
        const label = a.textContent.trim().toLowerCase();
        return ['facebook', 'twitter', 'instagram'].includes(label);
      });
      if (socialLinks.length) {
        const bar = document.createElement('div');
        bar.className = 'contributors-card-social';
        socialLinks.forEach((a) => {
          const network = a.textContent.trim().toLowerCase();
          a.textContent = '';
          a.classList.add('contributors-social-link');
          a.setAttribute('aria-label', network.charAt(0).toUpperCase() + network.slice(1));
          const glyph = document.createElement('span');
          glyph.className = 'contributors-social-icon';
          glyph.setAttribute('aria-hidden', 'true');
          glyph.style.setProperty('--icon', `url("/blocks/footer/icons/${network}.svg")`);
          a.append(glyph);
          bar.append(a);
          const p = a.closest('p');
          if (p && !p.textContent.trim() && p.children.length === 0) p.remove();
        });
        body.append(bar);
      }
    }

    ul.append(li);
  });

  ul.querySelectorAll('picture > img').forEach((img) => {
    const optimized = createOptimizedPicture(img.src, img.alt, false, [{ width: '400' }]);
    img.closest('picture').replaceWith(optimized);
  });

  block.textContent = '';
  block.append(ul);
}
