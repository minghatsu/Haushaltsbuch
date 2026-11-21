/* ===== Konto / Space bei der Buchung ===== */
/* Alle Konten und Spaces, egal in welchem Jahr */
function kaAll() {
  const s = new Set(accountNames());
  for (const k of Object.keys(store.settings.accountAnchors || {})) s.add(k);
  for (const k of store.settings.spaces || []) if (k) s.add(k);
  if (!s.size) return [];
  s.add("Hauptkonto");
  return [...s].sort((a, b) => (b === "Hauptkonto") - (a === "Hauptkonto") || a.localeCompare(b, "de"));
}
/* Konten je Jahr: settings.acctYears = { "2023": ["Girokonto alt"], … } hält die ausgeschalteten
   Konten eines Jahres. Ein Jahr ohne eigenen Eintrag übernimmt den letzten Eintrag davor. */
function acctOffIn(year) {
  const Y = store.settings.acctYears || {},
    ks = Object.keys(Y)
      .map(Number)
      .filter((k) => k <= year)
      .sort((a, b) => b - a);
  return new Set(ks.length ? Y[ks[0]] : []);
}
function acctOn(name, ym) {
  if (name === "Hauptkonto") return true;
  const y = Number(String(ym || ui.ym || isoToday()).slice(0, 4));
  return !acctOffIn(y).has(name);
}
async function acctSetYear(name, year, on) {
  if (name === "Hauptkonto") return;
  const Y = { ...(store.settings.acctYears || {}) },
    before = [...acctOffIn(year)],
    off = new Set(before);
  if (on) off.delete(name);
  else off.add(name);
  /* ein vergangenes Jahr ändern: die Jahre danach bleiben, wie sie waren */
  if (year < new Date().getFullYear() && !Y[year + 1]) Y[year + 1] = before;
  Y[year] = [...off].sort();
  store.settings.acctYears = Y;
  await saveSettings();
}
function acctYearsList() {
  const now = new Date().getFullYear();
  let min = now;
  const see = (v) => {
    const y = Number(String(v || "").slice(0, 4));
    if (y > 2000 && y < min) min = y;
  };
  for (const t of store.tx || []) see(t.date);
  for (const k of Object.keys(store.months || {})) see(k);
  for (const k of Object.keys(store.settings.acctYears || {})) see(k);
  const out = [];
  /* mindestens die letzten drei Jahre, auch wenn es dort noch keine Buchungen gibt */
  for (let y = Math.max(Math.min(min, now - 3), now - 7); y <= now; y++) out.push(y);
  return out;
}
/* Einstellungen: Jahr wählen, Konten für dieses Jahr an- oder ausschalten */
function acctYearBlock() {
  const names = kaAll();
  if (names.length < 2) return "";
  const ys = acctYearsList(),
    shown = Number(String(ui.ym || isoToday()).slice(0, 4)),
    y = ys.includes(ui.acctY) ? ui.acctY : ys.includes(shown) ? shown : ys[ys.length - 1],
    off = acctOffIn(y);
  return `<div class="ayblk"><b class="ayt">${escHtml(uiText("ay_t"))}</b><p class="small muted">${escHtml(uiText("ay_hint"))}</p>
    <div class="ayyrs" role="tablist">${ys.map((v) => `<button type="button" class="ayy ${v === y ? "on" : ""}" role="tab" aria-selected="${v === y}" data-ayyear="${v}" data-noi18n>${v}</button>`).join("")}</div>
    <div class="aylist">${names
      .map((n) => {
        const main = n === "Hauptkonto",
          on = main || !off.has(n);
        return `<div class="ayrow ${on ? "" : "off"}"><i style="background:${kaCol(n)}">${kaIcon(n)}</i><span class="ayn"><b data-noi18n>${escHtml(n)}</b>${main || !on ? `<small>${escHtml(uiText(main ? "ay_main" : "ay_hid"))}</small>` : ""}</span>${main ? "" : `<button type="button" class="tg ${on ? "on" : ""}" role="switch" aria-checked="${on}" data-ayacct="${escHtml(n)}" data-ayy="${y}" aria-label="${escHtml(uiText(on ? "ay_on" : "ay_off", { a: n, y }))}"></button>`}</div>`;
      })
      .join("")}</div></div>`;
}
async function acctYearClick(e, repaint) {
  const yb = e.target.closest("[data-ayyear]");
  if (yb) {
    ui.acctY = Number(yb.dataset.ayyear);
    SND.play("tick");
    repaint();
    return true;
  }
  const tb = e.target.closest("[data-ayacct]");
  if (!tb) return false;
  const n = tb.dataset.ayacct,
    y = Number(tb.dataset.ayy),
    on = tb.getAttribute("aria-checked") !== "true";
  ui.acctY = y;
  await acctSetYear(n, y, on);
  toast(uiText(on ? "ay_on" : "ay_off", { a: n, y }));
  repaint();
  return true;
}
document.addEventListener("click", (e) => {
  if (!e.target.closest(".ayblk") || e.target.closest(".pctpane")) return;
  acctYearClick(e, () => {
    try {
      document.activeElement && document.activeElement.blur();
    } catch (_) {}
    render();
  });
});
/* Konten, die es im Jahr des gezeigten Monats gibt */
function kaNames(ym) {
  return kaAll().filter((n) => acctOn(n, ym));
}
function kaOn() {
  return kaNames().length > 1;
}
function kaFor(cat, ym) {
  const m = store.settings.acctByCat || {},
    n = kaNames(ym);
  const v = cat && m[cat];
  return v && n.includes(v) ? v : "Hauptkonto";
}
function kaOf(t) {
  if (t && t.acct) return t.acct;
  let b = null;
  try {
    b = bankAcctOf(t);
  } catch (_) {}
  return b || "Hauptkonto";
}
function kaIcon(n) {
  const s = normText(n);
  return svgIcon(
    n === "Hauptkonto"
      ? "bank"
      : /auto|tank|kfz/.test(s)
        ? "car"
        : /einkauf|lebensmittel|essen/.test(s)
          ? "cart"
          : /steuer|finanz/.test(s)
            ? "receipt"
            : /urlaub|reise/.test(s)
              ? "plane"
              : /spar|ruecklage|rücklage|notgroschen/.test(s)
                ? "piggy"
                : /monat|fix|kosten|miete/.test(s)
                  ? "cal"
                  : /kind|baby/.test(s)
                    ? "kids"
                    : /geschenk|weihnacht/.test(s)
                      ? "gift"
                      : "card",
    18
  );
}
function kaCol(n) {
  try {
    const i = kaAll().indexOf(n);
    return (
      acctColor(n, i) ||
      (n === "Hauptkonto"
        ? "var(--accent)"
        : ["#3d63a8", "#c47a12", "#8a4fb5", "#b42318", "#0f8a8a", "#a0522d"][Math.max(0, i - 1) % 6])
    );
  } catch (_) {
    return "var(--accent)";
  }
}
function kaRender() {
  const el = $("acctRow");
  if (!el) return;
  const show =
    kaOn() &&
    ["ausgabe", "einnahme", "betrieb"].includes(ui.kind) &&
    ui.pay !== "bar" &&
    !(ui.kind === "ausgabe" && isWithdrawCat(ui.cat));
  el.hidden = !show;
  if (!show) {
    ui.kaOpen = false;
    return;
  }
  const fy = ($("fDate") && $("fDate").value) || isoToday();
  if (!ui.acct || !kaNames(fy).includes(ui.acct)) ui.acct = kaFor(ui.cat, fy);
  const n = ui.acct,
    bal = accountBalance(n, isoToday()),
    amt = parseAmt($("fAmount").value) || 0,
    old = ui.editId ? store.tx.find((t) => t.id === ui.editId) : null;
  const sg = ui.kind === "einnahme" ? 1 : -1,
    osg = old
      ? manualSign(old) ||
        (old.importKey && old.pay !== "bar"
          ? old.kind === "einnahme"
            ? 1
            : ["ausgabe", "betrieb", "vorauszahlung"].includes(old.kind)
              ? -1
              : 0
          : 0)
      : 0,
    oldIn = old && kaOf(old) === n && osg ? osg * (Number(old.amount) || 0) : 0,
    after = bal == null ? null : bal - oldIn + sg * amt;
  el.innerHTML = `<button type="button" class="karow" data-katoggle aria-expanded="${ui.kaOpen ? "true" : "false"}"><i style="background:${kaCol(n)}">${kaIcon(n)}</i><span class="kat"><b data-noi18n>${escHtml(n)}</b><small>${escHtml(n === "Hauptkonto" ? uiText("ka_main") : uiText("ka_space"))}${
    after != null
      ? ` · <span class="${after < 0 ? "neg" : ""}">${escHtml(
          uiText("ka_after", {
            n: fmtEur(after),
          })
        )}</span>`
      : ""
  }</small></span><span class="kach">${escHtml(uiText("ka_change"))} <em>›</em></span></button>
    <div class="kalist"${ui.kaOpen ? "" : " hidden"}><div class="kalh">${escHtml(ui.kind === "einnahme" ? uiText("ka_pick_in") : uiText("ka_pick"))}</div>${kaNames(
      fy
    )
      .map((x) => {
        const b = accountBalance(x, isoToday());
        return `<button type="button" class="kaopt ${x === n ? "on" : ""}" data-kapick="${escHtml(x)}"><i style="background:${kaCol(x)}">${kaIcon(x)}</i><span class="kaon" data-noi18n>${escHtml(x)}</span><small>${b == null ? escHtml(uiText("ka_nobal")) : escHtml(fmtEur(b))}</small>${x === n ? "<b>✓</b>" : ""}</button>`;
      })
      .join("")}</div>`;
}
document.addEventListener("click", (e) => {
  const tg = e.target.closest("[data-katoggle]");
  if (tg) {
    ui.kaOpen = !ui.kaOpen;
    kaRender();
    const L = $("acctRow").querySelector(".kalist");
    if (ui.kaOpen && L && !reducedMotion()) {
      L.animate(
        [
          {
            opacity: 0,
            transform: "translateY(-8px)",
          },
          {
            opacity: 1,
            transform: "none",
          },
        ],
        {
          duration: 320,
          easing: "cubic-bezier(.2,1.2,.35,1)",
        }
      );
      L.querySelectorAll(".kaopt").forEach((o, i) =>
        o.animate(
          [
            {
              opacity: 0,
              transform: "translateX(-12px)",
            },
            {
              opacity: 1,
              transform: "none",
            },
          ],
          {
            duration: 360,
            delay: 40 + i * 45,
            easing: "cubic-bezier(.2,1.2,.35,1)",
            fill: "backwards",
          }
        )
      );
      L.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
    return;
  }
  const pk = e.target.closest("[data-kapick]");
  if (pk) {
    ui.acct = pk.dataset.kapick;
    ui.kaManual = true;
    ui.kaOpen = false;
    kaRender();
    const r = $("acctRow").querySelector(".karow");
    if (r && !reducedMotion()) {
      r.animate(
        [
          {
            transform: "scale(.96)",
          },
          {
            transform: "scale(1.02)",
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
      const i = r.querySelector("i");
      i.animate(
        [
          {
            transform: "scale(.4) rotate(-20deg)",
          },
          {
            transform: "scale(1.2)",
          },
          {
            transform: "none",
          },
        ],
        {
          duration: 480,
          easing: "cubic-bezier(.3,1.6,.5,1)",
        }
      );
    }
  }
});
document.addEventListener("input", (e) => {
  if (e.target && e.target.id === "fAmount") kaRender();
});
