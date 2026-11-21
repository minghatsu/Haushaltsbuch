(function () {
  let t = "light";
  try {
    t = localStorage.getItem("hb-theme") === "dark" ? "dark" : "light";
  } catch (e) {}
  document.documentElement.dataset.theme = t;
})();
