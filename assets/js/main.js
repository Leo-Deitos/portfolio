// Leo Deitos — Portfolio de Dashboards
// Lightbox simples para as galerias de screenshots.

document.addEventListener("DOMContentLoaded", () => {
  const lightbox = document.querySelector("[data-lightbox]");
  if (!lightbox) return;

  const lightboxImg = lightbox.querySelector("img");
  const triggers = document.querySelectorAll("[data-lightbox-trigger]");

  const open = (src, alt) => {
    lightboxImg.src = src;
    lightboxImg.alt = alt || "";
    lightbox.classList.add("open");
    document.body.style.overflow = "hidden";
  };

  const close = () => {
    lightbox.classList.remove("open");
    lightboxImg.src = "";
    document.body.style.overflow = "";
  };

  triggers.forEach((trigger) => {
    trigger.addEventListener("click", () => {
      open(trigger.getAttribute("src"), trigger.getAttribute("alt"));
    });
  });

  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox || e.target.closest("[data-lightbox-close]")) {
      close();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });
});
