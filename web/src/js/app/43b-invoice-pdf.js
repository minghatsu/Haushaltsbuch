/* Ein Layout für Vorschau und PDF – beides sieht dadurch exakt gleich aus */
function rvDark(h) {
  const n = parseInt(String(h).slice(1), 16),
    f = (v) =>
      Math.round(v * 0.5)
        .toString(16)
        .padStart(2, "0");
  return "#" + f((n >> 16) & 255) + f((n >> 8) & 255) + f(n & 255);
}
function rvOn(h) {
  const n = parseInt(String(h).slice(1), 16),
    l = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return l > 0.62 ? "#1d1d1d" : "#ffffff";
}
function rvSum(d) {
  const kl = rvBiz().klein,
    def = kl ? 0 : Number(d.vat) || 0,
    sg = d.typ === "s" ? -1 : 1,
    rab = Math.max(0, Math.min(100, Number(d.rab) || 0)),
    G = {};
  let sub = 0;
  for (const p of d.pos || []) {
    const n = (Number(p.q) || 0) * (Number(p.p) || 0),
      r = kl ? 0 : p.v === undefined || p.v === null || p.v === "" ? def : Number(p.v);
    sub += n;
    G[r] = (G[r] || 0) + n;
  }
  sub = round2(sub);
  const disc = Math.round(sub * rab) / 100,
    groups = Object.keys(G)
      .map(Number)
      .sort((a, b) => b - a)
      .map((r) => {
        const net = round2(G[r] * (1 - rab / 100));
        return {
          rate: r,
          net,
          vat: Math.round(net * r) / 100,
        };
      });
  const net = round2(sub - disc),
    vat = round2(groups.reduce((s, g) => s + g.vat, 0)),
    gross = round2(net + vat),
    ded = d.typ === "r" || !d.typ ? round2((d.abz || []).reduce((s, a) => s + (Number(a.amt) || 0), 0)) : 0;
  const rates = groups.filter((g) => g.net || g.rate).map((g) => g.rate),
    rate = rates.length === 1 ? rates[0] : rates.length ? -1 : 0;
  return {
    sub: sg * sub,
    disc: sg * disc,
    rab,
    net: sg * net,
    rate,
    groups: groups.map((g) => ({
      rate: g.rate,
      net: sg * g.net,
      vat: sg * g.vat,
    })),
    mixed: groups.length > 1,
    vat: sg * vat,
    gross: sg * gross,
    ded,
    pay: round2(sg * gross - ded),
  };
}
const RV_TX = {
  de: {
    r: "RECHNUNG",
    a: "ABSCHLAGSRECHNUNG",
    g: "GUTSCHRIFT",
    s: "STORNORECHNUNG",
    tr: "Rechnung",
    ta: "Abschlagsrechnung",
    tg: "Gutschrift",
    ts: "Stornorechnung",
    nr: "Nr.",
    date: "Rechnungsdatum",
    lz: "Leistungszeitraum",
    ld: "Leistungsdatum",
    kn: "Kundennummer",
    due: "Zahlbar bis",
    pos: "Pos.",
    desc: "Beschreibung",
    qty: "Menge",
    vat: "USt",
    unit: "Einzelpreis",
    tot: "Gesamt",
    page: "Seite",
    sub: "Zwischensumme",
    rab: "abzgl. Rabatt",
    net: "Summe netto",
    vatl: "Umsatzsteuer",
    gross: "Gesamtbetrag",
    abz: "abzgl. Abschlag Nr.",
    rest: "Noch zu zahlen",
    gs: "Gutschriftbetrag",
    st: "Stornobetrag",
    klein: "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.",
    ref: "zur Rechnung Nr.",
    vom: "vom",
    pay: (a, d) => `Bitte überweisen Sie ${a} bis zum ${d}.`,
    qr: "Einfach den Code mit der Banking-App scannen – Empfänger, IBAN, Betrag und Rechnungsnummer sind schon ausgefüllt.",
    noqr: (n) => `Bitte geben Sie bei der Überweisung die Rechnungsnummer ${n} an.`,
    gpay: (a) => `Den Betrag von ${a} überweise ich Ihnen in den nächsten Tagen.`,
    gq: "Bitte prüfen Sie Ihre Kontoverbindung – bei Fragen melden Sie sich gern.",
    spay: (n) => `Die Rechnung Nr. ${n} ist damit aufgehoben.`,
    sq: "Bereits gezahlte Beträge erstatte ich Ihnen – Sie brauchen nichts weiter zu tun.",
    owner: "Inhaber/in",
    tel: "Tel.",
    tax: "Steuer-Nr.",
    vatid: "USt-IdNr.",
  },
  en: {
    r: "INVOICE",
    a: "DEPOSIT INVOICE",
    g: "CREDIT NOTE",
    s: "CANCELLATION",
    tr: "Invoice",
    ta: "Deposit invoice",
    tg: "Credit note",
    ts: "Cancellation invoice",
    nr: "No.",
    date: "Invoice date",
    lz: "Service period",
    ld: "Service date",
    kn: "Customer no.",
    due: "Due date",
    pos: "No.",
    desc: "Description",
    qty: "Qty",
    vat: "VAT",
    unit: "Unit price",
    tot: "Total",
    page: "Page",
    sub: "Subtotal",
    rab: "less discount",
    net: "Net total",
    vatl: "VAT",
    gross: "Total amount",
    abz: "less deposit no.",
    rest: "Amount due",
    gs: "Credit amount",
    st: "Cancelled amount",
    klein: "No VAT is charged according to § 19 UStG (small business).",
    ref: "for invoice no.",
    vom: "dated",
    pay: (a, d) => `Please transfer ${a} by ${d}.`,
    qr: "Just scan the code with your banking app – recipient, IBAN, amount and invoice number are already filled in.",
    noqr: (n) => `Please quote invoice number ${n} with your payment.`,
    gpay: (a) => `I will transfer ${a} to you within the next few days.`,
    gq: "Please check your bank details – feel free to get in touch if you have any questions.",
    spay: (n) => `Invoice no. ${n} is hereby cancelled.`,
    sq: "Any amounts already paid will be refunded – there is nothing else you need to do.",
    owner: "Owner",
    tel: "Phone",
    tax: "Tax no.",
    vatid: "VAT ID",
  },
};
const rvEL = (v, lg) =>
  new Intl.NumberFormat(lg === "en" ? "en-IE" : "de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(round2(v || 0));
const rvDL = (iso, lg) =>
  iso
    ? lg === "en"
      ? new Date(iso + "T12:00").toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : rvDate(iso)
    : "";
function rvLayout(d) {
  const b = rvBiz(),
    lg = d.lang === "en" ? "en" : "de",
    X = RV_TX[lg],
    E = (v) => rvEL(v, lg),
    DD = (iso) => rvDL(iso, lg),
    NN = (v) =>
      new Intl.NumberFormat(lg === "en" ? "en-IE" : "de-DE", {
        maximumFractionDigits: 2,
      }).format(v || 0);
  const none = b.color === "none",
    pc = none ? "#222222" : /^#[0-9a-f]{6}$/i.test(b.color || "") ? b.color : RV_COL[0],
    onC = none ? "#222222" : rvOn(pc),
    thBg = none ? "#ececec" : pc,
    thC = none ? "#222222" : onC,
    tc = onC === "#ffffff" || none ? pc : rvDark(pc),
    sum = rvSum(d),
    L = 46,
    R = 549,
    pages = [[]];
  let pg = pages[0];
  const sg = d.typ === "s" ? -1 : 1,
    T = (x, y, txt, sz, o) => {
      o = o || {};
      const w = rvTextWidth(txt, sz, o.b);
      pg.push({
        t: "text",
        x: o.al === "r" ? x - w : o.al === "c" ? x - w / 2 : x,
        y,
        s: sz,
        b: !!o.b,
        c: o.c || "#222222",
        txt: String(txt),
      });
    };
  const Rc = (x, y, w, h, c, r) =>
      pg.push({
        t: "rect",
        x,
        y,
        w,
        h,
        c,
        r: r || 0,
      }),
    Ln = (x1, y1, x2, y2, c, w) =>
      pg.push({
        t: "line",
        x1,
        y1,
        x2,
        y2,
        c,
        w: w || 0.6,
      });
  const due = addDays(d.date || isoToday(), Number(d.z) || 14),
    sender = [b.name, b.street, b.city].filter(Boolean).join(" · ");
  const foot = () => {
    const cols = [
      [b.name, b.owner ? X.owner + " " + b.owner : "", b.street, b.city],
      [b.tel ? X.tel + " " + b.tel : "", b.email, b.web],
      [b.taxNo ? X.tax + " " + b.taxNo : "", b.vatId ? X.vatid + " " + b.vatId : ""],
      [b.bank, b.iban ? "IBAN " + b.iban : "", b.bic ? "BIC " + b.bic : ""],
    ];
    Ln(L, 782, R, 782, "#dddddd", 0.6);
    cols.forEach((c, i) => {
      let y = 794;
      c.filter(Boolean).forEach((t, j) => {
        T(L + i * 126.5, y, rvFit(t, 6.8, j === 0 && i === 0, 120), 6.8, {
          b: j === 0 && i === 0,
          c: "#666666",
        });
        y += 9.4;
      });
    });
  };
  const typ = d.typ || "r";
  if (!none) Rc(0, 0, 595, 96, pc);
  else Ln(L, 96, R, 96, "#222222", 1.2);
  T(L, 40, X[typ], 8.5, {
    b: 1,
    c: onC,
  });
  T(L, 68, X.nr + " " + (d.nr || ""), 24, {
    b: 1,
    c: onC,
  });
  if (b.logo && b.logoW && b.logoH) {
    const ar = b.logoW / b.logoH;
    if (b.logoA || none) {
      const iw0 = Math.min(200, 60 * ar),
        ih0 = iw0 / ar;
      pg.push({
        t: "img",
        x: R - iw0,
        y: 18 + (60 - ih0) / 2,
        w: iw0,
        h: ih0,
        src: b.logo,
        svg: b.logoPng || b.logo,
        alpha: b.logoA,
        pw: b.logoW,
        ph: b.logoH,
      });
    } else {
      const th = 62,
        iw0 = Math.min(176, Math.max(44, (th - 14) * ar)),
        ih0 = Math.min(th - 14, iw0 / ar),
        tw = iw0 + 14;
      Rc(R - tw, 17, tw, th, "#ffffff", 9);
      pg.push({
        t: "img",
        x: R - tw + (tw - iw0) / 2,
        y: 17 + (th - ih0) / 2,
        w: iw0,
        h: ih0,
        src: b.logo,
        pw: b.logoW,
        ph: b.logoH,
      });
    }
  } else {
    const bn = rvWrap(b.name || store.settings.name || "Dein Name", 13, 1, 220);
    bn.slice(0, 2).forEach((t, i) =>
      T(R, 44 + i * 16, t, 13, {
        b: 1,
        c: onC,
        al: "r",
      })
    );
    if (b.owner && b.owner !== b.name)
      T(R, 44 + Math.min(2, bn.length) * 16, b.owner, 8.5, {
        c: onC,
        al: "r",
      });
  }
  if (sender)
    T(L, 126, rvFit(sender, 7, 0, 260), 7, {
      c: "#777777",
    });
  const to = [d.k.name, d.k.person, d.k.street, d.k.city].filter(Boolean);
  to.forEach((t, i) =>
    T(L, 146 + i * 14, rvFit(t, 10, i === 0, 250), 10, {
      b: i === 0,
    })
  );
  const meta = [
    [X.date, DD(d.date)],
    [d.lz ? X.lz : X.ld, d.lz || DD(d.date)],
  ];
  if (d.k.nr) meta.push([X.kn, d.k.nr]);
  if (typ === "r" || typ === "a") meta.push([X.due, DD(due), 1]);
  meta.forEach((m, i) => {
    T(349, 134 + i * 16, m[0], 8.5, {
      c: "#666666",
    });
    T(R, 134 + i * 16, rvFit(m[1], 8.5, !!m[2], 110), 8.5, {
      b: !!m[2],
      al: "r",
    });
  });
  let y = Math.max(232, 146 + to.length * 14 + 28);
  T(L, y, rvFit(d.title || X["t" + typ], 16, 1, R - L), 16, {
    b: 1,
    c: tc,
  });
  y += 22;
  if ((typ === "g" || typ === "s") && d.ref) {
    const o = rchList().find((i) => i.nr === d.ref);
    T(L, y, rvFit(X.ref + " " + d.ref + (o ? " " + X.vom + " " + DD(o.date) : ""), 9.5, 1, R - L), 9.5, {
      b: 1,
    });
    y += 16;
  }
  for (const t of rvWrap(d.intro, 9, 0, R - L)) {
    T(L, y, t, 9);
    y += 13;
  }
  y += 6;
  const mx = sum.mixed,
    cx = mx ? [L + 6, L + 30, 352, 392, 462, R - 6] : [L + 6, L + 30, 380, 0, 455, R - 6];
  const head = () => {
    Rc(L, y, R - L, 20, thBg);
    T(cx[0], y + 13.5, X.pos, 8.5, {
      b: 1,
      c: thC,
    });
    T(cx[1], y + 13.5, X.desc, 8.5, {
      b: 1,
      c: thC,
    });
    T(cx[2], y + 13.5, X.qty, 8.5, {
      b: 1,
      c: thC,
      al: "r",
    });
    if (mx)
      T(cx[3], y + 13.5, X.vat, 8.5, {
        b: 1,
        c: thC,
        al: "r",
      });
    T(cx[4], y + 13.5, X.unit, 8.5, {
      b: 1,
      c: thC,
      al: "r",
    });
    T(cx[5], y + 13.5, X.tot, 8.5, {
      b: 1,
      c: thC,
      al: "r",
    });
    y += 20;
  };
  const newPage = () => {
    foot();
    pg = [];
    pages.push(pg);
    y = 60;
    T(L, 40, X.tr + " " + (d.nr || "") + " · " + X.page + " " + pages.length, 8.5, {
      c: "#777777",
    });
    head();
  };
  const kl = b.klein,
    def = kl ? 0 : Number(d.vat) || 0;
  head();
  (d.pos || []).forEach((p, i) => {
    const ds = rvWrap(p.n || "–", 9, 1, cx[2] - cx[1] - (mx ? 50 : 60)),
      h = Math.max(20, 9 + ds.length * 12);
    if (y + h > 700) newPage();
    T(cx[0], y + 13, i + 1 + ".", 9);
    ds.forEach((t, j) =>
      T(cx[1], y + 13 + j * 12, t, 9, {
        b: 1,
      })
    );
    T(cx[2], y + 13, NN(p.q) + " " + (p.u || ""), 9, {
      al: "r",
    });
    if (mx)
      T(cx[3], y + 13, (p.v === undefined || p.v === null || p.v === "" ? def : Number(p.v)) + " %", 9, {
        al: "r",
        c: "#555555",
      });
    T(cx[4], y + 13, E(sg * (Number(p.p) || 0)), 9, {
      al: "r",
    });
    T(cx[5], y + 13, E(sg * (Number(p.q) || 0) * (Number(p.p) || 0)), 9, {
      al: "r",
    });
    y += h;
    Ln(L, y, R, y, "#eeeeee", 0.6);
  });
  const extra =
    (sum.rab ? 30 : 0) + (sum.groups.length > 1 ? 15 * (sum.groups.length - 1) : 0) + (d.abz || []).length * 15;
  if (y + 150 + extra > 772) newPage();
  y += 12;
  const sx = 319;
  if (sum.rab) {
    T(sx + 6, y, X.sub, 9);
    T(R - 6, y, E(sum.sub), 9, {
      al: "r",
    });
    y += 15;
    T(sx + 6, y, X.rab + " " + NN(sum.rab) + " %", 9);
    T(R - 6, y, E(-sum.disc), 9, {
      al: "r",
    });
    y += 15;
  }
  if (!kl && sum.groups.some((g) => g.rate)) {
    T(sx + 6, y, X.net, 9);
    T(R - 6, y, E(sum.net), 9, {
      al: "r",
    });
    y += 15;
    for (const g of sum.groups) {
      if (!g.rate) continue;
      T(sx + 6, y, X.vatl + " " + g.rate + " %" + (sum.mixed ? " (" + E(g.net) + ")" : ""), 9);
      T(R - 6, y, E(g.vat), 9, {
        al: "r",
      });
      y += 15;
    }
    y -= 5;
  }
  Ln(sx, y, R, y, tc, 1.4);
  y += 15;
  if (sum.ded) {
    T(sx + 6, y, X.gross, 9, {
      b: 1,
    });
    T(R - 6, y, E(sum.gross), 9, {
      b: 1,
      al: "r",
    });
    y += 15;
    for (const a of d.abz || []) {
      T(sx + 6, y, rvFit(X.abz + " " + a.nr, 9, 0, 150), 9);
      T(R - 6, y, "– " + E(a.amt), 9, {
        al: "r",
      });
      y += 15;
    }
    y -= 4;
    Ln(sx, y, R, y, tc, 1.4);
    y += 15;
  }
  T(sx + 6, y, typ === "g" ? X.gs : typ === "s" ? X.st : sum.ded ? X.rest : X.gross, 11, {
    b: 1,
    c: tc,
  });
  T(R - 6, y, E(sum.pay), 11, {
    b: 1,
    c: tc,
    al: "r",
  });
  y += 12;
  if (kl) {
    y += 8;
    T(L, y, X.klein, 8.5, {
      c: "#444444",
    });
    y += 4;
  }
  y += 16;
  const epc =
      typ === "g" || typ === "s" || !(sum.pay > 0)
        ? ""
        : rvEpc(d, {
            ...sum,
            gross: sum.pay,
          }),
    ph = epc ? 78 : 44;
  Rc(L, y, R - L, ph, "#f3f5f4", 8);
  if (epc) {
    pg.push({
      t: "qr",
      x: L + 8,
      y: y + 7,
      s: 64,
      m: qrMatrix(epc),
    });
  }
  const px = epc ? L + 84 : L + 12;
  T(
    px,
    y + (epc ? 26 : 20),
    rvFit(
      typ === "g" ? X.gpay(E(sum.pay)) : typ === "s" ? X.spay(d.ref || "") : X.pay(E(sum.pay), DD(due)),
      9.5,
      1,
      R - px - 10
    ),
    9.5,
    {
      b: 1,
    }
  );
  rvWrap(typ === "g" ? X.gq : typ === "s" ? X.sq : epc ? X.qr : X.noqr(d.nr || ""), 8.5, 0, R - px - 10)
    .slice(0, 3)
    .forEach((t, i) =>
      T(px, y + (epc ? 41 : 34) + i * 11.5, t, 8.5, {
        c: "#444444",
      })
    );
  y += ph + 18;
  for (const t of rvWrap(d.note, 9, 0, R - L).slice(0, 6)) {
    if (t) {
      if (y > 770) {
        break;
      }
      T(L, y, t, 9);
    }
    y += 13;
  }
  foot();
  return {
    pages,
    sum,
    due,
  };
}
function rvSvg(d, cls) {
  const { pages } = rvLayout(d);
  const one = (ops) =>
    `<svg class="rvpaper ${cls || ""}" data-noi18n translate="no" viewBox="0 0 595 842" role="img" aria-label="Rechnung ${escHtml(d.nr || "")}"><rect width="595" height="842" fill="#fff"/>${ops
      .map((o) => {
        if (o.t === "rect")
          return `<rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" rx="${o.r}" fill="${o.c}"/>`;
        if (o.t === "line")
          return `<line x1="${o.x1}" y1="${o.y1}" x2="${o.x2}" y2="${o.y2}" stroke="${o.c}" stroke-width="${o.w}"/>`;
        if (o.t === "img")
          return `<image href="${o.svg || o.src}" x="${o.x.toFixed(2)}" y="${o.y.toFixed(2)}" width="${o.w.toFixed(2)}" height="${o.h.toFixed(2)}" preserveAspectRatio="xMidYMid meet"/>`;
        if (o.t === "qr") {
          const n = o.m.length,
            s = o.s / n;
          let p = "";
          for (let r = 0; r < n; r++)
            for (let c = 0; c < n; c++)
              if (o.m[r][c])
                p += `M${(o.x + c * s).toFixed(2)} ${(o.y + r * s).toFixed(2)}h${s.toFixed(2)}v${s.toFixed(2)}h-${s.toFixed(2)}z`;
          return `<rect x="${o.x - 3}" y="${o.y - 3}" width="${o.s + 6}" height="${o.s + 6}" fill="#fff"/><path d="${p}" fill="#000"/>`;
        }
        return `<text x="${o.x.toFixed(2)}" y="${o.y}" font-size="${o.s}" font-weight="${o.b ? 700 : 400}" fill="${o.c}" xml:space="preserve">${escHtml(o.txt)}</text>`;
      })
      .join("")}</svg>`;
  return pages.map(one).join("");
}
/* Kleiner PDF-Schreiber: Standard-Schrift Helvetica, Vektoren, GiroCode */
function rvPdf(d) {
  const { pages } = rvLayout(d),
    H = 842,
    col = (h) => {
      const n = parseInt(String(h).slice(1), 16);
      return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255].map((v) => v.toFixed(3)).join(" ");
    };
  const es = (s) => rvCp(s).replace(/[\\()]/g, (m) => "\\" + m),
    objs = [],
    IM = [];
  const streams = pages.map((ops) =>
    ops
      .map((o) => {
        if (o.t === "rect")
          return `${col(o.c)} rg ${o.x.toFixed(2)} ${(H - o.y - o.h).toFixed(2)} ${o.w.toFixed(2)} ${o.h.toFixed(2)} re f`;
        if (o.t === "line")
          return `${col(o.c)} RG ${o.w} w ${o.x1.toFixed(2)} ${(H - o.y1).toFixed(2)} m ${o.x2.toFixed(2)} ${(H - o.y2).toFixed(2)} l S`;
        if (o.t === "img") {
          let k = IM.findIndex((m) => m.src === o.src);
          if (k < 0) {
            IM.push(o);
            k = IM.length - 1;
          }
          return `q ${o.w.toFixed(2)} 0 0 ${o.h.toFixed(2)} ${o.x.toFixed(2)} ${(H - o.y - o.h).toFixed(2)} cm /Im${k + 1} Do Q`;
        }
        if (o.t === "qr") {
          const n = o.m.length,
            s = o.s / n;
          let p = `1 1 1 rg ${o.x - 3} ${H - o.y - o.s - 3} ${o.s + 6} ${o.s + 6} re f 0 0 0 rg `;
          for (let r = 0; r < n; r++)
            for (let c = 0; c < n; c++)
              if (o.m[r][c])
                p += `${(o.x + c * s).toFixed(2)} ${(H - o.y - (r + 1) * s).toFixed(2)} ${s.toFixed(2)} ${s.toFixed(2)} re `;
          return p + "f";
        }
        return `BT /${o.b ? "F2" : "F1"} ${o.s} Tf ${col(o.c)} rg ${o.x.toFixed(2)} ${(H - o.y).toFixed(2)} Td (${es(o.txt)}) Tj ET`;
      })
      .join("\n")
  );
  const np = pages.length,
    kids = pages.map((_, i) => `${5 + i * 2} 0 R`).join(" ");
  objs[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objs[2] = `<< /Type /Pages /Kids [${kids}] /Count ${np} >>`;
  objs[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objs[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
  const im0 = 5 + np * 2,
    xo = IM.length ? ` /XObject << ${IM.map((_, k) => `/Im${k + 1} ${im0 + k} 0 R`).join(" ")} >>` : "";
  let mk = im0 + IM.length;
  IM.forEach((m, k) => {
    const bin = atob(String(m.src).split(",")[1] || "");
    let sm = "";
    if (m.alpha) {
      const ab = atob(m.alpha);
      objs[mk] =
        `<< /Type /XObject /Subtype /Image /Width ${m.pw} /Height ${m.ph} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode /Length ${ab.length} >>\nstream\n${ab}\nendstream`;
      sm = ` /SMask ${mk} 0 R`;
      mk++;
    }
    objs[im0 + k] =
      `<< /Type /XObject /Subtype /Image /Width ${m.pw} /Height ${m.ph} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode${sm} /Length ${bin.length} >>\nstream\n${bin}\nendstream`;
  });
  streams.forEach((s, i) => {
    objs[5 + i * 2] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >>${xo} >> /Contents ${6 + i * 2} 0 R >>`;
    objs[6 + i * 2] = `<< /Length ${s.length} >>\nstream\n${s}\nendstream`;
  });
  const info = objs.length;
  objs[info] =
    `<< /Title (${es("Rechnung " + (d.nr || ""))}) /Author (${es(rvBiz().name || "")}) /Producer (Finanz MAMI) >>`;
  let out = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const off = [];
  for (let i = 1; i < objs.length; i++) {
    off[i] = out.length;
    out += `${i} 0 obj\n${objs[i]}\nendobj\n`;
  }
  const x = out.length;
  out +=
    `xref\n0 ${objs.length}\n0000000000 65535 f \n` +
    off
      .slice(1)
      .map((o) => String(o).padStart(10, "0") + " 00000 n \n")
      .join("") +
    `trailer\n<< /Size ${objs.length} /Root 1 0 R /Info ${info} 0 R >>\nstartxref\n${x}\n%%EOF`;
  const u = new Uint8Array(out.length);
  for (let i = 0; i < out.length; i++) u[i] = out.charCodeAt(i) & 255;
  return new Blob([u], {
    type: "application/pdf",
  });
}
