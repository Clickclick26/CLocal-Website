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

if (form && status) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = /** @type {HTMLInputElement} */ (form.elements.namedItem("name")).value.trim();
    const email = /** @type {HTMLInputElement} */ (form.elements.namedItem("email")).value.trim();
    const postcode = /** @type {HTMLInputElement} */ (form.elements.namedItem("postcode")).value.trim();
    const roleEl = /** @type {HTMLInputElement | null} */ (form.querySelector('input[name="role"]:checked'));
    const role = roleEl ? roleEl.value : "";

    if (!name || !email || !postcode || !role) {
      status.hidden = false;
      status.classList.add("error");
      status.textContent = "Please fill in name, email, postcode, and role.";
      return;
    }

    const subject = encodeURIComponent("CLocal — join the waitlist");
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\nPostcode: ${postcode}\nRole: ${role}\n\nI’d like to join the CLocal waitlist for South Belfast early access.`
    );
    window.location.href = `mailto:hello@clocal.co.uk?subject=${subject}&body=${body}`;

    status.hidden = false;
    status.classList.remove("error");
    status.textContent = "Opening your email app — send that message to join the waitlist.";
  });
}
