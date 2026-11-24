/* Update-Prüfung, Abgleich starten, Anmeldung und Konto */
const HB_VERSION = +((document.querySelector('meta[name="hb-version"]') || {}).content || 0);
let updLast = 0,
  updSeen = 0;
async function checkUpdate(force) {
  if (!SERVER || !HB_VERSION) return;
  if (!force && Date.now() - updLast < 10 * 60 * 1000) return;
  updLast = Date.now();
  try {
    const v = (await api("version")).version | 0;
    if (v <= HB_VERSION || v <= updSeen) return;
    if (NATIVE) {
      if (!window.AndroidBridge.saveApp) return;
      const r = await requestAny("app");
      if (r.status !== 200 || !window.AndroidBridge.saveApp(r.text)) return;
    }
    updSeen = v;
    const go = () => {
      if (NATIVE) window.AndroidBridge.reloadApp();
      else location.reload();
    };
    toast("Neue Version ist da – wird beim nächsten Start aktiv", go, "Jetzt laden", 15000);
  } catch (e) {}
}
let syncTimers = false;
function startSync() {
  if (MODE !== "pair" && META_PAIR) {
    const had = !!SYNC.token;
    MODE = "pair";
    SERVER = pairUrl();
    if (!pairState()) {
      SYNC.token = "";
      SYNC.queue = [];
      SYNC.rq = [];
      SYNC.rev = 0;
    }
    SYNC.state = "off";
    saveSync();
    try {
      localStorage.setItem(MODE_KEY, "pair");
    } catch (e) {}
    if (had && !pairState())
      setTimeout(
        () =>
          toast(
            "Der Abgleich mit Passwort wurde abgeschaltet. Koppel dieses Gerät per QR-Code – deine Daten bleiben erhalten.",
            () => showLogin(),
            "Koppeln",
            15000
          ),
        1500
      );
  }
  renderSyncDot();
  if (!SYNC.token && MODE === "pair" && pairState() && cryptoCan()) {
    pairToken()
      .then((t) => {
        if (t && !SYNC.token) {
          SYNC.token = t;
          SYNC.state = "pending";
          saveSync();
          startSync();
        }
      })
      .catch(() => {});
    return;
  }
  if (!SYNC.token) {
    if (!SYNC.skipped && !SYNC.asked && !SYNC.last) {
      SYNC.asked = true;
      saveSync();
      showLogin();
    }
    return;
  }
  syncNow();
  if (syncTimers) return;
  syncTimers = true;
  setInterval(() => {
    if (document.visibilityState === "visible") syncNow();
  }, 5000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") syncNow();
  });
  window.addEventListener("online", () => syncNow());
}
function normServer(v) {
  v = (v || "").trim();
  if (!v) return "";
  if (!/^https?:\/\//i.test(v)) v = "http://" + v;
  try {
    const u = new URL(v);
    let p = u.pathname.replace(/\/+$/, "");
    if (!/\.php$/i.test(p)) p = (p ? p : "/haushaltsbuch") + "/api.php";
    return u.origin + p;
  } catch (e) {
    return "";
  }
}
let loginChecked = "";
function loginModeUi() {
  const cloud = MODE === "cloud",
    pair = MODE === "pair";
  $("loginSeg").hidden = true;
  $("loginSeg").querySelector('[data-lm="cloud"]').hidden = !(NATIVE || META_CLOUD);
  $("loginPair").hidden = !pair;
  for (const id of ["loginText", "loginPwRow", "loginGo", "loginUrlRow", "loginCodeRow", "loginPw2Row"])
    if ($(id) && pair) $(id).hidden = true;
  if (!pair) {
    $("loginText").hidden = false;
    $("loginGo").hidden = false;
  }
  if (pair) {
    $("loginCloudRow").hidden = true;
    $("loginEmailRow").hidden = true;
    $("loginLinks").hidden = true;
    $("loginRCodeRow").hidden = true;
    return;
  }
  $("loginSeg")
    .querySelectorAll("[data-lm]")
    .forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lm === MODE)));
  $("loginCloudRow").hidden = !cloud || !!META_CLOUD;
  $("loginEmailRow").hidden = !cloud;
  $("loginLinks").hidden = !cloud;
  if (!cloud) {
    $("loginRCodeRow").hidden = true;
    $("loginPwRow").hidden = false;
    $("loginPwLbl").textContent = "Passwort";
    $("loginGo").textContent = "Verbinden";
  }
}
async function showLogin() {
  if (BG_RUN) return;
  if (MODE === "pair") {
    pairShow("start");
    return;
  }
  const bg = $("loginBg");
  bg.hidden = false;
  $("loginErr").textContent = "";
  loginModeUi();
  if (MODE === "cloud") return cloudShow();
  $("loginUrlRow").hidden = !NATIVE;
  if (NATIVE && document.activeElement !== $("loginUrl")) $("loginUrl").value = SERVER;
  loginChecked = "";
  if (!SERVER) {
    $("loginText").textContent = "Gib die Adresse deines Servers ein und tippe auf „Verbinden“.";
    $("loginGo").disabled = false;
    return;
  }
  $("loginText").textContent = "Verbindung wird geprüft …";
  $("loginGo").disabled = true;
  try {
    const st = await api("status");
    SYNC.setup = !!st.setup;
    SYNC.reset = !!st.reset;
    loginChecked = SERVER;
  } catch (e) {
    $("loginText").textContent = NATIVE
      ? "Unter dieser Adresse ist der Server gerade nicht erreichbar. Prüfe die Adresse oder mach erst einmal ohne Abgleich weiter."
      : "Die Server ist gerade nicht erreichbar. Du kannst erst einmal ohne Abgleich weitermachen.";
    $("loginGo").disabled = false;
    return;
  }
  $("loginGo").disabled = false;
  $("loginPw2Row").hidden = !SYNC.setup;
  $("loginTitle").textContent = SYNC.reset
    ? "Neues Passwort festlegen"
    : SYNC.setup
      ? "Passwort festlegen"
      : "Mit deinem Server verbinden";
  $("loginText").textContent = SYNC.reset
    ? "Auf des Servers liegt die Datei passwort-zuruecksetzen.txt. Leg jetzt ein neues Passwort fest – deine Daten bleiben erhalten, alle anderen Geräte melden sich neu an, die Zwei-Faktor-Anmeldung ist danach aus."
    : SYNC.setup
      ? "Lege ein Passwort für deinen Server fest (mindestens 8 Zeichen). Damit meldest du dich auf jedem Gerät einmal an."
      : "Gib dein Passwort für den Server ein. Danach siehst du auf diesem Gerät dieselben Daten wie überall.";
  setTimeout(() => $("loginPw").focus(), 50);
}
async function doLogin() {
  if (MODE === "cloud") return cloudGo();
  if (NATIVE) {
    const u = normServer($("loginUrl").value);
    if (!u) {
      $("loginErr").textContent = "Bitte gib die Adresse deines Servers ein.";
      return;
    }
    if (u !== SERVER || loginChecked !== SERVER) {
      SERVER = u;
      $("loginUrl").value = u;
      try {
        localStorage.setItem(SERVER_KEY, u);
      } catch (e) {}
      await showLogin();
      if (loginChecked === SERVER && !$("loginPw").value) return;
      if (loginChecked !== SERVER) return;
    }
  }
  const pw = $("loginPw").value;
  if (SYNC.setup && pw !== $("loginPw2").value) {
    $("loginErr").textContent = "Die beiden Passwörter sind nicht gleich.";
    return;
  }
  $("loginGo").disabled = true;
  $("loginErr").textContent = "";
  try {
    const code = $("loginCode").value.trim();
    const r = await api(SYNC.setup ? "setup" : "login", {
      body: SYNC.setup
        ? {
            password: pw,
          }
        : code
          ? {
              password: pw,
              code,
            }
          : {
              password: pw,
            },
    });
    const firstSetup = SYNC.setup && !SYNC.reset;
    SYNC.reset = false;
    loginDone(r.token, firstSetup);
  } catch (e) {
    if (e.status === 401 && e.data && e.data.need2fa) {
      $("loginCodeRow").hidden = false;
      $("loginErr").textContent = "";
      $("loginText").textContent =
        "Zwei-Faktor-Anmeldung ist an: Gib den 6-stelligen Code aus deiner Authenticator-App ein.";
      setTimeout(() => $("loginCode").focus(), 30);
    } else
      $("loginErr").textContent =
        e.status === 403 ? e.message || "Falsches Passwort." : e.message || "Verbindung fehlgeschlagen.";
  } finally {
    $("loginGo").disabled = false;
  }
}
function loginDone(token, firstSetup, msg) {
  SND.play("pair");
  $("loginCodeRow").hidden = true;
  $("loginCode").value = "";
  try {
    localStorage.setItem(MODE_KEY, MODE);
    if (MODE === "cloud" && !META_CLOUD) localStorage.setItem(CLOUD_KEY, SERVER);
  } catch (e) {}
  ui.tfa = undefined;
  SYNC.token = token;
  SYNC.rev = 0;
  SYNC.skipped = false;
  SYNC.queue = [];
  if (firstSetup) {
    for (const k of ["tx", "txb", "fixed", "months", "debts"])
      for (const [id, d] of Object.entries(memStore[k]))
        SYNC.queue.push({
          col: k,
          id,
          data: d,
        });
    for (const [id, d] of Object.entries(memStore.acct))
      SYNC.queue.push({
        col: "app",
        id: "acct-" + id,
        data: d,
      });
    SYNC.rq = [...RCPT.ids];
    SYNC.queue.push({
      col: "app",
      id: "settings",
      data: clone(store.settings),
    });
  } else {
    for (const k of ["tx", "txb", "fixed", "months", "debts", "acct"]) memStore[k] = {};
  }
  saveSync();
  $("loginBg").hidden = true;
  $("loginPw").value = "";
  $("loginPw2").value = "";
  $("loginRCode").value = "";
  toast(msg || (firstSetup ? "Passwort gespeichert, Daten werden hochgeladen" : "Verbunden"));
  startSync();
  setTimeout(() => {
    try {
      devPing(true);
    } catch (e) {}
  }, 1500);
}
/* Konto */
function normCloud(v) {
  v = (v || "").trim();
  if (!v) return "";
  if (!/^https?:\/\//i.test(v)) v = "http://" + v;
  try {
    const u = new URL(v);
    let p = u.pathname.replace(/\/+$/, "");
    if (!/\.php$/i.test(p)) p = (p ? p : "/haushaltsbuch") + "/cloud.php";
    return u.origin + p;
  } catch (e) {
    return "";
  }
}
let cloudChecked = "";
const CLOUD_TXT = {
  login: [
    "Anmelden",
    "Melde dich mit deinem Konto an. Danach siehst du auf diesem Gerät dieselben Daten wie auf deinen anderen Geräten.",
    "Anmelden",
  ],
  register: [
    "Konto erstellen",
    "Mit einem Konto gleichen sich Handy und PC automatisch ab. Was du schon eingetragen hast, wird mitgenommen.",
    "Konto erstellen",
  ],
  forgot: [
    "Passwort vergessen",
    "Gib deine E-Mail-Adresse ein. Wir schicken dir einen Code, mit dem du ein neues Passwort festlegst.",
    "Code schicken",
  ],
  reset: ["Neues Passwort", "", "Passwort speichern"],
};
function cloudUi() {
  const st = ui.lstep || "login",
    t = CLOUD_TXT[st];
  $("loginTitle").textContent = t[0];
  if (st !== "reset") $("loginText").textContent = t[1];
  $("loginGo").textContent = t[2];
  $("loginPwRow").hidden = st === "forgot";
  $("loginPwLbl").textContent =
    st === "register"
      ? "Passwort (mind. 10 Zeichen)"
      : st === "reset"
        ? "Neues Passwort (mind. 10 Zeichen)"
        : "Passwort";
  $("loginPw").autocomplete = st === "login" ? "current-password" : "new-password";
  $("loginPw2Row").hidden = !(st === "register" || st === "reset");
  $("loginRCodeRow").hidden = st !== "reset";
  $("loginEmail").disabled = st === "reset";
  if (st !== "login") {
    $("loginCodeRow").hidden = true;
    $("loginCode").value = "";
  }
  $("loginToggle").textContent = st === "login" ? "Neu hier? Konto erstellen" : "Zurück zur Anmeldung";
  $("loginForgot").hidden = st !== "login";
}
function cloudShow() {
  $("loginUrlRow").hidden = true;
  $("loginGo").disabled = false;
  if (!META_CLOUD && document.activeElement !== $("loginCloud")) $("loginCloud").value = lsGet(CLOUD_KEY);
  if (SYNC.email && !$("loginEmail").value) $("loginEmail").value = SYNC.email;
  cloudUi();
  setTimeout(() => {
    const f =
      !META_CLOUD && !$("loginCloud").value
        ? "loginCloud"
        : !$("loginEmail").value
          ? "loginEmail"
          : ui.lstep === "reset"
            ? "loginRCode"
            : "loginPw";
    $(f) && $(f).focus();
  }, 50);
}
async function cloudCheck() {
  const u = META_CLOUD || normCloud($("loginCloud").value);
  if (!u) {
    $("loginErr").textContent = "Bitte gib die Adresse des Abgleich-Servers ein.";
    return false;
  }
  if (u === SERVER && cloudChecked === u) return true;
  SERVER = u;
  if (!META_CLOUD) $("loginCloud").value = u;
  try {
    const st = await api("status");
    if (!st.cloud) {
      $("loginErr").textContent = "Unter dieser Adresse läuft kein Konto-Server (cloud.php).";
      return false;
    }
  } catch (e) {
    $("loginErr").textContent =
      "Der Abgleich-Server ist gerade nicht erreichbar. Prüfe die Internetverbindung oder mach erst einmal ohne Abgleich weiter.";
    return false;
  }
  cloudChecked = u;
  return true;
}
async function cloudGo() {
  const st = ui.lstep || "login",
    email = $("loginEmail").value.trim(),
    pw = $("loginPw").value,
    err = (m) => ($("loginErr").textContent = m);
  err("");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err("Bitte gib deine E-Mail-Adresse ein.");
  if (st !== "forgot" && !pw) return err("Bitte gib dein Passwort ein.");
  if ((st === "register" || st === "reset") && pw.length < 10)
    return err("Das Passwort braucht mindestens 10 Zeichen.");
  if ((st === "register" || st === "reset") && pw !== $("loginPw2").value)
    return err("Die beiden Passwörter sind nicht gleich.");
  if (st === "reset" && !$("loginRCode").value.trim()) return err("Bitte gib den Code aus der E-Mail ein.");
  $("loginGo").disabled = true;
  try {
    if (!(await cloudCheck())) return;
    if (st === "forgot") {
      await api("forgot", {
        body: {
          email,
        },
      });
      ui.lstep = "reset";
      cloudUi();
      $("loginText").textContent =
        `Falls es für ${email} ein Konto gibt, ist jetzt ein Code unterwegs (gilt 15 Minuten). Schau auch im Spam-Ordner nach.`;
      setTimeout(() => $("loginRCode").focus(), 30);
      return;
    }
    if (st === "register") {
      const r = await api("register", {
        body: {
          email,
          password: pw,
        },
      });
      SYNC.email = email.toLowerCase();
      ui.lstep = "login";
      loginDone(r.token, true, "Konto erstellt – deine Daten werden hochgeladen");
      return;
    }
    if (st === "reset") {
      const r = await api("reset", {
        body: {
          email,
          code: $("loginRCode").value.trim(),
          password: pw,
        },
      });
      SYNC.email = email.toLowerCase();
      ui.lstep = "login";
      loginDone(r.token, false, "Neues Passwort gespeichert");
      return;
    }
    const code = $("loginCode").value.trim();
    const r = await api("login", {
      body: code
        ? {
            email,
            password: pw,
            code,
          }
        : {
            email,
            password: pw,
          },
    });
    SYNC.email = email.toLowerCase();
    loginDone(r.token, false);
  } catch (e) {
    if (e.status === 401 && e.data && e.data.need2fa) {
      $("loginCodeRow").hidden = false;
      $("loginText").textContent =
        "Zwei-Faktor-Anmeldung ist an: Gib den 6-stelligen Code aus deiner Authenticator-App ein (oder einen Wiederherstellungscode).";
      setTimeout(() => $("loginCode").focus(), 30);
    } else if (e.status === 409) {
      err(e.message);
      ui.lstep = "login";
      cloudUi();
    } else err(e.message && !/^HTTP /.test(e.message) ? e.message : "Verbindung fehlgeschlagen.");
  } finally {
    $("loginGo").disabled = false;
  }
}
$("loginToggle").onclick = () => {
  ui.lstep = (ui.lstep || "login") === "login" ? "register" : "login";
  $("loginErr").textContent = "";
  cloudUi();
};
$("loginForgot").onclick = () => {
  ui.lstep = "forgot";
  $("loginErr").textContent = "";
  cloudUi();
  setTimeout(() => $("loginEmail").focus(), 30);
};
$("loginSeg").addEventListener("click", (e) => {
  const b = e.target.closest("[data-lm]");
  if (!b || b.dataset.lm === MODE) return;
  MODE = b.dataset.lm;
  SERVER =
    MODE === "cloud"
      ? META_CLOUD || normCloud($("loginCloud").value) || lsGet(CLOUD_KEY)
      : MODE === "pair"
        ? pairUrl()
        : nasUrl();
  if (MODE !== "pair") {
    $("loginPwRow").hidden = false;
  }
  loginChecked = "";
  cloudChecked = "";
  ui.lstep = "login";
  $("loginCodeRow").hidden = true;
  $("loginPw2Row").hidden = true;
  showLogin();
});
$("loginGo").onclick = doLogin;
["loginPw", "loginPw2", "loginEmail", "loginRCode", "loginCode", "loginCloud"].forEach((id) =>
  $(id).addEventListener("keydown", (e) => {
    if (e.key === "Enter") doLogin();
  })
);
$("syncMoreBtn").onclick = () => {
  const m = $("syncMore"),
    open = m.hidden;
  m.hidden = !open;
  $("syncMoreBtn").setAttribute("aria-expanded", String(open));
};
$("loginX").onclick = () => {
  if (SYNC.token) {
    $("loginBg").hidden = true;
    ui.pstep = "start";
    pairRecvStop();
    renderSyncInfo();
  } else $("loginSkip").click();
};
$("loginSkip").onclick = () => {
  if (actNeed()) {
    $("loginBg").hidden = true;
    actGate();
    return;
  }
  SYNC.skipped = true;
  saveSync();
  $("loginBg").hidden = true;
  renderSyncDot();
  if (wizShould())
    setTimeout(() => {
      if (wizShould()) wizOpen();
    }, 300);
  toast("Ohne Abgleich – anmelden kannst du dich unter Einstellungen");
};
