/* Buchungen */
if (IS_PC) {
  const root = $("v-list"),
    E = "cubic-bezier(.2,.8,.2,1)",
    BO = "cubic-bezier(.3,1.5,.5,1)";
  const vis = (el) => {
    const r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < innerHeight && r.width > 0;
  };
  function enter() {
    if (pcCalm()) return;
    const tops = [...root.children].filter((x) => x !== $("listCard") && x.id !== "pcDet" && !x.hidden && vis(x));
    const cols = [...root.querySelectorAll(".pccol")],
      det = $("pcDet");
    tops.forEach((el, i) =>
      el.animate(
        [
          {
            opacity: 0,
            transform: "translateY(-16px)",
          },
          {
            opacity: 1,
            transform: "none",
          },
        ],
        {
          duration: 380,
          delay: i * 50,
          easing: E,
          fill: "backwards",
        }
      )
    );
    cols.forEach((c, ci) => {
      const days = [...c.querySelectorAll(":scope>.pcday")].filter(vis);
      days.forEach((d, di) => {
        {
          const r = d.getBoundingClientRect(),
            dx = innerWidth * 0.5 - (r.left + r.width / 2),
            dy = innerHeight - r.top;
          d.animate(
            [
              {
                opacity: 0,
                transform: `translate(${dx}px,${dy}px) rotate(${(di + ci) % 2 ? 14 : -14}deg) scale(.7)`,
              },
              {
                opacity: 1,
                offset: 0.3,
              },
              {
                opacity: 1,
                transform: "translateY(-6px) rotate(0) scale(1.02)",
                offset: 0.85,
              },
              {
                opacity: 1,
                transform: "none",
              },
            ],
            {
              duration: 700,
              delay: 80 + (di * cols.length + ci) * 55,
              easing: "cubic-bezier(.3,.7,.3,1)",
              fill: "backwards",
            }
          );
        }
      });
    });
    {
      const n =
          cols.reduce((m, c) => Math.max(m, [...c.querySelectorAll(":scope>.pcday")].filter(vis).length), 0) *
          cols.length,
        t = 80 + n * 55 + 700;
      root.querySelectorAll(".pchl").forEach((h) =>
        h.animate(
          [
            {
              opacity: 0,
            },
            {
              opacity: 0,
              offset: 0.8,
            },
            {
              opacity: 1,
            },
          ],
          {
            duration: t + 250,
            easing: "ease-out",
          }
        )
      );
    }
    if (det && vis(det)) {
      det.animate(
        [
          {
            opacity: 0,
            transform: "translateX(80px)",
          },
          {
            opacity: 1,
            transform: "none",
          },
        ],
        {
          duration: 560,
          delay: 180,
          easing: E,
          fill: "backwards",
        }
      );
      const paper = det.querySelector(".paper");
      if (paper)
        paper.animate(
          [
            {
              transform: "translateY(-102%)",
            },
            {
              transform: "none",
            },
          ],
          {
            duration: 1100,
            delay: 600,
            easing: "cubic-bezier(.35,.6,.3,1)",
            fill: "backwards",
          }
        );
    }
  }
  new MutationObserver(() => {
    if (!root.hidden) requestAnimationFrame(enter);
  }).observe(root, {
    attributes: true,
    attributeFilter: ["hidden"],
  });
}
