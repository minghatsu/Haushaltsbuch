/* Tablet */
if (IS_TAB) {
  const H = document.documentElement,
    calm = () => pcCalm();
  /* Dock */
  const dock = document.querySelector(".tabs"),
    plus = dock && dock.querySelector(".tab.plus");
  let bub = null;
  function dockPlace() {
    if (!dock) return;
    if (!bub) {
      bub = document.createElement("i");
      bub.className = "tabbub";
      dock.prepend(bub);
    }
    const on = dock.querySelector('.tab[aria-selected="true"]');
    if (on) {
      bub.style.left = on.offsetLeft + "px";
      bub.style.top = on.offsetTop + "px";
      bub.style.width = on.offsetWidth + "px";
      bub.style.height = on.offsetHeight + "px";
      bub.style.setProperty("--bubc", getComputedStyle(on).getPropertyValue("--tc") || "#1a7a5c");
      bub.style.opacity = 1;
    } else bub.style.opacity = 0;
  }
  const _rd = render;
  render = (...a) => {
    const x = _rd(...a);
    if (ui.view !== "more") ui.tabOpen = 0;
    requestAnimationFrame(dockPlace);
    return x;
  };
  addEventListener("resize", () => requestAnimationFrame(dockPlace));
  setTimeout(dockPlace, 60);
  setTimeout(dockPlace, 600);

  /* Wischen */
  {
    let x0 = null,
      y0 = 0,
      t0 = 0,
      dx = 0,
      sec = null,
      horiz = null;
    const blocked = (t) =>
      t.closest(
        "input,textarea,select,.sheet,.backdrop,.astack,.srail,.table-wrap,.fxchips,.tabs,.pcfcalc,[draggable=true],.pcsweb,.leaflet-container"
      );
    document.addEventListener(
      "touchstart",
      (e) => {
        if (
          e.touches.length !== 1 ||
          blocked(e.target) ||
          PC_ANIM.busy ||
          (ui.view === "more" && ui.tabOpen) ||
          document.querySelector(".backdrop:not([hidden])")
        ) {
          x0 = null;
          return;
        }
        x0 = e.touches[0].clientX;
        y0 = e.touches[0].clientY;
        t0 = Date.now();
        dx = 0;
        horiz = null;
        sec = document.querySelector(`[data-view="${ui.view}"]`);
      },
      {
        passive: true,
        capture: true,
      }
    );
    document.addEventListener(
      "touchmove",
      (e) => {
        if (x0 === null || !sec) return;
        const t = e.touches[0];
        dx = t.clientX - x0;
        const dy = t.clientY - y0;
        if (horiz === null && (Math.abs(dx) > 12 || Math.abs(dy) > 12)) horiz = Math.abs(dx) > Math.abs(dy) * 1.4;
        if (horiz && !calm()) {
          const k = dx / innerWidth;
          sec.style.transition = "none";
          sec.style.transform = `translateX(${dx * 0.55}px) rotate(${k * 3}deg) scale(${1 - Math.abs(k) * 0.06})`;
          sec.style.opacity = String(1 - Math.abs(k) * 0.5);
        }
      },
      {
        passive: true,
        capture: true,
      }
    );
    document.addEventListener(
      "touchend",
      (e) => {
        if (x0 === null || !sec) return;
        const s = sec,
          go = horiz && Math.abs(dx) > 80 && Date.now() - t0 < 1200;
        x0 = null;
        if (horiz && !calm()) {
          s.style.transition = "transform .45s cubic-bezier(.3,1.5,.5,1), opacity .3s";
          s.style.transform = "";
          s.style.opacity = "";
          setTimeout(() => {
            s.style.transition = "";
          }, 460);
        }
        if (go) {
          e.stopImmediatePropagation();
          pcStep(dx < 0 ? 1 : -1);
        }
      },
      {
        passive: true,
        capture: true,
      }
    );
  }
}
