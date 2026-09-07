// media query match that indicates desktop width
const isDesktop = window.matchMedia('(min-width: 900px)');

/**
 * Collapse the locale country-grid panel.
 * @param {Element} nav
 */
function closeLocale(nav) {
  const toggle = nav.querySelector('.nav-locale-toggle');
  const panel = nav.querySelector('.nav-locale-panel');
  if (toggle) toggle.setAttribute('aria-expanded', 'false');
  if (panel) panel.hidden = true;
}

/**
 * Close the mobile menu and reset the hamburger.
 * @param {Element} nav
 */
function closeMenu(nav) {
  nav.setAttribute('aria-expanded', 'false');
  const button = nav.querySelector('.nav-hamburger button');
  if (button) button.setAttribute('aria-label', 'Open navigation');
  document.body.style.overflowY = '';
}

/**
 * Loads and decorates the header/nav.
 * Content-first: all labels, links, images, and locale entries come from the
 * nav fragment (content/nav.plain.html). This module reads that DOM and adds
 * structure + interactive controls (search input, locale toggle, hamburger).
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  // metadata-independent dual-fetch: /content first (localhost), then root (DA/EDS prod)
  let resp = await fetch('/content/nav.plain.html');
  if (!resp.ok) resp = await fetch('/nav.plain.html');
  if (!resp.ok) return;

  const html = await resp.text();
  const fragment = document.createElement('div');
  fragment.innerHTML = html;

  block.textContent = '';
  const nav = document.createElement('nav');
  nav.id = 'nav';
  while (fragment.firstElementChild) nav.append(fragment.firstElementChild);

  // sections in fragment order: brand, primary nav, locale selector
  if (nav.children[0]) nav.children[0].classList.add('nav-brand');
  if (nav.children[1]) nav.children[1].classList.add('nav-sections');
  if (nav.children[2]) nav.children[2].classList.add('nav-locale');

  // Promote the primary-nav <ul> to a direct child of <nav> (nav > ul > li),
  // matching the source's landmark shape so nav items are recognised as
  // top-level triggers by tooling and assistive tech.
  const sectionsWrap = nav.querySelector('.nav-sections');
  if (sectionsWrap) {
    const list = sectionsWrap.querySelector(':scope > ul');
    if (list) {
      list.classList.add('nav-sections');
      sectionsWrap.replaceWith(list);
    }
  }

  // --- search control (built in JS, not in the fragment) ---
  const search = document.createElement('div');
  search.className = 'nav-search';
  const searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.placeholder = 'Search';
  searchInput.setAttribute('aria-label', 'Search');
  search.append(searchInput);

  // --- locale toggle (reads current locale label + wraps the country grid) ---
  const localeSection = nav.querySelector('.nav-locale');
  if (localeSection) {
    const grid = localeSection.querySelector('ul');
    if (grid) {
      grid.classList.add('nav-locale-panel');
      grid.hidden = true;
    }

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'nav-locale-toggle';
    toggle.textContent = 'en-US';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-haspopup', 'true');
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
      if (grid) grid.hidden = open;
    });
    localeSection.prepend(toggle);
  }

  // --- hamburger for mobile ---
  const hamburger = document.createElement('div');
  hamburger.className = 'nav-hamburger';
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation">
      <span class="nav-hamburger-icon"></span>
    </button>`;
  hamburger.addEventListener('click', () => {
    const expanded = nav.getAttribute('aria-expanded') === 'true';
    nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');
    const button = hamburger.querySelector('button');
    button.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');
    document.body.style.overflowY = expanded || isDesktop.matches ? '' : 'hidden';
  });
  nav.prepend(hamburger);
  nav.setAttribute('aria-expanded', 'false');

  // place search after the brand section
  const brandSection = nav.querySelector('.nav-brand');
  if (brandSection) brandSection.append(search);

  // The utility "Sign In" link renders in the brand row (source shows it as a
  // top utility link); tag it so CSS can position it. "Home" stays as the first
  // primary-nav item. Both come from the fragment (content-first).
  const signIn = brandSection && brandSection.querySelector('a[href="#sign-in"]');
  if (signIn) signIn.closest('p').classList.add('nav-signin');

  // close panels/menu when crossing between mobile and desktop
  isDesktop.addEventListener('change', () => {
    closeMenu(nav);
    closeLocale(nav);
  });

  // close locale panel on outside click / Escape
  document.addEventListener('click', (e) => {
    if (!nav.contains(e.target)) closeLocale(nav);
  });
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') { closeLocale(nav); closeMenu(nav); }
  });

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);
}
