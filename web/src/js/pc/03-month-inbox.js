/* Monatswechsel */
if (IS_PC) {
  const NUM = /\d{1,3}(?:[.   ,]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?/;
  const parse = (s) => {
    const m = String(s).match(NUM);
    if (!m) return null;
    const t = m[0],
      dm = t.match(/[.,](\d{1,2})$/),
      dec = dm && !(dm[1].length === 3) ? dm[1].length : 0;
    const dc = dec ? t[t.length - dec - 1] : "",
      int = dec ? t.slice(0, -dec - 1) : t,
      g = (int.match(/[.   ,]/) || [""])[0];
    const v = Number(int.replace(/[^\d]/g, "") + (dec ? "." + t.slice(-dec) : ""));
    return {
      t,
      v,
      dec,
      dc,
      g,
    };
  };
  const fmt = (p, v) => {
    const neg = v < 0;
    v = Math.abs(v);
    let [i, f] = v.toFixed(p.dec).split(".");
    if (p.g) i = i.replace(/\B(?=(\d{3})+(?!\d))/g, p.g);
    return (neg ? "-" : "") + i + (p.dec ? p.dc + f : "");
  };
  const amounts = (root) => {
    const out = new Map(),
      cnt = {};
    root.querySelectorAll("b,span,strong,div,em,small,text,td").forEach((e) => {
      if (e.closest(".cubestage")) return;
      if (e.children.length) return;
      const s = (e.textContent || "").trim();
      if (s.length > 22 || !/€/.test(s) || !/\d/.test(s)) return;
      const a = e.closest("[data-hb],[id]"),
        key = (a ? a.dataset.hb || a.id : "") + "|" + e.tagName;
      cnt[key] = (cnt[key] || 0) + 1;
      out.set(key + "#" + cnt[key], e);
    });
    return out;
  };
  const bars = (root) => {
    const out = new Map(),
      cnt = {};
    root.querySelectorAll('[style*="width:"],[style*="width :"]').forEach((e) => {
      if (e.closest(".cubestage")) return;
      const w = e.style.width;
      if (!/%$/.test(w)) return;
      const a = e.closest("[data-hb],[id]"),
        key = (a ? a.dataset.hb || a.id : "") + "|bar";
      cnt[key] = (cnt[key] || 0) + 1;
      out.set(key + "#" + cnt[key], [e, parseFloat(w)]);
    });
    return out;
  };
  let lastYm = ui.ym,
    lastView = ui.view;
  const _r3 = render;
  render = (...a) => {
    const changed = ui.ym !== lastYm && ui.view === lastView && !pcCalm(),
      d = ui.ym > lastYm ? 1 : -1;
    let oldA = null,
      oldB = null;
    const sec = document.querySelector(`[data-view="${ui.view}"]`);
    if (changed && sec) {
      oldA = new Map([...amounts(sec)].map(([k, e]) => [k, parse(e.textContent)]));
      oldB = new Map([...bars(sec)].map(([k, [e, w]]) => [k, w]));
    }
    lastYm = ui.ym;
    lastView = ui.view;
    const x = _r3(...a);
    if (oldA) {
      try {
        pcMonthAnim(sec, oldA, oldB, d);
      } catch (e) {
        console.warn("month", e);
      }
    }
    return x;
  };
  function pcMonthAnim(sec, oldA, oldB, d) {
    document.querySelectorAll("#monthpill select").forEach((s) =>
      s.animate(
        [
          {
            transform: `translateY(${d * 18}px)`,
            opacity: 0,
          },
          {
            transform: "none",
            opacity: 1,
          },
        ],
        {
          duration: 380,
          easing: "cubic-bezier(.2,.8,.2,1)",
        }
      )
    );
    const now = amounts(sec),
      runs = [];
    for (const [k, e] of now) {
      const o = oldA.get(k),
        n = parse(e.textContent);
      if (!o || !n || o.v === n.v) continue;
      runs.push({
        e,
        fin: e.textContent,
        n,
        a: o.v,
        b: n.v,
      });
    }
    const t0 = performance.now() + 60,
      D = 900,
      ease = (t) => 1 - Math.pow(1 - t, 3);
    const step = (nowT) => {
      const t = Math.max(0, Math.min(1, (nowT - t0) / D)),
        k = ease(t);
      for (const r of runs) {
        if (!r.e.isConnected) continue;
        r.e.textContent = t >= 1 ? r.fin : r.fin.replace(r.n.t, fmt(r.n, r.a + (r.b - r.a) * k));
      }
      if (t < 1 && runs.length) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    for (const [k, [e, w]] of bars(sec)) {
      const o = oldB.get(k);
      if (o == null || Math.abs(o - w) < 0.5) continue;
      e.animate(
        [
          {
            width: o + "%",
          },
          {
            width: w + "%",
          },
        ],
        {
          duration: 800,
          easing: "cubic-bezier(.2,.8,.2,1)",
        }
      );
    }
    [...sec.querySelectorAll(".pchero, #v-home .hblock > *, :scope > .card, :scope > .cols .card, :scope .card")]
      .filter((e) => !e.closest(".cubestage"))
      .slice(0, 16)
      .forEach((c, i) =>
        c.animate(
          [
            {
              boxShadow: "0 0 0 0 rgba(63,191,138,0)",
            },
            {
              boxShadow: "0 0 0 3px rgba(63,191,138,.45)",
            },
            {
              boxShadow: "0 0 0 0 rgba(63,191,138,0)",
            },
          ],
          {
            duration: 900,
            delay: i * 55,
            easing: "ease-out",
          }
        )
      );
  }
}
if (IS_PC) {
  const th = $("pcTheme");
  if (th && !$("pcHelp"))
    th.insertAdjacentHTML(
      "beforebegin",
      `<button class="roundbtn pchelp" id="pcHelp" data-spgo="hilfe" aria-label="Hilfe" title="Hilfe – Fragen und Antworten"><svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 0 1 4.9.7c0 1.7-2.5 2.2-2.5 3.8"/><circle cx="12" cy="17.2" r=".6" fill="currentColor"/></svg></button>`
    );
}
if (IS_PC) {
  const hp = $("pcHelp") || $("pcTheme");
  if (hp && !$("pcRefresh"))
    hp.insertAdjacentHTML(
      "beforebegin",
      `<button class="roundbtn pcrefresh" id="pcRefresh" aria-label="Aktualisieren" title="Aktualisieren"><svg class="i" viewBox="0 0 24 24"><path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4.5v4h-4"/></svg></button>`
    );
  document.addEventListener("click", async (e) => {
    const b = e.target.closest("#pcRefresh");
    if (!b || b.classList.contains("busy")) return;
    b.classList.remove("ok");
    b.classList.add("busy");
    const t0 = Date.now();
    try {
      if (typeof syncNow === "function") {
        await syncNow();
        for (let i = 0; i < 60 && SYNC.busy; i++) await new Promise((r) => setTimeout(r, 250));
      }
      try {
        UPD.last = 0;
        await ghCheck(false);
      } catch (_) {}
      render();
    } catch (_) {}
    await new Promise((r) => setTimeout(r, Math.max(0, 700 - (Date.now() - t0))));
    const bad = SYNC.token && SYNC.state !== "ok";
    b.classList.remove("busy");
    if (!bad) b.classList.add("ok");
    try {
      if (typeof renderSyncInfo === "function") renderSyncInfo();
    } catch (_) {}
    toast(bad ? "Aktualisiert – Abgleich gerade nicht möglich" : "Aktualisiert");
    setTimeout(() => b.classList.remove("ok"), 1400);
  });
}
if (IS_PC) {
  const w = document.querySelector(".top .wrap");
  if (w && !$("pcActs")) {
    const g = document.createElement("div");
    g.id = "pcActs";
    g.className = "pcacts";
    ["pcRefresh", "pcHelp", "pcTheme", "ptourQ", "bellBtn"].forEach((id) => {
      const e = $(id);
      if (e) g.appendChild(e);
    });
    const st = $("settingsBtn");
    if (st && st.parentElement === w) w.insertBefore(g, st);
    else w.appendChild(g);
  }
}
/* Posteingang */
if (IS_PC) {
  const FB = {
    items: [],
    open: null,
    imgs: {},
    last: 0,
    busy: false,
  };
  const devReq = (action, qs, body) =>
    new Promise((ok, no) => {
      const base = pairUrl();
      if (!base || !updKey()) return no(new Error("kein Schlüssel"));
      const id = newId();
      httpWaiting[id] = (r) => {
        let j = {};
        try {
          j = JSON.parse(r.text);
        } catch (e) {}
        if (r.status >= 200 && r.status < 300) ok(j);
        else no(new Error(j.error || "Server " + (r.status || "nicht erreichbar")));
      };
      window.AndroidBridge.http(
        id,
        body ? "POST" : "GET",
        apiUrl(base, action, qs || ""),
        "Dev " + updKey(),
        body ? JSON.stringify(body) : ""
      );
    });
  const unread = () => FB.items.filter((x) => !x.read).length;
  /* Der Eingang ist offen – als Fenster oder auf der Entwickler-Seite */
  const fbOn = () => !$("pcFbBg").hidden || !!($("pcDevPage") && $("pcDevPage").contains($("pcFbBody")));
  function fbBtn() {
    let b = $("pcInbox");
    const show = !!updKey();
    if (!show) {
      if (b) b.remove();
      return;
    }
    if (!b) {
      const h = $("pcHelp") || $("pcTheme");
      if (!h) return;
      h.insertAdjacentHTML(
        "beforebegin",
        `<button class="roundbtn pcinbox" id="pcInbox" aria-label="Feedback-Eingang" title="Feedback-Eingang"><svg class="i" viewBox="0 0 24 24"><path d="M4 13.5 6.5 5h11l2.5 8.5V18a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18z"/><path d="M4 13.5h4.5l1.2 2h4.6l1.2-2H20"/></svg><span class="badge" hidden>0</span></button>`
      );
      b = $("pcInbox");
    }
    const n = unread(),
      bd = b.querySelector(".badge"),
      was = Number(bd.textContent) || 0;
    bd.textContent = n;
    bd.hidden = !n;
    if (n > was && was >= 0 && FB.last) {
      b.animate(
        [
          {
            transform: "rotate(0)",
          },
          {
            transform: "rotate(-14deg) scale(1.12)",
            offset: 0.25,
          },
          {
            transform: "rotate(10deg)",
            offset: 0.5,
          },
          {
            transform: "rotate(-6deg)",
            offset: 0.75,
          },
          {
            transform: "none",
          },
        ],
        {
          duration: 700,
        }
      );
    }
  }
  /* Immer aktuelle Kopie in „Downloads\MAMI-Feedback.txt“ */
  function fbMirror() {
    try {
      const B = window.AndroidBridge;
      if (!B || !B.desktop || !B.saveFile) return;
      const L = FB.items.slice(0, 80),
        sig = L.map((x) => x.id + (x.read ? "r" : "")).join(",");
      if (sig === FB.mirror) return;
      FB.mirror = sig;
      const t =
        `Finanz MAMI – Feedback-Eingang (Stand ${new Date().toLocaleString("de-DE")})\n${L.length} Meldungen, neueste zuerst. Bilder liegen im Feedback-Eingang der App.\n\n` +
        L.map((x) => {
          const d = new Date(x.ts * 1000);
          return `### ${(KIND[x.kind] || KIND.idee)[0]}${x.read ? "" : " (ungelesen)"} · ${d.toLocaleDateString("de-DE")} ${d.toLocaleTimeString(
            "de-DE",
            {
              hour: "2-digit",
              minute: "2-digit",
            }
          )} · id ${x.id}${x.images ? ` · ${x.images} Bild(er)` : ""}\n${String(x.text || "").trim()}`;
        }).join("\n\n");
      B.saveFile("MAMI-Feedback.txt", t);
    } catch (_) {}
  }
  async function fbLoad(force) {
    if (!updKey() || FB.busy || (!force && Date.now() - FB.last < 50 * 1000)) return fbBtn();
    FB.busy = true;
    const before = unread();
    try {
      const j = await devReq("feedlist");
      FB.items = j.items || [];
      fbMirror();
      const n = unread();
      if (FB.last && n > before)
        toast(
          n - before === 1 ? "Neues Feedback ist da" : `${n - before} neue Feedbacks sind da`,
          () => fbOpen(),
          "Ansehen",
          8000
        );
      FB.last = Date.now();
    } catch (e) {
      FB.err = /Unbekannte Aktion/i.test(e.message)
        ? "Auf dem Server läuft noch die alte pair.php – bitte die neue in den Ordner „haushaltsbuch“ kopieren."
        : e.message;
    } finally {
      FB.busy = false;
      fbBtn();
      if (fbOn()) fbRender();
    }
  }
  document.body.insertAdjacentHTML(
    "beforeend",
    `<div class="backdrop" id="pcFbBg" hidden><div class="sheet pcfbsheet" role="dialog" aria-modal="true" aria-label="Feedback-Eingang"><div class="sheet-head"><h2>Feedback-Eingang</h2><button class="icon-btn" data-pcfbx="1" aria-label="Schließen"><svg class="i" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div><div id="pcFbBody"></div></div></div>`
  );
  const KIND = {
    fehler: ["Fehler", "#c2410c"],
    idee: ["Idee", "#3d63a8"],
    lob: ["Lob", "#1a7a5c"],
    absturz: ["Absturz", "#b91c1c"],
  };
  const KIC = {
    fehler: "🐞",
    idee: "💡",
    lob: "💚",
    absturz: "💥",
  };
  const PGI = {
    Start: "🏠",
    Buchungen: "📋",
    Fixkosten: "📅",
    Einkauf: "🛒",
    Analyse: "📊",
    Einstellungen: "⚙️",
    allgemein: "🌐",
  };
  const ago = (ts) => {
    const s = Date.now() / 1000 - ts;
    if (s < 90) return "gerade";
    if (s < 3600) return `vor ${Math.round(s / 60)} Min.`;
    if (s < 86400) return `vor ${Math.round(s / 3600)} Std.`;
    if (s < 172800) return "gestern";
    return new Date(ts * 1000).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
    });
  };
  function fbParse(x) {
    const full = String(x.text || ""),
      pm = full.match(/^📍 (.*)\n/),
      pgs = pm ? pm[1].split(", ") : [];
    let rest = pm ? full.slice(pm[0].length) : full,
      meta = null;
    const k = rest.lastIndexOf("\n\n---\n");
    if (k >= 0) {
      const m = rest.slice(k + 6).trim();
      rest = rest.slice(0, k);
      const parts = m.replace(/^Finanz MAMI\s*/, "").split(" · ");
      meta = {
        Version: parts[0] || "",
        Rolle: parts[1] || "",
        Gerät: parts[2] || "",
        Gruppe: parts[3] || "",
      };
    }
    rest = rest.trim();
    return {
      pgs,
      body: rest,
      title: (rest.split("\n")[0] || "(ohne Text)").slice(0, 140),
      meta,
    };
  }
  function fbVis() {
    const f = FB.flt || "all";
    return FB.items.filter((x) => f === "all" || (f === "new" ? !x.read : x.kind === f));
  }
  async function fbBulk(act) {
    const ids = [...FB.sel],
      L = FB.items.filter((x) => FB.sel.has(x.id));
    if (!ids.length) return;
    if (act === "none") {
      FB.sel.clear();
      FB.bulkArm = false;
      fbRender();
      return;
    }
    if (act === "read" || act === "unread") {
      const want = act === "read";
      for (const x of L) {
        if (!!x.read === want) continue;
        x.read = want;
        devReq(
          "feedread",
          "",
          want
            ? {
                id: x.id,
              }
            : {
                id: x.id,
                unread: 1,
              }
        ).catch(() => {});
      }
      FB.sel.clear();
      fbRender();
      fbBtn();
      toast(`${L.length} als ${want ? "gelesen" : "ungelesen"} markiert`);
      return;
    }
    if (act === "copy") {
      const fbTxt = (x) => {
        const [kl] = KIND[x.kind] || KIND.idee,
          d = new Date(x.ts * 1000);
        return `### ${kl} vom ${d.toLocaleDateString("de-DE")} ${d.toLocaleTimeString("de-DE", {
          hour: "2-digit",
          minute: "2-digit",
        })}\n${String(x.text || "").trim()}`;
      };
      try {
        await navigator.clipboard.writeText(`Feedback aus Finanz MAMI (${L.length}):\n\n` + L.map(fbTxt).join("\n\n"));
        toast(`${L.length} kopiert – einfach bei Claude einfügen`);
      } catch (_) {
        toast("Kopieren ging nicht");
      }
      return;
    }
    if (act === "del") {
      if (!FB.bulkArm) {
        FB.bulkArm = true;
        fbRender();
        clearTimeout(FB.bulkT);
        FB.bulkT = setTimeout(() => {
          FB.bulkArm = false;
          fbRender();
        }, 4000);
        return;
      }
      FB.bulkArm = false;
      clearTimeout(FB.bulkT);
      const rows = ids.map((id) => document.querySelector(`[data-pcfbrow="${CSS.escape(id)}"]`)).filter(Boolean);
      if (!pcCalm())
        rows.forEach((r, i) =>
          r.animate(
            [
              {
                opacity: 1,
                transform: "none",
              },
              {
                opacity: 0.25,
                transform: "translateX(-24px)",
              },
            ],
            {
              duration: 240,
              delay: Math.min(i, 12) * 30,
              easing: "ease-in",
              fill: "forwards",
            }
          )
        );
      let ok = 0,
        bad = "";
      for (const id of ids) {
        try {
          await devReq("feeddel", "", {
            id,
          });
          ok++;
          FB.items = FB.items.filter((i) => i.id !== id);
          FB.sel.delete(id);
          if (FB.open === id) FB.open = null;
        } catch (err) {
          bad = err.message;
        }
      }
      fbRender();
      fbBtn();
      toast(
        bad
          ? `${ok} gelöscht – ${ids.length - ok} gingen nicht: ${bad}`
          : `${ok} Meldung${ok === 1 ? "" : "en"} gelöscht`
      );
      return;
    }
  }
  function fbRender() {
    const el = $("pcFbBody");
    if (!el) return;
    const crashes = FB.items.filter((x) => x.kind === "absturz").length;
    if (!FB.items.length) {
      el.innerHTML = `<p class="muted" style="padding:20px 0;text-align:center">${FB.err ? escHtml(FB.err) : "Noch kein Feedback angekommen."}</p>`;
      return;
    }
    if (!FB.open || !FB.items.some((x) => x.id === FB.open)) FB.open = null;
    FB.sel = FB.sel || new Set();
    for (const id of [...FB.sel]) if (!FB.items.some((x) => x.id === id)) FB.sel.delete(id);
    const V = fbVis(),
      nSel = FB.sel.size,
      allOn = V.length && V.every((x) => FB.sel.has(x.id)),
      cnt = (k) =>
        k === "all"
          ? FB.items.length
          : k === "new"
            ? FB.items.filter((x) => !x.read).length
            : FB.items.filter((x) => x.kind === k).length;
    const flt = `<div class="pcfbflt"><button class="pcfbck ${allOn ? "on" : nSel ? "part" : ""}" data-pcfbselall="1" aria-label="Alle sichtbaren auswählen" title="Alle auswählen (Strg+A)">${allOn ? "✓" : nSel ? "–" : ""}</button>${[
      ["all", "Alle"],
      ["new", "Ungelesen"],
      ["absturz", "Abstürze"],
      ["fehler", "Fehler"],
      ["idee", "Ideen"],
      ["lob", "Lob"],
    ]
      .filter(([k]) => k === "all" || cnt(k))
      .map(
        ([k, l]) =>
          `<button class="pcfbf ${(FB.flt || "all") === k ? "on" : ""}" data-pcfbflt="${k}">${l} <small>${cnt(k)}</small></button>`
      )
      .join("")}</div>`;
    const top = nSel
      ? `<div class="pcfbtop pcfbsel"><b>${nSel} ausgewählt</b><button class="btn" data-pcfbbulk="read">✓ Gelesen</button><button class="btn" data-pcfbbulk="unread">● Ungelesen</button><button class="btn" data-pcfbbulk="copy">Für Claude kopieren</button><button class="btn danger" data-pcfbbulk="del">${FB.bulkArm ? `Wirklich ${nSel} endgültig löschen?` : "Löschen"}</button><button class="btn ghost" data-pcfbbulk="none">Auswahl aufheben</button></div>`
      : `<div class="pcfbtop"><button class="btn" data-pcfbcopyall="1">Alles Ungelesene für Claude kopieren</button>${crashes ? `<button class="btn" data-pcfbcopyall="absturz">Alle ${crashes} Abstürze kopieren</button>` : ""}</div>`;
    const list =
      flt +
      (V.map((x) => {
        const [kl, kc] = KIND[x.kind] || KIND.idee,
          f = fbParse(x),
          on = FB.sel.has(x.id);
        x.images = Math.max(0, Math.min(5, parseInt(x.images, 10) || 0));
        return `<div class="pcfbrow ${on ? "sel" : ""}" data-pcfbrow="${escHtml(x.id)}"><button class="pcfbck ${on ? "on" : ""}" data-pcfbsel="${escHtml(x.id)}" aria-pressed="${on}" aria-label="Auswählen">${on ? "✓" : ""}</button><button class="pcfbi ${x.read ? "" : "new"} ${FB.open === x.id ? "on" : ""}" data-pcfb="${escHtml(x.id)}" style="--kc:${kc}"><span class="pcfbih"><span class="pcfbk">${KIC[x.kind] || ""} ${kl}</span><small>${escHtml(ago(x.ts))}${x.images ? ` · 🖼 ${x.images}` : ""}</small></span><b>${escHtml(f.title)}</b>${f.pgs.length ? `<span class="pcfbpgs">${f.pgs.map((g) => `<span class="pcfbpg">${escHtml(g)}</span>`).join("")}</span>` : ""}</button></div>`;
      }).join("") || `<p class="muted small" style="padding:14px 4px">Hier ist nichts.</p>`);
    const x = FB.items.find((i) => i.id === FB.open);
    let det;
    if (!x)
      det = `<div class="pcfbd empty"><div><div style="font-size:40px">📬</div><b>Meldung anklicken</b><p class="muted small">Dann erscheint sie hier groß – mit Bildern und Gerät.</p></div></div>`;
    else {
      const [kl, kc] = KIND[x.kind] || KIND.idee,
        f = fbParse(x),
        d = new Date(x.ts * 1000);
      det = `<div class="pcfbd" style="--kc:${kc}"><div class="pcfbdh"><span class="pcfbk big">${KIC[x.kind] || ""} ${kl}</span>${f.pgs.map((g) => `<span class="pcfbpg big">${PGI[g] || ""} ${escHtml(g)}</span>`).join("")}<small>${d.toLocaleDateString("de-DE")} · ${d.toLocaleTimeString(
        "de-DE",
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      )}${x.mailed ? " · ✉" : ""}</small></div>
        <div class="pcfbtx">${escHtml(f.body) || '<span class="muted">(ohne Text)</span>'}</div>
        ${
          x.images
            ? `<div class="pcfbimgs">${Array.from(
                {
                  length: x.images,
                },
                (_, n) => {
                  const u = FB.imgs[x.id + "/" + (n + 1)];
                  return u
                    ? `<a data-pcfbimg="${escHtml(u)}"><img src="${escHtml(u)}" alt="Bild ${n + 1}"></a>`
                    : `<span class="ph">…</span>`;
                }
              ).join("")}</div>`
            : ""
        }
        ${
          f.meta
            ? `<div class="pcfbkv">${Object.entries(f.meta)
                .filter(([, v]) => v)
                .map(([k, v]) => `<div><small>${k}</small><b>${escHtml(v)}</b></div>`)
                .join("")}</div>`
            : ""
        }
        <div class="row-btns pcfbact"><button class="btn primary" data-pcfbcopy="${escHtml(x.id)}">Für Claude kopieren</button><button class="btn" data-pcfbunread="${escHtml(x.id)}">Als ungelesen markieren</button><button class="btn danger" data-pcfbdel="${escHtml(x.id)}">${FB.delArm === x.id ? "Wirklich endgültig löschen?" : "Löschen"}</button></div></div>`;
    }
    el.innerHTML = top + `<div class="pcfbgrid"><div class="pcfbl">${list}</div>${det}</div>`;
  }
  async function fbShow(id) {
    FB.open = id;
    const x = FB.items.find((i) => i.id === id);
    fbRender();
    if (!x || FB.open !== id) return;
    if (!x.read) {
      x.read = true;
      fbBtn();
      devReq("feedread", "", {
        id,
      }).catch(() => {});
    }
    for (let n = 1; n <= x.images; n++) {
      const k = id + "/" + n;
      if (FB.imgs[k]) continue;
      try {
        const j = await devReq("feedimg", `&id=${encodeURIComponent(id)}&n=${n}`);
        FB.imgs[k] = j.d;
        if (FB.open === id) fbRender();
      } catch (_) {}
    }
  }
  function fbOpen() {
    const bg = $("pcFbBg");
    bg.hidden = false;
    requestAnimationFrame(() => bg.classList.add("show"));
    fbRender();
    fbLoad(true);
  }
  const fbClose = () => {
    const bg = $("pcFbBg");
    bg.classList.remove("show");
    setTimeout(() => {
      bg.hidden = true;
    }, 200);
  };
  document.addEventListener("click", (e) => {
    if (e.target.closest("#pcInbox")) {
      fbOpen();
      return;
    }
    if (e.target.closest("[data-pcfbx]") || e.target === $("pcFbBg")) {
      fbClose();
      return;
    }
    const sb = e.target.closest("[data-pcfbsel]");
    if (sb) {
      const id = sb.dataset.pcfbsel,
        V = fbVis();
      FB.sel = FB.sel || new Set();
      FB.bulkArm = false;
      if (e.shiftKey && FB.lastSel) {
        const a = V.findIndex((x) => x.id === FB.lastSel),
          b = V.findIndex((x) => x.id === id);
        if (a >= 0 && b >= 0) {
          const on = !FB.sel.has(id);
          for (const x of V.slice(Math.min(a, b), Math.max(a, b) + 1)) on ? FB.sel.add(x.id) : FB.sel.delete(x.id);
        }
      } else FB.sel.has(id) ? FB.sel.delete(id) : FB.sel.add(id);
      FB.lastSel = id;
      fbRender();
      const nb = document.querySelector(`[data-pcfbsel="${CSS.escape(id)}"]`);
      if (nb && !pcCalm())
        nb.animate(
          [
            {
              transform: "scale(.75)",
            },
            {
              transform: "scale(1.12)",
            },
            {
              transform: "none",
            },
          ],
          {
            duration: 280,
            easing: "cubic-bezier(.3,1.6,.5,1)",
          }
        );
      return;
    }
    if (e.target.closest("[data-pcfbselall]")) {
      const V = fbVis();
      FB.sel = FB.sel || new Set();
      FB.bulkArm = false;
      const all = V.length && V.every((x) => FB.sel.has(x.id));
      for (const x of V) all ? FB.sel.delete(x.id) : FB.sel.add(x.id);
      fbRender();
      return;
    }
    const ff = e.target.closest("[data-pcfbflt]");
    if (ff) {
      FB.flt = ff.dataset.pcfbflt;
      fbRender();
      return;
    }
    const bk = e.target.closest("[data-pcfbbulk]");
    if (bk) {
      fbBulk(bk.dataset.pcfbbulk);
      return;
    }
    const h = e.target.closest("[data-pcfb]");
    if (h) {
      if (e.ctrlKey || e.metaKey) {
        const sb2 = h.parentElement.querySelector("[data-pcfbsel]");
        if (sb2) sb2.click();
        return;
      }
      fbShow(h.dataset.pcfb);
      return;
    }
    const fbTxt = (x) => {
      const [kl] = KIND[x.kind] || KIND.idee,
        d = new Date(x.ts * 1000);
      return `### ${kl} vom ${d.toLocaleDateString("de-DE")} ${d.toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
      })}${x.images ? ` (${x.images} Bild${x.images > 1 ? "er" : ""} – im Posteingang)` : ""}\n${String(x.text || "").trim()}`;
    };
    const cp = async (t, msg) => {
      try {
        await navigator.clipboard.writeText(t);
        toast(msg);
      } catch (_) {
        toast("Kopieren ging nicht");
      }
    };
    const c1 = e.target.closest("[data-pcfbcopy]");
    if (c1) {
      const x = FB.items.find((i) => i.id === c1.dataset.pcfbcopy);
      if (x) cp("Feedback aus Finanz MAMI:\n\n" + fbTxt(x), "Kopiert – einfach bei Claude einfügen");
      return;
    }
    const ca = e.target.closest("[data-pcfbcopyall]");
    if (ca) {
      const all = ca.dataset.pcfbcopyall === "absturz",
        L = FB.items.filter((x) => (all ? x.kind === "absturz" : !x.read));
      if (!L.length) {
        toast("Nichts Ungelesenes da");
        return;
      }
      cp(
        `${all ? "Abstürze" : "Feedback"} aus Finanz MAMI (${L.length}):\n\n` + L.map(fbTxt).join("\n\n"),
        `${L.length} kopiert – einfach bei Claude einfügen`
      );
      return;
    }
    const u = e.target.closest("[data-pcfbunread]");
    if (u) {
      const x = FB.items.find((i) => i.id === u.dataset.pcfbunread);
      if (x) {
        x.read = false;
        FB.open = null;
        fbRender();
        fbBtn();
        devReq("feedread", "", {
          id: x.id,
          unread: 1,
        }).catch(() => {});
      }
      return;
    }
    const dl = e.target.closest("[data-pcfbdel]");
    if (dl) {
      const id = dl.dataset.pcfbdel;
      if (FB.delArm !== id) {
        FB.delArm = id;
        fbRender();
        clearTimeout(FB.delT);
        FB.delT = setTimeout(() => {
          FB.delArm = null;
          fbRender();
        }, 4000);
        return;
      }
      FB.delArm = null;
      const row = document.querySelector(".pcfbd");
      devReq("feeddel", "", {
        id,
      })
        .then(() => {
          const done = () => {
            FB.items = FB.items.filter((i) => i.id !== id);
            FB.open = null;
            fbRender();
            fbBtn();
            toast("Feedback gelöscht");
          };
          if (row && !pcCalm())
            row
              .animate(
                [
                  {
                    opacity: 1,
                    transform: "none",
                  },
                  {
                    opacity: 0,
                    transform: "translateX(60px) scale(.96)",
                  },
                ],
                {
                  duration: 260,
                  easing: "ease-in",
                }
              )
              .finished.then(done, done);
          else done();
        })
        .catch((err) =>
          toast(
            /Unbekannte Aktion/i.test(err.message)
              ? "Zum Löschen bitte die neue pair.php auf den Server laden"
              : "Löschen hat nicht geklappt: " + err.message
          )
        );
      return;
    }
    const im = e.target.closest("[data-pcfbimg]");
    if (im) {
      const w = window.open("");
      if (w) w.document.write(`<img src="${im.dataset.pcfbimg}" style="max-width:100%">`);
    }
  });
  document.addEventListener("keydown", (e) => {
    if (!fbOn()) return;
    if (e.key === "Escape") {
      if (FB.sel && FB.sel.size) {
        FB.sel.clear();
        FB.bulkArm = false;
        fbRender();
      } else fbClose();
      return;
    }
    if (e.target.matches && e.target.matches("input,textarea")) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
      e.preventDefault();
      FB.sel = FB.sel || new Set();
      for (const x of fbVis()) FB.sel.add(x.id);
      fbRender();
      return;
    }
    if ((e.key === "Delete" || e.key === "Backspace") && FB.sel && FB.sel.size) {
      e.preventDefault();
      fbBulk("del");
    }
  });
  setTimeout(() => fbLoad(true), 5000);
  setInterval(() => fbLoad(false), 60 * 1000);
  addEventListener("focus", () => fbLoad(false));
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) fbLoad(false);
  });
  const _r4 = render;
  render = (...a) => {
    const x = _r4(...a);
    try {
      fbBtn();
    } catch (e) {}
    return x;
  };
  function relBtn() {
    let b = $("pcRel");
    if (!updKey()) {
      if (b) b.remove();
      return;
    }
    if (!b) {
      const h = $("pcInbox") || $("pcTheme");
      if (!h) return;
      h.insertAdjacentHTML(
        "beforebegin",
        `<button class="roundbtn pcrel" id="pcRel" aria-label="Entwickler" title="Entwickler: Freigabe, Tester, Testdaten"><svg class="i" viewBox="0 0 24 24"><path d="M12 15V3M7 8l5-5 5 5"/><path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/></svg><i class="dot" hidden></i></button>`
      );
      b = $("pcRel");
    }
    const d = b.querySelector(".dot");
    if (d) d.hidden = !(REL.mine && REL.all && REL.mine !== REL.all);
  }
  const DS = {
    busy: false,
    d: null,
    err: "",
    t: 0,
  };
  async function dsLoad(force) {
    if (DS.busy || (!force && Date.now() - DS.t < 60e3)) return;
    DS.busy = true;
    DS.err = "";
    try {
      DS.d = await devReq("devstats");
      DS.t = Date.now();
    } catch (e) {
      DS.err = e.message || "Server nicht erreichbar";
    } finally {
      DS.busy = false;
      window.pcRelPaint();
    }
  }
  const FM = {
      phone: "📱",
      tablet: "📲",
      pc: "💻",
      laptop: "💻",
    },
    FN = {
      phone: "Handy",
      tablet: "Tablet",
      pc: "PC",
      laptop: "PC",
    };
  const vnum = (v) => {
    const m = String(v || "").match(/(\d+)\.(\d+)\.(\d+)/);
    return m ? +m[1] * 1e6 + +m[2] * 1e3 + +m[3] : 0;
  };
  const agoD = (t) => {
    if (!t) return "noch nie";
    const d = Math.floor((Date.now() / 1000 - t) / 86400);
    return d <= 0 ? "heute" : d === 1 ? "gestern" : `vor ${d} Tagen`;
  };
  const kop = (ic, t, sub) =>
    `<div class="pcdtop2"><span class="ic">${ic}</span><span><b>${t}</b><small>${sub}</small></span></div>`;
  function relPanel() {
    setTimeout(() => {
      try {
        relLoad();
      } catch (_) {}
    }, 0);
    const mine = relNum(REL.mineBody, "web"),
      ow = relNum(REL.allBody, "web"),
      D = [
        ["handy", "Handy", "📱", ow],
        ["tablet", "Tablet", "📲", relNum(REL.allBody, "webt") || ow],
        ["pc", "PC", "💻", relNum(REL.allBody, "webp") || ow],
      ];
    const behind = D.filter(([, , , n]) => mine && n !== mine),
      sel = D.filter(([k, , , n]) => REL.sel[k] && n !== mine),
      loaded = !!mine;
    const head = !loaded
      ? kop("🚀", "Wird geladen …", "Versionen werden abgefragt")
      : behind.length
        ? kop(
            "🚀",
            `${escHtml(verName(mine))} bereit`,
            `Tester haben noch ${escHtml([...new Set(behind.map((d) => verName(d[3])))].join(" / "))}`
          )
        : kop("✅", "Alles aktuell", `Alle haben ${escHtml(verName(mine))}`);
    const cards = D.map(([k, l, ic, n]) => {
      const same = loaded && n === mine;
      return `<label class="pcrdev ${same ? "same" : ""}"><span class="ic">${ic}</span><span class="tx"><b>${l}</b><small>${same ? escHtml(verName(mine)) : `<s>${n ? escHtml(verName(n)) : "…"}</s> → ${loaded ? escHtml(verName(mine)) : "…"}`}</small></span>${loaded ? `<span class="pcbadge ${same ? "g" : "o"}">${same ? "aktuell ✓" : "neuer da"}</span>` : ""}<input type="checkbox" class="pcsw" data-relsel="${k}" ${REL.sel[k] && !same ? "checked" : ""} ${same ? "disabled" : ""}></label>`;
    }).join("");
    return `${head}${cards}<button class="btn ${REL.arm ? "danger" : "primary"} pcrgo" id="relGo" ${REL.busy || !sel.length || !loaded ? "disabled" : ""}>${REL.busy ? "Wird freigegeben …" : REL.arm ? "Wirklich freigeben?" : !loaded ? "…" : sel.length ? `${escHtml(verName(mine))} freigeben für ${sel.map((d) => d[1]).join(", ")}` : "Nichts ausgewählt"}</button>
      ${REL.msg ? `<span class="small" style="display:block;margin-top:8px;color:${/geklappt|unterwegs/.test(REL.msg) ? "var(--good)" : "var(--bad)"}">${escHtml(REL.msg)}</span>` : ""}`;
  }
  function testerPanel(d) {
    const T = d.testers || [],
      newest = Math.max(0, ...T.map((t) => vnum(t.ver)), ...(d.versions || []).map((v) => vnum(v.ver))),
      now = Date.now() / 1000;
    const st = (t) => (!t.seen || now - t.seen > 14 * 86400 ? "in" : vnum(t.ver) >= newest ? "ok" : "old");
    const F = ui.dsF || "all",
      Q = (ui.dsQ || "").toUpperCase().trim();
    const fit = (t) =>
      (!Q || t.code.includes(Q)) &&
      (F === "all" ||
        (F === "old" && st(t) === "old") ||
        (F === "in" && st(t) === "in") ||
        (F === "phone" && t.form === "phone") ||
        (F === "tablet" && t.form === "tablet") ||
        (F === "pc" && (t.form === "pc" || t.form === "laptop")));
    const n = {
      ok: 0,
      old: 0,
      in: 0,
    };
    T.forEach((t) => n[st(t)]++);
    const N = T.length || 1,
      act = n.ok + n.old;
    const head = kop(
      "👥",
      `${T.length} ${T.length === 1 ? "Tester" : "Tester"}`,
      T.length
        ? `${act} ${act === 1 ? "war" : "waren"} in den letzten 14 Tagen aktiv`
        : "Noch niemand freigeschaltet – verschick einen Code"
    );
    const bar = T.length
      ? `<div class="pcstack"><i style="width:${(n.ok / N) * 100}%;background:var(--good)"></i><i style="width:${(n.old / N) * 100}%;background:var(--warn)"></i><i style="width:${(n.in / N) * 100}%;background:var(--line)"></i></div>
      <div class="pcstl"><span>🟢 ${n.ok} aktuell</span><span>🟠 ${n.old} veraltet</span><span>⚪ ${n.in} inaktiv</span></div>`
      : "";
    const chips = [
      ["all", `Alle ${T.length}`],
      ["old", `Veraltet ${n.old}`],
      ["in", `Inaktiv ${n.in}`],
      ["phone", "📱 Handy"],
      ["tablet", "📲 Tablet"],
      ["pc", "💻 PC"],
    ];
    const ctl = T.length
      ? `<input class="in pcdsq" id="dsQ" placeholder="🔍 Code suchen …" value="${escHtml(ui.dsQ || "")}" autocomplete="off"><div class="pcdsf">${chips.map(([k, l]) => `<button class="${F === k ? "on" : ""}" data-dsf="${k}">${l}</button>`).join("")}</div>`
      : "";
    const row = (t) => {
      const s = st(t);
      return `<div class="pcdtr"><tt>${escHtml(t.code)}</tt><span class="dv" title="${escHtml(FN[t.form] || "unbekannt")}">${FM[t.form] || "❔"}</span><span class="pcbadge ${s === "ok" ? "g" : vnum(t.ver) && newest - vnum(t.ver) >= 1000 ? "r" : s === "in" ? "" : "o"}">${t.ver ? escHtml("v" + t.ver.replace(/^v/, "")) : "–"}</span><span class="ag">${agoD(t.seen)}</span></div>`;
    };
    const open = ui.dsOpen || {
      old: true,
      in: false,
      ok: false,
    };
    const grp = (k, ic, l) => {
      const L = T.filter((t) => st(t) === k && fit(t)).sort((a, b) => (b.seen || 0) - (a.seen || 0));
      if (!L.length) return "";
      const o = Q || F !== "all" ? true : !!open[k],
        lim = ui.dsMore && ui.dsMore[k] ? 999 : 8;
      return `<div class="pcdgrp"><button class="pcdgh" data-dsgrp="${k}"><span>${ic} ${l}</span><em>${L.length} ${o ? "▴" : "▾"}</em></button>${o ? L.slice(0, lim).map(row).join("") + (L.length > lim ? `<button class="pcdmore" data-dsmore="${k}">+ ${L.length - lim} weitere</button>` : "") : ""}</div>`;
    };
    const groups =
      grp("old", "🟠", "Veraltet – Update noch nicht da") +
      grp("in", "⚪", "Länger nicht aktiv") +
      grp("ok", "🟢", "Aktuell");
    return (
      head +
      bar +
      ctl +
      (T.length ? groups || `<p class="small muted" style="padding:10px 2px">Niemand passt zum Filter.</p>` : "")
    );
  }
  function codesPanel(d) {
    const I = [...(d.invites || [])].sort((a, b) => +a.used - +b.used),
      open = I.filter((i) => !+i.used);
    const head = kop(
      "🎟️",
      `${open.length} ${open.length === 1 ? "Code" : "Codes"} offen`,
      `${I.length - open.length} schon benutzt · jeder Code gilt für eine Person`
    );
    const row = (i) => {
      const u = +i.used;
      return `<div class="pcdcode ${u ? "used" : ""}"><span class="dot" style="background:${u ? "var(--good)" : "var(--warn)"}"></span><tt>${escHtml(i.code)}</tt><span class="pcbadge ${u ? "g" : "o"}">${
        u
          ? `benutzt${
              i.last
                ? " " +
                  new Date(i.last * 1000).toLocaleDateString("de-DE", {
                    day: "numeric",
                    month: "numeric",
                  })
                : ""
            }`
          : "wartet"
      }</span>${u ? "" : `<button class="pccp" data-dscopy="${escHtml(i.code)}">Kopieren</button>`}<button class="pcdel ${ui.dsDel === i.code ? "arm" : ""}" data-dsdel="${escHtml(i.code)}" title="Code löschen" aria-label="Code ${escHtml(i.code)} löschen">${ui.dsDel === i.code ? "Löschen?" : "🗑"}</button></div>`;
    };
    return (
      head +
      `<button class="btn primary pcrgo" data-invopen="1" style="margin:0 0 10px">＋ Code für neuen Tester</button>` +
      (I.length ? I.map(row).join("") : `<p class="small muted">Noch keine Einladung verschickt.</p>`)
    );
  }
  const KI = {
    d: null,
    busy: false,
    err: "",
    t: 0,
    arm: null,
    anim: 0,
  };
  async function kiLoad(force, body) {
    if (KI.busy || (!force && !body && Date.now() - KI.t < 30e3)) return;
    KI.busy = true;
    KI.err = "";
    try {
      KI.d = await devReq(body ? "aiset" : "aistat", "", body);
      KI.t = Date.now();
      KI.anim = 1;
    } catch (e) {
      KI.err = e.message || "Server nicht erreichbar";
    } finally {
      KI.busy = false;
      window.pcRelPaint();
    }
  }
  const usd = (v, d = 2) =>
    Number(v || 0).toLocaleString("de-DE", {
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    }) + " $";
  const dd = (t) =>
    new Date(t * 1000).toLocaleDateString("de-DE", {
      day: "numeric",
      month: "short",
    });
  function kiPanel() {
    const d = KI.d;
    if (!d) return `<p class="small muted" style="padding:14px 0">${KI.err ? escHtml(KI.err) : "Wird geladen …"}</p>`;
    const on = (d.codes || []).filter((c) => +c.on1).length,
      all = (d.codes || []).length,
      left = Math.max(0, d.budget - d.spent),
      pct = d.budget > 0 ? Math.min(100, (d.spent / d.budget) * 100) : 0;
    const n = +((d.tot || {}).n || 0),
      per = n ? d.spent / n : 0,
      now = Date.now() / 1000,
      runDays = Math.max(1, (now - d.start) / 86400),
      perDay = d.spent / runDays,
      fore = perDay * ((d.end - d.start) / 86400);
    const st = !d.key
      ? ["🔑", "Schlüssel fehlt", "Leg mami-config.php mit deinem Schlüssel neben pair.php"]
      : d.pause
        ? ["⏸️", "KI pausiert", "Niemand kann gerade genauer lesen lassen – außer dir"]
        : d.spent >= d.budget
          ? ["🛑", "Guthaben aufgebraucht", `Geht am ${dd(d.end)} wieder los`]
          : ["✨", "KI-Mami läuft", `Freigeschaltet für ${on} von ${all} Testern · du hast sie immer`];
    const head = kop(st[0], st[1], st[2]);
    const col = pct >= 90 ? "var(--bad)" : pct >= 70 ? "var(--warn)" : "var(--accent)";
    const days = d.days || [],
      mx = Math.max(0.0001, ...days.map((x) => +x.usd || 0));
    const card = `<div class="kicard"><div class="kitop"><span class="small muted">Verbraucht seit ${dd(d.start)}</span><span class="small muted">Limit ${usd(d.budget)}</span></div>
      <div class="kibig"><b data-kiodo="${d.spent}">${usd(d.spent)}</b><span> von ${usd(d.budget)}</span></div>
      <div class="kiexact">genau: ${usd(d.spent, 4)} · übrig ${usd(left)}</div>
      <div class="kibar"><i style="width:${pct}%;background:${col}"></i></div>
      <div class="kigrid"><span><b>${n}</b><small>Briefe gelesen</small></span><span><b>${n ? usd(per, 4) : "–"}</b><small>pro Brief</small></span><span><b>${usd(fore)}</b><small>Hochrechnung bis ${dd(d.end)}</small></span></div>
      ${days.length ? `<div class="kidays">${days.map((x) => `<i title="${new Date(x.d).toLocaleDateString("de-DE")}: ${x.n} Briefe · ${usd(x.usd, 4)}" style="height:${Math.max(4, ((+x.usd || 0) / mx) * 100)}%"></i>`).join("")}</div><div class="kidl"><span>vor 30 Tagen</span><span>heute</span></div>` : ""}
      <span class="small muted" style="display:block;margin-top:6px">Nur was Mami über deinen Server verbraucht. Neues Guthaben am ${dd(d.end)} · ${escHtml(d.model)}</span></div>`;
    const ctl = `<div class="kictl"><button class="btn ${d.pause ? "primary" : ""}" data-kipause="${d.pause ? 0 : 1}">${d.pause ? "▶️ KI wieder an" : "⏸️ KI für alle pausieren"}</button>
      <button class="btn" data-kiall="1">Alle freischalten</button><button class="btn ${KI.arm === "none" ? "danger" : ""}" data-kiall="0">${KI.arm === "none" ? "Wirklich alle sperren?" : "Alle sperren"}</button>
      <label class="kibud">Limit <input class="in" id="kiBud" type="number" min="0" step="1" value="${d.budget}"> $ <button class="btn" data-kibud="1">Speichern</button></label></div>`;
    const per2 = {};
    (d.per || []).forEach((x) => (per2[x.code] = x));
    const rows = (d.codes || [])
      .sort((a, b) => +b.on1 - +a.on1 || a.code.localeCompare(b.code))
      .map((c) => {
        const u = per2[c.code];
        return `<label class="pcdtr kirow ${+c.on1 ? "on" : ""}"><tt>${escHtml(c.code)}</tt><span class="kiu">${u ? `${u.n} ${+u.n === 1 ? "Brief" : "Briefe"} · ${usd(u.usd, 4)}` : "noch nichts"}</span><span class="kisw"><input type="checkbox" data-kicode="${escHtml(c.code)}" ${+c.on1 ? "checked" : ""}><i></i></span></label>`;
      })
      .join("");
    const me = per2["#dev"]
      ? `<div class="pcdtr kirow on"><tt>Du</tt><span class="kiu">${per2["#dev"].n} Briefe · ${usd(per2["#dev"].usd, 4)}</span><span class="pcbadge g">immer an</span></div>`
      : "";
    return (
      head +
      card +
      ctl +
      `<div class="kih">Tester freischalten</div>` +
      me +
      (rows || `<p class="small muted">Noch keine Tester.</p>`) +
      `<button class="pccp" style="margin-top:10px" data-kireload="1">${KI.busy ? "…" : "↻ Neu laden"}</button>`
    );
  }
  function kiOdo() {
    const el = document.querySelector("[data-kiodo]");
    if (!el || !KI.anim) return;
    KI.anim = 0;
    if (reducedMotion()) return;
    const v = +el.dataset.kiodo,
      t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / 900),
        e = 1 - Math.pow(1 - k, 3);
      el.textContent = usd(v * e);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    const bar = document.querySelector(".kibar i");
    if (bar)
      bar.animate(
        [
          {
            width: "0%",
          },
          {
            width: bar.style.width,
          },
        ],
        {
          duration: 900,
          easing: "cubic-bezier(.2,.9,.3,1)",
        }
      );
    document.querySelectorAll(".kidays i").forEach((b, i) =>
      b.animate(
        [
          {
            transform: "scaleY(0)",
          },
          {
            transform: "none",
          },
        ],
        {
          duration: 500,
          delay: i * 18,
          easing: "cubic-bezier(.3,1.3,.5,1)",
          fill: "backwards",
        }
      )
    );
  }
  new MutationObserver(() => {
    if (KI.anim && document.querySelector("[data-kiodo]")) kiOdo();
  }).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  document.addEventListener("change", (e) => {
    const c = e.target.closest("[data-kicode]");
    if (!c) return;
    const row = c.closest(".kirow");
    if (row) row.classList.toggle("on", c.checked);
    kiLoad(true, {
      c: c.dataset.kicode,
      on: c.checked ? 1 : 0,
    });
  });
  document.addEventListener("click", (e) => {
    const p = e.target.closest("[data-kipause]");
    if (p) {
      kiLoad(true, {
        pause: +p.dataset.kipause,
      });
      return;
    }
    const a = e.target.closest("[data-kiall]");
    if (a) {
      if (a.dataset.kiall === "0" && KI.arm !== "none") {
        KI.arm = "none";
        window.pcRelPaint();
        setTimeout(() => {
          if (KI.arm) {
            KI.arm = null;
            window.pcRelPaint();
          }
        }, 4000);
        return;
      }
      KI.arm = null;
      kiLoad(true, {
        all: +a.dataset.kiall,
      });
      return;
    }
    if (e.target.closest("[data-kibud]")) {
      const v = parseFloat(($("kiBud") || {}).value);
      if (!(v >= 0)) {
        toast("Bitte eine Zahl eingeben");
        return;
      }
      kiLoad(true, {
        budget: v,
      });
      return;
    }
    if (e.target.closest("[data-kireload]")) {
      kiLoad(true);
      return;
    }
  });
  function devPanelHtml() {
    const tab = ui.devTab || "rel";
    const tabs = `<div class="seg pcdevseg">${[
      ["rel", "Freigabe"],
      ["stat", "Tester"],
      ["codes", "Codes"],
      ["ki", "✨ KI"],
      ["test", "Testdaten"],
    ]
      .map(([k, l]) => `<button class="${tab === k ? "on" : ""}" data-devtab="${k}">${l}</button>`)
      .join("")}</div>`;
    if (tab === "rel") return tabs + relPanel();
    if (tab === "ki") {
      setTimeout(() => kiLoad(), 0);
      return tabs + `<div class="pcds">${kiPanel()}</div>`;
    }
    if (tab === "stat" || tab === "codes") {
      const d = DS.d;
      if (!d)
        return (
          tabs + `<p class="small muted" style="padding:14px 0">${DS.err ? escHtml(DS.err) : "Wird geladen …"}</p>`
        );
      return (
        tabs +
        `<div class="pcds">${tab === "stat" ? testerPanel(d) : codesPanel(d)}<button class="pccp" style="margin-top:10px" data-dsreload="1">↻ Neu laden</button></div>`
      );
    }
    const coupled = !!SYNC.token;
    return (
      tabs +
      `<div class="pcds"><p class="small muted" style="margin:6px 0 10px">Nur für ein Testgerät: füllt die App mit Beispiel-Buchungen der letzten 3 Monate oder setzt sie komplett zurück.</p>
      ${coupled ? `<div class="notice warn"><span>Dieses Gerät ist gekoppelt – Testdaten würden auf alle deine Geräte übertragen. Deshalb hier gesperrt.</span></div>` : `<button class="btn primary block" data-testfill="1">Testdaten laden</button><button class="btn block ${ui.testArm ? "danger" : ""}" data-testwipe="1" style="margin-top:8px">${ui.testArm ? "Wirklich alles löschen?" : "Alles zurücksetzen"}</button>`}</div>`
    );
  }
  async function testFill() {
    const C = cats("ausgabe"),
      today = new Date();
    let n = 0;
    const shops = {
      Lebensmittel: ["Rewe", "Aldi", "Lidl", "Edeka"],
      "Haushalt & Pflichten": ["dm", "Rossmann"],
      "Spaß & Freizeit": ["Kino", "Restaurant", "Café"],
      "Tanken & Parken": ["Aral", "Shell"],
    };
    for (let m = 0; m < 3; m++)
      for (let i = 0; i < 22; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() - m, 1 + Math.floor(Math.random() * 27));
        if (d > today) continue;
        const cat = C[Math.floor(Math.random() * C.length)],
          sh = (shops[cat] || ["Laden"])[Math.floor(Math.random() * (shops[cat] || ["Laden"]).length)];
        await saveDoc("tx", newId(), {
          date: isoOf(d),
          amount: round2(4 + Math.random() * 80),
          kind: "ausgabe",
          cat,
          note: sh,
          ts: Date.now(),
          test: true,
        });
        n++;
      }
    for (let m = 0; m < 3; m++) {
      const d = new Date(today.getFullYear(), today.getMonth() - m, 1);
      await saveDoc("tx", newId(), {
        date: isoOf(d),
        amount: 2150,
        kind: "einnahme",
        cat: (cats("einnahme")[0] || {}).name || cats("einnahme")[0] || "Gehalt",
        note: "Gehalt (Test)",
        ts: Date.now(),
        test: true,
      });
      n++;
    }
    const F = [
      ["Miete", 650],
      ["Strom", 68],
      ["Handy", 19.99],
      ["Internet", 34.99],
      ["Netflix", 13.99],
    ];
    let k = store.fixed.length;
    for (const [name, amount] of F)
      await saveDoc("fixed", newId(), {
        name,
        amount,
        kind: "privat",
        order: k++,
        test: true,
      });
    render();
    toast(`${n} Test-Buchungen und ${F.length} Fixkosten angelegt`);
  }
  document.addEventListener("click", async (e) => {
    const t = e.target.closest("[data-devtab]");
    if (t) {
      ui.devTab = t.dataset.devtab;
      if (ui.devTab === "stat" || ui.devTab === "codes") dsLoad();
      window.pcRelPaint();
      return;
    }
    const f = e.target.closest("[data-dsf]");
    if (f) {
      ui.dsF = f.dataset.dsf;
      window.pcRelPaint();
      return;
    }
    const g = e.target.closest("[data-dsgrp]");
    if (g) {
      const k = g.dataset.dsgrp,
        o =
          ui.dsOpen ||
          (ui.dsOpen = {
            old: true,
            in: false,
            ok: false,
          });
      o[k] = !o[k];
      window.pcRelPaint();
      return;
    }
    const mo = e.target.closest("[data-dsmore]");
    if (mo) {
      (ui.dsMore = ui.dsMore || {})[mo.dataset.dsmore] = true;
      window.pcRelPaint();
      return;
    }
    const dl = e.target.closest("[data-dsdel]");
    if (dl) {
      const c = dl.dataset.dsdel;
      if (ui.dsDel !== c) {
        ui.dsDel = c;
        window.pcRelPaint();
        clearTimeout(ui.dsDelT);
        ui.dsDelT = setTimeout(() => {
          ui.dsDel = null;
          window.pcRelPaint();
        }, 4000);
        return;
      }
      ui.dsDel = null;
      try {
        await devReq("invdel", "", {
          c,
        });
        if (DS.d) DS.d.invites = (DS.d.invites || []).filter((i) => i.code !== c);
        if (ui.inv && ui.inv.code === c) ui.inv = null;
        toast(`Code ${c} gelöscht – er funktioniert nicht mehr`);
      } catch (err) {
        toast(
          /Unbekannte Aktion/i.test(err.message || "")
            ? "Dafür braucht der Server die neue pair.php"
            : err.message || "Löschen ging nicht"
        );
      }
      window.pcRelPaint();
      return;
    }
    const cp = e.target.closest("[data-dscopy]");
    if (cp) {
      try {
        await navigator.clipboard.writeText(cp.dataset.dscopy);
        toast("Code kopiert");
      } catch (_) {
        toast(cp.dataset.dscopy);
      }
      return;
    }
    if (e.target.closest("[data-invopen]") && $("pcRelPop")) $("pcRelPop").remove();
    if (e.target.closest("[data-dsreload]")) {
      dsLoad(true);
      return;
    }
    if (e.target.closest("[data-testfill]")) {
      if (SYNC.token) return;
      await testFill();
      return;
    }
    if (e.target.closest("[data-testwipe]")) {
      if (SYNC.token) return;
      if (!ui.testArm) {
        ui.testArm = true;
        window.pcRelPaint();
        setTimeout(() => {
          ui.testArm = false;
          window.pcRelPaint();
        }, 5000);
        return;
      }
      ui.testArm = false;
      $("pcRelPop")?.remove();
      await wipeAll();
      toast("Alles zurückgesetzt");
      return;
    }
  });
  window.pcRelPaint = () => {
    try {
      relBtn();
      const pop = $("pcRelPop") || $("pcDevRel");
      if (pop) pop.innerHTML = devPanelHtml();
    } catch (_) {}
  };
  /* für die Entwickler-Seite */
  window.pcDevHooks = {
    state: () => ({ DS, FB, REL, unread: unread() }),
    fbParse,
    kind: (k) => KIND[k] || KIND.idee,
    ago,
    dsLoad,
    fbLoad,
    fbShow,
    fbMount(el) {
      const b = $("pcFbBody");
      if (b && el) el.appendChild(b);
      fbRender();
      fbLoad(true);
    },
    fbUnmount() {
      const b = $("pcFbBody"),
        sh = document.querySelector("#pcFbBg .pcfbsheet");
      if (b && sh && b.parentElement !== sh) sh.appendChild(b);
    },
  };
  document.addEventListener("click", (e) => {
    const pop = $("pcRelPop");
    if (e.target.closest("#pcRel")) {
      if (pop) {
        pop.remove();
        return;
      }
      const r = e.target.closest("#pcRel").getBoundingClientRect();
      const el = document.createElement("div");
      el.id = "pcRelPop";
      el.className = "pcrelpop";
      el.style.top = r.bottom + 10 + "px";
      el.style.left = Math.max(12, Math.min(innerWidth - 342, r.right - 330)) + "px";
      el.innerHTML = devPanelHtml();
      document.body.appendChild(el);
      relLoad(true);
      if (["stat", "codes"].includes(ui.devTab || "rel")) dsLoad();
      return;
    }
    if (pop && !e.target.closest("#pcRelPop") && document.contains(e.target)) pop.remove();
  });
  document.addEventListener("input", (e) => {
    if (e.target.id !== "dsQ") return;
    ui.dsQ = e.target.value;
    const pos = e.target.selectionStart;
    window.pcRelPaint();
    const q = $("dsQ");
    if (q) {
      q.focus();
      try {
        q.setSelectionRange(pos, pos);
      } catch (_) {}
    }
  });
  const _r5 = render;
  render = (...a) => {
    const x = _r5(...a);
    try {
      relBtn();
    } catch (e) {}
    return x;
  };
  setTimeout(() => {
    relBtn();
    relLoad();
  }, 4000);
  setInterval(() => {
    if (document.visibilityState === "visible") relLoad();
  }, 10 * 60e3);
}
