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

const form = document.getElementById("invite-form");
const status = document.getElementById("invite-status");
const FORMSUBMIT_URL = "https://formsubmit.co/ajax/hello@clocal.co.uk";

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

    if (submitBtn instanceof HTMLButtonElement) {
      submitBtn.disabled = true;
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
          role: roles.join(", "),
          _replyto: email,
          _subject: "CLocal: join the waitlist",
          _template: "table",
          _captcha: "false",
          _honey: honey ? honey.value : "",
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const detail =
          typeof data === "object" && data && "message" in data
            ? String(/** @type {{ message?: unknown }} */ (data).message)
            : "";
        throw new Error(detail || "Request failed");
      }

      form.reset();
      setStatus("You’re on the waitlist. We’ll be in touch.", "ok");
    } catch {
      setStatus(
        "Something went wrong. Please try again, or email hello@clocal.co.uk.",
        "error"
      );
    } finally {
      if (submitBtn instanceof HTMLButtonElement) {
        submitBtn.disabled = false;
      }
    }
  });
}
