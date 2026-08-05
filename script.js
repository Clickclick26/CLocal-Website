document.getElementById("year").textContent = new Date().getFullYear();

const revealEls = document.querySelectorAll(
  ".quote, .step-card, .benefit-grid article, .who-card, .shot-card"
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

    if (!name || !email || !postcode) {
      status.hidden = false;
      status.classList.add("error");
      status.textContent = "Please fill in name, email, and postcode.";
      return;
    }

    const subject = encodeURIComponent("CLocal early access invite");
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\nPostcode: ${postcode}\n\nPlease send my South Belfast early access invite.`
    );
    window.location.href = `mailto:hello@clocal.co.uk?subject=${subject}&body=${body}`;

    status.hidden = false;
    status.classList.remove("error");
    status.textContent = "Opening your email app — send that message and we’ll invite you.";
  });
}
