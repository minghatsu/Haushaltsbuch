/* Hell / Dunkel */
if (IS_PC) {
  const _k3 = accTabKeys;
  accTabKeys = (t) => _k3(t).filter((k) => k !== "dark");
  const bell = $("bellBtn");
  if (bell && !$("pcTheme"))
    bell.insertAdjacentHTML(
      "beforebegin",
      `<button class="roundbtn pctheme" id="pcTheme" aria-label="Hell oder dunkel" title="Hell / Dunkel">
    <svg viewBox="0 0 24 24" class="pcsm"><mask id="pcMoonCut"><rect x="0" y="0" width="24" height="24" fill="#fff"/><circle class="pccut" cx="24" cy="4" r="7" fill="#000"/></mask>
      <circle class="pcorb" cx="12" cy="12" r="5" mask="url(#pcMoonCut)"/>
      <g class="pcrays"><path d="M12 1.5v2.5M12 20v2.5M1.5 12H4M20 12h2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8"/></g></svg></button>`
    );
  const isDark = () => document.documentElement.dataset.theme === "dark";
  const sync = () => {
    const b = $("pcTheme");
    if (b) {
      b.setAttribute("aria-pressed", String(isDark()));
      b.title = isDark() ? "Hell schalten" : "Dunkel schalten";
    }
  };
  sync();
  document.addEventListener("click", (e) => {
    const b = e.target.closest("#pcTheme");
    if (!b) return;
    const t = isDark() ? "light" : "dark",
      r = b.getBoundingClientRect(),
      x = r.left + r.width / 2,
      y = r.top + r.height / 2;
    try {
      SND.play("glide");
    } catch (_) {}
    const apply = () => {
      document.documentElement.dataset.theme = t;
      try {
        localStorage.setItem("hb-theme", t);
      } catch (_) {}
      sync();
      try {
        render();
      } catch (_) {}
    };
    b.animate(
      [
        {
          transform: "rotate(0) scale(1)",
        },
        {
          transform: "rotate(-25deg) scale(.86)",
          offset: 0.4,
        },
        {
          transform: "rotate(0) scale(1)",
        },
      ],
      {
        duration: 520,
        easing: "cubic-bezier(.3,.7,.3,1)",
      }
    );
    if (document.startViewTransition && !pcCalm()) {
      const vt = document.startViewTransition(apply);
      vt.ready
        .then(() => {
          const R = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
          document.documentElement.animate(
            {
              clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${R}px at ${x}px ${y}px)`],
            },
            {
              duration: 650,
              easing: "cubic-bezier(.4,0,.2,1)",
              pseudoElement: "::view-transition-new(root)",
            }
          );
        })
        .catch(() => {});
    } else apply();
  });
}
/* + Knopf */
if (IS_PC) {
  const fan = $("fanBg"),
    rc = fan && fan.querySelector('[data-addpick="receipt"]');
  if (rc && IS_DESK) {
    rc.dataset.addpick = "pcscan";
    rc.innerHTML = `<svg class="i" viewBox="0 0 24 24"><path d="M4 14h16v4.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5z"/><path d="M6 14 8.5 5.5h7L18 14"/><path d="M7.5 17h3"/></svg><span>Scannen</span>`;
  }
  openAddMenu = () => {
    if (!fan.hidden) {
      fanClose();
      return;
    }
    if (IS_DESK && window.pcFanOpen) {
      window.pcFanOpen();
      return;
    }
    fanOpen();
    if (IS_TAB) return;
    const R = 140;
    [180, 135, 90].forEach((a, i) => {
      const t = (a * Math.PI) / 180,
        b = fan.children[i];
      b.style.setProperty("--dx", Math.round(Math.cos(t) * R) + "px");
      b.style.setProperty("--dy", Math.round(-Math.sin(t) * R - 14) + "px");
    });
  };
  const SCANW = {};
  window.hbScanDone = (id, data, err) => {
    const f = SCANW[id];
    if (f) {
      delete SCANW[id];
      f(data, err);
    }
  };
  const scanNow = () =>
    new Promise((ok) => {
      const id = newId();
      SCANW[id] = (d, e) =>
        ok({
          d,
          e,
        });
      window.AndroidBridge.scan(id);
    });
  const PCSCAN = {
    on: false,
  };
  function pcScanTexts(on) {
    PCSCAN.on = on;
    const t = document.querySelector("#docRev .drtop b"),
      r = $("drRetake"),
      d = $("docRev");
    if (t) t.textContent = on ? "Scan prüfen" : "Foto prüfen";
    if (r) r.textContent = on ? "Neu scannen" : "Neu aufnehmen";
    if (d) d.setAttribute("aria-label", on ? "Scan prüfen" : "Foto prüfen");
  }
  const _dc = drChecks;
  drChecks = () => {
    if (!PCSCAN.on) return _dc();
    const A = DR.A,
      info = DR.info,
      blank = A.sharp < 8 && A.light > 190,
      R = [];
    R.push(["Scanner", ...(blank ? ["bad", "Seite leer", "nichts erkannt"] : ["good", "Gescannt", "300 dpi"])]);
    R.push([
      "Beleg",
      ...(A.found ? ["good", "Gefunden", "4 Ecken"] : ["warn", "Nicht gefunden", "Ecken an den Beleg ziehen"]),
    ]);
    if (info.lines) {
      const n = info.lines.length,
        r = n ? parseReceipt(info.lines) : {};
      R.push([
        "Text",
        ...(!n
          ? ["bad", "Kein Text", ""]
          : r.amount == null
            ? ["warn", `${n} Zeilen`, "kein Betrag"]
            : ["good", `${n} Zeilen`, "Betrag gefunden"]),
      ]);
    }
    $("drChecks").innerHTML = R.map(
      ([t, lv, a, b]) =>
        `<div class="drc ${lv}"><i></i><span><small>${t}</small><b>${a}</b>${b ? `<em>${b}</em>` : ""}</span></div>`
    ).join("");
    const tips = [];
    if (blank)
      tips.push(
        "Die Seite ist leer – leg den Beleg mit der Schrift nach unten auf die Glasscheibe und klicke auf „Neu scannen“."
      );
    else if (!A.found) tips.push("Zieh die gelben Ecken an den Rand des Belegs, dann wird nur der Beleg übernommen.");
    $("drTip").textContent = tips.join(" ");
    $("drTip").hidden = !tips.length;
  };
  async function pcScan() {
    if (!window.AndroidBridge || !window.AndroidBridge.scan) {
      toast(
        "Für den Scanner einmal die neue PC-App installieren – bis dahin kannst du ein Bild auswählen",
        null,
        null,
        7000
      );
      return smartScanFallback({});
    }
    toast("Scanner läuft … Beleg bitte auflegen", null, null, 60000);
    const { d, e } = await scanNow();
    if (!d) {
      toast(
        e === "noscanner"
          ? "Kein Scanner gefunden – ist er eingeschaltet und angeschlossen?"
          : "Scannen hat nicht geklappt: " + e,
        e === "noscanner" ? () => smartScanFallback({}) : null,
        e === "noscanner" ? "Bild wählen" : null,
        9000
      );
      return;
    }
    toast("Gescannt", null, null, 1200);
    try {
      let img = d;
      try {
        const blob = await (await fetch(d)).blob();
        img = await shrinkImage(
          new File([blob], "scan.jpg", {
            type: "image/jpeg",
          })
        );
      } catch (_) {}
      pcScanTexts(true);
      let rv;
      try {
        rv = await docReview(img, {});
      } finally {
        pcScanTexts(false);
      }
      if (!rv) return;
      if (rv.action === "retake") return pcScan();
      img = rv.img;
      scanWorking(true);
      const lines = await ocrDataUrl(img);
      scanWorking(false);
      const im = await loadImg(img),
        r = docClassify(lines || [], im.naturalHeight / im.naturalWidth);
      camReview({
        type: (r && r.type) || "rcpt",
        img,
        lines: lines || [],
        W: im.naturalWidth,
        H: im.naturalHeight,
        noBoxes: false,
      });
    } catch (x) {
      scanWorking(false);
      toast(x.message || "Der Scan konnte nicht gelesen werden");
    }
  }
  document.addEventListener(
    "click",
    (e) => {
      const b = e.target.closest('[data-addpick="pcscan"]');
      if (!b) return;
      e.stopImmediatePropagation();
      closeAddMenu();
      setTimeout(pcScan, 120);
    },
    true
  );
}
if (IS_PC) {
  const av = () => {
    try {
      renderAvatar();
    } catch (_) {}
  };
  const _r2 = render;
  render = (...a) => {
    const x = _r2(...a);
    try {
      av();
    } catch (e) {}
    return x;
  };
  av();
}
