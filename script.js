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

const SUCCESS_COPY = "You’re on the waitlist. We’ll be in touch when invites go out.";

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
    const name = /** @type {HTMLInputElement} */ (form.elements.namedItem("name")).value.trim();
    const email = /** @type {HTMLInputElement} */ (form.elements.namedItem("email")).value.trim();
    const postcode = /** @type {HTMLInputElement} */ (form.elements.namedItem("postcode")).value.trim();
    const honey = /** @type {HTMLInputElement | null} */ (form.elements.namedItem("_honey"));
    const roles = getSelectedRoles();

    if (!name || !email || !postcode || roles.length === 0) {
      event.preventDefault();
      setStatus("Please fill in name, email, postcode, and at least one role.", "error");
      return;
    }

    // Honeypot filled: pretend success, do not send.
    if (honey && honey.value) {
      event.preventDefault();
      setStatus(SUCCESS_COPY, "ok");
      form.reset();
      return;
    }

    // Classic FormSubmit POST (no AJAX). Do not disable the button — that can cancel the native submit.
    setStatus("Sending…", "ok");
  });
}
