/* Einstellungen am PC und Tablet: Übersicht in vier Spalten, die Einstellung öffnet als Seitenfenster rechts */
if (IS_PC) {
  const calm = () => pcCalm();
  const tTitle = (k) => phTitle(k);
  let tsQ = "";
  const tsRow = (k) => {
    const act = k === "wiz" ? `data-qwiz="1"` : `data-tsgo="${k}"`,
      sb = setSub(k),
      on = ui.tabOpen && (ui.pcset === k || (k === "geraete" && ui.pcset === "sync"));
    return `<button class="tsr${on ? " on" : ""}" ${act} data-tsk="${k}"><span class="saic tsic">${svgIcon(accIcon(k), 17)}</span><span class="sat"><b>${escHtml(tTitle(k))}</b>${sb ? `<small>${escHtml(sb)}</small>` : ""}</span></button>`;
  };
  function tabSetHTML() {
    const n = String(store.settings.name || "").trim(),
      p = store.settings.photo,
      f = devForm(),
      badge = `<span class="avdev">${devIc(f, 11)}</span>`;
    const av = p
      ? `<img src="${escHtml(p)}" alt="">${badge}`
      : n
        ? `<span class="avl">${escHtml(n[0].toUpperCase())}</span>${badge}`
        : devIc(f, 22);
    const qs = quickSw().filter(([k]) => !(IS_DESK && k === "dark"));
    return `<div class="card tsprof"><button class="topav ${!p && !n ? "devav" : ""}" data-tsprof="1" aria-label="Profil">${av}</button><div class="tspn"><b>${escHtml(n || devModel())}</b><small>${escHtml([n ? devModel() : "", verFull()].filter(Boolean).join(" · "))}</small></div><label class="tsq"><svg class="i" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/></svg><input id="tsQ" type="search" placeholder="Einstellung suchen …" autocomplete="off" aria-label="Einstellung suchen"></label><div class="qpills">${qs.map(qsTile).join("")}</div><button class="btn" data-tsprof="1">Profil</button></div>
      <div class="tsgr">${setGroups(true)
        .map(
          ([t, ks]) =>
            `<section class="card tsg"><h3>${escHtml(tabLabel(t))}</h3>${ks
              .filter((k) => SP_PAGES[k] || k === "weiter" || k === "wiz")
              .map(tsRow)
              .join("")}</section>`
        )
        .join("")}</div><p class="tsnone small muted" hidden></p>`;
  }
  /* Suche filtert die Übersicht direkt */
  const tsFilter = () => {
    const m = $("tabSet");
    if (!m) return;
    const q = tsQ.trim().toLowerCase();
    let hits = 0;
    m.querySelectorAll(".tsg").forEach((g) => {
      let n = 0;
      g.querySelectorAll(".tsr").forEach((r) => {
        const k = r.dataset.tsk,
          txt = q
            ? (
                r.textContent +
                " " +
                (k === "geraete" ? ["sync", "geraete"] : k === "konten" ? ["konten", "start"] : [k])
                  .map((x) =>
                    liveSp(x)
                      .map((e) => e.textContent)
                      .join(" ")
                  )
                  .join(" ")
              ).toLowerCase()
            : "";
        const ok = !q || txt.includes(q);
        r.hidden = !ok;
        if (ok) n++;
      });
      g.hidden = !n;
      hits += n;
    });
    const no = m.querySelector(".tsnone");
    if (no) {
      no.hidden = !!hits;
      no.textContent = hits ? "" : `Nichts gefunden für „${tsQ.trim()}“.`;
    }
  };
  const ensureScrim = (ps) => {
    if (!document.querySelector(".tsscrim"))
      ps.insertAdjacentHTML("beforebegin", `<div class="tsscrim" data-tsback="1" aria-hidden="true"></div>`);
  };
  const _rsh = renderSetHome;
  renderSetHome = function (...a) {
    const r = _rsh.apply(this, a),
      el = $("setHome");
    if (!el) return r;
    const ps = el.querySelector(".pcset");
    if (!ps) return r;
    let mix = $("tabSet");
    if (!mix) {
      ps.insertAdjacentHTML("beforebegin", `<div id="tabSet"></div>`);
      mix = $("tabSet");
    }
    ensureScrim(ps);
    const open = !!ui.tabOpen;
    mix.hidden = false;
    ps.hidden = !open;
    document.documentElement.classList.toggle("tsdrawer", open);
    const h = tabSetHTML();
    if (mix.dataset.h !== h) {
      const foc = document.activeElement && document.activeElement.id === "tsQ";
      mix.dataset.h = h;
      mix.innerHTML = h;
      const q = $("tsQ");
      if (q) {
        q.value = tsQ;
        if (foc) q.focus();
      }
      tsFilter();
    }
    if (open) {
      const ph = ps.querySelector(".pcsph");
      if (ph && !ph.querySelector("[data-tsback]"))
        ph.insertAdjacentHTML(
          "beforeend",
          `<button class="tsx" data-tsback="1" aria-label="Schließen" title="Schließen (Esc)"><svg class="i" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button>`
        );
    }
    return r;
  };
  const _ag = accGo;
  accGo = function (k) {
    if (k !== "profil" && k !== "weiter" && k !== "feedback") ui.tabOpen = 1;
    return _ag(k);
  };
  const slideIn = () => {
    const pn = document.querySelector("#setHome .pcset");
    if (pn && !calm())
      pn.animate(
        [
          { opacity: 0, transform: "translateX(48px)" },
          { opacity: 1, transform: "none" },
        ],
        { duration: 320, easing: "cubic-bezier(.2,.8,.2,1)" }
      );
  };
  const tsClose = () => {
    if (!ui.tabOpen) return;
    const pn = document.querySelector("#setHome .pcset"),
      done = () => {
        ui.tabOpen = 0;
        renderSetHome();
      };
    if (pn && !calm()) {
      const a = pn.animate(
        [
          { opacity: 1, transform: "none" },
          { opacity: 0, transform: "translateX(48px)" },
        ],
        { duration: 200, easing: "cubic-bezier(.4,0,1,1)", fill: "forwards" }
      );
      a.onfinish = () => {
        done();
        a.cancel();
      };
    } else done();
  };
  document.addEventListener("click", (e) => {
    const g = e.target.closest("[data-tsgo]");
    if (g) {
      const k = g.dataset.tsgo;
      if (k === "weiter") {
        invOpen();
        return;
      }
      const was = !!ui.tabOpen;
      ui.tabOpen = 1;
      ui.pcset = k;
      renderSetHome();
      if (!was) slideIn();
      return;
    }
    if (e.target.closest("[data-tsback]")) {
      tsClose();
      return;
    }
    if (e.target.closest("[data-tsprof]")) {
      accGo("profil");
      return;
    }
    /* wer oben eine andere Seite wählt, schließt das Seitenfenster */
    if (ui.tabOpen && e.target.closest("[data-go],.tabs .tab,#pcNav button")) {
      ui.tabOpen = 0;
      document.documentElement.classList.remove("tsdrawer");
    }
  });
  document.addEventListener("input", (e) => {
    if (e.target.id !== "tsQ") return;
    tsQ = e.target.value;
    tsFilter();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.id === "tsQ") {
      const f = document.querySelector("#tabSet .tsr:not([hidden])");
      if (f) f.click();
      return;
    }
    if (e.key !== "Escape" || !ui.tabOpen || ui.view !== "more") return;
    if (document.querySelector(".hobg.show,.backdrop:not([hidden]),#invBg,#pcDevPage")) return;
    tsClose();
  });
}
