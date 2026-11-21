/* PC-Ansicht */
function pcOn() {
  if (pcOn.done || !IS_PC) return;
  pcOn.done = true;
  const st = document.getElementById("pcCss");
  if (st) st.media = "all";
  document.documentElement.classList.add("pc");
  if (IS_TAB) {
    const h = document.documentElement;
    h.classList.add("istab");
    const o = () => h.classList.toggle("tabp", innerHeight > innerWidth);
    o();
    addEventListener("resize", o);
  }
  const tabs = document.querySelector(".tabs"),
    first = tabs && tabs.querySelector('.tab[data-go="home"]'),
    last = tabs && (tabs.querySelector(".tab.tset") || tabs.querySelector('.tab[data-go="shop"]'));
  if (first && !tabs.querySelector(".pcarr")) {
    first.insertAdjacentHTML(
      "beforebegin",
      `<button class="pcarr" data-pcstep="-1" aria-label="Vorherige Seite (Pfeil links)"><svg class="i" viewBox="0 0 24 24"><path d="m15 6-6 6 6 6"/></svg></button>`
    );
    (last || first).insertAdjacentHTML(
      "afterend",
      `<button class="pcarr" data-pcstep="1" aria-label="Nächste Seite (Pfeil rechts)"><svg class="i" viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg></button>`
    );
  }
}
const PC_ORDER = ["home", "beruf", "zukunft", "shop"];
const PC_ANIM = {
  busy: false,
  pass: false,
};
function pcTiles(sec, leaving) {
  if (!sec) return [];
  const out = [];
  if (
    !leaving &&
    ((sec.id === "v-fix" && sec.classList.contains("pcfcal")) || sec.id === "v-list" || sec.id === "v-shop")
  )
    return out;
  for (const c of sec.children) {
    if (c.matches(".hcols,.cols"))
      c.querySelectorAll(":scope > .hcol > *, :scope > .col > *").forEach((x) => out.push(x));
    else if (leaving && c.matches("#setHome"))
      c.querySelectorAll(".pcsl, .pcsr .pcsph, .pcsr .sabody, .pcsr .pctk, .pcsr .invpc > section").forEach((x) =>
        out.push(x)
      );
    else if (leaving && c.matches(".pcset,.pcana,.pcshop,.pcsnone,.zstack"))
      [...c.querySelectorAll(":scope > *")].forEach((x) => {
        if (x.matches(".pcsr,.pcana > .pcac")) [...x.children].forEach((y) => out.push(y));
        else out.push(x);
      });
    else out.push(c);
  }
  return out
    .filter((e) => {
      if (e.hidden || e.closest("[hidden]")) return false;
      const r = e.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight;
    })
    .slice(0, 40);
}
function pcCalm() {
  return matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function pcGo(k, nav) {
  if (PC_ANIM.busy) {
    PC_ANIM.next = () => pcGo(k, nav);
    return true;
  }
  const sec = document.querySelector(`[data-view="${ui.view}"]`),
    olds = pcCalm() ? [] : [...pcTiles(sec, true), ...(window.pcDockEls && ui.view === "home" ? pcDockEls() : [])];
  PC_ANIM.busy = true;
  if (k === "home") pcHome.intro = true;
  document.documentElement.classList.add("pcanim");
  const outs = olds.map((e, i, a) =>
    e.animate(
      [
        {
          opacity: 1,
          transform: "none",
        },
        {
          opacity: 0,
          transform: `translateY(${Math.round(innerHeight * 0.6 + i * 24)}px) rotate(${i % 2 ? 9 : -9}deg)`,
        },
      ],
      {
        duration: 300,
        delay: (a.length - 1 - i) * 22,
        easing: "cubic-bezier(.55,0,1,.45)",
        fill: "forwards",
      }
    )
  );
  const done = () => {
    PC_ANIM.pass = true;
    try {
      nav();
    } finally {
      PC_ANIM.pass = false;
    }
    const news0 = pcCalm()
      ? []
      : [...pcTiles(document.querySelector(`[data-view="${ui.view}"]`)), ...(window.pcDockEls ? pcDockEls() : [])];
    news0.forEach((e) => {
      e.style.opacity = "0";
    });
    outs.forEach((a) => {
      try {
        a.cancel();
      } catch (_) {}
    });
    {
      const dk = $("pcDock");
      if (dk && !dk.hidden && !pcCalm())
        dk.animate(
          [
            {
              opacity: 0,
              transform: "translateY(16px)",
            },
            {
              opacity: 1,
              transform: "none",
            },
          ],
          {
            duration: 420,
            easing: "cubic-bezier(.2,.8,.2,1)",
            fill: "backwards",
          }
        );
    }
    {
      const news = pcCalm()
        ? []
        : [...pcTiles(document.querySelector(`[data-view="${ui.view}"]`)), ...(window.pcDockEls ? pcDockEls() : [])];
      news0.forEach((e) => {
        e.style.opacity = "";
      });
      news.forEach((e, i) =>
        e.animate(
          [
            {
              opacity: 0,
              transform: `translateY(${-Math.round(innerHeight * 0.8)}px) rotate(${i % 2 ? -6 : 6}deg)`,
            },
            {
              opacity: 1,
              transform: "translateY(14px) rotate(0)",
              offset: 0.6,
            },
            {
              transform: "translateY(-6px)",
              offset: 0.8,
            },
            {
              opacity: 1,
              transform: "none",
            },
          ],
          {
            duration: 560,
            delay: i * Math.min(45, 630 / Math.max(1, news.length)),
            easing: "cubic-bezier(.3,.7,.3,1)",
            fill: "backwards",
          }
        )
      );
      setTimeout(() => {
        PC_ANIM.busy = false;
        const n = PC_ANIM.next;
        PC_ANIM.next = null;
        if (n) n();
      }, 160);
      clearTimeout(pcGo.t);
      pcGo.t = setTimeout(
        () => {
          if (!PC_ANIM.busy) document.documentElement.classList.remove("pcanim");
        },
        160 + Math.min(14, news.length) * 45 + 700
      );
    }
  };
  if (outs.length) Promise.all(outs.map((a) => a.finished)).then(done, done);
  else done();
  return true;
}
function pcStep(d) {
  if (PC_ANIM.busy) {
    PC_ANIM.pend = (PC_ANIM.pend || 0) + d;
    PC_ANIM.next = () => {
      const n = PC_ANIM.pend;
      PC_ANIM.pend = 0;
      if (n) pcStep(n);
    };
    return true;
  }
  const i = PC_ORDER.indexOf(ui.view);
  if (i < 0 || (ui.view === "more" && ui.sp) || document.querySelector(".backdrop:not([hidden])")) return false;
  const b = document.querySelector(
    `.tabs [data-go="${PC_ORDER[(((i + d) % PC_ORDER.length) + PC_ORDER.length) % PC_ORDER.length]}"]`
  );
  if (!b) return false;
  return pcGo(b.dataset.go, () => b.click());
}
window.pcStep = pcStep;
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-pcstep]");
  if (b) pcStep(Number(b.dataset.pcstep));
});
document.addEventListener(
  "click",
  (e) => {
    if (!IS_PC || PC_ANIM.pass) return;
    const b = e.target.closest("[data-go]");
    if (
      !b ||
      !PC_ORDER.includes(b.dataset.go) ||
      b.dataset.go === ui.view ||
      b.dataset.scroll ||
      document.querySelector(".backdrop:not([hidden])")
    )
      return;
    e.preventDefault();
    e.stopImmediatePropagation();
    pcGo(b.dataset.go, () => b.click());
  },
  true
);
{
  let x0 = null,
    y0 = 0,
    t0 = 0;
  document.addEventListener(
    "touchstart",
    (e) => {
      if (
        !IS_PC ||
        e.touches.length !== 1 ||
        e.target.closest("input,textarea,select,.sheet,.backdrop,.astack,.srail,.table-wrap,.fxchips")
      ) {
        x0 = null;
        return;
      }
      x0 = e.touches[0].clientX;
      y0 = e.touches[0].clientY;
      t0 = Date.now();
    },
    {
      passive: true,
    }
  );
  document.addEventListener(
    "touchend",
    (e) => {
      if (x0 === null) return;
      const t = e.changedTouches[0],
        dx = t.clientX - x0,
        dy = t.clientY - y0;
      x0 = null;
      if (Math.abs(dx) > 90 && Math.abs(dx) > Math.abs(dy) * 1.8 && Date.now() - t0 < 900) pcStep(dx < 0 ? 1 : -1);
    },
    {
      passive: true,
    }
  );
}
document.addEventListener("keydown", (e) => {
  if (
    !IS_PC ||
    e.defaultPrevented ||
    e.altKey ||
    e.ctrlKey ||
    e.metaKey ||
    e.shiftKey ||
    (e.key !== "ArrowLeft" && e.key !== "ArrowRight")
  )
    return;
  const t = e.target;
  if (
    t &&
    t.closest &&
    t.closest('input,textarea,select,[contenteditable="true"],.astack,.srail,[role="slider"],.sheet,.backdrop')
  )
    return;
  if (pcStep(e.key === "ArrowRight" ? 1 : -1)) e.preventDefault();
});
function pcHeroIntro(h) {
  if (!h || pcCalm()) return;
  const ease = (t) => 1 - Math.pow(1 - t, 3),
    ring = h.querySelector(".pcring"),
    P = Number((ring && ring.style.getPropertyValue("--p")) || 0);
  const nums = [...h.querySelectorAll("[data-cv]")].map((e) => ({
    e,
    v: Number(e.dataset.cv) || 0,
    f: e.dataset.cf === "eur" ? fmtEur : fmtEur0,
    fin: e.textContent,
  }));
  const t0 = pcHeroIntro.t0,
    D = 1100;
  const k0 = ease(Math.max(0, Math.min(1, (performance.now() - t0) / D)));
  nums.forEach((n) => {
    n.e.textContent = n.f(n.v * k0);
  });
  if (ring) ring.style.setProperty("--p", (P * k0).toFixed(1));
  const step = (now) => {
    if (!h.isConnected) return;
    const t = Math.max(0, Math.min(1, (now - t0) / D)),
      k = ease(t);
    nums.forEach((n) => {
      n.e.textContent = t >= 1 ? n.fin : n.f(n.v * k);
    });
    if (ring) ring.style.setProperty("--p", (P * k).toFixed(1));
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
function pcHome(o) {
  pcOn();
  const { ym, cur, c, accts, mainBal, mainName } = o,
    [y, m] = ymParts(ym),
    dim = daysIn(ym);
  const tot = (
      accts.find((a) => a.total) || {
        bal: mainBal,
      }
    ).bal,
    isCur = ym === cur;
  const FP = isCur && typeof freePerDay === "function" ? freePerDay(ym, mainBal) : null,
    left = isCur ? (FP ? FP.left : Math.max(1, dim - new Date().getDate() + 1)) : 0,
    perDay = isCur ? (FP ? FP.v : Math.max(0, mainBal / left)) : 0;
  const pct = isCur ? left / dim : ym > cur ? 1 : 0;
  const first = String(store.settings.name || "")
      .trim()
      .split(/\s+/)[0],
    greet = first ? (I18N.tr ? I18N.tr("Hallo") : "Hallo") : devModel();
  const many = accts.filter((a) => !a.total).length > 1;
  const hi = Math.max(
      0,
      accts.findIndex((a) => a.total)
    ),
    heroCol = accts.length ? userCol("acct", accts[hi].name) : "";
  const html = `<aside class="pchero" id="pcHero"${heroCol ? ` style="--herocol:${heroCol};--herocol2:color-mix(in srgb, ${heroCol} 78%, #000);--heroring:color-mix(in srgb, ${heroCol} 45%, #fff);background:linear-gradient(160deg, ${heroCol} 0%, color-mix(in srgb, ${heroCol} 62%, #000) 70%);box-shadow:0 18px 40px color-mix(in srgb, ${heroCol} 20%, transparent)"` : ""}>
    <small class="pchi"><span>${escHtml(greet)}</span>${first ? ", " + escHtml(first) : ""} · <span>${escHtml(MONTHS[m - 1])} ${y}</span></small>
    ${(() => {
      /* Groß oben: das Hauptkonto – „auf allen Konten“ steht klein bei den Konten */ const mA = many
          ? accts.find((a) => a.main && !a.total)
          : null,
        big = mA ? Number(mA.bal) || 0 : tot,
        mi = mA ? accts.indexOf(mA) : -1,
        me = mA && pcMvOk() && (ui.acctEd || [])[mi];
      return `<div class="pcbal${me ? " mvd" : ""}" data-cv="${big}" data-cf="eur"${me ? ` data-mvi="${mi}" title="${escHtml(uiText("mv_pc"))}"` : ""}>${escHtml(fmtEur(big))}</div>
    <span class="pcsub">${mA ? escHtml(mainName || "Hauptkonto") : many ? "auf allen Konten" : "auf deinem Konto"}</span>`;
    })()}
    <div class="pcaccs">${accts
      .filter((a) => !a.total)
      .map((a) => {
        if (many && a.main)
          return `<button class="tot" data-spgo="konten"><span>Auf allen Konten</span><b data-cv="${tot}" data-cf="eur">${escHtml(fmtEur(tot))}</b></button>`;
        const ac = userCol("acct", a.name),
          ai = accts.indexOf(a),
          me = pcMvOk() && (ui.acctEd || [])[ai];
        return `<button class="${a.main ? "main" : ""}${me ? " mvd" : ""}" data-spgo="konten"${me ? ` data-mvi="${ai}" title="${escHtml(uiText("mv_pc"))}"` : ""}${ac ? ` style="background:color-mix(in srgb, ${ac} 55%, transparent)"` : ""}><span>${escHtml(a.main ? mainName || "Hauptkonto" : a.name)}</span><b data-cv="${Number(a.bal) || 0}" data-cf="eur">${escHtml(fmtEur(Number(a.bal) || 0))}</b></button>`;
      })
      .join(
        ""
      )}<button class="add" data-spgo="konten"><span>+ Space</span><b>anlegen</b></button></div>${IS_TAB && isCur && (ui.acctEd || []).filter(Boolean).length > 1 ? `<button class="mvopen pcmvo" data-mvopen aria-label="${escHtml(uiText("mv_open"))}">${svgIcon("down", 18)}<span>${escHtml(uiText("mv_open"))}</span></button>` : ""}
    <button class="pcring" data-go="year" style="--p:${Math.round(pct * 100)}" aria-label="Analyse öffnen"><span>${isCur ? `<small>noch pro Tag</small><b data-cv="${perDay}">${escHtml(fmtEur0(perDay))}</b><small>${left} ${left === 1 ? "Tag" : "Tage"} übrig</small>` : `<small>${c.net >= 0 ? "übrig" : "mehr ausgegeben"}</small><b data-cv="${Math.abs(c.net)}">${escHtml(fmtEur0(Math.abs(c.net)))}</b><small>im ${escHtml(MONTHS[m - 1])}</small>`}</span></button>
    <div class="pcminis">
      <button data-go="list"><span>Einnahmen</span><b data-cv="${c.income}">${escHtml(fmtEur0(c.income))}</b></button>
      <button data-go="list"><span>Ausgaben</span><b data-cv="${c.expenses}">${escHtml(fmtEur0(c.expenses))}</b></button>
      <button data-go="fix"><span>Fixkosten offen</span><b data-cv="${c.fixOpen}">${escHtml(fmtEur0(c.fixOpen))}</b></button>
    </div>
  </aside>`;
  const v = $("v-home");
  if (!v) return;
  const old = v.querySelector("#pcHero");
  if (old) old.remove();
  v.insertAdjacentHTML("afterbegin", html);
  if (pcHome.intro) {
    pcHome.intro = false;
    pcHeroIntro.t0 = performance.now() + 260;
  }
  if (performance.now() < (pcHeroIntro.t0 || 0) + 1100) pcHeroIntro(v.querySelector("#pcHero"));
  const hc = v.querySelector(".hcols");
  if (hc && hc.children.length === 2) {
    const [a, b] = [...hc.children],
      A = [...a.children],
      B = [...b.children];
    a.replaceChildren(...A.flatMap((x, i) => (B[i] ? [x, B[i]] : [x])), ...B.slice(A.length));
    b.remove();
  }
}
if (IS_PC) {
  pcOn();
  pcHome.intro = true;
  try {
    if (ui.view === "home") renderHome();
  } catch (e) {}
}
/* Fußzeile */
if (IS_DESK) {
  const _keys = accTabKeys;
  accTabKeys = (t) => _keys(t).filter((k) => k !== "recht");
  const LEG = [
    ["impressum", "Impressum"],
    ["datenschutz", "Datenschutz"],
    ["agb", "Nutzungsbedingungen"],
    ["lizenzen", "Lizenzen"],
  ].filter(([k]) => LEGAL[k]);
  document.body.insertAdjacentHTML(
    "beforeend",
    `<footer class="pcfoot" id="pcFoot"><span class="pcfn"><b>Finanz MAMI</b> · PC <span id="pcVer"></span></span>
    <button class="pcfs" id="pcSync" data-spgo="sync"><i></i><span id="pcSyncT"></span></button>
    <span class="pcfr">
    ${LEG.map(([k, t]) => `<button data-pclegal="${k}">${t}</button>`).join("")}</span></footer>
    <div class="backdrop" id="pcLegalBg" hidden><div class="sheet pclegal" role="dialog" aria-modal="true"><div class="sheet-head"><h2 id="pcLegalT"></h2><button class="icon-btn" data-pclegalclose="1" aria-label="Schließen"><svg class="i" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div><div class="legal" id="pcLegalB"></div></div></div>`
  );
  const foot = () => {
    const v = $("pcVer");
    if (v) v.textContent = verFull();
    const s = $("pcSync"),
      t = $("pcSyncT");
    if (!s || !t) return;
    const st = !SYNC.token
      ? "off"
      : SYNC.state === "ok"
        ? "ok"
        : SYNC.state === "pending"
          ? "busy"
          : SYNC.state === "offline"
            ? "offline"
            : "err";
    s.dataset.st = st;
    const tm = SYNC.last
      ? new Date(SYNC.last).toLocaleTimeString("de-DE", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";
    const txt =
      st === "off"
        ? "Abgleich aus"
        : st === "ok"
          ? `Abgeglichen ${tm}`
          : st === "busy"
            ? "Wird abgeglichen …"
            : st === "offline"
              ? "Offline – wird nachgeholt"
              : "Server nicht erreichbar";
    if (t.textContent !== txt) t.textContent = txt;
  };
  foot();
  setInterval(foot, 3000);
  const pcLegalClose = () => {
    const bg = $("pcLegalBg");
    bg.classList.remove("show");
    setTimeout(() => {
      bg.hidden = true;
    }, 200);
  };
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-pclegal]");
    if (b) {
      const k = b.dataset.pclegal;
      $("pcLegalT").textContent = (LEG.find((x) => x[0] === k) || [, ""])[1];
      $("pcLegalB").innerHTML = LEGAL[k][1]();
      const bg = $("pcLegalBg");
      bg.hidden = false;
      requestAnimationFrame(() => bg.classList.add("show"));
      return;
    }
    if (e.target.closest("[data-pclegalclose]") || e.target === $("pcLegalBg")) pcLegalClose();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !$("pcLegalBg").hidden) pcLegalClose();
  });
}
if (IS_PC) {
  const PC_I18N = {
    "Neu in dieser Version": [
      "New in this version",
      "Bu sürümde yeni",
      "Новое в этой версии",
      "Нове в цій версії",
      "Nowości w tej wersji",
      "الجديد في هذا الإصدار",
      "Nou în această versiune",
    ],
    "Abgeglichen {n}:{n}": [
      "Synced {n}:{n}",
      "Eşitlendi {n}:{n}",
      "Синхронизировано {n}:{n}",
      "Синхронізовано {n}:{n}",
      "Zsynchronizowano {n}:{n}",
      "تمت المزامنة {n}:{n}",
      "Sincronizat {n}:{n}",
    ],
    "Wird abgeglichen …": [
      "Syncing …",
      "Eşitleniyor …",
      "Синхронизация …",
      "Синхронізація …",
      "Synchronizacja …",
      "جارٍ المزامنة …",
      "Se sincronizează …",
    ],
    "Scan prüfen": [
      "Check scan",
      "Taramayı kontrol et",
      "Проверить скан",
      "Перевірити скан",
      "Sprawdź skan",
      "تحقق من المسح",
      "Verifică scanarea",
    ],
    "Neu scannen": [
      "Scan again",
      "Yeniden tara",
      "Сканировать снова",
      "Сканувати знову",
      "Skanuj ponownie",
      "امسح مرة أخرى",
      "Scanează din nou",
    ],
    Scanner: ["Scanner", "Tarayıcı", "Сканер", "Сканер", "Skaner", "الماسح", "Scaner"],
    "Seite leer": [
      "Page empty",
      "Sayfa boş",
      "Страница пустая",
      "Сторінка порожня",
      "Strona pusta",
      "الصفحة فارغة",
      "Pagină goală",
    ],
    "nichts erkannt": [
      "nothing found",
      "hiçbir şey yok",
      "ничего не найдено",
      "нічого не знайдено",
      "nic nie znaleziono",
      "لم يُعثر على شيء",
      "nimic găsit",
    ],
    Gescannt: ["Scanned", "Tarandı", "Отсканировано", "Відскановано", "Zeskanowano", "تم المسح", "Scanat"],
    "{n} dpi": ["{n} dpi", "{n} dpi", "{n} dpi", "{n} dpi", "{n} dpi", "{n} dpi", "{n} dpi"],
    Beleg: ["Receipt", "Fiş", "Чек", "Чек", "Paragon", "الإيصال", "Bon"],
    Gefunden: ["Found", "Bulundu", "Найден", "Знайдено", "Znaleziono", "تم العثور عليه", "Găsit"],
    "Nicht gefunden": [
      "Not found",
      "Bulunamadı",
      "Не найден",
      "Не знайдено",
      "Nie znaleziono",
      "لم يُعثر عليه",
      "Negăsit",
    ],
    "Ecken an den Beleg ziehen": [
      "Drag the corners to the receipt",
      "Köşeleri fişe sürükle",
      "Перетащи углы к чеку",
      "Перетягни кути до чека",
      "Przeciągnij rogi do paragonu",
      "اسحب الزوايا إلى الإيصال",
      "Trage colțurile la bon",
    ],
    "Die Seite ist leer – leg den Beleg mit der Schrift nach unten auf die Glasscheibe und klicke auf „Neu scannen“.": [
      "The page is empty – put the receipt face down on the glass and click “Scan again”.",
      "Sayfa boş – fişi yazılı yüzü aşağı gelecek şekilde cama koy ve “Yeniden tara”ya tıkla.",
      "Страница пустая – положи чек текстом вниз на стекло и нажми «Сканировать снова».",
      "Сторінка порожня – поклади чек текстом донизу на скло й натисни «Сканувати знову».",
      "Strona jest pusta – połóż paragon tekstem do dołu na szybie i kliknij „Skanuj ponownie”.",
      "الصفحة فارغة – ضع الإيصال ووجهه للأسفل على الزجاج واضغط «امسح مرة أخرى».",
      "Pagina e goală – pune bonul cu fața în jos pe sticlă și apasă „Scanează din nou”.",
    ],
    "Zieh die gelben Ecken an den Rand des Belegs, dann wird nur der Beleg übernommen.": [
      "Drag the yellow corners to the edge of the receipt, then only the receipt is used.",
      "Sarı köşeleri fişin kenarına sürükle, böylece yalnızca fiş alınır.",
      "Перетащи жёлтые углы к краю чека – тогда возьмётся только чек.",
      "Перетягни жовті кути до краю чека – тоді візьметься лише чек.",
      "Przeciągnij żółte rogi do krawędzi paragonu – wtedy zostanie użyty tylko paragon.",
      "اسحب الزوايا الصفراء إلى حافة الإيصال، فيُؤخذ الإيصال فقط.",
      "Trage colțurile galbene la marginea bonului, apoi se preia doar bonul.",
    ],
    "Wirklich endgültig löschen?": [
      "Really delete for good?",
      "Gerçekten kalıcı olarak silinsin mi?",
      "Удалить навсегда?",
      "Видалити назавжди?",
      "Na pewno usunąć na zawsze?",
      "هل تريد الحذف نهائيًا؟",
      "Ștergi definitiv?",
    ],
    Aktualisieren: ["Refresh", "Yenile", "Обновить", "Оновити", "Odśwież", "تحديث", "Reîmprospătează"],
    Aktualisiert: ["Updated", "Güncellendi", "Обновлено", "Оновлено", "Zaktualizowano", "تم التحديث", "Actualizat"],
    "Feedback gelöscht": [
      "Feedback deleted",
      "Geri bildirim silindi",
      "Отзыв удалён",
      "Відгук видалено",
      "Opinia usunięta",
      "تم حذف الملاحظات",
      "Feedback șters",
    ],
    "Buchung anklicken": [
      "Click a booking",
      "Bir kayda tıkla",
      "Нажми на запись",
      "Натисни на запис",
      "Kliknij wpis",
      "انقر على قيد",
      "Apasă pe o înregistrare",
    ],
    "dann erscheint sie hier groß – mit Beleg": [
      "it then shows up here, with its receipt",
      "burada fişiyle büyük görünür",
      "она появится здесь с чеком",
      "він з'явиться тут із чеком",
      "pojawi się tutaj z paragonem",
      "سيظهر هنا مع الإيصال",
      "apare aici, cu bonul",
    ],
    "Kein Beleg": ["No receipt", "Fiş yok", "Нет чека", "Немає чека", "Brak paragonu", "لا إيصال", "Fără bon"],
    "Beleg hinzufügen": [
      "Add receipt",
      "Fiş ekle",
      "Добавить чек",
      "Додати чек",
      "Dodaj paragon",
      "إضافة إيصال",
      "Adaugă bon",
    ],
    Duplizieren: ["Duplicate", "Kopyala", "Дублировать", "Дублювати", "Duplikuj", "تكرار", "Duplică"],
    "nächste Buchung": [
      "next booking",
      "sonraki kayıt",
      "следующая запись",
      "наступний запис",
      "następny wpis",
      "القيد التالي",
      "următoarea",
    ],
    "diesen Monat": [
      "this month",
      "bu ay",
      "в этом месяце",
      "цього місяця",
      "w tym miesiącu",
      "هذا الشهر",
      "luna aceasta",
    ],
    "{n} Buchungen": [
      "{n} bookings",
      "{n} kayıt",
      "{n} записей",
      "{n} записів",
      "{n} wpisów",
      "{n} قيود",
      "{n} înregistrări",
    ],
    Bezahlt: ["Paid", "Ödeme", "Оплата", "Оплата", "Płatność", "الدفع", "Plată"],
    "Karte / Konto": [
      "Card / account",
      "Kart / hesap",
      "Карта / счёт",
      "Картка / рахунок",
      "Karta / konto",
      "بطاقة / حساب",
      "Card / cont",
    ],
    Wiederkehrend: ["Recurring", "Tekrarlayan", "Повторяется", "Повторюється", "Cykliczne", "متكرر", "Recurent"],
    Art: ["Type", "Tür", "Тип", "Тип", "Rodzaj", "النوع", "Tip"],
    Netto: ["Net", "Net", "Нетто", "Нетто", "Netto", "الصافي", "Net"],
    Text: ["Text", "Metin", "Текст", "Текст", "Tekst", "النص", "Text"],
    überfällig: ["overdue", "gecikmiş", "просрочено", "прострочено", "po terminie", "متأخر", "restant"],
    "Ohne festen Tag": [
      "No fixed day",
      "Sabit gün yok",
      "Без определённого дня",
      "Без визначеного дня",
      "Bez stałego dnia",
      "بدون يوم محدد",
      "Fără zi fixă",
    ],
    "auf einen Tag im Kalender ziehen": [
      "drag onto a day in the calendar",
      "takvimde bir güne sürükle",
      "перетащите на день в календаре",
      "перетягніть на день у календарі",
      "przeciągnij na dzień w kalendarzu",
      "اسحبه إلى يوم في التقويم",
      "trage pe o zi din calendar",
    ],
    "hierher ziehen, um den Tag zu entfernen": [
      "drag here to remove the day",
      "günü kaldırmak için buraya sürükle",
      "перетащите сюда, чтобы убрать день",
      "перетягніть сюди, щоб прибрати день",
      "przeciągnij tutaj, aby usunąć dzień",
      "اسحبه إلى هنا لإزالة اليوم",
      "trage aici pentru a elimina ziua",
    ],
    "In den nächsten 7 Tagen": [
      "In the next 7 days",
      "Önümüzdeki 7 gün",
      "В ближайшие 7 дней",
      "У найближчі 7 днів",
      "W ciągu 7 dni",
      "خلال الأيام السبعة القادمة",
      "În următoarele 7 zile",
    ],
    "Noch offen": [
      "Still open",
      "Hâlâ açık",
      "Ещё открыто",
      "Ще відкрито",
      "Jeszcze otwarte",
      "لا يزال مفتوحًا",
      "Încă deschis",
    ],
    Gruppen: ["Groups", "Gruplar", "Группы", "Групи", "Grupy", "المجموعات", "Grupuri"],
    Posten: ["items", "kalem", "поз.", "поз.", "pozycji", "بنود", "poziții"],
    "bezahlt · {n} von {n}": [
      "paid · {n} of {n}",
      "ödendi · {n}/{n}",
      "оплачено · {n} из {n}",
      "оплачено · {n} з {n}",
      "zapłacone · {n} z {n}",
      "مدفوع · {n} من {n}",
      "plătit · {n} din {n}",
    ],
    "Klick = abhaken · Betrag anklicken = nur für {m} ändern · Ziehen = Tag ändern": [
      "Click = tick off · Click the amount = change for {m} only · Drag = change the day",
      "Tıkla = işaretle · Tutara tıkla = yalnızca {m} için değiştir · Sürükle = günü değiştir",
      "Клик = отметить · Клик по сумме = изменить только на {m} · Перетащить = сменить день",
      "Клік = позначити · Клік по сумі = змінити лише на {m} · Перетягнути = змінити день",
      "Klik = odhacz · Klik w kwotę = zmień tylko na {m} · Przeciągnij = zmień dzień",
      "نقرة = تأشير · النقر على المبلغ = تغيير {m} فقط · السحب = تغيير اليوم",
      "Clic = bifează · Clic pe sumă = schimbă doar pentru {m} · Trage = schimbă ziua",
    ],
    nichts: ["nothing", "hiçbir şey", "ничего", "нічого", "nic", "لا شيء", "nimic"],
    "Fixkosten am {n}. eintragen": [
      "Add a fixed cost on the {n}",
      "{n}. güne sabit gider ekle",
      "Добавить расход на {n}-е",
      "Додати витрату на {n}-те",
      "Dodaj koszt stały na {n}.",
      "أضف تكلفة ثابتة في يوم {n}",
      "Adaugă o cheltuială fixă pe {n}",
    ],
    "Neue Fixkosten": [
      "New fixed cost",
      "Yeni sabit gider",
      "Новый постоянный расход",
      "Нова постійна витрата",
      "Nowy koszt stały",
      "تكلفة ثابتة جديدة",
      "Cheltuială fixă nouă",
    ],
    "Betrag ab {m} {n}": [
      "Amount from {m} {n}",
      "{m} {n} itibarıyla tutar",
      "Сумма с {m} {n}",
      "Сума з {m} {n}",
      "Kwota od {m} {n}",
      "المبلغ من {m} {n}",
      "Sumă din {m} {n}",
    ],
    ohne: ["none", "yok", "нет", "немає", "brak", "بدون", "fără"],
    Rhythmus: ["Rhythm", "Sıklık", "Периодичность", "Періодичність", "Częstotliwość", "التكرار", "Frecvență"],
    Privat: ["Private", "Özel", "Личное", "Особисте", "Prywatne", "خاص", "Privat"],
    Monatlich: ["Monthly", "Aylık", "Ежемесячно", "Щомісяця", "Co miesiąc", "شهريًا", "Lunar"],
    Vierteljährlich: [
      "Quarterly",
      "Üç ayda bir",
      "Ежеквартально",
      "Щокварталу",
      "Co kwartał",
      "كل ثلاثة أشهر",
      "Trimestrial",
    ],
    Halbjährlich: [
      "Every six months",
      "Altı ayda bir",
      "Раз в полгода",
      "Раз на пів року",
      "Co pół roku",
      "كل ستة أشهر",
      "Semestrial",
    ],
    Jährlich: ["Yearly", "Yıllık", "Ежегодно", "Щороку", "Co rok", "سنويًا", "Anual"],
    "Bestimmte Monate": [
      "Certain months",
      "Belirli aylar",
      "Определённые месяцы",
      "Певні місяці",
      "Wybrane miesiące",
      "أشهر محددة",
      "Anumite luni",
    ],
    "Änderungen gelten ab {m} {n} – frühere Monate bleiben, wie sie waren.": [
      "Changes apply from {m} {n} – earlier months stay as they were.",
      "Değişiklikler {m} {n} itibarıyla geçerli – önceki aylar aynı kalır.",
      "Изменения действуют с {m} {n} – прошлые месяцы не меняются.",
      "Зміни діють з {m} {n} – попередні місяці не змінюються.",
      "Zmiany obowiązują od {m} {n} – wcześniejsze miesiące pozostają bez zmian.",
      "تسري التغييرات من {m} {n} – تبقى الأشهر السابقة كما هي.",
      "Modificările se aplică din {m} {n} – lunile anterioare rămân la fel.",
    ],
    "Gilt ab {m} {n} für alle folgenden Monate.": [
      "Applies from {m} {n} to all following months.",
      "{m} {n} itibarıyla sonraki tüm aylar için geçerli.",
      "Действует с {m} {n} для всех следующих месяцев.",
      "Діє з {m} {n} для всіх наступних місяців.",
      "Obowiązuje od {m} {n} we wszystkich kolejnych miesiącach.",
      "يسري من {m} {n} لكل الأشهر التالية.",
      "Se aplică din {m} {n} pentru toate lunile următoare.",
    ],
    "Wirklich löschen?": [
      "Really delete?",
      "Gerçekten silinsin mi?",
      "Точно удалить?",
      "Справді видалити?",
      "Na pewno usunąć?",
      "هل تريد الحذف فعلًا؟",
      "Sigur ștergi?",
    ],
    "Klick = abhaken · Stift = bearbeiten · Ziehen = Tag ändern · + im Tag = neu eintragen": [
      "Click = tick off · Pencil = edit · Drag = change the day · + in a day = add new",
      "Tıkla = işaretle · Kalem = düzenle · Sürükle = günü değiştir · Günde + = yeni ekle",
      "Клик = отметить · Карандаш = изменить · Перетащить = сменить день · + в дне = добавить",
      "Клік = позначити · Олівець = змінити · Перетягнути = змінити день · + у дні = додати",
      "Klik = odhacz · Ołówek = edytuj · Przeciągnij = zmień dzień · + w dniu = dodaj",
      "نقرة = تأشير · القلم = تعديل · السحب = تغيير اليوم · + في اليوم = إضافة",
      "Clic = bifează · Creion = editează · Trage = schimbă ziua · + în zi = adaugă",
    ],
    "Ø im Monat": [
      "Ø per month",
      "Aylık ort.",
      "Ø в месяц",
      "Ø на місяць",
      "Ø miesięcznie",
      "المتوسط شهريًا",
      "Ø pe lună",
    ],
    "+ Läden auswählen": [
      "+ Choose shops",
      "+ Mağaza seç",
      "+ Выбрать магазины",
      "+ Вибрати магазини",
      "+ Wybierz sklepy",
      "+ اختر المتاجر",
      "+ Alege magazine",
    ],
    Einkaufszettel: [
      "Shopping list",
      "Alışveriş listesi",
      "Список покупок",
      "Список покупок",
      "Lista zakupów",
      "قائمة التسوق",
      "Listă de cumpărături",
    ],
    "{n} offen · ca. {n} €": [
      "{n} open · approx. {n} €",
      "{n} açık · yakl. {n} €",
      "{n} открыто · ок. {n} €",
      "{n} відкрито · бл. {n} €",
      "{n} otwarte · ok. {n} €",
      "{n} مفتوحة · حوالي {n} €",
      "{n} deschise · cca. {n} €",
    ],
    "Schreib auf, was du brauchst – die App sagt dir, wo es am günstigsten ist.": [
      "Write down what you need – the app tells you where it is cheapest.",
      "Neye ihtiyacın olduğunu yaz – uygulama en ucuz nerede olduğunu söyler.",
      "Запиши, что нужно – приложение подскажет, где дешевле.",
      "Запиши, що потрібно – застосунок підкаже, де дешевше.",
      "Zapisz, czego potrzebujesz – aplikacja powie ci, gdzie jest najtaniej.",
      "اكتب ما تحتاجه – سيخبرك التطبيق أين هو الأرخص.",
      "Notează ce îți trebuie – aplicația îți spune unde e cel mai ieftin.",
    ],
    "So kaufst du am günstigsten": [
      "Cheapest way to shop",
      "En ucuz alışveriş",
      "Как купить дешевле всего",
      "Як купити найдешевше",
      "Najtaniej kupisz tak",
      "هكذا تتسوق بأرخص سعر",
      "Cel mai ieftin cumperi așa",
    ],
    "· spart ca. {n} €": [
      "· saves approx. {n} €",
      "· yakl. {n} € tasarruf",
      "· экономия ок. {n} €",
      "· економія бл. {n} €",
      "· oszczędzasz ok. {n} €",
      "· توفير حوالي {n} €",
      "· economisești cca. {n} €",
    ],
    "Laden offen": [
      "Shop not set",
      "Mağaza belirsiz",
      "Магазин не выбран",
      "Магазин не вибрано",
      "Sklep nieustalony",
      "المتجر غير محدد",
      "Magazin nestabilit",
    ],
    "Erledigte löschen ({n})": [
      "Delete done ({n})",
      "Bitenleri sil ({n})",
      "Удалить выполненные ({n})",
      "Видалити виконані ({n})",
      "Usuń zrobione ({n})",
      "حذف المنجز ({n})",
      "Șterge bifatele ({n})",
    ],
    "Auf deinem Zettel": [
      "On your list",
      "Listende",
      "В твоём списке",
      "У твоєму списку",
      "Na twojej liście",
      "في قائمتك",
      "Pe lista ta",
    ],
    "Letzte Einkäufe": [
      "Recent purchases",
      "Son alışverişler",
      "Последние покупки",
      "Останні покупки",
      "Ostatnie zakupy",
      "آخر المشتريات",
      "Cumpărături recente",
    ],
    "Hier hast du in letzter Zeit nichts gekauft.": [
      "You haven't bought anything here lately.",
      "Son zamanlarda burada bir şey almadın.",
      "Ты здесь давно ничего не покупал.",
      "Ти тут давно нічого не купував.",
      "Ostatnio nic tu nie kupowałeś.",
      "لم تشترِ شيئًا هنا مؤخرًا.",
      "N-ai cumpărat nimic aici în ultima vreme.",
    ],
    automatisch: ["automatic", "otomatik", "автоматически", "автоматично", "automatycznie", "تلقائي", "automat"],
    Merken: ["Save", "Kaydet", "Запомнить", "Запам'ятати", "Zapamiętaj", "حفظ", "Salvează"],
    "Gemerkte Angebote": [
      "Saved offers",
      "Kaydedilen fırsatlar",
      "Сохранённые акции",
      "Збережені акції",
      "Zapisane oferty",
      "العروض المحفوظة",
      "Oferte salvate",
    ],
    "Deine Preise hier": [
      "Your prices here",
      "Buradaki fiyatların",
      "Твои цены здесь",
      "Твої ціни тут",
      "Twoje ceny tutaj",
      "أسعارك هنا",
      "Prețurile tale aici",
    ],
    "· aus Quittungen": [
      "· from receipts",
      "· fişlerden",
      "· из чеков",
      "· з чеків",
      "· z paragonów",
      "· من الإيصالات",
      "· din bonuri",
    ],
    "+ Angebot merken": [
      "+ Save offer",
      "+ Fırsatı kaydet",
      "+ Запомнить акцию",
      "+ Запам'ятати акцію",
      "+ Zapisz ofertę",
      "+ احفظ العرض",
      "+ Salvează oferta",
    ],
    Prospekt: ["Leaflet", "Broşür", "Проспект", "Проспект", "Gazetka", "النشرة", "Catalog"],
    "hier am günstigsten": [
      "cheapest here",
      "en ucuz burada",
      "здесь дешевле всего",
      "тут найдешевше",
      "tu najtaniej",
      "الأرخص هنا",
      "cel mai ieftin aici",
    ],
    "zuletzt nicht eingekauft": [
      "not shopped here lately",
      "son zamanlarda alışveriş yok",
      "давно не покупал",
      "давно не купував",
      "ostatnio bez zakupów",
      "لم تتسوق هنا مؤخرًا",
      "fără cumpărături recente",
    ],
    "{n} erledigte gelöscht": [
      "{n} done deleted",
      "{n} biten silindi",
      "{n} выполненных удалено",
      "{n} виконаних видалено",
      "Usunięto {n} zrobionych",
      "تم حذف {n} من المنجز",
      "{n} bifate șterse",
    ],
    "Andere Webseiten sind hier gesperrt": [
      "Other websites are blocked here",
      "Diğer web siteleri burada engelli",
      "Другие сайты здесь заблокированы",
      "Інші сайти тут заблоковано",
      "Inne strony są tu zablokowane",
      "المواقع الأخرى محظورة هنا",
      "Alte site-uri sunt blocate aici",
    ],
    "Im Browser öffnen ↗": [
      "Open in browser ↗",
      "Tarayıcıda aç ↗",
      "Открыть в браузере ↗",
      "Відкрити в браузері ↗",
      "Otwórz w przeglądarce ↗",
      "افتح في المتصفح ↗",
      "Deschide în browser ↗",
    ],
    "Seite wird geladen …": [
      "Loading page …",
      "Sayfa yükleniyor …",
      "Страница загружается …",
      "Сторінка завантажується …",
      "Wczytywanie strony …",
      "جارٍ تحميل الصفحة …",
      "Se încarcă pagina …",
    ],
    "Prospekt ist offen": [
      "Leaflet is open",
      "Broşür açık",
      "Проспект открыт",
      "Проспект відкрито",
      "Gazetka jest otwarta",
      "النشرة مفتوحة",
      "Catalogul este deschis",
    ],
    "Angebot aus dem Prospekt merken": [
      "Save an offer from the leaflet",
      "Broşürden fırsat kaydet",
      "Запомнить акцию из проспекта",
      "Запам'ятати акцію з проспекту",
      "Zapisz ofertę z gazetki",
      "احفظ عرضًا من النشرة",
      "Salvează o ofertă din catalog",
    ],
    "Noch nichts gemerkt.": [
      "Nothing saved yet.",
      "Henüz bir şey kaydedilmedi.",
      "Пока ничего не сохранено.",
      "Поки нічого не збережено.",
      "Jeszcze nic nie zapisano.",
      "لم يُحفظ شيء بعد.",
      "Nimic salvat încă.",
    ],
    Vor: ["Forward", "İleri", "Вперёд", "Вперед", "Dalej", "تقدّم", "Înainte"],
    "Neu laden": ["Reload", "Yenile", "Обновить", "Оновити", "Odśwież", "إعادة التحميل", "Reîncarcă"],
    "🛒 Angebote picken": [
      "🛒 Pick offers",
      "🛒 Fırsat seç",
      "🛒 Выбрать акции",
      "🛒 Вибрати акції",
      "🛒 Wybierz oferty",
      "🛒 اختر العروض",
      "🛒 Alege oferte",
    ],
    "🛒 Angebot picken": [
      "🛒 Pick offer",
      "🛒 Fırsat seç",
      "🛒 Выбрать акцию",
      "🛒 Вибрати акцію",
      "🛒 Wybierz ofertę",
      "🛒 اختر عرضًا",
      "🛒 Alege oferta",
    ],
    "✓ Picken an – Esc zum Beenden": [
      "✓ Picking on – Esc to stop",
      "✓ Seçim açık – bitirmek için Esc",
      "✓ Выбор включён – Esc для выхода",
      "✓ Вибір увімкнено – Esc для виходу",
      "✓ Wybieranie wł. – Esc, aby zakończyć",
      "✓ الاختيار مفعّل – Esc للإنهاء",
      "✓ Alegere activă – Esc pentru oprire",
    ],
    "✎ Rahmen ziehen – Esc zum Beenden": [
      "✎ Draw a frame – Esc to stop",
      "✎ Çerçeve çiz – bitirmek için Esc",
      "✎ Обведи рамкой – Esc для выхода",
      "✎ Обведи рамкою – Esc для виходу",
      "✎ Narysuj ramkę – Esc, aby zakończyć",
      "✎ ارسم إطارًا – Esc للإنهاء",
      "✎ Trage un chenar – Esc pentru oprire",
    ],
    "Klick auf ein Angebot – es kommt auf den Einkaufszettel": [
      "Click an offer – it goes on the shopping list",
      "Bir fırsata tıkla – alışveriş listesine eklenir",
      "Нажми на акцию – она попадёт в список",
      "Натисни на акцію – вона потрапить у список",
      "Kliknij ofertę – trafi na listę zakupów",
      "انقر على عرض – سيُضاف إلى قائمة التسوق",
      "Apasă pe o ofertă – ajunge pe listă",
    ],
    "Hier ist kein Text zu lesen – zieh einen Rahmen um das Angebot": [
      "No text to read here – draw a frame around the offer",
      "Burada okunacak metin yok – fırsatın etrafına çerçeve çiz",
      "Здесь нет текста – обведи акцию рамкой",
      "Тут немає тексту – обведи акцію рамкою",
      "Brak tekstu – narysuj ramkę wokół oferty",
      "لا يوجد نص هنا – ارسم إطارًا حول العرض",
      "Aici nu e text – trage un chenar în jurul ofertei",
    ],
    "Erkannt – stimmt das?": [
      "Recognised – is this right?",
      "Tanındı – doğru mu?",
      "Распознано – верно?",
      "Розпізнано – правильно?",
      "Rozpoznano – zgadza się?",
      "تم التعرف – هل هذا صحيح؟",
      "Recunoscut – e corect?",
    ],
    "Text wird erkannt …": [
      "Recognising text …",
      "Metin tanınıyor …",
      "Текст распознаётся …",
      "Текст розпізнається …",
      "Rozpoznawanie tekstu …",
      "جارٍ التعرف على النص …",
      "Se recunoaște textul …",
    ],
    "Nicht alles erkannt – bitte kurz ergänzen": [
      "Not everything recognised – please complete",
      "Her şey tanınmadı – lütfen tamamla",
      "Распознано не всё – дополни, пожалуйста",
      "Розпізнано не все – доповни, будь ласка",
      "Nie wszystko rozpoznano – uzupełnij",
      "لم يُتعرَّف على كل شيء – أكمل من فضلك",
      "Nu s-a recunoscut tot – completează",
    ],
    "✎ Rahmen ziehen": [
      "✎ Draw frame",
      "✎ Çerçeve çiz",
      "✎ Обвести рамкой",
      "✎ Обвести рамкою",
      "✎ Narysuj ramkę",
      "✎ ارسم إطارًا",
      "✎ Trage chenar",
    ],
    "Zieh einen Rahmen um das Angebot": [
      "Draw a frame around the offer",
      "Fırsatın etrafına çerçeve çiz",
      "Обведи акцию рамкой",
      "Обведи акцію рамкою",
      "Narysuj ramkę wokół oferty",
      "ارسم إطارًا حول العرض",
      "Trage un chenar în jurul ofertei",
    ],
    "Die Seite lädt gerade nicht": [
      "The page is not loading right now",
      "Sayfa şu anda yüklenmiyor",
      "Страница сейчас не загружается",
      "Сторінка зараз не завантажується",
      "Strona teraz się nie ładuje",
      "الصفحة لا تُحمَّل حاليًا",
      "Pagina nu se încarcă acum",
    ],
    "Noch einmal versuchen": [
      "Try again",
      "Tekrar dene",
      "Попробовать снова",
      "Спробувати ще раз",
      "Spróbuj ponownie",
      "حاول مرة أخرى",
      "Încearcă din nou",
    ],
    "Hier ist kein Angebot zu erkennen – klick direkt auf den Kasten des Angebots": [
      "No offer found here – click right on the offer's box",
      "Burada fırsat bulunamadı – doğrudan fırsat kutusuna tıkla",
      "Здесь нет акции – нажми прямо на карточку",
      "Тут немає акції – натисни прямо на картку",
      "Nie znaleziono oferty – kliknij bezpośrednio w ramkę oferty",
      "لا يوجد عرض هنا – انقر مباشرة على مربع العرض",
      "Nicio ofertă aici – apasă direct pe caseta ofertei",
    ],
    Verwerfen: ["Discard", "Vazgeç", "Отбросить", "Відкинути", "Odrzuć", "تجاهل", "Renunță"],
    "Als Angebot": ["As offer", "Fırsat olarak", "Как акцию", "Як акцію", "Jako oferta", "كعرض", "Ca ofertă"],
    "Auf den Zettel": ["On the list", "Listeye", "В список", "У список", "Na listę", "إلى القائمة", "Pe listă"],
    Einklappen: ["Collapse", "Daralt", "Свернуть", "Згорнути", "Zwiń", "طيّ", "Restrânge"],
    Aufklappen: ["Expand", "Genişlet", "Развернуть", "Розгорнути", "Rozwiń", "توسيع", "Extinde"],
    Ja: ["Yes", "Evet", "Да", "Так", "Tak", "نعم", "Da"],
    Nein: ["No", "Hayır", "Нет", "Ні", "Nie", "لا", "Nu"],
    "Abgleich aus": [
      "Sync off",
      "Eşitleme kapalı",
      "Синхронизация выкл.",
      "Синхронізацію вимкнено",
      "Synchronizacja wył.",
      "المزامنة متوقفة",
      "Sincronizare oprită",
    ],
  };
  const LL = ["en", "tr", "ru", "uk", "pl", "ar", "ro"];
  for (const [k, v] of Object.entries(PC_I18N))
    if (!I18N_K.includes(k)) {
      I18N_K.push(k);
      LL.forEach((l, i) => {
        (I18N_T[l] = I18N_T[l] || [])[I18N_K.length - 1] = v[i];
      });
    }
  if (LANG !== "de")
    try {
      I18N.set(LANG);
    } catch (e) {}
}

/* Start */
if (IS_PC) {
  const PCH = () => {
    const h = store.settings.pcHome || (store.settings.pcHome = {});
    h.order = Array.isArray(h.order) ? h.order : [];
    h.min = Array.isArray(h.min) ? h.min : [];
    return h;
  };
  const BIC = {
    cash: "cash",
    budgets: "target",
    fix: "list",
    tax: "shield",
    goals: "piggy",
    debts: "bank",
    recent: "receipt",
    gemeinsam: "heart",
    offers: "cart",
    ...HX_IC,
  };
  const name = (k) => (HOME_BLOCKS.find((b) => b[0] === k) || [k, k])[1];
  const _k2 = accTabKeys;
  accTabKeys = (t) => _k2(t).filter((k) => k !== "start");
  homeOrder = () => {
    const o = [...new Set(PCH().order)].filter((k) => HOME_BLOCKS.some((b) => b[0] === k));
    for (const [k] of HOME_BLOCKS) if (!o.includes(k)) o.push(k);
    return o;
  };
  const _hb = homeBlocks;
  homeBlocks = (html) => {
    const keep = store.settings.homeHidden;
    store.settings.homeHidden = [...PCH().min];
    try {
      return _hb(html);
    } finally {
      store.settings.homeHidden = keep;
    }
  };
  const save = () => {
    try {
      saveSettings();
    } catch (e) {}
  };
  function dock() {
    let d = $("pcDock");
    const on = ui.view === "home",
      m = PCH().min.filter((k) => HOME_BLOCKS.some((b) => b[0] === k));
    document.documentElement.classList.remove("pcdocked");
    const hv = document.querySelector("#v-home");
    if (!hv) return;
    if (!d) {
      d = document.createElement("div");
      d.className = "pcdock";
      d.id = "pcDock";
    }
    const ag = hv.querySelector(".agrid"),
      anc = ag && ag.closest(".areacard");
    if (anc) {
      if (anc.nextElementSibling !== d) anc.after(d);
    } else if (d.parentElement !== hv) hv.appendChild(d);
    d.hidden = !on || !m.length;
    const g = d.querySelector(".pcdkg"),
      have = g ? [...g.children].map((x) => x.dataset.pcrest).join(",") : null;
    if (have === m.join(",")) return;
    d.innerHTML =
      `<div class="pcdkh"><b>Ausgeblendet</b><small>Antippen zum Einblenden</small></div><div class="pcdkg">` +
      m
        .map(
          (k) =>
            `<button class="pcdi" data-pcrest="${k}" aria-label="${escHtml(name(k))} wieder anzeigen"><span>${svgIcon(BIC[k] || "tag", 18)}</span><em>${escHtml(name(k))}</em></button>`
        )
        .join("") +
      `</div>`;
  }
  function decorate() {
    dock();
    if (ui.view !== "home") return;
    document.querySelectorAll("#v-home .hblock").forEach((b) => {
      if (b.closest(".cubestage") || b.querySelector(":scope > .pctl")) return;
      b.insertAdjacentHTML(
        "afterbegin",
        `<div class="pctl"><button class="pcgrip" data-pcgrip="1" aria-label="Kachel verschieben" title="Ziehen zum Verschieben"><svg class="i" viewBox="0 0 24 24" style="width:16px;height:16px"><circle cx="9" cy="6" r="1.3"/><circle cx="15" cy="6" r="1.3"/><circle cx="9" cy="12" r="1.3"/><circle cx="15" cy="12" r="1.3"/><circle cx="9" cy="18" r="1.3"/><circle cx="15" cy="18" r="1.3"/></svg></button><button class="pcmin" data-pcmin="${b.dataset.hb}" aria-label="Kachel minimieren" title="Minimieren">${svgIcon("minus", 16)}</button></div>`
      );
    });
  }
  const _ph = pcHome;
  pcHome = (o) => {
    _ph(o);
    decorate();
  };
  setInterval(dock, 1000);
  const _render = render;
  render = (...a) => {
    const x = _render(...a);
    try {
      dock();
    } catch (e) {}
    return x;
  };
  window.pcDockEls = () =>
    ui.view === "home" && $("pcDock") && !$("pcDock").hidden ? [...$("pcDock").querySelectorAll(".pcdi")] : [];
  const dockSpot = (k) => {
    const el = document.querySelector(`#pcDock [data-pcrest="${k}"]`);
    if (el) {
      const r = el.getBoundingClientRect();
      return {
        x: r.left + r.width / 2,
        y: r.top + r.height / 2,
      };
    }
    return {
      x: innerWidth - 50,
      y: innerHeight / 2,
    };
  };
  const snap = () =>
    new Map([...document.querySelectorAll("#v-home .hblock")].map((t) => [t.dataset.hb, t.getBoundingClientRect()]));
  function glide(before, skip) {
    document.querySelectorAll("#v-home .hblock").forEach((t) => {
      if (t.dataset.hb === skip) return;
      const a = before.get(t.dataset.hb);
      if (!a) return;
      const r = t.getBoundingClientRect(),
        dx = a.left - r.left,
        dy = a.top - r.top;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1)
        t.animate(
          [
            {
              transform: `translate(${dx}px,${dy}px)`,
            },
            {
              transform: "none",
            },
          ],
          {
            duration: 420,
            easing: "cubic-bezier(.2,.8,.2,1)",
          }
        );
    });
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-pcmin]");
    if (!b) return;
    const k = b.dataset.pcmin,
      tile = b.closest(".hblock");
    if (!tile || PC_ANIM.busy) return;
    const r = tile.getBoundingClientRect(),
      h = PCH(),
      before = snap();
    if (!h.min.includes(k)) h.min.push(k);
    const fly = tile.cloneNode(true);
    fly.classList.add("pcfly");
    Object.assign(fly.style, {
      left: r.left + "px",
      top: r.top + "px",
      width: r.width + "px",
      height: r.height + "px",
    });
    document.body.appendChild(fly);
    tile.remove();
    save();
    glide(before, k);
    const di = document.querySelector(`#pcDock [data-pcrest="${k}"]`);
    if (di) di.style.opacity = "0";
    const t = dockSpot(k),
      dx = t.x - (r.left + r.width / 2),
      dy = t.y - (r.top + r.height / 2),
      sc = Math.max(0.06, 52 / Math.max(r.width, r.height));
    fly
      .animate(
        [
          {
            transform: "none",
            opacity: 1,
            borderRadius: "24px",
          },
          {
            transform: "translateY(-18px) scale(1.04) rotate(-3deg)",
            opacity: 1,
            offset: 0.18,
          },
          {
            transform: `translate(${dx * 0.4}px,${dy * 0.4 - 40}px) scale(.55) rotate(-8deg)`,
            opacity: 1,
            offset: 0.55,
          },
          {
            transform: `translate(${dx}px,${dy}px) scale(${sc}) rotate(10deg)`,
            opacity: 0.15,
            borderRadius: "50%",
          },
        ],
        {
          duration: 680,
          easing: "cubic-bezier(.45,0,.2,1)",
          fill: "forwards",
        }
      )
      .finished.then(() => {
        fly.remove();
        const d2 = document.querySelector(`#pcDock [data-pcrest="${k}"]`);
        if (d2) {
          d2.style.opacity = "";
          d2.animate(
            [
              {
                transform: "scale(.3)",
              },
              {
                transform: "scale(1.25)",
                offset: 0.6,
              },
              {
                transform: "none",
              },
            ],
            {
              duration: 420,
              easing: "cubic-bezier(.3,.7,.3,1)",
            }
          );
        }
      });
  });
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-pcrest]");
    if (!b || PC_ANIM.busy) return;
    const k = b.dataset.pcrest,
      from = b.getBoundingClientRect(),
      h = PCH(),
      before = snap();
    h.min = h.min.filter((x) => x !== k);
    save();
    glide(before, k);
    const tile = document.querySelector(`#v-home .hblock[data-hb="${k}"]`);
    if (!tile) return;
    const r = tile.getBoundingClientRect();
    if (r.bottom > innerHeight - 50 || r.top < 120) {
      tile.scrollIntoView({
        block: "center",
      });
    }
    const r2 = tile.getBoundingClientRect(),
      dx = from.left + from.width / 2 - (r2.left + r2.width / 2),
      dy = from.top + from.height / 2 - (r2.top + r2.height / 2),
      sc = Math.max(0.06, 52 / Math.max(r2.width, r2.height));
    tile.animate(
      [
        {
          transform: `translate(${dx}px,${dy}px) scale(${sc}) rotate(10deg)`,
          opacity: 0.3,
          borderRadius: "50%",
        },
        {
          transform: "translate(0,-14px) scale(1.03) rotate(-1.5deg)",
          opacity: 1,
          offset: 0.7,
        },
        {
          transform: "none",
          opacity: 1,
        },
      ],
      {
        duration: 700,
        easing: "cubic-bezier(.3,.7,.3,1)",
      }
    );
  });
  let D = null;
  const tiles = () => [...document.querySelectorAll("#v-home .hcol > .hblock, #v-home .hlist > .hblock")];
  function flip(move) {
    const els = tiles().filter((t) => t !== D.ph),
      before = new Map(els.map((t) => [t, t.getBoundingClientRect()]));
    move();
    for (const t of els) {
      const a = before.get(t),
        b = t.getBoundingClientRect();
      const dx = a.left - b.left,
        dy = a.top - b.top;
      if (dx || dy)
        t.animate(
          [
            {
              transform: `translate(${dx}px,${dy}px)`,
            },
            {
              transform: "none",
            },
          ],
          {
            duration: 260,
            easing: "cubic-bezier(.2,.8,.2,1)",
          }
        );
    }
  }
  document.addEventListener("pointerdown", (e) => {
    const g = e.target.closest("[data-pcgrip]");
    if (!g || e.button > 0) return;
    const tile = g.closest(".hblock");
    if (!tile) return;
    e.preventDefault();
    const r = tile.getBoundingClientRect();
    const ph = document.createElement("div");
    ph.className = "hblock pcph";
    ph.style.height = r.height + "px";
    const fly = tile.cloneNode(true);
    fly.classList.add("pcfly", "pclift");
    Object.assign(fly.style, {
      left: r.left + "px",
      top: r.top + "px",
      width: r.width + "px",
      height: r.height + "px",
    });
    document.body.appendChild(fly);
    tile.replaceWith(ph);
    D = {
      tile,
      ph,
      fly,
      ox: e.clientX - r.left,
      oy: e.clientY - r.top,
      id: e.pointerId,
      last: 0,
    };
    fly.animate(
      [
        {
          transform: "none",
        },
        {
          transform: "rotate(-2deg) scale(1.03)",
        },
      ],
      {
        duration: 180,
        fill: "forwards",
        easing: "ease-out",
      }
    );
    document.documentElement.classList.add("pcdragging");
  });
  document.addEventListener("pointermove", (e) => {
    if (!D || e.pointerId !== D.id) return;
    D.fly.style.left = e.clientX - D.ox + "px";
    D.fly.style.top = e.clientY - D.oy + "px";
    if (e.clientY > innerHeight - 70) scrollBy(0, 14);
    else if (e.clientY < 130) scrollBy(0, -14);
    const now = Date.now();
    if (now - D.last < 60) return;
    D.last = now;
    const over = document
      .elementsFromPoint(e.clientX, e.clientY)
      .find((x) => x.matches && x.matches("#v-home .hcol > .hblock, #v-home .hlist > .hblock") && x !== D.ph);
    if (!over) return;
    const ro = over.getBoundingClientRect(),
      after = e.clientY > ro.top + ro.height / 2;
    if ((after && over.nextElementSibling === D.ph) || (!after && over.previousElementSibling === D.ph)) return;
    flip(() => over.insertAdjacentElement(after ? "afterend" : "beforebegin", D.ph));
  });
  const drop = (e) => {
    if (!D || (e && e.pointerId !== D.id)) return;
    const { tile, ph, fly } = D;
    D = null;
    document.documentElement.classList.remove("pcdragging");
    const r = ph.getBoundingClientRect(),
      f = fly.getBoundingClientRect();
    fly.getAnimations().forEach((a) => a.cancel());
    fly
      .animate(
        [
          {
            transform: "rotate(-2deg) scale(1.03)",
          },
          {
            transform: `translate(${r.left - f.left}px,${r.top - f.top}px) rotate(1deg) scale(.99)`,
            offset: 0.8,
          },
          {
            transform: `translate(${r.left - f.left}px,${r.top - f.top}px)`,
          },
        ],
        {
          duration: 280,
          easing: "cubic-bezier(.2,.8,.2,1)",
          fill: "forwards",
        }
      )
      .finished.then(() => {
        ph.replaceWith(tile);
        fly.remove();
        tile.animate(
          [
            {
              transform: "scale(.98)",
            },
            {
              transform: "scale(1.01)",
              offset: 0.5,
            },
            {
              transform: "none",
            },
          ],
          {
            duration: 260,
          }
        );
        const dom = tiles().map((t) => t.dataset.hb),
          min = PCH().min,
          it = dom[Symbol.iterator]();
        PCH().order = homeOrder().map((k) => (min.includes(k) || !dom.includes(k) ? k : it.next().value));
        save();
      });
  };
  document.addEventListener("pointerup", drop);
  document.addEventListener("pointercancel", drop);
  addEventListener("blur", () => drop());
  decorate();
}
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
      if (e.closest(".cubestage,.pctl")) return;
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
      if (!$("pcFbBg").hidden) fbRender();
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
    if ($("pcFbBg").hidden) return;
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
      const pop = $("pcRelPop");
      if (pop) pop.innerHTML = devPanelHtml();
    } catch (_) {}
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

/* Buchungen */
if (IS_PC) {
  const B = {
    sel: null,
    sig: "",
    arm: null,
    armT: 0,
    closed: new Set(),
    busy: new Set(),
    n: 0,
  };
  try {
    (JSON.parse(localStorage.getItem("hb-pc-closed") || "[]") || []).forEach((d) => B.closed.add(d));
  } catch (_) {}
  const saveClosed = () => {
    try {
      localStorage.setItem(
        "hb-pc-closed",
        JSON.stringify([...B.closed].filter((d) => d >= shiftYm(ymOf(new Date()), -24)))
      );
    } catch (_) {}
  };
  function nCols() {
    const lc = $("listCard"),
      w = lc && lc.clientWidth;
    return Math.max(1, Math.min(5, Math.floor(((w || 720) + 14) / (330 + 14))));
  }
  const isIn = (t) => t.kind === "einnahme" || (t.kind === "umbuchung" && t._k0 === "einnahme");
  const ttl = (t) => t.note || t.cat || KIND_LABEL[t.kind];
  const amtTxt = (t, v) => (t.kind === "umbuchung" ? "" : isIn(t) ? "+ " : "− ") + fmtEur(v == null ? t.amount : v);
  const clip = `<svg class="i" viewBox="0 0 24 24" style="width:13px;height:13px;vertical-align:-1px" aria-label="mit Beleg"><path d="M16.5 7.5 9 15a2.1 2.1 0 0 1-3-3l8-8a3.5 3.5 0 0 1 5 5l-8.5 8.5a5 5 0 0 1-7-7L11 3"/></svg>`;
  function shown() {
    let l = txFilter(monthCalc(ui.ym).tx);
    const q = (ui.q || "").trim().toLowerCase();
    if (q)
      l = l.filter((t) => ((t.note || "") + " " + (t.cat || "") + " " + KIND_LABEL[t.kind]).toLowerCase().includes(q));
    return sortTx(l);
  }
  function sub(t) {
    return [
      t.note ? t.cat : "",
      t.kind === "betrieb"
        ? "Betrieblich"
        : t.kind === "vorauszahlung"
          ? "aus Rücklage"
          : t.kind === "umbuchung"
            ? "Umschuldung · zählt nicht"
            : "",
      t.pay === "bar" ? "💶 bar" : "",
    ]
      .filter(Boolean)
      .join(" · ");
  }
  const _rl = renderList;
  renderList = function () {
    ui.calDay = null;
    _rl();
    $("calCard").hidden = true;
    const lc = $("listCard"),
      list = shown();
    if (!$("pcDet")) {
      $("v-list").insertAdjacentHTML("beforeend", `<div class="card pcdet" id="pcDet"></div>`);
    }
    lc.classList.toggle("pcdiary", list.length > 0);
    if (list.length) {
      const days = {};
      for (const t of list.slice().reverse()) (days[t.date] = days[t.date] || []).push(t);
      const chev = `<svg class="i" viewBox="0 0 24 24" style="width:16px;height:16px"><path d="m6 9 6 6 6-6"/></svg>`;
      const card = ([d, ts]) => {
        const net = sum(ts, (t) => (t.kind === "umbuchung" ? 0 : isIn(t) ? t.amount : -t.amount)),
          dt = new Date(d + "T12:00"),
          cl = B.closed.has(d);
        return `<div class="pcday ${cl ? "closed" : ""}" data-pcday="${d}"><div class="pcdh" data-pcfold="${d}" role="button" tabindex="0" aria-expanded="${!cl}" title="${cl ? "Aufklappen" : "Einklappen"}"><span class="pcdn">${pad(dt.getDate())}<i class="pcdbadge">${ts.length}</i></span><span class="pcdw"><b>${escHtml(
          dt.toLocaleDateString(localeTag(), {
            weekday: "long",
          })
        )}</b><small>${escHtml(MONTHS[dt.getMonth()])}</small></span><span class="pcdmini" aria-hidden="true">${ts
          .slice(0, 5)
          .map((t) => `<span>${avatar(t)}</span>`)
          .join(
            ""
          )}</span><b class="pcdnet ${net >= 0 ? "pos" : ""}">${net >= 0 ? "+" : "−"} ${escHtml(fmtEur(Math.abs(net)))}</b><span class="pcdchev">${chev}</span></div>
          <div class="pcdrows">${ts.map((t) => `<button class="pcbr ${isIn(t) ? "inc" : ""} ${B.sel === t.id ? "sel" : ""}" data-pcsel="${escHtml(t.id)}">${avatar(t)}<span class="grow"><b>${escHtml(ttl(t))}${hasReceipt(t.id) ? " " + clip : ""}</b>${sub(t) ? `<small>${escHtml(sub(t))}</small>` : ""}</span><b class="amt">${escHtml(amtTxt(t))}</b></button>`).join("")}</div></div>`;
      };
      const ents = Object.entries(days),
        n = nCols(),
        w = ents.map(([d, ts]) => (B.closed.has(d) ? 1.3 : 1.6 + ts.length)),
        tot = sum(w, (x) => x),
        cols = [[]];
      let acc = 0;
      ents.forEach((e, i) => {
        if (cols.length < n && cols[cols.length - 1].length && acc + w[i] / 2 > (tot * cols.length) / n) cols.push([]);
        cols[cols.length - 1].push(e);
        acc += w[i];
      });
      B.n = n;
      lc.innerHTML = `<div class="pccols">${cols.map((c) => `<div class="pccol">${c.map(card).join("")}</div>`).join("")}</div><i class="pchl" aria-hidden="true"></i>`;
    }
    if (B.sel && !list.some((t) => t.id === B.sel)) B.sel = null;
    placeHl(false);
    det(false);
  };
  function placeHl(anim) {
    const lc = $("listCard"),
      hl = lc && lc.querySelector(".pchl");
    if (!hl) return;
    const r = B.sel && lc.querySelector(`[data-pcsel="${CSS.escape(B.sel)}"]`);
    lc.querySelectorAll(".pcbr").forEach((x) => x.classList.toggle("sel", x === r));
    if (!r || r.closest(".pcday.closed") || !r.offsetHeight) {
      hl.style.opacity = 0;
      return;
    }
    const cr = lc.getBoundingClientRect(),
      b = r.getBoundingClientRect();
    const to = {
      left: b.left - cr.left + "px",
      top: b.top - cr.top + "px",
      width: b.width + "px",
      height: b.height + "px",
    };
    if (anim && hl.style.opacity === "1" && !pcCalm()) {
      const fr = {
        left: hl.style.left,
        top: hl.style.top,
        width: hl.style.width,
        height: hl.style.height,
      };
      hl.animate([fr, to], {
        duration: 380,
        easing: "cubic-bezier(.2,.8,.2,1)",
      });
    } else if (anim && !pcCalm())
      hl.animate(
        [
          {
            opacity: 0,
            transform: "scale(.92)",
          },
          {
            opacity: 1,
            transform: "none",
          },
        ],
        {
          duration: 260,
          easing: "cubic-bezier(.2,.8,.2,1)",
        }
      );
    Object.assign(hl.style, to);
    hl.style.opacity = 1;
  }
  function detHtml(t) {
    const dt = new Date(t.date + "T12:00"),
      same = monthCalc(ui.ym).tx.filter((x) => ttl(x) === ttl(t)),
      rc = hasReceipt(t.id);
    const kv = [
      ["Kategorie", t.cat || "–"],
      ["Art", KIND_LABEL[t.kind] || t.kind],
      [
        "Bezahlt",
        t.pay === "bar" ? "💶 bar" : typeof kaOn === "function" && kaOn() ? t.acct || "Hauptkonto" : "Karte / Konto",
      ],
      ["Wiederkehrend", t.wk ? "Ja" : "Nein"],
    ];
    if (isIn(t) && t.net != null && Math.abs(t.net - t.amount) > 0.004) kv.push(["Netto", fmtEur(t.net)]);
    return `<div class="pcdx">
      <div class="pcdtop">${avatar(t)}<div class="grow"><h2>${escHtml(ttl(t))}</h2><span class="muted">${escHtml(
        dt.toLocaleDateString(localeTag(), {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      )}</span></div><button class="roundbtn" data-pcdclose="1" aria-label="Schließen" title="Schließen"><svg class="i" viewBox="0 0 24 24" style="width:18px;height:18px"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
      <div class="pcdbig ${isIn(t) ? "pos" : ""}">${escHtml(amtTxt(t))}</div>
      <div class="pcdbody"><div class="pcdkv">${kv.map(([a, b]) => `<div><span class="muted">${escHtml(a)}</span><b>${escHtml(b)}</b></div>`).join("")}
        ${
          same.length > 1
            ? `<div class="pcdsame"><small class="muted"><b>${escHtml(ttl(t))}</b> <span>diesen Monat</span></small><div><span>${same.length} Buchungen</span><b>${escHtml(
                amtTxt(
                  t,
                  sum(same, (x) => x.amount)
                )
              )}</b></div></div>`
            : ""
        }</div>
        <div class="pcrc ${rc ? "" : "none"}"><i class="slot"></i>${rc ? `<div class="paper"><img alt="Beleg" data-pcrimg="${escHtml(t.id)}"></div><span class="muted small">Beleg</span>` : `<div class="paper empty">${svgIcon("receipt", 28)}<span>Kein Beleg</span></div><button class="link small" data-edit="${escHtml(t.id)}">Beleg hinzufügen</button>`}</div></div>
      <div class="pcdact"><button class="btn primary" data-edit="${escHtml(t.id)}">✎ <span>Bearbeiten</span></button><button class="btn" data-pcdup="${escHtml(t.id)}">⧉ <span>Duplizieren</span></button><button class="btn danger" data-pcdel="${escHtml(t.id)}">${B.arm === t.id ? "Wirklich löschen?" : "🗑 Löschen"}</button><span class="muted small pcdkey">↑ ↓ <span>nächste Buchung</span></span></div></div>`;
  }
  function count(el, t, ms) {
    const v = t.amount,
      t0 = performance.now(),
      e = (x) => 1 - Math.pow(1 - x, 3);
    const st = (n) => {
      if (!el.isConnected) return;
      const k = Math.min(1, (n - t0) / ms);
      el.textContent = amtTxt(t, v * e(k));
      if (k < 1) requestAnimationFrame(st);
    };
    requestAnimationFrame(st);
  }
  async function det(anim) {
    const box = $("pcDet");
    if (!box) return;
    const t = B.sel && store.tx.find((x) => x.id === B.sel);
    const sig = t ? JSON.stringify([t, hasReceipt(t.id), RCPT.v[t.id] || 0, B.arm === t.id, LANG]) : "none|" + LANG;
    if (sig === B.sig && !anim) return;
    B.sig = sig;
    if (!t) {
      box.innerHTML = `<div class="pcdnone"><span class="pcdhand">${svgIcon("receipt", 34)}</span><b>Buchung anklicken</b><span class="muted">dann erscheint sie hier groß – mit Beleg</span></div>`;
      box.classList.add("empty");
      return;
    }
    box.classList.remove("empty");
    const calm = pcCalm(),
      old = box.firstElementChild;
    if (anim && !calm && old)
      await old
        .animate(
          [
            {
              opacity: 1,
              filter: "blur(0)",
            },
            {
              opacity: 0,
              filter: "blur(6px)",
            },
          ],
          {
            duration: 180,
            fill: "forwards",
          }
        )
        .finished.catch(() => {});
    if (B.sel !== t.id) return;
    box.innerHTML = detHtml(t);
    const img = box.querySelector("[data-pcrimg]"),
      paper = box.querySelector(".paper");
    if (anim && !calm) {
      box.firstElementChild.animate(
        [
          {
            opacity: 0,
            transform: "scale(.97)",
          },
          {
            opacity: 1,
            transform: "none",
          },
        ],
        {
          duration: 300,
          easing: "cubic-bezier(.2,.8,.2,1)",
        }
      );
      count(box.querySelector(".pcdbig"), t, 1000);
      paper.animate(
        [
          {
            transform: "translateY(-110%) rotate(0)",
            clipPath: "inset(100% 0 0 0)",
          },
          {
            transform: "translateY(-45%) rotate(0)",
            clipPath: "inset(0 0 0 0)",
            offset: 0.5,
          },
          {
            transform: "translateY(-45%) rotate(0)",
            offset: 0.62,
          },
          {
            transform: "translateY(8px) rotate(-5deg)",
            offset: 0.85,
          },
          {
            transform: "rotate(-2deg)",
          },
        ],
        {
          duration: 1500,
          easing: "ease-out",
          fill: "backwards",
        }
      );
    }
    if (img) {
      const src = await rcptGet(t.id);
      if (src && img.isConnected) img.src = src;
    }
  }
  function pick(id) {
    if (!id || id === B.sel) return;
    B.sel = id;
    B.arm = null;
    placeHl(true);
    det(true);
    const r = document.querySelector(`#listCard [data-pcsel="${CSS.escape(id)}"]`);
    if (r)
      r.scrollIntoView({
        block: "nearest",
        behavior: pcCalm() ? "auto" : "smooth",
      });
  }
  document.addEventListener("click", (e) => {
    if (ui.view !== "list") return;
    const r = e.target.closest("[data-pcsel]");
    if (r) {
      pick(r.dataset.pcsel);
      return;
    }
    if (e.target.closest("[data-pcdclose]")) {
      B.sel = null;
      placeHl(false);
      det(true);
      return;
    }
    const du = e.target.closest("[data-pcdup]");
    if (du) {
      const t = store.tx.find((x) => x.id === du.dataset.pcdup);
      if (!t) return;
      openSheet(t.kind === "umbuchung" ? t._k0 || "ausgabe" : t.kind === "abhebung" ? "ausgabe" : t.kind);
      ui.cat = t.cat;
      ui.pay = t.pay || "karte";
      $("fAmount").value = numStr(t.amount);
      $("fNote").value = t.note || "";
      $("fWk").checked = !!t.wk;
      renderSheet();
      return;
    }
    const dl = e.target.closest("[data-pcdel]");
    if (dl) {
      const id = dl.dataset.pcdel;
      if (B.arm !== id) {
        B.arm = id;
        det(false);
        clearTimeout(B.armT);
        B.armT = setTimeout(() => {
          B.arm = null;
          det(false);
        }, 3000);
        return;
      }
      B.arm = null;
      const old = store.tx.find((x) => x.id === id);
      if (!old) return;
      const l = shown(),
        i = l.findIndex((x) => x.id === id),
        next = l[i + 1] || l[i - 1];
      (async () => {
        const img = hasReceipt(id) ? await rcptGet(id) : null;
        if (await safe(() => delTxDoc(old))) {
          if (img) await rcptDel(id);
          B.sel = next ? next.id : null;
          render();
          det(true);
          toast("Gelöscht", async () => {
            await safe(() => restoreTx(old));
            if (img) await rcptPut(id, img);
            B.sel = id;
            render();
          });
        }
      })();
      return;
    }
  });
  document.addEventListener("dblclick", (e) => {
    if (ui.view !== "list") return;
    const r = e.target.closest("[data-pcsel]");
    if (!r) return;
    const t = store.tx.find((x) => x.id === r.dataset.pcsel);
    if (t) openSheet(null, t);
  });
  document.addEventListener("keydown", (e) => {
    if (
      ui.view !== "list" ||
      e.defaultPrevented ||
      e.altKey ||
      e.ctrlKey ||
      e.metaKey ||
      (e.key !== "ArrowUp" && e.key !== "ArrowDown" && e.key !== "Escape" && e.key !== "Enter")
    )
      return;
    if (
      /^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || "") ||
      !$("sheetBg").hidden ||
      document.querySelector(".backdrop.show:not([hidden])")
    )
      return;
    if (e.key === "Escape") {
      if (B.sel) {
        B.sel = null;
        placeHl(false);
        det(true);
      }
      return;
    }
    if (e.key === "Enter") {
      const t = B.sel && store.tx.find((x) => x.id === B.sel);
      if (t) {
        e.preventDefault();
        openSheet(null, t);
      }
      return;
    }
    const ids = [...document.querySelectorAll("#listCard .pcday:not(.closed) [data-pcsel]")].map(
      (x) => x.dataset.pcsel
    );
    if (!ids.length) return;
    e.preventDefault();
    if (document.activeElement && document.activeElement.closest && document.activeElement.closest(".pcbr"))
      document.activeElement.blur();
    const i = ids.indexOf(B.sel);
    pick(ids[i < 0 ? 0 : Math.max(0, Math.min(ids.length - 1, i + (e.key === "ArrowDown" ? 1 : -1)))]);
  });
  addEventListener("resize", () => {
    if (ui.view !== "list") return;
    if (nCols() !== B.n) renderList();
    else placeHl(false);
  });
  function follow(ms) {
    const t0 = performance.now();
    const st = (n) => {
      placeHl(false);
      if (n - t0 < ms) requestAnimationFrame(st);
    };
    requestAnimationFrame(st);
  }
  async function fold(d) {
    const day = document.querySelector(`#listCard [data-pcday="${d}"]`);
    if (!day || B.busy.has(d)) return;
    const close = !day.classList.contains("closed"),
      body = day.querySelector(".pcdrows"),
      dn = day.querySelector(".pcdn"),
      rows = [...body.children];
    const badge = day.querySelector(".pcdbadge"),
      minis = [...day.querySelectorAll(".pcdmini>span")],
      head = day.querySelector(".pcdh");
    const E = "cubic-bezier(.2,.8,.2,1)",
      st = () => {
        head.setAttribute("aria-expanded", String(!close));
        head.title = close ? "Aufklappen" : "Einklappen";
        if (close) B.closed.add(d);
        else B.closed.delete(d);
        saveClosed();
      };
    if (pcCalm()) {
      day.classList.toggle("closed", close);
      st();
      placeHl(false);
      return;
    }
    B.busy.add(d);
    try {
      if (close) {
        const h = body.offsetHeight,
          nb = dn.getBoundingClientRect(),
          cx = nb.left + nb.width / 2,
          cy = nb.top + nb.height / 2;
        const fl = rows.map((r, i) => {
          const rb = r.getBoundingClientRect();
          return r.animate(
            [
              {
                transform: "none",
                opacity: 1,
              },
              {
                transform: `translate(${cx - (rb.left + rb.width / 2)}px,${cy - (rb.top + rb.height / 2)}px) scale(.08)`,
                opacity: 0.15,
              },
            ],
            {
              duration: 440,
              delay: Math.min(i, 8) * 60,
              easing: "cubic-bezier(.6,0,.4,1)",
              fill: "forwards",
            }
          );
        });
        if (rows.some((r) => r.classList.contains("sel")))
          $("listCard")
            .querySelector(".pchl")
            .animate(
              [
                {
                  opacity: 1,
                },
                {
                  opacity: 0,
                },
              ],
              {
                duration: 200,
              }
            );
        await Promise.all(fl.map((a) => a.finished));
        day.classList.add("closed");
        st();
        dn.animate(
          [
            {
              transform: "scale(1)",
            },
            {
              transform: "scale(1.3)",
            },
            {
              transform: "scale(1)",
            },
          ],
          {
            duration: 380,
            easing: E,
          }
        );
        badge.animate(
          [
            {
              opacity: 0,
              transform: "scale(0)",
            },
            {
              opacity: 1,
              transform: "scale(1.4)",
              offset: 0.6,
            },
            {
              opacity: 1,
              transform: "none",
            },
          ],
          {
            duration: 420,
            easing: E,
          }
        );
        minis.forEach((m, i) =>
          m.animate(
            [
              {
                transform: "scale(0)",
                opacity: 0,
              },
              {
                transform: "scale(1.25)",
                opacity: 1,
                offset: 0.6,
              },
              {
                transform: "none",
                opacity: 1,
              },
            ],
            {
              duration: 380,
              delay: 120 + i * 60,
              easing: E,
              fill: "backwards",
            }
          )
        );
        body.style.display = "block";
        body.style.overflow = "hidden";
        const sh = body.animate(
          [
            {
              height: h + "px",
            },
            {
              height: "0px",
            },
          ],
          {
            duration: 360,
            easing: "cubic-bezier(.5,0,.2,1)",
          }
        );
        follow(380);
        await sh.finished;
        body.style.display = "";
        body.style.overflow = "";
        fl.forEach((a) => a.cancel());
      } else {
        badge.animate(
          [
            {
              opacity: 1,
              transform: "none",
            },
            {
              opacity: 0,
              transform: "scale(0)",
            },
          ],
          {
            duration: 200,
            easing: "ease-in",
          }
        );
        minis.forEach((m) =>
          m.animate(
            [
              {
                transform: "none",
                opacity: 1,
              },
              {
                transform: "scale(0)",
                opacity: 0,
              },
            ],
            {
              duration: 200,
              easing: "ease-in",
            }
          )
        );
        day.classList.remove("closed");
        st();
        const h = body.offsetHeight;
        dn.animate(
          [
            {
              transform: "scale(1)",
            },
            {
              transform: "scale(1.25)",
            },
            {
              transform: "scale(1)",
            },
          ],
          {
            duration: 380,
            easing: E,
          }
        );
        body.animate(
          [
            {
              height: "0px",
            },
            {
              height: h + "px",
            },
          ],
          {
            duration: 420,
            easing: E,
          }
        );
        follow(1100);
        const nb = dn.getBoundingClientRect(),
          cx = nb.left + nb.width / 2,
          cy = nb.top + nb.height / 2;
        await Promise.all(
          rows.map((r, i) => {
            const rb = r.getBoundingClientRect(),
              dy = cy - (rb.top + rb.height / 2) + (rb.top - body.getBoundingClientRect().top) * 0;
            return r.animate(
              [
                {
                  transform: `translate(${cx - (rb.left + rb.width / 2)}px,${dy}px) scale(.08)`,
                  opacity: 0.15,
                },
                {
                  transform: "translate(0,4px) scale(1.02)",
                  opacity: 1,
                  offset: 0.8,
                },
                {
                  transform: "none",
                  opacity: 1,
                },
              ],
              {
                duration: 520,
                delay: Math.min(i, 8) * 80,
                easing: E,
                fill: "backwards",
              }
            ).finished;
          })
        );
      }
    } finally {
      B.busy.delete(d);
      placeHl(false);
    }
  }
  document.addEventListener("click", (e) => {
    if (ui.view !== "list") return;
    const h = e.target.closest("[data-pcfold]");
    if (h) fold(h.dataset.pcfold);
  });
  document.addEventListener(
    "keydown",
    (e) => {
      const h = e.target.closest && e.target.closest("[data-pcfold]");
      if (h && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        e.stopPropagation();
        fold(h.dataset.pcfold);
      }
    },
    true
  );
}

/* Fixkosten-Kalender */
if (IS_PC) {
  const F = {
    pop: null,
    ring: 0,
    drag: null,
    fresh: null,
    gone: null,
    first: true,
  };
  const FCOL = {
    Wohnen: "#2f7d5b",
    Schulden: "#b5473a",
    Auto: "#c27c0e",
    Versicherung: "#5b7f95",
    "Sparen & Vorsorge": "#3d63a8",
    "Abos & Handy": "#d14d72",
    Betrieb: "#6b5bb0",
    Sonstiges: "#0e8aa0",
  };
  const FIC = {
    Wohnen: "home",
    Schulden: "bank",
    Auto: "car",
    Versicherung: "shield",
    "Sparen & Vorsorge": "piggy",
    "Abos & Handy": "phone",
    Betrieb: "case",
    Sonstiges: "dots",
  };
  const SV = {
    pen: `<svg class="i" viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4"/></svg>`,
    bin: `<svg class="i" viewBox="0 0 24 24"><path d="M5 7h14M10 11v6M14 11v6M6.5 7l1 12.5h9L17.5 7M9.5 7V4.5h5V7"/></svg>`,
    x: `<svg class="i" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>`,
    plus: `<svg class="i" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>`,
  };
  const col = (a) => FCOL[a] || "#0e8aa0";
  const E = "cubic-bezier(.2,.8,.2,1)",
    BO = "cubic-bezier(.3,1.5,.5,1)";
  const dayOf = (f, ym) => {
    const D = daysIn(ym);
    let d = null;
    if (Array.isArray(f.days) && f.days.length) {
      for (const e of f.days) if (e.from <= ym) d = e.day;
    }
    if (d == null && f.day >= 1) d = f.day;
    if (d == null) d = fixDay(f, ym);
    return d >= 1 ? Math.min(D, d | 0) : null;
  };
  const withDay = (f, ym, day) => {
    const base =
      Array.isArray(f.days) && f.days.length
        ? f.days
        : f.day >= 1
          ? [
              {
                from: "0000-00",
                day: f.day | 0,
              },
            ]
          : [];
    const p = base.filter((e) => e.from < ym);
    p.push({
      from: ym,
      day: day || 0,
    });
    return p;
  };
  const clean = (f) => {
    const d = {
      ...f,
    };
    delete d.id;
    return d;
  };
  const _rf = renderFix;
  renderFix = function () {
    if (ui.fixEdit) {
      $("v-fix").classList.remove("pcfcal");
      return _rf();
    }
    if (($("v-fix").contains(document.activeElement) && document.activeElement.id === "fxAmtIn") || pdHold($("v-fix")))
      return;
    const ym = ui.ym,
      c = monthCalc(ym),
      paid = c.paid || {},
      cur = ymOf(new Date()),
      today = ym === cur ? new Date().getDate() : ym < cur ? 99 : 0;
    const mName = MONTHS[ymParts(ym)[1] - 1],
      D = daysIn(ym),
      [y, m] = ymParts(ym),
      first = (new Date(y, m - 1, 1).getDay() + 6) % 7;
    const all = fixedSorted().filter((f) => dueIn(f, ym) || f.id in paid);
    const amtOf = (f) => (f.id in paid ? Number(paid[f.id]) || 0 : planAmt(f, ym));
    const total = sum(all, amtOf),
      pSum = sum(
        all.filter((f) => f.id in paid),
        amtOf
      ),
      nPaid = all.filter((f) => f.id in paid).length;
    const by = {},
      none = [];
    for (const f of all) {
      const d = dayOf(f, ym);
      if (d) (by[d] = by[d] || []).push(f);
      else none.push(f);
    }
    const byAcc = fxAcctOn() && store.settings.fxColBy === "konto";
    const chip = (f) => {
      const on = f.id in paid,
        a = fixArea(f),
        d = dayOf(f, ym),
        late = !on && d && d < today,
        ed = ui.amtEdit === f.id;
      return `<div class="pcfc ${on ? "on" : ""} ${late ? "late" : ""} ${byAcc ? "acc" : ""}" style="--c:${byAcc ? fxCol(fxAcct(f)) : col(a)}" data-pay="${escHtml(f.id)}" data-pcfid="${escHtml(f.id)}" draggable="${ed ? "false" : "true"}" role="checkbox" tabindex="0" aria-checked="${on}" title="${escHtml(f.name)} · ${escHtml(a)}${fxAcctOn() ? " · " + escHtml(fxAcct(f)) : ""}${late ? " · überfällig" : ""}">
        ${brandFor(f.name) ? brandBadge(brandFor(f.name)) : tile(f.kind === "betrieb" ? "betrieb" : "fix", f.name)}<span class="n" lang="de">${escHtml(f.name)}</span>
        ${ed ? `<input class="in fxamt-in" id="fxAmtIn" data-fxamtin="${escHtml(f.id)}" inputmode="decimal" value="${escHtml(numStr(amtOf(f)))}" aria-label="Betrag für ${escHtml(f.name)} im ${escHtml(mName)}">` : `<button class="a" data-fxamt="${escHtml(f.id)}" title="Betrag nur für ${escHtml(mName)} ändern">${escHtml(fmtEur(amtOf(f)))}</button>`}
        <i class="ck"></i><button class="pe" data-pcfedit="${escHtml(f.id)}" title="Bearbeiten" aria-label="${escHtml(f.name)} bearbeiten">${SV.pen}</button></div>`;
    };
    let cells = "";
    for (let i = 0; i < first; i++) cells += `<div class="pcfd x"></div>`;
    for (let d = 1; d <= D; d++) {
      const fs = by[d] || [],
        s = sum(fs, amtOf),
        wd = (first + d - 1) % 7;
      cells += `<div class="pcfd ${d === today ? "today" : ""} ${wd > 4 ? "we" : ""}" data-pcfday="${d}"><div class="dh"><b>${pad(d)}</b>${s ? `<span>${escHtml(fmtEur0(s))}</span>` : ""}</div>${fs.map(chip).join("")}<button class="pcfadd" data-pcfnew="${d}" title="Fixkosten am ${d}. eintragen" aria-label="Fixkosten am ${d}. eintragen">${SV.plus}</button></div>`;
    }
    const wk = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((w) => `<span>${w}</span>`).join("");
    const soon =
      ym === cur
        ? all
            .filter((f) => !(f.id in paid))
            .map((f) => ({
              f,
              d: dayOf(f, ym),
            }))
            .filter((x) => x.d && x.d >= today && x.d <= today + 6)
        : [];
    const groups = {};
    for (const f of all) (groups[fixArea(f)] = groups[fixArea(f)] || []).push(f);
    const gl = Object.entries(groups)
      .sort((a, b) => sum(b[1], amtOf) - sum(a[1], amtOf))
      .map(([a, fs]) => {
        const p = fs.filter((f) => f.id in paid).length;
        return `<div class="gl" style="--c:${col(a)}"><span class="gi">${svgIcon(FIC[a] || "dots", 17)}</span><span class="gn"><span>${escHtml(a)}</span><i class="gb"><i style="width:${Math.round((p / fs.length) * 100)}%"></i></i></span><small>${p}/${fs.length}</small><b>${escHtml(fmtEur0(sum(fs, amtOf)))}</b></div>`;
      })
      .join("");
    const R = 50,
      C = 2 * Math.PI * R,
      pct = total ? pSum / total : 0;
    $("v-fix").classList.add("pcfcal");
    $("v-fix").innerHTML = `
      <div class="card pcfcalc">${
        fxAcctOn()
          ? `<div class="pcfleg"><span class="pcfseg" role="group" aria-label="${escHtml(uiText("fxa_col"))}"><button data-fxcol="bereich" aria-pressed="${!byAcc}">${escHtml(uiText("fxa_col"))}: ${escHtml(uiText("fxa_area"))}</button><button data-fxcol="konto" aria-pressed="${byAcc}">${escHtml(uiText("fxa_col"))}: ${escHtml(uiText("fxa_acct"))}</button></span>${
              byAcc
                ? fxAcctStats(ym)
                    .filter((x) => x.items.length || x.n === "Hauptkonto")
                    .map(
                      (x) =>
                        `<span class="pcfacc"><i style="background:${fxCol(x.n)}"></i>${escHtml(x.n)} · <b>${escHtml(fmtEur0(x.total))}</b></span>`
                    )
                    .join("")
                : ""
            }</div>`
          : ""
      }<div class="wd">${wk}</div><div class="grid">${cells}</div></div>
      <div class="pcfside">
        <div class="card pcfsum"><span class="small muted">Im ${escHtml(mName)} fest verplant</span><div class="big" data-v="${total}">${escHtml(fmtEur0(total))}</div>
          <div class="pcfring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="${R}" class="bg"/><circle cx="60" cy="60" r="${R}" class="fg" style="stroke-dasharray:${C.toFixed(1)};stroke-dashoffset:${(C * (1 - F.ring)).toFixed(1)}" data-to="${(C * (1 - pct)).toFixed(1)}"/></svg>
            <div><b>${escHtml(fmtEur0(pSum))}</b><span class="small muted">bezahlt · ${nPaid} von ${all.length}</span></div></div>
          <div class="kv"><span>Noch offen</span><b>${escHtml(fmtEur0(total - pSum))}</b></div>
          ${ym === cur ? `<div class="kv"><span>In den nächsten 7 Tagen</span><b>${soon.length ? `${soon.length} <span>Posten</span> · ${escHtml(fmtEur0(sum(soon, (x) => amtOf(x.f))))}` : "nichts"}</b></div>` : ""}
          <div class="row-btns">${all.length && nPaid < all.length ? `<button class="btn" id="payAll">Alle abhaken</button>` : ""}<button class="btn" id="fixEditBtn">Liste bearbeiten</button></div></div>
        ${gl ? `<div class="card pcfgr"><div class="small muted" style="margin-bottom:6px">Gruppen</div>${gl}</div>` : ""}
        <div class="card pcfnone" data-pcfday="0"><div class="small muted"><b>Ohne festen Tag</b> · <span>${none.length ? "auf einen Tag im Kalender ziehen" : "hierher ziehen, um den Tag zu entfernen"}</span></div>${none.map(chip).join("")}<button class="pcfadd wide" data-pcfnew="0">${SV.plus}<span>Neue Fixkosten</span></button></div>
        <div class="small muted pcfhint">Klick = abhaken · Stift = bearbeiten · Ziehen = Tag ändern · + im Tag = neu eintragen</div>
      </div>`;
    const calm = pcCalm(),
      root = $("v-fix");
    requestAnimationFrame(() => {
      const r = root.querySelector(".pcfring .fg");
      if (r) r.style.strokeDashoffset = r.dataset.to;
      F.ring = pct;
      if (!calm) {
        const q = (id) => root.querySelector(`[data-pcfid="${CSS.escape(id)}"]`);
        if (F.pop) {
          const el = q(F.pop);
          if (el) {
            el.animate(
              el.classList.contains("on")
                ? [
                    {
                      transform: "scale(1)",
                    },
                    {
                      transform: "scale(1.09)",
                    },
                    {
                      transform: "scale(1)",
                    },
                  ]
                : [
                    {
                      transform: "scale(.93)",
                    },
                    {
                      transform: "scale(1)",
                    },
                  ],
              {
                duration: 380,
                easing: BO,
              }
            );
            const k = el.querySelector(".ck");
            if (k && el.classList.contains("on"))
              k.animate(
                [
                  {
                    transform: "scale(0) rotate(-90deg)",
                  },
                  {
                    transform: "scale(1.25)",
                  },
                  {
                    transform: "none",
                  },
                ],
                {
                  duration: 420,
                  easing: BO,
                }
              );
          }
        }
        if (F.fresh) {
          const el = q(F.fresh);
          if (el) {
            el.animate(
              [
                {
                  opacity: 0,
                  transform: "translateY(-26px) scale(.7)",
                },
                {
                  opacity: 1,
                  transform: "translateY(3px) scale(1.03)",
                  offset: 0.7,
                },
                {
                  opacity: 1,
                  transform: "none",
                },
              ],
              {
                duration: 520,
                easing: E,
              }
            );
            const cell = el.closest(".pcfd,.pcfnone");
            if (cell)
              cell.animate(
                [
                  {
                    boxShadow: "inset 0 0 0 2px var(--accent)",
                  },
                  {
                    boxShadow: "inset 0 0 0 2px #1a7a5c00",
                  },
                ],
                {
                  duration: 900,
                  easing: "ease-out",
                }
              );
          }
        }
      }
      F.pop = null;
      F.fresh = null;
    });
  };
  const root = $("v-fix");
  // Intro
  function enter() {
    if (pcCalm() || !root.classList.contains("pcfcal")) return;
    const cells = [...root.querySelectorAll(".pcfd")],
      chips = [...root.querySelectorAll(".pcfcalc .pcfc")],
      side = [...root.querySelectorAll(".pcfside>*")];
    const cal = root.querySelector(".pcfcalc"),
      cols = 7;
    const ring = root.querySelector(".pcfring .fg"),
      bars = [...root.querySelectorAll(".pcfgr .gb>i")],
      big = root.querySelector(".pcfsum .big");
    if (cal)
      cal.animate(
        [
          {
            opacity: 0,
          },
          {
            opacity: 1,
          },
        ],
        {
          duration: 260,
          easing: "ease-out",
          fill: "backwards",
        }
      );
    {
      cells.forEach((el, i) => {
        const r = Math.floor(i / cols),
          c = i % cols;
        el.style.transformOrigin = "50% 0";
        el.animate(
          [
            {
              opacity: 0,
              transform: "perspective(700px) rotateX(-88deg)",
            },
            {
              opacity: 1,
              transform: "perspective(700px) rotateX(8deg)",
              offset: 0.7,
            },
            {
              opacity: 1,
              transform: "none",
            },
          ],
          {
            duration: 560,
            delay: 80 + r * 90 + c * 28,
            easing: E,
            fill: "backwards",
          }
        );
      });
      chips.forEach((el) => {
        const i = cells.indexOf(el.closest(".pcfd")),
          r = Math.floor(i / cols),
          c = i % cols;
        el.animate(
          [
            {
              opacity: 0,
              transform: "translateY(-14px) scale(.85)",
            },
            {
              opacity: 1,
              transform: "none",
            },
          ],
          {
            duration: 380,
            delay: 420 + r * 90 + c * 28,
            easing: BO,
            fill: "backwards",
          }
        );
      });
    }
    side.forEach((el, i) =>
      el.animate(
        [
          {
            opacity: 0,
            transform: "translateX(70px)",
          },
          {
            opacity: 1,
            transform: "none",
          },
        ],
        {
          duration: 520,
          delay: 120 + i * 90,
          easing: E,
          fill: "backwards",
        }
      )
    );
    if (ring) {
      const C = ring.style.strokeDasharray;
      ring.animate(
        [
          {
            strokeDashoffset: C,
          },
          {
            strokeDashoffset: ring.dataset.to,
          },
        ],
        {
          duration: 1100,
          delay: 350,
          easing: E,
          fill: "backwards",
        }
      );
    }
    bars.forEach((el, i) =>
      el.animate(
        [
          {
            width: "0%",
          },
          {
            width: el.style.width,
          },
        ],
        {
          duration: 800,
          delay: 450 + i * 70,
          easing: E,
          fill: "backwards",
        }
      )
    );
    if (big) {
      const to = Number(big.dataset.v) || 0,
        t0 = performance.now() + 250,
        txt = big.textContent;
      const step = (t) => {
        const k = Math.min(1, Math.max(0, (t - t0) / 900)),
          e = 1 - Math.pow(1 - k, 3);
        big.textContent = fmtEur0(to * e);
        if (k < 1) requestAnimationFrame(step);
        else big.textContent = txt;
      };
      requestAnimationFrame(step);
    }
  }
  new MutationObserver(() => {
    if (!root.hidden) requestAnimationFrame(enter);
  }).observe(root, {
    attributes: true,
    attributeFilter: ["hidden"],
  });
  // Abhaken
  root.addEventListener(
    "click",
    (e) => {
      const ed = e.target.closest("[data-pcfedit]");
      if (ed) {
        e.stopPropagation();
        e.preventDefault();
        popEdit(ed.dataset.pcfedit, ed.closest(".pcfc"));
        return;
      }
      const nw = e.target.closest("[data-pcfnew]");
      if (nw) {
        e.stopPropagation();
        e.preventDefault();
        popNew(+nw.dataset.pcfnew, nw);
        return;
      }
      const p = e.target.closest("[data-pay]");
      if (p && !e.target.closest("[data-fxamt],#fxAmtIn")) F.pop = p.dataset.pay;
    },
    true
  );
  root.addEventListener("contextmenu", (e) => {
    const c = e.target.closest(".pcfc");
    if (c) {
      e.preventDefault();
      popEdit(c.dataset.pcfid, c);
    }
  });
  root.addEventListener("keydown", (e) => {
    const p = e.target.closest && e.target.closest(".pcfc");
    if (!p || e.target !== p) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      p.click();
    } else if (e.key === "F2" || e.key === "e") {
      e.preventDefault();
      popEdit(p.dataset.pcfid, p);
    } else if (e.key === "Delete") {
      e.preventDefault();
      popEdit(p.dataset.pcfid, p, true);
    }
  });
  // Ziehen
  let ghost = null;
  root.addEventListener("dragstart", (e) => {
    const c = e.target.closest && e.target.closest(".pcfc");
    if (!c) return;
    if (e.target.closest("input,textarea,select") || c.querySelector("#fxAmtIn")) {
      e.preventDefault();
      return;
    }
    popClose();
    F.drag = c.dataset.pcfid;
    e.dataTransfer.effectAllowed = "move";
    try {
      e.dataTransfer.setData("text/plain", F.drag);
    } catch (_) {}
    ghost = c.cloneNode(true);
    ghost.classList.add("pcfghost");
    ghost.style.width = c.offsetWidth + "px";
    document.body.appendChild(ghost);
    try {
      e.dataTransfer.setDragImage(ghost, 24, 18);
    } catch (_) {}
    const id = F.drag;
    setTimeout(() => {
      if (F.drag !== id) return;
      c.classList.add("drag");
      root.classList.add("dragging");
    }, 0);
  });
  const unDrag = () => {
    F.drag = null;
    if (ghost) {
      ghost.remove();
      ghost = null;
    }
    document.querySelectorAll(".pcfghost").forEach((x) => x.remove());
    root.classList.remove("dragging");
    root.querySelectorAll(".drag,.over").forEach((x) => x.classList.remove("drag", "over"));
    root.querySelectorAll(".pcfc,.pcfadd").forEach((x) => {
      if (x.style.pointerEvents === "none" && !x.getAnimations().length) x.style.pointerEvents = "";
    });
  };
  root.addEventListener("dragend", unDrag);
  document.addEventListener(
    "mousedown",
    () => {
      if (F.drag || root.classList.contains("dragging")) unDrag();
    },
    true
  );
  const wake = () => {
    if (document.visibilityState === "hidden") return;
    unDrag();
    if (!pop.hidden) {
      const a = document.activeElement;
      if (!a || a === document.body || !pop.contains(a)) {
        const i = pop.querySelector("input,select");
        if (i)
          i.focus({
            preventScroll: true,
          });
      }
    }
  };
  addEventListener("focus", wake);
  document.addEventListener("visibilitychange", wake);
  root.addEventListener("dragover", (e) => {
    if (!F.drag) return;
    const d = e.target.closest("[data-pcfday]");
    if (!d || d.classList.contains("x")) return;
    e.preventDefault();
    root.querySelectorAll(".over").forEach((x) => x !== d && x.classList.remove("over"));
    d.classList.add("over");
  });
  root.addEventListener("dragleave", (e) => {
    const d = e.target.closest("[data-pcfday]");
    if (d && !d.contains(e.relatedTarget)) d.classList.remove("over");
  });
  root.addEventListener("drop", async (e) => {
    const d = e.target.closest("[data-pcfday]"),
      id = F.drag;
    if (!d || !id) return;
    e.preventDefault();
    F.drag = null;
    const f = store.fixed.find((x) => x.id === id);
    if (!f) return;
    const n = +d.dataset.pcfday,
      ym = ui.ym;
    if ((dayOf(f, ym) || 0) === n) {
      renderFix();
      return;
    }
    const before = clean(f),
      data = clean(f);
    data.days = withDay(f, ym, n);
    delete data.day;
    F.fresh = id;
    if (await safe(() => saveDoc("fixed", id, data)))
      toast(
        n ? `${f.name}: ab ${monthName(ym)} am ${n}.` : `${f.name}: ohne festen Tag`,
        () => safe(() => saveDoc("fixed", id, before)),
        "Rückgängig"
      );
  });
  // Editor
  const pop = document.createElement("div");
  pop.id = "pcfPop";
  pop.className = "pcfpop";
  pop.hidden = true;
  document.body.appendChild(pop);
  let popFor = null;
  function place(anchor) {
    const r = anchor.getBoundingClientRect(),
      w = pop.offsetWidth,
      h = pop.offsetHeight;
    let x = r.left + r.width / 2 - w / 2,
      yy = r.bottom + 10,
      up = false;
    x = Math.max(12, Math.min(innerWidth - w - 12, x));
    if (yy + h > innerHeight - 50) {
      yy = r.top - h - 10;
      up = true;
    }
    pop.style.left = x + "px";
    pop.style.top = Math.max(12, yy) + "px";
    pop.style.setProperty("--ax", r.left + r.width / 2 - x + "px");
    pop.classList.toggle("up", up);
    if (!pcCalm())
      pop.animate(
        [
          {
            opacity: 0,
            transform: `translateY(${up ? 8 : -8}px) scale(.92)`,
          },
          {
            opacity: 1,
            transform: "none",
          },
        ],
        {
          duration: 260,
          easing: BO,
        }
      );
  }
  let popGen = 0;
  function popClose() {
    if (pop.hidden) return;
    const g = ++popGen,
      done = () => {
        if (g !== popGen) return;
        pop.hidden = true;
        pop.innerHTML = "";
        popFor = null;
      };
    if (pcCalm()) return done();
    pop.animate(
      [
        {
          opacity: 1,
          transform: "none",
        },
        {
          opacity: 0,
          transform: "scale(.94)",
        },
      ],
      {
        duration: 150,
        easing: "ease-in",
      }
    ).onfinish = done;
  }
  const field = (lbl, inner) => `<label class="pf"><span>${lbl}</span>${inner}</label>`;
  function form(f, day) {
    const ym = ui.ym,
      mon = monthName(ym),
      D = daysIn(ym);
    return `<div class="ph"><b>${f ? escHtml(f.name) : "Neue Fixkosten"}</b><button class="px" data-pfx aria-label="Schließen">${SV.x}</button></div>
      ${field("Name", `<input class="in" data-pf="name" value="${f ? escHtml(f.name) : ""}" placeholder="z. B. Miete, Netflix, Versicherung" autocomplete="off">`)}
      <div class="pr2">${field(`Betrag ab ${escHtml(mon)}`, `<input class="in" data-pf="amount" inputmode="decimal" value="${f ? escHtml(numStr(listAmt(f, ym))) : ""}" placeholder="0,00">`)}
        ${field(
          "Tag",
          `<select class="in" data-pf="day"><option value="0">ohne</option>${Array.from(
            {
              length: D,
            },
            (_, i) => `<option value="${i + 1}" ${day === i + 1 ? "selected" : ""}>${i + 1}.</option>`
          ).join("")}</select>`
        )}</div>
      <div class="pr2">${field(
        "Rhythmus",
        `<select class="in" data-pf="rhythm">${RHYTHMS.filter((r) => r[0] !== "monate")
          .map(
            ([k, l]) => `<option value="${k}" ${((f && f.rhythm) || "monatlich") === k ? "selected" : ""}>${l}</option>`
          )
          .join(
            ""
          )}${f && f.rhythm === "monate" ? `<option value="monate" selected>Bestimmte Monate</option>` : ""}</select>`
      )}
        ${field("Art", `<select class="in" data-pf="kind"><option value="privat" ${!f || f.kind !== "betrieb" ? "selected" : ""}>Privat</option><option value="betrieb" ${f && f.kind === "betrieb" ? "selected" : ""}>Betrieblich</option></select>`)}</div>
      ${field(escHtml(uiText("fxa_from")), `<select class="in" data-pf="acct">${[...new Set([...(kaNames().length ? kaNames() : ["Hauptkonto"]), f ? fxAcct(f) : "Hauptkonto"])].map((n) => `<option value="${escHtml(n)}" ${(f ? fxAcct(f) : "Hauptkonto") === n ? "selected" : ""}>${escHtml(n)}</option>`).join("")}<option value="__new">+ ${escHtml(uiText("fxa_new"))} …</option></select><input class="in" data-pf="acctnew" placeholder="${escHtml(uiText("fxa_new_ph"))}" maxlength="40" hidden style="margin-top:6px">`)}
      ${(() => {
        const a = (f && aboCfg()[f.id]) || {};
        return `<div class="pfsec">Vertrag <small>(optional – Erinnerung 30 Tage vor der Frist)</small></div><div class="pr2">${field("Läuft bis", `<input class="in" type="date" data-pf="aboend" value="${escHtml(a.end || "")}">`)}${field("Kündigungsfrist", `<select class="in" data-pf="abonot">${ABO_NOT.map(([v, l]) => `<option value="${v}" ${Number(a.notice || 0) === v ? "selected" : ""}>${l}</option>`).join("")}</select>`)}</div>`;
      })()}
      <div class="small muted pnote">${f ? `Änderungen gelten ab ${escHtml(mon)} – frühere Monate bleiben, wie sie waren.` : `Gilt ab ${escHtml(mon)} für alle folgenden Monate.`}</div>
      <div class="pa">${f ? `<button class="btn pdel" data-pfdel>${SV.bin}<span>Löschen</span></button>` : ""}<span style="flex:1"></span><button class="btn" data-pfx>Abbrechen</button><button class="btn primary" data-pfok>${f ? "Speichern" : "Eintragen"}</button></div>`;
  }
  function popEdit(id, anchor, del) {
    const f = store.fixed.find((x) => x.id === id);
    if (!f || !anchor) return;
    popGen++;
    pop.getAnimations().forEach((a) => a.cancel());
    popFor = {
      id,
      anchor,
    };
    pop.innerHTML = form(f, dayOf(f, ui.ym));
    pop.hidden = false;
    place(anchor);
    const el = pop.querySelector(del ? "[data-pfdel]" : "[data-pf=name]");
    if (el) {
      el.focus();
      if (el.select) el.select();
    }
  }
  const seg = (m) =>
    `<div class="rfseg"><button class="${m === "fix" ? "on" : ""}" data-pfmode="fix">📅 Fixkosten</button><button class="${m === "rate" ? "on rate" : ""}" data-pfmode="rate">🏦 Rate / Schulden</button></div>`;
  function newHtml(day, m) {
    if (m === "rate")
      return `<div class="ph"><b>Neue Rate</b><button class="px" data-pfx aria-label="Schließen">${SV.x}</button></div>${seg(m)}<div class="rfroot">${rateFormHtml(day)}</div>
      <div class="pa"><span style="flex:1"></span><button class="btn" data-pfx>Abbrechen</button><button class="btn primary rfgo" data-pfok>Rate anlegen</button></div>`;
    return form(null, day).replace("</div>", "</div>" + seg(m));
  }
  function popNew(day, anchor, m) {
    if (!anchor) return;
    popGen++;
    pop.getAnimations().forEach((a) => a.cancel());
    popFor = {
      id: null,
      day,
      anchor,
      mode: m || "fix",
    };
    pop.innerHTML = newHtml(day, popFor.mode);
    pop.hidden = false;
    place(anchor);
    const i = pop.querySelector("[data-pf=name],[data-rf=name]");
    if (i) i.focus();
  }
  const val = (k) => {
    const el = pop.querySelector(`[data-pf="${k}"]`);
    return el ? el.value : "";
  };
  function fxAcctPick() {
    const ac = pop.querySelector("[data-pf=acct]");
    if (!ac) return null;
    if (ac.value !== "__new") return ac.value || "Hauptkonto";
    const n = (pop.querySelector("[data-pf=acctnew]").value || "").trim();
    if (!n) return "Hauptkonto";
    const ex = kaAll().find((x) => normText(x) === normText(n));
    if (ex) return ex;
    store.settings.spaces = [...(store.settings.spaces || []), n];
    saveSettings();
    return n;
  }
  async function popSave() {
    if (popFor && !popFor.id && popFor.mode === "rate") {
      const r = rateRead(pop),
        err = rateCheck(r);
      if (err) {
        toast(err);
        return;
      }
      popClose();
      const n = await rateCreate(r);
      if (n) toast(`${n} als Rate eingetragen`);
      return;
    }
    const ym = ui.ym,
      name = val("name").trim(),
      v = parseAmt(val("amount") || "0"),
      day = +val("day") || 0,
      rh = val("rhythm"),
      kind = val("kind");
    if (!name) {
      const n = pop.querySelector("[data-pf=name]");
      n.focus();
      if (!pcCalm())
        n.animate(
          [
            {
              transform: "translateX(0)",
            },
            {
              transform: "translateX(-6px)",
            },
            {
              transform: "translateX(6px)",
            },
            {
              transform: "translateX(-3px)",
            },
            {
              transform: "none",
            },
          ],
          {
            duration: 300,
          }
        );
      return;
    }
    if (!(v >= 0)) {
      toast("Betrag ungültig");
      return;
    }
    const nv = round2(v),
      cm = Number(ym.slice(5, 7));
    if (!popFor.id) {
      const id = newId(),
        d = {
          name,
          amount: nv,
          kind,
          order: store.fixed.length,
          from: ym,
          days: [
            {
              from: ym,
              day,
            },
          ],
        };
      {
        const ac = fxAcctPick();
        if (ac && ac !== "Hauptkonto") d.acct = ac;
      }
      if (rh !== "monatlich") {
        d.rhythm = rh;
        d.months = rhythmMonths(rh, cm);
      }
      F.fresh = id;
      const ae = val("aboend"),
        an = Number(val("abonot")) || 0;
      popClose();
      if (ae || an) {
        store.settings.abos = {
          ...(store.settings.abos || {}),
          [id]: {
            end: ae,
            notice: an,
          },
        };
        saveSettings();
      }
      if (await safe(() => saveDoc("fixed", id, d)))
        toast(`${name} eingetragen`, () => safe(() => deleteDoc("fixed", id)), "Rückgängig");
      return;
    }
    const f = store.fixed.find((x) => x.id === popFor.id);
    if (!f) {
      popClose();
      return;
    }
    {
      const ae = val("aboend"),
        an = Number(val("abonot")) || 0,
        A = {
          ...(store.settings.abos || {}),
        },
        o = A[f.id] || {};
      if ((o.end || "") !== ae || Number(o.notice || 0) !== an) {
        if (ae || an || o.abo)
          A[f.id] = {
            ...o,
            end: ae,
            notice: an,
          };
        else delete A[f.id];
        store.settings.abos = A;
        saveSettings();
      }
    }
    const before = clean(f),
      d = clean(f);
    d.name = name;
    d.kind = kind;
    {
      const ac = fxAcctPick();
      if (ac) {
        if (ac !== "Hauptkonto") d.acct = ac;
        else delete d.acct;
      }
    }
    if (Math.abs(nv - listAmt(f, ym)) > 0.004) {
      const np = withPrice(f, ym, nv);
      d.amount = np.amount;
      if (np.prices) d.prices = np.prices;
      else delete d.prices;
    }
    if ((dayOf(f, ym) || 0) !== day) {
      d.days = withDay(f, ym, day);
      delete d.day;
    }
    if (rh !== (f.rhythm || "monatlich")) {
      if (rh === "monatlich") {
        delete d.rhythm;
        delete d.months;
      } else if (rh !== "monate") {
        d.rhythm = rh;
        d.months = rhythmMonths(rh, Array.isArray(f.months) && f.months.length ? Math.min(...f.months) : cm);
      }
    }
    F.fresh = f.id;
    popClose();
    if (await safe(() => saveDoc("fixed", f.id, d)))
      toast(`${name} gespeichert`, () => safe(() => saveDoc("fixed", f.id, before)), "Rückgängig");
  }
  async function popDelete() {
    const f = store.fixed.find((x) => x.id === popFor.id);
    if (!f) return popClose();
    const ym = ui.ym,
      before = clean(f),
      anchor = popFor.anchor;
    const used =
      Object.keys(store.months).some(
        (k) => k < ym && store.months[k] && store.months[k].paid && f.id in store.months[k].paid
      ) ||
      (f.from && f.from < ym);
    popClose();
    const ticks = Object.keys(store.months)
      .filter((k) => k >= ym && store.months[k] && store.months[k].paid && f.id in store.months[k].paid)
      .map((k) => [k, clone(store.months[k])]);
    const unTick = async () => {
      for (const [k, mo] of ticks) {
        const n = clone(mo);
        delete n.paid[f.id];
        await saveDoc("months", k, n);
      }
    };
    const reTick = async () => {
      for (const [k, mo] of ticks) await saveDoc("months", k, mo);
    };
    const go = async () => {
      if (used) {
        const d = clean(f);
        d.until = shiftYm(ym, -1);
        if (
          await safe(async () => {
            await unTick();
            await saveDoc("fixed", f.id, d);
          })
        )
          toast(
            `${f.name} ab ${monthName(ym)} gelöscht`,
            () =>
              safe(async () => {
                await saveDoc("fixed", f.id, before);
                await reTick();
              }),
            "Rückgängig"
          );
      } else if (
        await safe(async () => {
          await unTick();
          await deleteDoc("fixed", f.id);
        })
      )
        toast(
          `${f.name} gelöscht`,
          () =>
            safe(async () => {
              await saveDoc("fixed", f.id, before);
              await reTick();
            }),
          "Rückgängig"
        );
    };
    if (anchor && anchor.isConnected && !pcCalm()) {
      anchor.style.pointerEvents = "none";
      const a = anchor.animate(
        [
          {
            opacity: 1,
            transform: "none",
            filter: "blur(0)",
          },
          {
            opacity: 0.9,
            transform: "scale(1.06)",
            offset: 0.25,
          },
          {
            opacity: 0,
            transform: "scale(.3) rotate(-8deg)",
            filter: "blur(3px)",
          },
        ],
        {
          duration: 380,
          easing: "cubic-bezier(.5,0,.75,0)",
          fill: "forwards",
        }
      );
      a.onfinish = go;
    } else go();
  }
  pop.addEventListener("click", (e) => {
    e.stopPropagation();
    if (e.target.closest("[data-pfx]")) return popClose();
    const pm = e.target.closest("[data-pfmode]");
    if (pm && popFor && !popFor.id) {
      popFor.mode = pm.dataset.pfmode;
      pop.innerHTML = newHtml(popFor.day, popFor.mode);
      place(popFor.anchor);
      const i = pop.querySelector("[data-pf=name],[data-rf=name]");
      if (i) i.focus();
      return;
    }
    if (e.target.closest("[data-pfok]")) return popSave();
    const db = e.target.closest("[data-pfdel]");
    if (db) {
      if (db.classList.contains("arm")) return popDelete();
      db.classList.add("arm");
      db.querySelector("span").textContent = "Wirklich löschen?";
      setTimeout(() => {
        if (db.isConnected) {
          db.classList.remove("arm");
          db.querySelector("span").textContent = "Löschen";
        }
      }, 3500);
    }
  });
  pop.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      popClose();
    } else if (e.key === "Enter" && e.target.tagName !== "BUTTON") {
      e.preventDefault();
      popSave();
    }
  });
  document.addEventListener(
    "mousedown",
    (e) => {
      if (!pop.hidden && !pop.contains(e.target) && !e.target.closest("[data-pcfedit],[data-pcfnew]")) popClose();
    },
    true
  );
  addEventListener("resize", () => popClose());
  document.addEventListener(
    "scroll",
    () => {
      if (!pop.hidden && popFor && popFor.anchor && popFor.anchor.isConnected) {
        const r = popFor.anchor.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) popClose();
      }
    },
    true
  );
}

/* Buchungen */
if (IS_PC) {
  const root = $("v-list"),
    E = "cubic-bezier(.2,.8,.2,1)",
    BO = "cubic-bezier(.3,1.5,.5,1)";
  const vis = (el) => {
    const r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < innerHeight && r.width > 0;
  };
  function enter() {
    if (pcCalm()) return;
    const tops = [...root.children].filter((x) => x !== $("listCard") && x.id !== "pcDet" && !x.hidden && vis(x));
    const cols = [...root.querySelectorAll(".pccol")],
      det = $("pcDet");
    tops.forEach((el, i) =>
      el.animate(
        [
          {
            opacity: 0,
            transform: "translateY(-16px)",
          },
          {
            opacity: 1,
            transform: "none",
          },
        ],
        {
          duration: 380,
          delay: i * 50,
          easing: E,
          fill: "backwards",
        }
      )
    );
    cols.forEach((c, ci) => {
      const days = [...c.querySelectorAll(":scope>.pcday")].filter(vis);
      days.forEach((d, di) => {
        {
          const r = d.getBoundingClientRect(),
            dx = innerWidth * 0.5 - (r.left + r.width / 2),
            dy = innerHeight - r.top;
          d.animate(
            [
              {
                opacity: 0,
                transform: `translate(${dx}px,${dy}px) rotate(${(di + ci) % 2 ? 14 : -14}deg) scale(.7)`,
              },
              {
                opacity: 1,
                offset: 0.3,
              },
              {
                opacity: 1,
                transform: "translateY(-6px) rotate(0) scale(1.02)",
                offset: 0.85,
              },
              {
                opacity: 1,
                transform: "none",
              },
            ],
            {
              duration: 700,
              delay: 80 + (di * cols.length + ci) * 55,
              easing: "cubic-bezier(.3,.7,.3,1)",
              fill: "backwards",
            }
          );
        }
      });
    });
    {
      const n =
          cols.reduce((m, c) => Math.max(m, [...c.querySelectorAll(":scope>.pcday")].filter(vis).length), 0) *
          cols.length,
        t = 80 + n * 55 + 700;
      root.querySelectorAll(".pchl").forEach((h) =>
        h.animate(
          [
            {
              opacity: 0,
            },
            {
              opacity: 0,
              offset: 0.8,
            },
            {
              opacity: 1,
            },
          ],
          {
            duration: t + 250,
            easing: "ease-out",
          }
        )
      );
    }
    if (det && vis(det)) {
      det.animate(
        [
          {
            opacity: 0,
            transform: "translateX(80px)",
          },
          {
            opacity: 1,
            transform: "none",
          },
        ],
        {
          duration: 560,
          delay: 180,
          easing: E,
          fill: "backwards",
        }
      );
      const paper = det.querySelector(".paper");
      if (paper)
        paper.animate(
          [
            {
              transform: "translateY(-102%)",
            },
            {
              transform: "none",
            },
          ],
          {
            duration: 1100,
            delay: 600,
            easing: "cubic-bezier(.35,.6,.3,1)",
            fill: "backwards",
          }
        );
    }
  }
  new MutationObserver(() => {
    if (!root.hidden) requestAnimationFrame(enter);
  }).observe(root, {
    attributes: true,
    attributeFilter: ["hidden"],
  });
}

/* Einkauf */
if (IS_PC) {
  const root = $("v-shop"),
    E = "cubic-bezier(.2,.8,.2,1)",
    BO = "cubic-bezier(.3,1.5,.5,1)";
  const CATN = {
    super: "Supermarkt",
    disc: "Discounter",
    drog: "Drogerie & Apotheke",
    kleid: "Kleidung",
    elek: "Elektronik",
    bau: "Baumarkt",
    moebel: "Möbel",
    tier: "Tierbedarf",
    online: "Online",
  };
  const badge = (sh) =>
    brandBadge({
      t: sh.name.replace(/ .*/, "").slice(0, 1),
      bg: sh.color,
      ink: sh.ink || "#fff",
      domain: SHOP_DOMAINS[sh.id] || "",
    });
  const shopBy = (id) => SHOPS.find((x) => x.id === id);
  const list = () => store.settings.shoplist || [];
  const chosen = () => (store.settings.shops || []).map(shopBy).filter(Boolean);
  const K = {
    fresh: null,
    gone: null,
    swap: false,
    prev: "",
  };
  function bestFor(name) {
    const tk = priceToks(name);
    if (!tk.length) return null;
    const mine = new Set(store.settings.shops || []),
      by = {};
    for (const e of store.settings.pricebook || [])
      if (sameProduct(tk, priceToks(e.n))) {
        if (!by[e.s] || by[e.s].d <= e.d) by[e.s] = e;
      }
    const td = isoToday();
    for (const d of store.settings.deals || [])
      if ((!d.until || d.until >= td) && d.price && sameProduct(tk, priceToks(d.text))) {
        if (!by[d.shop] || d.price < by[d.shop].p)
          by[d.shop] = {
            s: d.shop,
            p: d.price,
            deal: true,
          };
      }
    const all = Object.values(by).filter((x) => shopBy(x.s));
    if (!all.length) return null;
    all.sort((a, b) => mine.has(b.s) - mine.has(a.s) || a.p - b.p);
    const pool = all.filter((x) => mine.has(x.s)).length ? all.filter((x) => mine.has(x.s)) : all,
      best = pool.slice().sort((a, b) => a.p - b.p)[0],
      worst = pool.slice().sort((a, b) => b.p - a.p)[0];
    return {
      s: best.s,
      p: best.p,
      save: worst.p - best.p,
      deal: !!best.deal,
    };
  }
  const where = (it) => {
    if (it.s)
      return {
        s: it.s,
        p: it.p != null ? it.p : null,
        manual: true,
      };
    return bestFor(it.n);
  };
  function saveList(l) {
    zSave(l);
  }
  function renderShopPC() {
    const ch = chosen();
    if (!ch.length) {
      root.classList.remove("pcshop");
      root.innerHTML = `<div class="pcsnone">${zettelCard()}${typeof shopAvgCard === "function" ? shopAvgCard() : ""}${offersCard()}</div>`;
      return;
    }
    const cats = [...new Set(ch.map((x) => x.cat))];
    if (ui.shopCat && !cats.includes(ui.shopCat)) ui.shopCat = "";
    const shown = ui.shopCat ? ch.filter((x) => x.cat === ui.shopCat) : ch;
    if (!ch.some((x) => x.id === ui.shopSel)) ui.shopSel = ch[0].id;
    const stats = Object.fromEntries(shopStats().map((o) => [o.shop.id, o])),
      mx = Math.max(1, ...ch.map((x) => (stats[x.id] || {}).sum || 0));
    const L = list(),
      W = L.map((it) => ({
        it,
        w: where(it),
      }));
    const left = `<div class="card pcsl"><div class="pcslh"><b>Deine Läden</b><span class="small muted">Ø im Monat</span></div>
      ${cats.length > 1 ? `<div class="pcscats">${[["", "Alle"], ...cats.map((c) => [c, CATN[c] || c])].map(([c, l]) => `<button class="${(ui.shopCat || "") === c ? "on" : ""}" data-pcscat="${c}">${escHtml(l)}</button>`).join("")}</div>` : ""}
      <div class="pcsls">${shown
        .map((sh) => {
          const st = stats[sh.id] || {
              sum: 0,
              count: 0,
            },
            nd = shopDeals(sh.id).length,
            nz = W.filter((x) => !x.it.done && x.w && x.w.s === sh.id).length;
          return `<button class="pcsli ${sh.id === ui.shopSel ? "on" : ""}" data-pcshop="${sh.id}" style="--c:${sh.color}">${badge(sh)}<span class="pcstx"><b>${escHtml(sh.name)}</b><small>${escHtml(CATN[sh.cat] || "")}</small><i class="bar"><i style="width:${Math.round((st.sum / mx) * 100)}%"></i></i></span><span class="r"><b>${escHtml(fmtEur0(st.sum / 6))}</b>${nd || nz ? `<small>${nd ? `${svgIcon("tag", 12)}${nd}` : ""}${nz ? `${svgIcon("list", 12)}${nz}` : ""}</small>` : ""}</span></button>`;
        })
        .join("")}</div>
      <button class="pcsadd" data-go="more" data-scroll="shopEd">+ Läden auswählen</button></div>`;
    const sh = shopBy(ui.shopSel),
      st = stats[sh.id] || {
        sum: 0,
        count: 0,
        last: "",
      };
    const deals = shopDeals(sh.id),
      prices = shopPrices(sh.id),
      name = (n) => n.charAt(0).toUpperCase() + n.slice(1);
    const recent = store.tx
      .filter((t) => t.kind === "ausgabe" && sh.re.test(normText(t.note)))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 6);
    const rmax = Math.max(1, ...recent.map((t) => t.amount)),
      mine = W.filter((x) => x.w && x.w.s === sh.id);
    const canWeb = !!((window.AndroidBridge && window.AndroidBridge.pageOpen) || window.pcPageDemo),
      web = canWeb || !!(K.pg && K.PG.open && K.PG.embed);
    const det = web
      ? `<div class="card pcsweb" id="pcsWeb" style="--c:${sh.color}"></div>`
      : `<div class="card pcsd" style="--c:${sh.color};--k:${sh.ink || "#fff"}">
      <div class="pcsdh"><div class="lg">${badge(sh)}</div><div class="grow"><h2>${escHtml(sh.name)}</h2><span class="small muted">${escHtml(CATN[sh.cat] || "")} · ${escHtml(
        st.count
          ? uiText(st.count === 1 ? "sh_stat1" : "sh_stat", {
              a: fmtEur0(st.sum / 6),
              n: String(st.count),
            }) +
              (st.last
                ? " · " +
                  uiText("sh_last", {
                    d: fxDate(st.last, {
                      day: "numeric",
                      month: "short",
                    }),
                  })
                : "")
          : uiText("sh_none")
      )}</span></div>
        <button class="btn primary" data-openshop="${escHtml(sh.url)}">${shopBtnLbl(sh)}</button></div>
      <div class="pcsdc"><div>
        <div class="ssh">Gemerkte Angebote</div>
        ${deals.map((d) => `<div class="pccp"><div class="grow"><b>${escHtml(d.text)}</b><small class="muted">${d.until ? `bis ${escHtml(shortDate(d.until))}` : "ohne Datum"}</small></div>${d.price ? `<b class="pp">${escHtml(fmtEur(d.price))}</b>` : ""}<button class="x" data-dealdel="${escHtml(d.id)}" aria-label="Angebot löschen">×</button></div>`).join("")}
        ${ui.dealAdd === sh.id ? `<div class="pccp form"><input class="in" id="dealText" placeholder="Was? z. B. Kaffee 500 g" aria-label="Was"><div class="pr2"><input class="in" id="dealPrice" inputmode="decimal" placeholder="Preis €" aria-label="Preis"><input class="in" type="date" id="dealUntil" value="${escHtml(nextSat())}" aria-label="Bis wann"></div><div class="pa"><button class="btn" data-dealcancel>Abbrechen</button><button class="btn primary" data-dealsave="${escHtml(sh.id)}">Merken</button></div></div>` : `<button class="pccp add" data-dealadd="${escHtml(sh.id)}">+ Angebot merken</button>`}
        ${
          mine.length
            ? `<div class="ssh" style="margin-top:20px">Auf deinem Zettel</div>${mine
                .map(
                  ({ it, w }) =>
                    `<div class="pczr ${it.done ? "done" : ""}"><span>${escHtml(it.n)}</span>${w.p != null ? `<b>${escHtml(fmtEur(w.p))}</b>` : ""}</div>`
                )
                .join("")}`
            : ""
        }
      </div><div>
        ${
          prices.length
            ? `<div class="ssh">Deine Preise hier <span class="muted">· aus Quittungen</span></div>
          ${prices
            .map(
              (x) =>
                `<div class="pcpr"><span class="grow"><b>${escHtml(name(x.w))}</b>${
                  x.best
                    ? `<small class="warn">bei ${escHtml(
                        (
                          shopBy(x.best.s) || {
                            name: x.best.s,
                          }
                        ).name
                      )} ${escHtml(fmtEur(x.best.p))}</small>`
                    : x.cheapest
                      ? `<small class="pos">hier am günstigsten</small>`
                      : ""
                }</span><b>${escHtml(fmtEur(x.e.p))}</b></div>`
            )
            .join("")}`
            : ""
        }
        <div class="ssh" ${prices.length ? 'style="margin-top:20px"' : ""}>Letzte Einkäufe</div>
        ${
          recent.length
            ? `<div class="pcbars">${recent
                .slice()
                .reverse()
                .map(
                  (t) =>
                    `<div><span class="v">${escHtml(fmtEur0(t.amount))}</span><i style="height:${Math.max(6, Math.round((t.amount / rmax) * 100))}%"></i><small>${escHtml(shortDate(t.date))}</small></div>`
                )
                .join("")}</div>`
            : `<div class="small muted">Hier hast du in letzter Zeit nichts gekauft.</div>`
        }
      </div></div></div>`;
    const open = W.filter((x) => !x.it.done),
      done = W.filter((x) => x.it.done),
      groups = {};
    for (const x of open) {
      const k = x.w ? x.w.s : "";
      (groups[k] = groups[k] || []).push(x);
    }
    const save = sum(open, (x) => (x.w && x.w.save > 0 ? x.w.save * shopQty(x.it) : 0)),
      est = sum(open, (x) => (x.w && x.w.p ? x.w.p * shopQty(x.it) : 0));
    const opts = (id) =>
      `<option value="">automatisch</option>${ch.map((o) => `<option value="${o.id}" ${o.id === id ? "selected" : ""}>${escHtml(o.name)}</option>`).join("")}`;
    const row = ({ it, w }) => {
      const so = w && shopBy(w.s);
      return `<div class="pczi ${it.done ? "done" : ""}" data-pczi="${escHtml(it.id)}"><button class="cb" data-pczck="${escHtml(it.id)}" aria-label="${escHtml(it.n)} ${it.done ? "wieder offen" : "erledigt"}"></button><label class="pczq" title="Menge ändern"><input type="number" min="1" max="99" value="${shopQty(it)}" data-pczq="${escHtml(it.id)}" aria-label="Menge ${escHtml(it.n)}"><span>x</span></label><span class="n">${escHtml(it.n)}</span>
        <button class="ws" data-zpick="${escHtml(it.id)}" title="Laden ändern" aria-label="Laden für ${escHtml(it.n)} wählen">${so ? badge(so) : `<span class="q">?</span>`}</button>
        <b class="p">${w && w.p != null ? escHtml(fmtEur(w.p * shopQty(it))) : ""}</b>${it.done && it.by && zTrip() ? zWho(it.by, 18) : ""}${it.extra ? `<span class="zdaz">DAZU</span>` : ""}<button class="del" data-pczdel="${escHtml(it.id)}" aria-label="${escHtml(it.n)} löschen">×</button></div>`;
    };
    const tab = ui.pczTab || "zettel",
      nd = deals.length;
    const pickCard = `${web && K.pick ? (K.pick.busy ? `<div class="pcwpick busy"><i class="sp"></i><span>Text wird erkannt …</span></div>` : `<div class="pcwpick"><div class="ssh">Erkannt – stimmt das?</div>${K.pick.raw ? `<div class="small muted pkraw">Gelesen: ${escHtml(K.pick.raw)}</div>` : ""}<input class="in" id="pkN" value="${escHtml(K.pick.n || "")}" placeholder="Was?" aria-label="Was"><div class="pr2"><input class="in" id="pkP" inputmode="decimal" value="${K.pick.p != null ? escHtml(Number(K.pick.p).toFixed(2).replace(".", ",")) : ""}" placeholder="Preis €" aria-label="Preis"><input class="in" type="date" id="pkU" value="${escHtml(K.pick.u || nextSat())}" aria-label="Bis wann"></div><div class="pa"><button class="btn" data-pkx>Verwerfen</button><button class="btn" data-pkok="deal">Als Angebot</button><button class="btn primary" data-pkok="zettel">Auf den Zettel</button></div></div>`) : ""}`;
    const tabs = `<div class="pcztabs" role="tablist">${[
      ["zettel", "Zettel"],
      ["deals", `Angebote${nd ? ` (${nd})` : ""}`],
      ["buys", "Einkäufe"],
    ]
      .map(
        ([k, l]) =>
          `<button role="tab" data-pcztab="${k}" class="${tab === k ? "on" : ""}" aria-selected="${tab === k}">${l}</button>`
      )
      .join("")}</div>`;
    const T = zTrip(),
      tripBox = T
        ? (() => {
            const devs = T.devs || [],
              all = list();
            const part = (d) => {
              const mine = all.filter((it) => {
                  const s0 = (where(it) || {}).s || "";
                  return (T.assign || {})[s0] === d.id || !(T.assign || {})[s0] || it.by === d.id;
                }),
                dn = mine.filter((it) => it.done && (it.by === d.id || devs.length <= 1)).length;
              return `<div class="pcztd">${zWho(d.id, 20)}<b>${escHtml(zDevName(d.id))}</b><i class="pcztp"><i style="width:${mine.length ? Math.round((dn / mine.length) * 100) : 0}%;background:${zDevCol(d.id)}"></i></i><small>${(T.fin || {})[d.id] ? "fertig ✓" : `${dn}/${mine.length}`}</small></div>`;
            };
            return `<div class="pcztrip"><div class="pczth"><b>🛒 Einkauf läuft …</b><button class="btn" data-pcztripx>Abbrechen</button></div>${devs.map(part).join("")}<div class="small muted">Was du jetzt dazuschreibst, erscheint auf dem Handy oben mit „NEU“.</div></div>`;
          })()
        : "";
    const zBody = `${tripBox}<div class="pczact">${T ? "" : `<button class="btn primary" data-pczsend title="Der Zettel geht auf deine gekoppelten Handys – dort wird eingekauft">${svgIcon("phone", 16)} Einkauf starten</button>`}<button class="btn" data-pczpdf title="Als PDF speichern">📄 PDF</button><button class="btn" data-pczprint title="Drucken">🖨 Drucken</button></div>
      <div class="pczadd"><input class="in" id="pczIn" placeholder="Was brauchst du?" autocomplete="off" aria-label="Was brauchst du?"><button class="btn primary" data-pczadd aria-label="Hinzufügen">+</button></div>
      <div class="pczl">${open.map(row).join("") || `<div class="small muted pcze">Schreib auf, was du brauchst – die App sagt dir, wo es am günstigsten ist.</div>`}${done.length ? `<div class="pczdone">${done.map(row).join("")}</div>` : ""}</div>
      ${
        Object.keys(groups).length
          ? `<div class="pcroute"><div class="ssh">So kaufst du am günstigsten${save > 0.004 ? ` <span class="pos">· spart ca. ${escHtml(fmtEur(save))}</span>` : ""}</div>
        ${Object.entries(groups)
          .sort((a, b) => (a[0] === "") - (b[0] === "") || b[1].length - a[1].length)
          .map(([k, xs]) => {
            const so = shopBy(k);
            return `<button class="pcstop" ${so ? `data-pcshop="${k}"` : ""} style="--c:${so ? so.color : "#9aa"}">${so ? badge(so) : `<span class="q">?</span>`}<span class="grow"><b>${so ? escHtml(so.name) : "Laden offen"}</b><small class="muted">${xs.map((x) => (shopQty(x.it) > 1 ? shopQty(x.it) + "x " : "") + escHtml(x.it.n)).join(", ")}</small></span>${sum(xs, (x) => ((x.w && x.w.p) || 0) * shopQty(x.it)) ? `<b>${escHtml(fmtEur(sum(xs, (x) => ((x.w && x.w.p) || 0) * shopQty(x.it))))}</b>` : ""}</button>`;
          })
          .join("")}</div>`
          : ""
      }
      ${done.length ? `<button class="pczclr" data-pczclr>Erledigte löschen (${done.length})</button>` : ""}
`;
    const dBody = `<div class="pcwdeal"><div class="ssh">Angebot merken <span class="muted">· ${escHtml(sh.name)}</span></div><div class="pccp form"><input class="in" id="pcpDT" placeholder="Was? z. B. ${sh.cat === "kleid" ? "Pullover" : sh.cat === "elek" ? "Kopfhörer" : sh.cat === "moebel" ? "Regal" : "Kaffee 500 g"}" aria-label="Was"><div class="pr2"><input class="in" id="pcpDP" inputmode="decimal" placeholder="Preis €" aria-label="Preis"><input class="in" type="date" id="pcpDU" value="${escHtml(nextSat())}" aria-label="Bis wann"></div><div class="pa"><button class="btn primary" data-pcpdeal>Merken</button></div></div></div>
      <div class="ssh" style="margin-top:16px">Gemerkt bei ${escHtml(sh.name)}</div>
      ${deals.map((d) => `<div class="pccp"><div class="grow"><b>${escHtml(d.text)}</b><small class="muted">${d.until ? `bis ${escHtml(shortDate(d.until))}` : "ohne Datum"}</small></div>${d.price ? `<b class="pp">${escHtml(fmtEur(d.price))}</b>` : ""}<button class="x" data-dealdel="${escHtml(d.id)}" aria-label="Angebot löschen">×</button></div>`).join("") || `<div class="small muted">${escHtml(uiText(shopKind(sh) === "leaf" ? "sh_none_leaf" : "sh_none_page"))}</div>`}
      ${
        mine.length
          ? `<div class="ssh" style="margin-top:16px">Auf deinem Zettel</div>${mine
              .map(
                ({ it, w }) =>
                  `<div class="pczr ${it.done ? "done" : ""}"><span>${escHtml(it.n)}</span>${w.p != null ? `<b>${escHtml(fmtEur(w.p))}</b>` : ""}</div>`
              )
              .join("")}`
          : ""
      }
      ${
        prices.length
          ? `<div class="ssh" style="margin-top:16px">Deine Preise hier <span class="muted">· aus Quittungen</span></div>
        ${prices
          .map(
            (x) =>
              `<div class="pcpr"><span class="grow"><b>${escHtml(name(x.w))}</b>${
                x.best
                  ? `<small class="warn">bei ${escHtml(
                      (
                        shopBy(x.best.s) || {
                          name: x.best.s,
                        }
                      ).name
                    )} ${escHtml(fmtEur(x.best.p))}</small>`
                  : x.cheapest
                    ? `<small class="pos">hier am günstigsten</small>`
                    : ""
              }</span><b>${escHtml(fmtEur(x.e.p))}</b></div>`
          )
          .join("")}`
          : ""
      }`;
    const bBody = `<div class="pczst">${badge(sh)}<span><b>${escHtml(sh.name)}</b><small class="muted">${escHtml(
      st.count
        ? uiText(st.count === 1 ? "sh_stat1" : "sh_stat", {
            a: fmtEur0(st.sum / 6),
            n: String(st.count),
          }) +
            (st.last
              ? " · " +
                uiText("sh_last", {
                  d: fxDate(st.last, {
                    day: "numeric",
                    month: "short",
                  }),
                })
              : "")
        : uiText("sh_none")
    )}</small></span></div>
      ${
        recent.length
          ? `<div class="pcbars">${recent
              .slice()
              .reverse()
              .map(
                (t) =>
                  `<div><span class="v">${escHtml(fmtEur0(t.amount))}</span><i style="height:${Math.max(6, Math.round((t.amount / rmax) * 100))}%"></i><small>${escHtml(shortDate(t.date))}</small></div>`
              )
              .join("")}</div>
        <div class="pczrl">${recent.map((t) => `<div class="pcpr"><span class="grow"><b>${escHtml(shortDate(t.date))}</b><small class="muted">${escHtml(t.cat || "")}${hasReceipt(t.id) ? " · 📎 Bon" : ""}</small></span><b>${escHtml(fmtEur(t.amount))}</b></div>`).join("")}</div>`
          : `<div class="small muted">Hier hast du in letzter Zeit nichts gekauft.</div>`
      }`;
    const zet = `<div class="card pcz">${pickCard}${tabs}<div class="pczh"><b>${tab === "zettel" ? "Einkaufszettel" : tab === "deals" ? "Angebote" : "Einkäufe"}</b><span class="small muted">${tab === "zettel" ? `${open.length} offen${est ? ` · ca. ${escHtml(fmtEur(est))}` : ""}` : escHtml(sh.name)}</span></div>${tab === "zettel" ? zBody : tab === "deals" ? dBody : bBody}</div>`;
    root.classList.add("pcshop");
    const keep = document.activeElement && document.activeElement.id === "pczIn",
      val = keep ? document.activeElement.value : "";
    const kept = {};
    ["pcpDT", "pcpDP", "pcpDU"].forEach((k) => {
      const el = $(k);
      if (el) kept[k] = el.value;
    });
    const fid = document.activeElement && root.contains(document.activeElement) ? document.activeElement.id : "";
    if (K.pg && root.contains(K.pg)) document.body.append(K.pg);
    root.innerHTML =
      `<div class="pcscol">${typeof shopAvgCard === "function" ? shopAvgCard() : ""}${left}</div>` + det + zet;
    for (const k in kept) {
      const el = $(k);
      if (el && kept[k]) el.value = kept[k];
    }
    if (fid && /^pcpD/.test(fid) && $(fid)) $(fid).focus();
    if (web) {
      $("pcsWeb").appendChild(K.pg);
      requestAnimationFrame(() => K.place());
    }
    if (
      canWeb &&
      ui.view === "shop" &&
      !root.hidden &&
      document.visibilityState !== "hidden" &&
      !(K.PG.open && K.PG.embed && K.PG.shop && K.PG.shop.id === sh.id)
    )
      requestAnimationFrame(() => {
        if (ui.view === "shop" && !(K.PG.open && K.PG.shop && K.PG.shop.id === sh.id)) K.open(sh.url, sh);
      });
    if (keep) {
      const i = $("pczIn");
      i.value = val;
      i.focus();
    }
    const calm = pcCalm();
    requestAnimationFrame(() => {
      if (calm) {
        K.fresh = null;
        K.swap = false;
        return;
      }
      if (K.swap) {
        const d = root.querySelector(".pcsd");
        d.animate(
          [
            {
              opacity: 0,
              transform: "translateY(10px) scale(.985)",
              filter: "blur(4px)",
            },
            {
              opacity: 1,
              transform: "none",
              filter: "blur(0)",
            },
          ],
          {
            duration: 380,
            easing: E,
          }
        );
        const h = d.querySelector(".pcsdh .lg");
        if (h)
          h.animate(
            [
              {
                transform: "scale(.4) rotate(-20deg)",
              },
              {
                transform: "scale(1.1) rotate(4deg)",
                offset: 0.7,
              },
              {
                transform: "none",
              },
            ],
            {
              duration: 560,
              easing: E,
            }
          );
        d.querySelectorAll(".pccp,.pcpr,.pczr").forEach((el, i) =>
          el.animate(
            [
              {
                opacity: 0,
                transform: "translateX(-10px)",
              },
              {
                opacity: 1,
                transform: "none",
              },
            ],
            {
              duration: 320,
              delay: 80 + i * 40,
              easing: E,
              fill: "backwards",
            }
          )
        );
        d.querySelectorAll(".pcbars i").forEach((el, i) =>
          el.animate(
            [
              {
                transform: "scaleY(0)",
              },
              {
                transform: "none",
              },
            ],
            {
              duration: 600,
              delay: 150 + i * 60,
              easing: BO,
              fill: "backwards",
            }
          )
        );
      }
      if (K.fresh) {
        const el = root.querySelector(`[data-pczi="${CSS.escape(K.fresh)}"]`);
        if (el)
          el.animate(
            [
              {
                opacity: 0,
                transform: "translateY(-16px) rotate(-2deg)",
              },
              {
                opacity: 1,
                transform: "translateY(2px)",
                offset: 0.7,
              },
              {
                opacity: 1,
                transform: "none",
              },
            ],
            {
              duration: 420,
              easing: E,
            }
          );
      }
      K.fresh = null;
      K.swap = false;
    });
  }
  renderShop = renderShopPC;
  rerenderShopPanel = renderShopPC;
  function enter() {
    if (pcCalm() || !root.classList.contains("pcshop")) return;
    root.querySelectorAll(".pcsli,.pcsadd,.pcscats").forEach((el, i) =>
      el.animate(
        [
          {
            opacity: 0,
            transform: "translateX(-40px)",
          },
          {
            opacity: 1,
            transform: "none",
          },
        ],
        {
          duration: 460,
          delay: i * 45,
          easing: E,
          fill: "backwards",
        }
      )
    );
    const d = root.querySelector(".pcsd");
    if (d) {
      d.animate(
        [
          {
            opacity: 0,
            transform: "translateY(30px) scale(.97)",
          },
          {
            opacity: 1,
            transform: "none",
          },
        ],
        {
          duration: 560,
          delay: 120,
          easing: E,
          fill: "backwards",
        }
      );
      d.querySelectorAll(".pcbars i").forEach((el, i) =>
        el.animate(
          [
            {
              transform: "scaleY(0)",
            },
            {
              transform: "none",
            },
          ],
          {
            duration: 700,
            delay: 450 + i * 70,
            easing: BO,
            fill: "backwards",
          }
        )
      );
    }
    const z = root.querySelector(".pcz");
    if (z) {
      z.animate(
        [
          {
            opacity: 0,
            transform: "translateX(60px) rotate(2deg)",
          },
          {
            opacity: 1,
            transform: "none",
          },
        ],
        {
          duration: 560,
          delay: 200,
          easing: E,
          fill: "backwards",
        }
      );
      z.querySelectorAll(".pczi").forEach((el, i) =>
        el.animate(
          [
            {
              opacity: 0,
              clipPath: "inset(0 100% 0 0)",
            },
            {
              opacity: 1,
              clipPath: "inset(0 0 0 0)",
            },
          ],
          {
            duration: 420,
            delay: 450 + i * 60,
            easing: "ease-out",
            fill: "backwards",
          }
        )
      );
    }
  }
  new MutationObserver(() => {
    if (!root.hidden) {
      requestAnimationFrame(enter);
      if (K.PG && !K.PG.open) renderShopPC();
    }
  }).observe(root, {
    attributes: true,
    attributeFilter: ["hidden"],
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && ui.view === "shop" && K.PG && !K.PG.open) renderShopPC();
  });
  async function addItem() {
    const i = $("pczIn");
    const n = ((i && i.value) || "").trim();
    if (!n) return;
    const r = zAddTo(list(), {
      id: newId(),
      n: n.slice(0, 60),
      done: false,
    });
    K.fresh = r.more ? null : r.id;
    i.value = "";
    saveList(r.list);
    if (r.more) toast(`${n}: jetzt ${shopQty(r.list.find((x) => x.id === r.id))}x`);
  }
  root.addEventListener("click", (e) => {
    const c = e.target.closest("[data-pcscat]");
    if (c) {
      ui.shopCat = c.dataset.pcscat;
      renderShopPC();
      return;
    }
    const tb = e.target.closest("[data-pcztab]");
    if (tb) {
      ui.pczTab = tb.dataset.pcztab;
      renderShopPC();
      return;
    }
    if (e.target.closest("[data-pczsend]")) {
      zStartFromPC();
      return;
    }
    if (e.target.closest("[data-pcztripx]")) {
      zEnd();
      toast("Einkauf abgebrochen – der Zettel bleibt");
      return;
    }
    if (e.target.closest("[data-pczpdf]")) {
      zPrint("pdf");
      return;
    }
    if (e.target.closest("[data-pczprint]")) {
      zPrint("print");
      return;
    }
    const s = e.target.closest("[data-pcshop]");
    if (s) {
      if (K.pg && K.PG.open && K.PG.embed) {
        const o = shopBy(s.dataset.pcshop);
        if (o && o.id !== ui.shopSel) K.open(o.url, o);
        return;
      }
      if (ui.shopSel !== s.dataset.pcshop) {
        ui.shopSel = s.dataset.pcshop;
        ui.dealAdd = null;
        K.swap = true;
        renderShopPC();
      }
      return;
    }
    if (e.target.closest("[data-pczadd]")) {
      addItem();
      return;
    }
    const ck = e.target.closest("[data-pczck]");
    if (ck) {
      const id = ck.dataset.pczck,
        row = ck.closest(".pczi");
      const go = () =>
        saveList(
          list().map((x) =>
            x.id === id
              ? x.done
                ? {
                    ...x,
                    done: false,
                    by: undefined,
                  }
                : {
                    ...x,
                    done: true,
                    by: devId(),
                  }
              : x
          )
        );
      if (row && !pcCalm() && !row.classList.contains("done")) {
        row.classList.add("striking");
        setTimeout(go, 420);
      } else go();
      return;
    }
    const dl = e.target.closest("[data-pczdel]");
    if (dl) {
      const id = dl.dataset.pczdel,
        row = dl.closest(".pczi"),
        old = list();
      const go = () => {
        saveList(old.filter((x) => x.id !== id));
        toast("Gelöscht", () => saveList(old), "Rückgängig");
      };
      if (row && !pcCalm())
        row.animate(
          [
            {
              opacity: 1,
              transform: "none",
            },
            {
              opacity: 0,
              transform: "translateX(60px)",
            },
          ],
          {
            duration: 240,
            easing: "ease-in",
          }
        ).onfinish = go;
      else go();
      return;
    }
    if (e.target.closest("[data-pczclr]")) {
      const old = list(),
        n = old.filter((x) => x.done).length;
      saveList(old.filter((x) => !x.done));
      toast(`${n} erledigte gelöscht`, () => saveList(old), "Rückgängig");
      return;
    }
  });
  function webDeal() {
    const t = $("pcpDT"),
      wsh = (K.PG && K.PG.shop) || shopBy(ui.shopSel);
    if (!t || !wsh) return;
    const text = (t.value || "").trim(),
      pr = parseAmt($("pcpDP").value || ""),
      until = $("pcpDU").value || "";
    if (!text) {
      t.focus();
      return;
    }
    const keep = (store.settings.deals || []).filter(
      (x) => !x.until || x.until >= isoOf(new Date(Date.now() - 14 * 864e5))
    );
    store.settings.deals = [
      ...keep,
      {
        id: newId(),
        shop: wsh.id,
        text: text.slice(0, 60),
        price: pr > 0 ? round2(pr) : null,
        until,
      },
    ];
    t.value = "";
    $("pcpDP").value = "";
    saveSettings();
    toast("Angebot gemerkt");
  }
  root.addEventListener("click", (e) => {
    if (e.target.closest("[data-pcpdeal]")) webDeal();
  });
  root.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && /^pcpD/.test(e.target.id || "")) {
      e.preventDefault();
      webDeal();
    }
  });
  root.addEventListener("change", (e) => {
    const s = e.target.closest("[data-pczshop]");
    if (!s) return;
    const id = s.dataset.pczshop,
      v = s.value;
    saveList(
      list().map((x) =>
        x.id === id
          ? v
            ? {
                ...x,
                s: v,
              }
            : (({ s: _, ...r }) => r)(x)
          : x
      )
    );
  });
  root.addEventListener("keydown", (e) => {
    if (e.target.id === "pczIn" && e.key === "Enter") {
      e.preventDefault();
      addItem();
    }
  });
  root.addEventListener("change", (e) => {
    const q = e.target.closest("[data-pczq]");
    if (q) zSetQ(q.dataset.pczq, q.value);
  });
  root.addEventListener("focusin", (e) => {
    if (e.target.matches("[data-pczq]")) e.target.select();
  });
  /* Webseite im Fenster */
  const NB = () => (window.AndroidBridge && window.AndroidBridge.pageOpen ? window.AndroidBridge : null);
  const PG = {
    open: false,
    url: "",
    shop: null,
    st: {},
    ro: null,
    embed: false,
  };
  let lastView = ui.view;
  const pg = document.createElement("div");
  pg.id = "pcPage";
  pg.className = "pcpage";
  pg.hidden = true;
  pg.innerHTML = `<div class="pcpbar"><button data-pcpnav="back" title="Zurück" aria-label="Zurück">‹</button><button data-pcpnav="fwd" title="Vor" aria-label="Vor">›</button><button data-pcpnav="reload" class="rl" title="Neu laden" aria-label="Neu laden">⟳</button><button data-pcpnav="pick" class="wide pick" title="Angebot anklicken – es kommt auf den Einkaufszettel">🛒 Angebote picken</button>
    <div class="url" title="Gesperrt: hier geht nur diese eine Webseite"><span class="lk">🔒</span><span class="u"></span><small class="t"></small><em class="only"></em></div><button data-pcpnav="close" class="x" title="Schließen (Esc)" aria-label="Schließen"><svg class="i" viewBox="0 0 24 24" style="width:18px;height:18px"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
    <div class="pcphole" id="pcpHole"><div class="pcpload"><i></i><span>Seite wird geladen …</span></div></div>`;
  const side = document.createElement("aside");
  side.id = "pcpSide";
  side.className = "pcpside";
  side.hidden = true;
  document.body.append(pg, side);
  const host = (u) => {
    try {
      return new URL(u).hostname.replace(/^www\./, "");
    } catch (_) {
      return "";
    }
  };
  const shopOf = (u) => {
    const h = host(u);
    if (!h) return null;
    return (
      SHOPS.find((sh) => sh.url === u) ||
      SHOPS.find((sh) => {
        const d = SHOP_DOMAINS[sh.id] || host(sh.url);
        return d && (h === d || h.endsWith("." + d));
      }) ||
      null
    );
  };
  const holeRect = () => {
    const r = $("pcpHole").getBoundingClientRect();
    return {
      x: r.left,
      y: r.top,
      w: r.width,
      h: r.height,
    };
  };
  function bar() {
    const st = PG.st || {},
      u = st.url || PG.url;
    if (st.loading && pg.classList.contains("failed")) {
      pg.classList.remove("failed");
      const l = pg.querySelector(".pcpload");
      if (l) l.innerHTML = `<i></i><span>Seite wird geladen …</span>`;
    }
    pg.querySelector(".u").textContent =
      host(u) +
      (() => {
        try {
          const x = new URL(u);
          return (x.pathname + x.search).replace(/\/$/, "");
        } catch (_) {
          return "";
        }
      })();
    pg.querySelector(".t").textContent = st.title || "";
    pg.querySelector(".only").textContent = (() => {
      const h = host(PG.url).split(".");
      return h.length > 1 ? "nur " + h.slice(-2).join(".") : "";
    })();
    pg.querySelector('[data-pcpnav="back"]').disabled = !st.back;
    pg.querySelector('[data-pcpnav="fwd"]').disabled = !st.fwd;
    pg.querySelector(".rl").classList.toggle("spin", !!st.loading);
    pg.classList.toggle("ready", st.loading === false);
  }
  window.hbPageState = (st) => {
    PG.st = st || {};
    bar();
  };
  window.hbPageError = (msg) => {
    const l = pg.querySelector(".pcpload");
    if (!l) return;
    pg.classList.remove("ready");
    pg.classList.add("failed");
    l.innerHTML = `<b>Die Seite lädt gerade nicht</b><span class="small muted">${escHtml(msg || "")}</span><button class="btn" data-pcpnav="reload">Noch einmal versuchen</button>`;
  };
  function sideHtml() {
    const sh = PG.shop;
    if (!sh) return "";
    const deals = shopDeals(sh.id),
      mine = list()
        .map((it) => ({
          it,
          w: where(it),
        }))
        .filter((x) => x.w && x.w.s === sh.id);
    return `<div class="sh" style="--c:${sh.color}">${badge(sh)}<div><b>${escHtml(sh.name)}</b><small class="muted">${escHtml(shopOpenTxt(sh))}</small></div></div>
      <div class="ssh">${escHtml(uiText(shopKind(sh) === "leaf" ? "sh_save_leaf" : "sh_save_page"))}</div>
      <div class="pccp form"><input class="in" id="pcpDT" placeholder="Was? z. B. ${sh.cat === "kleid" ? "Pullover" : sh.cat === "elek" ? "Kopfhörer" : sh.cat === "moebel" ? "Regal" : "Kaffee 500 g"}" aria-label="Was"><div class="pr2"><input class="in" id="pcpDP" inputmode="decimal" placeholder="Preis €" aria-label="Preis"><input class="in" type="date" id="pcpDU" value="${escHtml(nextSat())}" aria-label="Bis wann"></div><div class="pa"><button class="btn primary" data-pcpdeal>Merken</button></div></div>
      <div class="ssh">Einkaufszettel <span class="muted">· für ${escHtml(sh.name)}</span></div>
      <div class="pczl">${mine
        .map(
          ({ it, w }) =>
            `<div class="pczi ${it.done ? "done" : ""}" data-pczi="${escHtml(it.id)}"><button class="cb" data-pczck="${escHtml(it.id)}" aria-label="${escHtml(it.n)}"></button><span class="n">${escHtml(it.n)}</span><b class="p">${w.p != null ? escHtml(fmtEur(w.p)) : ""}</b><button class="del" data-pczdel="${escHtml(it.id)}" aria-label="${escHtml(it.n)} löschen">×</button></div>`
        )
        .join("")}</div>
      <div class="pczadd"><input class="in" id="pcpZ" placeholder="Was brauchst du bei ${escHtml(sh.name)}?" autocomplete="off" aria-label="Was brauchst du?"><button class="btn primary" data-pcpzadd aria-label="Hinzufügen">+</button></div>
      <div class="ssh">Schon gemerkt bei ${escHtml(sh.name)}</div>
      ${deals.length ? deals.map((d) => `<div class="pccp"><div class="grow"><b>${escHtml(d.text)}</b><small class="muted">${d.until ? `bis ${escHtml(shortDate(d.until))}` : "ohne Datum"}</small></div>${d.price ? `<b class="pp">${escHtml(fmtEur(d.price))}</b>` : ""}<button class="x" data-dealdel="${escHtml(d.id)}" aria-label="Angebot löschen">×</button></div>`).join("") : `<div class="small muted">Noch nichts gemerkt.</div>`}`;
  }
  function sideRender() {
    if (!PG.open || !PG.shop) return;
    const a = document.activeElement,
      id = a && side.contains(a) ? a.id : "",
      v = id ? a.value : "",
      keep = {};
    ["pcpDT", "pcpDP", "pcpDU", "pcpZ"].forEach((k) => {
      const el = $(k);
      if (el) keep[k] = el.value;
    });
    side.innerHTML = sideHtml();
    for (const k in keep) {
      const el = $(k);
      if (el) el.value = keep[k];
    }
    if (id) {
      const el = $(id);
      if (el) {
        el.focus();
        el.value = v;
      }
    }
  }
  const E2 = "cubic-bezier(.2,.8,.2,1)";
  function place() {
    const b = NB();
    if (b && PG.open) b.pageBounds(holeRect());
  }
  function pageOpen(url, shop) {
    if (!NB() && !window.pcPageDemo) {
      window.open(url, "_blank", "noopener");
      return;
    }
    const sh = shop !== undefined ? shop : shopOf(url),
      was = PG.open,
      wasEmbed = PG.embed;
    PG.url = url;
    PG.shop = sh;
    PG.st = {
      url,
    };
    PG.open = true;
    bar();
    pg.classList.remove("ready", "withside");
    side.hidden = true;
    const go = () => {
      const b = NB();
      if (b) b.pageOpen(url, holeRect());
      else if (window.pcPageDemo) window.pcPageDemo(url, holeRect());
    };
    if (sh) {
      PG.embed = true;
      pg.classList.add("embed");
      pg.hidden = false;
      if (PG.pick && !wasEmbed) pickToggle(false);
      document.documentElement.classList.remove("pcpageon");
      ui.shopSel = sh.id;
      ui.dealAdd = null;
      if (!(store.settings.shops || []).includes(sh.id)) ui.shopCat = "";
      if (ui.view !== "shop") {
        ui.view = "shop";
        lastView = "shop";
        render();
        window.scrollTo({
          top: 0,
        });
      } else renderShopPC();
      if (wasEmbed || pcCalm()) {
        requestAnimationFrame(go);
        if (wasEmbed && !pcCalm())
          pg.querySelector(".pcphole").animate(
            [
              {
                opacity: 0.3,
              },
              {
                opacity: 1,
              },
            ],
            {
              duration: 300,
            }
          );
        return;
      }
      const w = $("pcsWeb");
      if (w)
        w.animate(
          [
            {
              opacity: 0,
              transform: "translateY(14px) scale(.98)",
              filter: "blur(3px)",
            },
            {
              opacity: 1,
              transform: "none",
              filter: "blur(0)",
            },
          ],
          {
            duration: 340,
            easing: E2,
          }
        );
      setTimeout(go, 320);
      return;
    }
    if (PG.pick) pickToggle(false);
    PG.embed = false;
    pg.classList.remove("embed");
    document.body.append(pg);
    pg.hidden = false;
    document.documentElement.classList.add("pcpageon");
    if (wasEmbed) renderShopPC();
    if (was || pcCalm()) {
      requestAnimationFrame(go);
      return;
    }
    pg.animate(
      [
        {
          opacity: 0,
          transform: "translateY(30px) scale(.97)",
        },
        {
          opacity: 1,
          transform: "none",
        },
      ],
      {
        duration: 340,
        easing: E2,
      }
    );
    setTimeout(go, 330);
  }
  function pageClose() {
    if (!PG.open) return;
    if (PG.pick) pickToggle(false);
    K.pick = null;
    PG.open = false;
    const b = NB();
    if (b) b.pageNav("close");
    else if (window.pcPageDemo) window.pcPageDemo(null);
    if (PG.embed) {
      PG.embed = false;
      pg.hidden = true;
      document.body.append(pg);
      pg.classList.remove("embed");
      if (ui.view === "shop") {
        K.swap = true;
        renderShopPC();
      }
      return;
    }
    const done = () => {
      pg.hidden = true;
      side.hidden = true;
      side.innerHTML = "";
      document.documentElement.classList.remove("pcpageon");
    };
    if (pcCalm()) return done();
    pg.animate(
      [
        {
          opacity: 1,
          transform: "none",
        },
        {
          opacity: 0,
          transform: "translateY(24px) scale(.97)",
        },
      ],
      {
        duration: 240,
        easing: "ease-in",
      }
    ).onfinish = done;
    if (!side.hidden)
      side.animate(
        [
          {
            opacity: 1,
            transform: "none",
          },
          {
            opacity: 0,
            transform: "translateX(50px)",
          },
        ],
        {
          duration: 220,
          easing: "ease-in",
          fill: "forwards",
        }
      );
  }
  const PICK_SRC =
    '(() => {\n  const W = window; if (W.__hbPick) return W.__hbPick;\n  const TOP = W === W.top;\n  const PR = /(\\d{1,4})\\s*[.,]\\s*(\\d{2})(?![\\d.]\\d|\\.(?!\\d)|\\d|\\s?(?:gbit|mbit|gb|tb|mb|mah|ghz|mhz|hz|zoll|cm|mm|kg|ml|kw|w|v|l|m|g)\\b|\\s?%)|[-–]\\s*[.,]\\s*(\\d{2})(?!\\d)|(\\d{1,4})\\s*[.,]\\s*[-–]/i;\n  const BAD = /^(uvp|statt|je |grundpreis|1 ?kg|100 ?g|1 ?l |\\d+ ?%|-?\\d+ ?%|ab |nur |aktion|angebot|knaller|neu|online|in den warenkorb|merken|details|zum angebot|mehr|versch\\.|verschiedene|auch |inkl|versand|lieferung|markt ausw|jetzt |spare |bewert|\\d+ bewertung)|:$/i;\n  const txt = (e) => (e && (e.innerText || e.textContent) || "").replace(/ /g, " ").trim();\n  const PRG = new RegExp(PR.source, "g");\n  const UNIT = /(=|zzgl|pfand|uvp|statt|grundpreis|sparst|ersparnis|spare |rabatt|vorher|bisher|ursprüngl|\\bje\\b|\\(1|pro\\s|€\\s?\\/|\\/\\s?(kg|l|st|stk|stück|m|m²|qm|lfm|100 ?g|100 ?ml)\\b)/i;\n  const FILL = /\\b(aktion|knaller|angebot|angebote|preis|statt|uvp|nur|ab|je|neu|top|deal|super|sale|rabatt|bonus|coupon|app|payback|auch|alkoholfrei)\\b|€/gi;\n  const nameish = (t) => /[a-zäöüß]{4}/i.test(String(t).replace(PRG, " ").replace(FILL, " "));\n  const fs = (e) => { try { return parseFloat(getComputedStyle(e).fontSize) || 0; } catch (x) { return 0; } };\n  const maxFs = (e) => { let m = fs(e); for (const k of e.querySelectorAll("*")) m = Math.max(m, fs(k)); return m; };\n  function hasPrice(e) { return PR.test(txt(e)) || !!e.querySelector("[itemprop=price],[class*=price i],[class*=preis i],[data-price]"); }\n  function valOf(e) {\n    const it = e.matches && e.matches("[itemprop=price]") ? e : null; if (it) { const v = parseFloat(String(it.getAttribute("content") || txt(it)).replace(",", ".")); if (v > 0) return v; }\n    const t = txt(e).replace(/\\s+/g, " "); const m = price(t); if (m != null) return m;\n    const CENT = /(^|[-_\\s])(cents?|decimals?|fraction(al)?|nachkomma)([-_\\s]|$)/i;\n    const sup = [...e.querySelectorAll("*")].find((k) => k.matches("sup,small") || CENT.test(String(k.className || "")) || CENT.test(k.getAttribute("data-testid") || ""));\n    if (sup && /^\\d{2}$/.test(txt(sup).replace(/[^\\d]/g, ""))) { const w = t.replace(txt(sup), "").replace(/[^\\d]/g, ""); if (w.length <= 4 && (w || /[-–.,]/.test(t))) return Number((w || "0") + "." + txt(sup).replace(/[^\\d]/g, "")); }\n    return null;\n  }\n  function cardPrice(c) {\n    const it = c.querySelector("[itemprop=price]"); if (it) { const v = valOf(it); if (v) return v; }\n    const own = (p) => p ? [...p.childNodes].filter((n) => n.nodeType === 3).map((n) => n.nodeValue).join(" ") : "";\n    const els = [c, ...c.querySelectorAll("*")].filter((e) => { const t = txt(e); return t && t.length <= 24 && !UNIT.test(t) && !UNIT.test(own(e.parentElement)); });\n    let best = null;\n    const app = (e) => { for (let x = e, i = 0; x && x !== c && i < 3; i++, x = x.parentElement) if (/\\bapp\\b/i.test(txt(x)) && txt(x).length < 30) return true; return false; };\n    const struck = (e) => { for (let x = e, i = 0; x && i < 4; i++, x = x.parentElement) { if (x.matches("s,del,strike")) return true; try { if (/line-through/.test(getComputedStyle(x).textDecorationLine)) return true; } catch (z) {} if (x === c) break; } return false; };\n    for (const e of els) { if (struck(e)) continue; const v = valOf(e); if (!(v > 0 && v < 100000)) continue; const f = maxFs(e), r = e.getBoundingClientRect(), a = app(e) ? 1 : 0;\n      if (!best || a < best.app || (a === best.app && (f > best.f + 0.5 || (Math.abs(f - best.f) <= 0.5 && r.width * r.height < best.a)))) best = { v, f, a: r.width * r.height, app: a }; }\n    if (best) return best.v;\n    const all = txt(c).split(/\\n+/).filter((l) => !UNIT.test(l)).join("\\n"); return price(all);\n  }\n  function cardName(c) {\n    let best = null;\n    const clean = (t) => String(t || "").replace(/\\s+/g, " ").trim().replace(/[:\\s,(*¹⁴⁵⁶⁷⁸⁹⁰†]+$/, "").replace(/^[^A-Za-zÄÖÜäöü0-9"„]+/, "");\n    const ok = (t) => !(t.length < 3 || t.length > 90 || PR.test(t) || UNIT.test(t) || BAD.test(t) || /bewertung|rezension|sternen?\\b|bitte w(ä|ae)hle|entdecken|alle anzeigen|mehr erfahren|zum produkt/i.test(t) || !nameish(t));\n    const consider = (t, f) => { t = clean(t); if (!ok(t)) return; if (!best || f > best.f + 0.5) best = { t, f }; };\n    const all = [];\n    const tw = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);\n    for (let n = tw.nextNode(); n; n = tw.nextNode()) { const pe = n.parentElement; if (!pe) continue; const st = getComputedStyle(pe); if (st.display === "none" || st.visibility === "hidden") continue;\n      const pr = pe.getBoundingClientRect(); if (pr.width < 3 || pr.height < 3) continue;\n      const t = clean(n.nodeValue); if (!t) continue; all.push({ t, f: fs(pe) }); consider(t, fs(pe)); }\n    if (best && best.t.length <= 24) { const i = all.findIndex((a) => a.t === best.t && Math.abs(a.f - best.f) < 0.01), nx = all[i + 1];\n      if (nx && Math.abs(nx.f - best.f) <= 0.5 && ok(nx.t) && best.t.length + nx.t.length < 90) best = { t: best.t + " " + nx.t, f: best.f }; }\n    if (!best) { let e = c; for (let i = 0; e && i < 3 && !best; i++, e = e.parentElement) { const img = e.querySelector("img[alt]"); if (img) consider(img.alt, 0); } }\n    return best ? best.t.replace(/\\s+,/g, ",").replace(/(\\.\\.\\.|…)$/, "").trim() : "";\n  }\n  const alike = (a, b) => { if (a.tagName !== b.tagName) return false; const ca = String(a.className || "").split(/\\s+/).filter(Boolean), cb = String(b.className || "").split(/\\s+/).filter(Boolean);\n    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect(), sim = (x, y) => Math.abs(x - y) <= Math.max(x, y) * 0.3 + 2;\n    if ((ca.length || cb.length) && !ca.some((x) => cb.includes(x))) return false;\n    return sim(ra.height, rb.height) && (sim(ra.width, rb.width) || (Math.abs(ra.top - rb.top) < 12 && Math.abs(ra.left - rb.left) > 20)); };\n  const isList = (e) => { const ks = [...e.children].filter((k) => { const kt = txt(k); return kt.length > 12 && hasPrice(k) && nameish(kt); });\n    if (ks.length >= 3) return ks.filter((k) => k.querySelector("img,picture")).length >= 3 || ks.some((k) => ks.some((o) => o !== k && alike(k, o)));\n    return ks.length === 2 && alike(ks[0], ks[1]) && ks.every((k) => k.querySelector("img,picture,canvas,svg") || hasBg(k)); };\n  function whole(e) {\n    const vw = innerWidth * innerHeight;\n    while (e.parentElement && e.parentElement !== document.body && e.parentElement !== document.documentElement) {\n      const p = e.parentElement, r = p.getBoundingClientRect();\n      if (isList(p) || txt(p).length > 900 || r.width * r.height > vw * 0.6) break;\n      e = p;\n    }\n    return e;\n  }\n  const hasBg = (e) => { try { const b = getComputedStyle(e).backgroundImage; return b && b !== "none" && /url\\(/.test(b); } catch (x) { return false; } };\n  const pics = (e) => e.querySelectorAll("img,picture,canvas,svg image").length + (hasBg(e) ? 1 : 0);\n  function imgBox(el) {\n    let e = el && el.nodeType === 1 ? el : el && el.parentElement;\n    for (let i = 0; e && i < 6 && !(e.matches("img,picture,canvas") || hasBg(e)); i++) e = e.parentElement;\n    if (!e || e === document.body || e === document.documentElement) return null;\n    const vw = innerWidth * innerHeight, r0 = e.getBoundingClientRect(); if (r0.width < 60 || r0.height < 40 || r0.width * r0.height > vw * 0.7) return null;\n    while (e.parentElement && e.parentElement !== document.body && e.parentElement !== document.documentElement) {\n      const p = e.parentElement, r = p.getBoundingClientRect();\n      if (pics(p) > Math.max(1, pics(e)) || r.width * r.height > vw * 0.6 || txt(p).length > 300) break;\n      e = p;\n    }\n    return e;\n  }\n  function cand(el) {\n    let e = el && el.nodeType === 1 ? el : el && el.parentElement, priceOnly = null;\n    for (let i = 0; e && e !== document.body && e !== document.documentElement && i < 14; i++, e = e.parentElement) {\n      const t = txt(e); if (t.length > 900) break;\n      if (isList(e)) break;\n      if (!hasPrice(e)) continue;\n      const r = e.getBoundingClientRect(); if (r.width < 50 || r.height < 24) continue;\n      if (nameish(t)) return whole(e);\n      if (!priceOnly) priceOnly = e;\n    }\n    return priceOnly;\n  }\n  function price(t) { const m = String(t).match(PR); if (!m) return null; if (m[1]) return Number(m[1] + "." + m[2]); if (m[3]) return Number("0." + m[3]); if (m[4]) return Number(m[4]); return null; }\n  function read(c) {\n    const t = txt(c);\n    const u = t.match(/(?:bis|gültig bis)\\s*(?:[a-z]{2,10}\\.?,?\\s*)?(\\d{1,2})\\.(\\d{1,2})\\.?(\\d{2,4})?/i);\n    const r = c.getBoundingClientRect();\n    return { name: cardName(c).slice(0, 60), price: cardPrice(c), until: u ? { d: +u[1], m: +u[2], y: u[3] ? +u[3] : 0 } : null, rect: TOP ? { x: r.left, y: r.top, w: r.width, h: r.height } : null };\n  }\n  let hov = null, hovOld = "", mode = "", box = null, layer = null, sx = 0, sy = 0, skip = false;\n  const send = (o) => console.log("__HBPICK__" + JSON.stringify(o));\n  function mark(c) { if (hov === c) return; if (hov) hov.style.cssText = hovOld; hov = c; if (c) { hovOld = c.style.cssText; c.style.setProperty("outline", "3px solid #1a7a5c", "important"); c.style.setProperty("outline-offset", "2px", "important"); c.style.setProperty("box-shadow", "0 10px 30px rgba(26,122,92,.35)", "important"); } }\n  function over(e) { if (mode === "pick") mark(cand(e.target) || (TOP ? imgBox(e.target) : null)); }\n  function stop(e) { if (!mode) return; e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); }\n  function click(e) {\n    if (mode !== "pick") return; stop(e);\n    if (skip) { skip = false; return; }\n    const c = cand(e.target);\n    const photo = (b) => { mark(null); const r = b.getBoundingClientRect(); if (b.animate) b.animate([{ transform: "scale(1)" }, { transform: "scale(.95)" }, { transform: "scale(1)" }], { duration: 420 });\n      setTimeout(() => send({ lasso: { x: Math.max(0, r.left), y: Math.max(0, r.top), w: Math.min(r.width, innerWidth - Math.max(0, r.left)), h: Math.min(r.height, innerHeight - Math.max(0, r.top)) } }), 450); };\n    if (!c) { const b = TOP ? imgBox(e.target) : null; if (b) return photo(b); return send({ fail: true, why: "nocard", tag: e.target && e.target.tagName }); }\n    const r = read(c);\n    if (!r.price || !r.name) { const b = TOP ? (imgBox(e.target) || c) : null; if (b && !r.price) return photo(b); }\n    if (c.animate) c.animate([{ transform: "scale(1)" }, { transform: "scale(.95)" }, { transform: "scale(1)" }], { duration: 420 });\n    if (!r.price || !r.name) return send({ fail: true, why: "noprice", partial: r });\n    send(r);\n  }\n  function cursor(on) { document.documentElement.style.setProperty("cursor", on ? "copy" : "", on ? "important" : ""); if (document.body) document.body.style.setProperty("cursor", on ? "copy" : "", on ? "important" : ""); }\n  function lassoOn() {\n    if (!TOP || layer) return;\n    layer = document.createElement("div");\n    layer.style.cssText = "position:fixed;inset:0;z-index:2147483646;cursor:crosshair;background:rgba(194,124,14,.06)";\n    const tip = document.createElement("div"); tip.textContent = "Zieh einen Rahmen um das Angebot";\n    tip.style.cssText = "position:fixed;left:50%;top:14px;transform:translateX(-50%);background:#c27c0e;color:#fff;font:700 14px system-ui,sans-serif;padding:8px 16px;border-radius:12px;pointer-events:none;box-shadow:0 6px 18px rgba(0,0,0,.2)";\n    layer.appendChild(tip);\n    layer.addEventListener("pointerdown", (e) => { e.preventDefault(); tip.style.display = "none"; sx = e.clientX; sy = e.clientY; box = document.createElement("div");\n      box.style.cssText = "position:fixed;z-index:2147483647;border:2.5px dashed var(--accent);background:rgba(26,122,92,.10);border-radius:10px;pointer-events:none";\n      document.documentElement.appendChild(box); layer.setPointerCapture(e.pointerId); move(e); });\n    layer.addEventListener("pointermove", move);\n    layer.addEventListener("pointerup", (e) => { if (!box) return; const r = box.getBoundingClientRect(); box.remove(); box = null; skip = true; setTimeout(() => { skip = false; }, 400);\n      if (r.width < 20 || r.height < 14) return; set("pick"); send({ lasso: { x: r.left, y: r.top, w: r.width, h: r.height } }); });\n    document.documentElement.appendChild(layer);\n  }\n  function move(e) { if (!box) return; const x = Math.min(sx, e.clientX), y = Math.min(sy, e.clientY); Object.assign(box.style, { left: x + "px", top: y + "px", width: Math.abs(e.clientX - sx) + "px", height: Math.abs(e.clientY - sy) + "px" }); }\n  function set(m) { mode = m; cursor(m === "pick"); if (m !== "pick") mark(null); if (m === "lasso") lassoOn(); else if (layer) { layer.remove(); layer = null; } }\n  ["click", "auxclick", "dblclick", "contextmenu"].forEach((t) => W.addEventListener(t, t === "click" ? click : stop, true));\n  W.addEventListener("mouseover", over, true);\n  ["pointerdown", "mousedown", "touchstart"].forEach((t) => W.addEventListener(t, (e) => { if (mode === "pick") stop(e); }, { capture: true, passive: false }));\n  W.__hbPick = { set, test: { cand, read, imgBox } };\n  return W.__hbPick;\n})()';
  /* Angebot picken */
  PG.pick = false;
  function pickToggle(on) {
    const b = NB();
    PG.pick = !!on && !!(b && b.pagePick);
    if (on && !PG.pick) {
      toast("Dafür braucht es die neue PC-App – kommt mit dem nächsten Update");
      return;
    }
    if (b && b.pagePick) b.pagePick(PG.pick ? "pick" : "", PICK_SRC);
    pg.classList.toggle("picking", PG.pick);
    pg.classList.remove("lassoing");
    const pb = pg.querySelector(".pick");
    if (pb) {
      pb.textContent = PG.pick ? "✓ Picken an – Esc zum Beenden" : "🛒 Angebote picken";
      if (!pcCalm())
        pb.animate(
          [
            {
              transform: "scale(.9)",
            },
            {
              transform: "scale(1.06)",
            },
            {
              transform: "none",
            },
          ],
          {
            duration: 320,
          }
        );
    }
    if (PG.pick) toast("Klick auf ein Angebot – es kommt auf den Einkaufszettel");
  }
  function lassoStart() {
    const b = NB();
    if (!b || !b.pagePick) {
      toast("Dafür braucht es die neue PC-App – kommt mit dem nächsten Update");
      return;
    }
    if (pg.classList.contains("lassoing")) {
      pickToggle(false);
      return;
    }
    PG.pick = true;
    b.pagePick("lasso", PICK_SRC);
    pg.classList.add("picking", "lassoing");
    const pb = pg.querySelector(".pick");
    if (pb) pb.textContent = "✓ Picken an – Esc zum Beenden";
    toast("Zieh einen Rahmen um das Angebot");
  }
  window.hbPagePickOff = () => pickToggle(false);
  const untilIso = (u) => {
    if (!u || !u.d || !u.m) return "";
    const now = new Date();
    let y = u.y ? (u.y < 100 ? 2000 + u.y : u.y) : now.getFullYear();
    if (!u.y && u.m < now.getMonth() + 1 - 6) y++;
    return `${y}-${pad(u.m)}-${pad(u.d)}`;
  };
  function fly(text, r) {
    if (pcCalm()) return;
    const h = $("pcpHole"),
      z = $("pczIn");
    if (!h || !z) return;
    const hr = h.getBoundingClientRect(),
      zr = z.getBoundingClientRect();
    const x0 = Math.min(r ? hr.left + r.x + r.w / 2 : hr.right - 60, hr.right - 40),
      y0 = r ? hr.top + r.y + r.h / 2 : hr.top + 80,
      x1 = zr.left + 40,
      y1 = zr.top + zr.height / 2;
    const f = document.createElement("div");
    f.className = "pcfly2";
    f.textContent = text;
    document.body.appendChild(f);
    f.animate(
      [
        {
          left: x0 + "px",
          top: y0 + "px",
          transform: "translate(-50%,-50%) scale(1)",
          opacity: 1,
        },
        {
          left: (x0 + x1) / 2 + "px",
          top: Math.min(y0, y1) - 90 + "px",
          transform: "translate(-50%,-50%) scale(.9) rotate(-6deg)",
          offset: 0.5,
        },
        {
          left: x1 + "px",
          top: y1 + "px",
          transform: "translate(-50%,-50%) scale(.55)",
          opacity: 0.3,
        },
      ],
      {
        duration: 850,
        easing: "cubic-bezier(.5,0,.3,1)",
        fill: "forwards",
      }
    ).onfinish = () => f.remove();
  }
  function addPicked(n, p, until, rect, asDeal) {
    if (!PG.shop) return;
    n = String(n || "")
      .trim()
      .slice(0, 60);
    if (!n) return;
    if (asDeal) {
      const keep = (store.settings.deals || []).filter(
        (x) => !x.until || x.until >= isoOf(new Date(Date.now() - 14 * 864e5))
      );
      store.settings.deals = [
        ...keep,
        {
          id: newId(),
          shop: PG.shop.id,
          text: n,
          price: p > 0 ? round2(p) : null,
          until: until || nextSat(),
        },
      ];
      saveSettings();
      toast(`Angebot gemerkt: ${n}`);
      return;
    }
    const id = newId();
    K.fresh = id;
    fly(n + (p ? " · " + fmtEur(p) : ""), rect);
    setTimeout(
      () => {
        const before = list(),
          r = zAddTo(before, {
            id,
            n,
            done: false,
            s: PG.shop.id,
            ...(p > 0
              ? {
                  p: round2(p),
                }
              : {}),
            ...(until
              ? {
                  u: until,
                }
              : {}),
          });
        saveList(r.list);
        toast(
          r.more
            ? `${n}: jetzt ${shopQty(r.list.find((x) => x.id === r.id))}x auf dem Zettel`
            : `Auf dem Zettel: ${n}${p ? " · " + fmtEur(p) : ""}`,
          () => saveList(before),
          "Rückgängig"
        );
      },
      pcCalm() ? 0 : 700
    );
  }
  function readOcr(lines) {
    const L = (lines || [])
        .map((l) => ({
          t: String(l.t || "")
            .replace(/[¹²³⁴⁵⁶⁷⁸⁹⁰*]+/g, "")
            .trim(),
          h: +l.h || 0,
          w: !!l.w,
        }))
        .filter((l) => l.t),
      all = L.map((l) => l.t).join("\n");
    const shopN = PG.shop ? normText(PG.shop.name) : "";
    const BAD =
      /^(uvp|statt|je|grundpreis|ab|nur|aktion|angebot|angebote|preis|kg|1 ?kg|1 ?l|100 ?g|\d+ ?%|wochen|deal|knaller|kauf \d|super|top|neu|sale|tipp)\b/i;
    const pr = (t) => {
      let m = t.match(/(\d{1,4})\s*[.,]\s*(\d{2})(?!\d)/);
      if (m) return +(m[1] + "." + m[2]);
      m = t.match(/[-–]\s*[.,]\s*(\d{2})(?!\d)/);
      if (m) return +("0." + m[1]);
      m = t.match(/(\d{1,4})\s*[.,]\s*[-–]/);
      if (m) return +m[1];
      m = t.replace(/\s+/g, " ").match(/^\D{0,3}(\d{1,3})\s(\d{2})\D{0,3}$/);
      if (m) return +(m[1] + "." + m[2]);
      return null;
    };
    const prW = (t) => {
      const v = pr(t);
      if (v != null) return v;
      const m = t.replace(/[oO]/g, "0").match(/^\D{0,2}(\d{3,4})\D{0,8}$/);
      return m ? +m[1] / 100 : null;
    };
    const UNIT = /(=|zzgl|pfand|uvp|statt|grundpreis|\(1|je\s*\d|\bkg\b|\bl\b|100\s*g|%)/i;
    let cands = L.map((l, i) => ({
      v: l.w ? prW(l.t) : pr(l.t),
      h: l.h,
      i,
      t: l.t,
      w: l.w,
    })).filter((x) => x.v > 0 && x.v < 10000 && !UNIT.test(x.t));
    const mh = Math.max(0, ...cands.map((x) => x.h)),
      big = cands.filter((x) => !mh || x.h >= mh * 0.6),
      pick = (big.length ? big : cands).slice(-1)[0];
    const price = pick ? pick.v : null;
    const clean = (t) =>
      t
        .replace(/^[^A-Za-zÄÖÜäöü0-9]+/, "")
        .replace(/[\s,(.…]+$/, "")
        .trim();
    const noShop = (t) =>
      shopN ? t.replace(new RegExp("^" + shopN.replace(/[^a-z0-9]/g, "") + "[\\s.…:-]*", "i"), "") : t;
    const names = L.map((l, i) => ({
      t: clean(noShop(clean(l.t))),
      h: l.h,
      i,
      raw: noShop(l.t),
      w: l.w,
    })).filter(
      (l) =>
        !l.w &&
        /[a-zäöüß]{3}/.test(l.raw) &&
        pr(l.raw) == null &&
        !BAD.test(l.raw) &&
        !/^(bis|gültig)/i.test(l.raw) &&
        !UNIT.test(l.raw) &&
        l.t.length >= 4
    );
    const top = names.slice().sort((a, b) => b.h - a.h || b.t.length - a.t.length)[0];
    const name = top ? [top.t] : [];
    if (top && top.h) {
      const nx = names.find((l) => l.i === top.i + 1 && Math.abs(l.h - top.h) <= top.h * 0.15);
      if (nx) name.push(nx.t);
    }
    const u = all.match(/bis\s*(?:[a-z]{2,10}\.?,?\s*)?(\d{1,2})\.(\d{1,2})\.?(\d{2,4})?/i);
    return {
      n: name.join(" ").replace(/\s+/g, " ").slice(0, 60),
      p: price,
      u: u
        ? untilIso({
            d: +u[1],
            m: +u[2],
            y: u[3] ? +u[3] : 0,
          })
        : "",
    };
  }
  window.hbPagePick = async (res) => {
    if (!res || !PG.open) return;
    if (res.fail && res.partial && (res.partial.name || res.partial.price)) {
      K.pick = {
        n: res.partial.name || "",
        p: res.partial.price || null,
        u: untilIso(res.partial.until),
        rect: res.partial.rect,
      };
      renderShopPC();
      const el = $(K.pick.n ? "pkP" : "pkN");
      if (el) el.focus();
      toast("Nicht alles erkannt – bitte kurz ergänzen");
      return;
    }
    if (res.fail) {
      if (res.lassoFailed) {
        toast("Das hat nicht geklappt – bitte noch einmal");
        return;
      }
      toast("Hier ist kein Angebot zu erkennen – klick direkt auf den Kasten des Angebots");
      return;
    }
    if (res.reading) {
      pg.classList.remove("lassoing");
      const pb = pg.querySelector(".pick");
      if (pb) pb.textContent = "✓ Picken an – Esc zum Beenden";
      K.pick = {
        busy: true,
      };
      renderShopPC();
      return;
    }
    if (res.img) {
      pg.classList.remove("lassoing");
      const pb = pg.querySelector(".pick");
      if (pb) pb.textContent = "✓ Picken an – Esc zum Beenden";
      K.pick = {
        busy: true,
      };
      renderShopPC();
      try {
        let lines = Array.isArray(res.lines) && res.lines.length ? res.lines : null;
        if (!lines) {
          await loadTesseract();
          const r = await window.Tesseract.recognize(res.img, "deu");
          lines = ((r.data && r.data.lines) || []).map((l) => ({
            t: l.text.trim(),
            h: l.bbox ? l.bbox.y1 - l.bbox.y0 : 0,
          }));
        }
        K.pick = readOcr(lines);
        K.pick.raw = lines
          .map((l) => l.t)
          .join(" · ")
          .slice(0, 160);
        if (!lines.length) K.pick.raw = "(kein Text erkannt)" + (res.ocrErr ? " – " + res.ocrErr : "");
        for (const t of res.badges || []) {
          const c = String(t).replace(/[oO]/g, "0").replace(/\s+/g, ""),
            m = c.match(/(\d{1,4})[.,](\d{2})/) || c.match(/^\D*(\d{1,3})(\d{2})\D*$/);
          if (m) {
            K.pick.p = +(m[1] + "." + m[2]);
            K.pick.raw = "Preis-Kreis: " + m[1] + "," + m[2] + " · " + K.pick.raw;
            break;
          }
        }
      } catch (e) {
        K.pick = {
          n: "",
          p: null,
          u: "",
          raw: "(Texterkennung nicht erreichbar" + (res.ocrErr ? " – " + res.ocrErr : "") + ")",
        };
        toast("Texterkennung ging nicht – bitte selbst eintragen");
      }
      K.pick.rect = res.rect;
      renderShopPC();
      const el = $(K.pick.n ? "pkP" : "pkN");
      if (el) el.focus();
      return;
    }
    if (res.name) addPicked(res.name, res.price, untilIso(res.until), res.rect);
  };
  root.addEventListener("click", (e) => {
    if (e.target.closest("[data-pkx]")) {
      K.pick = null;
      renderShopPC();
      return;
    }
    const ok = e.target.closest("[data-pkok]");
    if (ok && K.pick) {
      const n = ($("pkN").value || "").trim(),
        p = parseAmt($("pkP").value || ""),
        u = $("pkU").value || "",
        r = K.pick.rect;
      if (!n) {
        $("pkN").focus();
        return;
      }
      K.pick = null;
      renderShopPC();
      addPicked(n, p > 0 ? p : null, u, r, ok.dataset.pkok === "deal");
    }
  });
  root.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && /^pk[NPU]$/.test(e.target.id || "")) {
      e.preventDefault();
      const b = root.querySelector('[data-pkok="zettel"]');
      if (b) b.click();
    }
  });
  K.PG = PG;
  K.pg = pg;
  K.place = place;
  K.open = pageOpen;
  try {
    const b = NB();
    if (b) b.pageNav("close");
  } catch (_) {}
  window.hbPageRequest = (url) => pageOpen(url);
  window.hbPageBlocked = () => {
    toast("Andere Webseiten sind hier gesperrt");
    const u = pg.querySelector(".url");
    if (u && !pcCalm())
      u.animate(
        [
          {
            transform: "none",
          },
          {
            transform: "translateX(-6px)",
          },
          {
            transform: "translateX(6px)",
          },
          {
            transform: "translateX(-3px)",
          },
          {
            transform: "none",
          },
        ],
        {
          duration: 320,
        }
      );
  };
  window.hbPageClose = pageClose;
  openPage = (url) => pageOpen(url);
  pg.addEventListener("click", (e) => {
    const n = e.target.closest("[data-pcpnav]");
    if (!n) return;
    const c = n.dataset.pcpnav;
    if (c === "close") return pageClose();
    if (c === "pick") return pickToggle(!PG.pick);
    if (c === "lasso") return lassoStart();
    const b = NB();
    if (b) b.pageNav(c);
  });
  side.addEventListener("click", (e) => {
    if (e.target.closest("[data-pcpdeal]")) {
      const text = ($("pcpDT").value || "").trim(),
        pr = parseAmt($("pcpDP").value || ""),
        until = $("pcpDU").value || "";
      if (!text) {
        $("pcpDT").focus();
        return;
      }
      const keep = (store.settings.deals || []).filter(
        (x) => !x.until || x.until >= isoOf(new Date(Date.now() - 14 * 864e5))
      );
      store.settings.deals = [
        ...keep,
        {
          id: newId(),
          shop: PG.shop.id,
          text: text.slice(0, 60),
          price: pr > 0 ? round2(pr) : null,
          until,
        },
      ];
      $("pcpDT").value = "";
      $("pcpDP").value = "";
      saveSettings();
      sideRender();
      toast("Angebot gemerkt");
      return;
    }
    if (e.target.closest("[data-pcpzadd]")) return sideAdd();
    const ck = e.target.closest("[data-pczck]");
    if (ck) {
      const id = ck.dataset.pczck;
      saveList(
        list().map((x) =>
          x.id === id
            ? {
                ...x,
                done: !x.done,
              }
            : x
        )
      );
      return;
    }
    const dl = e.target.closest("[data-pczdel]");
    if (dl) {
      const id = dl.dataset.pczdel,
        old = list();
      saveList(old.filter((x) => x.id !== id));
      toast("Gelöscht", () => saveList(old), "Rückgängig");
      return;
    }
  });
  function sideAdd() {
    const i = $("pcpZ"),
      n = ((i && i.value) || "").trim();
    if (!n) return;
    i.value = "";
    saveList(
      zAddTo(list(), {
        id: newId(),
        n: n.slice(0, 60),
        done: false,
        s: PG.shop.id,
      }).list
    );
  }
  side.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      if (e.target.id === "pcpZ") {
        e.preventDefault();
        sideAdd();
      } else if (/^pcpD/.test(e.target.id)) {
        e.preventDefault();
        side.querySelector("[data-pcpdeal]").click();
      }
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && PG.open && !document.querySelector(".backdrop.show:not([hidden])")) {
      e.preventDefault();
      if (PG.pick) pickToggle(false);
      else if (!PG.embed) pageClose();
    }
  });
  addEventListener("resize", () => place());
  new ResizeObserver(() => place()).observe($("pcpHole"));
  let pgVis = null;
  new MutationObserver(() => {
    const b = NB();
    if (!b || !PG.open) {
      pgVis = null;
      return;
    }
    const v = !document.querySelector(
      ".backdrop.show:not([hidden]),#pcFbBg:not([hidden]),#moBg:not([hidden]),#mbBg:not([hidden]),#tourBg:not([hidden]),.hobg:not([hidden]),#hlBg:not([hidden]),#mamiPop:not([hidden]),#fanBg.wheel:not([hidden]),#fanBg.show"
    );
    if (v !== pgVis) {
      pgVis = v;
      b.pageShow(v);
    }
  }).observe(document.body, {
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "hidden"],
    childList: true,
  });
  const _r6 = render;
  render = (...a) => {
    const x = _r6(...a);
    if (PG.open) {
      if (ui.view !== lastView) pageClose();
      else if (!PG.embed) sideRender();
    }
    lastView = ui.view;
    return x;
  };
}

/* Analyse */
/* Hover */
const tooltipAttr = (o) => ` data-tt="${escHtml(JSON.stringify(o))}"`;
if (IS_PC) {
  const box = document.createElement("div");
  box.id = "pctt";
  box.setAttribute("role", "tooltip");
  document.body.appendChild(box);
  let cur = null;
  const hide = () => {
    cur = null;
    box.classList.remove("on");
  };
  document.addEventListener("mouseover", (e) => {
    const g = e.target.closest && e.target.closest("[data-tt]");
    if (!g) {
      if (cur) hide();
      return;
    }
    if (g === cur) return;
    cur = g;
    let o;
    try {
      o = JSON.parse(g.dataset.tt);
    } catch (_) {
      return hide();
    }
    box.style.setProperty("--ttc", o.c || "var(--accent)");
    box.innerHTML = `<div class="h">${escHtml(o.h || "")}</div>${(o.r || []).map((r) => `<div class="r${r[3] ? " m" : ""}"><i style="background:${r[2] || "var(--accent)"}"></i><span>${escHtml(r[0])}</span><b>${escHtml(r[1])}</b></div>`).join("")}${o.f ? `<div class="f" style="color:${o.fc || "var(--fg)"}">${escHtml(o.f)}</div>` : ""}`;
    const marks = [...g.querySelectorAll("circle,.b")],
      rs = (marks.length ? marks : [g]).map((m) => m.getBoundingClientRect()),
      gr = g.getBoundingClientRect();
    const cx = marks.length
        ? (Math.min(...rs.map((r) => r.left)) + Math.max(...rs.map((r) => r.right))) / 2
        : gr.left + gr.width / 2,
      top = Math.min(...rs.map((r) => r.top));
    box.classList.add("on");
    const bw = box.offsetWidth,
      bh = box.offsetHeight;
    let x = Math.max(8, Math.min(innerWidth - bw - 8, cx - bw / 2)),
      y = top - bh - 12,
      below = false;
    if (y < 8) {
      y = Math.max(...rs.map((r) => r.bottom)) + 12;
      below = true;
    }
    box.classList.toggle("below", below);
    box.style.left = x + "px";
    box.style.top = y + "px";
    box.style.setProperty("--ax", Math.max(14, Math.min(bw - 14, cx - x)) + "px");
  });
  addEventListener("scroll", hide, true);
  addEventListener("blur", hide);
  document.addEventListener("click", () => setTimeout(hide, 0));
}
if (IS_PC) {
  const sg = (v) => (v >= 0 ? "+ " : "− ") + fmtEur0(Math.abs(v));
  const say = (h) => `<div class="pcasay">${/<b/.test(h) ? h : trBold(h)}</div>`,
    help = (t) =>
      `<button class="pcaq" data-pcaq aria-label="Was sehe ich hier?">?</button><div class="pcahelp" hidden>${trBold(t)}</div>`;
  const lst = (a) => (a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " und " + a[a.length - 1]);
  const netBars = (pts, onIdx) => {
    const W = 520,
      H = 118,
      n = pts.length,
      bw = W / n,
      vals = pts.filter((p) => !p.fut).map((p) => Math.abs(p.v)),
      mx = Math.max(1, ...vals),
      mid = H / 2;
    let s = `<svg class="pcab" viewBox="0 -18 ${W} ${H + 42}" role="img" aria-label="Übrig pro Monat"><line x1="0" x2="${W}" y1="${mid}" y2="${mid}" stroke="var(--line)" stroke-dasharray="4 5"/>`;
    pts.forEach((p, i) => {
      const h = p.fut ? 0 : Math.max(3, (Math.abs(p.v) / mx) * (mid - 6)),
        x = i * bw + bw * 0.22,
        w = bw * 0.56,
        y = p.v >= 0 ? mid - h : mid,
        on = i === onIdx;
      const c = p.v >= 0 ? "var(--good)" : "var(--bad)";
      s +=
        `<g class="pcabg" data-pcaym="${p.ym}" style="--i:${i}"><rect x="${i * bw}" y="0" width="${bw}" height="${H + 24}" fill="transparent"/>${p.fut ? "" : `<rect class="b" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="${Math.min(7, w / 3).toFixed(1)}" fill="${c}" opacity="${on ? 1 : 0.38}"/>`}
        ${p.fut || !p.has ? "" : `<text x="${(x + w / 2).toFixed(1)}" y="${(p.v >= 0 ? y - 6 : mid - 6).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="700" fill="${c}">${p.v >= 0 ? "+" : "−"}${escHtml(fmtEur0(Math.abs(p.v)).replace(/\s?€/, ""))}</text>`}
        <text x="${(x + w / 2).toFixed(1)}" y="${H + 18}" text-anchor="middle" font-size="13" font-weight="${on ? 800 : 500}" fill="${on ? "var(--fg)" : "var(--muted)"}">${escHtml(p.l)}</text></g>`.replace(
          '<g class="pcabg"',
          `<g class="pcabg"${tooltipAttr({
            h: p.t + " " + p.ym.slice(0, 4),
            c: p.fut ? "var(--line)" : c,
            r: [[p.v >= 0 ? "Übrig" : "Mehr ausgegeben", p.fut ? "–" : sg(p.v), c]],
          })}`
        );
    });
    return s + `</svg>`;
  };
  const yearBars = (rows, ym) => {
    const W = 520,
      H = 124,
      cw = W / 12,
      mx = Math.max(1, ...rows.map((r) => Math.max(r.c.income, r.c.expenses)));
    let s = `<svg class="pcab" viewBox="0 0 ${W} ${H + 22}" role="img" aria-label="Einnahmen und Ausgaben pro Monat">`;
    rows.forEach((r, i) => {
      const x = i * cw,
        on = r.ym === ym,
        hi = (r.c.income / mx) * (H - 4),
        he = (r.c.expenses / mx) * (H - 4),
        bw = Math.min(10, cw * 0.3);
      s +=
        `<g class="pcabg" data-pcaym="${r.ym}" style="--i:${i}">${on ? `<rect x="${x + 2}" y="0" width="${cw - 4}" height="${H}" rx="9" fill="var(--accent-soft)"/>` : `<rect x="${x}" y="0" width="${cw}" height="${H + 22}" fill="transparent"/>`}
        <rect class="b" x="${(x + cw / 2 - bw - 1.5).toFixed(1)}" y="${(H - hi).toFixed(1)}" width="${bw}" height="${hi.toFixed(1)}" rx="3" fill="var(--good)"/><rect class="b" x="${(x + cw / 2 + 1.5).toFixed(1)}" y="${(H - he).toFixed(1)}" width="${bw}" height="${he.toFixed(1)}" rx="3" fill="var(--bad)" opacity=".55"/>
        <text x="${(x + cw / 2).toFixed(1)}" y="${H + 17}" text-anchor="middle" font-size="12" font-weight="${on ? 800 : 500}" fill="${on ? "var(--fg)" : "var(--muted)"}">${escHtml(MSHORT[i].slice(0, 1))}</text></g>`.replace(
          '<g class="pcabg"',
          `<g class="pcabg"${tooltipAttr({
            h: MONTHS[i] + " " + r.ym.slice(0, 4),
            c: "var(--accent)",
            r: [
              ["Einnahmen", fmtEur0(r.c.income), "var(--good)"],
              ["Ausgaben", fmtEur0(r.c.expenses), "var(--bad)"],
            ],
            f:
              (r.c.income - r.c.expenses >= 0 ? "Übrig " : "Mehr ausgegeben ") +
              fmtEur0(Math.abs(r.c.income - r.c.expenses)),
            fc: r.c.income - r.c.expenses >= 0 ? "var(--good)" : "var(--bad)",
          })}`
        );
    });
    return s + `</svg>`;
  };
  const _ath = anaTabsHtml;
  const _ry = renderYear;
  renderYear = function (...a) {
    ui.anaMode = "m";
    return _ry(...a);
  };
  anaTabsHtml = function (a) {
    const { tiles, GRP, TL, ord, rows, ym, mc, y, inc, exp } = a;
    const mode = "m",
      cur = ymOf(new Date()),
      [, mi] = ymParts(ym),
      mn = MONTHS[mi - 1];
    const g3 = GRP[2] || ["Steuer", []],
      g3n = /steuer/i.test(g3[0]) ? "Steuer" : String(g3[0]).replace(/&amp;/g, "&").split(/[ &]/)[0];
    const row = (t) =>
      `<button class="arw" data-anaopen="${t.k}" style="--tc:${userCol("ana", t.k) || themeCol(TL[t.k][1], ord.indexOf(t.k))}"><span class="ai">${svgIcon(t.icon, 18)}</span><span class="an"><b>${t.k === "wk" && !hasJob() ? "Steuererklärung" : t.k === "fix" ? "Fixkosten geplant" : TL[t.k][0]}</b><small>${t.sub || ""}</small></span><span class="av">${escHtml(t.short || "")}<span class="ch">›</span></span></button>`;
    const skip = (t) =>
      t.k === "tax" || (t.k === "goal" && /noch kein/i.test(String(t.sub || "").replace(/<[^>]+>/g, "")));
    for (const t of tiles)
      if (t.k === "calc") {
        const m = String(t.sub || "").match(/^Stand heute (.+?) · frei (.+)$/);
        if (m && m[1] === m[2]) {
          t.sub = "Stand heute " + m[1];
          t.short = String(t.short || "").replace(/^frei\s+/, "");
        }
      }
    const rowsFor = (ks) => {
      const ts = tiles.filter((t) => ks.includes(t.k) && !skip(t)).sort((p, q) => ks.indexOf(p.k) - ks.indexOf(q.k));
      return ts.length ? `<div class="card pcarl"><div class="arl">${ts.map(row).join("")}</div></div>` : "";
    };
    const M = true,
      net = mc.net,
      expn = mc.expenses;
    const pts = Array.from(
      {
        length: 6,
      },
      (_, k) => {
        const m = shiftYm(ym, k - 5);
        return {
          ym: m,
          l: MSHORT[ymParts(m)[1] - 1],
          t: MONTHS[ymParts(m)[1] - 1],
          v: monthCalc(m).net,
          has: ((c) => c.tx.length > 0 || c.expenses > 0 || c.income > 0)(monthCalc(m)),
          fut: m > cur,
        };
      }
    );
    const hist = Array.from(
      {
        length: 12,
      },
      (_, k) => {
        const m = shiftYm(ym, k - 11),
          c = monthCalc(m);
        return {
          ym: m,
          i: ymParts(m)[1],
          v: c.expenses,
          has: c.tx.length > 0 || c.expenses > 0,
        };
      }
    );
    const withData = hist.filter((h) => h.has),
      avg = withData.length ? sum(withData, (h) => h.v) / withData.length : 0;
    const line = (() => {
      const W = 520,
        H = 140,
        n = hist.length,
        mx = Math.max(1, ...hist.map((h) => h.v), avg) * 1.08,
        X = (i) => 10 + (i * (W - 20)) / (n - 1),
        Y = (v) => H - (v / mx) * (H - 8);
      const pts2 = hist.map((h, i) => (h.has ? [X(i), Y(h.v)] : null));
      let d = "",
        on = false;
      pts2.forEach((p) => {
        if (!p) {
          on = false;
          return;
        }
        d += (on ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1) + " ";
        on = true;
      });
      return `<svg class="pcab" viewBox="0 0 ${W} ${H + 22}" role="img" aria-label="Ausgaben der letzten 12 Monate">${avg ? `<line x1="0" x2="${W}" y1="${Y(avg).toFixed(1)}" y2="${Y(avg).toFixed(1)}" stroke="var(--faint)" stroke-dasharray="4 5"/><text x="2" y="${(Y(avg) - 6).toFixed(1)}" text-anchor="start" font-size="11" font-weight="700" fill="var(--muted)" paint-order="stroke" stroke="var(--surface)" stroke-width="4" stroke-linejoin="round">Ø ${escHtml(fmtEur0(avg))}</text>` : ""}
        <path d="${d}" fill="none" stroke="var(--bad)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" class="pcaln"/>
        ${hist
          .map((h, i) =>
            `<g class="pcabg" data-pcaym="${h.ym}"><rect x="${(X(i) - (W - 20) / (n - 1) / 2).toFixed(1)}" y="0" width="${((W - 20) / (n - 1)).toFixed(1)}" height="${H + 22}" fill="transparent"/>${h.has ? `<circle cx="${X(i).toFixed(1)}" cy="${Y(h.v).toFixed(1)}" r="${h.ym === ym ? 6 : 3.5}" fill="var(--bad)"/>` : ""}<text x="${X(i).toFixed(1)}" y="${H + 17}" text-anchor="middle" font-size="11" font-weight="${h.ym === ym ? 800 : 500}" fill="${h.ym === ym ? "var(--fg)" : "var(--muted)"}">${escHtml(MSHORT[h.i - 1].slice(0, 1))}</text></g>`.replace(
              '<g class="pcabg"',
              `<g class="pcabg"${(() => {
                const pp = avg && h.has ? Math.round(((h.v - avg) / avg) * 100) : null;
                return tooltipAttr({
                  h: MONTHS[h.i - 1] + " " + h.ym.slice(0, 4),
                  c: "var(--bad)",
                  r: [
                    ["Ausgaben", h.has ? fmtEur0(h.v) : "–", "var(--bad)"],
                    ...(avg ? [["Ø", fmtEur0(avg), "var(--faint)", 1]] : []),
                  ],
                  f:
                    pp == null
                      ? ""
                      : pp === 0
                        ? "genau im Ø"
                        : (pp > 0 ? "+" : "−") + Math.abs(pp) + " % " + (pp > 0 ? "über" : "unter") + " Ø",
                  fc: pp > 0 ? "var(--bad)" : "var(--good)",
                });
              })()}`
            )
          )
          .join("")}</svg>`;
    })();
    const isCur = ym === cur,
      past = withData.filter((h) => h.ym !== ym),
      avgP = past.length ? sum(past, (h) => h.v) / past.length : 0,
      frac = isCur ? Math.min(1, new Date().getDate() / daysIn(ym)) : 1;
    const dAvg =
      avgP && (!isCur || new Date().getDate() >= 3) ? Math.round(((expn - avgP * frac) / (avgP * frac)) * 100) : null;
    const chip = (p, inv) =>
      p == null
        ? ""
        : `<span class="pcachg ${(inv ? -p : p) > 0 ? "up" : "dn"}">${p > 0 ? "+" : p < 0 ? "−" : "±"}${Math.abs(p)} %</span>`;
    const s1 = (() => {
      if (!withData.length) return "Hier siehst du bald, wie viel du jeden Monat ausgibst.";
      if (isCur && expn === 0) return `Im ${mn} ist noch nichts ausgegeben.`;
      if (!avgP) return `Im ${mn} hast du **${fmtEur0(expn)}** ausgegeben. Zum Vergleich fehlen noch frühere Monate.`;
      const ref = avgP * frac,
        d = expn - ref,
        pc = Math.abs(d) / ref,
        a = fmtEur0(Math.abs(d)),
        o = fmtEur0(avgP);
      if (pc < 0.05)
        return isCur
          ? `Bis heute gibst du **ungefähr so viel** aus wie sonst bis zu diesem Tag.`
          : `Du hast **ungefähr so viel** ausgegeben wie in einem normalen Monat (Ø ${o}).`;
      if (isCur)
        return d > 0
          ? `Bis heute hast du [[${a} mehr]] ausgegeben als sonst bis zu diesem Tag (Ø ${o} im ganzen Monat).`
          : `Bis heute hast du **${a} weniger** ausgegeben als sonst bis zu diesem Tag (Ø ${o} im ganzen Monat).`;
      return d > 0
        ? `Du hast [[${a} mehr]] ausgegeben als in einem normalen Monat (Ø ${o}).`
        : `Du hast **${a} weniger** ausgegeben als in einem normalen Monat (Ø ${o}).`;
    })();
    const s2 = (() => {
      const done = pts.filter((p) => p.has && !p.fut && !(p.ym === cur)),
        neg = done.filter((p) => p.v < 0),
        pos = done.filter((p) => p.v >= 0);
      let t = !done.length
        ? "Hier siehst du bald, ob am Monatsende Geld übrig bleibt."
        : !neg.length
          ? `In **allen ${done.length} Monaten** ist Geld übrig geblieben.`
          : !pos.length
            ? `In [[allen ${done.length} Monaten]] hast du mehr ausgegeben als reinkam.`
            : `In [[${neg.length} von ${done.length} Monaten]] hast du mehr ausgegeben als reinkam.`;
      t = trBold(t);
      if (neg.length && pos.length)
        t +=
          " " +
          trBold(
            pos.length === 1 ? `Übrig blieb etwas im ${pos[0].t}.` : `Übrig blieb etwas in ${pos.length} Monaten.`
          );
      const c = pts.find((p) => p.ym === cur);
      if (c && c.has)
        t += " " + trBold(c.v < 0 ? `Im ${c.t} bisher: [[${sg(c.v)}]].` : `Im ${c.t} bisher: **${sg(c.v)}**.`);
      return t;
    })();
    const col1 = `<div class="pcac"><div class="pcah"><h2>Verlauf</h2><span>letzte 12 Monate</span></div>
      <div class="card pcabig" data-anaopen="trend">${help("Die rote Linie zeigt, wie viel du in jedem der letzten 12 Monate ausgegeben hast. Die gestrichelte Linie ist dein Durchschnitt. Ein Punkt über der gestrichelten Linie heißt: in dem Monat mehr ausgegeben als sonst. Klick auf einen Monat, um ihn anzusehen.")}<small>Ausgaben im ${escHtml(mn)}</small><div style="display:flex;align-items:baseline;gap:10px"><div class="pcan">${escHtml(fmtEur0(expn))}</div></div>${say(s1)}${line}</div>
      <div class="card pcabig" data-anaopen="kpi">${help("Pro Monat: Einnahmen minus Ausgaben. **Grün** = es ist Geld übrig geblieben. **Rot** = du hast mehr ausgegeben als reinkam. Die Zahl über dem Balken ist der Betrag in Euro.")}<small>Übrig pro Monat</small>${say(s2)}${netBars(pts, 5)}</div></div>`;
    const prevM = Array.from(
        {
          length: 6,
        },
        (_, k) => monthCalc(shiftYm(ym, -(k + 1)))
      ).filter((c) => c.tx.length || c.expenses > 0),
      avgOf = {};
    for (const c of prevM)
      for (const [n, v] of catTotals(c.tx, c.fixPaid)) avgOf[n] = (avgOf[n] || 0) + v / prevM.length;
    const ct = catTotals(mc.tx, mc.fixPaid).slice(0, 6);
    const catRows = ct
      .map(([c, v]) => {
        const a0 = avgOf[c] || 0,
          p = a0 > 0 ? Math.round(((v - a0) / a0) * 100) : null;
        return `<button class="pcacat" data-anaopen="cat" style="--tc:${catColor("ausgabe", c)}"><span class="ai">${escHtml(String(c).trim().slice(0, 1).toUpperCase())}</span><span class="an"><span class="t"><b>${escHtml(c)}</b></span><small class="muted">${a0 > 0 ? `Ø ${escHtml(fmtEur0(a0))} im Monat` : "vorher nichts"}</small></span>${p == null ? `<span class="pcachg nw">neu</span>` : chip(p)}<em class="pcav">${escHtml(fmtEur0(v))}</em></button>`;
      })
      .join("");
    const lastY = Array.from(
        {
          length: 12,
        },
        (_, i) => monthCalc(`${y - 1}-${String(i + 1).padStart(2, "0")}`).expenses
      ),
      hasLast = lastY.some((v) => v > 0);
    const cmp = (() => {
      const W = 520,
        H = 120,
        cw = W / 12,
        mx = Math.max(1, ...lastY, ...rows.map((r) => r.c.expenses));
      return `<svg class="pcab" viewBox="0 0 ${W} ${H + 22}" role="img" aria-label="${y} gegen ${y - 1}">${rows
        .map((r, i) => {
          const x = i * cw,
            hb = (lastY[i] / mx) * (H - 4),
            ha = r.ym > cur ? 0 : (r.c.expenses / mx) * (H - 4);
          return `<g class="pcabg" data-pcaym="${r.ym}" style="--i:${i}"><rect x="${x}" y="0" width="${cw}" height="${H + 22}" fill="transparent"/><rect class="b" x="${(x + cw / 2 - 10).toFixed(1)}" y="${(H - hb).toFixed(1)}" width="9" height="${hb.toFixed(1)}" rx="3" fill="var(--faint)" opacity=".55"/>${ha ? `<rect class="b" x="${(x + cw / 2 + 1).toFixed(1)}" y="${(H - ha).toFixed(1)}" width="9" height="${ha.toFixed(1)}" rx="3" fill="var(--bad)"/>` : ""}
          <text x="${(x + cw / 2).toFixed(1)}" y="${H + 17}" text-anchor="middle" font-size="11" font-weight="${r.ym === ym ? 800 : 500}" fill="${r.ym === ym ? "var(--fg)" : "var(--muted)"}">${escHtml(MSHORT[i].slice(0, 1))}</text></g>`.replace(
            '<g class="pcabg"',
            `<g class="pcabg"${(() => {
              const fut = r.ym > cur,
                pp = !fut && lastY[i] > 0 ? Math.round(((r.c.expenses - lastY[i]) / lastY[i]) * 100) : null;
              return tooltipAttr({
                h: MONTHS[i],
                c: "var(--bad)",
                r: [
                  [String(y), fut ? "–" : fmtEur0(r.c.expenses), "var(--bad)"],
                  [String(y - 1), fmtEur0(lastY[i]), "var(--faint)", 1],
                ],
                f:
                  pp == null
                    ? ""
                    : pp === 0
                      ? "gleich wie " + (y - 1)
                      : (pp > 0 ? "+" : "−") + Math.abs(pp) + " % zu " + (y - 1),
                fc: pp > 0 ? "var(--bad)" : "var(--good)",
              });
            })()}`
          );
        })
        .join("")}</svg>`;
    })();
    const ytd = sum(
        rows.filter((r) => r.ym <= ym),
        (r) => r.c.expenses
      ),
      ytdL = sum(lastY.slice(0, mi), (v) => v),
      dY = ytdL > 0 ? Math.round(((ytd - ytdL) / ytdL) * 100) : null;
    const s3 = (() => {
      const d = ct
        .map(([c, v]) => ({
          c,
          v,
          a: avgOf[c] || 0,
        }))
        .filter((x) => x.a > 0)
        .map((x) => ({
          ...x,
          d: x.v - x.a,
        }));
      const up = d.filter((x) => x.d > Math.max(10, x.a * 0.1)).sort((a, b) => b.d - a.d)[0],
        dn = d.filter((x) => -x.d > Math.max(10, x.a * 0.1)).sort((a, b) => a.d - b.d)[0];
      if (!up && !dn)
        return d.length
          ? "Alle Bereiche liegen ungefähr im üblichen Rahmen."
          : "Zum Vergleich fehlen noch frühere Monate.";
      return [
        up ? trBold(`Mehr als sonst: [[${escHtml(up.c)}]] (${fmtEur0(up.d)} mehr).`) : "",
        dn ? trBold(`Weniger als sonst: **${escHtml(dn.c)}** (${fmtEur0(-dn.d)} weniger).`) : "",
      ]
        .filter(Boolean)
        .join(" ");
    })();
    const s4 =
      !hasLast || dY == null
        ? `Bis ${mn} hast du ${y} **${fmtEur0(ytd)}** ausgegeben. Von ${y - 1} gibt es noch keine Zahlen zum Vergleich.`
        : Math.abs(dY) < 3
          ? `Bis ${mn} hast du ${y} **ungefähr so viel** ausgegeben wie ${y - 1}.`
          : ytd > ytdL
            ? `Bis ${mn} hast du ${y} [[${fmtEur0(ytd - ytdL)} mehr]] ausgegeben als ${y - 1} im gleichen Zeitraum.`
            : `Bis ${mn} hast du ${y} **${fmtEur0(ytdL - ytd)} weniger** ausgegeben als ${y - 1} im gleichen Zeitraum.`;
    const col2 = `<div class="pcac"><div class="pcah"><h2>Kategorien im Vergleich</h2></div>
      ${ct.length ? `<div class="card pcarl">${help("Jede Zeile ist ein Bereich, z. B. Lebensmittel. Rechts steht, was du diesen Monat dafür ausgegeben hast. Die Prozentzahl vergleicht mit deinem Schnitt der 6 Monate davor: **rot** = mehr als sonst, **grün** = weniger.")}<div class="pcach"><b>${escHtml(mn)} gegen deinen Schnitt</b><button data-anaopen="cat">Alle ›</button></div>${say(s3)}${catRows}</div>` : `<div class="card pcarl muted pcaempty">Im ${escHtml(mn)} ist noch nichts gebucht.</div>`}
      <div class="card pcabig" data-anaopen="io">${help(`Pro Monat zwei Balken: **rot** = ${y}, **grau** = ${y - 1}. Ist der rote Balken kleiner als der graue, hast du in dem Monat weniger ausgegeben als im Vorjahr. Fahr mit der Maus über einen Monat für die genauen Beträge.`)}<small>${y} gegen ${y - 1}</small><div style="display:flex;align-items:baseline;gap:10px;margin-top:4px"><b style="font-size:22px">${escHtml(fmtEur0(ytd))}</b><span class="pcas" style="margin:0">ausgegeben bis ${escHtml(mn)}</span></div>${say(s4)}
        <div class="pcalg"><span><i style="background:var(--bad)"></i>${y}</span><span><i style="background:var(--faint);opacity:.55"></i>${y - 1}</span></div>${cmp}</div>
      ${rowsFor(["calc", "plan"])}</div>`;
    const tt = tiles.find((t) => t.k === "tax");
    let tx = null;
    try {
      tx = taxCalc(y);
    } catch (e) {}
    const box = (l, v) => `<div><small>${l}</small><b>${v}</b></div>`;
    const col3 = `<div class="pcac"><div class="pcah"><h2>${escHtml(g3n)}</h2><span>${y} · Schätzung</span></div>
      ${
        tt
          ? `<div class="card pcabig" data-anaopen="tax">${help("Grobe Schätzung deiner Einkommensteuer für das ganze Jahr, berechnet aus deinen Buchungen. **Plus** = du musst voraussichtlich nachzahlen, **Minus** = du bekommst etwas zurück, **± 0 €** = weder noch. „Zu versteuern“ ist dein Einkommen nach Abzügen.")}<small>Voraussichtlich</small><div class="pcan">${escHtml(tt.short || "")}</div><div class="pcas">${tt.sub || ""}</div>
        ${tx ? `<div class="pcabox">${box("Zu versteuern", escHtml(fmtEur0(tx.zve)))}${hasSelf() ? box("Rücklage", escHtml(fmtEur0(tx.resBal || 0))) : box("Steuern gesamt", escHtml(fmtEur0((tx.mine ? tx.mine.total : 0) + (tx.gewst || 0))))}</div>` : ""}</div>`
          : ""
      }
      ${rowsFor(g3[1])}</div>`;
    return `<div class="pcana">${col1}${col2}${col3}</div>`;
  };
  document.addEventListener(
    "click",
    (e) => {
      const q = e.target.closest("[data-pcaq]");
      if (!q) return;
      e.stopPropagation();
      e.preventDefault();
      const h = q.nextElementSibling;
      if (h) {
        h.hidden = !h.hidden;
        q.classList.toggle("on", !h.hidden);
      }
    },
    true
  );
  document.addEventListener(
    "click",
    (e) => {
      const g = e.target.closest("[data-pcaym]");
      if (!g || ui.view !== "year") return;
      e.stopPropagation();
      if (g.dataset.pcaym === ui.ym) return;
      ui.ym = g.dataset.pcaym;
      render();
    },
    true
  );
  const yv = document.getElementById("v-year");
  if (yv) yv.classList.add("pca");
}

/* Einstellungen am PC */
if (IS_PC) {
  const PCSET = [
    [
      "Geld",
      () => [
        "konten",
        "budgets",
        ...(isJobless() ? ["amt"] : hasProfile() ? ["amt", "steuer"] : ["steuer"]),
        "invest",
        "export",
      ],
    ],
    ["Anpassen", () => ["toene", "farben", "sprache", "kategorien", "laeden"]],
    [
      "Sicherheit",
      () => [
        "sicherheit",
        ...(SYNCABLE || window.AndroidBridge ? ["geraete"] : []),
        "backup",
        ...(CAN_NOTIFY ? ["notify"] : []),
        "speicher",
      ],
    ],
  ];
  const syncOn = () => !!(SYNCABLE || window.AndroidBridge),
    parts = (k) => (k === "geraete" && syncOn() ? ["sync", "geraete"] : [k]),
    alias = {
      sync: "geraete",
    };
  const title = (k) => (k === "geraete" && syncOn() ? "Geräte & Abgleich" : accTitle(k)),
    sub = (k) => accSub(k);
  const col = (k) => themeCol(ACC_COL[k] || "#1a7a5c");
  let shown = "";
  const showPane = (k, anim) => {
    const r = $("pcsR");
    if (!r) return;
    accRestoreAll();
    const ks = parts(k);
    const tp = window.pcTilePane && window.pcTilePane(k);
    r.innerHTML = `<div class="pcsp${anim ? " pcsanim" : ""}"><div class="pcsph"><span class="saic" style="background:${col(k)}">${svgIcon(accIcon(k), 20)}</span><h2>${escHtml(title(k))}</h2></div>${tp || ks.map((x) => `<div class="sabody" id="sab-${x}"></div>`).join("")}</div>`;
    if (!tp)
      ks.forEach((x) => {
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
      groups = PCSET.map(([g, f]) => [g, f()]);
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
            ? `<div class="pcsg">${escHtml(I18N.tr ? I18N.tr(g) : g)}</div>` +
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
    return `<svg class="pctring" viewBox="0 0 48 48"><circle cx="24" cy="24" r="19" fill="none" stroke="var(--sunk)" stroke-width="6"/><circle class="pcta" cx="24" cy="24" r="19" fill="none" stroke="${p > 1 ? "var(--bad)" : c}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${(q * 119.4).toFixed(1)} 200" transform="rotate(-90 24 24)"/><text x="24" y="28" text-anchor="middle" font-size="11.5" font-weight="800" fill="var(--fg)">${Math.round(p * 100)}%</text></svg>`;
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

/* Tablet */
if (IS_TAB) {
  const H = document.documentElement,
    calm = () => pcCalm();
  /* Dock */
  const dock = document.querySelector(".tabs"),
    plus = dock && dock.querySelector(".tab.plus");
  let bub = null;
  function dockPlace() {
    if (!dock) return;
    if (!bub) {
      bub = document.createElement("i");
      bub.className = "tabbub";
      dock.prepend(bub);
    }
    const on = dock.querySelector('.tab[aria-selected="true"]');
    if (on) {
      bub.style.left = on.offsetLeft + "px";
      bub.style.top = on.offsetTop + "px";
      bub.style.width = on.offsetWidth + "px";
      bub.style.height = on.offsetHeight + "px";
      bub.style.setProperty("--bubc", getComputedStyle(on).getPropertyValue("--tc") || "#1a7a5c");
      bub.style.opacity = 1;
    } else bub.style.opacity = 0;
  }
  const _rd = render;
  render = (...a) => {
    const x = _rd(...a);
    if (ui.view !== "more") ui.tabOpen = 0;
    requestAnimationFrame(dockPlace);
    return x;
  };
  addEventListener("resize", () => requestAnimationFrame(dockPlace));
  setTimeout(dockPlace, 60);
  setTimeout(dockPlace, 600);

  /* Wischen */
  {
    let x0 = null,
      y0 = 0,
      t0 = 0,
      dx = 0,
      sec = null,
      horiz = null;
    const blocked = (t) =>
      t.closest(
        "input,textarea,select,.sheet,.backdrop,.astack,.srail,.table-wrap,.fxchips,.tabs,.pcfcalc,[draggable=true],.pcsweb,.leaflet-container"
      );
    document.addEventListener(
      "touchstart",
      (e) => {
        if (
          e.touches.length !== 1 ||
          blocked(e.target) ||
          PC_ANIM.busy ||
          (ui.view === "more" && ui.tabOpen) ||
          document.querySelector(".backdrop:not([hidden])")
        ) {
          x0 = null;
          return;
        }
        x0 = e.touches[0].clientX;
        y0 = e.touches[0].clientY;
        t0 = Date.now();
        dx = 0;
        horiz = null;
        sec = document.querySelector(`[data-view="${ui.view}"]`);
      },
      {
        passive: true,
        capture: true,
      }
    );
    document.addEventListener(
      "touchmove",
      (e) => {
        if (x0 === null || !sec) return;
        const t = e.touches[0];
        dx = t.clientX - x0;
        const dy = t.clientY - y0;
        if (horiz === null && (Math.abs(dx) > 12 || Math.abs(dy) > 12)) horiz = Math.abs(dx) > Math.abs(dy) * 1.4;
        if (horiz && !calm()) {
          const k = dx / innerWidth;
          sec.style.transition = "none";
          sec.style.transform = `translateX(${dx * 0.55}px) rotate(${k * 3}deg) scale(${1 - Math.abs(k) * 0.06})`;
          sec.style.opacity = String(1 - Math.abs(k) * 0.5);
        }
      },
      {
        passive: true,
        capture: true,
      }
    );
    document.addEventListener(
      "touchend",
      (e) => {
        if (x0 === null || !sec) return;
        const s = sec,
          go = horiz && Math.abs(dx) > 80 && Date.now() - t0 < 1200;
        x0 = null;
        if (horiz && !calm()) {
          s.style.transition = "transform .45s cubic-bezier(.3,1.5,.5,1), opacity .3s";
          s.style.transform = "";
          s.style.opacity = "";
          setTimeout(() => {
            s.style.transition = "";
          }, 460);
        }
        if (go) {
          e.stopImmediatePropagation();
          pcStep(dx < 0 ? 1 : -1);
        }
      },
      {
        passive: true,
        capture: true,
      }
    );
  }
}
/* Einstellungen-Übersicht wie am Handy (PC und Tablet) */
if (IS_PC) {
  const calm = () => pcCalm();
  /* Einstellungen */
  const GROUPS = () => [
    [
      "Geld",
      "#6b8e23",
      [
        "konten",
        "budgets",
        "schulden",
        ...(isJobless() ? ["amt"] : hasProfile() ? ["amt", "steuer"] : ["steuer"]),
        "invest",
        "export",
      ],
    ],
    ["Anpassen", "#1a7a5c", ["toene", "farben", "sprache", "kategorien", "start", "laeden"]],
    [
      "Sicherheit",
      "#3d63a8",
      [
        "sicherheit",
        ...(SYNCABLE || window.AndroidBridge ? ["geraete"] : []),
        "backup",
        ...(CAN_NOTIFY ? ["notify"] : []),
        "speicher",
      ],
    ],
    ["Hilfe", "#c27c0e", ["neu", "hilfe", ...(canShare() ? ["weiter"] : []), "recht"]],
  ];
  const tTitle = (k) => (k === "geraete" && (SYNCABLE || window.AndroidBridge) ? "Geräte & Abgleich" : accTitle(k));
  function tabSetHTML() {
    const n = String(store.settings.name || "").trim(),
      p = store.settings.photo,
      f = devForm(),
      badge = `<span class="avdev">${devIc(f, 11)}</span>`;
    const av = p
      ? `<img src="${escHtml(p)}" alt="">${badge}`
      : n
        ? `<span class="avl">${escHtml(n[0].toUpperCase())}</span>${badge}`
        : devIc(f, 24);
    return `<div class="card tsprof"><button class="topav ${!p && !n ? "devav" : ""}" data-tsprof="1" aria-label="Profil">${av}</button><div style="min-width:0"><b>${escHtml(n || devModel())}</b><small>${escHtml([n ? devModel() : "", SYNC.token ? "Abgleich an" : "Abgleich aus", verFull()].filter(Boolean).join(" · "))}</small></div><span style="flex:1"></span><button class="btn" data-tsprof="1">Profil bearbeiten</button></div>
      <div class="tsqs">${quickSw().map(qsTile).join("")}</div>
      <div class="tsgr">${GROUPS()
        .map(
          ([g, c, ks]) =>
            `<div class="card tsg" style="--gc:${c}"><h3><span class="saic" style="background:${c}">${svgIcon(accIcon(ks[0]), 16)}</span>${escHtml(I18N.tr ? I18N.tr(g) : g)}</h3>${ks
              .filter((k) => SP_PAGES[k] || k === "weiter")
              .map(
                (k) =>
                  `<button data-tsgo="${k}"><span class="saic" style="background:${themeCol(ACC_COL[k] || c)};width:28px;height:28px;border-radius:9px">${svgIcon(accIcon(k), 14)}</span>${escHtml(tTitle(k))}<small>${escHtml(accSub(k) || "")} ›</small></button>`
              )
              .join("")}</div>`
        )
        .join("")}</div>`;
  }
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
    const open = !!ui.tabOpen;
    mix.hidden = open;
    ps.hidden = !open;
    if (!open) {
      const h = tabSetHTML();
      if (mix.dataset.h !== h) {
        mix.dataset.h = h;
        mix.innerHTML = h;
      }
    } else {
      const ph = ps.querySelector(".pcsph");
      if (ph && !ps.querySelector("[data-tsback]"))
        ph.insertAdjacentHTML(
          "beforebegin",
          `<button class="tsback" data-tsback="1"><svg class="i" viewBox="0 0 24 24" style="width:16px;height:16px"><path d="m15 6-6 6 6 6"/></svg> Einstellungen</button>`
        );
    }
    return r;
  };
  const _ag = accGo;
  accGo = function (k) {
    if (k !== "profil") ui.tabOpen = 1;
    return _ag(k);
  };
  document.addEventListener("click", (e) => {
    const g = e.target.closest("[data-tsgo]");
    if (g) {
      const k = g.dataset.tsgo;
      if (k === "weiter") {
        invOpen();
        return;
      }
      ui.tabOpen = 1;
      ui.pcset = k;
      renderSetHome();
      window.scrollTo({
        top: 0,
      });
      const pn = document.querySelector("#setHome .pcsr");
      if (pn && !calm())
        pn.animate(
          [
            {
              opacity: 0,
              transform: "translateX(60px)",
            },
            {
              opacity: 1,
              transform: "none",
            },
          ],
          {
            duration: 420,
            easing: "cubic-bezier(.2,.9,.3,1.2)",
          }
        );
      return;
    }
    if (e.target.closest("[data-tsback]")) {
      ui.tabOpen = 0;
      renderSetHome();
      window.scrollTo({
        top: 0,
      });
      const m = $("tabSet");
      if (m && !calm())
        [...m.querySelectorAll(".card,.tssw>button")].forEach((x, i) =>
          x.animate(
            [
              {
                opacity: 0,
                transform: "translateY(26px) scale(.97)",
              },
              {
                opacity: 1,
                transform: "none",
              },
            ],
            {
              duration: 480,
              delay: i * 35,
              easing: "cubic-bezier(.3,1.3,.5,1)",
              fill: "backwards",
            }
          )
        );
      return;
    }
    if (e.target.closest("[data-tsprof]")) {
      accGo("profil");
      return;
    }
    const w = e.target.closest("[data-tssw]");
    if (w) {
      const k = w.dataset.tssw;
      if (k === "dark") {
        const t = $("pcTheme");
        if (t) t.click();
        setTimeout(renderSetHome, 50);
        return;
      }
      ui.tabOpen = 1;
      ui.pcset = k;
      renderSetHome();
      window.scrollTo({
        top: 0,
      });
    }
  });
}

/* Navigation nicht unter den Monatswähler schieben */
function pcNavFit() {
  if (!IS_PC || document.documentElement.classList.contains("istab")) return;
  const t = document.querySelector(".tabs"),
    mp = document.getElementById("monthpill");
  if (!t || !mp) return;
  // "right" statt translate: translate würde den festen Plus-Knopf in der Leiste mitverschieben (er landete oben im Kopf)
  t.style.right = "";
  const tr = t.getBoundingClientRect(),
    mr = mp.getBoundingClientRect();
  if (!mr.width || mr.top > tr.bottom || mr.bottom < tr.top) return;
  const ov = tr.right - (mr.left - 10);
  if (ov > 0) t.style.right = `${2 * Math.ceil(ov)}px`;
}
addEventListener("resize", () => requestAnimationFrame(pcNavFit));
setTimeout(pcNavFit, 300);
setTimeout(pcNavFit, 1500);

/* Menüleiste am PC wie am Handy: Kapsel gleitet zur aktiven Seite */
if (IS_PC) {
  const pcPill = (anim) => {
    const H = document.documentElement,
      nav = document.querySelector("nav.tabs");
    if (!nav || !H.classList.contains("pc") || H.classList.contains("istab")) return;
    nav.classList.add("navx");
    const ind = nav.querySelector(".tabind");
    if (!ind) return;
    const kids = [...nav.children].filter(
      (e) =>
        e.classList.contains("tab") &&
        !e.classList.contains("plus") &&
        getComputedStyle(e).display !== "none" &&
        getComputedStyle(e).position !== "fixed"
    );
    const act = kids.find((e) => e.getAttribute("aria-selected") === "true");
    nav.classList.toggle("nosel", !act);
    if (!act) return;
    const cs = getComputedStyle(nav),
      gap = parseFloat(cs.columnGap) || 0;
    const W = (t) => {
      const n = t.querySelector(".tname");
      return t === act ? 15 + 22 + 8 + Math.min(140, n ? n.scrollWidth : 0) + 18 : 52;
    };
    let x = parseFloat(cs.paddingLeft) || 0;
    for (const t of kids) {
      if (t === act) break;
      x += W(t) + gap;
    }
    const col =
      getComputedStyle(act).getPropertyValue("--tcol").trim() ||
      getComputedStyle(H).getPropertyValue("--accent").trim();
    ind.style.setProperty("--ic", col);
    ind.style.left = x + "px";
    ind.style.width = W(act) + "px";
    if (anim && !pcCalm())
      act.querySelector("svg")?.animate(
        [
          {
            transform: "translateY(4px) scale(.85)",
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
  };
  const _np = navPill;
  navPill = function (anim) {
    _np(anim);
    try {
      pcPill(anim);
    } catch (_) {}
  };
  try {
    document.fonts.ready.then(() => pcPill(false));
  } catch (_) {}
  setTimeout(() => pcPill(false), 300);
  new MutationObserver((ms) => {
    if (ms.some((m) => m.attributeName === "aria-selected" && m.target.getAttribute("aria-selected") === "true"))
      pcPill(true);
  }).observe(document.querySelector("nav.tabs") || document.body, {
    subtree: true,
    attributes: true,
    attributeFilter: ["aria-selected"],
  });
}

/* Umbuchen am PC: ein Konto in der grünen Karte direkt auf ein anderes ziehen (Tablet: wie am Handy) */
function pcMvOk() {
  return IS_DESK && (ui.acctEd || []).filter(Boolean).length > 1;
}
if (IS_DESK) {
  const sheetEl = () => {
    let sh = $("mvSheet");
    if (!sh) {
      sh = document.createElement("div");
      sh.id = "mvSheet";
      sh.className = "mvsheet mvpcs";
      sh.hidden = true;
      sh.setAttribute("role", "dialog");
      sh.setAttribute("aria-modal", "true");
      document.body.appendChild(sh);
    }
    return sh;
  };
  sheetEl();
  /* am PC gibt es kein Aufklapp-Fenster: Mami/FAQ zeigen stattdessen die Karte */
  mvOpen = function () {
    ui.view = "home";
    render();
    const h = document.querySelector("#pcHero .pcaccs");
    if (!h || !document.querySelector("#pcHero [data-mvi]")) {
      toast(uiText("mv_nostand_t"));
      return;
    }
    h.classList.remove("mvpulse");
    void h.offsetWidth;
    h.classList.add("mvpulse");
    toast(uiText("mv_pc"));
    SND.play("ping");
  };
  const _sc = mvSheetClose;
  mvSheetClose = function () {
    _sc();
    document.querySelectorAll("#pcHero [data-mvi]").forEach((c) => c.classList.remove("src", "tgt"));
  };
  const _do = mvDo;
  mvDo = async function () {
    const a = MV.from && MV.from.i,
      b = MV.to && MV.to.i;
    await _do();
    for (const [k, cl] of [
      [a, "gave"],
      [b, "got"],
    ]) {
      const c = document.querySelector(`#pcHero [data-mvi="${k}"]`);
      if (c) {
        c.classList.add(cl);
        setTimeout(() => c.classList.remove(cl), 1100);
      }
    }
  };
  let st = null,
    busy = 0,
    eat = false;
  const tgtAt = (x, y, src) => {
    const el = document.elementFromPoint(x, y);
    const t = el && el.closest("#pcHero [data-mvi]");
    return t && t.dataset.mvi !== src.dataset.mvi ? t : null;
  };
  const end = (e) => {
    if (!st) return;
    const d = st;
    st = null;
    if (!d.on) return;
    eat = true;
    setTimeout(() => {
      eat = false;
    }, 60);
    if (d.ghost) {
      d.ghost.classList.add("drop");
      setTimeout(() => d.ghost.remove(), 160);
    }
    document.body.classList.remove("mvdragging");
    document.querySelectorAll("#pcHero [data-mvi]").forEach((c) => c.classList.remove("tgt", "dragok"));
    const tg = e && e.type !== "pointercancel" ? tgtAt(e.clientX, e.clientY, d.src) : null;
    if (!tg) {
      d.src.classList.remove("src");
      MVFX.drop(null);
      SND.play("whooshin");
      return;
    }
    const to = +tg.dataset.mvi;
    if (!mvHas(mvList().find((x) => x.i === to))) {
      d.src.classList.remove("src");
      MVFX.drop(null);
      toast(uiText("mv_nostand_t"));
      SND.play("warn");
      return;
    }
    tg.classList.add("tgt");
    sheetEl();
    if (d.fx) {
      /* erst landen die Scheine, dann kommt das Betrag-Fenster */
      MVFX.drop(tg);
      busy = setTimeout(() => {
        busy = 0;
        mvSheet(d.from, to);
      }, 380);
    } else {
      SND.play("pop");
      mvSheet(d.from, to);
    }
  };
  document.addEventListener(
    "pointerdown",
    (e) => {
      const c = e.target.closest("#pcHero [data-mvi]");
      if (!c || busy || e.pointerType !== "mouse" || e.button !== 0 || !sheetEl().hidden) return;
      st = {
        src: c,
        from: +c.dataset.mvi,
        x0: e.clientX,
        y0: e.clientY,
        on: false,
      };
    },
    true
  );
  document.addEventListener("pointermove", (e) => {
    if (!st) return;
    if (!st.on) {
      if (Math.hypot(e.clientX - st.x0, e.clientY - st.y0) < 6) return;
      const m = mvList().find((x) => x.i === st.from);
      if (!mvHas(m)) {
        st = null;
        toast(uiText("mv_nostand_t"));
        return;
      }
      st.fx = MVFX.on();
      if (st.fx) MVFX.start(st.src, "#pcHero [data-mvi]", st.x0, st.y0, false);
      else {
        const r = st.src.getBoundingClientRect(),
          g = st.src.cloneNode(true);
        g.removeAttribute("data-mvi");
        g.removeAttribute("data-spgo");
        g.className = "mvpcghost";
        const gw = Math.min(r.width, 190);
        g.style.width = gw + "px";
        g.style.left = Math.max(8, st.x0 - gw + 22) + "px";
        g.style.top = Math.max(8, st.y0 - r.height + 14) + "px";
        g.style.background = getComputedStyle(document.getElementById("pcHero")).backgroundImage;
        document.body.appendChild(g);
        st.ghost = g;
        st.dx = gw - 22;
        st.dy = r.height - 14;
      }
      st.on = true;
      st.src.classList.add("src");
      document.body.classList.add("mvdragging");
      document.querySelectorAll("#pcHero [data-mvi]").forEach((c) => {
        if (c !== st.src) c.classList.add("dragok");
      });
      if (!st.fx) SND.play("detent");
    }
    e.preventDefault();
    if (st.ghost) {
      st.ghost.style.left = Math.max(8, e.clientX - st.dx) + "px";
      st.ghost.style.top = Math.max(8, e.clientY - st.dy) + "px";
    } else MVFX.move(e.clientX, e.clientY);
    const t = tgtAt(e.clientX, e.clientY, st.src);
    document.querySelectorAll("#pcHero [data-mvi].tgt").forEach((c) => {
      if (c !== t) c.classList.remove("tgt");
    });
    if (t && !t.classList.contains("tgt")) {
      t.classList.add("tgt");
      SND.play("tick");
    }
  });
  document.addEventListener("pointerup", end, true);
  document.addEventListener("pointercancel", end, true);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && st && st.on) {
      if (st.ghost) st.ghost.remove();
      MVFX.drop(null);
      st.src.classList.remove("src");
      document.body.classList.remove("mvdragging");
      document.querySelectorAll("#pcHero [data-mvi]").forEach((c) => c.classList.remove("tgt", "dragok"));
      st = null;
    } else if (e.key === "Escape" && !sheetEl().hidden) mvSheetClose();
  });
  document.addEventListener(
    "click",
    (e) => {
      if (eat && e.target.closest("#pcHero")) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true
  );
  document.addEventListener(
    "dragstart",
    (e) => {
      if (e.target.closest && e.target.closest("#pcHero [data-mvi]")) e.preventDefault();
    },
    true
  );
}

/* Plus-Menü am PC: Viertelkreis um das +, alle Knöpfe, drehen mit Mausrad, Ziehen und Pfeiltasten */
if (IS_DESK) {
  const fan = $("fanBg");
  const SUBK = {
    hand: "fs_hand",
    pcscan: "fs_scan",
    receipt: "fs_scan",
    import: "fs_import",
    settings: "fs_settings",
    profil: "fs_profil",
    hilfe: "fs_hilfe",
    qr: "fs_qr",
  };
  const PF = {
    t0: 0,
    dragA: null,
    r0: 0,
    la: 0,
    lt: 0,
    v: 0,
    acc: 0,
    wt: 0,
    closing: false,
  };
  const cl = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)),
    eo = (t) => 1 - Math.pow(1 - t, 3),
    back = (t) => {
      const c1 = 1.5,
        c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    };
  const SP = 30,
    FRONT = 135;
  const geo = () => {
    const r = document.querySelector(".tab.plus").getBoundingClientRect();
    return {
      cx: r.left + r.width / 2,
      cy: r.top + r.height / 2,
      R: Math.round(cl(innerHeight * 0.32, 190, 268)),
    };
  };
  const arc = (cx, cy, r, a0, a1) => {
    const P = (a) => [cx + r * Math.cos((a * Math.PI) / 180), cy - r * Math.sin((a * Math.PI) / 180)];
    const [x0, y0] = P(a0),
      [x1, y1] = P(a1);
    return `M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${r} ${r} 0 0 0 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  };
  function prep() {
    if (!fan.querySelector(".fpcband"))
      fan.insertAdjacentHTML(
        "afterbegin",
        `<svg class="fpcband" aria-hidden="true"><defs><linearGradient id="fpcGl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" class="fg0"/><stop offset="1" class="fg1"/></linearGradient></defs><path class="fpb"/><path class="fpe"/><g class="fpd"></g></svg><div class="fpcripple" aria-hidden="true"></div><button class="fpcx" type="button" data-addclose="1" aria-label="Schließen"><svg class="i" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button>`
      );
    fan.querySelectorAll(".fanb").forEach((b) => {
      if (!b.querySelector(".fsub")) {
        const k = SUBK[b.dataset.addpick];
        if (k) b.insertAdjacentHTML("beforeend", `<small class="fsub" data-noi18n></small>`);
      }
      const sm = b.querySelector(".fsub"),
        k = SUBK[b.dataset.addpick];
      if (sm && k) sm.textContent = uiText(k);
    });
    const h = $("fanHint");
    if (h)
      h.innerHTML = `↻ <span data-noi18n>${escHtml(uiText("fan_pc_hint"))}</span> <kbd>←</kbd><kbd>→</kbd><kbd>Enter</kbd>`;
  }
  window.pcFanOpen = function () {
    prep();
    const q = fan.querySelector('[data-addpick="qr"]');
    if (q) q.hidden = !canShare();
    fan.classList.add("wheel", "pcw");
    fan.classList.remove("closing");
    SND.play("whoosh");
    FW.open = true;
    FW.rot = FW.target = 0;
    FW.t = 0;
    PF.t0 = performance.now();
    fan.hidden = false;
    const pl = document.querySelector(".tab.plus");
    pl.classList.add("open");
    const rp = fan.querySelector(".fpcripple");
    if (rp) {
      const g = geo();
      rp.style.left = g.cx + "px";
      rp.style.top = g.cy + "px";
      rp.classList.remove("go");
      void rp.offsetWidth;
      rp.classList.add("go");
    }
    {
      const x = fan.querySelector(".fpcx"),
        r = pl.getBoundingClientRect();
      if (x) {
        x.style.left = r.left + "px";
        x.style.top = r.top + "px";
        x.style.width = r.width + "px";
        x.style.height = r.height + "px";
      }
    }
    requestAnimationFrame(() => fan.classList.add("show"));
    fanKick();
    let n = 0;
    try {
      n = Number(localStorage.getItem("hb-fanhint")) || 0;
      localStorage.setItem("hb-fanhint", String(n + 1));
    } catch (_) {}
    $("fanHint").classList.toggle("on", n < 6);
    setTimeout(() => {
      try {
        fan.focus({
          preventScroll: true,
        });
      } catch (_) {}
    }, 50);
  };
  const steps = () => {
    const N = fanItems().length,
      ST = 360 / N;
    return {
      N,
      ST,
      f: FW.rot / ST,
    };
  };
  const wrap = (d, N) => (((d % N) + N * 1.5) % N) - N / 2;
  const _fd = fanDraw;
  fanDraw = function () {
    if (!fan.classList.contains("pcw")) return _fd();
    const items = fanItems(),
      { N, f } = steps(),
      { cx, cy, R } = geo(),
      el = performance.now() - PF.t0,
      rm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const closeK = FW.open ? 1 : eo(cl(FW.t));
    let anim = false;
    const bk = FW.open ? (rm ? 1 : back(cl((el - 40) / 520))) : closeK;
    if (FW.open && el < 620) anim = true;
    const band = fan.querySelector(".fpcband");
    if (band) {
      const br = Math.max(1, R * bk);
      band.querySelector(".fpb").setAttribute("d", arc(cx, cy, br, 62, 208));
      band.querySelector(".fpb").style.strokeWidth = (112 * cl(bk, 0, 1.15)).toFixed(1);
      band.style.opacity = cl(bk * 1.4).toFixed(3);
      band.querySelector(".fpe").setAttribute("d", arc(cx, cy, br + 56 * cl(bk), 64, 206));
      const fi = ((Math.round(f) % N) + N) % N;
      let h = "";
      for (let i = 0; i < N; i++) {
        const a = 112 + i * (46 / Math.max(1, N - 1)),
          r = (R + 44) * cl(bk),
          x = cx + Math.cos((a * Math.PI) / 180) * r,
          y = cy - Math.sin((a * Math.PI) / 180) * r,
          on = i === fi;
        h += `<rect x="${(x - (on ? 8 : 3)).toFixed(1)}" y="${(y - 3).toFixed(1)}" width="${on ? 16 : 6}" height="6" rx="3" class="${on ? "on" : ""}" transform="rotate(${(-(a - 90)).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
      }
      band.querySelector(".fpd").innerHTML = h;
    }
    items.forEach((b, i) => {
      const d = wrap(i - f, N),
        ad = Math.abs(d * SP),
        a = FRONT + d * SP;
      const ik = FW.open ? (rm ? 1 : back(cl((el - 120 - i * 45) / 420))) : closeK;
      if (FW.open && el < 120 + i * 45 + 420) anim = true;
      const sc =
        ad <= 30
          ? 1.18 - (0.32 * ad) / 30
          : ad <= 60
            ? 0.86 - (0.26 * (ad - 30)) / 30
            : 0.6 - 0.25 * cl((ad - 60) / 30);
      const op = ad <= 30 ? 1 : ad <= 60 ? 1 - (0.5 * (ad - 30)) / 30 : 0.5 * (1 - cl((ad - 60) / 30));
      const r = R * ik,
        x = cx + Math.cos((a * Math.PI) / 180) * r,
        y = cy - Math.sin((a * Math.PI) / 180) * r;
      b.style.left = x.toFixed(1) + "px";
      b.style.top = y.toFixed(1) + "px";
      b.style.transform = `scale(${(sc * (0.3 + 0.7 * cl(ik))).toFixed(3)})`;
      b.style.opacity = (op * cl(ik * 1.3)).toFixed(3);
      b.style.zIndex = String(Math.round(200 - ad));
      b.style.pointerEvents = FW.open && op > 0.25 ? "auto" : "none";
      const front = ad < 15;
      b.classList.toggle("front", front);
      b.classList.toggle("lab", ad < 45);
      b.classList.remove("peek");
      b.dataset.d = (-d).toFixed(2);
      b.tabIndex = front ? 0 : -1;
    });
    const hn = $("fanHint");
    if (hn) {
      hn.style.right = Math.max(16, innerWidth - (cx - R - 70)) + "px";
      hn.style.bottom = Math.max(16, innerHeight - cy - 14) + "px";
    }
    if (anim)
      requestAnimationFrame(() => {
        if (!FW.raf) fanKick();
      });
    if (!FW.open && FW.t <= 0) {
      fan.classList.remove("pcw");
    }
  };
  const isOpen = () => fan.classList.contains("pcw") && FW.open && !fan.hidden;
  const angle = (e) => {
    const { cx, cy } = geo();
    return (Math.atan2(cy - e.clientY, e.clientX - cx) * 180) / Math.PI;
  };
  const snap = (t, silent) => {
    const { ST } = steps();
    const n = Math.round(t / ST) * ST;
    if (n !== FW.target && !silent) {
      SND.play("detent");
    }
    FW.target = n;
    fanKick();
  };
  document.addEventListener(
    "pointerdown",
    (e) => {
      if (!isOpen() || e.button !== 0 || !e.target.closest("#fanBg")) return;
      e.stopPropagation();
      PF.dragA = angle(e);
      PF.r0 = FW.rot;
      PF.la = PF.dragA;
      PF.lt = performance.now();
      PF.v = 0;
      PF.x0 = e.clientX;
      PF.y0 = e.clientY;
      FW.moved = false;
    },
    true
  );
  document.addEventListener(
    "pointermove",
    (e) => {
      if (PF.dragA == null || !isOpen()) return;
      e.stopPropagation();
      const a = angle(e);
      let da = a - PF.dragA;
      if (da > 180) da -= 360;
      if (da < -180) da += 360;
      if (!FW.moved && Math.hypot(e.clientX - PF.x0, e.clientY - PF.y0) > 6) {
        FW.moved = true;
        FW.drag = true;
        $("fanHint").classList.remove("on");
        fan.classList.add("dragging");
      }
      if (!FW.moved) return;
      const { ST } = steps(),
        now = performance.now();
      PF.v = (a - PF.la) / Math.max(1, now - PF.lt);
      PF.la = a;
      PF.lt = now;
      FW.rot = PF.r0 - (da / SP) * ST;
      FW.target = FW.rot;
      fanKick();
    },
    true
  );
  const up = (e) => {
    if (PF.dragA == null) return;
    if (e) e.stopPropagation();
    PF.dragA = null;
    fan.classList.remove("dragging");
    if (!FW.moved) return;
    FW.drag = false;
    const { ST } = steps();
    const fl = cl((-PF.v * 120) / SP, -1, 1);
    snap(FW.rot + fl * ST);
    setTimeout(() => {
      FW.moved = false;
    }, 60);
  };
  document.addEventListener("pointerup", up, true);
  document.addEventListener("pointercancel", up, true);
  window.addEventListener(
    "click",
    (e) => {
      if (!fan.classList.contains("pcw") || !e.target.closest("#fanBg")) return;
      if (FW.moved) {
        e.stopImmediatePropagation();
        e.preventDefault();
        return;
      }
      const b = e.target.closest(".fanb");
      if (b && !b.classList.contains("front")) {
        e.stopImmediatePropagation();
        e.preventDefault();
        const { ST } = steps();
        snap(FW.target - Number(b.dataset.d) * ST);
        return;
      }
    },
    true
  );
  fan.addEventListener(
    "wheel",
    (e) => {
      if (!isOpen()) return;
      e.preventDefault();
      const now = performance.now();
      PF.acc += Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (Math.abs(PF.acc) >= 40 && now - PF.wt > 90) {
        const { ST } = steps();
        PF.wt = now;
        snap(FW.target + Math.sign(PF.acc) * ST);
        PF.acc = 0;
        $("fanHint").classList.remove("on");
      }
    },
    {
      passive: false,
    }
  );
  document.addEventListener(
    "keydown",
    (e) => {
      if (!isOpen()) return;
      const { ST } = steps();
      if (["ArrowRight", "ArrowDown"].includes(e.key)) {
        e.preventDefault();
        snap(FW.target + ST);
      } else if (["ArrowLeft", "ArrowUp"].includes(e.key)) {
        e.preventDefault();
        snap(FW.target - ST);
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const b = fan.querySelector(".fanb.front");
        if (b) b.click();
      } else if (e.key === "Escape") {
        e.preventDefault();
        fanClose();
      }
    },
    true
  );
}

/* Entwickler-Knopf in der Kopfzeile: Freigabe & Tester, Feedback-Eingang, Werkzeuge */
if (IS_DESK) {
  const WR = `<svg class="i" viewBox="0 0 24 24"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.1L4 16.7 7.3 20l5.3-5.3a4 4 0 0 0 5.1-5.4l-2.4 2.4-2.4-.6-.6-2.4z"/></svg>`;
  function devW() {
    let w = $("pcDevW");
    if (!updKey()) {
      if (w) {
        ["pcRel", "pcInbox"].forEach((i) => {
          const b = $(i);
          if (b) b.remove();
        });
        w.remove();
      }
      return;
    }
    const ref = $("pcRefresh") || $("pcTheme");
    if (!ref) return;
    if (!w) {
      ref.insertAdjacentHTML(
        "beforebegin",
        `<span class="pcdevw" id="pcDevW"><button class="roundbtn pcdev" id="pcDev" aria-haspopup="menu" aria-expanded="false" aria-label="${escHtml(uiText("dv_t"))}" title="${escHtml(uiText("dv_t") + " – " + uiText("dv_note"))}">${WR}<i class="badge" hidden></i><i class="dot" hidden></i></button></span>`
      );
      w = $("pcDevW");
    }
    ["pcRel", "pcInbox"].forEach((i) => {
      const b = $(i);
      if (b && b.parentElement !== w) {
        w.appendChild(b);
        b.tabIndex = -1;
        b.setAttribute("aria-hidden", "true");
      }
    });
    const ib = $("pcInbox"),
      bd = ib && ib.querySelector(".badge"),
      mb = w.querySelector(".pcdev .badge"),
      n = bd && !bd.hidden ? bd.textContent : "";
    if (mb) {
      if (mb.textContent !== n) {
        const was = Number(mb.textContent) || 0;
        mb.textContent = n;
        if ((Number(n) || 0) > was)
          w.querySelector(".pcdev").animate(
            [
              {
                transform: "rotate(0)",
              },
              {
                transform: "rotate(-16deg) scale(1.12)",
                offset: 0.3,
              },
              {
                transform: "rotate(10deg)",
                offset: 0.6,
              },
              {
                transform: "none",
              },
            ],
            {
              duration: 650,
            }
          );
      }
      mb.hidden = !n;
    }
    const rd = $("pcRel") && $("pcRel").querySelector(".dot"),
      md = w.querySelector(".pcdev .dot");
    if (md) md.hidden = !(rd && !rd.hidden) || !!n;
    const p = $("pcDevPop");
    if (p) paint(p);
  }
  const row = (k, svg, t, sub, badge) =>
    `<button class="pcdvr" data-pcdv="${k}" role="menuitem"><span class="pcdvi">${svg}</span><span class="pcdvt"><b>${escHtml(t)}</b><small>${escHtml(sub)}</small></span>${badge ? `<i class="badge">${escHtml(badge)}</i>` : `<span class="pcdva" aria-hidden="true">›</span>`}</button>`;
  const UP = `<svg class="i" viewBox="0 0 24 24"><path d="M12 15V3M7 8l5-5 5 5"/><path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/></svg>`,
    INBOX = `<svg class="i" viewBox="0 0 24 24"><path d="M4 13.5 6.5 5h11l2.5 8.5V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M4 13.5h4.5l1 2h5l1-2H20"/></svg>`,
    PEOPLE = `<svg class="i" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.2"/><path d="M3 19c.6-3.3 3-5 6-5s5.4 1.7 6 5"/><path d="M16 4.6a3 3 0 0 1 0 6.3M17.5 14c2 .5 3.2 2.1 3.5 5"/></svg>`;
  /* Tester, die noch eine ältere Version haben – bekannt, sobald die Einladungen einmal geladen wurden */
  function oldTesters() {
    try {
      const L = ui.invL || [];
      if (!L.length) return 0;
      const N = invNewest(L);
      return L.filter((x) => invStage(x) === 2 && invOld(x, N)).length;
    } catch (_) {
      return 0;
    }
  }
  const group = (k) => `<div class="pcdvg">${escHtml(uiText(k))}</div>`;
  function paint(p) {
    const ib = $("pcInbox"),
      bd = ib && ib.querySelector(".badge"),
      n = bd && !bd.hidden ? bd.textContent : "",
      old = oldTesters();
    p.innerHTML =
      `<div class="pcdvh">${escHtml(uiText("dv_t"))}<small>${escHtml(uiText("dv_note"))}</small></div>` +
      group("dv_g_rel") +
      row("rel", UP, uiText("dv_rel"), uiText("dv_rel_s"), "") +
      group("dv_g_test") +
      row(
        "inv",
        PEOPLE,
        uiText("dv_inv"),
        old ? uiText("dv_inv_old", { n: old }) : uiText("dv_inv_s"),
        old ? String(old) : ""
      ) +
      row("fb", INBOX, uiText("dv_fb"), uiText("dv_fb_s"), n) +
      group("dv_g_dbg") +
      row("tools", WR, uiText("dv_tools"), uiText("dv_tools_s"), "");
    p.setAttribute("data-noi18n", "");
  }
  function popClose() {
    const p = $("pcDevPop");
    if (!p) return;
    p.classList.add("out");
    const b = $("pcDev");
    if (b) b.setAttribute("aria-expanded", "false");
    setTimeout(() => p.remove(), 160);
  }
  function popOpen() {
    const b = $("pcDev");
    if (!b) return;
    const r = b.getBoundingClientRect();
    const p = document.createElement("div");
    p.id = "pcDevPop";
    p.className = "pcdevpop";
    p.setAttribute("role", "menu");
    p.style.top = r.bottom + 10 + "px";
    p.style.left = Math.max(12, Math.min(innerWidth - 352, r.left + r.width / 2 - 170)) + "px";
    p.style.setProperty(
      "--ax",
      Math.round(r.left + r.width / 2 - Math.max(12, Math.min(innerWidth - 352, r.left + r.width / 2 - 170))) + "px"
    );
    paint(p);
    document.body.appendChild(p);
    /* frischen Stand der Tester holen und nur die Tester-Zeile nachziehen */
    if (typeof canInvite === "function" && canInvite()) {
      const before = oldTesters();
      invLoad().then(() => {
        const q = $("pcDevPop"),
          now = oldTesters();
        if (!q || now === before) return;
        const r = q.querySelector('[data-pcdv="inv"]');
        if (r)
          r.outerHTML = row(
            "inv",
            PEOPLE,
            uiText("dv_inv"),
            now ? uiText("dv_inv_old", { n: now }) : uiText("dv_inv_s"),
            now ? String(now) : ""
          );
      });
    }
    b.setAttribute("aria-expanded", "true");
    SND.play("pop");
    const f = p.querySelector(".pcdvr");
    if (f)
      f.focus({
        preventScroll: true,
      });
  }
  document.addEventListener(
    "click",
    (e) => {
      if (e.target.closest("#pcDev")) {
        e.stopPropagation();
        if ($("pcDevPop")) popClose();
        else {
          const rp = $("pcRelPop");
          if (rp) rp.remove();
          popOpen();
        }
        return;
      }
      const r = e.target.closest("[data-pcdv]");
      if (r) {
        const k = r.dataset.pcdv;
        popClose();
        if (k === "rel") {
          const b = $("pcRel");
          if (b) setTimeout(() => b.click(), 20);
        } else if (k === "fb") {
          const b = $("pcInbox");
          if (b) setTimeout(() => b.click(), 20);
        } else if (k === "inv") {
          setTimeout(() => invOpen(), 20);
        } else if (k === "tools") {
          setTimeout(() => {
            try {
              devOpen();
            } catch (_) {}
          }, 60);
        }
        return;
      }
      if ($("pcDevPop") && !e.target.closest("#pcDevPop")) popClose();
    },
    true
  );
  document.addEventListener("keydown", (e) => {
    const p = $("pcDevPop");
    if (!p) return;
    if (e.key === "Escape") {
      popClose();
      const b = $("pcDev");
      if (b) b.focus();
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const L = [...p.querySelectorAll(".pcdvr")],
        i = L.indexOf(document.activeElement);
      L[(i + (e.key === "ArrowDown" ? 1 : -1) + L.length) % L.length].focus();
    }
  });
  const _rd = render;
  render = (...a) => {
    const x = _rd(...a);
    try {
      devW();
    } catch (_) {}
    return x;
  };
  setInterval(() => {
    try {
      devW();
    } catch (_) {}
  }, 3000);
  setTimeout(() => {
    try {
      devW();
    } catch (_) {}
  }, 600);
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-fxcol]");
  if (!b) return;
  store.settings.fxColBy = b.dataset.fxcol;
  saveSettings();
  renderFix();
});
document.addEventListener("change", (e) => {
  const a = e.target.closest("[data-pf=acct]");
  if (!a) return;
  const i = a.parentElement.querySelector("[data-pf=acctnew]");
  if (i) {
    i.hidden = a.value !== "__new";
    if (!i.hidden) i.focus();
  }
});
