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
 * So nothing tracking-related loads from the page markup any more. The Pixel,
 * Clarity and PostHog live in here and only start once someone accepts. Decline
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

  /* PostHog product analytics (added 17 Oct 2026).
     ------------------------------------------------------------------
     Clarity shows how one visitor moved around a page. It cannot answer
     "of everyone who landed, how many pressed Join, started the form, and
     finished it", which is the funnel the waitlist actually lives or dies
     on. PostHog does that, from four events: $pageview (automatic),
     waitlist_cta_clicked, waitlist_form_started and waitlist_signup (all
     fired from script.js).

     The project key is a public, client-side key by design (phc_...), so
     it is safe in page source. Leave it blank and PostHog simply never
     loads. EU cloud, because every visitor here is in the UK.

     Same consent gate as the Pixel and Clarity: nothing loads until
     someone presses Allow. No names, emails or postcodes are ever sent,
     only which roles were ticked, whether a postcode was given, and the
     campaign tags. Session recording stays off; Clarity already does
     that job. */
  var POSTHOG_KEY = "phc_BnLwDfTazgmgevJCQZnWebz47CLmKTmZHF7DGmnfzZ73";
  var POSTHOG_HOST = "https://eu.i.posthog.com";

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

  /* Never track a local preview.
     ------------------------------------------------------------------
     15 Sep 2026: Clarity had 24 sessions and 21 of them were
     http://localhost/index.html - a day of my own testing against a
     dev server, recorded into the real project and drowning the three
     genuine visits. Scroll depth and time-on-page were averages of a
     robot reloading a page, which is worse than having no numbers,
     because it looks like data.

     Anything not served from the real domain is now skipped outright.
     A preview is for checking the page works, and it should never cost
     an entry in the analytics somebody makes decisions from. */
  function isRealSite() {
    var h = window.location.hostname;
    return h === "clocal.co.uk" || h === "www.clocal.co.uk";
  }

  function loadPostHog() {
    if (!POSTHOG_KEY || (window.posthog && window.posthog.__loaded)) return;
    /* eslint-disable */
    !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset identify get_distinct_id".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
    /* eslint-enable */
    window.posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      person_profiles: "identified_only",
      capture_pageview: true,
      autocapture: true,
      disable_session_recording: true,
    });
    // Same version stamp as Clarity, so funnels can be split by page design.
    try { window.posthog.register({ site_version: SITE_VERSION }); } catch (e) {}
  }

  function startTracking() {
    if (!isRealSite()) return;
    loadMetaPixel();
    loadClarity();
    loadPostHog();
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
