/* Kalender: Drehrad + Schnellwahl (ersetzt alle Datums-/Monats-/Uhrzeitfelder) */
const COLOR_TEXTS = {
  ok: ["Übernehmen", "Apply", "Uygula", "Применить", "Застосувати", "Zastosuj", "تطبيق", "Aplică"],
  clr: ["Löschen", "Clear", "Temizle", "Очистить", "Очистити", "Wyczyść", "مسح", "Șterge"],
  pd: [
    "Datum wählen",
    "Choose date",
    "Tarih seç",
    "Выбрать дату",
    "Обрати дату",
    "Wybierz datę",
    "اختر التاريخ",
    "Alege data",
  ],
  pm: [
    "Monat wählen",
    "Choose month",
    "Ay seç",
    "Выбрать месяц",
    "Обрати місяць",
    "Wybierz miesiąc",
    "اختر الشهر",
    "Alege luna",
  ],
  pt: ["Uhrzeit", "Time", "Saat", "Время", "Час", "Godzina", "الوقت", "Ora"],
  hd: ["Datum", "Date", "Tarih", "Дата", "Дата", "Data", "التاريخ", "Data"],
  hm: ["Monat", "Month", "Ay", "Месяц", "Місяць", "Miesiąc", "الشهر", "Luna"],
  eoy: [
    "Ende des Jahres",
    "End of year",
    "Yıl sonu",
    "Конец года",
    "Кінець року",
    "Koniec roku",
    "نهاية السنة",
    "Sfârșitul anului",
  ],
  boy: [
    "Jahresanfang",
    "Start of year",
    "Yıl başı",
    "Начало года",
    "Початок року",
    "Początek roku",
    "بداية السنة",
    "Începutul anului",
  ],
  eom: [
    "Monatsende",
    "End of month",
    "Ay sonu",
    "Конец месяца",
    "Кінець місяця",
    "Koniec miesiąca",
    "نهاية الشهر",
    "Sfârșitul lunii",
  ],
  nsat: [
    "Nächster Samstag",
    "Next Saturday",
    "Gelecek cumartesi",
    "Следующая суббота",
    "Наступна субота",
    "Następna sobota",
    "السبت القادم",
    "Sâmbăta viitoare",
  ],
  now: ["Jetzt", "Now", "Şimdi", "Сейчас", "Зараз", "Teraz", "الآن", "Acum"],
  hint: [
    "Mausrad oder Pfeiltasten ↑ ↓",
    "Mouse wheel or arrow keys ↑ ↓",
    "Fare tekerleği veya ok tuşları ↑ ↓",
    "Колесо мыши или стрелки ↑ ↓",
    "Коліщатко миші або стрілки ↑ ↓",
    "Kółko myszy lub strzałki ↑ ↓",
    "عجلة الفأرة أو الأسهم ↑ ↓",
    "Rotița mouse-ului sau săgețile ↑ ↓",
  ],
};
const CAL_LOC = {
  de: "de-DE",
  en: "en-GB",
  tr: "tr-TR",
  ru: "ru-RU",
  uk: "uk-UA",
  pl: "pl-PL",
  ar: "ar-u-nu-latn",
  ro: "ro-RO",
};
function colorLabel(k) {
  const a = COLOR_TEXTS[k],
    i = ["de", "en", "tr", "ru", "uk", "pl", "ar", "ro"].indexOf(LANG);
  return a[i < 0 ? 0 : i] || a[0];
}
function cLoc() {
  return CAL_LOC[LANG] || "de-DE";
}
const cCap = (s) => (s ? s.charAt(0).toLocaleUpperCase(cLoc()) + s.slice(1) : s);
const cRtf = () =>
  new Intl.RelativeTimeFormat(cLoc(), {
    numeric: "auto",
  });
const VSET = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
function cParse(k, v) {
  if (!v) return null;
  if (k === "time") {
    const m = /^(\d\d):(\d\d)/.exec(v);
    return m
      ? {
          h: +m[1],
          mi: +m[2],
        }
      : null;
  }
  const m = /^(\d{4})-(\d\d)(?:-(\d\d))?/.exec(v);
  return m
    ? {
        y: +m[1],
        m: +m[2],
        d: +(m[3] || 1),
      }
    : null;
}
function cIso(k, s) {
  return k === "time"
    ? pad(s.h) + ":" + pad(s.mi)
    : k === "month"
      ? s.y + "-" + pad(s.m)
      : s.y + "-" + pad(s.m) + "-" + pad(s.d);
}
function cDim(y, m) {
  return new Date(y, m, 0).getDate();
}
function cRel(k, s) {
  const n = new Date();
  try {
    if (k === "date") {
      const dd = Math.round(
        (new Date(s.y, s.m - 1, s.d) - new Date(n.getFullYear(), n.getMonth(), n.getDate())) / 864e5
      );
      if (Math.abs(dd) <= 2) return cRtf().format(dd, "day");
      return "";
    }
    if (k === "month") {
      const dm = (s.y - n.getFullYear()) * 12 + (s.m - 1 - n.getMonth());
      if (dm >= 12 && dm % 12 === 0) return cRtf().format(dm / 12, "year");
      if (dm >= -1 && dm <= 48) return cRtf().format(dm, "month");
    }
  } catch (_) {}
  return "";
}
function cFmt(k, s, long) {
  if (k === "time") return pad(s.h) + ":" + pad(s.mi);
  if (k === "month")
    return cCap(
      new Intl.DateTimeFormat(cLoc(), {
        month: "long",
        year: "numeric",
      }).format(new Date(s.y, s.m - 1, 1))
    );
  return new Intl.DateTimeFormat(
    cLoc(),
    long
      ? {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }
      : {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        }
  ).format(new Date(s.y, s.m - 1, s.d));
}
function calShow(el) {
  const k = el.dataset.cal,
    s = cParse(k, el._cv);
  let t = "";
  if (s) {
    t = cFmt(k, s);
    const r = cRel(k, s);
    if (r) t += " · " + r;
  }
  el.placeholder = k === "time" ? colorLabel("pt") : colorLabel(k === "month" ? "pm" : "pd");
  VSET.call(el, t);
  el.classList.toggle("calempty", !s);
}
function calFut(el) {
  return /until|end|due|invg|pku|pcpdu/i.test(
    [el.id, ...Object.keys(el.dataset), el.dataset.gf || "", el.dataset.df || "", el.dataset.pf || ""].join(" ")
  );
}
function calMount(el) {
  if (el._cal) return;
  const k = el.type;
  if (!["date", "month", "time"].includes(k)) return;
  const v = el.value || el.getAttribute("value") || "";
  el._cal = 1;
  el._cv = v;
  el.dataset.cal = k;
  el.dataset.fut = calFut(el) ? "1" : "";
  el.type = "text";
  el.readOnly = true;
  el.setAttribute("inputmode", "none");
  el.setAttribute("autocomplete", "off");
  el.setAttribute("data-noi18n", "");
  el.classList.add("calin");
  Object.defineProperty(el, "value", {
    configurable: true,
    get() {
      return el._cv || "";
    },
    set(x) {
      el._cv = x == null ? "" : String(x);
      calShow(el);
    },
  });
  calShow(el);
}
function calScan(root) {
  (root || document).querySelectorAll('input[type="date"],input[type="month"],input[type="time"]').forEach(calMount);
}
new MutationObserver((ms) => {
  for (const m of ms)
    for (const n of m.addedNodes) {
      if (n.nodeType !== 1) continue;
      if (n.tagName === "INPUT") calMount(n);
      else if (n.querySelector) calScan(n);
    }
}).observe(document.documentElement, {
  childList: true,
  subtree: true,
});
document.addEventListener("DOMContentLoaded", () => calScan());
const CAL = {
  el: null,
  s: null,
  k: null,
};
function calTitle(el) {
  let t = "";
  if (el.id) {
    const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
    if (l) t = l.textContent;
  }
  if (!t) t = el.getAttribute("aria-label") || "";
  if (!t) {
    const f = el.closest(".field,label");
    const l = f && f.querySelector("label,small,.lab");
    if (l && l !== el) t = l.textContent;
  }
  t = (t || "").trim();
  return t
    ? tr(t).replace(/\s*\([^()]*\)\s*$/, "")
    : colorLabel(CAL.k === "month" ? "hm" : CAL.k === "time" ? "pt" : "hd");
}
function calChips() {
  const k = CAL.k,
    n = new Date(),
    y = n.getFullYear(),
    m = n.getMonth() + 1,
    d = n.getDate(),
    fut = CAL.el.dataset.fut === "1",
    R = cRtf(),
    o = [];
  const D = (dt) => ({
    y: dt.getFullYear(),
    m: dt.getMonth() + 1,
    d: dt.getDate(),
  });
  if (k === "time") {
    o.push([
      colorLabel("now"),
      {
        h: n.getHours(),
        mi: n.getMinutes(),
      },
    ]);
    for (const h of [8, 12, 18, 20])
      o.push([
        pad(h) + ":00",
        {
          h,
          mi: 0,
        },
      ]);
    return o;
  }
  if (k === "month") {
    const M = (dm) => {
      const t = new Date(y, m - 1 + dm, 1);
      return {
        y: t.getFullYear(),
        m: t.getMonth() + 1,
        d: 1,
      };
    };
    if (fut) {
      o.push(
        [cCap(R.format(3, "month")), M(3)],
        [cCap(R.format(6, "month")), M(6)],
        [cCap(R.format(1, "year")), M(12)],
        [cCap(R.format(2, "year")), M(24)]
      );
      o.push([
        colorLabel("eoy"),
        {
          y,
          m: 12,
          d: 1,
        },
      ]);
    } else {
      o.push(
        [cCap(R.format(0, "month")), M(0)],
        [cCap(R.format(-1, "month")), M(-1)],
        [cCap(R.format(-3, "month")), M(-3)],
        [
          colorLabel("boy"),
          {
            y,
            m: 1,
            d: 1,
          },
        ]
      );
    }
    return o;
  }
  if (fut) {
    o.push([cCap(R.format(0, "day")), D(n)], [cCap(R.format(1, "day")), D(new Date(y, m - 1, d + 1))]);
    const sat = new Date(y, m - 1, d + ((6 - n.getDay() + 7) % 7 || 7));
    o.push(
      [colorLabel("nsat"), D(sat)],
      [cCap(R.format(1, "week")), D(new Date(y, m - 1, d + 7))],
      [colorLabel("eom"), D(new Date(y, m, 0))]
    );
  } else {
    for (const dd of [0, -1, -2]) o.push([cCap(R.format(dd, "day")), D(new Date(y, m - 1, d + dd))]);
    o.push([cCap(R.format(-1, "week")), D(new Date(y, m - 1, d - 7))]);
  }
  return o;
}
function calCols() {
  const k = CAL.k,
    s = CAL.s,
    loc = cLoc();
  if (k === "time")
    return [
      ["h", [...Array(24).keys()].map((i) => [i, pad(i)])],
      ["mi", [...Array(60).keys()].map((i) => [i, pad(i)])],
    ];
  const now = new Date().getFullYear(),
    y0 = Math.min(now - 40, s.y - 5),
    y1 = Math.max(now + 40, s.y + 5),
    yrs = [];
  for (let y = y0; y <= y1; y++) yrs.push([y, String(y)]);
  const mf = new Intl.DateTimeFormat(loc, {
      month: k === "month" ? "long" : "short",
    }),
    ms = [...Array(12).keys()].map((i) => [i + 1, cCap(mf.format(new Date(2026, i, 1)).replace(/\.$/, ""))]);
  if (k === "month")
    return [
      ["m", ms],
      ["y", yrs],
    ];
  return [
    ["d", [...Array(31).keys()].map((i) => [i + 1, String(i + 1)])],
    ["m", ms],
    ["y", yrs],
  ];
}
const CROW = 40;
function calOpen(el) {
  CAL.el = el;
  CAL.k = el.dataset.cal;
  const n = new Date();
  CAL.s =
    cParse(CAL.k, el._cv) ||
    (CAL.k === "time"
      ? {
          h: n.getHours(),
          mi: n.getMinutes(),
        }
      : {
          y: n.getFullYear(),
          m: n.getMonth() + 1,
          d: n.getDate(),
        });
  let p = $("calPop");
  if (!p) {
    p = document.createElement("div");
    p.id = "calPop";
    p.setAttribute("role", "dialog");
    p.setAttribute("data-noi18n", "");
    document.body.appendChild(p);
    const bg = document.createElement("div");
    bg.id = "calBg";
    document.body.appendChild(bg);
  }
  const pc = document.documentElement.classList.contains("pc");
  p.className = "calpop " + (pc ? "pcpop" : "sheetpop");
  p.dir = "ltr";
  const cols = calCols(),
    opt = !el.required;
  p.innerHTML = `${pc ? "" : `<div class="calgrab"></div><div class="calhd"><b>${escHtml(calTitle(el))}</b>${opt ? `<button type="button" class="calclr" data-calclr>${escHtml(colorLabel("clr"))}</button>` : ""}</div>`}
    <div class="calchips">${calChips()
      .map(([l, v], i) => `<button type="button" data-calchip="${i}">${escHtml(l)}</button>`)
      .join("")}</div>
    <div class="calwh" dir="ltr">${cols.map(([f, items]) => `<div class="calcol" tabindex="0" data-calf="${f}"><div class="calpad"></div>${items.map(([v, l]) => `<div class="calit" data-v="${v}">${escHtml(l)}</div>`).join("")}<div class="calpad"></div></div>`).join("")}</div>
    <p class="calprev" id="calPrev"></p>
    ${pc ? `<div class="calbtns">${opt ? `<button type="button" class="calclr2" data-calclr>${escHtml(colorLabel("clr"))}</button>` : ""}<button type="button" class="btn primary" data-calok>${escHtml(colorLabel("ok"))}</button></div><p class="calhint">${escHtml(colorLabel("hint"))}</p>` : `<button type="button" class="btn primary calok" data-calok>${escHtml(colorLabel("ok"))}</button>`}`;
  p._chips = calChips();
  $("calBg").hidden = false;
  $("calBg").className = pc ? "calbg pcbg" : "calbg";
  p.hidden = false;
  if (pc) {
    const r = el.getBoundingClientRect(),
      w = Math.max(300, Math.min(380, r.width + 60));
    p.style.width = w + "px";
    p.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left)) + "px";
    const h = p.offsetHeight;
    if (r.bottom + 10 + h < innerHeight - 8 || r.top < h + 18) {
      p.style.top = Math.max(8, Math.min(innerHeight - h - 8, r.bottom + 10)) + "px";
      p.classList.remove("up");
    } else {
      p.style.top = r.top - 10 - h + "px";
      p.classList.add("up");
    }
  } else {
    p.style.cssText = "";
    CAL.lk = !document.body.classList.contains("locked");
    document.body.classList.add("locked");
  }
  calSync(false);
  requestAnimationFrame(() => p.classList.add("on"));
  p.querySelectorAll(".calcol").forEach((c) =>
    c.addEventListener("scroll", calOnScroll, {
      passive: true,
    })
  );
  const f = p.querySelector(".calcol");
  if (pc && f)
    f.focus({
      preventScroll: true,
    });
}
function calClose() {
  const p = $("calPop");
  if (!p || p.hidden) return;
  p.classList.remove("on");
  p.hidden = true;
  const bg = $("calBg");
  if (bg) bg.hidden = true;
  if (CAL.lk) {
    CAL.lk = false;
    document.body.classList.remove("locked");
  }
  const el = CAL.el;
  CAL.el = null;
  if (el && document.documentElement.classList.contains("pc"))
    el.focus({
      preventScroll: true,
    });
}
function calFix() {
  const s = CAL.s;
  if (CAL.k === "date") {
    const mx = cDim(s.y, s.m);
    if (s.d > mx) s.d = mx;
  }
}
function calSync(smooth) {
  const p = $("calPop");
  if (!p) return;
  calFix();
  const s = CAL.s;
  p.querySelectorAll(".calcol").forEach((c) => {
    const f = c.dataset.calf,
      v = s[f],
      items = [...c.querySelectorAll(".calit")],
      i = items.findIndex((x) => +x.dataset.v === v);
    items.forEach((x, j) => {
      x.classList.toggle("c", j === i);
      if (f === "d") x.classList.toggle("off", +x.dataset.v > cDim(s.y, s.m));
    });
    if (i >= 0) {
      c._lock = true;
      c.scrollTo({
        top: i * CROW,
        behavior: smooth ? "smooth" : "instant",
      });
      clearTimeout(c._lt);
      c._lt = setTimeout(
        () => {
          c._lock = false;
        },
        smooth ? 450 : 60
      );
    }
  });
  const pv = $("calPrev");
  if (pv) {
    const r = cRel(CAL.k, s);
    pv.innerHTML = CAL.k === "time" ? "" : escHtml(cFmt(CAL.k, s, true)) + (r ? ` · <b>${escHtml(r)}</b>` : "");
  }
  const ch = p._chips || [],
    iso = cIso(CAL.k, s);
  p.querySelectorAll("[data-calchip]").forEach((b) =>
    b.classList.toggle("on", cIso(CAL.k, ch[+b.dataset.calchip][1]) === iso)
  );
}
function calOnScroll(e) {
  const c = e.currentTarget;
  if (c._lock) return;
  clearTimeout(c._st);
  const items = c.querySelectorAll(".calit"),
    i = Math.max(0, Math.min(items.length - 1, Math.round(c.scrollTop / CROW)));
  items.forEach((x, j) => x.classList.toggle("c", j === i));
  c._st = setTimeout(() => {
    CAL.s[c.dataset.calf] = +items[i].dataset.v;
    calSync(true);
  }, 140);
}
function calApply(v) {
  const el = CAL.el;
  if (!el) return;
  el.value = v;
  calClose();
  el.dispatchEvent(
    new Event("input", {
      bubbles: true,
    })
  );
  el.dispatchEvent(
    new Event("change", {
      bubbles: true,
    })
  );
}
document.addEventListener(
  "click",
  (e) => {
    const el = e.target.closest("input.calin");
    if (el) {
      e.preventDefault();
      if (!el.disabled) calOpen(el);
      return;
    }
    const p = $("calPop");
    if (!p || p.hidden) return;
    if (e.target.id === "calBg") {
      calClose();
      return;
    }
    if (!e.target.closest("#calPop")) return;
    const it = e.target.closest(".calit");
    if (it && !it.classList.contains("off")) {
      CAL.s[it.parentElement.dataset.calf] = +it.dataset.v;
      calSync(true);
      return;
    }
    const ch = e.target.closest("[data-calchip]");
    if (ch) {
      CAL.s = {
        ...p._chips[+ch.dataset.calchip][1],
      };
      calSync(true);
      return;
    }
    if (e.target.closest("[data-calclr]")) {
      calApply("");
      return;
    }
    if (e.target.closest("[data-calok]")) {
      calFix();
      calApply(cIso(CAL.k, CAL.s));
      return;
    }
  },
  true
);
document.addEventListener(
  "keydown",
  (e) => {
    const p = $("calPop");
    if (p && !p.hidden) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        calClose();
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        calFix();
        calApply(cIso(CAL.k, CAL.s));
        return;
      }
      const c = e.target.closest && e.target.closest(".calcol");
      if (c && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        e.preventDefault();
        const items = [...c.querySelectorAll(".calit")],
          f = c.dataset.calf;
        let i = items.findIndex((x) => +x.dataset.v === CAL.s[f]);
        i = Math.max(0, Math.min(items.length - 1, i + (e.key === "ArrowUp" ? -1 : 1)));
        CAL.s[f] = +items[i].dataset.v;
        calSync(true);
      }
      return;
    }
    const el = e.target.closest && e.target.closest("input.calin");
    if (el && (e.key === "Enter" || e.key === " " || e.key === "ArrowDown")) {
      e.preventDefault();
      e.stopPropagation();
      calOpen(el);
    }
  },
  true
);
addEventListener("resize", () => {
  if (CAL.el && document.documentElement.classList.contains("pc")) calClose();
});
