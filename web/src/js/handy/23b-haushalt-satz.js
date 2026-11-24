/* Mami fasst „pro Tag“ und Prognose in einem Satz zusammen */
function homeSay(ym, mainBal) {
  const { left, v } = freePerDay(ym, mainBal);
  let F = null;
  try {
    F = store.tx.length ? fcCalc() : null;
  } catch (_) {}
  const fc = F && F.pts && F.pts.length,
    end = fc
      ? F.warn
        ? uiText("hs_tight", { d: fxDate(F.ym + "-" + pad(F.min.d)) })
        : uiText("hs_end", { d: fxDate(lastDayOf(F.ym)), v: fmtEur0(F.end) })
      : uiText(left === 1 ? "hs_left1" : "hs_left", { n: left });
  return `<button type="button" class="hsay ${fc && F.warn ? "warn" : ""}" ${fc ? "data-fcopen" : 'data-go="year"'} data-noi18n><span class="hsm">${mamiAvatar(null)}</span><span class="hst"><b>${escHtml(uiText("hs_day", { v: fmtEur0(v) }))}</b><span>${escHtml(end)}</span></span>${svgIcon("right", 18)}</button>`;
}
