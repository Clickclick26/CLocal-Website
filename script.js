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

document.querySelectorAll("[data-role]").forEach((el) => {
  el.addEventListener("click", () => {
    const role = el.getAttribute("data-role");
    if (role) selectWaitlistRole(role);
  });
});

if (form && status) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = /** @type {HTMLInputElement} */ (form.elements.namedItem("name")).value.trim();
    const email = /** @type {HTMLInputElement} */ (form.elements.namedItem("email")).value.trim();
    const postcode = /** @type {HTMLInputElement} */ (form.elements.namedItem("postcode")).value.trim();
    const roles = getSelectedRoles();

    if (!name || !email || !postcode || roles.length === 0) {
      status.hidden = false;
      status.classList.add("error");
      status.textContent = "Please fill in name, email, postcode, and at least one role.";
      return;
    }

    const roleList = roles.join(", ");
    const subject = encodeURIComponent("CLocal: join the waitlist");
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\nPostcode: ${postcode}\nRole: ${roleList}\n\nI’d like to join the CLocal waitlist for South Belfast invite-only early access.`
    );
    window.location.href = `mailto:hello@clocal.co.uk?subject=${subject}&body=${body}`;

    status.hidden = false;
    status.classList.remove("error");
    status.textContent = "Opening your email app. Send that message to join the waitlist.";
  });
}
