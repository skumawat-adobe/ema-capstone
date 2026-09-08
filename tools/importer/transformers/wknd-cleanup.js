/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: WKND site-wide cleanup.
 *
 * Removes non-authorable site chrome (header, footer, mobile nav, tracking
 * iframe) and stray markup so the import contains only page-level authorable
 * content. All selectors below were verified by reading
 * migration-work/cleaned.html for the WKND homepage.
 */

const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

export default function transform(hookName, element, payload) {
  if (hookName === TransformHook.beforeTransform) {
    // Non-authorable UI/tracking that could interfere with block parsing.
    // Verified in cleaned.html:
    //   iframe#destination_publishing_iframe_wkndsite_0 (Adobe ID sync) - line 566
    //   #toggleNav (mobile menu toggle button) - line 568
    //   #mobileNav (mobile navigation overlay) - line 574
    WebImporter.DOMUtils.remove(element, [
      '#destination_publishing_iframe_wkndsite_0',
      '#toggleNav',
      '#mobileNav',
    ]);

    // Category-listing ONLY: the adventures grid is a tabbed set of image-list
    // card panels. Per David's Model it flattens to a single grid — keep the
    // active panel (consumed by the cards-article parser) and drop the inactive
    // category panels + the inert tab-label list, which would otherwise leak as
    // duplicate default-content lists after the cards block.
    //
    // Scope carefully to the CARD tabs only: remove an inactive tabpanel just
    // when it contains an image-list card grid. Adventure-detail also uses tabs
    // (Overview / Itinerary / What to Bring) but those carry content-fragment
    // prose that columns-detail intentionally flattens in full — they must NOT
    // be stripped here.
    const cardTabs = [...element.querySelectorAll('.cmp-tabs')]
      .filter((t) => t.querySelector('.image-list'));
    if (cardTabs.length) {
      cardTabs.forEach((tabs) => {
        tabs.querySelectorAll('.cmp-tabs__tabpanel:not(.cmp-tabs__tabpanel--active)')
          .forEach((p) => p.remove());
        tabs.querySelectorAll('.cmp-tabs__tablist').forEach((ol) => ol.remove());
      });
    }
  }

  if (hookName === TransformHook.afterTransform) {
    // Non-authorable site chrome. Verified in cleaned.html:
    //   header.cmp-experiencefragment--header (sign-in, language nav, main nav, search) - line 5
    //   footer.cmp-experiencefragment--footer (footer nav, social buttons, copyright XF) - line 471
    // Also strip leftover tracking iframes and empty <meta> tags left inside
    // cmp-image wrappers (e.g. lines 183, 204, 227, 271, 334).
    WebImporter.DOMUtils.remove(element, [
      'header',
      'footer',
      'iframe',
      'meta',
    ]);
  }
}
