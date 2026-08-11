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
  "You’re on the waitlist, and in with a chance of a £50 General Merchants voucher. We’ll email you when your invite is ready.";

// Soft client checks only — not a guarantee. Honeypot helps bots; real proof = magic link later.
// Email: format only (local@domain.tld). Any TLD OK — no disposable/domain blocklists.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// UK postcode shape (outward + inward), e.g. BT7 1NN. Soft launch is BT7/BT9 but other UK codes OK.
const UK_POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/;

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
      event.preventDefault();
      setStatus("Please fill in name, email, postcode, and at least one role.", "error");
      return;
    }

    if (!isValidEmail(email)) {
      event.preventDefault();
      setStatus("Please enter a real email address (like name@example.com).", "error");
      return;
    }

    if (!isValidUkPostcode(postcodeRaw)) {
      event.preventDefault();
      setStatus("Please enter a UK postcode (e.g. BT7 1NN).", "error");
      return;
    }

    // Write cleaned values so FormSubmit gets them.
    emailInput.value = email;
    postcodeInput.value = normalizePostcode(postcodeRaw);
    if (newsletterValue) {
      newsletterValue.value = newsletterBox && newsletterBox.checked ? "yes" : "no";
    }

    // Honeypot filled: pretend success, do not send.
    if (honey && honey.value) {
      event.preventDefault();
      setStatus(SUCCESS_COPY, "ok");
      form.reset();
      if (newsletterValue) newsletterValue.value = "yes";
      return;
    }

    // Classic FormSubmit POST (no AJAX). Do not disable the button — that can cancel the native submit.
    setStatus("Sending…", "ok");
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
