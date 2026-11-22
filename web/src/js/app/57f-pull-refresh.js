/* Nach unten ziehen zum Aktualisieren */
(function () {
  const el = $("ptr"),
    MAX = 110,
    GO = 70;
  let y0 = 0,
    x0 = 0,
    d = 0,
    on = false,
    decided = false,
    busy = false;
  const blocked = (t) =>
    t.closest(
      "#moBg,#mbBg,#tourBg,.hobg,.sheet,.backdrop,.fan,.docrev,.pfed,#lockBg,#loginBg,#astack,.mvbg,.srail,.stack,.bt3,input[type=range],textarea,.wiz"
    ) || document.querySelector(".backdrop:not([hidden])");
  const set = (v, rot) => {
    el.style.transform = `translateY(${v - 50}px) rotate(${rot}deg)`;
    el.style.opacity = String(Math.min(1, v / GO));
  };
  document.addEventListener(
    "touchstart",
    (e) => {
      if (busy || e.touches.length !== 1 || window.scrollY > 0 || blocked(e.target)) {
        on = false;
        return;
      }
      y0 = e.touches[0].clientY;
      x0 = e.touches[0].clientX;
      d = 0;
      on = true;
      decided = false;
      el.classList.remove("back");
    },
    {
      passive: true,
    }
  );
  document.addEventListener(
    "touchmove",
    (e) => {
      if (!on) return;
      const dy = e.touches[0].clientY - y0,
        dx = e.touches[0].clientX - x0;
      if (!decided) {
        if (Math.abs(dy) < 8 && Math.abs(dx) < 8) return;
        decided = true;
        /* nur eindeutig nach unten – schräge Wischer gehören dem Seitenwechsel */
        if (dy <= 0 || Math.abs(dx) * 1.5 > dy || window.scrollY > 0) {
          on = false;
          return;
        }
      }
      d = Math.min(MAX, dy * 0.5);
      set(d + 20, d * 3);
      if (e.cancelable) e.preventDefault();
    },
    {
      passive: false,
    }
  );
  const end = async () => {
    if (!on || !decided) {
      on = false;
      return;
    }
    on = false;
    el.classList.add("back");
    if (d < GO) {
      el.style.transform = "";
      el.style.opacity = "";
      return;
    }
    busy = true;
    set(70, 0);
    el.classList.add("spin");
    try {
      navigator.vibrate && navigator.vibrate(10);
    } catch (x) {}
    try {
      if (SYNC.token) await syncNow();
      render();
      if (typeof renderSyncInfo === "function") renderSyncInfo();
      ghCheck(true);
    } catch (x) {}
    setTimeout(() => {
      el.classList.remove("spin");
      el.style.transform = "";
      el.style.opacity = "";
      busy = false;
      toast(
        SYNC.token
          ? SYNC.state === "ok"
            ? "Aktualisiert"
            : "Aktualisiert – Abgleich gerade nicht möglich"
          : "Aktualisiert"
      );
    }, 400);
  };
  document.addEventListener("touchend", end);
  document.addEventListener("touchcancel", end);
})();
