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
