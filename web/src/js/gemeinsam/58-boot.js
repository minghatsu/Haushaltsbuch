/* Start */
render();
langGate(() => {
  if (actNeed()) actGate();
  else legalGate();
});
(async () => {
  try {
    db = window.claude && window.claude.use ? await window.claude.use("db") : null;
  } catch (e) {
    db = null;
  }
  if (LOCAL) {
    mem = true;
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem(LS_KEY) || "null");
    } catch (e) {}
    let ok = false;
    if (saved) {
      try {
        loadBackupObj(saved);
        ok = true;
      } catch (e) {}
    }
    if (!ok) {
      persistLocal();
      rebuildMem();
    }
    if (SYNCABLE) {
      loadSync();
      startSync();
    }
    return;
  }
  if (!db) {
    mem = true;
    rebuildMem();
    return;
  }
  const onErr = (e) => {
    console.error(e);
    if (e && e.code === "revoked") {
      mem = true;
      render();
    }
  };
  db.doc("app/settings").onSnapshot((s) => {
    const d = s.exists ? s.data() : {};
    const m = {
      ...clone(DEFAULT_SETTINGS),
      ...clone(d || {}),
    };
    m.cats = {
      ...clone(DEFAULT_SETTINGS.cats),
      ...(d && d.cats ? clone(d.cats) : {}),
    };
    store.settings = m;
    render();
  }, onErr);
  db.collection("tx").onSnapshot((q) => {
    store.txSingle = q.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));
    rebuildTx();
    render();
  }, onErr);
  db.collection("txb").onSnapshot((q) => {
    const b = {};
    q.docs.forEach((d) => {
      b[d.id] = (d.data() || {}).items || {};
    });
    store.txb = b;
    rebuildTx();
    render();
  }, onErr);
  db.collection("fixed").onSnapshot((q) => {
    store.fixed = q.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));
    render();
  }, onErr);
  db.collection("months").onSnapshot((q) => {
    const m = {};
    q.docs.forEach((d) => (m[d.id] = d.data()));
    store.months = m;
    render();
  }, onErr);
  db.collection("debts").onSnapshot((q) => {
    store.debts = q.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));
    render();
  }, onErr);
})();
/* Bewegung */
(function () {
  const RM = { get matches() { return motionOff(); } };
  const A = {
    view: null,
    ym: null,
    rows: {},
    pop: null,
    ghosts: [],
    fresh: {},
  };
  const ROW = "[data-edit],[data-pcsel]",
    rid = (r) => r.dataset.edit || r.dataset.pcsel;
  window.ANIM = A;
  const order = ["home", "beruf", "zukunft", "shop", "list", "fix", "year", "more"];
  const liveView = () => [...document.querySelectorAll("#v-" + ui.view)].find((e) => !e.closest(".cubestage"));
  const vis = (el) => el && !el.hidden && el.offsetParent !== null;
  const outer = (el) => !el.parentElement.closest(".hblock,.card,.pcac,.pctk,.invpc>section,.zcard,.pcsl,.pcsr");
  function stagger(root, dx, tries) {
    const H = innerHeight * 1.6,
      list = [...root.querySelectorAll(".hblock,.card,.pcac,.invpc>section,.zcard")].filter(
        (c) => outer(c) && !c.closest(".cubestage") && c.offsetParent !== null && c.getBoundingClientRect().height > 0
      );
    if (!list.length && (tries || 0) < 6) {
      setTimeout(() => stagger(liveView() || root, dx, (tries || 0) + 1), 50);
      return;
    }
    let i = 0;
    for (const c of list) {
      const r = c.getBoundingClientRect();
      if (r.top > H) continue;
      if (getComputedStyle(c).animationName !== "none" && !c.classList.contains("ain")) continue;
      c.classList.remove("ain");
      void c.offsetWidth;
      c.style.setProperty("--ai", Math.min(i++, 10));
      c.style.setProperty("--dx", dx);
      c.classList.add("ain");
      setTimeout(() => c.classList.remove("ain"), 1100);
    }
  }
  function before() {
    if (RM.matches) return;
    A.ghosts = [];
    const v = liveView();
    if (!vis(v)) return;
    v.querySelectorAll(ROW).forEach((r) => {
      if (r.closest(".sheet")) return;
      const b = r.getBoundingClientRect();
      if (b.height > 0 && b.bottom > 0 && b.top < innerHeight) A.ghosts.push([rid(r), r, b]);
    });
  }
  function after() {
    if (RM.matches) {
      A.view = ui.view;
      A.ym = ui.ym;
      return;
    }
    const skip = A.skip;
    A.skip = false;
    const v = liveView();
    if (ui.view !== A.view || ui.ym !== A.ym) {
      const dx =
        ui.view !== A.view ? (order.indexOf(ui.view) >= order.indexOf(A.view) ? 1 : -1) : A.ym && ui.ym < A.ym ? -1 : 1;
      const first = A.view === null;
      A.view = ui.view;
      A.ym = ui.ym;
      A.rows = {};
      const own = !!geraetRuf("eigenerSeitenwechsel", ui.view, A.prevView);
      if (!skip && !first && !own && vis(v))
        requestAnimationFrame(() => stagger(v, ui.view !== A.prevView ? dx : dx * 0.5));
      A.prevView = ui.view;
      if (vis(v)) A.rows[ui.view] = new Set([...v.querySelectorAll(ROW)].map(rid));
      return;
    }
    if (!vis(v)) return;
    const now = [...v.querySelectorAll(ROW)],
      ids = new Set(now.map(rid)),
      seen = A.rows[ui.view],
      T = Date.now();
    if (seen) for (const r of now) if (!seen.has(rid(r))) A.fresh[rid(r)] = T;
    for (const r of now) {
      const f = A.fresh[rid(r)];
      if (f && T - f < 500 && r.offsetParent && !r.classList.contains("rnew")) {
        r.classList.add("rnew");
        setTimeout(() => r.classList.remove("rnew"), 700);
      }
    }
    for (const [id, el, b] of A.ghosts) {
      if (ids.has(id) || !id) continue;
      const g = el.cloneNode(true);
      g.removeAttribute("data-edit");
      g.removeAttribute("data-pcsel");
      g.classList.add("rghost");
      Object.assign(g.style, {
        position: "fixed",
        left: b.left + "px",
        top: b.top + "px",
        width: b.width + "px",
        height: b.height + "px",
        margin: 0,
        zIndex: 50,
        pointerEvents: "none",
      });
      document.body.appendChild(g);
      requestAnimationFrame(() => g.classList.add("go"));
      setTimeout(() => g.remove(), 520);
    }
    A.ghosts = [];
    A.rows[ui.view] = ids;
    popNow();
  }
  const TICK = "[data-pay]:not(button.seg *),[data-zck],[data-pcfid],[data-goaltick],[data-jlt]";
  document.addEventListener(
    "click",
    (e) => {
      if (RM.matches) return;
      const t = e.target.closest(TICK);
      if (!t) return;
      const a = [...t.attributes].find((x) => /^data-(pay|zck|pcfid|goaltick|jlt)$/.test(x.name));
      if (!a) return;
      A.pop = {
        sel: `[${a.name}="${CSS.escape(a.value)}"]`,
        at: Date.now(),
      };
      setTimeout(popNow, 60);
    },
    true
  );
  function popNow() {
    const p = A.pop;
    if (!p || Date.now() - p.at > 1500) return;
    A.pop = null;
    document.querySelectorAll(p.sel).forEach((el) => {
      if (!el.offsetParent) return;
      el.classList.remove("tpop");
      void el.offsetWidth;
      el.classList.add("tpop");
      setTimeout(() => el.classList.remove("tpop"), 500);
    });
  }
  function rowsCheck() {
    if (RM.matches || ui.view !== A.view) return;
    const v = liveView();
    if (!vis(v)) return;
    const now = [...v.querySelectorAll(ROW)],
      seen = A.rows[ui.view],
      T = Date.now();
    if (!seen) {
      A.rows[ui.view] = new Set(now.map(rid));
      return;
    }
    for (const r of now) if (!seen.has(rid(r))) A.fresh[rid(r)] = T;
    for (const r of now) {
      const f = A.fresh[rid(r)];
      if (f && T - f < 500 && r.offsetParent && !r.classList.contains("rnew")) {
        r.classList.add("rnew");
        setTimeout(() => r.classList.remove("rnew"), 700);
      }
    }
    A.rows[ui.view] = new Set(now.map(rid));
  }
  A.check = rowsCheck;
  let moT = 0;
  new MutationObserver(() => {
    if (!moT)
      moT = requestAnimationFrame(() => {
        moT = 0;
        try {
          rowsCheck();
        } catch (_) {}
      });
  }).observe(document.body, {
    childList: true,
    subtree: true,
  });
  const _r = render;
  render = function (...a) {
    try {
      before();
    } catch (_) {}
    const x = _r.apply(this, a);
    try {
      after();
    } catch (e) {
      console.warn("anim", e);
    }
    return x;
  };
})();
