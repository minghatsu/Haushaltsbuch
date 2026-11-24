/* Entwickler-Knopf in der Kopfzeile – öffnet die Entwickler-Seite */
if (IS_DESK) {
  const WR = `<svg class="i" viewBox="0 0 24 24"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.1L4 16.7 7.3 20l5.3-5.3a4 4 0 0 0 5.1-5.4l-2.4 2.4-2.4-.6-.6-2.4z"/></svg>`;
  function devW() {
    let w = $("pcDevW");
    if (!updKey()) {
      if (w) {
        ["pcRel", "pcInbox"].forEach((i) => {
          const b = $(i);
          if (b) b.remove();
        });
        w.remove();
      }
      return;
    }
    const ref = $("pcRefresh") || $("pcTheme");
    if (!ref) return;
    if (!w) {
      ref.insertAdjacentHTML(
        "beforebegin",
        `<span class="pcdevw" id="pcDevW"><button class="roundbtn pcdev" id="pcDev" aria-expanded="false" aria-label="${escHtml(uiText("dv_t"))}" title="${escHtml(uiText("dv_t") + " – " + uiText("dv_note"))}">${WR}<i class="badge" hidden></i><i class="dot" hidden></i></button></span>`
      );
      w = $("pcDevW");
    }
    ["pcRel", "pcInbox"].forEach((i) => {
      const b = $(i);
      if (b && b.parentElement !== w) {
        w.appendChild(b);
        b.tabIndex = -1;
        b.setAttribute("aria-hidden", "true");
      }
    });
    const ib = $("pcInbox"),
      bd = ib && ib.querySelector(".badge"),
      mb = w.querySelector(".pcdev .badge"),
      n = bd && !bd.hidden ? bd.textContent : "";
    if (mb) {
      if (mb.textContent !== n) {
        const was = Number(mb.textContent) || 0;
        mb.textContent = n;
        if ((Number(n) || 0) > was)
          w.querySelector(".pcdev").animate(
            [
              {
                transform: "rotate(0)",
              },
              {
                transform: "rotate(-16deg) scale(1.12)",
                offset: 0.3,
              },
              {
                transform: "rotate(10deg)",
                offset: 0.6,
              },
              {
                transform: "none",
              },
            ],
            {
              duration: 650,
            }
          );
      }
      mb.hidden = !n;
    }
    const rd = $("pcRel") && $("pcRel").querySelector(".dot"),
      md = w.querySelector(".pcdev .dot");
    if (md) md.hidden = !(rd && !rd.hidden) || !!n;
  }
  document.addEventListener("click", (e) => {
    if (!e.target.closest("#pcDev")) return;
    e.stopPropagation();
    pcDevPage.toggle();
  });
  const _rd = render;
  render = (...a) => {
    const x = _rd(...a);
    try {
      devW();
    } catch (_) {}
    return x;
  };
  setInterval(() => {
    try {
      devW();
    } catch (_) {}
  }, 3000);
  setTimeout(() => {
    try {
      devW();
    } catch (_) {}
  }, 600);
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-fxcol]");
  if (!b) return;
  store.settings.fxColBy = b.dataset.fxcol;
  saveSettings();
  renderFix();
});
document.addEventListener("change", (e) => {
  const a = e.target.closest("[data-pf=acct]");
  if (!a) return;
  const i = a.parentElement.querySelector("[data-pf=acctnew]");
  if (i) {
    i.hidden = a.value !== "__new";
    if (!i.hidden) i.focus();
  }
});
