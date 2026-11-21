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
