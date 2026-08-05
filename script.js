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

const FORMSUBMIT_URL = "https://formsubmit.co/ajax/hello@clocal.co.uk";
const SUCCESS_COPY = "You’re on the waitlist. We’ll be in touch when invites go out.";
const ERROR_COPY = "Sorry, that didn’t send. Please try again, or email hello@clocal.co.uk.";
const ACTIVATE_COPY =
  "Almost there. Check hello@clocal.co.uk and click FormSubmit’s confirmation link once. After that, new sign-ups will arrive by email.";

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

/** @param {unknown} data */
function looksLikeActivation(data) {
  const msg =
    typeof data === "object" && data && "message" in data
      ? String(/** @type {{ message?: unknown }} */ (data).message).toLowerCase()
      : "";
  return (
    msg.includes("confirm") ||
    msg.includes("activate") ||
    msg.includes("activation") ||
    msg.includes("check your email")
  );
}

document.querySelectorAll("[data-role]").forEach((el) => {
  el.addEventListener("click", () => {
    const role = el.getAttribute("data-role");
    if (role) selectWaitlistRole(role);
  });
});

if (form && status) {
  // Non-JS fallback: FormSubmit _next lands here after a classic POST.
  if (new URLSearchParams(window.location.search).get("waitlist") === "ok") {
    setStatus(SUCCESS_COPY, "ok");
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = /** @type {HTMLInputElement} */ (form.elements.namedItem("name")).value.trim();
    const email = /** @type {HTMLInputElement} */ (form.elements.namedItem("email")).value.trim();
    const postcode = /** @type {HTMLInputElement} */ (form.elements.namedItem("postcode")).value.trim();
    const honey = /** @type {HTMLInputElement | null} */ (form.elements.namedItem("_honey"));
    const roles = getSelectedRoles();
    const submitBtn = form.querySelector('button[type="submit"]');

    if (!name || !email || !postcode || roles.length === 0) {
      setStatus("Please fill in name, email, postcode, and at least one role.", "error");
      return;
    }

    // Honeypot filled: pretend success, do not send.
    if (honey && honey.value) {
      setStatus(SUCCESS_COPY, "ok");
      form.reset();
      return;
    }

    const roleList = roles.join(", ");

    if (submitBtn instanceof HTMLButtonElement) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending…";
    }
    setStatus("Sending…", "ok");

    try {
      const response = await fetch(FORMSUBMIT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          postcode,
          roles: roleList,
          role: roleList,
          _replyto: email,
          _subject: "CLocal waitlist",
          _template: "table",
          _captcha: "false",
          _honey: "",
        }),
      });

      const data = await response.json().catch(() => ({}));
      const successFlag =
        typeof data === "object" &&
        data &&
        "success" in data &&
        (/** @type {{ success?: unknown }} */ (data).success === true ||
          /** @type {{ success?: unknown }} */ (data).success === "true");

      if (looksLikeActivation(data)) {
        setStatus(ACTIVATE_COPY, "ok");
        return;
      }

      if (!response.ok || (data && "success" in /** @type {object} */ (data) && !successFlag)) {
        throw new Error("Request failed");
      }

      form.reset();
      setStatus(SUCCESS_COPY, "ok");
    } catch {
      setStatus(ERROR_COPY, "error");
    } finally {
      if (submitBtn instanceof HTMLButtonElement) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Join the waitlist";
      }
    }
  });
}
