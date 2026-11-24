/* Viele alte Rechnungen auf einmal hochladen: jedes PDF wird eine eigene Rechnung, landet über sein
   Rechnungsdatum im richtigen Jahr, und eine Prüfliste zeigt, was sicher erkannt ist und was nicht. */
function rchBatchMiss(it) {
  const d = it.d,
    m = [];
  if (!d.kunde) m.push(uiText("rch_kunde"));
  if (!(d.amt > 0)) m.push(uiText("rch_amt"));
  if (!d.date) m.push(uiText("rch_date"));
  return m;
}
const rchBatchDup = (d) =>
  !!d.nr && rchList().some((i) => String(i.nr || "").toLowerCase() === String(d.nr).toLowerCase());

async function rchBatch(files) {
  const fs = [...files].slice(0, 60);
  RCHU.edit = null;
  RCHU.batch = { items: [], n: fs.length, i: 0, busy: true, paid: true, open: null };
  rchOpen2();
  for (const f of fs) {
    if (!RCHU.batch) return;
    RCHU.batch.i++;
    rchOpen2();
    let lines = [],
      img = null;
    try {
      const R = await readPages([f]);
      lines = R.lines || [];
      img = R.img || null;
    } catch (_) {}
    const { d } = rchParse(lines);
    /* Kunde lieber aus dem Anschriftfeld lesen – das klappt bei den meisten Vorlagen zuverlässiger */
    try {
      const k = kfParse(isPdfF(f) ? await pdfLines(await f.arrayBuffer()) : lines);
      if (k.name) d.kunde = k.name;
    } catch (_) {}
    if (d.date && !d.due) d.due = addDays(d.date, d.z || 14);
    const it = { name: f.name, img, d };
    it.dup = rchBatchDup(d);
    if (!RCHU.batch) return;
    RCHU.batch.items.push(it);
  }
  if (!RCHU.batch) return;
  RCHU.batch.busy = false;
  rchOpen2();
}

function rchBatchHtml() {
  const B = RCHU.batch,
    E = (s) => escHtml(s);
  if (B.busy)
    return `<div class="bsscan"><div class="stbpdf">${svgIcon("docout", 70)}</div><i class="bsbeam"></i><span class="bscorner"></span></div><p class="bsstat"><span class="dots3"><i></i><i></i><i></i></span> ${E(
      uiText("rb_read", { i: String(B.i), n: String(B.n) })
    )}</p>`;
  const ys = B.items.map((it) => String(it.d.date || "").slice(0, 4)).filter(Boolean).sort(),
    take = B.items.filter((it) => !it.dup && !it.skip && !rchBatchMiss(it).length).length;
  const range = !ys.length ? "" : ys[0] === ys[ys.length - 1] ? uiText("rb_year1", { a: ys[0] }) : uiText("rb_years", { a: ys[0], b: ys[ys.length - 1] });
  const row = (it, k) => {
    const miss = rchBatchMiss(it),
      d = it.d,
      st = it.dup ? "dup" : miss.length ? "q" : "ok",
      sub = it.dup
        ? uiText("rb_dup")
        : miss.length
          ? uiText("rb_miss", { w: miss.join(", ") })
          : [d.nr ? "#" + d.nr : "", fxDate(d.date, { day: "numeric", month: "short", year: "numeric" })].filter(Boolean).join(" · ");
    const ic = st === "ok" ? svgIcon("check", 16) : st === "dup" ? svgIcon("copy", 16) : svgIcon("alert", 16);
    const open = B.open === k;
    return `<div class="rbrow ${st}${open ? " open" : ""}"><button type="button" class="rbhd" data-rbopen="${k}" aria-expanded="${open}"><span class="rbst">${ic}</span><span class="grow"><b>${E(d.kunde || it.name)}</b><small>${E(sub)}</small></span><b class="amt">${d.amt > 0 ? E(fmtEur(d.amt)) : "–"}</b></button>${
      open
        ? `<div class="rbed"><label class="hlf"><span>${E(uiText("rch_kunde"))}</span><input class="in" id="rbK" value="${E(d.kunde || "")}" autocomplete="off"></label><div class="hlr"><label class="hlf grow"><span>${E(uiText("rch_amt"))}</span><input class="in" id="rbA" inputmode="decimal" value="${d.amt > 0 ? E(numStr(d.amt)) : ""}"></label><label class="hlf grow"><span>${E(uiText("rch_date"))}</span><input class="in" type="date" id="rbD" value="${E(d.date || "")}"></label></div><label class="hlf"><span>${E(uiText("rch_nr"))}</span><input class="in" id="rbN" value="${E(d.nr || "")}" autocomplete="off"></label><div class="rbedb"><button type="button" class="btn" data-rbskip="${k}">${E(uiText(it.skip ? "rb_unskip" : "rb_skip"))}</button><button type="button" class="btn primary" data-rbok="${k}">${E(uiText("rb_ok"))}</button></div></div>`
        : ""
    }</div>`;
  };
  return `<div class="rbsum"><small>${E(range)}</small><b>${E(uiText(B.items.length === 1 ? "rb_h1" : "rb_h", { n: String(B.items.length) }))}</b></div>
    <div class="switch rbpaid"><label for="rbPaid"><b>${E(uiText("rb_paid"))}</b><small>${E(uiText("rb_paid_s"))}</small></label><input type="checkbox" id="rbPaid" ${B.paid ? "checked" : ""}></div>
    <div class="rblist">${B.items.map(row).join("")}</div>
    <div class="vabtns"><button type="button" class="btn" data-rbcancel>${E(uiText("tm_cancel"))}</button><button type="button" class="btn primary" data-rbtake ${take ? "" : "disabled"}>${E(uiText(take === 1 ? "rb_take1" : "rb_take", { n: String(take) }))}</button></div>`;
}

async function rchBatchTake() {
  const B = RCHU.batch;
  if (!B) return;
  const ok = B.items.filter((it) => !it.dup && !it.skip && !rchBatchMiss(it).length);
  let n = 0;
  for (const it of ok) {
    const d = it.d,
      id = "i" + Date.now().toString(36) + (n++).toString(36),
      z = d.z || 14;
    if (it.img)
      try {
        await rcptPut("rch-" + id, it.img);
      } catch (_) {}
    rchList().push({
      id,
      kunde: d.kunde,
      amt: d.amt,
      nr: d.nr || rchNextNr(),
      date: d.date,
      z,
      due: d.due || addDays(d.date, z),
      img: it.img ? 1 : 0,
      learned: 2,
      ...(B.paid ? { paid: d.due && d.due < isoToday() ? d.due : d.date } : {}),
      src: "upload",
    });
  }
  RCHU.batch = null;
  await saveSettings();
  /* Kopfzeile auf das neueste hochgeladene Jahr stellen, damit man die Rechnungen gleich sieht */
  const ys = ok.map((it) => String(it.d.date || "").slice(0, 4)).sort();
  if (ys.length && !ys.includes(String(ui.ym || "").slice(0, 4))) ui.ym = ys[ys.length - 1] + "-12";
  rchOpen2();
  toast(uiText(n === 1 ? "rb_done1" : "rb_done", { n: String(n) }));
  SND.play("done");
  try {
    render();
  } catch (_) {}
}

document.addEventListener("click", async (e) => {
  const B = RCHU.batch;
  if (!B || !e.target.closest("#rchBg")) return;
  const o = e.target.closest("[data-rbopen]");
  if (o) {
    const k = Number(o.dataset.rbopen);
    B.open = B.open === k ? null : k;
    rchOpen2();
    return;
  }
  const ok = e.target.closest("[data-rbok]");
  if (ok) {
    const it = B.items[Number(ok.dataset.rbok)],
      v = (id) => ($(id) ? $(id).value.trim() : "");
    Object.assign(it.d, { kunde: v("rbK"), amt: parseAmt(v("rbA")) || 0, date: v("rbD"), nr: v("rbN") });
    if (it.d.date) it.d.due = addDays(it.d.date, it.d.z || 14);
    it.dup = rchBatchDup(it.d);
    it.skip = false;
    B.open = null;
    rchOpen2();
    return;
  }
  const sk = e.target.closest("[data-rbskip]");
  if (sk) {
    const it = B.items[Number(sk.dataset.rbskip)];
    it.skip = !it.skip;
    B.open = null;
    rchOpen2();
    return;
  }
  if (e.target.closest("[data-rbcancel]")) {
    RCHU.batch = null;
    rchOpen2();
    return;
  }
  if (e.target.closest("[data-rbtake]")) rchBatchTake();
});
document.addEventListener("change", (e) => {
  if (e.target.id === "rbPaid" && RCHU.batch) RCHU.batch.paid = e.target.checked;
});
