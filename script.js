document.getElementById("year").textContent = new Date().getFullYear();

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

// Both endpoints fire on every signup (see submitWaitlist).
// 1. ClickClick CRM (Supabase) ingest — upserts a CRM contact
//    (source=clocal-waitlist). Its Resend confirm email needs clocal.co.uk
//    verified in Resend (not done yet), but the contact write happens
//    regardless. See ~/Projects/clickclick-crm/docs/clocal-waitlist-ingest.md.
//    Public project URL, safe to ship client-side (no secrets here).
const WAITLIST_URL =
  "https://gapybapywpdogexibtgj.supabase.co/functions/v1/waitlist-ingest";
// 2. FormSubmit — emails hello@clocal.co.uk on every signup. Activated and
//    working; this is the send that must succeed.
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
 * Waitlist submit — fires BOTH paths on every signup, in parallel:
 *   1. CRM ingest  → files a contact in ClickClick CRM (source=clocal-waitlist)
 *   2. FormSubmit  → emails hello@clocal.co.uk
 *
 * They're independent and both should always run. The email is the one
 * that MUST land, so only its failure surfaces an error to the user.
 *
 * The CRM function often responds 500 today because its Resend confirm-mail
 * step isn't set up (clocal.co.uk not verified in Resend) — but it writes
 * the contact row BEFORE that step, so a non-ok response there is not a
 * real failure and must not block the signup or hide the email path.
 *
 * History: from 2026-08-12 to 2026-08-30 the CRM call ran first and a 200
 * from it skipped FormSubmit entirely — which silently stopped every signup
 * email (last one landed 12 Aug). Both-in-parallel since 2026-08-30.
 *
 * @param {{name: string, email: string, postcode: string, roles: string[], newsletter: boolean, referredBy?: string, utm?: Record<string,string>}} payload
 */
async function submitWaitlist(payload) {
  const utm = payload.utm || {};
  const [crm, mail] = await Promise.allSettled([
    fetch(WAITLIST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
    fetch(FORMSUBMIT_AJAX_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        _subject: "CLocal waitlist",
        _template: "table",
        _autoresponse:
          "Thanks, you're on the CLocal waitlist for South and East Belfast. That also enters you for a chance to win one of several vouchers for brunch at General Merchants (18+, T&Cs apply). We'll email you again when it's your turn.",
        name: payload.name,
        email: payload.email,
        postcode: payload.postcode,
        role: payload.roles.join(", "),
        newsletter: payload.newsletter ? "yes" : "no",
        referred_by: payload.referredBy || "",
        utm_source: utm.utm_source || "",
        utm_medium: utm.utm_medium || "",
        utm_campaign: utm.utm_campaign || "",
        utm_content: utm.utm_content || "",
        utm_term: utm.utm_term || "",
      }),
    }),
  ]);

  // CRM is best-effort — log, don't fail the signup over it.
  if (crm.status === "rejected" || !crm.value.ok) {
    console.warn(
      "Waitlist CRM ingest didn't confirm (contact may still have been saved):",
      crm.status === "rejected" ? crm.reason : crm.value.status,
    );
  }

  // The email to hello@clocal.co.uk has to land. FormSubmit's ajax endpoint
  // answers HTTP 200 even when it rejected the submit (form not activated,
  // spam-flagged, etc.), so check the JSON body's success flag too.
  if (mail.status === "rejected") {
    throw mail.reason instanceof Error
      ? mail.reason
      : new Error("Waitlist email send failed");
  }
  if (!mail.value.ok) {
    throw new Error(`Waitlist email send failed (${mail.value.status})`);
  }
  let mailJson = null;
  try {
    mailJson = await mail.value.clone().json();
  } catch (_) {
    /* non-JSON body — fall back to the HTTP status check above */
  }
  if (mailJson && String(mailJson.success) === "false") {
    throw new Error(`FormSubmit rejected the submit: ${mailJson.message || "unknown"}`);
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
  // Pages that pre-check a role in HTML (e.g. creators.html, partners.html)
  // need the summary text synced on load too, not just on change.
  updateRoleSummary();
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
    const referredBy = new URLSearchParams(window.location.search).get("ref") || "";
    // Ad/campaign attribution — read once at submit time so it survives any
    // in-page navigation between landing and signing up.
    const utmParams = new URLSearchParams(window.location.search);
    const utm = {
      utm_source: utmParams.get("utm_source") || "",
      utm_medium: utmParams.get("utm_medium") || "",
      utm_campaign: utmParams.get("utm_campaign") || "",
      utm_content: utmParams.get("utm_content") || "",
      utm_term: utmParams.get("utm_term") || "",
    };
    if (newsletterValue) newsletterValue.value = newsletter ? "yes" : "no";

    function markSubmitted() {
      setStatus(SUCCESS_COPY, "ok");
      showSnackbar(SUCCESS_COPY, "ok");
      // Meta Pixel: fire the standard Lead event on a real, confirmed signup.
      if (window.fbq) {
        window.fbq("track", "Lead", {
          content_name: "waitlist_signup",
          utm_source: utm.utm_source,
          utm_campaign: utm.utm_campaign,
          utm_content: utm.utm_content,
        });
      }
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
    submitWaitlist({ name, email, postcode, roles, newsletter, referredBy, utm })
      .then(markSubmitted)
      .catch((err) => {
        console.error("Waitlist submit failed:", err);
        setStatus(
          "Sorry, something went wrong sending that. Please try again or email hello@clocal.co.uk.",
          "error"
        );
        // Breakage alert: the normal path just failed for a real person, so
        // (a) tell Kathryn it's broken and (b) get the lead's details into
        // her inbox anyway so the signup isn't lost. Best-effort — if
        // FormSubmit itself is the outage this can't get through either,
        // which is what the external daily canary (GitHub Action) is for.
        reportWaitlistFailure({ name, email, postcode, roles, newsletter, referredBy }, err);
      });
  });
}

/**
 * Fire-and-forget alert to hello@clocal.co.uk that a waitlist submit failed,
 * carrying the lead's details and the error so nothing is lost and the
 * breakage is visible immediately.
 * @param {{name: string, email: string, postcode: string, roles: string[], newsletter: boolean}} payload
 * @param {unknown} err
 */
function reportWaitlistFailure(payload, err) {
  try {
    fetch(FORMSUBMIT_AJAX_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        _subject: "⚠️ CLocal waitlist submit FAILED — check the form",
        _template: "table",
        error: String(err && /** @type {Error} */ (err).message ? /** @type {Error} */ (err).message : err),
        page: location.href,
        when: new Date().toISOString(),
        name: payload.name,
        email: payload.email,
        postcode: payload.postcode,
        role: payload.roles.join(", "),
        newsletter: payload.newsletter ? "yes" : "no",
      }),
    }).catch(() => {});
  } catch (_) {
    /* never let the alert throw */
  }
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
