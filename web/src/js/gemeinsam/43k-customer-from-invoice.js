/* Kunden aus alten Rechnungen übernehmen: PDF oder Foto wählen, Empfänger wird erkannt, du prüfst nur noch */
const KF = { q: [], i: 0, n: 0, d: null, img: null, busy: false, saved: 0, dup: null };

const kfNorm = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/\b(gmbh|mbh|ag|ug|kg|ohg|gbr|e\.?\s?k\.?|haftungsbeschränkt)\b/g, "")
    .replace(/[^a-z0-9äöüß]+/g, "");

/* Textstücke spaltenweise ordnen: erst die linke Hälfte (Anschriftfeld), dann die rechte */
function kfSegs(lines) {
  const L = [],
    R = [],
    pw = Math.max(1, ...(lines || []).map((l) => (l && (l.w || (l.x || 0) + (l.w || 0))) || 0)),
    put = (s, right) => {
      s = String(s || "").replace(/\s+/g, " ").trim();
      if (s) (right ? R : L).push(s);
    };
  for (const l of lines || []) {
    if (!l) continue;
    if (typeof l === "string") {
      for (const s of l.split(/\s{2,}|\t/)) put(s, false);
    } else if (l.cells) {
      for (const c of l.cells) put(c.s, c.x > (l.w || pw) * 0.5);
    } else {
      const t = l.text || l.t || "",
        right = typeof l.x === "number" && l.x > pw * 0.5;
      for (const s of t.split(/\s{2,}|\t/)) put(s, right);
    }
  }
  return L.concat(R);
}

/* Empfänger aus den Zeilen einer Rechnung lesen */
function kfParse(lines) {
  const b = rvBiz(),
    mine = [b.name, b.owner, store.settings.name].map(kfNorm).filter((x) => x.length > 2),
    myStreet = kfNorm(b.street),
    myCity = kfNorm(b.city),
    S = kfSegs(lines);
  const isMine = (s) => {
    const n = kfNorm(s);
    return (mine.some((m) => n.includes(m)) || (myStreet && n.includes(myStreet)) || (myCity && n === myCity)) && n.length > 2;
  };
  const sender = (s) => /[·|•]/.test(s) || (/,/.test(s) && /\d{5}/.test(s) && /\d/.test(s.split(",")[0]));
  const STREET = /(stra(ß|ss)e|str\.|weg|allee|platz|gasse|ring|damm|ufer|chaussee|markt|hof|pfad|steig|berg)\s*\d/i,
    CITY = /^(?:D-\s?)?\d{5}\s+[A-ZÄÖÜ][\wäöüß .()/-]{1,40}$/,
    PERS = /^(?:z\.?\s?hd\.?|zu händen|attn\.?|ansprechpartner(?:in)?:?)\s+(.{3,50})$/i,
    SAL = /^(herrn?|frau)\s+(.{3,50})$/i,
    o = {};
  for (let i = 1; i < Math.min(S.length, 60); i++) {
    if (!CITY.test(S[i]) || isMine(S[i]) || sender(S[i])) continue;
    if (!STREET.test(S[i - 1]) || isMine(S[i - 1])) continue;
    const up = [];
    for (let k = i - 2; k >= 0 && up.length < 3; k--) {
      const s = S[k];
      if (isMine(s) || sender(s) || /rechnung|invoice|seite|datum|@|www\.|tel\.?|fax/i.test(s) || s.length > 60) break;
      up.unshift(s);
    }
    if (up.length > 1 && /^(herrn?|frau|firma)$/i.test(up[0])) up.shift();
    if (!up.length) continue;
    o.city = S[i].replace(/^D-\s?/, "");
    o.street = S[i - 1];
    let pi = up.findIndex((s) => PERS.test(s) || SAL.test(s));
    if (pi === 0 && up.length > 1 && SAL.test(up[0])) {
      o.name = up[0].replace(SAL, "$2");
      o.person = up.slice(1).join(" ").replace(PERS, "$1");
    } else if (pi > 0) {
      o.name = up.slice(0, pi).join(" ");
      o.person = up[pi].replace(PERS, "$1").replace(SAL, "$2");
    } else o.name = up.join(" ");
    if (pi === 0 && !o.person) o.name = up[0].replace(PERS, "$1").replace(SAL, "$2");
    break;
  }
  if (!o.name) {
    const { d } = rchParse(S);
    if (d.kunde && !isMine(d.kunde)) Object.assign(o, { name: d.kunde }, rvAddrParse(S, d.kunde));
  }
  const all = S.join("\n"),
    myMail = String(b.email || "").toLowerCase(),
    mails = [...all.matchAll(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g)].map((m) => m[0]).filter((m) => m.toLowerCase() !== myMail);
  if (!o.email && mails.length) {
    const key = kfNorm(o.name).slice(0, 6);
    o.email = mails.find((m) => key.length > 3 && kfNorm(m).includes(key)) || (mails.length === 1 && !mine.some((x) => kfNorm(mails[0]).includes(x.slice(0, 6))) ? mails[0] : "");
  }
  const nr = all.match(/kunden[\s-]*(?:nr|nummer|no)\.?\s*:?\s*([A-Z0-9][\w\-\/]{0,15})/i);
  if (nr && /\d/.test(nr[1])) o.nr = nr[1];
  for (const k of Object.keys(o)) o[k] = String(o[k] || "").trim();
  return o;
}

function kfFind(o) {
  const n = kfNorm(o.name);
  return n.length > 2 ? rvKunden().find((c) => kfNorm(c.name) === n) || null : null;
}

function kfPick(more) {
  const inp = document.createElement("input");
  inp.type = "file";
  inp.accept = "application/pdf,image/*";
  inp.multiple = true;
  inp.onchange = () => {
    const fs = [...(inp.files || [])];
    if (!fs.length) return;
    if (more && KF.n) {
      KF.q.push(...fs);
      KF.n += fs.length;
      kfNext();
    } else kfStart(fs);
  };
  inp.click();
}
function kfStart(files) {
  Object.assign(KF, { q: [...files], i: 0, n: files.length, d: null, img: null, saved: 0 });
  kfNext();
}
async function kfNext() {
  const f = KF.q.shift();
  if (!f) return kfFinish();
  KF.i++;
  KF.busy = true;
  KF.img = null;
  KF.d = null;
  kfRender();
  let lines = [];
  try {
    if (isPdfF(f)) {
      lines = await pdfLines(await f.arrayBuffer());
      KF.img = (await stbPdf(f)).img;
    } else {
      const R = await readPages([f], (im) => {
        KF.img = im;
        kfRender();
      });
      lines = R.lines || [];
      KF.img = R.img || KF.img;
    }
  } catch (_) {}
  KF.d = kfParse(lines);
  KF.dup = kfFind(KF.d);
  if (!KF.d.nr && !KF.dup) KF.d.nr = rvKnrNext();
  KF.busy = false;
  kfRender(true);
}
function kfFinish() {
  hbSheetClose("kfBg");
  if (KF.saved) {
    toast(KF.saved === 1 ? uiText("kf_one") : uiText("kf_done", { n: String(KF.saved) }));
    SND.play("done");
  }
  KF.n = 0;
  try {
    if ($("kdBg") && !$("kdBg").hidden) kdRender(true);
    render();
  } catch (_) {}
}

function kfRender(fresh) {
  const b = hbSheet("kfBg", uiText("kf_h")),
    prog = KF.n > 1 ? `<span class="kfprog">${escHtml(uiText("kf_prog", { a: String(KF.i), b: String(KF.n) }))}</span>` : "";
  if (!KF.n) {
    b.innerHTML = `<button type="button" class="rvwrite kfpick" data-kfpick><span class="rwi">${svgIcon("camera", 24)}</span><span class="rwt"><b>${escHtml(uiText("kf_pick_t"))}</b><small>${escHtml(uiText("kf_pick_s"))}</small></span><span class="rwgo">${svgIcon("right", 18)}</span></button>`;
    return;
  }
  if (KF.busy) {
    b.innerHTML = `${prog}<div class="bsscan kfscan">${KF.img ? `<img src="${KF.img}" alt="">` : `<div class="stbpdf">${svgIcon("docout", 70)}</div>`}<i class="bsbeam"></i><span class="bscorner"></span></div><p class="bsstat"><span class="dots3"><i></i><i></i><i></i></span> ${escHtml(uiText("kf_reading"))}</p>`;
    return;
  }
  const d = KF.d || {},
    F = (id, l, v, o) => rvField(id, l, v, o),
    last = !KF.q.length;
  b.innerHTML = `${prog}<div class="kfhead">${KF.img ? `<img class="kfthumb" src="${KF.img}" alt="">` : ""}<div class="grow"><b class="rvsub">${escHtml(uiText(d.name ? "kf_found" : "kf_none_h"))}</b><small class="rvhint">${escHtml(
    KF.dup ? uiText("kf_dup", { n: KF.dup.name }) : d.name ? uiText("kf_check") : uiText("kf_none")
  )}</small></div></div>
    <div class="vacard rvgrid kff">${F("kfN", uiText("rv_k_name"), d.name, { cls: "w2" })}${F("kfNr", uiText("rv_k_nr"), KF.dup ? KF.dup.nr || d.nr : d.nr)}${F("kfP", uiText("rv_k_person"), d.person)}${F("kfS", uiText("rv_b_street"), d.street, { cls: "w2" })}${F("kfC", uiText("rv_b_city"), d.city, { cls: "w2" })}${F("kfE", uiText("rv_b_mail"), d.email, { cls: "w2", type: "email" })}</div>
    <div class="rqbtn"><button type="button" class="btn" data-kfskip>${escHtml(uiText(last ? "kf_more" : "kf_skip"))}</button><button type="button" class="btn primary" data-kfsave>${escHtml(uiText(last ? "kf_save" : "kf_next"))}</button></div>`;
  if (fresh && !reducedMotion()) stbAnim(b, ".kfhead,.kff .hlf,.rqbtn");
}

async function kfSave() {
  const v = (id) => ($(id) ? $(id).value.trim() : ""),
    o = { name: v("kfN"), nr: v("kfNr"), person: v("kfP"), street: v("kfS"), city: v("kfC"), email: v("kfE") };
  if (!o.name) {
    toast(uiText("kd_need_name"));
    $("kfN") && $("kfN").focus();
    return false;
  }
  let c = kfFind(o);
  if (o.nr && rvKnrDup(o.nr, c ? c.id : "")) o.nr = c ? c.nr || "" : rvKnrNext();
  if (c) {
    for (const k of Object.keys(o)) if (o[k] && !c[k]) c[k] = o[k];
  } else {
    c = { id: "k" + Date.now().toString(36) + KF.i, ...o, nr: o.nr || rvKnrNext(), src: "kf" };
    rvKunden().push(c);
  }
  await saveSettings();
  if (KF.d && !KF.d._saved) KF.saved++;
  if (KF.d) KF.d._saved = 1;
  SND.play("tick");
  return true;
}

document.addEventListener("click", async (e) => {
  const t = e.target;
  if (t.closest("[data-kfopen]")) {
    KF.n = 0;
    kfRender();
    return;
  }
  if (!t.closest("#kfBg")) return;
  if (t.closest("[data-kfpick]")) kfPick();
  else if (t.closest("[data-kfsave]")) {
    if (await kfSave()) kfNext();
  } else if (t.closest("[data-kfskip]")) {
    if (KF.q.length) kfNext();
    else if (await kfSave()) kfPick(true);
  }
});
