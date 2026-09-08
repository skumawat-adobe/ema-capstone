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
 * nav fragment (content/nav.plain.html). This module reads that DOM and builds
 * a two-tier header — a dark utility bar (Sign In + locale) above a white main
 * bar (logo, primary nav, search) — matching the WKND source.
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

  // fragment sections, in order: brand (logo + Sign In), primary nav, locale selector
  const brandSection = nav.children[0];
  const navSection = nav.children[1];
  const localeSection = nav.children[2];
  if (brandSection) brandSection.classList.add('nav-brand');
  if (navSection) navSection.classList.add('nav-sections');
  if (localeSection) localeSection.classList.add('nav-locale');

  // Promote the primary-nav <ul> to a direct child (nav > ul > li landmark shape)
  if (navSection) {
    const list = navSection.querySelector(':scope > ul');
    if (list) {
      list.classList.add('nav-sections');
      navSection.replaceWith(list);
    }
  }
  const navList = nav.querySelector('ul.nav-sections');

  // search control (built in JS, not in the fragment)
  const search = document.createElement('div');
  search.className = 'nav-search';
  const searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.placeholder = 'Search';
  searchInput.setAttribute('aria-label', 'Search');
  search.append(searchInput);

  // locale toggle (reads current locale label + wraps the country grid)
  if (localeSection) {
    const grid = localeSection.querySelector('ul');
    if (grid) {
      grid.classList.add('nav-locale-panel');
      grid.hidden = true;
      // Tag each country row with a flag class (matched by country name) so CSS
      // can render the corresponding flag icon, matching the source panel.
      const flags = {
        'united states': 'us',
        canada: 'ca',
        switzerland: 'ch',
        germany: 'de',
        france: 'fr',
        spain: 'es',
        italy: 'it',
      };
      grid.querySelectorAll(':scope > li').forEach((li) => {
        const label = li.querySelector('p, span, strong');
        const name = (label ? label.textContent : li.textContent).trim().toLowerCase();
        const code = flags[name];
        if (code) li.classList.add('nav-locale-country', `nav-locale-country-${code}`);
      });
    }
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'nav-locale-toggle';
    toggle.innerHTML = '<span class="nav-locale-flag"></span><span class="nav-locale-label">EN-US</span>';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-haspopup', 'true');
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
      if (grid) grid.hidden = open;
    });
    localeSection.prepend(toggle);
  }

  // Sign In utility link (pull it out of the brand section). Match by link text
  // rather than href — the published fragment rewrites the source '#sign-in'
  // anchor to '/', so an href selector would miss it.
  let signInWrap = null;
  const signIn = brandSection
    && [...brandSection.querySelectorAll('a')].find((a) => a.textContent.trim().toLowerCase() === 'sign in');
  if (signIn) {
    signInWrap = signIn.closest('p') || signIn;
    signInWrap.classList.add('nav-signin');
  }

  // Hide the redundant first "Home" nav item (logo already links home). Tag it
  // by text so CSS hides it regardless of how the href is rewritten on publish.
  if (navList) {
    const homeItem = [...navList.querySelectorAll(':scope > li')]
      .find((li) => li.textContent.trim().toLowerCase() === 'home');
    if (homeItem) homeItem.classList.add('nav-home-hidden');
  }

  // hamburger for mobile
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

  // --- assemble two tiers ---
  // Tier 1: dark utility bar (Sign In + locale), right-aligned
  const utilityBar = document.createElement('div');
  utilityBar.className = 'nav-utility';
  if (signInWrap) utilityBar.append(signInWrap);
  if (localeSection) utilityBar.append(localeSection);

  // Tier 2: white main bar (hamburger + logo + nav + search)
  const mainBar = document.createElement('div');
  mainBar.className = 'nav-main';
  mainBar.append(hamburger);
  if (brandSection) mainBar.append(brandSection);
  if (navList) mainBar.append(navList);
  mainBar.append(search);

  nav.textContent = '';
  nav.append(utilityBar, mainBar);
  nav.setAttribute('aria-expanded', 'false');

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
