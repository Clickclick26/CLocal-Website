/**
 * Cookie consent gate for clocal.co.uk.
 *
 * Why this exists (14 Sep 2026): the Meta Pixel fired on page load for every
 * visitor with no consent step anywhere on the site, while privacy.html said
 * analytics and marketing cookies run "only with your consent". That was not
 * true, and adding Microsoft Clarity session recording on top would have made
 * it worse. Under UK PECR reg 6 non-essential tracking needs consent BEFORE it
 * runs, not after.
 *
 * So nothing tracking-related loads from the page markup any more. Both the
 * Pixel and Clarity live in here and only start once someone accepts. Decline
 * is a real decline: nothing loads, and we do not ask again.
 *
 * Trade-off Kathryn accepted knowingly: visitors who decline are invisible to
 * Meta, so ad attribution will under-report. That is the correct side to err on.
 */
(function () {
  "use strict";

  var STORE_KEY = "clocal_consent";       // "granted" | "denied"
  var PIXEL_ID = "28558401590434489";
  var CLARITY_ID = "yi96ipan1c";

  /* Which version of the site a recording is of.
     ------------------------------------------------------------------
     Kathryn, 15 Sep 2026: "keep recordings of things even if i change
     the site".

     Recordings themselves are safe already - they live on Clarity's
     servers, not here, so editing or deleting a page cannot remove one.
     The thing that actually gets lost is knowing WHICH page a recording
     shows. A month of recordings spanning three redesigns, all mixed
     together with no way to tell them apart, is data nobody can draw a
     conclusion from: a drop-off looks like a drop-off whether it was
     the old layout or the new one.

     Every session is therefore stamped with this value, and Clarity can
     filter and segment on it. Recordings from before a change stay
     readable as a group, and two versions can be compared instead of
     averaged into mush.

     BUMP THIS whenever the page changes in a way that would alter how
     somebody uses it - a new hero, a moved form, a changed call to
     action. Not for a typo or a colour. Date plus a short slug, so it
     reads in a filter list without a lookup table. Keep the log below;
     it is the only record of what each value meant. */
  var SITE_VERSION = "2026-09-15-film-hero";

  /* Version log, newest first:
     2026-09-15-film-hero  Sales letter replaced the three phone mockups in
                           the hero, hero button became "Join the waitlist"
                           pointing at the form, waitlist moved below the
                           fold on desktop, headings set in Safira March.
     (before this)         Untagged. Anything with no site_version is the
                           three-phone hero with the "How it works" button
                           and the form in the first viewport. */

  function readChoice() {
    try { return window.localStorage.getItem(STORE_KEY); } catch (e) { return null; }
  }
  function writeChoice(v) {
    try { window.localStorage.setItem(STORE_KEY, v); } catch (e) { /* private mode */ }
  }

  function loadMetaPixel() {
    if (window.fbq) return;
    /* eslint-disable */
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
    (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
    window.fbq('init', PIXEL_ID);
    window.fbq('track', 'PageView');
  }

  function loadClarity() {
    if (window.clarity) return;
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.src = "https://www.clarity.ms/tag/" + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, "clarity", "script", CLARITY_ID);

    // Stamp the session. Safe to call immediately: the snippet above defines
    // window.clarity as a queue before the real script arrives, so this is
    // held and replayed rather than lost. Wrapped anyway - a tag blocked by
    // an ad blocker must never take the page down with it.
    try {
      window.clarity("set", "site_version", SITE_VERSION);
    } catch (e) {}
  }

  function startTracking() {
    loadMetaPixel();
    loadClarity();
  }

  // script.js fires a Lead event on signup. It checks window.fbq first, so a
  // declined visitor simply does not report one. Nothing else to guard.
  window.clocalConsent = {
    granted: function () { return readChoice() === "granted"; },
  };

  var choice = readChoice();
  if (choice === "granted") { startTracking(); return; }
  if (choice === "denied") { return; }

  // No choice yet: show the banner once the DOM is ready.
  function showBanner() {
    var bar = document.createElement("div");
    bar.className = "consent-bar";
    bar.setAttribute("role", "dialog");
    bar.setAttribute("aria-live", "polite");
    bar.setAttribute("aria-label", "Cookies");
    bar.innerHTML =
      '<p class="consent-copy">We would like to use analytics cookies to see how this page is used, ' +
      'so we can make it better. Nothing loads unless you say yes. ' +
      '<a href="privacy.html">Privacy policy</a>.</p>' +
      '<div class="consent-actions">' +
      '<button type="button" class="consent-btn consent-no">No thanks</button>' +
      '<button type="button" class="consent-btn consent-yes">Allow</button>' +
      '</div>';
    document.body.appendChild(bar);

    bar.querySelector(".consent-yes").addEventListener("click", function () {
      writeChoice("granted");
      bar.remove();
      startTracking();
    });
    bar.querySelector(".consent-no").addEventListener("click", function () {
      writeChoice("denied");
      bar.remove();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", showBanner);
  } else {
    showBanner();
  }
})();
