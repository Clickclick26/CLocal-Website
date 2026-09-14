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
