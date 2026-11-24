/* Entwickler-Seite am PC: Übersicht, Freigabe, Tester, Codes, KI, Testdaten, Nachrichten, Fehlersuche */
const pcDevPage = (() => {
  const S = { sec: "home" };
  const ic = (p) => `<svg class="i" viewBox="0 0 24 24">${p}</svg>`;
  const IC = {
    home: ic('<path d="M3 11 12 4l9 7"/><path d="M5 10v9h14v-9"/>'),
    rel: ic('<path d="M12 15V3M7 8l5-5 5 5"/><path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/>'),
    stat: ic(
      '<circle cx="9" cy="8" r="3.2"/><path d="M3 19c.6-3.3 3-5 6-5s5.4 1.7 6 5"/><path d="M16 4.6a3 3 0 0 1 0 6.3M17.5 14c2 .5 3.2 2.1 3.5 5"/>'
    ),
    fb: ic('<path d="M4 13.5 6.5 5h11l2.5 8.5V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M4 13.5h4.5l1 2h5l1-2H20"/>'),
    codes: ic('<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3"/>'),
    ki: ic('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>'),
    test: ic(
      '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>'
    ),
    dbg: ic(
      '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.1L4 16.7 7.3 20l5.3-5.3a4 4 0 0 0 5.1-5.4l-2.4 2.4-2.4-.6-.6-2.4z"/>'
    ),
  };
  const NAV = ["home", "rel", "stat", "fb", "codes", "ki", "test", "dbg"];
  const T = (k, v) => escHtml(uiText(k, v));
  const H = () => window.pcDevHooks;
  const vnum = (v) => {
    const m = String(v || "").match(/(\d+)\.(\d+)\.(\d+)/);
    return m ? +m[1] * 1e6 + +m[2] * 1e3 + +m[3] : 0;
  };
  /* Tester-Stand aus den Server-Zahlen: aktuell, veraltet, länger nicht da */
  function testers() {
    const d = H() && H().state().DS.d;
    if (!d) return null;
    const L = d.testers || [],
      newest = Math.max(0, ...L.map((t) => vnum(t.ver)), ...(d.versions || []).map((v) => vnum(v.ver))),
      now = Date.now() / 1000,
      st = (t) => (!t.seen || now - t.seen > 14 * 86400 ? "in" : vnum(t.ver) >= newest ? "ok" : "old");
    return L.map((t) => ({ ...t, st: st(t) }));
  }
  function stats() {
    const mine = relNum(REL.mineBody, "web"),
      ow = relNum(REL.allBody, "web"),
      plat = [ow, relNum(REL.allBody, "webt") || ow, relNum(REL.allBody, "webp") || ow].filter(Boolean),
      low = plat.length ? Math.min(...plat) : 0,
      L = testers(),
      h = H();
    return {
      mine,
      low,
      ahead: mine && low && low !== mine,
      L,
      ok: L ? L.filter((t) => t.st === "ok").length : 0,
      old: L ? L.filter((t) => t.st === "old").length : 0,
      unread: h ? h.state().unread : 0,
    };
  }
  const FORM = { phone: "📱", tablet: "📲", pc: "💻", laptop: "💻" };
  function homeHtml() {
    const s = stats(),
      h = H(),
      FB = h ? h.state().FB : { items: [] };
    const k = (l, v) => `<div class="pcdpk"><small>${l}</small><b>${v}</b></div>`;
    const band = `<div class="pcdpband">${k(T("dp_newest"), s.mine ? escHtml(verName(s.mine)) : "…")}${k(T("dp_testers"), s.low ? escHtml(verName(s.low)) : "…")}${k(T("dp_cur"), s.L ? T("dp_of", { a: s.ok, b: s.L.length }) : "…")}${k(T("dp_msgs"), String(s.unread))}<button class="btn pcdpgo" data-pcdpsec="rel">${T("dp_give")}</button></div>`;
    const order = { old: 0, ok: 1, in: 2 },
      tl = s.L
        ? s.L.length
          ? [...s.L]
              .sort((a, b) => order[a.st] - order[b.st] || (b.seen || 0) - (a.seen || 0))
              .slice(0, 6)
              .map(
                (t) =>
                  `<div class="pcdprow"><span class="pcdpav">${FORM[t.form] || "❔"}</span><tt>${escHtml(t.code)}</tt><span class="pcdpchip ${t.st === "ok" ? "" : t.st === "old" ? "w" : "n"}">${t.ver ? escHtml("v" + String(t.ver).replace(/^v/, "")) : "–"}</span></div>`
              )
              .join("")
          : `<p class="pcdpempty">${T("dp_none_t")}</p>`
        : `<p class="pcdpempty">${T("dp_load")}</p>`;
    const msgs = (FB.items || [])
      .slice()
      .sort((a, b) => (b.ts || 0) - (a.ts || 0))
      .slice(0, 3);
    const ml = msgs.length
      ? msgs
          .map((x) => {
            const [kl, kc] = h.kind(x.kind);
            return `<button class="pcdpmsg ${x.read ? "" : "new"}" data-pcdpmsg="${escHtml(x.id)}" style="--kc:${kc}"><small>${escHtml(kl)} · ${escHtml(h.ago(x.ts))}</small><b>${escHtml(h.fbParse(x).title)}</b></button>`;
          })
          .join("")
      : `<p class="pcdpempty">${FB.err ? escHtml(FB.err) : T("dp_none_m")}</p>`;
    const sw = (key, on, t) =>
      `<label class="pcdptool"><span>${t}</span><input type="checkbox" class="pcsw" data-devsw="${key}" ${on ? "checked" : ""}></label>`;
    const card = (sec, title, body, more) =>
      `<section class="pcdpcard"><h3><span class="pcdpic">${IC[sec]}</span>${title}${more ? `<button class="link small" data-pcdpsec="${sec}">${T("dp_all")} ›</button>` : ""}</h3>${body}</section>`;
    return `${band}<div class="pcdpgrid">${card("stat", T("dp_stat"), tl + `<button class="pcdprow add" data-invopen="1"><span class="pcdpav">+</span>${T("dp_invite")}</button>`, true)}<div class="pcdpcol">${card("fb", T("dp_fb"), ml, true)}${card(
      "dbg",
      T("dp_dbg"),
      `<div class="pcdptools">${sw("touch", DBG.touch, T("dev_touch"))}${sw("fps", DBG.fps, T("dev_fps"))}<button class="pcdptool" data-devact="tours">${T("dev_tours")}</button><button class="pcdptool" data-devact="test">${T("dev_test")}</button></div>`,
      true
    )}</div></div>`;
  }
  function navHtml() {
    const s = stats();
    const badge = (k) =>
      k === "fb" && s.unread
        ? `<i class="badge">${s.unread}</i>`
        : k === "stat" && s.old
          ? `<i class="pcdpchip w">${T("dp_old", { n: s.old })}</i>`
          : k === "rel" && s.ahead
            ? `<i class="pcdpdot"></i>`
            : "";
    return NAV.map(
      (k) =>
        `<button class="pcdpnav ${S.sec === k ? "on" : ""}" data-pcdpsec="${k}" aria-current="${S.sec === k ? "page" : "false"}"><span class="pcdpic">${IC[k]}</span><span>${T("dp_" + k)}</span>${badge(k)}</button>`
    ).join("");
  }
  function leaveSec() {
    if (S.sec === "fb" && H()) H().fbUnmount();
  }
  function paintMain() {
    const m = $("pcDevMain");
    if (!m) return;
    const sec = S.sec;
    if (sec === "home") {
      m.innerHTML = homeHtml();
      return;
    }
    if (sec === "fb") {
      m.innerHTML = `<section class="pcdpcard pcdpfull"><h3><span class="pcdpic">${IC.fb}</span>${T("dp_fb")}</h3><div id="pcDevFb"></div></section>`;
      if (H()) H().fbMount($("pcDevFb"));
      return;
    }
    if (sec === "dbg") {
      m.innerHTML = `<section class="pcdpcard pcdpfull"><h3><span class="pcdpic">${IC.dbg}</span>${T("dp_dbg")}</h3>${devHtml()}</section>`;
      devLogRender();
      return;
    }
    /* Freigabe, Tester, Codes, KI und Testdaten kommen aus dem bisherigen Entwickler-Panel */
    ui.devTab = sec;
    m.innerHTML = `<section class="pcdpcard pcdpfull"><h3><span class="pcdpic">${IC[sec]}</span>${T("dp_" + sec)}${sec === "stat" ? `<button class="btn pcdpinv" data-invopen="1">${T("dp_invite")}</button>` : ""}</h3><div id="pcDevRel" class="pcdprel"></div></section>`;
    window.pcRelPaint();
    if (sec === "rel") relLoad(true);
    if ((sec === "stat" || sec === "codes") && H()) H().dsLoad(true);
  }
  function paint() {
    const n = $("pcDevNav");
    if (n) n.innerHTML = navHtml();
    paintMain();
  }
  function go(sec) {
    if (sec === S.sec && $("pcDevPage")) return;
    leaveSec();
    S.sec = sec;
    paint();
    const m = $("pcDevMain");
    if (m) m.scrollTop = 0;
  }
  function open(sec) {
    let p = $("pcDevPage");
    if (!p) {
      p = document.createElement("div");
      p.id = "pcDevPage";
      p.className = "pcdevpage";
      p.setAttribute("role", "region");
      p.setAttribute("aria-label", uiText("dv_t"));
      p.setAttribute("data-noi18n", "");
      p.innerHTML = `<nav class="pcdpside"><div class="pcdph"><b>${T("dv_t")}</b><button class="pcdpx" data-pcdpclose="1" aria-label="${T("dp_close")}" title="${T("dp_close")}">${svgIcon("x", 18)}</button></div><small class="pcdpnote">${T("dv_note")}</small><div id="pcDevNav"></div></nav><div class="pcdpmain" id="pcDevMain"></div>`;
      document.body.appendChild(p);
      const t = document.querySelector(".top");
      if (t) p.style.top = Math.round(t.getBoundingClientRect().bottom + 14) + "px";
      document.documentElement.classList.add("pcdevon");
      requestAnimationFrame(() => p.classList.add("show"));
    }
    S.sec = sec || S.sec || "home";
    const b = $("pcDev");
    if (b) b.setAttribute("aria-expanded", "true");
    paint();
    relLoad();
    if (H()) {
      H().dsLoad();
      H().fbLoad();
    }
    SND.play("pop");
  }
  function close() {
    const p = $("pcDevPage");
    if (!p) return;
    leaveSec();
    p.remove();
    document.documentElement.classList.remove("pcdevon");
    const b = $("pcDev");
    if (b) b.setAttribute("aria-expanded", "false");
  }
  const toggle = () => ($("pcDevPage") ? close() : open("home"));
  /* frische Zahlen in Übersicht und Navigation nachziehen, ohne offene Eingaben zu stören */
  function refresh() {
    if (!$("pcDevPage")) return;
    const n = $("pcDevNav");
    if (n) n.innerHTML = navHtml();
    if (S.sec === "home") paintMain();
  }
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-pcdpclose]")) {
      close();
      return;
    }
    const s = e.target.closest("[data-pcdpsec]");
    if (s) {
      go(s.dataset.pcdpsec);
      return;
    }
    const m = e.target.closest("[data-pcdpmsg]");
    if (m) {
      go("fb");
      if (H()) H().fbShow(m.dataset.pcdpmsg);
      return;
    }
    /* wer oben eine andere Seite wählt, verlässt den Entwicklerbereich */
    if ($("pcDevPage") && e.target.closest("[data-go],.tabs .tab,#pcNav button") && !e.target.closest("#pcDevPage"))
      close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !$("pcDevPage")) return;
    if (document.querySelector(".hobg.show,.backdrop:not([hidden]),#invBg")) return;
    close();
  });
  setInterval(refresh, 5000);
  return { open, close, toggle, refresh };
})();
