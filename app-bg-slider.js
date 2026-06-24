(function () {
  /*
   * Shared animated page background.
   * The script creates the background elements dynamically, so each
   * HTML page only needs to include this one file.
   */

  const images = [
    "images/img_1.png",
    "images/img3.jpg",
    "images/img4.jpg"
  ];

  if (!document.body || document.getElementById("app-bg-slider") || images.length === 0) return;

  const slider = document.createElement("div");
  slider.id = "app-bg-slider";
  slider.setAttribute("aria-hidden", "true");
  slider.innerHTML = [
    '<div id="app-bg-slide"></div>',
    '<div id="app-bg-slide-next"></div>',
    '<div id="app-bg-overlay"></div>'
  ].join("");
  document.body.prepend(slider);

  const slideEl = document.getElementById("app-bg-slide");
  const nextEl = document.getElementById("app-bg-slide-next");
  if (!slideEl || !nextEl) return;

  let idx = 0;
  const holdMs = 4500;
  const fadeMs = 1100;

  slideEl.style.backgroundImage = `url("${images[0]}")`;
  images.forEach((src) => {
    const img = new Image();
    img.src = src;
  });

  const setBg = () => {
    if (images.length < 2 || nextEl.classList.contains("is-visible")) return;
    const nextIdx = (idx + 1) % images.length;
    nextEl.style.backgroundImage = `url("${images[nextIdx]}")`;
    nextEl.classList.add("is-visible");

    window.setTimeout(() => {
      slideEl.style.backgroundImage = `url("${images[nextIdx]}")`;
      nextEl.classList.remove("is-visible");
      idx = nextIdx;
    }, fadeMs);
  };

  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    window.setInterval(setBg, holdMs);
  }
})();
