/* Editor */
function rvSteps() {
  const s = [];
  if (!RV.meDone) s.push("me");
  s.push("kunde", "pos", "det", "chk");
  return s;
}
function rvOpen(d) {
  RV.itq = "";
  RV.itAll = 0;
  if ((store.settings.rvLearnAuto || 0) < 2 && rvLearnTodo().length) {
    store.settings.rvLearnAuto = 2;
    setTimeout(() => rvLearn(), 900);
  }
  RV.d = d || rvNew();
  RV.nrTouched = 0;
  RV.meDone = rvBizOk();
  RV.st = 0;
  RV.dir = 1;
  RV.pv = 0;
  let bg = $("rvBg");
  if (!bg) {
    bg = document.createElement("div");
    bg.id = "rvBg";
    bg.className = "rvbg";
    document.body.appendChild(bg);
  }
  bg.innerHTML = `<div class="rvwin" role="dialog" aria-modal="true" aria-labelledby="rvTt"><header class="rvhd"><button type="button" class="rvx" data-rvclose aria-label="${escHtml(uiText("rv_close"))}">${svgIcon("x", 20)}</button><div class="grow"><small id="rvSub"></small><b id="rvTt">${escHtml(uiText("rv_title"))}</b></div><button type="button" class="rvpvb" data-rvpv>${svgIcon("eye", 17)}<span>${escHtml(uiText("rv_preview"))}</span></button></header>
    <nav class="rvnav" id="rvNav" aria-label="${escHtml(uiText("rv_steps"))}"></nav><main class="rvbody" id="rvBody"></main><aside class="rvprev rvzc" id="rvPrev" tabindex="0" aria-label="${escHtml(uiText("rv_preview"))}"><span class="rvpl">${svgIcon("eye", 14)} ${escHtml(uiText("rv_live"))} · <span class="rvzh">${escHtml(uiText(matchMedia("(pointer:coarse)").matches ? "rv_zoom_touch" : "rv_zoom_pc"))}</span></span>${rvzBar()}<div class="rvpp rvzi" id="rvPP" data-noi18n translate="no"></div></aside></div>`;
  bg.hidden = false;
  document.body.classList.add("locked");
  requestAnimationFrame(() => bg.classList.add("on"));
  rvRender();
  SND.play("whoosh");
  if (!reducedMotion())
    bg.querySelector(".rvwin").animate(
      [
        {
          transform: "translateY(28px) scale(.98)",
          opacity: 0,
        },
        {
          transform: "none",
          opacity: 1,
        },
      ],
      {
        duration: 380,
        easing: "cubic-bezier(.2,.9,.2,1)",
      }
    );
}
function rvClose() {
  const bg = $("rvBg");
  if (!bg || bg.hidden) return;
  if (rvSteps()[RV.st] !== "me") rvSync();
  try {
    localStorage.setItem("hb-rvdraft", JSON.stringify(RV.d));
  } catch (_) {}
  bg.classList.remove("on");
  SND.play("whooshin");
  setTimeout(
    () => {
      bg.hidden = true;
      bg.innerHTML = "";
      document.body.classList.remove("locked");
    },
    reducedMotion() ? 0 : 220
  );
}
function rvTip(k) {
  return `<div class="rvtip">${mamiAvatar ? mamiAvatar(null) : "👩"}<span>${escHtml(mFill ? mFill(uiText(k)) : uiText(k))}</span></div>`;
}
function rvField(id, lbl, val, o) {
  o = o || {};
  return `<label class="hlf ${o.cls || ""}"><span>${escHtml(lbl)}</span><input class="in" id="${id}" value="${escHtml(val ?? "")}" ${o.ph ? `placeholder="${escHtml(o.ph)}"` : ""} ${o.type ? `type="${o.type}"` : ""} ${o.im ? `inputmode="${o.im}"` : ""} ${o.ac ? `autocomplete="${o.ac}"` : ""}></label>`;
}
function rvStepHtml(k) {
  const d = RV.d,
    b = rvBiz(),
    sum = rvSum(d);
  if (k === "me")
    return `${rvTip("rv_tip_me")}<div class="vacard rvgrid">${rvField(
      "rvBn",
      uiText("rv_b_name"),
      b.name || store.settings.name || "",
      {
        cls: "w2",
        ac: "organization",
      }
    )}${rvField("rvBo", uiText("rv_b_owner"), b.owner || "", {
      ac: "name",
    })}${rvField("rvBe", uiText("rv_b_mail"), b.email || "", {
      type: "email",
      ac: "email",
    })}${rvField("rvBs", uiText("rv_b_street"), b.street || "", {
      cls: "w2",
      ac: "street-address",
    })}${rvField("rvBc", uiText("rv_b_city"), b.city || "", {
      cls: "w2",
      ph: "50667 Köln",
    })}${rvField("rvBt", uiText("rv_b_tel"), b.tel || "", {
      type: "tel",
    })}${rvField("rvBw", uiText("rv_b_web"), b.web || "")}</div>
    <div class="vacard rvgrid"><b class="rvsub w2">${escHtml(uiText("rv_b_tax"))}</b>${rvField(
      "rvBx",
      uiText("rv_b_taxno"),
      b.taxNo || "",
      {
        ph: "215/5000/1234",
      }
    )}${rvField("rvBv", uiText("rv_b_vat"), b.vatId || "", {
      ph: "DE123456789",
    })}
      <label class="rvtog w2"><input type="checkbox" id="rvBk" ${b.klein ? "checked" : ""}><span class="sw"></span><span><b>${escHtml(uiText("rv_b_klein"))}</b><small>${escHtml(uiText("rv_b_klein_s"))}</small></span></label></div>
    <div class="vacard rvgrid"><b class="rvsub w2">${escHtml(uiText("rv_b_bank"))}</b>${rvField(
      "rvBi",
      uiText("rv_b_iban"),
      b.iban || "",
      {
        cls: "w2",
        ph: "DE00 0000 0000 0000 0000 00",
      }
    )}${rvField("rvBb", uiText("rv_b_bic"), b.bic || "")}${rvField("rvBn2", uiText("rv_b_bankn"), b.bank || "")}
      </div>
    <div class="vacard rvgrid"><b class="rvsub w2">${escHtml(uiText("rv_nr_h"))}</b>${rvField(
      "rvBst",
      uiText("rv_nr_start"),
      b.nrStart || "",
      {
        im: "numeric",
        ph: "1",
      }
    )}${rvField("rvBsf", uiText("rv_nr_suf"), b.nrSuf || "", {
      ph: "z. B. -MF",
    })}${rvField("rvBp", uiText("rv_nr_pre"), b.nrPre || "", {
      ph: "RE-",
    })}<label class="kidedu rvnry"><input type="checkbox" id="rvBy" ${b.nrYear ? "checked" : ""}> <span>${escHtml(uiText("rv_nr_year"))}</span></label><small class="rvhint w2" id="rvNrN">${escHtml(
      uiText("rv_nr_next", {
        n: rchNextNr(b),
      })
    )}</small>
      <div class="hlf w2"><span>${escHtml(uiText("rv_b_logo"))}</span><div class="rvlogo"><span class="rvlimg ${b.logoA ? "tr" : ""}" style="${b.logoA ? `--lbg:${b.color === "none" ? "#ffffff" : b.color || RV_COL[0]}` : ""}">${b.logo ? `<img src="${b.logoPng || b.logo}" alt="">` : svgIcon("image", 26)}</span><span class="rvlbt"><button type="button" class="btn" data-rvlogo>${svgIcon("plusIn", 16)} ${escHtml(uiText(b.logo ? "rv_b_logo_chg" : "rv_b_logo_add"))}</button>${b.logo ? `<button type="button" class="btn ghost" data-rvlogodel>${svgIcon("trash", 15)} ${escHtml(uiText("rv_b_logo_del"))}</button>` : ""}</span><input type="file" id="rvLogoF" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden></div><small class="rvhint">${escHtml(uiText("rv_b_logo_s"))}</small></div>
      <div class="hlf w2"><span>${escHtml(uiText("rv_b_color"))}</span><div class="rvcols">${RV_COL.map((c) => `<button type="button" class="rvcol ${(b.color || RV_COL[0]) === c ? "on" : ""}" style="--c:${c}" data-rvcol="${c}" aria-label="${c}"></button>`).join("")}<label class="rvcol rvcust ${b.color && b.color !== "none" && !RV_COL.includes(b.color) ? "on" : ""}" style="--c:${b.color && b.color !== "none" && !RV_COL.includes(b.color) ? b.color : "#ffffff"}" title="${escHtml(uiText("rv_col_own"))}"><input type="color" id="rvColC" value="${/^#[0-9a-f]{6}$/i.test(b.color || "") ? b.color : "#147a5b"}" aria-label="${escHtml(uiText("rv_col_own"))}">${svgIcon("palette", 15)}</label><button type="button" class="rvcol rvnone ${b.color === "none" ? "on" : ""}" data-rvcol="none" title="${escHtml(uiText("rv_col_none"))}" aria-label="${escHtml(uiText("rv_col_none"))}"></button></div></div></div>`;
  if (k === "kunde") {
    const ks = rvKunden(),
      y = new Date().getFullYear();
    let tx = [];
    try {
      tx = (kundenOf(y).list || [])
        .map((x) => x.name || x)
        .filter((n) => n && !ks.some((k) => k.name === n))
        .slice(0, 6);
    } catch (_) {}
    if (!d.kid && !d.k.nr) d.k.nr = rvKnrNext();
    const dup = rvKnrDup(d.k.nr, d.kid),
      lon = store.settings.logos === true;
    if (lon)
      setTimeout(() => {
        for (const c of ks)
          if (!c.lt || (!c.ld && Date.now() - (c.lt || 0) > 30 * 864e5))
            rvKLogo(c).then((ok) => {
              if (ok) rvKAvUpd();
            });
      }, 200);
    return `${rvTip("rv_tip_k")}${rvLearnUi()}<div class="vacard rvks">${ks.map((c) => `<button type="button" class="rvk ${d.kid === c.id ? "on" : ""}" data-rvk="${escHtml(c.id)}">${rvKAv(c)}<span class="grow"><b>${escHtml(c.name)}</b><small>${escHtml([c.person, c.city].filter(Boolean).join(" · ") || " ")}</small></span>${c.nr ? `<span class="rvknr" data-noi18n>${escHtml(c.nr)}</span>` : ""}</button>`).join("")}${tx
      .map(
        (n) =>
          `<button type="button" class="rvk" data-rvkn="${escHtml(n)}">${rvKAv({
            name: n,
          })}<span class="grow"><b>${escHtml(n)}</b><small>${escHtml(uiText("rv_k_from_tx"))}</small></span>${svgIcon("plus", 16)}</button>`
      )
      .join("")}
      <button type="button" class="rvk ${!d.kid && !d.k.name ? "on" : ""}" data-rvknew><span class="rvav rvplus">${svgIcon("plus", 18)}</span><span class="grow"><b>${escHtml(uiText("rv_k_newrow"))}</b><small>${escHtml(
        uiText("rv_k_newrow_s", {
          n: d.kid ? rvKnrNext() : d.k.nr || rvKnrNext(),
        })
      )}</small></span></button></div>
      <div class="vacard rvgrid"><div class="rvkhd w2">${rvKAv(d.k, 1).replace('<span class="rvav', '<span id="rvKAv" class="rvav')}<b class="rvsub grow">${escHtml(d.kid ? uiText("rv_k_edit") : uiText("rv_k_new"))}</b>${d.kid ? `<button type="button" class="rvkdel" data-rvkdel>${svgIcon("trash", 15)} ${escHtml(uiText("rv_k_del"))}</button>` : ""}</div>${rvField(
        "rvKn",
        uiText("rv_k_name"),
        d.k.name,
        {
          cls: "w2",
          ph: "z. B. Studio Nord GmbH",
        }
      )}${rvField("rvKnr", uiText("rv_k_nr"), d.k.nr || "", {
        ph: rvKnrNext(),
      })}${rvField("rvKp", uiText("rv_k_person"), d.k.person, {
        ph: "z. B. Jana Peters",
      })}<small class="rvhint w2 rvbad" id="rvKnrD"${dup ? "" : " hidden"}>${escHtml(uiText("rv_k_nr_dup"))}</small>${rvField(
        "rvKe",
        uiText("rv_b_mail"),
        d.k.email,
        {
          type: "email",
        }
      )}${rvField("rvKw", uiText("rv_k_web"), d.k.web || "", {
        ph: "z. B. firma.de",
        im: "url",
      })}${rvField("rvKs", uiText("rv_b_street"), d.k.street, {
        cls: "w2",
      })}${rvField("rvKc", uiText("rv_b_city"), d.k.city, {
        cls: "w2",
        ph: "z. B. 20457 Hamburg",
      })}
      ${lon ? `<div class="rvklw w2"><small class="rvkls ${d.k.ld ? "ok" : ""}" id="rvKLs">${d.k.ld ? escHtml(uiText("rv_k_logo_ok")) : d.k.name ? escHtml(uiText("rv_k_logo_hint")) : escHtml(uiText("rv_k_logo_hint"))}</small>${d.k.ld ? `<button type="button" class="rvklx" data-rvkldel>${escHtml(uiText("rv_k_logo_del"))}</button>` : ""}</div>` : `<div class="rvkoff w2">${svgIcon("image", 18)}<span class="grow">${escHtml(uiText("rv_k_logo_off"))}</span><button type="button" class="btn" data-rvklon>${escHtml(uiText("rv_k_logo_on"))}</button></div>`}</div>`;
  }
  if (k === "pos") {
    const its = rvItemsSorted().filter((i) => !d.pos.some((p) => p.n === i.n));
    return `${rvTip("rv_tip_pos")}<div class="vacard rvpos">${
      d.pos
        .map(
          (
            p,
            i
          ) => `<div class="rvp" data-rvi="${i}"><div class="rvpn"><input class="in" data-rvpf="n" value="${escHtml(p.n)}" placeholder="${escHtml(uiText("rv_p_name"))}" aria-label="${escHtml(uiText("rv_p_name"))}"><div class="rvpm"><label><input class="in" data-rvpf="p" inputmode="decimal" value="${escHtml(numStr(p.p))}" placeholder="0,00" aria-label="${escHtml(uiText("rv_p_price"))}"><span>€ ${escHtml(uiText("rv_p_per"))}</span></label><input class="in rvu" data-rvpf="u" value="${escHtml(p.u || "")}" placeholder="${escHtml(uiText("rv_p_unit"))}" aria-label="${escHtml(uiText("rv_p_unit"))}">${b.klein ? "" : `<select class="in rvvs" data-rvpf="v" aria-label="${escHtml(uiText("rv_d_vat"))}">${[19, 7, 0].map((n) => `<option value="${n}" ${Number(p.v === undefined || p.v === null || p.v === "" ? d.vat : p.v) === n ? "selected" : ""}>${n} %</option>`).join("")}</select>`}</div></div>
        <div class="rvq"><button type="button" data-rvq="-1" aria-label="${escHtml(uiText("rv_less"))}">${svgIcon("minus", 15)}</button><input class="in" data-rvpf="q" inputmode="decimal" value="${escHtml(numStr(p.q))}" aria-label="${escHtml(uiText("rv_p_qty"))}"><button type="button" class="pl" data-rvq="1" aria-label="${escHtml(uiText("rv_more"))}">${svgIcon("plus", 15)}</button></div>
        <b class="rvpt" data-noi18n>${escHtml(rvEuro((Number(p.q) || 0) * (Number(p.p) || 0)))}</b><button type="button" class="rvpd" data-rvpdel aria-label="${escHtml(uiText("tm_del"))}">${svgIcon("x", 15)}</button></div>`
        )
        .join("") || `<p class="rvempty">${escHtml(uiText("rv_p_empty"))}</p>`
    }
      <div class="rvchips"><button type="button" class="chip on" data-rvadd>${svgIcon("plus", 14)} ${escHtml(uiText("rv_p_new"))}</button></div></div>
      ${rvLearnUi()}${rvItems().length ? `<div class="vacard rvitb"><div class="rvithd"><b class="rvsub">${escHtml(uiText("rv_it_h"))}</b><button type="button" class="rvklx" data-rvitall>${escHtml(uiText("rv_it_edit"))}</button></div><input class="in" id="rvItQ2" type="search" value="${escHtml(RV.itq || "")}" placeholder="${escHtml(uiText("rv_it_search"))}" aria-label="${escHtml(uiText("rv_it_search"))}"><div id="rvItL2">${rvItRows(its)}</div></div>` : ""}
      <div class="vacard rvsumc"><span>${escHtml(uiText("rv_sub"))}<small>${
        sum.rate === -1
          ? escHtml(uiText("rv_plus_vat_mix"))
          : sum.rate
            ? escHtml(
                uiText("rv_plus_vat", {
                  n: String(sum.rate),
                })
              )
            : b.klein
              ? escHtml(uiText("rv_klein_s"))
              : ""
      }</small></span><b id="rvSumB" data-noi18n>${escHtml(rvEuro(sum.net))}</b></div>`;
  }
  if (k === "det") {
    const zs = [7, 14, 30];
    if (!zs.includes(Number(d.z))) zs.push(Number(d.z));
    zs.sort((a, c) => a - c);
    const typ = d.typ || "r",
      own = rchList().filter((i) => i.doc && i.kunde === d.k.name && i.id !== d.id),
      abs = own.filter((i) => i.typ === "a"),
      refs = rchList()
        .filter((i) => !i.gs && i.id !== d.id && (!d.k.name || i.kunde === d.k.name))
        .slice(-12)
        .reverse();
    return `${rvTip("rv_tip_det")}<div class="vacard rvgrid"><div class="hlf w2"><span>${escHtml(uiText("rv_typ"))}</span><div class="seg rvseg">${["r", "a", "g"].map((t) => `<button type="button" class="${typ === t ? "on" : ""}" data-rvtyp="${t}">${escHtml(uiText("rv_typ_" + t))}</button>`).join("")}</div><small class="rvhint">${escHtml(uiText("rv_typ_" + typ + "_s"))}</small></div>
      ${typ === "g" ? `<label class="hlf w2"><span>${escHtml(uiText("rv_ref"))}</span><select class="in" id="rvDr"><option value="">${escHtml(uiText("rv_ref_none"))}</option>${refs.map((i) => `<option value="${escHtml(i.nr)}" ${d.ref === i.nr ? "selected" : ""}>${escHtml(i.nr)} · ${escHtml(i.kunde || "")} · ${escHtml(rvEuro(i.amt))}</option>`).join("")}</select></label>` : ""}
      ${
        typ === "r" && abs.length
          ? `<div class="hlf w2"><span>${escHtml(uiText("rv_abz_h"))}</span>${abs
              .map(
                (i) =>
                  `<label class="rvtog"><input type="checkbox" data-rvabz="${escHtml(i.id)}" ${(d.abz || []).some((a) => a.nr === i.nr) ? "checked" : ""}><span class="sw"></span><span><b data-noi18n>${escHtml(i.nr)} · ${escHtml(rvEuro(i.amt))}</b><small data-noi18n>${escHtml(
                    fxDate(i.date, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  )}</small></span></label>`
              )
              .join("")}</div>`
          : ""
      }</div>
      <div class="vacard rvgrid">${rvField("rvDn", uiText("rch_nr"), d.nr)}${rvField(
        "rvDd",
        uiText("rch_date"),
        d.date,
        {
          type: "date",
        }
      )}${rvField("rvDl", uiText("rv_d_lz"), d.lz, {
        cls: "w2",
        ph: uiText("rv_d_lz_ph"),
      })}
      ${
        typ === "g"
          ? ""
          : `<div class="hlf w2"><span>${escHtml(uiText("rch_days"))}</span><div class="seg rvseg">${zs.map((n) => `<button type="button" class="${Number(d.z) === n ? "on" : ""}" data-rvz="${n}">${n} ${escHtml(uiText("rch_tage"))}</button>`).join("")}</div><small class="rvhint">${escHtml(
              uiText("rv_d_due", {
                d: fxDate(addDays(d.date, Number(d.z) || 14), {
                  day: "numeric",
                  month: "long",
                }),
              })
            )}</small></div>`
      }
      ${b.klein ? `<div class="hlf w2"><span>${escHtml(uiText("rv_d_vat"))}</span><div class="rvinfo">${escHtml(uiText("rv_klein_s"))}</div></div>` : `<div class="hlf w2"><span>${escHtml(uiText("rv_d_vat"))}</span><div class="seg rvseg">${[19, 7, 0].map((n) => `<button type="button" class="${Number(d.vat) === n ? "on" : ""}" data-rvvat="${n}">${n} %</button>`).join("")}</div></div>`}</div>
      <div class="vacard rvgrid"><div class="hlf"><span>${escHtml(uiText("rv_d_lang"))}</span><div class="seg rvseg"><button type="button" class="${d.lang !== "en" ? "on" : ""}" data-rvlang="de">Deutsch</button><button type="button" class="${d.lang === "en" ? "on" : ""}" data-rvlang="en">English</button></div></div>${rvField(
        "rvDrb",
        uiText("rv_d_rab"),
        d.rab ? numStr(d.rab) : "",
        {
          im: "decimal",
          ph: "0",
        }
      )}</div>
      <div class="vacard rvgrid">${rvField("rvDt", uiText("rv_d_title"), d.title, {
        cls: "w2",
        ph: "Logo & Visitenkarten",
      })}<label class="hlf w2"><span>${escHtml(uiText("rv_d_intro"))}</span><textarea class="in" id="rvDi" rows="3">${escHtml(d.intro)}</textarea></label><label class="hlf w2"><span>${escHtml(uiText("rv_d_note"))}</span><textarea class="in" id="rvDo" rows="2" placeholder="${escHtml(uiText("rv_d_note_ph"))}">${escHtml(d.note)}</textarea></label></div>`;
  }
  const C = rvCheck();
  return `${rvTip(C.every((c) => c.ok) ? "rv_tip_ok" : "rv_tip_miss")}<div class="vacard rvtot"><small>${escHtml(uiText("rv_total"))}</small><b data-noi18n id="rvTot">${escHtml(rvEuro(sum.gross))}</b><span data-noi18n>${escHtml(d.k.name || "–")} · ${escHtml(d.nr)} · ${escHtml(
    uiText("rv_d_due", {
      d: fxDate(addDays(d.date, Number(d.z) || 14), {
        day: "numeric",
        month: "long",
      }),
    })
  )}</span></div>
    <div class="vacard rvchk"><b class="rvsub">${escHtml(uiText("rv_chk_h"))}</b>${C.map((c) => `<button type="button" class="rvc ${c.ok ? "ok" : "no"}" ${c.ok ? "" : `data-rvgo="${c.go}"`}><i>${svgIcon(c.ok ? "check" : "alert", 14)}</i><span>${escHtml(uiText(c.k))}</span>${c.ok ? "" : svgIcon("right", 15)}</button>`).join("")}</div>
    ${
      (d.typ || "r") === "r" && !d.recId
        ? `<div class="vacard rvgrid"><div class="hlf w2"><span>${escHtml(uiText("rv_rep"))}</span><div class="seg rvseg">${[0, 1, 3, 12].map((n) => `<button type="button" class="${Number(d.rep || 0) === n ? "on" : ""}" data-rvrep="${n}">${escHtml(uiText("rv_rep_" + n))}</button>`).join("")}</div><small class="rvhint">${escHtml(
            Number(d.rep) > 0
              ? uiText("rv_rep_s", {
                  d: fxDate(rvAddM(d.date, Number(d.rep)), {
                    day: "numeric",
                    month: "long",
                  }),
                })
              : uiText("rv_rep_s0")
          )}</small></div></div>`
        : ""
    }
    <div class="rvzc rvzm" tabindex="0"><span class="rvpl rvplm">${escHtml(uiText("rv_zoom_touch"))}</span>${rvzBar()}<div class="rvpaperm rvzi" id="rvPM" data-noi18n translate="no">${rvSvg(d)}</div></div>
    <div class="rvlockh">${svgIcon("lock", 15)}<span>${escHtml(uiText("rv_lock_h"))}</span></div>
    <div class="rvacts"><button type="button" class="btn" data-rvpdf>${svgIcon("dl", 17)} ${escHtml(uiText("rv_pdf"))}</button><button type="button" class="btn" data-rvmail>${svgIcon("mail", 17)} ${escHtml(uiText("rv_mail"))}</button></div>`;
}
function rvCheck() {
  const d = RV.d,
    b = rvBiz(),
    st = rvSteps();
  const go = (k) => Math.max(0, st.indexOf(k));
  return [
    {
      k: "rv_c_me",
      ok: !!(b.name && b.street && b.city),
      go: "me",
    },
    {
      k: "rv_c_tax",
      ok: !!(b.taxNo || b.vatId),
      go: "me",
    },
    {
      k: "rv_c_k",
      ok: !!(d.k.name && (d.k.street || d.k.city)),
      go: "kunde",
    },
    {
      k: "rv_c_pos",
      ok: d.pos.length > 0 && d.pos.every((p) => p.n && Number(p.q) > 0),
      go: "pos",
    },
    {
      k: "rv_c_date",
      ok: !!d.date,
      go: "det",
    },
    {
      k: "rv_c_nr",
      ok: !!d.nr && !rchList().some((i) => i.nr === d.nr && i.id !== d.id),
      go: "det",
    },
    {
      k: "rv_c_iban",
      ok: !!b.iban,
      go: "me",
    },
    ...(rvSum(d).pay < 0
      ? [
          {
            k: "rv_c_pay",
            ok: false,
            go: "det",
          },
        ]
      : []),
  ].map((c) => ({
    ...c,
    go: c.go === "me" && !st.includes("me") ? "me" : c.go,
  }));
}
function rvRender() {
  const d = RV.d,
    st = rvSteps(),
    k = st[RV.st] || "chk",
    nav = $("rvNav"),
    body = $("rvBody");
  if (!body) return;
  const sum = rvSum(d);
  $("rvSub").textContent = uiText("rch_nr") + " " + (d.nr || "");
  const lab = {
    me: ["rv_s_me", rvBiz().name || uiText("rv_s_me_s")],
    kunde: ["rv_s_k", d.k.name || uiText("rv_s_k_s")],
    pos: [
      "rv_s_pos",
      d.pos.length
        ? uiText("rv_s_pos_n", {
            n: String(d.pos.length),
            a: rvEuro(sum.net),
          })
        : uiText("rv_s_pos_s"),
    ],
    det: ["rv_s_det", rvDate(d.date) + " · " + d.z + " " + uiText("rch_tage")],
    chk: ["rv_s_chk", rvEuro(sum.gross)],
  };
  nav.innerHTML = `<div class="rvbar" aria-hidden="true"><i style="--p:${(RV.st + 1) / st.length}"></i></div>${st.map((s, i) => `<button type="button" class="rvst ${i === RV.st ? "on" : i < RV.st ? "done" : ""}" data-rvst="${i}" ${i === RV.st ? 'aria-current="step"' : ""}><span class="rvsn">${i < RV.st ? svgIcon("check", 14) : i + 1}</span><span class="rvstt"><b>${escHtml(uiText(lab[s][0]))}</b><small data-noi18n>${escHtml(lab[s][1])}</small></span></button>`).join("")}`;
  const last = RV.st === st.length - 1;
  body.innerHTML = `<div class="rvstep" data-k="${k}"><small class="rvcount">${escHtml(
    uiText("rv_step_n", {
      i: String(RV.st + 1),
      m: String(st.length),
    })
  )}</small><h2 class="rvh">${escHtml(uiText(lab[k][0] + "_q"))}</h2>${rvStepHtml(k)}</div>
    <div class="rvfoot">${RV.st > 0 ? `<button type="button" class="btn" data-rvback>${escHtml(uiText("rv_back"))}</button>` : ""}${
      last
        ? `<button type="button" class="btn primary" data-rvfin>${svgIcon("check", 17)} ${escHtml(uiText(d.id ? "rv_fin_upd" : "rv_fin"))}</button>`
        : `<button type="button" class="btn primary" data-rvnext>${escHtml(
            uiText("rv_next", {
              s: uiText(lab[st[RV.st + 1]][0]),
            })
          )} ${svgIcon("right", 16)}</button>`
    }</div>`;
  rvPrev();
  if (!reducedMotion()) {
    const s = body.querySelector(".rvstep");
    s.animate(
      [
        {
          transform: `translateX(${RV.dir * 34}px)`,
          opacity: 0,
        },
        {
          transform: "none",
          opacity: 1,
        },
      ],
      {
        duration: 340,
        easing: "cubic-bezier(.2,.9,.2,1)",
      }
    );
    [...s.querySelectorAll(".vacard,.rvtip,.rvks,.rvpaperm,.rvacts")].forEach((e, i) =>
      e.animate(
        [
          {
            transform: "translateY(10px)",
            opacity: 0,
          },
          {
            transform: "none",
            opacity: 1,
          },
        ],
        {
          duration: 320,
          delay: 60 + i * 45,
          easing: "ease-out",
          fill: "backwards",
        }
      )
    );
  }
}
/* Vorschau zoomen: Mausrad (PC), zwei Finger (Tablet/Handy), Doppelklick/-tipp, Ziehen zum Verschieben */
const RVZ = {
  p: new Map(),
};
function rvItSub(i) {
  const p = [];
  if (i.t)
    p.push(
      uiText("rv_it_last", {
        d: fxDate(i.t, {
          day: "2-digit",
          month: "2-digit",
        }),
      })
    );
  else if (i.c)
    p.push(
      uiText("rv_it_used", {
        n: String(i.c),
      })
    );
  else p.push(uiText("rv_it_new"));
  if (i.c && i.t)
    p.push(
      uiText("rv_it_used", {
        n: String(i.c),
      })
    );
  if (i.v !== undefined && i.v !== null && i.v !== "") p.push(i.v + " %");
  return p.join(" · ");
}
function rvItRows(its) {
  const f = String(RV.itq || "")
      .toLowerCase()
      .trim(),
    L = its.filter((i) => !f || i.n.toLowerCase().includes(f)),
    more = !f && !RV.itAll && L.length > 5,
    S2 = more ? L.slice(0, 5) : L;
  return (
    (S2.map(
      (i) =>
        `<button type="button" class="rvitr" data-rvitem="${escHtml(i.n)}"><span class="grow"><b data-noi18n>${escHtml(i.n)}</b><small>${escHtml(rvItSub(i))}</small></span><b class="rvitpr" data-noi18n>${escHtml(rvEuro(i.p))}${i.u ? `<small>/ ${escHtml(i.u)}</small>` : ""}</b><span class="rvitad">${svgIcon("plus", 16)}</span></button>`
    ).join("") || `<p class="rvempty">${escHtml(uiText(its.length ? "rv_it_nohit" : "rv_it_alladded"))}</p>`) +
    (more
      ? `<button type="button" class="rvitmore" data-rvitmore>${escHtml(
          uiText("rv_it_all", {
            n: String(L.length),
          })
        )} ›</button>`
      : "")
  );
}
const KD = {
  id: null,
  q: "",
  nw: 0,
};
function kdOpen(id) {
  KD.id = id === undefined ? null : id;
  KD.q = "";
  KD.nw = 0;
  hbSheet("kdBg", uiText("kd_h"));
  kdRender(true);
}
function kdRow(c) {
  const sub = [c.person, c.city].filter(Boolean).join(" · ");
  return `<button type="button" class="kdr ${KD.id === c.id ? "on" : ""}" data-kdsel="${escHtml(c.id)}">${rvKAv(c)}<span class="grow"><b data-noi18n>${escHtml(c.name || "–")}</b><small data-noi18n>${escHtml(sub || c.email || uiText("kd_nodata"))}</small></span>${c.nr ? `<span class="rvknr" data-noi18n>${escHtml(c.nr)}</span>` : ""}${svgIcon(KD.id === c.id ? "up" : "down", 16)}</button>`;
}
function kdForm(c) {
  const F = (id, l, v, o) => rvField(id, l, v, o);
  const dup = rvKnrDup(c.nr, c.id);
  return `<div class="kdf rvgrid" data-kdid="${escHtml(c.id || "")}">${F("kdN", uiText("rv_k_name"), c.name || "", {
    cls: "w2",
    ph: "z. B. Studio Nord GmbH",
  })}${F("kdNr", uiText("rv_k_nr"), c.nr || "", {
    ph: rvKnrNext(),
  })}${F("kdP", uiText("rv_k_person"), c.person || "", {
    ph: "z. B. Jana Peters",
  })}<small class="rvhint w2 rvbad" id="kdNrD"${dup ? "" : " hidden"}>${escHtml(uiText("rv_k_nr_dup"))}</small>${F(
    "kdE",
    uiText("rv_b_mail"),
    c.email || "",
    {
      type: "email",
    }
  )}${F("kdW", uiText("rv_k_web"), c.web || "", {
    ph: "z. B. firma.de",
    im: "url",
  })}${F("kdS", uiText("rv_b_street"), c.street || "", {
    cls: "w2",
  })}${F("kdC", uiText("rv_b_city"), c.city || "", {
    cls: "w2",
    ph: "z. B. 20457 Hamburg",
  })}
    <div class="kdbtns w2">${c.id ? `<button type="button" class="rvkdel" data-kddel>${svgIcon("trash", 15)} ${escHtml(uiText("rv_k_del"))}</button>` : ""}<span class="grow"></span>${c.id ? `<button type="button" class="btn" data-kdinv>${svgIcon("pen", 15)} ${escHtml(uiText("kd_inv"))}</button>` : ""}<button type="button" class="btn primary" data-kdsave>${escHtml(uiText("ra_save"))}</button></div></div>`;
}
function kdRender(first) {
  const bg = $("kdBg");
  if (!bg || bg.hidden) return;
  const b = bg.querySelector(".hobody"),
    f = KD.q.toLowerCase().trim(),
    L = rvKunden()
      .slice()
      .sort((a, c) => String(a.name || "").localeCompare(String(c.name || ""), "de")),
    F = L.filter((c) => !f || [c.name, c.nr, c.person, c.city, c.email].join(" ").toLowerCase().includes(f));
  const nw = {
    id: "",
    name: "",
    nr: rvKnrNext(),
  };
  b.innerHTML = `${rvLearnUi()}<div class="kdtop"><input class="in" id="kdQ" type="search" value="${escHtml(KD.q)}" placeholder="${escHtml(uiText("kd_search"))}" aria-label="${escHtml(uiText("kd_search"))}"><button type="button" class="btn primary" data-kdnew>${svgIcon("plus", 16)} ${escHtml(uiText("rv_k_newrow"))}</button></div>
    ${KD.nw ? `<div class="vacard kdnew"><b class="rvsub">${escHtml(uiText("rv_k_new"))}</b>${kdForm(nw)}</div>` : ""}
    <div class="vacard kdl" id="kdL">${F.map((c) => kdRow(c) + (KD.id === c.id ? kdForm(c) : "")).join("") || `<p class="rvempty">${escHtml(uiText(L.length ? "rv_it_nohit" : "kd_empty"))}</p>`}</div>`;
  if (first && !reducedMotion())
    b.querySelectorAll(".kdr").forEach((r, i) =>
      r.animate(
        [
          {
            opacity: 0,
            transform: "translateY(10px)",
          },
          {
            opacity: 1,
            transform: "none",
          },
        ],
        {
          duration: 360,
          delay: Math.min(i, 10) * 40,
          easing: "cubic-bezier(.2,1.2,.35,1)",
          fill: "backwards",
        }
      )
    );
  const fm = b.querySelector(".kdf");
  if (fm && !first && !reducedMotion())
    fm.animate(
      [
        {
          opacity: 0,
          transform: "translateY(-6px)",
        },
        {
          opacity: 1,
          transform: "none",
        },
      ],
      {
        duration: 280,
        easing: "cubic-bezier(.2,.9,.3,1)",
      }
    );
  if (store.settings.logos === true)
    for (const c of L)
      if (!c.lt)
        rvKLogo(c).then((ok) => {
          if (ok) {
            const r = document.querySelector(`#kdBg [data-kdsel="${CSS.escape(c.id)}"] .rvav`);
            if (r) r.outerHTML = rvKAv(c);
          }
        });
}
function kdVals() {
  const v = (id) => {
    const e = $(id);
    return e ? e.value.trim() : "";
  };
  return {
    name: v("kdN"),
    nr: v("kdNr"),
    person: v("kdP"),
    email: v("kdE"),
    web: v("kdW"),
    street: v("kdS"),
    city: v("kdC"),
  };
}
document.addEventListener("input", (e) => {
  if (!e.target.closest || !e.target.closest("#kdBg")) return;
  if (e.target.id === "kdQ") {
    KD.q = e.target.value;
    const l = $("kdL"),
      p = e.target.selectionStart;
    kdRender();
    const q = $("kdQ");
    if (q) {
      q.focus();
      try {
        q.setSelectionRange(p, p);
      } catch (_) {}
    }
    return;
  }
  if (e.target.id === "kdNr") {
    const fm = e.target.closest(".kdf"),
      d = $("kdNrD");
    if (d) d.hidden = !rvKnrDup(e.target.value, fm.dataset.kdid || "");
  }
});
document.addEventListener("click", async (e) => {
  const t = e.target;
  if (t.closest("[data-kdopen]")) {
    kdOpen();
    return;
  }
  if (!t.closest || !t.closest("#kdBg")) return;
  const sel = t.closest("[data-kdsel]");
  if (sel) {
    KD.id = KD.id === sel.dataset.kdsel ? null : sel.dataset.kdsel;
    KD.nw = 0;
    kdRender();
    SND.play("tick");
    return;
  }
  if (t.closest("[data-kdnew]")) {
    KD.nw = 1;
    KD.id = null;
    kdRender();
    setTimeout(() => {
      const n = $("kdN");
      n && n.focus();
    }, 60);
    return;
  }
  if (t.closest("[data-kdsave]")) {
    const fm = t.closest(".kdf"),
      id = fm.dataset.kdid || "",
      v = kdVals();
    if (!v.name) {
      toast(uiText("kd_need_name"));
      return;
    }
    if (rvKnrDup(v.nr, id)) {
      toast(uiText("rv_k_nr_dup"));
      return;
    }
    let c = rvKunden().find((x) => x.id === id);
    if (!c) {
      c = {
        id: "k" + Date.now().toString(36),
      };
      rvKunden().push(c);
    }
    const oldKey = rvKDoms(c).join("|");
    Object.assign(c, v, {
      nr: v.nr || c.nr || rvKnrNext(),
    });
    if (rvKDoms(c).join("|") !== oldKey) {
      delete c.lt;
    }
    await saveSettings();
    KD.id = null;
    KD.nw = 0;
    kdRender();
    toast(uiText("kd_saved"));
    if (store.settings.logos === true)
      rvKLogo(c).then((ok) => {
        if (ok) kdRender();
      });
    try {
      render();
    } catch (_) {}
    return;
  }
  if (t.closest("[data-kddel]")) {
    const id = t.closest(".kdf").dataset.kdid,
      L = rvKunden(),
      ix = L.findIndex((x) => x.id === id);
    if (ix < 0) return;
    const c = L[ix];
    L.splice(ix, 1);
    KD.id = null;
    await saveSettings();
    kdRender();
    try {
      render();
    } catch (_) {}
    toast(
      uiText("rv_k_deleted", {
        n: c.name,
      }),
      async () => {
        if (!rvKunden().some((x) => x.id === c.id)) rvKunden().splice(Math.min(ix, rvKunden().length), 0, c);
        await saveSettings();
        kdRender();
        try {
          render();
        } catch (_) {}
      }
    );
    return;
  }
  if (t.closest("[data-kdinv]")) {
    const c = rvKunden().find((x) => x.id === t.closest(".kdf").dataset.kdid);
    if (!c) return;
    hbSheetClose("kdBg");
    const d = rvNew();
    d.kid = c.id;
    d.k = {
      name: c.name,
      person: c.person || "",
      street: c.street || "",
      city: c.city || "",
      email: c.email || "",
      nr: c.nr || "",
      web: c.web || "",
      ld: c.ld || "",
      lk: c.lk,
      lt: c.lt,
    };
    setTimeout(() => {
      rvOpen(d);
      try {
        const i = rvSteps().indexOf("pos");
        if (i > 0 && RV.meDone) {
          RV.st = i;
          rvRender();
        }
      } catch (_) {}
    }, 230);
    return;
  }
  if (t.closest("[data-rvlearn]")) {
    await rvLearn();
    kdRender();
    return;
  }
});
function rvItOpen(q) {
  const b = hbSheet("rvItBg", uiText("rv_it_h"));
  const bg = $("rvItBg");
  if (bg) bg.style.zIndex = 260;
  const L = rvItemsSorted(),
    f = String(q || "").toLowerCase(),
    F = L.filter((i) => !f || i.n.toLowerCase().includes(f));
  b.innerHTML = `<div class="rvits"><input class="in" id="rvItQ" type="search" value="${escHtml(q || "")}" placeholder="${escHtml(uiText("rv_it_search"))}" aria-label="${escHtml(uiText("rv_it_search"))}"></div>
    <div class="vacard rvitl" id="rvItL">${
      F.map(
        (i) =>
          `<div class="rvit" data-rvitn="${escHtml(i.n)}"><span class="grow"><b data-noi18n>${escHtml(i.n)}</b><small>${escHtml(
            i.c
              ? uiText("rv_it_used", {
                  n: String(i.c),
                })
              : uiText("rv_it_new")
          )}${i.v !== undefined && i.v !== null && i.v !== "" ? " · " + escHtml(String(i.v)) + " %" : ""}</small></span><label class="rvitp"><input class="in" data-rvitp inputmode="decimal" value="${escHtml(numStr(i.p))}" aria-label="${escHtml(uiText("rv_p_price"))}"><span>€${i.u ? " / " + escHtml(i.u) : ""}</span></label><button type="button" class="rvitx" data-rvitdel aria-label="${escHtml(uiText("rv_it_del"))}">${svgIcon("x", 15)}</button><button type="button" class="rvitad" data-rvitadd aria-label="${escHtml(uiText("rv_it_add"))}">${svgIcon("plus", 16)}</button></div>`
      ).join("") || `<p class="rvempty">${escHtml(uiText(L.length ? "rv_it_nohit" : "rv_it_none"))}</p>`
    }</div>`;
  if (!q && !reducedMotion())
    b.querySelectorAll(".rvit").forEach((r, i) =>
      r.animate(
        [
          {
            opacity: 0,
            transform: "translateY(10px)",
          },
          {
            opacity: 1,
            transform: "none",
          },
        ],
        {
          duration: 360,
          delay: Math.min(i, 10) * 40,
          easing: "cubic-bezier(.2,1.2,.35,1)",
          fill: "backwards",
        }
      )
    );
}
document.addEventListener("input", (e) => {
  if (e.target.id === "rvItQ2") {
    RV.itq = e.target.value;
    const l = $("rvItL2");
    if (l && RV.d) l.innerHTML = rvItRows(rvItemsSorted().filter((i) => !RV.d.pos.some((p) => p.n === i.n)));
    return;
  }
  if (e.target.id === "rvItQ") {
    const v = e.target.value,
      p = e.target.selectionStart;
    rvItOpen(v);
    const n = $("rvItQ");
    if (n) {
      n.focus();
      try {
        n.setSelectionRange(p, p);
      } catch (_) {}
    }
    return;
  }
  if (e.target.matches && e.target.matches("[data-rvitp]")) {
    const r = e.target.closest("[data-rvitn]"),
      it = rvItems().find((i) => i.n === r.dataset.rvitn);
    if (it) {
      it.p = parseAmt(e.target.value) || 0;
      clearTimeout(RVK.ts);
      RVK.ts = setTimeout(() => saveSettings(), 500);
    }
  }
});
document.addEventListener("click", (e) => {
  const r = e.target.closest && e.target.closest("#rvItBg [data-rvitn]");
  if (!r) return;
  const n = r.dataset.rvitn;
  if (e.target.closest("[data-rvitdel]")) {
    const go = () => {
      const L = rvItems(),
        i = L.findIndex((x) => x.n === n);
      if (i >= 0) L.splice(i, 1);
      saveSettings();
      rvItOpen(($("rvItQ") || {}).value || "");
      if (RV.d && rvSteps()[RV.st] === "pos") {
        rvSync();
        rvRender();
      }
    };
    if (reducedMotion()) go();
    else
      r.animate(
        [
          {
            opacity: 1,
            transform: "none",
          },
          {
            opacity: 0,
            transform: "translateX(-50px)",
          },
        ],
        {
          duration: 220,
          easing: "ease-in",
        }
      ).finished.then(go, go);
    return;
  }
  if (e.target.closest("[data-rvitadd]")) {
    const it = rvItems().find((x) => x.n === n);
    if (it && RV.d) {
      rvSync();
      RV.d.pos.push({
        n: it.n,
        q: 1,
        u: it.u || "",
        p: it.p,
        ...(it.v !== undefined && it.v !== null && it.v !== ""
          ? {
              v: it.v,
            }
          : {}),
      });
      hbSheetClose("rvItBg");
      rvRender();
      SND.play("tick");
    }
  }
});
function rvzSt(c) {
  return (
    c._z ||
    (c._z = {
      s: 1,
      tx: 0,
      ty: 0,
    })
  );
}
function rvzApply(c, anim) {
  const z = rvzSt(c),
    i = c.querySelector(".rvzi");
  if (!i) return;
  if (z.s <= 1.001) {
    z.s = 1;
    z.tx = 0;
    z.ty = 0;
  } else {
    const W = i.offsetWidth * z.s,
      H = i.offsetHeight * z.s,
      cw = c.clientWidth,
      ch = c.clientHeight,
      ox = i.offsetLeft,
      oy = i.offsetTop;
    z.tx = W + ox * 2 <= cw ? 0 : Math.min(-ox + 8, Math.max(cw - W - ox - 8, z.tx));
    z.ty = H + oy <= ch ? 0 : Math.min(-oy + 8, Math.max(ch - H - oy - 8, z.ty));
  }
  const zoomed = z.s > 1;
  if (zoomed && !c.classList.contains("zoomed")) {
    z.ty -= c.scrollTop;
    c.scrollTop = 0;
  }
  const back = !zoomed && c.classList.contains("zoomed") ? c._sy || 0 : null;
  c.classList.toggle("zoomed", zoomed);
  i.style.transition = anim && !reducedMotion() ? "transform .28s cubic-bezier(.2,.9,.2,1)" : "none";
  i.style.transform = zoomed ? `translate(${z.tx}px,${z.ty}px) scale(${z.s})` : "";
  if (back !== null) c.scrollTop = back;
  const b = c.querySelector(".rvzp");
  if (b) b.textContent = Math.round(z.s * 100) + " %";
}
function rvzAt(c, s, cx, cy, anim) {
  const z = rvzSt(c),
    i = c.querySelector(".rvzi");
  if (!i) return;
  const r = c.getBoundingClientRect(),
    ns = Math.max(1, Math.min(5, s));
  if (z.s <= 1) {
    c._sy = c.scrollTop;
    z.ty = -c.scrollTop;
    c.scrollTop = 0;
    c.classList.add("zoomed");
  }
  const px = cx - r.left - i.offsetLeft,
    py = cy - r.top - i.offsetTop,
    ux = (px - z.tx) / z.s,
    uy = (py - z.ty) / z.s;
  z.tx = px - ux * ns;
  z.ty = py - uy * ns;
  z.s = ns;
  rvzApply(c, anim);
}
document.addEventListener(
  "wheel",
  (e) => {
    const c = e.target.closest && e.target.closest("#rvBg .rvzc");
    if (!c) return;
    e.preventDefault();
    const z = rvzSt(c);
    rvzAt(
      c,
      z.s * Math.exp(-Math.max(-60, Math.min(60, e.deltaY * (e.deltaMode === 1 ? 16 : 1))) * 0.004),
      e.clientX,
      e.clientY,
      false
    );
  },
  {
    passive: false,
  }
);
document.addEventListener("dblclick", (e) => {
  const c = e.target.closest && e.target.closest("#rvBg .rvzc");
  if (!c || e.target.closest(".rvzb")) return;
  const z = rvzSt(c);
  try {
    getSelection().removeAllRanges();
  } catch (_) {}
  rvzAt(c, z.s > 1.2 ? 1 : 2.2, e.clientX, e.clientY, true);
});
document.addEventListener("pointerdown", (e) => {
  const c = e.target.closest && e.target.closest("#rvBg .rvzc");
  if (!c || e.target.closest(".rvzb")) return;
  const z = rvzSt(c);
  RVZ.p.set(e.pointerId, {
    x: e.clientX,
    y: e.clientY,
  });
  RVZ.c = c;
  if (RVZ.p.size === 2) {
    const [a, b] = [...RVZ.p.values()];
    RVZ.d0 = Math.hypot(a.x - b.x, a.y - b.y) || 1;
    RVZ.s0 = z.s;
    RVZ.m0 = {
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
    };
    RVZ.pan = null;
  } else if (z.s > 1) {
    RVZ.pan = {
      x: e.clientX,
      y: e.clientY,
      tx: z.tx,
      ty: z.ty,
    };
    try {
      c.setPointerCapture(e.pointerId);
    } catch (_) {}
    if (e.pointerType === "mouse") e.preventDefault();
  }
  if (e.pointerType !== "mouse") {
    const t = Date.now();
    if (
      RVZ.p.size === 1 &&
      t - (RVZ.tap || 0) < 300 &&
      Math.hypot(e.clientX - (RVZ.tx0 || 0), e.clientY - (RVZ.ty0 || 0)) < 30
    ) {
      rvzAt(c, z.s > 1.2 ? 1 : 2.2, e.clientX, e.clientY, true);
      RVZ.tap = 0;
    } else {
      RVZ.tap = t;
      RVZ.tx0 = e.clientX;
      RVZ.ty0 = e.clientY;
    }
  }
});
document.addEventListener(
  "pointermove",
  (e) => {
    if (!RVZ.p.has(e.pointerId)) return;
    const c = RVZ.c,
      z = rvzSt(c);
    RVZ.p.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
    });
    if (RVZ.p.size === 2) {
      e.preventDefault();
      const [a, b] = [...RVZ.p.values()],
        d = Math.hypot(a.x - b.x, a.y - b.y),
        m = {
          x: (a.x + b.x) / 2,
          y: (a.y + b.y) / 2,
        };
      rvzAt(c, (RVZ.s0 * d) / RVZ.d0, m.x, m.y, false);
      z.tx += m.x - RVZ.m0.x;
      z.ty += m.y - RVZ.m0.y;
      RVZ.m0 = m;
      RVZ.s0 = z.s;
      RVZ.d0 = d;
      rvzApply(c, false);
      return;
    }
    if (RVZ.pan && z.s > 1) {
      z.tx = RVZ.pan.tx + (e.clientX - RVZ.pan.x);
      z.ty = RVZ.pan.ty + (e.clientY - RVZ.pan.y);
      rvzApply(c, false);
    }
  },
  {
    passive: false,
  }
);
const rvzUp = (e) => {
  RVZ.p.delete(e.pointerId);
  if (RVZ.p.size < 2) {
    RVZ.d0 = null;
  }
  if (!RVZ.p.size) RVZ.pan = null;
};
document.addEventListener("pointerup", rvzUp);
document.addEventListener("pointercancel", rvzUp);
document.addEventListener("click", (e) => {
  const r = e.target.closest && e.target.closest("#rvBg [data-rvzr]");
  if (r) {
    const c = r.closest(".rvzc");
    rvzSt(c).s = 1;
    rvzApply(c, true);
  }
  const p = e.target.closest && e.target.closest("#rvBg [data-rvzp]");
  if (p) {
    const c = p.closest(".rvzc"),
      q = c.getBoundingClientRect();
    rvzAt(c, rvzSt(c).s * (p.dataset.rvzp === "1" ? 1.4 : 1 / 1.4), q.left + q.width / 2, q.top + q.height / 2, true);
  }
});
document.addEventListener("keydown", (e) => {
  const c = document.activeElement && document.activeElement.closest && document.activeElement.closest("#rvBg .rvzc");
  if (!c) return;
  const q = c.getBoundingClientRect(),
    z = rvzSt(c);
  if (e.key === "+" || e.key === "=") {
    e.preventDefault();
    rvzAt(c, z.s * 1.4, q.left + q.width / 2, q.top + q.height / 2, true);
  } else if (e.key === "-") {
    e.preventDefault();
    rvzAt(c, z.s / 1.4, q.left + q.width / 2, q.top + q.height / 2, true);
  } else if (e.key === "0") {
    z.s = 1;
    rvzApply(c, true);
  }
});
function rvzBar() {
  return `<div class="rvzb" data-noi18n><button type="button" data-rvzp="0" aria-label="${escHtml(uiText("rv_zoom_out"))}">${svgIcon("minus", 14)}</button><button type="button" class="rvzp" data-rvzr title="${escHtml(uiText("rv_zoom_reset"))}">100 %</button><button type="button" data-rvzp="1" aria-label="${escHtml(uiText("rv_zoom_in"))}">${svgIcon("plus", 14)}</button></div>`;
}
function rvPrev() {
  const p = $("rvPP");
  if (p) p.innerHTML = rvSvg(RV.d);
  const m = $("rvPM");
  if (m) m.innerHTML = rvSvg(RV.d);
}
function rvSync() {
  const d = RV.d;
  if (!d) return;
  const v = (id) => {
      const e = $(id);
      return e ? e.value : null;
    },
    b = rvBiz(),
    st = rvSteps(),
    k = st[RV.st];
  if (k === "me" && $("rvBn")) {
    const nrWas = rchNextNr(b);
    Object.assign(b, {
      name: v("rvBn").trim(),
      owner: v("rvBo").trim(),
      email: v("rvBe").trim(),
      street: v("rvBs").trim(),
      city: v("rvBc").trim(),
      tel: v("rvBt").trim(),
      web: v("rvBw").trim(),
      taxNo: v("rvBx").trim(),
      vatId: v("rvBv").trim().toUpperCase(),
      iban: v("rvBi").replace(/\s+/g, " ").trim().toUpperCase(),
      bic: v("rvBb").trim().toUpperCase(),
      bank: v("rvBn2").trim(),
      klein: $("rvBk").checked,
      nrPre: v("rvBp").trim(),
      nrSuf: $("rvBsf") ? v("rvBsf").trim() : b.nrSuf || "",
      nrYear: $("rvBy") ? $("rvBy").checked : !!b.nrYear,
      nrStart: Math.max(0, Math.floor(Number(v("rvBst")) || 0)) || "",
    });
    const nn = $("rvNrN"),
      nrNow = rchNextNr(b);
    if (nn)
      nn.textContent = uiText("rv_nr_next", {
        n: nrNow,
      });
    if (d.nr === nrWas && nrNow !== nrWas) {
      d.nr = nrNow;
      const sb = $("rvSub");
      if (sb) sb.textContent = uiText("rch_nr") + " " + nrNow;
    }
    if (!RV.d.id && !RV.d.recId && !RV.nrTouched) RV.d.nr = rchNextNr(b);
  }
  if (k === "kunde" && $("rvKn")) {
    Object.assign(d.k, {
      name: v("rvKn").trim(),
      person: v("rvKp").trim(),
      email: v("rvKe").trim(),
      street: v("rvKs").trim(),
      city: v("rvKc").trim(),
      nr: $("rvKnr") ? v("rvKnr").trim() : d.k.nr,
      web: $("rvKw") ? v("rvKw").trim() : d.k.web || "",
    });
    const dd = $("rvKnrD");
    if (dd) dd.hidden = !rvKnrDup(d.k.nr, d.kid);
  }
  if (k === "pos")
    document.querySelectorAll("#rvBody .rvp").forEach((r) => {
      const p = d.pos[+r.dataset.rvi];
      if (!p) return;
      r.querySelectorAll("[data-rvpf]").forEach((i) => {
        const f = i.dataset.rvpf;
        p[f] = f === "n" || f === "u" ? i.value : f === "v" ? Number(i.value) : parseAmt(i.value) || 0;
      });
    });
  if (k === "det" && $("rvDn")) {
    if ($("rvDr")) d.ref = v("rvDr");
  }
  if (k === "det" && $("rvDrb")) d.rab = Math.max(0, Math.min(100, parseAmt(v("rvDrb")) || 0));
  if (k === "det" && $("rvDn"))
    Object.assign(d, {
      nr: v("rvDn").trim(),
      date: v("rvDd") || isoToday(),
      lz: v("rvDl").trim(),
      title: v("rvDt").trim(),
      intro: v("rvDi"),
      note: v("rvDo"),
    });
}
function rvGo(i) {
  const st = rvSteps();
  rvSync();
  i = Math.max(0, Math.min(st.length - 1, i));
  if (i === RV.st) return;
  if (st[RV.st] === "me" && i > RV.st) {
    if (!rvBiz().name) {
      toast(uiText("rv_need_name"));
      return;
    }
    saveSettings();
  }
  if (st[RV.st] === "pos") {
    rvItemsSave(RV.d, false);
    saveSettings();
  }
  RV.dir = i > RV.st ? 1 : -1;
  RV.st = i;
  rvRender();
  SND.play("tick");
  try {
    $("rvBody").scrollTop = 0;
  } catch (_) {}
}
async function rvFinish() {
  rvSync();
  const d = RV.d,
    C = rvCheck(),
    bad = C.find((c) => !c.ok);
  if (bad) {
    toast(uiText(bad.k) + " – " + uiText("rv_fix"));
    rvGo(rvSteps().indexOf(bad.go));
    return;
  }
  const sum = rvSum(d),
    b = rvBiz();
  let c =
    rvKunden().find((x) => x.id === d.kid) || rvKunden().find((x) => x.name.toLowerCase() === d.k.name.toLowerCase());
  if (rvKnrDup(d.k.nr, c ? c.id : "")) {
    toast(uiText("rv_k_nr_dup"));
    rvGo(rvSteps().indexOf("kunde"));
    return;
  }
  if (!c) {
    c = {
      id: "k" + Date.now().toString(36),
    };
    rvKunden().push(c);
  }
  Object.assign(c, {
    name: d.k.name,
    person: d.k.person,
    street: d.k.street,
    city: d.k.city,
    email: d.k.email,
    nr: String(d.k.nr || c.nr || rvKnrNext()).trim(),
    web: d.k.web || "",
  });
  if (d.k.lk !== undefined) {
    c.ld = d.k.ld || "";
    c.lk = d.k.lk;
    c.lt = d.k.lt;
  }
  d.kid = c.id;
  d.k.nr = c.nr;
  rvItemsSave(d, true);
  const due = addDays(d.date, Number(d.z) || 14),
    typ = d.typ || "r",
    rec = {
      kunde: d.k.name,
      amt: typ === "g" ? -sum.pay : sum.pay,
      nr: d.nr,
      date: d.date,
      z: Number(d.z) || 14,
      due,
      made: 1,
      typ,
      doc: JSON.parse(
        JSON.stringify({
          ...d,
          id: undefined,
        })
      ),
    };
  if (typ === "g") {
    rec.paid = d.date;
    rec.gs = 1;
  }
  let id = d.id,
    tgt = null;
  if (id) {
    tgt = rchList().find((x) => x.id === id);
    if (tgt && tgt.locked) {
      toast(uiText("rch_locked"));
      return;
    }
    if (tgt) Object.assign(tgt, rec);
  }
  if (!tgt) {
    id = "i" + Date.now().toString(36);
    tgt = {
      id,
      ...rec,
    };
    rchList().push(tgt);
  }
  b.z = Number(d.z) || 14;
  tgt.locked = new Date().toISOString();
  await rvSeal(tgt);
  rvLog("create", tgt.nr, (typ !== "r" ? typ + " · " : "") + fmtEur(tgt.amt) + " · " + (tgt.kunde || ""));
  if (d.recId) {
    const r = rvRecs().find((x) => x.id === d.recId);
    if (r) {
      r.next = rvAddM(r.next, r.every);
      r.src = id;
    }
  } else if (!d.id && typ === "r" && Number(d.rep) > 0) {
    rvRecs().push({
      id: "r" + Date.now().toString(36),
      src: id,
      every: Number(d.rep),
      next: rvAddM(d.date, Number(d.rep)),
      kunde: d.k.name,
    });
  }
  try {
    localStorage.removeItem("hb-rvdraft");
  } catch (_) {}
  await saveSettings();
  SND.play("done");
  try {
    navigator.vibrate && navigator.vibrate([10, 40, 14]);
  } catch (_) {}
  const w = document.querySelector("#rvBg .rvwin");
  if (w && !reducedMotion()) {
    try {
      hbConfetti(document.body, 46);
    } catch (_) {}
    await w
      .animate(
        [
          {
            transform: "none",
            opacity: 1,
          },
          {
            transform: "translateY(-14px) scale(.96)",
            opacity: 0,
          },
        ],
        {
          duration: 360,
          easing: "cubic-bezier(.5,0,.8,.3)",
          fill: "forwards",
        }
      )
      .finished.catch(() => {});
  }
  $("rvBg").hidden = true;
  $("rvBg").innerHTML = "";
  document.body.classList.remove("locked");
  RCHU.edit = null;
  rchOpen2(id);
  toast(
    uiText("rv_saved", {
      n: d.nr,
    })
  );
}
async function rvStorno(id) {
  const o = rchList().find((x) => x.id === id);
  if (!o || !o.doc || o.storno) return;
  const lg = o.doc.lang === "en" ? "en" : "de",
    nr = rchNextNr();
  const d = JSON.parse(JSON.stringify(o.doc));
  Object.assign(d, {
    typ: "s",
    ref: o.nr,
    nr,
    date: isoToday(),
    title: "",
    abz: [],
    rep: 0,
    intro:
      lg === "en"
        ? `I hereby cancel invoice no. ${o.nr} in full:`
        : `Hiermit storniere ich die Rechnung Nr. ${o.nr} vollständig:`,
    note: "",
  });
  delete d.id;
  delete d.recId;
  const sum = rvSum(d),
    rec = {
      id: "i" + Date.now().toString(36),
      kunde: o.kunde,
      amt: sum.pay,
      nr,
      date: d.date,
      z: 0,
      due: d.date,
      made: 1,
      typ: "s",
      paid: d.date,
      doc: d,
      locked: new Date().toISOString(),
    };
  await rvSeal(rec);
  rchList().push(rec);
  o.storno = nr;
  if (!o.paid) o.paid = d.date;
  o.stornoAt = d.date;
  rvLog("storno", o.nr, "→ " + nr);
  rvLog("create", nr, "s · " + fmtEur(rec.amt) + " · " + (rec.kunde || ""));
  store.settings.rvRec = rvRecs().filter((r) => r.src !== o.id);
  await saveSettings();
  SND.play("done");
  rchOpen2(rec.id);
  toast(
    uiText("rch_storno_ok", {
      n: nr,
    }),
    () => rvFmtAsk(d, "save"),
    uiText("rv_pdf"),
    8000
  );
}
function rchPartOpen(id) {
  const i = rchList().find((x) => x.id === id);
  if (!i) return;
  RCHU.part = id;
  const b = hbSheet("rchPBg", uiText("rch_part_h"));
  b.innerHTML = `<p class="hosub" data-noi18n>${escHtml(i.kunde || "")} · #${escHtml(i.nr || "")} · ${escHtml(
    uiText("rch_part_rest", {
      a: fmtEur(rchRest(i)),
      b: fmtEur(i.amt),
    })
  )}</p><div class="vacard" style="padding:14px 16px"><div class="hlr"><label class="hlf grow"><span>${escHtml(uiText("rch_part_amt"))}</span><input class="in" id="rchPA" inputmode="decimal" value="${escHtml(numStr(rchRest(i)))}"></label><label class="hlf grow"><span>${escHtml(uiText("rch_date"))}</span><input class="in" type="date" id="rchPD" value="${escHtml(isoToday())}"></label></div>
  ${
    (i.parts || []).length
      ? `<div class="rchpl">${i.parts
          .map(
            (x) =>
              `<div><span>${escHtml(
                fxDate(x.d, {
                  day: "numeric",
                  month: "short",
                })
              )}</span><b>${escHtml(fmtEur(x.a))}</b></div>`
          )
          .join("")}</div>`
      : ""
  }
  <div class="vabtns" style="margin-top:12px"><button class="btn primary" data-rchpartsave>${escHtml(uiText("rch_part_save"))}</button></div></div>`;
  setTimeout(() => {
    const e = $("rchPA");
    e && e.select();
  }, 120);
}
async function rchPartSave() {
  const i = rchList().find((x) => x.id === RCHU.part);
  if (!i) return;
  const a = parseAmt($("rchPA").value),
    d = $("rchPD").value || isoToday();
  if (!(a > 0)) {
    toast(uiText("rch_need_amt"));
    return;
  }
  (i.parts = i.parts || []).push({
    d,
    a,
  });
  rvLog("part", i.nr, fmtEur(a));
  if (rchRest(i) <= 0.005) {
    i.paid = d;
    rvLog("paid", i.nr, "");
  }
  await saveSettings();
  hbSheetClose("rchPBg");
  SND.play("done");
  rchOpen2(i.id);
}
async function rvArchive() {
  const L = rchList()
      .slice()
      .sort((a, b) => String(a.date).localeCompare(String(b.date))),
    files = [],
    enc = new TextEncoder(),
    q = (v) => '"' + String(v ?? "").replace(/"/g, '""') + '"',
    n2 = (v) =>
      round2(Number(v) || 0)
        .toFixed(2)
        .replace(".", ",");
  const ver = await rvVerify(),
    rows = [
      [
        "Nr",
        "Art",
        "Datum",
        "Leistung",
        "Kunde",
        "Netto",
        "USt",
        "Brutto",
        "Zahlbar bis",
        "Status",
        "Bezahlt am",
        "Teilzahlungen",
        "Storniert durch",
        "Bezug",
        "Festgeschrieben",
        "Pruefsiegel SHA-256",
      ]
        .map(q)
        .join(";"),
    ];
  for (const i of L) {
    let net = "",
      vat = "";
    if (i.doc) {
      try {
        const sm = rvSum(i.doc);
        net = n2(sm.net);
        vat = n2(sm.vat);
      } catch (_) {}
      try {
        const u = new Uint8Array(await rvPdf(i.doc).arrayBuffer());
        files.push({
          name: "Rechnungen/" + String(i.nr || i.id).replace(/[\\/:*?"<>|]+/g, "-") + ".pdf",
          data: u,
        });
      } catch (_) {}
    } else if (i.img) {
      try {
        const im = await rcptGet("rch-" + i.id);
        if (im)
          files.push({
            name: "Rechnungen-Scans/" + String(i.nr || i.id).replace(/[\\/:*?"<>|]+/g, "-") + ".jpg",
            data: b64bytes(im),
          });
      } catch (_) {}
    }
    rows.push(
      [
        i.nr,
        {
          a: "Abschlag",
          g: "Gutschrift",
          s: "Storno",
        }[i.typ] || "Rechnung",
        i.date,
        (i.doc && i.doc.lz) || i.date,
        i.kunde,
        net,
        vat,
        n2(i.amt),
        i.due || "",
        i.typ === "s" ? "Storno" : i.storno ? "storniert" : i.gs ? "Gutschrift" : i.paid ? "bezahlt" : "offen",
        i.paid || "",
        (i.parts || []).map((x) => x.d + " " + n2(x.a)).join(" | "),
        i.storno || "",
        (i.doc && i.doc.ref) || "",
        i.locked || "",
        i.h || "",
      ]
        .map(q)
        .join(";")
    );
  }
  files.push({
    name: "Rechnungsausgangsbuch.csv",
    data: enc.encode("\ufeff" + rows.join("\r\n")),
  });
  const lg = [["Zeit", "Aktion", "Rechnung", "Info"].map(q).join(";")].concat(
    (store.settings.rvLog || []).map((x) => [x.t, x.a, x.nr, x.x].map(q).join(";"))
  );
  files.push({
    name: "Aenderungsprotokoll.csv",
    data: enc.encode("\ufeff" + lg.join("\r\n")),
  });
  const b = rvBiz();
  files.push({
    name: "LIESMICH.txt",
    data: enc.encode(
      `Rechnungsarchiv ${b.name || ""}\r\nErstellt am ${new Date().toLocaleString("de-DE")} mit Finanz MAMI\r\n\r\nRechnungen/ – alle geschriebenen Rechnungen als PDF\r\nRechnungen-Scans/ – fotografierte oder importierte Rechnungen\r\nRechnungsausgangsbuch.csv – alle Rechnungen mit Beträgen, Status und Prüfsiegel (für Excel oder Prüfsoftware)\r\nAenderungsprotokoll.csv – wann was erstellt, storniert oder bezahlt wurde\r\n\r\nFestgeschriebene Rechnungen sind mit einem Prüfsiegel (SHA-256-Kette) gesichert.\r\nPrüfung beim Export: ${ver.bad.length ? "ABWEICHUNG bei " + ver.bad.join(", ") : "alle " + ver.n + " Rechnungen unverändert"}.\r\nRechnungen bitte 8 Jahre aufbewahren (seit 2025; vorher 10 Jahre).\r\n`
    ),
  });
  rvLog("export", "", files.length + " Dateien");
  await saveSettings();
  {
    const zb = makeZip(files),
      zn = "Rechnungsarchiv-" + isoToday() + ".zip",
      r = await rvSaveAs(
        zb instanceof Blob
          ? zb
          : new Blob([zb], {
              type: "application/zip",
            }),
        zn,
        "application/zip"
      );
    if (r === "ok" || r === "cancel") return;
    await saveBinary(zn, zb, uiText("rch_arch_ok"));
  }
}
const rvOkKey = (mime) => (mime === "application/xml" ? "eo_saved_xr" : "rv_pdf_ok");
async function rvSaveAs(blob, name, mime) {
  const br = window.AndroidBridge;
  if (br && br.saveFileAs) {
    const b64 = await new Promise((r) => {
      const fr = new FileReader();
      fr.onload = () => r(String(fr.result).split(",")[1] || "");
      fr.readAsDataURL(blob);
    });
    if (IS_DESK) {
      try {
        const r = br.saveFileAs(name, b64, uiText("rv_save_as"));
        if (r === "cancel") return "cancel";
        if (r && String(r).startsWith("ok:")) {
          toast(
            uiText("rv_saved_at", {
              p: String(r).slice(3),
            })
          );
          return "ok";
        }
      } catch (_) {}
    } else {
      const r = await new Promise((res) => {
        window.hbSaveAsDone = (ok) => {
          window.hbSaveAsDone = null;
          res(ok === true ? "ok" : ok === null ? "cancel" : "");
        };
        try {
          if (!br.saveFileAs(name, mime, b64)) {
            window.hbSaveAsDone = null;
            res("");
          }
        } catch (_) {
          window.hbSaveAsDone = null;
          res("");
        }
      });
      if (r === "ok") toast(uiText(rvOkKey(mime)));
      if (r) return r;
    }
  }
  if (!NATIVE && window.showSaveFilePicker) {
    try {
      const ext = name.split(".").pop(),
        h = await window.showSaveFilePicker({
          suggestedName: name,
          types: [
            {
              description: ext.toUpperCase(),
              accept: {
                [mime]: ["." + ext],
              },
            },
          ],
        });
      const w = await h.createWritable();
      await w.write(blob);
      await w.close();
      toast(uiText(rvOkKey(mime)));
      return "ok";
    } catch (e) {
      if (e && e.name === "AbortError") return "cancel";
    }
  }
  return "";
}
async function rvSavePdf(d, f) {
  d = d || (rvSync(), RV.d);
  const { blob, name, mime } = f || rvOutFile(d, "pdf");
  {
    const r = await rvSaveAs(blob, name, mime);
    if (r === "cancel") return;
    if (r === "ok") {
      try {
        if (d.nr && rchList().some((i) => i.nr === d.nr)) rvLog("pdf", d.nr, "");
        await saveSettings();
      } catch (_) {}
      return;
    }
  }
  if (!NATIVE && navigator.canShare && /Android|iPhone|iPad/i.test(navigator.userAgent)) {
    try {
      const file = new File([blob], name, {
        type: mime,
      });
      if (
        navigator.canShare({
          files: [file],
        })
      ) {
        await navigator.share({
          files: [file],
          title: name,
        });
        return;
      }
    } catch (e) {
      if (e && e.name === "AbortError") return;
    }
  }
  try {
    if (d.nr && rchList().some((i) => i.nr === d.nr)) rvLog("pdf", d.nr, "");
  } catch (_) {}
  await saveBinary(name, blob, uiText(rvOkKey(mime)));
}
function rvMail(d, f) {
  d = d || (rvSync(), RV.d);
  const sum = rvSum(d),
    nm = rvBiz().owner || rvBiz().name || "",
    due = addDays(d.date, Number(d.z) || 14);
  const txt = `${d.k.person ? "Hallo " + d.k.person : "Sehr geehrte Damen und Herren"},\n\nanbei erhalten Sie meine Rechnung Nr. ${d.nr} über ${rvEuro(sum.gross)}.\nBitte überweisen Sie den Betrag bis zum ${rvDate(due)}.\n\nVielen Dank für die gute Zusammenarbeit!\n\nViele Grüße\n${nm}`;
  rvMailGo(d, txt, f);
}
async function rvMailGo(d, txt, f) {
  const { blob, name, mime } = f || rvOutFile(d, "pdf"),
    subj = "Rechnung " + d.nr,
    to = d.k.email || "",
    br = window.AndroidBridge;
  const b64 = await new Promise((r) => {
    const fr = new FileReader();
    fr.onload = () => r(String(fr.result).split(",")[1] || "");
    fr.readAsDataURL(blob);
  });
  try {
    if (rchList().some((i) => i.nr === d.nr)) rvLog("mail", d.nr, to);
  } catch (_) {}
  if (br && br.mailFile) {
    try {
      const r = br.mailFile(to, subj, txt, name, b64);
      if (r) {
        toast(uiText(r === "tb" ? "rv_mail_tb" : "rv_mail_hint"));
        return;
      }
    } catch (_) {}
  }
  if (br && br.sendFile) {
    try {
      if (br.sendFile(to, subj, txt, name, mime, b64)) return;
    } catch (_) {}
  }
  if (!NATIVE && navigator.canShare) {
    try {
      const file = new File([blob], name, {
        type: mime,
      });
      if (
        navigator.canShare({
          files: [file],
        })
      ) {
        await navigator.share({
          files: [file],
          title: subj,
          text: txt,
        });
        return;
      }
    } catch (e) {
      if (e && e.name === "AbortError") return;
    }
  }
  await saveBinary(name, blob, uiText(rvOkKey(mime)));
  setTimeout(() => {
    location.href =
      "mailto:" + encodeURIComponent(to) + "?subject=" + encodeURIComponent(subj) + "&body=" + encodeURIComponent(txt);
  }, 500);
  toast(uiText("rv_mail_hint"));
}
document.addEventListener("click", (e) => {
  const t = e.target;
  if (t.closest("[data-rvnew]")) {
    e.preventDefault();
    let dr = null;
    try {
      dr = JSON.parse(localStorage.getItem("hb-rvdraft") || "null");
    } catch (_) {}
    if (dr && (dr.pos || []).length && !rchList().some((i) => i.nr === dr.nr)) {
      hbSheetClose && hbSheetClose("rchBg");
      rvOpen(dr);
      toast(uiText("rv_draft_back"));
      return;
    }
    try {
      hbSheetClose("rchBg");
    } catch (_) {}
    rvOpen();
    return;
  }
  const rr = t.closest("[data-rvrec]");
  if (rr) {
    rvRecOpen(rr.dataset.rvrec);
    return;
  }
  const rs = t.closest("[data-rvrecstop]");
  if (rs) {
    store.settings.rvRec = rvRecs().filter((x) => x.id !== rs.dataset.rvrecstop);
    saveSettings();
    try {
      rchOpen2();
    } catch (_) {}
    toast(uiText("rv_rec_stopped"));
    return;
  }
  const sto = t.closest("[data-rvstorno]");
  if (sto) {
    if (!sto.dataset.armed) {
      sto.dataset.armed = 1;
      sto.classList.add("danger");
      sto.textContent = uiText("rch_storno_sure");
      setTimeout(() => {
        if (sto.isConnected) {
          delete sto.dataset.armed;
          sto.classList.remove("danger");
          sto.textContent = uiText("rch_storno");
        }
      }, 3500);
      return;
    }
    rvStorno(sto.dataset.rvstorno);
    return;
  }
  const pa = t.closest("[data-rchpart]");
  if (pa) {
    rchPartOpen(pa.dataset.rchpart);
    return;
  }
  if (t.closest("[data-rchpartsave]")) {
    rchPartSave();
    return;
  }
  if (t.closest("[data-rvarch]")) {
    rvArchive();
    return;
  }
  if (t.closest("[data-rvlogv]")) {
    const l = $("rcLog");
    if (!l) return;
    l.hidden = !l.hidden;
    if (!l.hidden) {
      const L = (store.settings.rvLog || []).slice(-60).reverse();
      l.innerHTML =
        L.map(
          (x) =>
            `<div class="rclr"><span>${escHtml(
              new Date(x.t).toLocaleString(LANG === "de" ? "de-DE" : undefined, {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            )}</span><b>${escHtml(uiText("rlog_" + x.a))}</b><span data-noi18n>${escHtml(x.nr)} ${escHtml(x.x)}</span></div>`
        ).join("") || `<p class="small muted">–</p>`;
      if (!reducedMotion())
        l.animate(
          [
            {
              opacity: 0,
              transform: "translateY(-6px)",
            },
            {
              opacity: 1,
              transform: "none",
            },
          ],
          {
            duration: 260,
          }
        );
    }
    return;
  }
  const rc = t.closest("[data-rvcopy]");
  if (rc) {
    const i = rchList().find((x) => x.id === rc.dataset.rvcopy);
    if (i && i.doc) {
      const d = JSON.parse(JSON.stringify(i.doc));
      Object.assign(d, {
        nr: rchNextNr(),
        date: isoToday(),
        id: undefined,
      });
      try {
        hbSheetClose("rchBg");
      } catch (_) {}
      rvOpen(d);
      toast(uiText("rv_copy_t"));
    }
    return;
  }
  const re = t.closest("[data-rvedit]");
  if (re) {
    const i = rchList().find((x) => x.id === re.dataset.rvedit);
    if (i && i.doc) {
      const d = JSON.parse(JSON.stringify(i.doc));
      d.id = i.id;
      try {
        hbSheetClose("rchBg");
      } catch (_) {}
      rvOpen(d);
    }
    return;
  }
  const rp = t.closest("[data-rvpdfid]");
  if (rp) {
    const i = rchList().find((x) => x.id === rp.dataset.rvpdfid);
    if (i && i.doc) rvFmtAsk(i.doc, "save");
    return;
  }
  if (!t.closest("#rvBg")) return;
  if (t.closest("[data-rvclose]")) {
    rvClose();
    return;
  }
  if (e.target.id === "rvDn") RV.nrTouched = 1;
  if (t.closest("[data-rvnext]")) {
    rvGo(RV.st + 1);
    return;
  }
  if (t.closest("[data-rvback]")) {
    rvGo(RV.st - 1);
    return;
  }
  const s = t.closest("[data-rvst]");
  if (s) {
    rvGo(+s.dataset.rvst);
    return;
  }
  const g = t.closest("[data-rvgo]");
  if (g) {
    rvGo(rvSteps().indexOf(g.dataset.rvgo));
    return;
  }
  if (t.closest("[data-rvfin]")) {
    rvFinish();
    return;
  }
  if (t.closest("[data-rvpdf]")) {
    rvSync();
    rvFmtAsk(RV.d, "save");
    return;
  }
  if (t.closest("[data-rvmail]")) {
    rvSync();
    rvFmtAsk(RV.d, "mail");
    return;
  }
  if (t.closest("[data-rvpv]")) {
    const w = $("rvBg").querySelector(".rvwin");
    RV.pv = !RV.pv;
    w.classList.toggle("pv", !!RV.pv);
    rvSync();
    rvPrev();
    SND.play(RV.pv ? "whoosh" : "whooshin");
    return;
  }
  if (t.closest("[data-rvlogo]")) {
    rvSync();
    $("rvLogoF").click();
    return;
  }
  if (t.closest("[data-rvlogodel]")) {
    rvSync();
    const b = rvBiz();
    delete b.logo;
    delete b.logoW;
    delete b.logoH;
    delete b.logoA;
    delete b.logoPng;
    rvRender();
    SND.play("tick");
    return;
  }
  const col = t.closest("[data-rvcol]");
  if (col) {
    rvSync();
    rvBiz().color = col.dataset.rvcol;
    document.querySelectorAll(".rvcol").forEach((x) => x.classList.toggle("on", x === col));
    rvPrev();
    if (!reducedMotion())
      col.animate(
        [
          {
            transform: "scale(.7)",
          },
          {
            transform: "scale(1.15)",
          },
          {
            transform: "none",
          },
        ],
        {
          duration: 380,
          easing: "cubic-bezier(.3,1.6,.5,1)",
        }
      );
    return;
  }
  const k = t.closest("[data-rvk]");
  if (k) {
    const c = rvKunden().find((x) => x.id === k.dataset.rvk);
    if (c) {
      RV.d.kid = c.id;
      RV.d.k = {
        name: c.name,
        person: c.person || "",
        street: c.street || "",
        city: c.city || "",
        email: c.email || "",
        nr: c.nr || "",
        web: c.web || "",
        ld: c.ld || "",
        lk: c.lk,
        lt: c.lt,
      };
      rvRender();
      SND.play("tick");
    }
    return;
  }
  const kn = t.closest("[data-rvkn]");
  if (kn) {
    RV.d.kid = "";
    RV.d.k = {
      name: kn.dataset.rvkn,
      person: "",
      street: "",
      city: "",
      email: "",
      nr: rvKnrNext(),
    };
    rvRender();
    rvKLogoSoon();
    setTimeout(() => {
      const i = $("rvKs");
      i && i.focus();
    }, 360);
    return;
  }
  if (t.closest("[data-rvkdel]")) {
    const L = rvKunden(),
      ix = L.findIndex((x) => x.id === RV.d.kid);
    if (ix < 0) return;
    const c = L[ix],
      row = document.querySelector(`[data-rvk="${CSS.escape(c.id)}"]`);
    const go = () => {
      L.splice(ix, 1);
      RV.d.kid = "";
      RV.d.k = {
        name: "",
        person: "",
        street: "",
        city: "",
        email: "",
        nr: rvKnrNext(),
      };
      saveSettings();
      rvRender();
      SND.play("tick");
      toast(
        uiText("rv_k_deleted", {
          n: c.name,
        }),
        () => {
          if (!rvKunden().some((x) => x.id === c.id)) rvKunden().splice(Math.min(ix, rvKunden().length), 0, c);
          if (RV.d) {
            RV.d.kid = c.id;
            RV.d.k = {
              name: c.name,
              person: c.person || "",
              street: c.street || "",
              city: c.city || "",
              email: c.email || "",
              nr: c.nr || "",
              web: c.web || "",
              ld: c.ld || "",
              lk: c.lk,
              lt: c.lt,
            };
          }
          saveSettings();
          if ($("rvBg") && !$("rvBg").hidden) rvRender();
        }
      );
    };
    if (row && !reducedMotion())
      row
        .animate(
          [
            {
              opacity: 1,
              transform: "none",
            },
            {
              opacity: 0,
              transform: "translateX(-60px)",
            },
          ],
          {
            duration: 240,
            easing: "ease-in",
            fill: "forwards",
          }
        )
        .finished.then(go, go);
    else go();
    return;
  }
  if (t.closest("[data-rvknew]")) {
    RV.d.kid = "";
    RV.d.k = {
      name: "",
      person: "",
      street: "",
      city: "",
      email: "",
      nr: rvKnrNext(),
    };
    rvRender();
    SND.play("tick");
    setTimeout(() => {
      const i = $("rvKn");
      i && i.focus();
    }, 360);
    return;
  }
  if (t.closest("[data-rvklon]")) {
    rvSync();
    store.settings.logos = true;
    saveSettings();
    rvRender();
    rvKLogoSoon();
    try {
      prefetchLogos();
    } catch (_) {}
    return;
  }
  if (t.closest("[data-rvkldel]")) {
    rvSync();
    const d = RV.d;
    d.k.ld = "";
    d.k.lk = rvKDoms(d.k).join("|");
    d.k.lt = Date.now();
    rvRender();
    SND.play("tick");
    return;
  }
  if (t.closest("[data-rvitall]")) {
    rvSync();
    rvItOpen();
    return;
  }
  if (t.closest("[data-rvlearn]")) {
    rvSync();
    rvLearn();
    return;
  }
  if (t.closest("[data-rvitmore]")) {
    RV.itAll = 1;
    const l = $("rvItL2");
    if (l && RV.d) {
      l.innerHTML = rvItRows(rvItemsSorted().filter((i) => !RV.d.pos.some((p) => p.n === i.n)));
      if (!reducedMotion())
        [...l.querySelectorAll(".rvitr")].slice(5).forEach((r, i) =>
          r.animate(
            [
              {
                opacity: 0,
                transform: "translateY(8px)",
              },
              {
                opacity: 1,
                transform: "none",
              },
            ],
            {
              duration: 320,
              delay: i * 40,
              easing: "cubic-bezier(.2,1.2,.35,1)",
              fill: "backwards",
            }
          )
        );
    }
    return;
  }
  if (t.closest("[data-rvadd]")) {
    rvSync();
    RV.d.pos.push({
      n: "",
      q: 1,
      u: "",
      p: 0,
    });
    rvRender();
    setTimeout(() => {
      const r = [...document.querySelectorAll("#rvBody .rvp")].pop();
      if (r) {
        r.querySelector("input").focus();
        if (!reducedMotion())
          r.animate(
            [
              {
                transform: "translateX(40px)",
                opacity: 0,
              },
              {
                transform: "none",
                opacity: 1,
              },
            ],
            {
              duration: 340,
              easing: "cubic-bezier(.2,.9,.2,1)",
            }
          );
      }
    }, 40);
    return;
  }
  const it = t.closest("[data-rvitem]");
  if (it) {
    if (it.closest("#rvItBg")) return;
    rvSync();
    const i = rvItems().find((x) => x.n === it.dataset.rvitem);
    if (i) {
      RV.d.pos.push({
        n: i.n,
        q: 1,
        u: i.u || "",
        p: i.p,
        ...(i.v !== undefined && i.v !== null && i.v !== ""
          ? {
              v: i.v,
            }
          : {}),
      });
      rvRender();
      SND.play("tick");
    }
    return;
  }
  const q = t.closest("[data-rvq]");
  if (q) {
    rvSync();
    const r = q.closest(".rvp"),
      p = RV.d.pos[+r.dataset.rvi];
    p.q = Math.max(0, round2((Number(p.q) || 0) + Number(q.dataset.rvq)));
    r.querySelector('[data-rvpf="q"]').value = numStr(p.q);
    rvPosUpd(r);
    SND.play("tick");
    if (!reducedMotion())
      r.querySelector('[data-rvpf="q"]').animate(
        [
          {
            transform: "scale(1.25)",
          },
          {
            transform: "none",
          },
        ],
        {
          duration: 240,
          easing: "ease-out",
        }
      );
    return;
  }
  if (t.closest("[data-rvpdel]")) {
    rvSync();
    const r = t.closest(".rvp"),
      i = +r.dataset.rvi;
    const go = () => {
      RV.d.pos.splice(i, 1);
      rvRender();
    };
    if (reducedMotion()) go();
    else
      r.animate(
        [
          {
            transform: "none",
            opacity: 1,
          },
          {
            transform: "translateX(-60px)",
            opacity: 0,
          },
        ],
        {
          duration: 220,
          easing: "ease-in",
        }
      ).finished.then(go, go);
    return;
  }
  const ty = t.closest("[data-rvtyp]");
  if (ty) {
    rvSync();
    const d = RV.d,
      o = d.typ || "r";
    d.typ = ty.dataset.rvtyp;
    const df = {
      r: "",
      a: "Abschlagsrechnung",
      g: "Gutschrift",
    };
    if (!d.title || Object.values(df).includes(d.title)) d.title = df[d.typ];
    const di = {
      r: "Vielen Dank für Ihren Auftrag. Hiermit stelle ich Ihnen folgende Leistungen in Rechnung:",
      a: "Wie vereinbart berechne ich Ihnen folgende Abschlagszahlung:",
      g: "Hiermit schreibe ich Ihnen folgende Beträge gut:",
    };
    if (!d.intro || Object.values(di).includes(d.intro)) d.intro = di[d.typ];
    if (d.typ !== "r") d.abz = [];
    if (o !== d.typ) {
      rvRender();
      SND.play("tick");
    }
    return;
  }
  const lgb = t.closest("[data-rvlang]");
  if (lgb) {
    rvSync();
    const d = RV.d,
      nl = lgb.dataset.rvlang;
    if ((d.lang || "de") === nl) return;
    const DI = {
      de: [
        "Vielen Dank für Ihren Auftrag. Hiermit stelle ich Ihnen folgende Leistungen in Rechnung:",
        "Wie vereinbart berechne ich Ihnen folgende Abschlagszahlung:",
        "Hiermit schreibe ich Ihnen folgende Beträge gut:",
      ],
      en: [
        "Thank you for your order. I hereby invoice you for the following services:",
        "As agreed, I am invoicing you for the following deposit:",
        "I hereby credit you with the following amounts:",
      ],
    };
    const ix = DI[d.lang === "en" ? "en" : "de"].indexOf(d.intro);
    if (!d.intro || ix >= 0) d.intro = DI[nl][Math.max(0, ix)];
    d.lang = nl;
    rvRender();
    SND.play("tick");
    return;
  }
  const rp2 = t.closest("[data-rvrep]");
  if (rp2) {
    rvSync();
    RV.d.rep = +rp2.dataset.rvrep;
    rvRender();
    SND.play("tick");
    return;
  }
  const z = t.closest("[data-rvz]");
  if (z) {
    rvSync();
    RV.d.z = +z.dataset.rvz;
    rvRender();
    return;
  }
  const vt = t.closest("[data-rvvat]");
  if (vt) {
    rvSync();
    RV.d.vat = +vt.dataset.rvvat;
    rvRender();
    return;
  }
});
async function rvLogoSet(f) {
  try {
    const url = await new Promise((ok, no) => {
      const fr = new FileReader();
      fr.onload = () => ok(fr.result);
      fr.onerror = no;
      fr.readAsDataURL(f);
    });
    const im = await new Promise((ok, no) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = no;
      i.src = url;
    });
    let w = im.naturalWidth || im.width || 400,
      h = im.naturalHeight || im.height || 200;
    const sc = Math.min(1, 700 / w, 300 / h);
    w = Math.max(1, Math.round(w * sc));
    h = Math.max(1, Math.round(h * sc));
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const x = c.getContext("2d");
    x.drawImage(im, 0, 0, w, h);
    const px = x.getImageData(0, 0, w, h).data,
      al = new Uint8Array(w * h);
    let tr = false;
    for (let i = 0; i < w * h; i++) {
      al[i] = px[i * 4 + 3];
      if (al[i] < 250) tr = true;
    }
    const b = rvBiz();
    delete b.logoA;
    delete b.logoPng;
    if (tr) {
      b.logoPng = c.toDataURL("image/png");
      const z = new Uint8Array(
        await new Response(new Blob([al]).stream().pipeThrough(new CompressionStream("deflate"))).arrayBuffer()
      );
      let bs = "";
      for (let i = 0; i < z.length; i += 8192) bs += String.fromCharCode.apply(null, z.subarray(i, i + 8192));
      b.logoA = btoa(bs);
    }
    x.globalCompositeOperation = "destination-over";
    x.fillStyle = "#fff";
    x.fillRect(0, 0, w, h);
    b.logo = c.toDataURL("image/jpeg", 0.92);
    b.logoW = w;
    b.logoH = h;
    rvRender();
    SND.play("done");
    const li = document.querySelector(".rvlimg img");
    if (li && !reducedMotion())
      li.animate(
        [
          {
            transform: "scale(.6) rotate(-4deg)",
            opacity: 0,
          },
          {
            transform: "scale(1.06)",
            offset: 0.7,
          },
          {
            transform: "none",
            opacity: 1,
          },
        ],
        {
          duration: 480,
          easing: "cubic-bezier(.3,1.4,.5,1)",
        }
      );
  } catch (_) {
    toast(uiText("rv_b_logo_err"));
  }
}
function rvPosUpd(r) {
  const p = RV.d.pos[+r.dataset.rvi];
  if (p) {
    const b = r.querySelector(".rvpt");
    if (b) b.textContent = rvEuro((Number(p.q) || 0) * (Number(p.p) || 0));
  }
  const s = $("rvSumB"),
    sm = rvSum(RV.d);
  if (s) s.textContent = rvEuro(sm.net);
  const sl = document.querySelector("#rvBg .rvsumc small");
  if (sl && !rvBiz().klein)
    sl.textContent =
      sm.rate === -1
        ? uiText("rv_plus_vat_mix")
        : sm.rate
          ? uiText("rv_plus_vat", {
              n: String(sm.rate),
            })
          : "";
  clearTimeout(RV.pt);
  RV.pt = setTimeout(rvPrev, 180);
}
document.addEventListener("input", (e) => {
  if (!e.target.closest("#rvBg")) return;
  if (e.target.id === "rvDn") RV.nrTouched = 1;
  rvSync();
  if (["rvKn", "rvKe", "rvKw"].includes(e.target.id)) rvKLogoSoon();
  const r = e.target.closest(".rvp");
  if (r) rvPosUpd(r);
  else {
    clearTimeout(RV.pt);
    RV.pt = setTimeout(rvPrev, 220);
  }
});
document.addEventListener("input", (e) => {
  if (e.target.id === "rvColC") {
    const b = rvBiz();
    b.color = e.target.value;
    document.querySelectorAll(".rvcol").forEach((x) => x.classList.toggle("on", x.classList.contains("rvcust")));
    const l = e.target.closest(".rvcust");
    if (l) l.style.setProperty("--c", e.target.value);
    clearTimeout(RV.ct);
    RV.ct = setTimeout(rvPrev, 120);
  }
});
document.addEventListener("change", async (e) => {
  if (e.target.id === "rvLogoF") {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (f) await rvLogoSet(f);
    return;
  }
  if (e.target.id === "rvBk" || e.target.id === "rvDd" || e.target.id === "rvDr") {
    rvSync();
    rvPrev();
    return;
  }
  const a = e.target.closest && e.target.closest("[data-rvabz]");
  if (a) {
    rvSync();
    const i = rchList().find((x) => x.id === a.dataset.rvabz);
    if (!i) return;
    const d = RV.d;
    d.abz = (d.abz || []).filter((x) => x.nr !== i.nr);
    if (a.checked)
      d.abz.push({
        nr: i.nr,
        amt: i.amt,
      });
    rvPrev();
    SND.play("tick");
  }
});
document.addEventListener("keydown", (e) => {
  const bg = $("rvBg");
  if (!bg || bg.hidden) return;
  if (e.key === "Escape") {
    e.preventDefault();
    rvClose();
  }
});
