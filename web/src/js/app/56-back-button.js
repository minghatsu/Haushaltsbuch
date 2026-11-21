/* Offene Fenster ohne eigene Zurück-/Esc-Behandlung schließen (Android-Zurück-Taste, Esc am PC) */
const OV_CLOSE = [
  ["rvBg", "[data-rvclose]"],
  ["anaBg", "[data-anaclose]"],
  ["artBg", "[data-artclose]"],
  ["tcBg", "[data-tcclose]"],
  ["hintBg", "[data-hintclose]"],
  ["addBg", "[data-addclose]"],
  ["cashBg", "[data-cashclose]"],
  ["loanBg", "[data-loanclose]"],
  ["recurBg", "[data-rcclose]"],
  ["kidBg", "[data-kidclose]"],
  ["afaBg", "[data-afaclose]"],
  ["bwBg", "[data-bwclose]"],
  ["hlBg", "[data-hlclose]"],
  ["loginBg", "#loginX"],
  ["bankBg", "[data-bankx]"],
  ["invBg", "[data-invback],[data-invclose]"],
];
function ovCloseTop() {
  for (const [id, sel] of OV_CLOSE) {
    const bg = $(id);
    if (!bg || bg.hidden || getComputedStyle(bg).display === "none") continue;
    const c = bg.querySelector(sel);
    if (c) {
      c.click();
      return true;
    }
  }
  return false;
}
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape" || e.defaultPrevented) return;
  if (document.querySelector(".hobg:not([hidden]),#sheetBg:not([hidden])")) return;
  for (const id of [
    "artBg",
    "tcBg",
    "loginBg",
    "cashBg",
    "loanBg",
    "recurBg",
    "kidBg",
    "afaBg",
    "bwBg",
    "bankBg",
    "invBg",
  ]) {
    const bg = $(id);
    if (bg && !bg.hidden && getComputedStyle(bg).display !== "none") {
      const c = bg.querySelector((OV_CLOSE.find((x) => x[0] === id) || [])[1] || "x");
      if (c) {
        e.preventDefault();
        c.click();
      }
      return;
    }
  }
});
window.hbBack = () => {
  if (nudgeClose()) return true;
  if (!$("mvBg") && $("mvSheet") && !$("mvSheet").hidden) {
    mvSheetClose();
    return true;
  }
  if ($("mvBg") && !$("mvBg").hidden) {
    if ($("mvSheet") && !$("mvSheet").hidden) mvSheetClose();
    else mvClose();
    return true;
  }
  if ($("codeBg") && !$("codeBg").hidden) {
    codeClose();
    return true;
  }
  if ($("camLive") && !$("camLive").hidden) {
    camStop();
    return true;
  }
  if ($("camRev") && !$("camRev").hidden) {
    camRevClose();
    return true;
  }
  if (!$("tourBg").hidden) {
    if (TOUR.i > 0) tourGo(TOUR.i - 1);
    else tourClose();
    return true;
  }
  {
    const tv = [...document.querySelectorAll(".tmview")].pop();
    if (tv) {
      tv.click();
      if (document.body.contains(tv)) tv.remove();
      return true;
    }
  }
  {
    const hb = [...document.querySelectorAll(".hobg:not([hidden])")].pop();
    if (hb && hb.id) {
      hbSheetClose(hb.id);
      return true;
    }
  }
  if ($("fxNewBg") && !$("fxNewBg").hidden) {
    fxNewClose();
    return true;
  }
  if ($("zDlg") && !$("zDlg").hidden) {
    zDlgClose();
    return true;
  }
  if ($("fbFloatBg") && !$("fbFloatBg").hidden) {
    fbFloatClose();
    return true;
  }
  if ($("mamiPop") && !$("mamiPop").hidden) {
    mamiClose();
    return true;
  }
  if ($("mbBg") && !$("mbBg").hidden) {
    mbClose();
    return true;
  }
  if ($("spBg") && !$("spBg").hidden) {
    spSheetClose();
    return true;
  }
  if (ui.wiz && $("wizBg") && !$("wizBg").hidden) {
    if (!wizBackOne() && !ui.wiz.forced) wizClose();
    return true;
  }
  if (!$("docRev").hidden) {
    drFinish(null);
    return true;
  }
  if (!$("fanBg").hidden) {
    fanClose();
    return true;
  }
  if (ovCloseTop()) return true;
  if (!$("sheetBg").hidden) {
    closeSheet();
    return true;
  }
  if (ui.view === "import" && ui.importing) return true;
  if ((!IS_PC || PH_SET) && ui.view === "more" && ACC.page) {
    phPageClose();
    return true;
  }
  if (ui.view !== "home") {
    ui.imp = null;
    ui.view = "home";
    render();
    window.scrollTo({
      top: 0,
    });
    return true;
  }
  return false;
};
