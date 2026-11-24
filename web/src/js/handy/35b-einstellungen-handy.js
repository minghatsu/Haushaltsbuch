/* Einstellungen am Handy: ruhige Liste in vier Gruppen, jede Einstellung als eigene Seite.
   PC und Tablet ersetzen renderSetHome und accGo durch ihre Übersicht mit Seitenfenster (js/pc). */
function phRow(k) {
  const act = k === "wiz" ? `data-qwiz="1"` : k === "weiter" ? `data-invopen="1"` : `data-accgo="${k}"`,
    sb = setSub(k);
  return `<button class="phr" ${act}><span class="saic phic">${svgIcon(accIcon(k), 18)}</span><b class="phrt">${escHtml(phTitle(k))}</b><small class="phrs" data-accsub="${k}">${escHtml(sb)}</small><span class="phch">${CHEV}</span></button>`;
}
function phHomeHtml() {
  const n = String(store.settings.name || "").trim(),
    p = store.settings.photo,
    f = devForm();
  const av = p ? `<img src="${escHtml(p)}" alt="">` : n ? `<b>${escHtml(n[0].toUpperCase())}</b>` : devIc(f, 24);
  return `<button class="card phprof" data-spgo="profil"><span class="phav">${av}<span class="avdev">${devIc(f, 11)}</span></span><span class="sat"><b>${escHtml(n || devModel())}</b><small>${escHtml(uiText("st_prof"))}</small></span><span class="phch">${CHEV}</span></button>
    <div class="qpills">${quickSw().map(qsTile).join("")}</div>
    ${setGroups(false)
      .map(([t, ks]) => `<h3 class="phgl">${escHtml(tabLabel(t))}</h3><div class="card phg">${ks.map(phRow).join("")}</div>`)
      .join("")}
    <div class="appfoot"><b>Finanz MAMI</b><span>Die App, die sich um dich kümmert</span><small>${escHtml(verFull())}</small></div>`;
}
function phSetRender(el) {
  if (ACC.page) {
    const k = ACC.page;
    if (el.dataset.page !== k) {
      accRestoreAll();
      el.dataset.page = k;
      const col = themeCol(ACC_COL[k] || "#1a7a5c");
      el.innerHTML = `<button class="phback" data-phback="1"><svg class="i" viewBox="0 0 24 24" style="width:18px;height:18px"><path d="m15 6-6 6 6 6"/></svg> Einstellungen</button>
        <div class="phph"><span class="saic" style="background:${col}">${svgIcon(accIcon(k), 20)}</span><h2>${escHtml(phTitle(k))}</h2></div>${phPageKeys(
          k
        )
          .map((x) => `<div class="sabody phbody" id="sab-${x}"></div>`)
          .join("")}`;
      ACC.nodes = {};
      phPageKeys(k).forEach((x) => accMount(x));
      window.scrollTo({
        top: 0,
      });
    }
    return;
  }
  if (el.dataset.page !== "home" || !$("setQ")) {
    accRestoreAll();
    el.dataset.page = "home";
    el.innerHTML = `<div class="settop"><label class="setsrch"><svg class="i" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/></svg><input id="setQ" type="search" placeholder="Einstellung suchen …" autocomplete="off" aria-label="Einstellung suchen"></label></div><div id="phHome"></div><div id="setList"></div>`;
    ACC.built = "";
  }
  const q = ACC.q.trim();
  $("phHome").hidden = !!q;
  $("setList").hidden = !q;
  if (q) {
    if (ACC.built !== "q:" + q.toLowerCase()) accBuild();
    return;
  }
  $("phHome").innerHTML = phHomeHtml();
}
function phPageClose() {
  accRestoreAll();
  ACC.page = null;
  const el = $("setHome");
  if (el) el.dataset.page = "";
  renderSetHome();
  window.scrollTo({
    top: 0,
  });
}
document.addEventListener("click", (e) => {
  if (e.target.closest("[data-phback]")) phPageClose();
});
function renderSetHome() {
  const el = $("setHome");
  if (el) phSetRender(el);
}
function accGo(k) {
  if (k === "start") k = "konten";
  if (k === "feedback") {
    fbQuickGo();
    return;
  }
  if (k === "profil") {
    spSheetOpen("profil");
    return;
  }
  if (k === "weiter") {
    invOpen();
    return;
  }
  if (!SP_PAGES[k] && !["dark", "wiz"].includes(k)) return;
  if (k === "dark" || k === "wiz") return;
  ACC.q = "";
  ACC.page = k === "sync" ? "geraete" : k;
  if (ui.view !== "more") {
    ui.view = "more";
    render();
  } else renderSetHome();
}
