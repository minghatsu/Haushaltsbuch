/* ===== Töne: leise, kurze Klänge nur an wenigen Stellen (WebAudio, ohne Dateien) ===== */
/* Pegel je Klang, gemessen und angeglichen (ziel: −27 bis −38 LUFS, je nach Wichtigkeit) */
const SND_G = {
  sanft: {
    save: 5.97,
    income: 2.15,
    tick: 5.5,
    untick: 6.6,
    done: 1.95,
    del: 3.15,
    undo: 3.32,
    ping: 2.8,
    pop: 9.95,
    nav: 8.36,
    detent: 8.54,
    copy: 3.47,
    whoosh: 13.33,
    whooshin: 9.57,
    page: 14.95,
    glide: 3.85,
    shutter: 19.17,
    pair: 2.32,
    bell: 2.97,
    fanfare: 2.51,
    warn: 2.64,
    err: 6.32,
  },
  glas: {
    save: 3.29,
    income: 2.01,
    tick: 3.27,
    untick: 4.2,
    done: 1.49,
    del: 2.08,
    undo: 2.05,
    ping: 2.17,
    pop: 9.95,
    nav: 5.7,
    detent: 6.06,
    copy: 2.57,
    whoosh: 11.9,
    whooshin: 9.98,
    page: 16.4,
    glide: 3.69,
    shutter: 19.17,
    pair: 2.17,
    bell: 1.95,
    fanfare: 1.9,
    warn: 2.05,
    err: 5.65,
  },
  holz: {
    save: 9.89,
    income: 8.0,
    tick: 13.72,
    untick: 16.03,
    done: 5.28,
    del: 11.95,
    undo: 5.92,
    ping: 8.76,
    pop: 9.95,
    nav: 19.17,
    detent: 19.56,
    copy: 7.95,
    whoosh: 13.76,
    whooshin: 9.0,
    page: 15.58,
    glide: 3.5,
    shutter: 19.98,
    pair: 5.47,
    bell: 1.82,
    fanfare: 5.69,
    warn: 4.87,
    err: 5.47,
  },
};
const SND = {
  ctx: null,
  bus: null,
  last: {},
  t0: 0,
  on() {
    try {
      return localStorage.getItem("hb-snd") !== "0";
    } catch (_) {
      return true;
    }
  },
  style() {
    let v = "sanft";
    try {
      v = localStorage.getItem("hb-sndst") || "sanft";
    } catch (_) {}
    return ["sanft", "glas", "holz"].includes(v) ? v : "sanft";
  },
  vol() {
    let v = "normal";
    try {
      v = localStorage.getItem("hb-sndvol") || "normal";
    } catch (_) {}
    return v === "leise" ? 0.5 : 1;
  },
  quiet() {
    try {
      const b = window.AndroidBridge;
      if (b && typeof b.ringerMode === "function") return Number(b.ringerMode()) < 2;
    } catch (_) {}
    return false;
  },
  init() {
    if (this.ctx) return this.ctx;
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    try {
      const c = new C({
        latencyHint: "interactive",
      });
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -12;
      comp.knee.value = 10;
      comp.ratio.value = 3;
      comp.attack.value = 0.002;
      comp.release.value = 0.12;
      const lp = c.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 7000;
      lp.Q.value = 0.5;
      const g = c.createGain();
      g.gain.value = 0.36;
      lp.connect(comp);
      comp.connect(g);
      g.connect(c.destination);
      this.ctx = c;
      this.bus = lp;
      this.out = g;
    } catch (_) {
      return null;
    }
    return this.ctx;
  },
  /* ein Ton: Grundton + Obertöne je nach Klangstil */
  note(f, at, dur, amp, st) {
    const c = this.ctx,
      o = this.bus;
    const voice = (freq, a, d, type) => {
      const os = c.createOscillator(),
        g = c.createGain();
      os.type = type || "sine";
      os.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, a), at + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, at + d);
      os.connect(g);
      g.connect(o);
      os.start(at);
      os.stop(at + d + 0.03);
    };
    if (st === "glas") {
      voice(f, amp * 0.9, dur * 1.6);
      voice(f * 2.76, amp * 0.22, dur * 0.7);
      voice(f * 5.4, amp * 0.06, dur * 0.35);
    } else if (st === "holz") {
      voice(f * 0.5, amp, dur * 0.45, "triangle");
      voice(f * 1.5, amp * 0.18, dur * 0.2);
      const n = c.createBufferSource(),
        b = c.createBuffer(1, Math.ceil(c.sampleRate * 0.012), c.sampleRate),
        d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
      const bp = c.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = f * 3;
      bp.Q.value = 2.5;
      const ng = c.createGain();
      ng.gain.value = amp * 0.5;
      n.buffer = b;
      n.connect(bp);
      bp.connect(ng);
      ng.connect(o);
      n.start(at);
    } else {
      voice(f, amp, dur);
      voice(f * 4, amp * 0.1, dur * 0.3);
      voice(f * 2, amp * 0.12, dur * 0.5);
    }
  },
  /* gefiltertes Rauschen: Wusch, Blättern, Kamera */
  hiss(at, dur, f0, f1, amp, q) {
    const c = this.ctx,
      n = c.createBufferSource(),
      len = Math.ceil(c.sampleRate * dur),
      b = c.createBuffer(1, len, c.sampleRate),
      d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = q || 1.2;
    bp.frequency.setValueAtTime(f0, at);
    bp.frequency.exponentialRampToValueAtTime(f1, at + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(amp, at + dur * 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    n.buffer = b;
    n.connect(bp);
    bp.connect(g);
    g.connect(this.bus);
    n.start(at);
  },
  /* Gleitton */
  glide(at, f0, f1, dur, amp) {
    const c = this.ctx,
      os = c.createOscillator(),
      g = c.createGain();
    os.type = "sine";
    os.frequency.setValueAtTime(f0, at);
    os.frequency.exponentialRampToValueAtTime(f1, at + dur);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(amp, at + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    os.connect(g);
    g.connect(this.bus);
    os.start(at);
    os.stop(at + dur + 0.03);
  },
  /* Blase für Mami: kurzer Ton, der nach oben gleitet */
  bub(at, amp) {
    const c = this.ctx,
      os = c.createOscillator(),
      g = c.createGain();
    os.type = "sine";
    os.frequency.setValueAtTime(380, at);
    os.frequency.exponentialRampToValueAtTime(820, at + 0.07);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(amp, at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.13);
    os.connect(g);
    g.connect(this.bus);
    os.start(at);
    os.stop(at + 0.16);
  },
  play(k, force) {
    if (!force && (!this.on() || document.hidden || this.quiet())) return;
    const c = this.init();
    if (!c) return;
    if (c.state === "suspended") c.resume().catch(() => {});
    const now = performance.now();
    if (now - (this.last[k] || 0) < 90 || now - this.t0 < 40) return;
    this.last[k] = now;
    this.t0 = now;
    const st = this.style(),
      r = st === "glas" ? 659.25 : st === "holz" ? 784 : 523.25,
      v = this.vol() * ((SND_G[st] || {})[k] || 1),
      t = c.currentTime + 0.01,
      N = (m, dt, d, a) => this.note(r * m, t + dt, d, a * v, st);
    if (k === "save") N(1.5, 0, 0.32, 0.5);
    else if (k === "income") {
      N(1, 0, 0.26, 0.42);
      N(1.5, 0.075, 0.4, 0.5);
    } else if (k === "tick") N(2, 0, 0.16, 0.36);
    else if (k === "untick") N(1.5, 0, 0.12, 0.22);
    else if (k === "done") {
      N(1, 0, 0.22, 0.36);
      N(1.25, 0.07, 0.22, 0.38);
      N(1.5, 0.14, 0.24, 0.4);
      N(2, 0.21, 0.6, 0.46);
    } else if (k === "del") {
      N(1.5, 0, 0.14, 0.3);
      N(1, 0.065, 0.24, 0.3);
    } else if (k === "undo") {
      N(1, 0, 0.12, 0.26);
      N(1.5, 0.06, 0.2, 0.3);
    } else if (k === "ping") {
      N(1.5, 0, 0.2, 0.34);
      N(2, 0.11, 0.36, 0.38);
    } else if (k === "pop") this.bub(t, 0.26 * v);
    else if (k === "nav") N(2, 0, 0.07, 0.16);
    else if (k === "detent") N(3, 0, 0.035, 0.12);
    else if (k === "copy") {
      N(2, 0, 0.05, 0.2);
      N(2.5, 0.05, 0.08, 0.2);
    } else if (k === "whoosh") this.hiss(t, 0.22, 500, 2400, 0.16 * v, 1.1);
    else if (k === "whooshin") this.hiss(t, 0.18, 2200, 600, 0.12 * v, 1.1);
    else if (k === "page") this.hiss(t, 0.12, 1800, 3200, 0.08 * v, 2);
    else if (k === "glide") {
      const dk = document.documentElement.dataset.theme === "dark";
      this.glide(t, dk ? r * 0.75 : r * 1.5, dk ? r * 1.5 : r * 0.75, 0.32, 0.2 * v);
    } else if (k === "shutter") {
      this.hiss(t, 0.035, 3000, 2600, 0.3 * v, 0.8);
      this.hiss(t + 0.07, 0.05, 2200, 1800, 0.22 * v, 0.8);
    } else if (k === "pair") {
      N(1, 0, 0.18, 0.34);
      N(1.25, 0.09, 0.2, 0.36);
      N(1.5, 0.18, 0.42, 0.4);
    } else if (k === "bell") {
      const sv = this.note.bind(this);
      sv(r * 2, t, 0.5, 0.3 * v, "glas");
      sv(r * 2, t + 0.16, 0.6, 0.22 * v, "glas");
    } else if (k === "fanfare") {
      N(1, 0, 0.16, 0.34);
      N(1.25, 0.1, 0.16, 0.36);
      N(1.5, 0.2, 0.16, 0.38);
      N(2, 0.3, 0.2, 0.42);
      N(1.5, 0.46, 0.12, 0.3);
      N(2, 0.56, 0.7, 0.46);
    } else if (k === "warn") {
      N(0.75, 0, 0.22, 0.38);
      N(0.6, 0.14, 0.36, 0.36);
    } else if (k === "err") {
      this.note(r * 0.5, t, 0.1, 0.42 * v, "holz");
      this.note(r * 0.45, t + 0.11, 0.14, 0.4 * v, "holz");
    }
  },
};
/* Der Ton darf erst nach dem ersten Antippen starten (Browser-Regel) */
addEventListener(
  "pointerdown",
  () => {
    if (SND.on()) {
      const c = SND.init();
      if (c && c.state === "suspended") c.resume().catch(() => {});
    }
  },
  {
    capture: true,
    passive: true,
  }
);
try {
  const cb = navigator.clipboard;
  if (cb && cb.writeText) {
    const w = cb.writeText.bind(cb);
    cb.writeText = (t) =>
      w(t).then((r) => {
        SND.play("copy");
        return r;
      });
  }
} catch (_) {}
document.addEventListener("visibilitychange", () => {
  if (document.hidden && SND.ctx && SND.ctx.state === "running") SND.ctx.suspend().catch(() => {});
});
function toast(text, action, label, ms) {
  if (/gelöscht/i.test(text) && action) SND.play("del");
  else if (/Artikel gelesen/.test(text)) SND.play("ping");
  else if (
    /fehlgeschlagen|nicht erreichbar|konnte nicht|nicht gespeichert|nicht gelesen werden|Fehler beim|ist zu groß|ungültig/i.test(
      text
    )
  )
    SND.play("err");
  $("toastText").textContent = text;
  const b = $("toastAct");
  b.hidden = !action;
  b.textContent = label || "Rückgängig";
  b.onclick = action
    ? async () => {
        $("toast").classList.remove("show");
        SND.play("undo");
        await action();
      }
    : null;
  $("toast").classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => $("toast").classList.remove("show"), ms || (action ? 5000 : 2000));
}
const DEV_SVG = {
  phone:
    '<path d="M8.5 2.5h7a1.8 1.8 0 0 1 1.8 1.8v15.4a1.8 1.8 0 0 1-1.8 1.8h-7a1.8 1.8 0 0 1-1.8-1.8V4.3a1.8 1.8 0 0 1 1.8-1.8Z"/><path d="M11 18.3h2"/>',
  tablet:
    '<path d="M6 2.5h12a2 2 0 0 1 2 2v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-15a2 2 0 0 1 2-2Z"/><path d="M11 18.3h2"/>',
  pc: '<path d="M5 4h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/><path d="M8.5 20h7M12 16v4"/>',
  laptop: '<path d="M5.5 5h13a1.5 1.5 0 0 1 1.5 1.5V15H4V6.5A1.5 1.5 0 0 1 5.5 5Z"/><path d="M2.5 18.5h19"/>',
};
function devIc(form, size) {
  return `<svg class="i" viewBox="0 0 24 24" style="width:${size || 20}px;height:${size || 20}px" aria-hidden="true">${DEV_SVG[form] || DEV_SVG.phone}</svg>`;
}
function devForm() {
  const ua = navigator.userAgent || "";
  if (IS_DESK) return /Mac/.test(ua) ? "laptop" : "pc";
  if (/iPad/.test(ua)) return "tablet";
  return Math.min(screen.width || 0, screen.height || 0) >= 600 ? "tablet" : "phone";
}
function devModel() {
  if (devModel.v) return devModel.v;
  const ua = navigator.userAgent || "";
  let n = "";
  try {
    const B = window.AndroidBridge;
    if (B && typeof B.deviceName === "function") n = String(B.deviceName() || "");
  } catch (_) {}
  n = n
    .replace(/[\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
  if (!n) {
    if (IS_DESK) n = /Mac/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux-PC" : "Windows-PC";
    else if (/iPhone/.test(ua)) n = "iPhone";
    else if (/iPad/.test(ua)) n = "iPad";
    else if (/Android/.test(ua)) n = devForm() === "tablet" ? "Android-Tablet" : "Android-Handy";
    else n = "Browser";
  }
  return (devModel.v = n);
}
function greetHTML() {
  const n = String((store.settings && store.settings.name) || "").trim(),
    m = devModel();
  return n ? `${escHtml(n)} <span class="gdev">· ${escHtml(m)}</span>` : escHtml(m);
}
function greeting() {
  const h = new Date().getHours(),
    n = String((store.settings && store.settings.name) || "").trim();
  const g = h < 11 ? "Guten Morgen" : h < 17 ? "Hallo" : h < 22 ? "Guten Abend" : "Gute Nacht",
    gt = typeof I18N !== "undefined" && I18N.tr ? I18N.tr(g) : g;
  return n ? (g === "Hallo" ? `${gt} ${n}` : `${gt}, ${n}`) : gt;
}
