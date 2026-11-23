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
      rm = motionOff();
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
