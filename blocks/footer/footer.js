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
  if (lists[0]) {
    lists[0].classList.add('footer-nav');
    // Source footer nav omits the redundant "Home" item (logo links home). Match
    // by text so it works regardless of how the fragment rewrites the href.
    const homeItem = [...lists[0].querySelectorAll(':scope > li')]
      .find((li) => li.textContent.trim().toLowerCase() === 'home');
    if (homeItem) homeItem.remove();
  }
  if (lists[1]) {
    const social = lists[1];
    social.classList.add('footer-social');
    // Render social icons as CSS-masked glyphs (matching the source's icon font)
    // so the rendered footer has a single logo image. The icon source stays in
    // the fragment (content-first) and drives the mask — no hardcoded copy.
    social.querySelectorAll('a img').forEach((img) => {
      const link = img.closest('a');
      const alt = (img.getAttribute('alt') || '').trim();
      // Prefer a repo-committed icon keyed by the network (facebook/twitter/instagram)
      // so the glyph renders on the deployed site — the fragment's images/*.svg live
      // in DA content and are not published, so they 404 in production. Fall back to
      // the fragment src for any unrecognized network.
      const hint = `${alt} ${link.getAttribute('href') || ''} ${img.getAttribute('src') || ''}`.toLowerCase();
      const network = ['facebook', 'twitter', 'instagram'].find((n) => hint.includes(n));
      const src = network
        ? `/blocks/footer/icons/${network}.svg`
        : (img.currentSrc || img.src || img.getAttribute('src'));
      const glyph = document.createElement('span');
      glyph.className = 'footer-social-icon';
      glyph.setAttribute('aria-hidden', 'true');
      if (src) glyph.style.setProperty('--icon', `url("${src}")`);
      img.replaceWith(glyph);
      if (!link.getAttribute('aria-label')) link.setAttribute('aria-label', alt);
    });
  }

  // brand logo (first paragraph holding an image link). Point at the repo-committed
  // light logo — the fragment's images/wknd-logo-light.svg lives in DA content and is
  // not published, so it 404s (broken image) in production.
  const logoImg = section.querySelector(':scope > p a img');
  if (logoImg) {
    logoImg.closest('p').classList.add('footer-brand');
    logoImg.setAttribute('src', '/blocks/footer/icons/wknd-logo-light.svg');
    logoImg.removeAttribute('srcset');
  }

  // legal / attribution paragraphs (text paragraphs, not the brand logo)
  section.querySelectorAll(':scope > p').forEach((p) => {
    if (!p.classList.contains('footer-brand')) p.classList.add('footer-legal');
  });

  // Group "Follow Us" heading + social list so they sit together on the right.
  const followHeading = section.querySelector(':scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6');
  const socialList = section.querySelector(':scope > ul.footer-social');
  if (socialList) {
    const follow = document.createElement('div');
    follow.className = 'footer-follow';
    section.insertBefore(follow, followHeading || socialList);
    if (followHeading) follow.append(followHeading);
    follow.append(socialList);
  }

  // Group the top row (brand + nav + follow) so legal copy can span full width below.
  const brand = section.querySelector(':scope > .footer-brand');
  const nav = section.querySelector(':scope > ul.footer-nav');
  const follow = section.querySelector(':scope > .footer-follow');
  if (brand || nav || follow) {
    const top = document.createElement('div');
    top.className = 'footer-top';
    section.insertBefore(top, brand || nav || follow);
    [brand, nav, follow].forEach((el) => { if (el) top.append(el); });
  }

  block.textContent = '';
  block.append(section);
}
