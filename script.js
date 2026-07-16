document.getElementById("year").textContent = new Date().getFullYear();

const revealEls = document.querySelectorAll(
  ".quote, .step-card, .benefit-grid article, .who-card, .mural-card"
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
