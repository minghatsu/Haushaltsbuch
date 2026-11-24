/* Sparziele */
const GOAL_COLORS = ["#1F8A70", "#3B6FD8", "#C2573A", "#8A4FD1", "#C9921B", "#2A9DB0"];
function goalSaved(g) {
  if (g.account) {
    const b = accountBalance(g.account, isoToday());
    if (b !== null)
      return {
        v: b,
        linked: true,
      };
  }
  return {
    v:
      (Number(g.start) || 0) +
      sum(g.log || [], (x) => Number(x.v) || 0) +
      (typeof srForGoal === "function" ? srForGoal(g.id) : 0),
    linked: false,
  };
}
function monthsLeft(due) {
  if (!due) return 0;
  const [y, m] = due.split("-").map(Number),
    n = new Date();
  return Math.max(1, (y - n.getFullYear()) * 12 + (m - (n.getMonth() + 1)) + 1);
}
function goalsCard() {
  const goals = store.settings.goals || [];
  if (ui.goalEdit)
    return `<div class="card" style="order:7"><div class="card-head"><h2>Sparziele bearbeiten</h2><button class="btn primary" id="goalDone">Fertig</button></div>
    ${goals
      .map(
        (g, i) => `<div class="goaled" data-gid="${escHtml(g.id)}">
      <div class="grid2"><div class="field"><label for="gn-${escHtml(g.id)}">Name</label><input class="in" id="gn-${escHtml(g.id)}" data-gf="name" value="${escHtml(g.name)}"></div>
        <div class="field"><label for="gt-${escHtml(g.id)}">Ziel (€)</label><input class="in" id="gt-${escHtml(g.id)}" data-gf="target" inputmode="decimal" value="${escHtml(numStr(g.target || 0))}"></div></div>
      <div class="grid2"><div class="field"><label for="gd-${escHtml(g.id)}">Bis wann (optional)</label><input class="in" type="month" id="gd-${escHtml(g.id)}" data-gf="due" value="${escHtml(g.due || "")}"></div>
        <div class="field"><label for="ga-${escHtml(g.id)}">Stand aus Konto</label><select class="in" id="ga-${escHtml(g.id)}" data-gf="account"><option value="">– selbst eintragen –</option>${accountNames()
          .map(
            (n) =>
              `<option ${g.account === n ? "selected" : ""} value="${escHtml(n)}">${escHtml(n)}${(store.settings.accountAnchors || {})[n] ? "" : " (Stand fehlt)"}</option>`
          )
          .join("")}</select></div></div>
      ${g.account ? "" : `<div class="field"><label for="gs-${escHtml(g.id)}">Schon gespart (Startwert, €)</label><input class="in" id="gs-${escHtml(g.id)}" data-gf="start" inputmode="decimal" value="${escHtml(numStr(g.start || 0))}"></div>`}
      <div><button class="btn danger" data-gdel="${escHtml(g.id)}">Löschen</button></div></div>`
      )
      .join("")}
    <button class="btn" id="goalAdd" style="margin-top:12px">+ Sparziel hinzufügen</button>
    <p class="small muted" style="margin:10px 0 0">Mit „Stand aus Konto“ zählt der Kontostand eines Kontos oder N26-Space automatisch als gespart – dafür muss der Stand unter Einstellungen › Konten eingetragen sein.</p></div>`;
  if (!goals.length)
    return `<div class="card" style="order:7"><div class="card-head"><h2>${headIcon("piggy")}Sparziele</h2></div>
    <div class="notice info"><span>Spar auf etwas hin – Urlaub, Hochzeit, Notgroschen – und sieh, wie viel du jeden Monat zurücklegen musst.</span><button class="btn primary" id="goalFirst">Sparziel anlegen</button></div></div>`;
  return `<div class="card" style="order:7"><div class="card-head"><h2>${headIcon("piggy")}Sparziele</h2><button class="link" id="goalEditBtn">Bearbeiten ${svgIcon("right", 16)}</button></div>
    ${goals
      .map((g, i) => {
        const sv = goalSaved(g),
          t = Number(g.target) || 0,
          pct = t ? Math.min(100, Math.max(0, (sv.v / t) * 100)) : 0,
          rest = Math.max(0, t - sv.v),
          ml = monthsLeft(g.due),
          col = GOAL_COLORS[i % GOAL_COLORS.length];
        const sub =
          rest <= 0
            ? `<b style="color:var(--good)">Ziel erreicht!</b>`
            : g.due
              ? `noch ${escHtml(fmtEur(rest))} · <b>${escHtml(fmtEur(rest / ml))} im Monat</b> bis ${escHtml(MSHORT[Number(g.due.slice(5, 7)) - 1])} ${escHtml(g.due.slice(0, 4))}`
              : `noch ${escHtml(fmtEur(rest))}`;
        return `<div class="goal"><div class="meta-row"><span><b>${escHtml(g.name)}</b>${sv.linked ? ` <span class="small muted">· ${escHtml(g.account)}</span>` : ""}</span><span>${escHtml(fmtEur(sv.v))} <span class="small muted">von ${escHtml(fmtEur0(t))}</span></span></div>
        <div class="track" style="height:10px;margin:7px 0 6px"><div class="fill" style="width:${pct}%;background:${col}"></div></div>
        <div class="meta-row small"><span class="muted">${sub}</span><span class="muted">${Math.round(pct)} %</span></div>
        ${sv.linked ? "" : ui.goalPay === g.id ? `<div class="goalpay"><input class="in" id="goalPayIn" inputmode="decimal" placeholder="Betrag, z. B. 50 (minus = entnehmen)" aria-label="Betrag für ${escHtml(g.name)}"><button class="btn primary" data-gpaygo="${escHtml(g.id)}">OK</button><button class="btn" data-gpaycancel="1">Abbrechen</button></div>` : `<button class="link small goalpaybtn" data-gpay="${escHtml(g.id)}">+ Einzahlen</button>`}</div>`;
      })
      .join("")}
  </div>`;
}
function saveGoals(goals) {
  store.settings.goals = goals;
  saveSettings();
  render();
}
document.addEventListener("click", (e) => {
  const t = e.target;
  if (t.closest("#goalFirst")) {
    ui.goalEdit = true;
    saveGoals([
      {
        id: newId(),
        name: "Notgroschen",
        target: 1000,
        start: 0,
        log: [],
      },
    ]);
    return;
  }
  if (t.closest("#goalEditBtn")) {
    ui.goalEdit = true;
    render();
    return;
  }
  if (t.closest("#goalDone")) {
    ui.goalEdit = false;
    render();
    return;
  }
  if (t.closest("[data-goalsopen]")) {
    if (ui.goalEdit) {
      ui.goalEdit = false;
      ui.goalsOpen = false;
    } else ui.goalsOpen = !ui.goalsOpen;
    render();
    return;
  }
  if (t.closest("#goalAddRing")) {
    ui.goalEdit = true;
    ui.goalsOpen = true;
    saveGoals([
      ...(store.settings.goals || []),
      {
        id: newId(),
        name: "Neues Ziel",
        target: 500,
        start: 0,
        log: [],
      },
    ]);
    return;
  }
  if (t.closest("[data-debtnew]")) {
    ui.debtEdit = true;
    ui.view = "more";
    ui.sp = "schulden";
    render();
    setTimeout(() => {
      const b = $("debtAdd");
      if (b) {
        b.click();
        b.scrollIntoView({
          block: "center",
        });
      }
    }, 60);
    return;
  }
  if (t.closest("#goalAdd")) {
    saveGoals([
      ...(store.settings.goals || []),
      {
        id: newId(),
        name: "Neues Ziel",
        target: 500,
        start: 0,
        log: [],
      },
    ]);
    return;
  }
  const d = t.closest("[data-gdel]");
  if (d) {
    const g = (store.settings.goals || []).find((x) => x.id === d.dataset.gdel);
    if (d.dataset.armed !== "1") {
      d.dataset.armed = "1";
      d.textContent = "Wirklich löschen?";
      return;
    }
    const old = store.settings.goals;
    saveGoals(old.filter((x) => x.id !== d.dataset.gdel));
    toast(`„${g ? g.name : "Ziel"}“ gelöscht`, () => saveGoals(old));
    return;
  }
  const p = t.closest("[data-gpay]");
  if (p) {
    ui.goalPay = p.dataset.gpay;
    render();
    setTimeout(() => {
      const el = $("goalPayIn");
      if (el) el.focus();
    }, 30);
    return;
  }
  if (t.closest("[data-gpaycancel]")) {
    ui.goalPay = null;
    if (document.activeElement) document.activeElement.blur();
    render();
    return;
  }
  const go = t.closest("[data-gpaygo]");
  if (go) goalPay(go.dataset.gpaygo);
});
document.addEventListener("keydown", (e) => {
  if (e.target.id === "goalPayIn") {
    if (e.key === "Enter") goalPay(ui.goalPay);
    if (e.key === "Escape") {
      ui.goalPay = null;
      e.target.blur();
      render();
    }
  }
});
function goalPay(id) {
  const raw = ($("goalPayIn") || {}).value || "",
    v = parseAmt(raw.replace(/^\+/, ""));
  if (!isFinite(v) || v === 0) {
    toast("Bitte einen Betrag eingeben");
    return;
  }
  const goals = clone(store.settings.goals || []),
    g = goals.find((x) => x.id === id);
  if (!g) return;
  g.log = [
    ...(g.log || []),
    {
      d: isoToday(),
      v: round2(v),
    },
  ];
  ui.goalPay = null;
  if (document.activeElement) document.activeElement.blur();
  const before = store.settings.goals;
  saveGoals(goals);
  const sv = goalSaved(g),
    done = sv.v >= (Number(g.target) || 0);
  SND.play(done ? "done" : v > 0 ? "save" : "del");
  toast(
    done
      ? `Geschafft – „${g.name}“ ist erreicht!`
      : `${fmtEur(Math.abs(v))} ${v > 0 ? "für" : "aus"} „${g.name}“ ${v > 0 ? "zurückgelegt" : "entnommen"}`,
    () => saveGoals(before)
  );
}
document.addEventListener("change", (e) => {
  const el = e.target.closest("[data-gf]");
  if (!el) return;
  const id = el.closest("[data-gid]").dataset.gid,
    goals = clone(store.settings.goals || []),
    g = goals.find((x) => x.id === id);
  if (!g) return;
  const k = el.dataset.gf;
  if (k === "target" || k === "start") {
    const v = parseAmt(el.value);
    if (!(v >= 0)) {
      toast("Betrag ungültig");
      return;
    }
    g[k] = round2(v);
  } else if (k === "name") {
    const v = el.value.trim();
    if (!v) return;
    g.name = v;
  } else if (k === "account") {
    if (el.value) g.account = el.value;
    else delete g.account;
  } else if (k === "due") {
    if (el.value) g.due = el.value;
    else delete g.due;
  }
  el.blur();
  saveGoals(goals);
});
