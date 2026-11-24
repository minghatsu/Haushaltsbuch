/* Dokument */
const DOCT = {
  stmt: ["Kontoauszug", "🏦"],
  inv: ["Rechnung", "📄"],
  rcpt: ["Quittung", "🧾"],
};
const CAM = {};
const ocrWait = {};
window.hbOcrDone = (id, j, e) => {
  const f = ocrWait[id];
  if (f) {
    delete ocrWait[id];
    f(j, e);
  }
};
const canNativeOcr = () => !!(window.AndroidBridge && window.AndroidBridge.ocrImage);
const canLiveCam = () =>
  canNativeOcr() &&
  !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) &&
  !(window.AndroidBridge && window.AndroidBridge.desktop);
function ocrDataUrl(url) {
  if (canNativeOcr())
    return new Promise((ok, no) => {
      const id = newId();
      ocrWait[id] = (j, e) => (e ? no(new Error(e)) : ok(JSON.parse(j || "[]")));
      window.AndroidBridge.ocrImage(id, url);
    });
  return (async () => {
    await loadTesseract();
    const r = await window.Tesseract.recognize(url, "deu");
    return ((r.data && r.data.lines) || [])
      .map((l) => ({
        t: l.text.trim(),
        x: l.bbox.x0,
        y: l.bbox.y0,
        w: l.bbox.x1 - l.bbox.x0,
        h: l.bbox.y1 - l.bbox.y0,
      }))
      .filter((l) => l.t);
  })();
}
function docClassify(lines, aspect) {
  const T = lines.map((l) => l.t).join("\n"),
    low = T.toLowerCase();
  const dateRows = lines.filter((l) => /^\s*\d{1,2}\.\d{1,2}\.(\d{2,4})?(\s|$)/.test(l.t)).length;
  const s = {
    stmt: 0,
    inv: 0,
    rcpt: 0,
  };
  if (/kontoauszug|kontostand|saldo|alter stand|neuer stand|buchungstag|umsätze|umsatzübersicht|wertstellung/.test(low))
    s.stmt += 3;
  if (dateRows >= 4) s.stmt += 2;
  if (/\bDE\d{2}(\s?\d{4}){4}/.test(T) || /\biban\b/.test(low)) {
    s.stmt += 1;
    s.inv += 1;
  }
  if (/rechnung\s*(nr|nummer|no)|rechnungsnummer|rechnungsdatum|rechnungs-?nr|invoice/.test(low)) s.inv += 3;
  else if (/\brechnung\b/.test(low)) s.inv += 1;
  if (
    /fällig|faellig|zahlbar bis|zahlungsziel|leistungszeitraum|kundennummer|kunden-?nr|ust-?id|steuernummer|bitte überweisen/.test(
      low
    )
  )
    s.inv += 2;
  if (
    /\bsumme\b|zu zahlen|\bbar\b|ec-?karte|girocard|rückgeld|kartenzahlung|beleg-?nr|\bkasse\b|\bbon\b|danke für ihren einkauf|vielen dank/.test(
      low
    )
  )
    s.rcpt += 2;
  if (aspect > 1.85) s.rcpt += 3;
  else if (aspect > 1.25 && aspect < 1.6) {
    s.stmt += 1;
    s.inv += 1;
  }
  const best = Object.entries(s).sort((a, b) => b[1] - a[1])[0];
  return best[1] >= 2
    ? {
        type: best[0],
        rows: dateRows,
        score: s,
      }
    : null;
}
function liveQuad(c) {
  const w = c.width,
    h = c.height,
    d = c
      .getContext("2d", {
        willReadFrequently: true,
      })
      .getImageData(0, 0, w, h).data,
    N = w * h,
    g = new Uint8Array(N),
    hist = new Array(256).fill(0);
  for (let i = 0, j = 0; i < N; i++, j += 4) {
    const v = (0.299 * d[j] + 0.587 * d[j + 1] + 0.114 * d[j + 2]) | 0;
    g[i] = v;
    hist[v]++;
  }
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sB = 0,
    wB = 0,
    best = 0,
    thr = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (!wB) continue;
    const wF = N - wB;
    if (!wF) break;
    sB += t * hist[t];
    const mB = sB / wB,
      mF = (sum - sB) / wF,
      b = wB * wF * (mB - mF) * (mB - mF);
    if (b > best) {
      best = b;
      thr = t;
    }
  }
  const lab = new Uint8Array(N);
  let bigPix = null,
    bigN = 0;
  for (let i = 0; i < N; i++) {
    if (lab[i] || g[i] <= thr) continue;
    const st = [i],
      pix = [];
    lab[i] = 1;
    while (st.length) {
      const p = st.pop();
      pix.push(p);
      const x = p % w,
        y = (p / w) | 0;
      if (x > 0 && !lab[p - 1] && g[p - 1] > thr) {
        lab[p - 1] = 1;
        st.push(p - 1);
      }
      if (x < w - 1 && !lab[p + 1] && g[p + 1] > thr) {
        lab[p + 1] = 1;
        st.push(p + 1);
      }
      if (y > 0 && !lab[p - w] && g[p - w] > thr) {
        lab[p - w] = 1;
        st.push(p - w);
      }
      if (y < h - 1 && !lab[p + w] && g[p + w] > thr) {
        lab[p + w] = 1;
        st.push(p + w);
      }
    }
    if (pix.length > bigN) {
      bigN = pix.length;
      bigPix = pix;
    }
  }
  const area = bigN / N;
  if (!bigPix || area < 0.07 || area > 0.94) return null;
  let tl = [1e9, 0, 0],
    br = [-1e9, 0, 0],
    tr = [-1e9, 0, 0],
    bl = [1e9, 0, 0],
    edge = 0;
  for (const p of bigPix) {
    const x = p % w,
      y = (p / w) | 0;
    if (x + y < tl[0]) tl = [x + y, x, y];
    if (x + y > br[0]) br = [x + y, x, y];
    if (x - y > tr[0]) tr = [x - y, x, y];
    if (x - y < bl[0]) bl = [x - y, x, y];
    if (x === 0 || y === 0 || x === w - 1 || y === h - 1) edge++;
  }
  if (edge / (2 * (w + h)) > 0.35) return null;
  return [
    [tl[1], tl[2]],
    [tr[1], tr[2]],
    [br[1], br[2]],
    [bl[1], bl[2]],
  ];
}
const qDist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const qAspect = (q) => {
  const W = Math.max(qDist(q[0], q[1]), qDist(q[3], q[2])),
    H = Math.max(qDist(q[0], q[3]), qDist(q[1], q[2]));
  return W ? H / W : 1;
};

/* Kamera */
function camEl() {
  let el = $("camLive");
  if (el) return el;
  el = document.createElement("div");
  el.id = "camLive";
  el.className = "camlive";
  el.hidden = true;
  el.innerHTML = `<video id="camVid" playsinline muted autoplay></video><canvas id="camOv"></canvas>
    <button class="camx" data-cam="close" aria-label="Schließen"><svg class="i" viewBox="0 0 24 24" style="width:18px;height:18px"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
    <div class="camtop"><div class="camchip" id="camChip">Halte ein Dokument ins Bild</div>
      <div class="camtypes">${Object.entries(DOCT)
        .map(([k, [n]]) => `<button data-camtype="${k}">${n}</button>`)
        .join("")}</div></div>
    <div class="cambot"><div class="camhint" id="camHint">Papier auf einen dunklen Untergrund legen</div>
      <div class="camrow"><button class="camside" data-cam="gallery" aria-label="Aus der Galerie">${svgIcon("receipt", 22)}</button><button class="camshut" data-cam="shoot" aria-label="Foto aufnehmen"></button><span class="camside" style="visibility:hidden"></span></div></div>`;
  document.body.appendChild(el);
  return el;
}
async function smartScan(opts) {
  opts = opts || {};
  CAM.opts = opts;
  CAM.forced = opts.type || null;
  CAM.type = null;
  CAM.last = null;
  CAM.info = "";
  if (!canLiveCam() || (NATIVE_SCAN && !window.AndroidBridge.desktop)) return smartScanFallback(opts);
  const el = camEl();
  try {
    CAM.stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: {
          ideal: "environment",
        },
        width: {
          ideal: 2560,
        },
        height: {
          ideal: 1440,
        },
      },
      audio: false,
    });
  } catch (e) {
    toast("Kamera nicht erlaubt – du kannst sie in den Android-Einstellungen freigeben");
    return smartScanFallback(opts);
  }
  const v = $("camVid");
  v.srcObject = CAM.stream;
  el.hidden = false;
  document.body.classList.add("locked");
  try {
    await v.play();
  } catch (e) {}
  CAM.on = true;
  CAM.quad = null;
  CAM.miss = 0;
  CAM.busy = false;
  CAM.lastOcr = 0;
  CAM.still = 0;
  camChip();
  camLoop();
}
function camStop() {
  CAM.on = false;
  if (CAM.stream) CAM.stream.getTracks().forEach((t) => t.stop());
  CAM.stream = null;
  const el = $("camLive");
  if (el) el.hidden = true;
  document.body.classList.remove("locked");
}
function camMap() {
  const v = $("camVid"),
    W = v.clientWidth,
    H = v.clientHeight,
    vw = v.videoWidth || 1,
    vh = v.videoHeight || 1,
    s = Math.max(W / vw, H / vh);
  return {
    s,
    ox: (W - vw * s) / 2,
    oy: (H - vh * s) / 2,
    W,
    H,
  };
}
function camLoop() {
  if (!CAM.on) return;
  const v = $("camVid");
  if (v.videoWidth) {
    const sm = CAM.sm || (CAM.sm = document.createElement("canvas")),
      k = 160 / Math.max(v.videoWidth, v.videoHeight);
    sm.width = Math.round(v.videoWidth * k);
    sm.height = Math.round(v.videoHeight * k);
    sm.getContext("2d").drawImage(v, 0, 0, sm.width, sm.height);
    const q = liveQuad(sm),
      f = 1 / k;
    if (q) {
      const Q = q.map(([x, y]) => [x * f, y * f]);
      const moved = CAM.quad
        ? Math.max(...Q.map((p, i) => qDist(p, CAM.quad[i]))) / Math.max(v.videoWidth, v.videoHeight)
        : 1;
      CAM.quad = CAM.quad ? CAM.quad.map((p, i) => [p[0] * 0.55 + Q[i][0] * 0.45, p[1] * 0.55 + Q[i][1] * 0.45]) : Q;
      CAM.miss = 0;
      CAM.still = moved < 0.02 ? CAM.still + 1 : 0;
    } else if (++CAM.miss > 8) {
      CAM.quad = null;
      CAM.still = 0;
    }
    camDraw();
    if (CAM.quad && !CAM.busy && Date.now() - CAM.lastOcr > 1300) camRead();
  }
  setTimeout(() => requestAnimationFrame(camLoop), 90);
}
function camDraw() {
  const c = $("camOv"),
    m = camMap();
  if (c.width !== m.W) c.width = m.W;
  if (c.height !== m.H) c.height = m.H;
  const x = c.getContext("2d");
  x.clearRect(0, 0, c.width, c.height);
  if (!CAM.quad) {
    $("camHint").textContent = "Papier auf einen dunklen Untergrund legen";
    return;
  }
  const P = CAM.quad.map(([a, b]) => [a * m.s + m.ox, b * m.s + m.oy]);
  x.save();
  x.fillStyle = "rgba(0,0,0,.35)";
  x.beginPath();
  x.rect(0, 0, c.width, c.height);
  x.moveTo(...P[0]);
  for (const p of [P[3], P[2], P[1]]) x.lineTo(...p);
  x.closePath();
  x.fill("evenodd");
  x.strokeStyle = "#6ee7b7";
  x.lineWidth = 4;
  x.shadowColor = "#6ee7b7";
  x.shadowBlur = 14;
  x.lineJoin = "round";
  x.beginPath();
  x.moveTo(...P[0]);
  for (const p of [P[1], P[2], P[3]]) x.lineTo(...p);
  x.closePath();
  x.stroke();
  x.restore();
  $("camHint").textContent = CAM.still > 4 ? "Ränder gefunden – jetzt auslösen" : "Halt still …";
}
async function camRead() {
  CAM.busy = true;
  CAM.lastOcr = Date.now();
  try {
    const v = $("camVid"),
      q = CAM.quad;
    const xs = q.map((p) => p[0]),
      ys = q.map((p) => p[1]);
    const x0 = Math.max(0, Math.min(...xs)),
      y0 = Math.max(0, Math.min(...ys)),
      w = Math.min(v.videoWidth, Math.max(...xs)) - x0,
      h = Math.min(v.videoHeight, Math.max(...ys)) - y0;
    const k = Math.min(1, 1100 / Math.max(w, h)),
      c = document.createElement("canvas");
    c.width = Math.round(w * k);
    c.height = Math.round(h * k);
    c.getContext("2d").drawImage(v, x0, y0, w, h, 0, 0, c.width, c.height);
    const lines = await ocrDataUrl(c.toDataURL("image/jpeg", 0.7)),
      r = docClassify(lines, qAspect(q));
    if (r) {
      if (r.type === CAM.last || !CAM.type) CAM.type = r.type;
      CAM.last = r.type;
      CAM.info =
        r.type === "stmt" && r.rows
          ? `${r.rows} Buchungen sichtbar`
          : r.type === "rcpt"
            ? "Kassenbon"
            : /fällig|zahlbar bis|zahlungsziel/i.test(lines.map((l) => l.t).join(" "))
              ? "mit Fälligkeit"
              : "";
    }
    camChip();
  } catch (e) {
  } finally {
    CAM.busy = false;
  }
}
function camChip() {
  const t = CAM.forced || CAM.type,
    ch = $("camChip");
  if (!ch) return;
  ch.innerHTML = t
    ? `<span>${DOCT[t][1]}</span> <b>${escHtml(DOCT[t][0])} ${CAM.forced ? "gewählt" : "erkannt"}</b>${CAM.info && !CAM.forced ? ` <small>${escHtml(CAM.info)}</small>` : ""}`
    : CAM.quad
      ? `<b>Lese …</b>`
      : `<b>Halte ein Dokument ins Bild</b>`;
  document
    .querySelectorAll("#camLive [data-camtype]")
    .forEach((b) => b.classList.toggle("on", b.dataset.camtype === t));
}
async function camShoot() {
  const v = $("camVid");
  if (!v.videoWidth) return;
  SND.play("shutter");
  const c = document.createElement("canvas");
  c.width = v.videoWidth;
  c.height = v.videoHeight;
  c.getContext("2d").drawImage(v, 0, 0);
  const q = CAM.quad ? CAM.quad.map((p) => [...p]) : null,
    type = CAM.forced || CAM.type;
  camStop();
  scanWorking(true);
  try {
    const im = await loadImg(c.toDataURL("image/jpeg", 0.92));
    let out = q ? docWarp(im, q, 2000) : c;
    out = docEnhance(out, 25, 25);
    const img = out.toDataURL("image/jpeg", 0.85),
      lines = await ocrDataUrl(img);
    scanWorking(false);
    const r = docClassify(lines, out.height / out.width);
    camReview({
      type: type || (r && r.type) || "rcpt",
      img,
      lines,
      W: out.width,
      H: out.height,
    });
  } catch (e) {
    scanWorking(false);
    toast(e.message || "Foto konnte nicht gelesen werden");
  }
}
function scanWorking(on) {
  let el = $("camWork");
  if (!el) {
    el = document.createElement("div");
    el.id = "camWork";
    el.className = "camwork";
    el.innerHTML = `<div class="camspin"></div><b>Wird gelesen …</b>`;
    document.body.appendChild(el);
  }
  el.hidden = !on;
}
async function smartScanFallback(opts) {
  try {
    let img = null,
      lines = null,
      noBoxes = false;
    if (NATIVE_SCAN && !window.AndroidBridge.desktop) {
      const res = await scanNative("camera");
      if (!res) return;
      lines = Array.isArray(res) ? res : res.lines || [];
      img = Array.isArray(res) ? null : res.img;
      noBoxes = true;
      if (img) {
        const rv = await docReview(img, {
          lines,
        });
        if (!rv) return;
        if (rv.action === "retake") return smartScanFallback(opts);
        img = rv.img;
        if (canNativeOcr()) {
          scanWorking(true);
          try {
            const l2 = await ocrDataUrl(img);
            if (l2 && l2.length) {
              lines = l2;
              noBoxes = false;
            }
          } catch (e) {}
          scanWorking(false);
        }
      }
    } else {
      const f = await new Promise((r) => {
        const inp = $("scanFile");
        inp.value = "";
        inp.onchange = () => r(inp.files[0] || null);
        inp.click();
      });
      if (!f) return;
      try {
        img = await shrinkImage(f);
      } catch (e) {}
      if (img) {
        const rv = await docReview(img, {});
        if (!rv) return;
        if (rv.action === "retake") return smartScanFallback(opts);
        img = rv.img;
      }
      scanWorking(true);
      lines = await ocrDataUrl(img);
      scanWorking(false);
    }
    if (!img) {
      toast("Das Foto konnte nicht übernommen werden");
      return;
    }
    const im = await loadImg(img),
      r = docClassify(lines || [], im.naturalHeight / im.naturalWidth);
    camReview({
      type: opts.type || (r && r.type) || "rcpt",
      img,
      lines: lines || [],
      W: im.naturalWidth,
      H: im.naturalHeight,
      noBoxes,
    });
  } catch (e) {
    scanWorking(false);
    toast(e.message || "Foto konnte nicht gelesen werden");
  }
}
async function camGallery() {
  camStop();
  const f = await new Promise((r) => {
    const inp = $("scanFile");
    inp.value = "";
    inp.onchange = () => r(inp.files[0] || null);
    inp.click();
  });
  if (!f) return;
  try {
    let img = await shrinkImage(f);
    const rv = await docReview(img, {});
    if (!rv) return;
    img = rv.img;
    scanWorking(true);
    const lines = await ocrDataUrl(img);
    scanWorking(false);
    const im = await loadImg(img),
      r = docClassify(lines, im.naturalHeight / im.naturalWidth);
    camReview({
      type: CAM.forced || (r && r.type) || "rcpt",
      img,
      lines,
      W: im.naturalWidth,
      H: im.naturalHeight,
    });
  } catch (e) {
    scanWorking(false);
    toast(e.message || "Foto konnte nicht gelesen werden");
  }
}
