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
