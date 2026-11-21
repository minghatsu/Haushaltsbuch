/* Navigation nicht unter den Monatswähler schieben */
function pcNavFit() {
  if (!IS_PC || document.documentElement.classList.contains("istab")) return;
  const t = document.querySelector(".tabs"),
    mp = document.getElementById("monthpill");
  if (!t || !mp) return;
  // "right" statt translate: translate würde den festen Plus-Knopf in der Leiste mitverschieben (er landete oben im Kopf)
  t.style.right = "";
  const tr = t.getBoundingClientRect(),
    mr = mp.getBoundingClientRect();
  if (!mr.width || mr.top > tr.bottom || mr.bottom < tr.top) return;
  const ov = tr.right - (mr.left - 10);
  if (ov > 0) t.style.right = `${2 * Math.ceil(ov)}px`;
}
addEventListener("resize", () => requestAnimationFrame(pcNavFit));
setTimeout(pcNavFit, 300);
setTimeout(pcNavFit, 1500);

/* Menüleiste am PC wie am Handy: Kapsel gleitet zur aktiven Seite */
if (IS_PC) {
  const pcPill = (anim) => {
    const H = document.documentElement,
      nav = document.querySelector("nav.tabs");
    if (!nav || !H.classList.contains("pc") || H.classList.contains("istab")) return;
    nav.classList.add("navx");
    const ind = nav.querySelector(".tabind");
    if (!ind) return;
    const kids = [...nav.children].filter(
      (e) =>
        e.classList.contains("tab") &&
        !e.classList.contains("plus") &&
        getComputedStyle(e).display !== "none" &&
        getComputedStyle(e).position !== "fixed"
    );
    const act = kids.find((e) => e.getAttribute("aria-selected") === "true");
    nav.classList.toggle("nosel", !act);
    if (!act) return;
    const cs = getComputedStyle(nav),
      gap = parseFloat(cs.columnGap) || 0;
    const W = (t) => {
      const n = t.querySelector(".tname");
      return t === act ? 15 + 22 + 8 + Math.min(140, n ? n.scrollWidth : 0) + 18 : 52;
    };
    let x = parseFloat(cs.paddingLeft) || 0;
    for (const t of kids) {
      if (t === act) break;
      x += W(t) + gap;
    }
    const col =
      getComputedStyle(act).getPropertyValue("--tcol").trim() ||
      getComputedStyle(H).getPropertyValue("--accent").trim();
    ind.style.setProperty("--ic", col);
    ind.style.left = x + "px";
    ind.style.width = W(act) + "px";
    if (anim && !pcCalm())
      act.querySelector("svg")?.animate(
        [
          {
            transform: "translateY(4px) scale(.85)",
          },
          {
            transform: "none",
          },
        ],
        {
          duration: 420,
          easing: "cubic-bezier(.3,1.6,.5,1)",
        }
      );
  };
  const _np = navPill;
  navPill = function (anim) {
    _np(anim);
    try {
      pcPill(anim);
    } catch (_) {}
  };
  try {
    document.fonts.ready.then(() => pcPill(false));
  } catch (_) {}
  setTimeout(() => pcPill(false), 300);
  new MutationObserver((ms) => {
    if (ms.some((m) => m.attributeName === "aria-selected" && m.target.getAttribute("aria-selected") === "true"))
      pcPill(true);
  }).observe(document.querySelector("nav.tabs") || document.body, {
    subtree: true,
    attributes: true,
    attributeFilter: ["aria-selected"],
  });
}
