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
