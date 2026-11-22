/* Gemeinsam */
async function makeKeys(kB64, vB64) {
  const base = await crypto.subtle.importKey("raw", fromB64u(kB64), "HKDF", false, ["deriveKey", "deriveBits"]);
  const prm = (info) => ({
    name: "HKDF",
    hash: "SHA-256",
    salt: new TextEncoder().encode("finanz-mami-v1"),
    info: new TextEncoder().encode(info),
  });
  return {
    enc: await crypto.subtle.deriveKey(
      prm("enc"),
      base,
      {
        name: "AES-GCM",
        length: 256,
      },
      false,
      ["encrypt", "decrypt"]
    ),
    mac: await crypto.subtle.deriveKey(
      prm("id"),
      base,
      {
        name: "HMAC",
        hash: "SHA-256",
        length: 256,
      },
      false,
      ["sign"]
    ),
    auth: toHex(await crypto.subtle.deriveBits(prm("auth"), base, 256)),
    vault: toHex(fromB64u(vB64)),
  };
}
const SPK = {};
const spList = () => store.settings.shared || [];
function spLocal(v) {
  try {
    return (
      JSON.parse(localStorage.getItem("hb-sp-" + v) || "null") || {
        docs: {},
        rev: 0,
        queue: [],
      }
    );
  } catch (e) {
    return {
      docs: {},
      rev: 0,
      queue: [],
    };
  }
}
function spLocalSave(v, o) {
  try {
    localStorage.setItem("hb-sp-" + v, JSON.stringify(o));
  } catch (e) {}
}
function currentMember() {
  const m = store.settings.me || {};
  if (!m.id) {
    m.id = newId();
    m.name = m.name || store.settings.name || "";
    store.settings.me = m;
    setTimeout(saveSettings, 0);
  }
  return m;
}
async function spKeys(sp) {
  return SPK[sp.v] || (SPK[sp.v] = await makeKeys(sp.k, sp.v));
}
async function spRequest(sp, action, qs, body) {
  const K = await spKeys(sp),
    url = apiUrl(sp.s || pairUrl(), action, qs),
    auth = "Bearer " + K.vault + "." + K.auth;
  let r;
  if (NATIVE && window.AndroidBridge.http) {
    r = await new Promise((res) => {
      const id = newId();
      httpWaiting[id] = res;
      window.AndroidBridge.http(id, body ? "POST" : "GET", url, auth, body ? JSON.stringify(body) : "");
    });
    if (!r.status) throw new Error("offline");
  } else {
    const f = await fetch(url, {
      method: body ? "POST" : "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: auth,
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    r = {
      status: f.status,
      text: await f.text(),
    };
  }
  let j = {};
  try {
    j = JSON.parse(r.text);
  } catch (e) {}
  if (r.status < 200 || r.status >= 300) {
    const e = new Error(j.error || "HTTP " + r.status);
    e.status = r.status;
    throw e;
  }
  return j;
}
async function spEnc(K, obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12)),
    ct = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
      },
      K.enc,
      new TextEncoder().encode(JSON.stringify(obj))
    );
  const o = new Uint8Array(12 + ct.byteLength);
  o.set(iv);
  o.set(new Uint8Array(ct), 12);
  return b64u(o);
}
async function spDec(K, b) {
  const u = fromB64u(b);
  return JSON.parse(
    new TextDecoder().decode(
      await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: u.slice(0, 12),
        },
        K.enc,
        u.slice(12)
      )
    )
  );
}
function spPut(sp, id, data) {
  const L = spLocal(sp.v);
  if (data === null) delete L.docs[id];
  else L.docs[id] = data;
  L.queue = (L.queue || []).filter((o) => o.i !== id);
  L.queue.push({
    i: id,
    d: data,
  });
  spLocalSave(sp.v, L);
  spSyncSoon();
}
let SP_BUSY = false,
  spTimer = null;
function spSyncSoon(ms) {
  clearTimeout(spTimer);
  spTimer = setTimeout(spSyncAll, ms == null ? 500 : ms);
}
async function spSyncAll() {
  if (SP_BUSY || !spList().length || !(window.crypto && crypto.subtle)) return;
  SP_BUSY = true;
  let changed = false;
  try {
    for (const sp of spList()) {
      try {
        const K = await spKeys(sp),
          L = spLocal(sp.v);
        spPublish(sp, L);
        if (L.queue && L.queue.length) {
          const q = L.queue.slice(0, 200),
            ops = [];
          for (const o of q)
            ops.push({
              h: b64u(
                (await crypto.subtle.sign("HMAC", K.mac, new TextEncoder().encode("sp\u0000" + o.i))).slice(0, 24)
              ),
              b: await spEnc(K, {
                i: o.i,
                d: o.d,
              }),
            });
          await spRequest(sp, "push", "", {
            ops,
          });
          L.queue = L.queue.filter((o) => !q.includes(o));
        }
        const res = await spRequest(sp, "pull", "&since=" + (L.rev || 0));
        const pend = new Set((L.queue || []).map((o) => o.i));
        for (const d of res.docs || []) {
          if (!d.b) continue;
          try {
            const o = await spDec(K, d.b);
            if (pend.has(o.i)) continue;
            if (o.d === null) delete L.docs[o.i];
            else L.docs[o.i] = o.d;
            changed = true;
          } catch (e) {}
        }
        L.rev = res.rev || L.rev;
        L.ok = Date.now();
        spLocalSave(sp.v, L);
        if (res.more) spSyncSoon(200);
      } catch (e) {
        if (e.status === 401) {
          sp.lost = true;
        }
      }
    }
  } finally {
    SP_BUSY = false;
  }
  if (changed && (ui.view === "gemeinsam" || ui.view === "home")) {
    BG_RENDER = true;
    try {
      render();
    } finally {
      BG_RENDER = false;
    }
  }
}
setInterval(() => {
  if (document.visibilityState === "visible") spSyncAll();
}, 15000);
setTimeout(spSyncAll, 4000);
function spSel(v) {
  const a = store.settings.shareSel || {};
  return (
    a[v] || {
      bud: {},
      goal: {},
      fix: "none",
    }
  );
}
function spSelSet(v, fn) {
  const a = {
    ...(store.settings.shareSel || {}),
  };
  const s = JSON.parse(JSON.stringify(spSel(v)));
  fn(s);
  a[v] = s;
  store.settings.shareSel = a;
  saveSettings();
}
function spPubData(v) {
  const sel = spSel(v),
    ym = ymOf(new Date()),
    out = {
      budgets: [],
      goals: [],
      fixed: null,
      ts: ym,
    };
  const spent = {};
  for (const t of monthCalc(ym).tx) if (t.kind === "ausgabe") spent[t.cat] = (spent[t.cat] || 0) + t.amount;
  for (const [c, on] of Object.entries(sel.bud || {}))
    if (on && (store.settings.budgets || {})[c])
      out.budgets.push({
        c,
        b: Number(store.settings.budgets[c]) || 0,
        s: round2(spent[c] || 0),
      });
  for (const g of store.settings.goals || [])
    if ((sel.goal || {})[g.id])
      out.goals.push({
        n: g.name,
        t: Number(g.target) || 0,
        v: round2(goalSaved(g).v),
      });
  if (sel.fix === "sum" || sel.fix === "list") {
    const fx = fixedForMonth(ym, true).filter((f) => !debtFor(f.id)),
      items = fx.map((f) => ({
        n: f.name,
        a: round2(planAmt(f, ym)),
      }));
    out.fixed =
      sel.fix === "sum"
        ? {
            sum: round2(sum(items, (x) => x.a)),
          }
        : {
            sum: round2(sum(items, (x) => x.a)),
            items,
          };
  }
  return out;
}
function spPublish(sp, L) {
  const m = currentMember(),
    id = "pub-" + m.id,
    d = spPubData(sp.v),
    cur = L.docs[id];
  if (!cur || JSON.stringify(cur) !== JSON.stringify(d)) {
    L.docs[id] = d;
    L.queue = (L.queue || []).filter((o) => o.i !== id);
    L.queue.push({
      i: id,
      d,
    });
  }
  const mm = L.docs["m-" + m.id];
  if (!mm || mm.name !== (m.name || "Ich")) {
    const md = {
      name: m.name || "Ich",
      c: (mm && mm.c) || MCOL[Object.keys(L.docs).filter((k) => k.startsWith("m-")).length % MCOL.length],
    };
    L.docs["m-" + m.id] = md;
    L.queue.push({
      i: "m-" + m.id,
      d: md,
    });
  }
}
const MCOL = ["#1a7a5c", "#c2410c", "#2f7fb8", "#7a5bc2", "#c27c0e", "#0f766e"];
function spCode(sp) {
  return "HBS1." + sp.v + "." + sp.k + (sp.s && sp.s !== META_PAIR ? "." + b64u(new TextEncoder().encode(sp.s)) : "");
}
function spParse(t) {
  const m = String(t || "")
    .replace(/\s+/g, "")
    .match(/HBS1\.([A-Za-z0-9_-]{22})\.([A-Za-z0-9_-]{43})(?:\.([A-Za-z0-9_-]+))?/);
  if (!m) return null;
  let s = "";
  if (m[3])
    try {
      s = new TextDecoder().decode(fromB64u(m[3]));
    } catch (e) {
      return null;
    }
  return {
    v: m[1],
    k: m[2],
    s,
  };
}
async function spCreate(name) {
  const sp = {
    v: b64u(crypto.getRandomValues(new Uint8Array(16))),
    k: b64u(crypto.getRandomValues(new Uint8Array(32))),
    s: META_PAIR ? "" : pairUrl(),
    n: name,
  };
  const K = await spKeys(sp);
  await spRequest(sp, "create", "", {
    vault: K.vault,
    auth: K.auth,
  });
  store.settings.shared = [...spList(), sp];
  saveSettings();
  spPut(sp, "meta", {
    name,
  });
  ui.gmSel = sp.v;
  return sp;
}
async function spJoin(code) {
  const p = spParse(code);
  if (!p) throw new Error("Das ist kein Code für einen gemeinsamen Bereich.");
  if (spList().some((x) => x.v === p.v)) throw new Error("Diesem Bereich bist du schon beigetreten.");
  await spRequest(p, "pull", "&since=999999999").catch((e) => {
    throw new Error(
      e.status === 401 ? "Diesen Bereich gibt es nicht (mehr)." : "Server nicht erreichbar – bist du online?"
    );
  });
  p.n = "Gemeinsam";
  store.settings.shared = [...spList(), p];
  saveSettings();
  ui.gmSel = p.v;
  await spSyncAll();
  const L = spLocal(p.v);
  if (L.docs.meta && L.docs.meta.name) {
    p.n = L.docs.meta.name;
    saveSettings();
  }
  if (Object.keys(L.docs).filter((k) => k.startsWith("m-") && k !== "m-" + currentMember().id).length >= 10) {
    spLeave(p.v);
    throw new Error("Dieser Bereich hat schon 10 Mitglieder.");
  }
  return p;
}
function spLeave(v) {
  const sp = spList().find((x) => x.v === v);
  if (!sp) return;
  spPut(sp, "m-" + currentMember().id, null);
  spPut(sp, "pub-" + currentMember().id, null);
  setTimeout(() => {
    store.settings.shared = spList().filter((x) => x.v !== v);
    saveSettings();
    try {
      localStorage.removeItem("hb-sp-" + v);
    } catch (e) {}
    ui.gmSel = null;
    render();
  }, 2500);
}
function spBalance(L) {
  const mem = Object.keys(L.docs)
      .filter((k) => k.startsWith("m-"))
      .map((k) => k.slice(2)),
    net = {};
  for (const m of mem) net[m] = 0;
  for (const [k, x] of Object.entries(L.docs))
    if (k.startsWith("x-")) {
      const a = Number(x.a) || 0;
      if (x.settle) {
        net[x.p] = (net[x.p] || 0) + a;
        net[x.to] = (net[x.to] || 0) - a;
      } else {
        const who = x.for && x.for.length ? x.for : mem;
        net[x.p] = (net[x.p] || 0) + a;
        for (const m of who) net[m] = (net[m] || 0) - a / who.length;
      }
    }
  return net;
}
function spName(L, id) {
  const m = L.docs["m-" + id];
  return id === currentMember().id ? "Du" : (m && m.name) || "Jemand";
}
function spAv(L, id) {
  const m = L.docs["m-" + id] || {};
  return `<span class="gav" style="background:${m.c || "#5b6472"}">${escHtml(((m.name || "?").trim()[0] || "?").toUpperCase())}</span>`;
}
function gemeinsamCard() {
  if (!spList().length)
    return `<div class="card gmcard"><div class="card-head"><h2>${headIcon("user")}Gemeinsam</h2></div><p class="small muted" style="margin:0 0 10px">Mit Partner oder WG: gemeinsame Ausgaben, Sparziele und Einkaufsliste – jeder behält sein eigenes Konto.</p><button class="btn" data-go="gemeinsam">Ausprobieren</button></div>`;
  return `<div class="card gmcard"><div class="card-head"><h2>${headIcon("user")}Gemeinsam</h2><button class="link" data-go="gemeinsam">Öffnen ${svgIcon("right", 16)}</button></div>${spList()
    .map((sp) => {
      const L = spLocal(sp.v),
        net = spBalance(L),
        mine = net[currentMember().id] || 0;
      return `<button class="gmrow" data-go="gemeinsam" data-gmsel="${escHtml(sp.v)}"><b>${escHtml(sp.n || "Gemeinsam")}</b><span class="${Math.abs(mine) < 0.01 ? "muted" : mine > 0 ? "pos" : "neg"}">${Math.abs(mine) < 0.01 ? "ausgeglichen" : mine > 0 ? `du bekommst ${escHtml(fmtEur(mine))}` : `du gibst ${escHtml(fmtEur(-mine))}`}</span></button>`;
    })
    .join("")}</div>`;
}
function renderGemeinsam() {
  const el = $("v-gemeinsam");
  if (!el) return;
  if (el.contains(document.activeElement) && typingNow()) return;
  const step = ui.gmStep || "",
    list = spList(),
    m = currentMember();
  if (step === "wait" && ui.rwait && ui.rwait.kind === "gm") {
    el.innerHTML = `<div class="card">${reqWaitHtml(ui.rwait)}</div>`;
    return;
  }
  if (!(window.crypto && crypto.subtle)) {
    el.innerHTML = `<div class="card"><p>Gemeinsame Bereiche gehen nur in der Handy- oder PC-App.</p></div>`;
    return;
  }
  if (step === "new" || step === "join" || (!list.length && step !== "invite")) {
    const join = step === "join";
    el.innerHTML = `<div class="card gmintro"><span class="lgic">${svgIcon("user", 26)}</span><h2>${join ? "Einem Bereich beitreten" : list.length ? "Neuer gemeinsamer Bereich" : "Gemeinsam statt einsam"}</h2>
      ${!list.length && !step ? `<p class="small muted" style="margin:0 0 12px;line-height:1.5">Teile mit Partner, Familie oder WG nur das, was ihr gemeinsam habt: Ausgaben mit automatischem Ausgleich, Sparziele, eine Einkaufsliste – und auf Wunsch einzelne Budgets oder Fixkosten. Konten und alles andere bleiben privat. Ende-zu-Ende verschlüsselt, ohne Konto.</p>` : ""}
      <div class="field"><label for="gmMe">Dein Name (sehen die anderen)</label><input class="in" id="gmMe" value="${escHtml(m.name || store.settings.name || "")}" placeholder="z. B. Sascha"></div>
      ${
        join
          ? `<ol class="psteps"><li>${trBold("Wer dich einlädt, öffnet **Gemeinsam › Einladen**.")}</li><li>Du scannst den QR-Code oder tippst den Code ein.</li><li>Die andere Person bestätigt deine Anfrage – dann bist du dabei.</li></ol>${canQrLive() ? `<button class="btn primary block" style="justify-content:center;gap:8px" data-qrlive="gm">${svgIcon("camera", 18)} QR-Code scannen</button>` : `<label class="btn primary block" style="justify-content:center;gap:8px">${svgIcon("camera", 18)} Bild mit QR-Code auswählen<input type="file" accept="image/*" id="gmCam" hidden></label>`}
        <div class="field"><label for="gmCode">… oder Code eintippen</label><input class="in" id="gmCode" placeholder="z. B. 7KF2-QX9M-3T" autocapitalize="characters" autocomplete="off" spellcheck="false" style="font-family:ui-monospace,monospace;letter-spacing:.08em;font-size:18px;text-align:center"></div>
        <div class="row-btns"><button class="btn" data-gmstep="">Zurück</button><button class="btn primary" id="gmJoinGo">Anfrage senden</button></div>`
          : step === "new"
            ? `<div class="field"><label for="gmName">Name des Bereichs</label><input class="in" id="gmName" placeholder="z. B. Wir zwei, WG, Familie"></div>
        <div class="row-btns"><button class="btn" data-gmstep="">Zurück</button><button class="btn primary" id="gmNewGo">Anlegen</button></div>`
            : `<div class="row-btns" style="justify-content:stretch"><button class="btn primary" data-gmstep="new">Bereich anlegen</button><button class="btn" data-gmstep="join">Beitreten</button></div>`
      }
      <span class="small" id="gmErr" style="color:var(--bad)"></span></div>`;
    return;
  }
  const sp = list.find((x) => x.v === ui.gmSel) || list[0];
  ui.gmSel = sp.v;
  const L = spLocal(sp.v),
    tab = ui.gmTab || "over";
  const mem = Object.keys(L.docs)
      .filter((k) => k.startsWith("m-"))
      .map((k) => k.slice(2)),
    net = spBalance(L),
    mine = net[m.id] || 0;
  const chips = `<div class="gmchips">${list.map((x) => `<button class="chip ${x.v === sp.v ? "on" : ""}" data-gmsel="${escHtml(x.v)}">${escHtml(x.n || "Gemeinsam")}</button>`).join("")}<button class="chip" data-gmstep="new">+ Neu</button><button class="chip" data-gmstep="join">Beitreten</button></div>`;
  if (step === "invite") {
    el.innerHTML =
      chips +
      `<div class="card"><h2 style="margin:0 0 6px">Jemanden einladen</h2><p class="small" style="margin:0 0 10px;line-height:1.5">${trBold("Die andere Person öffnet **Gemeinsam › Beitreten** und scannt diesen Code. Dann bekommst du hier eine **Anfrage** mit ihrem Namen – erst wenn du zulässt, ist sie dabei. Sie sieht nur diesen Bereich, nichts von deinen anderen Daten.")}</p>
    <div class="pqr" id="gmQr">${GMS.code && GMS.v === sp.v ? qrSvg("HBG1." + GMS.code, 230) : `<div class="small muted" style="padding:80px 0">Wird vorbereitet …</div>`}</div>
    <div class="small muted" style="text-align:center;margin-top:12px">Ohne Kamera, z. B. am PC – diesen Code eintippen:</div>
    <div class="pcode gmshort" id="gmShort" style="margin-top:6px;text-align:center;font-size:26px;letter-spacing:.12em;font-family:ui-monospace,monospace">${GMS.code && GMS.v === sp.v ? escHtml(shortFmt(GMS.code)) : "…"}</div>
    <div id="gmCtd">${ctdHtml(GMS.code && GMS.v === sp.v ? GMS.t0 : 0, "gm")}</div>
    <div class="row-btns" style="margin-top:12px"><button class="btn" id="gmCopy">Code kopieren</button><button class="btn primary" data-gmstep="">Fertig</button></div></div>`;
    if (!(GMS.code && GMS.v === sp.v && Date.now() - GMS.t0 < CTD_LEN - 5000))
      gmShortMake(sp)
        .then(() => {
          const e = $("gmShort");
          if (e) e.textContent = GMS.code ? shortFmt(GMS.code) : "– (offline)";
          const q = $("gmQr");
          if (q && GMS.code) q.innerHTML = qrSvg("HBG1." + GMS.code, 230);
          const c = document.querySelector("#gmCtd [data-ctd]");
          if (c && GMS.code) {
            c.dataset.ctd = GMS.t0;
            delete c.dataset.done;
            ctdTick();
          }
        })
        .catch(() => {
          const e = $("gmShort");
          if (e) e.textContent = "– (offline)";
        });
    return;
  }
  const TABS = [
    ["over", "Übersicht"],
    ["exp", "Ausgaben"],
    ["goal", "Sparziele"],
    ["shop", "Einkauf"],
    ["share", "Freigaben"],
  ];
  const exps = Object.entries(L.docs)
    .filter(([k]) => k.startsWith("x-"))
    .map(([k, x]) => ({
      id: k,
      ...x,
    }))
    .sort((a, b) => (b.d || "").localeCompare(a.d || ""));
  const goals = Object.entries(L.docs)
      .filter(([k]) => k.startsWith("g-"))
      .map(([k, x]) => ({
        id: k,
        ...x,
      })),
    contr = Object.entries(L.docs)
      .filter(([k]) => k.startsWith("c-"))
      .map(([k, x]) => ({
        id: k,
        ...x,
      }));
  const shop = Object.entries(L.docs)
    .filter(([k]) => k.startsWith("s-"))
    .map(([k, x]) => ({
      id: k,
      ...x,
    }))
    .sort((a, b) => a.done - b.done || (a.ts || 0) - (b.ts || 0));
  const pubs = mem
    .map((id) => ({
      id,
      p: L.docs["pub-" + id],
    }))
    .filter((x) => x.p);
  const balHtml =
    mem.length < 2
      ? `<p class="small muted" style="margin:0">Noch allein hier – lade jemanden ein.</p><button class="btn primary" data-gmstep="invite" style="margin-top:10px">Jemanden einladen</button>`
      : `<div class="gmbal ${Math.abs(mine) < 0.01 ? "" : mine > 0 ? "pos" : "neg"}">${Math.abs(mine) < 0.01 ? "Alles ausgeglichen" : mine > 0 ? `Du bekommst ${escHtml(fmtEur(mine))}` : `Du gibst ${escHtml(fmtEur(-mine))}`}</div>
      ${mem
        .filter((id) => id !== m.id)
        .map(
          (id) =>
            `<div class="gmmem">${spAv(L, id)}<span>${escHtml(spName(L, id))}</span><b class="${(net[id] || 0) > 0.005 ? "pos" : (net[id] || 0) < -0.005 ? "neg" : "muted"}">${(net[id] || 0) > 0.005 ? "bekommt " : (net[id] || 0) < -0.005 ? "gibt " : ""}${escHtml(fmtEur(Math.abs(net[id] || 0)))}</b></div>`
        )
        .join("")}
      ${
        mine < -0.005
          ? `<div class="row-btns" style="margin-top:10px">${mem
              .filter((id) => (net[id] || 0) > 0.005)
              .map(
                (id) =>
                  `<button class="btn" data-gmsettle="${escHtml(id)}" data-amt="${Math.min(-mine, net[id]).toFixed(2)}">${escHtml(fmtEur(Math.min(-mine, net[id])))} an ${escHtml(spName(L, id))} gezahlt</button>`
              )
              .join("")}</div>`
          : ""
      }`;
  const goalHtml = (g) => {
    const cs = contr.filter((c) => c.g === g.id),
      tot = sum(cs, (c) => Number(c.a) || 0),
      by = {};
    for (const c of cs) by[c.m] = (by[c.m] || 0) + (Number(c.a) || 0);
    return `<div class="gmgoal"><div class="abl"><b>${escHtml(g.n)}</b><span>${escHtml(fmtEur0(tot))} / ${escHtml(fmtEur0(g.t))}</span></div><span class="bpbar"><i style="width:${Math.min(100, (tot / (g.t || 1)) * 100)}%;background:${tot >= g.t ? "var(--good)" : "var(--accent)"}"></i></span>
      <div class="gmby">${Object.entries(by)
        .map(([id, v]) => `${spAv(L, id)}<span>${escHtml(fmtEur0(v))}</span>`)
        .join(
          ""
        )}</div>${tab === "goal" ? `<div class="gmadd"><input class="in" inputmode="decimal" placeholder="Betrag €" data-gmcin="${escHtml(g.id)}"><button class="btn" data-gmcadd="${escHtml(g.id)}">Eingezahlt</button><button class="icon-btn" data-gmdel="${escHtml(g.id)}" aria-label="Ziel löschen">×</button></div>` : ""}</div>`;
  };
  const pubHtml = pubs
    .map(({ id, p }) => {
      const parts = [];
      for (const b of p.budgets || [])
        parts.push(
          aBar(
            `${escHtml(b.c)} <span class="muted small">Budget</span>`,
            b.s,
            b.b,
            b.s > b.b ? "var(--bad)" : "var(--accent)",
            `${escHtml(fmtEur0(b.s))} / ${escHtml(fmtEur0(b.b))}`
          )
        );
      for (const g of p.goals || [])
        parts.push(
          aBar(
            `${escHtml(g.n)} <span class="muted small">Sparziel</span>`,
            g.v,
            g.t,
            "var(--good)",
            `${escHtml(fmtEur0(g.v))} / ${escHtml(fmtEur0(g.t))}`
          )
        );
      if (p.fixed)
        parts.push(
          p.fixed.items
            ? p.fixed.items
                .map((f) => `<div class="abl"><b>${escHtml(f.n)}</b><span>${escHtml(fmtEur(f.a))}</span></div>`)
                .join("") +
                `<div class="abl"><b>Fixkosten gesamt</b><span>${escHtml(fmtEur0(p.fixed.sum))}</span></div>`
            : `<div class="abl"><b>Fixkosten im Monat</b><span>${escHtml(fmtEur0(p.fixed.sum))}</span></div>`
        );
      return parts.length
        ? `<div class="gmpub"><div class="gmmem">${spAv(L, id)}<b>${escHtml(spName(L, id))} teilt</b></div>${parts.join("")}</div>`
        : "";
    })
    .join("");
  const body =
    tab === "over"
      ? `<div class="card"><div class="card-head"><h2>Ausgleich</h2>${mem.length > 1 ? `<button class="link" data-gmstep="invite">Einladen</button>` : ""}</div>${balHtml}</div>
      ${goals.length ? `<div class="card"><div class="card-head"><h2>Gemeinsame Sparziele</h2><button class="link" data-gmtab="goal">Alle</button></div>${goals.map(goalHtml).join("")}</div>` : ""}
      ${pubHtml ? `<div class="card"><div class="card-head"><h2>Freigegeben</h2></div>${pubHtml}</div>` : ""}
      ${shop.filter((s) => !s.done).length ? `<div class="card"><div class="card-head"><h2>Einkaufsliste</h2><button class="link" data-gmtab="shop">${shop.filter((s) => !s.done).length} offen</button></div></div>` : ""}`
      : tab === "exp"
        ? `<div class="card"><h2 style="margin:0 0 10px">Ausgabe eintragen</h2><div class="grid2"><input class="in" id="gxT" placeholder="Wofür? z. B. Rewe"><input class="in" id="gxA" inputmode="decimal" placeholder="Betrag €"></div>
        <div class="grid2" style="margin-top:8px"><select class="in" id="gxP">${mem.map((id) => `<option value="${escHtml(id)}" ${id === m.id ? "selected" : ""}>bezahlt von ${escHtml(spName(L, id))}</option>`).join("")}</select><input class="in" type="date" id="gxD" value="${isoToday()}"></div>
        <button class="btn primary block" id="gxAdd" style="margin-top:10px">Eintragen – wird gleich aufgeteilt</button></div>
      <div class="card">${
        exps.length
          ? exps
              .slice(0, 60)
              .map(
                (x) =>
                  `<div class="gmexp">${spAv(L, x.p)}<span class="n"><b>${x.settle ? `Ausgleich an ${escHtml(spName(L, x.to))}` : escHtml(x.t || "Ausgabe")}</b><small>${escHtml(new Date((x.d || isoToday()) + "T12:00").toLocaleDateString("de-DE"))} · ${escHtml(spName(L, x.p))}${x.settle ? "" : " hat bezahlt"}</small></span><b>${escHtml(fmtEur(x.a))}</b>${x.by === m.id ? `<button class="icon-btn" data-gmdel="${escHtml(x.id)}" aria-label="Löschen">×</button>` : ""}</div>`
              )
              .join("")
          : `<p class="small muted" style="margin:0">Noch keine gemeinsamen Ausgaben.</p>`
      }</div>`
        : tab === "goal"
          ? `<div class="card"><h2 style="margin:0 0 10px">Neues gemeinsames Sparziel</h2><div class="grid2"><input class="in" id="ggN" placeholder="z. B. Urlaub"><input class="in" id="ggT" inputmode="decimal" placeholder="Ziel €"></div><button class="btn primary block" id="ggAdd" style="margin-top:10px">Anlegen</button></div>
      <div class="card">${goals.length ? goals.map(goalHtml).join("") : `<p class="small muted" style="margin:0">Noch kein gemeinsames Sparziel.</p>`}</div>`
          : tab === "shop"
            ? `<div class="card"><div class="gmadd"><input class="in" id="gsT" placeholder="z. B. Milch"><button class="btn primary" id="gsAdd">Hinzufügen</button></div>
      ${shop.map((s) => `<div class="gmshop ${s.done ? "done" : ""}"><button class="gmck" data-gmshop="${escHtml(s.id)}" aria-label="${s.done ? "Wieder offen" : "Erledigt"}">${s.done ? "✓" : ""}</button><span>${escHtml(s.t)}</span><button class="icon-btn" data-gmdel="${escHtml(s.id)}" aria-label="Löschen">×</button></div>`).join("")}
      ${shop.some((s) => s.done) ? `<button class="link small" id="gsClear" style="margin-top:8px">Erledigte entfernen</button>` : ""}</div>`
            : (() => {
                const sel = spSel(sp.v),
                  bud = Object.entries(store.settings.budgets || {}).filter(([c, v]) => v > 0);
                return `<div class="card"><h2 style="margin:0 0 4px">Was die anderen von dir sehen</h2><p class="small muted" style="margin:0 0 10px">Alles, was hier nicht an ist, bleibt privat. Konten, Kontostand und Buchungen werden nie geteilt.</p>
        <div class="section-title" style="font-size:14px;margin-top:4px">Budgets</div>${bud.length ? bud.map(([c, v]) => `<div class="switch"><label><b>${escHtml(c)}</b><br><span class="small muted">${escHtml(fmtEur0(v))} im Monat – die anderen sehen Budget und was du davon ausgegeben hast</span></label><input type="checkbox" data-gmsb="${escHtml(c)}" ${(sel.bud || {})[c] ? "checked" : ""}></div>`).join("") : `<p class="small muted">Noch keine Budgets angelegt.</p>`}
        <div class="section-title" style="font-size:14px">Sparziele</div>${(store.settings.goals || []).length ? (store.settings.goals || []).map((g) => `<div class="switch"><label><b>${escHtml(g.name)}</b><br><span class="small muted">Stand und Ziel</span></label><input type="checkbox" data-gmsg="${escHtml(g.id)}" ${(sel.goal || {})[g.id] ? "checked" : ""}></div>`).join("") : `<p class="small muted">Noch keine eigenen Sparziele.</p>`}
        <div class="section-title" style="font-size:14px">Fixkosten</div><div class="seg" role="group">${[
          ["none", "privat"],
          ["sum", "nur Summe"],
          ["list", "einzeln"],
        ]
          .map(([k, l]) => `<button data-gmsf="${k}" aria-pressed="${(sel.fix || "none") === k}">${l}</button>`)
          .join("")}</div></div>
        <div class="card"><div class="row-btns"><button class="btn" data-gmstep="invite">Jemanden einladen</button><button class="btn danger" id="gmLeave">Bereich verlassen</button></div></div>`;
              })();
  el.innerHTML =
    chips +
    `<div class="gmhead"><h2>${escHtml(sp.n || "Gemeinsam")}</h2><span class="gmavs">${mem.map((id) => spAv(L, id)).join("")}</span></div>
    <div class="gmtabs">${TABS.map(([k, l]) => `<button class="fchip" data-gmtab="${k}" aria-pressed="${tab === k}">${l}</button>`).join("")}</div>` +
    body;
}
document.addEventListener("click", async (e) => {
  const t = e.target;
  if (!t.closest) return;
  if (
    t.closest("#v-gemeinsam button, #v-home .gmcard") &&
    document.activeElement &&
    document.activeElement.blur &&
    document.activeElement !== document.body
  )
    document.activeElement.blur();
  const st = t.closest("[data-gmstep]");
  if (st) {
    ui.gmStep = st.dataset.gmstep;
    renderGemeinsam();
    window.scrollTo({
      top: 0,
    });
    return;
  }
  const se = t.closest("[data-gmsel]");
  if (se) {
    ui.gmSel = se.dataset.gmsel;
    ui.gmStep = "";
    if (ui.view === "gemeinsam" || SPS.open === "gemeinsam") renderGemeinsam();
    return;
  }
  const tb = t.closest("[data-gmtab]");
  if (tb) {
    ui.gmTab = tb.dataset.gmtab;
    renderGemeinsam();
    return;
  }
  if (!t.closest("#v-gemeinsam")) return;
  const sp = spList().find((x) => x.v === ui.gmSel),
    err = (m) => {
      const x = $("gmErr");
      if (x) x.textContent = m;
      else toast(m);
    };
  const saveMe = () => {
    const n = ($("gmMe") || {}).value;
    if (n != null) {
      const mm = currentMember();
      mm.name = n.trim().slice(0, 30);
      store.settings.me = mm;
    }
  };
  if (t.closest("#gmNewGo")) {
    const n = $("gmName").value.trim() || "Gemeinsam";
    saveMe();
    if (!currentMember().name) {
      err("Bitte deinen Namen eintragen");
      return;
    }
    t.closest("#gmNewGo").disabled = true;
    try {
      await spCreate(n.slice(0, 40));
      ui.gmStep = "invite";
      render();
    } catch (x) {
      err("Server nicht erreichbar – bist du online?");
      t.closest("#gmNewGo").disabled = false;
    }
    return;
  }
  if (t.closest("#gmJoinGo")) {
    let code = $("gmCode").value;
    saveMe();
    if (!currentMember().name) {
      err("Bitte deinen Namen eintragen");
      return;
    }
    try {
      if (!spParse(code)) {
        const q = String(code || "").match(/HBG1\.([0-9A-Za-z]{10})/),
          sc = q ? q[1] : code;
        if (/HBQ1\./.test(String(code)))
          throw new Error(
            "Das ist ein Code zum Koppeln eigener Geräte – den gibst du unter Einstellungen › Geräte & Abgleich ein."
          );
        if (!shortOk(sc)) throw new Error("Der Code hat 10 Zeichen, z. B. 7KF2-QX9M-3T.");
        ui.gmStep = "wait";
        try {
          code = await reqAsk("gm", sc, await myCard(currentMember().name));
        } catch (e) {
          if (ui.gmStep === "wait") {
            ui.gmStep = "join";
            renderGemeinsam();
          }
          if (e.cancel) return;
          throw e;
        }
      }
      if (!spParse(code)) throw new Error("Das ist kein Code für einen gemeinsamen Bereich.");
      await spJoin(code);
      ui.gmStep = "";
      render();
      toast("Du bist dabei!");
    } catch (x) {
      err(String(x.message || x).replace("Lass dir am Handy einen neuen zeigen.", "Lass dir einen neuen zeigen."));
    }
    return;
  }
  if (t.closest("#gmCopy") && sp) {
    if (!(GMS.code && GMS.v === sp.v)) {
      toast("Der Code wird noch vorbereitet");
      return;
    }
    try {
      await copySecret(shortFmt(GMS.code));
      toast("Code kopiert – er gilt 10 Minuten");
    } catch (_) {
      toast("Bitte markieren und kopieren");
    }
    return;
  }
  if (!sp) return;
  if (t.closest("#gxAdd")) {
    const a = parseAmt($("gxA").value);
    if (!(a > 0)) {
      toast("Bitte einen Betrag eintragen");
      return;
    }
    spPut(sp, "x-" + newId(), {
      t: $("gxT").value.trim().slice(0, 60) || "Ausgabe",
      a: round2(a),
      p: $("gxP").value,
      d: $("gxD").value || isoToday(),
      by: currentMember().id,
    });
    toast("Eingetragen");
    renderGemeinsam();
    return;
  }
  const stl = t.closest("[data-gmsettle]");
  if (stl) {
    spPut(sp, "x-" + newId(), {
      settle: true,
      a: Number(stl.dataset.amt),
      p: currentMember().id,
      to: stl.dataset.gmsettle,
      d: isoToday(),
      by: currentMember().id,
    });
    toast("Ausgleich eingetragen");
    renderGemeinsam();
    return;
  }
  if (t.closest("#ggAdd")) {
    const n = $("ggN").value.trim(),
      a = parseAmt($("ggT").value);
    if (!n || !(a > 0)) {
      toast("Bitte Name und Ziel eintragen");
      return;
    }
    spPut(sp, "g-" + newId(), {
      n: n.slice(0, 40),
      t: a,
    });
    renderGemeinsam();
    return;
  }
  const ca = t.closest("[data-gmcadd]");
  if (ca) {
    const inp = document.querySelector(`[data-gmcin="${ca.dataset.gmcadd}"]`),
      a = parseAmt(inp && inp.value);
    if (!(a > 0)) {
      toast("Bitte einen Betrag eintragen");
      return;
    }
    spPut(sp, "c-" + newId(), {
      g: ca.dataset.gmcadd,
      m: currentMember().id,
      a: round2(a),
      d: isoToday(),
    });
    toast("Eingezahlt");
    renderGemeinsam();
    return;
  }
  if (t.closest("#gsAdd")) {
    const v = $("gsT").value.trim();
    if (!v) return;
    spPut(sp, "s-" + newId(), {
      t: v.slice(0, 60),
      done: false,
      ts: Date.now(),
    });
    renderGemeinsam();
    setTimeout(() => {
      const i = $("gsT");
      if (i) i.focus();
    }, 30);
    return;
  }
  const sh = t.closest("[data-gmshop]");
  if (sh) {
    const L = spLocal(sp.v),
      x = L.docs[sh.dataset.gmshop];
    if (x)
      spPut(sp, sh.dataset.gmshop, {
        ...x,
        done: !x.done,
      });
    renderGemeinsam();
    return;
  }
  if (t.closest("#gsClear")) {
    const L = spLocal(sp.v);
    for (const [k, x] of Object.entries(L.docs)) if (k.startsWith("s-") && x.done) spPut(sp, k, null);
    renderGemeinsam();
    return;
  }
  const dl = t.closest("[data-gmdel]");
  if (dl) {
    spPut(sp, dl.dataset.gmdel, null);
    if (dl.dataset.gmdel.startsWith("g-")) {
      const L = spLocal(sp.v);
      for (const [k, x] of Object.entries(L.docs))
        if (k.startsWith("c-") && x.g === dl.dataset.gmdel) spPut(sp, k, null);
    }
    renderGemeinsam();
    return;
  }
  const sf = t.closest("[data-gmsf]");
  if (sf) {
    spSelSet(sp.v, (s) => {
      s.fix = sf.dataset.gmsf;
    });
    spSyncSoon();
    renderGemeinsam();
    return;
  }
  if (t.closest("#gmLeave")) {
    const b = t.closest("#gmLeave");
    if (b.dataset.armed !== "1") {
      b.dataset.armed = "1";
      b.textContent = "Wirklich verlassen?";
      setTimeout(() => {
        b.dataset.armed = "";
        b.textContent = "Bereich verlassen";
      }, 4000);
      return;
    }
    spLeave(sp.v);
    toast("Bereich verlassen");
    return;
  }
});
document.addEventListener("change", async (e) => {
  const t = e.target;
  if (!t.closest || !t.closest("#v-gemeinsam")) return;
  const sp = spList().find((x) => x.v === ui.gmSel);
  if (t.id === "gmCam") {
    const f = t.files && t.files[0];
    t.value = "";
    if (!f) return;
    const x = $("gmErr");
    if (x) x.textContent = "QR-Code wird gelesen …";
    try {
      const c = await qrFromFile(f);
      if (!c || !(spParse(c) || /HBG1\./.test(c))) {
        if (x) x.textContent = "Kein Code erkannt – näher ran oder Code einfügen.";
        return;
      }
      $("gmCode").value = c;
      if (x) x.textContent = "";
      const g = $("gmJoinGo");
      if (g) g.click();
    } catch (_) {
      if (x) x.textContent = "Das Foto ließ sich nicht lesen.";
    }
    return;
  }
  if (!sp) return;
  if (t.dataset.gmsb != null) {
    spSelSet(sp.v, (s) => {
      s.bud = s.bud || {};
      s.bud[t.dataset.gmsb] = t.checked;
    });
    spSyncSoon();
  } else if (t.dataset.gmsg != null) {
    spSelSet(sp.v, (s) => {
      s.goal = s.goal || {};
      s.goal[t.dataset.gmsg] = t.checked;
    });
    spSyncSoon();
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.id === "gsT") {
    const b = $("gsAdd");
    if (b) b.click();
  }
});
