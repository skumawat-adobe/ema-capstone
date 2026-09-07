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
