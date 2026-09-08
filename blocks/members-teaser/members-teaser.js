import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Members-teaser block — locked "Members Only" preview cards. Content-first: the
 * parser emits one row per teaser as [content: title/description/Read More]
 * [image]; this module adds structural classes and turns the bold "Read More"
 * label into a styled (non-navigating) button, matching the locked source.
 * @param {Element} block
 */
export default function decorate(block) {
  const ul = document.createElement('ul');

  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    li.className = 'members-teaser-card';
    while (row.firstElementChild) li.append(row.firstElementChild);

    [...li.children].forEach((cell) => {
      if (cell.querySelector('picture, img')) {
        cell.className = 'members-teaser-card-image';
      } else {
        cell.className = 'members-teaser-card-body';
      }
    });

    // Tag the "Read More" paragraph so CSS can render it as a button.
    const body = li.querySelector('.members-teaser-card-body');
    if (body) {
      const readMore = [...body.querySelectorAll('p')].find((p) => {
        const strong = p.querySelector('strong');
        return strong && /read more/i.test(strong.textContent);
      });
      if (readMore) readMore.className = 'members-teaser-action';
    }

    ul.append(li);
  });

  ul.querySelectorAll('picture > img').forEach((img) => {
    const optimized = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    img.closest('picture').replaceWith(optimized);
  });

  block.textContent = '';
  block.append(ul);
}
