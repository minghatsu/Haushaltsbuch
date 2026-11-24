/* Texte aus TEXTS in der aktuellen Sprache, Monatsnamen und das Zählwerk für Beträge */
function uiText(k, v) {
  const a = TEXTS[k];
  let s = a ? mamiName(a[Math.max(0, LANG_ORDER.indexOf(LANG))] || a[0]) : k;
  if (v) for (const [x, y] of Object.entries(v)) s = s.split("{" + x + "}").join(y);
  return s;
}
const reducedMotion = () => motionOff();
function fxDate(iso, o) {
  if (!iso) return "";
  const dt = new Date(String(iso).length === 7 ? iso + "-01T12:00" : iso + "T12:00");
  if (isNaN(dt)) return "";
  return dt.toLocaleDateString(
    cLoc(),
    o || {
      day: "numeric",
      month: "short",
    }
  );
}
function monName(ym, o) {
  const [y, m] = ymParts(ym);
  return new Intl.DateTimeFormat(cLoc(), {
    month: o || "long",
  }).format(new Date(y, m - 1, 1));
}
/* Zählwerk */
function hbOdo(el, str, dur) {
  if (!el) return;
  if (reducedMotion()) {
    el.textContent = str;
    el._s = str;
    return;
  }
  const prev = el._s || "";
  el.classList.add("hbodo");
  const shape = (x) => [...x].map((ch) => (/\d/.test(ch) ? "d" : ch)).join("");
  /* neu aufbauen, wenn sich Länge, Vorzeichen oder Trennzeichen ändern – sonst bleiben alte Zeichen stehen (z. B. fehlendes Minus) */
  if (shape(prev) !== shape(str) || !el.querySelector(".hc")) {
    el.innerHTML = [...str]
      .map((ch) =>
        /\d/.test(ch)
          ? `<span class="hc"><span class="hs">${"0123456789"
              .split("")
              .map((d) => `<span>${d}</span>`)
              .join("")}</span></span>`
          : `<span class="hc"><span>${ch === " " || ch === " " ? "&nbsp;" : escHtml(ch)}</span></span>`
      )
      .join("");
  }
  el._s = str;
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      /* auf einer gerade versteckten Seite (vorbereitet für den Würfel) sofort den Endstand –
         sonst rollen die Ziffern erst los, wenn die Seite sichtbar wird, und sind so lange leer */
      const hid = !el.getClientRects().length;
      [...str].forEach((ch, i) => {
        const c = el.children[i],
          st = c && c.querySelector(".hs");
        if (st) {
          if (hid) st.style.transition = "none";
          else st.style.transition = "";
          if (dur) st.style.transitionDuration = dur + "ms";
          st.style.transitionDelay = i * 45 + "ms";
          st.style.transform = `translateY(${-Number(ch)}em)`;
        }
      });
    })
  );
}
function hbConfetti(root, n, y0) {
  if (reducedMotion() || !root) return;
  const C = ["#ffd36b", "#ff9db8", "#7fc8ff", "#b6f0c9", "#ffffff", "#c4a5ff"],
    W = root.clientWidth || 360,
    H = root.clientHeight || 800;
  for (let i = 0; i < (n || 36); i++) {
    const c = document.createElement("i");
    c.className = "hbconf";
    c.style.left = Math.random() * W + "px";
    c.style.top = (y0 || -20) + "px";
    c.style.background = C[i % C.length];
    root.appendChild(c);
    c.animate(
      [
        {
          transform: "translateY(0) rotate(0)",
        },
        {
          transform: `translate(${(Math.random() - 0.5) * 140}px,${H + 60}px) rotate(${Math.random() * 900}deg)`,
        },
      ],
      {
        duration: 2000 + Math.random() * 1500,
        delay: Math.random() * 300,
        easing: "cubic-bezier(.2,.6,.4,1)",
        fill: "forwards",
      }
    )
      .finished.then(() => c.remove())
      .catch(() => c.remove());
  }
}
function hbBurst(root, x, y, n) {
  if (reducedMotion() || !root) return;
  for (let i = 0; i < (n || 22); i++) {
    const c = document.createElement("i");
    c.className = "hbconf";
    c.style.left = "0";
    c.style.top = "0";
    c.style.background = ["#ffd36b", "#fff", "#ff9db8", "#7fc8ff"][i % 4];
    root.appendChild(c);
    const a = Math.random() * Math.PI * 2,
      d = 70 + Math.random() * 110;
    c.animate(
      [
        {
          transform: `translate(${x}px,${y}px) scale(1)`,
          opacity: 1,
        },
        {
          transform: `translate(${x + Math.cos(a) * d}px,${y + Math.sin(a) * d + 50}px) rotate(${Math.random() * 600}deg) scale(.6)`,
          opacity: 0,
        },
      ],
      {
        duration: 1000 + Math.random() * 500,
        easing: "cubic-bezier(.1,.7,.3,1)",
        fill: "forwards",
      }
    )
      .finished.then(() => c.remove())
      .catch(() => c.remove());
  }
}
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  const o = [...document.querySelectorAll(".hobg:not([hidden])")].pop();
  if (!o || !o.id) return;
  if (document.querySelector("#tmView,.tmview")) return;
  e.preventDefault();
  try {
    hbSheetClose(o.id);
  } catch (_) {}
});
function hbSheet(id, title) {
  let bg = $(id);
  if (!bg) {
    bg = document.createElement("div");
    bg.id = id;
    bg.className = "hobg";
    bg.innerHTML = `<div class="hosh" role="dialog" aria-modal="true"><div class="hohd"><b data-noi18n class="hbst"></b><button class="hox" data-hbclose="${id}" aria-label="Schließen"><svg class="i" viewBox="0 0 24 24" style="width:18px;height:18px"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div><div class="hobody" data-noi18n></div></div>`;
    document.body.appendChild(bg);
  }
  bg.querySelector(".hbst").textContent = title;
  bg.hidden = false;
  bg._lk = !document.body.classList.contains("locked");
  document.body.classList.add("locked");
  requestAnimationFrame(() => bg.classList.add("show"));
  return bg.querySelector(".hobody");
}
function hbSheetClose(id) {
  const bg = $(id);
  if (!bg || bg.hidden) return;
  bg.classList.remove("show");
  if (bg._lk) document.body.classList.remove("locked");
  setTimeout(() => {
    bg.hidden = true;
  }, 220);
}
document.addEventListener("click", (e) => {
  const c = e.target.closest("[data-hbclose]");
  if (c) {
    hbSheetClose(c.dataset.hbclose);
    return;
  }
  const bg =
    e.target.classList &&
    e.target.classList.contains("hobg") &&
    e.target.id &&
    ["vaBg", "fcBg", "srBg"].includes(e.target.id)
      ? e.target
      : null;
  if (bg) hbSheetClose(bg.id);
});
