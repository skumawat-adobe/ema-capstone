/**
 * Loads and decorates the footer.
 * Content-first: all copy, links and images come from the footer fragment
 * (content/footer.plain.html). This module only reads that DOM and adds
 * structural classes/hooks — it never hardcodes footer copy.
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  // metadata-independent dual-fetch: /content first (localhost), then root (DA/EDS prod)
  let resp = await fetch('/content/footer.plain.html');
  if (!resp.ok) resp = await fetch('/footer.plain.html');
  if (!resp.ok) return;

  const html = await resp.text();
  const container = document.createElement('div');
  container.innerHTML = html;

  const section = container.querySelector(':scope > div') || container;
  section.classList.add('footer-content');

  // first list = footer navigation, second list = social links
  const lists = section.querySelectorAll(':scope > ul');
  if (lists[0]) lists[0].classList.add('footer-nav');
  if (lists[1]) {
    const social = lists[1];
    social.classList.add('footer-social');
    // Render social icons as CSS-masked glyphs (matching the source's icon font)
    // so the rendered footer has a single logo image. The icon source stays in
    // the fragment (content-first) and drives the mask — no hardcoded copy.
    social.querySelectorAll('a img').forEach((img) => {
      const link = img.closest('a');
      // resolve to an absolute URL so the CSS mask works regardless of stylesheet location
      const src = img.currentSrc || img.src || img.getAttribute('src');
      const alt = (img.getAttribute('alt') || '').trim();
      const glyph = document.createElement('span');
      glyph.className = 'footer-social-icon';
      glyph.setAttribute('aria-hidden', 'true');
      if (src) glyph.style.setProperty('--icon', `url("${src}")`);
      img.replaceWith(glyph);
      if (!link.getAttribute('aria-label')) link.setAttribute('aria-label', alt);
    });
  }

  // brand logo (first paragraph holding an image link)
  const logoImg = section.querySelector(':scope > p a img');
  if (logoImg) logoImg.closest('p').classList.add('footer-brand');

  // legal / attribution paragraphs (text paragraphs, not the brand logo)
  section.querySelectorAll(':scope > p').forEach((p) => {
    if (!p.classList.contains('footer-brand')) p.classList.add('footer-legal');
  });

  block.textContent = '';
  block.append(section);
}
