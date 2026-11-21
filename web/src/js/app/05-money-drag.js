/* Umbuchen mit Geld: Beim Ziehen fliegen Scheine mit, unterwegs fallen ein paar Münzen heraus.
   Handy/Tablet (05-account-stack.js) und PC (pc/12-drag-transfer.js) nutzen dasselbe Stück. */
const MVFX_IMG = {
  bill: "data:image/webp;base64,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",
  coin: "data:image/webp;base64,UklGRrAEAABXRUJQVlA4WAoAAAAQAAAALwAAHgAAQUxQSHoBAAABkGvb1rE9+32er4qdyk4qO61tu7LV2bbt5BbsG7BZ2c5zztnF5ydqI2ICkN35BADKNeo4Zu6yjTt2bFo+b2ynxuUBIEk55O08gGr9Vp15+Jk5f3l0ds3AGgC8yy1xQLXJpz8x3VRVRERVjelfzk2rAbgkBw+02PuWpAZRY86mIkLy/YHWgM/iUW1vIEWMBTYRUg/Vgs/gMPQFGYxFNTG+Hg0HwGMJGRihkCvhE4/FFGWUGrgKHt0ZjJFaYH+UuG7KaNXule5FY8TGwSsoMYlt2hEZD/9/7YztyCqLyzb3pcWkHFbylmk8ag/Log+DxWKBQ+CxksHisMAN8InHKlJiEHI9fAI4jHtLEyuOifHDeLgEADzqHCMpYoUyFZKnGsAhswfaHflIUkQtH1MRkp9PdAA8sjsH1J51+TvTTVUyqhrTf1ydUxdwDjk7D6DOsM1Xnv1gzj+fX9s6sj4A75G3SyUAUKVJrwnz1+0+fGTP+gUTezepivSUQ3ZWUDggEAMAAJAQAJ0BKjAAHwA+QRqKQ6KhoRqkACgEBLYATplCPa/Vfxg5Z/dRsM6VGX/Fu8A8wH7EeuL6EPOZ6gDnxvZE/bb0osBezp6Gpgn7ubgnIH+Y/KPmM0mUzD/l+cv549gn9Rf9t+a3wgdCSSLk9/t0CD1OfAvcvfY9Go3Cmib78/5PzOQy4Ei2R8S/C51yAAD9IMKsj90qIOb08TQOFYd/4xI9qCzUj/+DRf/EmMQ1vw+5ZtxwRT29IDiubhsGUSMaGJXPdH4ppHOULx8ZDb4KaXbhiYr6a9dZjUen+2oDkUtijjFQRru4J85ezUMyESbo//3ebebCc8zNpOOly9iY/4YV9clz+r/iufwewjh89N9vJwZT7//vk/t/9dKZRMTb/Exxw7S/1Qg3VNMqqpe/EfXtnG6bvK+QRCOLOY7Pm9UJZ+mbJ1/8F9x0m5VFr20megTwK7GQ7+/R4wcwALxmP29/OfrsNW1hRd9xjEq5cQIQd8CPy3/1Hvwthjj8w8OBur1y6n5vkX+q8cJ7fSo+Onk9ft7or9stTmWzs6Wk1RjSPU6BjR1XrAUFfYR6r5edUUWPnMBdsy7SwmTJxiG4O6ZdvJb4wNx4m3bmAqs/8R5EExPPsXiT6o3DHX6Fzpv+JVaderKIcDBRsoZyp8FVwfUuXJng7g4w3GEqxSoBbJqqCh3lMHODF4O9Laof+UoXF+B8rX588VndFYrlj95Sw0xQzt8/4xAruAFZlaMoEcLIZWUQDjgKpPYbLbmNuFMXinYd8IUFrVYFB1tW8ax5A18bAIhTsqZtWhlxkyqIWr/lkrVNTmOzSH9H/4FUlR/rcQIfc55pHb5C68Rg5gCNnpYvaULEhR2lrVOmrrXl23uP/tpsZRkcjnMb8cdmfuKJsMcfs47aSmIRKQuuw4Vv8ShFMCUy0mbQAwIMVKCe9Zmwl/yq5Xnv7ezSJeQVNHrT4QNtxTAirUUmQu5RmMlbkTHRJzf2GpzCYYNH0k3P0f3JTUBgvLNG1kim5VAHVzazcjJWYi1taSBWTX4tniT5AAA=",
};
const MVFX = {
  d: null,
  on() {
    return store.settings.moneyFx !== false && !reducedMotion();
  },
  /* src: gegriffene Karte · sel: alle Karten, die mitgehen · touch: Scheine über dem Finger zeigen */
  start(src, sel, x, y, touch) {
    this.stop();
    const layer = document.createElement("div");
    layer.className = "mvfx";
    layer.setAttribute("aria-hidden", "true");
    const amt = src.querySelector(".mvv, b") || src,
      ar = amt.getBoundingClientRect(),
      o = { x: ar.left + ar.width / 2, y: ar.top + ar.height / 2 },
      lift = touch ? 48 : 20;
    const bills = [46, 46, 50].map((w, i) => {
      const el = this.img(layer, MVFX_IMG.bill, w);
      return { el, w, h: (w * 102) / 132, x: x + this.OFF[i][0], y: y + this.OFF[i][1] - lift, cx: o.x, cy: o.y };
    });
    document.body.appendChild(layer);
    const now = performance.now();
    this.d = {
      layer,
      src,
      sel,
      o,
      lift,
      bills,
      coins: [],
      tiles: new Map(),
      p: { x, y },
      l: { x, y },
      vx: 0,
      vy: 0,
      dist: 0,
      next: 70,
      n: 0,
      act: 0,
      end: null,
      t0: now,
      last: now,
    };
    SND.play("bills");
    this.d.raf = requestAnimationFrame((t) => this.frame(t));
  },
  move(x, y) {
    if (this.d) this.d.p = { x, y };
  },
  /* tgt: Karte, auf der losgelassen wurde – ohne Ziel fliegen die Scheine zurück */
  drop(tgt) {
    const d = this.d;
    if (!d || d.end) return;
    const t = (performance.now() - d.t0) / 1000;
    let z = d.o;
    if (tgt) {
      const r = tgt.getBoundingClientRect();
      z = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      SND.play("cash");
    }
    d.end = { t, z, tgt: tgt || null };
    d.bills.forEach((b) => {
      b.fx = b.cx;
      b.fy = b.cy;
    });
  },
  stop() {
    const d = this.d;
    if (!d) return;
    cancelAnimationFrame(d.raf);
    d.tiles.forEach((s, el) => {
      el.style.translate = el.style.rotate = el.style.scale = "";
    });
    d.layer.remove();
    this.d = null;
  },
  OFF: [
    [-11, 9],
    [10, 6],
    [0, -11],
  ],
  ROT: [-24, 16, -6],
  LAG: [9, 12, 17],
  img(layer, src, w) {
    const el = new Image();
    el.src = src;
    el.width = w;
    el.alt = "";
    el.draggable = false;
    layer.appendChild(el);
    return el;
  },
  /* Karten in Ruhelage (ohne die eigene Verschiebung), damit Münzen daran abprallen können */
  rects(d) {
    const out = [];
    document.querySelectorAll(d.sel).forEach((el) => {
      let s = d.tiles.get(el);
      if (!s) {
        s = { mx: 0, my: 0, hits: [], cr: Math.min(parseFloat(getComputedStyle(el).borderRadius) || 0, 26) };
        d.tiles.set(el, s);
      }
      const r = el.getBoundingClientRect();
      s.x0 = r.left - s.mx;
      s.y0 = r.top - s.my;
      s.x1 = r.right - s.mx;
      s.y1 = r.bottom - s.my;
      s.el = el;
      out.push(s);
    });
    return out;
  },
  coin(d, t) {
    const w = 14 + (d.n % 4),
      b = d.bills[2],
      dir = d.n % 2 ? 1 : -1;
    d.coins.push({
      el: this.img(d.layer, MVFX_IMG.coin, w),
      w,
      r: w * 0.42,
      x: b.cx,
      y: b.cy + 4,
      vx: dir * (30 + Math.random() * 50) + d.vx * 0.15,
      vy: -150,
      t,
      n: d.n,
      nb: 0,
      maxB: 1 + (d.n % 2),
      free: null,
    });
    d.n++;
    d.next = 85 + Math.random() * 70;
    d.dist = 0;
  },
  /* Münze: freier Fall, höchstens zwei Abpraller an Karten, dann fällt sie aus dem Bild */
  fall(c, tiles, dt, t) {
    const sub = Math.max(1, Math.ceil(dt * 480)),
      h = dt / sub;
    if (!c.free) c.free = new Set();
    for (let i = 0; i < sub; i++) {
      c.vy += 1150 * h;
      c.x += c.vx * h;
      c.y += c.vy * h;
      if (c.nb >= c.maxB) continue;
      for (const s of tiles) {
        const cr = Math.min(s.cr, (s.y1 - s.y0) / 2),
          qx = Math.max(s.x0 + cr, Math.min(c.x, s.x1 - cr)),
          qy = Math.max(s.y0 + cr, Math.min(c.y, s.y1 - cr)),
          R = c.r + cr;
        let dx = c.x - qx,
          dy = c.y - qy,
          ds = Math.hypot(dx, dy);
        /* Karten, in denen die Münze startet, zählen erst, wenn sie einmal draußen war */
        if (!c.free.has(s)) {
          if (ds > R + 1) c.free.add(s);
          continue;
        }
        if (ds >= R || c.nb >= c.maxB) continue;
        if (ds < 1e-6) {
          dx = 0;
          dy = -1;
          ds = 1;
        }
        const nx = dx / ds,
          ny = dy / ds;
        let vn = c.vx * nx + c.vy * ny,
          vt = -c.vx * ny + c.vy * nx;
        if (vn >= 0) continue;
        c.x = qx + nx * R;
        c.y = qy + ny * R;
        s.hits.push({ t, s: Math.min(1, -vn / 420) });
        c.nb++;
        SND.play("coin");
        vn = Math.max(-vn * 0.55, 140);
        vt = vt * 0.9 + Math.sign(vt || c.vx || 1) * 40;
        c.vx = vn * nx - vt * ny;
        c.vy = vn * ny + vt * nx;
      }
    }
  },
  frame(now) {
    const d = this.d;
    if (!d) return;
    const cl = (v) => Math.max(0, Math.min(1, v)),
      eo = (v) => 1 - Math.pow(1 - cl(v), 3),
      eio = (v) => ((v = cl(v)) < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2),
      mix = (a, b, k) => a + (b - a) * k,
      dt = Math.min(0.034, Math.max(0.001, (now - d.last) / 1000)),
      t = (now - d.t0) / 1000,
      e = d.end;
    d.last = now;
    /* Leitpunkt läuft dem Finger weich hinterher */
    const k = 1 - Math.exp(-dt * 18),
      lx = d.l.x,
      ly = d.l.y;
    d.l.x += (d.p.x - lx) * k;
    d.l.y += (d.p.y - ly) * k;
    d.vx += ((d.l.x - lx) / dt - d.vx) * 0.25;
    d.vy += ((d.l.y - ly) / dt - d.vy) * 0.25;
    const mv = e ? 0 : cl(Math.hypot(d.vx, d.vy) / 520);
    /* Scheine */
    d.bills.forEach((b, i) => {
      if (!e) {
        const f = 1 - Math.exp(-dt * this.LAG[i]);
        b.x += (d.l.x + this.OFF[i][0] - b.x) * f;
        b.y += (d.l.y + this.OFF[i][1] - d.lift - b.y) * f;
      }
      const a = t - (2 - i) * 0.08,
        em = eio(a / 0.38),
        fl = Math.sin(t * 9 + i * 2.1) * 9 * (0.4 + mv) + Math.sin(t * 5.3 + i) * 4,
        lean = Math.max(-28, Math.min(28, d.vx * 0.035));
      let x = mix(d.o.x, b.x, em),
        y = mix(d.o.y, b.y, em) - Math.sin(em * Math.PI) * 9,
        sc = mix(0.28, 1, em),
        op = cl(a / 0.12);
      b.cx = x;
      b.cy = y;
      if (e) {
        const dv = (t - e.t - (e.tgt ? i * 0.12 : 0)) / 0.24,
          dive = cl(dv);
        x = mix(b.fx, e.z.x, eio(dive));
        y = mix(b.fy, e.z.y, eio(dive)) - (dv > 0 && dv < 1 ? Math.sin(dive * Math.PI) * 14 : 0);
        sc *= 1 - 0.72 * eo(dive);
        op = dv >= 1 ? 0 : op * (1 - cl((dive - 0.7) / 0.3));
      }
      b.el.style.opacity = op;
      b.el.style.transform = `translate(${x - b.w / 2}px,${y - b.h / 2}px) rotate(${(this.ROT[i] + lean + fl) * em}deg) scale(${sc * (1 - 0.22 * mv * (0.5 + 0.5 * Math.sin(t * 11 + i * 1.7)))},${sc})`;
    });
    /* Münzen */
    const tiles = this.rects(d);
    if (!e && t > 0.5) {
      d.dist += Math.hypot(d.l.x - lx, d.l.y - ly);
      if (d.dist > d.next && d.coins.length < 7) this.coin(d, t);
    }
    d.coins = d.coins.filter((c) => {
      this.fall(c, tiles, dt, t);
      if (c.y > innerHeight + 40) {
        c.el.remove();
        return false;
      }
      const ph = (t - c.t) * 13 + c.n * 1.3;
      c.el.style.opacity = 1;
      c.el.style.transform = `translate(${c.x - c.w / 2}px,${c.y - c.w * 0.32}px) rotate(${Math.sin(ph * 0.6) * 22}deg) scale(1,${0.45 + 0.55 * Math.abs(Math.cos(ph))})`;
      return true;
    });
    /* Karten gehen mit dem Geld mit, kippen leicht und zucken, wenn eine Münze sie trifft */
    d.act += ((e ? 0 : cl((t - 0.2) / 0.3)) - d.act) * (1 - Math.exp(-dt * 9));
    tiles.forEach((s) => {
      const cx = (s.x0 + s.x1) / 2,
        cy = (s.y0 + s.y1) / 2,
        wd = s.x1 - s.x0,
        dx = d.l.x - cx,
        dy = d.l.y - cy,
        ds = Math.hypot(dx, dy),
        sig = Math.max(170, Math.min(wd, 330)),
        w = d.act * Math.exp((-ds * ds) / (sig * sig));
      let mx = (dx / (ds + 60)) * 10 * w,
        my = (dy / (ds + 60)) * 10 * w,
        sx = 1,
        sy = 1;
      s.hits = s.hits.filter((h) => t - h.t < 0.28);
      s.hits.forEach((h) => {
        const a = (t - h.t) / 0.28;
        my += Math.sin(a * Math.PI) * (1 - a) * h.s * 4;
      });
      if (e && e.tgt) {
        if (s.el === e.tgt)
          [0, 0.12, 0.24].forEach((dl) => {
            const a = (t - e.t - dl - 0.16) / 0.28;
            if (a > 0 && a < 1) {
              const bump = Math.sin(a * Math.PI) * 0.06 * (1 - a * 0.3);
              sx += bump;
              sy -= bump * 0.6;
            }
          });
        else {
          const rx = cx - e.z.x,
            ry = cy - e.z.y,
            rd = Math.hypot(rx, ry) || 1,
            a = (t - e.t - 0.22 - rd / 420) / 0.5;
          if (a > 0 && a < 1) {
            const wv = Math.sin(a * Math.PI * 2) * (1 - a) * 7;
            mx += (rx / rd) * wv;
            my += (ry / rd) * wv;
          }
        }
      }
      s.mx = mx;
      s.my = my;
      s.el.style.translate = `${mx.toFixed(2)}px ${my.toFixed(2)}px`;
      s.el.style.rotate = `${((dx / (ds + 60)) * 2.4 * w * Math.min(1, 200 / wd)).toFixed(2)}deg`;
      s.el.style.scale = sx === 1 ? "" : `${sx.toFixed(3)} ${sy.toFixed(3)}`;
    });
    if (e && t - e.t > 1.4 && !d.coins.length) this.stop();
    else d.raf = requestAnimationFrame((n) => this.frame(n));
  },
};
document.addEventListener("change", (e) => {
  if (e.target.id !== "sMoneyFx") return;
  store.settings.moneyFx = e.target.checked;
  saveSettings();
  if (e.target.checked) SND.play("cash");
});
