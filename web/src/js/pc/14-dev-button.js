/* Entwickler-Knopf in der Kopfzeile: Freigabe & Tester, Feedback-Eingang, Werkzeuge */
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
        `<span class="pcdevw" id="pcDevW"><button class="roundbtn pcdev" id="pcDev" aria-haspopup="menu" aria-expanded="false" aria-label="${escHtml(uiText("dv_t"))}" title="${escHtml(uiText("dv_t"))}">${WR}<i class="badge" hidden></i><i class="dot" hidden></i></button></span>`
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
    const p = $("pcDevPop");
    if (p) paint(p);
  }
  const row = (k, svg, t, sub, badge) =>
    `<button class="pcdvr" data-pcdv="${k}" role="menuitem"><span class="pcdvi">${svg}</span><span class="pcdvt"><b>${escHtml(t)}</b><small>${escHtml(sub)}</small></span>${badge ? `<i class="badge">${escHtml(badge)}</i>` : `<span class="pcdva" aria-hidden="true">›</span>`}</button>`;
  function paint(p) {
    const ib = $("pcInbox"),
      bd = ib && ib.querySelector(".badge"),
      n = bd && !bd.hidden ? bd.textContent : "";
    p.innerHTML =
      `<div class="pcdvh" data-noi18n>${escHtml(uiText("dv_t"))}</div>` +
      row(
        "rel",
        `<svg class="i" viewBox="0 0 24 24"><path d="M12 15V3M7 8l5-5 5 5"/><path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/></svg>`,
        uiText("dv_rel"),
        uiText("dv_rel_s"),
        ""
      ) +
      row(
        "fb",
        `<svg class="i" viewBox="0 0 24 24"><path d="M4 13.5 6.5 5h11l2.5 8.5V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M4 13.5h4.5l1 2h5l1-2H20"/></svg>`,
        uiText("dv_fb"),
        uiText("dv_fb_s"),
        n
      ) +
      row("tools", WR, uiText("dv_tools"), uiText("dv_tools_s"), "");
    p.setAttribute("data-noi18n", "");
  }
  function popClose() {
    const p = $("pcDevPop");
    if (!p) return;
    p.classList.add("out");
    const b = $("pcDev");
    if (b) b.setAttribute("aria-expanded", "false");
    setTimeout(() => p.remove(), 160);
  }
  function popOpen() {
    const b = $("pcDev");
    if (!b) return;
    const r = b.getBoundingClientRect();
    const p = document.createElement("div");
    p.id = "pcDevPop";
    p.className = "pcdevpop";
    p.setAttribute("role", "menu");
    p.style.top = r.bottom + 10 + "px";
    p.style.left = Math.max(12, Math.min(innerWidth - 352, r.left + r.width / 2 - 170)) + "px";
    p.style.setProperty(
      "--ax",
      Math.round(r.left + r.width / 2 - Math.max(12, Math.min(innerWidth - 352, r.left + r.width / 2 - 170))) + "px"
    );
    paint(p);
    document.body.appendChild(p);
    b.setAttribute("aria-expanded", "true");
    SND.play("pop");
    const f = p.querySelector(".pcdvr");
    if (f)
      f.focus({
        preventScroll: true,
      });
  }
  document.addEventListener(
    "click",
    (e) => {
      if (e.target.closest("#pcDev")) {
        e.stopPropagation();
        if ($("pcDevPop")) popClose();
        else {
          const rp = $("pcRelPop");
          if (rp) rp.remove();
          popOpen();
        }
        return;
      }
      const r = e.target.closest("[data-pcdv]");
      if (r) {
        const k = r.dataset.pcdv;
        popClose();
        if (k === "rel") {
          const b = $("pcRel");
          if (b) setTimeout(() => b.click(), 20);
        } else if (k === "fb") {
          const b = $("pcInbox");
          if (b) setTimeout(() => b.click(), 20);
        } else if (k === "tools") {
          setTimeout(() => {
            try {
              devOpen();
            } catch (_) {}
          }, 60);
        }
        return;
      }
      if ($("pcDevPop") && !e.target.closest("#pcDevPop")) popClose();
    },
    true
  );
  document.addEventListener("keydown", (e) => {
    const p = $("pcDevPop");
    if (!p) return;
    if (e.key === "Escape") {
      popClose();
      const b = $("pcDev");
      if (b) b.focus();
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const L = [...p.querySelectorAll(".pcdvr")],
        i = L.indexOf(document.activeElement);
      L[(i + (e.key === "ArrowDown" ? 1 : -1) + L.length) % L.length].focus();
    }
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
