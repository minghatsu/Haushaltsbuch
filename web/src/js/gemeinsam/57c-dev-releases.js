/* Entwickler */
const REL = {
  mine: "",
  all: "",
  allBody: "",
  mineBody: "",
  busy: false,
  arm: false,
  msg: "",
  t: 0,
  sel: {
    handy: true,
    tablet: true,
    pc: true,
  },
};
async function relLoad(force) {
  if (!updKey() || !canGh() || REL.busy || (!force && Date.now() - REL.t < 60e3)) return;
  REL.t = Date.now();
  try {
    const a = JSON.parse(await ghFetch(GH_REL, "json")),
      b = JSON.parse(await ghFetch(GH_REL_PUB, "json"));
    REL.mine = a.name || "";
    REL.all = b.name || "";
    REL.mineBody = a.body || "";
    REL.allBody = b.body || "";
  } catch (_) {}
  renderUpd();
}
const relNum = (body, k) => {
  const m = String(body || "").match(new RegExp("\\b" + k + "=(\\d+)"));
  return m ? +m[1] : 0;
};
function relCardHtml() {
  if (!updKey()) return "";
  setTimeout(() => relLoad(), 0);
  const mine = relNum(REL.mineBody, "web"),
    ow = relNum(REL.allBody, "web"),
    D = [
      ["handy", "Handy", ow],
      ["tablet", "Tablet", relNum(REL.allBody, "webt") || ow],
      ["pc", "PC", relNum(REL.allBody, "webp") || ow],
    ];
  const any = D.some(([k]) => REL.sel[k]),
    loaded = !!mine;
  return `<div class="relbox"><b>Für alle freigeben</b>
    <span class="small muted">Bei dir: ${mine ? verName(mine) : "…"}</span>
    <div class="relsel">${D.map(([k, l, n]) => {
      const same = n && n === mine;
      return `<label class="${same ? "same" : ""}"><input type="checkbox" data-relsel="${k}" ${REL.sel[k] ? "checked" : ""}><span><b>${l}</b><small>bei allen: ${n ? verName(n) : "…"}${same ? " ✓" : ""}</small></span></label>`;
    }).join("")}</div>
    <button class="btn ${REL.arm ? "danger" : "primary"}" id="relGo" ${REL.busy || !any || !loaded ? "disabled" : ""}>${
      REL.busy
        ? "Wird freigegeben …"
        : REL.arm
          ? "Wirklich freigeben?"
          : `${verName(mine)} freigeben für: ${
              D.filter(([k]) => REL.sel[k])
                .map(([, l]) => l)
                .join(", ") || "–"
            }`
    }</button>
    ${REL.msg ? `<span class="small" style="color:${/geklappt|unterwegs/.test(REL.msg) ? "var(--good)" : "var(--bad)"}">${escHtml(REL.msg)}</span>` : ""}</div>`;
}
document.addEventListener("change", (e) => {
  const c = e.target.closest("[data-relsel]");
  if (!c) return;
  REL.sel[c.dataset.relsel] = c.checked;
  REL.arm = false;
  renderUpd();
});
async function relFree() {
  const url = "https://api.github.com/repos/minghatsu/Haushaltsbuch/actions/workflows/freigeben.yml/dispatches";
  const r = await new Promise((res) => {
    const id = newId();
    httpWaiting[id] = res;
    setTimeout(() => {
      if (httpWaiting[id]) {
        delete httpWaiting[id];
        res({
          status: 0,
        });
      }
    }, 30000);
    window.AndroidBridge.http(
      id,
      "POST",
      url,
      "Bearer " + updKey(),
      JSON.stringify({
        ref: "main",
        inputs: {
          handy: String(!!REL.sel.handy),
          tablet: String(!!REL.sel.tablet),
          pc: String(!!REL.sel.pc),
        },
      })
    );
  });
  if (r.status === 204 || r.status === 200) return;
  if (r.status === 403 || r.status === 404)
    throw new Error(
      "Dein Entwickler-Schlüssel darf das noch nicht. Gib ihm bei GitHub unter „Actions“ das Recht „Read and write“."
    );
  if (!r.status) throw new Error("Keine Verbindung – bist du online?");
  throw new Error("GitHub antwortet mit " + r.status);
}
document.addEventListener("click", async (e) => {
  if (!e.target.closest("#relGo")) return;
  if (!REL.arm) {
    REL.arm = true;
    REL.msg = "";
    renderUpd();
    setTimeout(() => {
      if (REL.arm) {
        REL.arm = false;
        renderUpd();
      }
    }, 6000);
    return;
  }
  REL.arm = false;
  REL.busy = true;
  renderUpd();
  try {
    await relFree();
    REL.msg = "Hat geklappt – in 1–2 Minuten bekommen alle das Update.";
    setTimeout(() => relLoad(true), 90e3);
  } catch (x) {
    REL.msg = x.message;
  } finally {
    REL.busy = false;
    renderUpd();
  }
});
document.addEventListener("click", async (e) => {
  if (e.target.closest("#updSave")) {
    const v = ($("updKey").value || "").trim();
    if (!/^(github_pat_|ghp_)[A-Za-z0-9_]{20,}$/.test(v)) {
      toast("Das sieht nicht wie ein GitHub-Schlüssel aus");
      return;
    }
    store.settings.updKey = v;
    ui.updKeyForm = false;
    await saveSettings();
    renderUpd();
    ghCheck(true);
    return;
  }
  if (e.target.closest("#updNow")) {
    ghCheck(true);
    return;
  }
  if (e.target.closest("#updKeyShow")) {
    ui.updKeyForm = true;
    renderUpd();
    return;
  }
  if (e.target.closest("#updChange")) {
    ui.updKeyForm = true;
    delete store.settings.updKey;
    await saveSettings();
    UPD.msg = "";
    renderUpd();
    setTimeout(() => $("updKey") && $("updKey").focus(), 30);
  }
});
window.hbUpdTap = () => ghCheck(true, true);
{
  let tap = false;
  try {
    tap = !!(window.AndroidBridge && window.AndroidBridge.takeUpdTap && window.AndroidBridge.takeUpdTap());
  } catch (e) {}
  setTimeout(() => (tap ? ghCheck(true, true) : ghCheck()), tap ? 1500 : 20000);
}
setInterval(
  () => {
    if (document.visibilityState === "visible") ghCheck();
  },
  5 * 60 * 1000
);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") ghCheck();
  else if (UPD.ready && canGh()) {
    UPD.ready = false;
    window.AndroidBridge.reloadApp();
  }
});
