document.getElementById("year").textContent = new Date().getFullYear();

// Branded animated cursor — real-mouse devices only (touch devices never
// run this; the native cursor there is irrelevant anyway). CSS
// `cursor: url(...)` can't be animated and gets capped/scaled to a tiny
// bitmap by the browser at native-cursor size, which is exactly what made
// the previous version look pixelated with a visible square around it (the
// source PNG's near-white background wasn't real transparency). This
// swaps to a full-quality DOM element that trails the pointer with a
// smooth spring-like follow and pops on hover — genuinely animated, not
// just a static image standing in for the system cursor.
(function initCustomCursor() {
  if (!window.matchMedia("(pointer: fine)").matches) return;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const el = document.createElement("div");
  el.className = "cursor-pin is-hidden";
  el.setAttribute("aria-hidden", "true");
  const img = document.createElement("img");
  img.src = "assets/cursor/clocal-pin-cursor.png";
  img.alt = "";
  el.appendChild(img);
  document.body.appendChild(el);
  document.documentElement.classList.add("has-custom-cursor");

  let targetX = -100;
  let targetY = -100;
  let x = targetX;
  let y = targetY;
  let raf = null;

  function tick() {
    // Reduced motion: snap straight to the target instead of easing —
    // still shows the brand cursor, just without the trailing motion.
    const ease = reduceMotion ? 1 : 0.22;
    x += (targetX - x) * ease;
    y += (targetY - y) * ease;
    el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -78%)`;
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);

  const HOVER_SELECTOR = "a, button, input, textarea, select, [role='button'], .btn";

  window.addEventListener(
    "mousemove",
    (e) => {
      targetX = e.clientX;
      targetY = e.clientY;
      el.classList.remove("is-hidden");
      el.classList.toggle("is-hovering", Boolean(e.target.closest?.(HOVER_SELECTOR)));
    },
    { passive: true }
  );

  document.addEventListener("mouseleave", () => el.classList.add("is-hidden"));
  document.addEventListener("mouseenter", () => el.classList.remove("is-hidden"));
  window.addEventListener("mousedown", () => el.classList.add("is-pressed"));
  window.addEventListener("mouseup", () => el.classList.remove("is-pressed"));
  window.addEventListener("blur", () => el.classList.add("is-hidden"));

  window.addEventListener("pagehide", () => {
    if (raf) cancelAnimationFrame(raf);
  });
})();

const revealEls = document.querySelectorAll(
  ".quote, .step-card, .benefit-grid article, .who-card"
);

revealEls.forEach((el) => el.classList.add("reveal"));

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
);

revealEls.forEach((el) => observer.observe(el));

const SUCCESS_COPY =
  "You’re on the waitlist, and in with a chance to win one of several vouchers for brunch at General Merchants. We’ll email you when your invite is ready.";

// ClickClick CRM (Supabase) waitlist ingest — upserts a CRM contact
// (source=clocal-waitlist) and sends the confirm email via Resend.
// See ~/Projects/clickclick-crm/docs/clocal-waitlist-ingest.md.
// Public project URL, safe to ship client-side (no secrets here — the
// service-role key and Resend key stay server-side in Supabase secrets).
const WAITLIST_URL =
  "https://gapybapywpdogexibtgj.supabase.co/functions/v1/waitlist-ingest";
// Backup path only: if the CRM function isn't deployed yet (or errors),
// still get the lead to hello@clocal.co.uk via FormSubmit so nothing is lost
// while Kathryn finishes the Resend/Supabase setup.
const FORMSUBMIT_AJAX_URL = "https://formsubmit.co/ajax/hello@clocal.co.uk";

// Soft client checks only — not a guarantee. Honeypot helps bots; real proof = magic link later.
// Email: format only (local@domain.tld). Any TLD OK — no disposable/domain blocklists.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// UK postcode shape (outward + inward), e.g. BT7 1NN. Soft launch is BT7/BT9 but other UK codes OK.
const UK_POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/;

/**
 * Small floating confirmation popup ("snackbar") — separate from the inline
 * .form-status text, so success is unmissable even if someone doesn't
 * scroll back down to the form after submitting.
 * @param {string} message
 * @param {"ok" | "error"} kind
 */
function showSnackbar(message, kind) {
  let el = document.getElementById("snackbar");
  if (!el) {
    el = document.createElement("div");
    el.id = "snackbar";
    el.className = "snackbar";
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.toggle("error", kind === "error");
  el.classList.remove("show");
  void el.offsetWidth; // restart animation if it's already showing
  el.classList.add("show");
  clearTimeout(showSnackbar._hideTimer);
  showSnackbar._hideTimer = setTimeout(() => el.classList.remove("show"), 6000);
}

/**
 * Submit the waitlist to the CRM ingest function; fall back to FormSubmit
 * (email-only, no CRM entry) if that function is unreachable or erroring.
 * @param {{name: string, email: string, postcode: string, roles: string[], newsletter: boolean}} payload
 */
async function submitWaitlist(payload) {
  try {
    const res = await fetch(WAITLIST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) return;
  } catch (err) {
    // Network error, CORS, or function not deployed yet — try the backup below.
  }

  const fallback = await fetch(FORMSUBMIT_AJAX_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      _subject: "CLocal waitlist",
      _template: "table",
      _autoresponse:
        "Thanks, you're on the CLocal waitlist for South Belfast. That also enters you for a chance to win one of several vouchers for brunch at General Merchants (18+, T&Cs apply). We'll email you again when your invite is ready.",
      name: payload.name,
      email: payload.email,
      postcode: payload.postcode,
      role: payload.roles.join(", "),
      newsletter: payload.newsletter ? "yes" : "no",
    }),
  });
  if (!fallback.ok) {
    throw new Error(`Waitlist submit failed (${fallback.status})`);
  }
}

const form = document.getElementById("invite-form");
const status = document.getElementById("invite-status");

/** @returns {string[]} */
function getSelectedRoles() {
  if (!form) return [];
  return Array.from(
    /** @type {NodeListOf<HTMLInputElement>} */ (
      form.querySelectorAll('input[name="role"]:checked')
    )
  ).map((el) => el.value);
}

/** @param {string} role */
function selectWaitlistRole(role) {
  if (!form || !role) return;
  const checkbox = /** @type {HTMLInputElement | null} */ (
    form.querySelector(`input[name="role"][value="${role}"]`)
  );
  if (!checkbox) return;
  checkbox.checked = true;
  checkbox.dispatchEvent(new Event("change", { bubbles: true }));
  // Pre-selecting from a "Who it's for" card should be visible, not hidden
  // inside a collapsed dropdown.
  const roleField = /** @type {HTMLDetailsElement | null} */ (
    document.getElementById("role-field")
  );
  if (roleField) roleField.open = true;
}

// Keep the collapsed "I am a…" summary in sync with what's actually checked,
// so closing the dropdown doesn't hide the selection.
const roleSummaryText = document.getElementById("role-summary-text");

function updateRoleSummary() {
  if (!roleSummaryText) return;
  const roles = getSelectedRoles();
  roleSummaryText.textContent = roles.length ? `I am a… ${roles.join(", ")}` : "I am a…";
}

if (form) {
  form.querySelectorAll('input[name="role"]').forEach((el) => {
    el.addEventListener("change", updateRoleSummary);
  });
}

/**
 * @param {string} message
 * @param {"ok" | "error"} kind
 */
function setStatus(message, kind) {
  if (!status) return;
  status.hidden = false;
  status.classList.toggle("error", kind === "error");
  status.textContent = message;
}

/** @param {string} value */
function isValidEmail(value) {
  return EMAIL_RE.test(value);
}

/**
 * Uppercase and put one space before the inward code (last 3 chars).
 * @param {string} value
 * @returns {string}
 */
function normalizePostcode(value) {
  const compact = value.toUpperCase().replace(/\s+/g, "");
  if (compact.length < 5) return compact;
  return `${compact.slice(0, -3)} ${compact.slice(-3)}`;
}

/** @param {string} value */
function isValidUkPostcode(value) {
  return UK_POSTCODE_RE.test(value.toUpperCase().trim());
}

document.querySelectorAll("[data-role]").forEach((el) => {
  el.addEventListener("click", () => {
    const role = el.getAttribute("data-role");
    if (role) selectWaitlistRole(role);
  });
});

if (form && status) {
  // FormSubmit _next lands here after a successful classic POST.
  if (new URLSearchParams(window.location.search).get("waitlist") === "ok") {
    setStatus(SUCCESS_COPY, "ok");
  }

  form.addEventListener("submit", (event) => {
    // Always handled via fetch now (submitWaitlist), never a classic
    // navigating POST — that's what let the on-page confirmation silently
    // depend on FormSubmit's redirect actually round-tripping.
    event.preventDefault();

    const nameInput = /** @type {HTMLInputElement} */ (form.elements.namedItem("name"));
    const emailInput = /** @type {HTMLInputElement} */ (form.elements.namedItem("email"));
    const postcodeInput = /** @type {HTMLInputElement} */ (form.elements.namedItem("postcode"));
    const honey = /** @type {HTMLInputElement | null} */ (form.elements.namedItem("_honey"));
    const newsletterBox = /** @type {HTMLInputElement | null} */ (
      document.getElementById("invite-newsletter")
    );
    const newsletterValue = /** @type {HTMLInputElement | null} */ (
      document.getElementById("newsletter-value")
    );
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const postcodeRaw = postcodeInput.value.trim();
    const roles = getSelectedRoles();

    if (!name || !email || !postcodeRaw || roles.length === 0) {
      setStatus("Please fill in name, email, postcode, and at least one role.", "error");
      return;
    }

    if (!isValidEmail(email)) {
      setStatus("Please enter a real email address (like name@example.com).", "error");
      return;
    }

    if (!isValidUkPostcode(postcodeRaw)) {
      setStatus("Please enter a UK postcode (e.g. BT7 1NN).", "error");
      return;
    }

    const postcode = normalizePostcode(postcodeRaw);
    const newsletter = Boolean(newsletterBox && newsletterBox.checked);
    if (newsletterValue) newsletterValue.value = newsletter ? "yes" : "no";

    function markSubmitted() {
      setStatus(SUCCESS_COPY, "ok");
      showSnackbar(SUCCESS_COPY, "ok");
      form.reset();
      if (newsletterValue) newsletterValue.value = "yes";
      updateRoleSummary();
    }

    // Honeypot filled: pretend success, send nothing.
    if (honey && honey.value) {
      markSubmitted();
      return;
    }

    setStatus("Sending…", "ok");
    submitWaitlist({ name, email, postcode, roles, newsletter })
      .then(markSubmitted)
      .catch((err) => {
        console.error("Waitlist submit failed:", err);
        setStatus(
          "Sorry, something went wrong sending that. Please try again or email hello@clocal.co.uk.",
          "error"
        );
      });
  });
}

// Support ticket page (support.html) — same FormSubmit pattern as waitlist.
const SUPPORT_OK =
  "Ticket sent. We’ll reply by email as soon as we can.";

const supportForm = document.getElementById("support-form");
const supportStatus = document.getElementById("support-status");

if (supportForm && supportStatus) {
  /** @param {string} message @param {"ok"|"error"} kind */
  function setSupportStatus(message, kind) {
    supportStatus.hidden = false;
    supportStatus.textContent = message;
    supportStatus.classList.toggle("error", kind === "error");
  }

  if (new URLSearchParams(window.location.search).get("sent") === "ok") {
    setSupportStatus(SUPPORT_OK, "ok");
    supportForm.reset();
    const firstRole = /** @type {HTMLInputElement | null} */ (
      supportForm.querySelector('input[name="role"][value="Consumer"]')
    );
    if (firstRole) firstRole.checked = true;
  }

  supportForm.addEventListener("submit", (event) => {
    const honey = /** @type {HTMLInputElement | null} */ (
      supportForm.querySelector('input[name="_honey"]')
    );
    const email = /** @type {HTMLInputElement | null} */ (
      supportForm.querySelector("#support-email")
    );
    const subject = /** @type {HTMLInputElement | null} */ (
      supportForm.querySelector("#support-subject")
    );
    const message = /** @type {HTMLTextAreaElement | null} */ (
      supportForm.querySelector("#support-message")
    );

    if (email && !EMAIL_RE.test(email.value.trim())) {
      event.preventDefault();
      setSupportStatus("Enter a real email so we can reply.", "error");
      return;
    }
    if (subject && subject.value.trim().length < 3) {
      event.preventDefault();
      setSupportStatus("Add a short subject.", "error");
      return;
    }
    if (message && message.value.trim().length < 10) {
      event.preventDefault();
      setSupportStatus("Tell us a bit more in the message.", "error");
      return;
    }
    if (honey && honey.value) {
      event.preventDefault();
      setSupportStatus(SUPPORT_OK, "ok");
      supportForm.reset();
      return;
    }
    setSupportStatus("Sending…", "ok");
  });
}
