/* Fenster nach unten wegwischen */
(function () {
  const CLOSERS = {
    loginBg: "#loginX",
    artBg: "[data-artclose]",
    tcBg: "[data-tcclose]",
    addBg: "[data-addclose]",
    hintBg: "[data-hintclose]",
    anaBg: "[data-anaclose]",
    spBg: "[data-spclose]",
    sheetBg: "#sheetClose",
  };
  Object.keys(CLOSERS).forEach((id) => {
    const bg = $(id),
      sh = bg && bg.querySelector(".sheet");
    if (!sh) return;
    let y0 = 0,
      x0 = 0,
      dy = 0,
      t0 = 0,
      on = false,
      decided = false,
      tgt = null;
    const scrolled = (t) => {
      for (let n = t; n && n !== bg; n = n.parentElement) if (n.scrollTop > 0) return true;
      return false;
    };
    sh.addEventListener(
      "touchstart",
      (e) => {
        if (e.touches.length !== 1) return;
        const t = e.target;
        if (t.closest("input[type=range],.srail,.kpad,textarea")) return;
        y0 = e.touches[0].clientY;
        x0 = e.touches[0].clientX;
        dy = 0;
        t0 = Date.now();
        tgt = t;
        on = !scrolled(t);
        decided = false;
      },
      {
        passive: true,
      }
    );
    sh.addEventListener(
      "touchmove",
      (e) => {
        if (!on) return;
        const d = e.touches[0].clientY - y0,
          dx = e.touches[0].clientX - x0;
        if (!decided) {
          if (Math.abs(d) < 8 && Math.abs(dx) < 8) return;
          decided = true;
          if (d <= 0 || Math.abs(dx) > Math.abs(d) || scrolled(tgt)) {
            on = false;
            return;
          }
          sh.classList.add("dragging");
        }
        dy = Math.max(0, d);
        sh.style.transform = `translateY(${dy}px)`;
        bg.style.opacity = String(Math.max(0.35, 1 - dy / 600));
        if (e.cancelable) e.preventDefault();
      },
      {
        passive: false,
      }
    );
    const end = () => {
      if (!on || !decided) {
        on = false;
        return;
      }
      on = false;
      const fast = dy > 50 && dy / (Date.now() - t0) > 0.5;
      sh.classList.remove("dragging");
      if (dy > Math.min(140, sh.offsetHeight * 0.3) || fast) {
        sh.style.transition = "transform .2s ease-in";
        sh.style.transform = `translateY(${sh.offsetHeight}px)`;
        setTimeout(() => {
          const c = sh.querySelector(CLOSERS[id]);
          if (c) c.click();
          sh.style.transition = "";
          sh.style.transform = "";
          bg.style.opacity = "";
        }, 190);
      } else {
        sh.style.transform = "";
        bg.style.opacity = "";
      }
      dy = 0;
    };
    sh.addEventListener("touchend", end);
    sh.addEventListener("touchcancel", end);
  });
})();
