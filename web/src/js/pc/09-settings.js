/* Einstellungen am PC */
if (IS_PC) {
  const PCSET = () => setGroups(true).filter(([t]) => t !== "hilfe");
  const syncOn = () => !!(SYNCABLE || window.AndroidBridge),
    parts = (k) => (k === "geraete" && syncOn() ? ["sync", "geraete"] : k === "konten" ? ["konten", "start"] : [k]),
    alias = {
      sync: "geraete",
      start: "konten",
    };
  const title = (k) => phTitle(k),
    sub = (k) => accSub(k);
  const col = (k) => themeCol(ACC_COL[k] || "#1a7a5c");
  let shown = "";
  const showPane = (k, anim) => {
    const r = $("pcsR");
    if (!r) return;
    accRestoreAll();
    const ks = parts(k);
    const tp = window.pcTilePane && window.pcTilePane(k);
    r.innerHTML = `<div class="pcsp${anim ? " pcsanim" : ""}"><div class="pcsph"><span class="saic" style="background:${col(k)}">${svgIcon(accIcon(k), 20)}</span><h2>${escHtml(title(k))}</h2></div>${(tp || "") + (tp ? ks.filter((x) => x !== k) : ks).map((x) => `<div class="sabody" id="sab-${x}"></div>`).join("")}</div>`;
    (tp ? ks.filter((x) => x !== k) : ks).forEach((x) => {
        try {
          accMount(x);
        } catch (e) {
          console.warn("pcset", x, e);
        }
      });
    shown = k;
  };
  const moveHl = () => {
    const L = $("pcsL"),
      hl = L && L.querySelector(".pcshl"),
      b = L && L.querySelector(".pcsi.on");
    if (!hl) return;
    if (!b) {
      hl.style.opacity = 0;
      return;
    }
    hl.style.opacity = 1;
    hl.style.top = b.offsetTop + "px";
    hl.style.height = b.offsetHeight + "px";
  };
  renderSetHome = function () {
    const el = $("setHome");
    if (!el) return;
    if (!$("pcsL")) {
      accRestoreAll();
      shown = "";
      el.innerHTML = `<div class="pcset"><nav class="pcsl" id="pcsL"><label class="pcss"><svg class="i" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/></svg><input id="setQ" type="search" placeholder="Einstellung suchen …" autocomplete="off" aria-label="Einstellung suchen"></label><div class="pcsits"><div class="pcshl"></div><div id="pcsItems"></div></div></nav><section class="pcsr" id="pcsR"></section></div>`;
    }
    const q = (ACC.q || "").trim().toLowerCase(),
      its = $("pcsItems"),
      groups = PCSET();
    const want = JSON.stringify([q, groups]);
    if (its.dataset.w !== want) {
      its.dataset.w = want;
      const hit = (k) =>
        !q ||
        (
          title(k) +
          " " +
          sub(k) +
          " " +
          parts(k)
            .map((x) =>
              liveSp(x)
                .map((e) => e.textContent)
                .join(" ")
            )
            .join(" ")
        )
          .toLowerCase()
          .includes(q);
      const html = groups
        .map(([g, ks]) => {
          ks = ks.filter(hit);
          return ks.length
            ? `<div class="pcsg">${escHtml(tabLabel(g))}</div>` +
                ks
                  .map(
                    (k) =>
                      `<button class="pcsi" data-pcset="${k}"><span class="saic" style="background:${col(k)}">${svgIcon(accIcon(k), 16)}</span><span class="sat"><b>${escHtml(title(k))}</b><small data-pcsub="${k}">${escHtml(sub(k))}</small></span></button>`
                  )
                  .join("")
            : "";
        })
        .join("");
      its.innerHTML =
        html || `<p class="small muted" style="padding:10px 12px">Nichts gefunden für „${escHtml(ACC.q)}“.</p>`;
      if (q) {
        const first = its.querySelector("[data-pcset]");
        if (first && !its.querySelector(`[data-pcset="${alias[ui.pcset] || ui.pcset}"]`))
          ui.pcset = first.dataset.pcset;
      }
    } else
      its.querySelectorAll("[data-pcsub]").forEach((s) => {
        const t = sub(s.dataset.pcsub);
        if (s.textContent !== t) s.textContent = t;
      });
    if (!ui.pcset || !SP_PAGES[alias[ui.pcset] || ui.pcset]) ui.pcset = "konten";
    const cur = alias[ui.pcset] || ui.pcset;
    its.querySelectorAll(".pcsi").forEach((b) => b.classList.toggle("on", b.dataset.pcset === cur));
    if (shown !== cur || !$("pcsR").children.length) showPane(cur, !!shown);
    else if (window.pcTileRepaint) window.pcTileRepaint();
    requestAnimationFrame(moveHl);
  };
  accGo = function (k) {
    if (k === "profil") {
      spSheetOpen("profil");
      return;
    }
    if (k === "feedback") {
      fbQuickGo();
      return;
    }
    if (k === "weiter") {
      invOpen();
      return;
    }
    if (!SP_PAGES[k]) return;
    ACC.q = "";
    const q = $("setQ");
    if (q) q.value = "";
    ui.pcset = alias[k] || k;
    if (ui.view !== "more") {
      ui.view = "more";
      render();
    }
    renderSetHome();
    window.scrollTo({
      top: 0,
    });
  };
  const _rsp = renderSpPages;
  renderSpPages = function (...a) {
    if (ui.sp && !spsOpen() && ui.sp !== "profil" && SP_PAGES[ui.sp]) ui.pcset = alias[ui.sp] || ui.sp;
    return _rsp.apply(this, a);
  };
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-pcset]");
    if (!b) return;
    ui.pcset = b.dataset.pcset;
    ui.pctAdd = "";
    renderSetHome();
  });
  addEventListener("resize", () => requestAnimationFrame(moveHl));
  const _rce = renderColorEd;
  renderColorEd = function (...a) {
    const r = _rce.apply(this, a);
    document.querySelectorAll(".colsec").forEach((s) => {
      const h = s.querySelector("h3");
      if (h && /^(Leiste unten|Bottom bar)$/i.test(h.textContent.trim())) s.hidden = true;
    });
    return r;
  };
}
/* Einstellungen am PC */
if (IS_PC) {
  const PT = {};
  const trash = `<svg class="i" viewBox="0 0 24 24" style="width:16px;height:16px"><path d="M4.5 7h15M9.5 7V4.8h5V7M6.5 7l.9 12.2h9.2l.9-12.2M10.2 10.5v5.5M13.8 10.5v5.5"/></svg>`;
  const ring = (p, c) => {
    const q = Math.max(0, Math.min(1, p));
    return `<svg class="pctring" viewBox="0 0 48 48"><circle cx="24" cy="24" r="19" fill="none" stroke="var(--sunk)" stroke-width="6"/><circle class="pcta" cx="24" cy="24" r="19" fill="none" stroke="${p > 1 ? "var(--bad)" : c}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${(q * 119.4).toFixed(1)} 200" transform="rotate(-90 24 24)"/><text x="24" y="28" text-anchor="middle" font-size="12.5" font-weight="800" fill="var(--fg)">${Math.round(p * 100)}%</text></svg>`;
  };
  const delBtn = (attr, v) =>
    `<button class="pctdel" ${attr}="${escHtml(v)}" aria-label="Löschen" title="Löschen">${trash}</button>`;
  const armed = (b) => {
    if (b.dataset.armed === "1") return true;
    b.dataset.armed = "1";
    b.classList.add("arm");
    b.innerHTML = `<b>Wirklich löschen?</b>`;
    setTimeout(() => {
      if (b.isConnected) {
        b.dataset.armed = "";
        b.classList.remove("arm");
        b.innerHTML = trash;
      }
    }, 3000);
    return false;
  };
  ui.pctAdd = ui.pctAdd || "";
  PT.budgets = () => {
    const b = store.settings.budgets || {},
      ym = ymOf(new Date()),
      mc = monthCalc(ym),
      spent = Object.fromEntries(catTotals(mc.tx, mc.fixPaid));
    const ks = Object.keys(b).filter((k) => b[k] > 0),
      free = cats("ausgabe").filter((c) => !(b[c] > 0));
    const tot = sum(ks, (k) => b[k]),
      used = sum(ks, (k) => spent[k] || 0);
    return `<p class="pcthint">${ks.length ? `${escHtml(fmtEur0(used))} von ${escHtml(fmtEur0(tot))} im ${escHtml(MONTHS[ymParts(ym)[1] - 1])} ausgegeben. Betrag antippen zum Ändern.` : "Leg fest, wie viel du pro Monat für eine Kategorie ausgeben willst – die Startseite zeigt dann, wie du liegst."}</p>
      <div class="pctg">${ks
        .map((k, i) => {
          const s = spent[k] || 0,
            c = catColor("ausgabe", k),
            col = c.startsWith("#") ? c : cssVar(c);
          return `<div class="pctk" style="--i:${i}">${delBtn("data-pcbdel", k)}<div class="pctrow">${ring(s / b[k], col)}<div class="pctt"><b>${escHtml(k)}</b><small>${escHtml(fmtEur0(s))} von <input class="pctin" data-pcbset="${escHtml(k)}" value="${escHtml(numStr(b[k]))}" inputmode="decimal" aria-label="Budget ${escHtml(k)}"> €</small><small class="${s > b[k] ? "bad" : ""}">${s > b[k] ? `${escHtml(fmtEur0(s - b[k]))} drüber` : `noch ${escHtml(fmtEur0(b[k] - s))}`}</small></div></div></div>`;
        })
        .join("")}
      ${ui.pctAdd === "budgets" ? `<div class="pctk pctform" style="--i:${ks.length}"><b>Neues Budget</b><label>Kategorie<select class="in" id="pcbCat">${free.map((c) => `<option>${escHtml(c)}</option>`).join("")}</select></label><label>Pro Monat<input class="in" id="pcbAmt" inputmode="decimal" placeholder="z. B. 150"></label><div class="pctbtns"><button class="btn" data-pctcancel>Abbrechen</button><button class="btn primary" data-pcbadd>Anlegen</button></div></div>` : free.length ? `<button class="pctk pctnew" data-pctnew="budgets" style="--i:${ks.length}">+ Budget anlegen</button>` : ""}</div>`;
  };
  const acctList = () => {
    const A = store.settings.accountAnchors || {},
      sp = store.settings.spaces || [];
    return [...new Set([...Object.keys(A), ...accountNames(), ...sp])].sort(
      (a, b) => (b === "Hauptkonto") - (a === "Hauptkonto") || a.localeCompare(b, "de")
    );
  };
  PT.konten = () => {
    const today = isoToday(),
      y = acctYearSel(),
      past = y < new Date().getFullYear(),
      asOf = acctYearAsOf(y),
      names = acctList().filter((n) => acctOn(n, y + "-01")),
      A = store.settings.accountAnchors || {},
      imp = new Set(accountNames()),
      sp = new Set(store.settings.spaces || []);
    const sb = (store.settings.startBalance || {})[y];
    /* vergangenes Jahr: Stände am 31.12. nur anzeigen – eingetragen wird immer der Stand von heute */
    const pastTile = (n, i) => {
      const bal = accountBalance(n, asOf);
      return `<div class="pctk ayold" style="--i:${i}"><small class="muted">${escHtml(n)}</small><div class="pctbig"><b class="pctval" data-noi18n>${bal == null ? "–" : escHtml(fmtEur(bal))}</b></div><small class="muted">${escHtml(bal == null ? uiText("ay_nobal") : uiText("ay_end", { y }))}</small></div>`;
    };
    return `<p class="pcthint">${past ? escHtml(uiText("ay_past_hint", { y })) : "Trag einmal ein, was heute auf einem Konto ist – die App rechnet von da an mit deinen Buchungen weiter. Geld zwischen diesen Konten zählt als Umbuchung, nicht als Ausgabe."}</p>
      <div class="pctg">${names
        .map((n, i) => {
          if (past) return pastTile(n, i);
          const bal = accountBalance(n, today);
          return `<div class="pctk" style="--i:${i}">${n === "Hauptkonto" ? "" : delBtn("data-pcadel", n)}<small class="muted">${escHtml(n)}${imp.has(n) ? " · aus Kontoauszug" : sp.has(n) ? " · Space" : ""}</small><div class="pctbig"><input class="pctin big" data-pcaset="${escHtml(n)}" value="${bal == null ? "" : escHtml(numStr(round2(bal)))}" placeholder="Stand eintragen" inputmode="decimal" aria-label="Stand ${escHtml(n)}"> <span>€</span></div><small class="muted">${A[n] ? `Stand heute${A[n].date !== today ? ` · eingetragen am ${escHtml(shortDate(A[n].date))}` : ""}` : "noch kein Stand"}</small></div>`;
        })
        .join("")}
      <div class="pctk" style="--i:${names.length}"><small class="muted">Kontostand am 1. Januar ${y}</small><div class="pctbig"><input class="pctin big" data-pcstart="${y}" value="${sb != null ? escHtml(numStr(sb)) : ""}" placeholder="0,00" inputmode="decimal" aria-label="Kontostand Jahresanfang"> <span>€</span></div><small class="muted">damit die Jahresrechnung stimmt</small></div>
      ${past ? "" : ui.pctAdd === "konten" ? `<div class="pctk pctform" style="--i:${names.length + 1}"><b>Neues Konto oder Space</b><label>Name<input class="in" id="pcaName" placeholder="z. B. Urlaub"></label><label>Stand heute<input class="in" id="pcaBal" inputmode="decimal" placeholder="0,00"></label><div class="pctbtns"><button class="btn" data-pctcancel>Abbrechen</button><button class="btn primary" data-pcaadd>Anlegen</button></div></div>` : `<button class="pctk pctnew" data-pctnew="konten" style="--i:${names.length + 1}">+ Konto oder Space</button>`}</div>${acctYearBlock()}`;
  };
  const aboList = () => {
    const A = aboCfg();
    return store.fixed
      .filter((f) => !debtFor(f.id) && (fixArea(f) === "Abos & Handy" || A[f.id]))
      .sort(
        (x, y) =>
          (aboDeadline(A[x.id]) || "9999").localeCompare(aboDeadline(A[y.id]) || "9999") ||
          String(x.name).localeCompare(String(y.name))
      );
  };
  const NOT = [
    [0, "jederzeit"],
    [0.5, "2 Wochen"],
    [1, "1 Monat"],
    [2, "2 Monate"],
    [3, "3 Monate"],
    [6, "6 Monate"],
  ];
  PT.abos = () => {
    const A = aboCfg(),
      L = aboList(),
      ym = ymOf(new Date()),
      ord = {
        red: 0,
        amb: 1,
        nodate: 2,
        grn: 3,
        done: 4,
        free: 5,
      };
    const I = L.map((f) => ({
      f,
      a: A[f.id] || {},
      s: vaStat(f, A[f.id]),
    })).sort((x, y) => ord[x.s.k] - ord[y.s.k] || (x.s.days ?? 9e9) - (y.s.days ?? 9e9));
    const perM = sum(L, (f) => {
        const a = planAmt(f, ym),
          r = f.rhythm || "monatlich";
        return r === "monatlich" ? a : r === "quartal" ? a / 3 : r === "halbjahr" ? a / 6 : r === "jahr" ? a / 12 : a;
      }),
      reds = I.filter((x) => x.s.k === "red").length;
    setTimeout(() => {
      const el = document.querySelector('.pctpane[data-pctk="abos"]:not(.still)');
      if (el && !el._va) {
        el._va = 1;
        vaAnimate(el);
      }
    }, 40);
    return `<p class="pcthint">${L.length ? `${L.length} Abos und Verträge · zusammen etwa ${escHtml(fmtEur0(perM))} im Monat. Die App erinnert dich 30 Tage vor der Kündigungsfrist.` : "Noch keine Abos. Leg hier Streaming, Handy, Fitnessstudio & Co. an."}</p>
      ${reds ? `<div style="margin:0 0 12px">${vaAlert(reds, true)}</div>` : ""}
      <div class="pctg">${I.map(({ f, a, s }, i) => {
        const amt = listAmt(f, ym),
          pos = s.days != null ? Math.max(0.04, Math.min(0.96, 1 - s.days / 365)) : 0.5;
        return `<div class="pctk vapc k-${s.k}" style="--i:${i}">${delBtn("data-pcodel", f.id)}<div class="pctrow">${vaIcon(f, s)}<div class="pctt"><b>${escHtml(f.name)}</b><small>${escHtml(fmtEur(amt))} · ${escHtml(f.rhythm === "jahr" ? "jährlich" : f.rhythm === "quartal" ? "vierteljährlich" : f.rhythm === "halbjahr" ? "halbjährlich" : "monatlich")}</small></div></div><div class="vapcb"><span class="vab b-${s.k}" data-noi18n>${vaBadge(s)}</span></div>
          ${
            s.dl
              ? `<div class="vatl" data-noi18n><div class="vatl-l"><i style="--w:${(pos * 100).toFixed(1)}%"></i></div><div class="vatl-m" style="--x:${(pos * 100).toFixed(1)}%"><b>${escHtml(uiText("va_today"))}</b></div><div class="vatl-f"><b>${escHtml(
                  uiText("va_dl", {
                    d: fxDate(s.dl, {
                      day: "2-digit",
                      month: "2-digit",
                    }),
                  })
                )}</b></div></div>`
              : ""
          }
          <div class="pctab"><label>Läuft bis<input class="in" type="date" data-aboend="${escHtml(f.id)}" value="${escHtml(a.end || "")}"></label><label>Frist<select class="in" data-abonot="${escHtml(f.id)}">${NOT.map(([v, l]) => `<option value="${v}" ${Number(a.notice || 0) === v ? "selected" : ""}>${l}</option>`).join("")}</select></label></div>
          <div class="vabtns" data-noi18n>${s.k !== "done" && a.end ? `<button type="button" class="vakb ${s.k === "red" ? "hot" : ""}" data-valetter="${escHtml(f.id)}">✉️ ${escHtml(uiText("va_write"))}</button>` : ""}<button type="button" class="vadone ${s.k === "done" ? "on" : ""}" data-vadone="${escHtml(f.id)}">${s.k === "done" ? "✓ " + escHtml(uiText("va_isdone")) : escHtml(uiText("va_mark"))}</button></div></div>`;
      }).join("")}
      ${ui.pctAdd === "abos" ? `<div class="pctk pctform" style="--i:${L.length}"><b>Neues Abo</b><label>Name<input class="in" id="pcoName" placeholder="z. B. Netflix"></label><div class="pctab"><label>Betrag<input class="in" id="pcoAmt" inputmode="decimal" placeholder="0,00"></label><label>Rhythmus<select class="in" id="pcoRh"><option value="monatlich">monatlich</option><option value="jahr">jährlich</option><option value="quartal">vierteljährlich</option></select></label></div><div class="pctbtns"><button class="btn" data-pctcancel>Abbrechen</button><button class="btn primary" data-pcoadd>Anlegen</button></div><small class="muted">Steht danach auch bei den Fixkosten.</small></div>` : `<button class="pctk pctnew" data-pctnew="abos" style="--i:${L.length}">+ Abo anlegen</button>`}</div>`;
  };
  window.pcTilePane = (k) => (PT[k] ? `<div class="pctpane" data-pctk="${k}">${PT[k]()}</div>` : null);
  const repaint = () => {
    const el = document.querySelector("#pcsR .pctpane");
    if (!el) return;
    if ((el.contains(document.activeElement) && /INPUT|SELECT/.test(document.activeElement.tagName)) || pdHold(el))
      return;
    const k = el.dataset.pctk;
    el.innerHTML = PT[k]();
    el.classList.add("still");
  };
  window.pcTileRepaint = repaint;
  const after = (msg) => {
    ui.pctAdd = "";
    try {
      document.activeElement && document.activeElement.blur();
    } catch (_) {}
    if (msg) toast(msg);
    repaint();
  };
  document.addEventListener("click", async (e) => {
    if (e.target.closest(".pctpane .ayblk") && (await acctYearClick(e, () => after("")))) return;
    const n = e.target.closest("[data-pctnew]");
    if (n) {
      ui.pctAdd = n.dataset.pctnew;
      repaint();
      setTimeout(() => {
        const f = document.querySelector("#pcsR .pctform input, #pcsR .pctform select");
        if (f) f.focus();
      }, 30);
      return;
    }
    if (e.target.closest("[data-pctcancel]")) {
      after();
      return;
    }
    let b = e.target.closest("[data-pcbdel]");
    if (b) {
      if (!armed(b)) return;
      const B = {
        ...(store.settings.budgets || {}),
      };
      delete B[b.dataset.pcbdel];
      store.settings.budgets = B;
      await saveSettings();
      after("Budget gelöscht");
      return;
    }
    if (e.target.closest("[data-pcbadd]")) {
      const c = $("pcbCat").value,
        v = parseAmt($("pcbAmt").value);
      if (!(v > 0)) {
        toast("Bitte einen Betrag eingeben");
        $("pcbAmt").focus();
        return;
      }
      store.settings.budgets = {
        ...(store.settings.budgets || {}),
        [c]: round2(v),
      };
      await saveSettings();
      after(`Budget für ${c} angelegt`);
      return;
    }
    b = e.target.closest("[data-pcadel]");
    if (b) {
      if (!armed(b)) return;
      const n2 = b.dataset.pcadel,
        A = {
          ...(store.settings.accountAnchors || {}),
        };
      delete A[n2];
      store.settings.accountAnchors = A;
      store.settings.spaces = (store.settings.spaces || []).filter((x) => x !== n2);
      await saveSettings();
      after(`${n2} entfernt`);
      return;
    }
    if (e.target.closest("[data-pcaadd]")) {
      const nm = $("pcaName").value.trim(),
        raw = $("pcaBal").value.trim();
      if (!nm) {
        toast("Bitte einen Namen eingeben");
        $("pcaName").focus();
        return;
      }
      if (nm !== "Hauptkonto" && !(store.settings.spaces || []).includes(nm))
        store.settings.spaces = [...(store.settings.spaces || []), nm];
      if (raw) {
        const v = parseAmt(raw);
        if (!isFinite(v)) {
          toast("Bitte eine Zahl eingeben");
          return;
        }
        store.settings.accountAnchors = {
          ...(store.settings.accountAnchors || {}),
          [nm]: {
            date: isoToday(),
            balance: round2(v),
            ts: Date.now(),
          },
        };
      }
      await saveSettings();
      after(`${nm} angelegt`);
      return;
    }
    b = e.target.closest("[data-pcodel]");
    if (b) {
      if (!armed(b)) return;
      const id = b.dataset.pcodel,
        f = store.fixed.find((x) => x.id === id);
      const A = {
        ...(store.settings.abos || {}),
      };
      delete A[id];
      store.settings.abos = A;
      if (await safe(() => deleteDoc("fixed", id))) {
        await saveSettings();
        after(`${f ? f.name : "Abo"} gelöscht`);
      }
      return;
    }
    if (e.target.closest("[data-pcoadd]")) {
      const nm = $("pcoName").value.trim(),
        v = parseAmt($("pcoAmt").value),
        rh = $("pcoRh").value;
      if (!nm) {
        toast("Bitte einen Namen eingeben");
        $("pcoName").focus();
        return;
      }
      if (!(v > 0)) {
        toast("Bitte einen Betrag eingeben");
        $("pcoAmt").focus();
        return;
      }
      const id = newId(),
        doc = {
          name: nm,
          amount: round2(v),
          kind: "privat",
          order: store.fixed.length,
        };
      if (rh !== "monatlich") doc.rhythm = rh;
      if (await safe(() => saveDoc("fixed", id, doc))) {
        store.settings.abos = {
          ...(store.settings.abos || {}),
          [id]: {
            abo: 1,
          },
        };
        await saveSettings();
        after(`${nm} angelegt`);
      }
      return;
    }
  });
  document.addEventListener("change", async (e) => {
    const t = e.target;
    if (t.dataset.pcbset) {
      const v = parseAmt(t.value);
      const B = {
        ...(store.settings.budgets || {}),
      };
      if (!(v > 0)) {
        toast("Bitte einen Betrag eingeben");
        t.value = numStr(B[t.dataset.pcbset] || "");
        return;
      }
      B[t.dataset.pcbset] = round2(v);
      store.settings.budgets = B;
      t.blur();
      await saveSettings();
      toast("Budget gespeichert");
      repaint();
      return;
    }
    if (t.dataset.pcaset) {
      const raw = t.value.trim();
      if (!raw) return;
      const v = parseAmt(raw);
      if (!isFinite(v)) {
        toast("Bitte eine Zahl eingeben");
        return;
      }
      store.settings.accountAnchors = {
        ...(store.settings.accountAnchors || {}),
        [t.dataset.pcaset]: {
          date: isoToday(),
          balance: round2(v),
          ts: Date.now(),
        },
      };
      t.blur();
      await saveSettings();
      toast("Stand gespeichert");
      repaint();
      return;
    }
    if (t.dataset.pcstart) {
      const y = t.dataset.pcstart,
        raw = t.value.trim(),
        sb = {
          ...(store.settings.startBalance || {}),
        };
      if (!raw) delete sb[y];
      else {
        const v = parseAmt(raw);
        if (!isFinite(v)) {
          toast("Bitte eine Zahl eingeben");
          return;
        }
        sb[y] = round2(v);
      }
      store.settings.startBalance = sb;
      t.blur();
      await saveSettings();
      toast("Gespeichert");
      repaint();
      return;
    }
    if ((t.dataset.aboend != null || t.dataset.abonot != null) && t.closest(".pctpane")) setTimeout(repaint, 50);
  });
  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Enter" && e.target.closest(".pctform")) {
        e.preventDefault();
        const ok = e.target.closest(".pctform").querySelector(".btn.primary");
        if (ok) ok.click();
      }
      if (e.key === "Escape" && e.target.closest(".pctform")) {
        e.stopPropagation();
        after();
      }
    },
    true
  );
}
