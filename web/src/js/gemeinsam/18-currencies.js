/* Währungen */
const FX_CODES = [
  "USD",
  "GBP",
  "CHF",
  "TRY",
  "PLN",
  "RON",
  "CZK",
  "HUF",
  "SEK",
  "DKK",
  "NOK",
  "JPY",
  "CNY",
  "CAD",
  "AUD",
];
const FX_FALLBACK = {
  d: "",
  approx: true,
  r: {
    USD: 1.16,
    GBP: 0.87,
    CHF: 0.93,
    TRY: 48.5,
    PLN: 4.25,
    RON: 5.08,
    CZK: 24.3,
    HUF: 390,
    SEK: 11,
    DKK: 7.46,
    NOK: 11.7,
    JPY: 172,
    CNY: 8.3,
    CAD: 1.61,
    AUD: 1.78,
  },
};
function fxRates() {
  let best = null;
  try {
    const j = JSON.parse(localStorage.getItem("hb-rates") || "null");
    if (j && j.r && j.d) best = j;
  } catch (e) {}
  const m = document.querySelector('meta[name="hb-rates"]');
  if (m)
    try {
      const j = JSON.parse(m.content);
      if (j && j.r && j.d && (!best || j.d > best.d)) best = j;
    } catch (e) {}
  return best || FX_FALLBACK;
}
function fxConv(v, from, to) {
  const r = fxRates().r,
    f = from === "EUR" ? 1 : r[from],
    t = to === "EUR" ? 1 : r[to];
  return f && t ? (v / f) * t : null;
}
function fxFmt(v, c, whole) {
  try {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: c,
      ...(whole
        ? {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }
        : {}),
    }).format(v);
  } catch (e) {
    return numStr(v) + " " + c;
  }
}
function curName(c) {
  try {
    return new Intl.DisplayNames([localeTag()], {
      type: "currency",
    }).of(c);
  } catch (e) {
    return c;
  }
}
async function fxRefresh() {
  for (const u of ["https://api.frankfurter.dev/v1/latest?base=EUR", "https://api.frankfurter.app/latest?from=EUR"]) {
    try {
      const r = await fetch(u, {
        cache: "no-store",
      });
      if (!r.ok) continue;
      const j = await r.json();
      if (!j || !j.rates || !j.date) continue;
      const o = {
        d: j.date,
        r: {},
      };
      FX_CODES.forEach((c) => {
        if (j.rates[c]) o.r[c] = j.rates[c];
      });
      try {
        localStorage.setItem("hb-rates", JSON.stringify(o));
      } catch (e) {}
      return o;
    } catch (e) {}
  }
  return null;
}
function fxLine(v) {
  const c = store.settings.cur2;
  if (!c) return "";
  const x = fxConv(v, "EUR", c);
  return x == null ? "" : `<div class="fx2">≈ ${escHtml(fxFmt(x, c, Math.abs(x) >= 100))}</div>`;
}
const CUR_FLAG = {
  EUR: "🇪🇺",
  USD: "🇺🇸",
  GBP: "🇬🇧",
  CHF: "🇨🇭",
  TRY: "🇹🇷",
  PLN: "🇵🇱",
  RON: "🇷🇴",
  CZK: "🇨🇿",
  HUF: "🇭🇺",
  SEK: "🇸🇪",
  DKK: "🇩🇰",
  NOK: "🇳🇴",
  JPY: "🇯🇵",
  CNY: "🇨🇳",
  CAD: "🇨🇦",
  AUD: "🇦🇺",
};
/* Flaggen als Bilder (flag-icons, MIT-Lizenz, © Panayiotis Lipiridis) */
const FLAG_SVG = {
  de: '<svg xmlns="http://www.w3.org/2000/svg" id="flag-icons-de" viewBox="0 0 512 512"> <path fill="#fc0" d="M0 341.3h512V512H0z"/> <path fill="#000001" d="M0 0h512v170.7H0z"/> <path fill="red" d="M0 170.7h512v170.6H0z"/> </svg>',
  gb: '<svg xmlns="http://www.w3.org/2000/svg" id="flag-icons-gb" viewBox="0 0 512 512"> <path fill="#012169" d="M0 0h512v512H0z"/> <path fill="#FFF" d="M512 0v64L322 256l190 187v69h-67L254 324 68 512H0v-68l186-187L0 74V0h62l192 188L440 0z"/> <path fill="#C8102E" d="m184 324 11 34L42 512H0v-3zm124-12 54 8 150 147v45zM512 0 320 196l-4-44L466 0zM0 1l193 189-59-8L0 49z"/> <path fill="#FFF" d="M176 0v512h160V0zM0 176v160h512V176z"/> <path fill="#C8102E" d="M0 208v96h512v-96zM208 0v512h96V0z"/> </svg>',
  tr: '<svg xmlns="http://www.w3.org/2000/svg" id="flag-icons-tr" viewBox="0 0 512 512"> <g fill-rule="evenodd"> <path fill="#e30a17" d="M0 0h512v512H0z"/> <path fill="#fff" d="M348.8 264c0 70.6-58.3 127.9-130.1 127.9s-130.1-57.3-130.1-128 58.2-127.8 130-127.8S348.9 193.3 348.9 264z"/> <path fill="#e30a17" d="M355.3 264c0 56.5-46.6 102.3-104.1 102.3s-104-45.8-104-102.3 46.5-102.3 104-102.3 104 45.8 104 102.3z"/> <path fill="#fff" d="m374.1 204.2-1 47.3-44.2 12 43.5 15.5-1 43.3 28.3-33.8 42.9 14.8-24.8-36.3 30.2-36.1-46.4 12.8z"/> </g> </svg>',
  ru: '<svg xmlns="http://www.w3.org/2000/svg" id="flag-icons-ru" viewBox="0 0 512 512"> <path fill="#fff" d="M0 0h512v170.7H0z"/> <path fill="#0039a6" d="M0 170.7h512v170.6H0z"/> <path fill="#d52b1e" d="M0 341.3h512V512H0z"/> </svg>',
  ua: '<svg xmlns="http://www.w3.org/2000/svg" id="flag-icons-ua" viewBox="0 0 512 512"> <g fill-rule="evenodd" stroke-width="1pt"> <path fill="gold" d="M0 0h512v512H0z"/> <path fill="#0057b8" d="M0 0h512v256H0z"/> </g> </svg>',
  pl: '<svg xmlns="http://www.w3.org/2000/svg" id="flag-icons-pl" viewBox="0 0 512 512"> <g fill-rule="evenodd"> <path fill="#fff" d="M512 512H0V0h512z"/> <path fill="#dc143c" d="M512 512H0V256h512z"/> </g> </svg>',
  sa: '<svg xmlns="http://www.w3.org/2000/svg" id="flag-icons-sa" viewBox="0 0 512 512"> <defs> <clipPath id="sa-a"> <path fill-opacity=".7" d="M124 0h496v496H124z"/> </clipPath> </defs> <g fill-rule="evenodd" clip-path="url(#sa-a)" transform="translate(-128)scale(1.0321)"> <path fill="#165d31" d="M0 0h744v496H0z"/> <path fill="#fff" d="M187.5 140.6c-.8 11.6-1.9 32 8 34.1 11.9 1.1 5.3-20.2 9.6-24 .9-2 2.4-2 2.5.5v18c-.1 6 3.7 7.6 6.7 8.9 3.2-.3 5.2-.2 6.5 2.8l1.4 31.3s7.3 2 7.6-17.6c.4-11.5-2.3-21.2-.7-23.4 0-2.2 2.8-2.3 4.8-1.3 3.1 2.2 4.5 5 9.3 3.8 7.4-2 11.8-5.6 12-11.2a51 51 0 0 0-3.4-16.1c.3-1-1.5-3.5-1.1-4.5 1.3 2 3.3 1.9 3.8 0-1.3-4.2-3.2-8.1-6.4-9.8-2.6-2.3-6.4-1.8-7.8 3a26 26 0 0 0 6 17.3 17 17 0 0 1 1.5 8.7q-3.2 1.8-6-1.1s-5.9-4.5-5.9-5.4c1.6-10 .4-11.1-.5-13.9-.6-3.8-2.4-5-3.9-7.6-1.5-1.6-3.4-1.6-4.4 0-2.6 4.5-1.4 14.1.5 18.4 1.4 4 3.4 6.5 2.4 6.5-.8 2.2-2.4 1.7-3.6-.9a61 61 0 0 1-2.1-16.9c-.5-4.5-1-14-4-16.4-1.8-2.4-4.5-1.2-5.4 1a80 80 0 0 0 .3 13c2 7 2.6 13.4 3.6 20.7.3 9.8-5.7 4.3-5.4-.6 1.4-6.3 1-16.3-.2-18.8-1-2.5-2.1-3.1-4.4-2.7-2-.2-6.7 5-8 13.8 0 0-1.2 4.5-1.7 8.4-.7 4.5-3.6 7.7-5.7-.6-1.8-6-2.9-20.9-5.9-17.4"/> <path fill="#fff" d="m219.9 188.2-31 14.9c.3-7 14.7-19.8 24.5-20 6.4.2 4.8 2.5 6.5 5z"/> <path fill="#fff" d="M214.5 197.9c-16.4 42.1 38.2 48 44.3 1.7.6-1.9 3-3.8 3.3-.7-1.3 42-42.2 44.8-49.2 31.6-1.7-3-2.2-10-2.4-14.2-1-8.2-5.4-5-6 3.2-.7 4.5-.6 5.8-.6 10.2 2.2 33 55 18.8 63.6-8.5 4.5-15.1-.8-26.3 1.7-26.3 5.2 5.7 12.6.8 14.2-1.2.7-1 2.4-1.6 3.6-.3 4 3 11.3 1.5 12.8-3.6q1.3-7.6 1.7-15.7c-3.3 1-5.8 1.7-6 3l-.7 4.6c-.3 1.4-3.2 1.5-3.3-.4-1.3-5.7-6.5-6.5-9.7 2.4-2.1 1.8-6 2-6.4-.5.5-6-1.9-6.8-6.7-4l-4.7-35c2 0 3.9 1.4 5.7-.9-2-6.3-6.3-19-8.6-20-1.2-1.4-2.1-.5-3.6-.2-2.6.8-5 3-4.2 7.3l8 50.2c.4 2.1-1.4 5-3.7 4.7-3.9-2.7-4.9-8-11.5-7.8-4.9 0-10.4 5.3-11 10.4-.9 4-1.2 8.4 0 11.9 3.3 4 7.4 3.7 11 2.7 2.9-1.2 5.3-4.1 6.4-3.4.7.9.1 10.5-13.9 18-8.4 3.8-15.2 4.6-18.8-2.3-2.2-4.3.2-20.7-5.3-17z"/> <path fill="#fff" d="M283.8 155c3.3-1.1 18.8-19 18.8-19l-2.3-1.8q-1.3-1.2 0-2.3c3.8-2.2 2.6-7.2.6-9.4a9 9 0 0 0-8.4 0c-2.7 2.7-3.3 6.8-1.2 9.4 2 1 4.2 3 2.8 4.2-6.4 6.8-23.8 18.5-21.8 19 .4.5 11.2.5 11.5 0zm-93.9 63c-5.8 9.3-6.3 23.2-3 27.3 1.6 2 4.4 2.8 6.5 2.2 3.7-1.6 5.3-9 4.4-11.7q-1.7-3-3.4-.6c-2.6 5.2-3.7 1.6-3.9-1.3-.4-5.5.1-10.7.7-14.7s0-2.9-1.3-1.2M439 203c-5.6-12.1-13.4-24.1-15.9-28.7a541 541 0 0 0-24-34.9c-6-7.2 9.9 3-2-11.3-4.5-4-4.8-4.1-8.6-7.3-1.9-1.4-6.5-3.8-7.3.2a24 24 0 0 0 .4 8.6c.4 2 3.3 5.3 4.8 7.3 19 25.5 35.9 51.4 52.1 83.8 2.6-1.2 2-15.6.5-17.7"/> <path fill="#fff" d="M414.3 243.7c-1.1 1.3 2.7 6.6 7.7 6.6 8.4-1 15.7-5.7 22.5-18 1.8-3 5-9 5.1-13.9.7-28-1.4-49.8-5.6-70-.2-2 0-4.4.3-5 .5-.6 2.3 0 3.3-1.5 1.4-1.5-3.8-13.6-6.7-18.2-1.1-2.1-1.5-3.5-3.2.2-1.9 3-3 8.3-3 13.2 4 27.6 5.3 51.8 7.9 79.3.2 2.7-.2 6.6-2 8.1a78 78 0 0 1-26.3 19.2m112.8-.1c-6 3.4-6 7.4-1.1 7.6 8.3-1 18.2-1.7 25-12 1.8-2.9 4-10.7 4.1-15.4.6-28-.4-49-4.6-69.2-.2-2-1.1-6.5-.8-7.1.6-1.4 3.3.1 4.3-1.5 1.4-1.4-7-12.3-10-17-1.1-2-1.5-3.4-3.2.3-1.9 3-2.5 8.4-1.8 13.1 4.5 30 7.8 52.5 8.4 79-.3 2.6-.4 4-1.6 7.1-2.6 3.4-5.5 7.6-8.3 9.6-2.7 2-8.5 4-10.4 5.5"/> <path fill="#fff" d="M531.6 216.7v-18.3a33 33 0 0 0-3-13.2c-1.8-4-.7-7.1-1.5-11.4-.8-4.2-.6-10.6-1.8-15.6-.4-2-1.4-8.2-1-8.8.4-1.4 2.3 0 3.2-1.6 1.4-1.5-4.8-17.5-7.9-22q-1.7-3-5.7 2c-2.3 2.1-1.4 7.1-.5 11.8 6 31.3 10.4 59.7 9.5 89.4-.3 2.6 8.8-7.5 8.7-12.3m-44.3-38.8c-3.7 0-11.6-7.4-14-11.6a8 8 0 0 1 .5-6.2c1.4-1 3.6-2 5.2-1 0 0 1.6 2.4 1.3 2.7 2 1 3 .4 3.2-.5.1-1.4-.7-2.3-.7-4 1-4.3 6-5 7.8-2.2 1.4 1.7 1.9 5.3 2.1 7.8 0 1.2-2-.3-3.2 0-1.1.4-1.4 1.7-1.5 2.9-.2 3.2-.6 8.3-.7 12zm-69.6 46.6c1-9.6-.3-26.5-.4-32.1-.4-13.3-2.6-39-3.6-43.2-1.2-8.1 3.3.9 2.7-3.8-1.5-8-6-13.6-11.2-21-1.7-2.3-1.6-2.8-4.3.6-2.8 6.6-.3 11.1.4 16.2 3.8 16.7 6 32 7 47.2a381 381 0 0 1 .4 47.5c2.9.2 7.5-4.6 9-11.4"/> <path fill="#fff" d="M544.5 209.2c-6.7-11.1-16.7-23.2-19.4-27.7a639 639 0 0 0-28.2-36.7c-8.3-8.7 3.8-1.4-1.6-8.1-4.6-5-6-6.6-9.8-9.6-2-1.3-3.2-3.7-3.8.4-.3 3.6-.5 7.8-.3 10.9 0 1.7 1.8 4.8 3.3 6.7 20 24.7 42 50 59.7 81.7 2.5-1.4 1.7-15.6 0-17.6z"/> <path fill="#165d31" d="M242.8 188.6c-.5.9-1.6 2-1.2 3q1 1.4 2.6 1.4c1 0 2.6.2 2.9-.4a3 3 0 0 0 .5-3.2c-1-2.8-4.2-1.8-4.8-.8"/> <path fill="#fff" d="M467.2 351.3c8.9.3 14.7.4 22.6 1.3l9.2-1c10.3-1 10.8 14.7 10.8 14.7-.1 9.2-3.7 9.6-8.2 10.6-2.6.4-4-1.5-5.3-3.5q-2.5 1-6.9.4l-11-.5c-4-.3-6.1.5-10 .1-.9 1.3-2 3-4.3 2.5-2-.2-4.4-5.9-3.7-10.1 1.4-3.1 1-2.1.9-3.5-36.4-.9-73-2.5-108.7-2-28 0-55.5 1.2-83 2.4-14.7-.2-26-2.6-33.7-14 .7 0 37.5 2.2 48.2 1.5 20-.3 38.1-1.9 58.4-2.5 40 .7 79.5.7 119.5 3.5-3.8-2.6-4-8.8 2-10.3.4-.3.7 3 1.6 3 4.6-.3 2.6 6 1.6 7.4M306.8 131c-6 17.3 3.4 36.2 10 34.4 4.8 2 7.8-7.1 9.8-17 1.3-2.8 2.3-3.1 3-1.7-.2 13.2 1 16.1 4.4 20.1a11 11 0 0 0 14.3.3l5.9-6q2-2 4.9-.2c1.8 1.7 1.5 4.5 5.4 6.5 3.2 1.3 10.2.3 11.8-2.5 2.1-3.7 2.7-5 3.7-6.4 1.5-2 4.1-1.2 4.1-.5-.2 1.1-1.7 2.3-.7 4.3 1.8 1.4 2.3.5 3.4.2 3.8-1.8 6.7-10.2 6.7-10.2.1-3-1.6-2.8-2.7-2.2l-3 2.1c-2 .3-5.6 1.5-7.4-1.3-1.8-3.3-1.9-8-3.3-11.4 0-.2-2.4-5.3-.1-5.6 1.1.2 3.6.8 4-1.2 1.2-2-2.6-7.7-5.2-10.6-2.2-2.4-5.4-2.7-8.4-.2-2 2-1.8 4-2.2 6.1a10 10 0 0 0 2 8.4c2.1 4.1 6 9.4 4.7 17 0 0-2.3 3.5-6.2 3-1.6-.4-4.2-1-5.6-11.4-1-7.9.2-18.9-3.1-24-1.2-3.2-2-6.2-5-.8-.8 2-4.2 5.2-1.8 11.8a35 35 0 0 1 2 18.3c-1.4 2.1-1.7 2.9-3.6 5-2.5 2.7-5.3 2-7.4 1-2-1.3-3.6-2-4.5-6.3.2-6.8.5-17.9-.7-20.3-1.8-3.6-4.8-2.3-6.1-1.2a46 46 0 0 0-11.2 22.9c-1.7 5.5-3.5 4-4.8 1.7-3.1-3-3.3-25.9-7.1-22.1"/> <path fill="#fff" d="M325 168.7c2.8-2 1.5-3.3 5.6.8a70 70 0 0 1 9 30.3c-.3 2.5 1.5 4 2.3 3.5.4-5.8 14.7-14 27.7-15.2 2-.4 1-4.2 1.3-6.2-.8-7.2 4-13.8 10.9-14.3 9.2 1.4 12.3 6.3 12.5 13.8-1 14.5-16.1 17-24.6 18-1.3.6-1.8 1.2 0 1.9l35.5.1 1.8 1c.2 1-.5.2-2 2.5s-3.4 7.7-3.5 11.2a173 173 0 0 1-32.6 6.2q-5.9 3-5 7.5c1.3 3.3 9.9 6.5 9.9 6.7 1.6 1 3.5 3.4-.5 8.2-17.3-.7-30.7-8.1-35.3-18.5-1.4-1-3 0-3.9 1.4a55 55 0 0 1-24.9 20.7c-6.9 1.7-13.9-1-17.2-5.5-2.2-2.6-2.1-5.4-3-6-3.7 1.6-35.6 15.2-31.5 8.9 7.7-8.4 21.2-14.5 33-22.7 1-2.7 2.5-12 7.2-15 .2 0-.8 5.4-.7 7.7q-.2 2.9.3 2.1c.8-.5 15.2-11.8 16.3-15.3 1.4-2 .4-7 .4-7.2-2.6-7-6.4-7.5-7.8-11-1.3-4.6-.7-9.8 1.9-11.3q3.6-3.1 7.6.4c3 2.6 5.5 7.7 6.3 11.5-.5 1.5-3.8-1-5-.2q2.8 3 3.7 7.5c2 8 1.3 11-.5 16.2-6.4 13.4-14.6 17.5-21.8 22.4-.2.1-.3 3.5 2.4 5.3 1 1 4.7 1.4 9 0a53 53 0 0 0 21.7-22.6c1.3-7.2-.5-14.8-2.4-21.4a253 253 0 0 1-6-16c-.2-4 .1-5.4 2-7.4zm-92.8-37.4c4 1.9 11.7 1 11.4-5.5l-.2-3.1c-.8-2-3.1-1.5-3.6.6-.2.6.3 1.7-.3 2-.4.3-1.7.1-1.6-1.7q-.1-1-.7-1.6-.3-.2-.9-.2c-.6 0-.5.2-.9.7l-.3 1.5q0 1-.8 1c-.5 0-.4 0-.8-.2q-.5-.3-.6-.9l-.2-1.6-1-.6c-2.3 0-2.4 2.6-2.3 3.6-.2.1-.3 4.7 2.8 6"/> <path fill="#fff" d="M351.8 181.9c4 2 13.8.8 11.4-5.5l-.2-3c-.8-2-3-1.5-3.6.5-.1.6.3 1.7-.3 2-.3.4-1.6.2-1.6-1.6q-.1-1-.7-1.6-.2-.2-.9-.2c-.7 0-.5.1-.8.6l-.3 1.5q-.2 1-.8 1c-.6 0-.4 0-.9-.2q-.5-.3-.6-.9 0-1-.2-1.6-.3-.4-1-.5c-2.2 0-2.4 2.5-2.3 3.5-.1.2-.2 4.7 2.8 6m69.8-21c4 2 11.7 1.1 11.4-5.4l-.2-3.1c-.8-2-3.1-1.5-3.6.5-.2.7.3 1.7-.3 2-.4.4-1.7.2-1.6-1.6q-.2-1-.7-1.6-.3-.2-1-.2t-.8.7l-.3 1.5q0 .9-.8 1c-.5 0-.4 0-.8-.3q-.5-.2-.6-.8 0-1-.3-1.7-.3-.4-1-.5c-2.2 0-2.3 2.6-2.2 3.5-.2.2-.3 4.8 2.8 6m36 52.7c-7 8-3.9 21.2-2.3 24 2.4 4.8 4.2 7.8 8.8 10.1 4.2 3 7.4 1.1 9.2-1 4.2-4.3 4.2-15.4 6.2-17.6 1.4-4 4.8-3.3 6.5-1.5a16 16 0 0 0 6 5.1q6 5.3 13.1 1c3.1-1.8 5.2-4.1 7-8.6 2-5.5 1-30.7.5-45.6-.1-1.2-4-20.6-4-20.8s-.6-9.9-1-12.2c0-.9-.3-1.2.7-1 1 .8 1.2.9 1.8 1.2 1 .2 2-1.6 1.4-3.3l-9.8-18c-.7-.7-1.7-1.5-3 .3a7 7 0 0 0-2.4 5.3l1.3 12.9 4 21.8c1.2 15.6 1.5 28.3 2.7 44-.2 6.5-2.2 12.3-4.2 13 0 0-2.9 1.8-4.8 0-1.5-.7-7.2-9.6-7.2-9.6-3-2.7-4.8-2-7 0-5.6 5.5-8.2 15.9-12.1 23-1 1.6-3.9 3-7-.1-8-11-3.3-26.4-4.3-22.4zm-34.2-90.9c3.7 1.5 6.2 9 5.4 12.6-.7 4.4-2.7 9.3-4 8.6-1.6-.5 1-4.4-.5-8.5-.8-2.6-5.8-7.5-5.3-8.9-1-3 2.2-4.3 4.4-3.8"/> <path fill="#fff" d="M469.5 218c.7-9-.6-14.4-.8-19.6s-6-45-7-49c-1.5-7.5 5.5-1 4.7-5.4-2.4-5.5-8.3-13.5-10.2-18.2-1.1-2-.7-3.9-3.2-.6a41 41 0 0 0-2.2 18.6c6 31.3 12.1 57.3 11.1 87.1 2.9 0 6.2-6.5 7.6-13zm62.4-82.7c3.4 1.7 5.3 11 5 13.6-.7 4.9-2.5 10-3.8 9.4s.3-7.2-.4-9.2c-.7-2.9-5.2-8.1-4.8-9.7-.9-3.2 2-4.6 4-4zm-247.7 65.8c3.2 1.3 5 8 4.7 10-.6 3.6-2.3 7.4-3.5 7s.2-5.3-.4-6.8c-.3-3.7-4.7-5.6-4.6-7.1-.8-3 1.9-3.5 3.8-3z"/> <path fill="#165d31" d="M361.3 211.4c4 .2 6.1 3.5 2.3 4.8s-7.5 2.3-7.5 7.8c1.4 7.7-2 5-4 4-2.3-1.7-8.9-5.7-9.8-14.5-.1-2 1.5-3.8 4.1-3.8 4 1 9.8 1.2 14.8 1.7z"/> <path fill="#fff" d="M199 120.5c4.7 1.4 5 8.3 4.6 10.4-.6 3.7-2.3 7.6-3.5 7.1s0-5.4-.6-7c-.7-2.2-4.7-6.2-4.2-7.4-1-2.4 1.8-3.5 3.7-3zm92.9 32.6c-3.6 2-5 7.8-2.8 11.2 2.1 3 5.4 1.9 5.9 1.9 3.5.4 5.6-6.7 5.6-6.7s.1-2-4 1.8c-1.8.3-2-.3-2.5-1.3a9 9 0 0 1 .6-5.6c.6-1.7-.8-2.5-2.8-1.3m27-35.3c-1.7 1.3-5.4 5-5.5 9.3 0 2.4-.5 2.4 1 4 1.2 1.6 2.4 1.5 4.7.3a5 5 0 0 0 2.2-3.3c.6-2.8-2.9 1.3-3.3-1.8-.8-2.8 1.4-4 3.5-6.8 0-1.9 0-3.2-2.5-1.7zm21.9 4a57 57 0 0 0-1.6 10.7c-.6 2.7 2.8 3.8 4.4.3 2.3-6.3 2.3-9 2.5-11.7-.7-4-3.5-4-5.3.6zm137.5 69.9c.4-.5 19.4-14 19.4-14 1.9-.6 1.5 7 .6 7a75 75 0 0 1-20 13.9c-1 .6-1.9-5.2 0-7zm17.2-.1c3.3 1.6 4.7 11.4 4.3 14 .1 5.2-3.2 9.3-4.5 8.6-1.4-.6.1-6.4-.5-8.4-.7-2.9-3.6-8.3-3.1-9.8-1-3.3 1.8-5 3.8-4.4m-112.4 42c1.3-2 5.3-4.7 5.4-4.7 1.9-1 3.7.7 3.6.6.3 1.9-1.2 3.6-.7 6.1.4 1 .7 2.1 2.6 1.7 3-2.3 5.8-2.5 8.8-2.7 2.3.2 2.3 4 .9 4.1-5.6 1.2-8 2.7-12 4.2-1.9 1.1-3.5-.3-3.5-.4s-1-1.1-.3-3.6q.1-3-2.3-2.8c-1.3.6-2.4 1-3-.4q-.6-1.3.5-2.1m132.3 5.2c.8 1 1.4 2 0 3.7l-3.6 3c-.7 1.2-1 2.8.9 3.3 3.5 1 11.7-4.3 11.7-4.4 1.3-1 .9-2.9.7-2.9-.7-.9-2.5-.4-3.6-.5-.6 0-2.4-.3-1.6-1.9.8-1 1-1.6 1.5-2.9q1-1.7-1.9-2.7c-2-.3-2.8-.1-5 0-1.3.3-1.7.8-2 2.3.2 2.2 1.5 2.1 3 3z"/> <path fill="#165d31" d="M383.8 183.8c-.5 1-2.3.9-4 0s-2.5-2.5-2-3.4 2.3-.9 4 0 2.5 2.5 2 3.4M297.5 132c-1 .3-2.3-.6-2.9-2s-.3-2.5.7-2.8 2.3.7 2.9 2 .3 2.6-.7 2.8m170.7 231.3c9 .4 17.6.1 26.6.6 1.7 1.3.5 4.8-.6 4.5l-7.6-.2c0-2.9-7.5-2.4-7.2.1-4 .5-7.6-.1-11.6-.3-1.2-1.5-1-4.1.4-4.7"/> </g> </svg>',
  ro: '<svg xmlns="http://www.w3.org/2000/svg" id="flag-icons-ro" viewBox="0 0 512 512"> <g fill-rule="evenodd" stroke-width="1pt"> <path fill="#00319c" d="M0 0h170.7v512H0z"/> <path fill="#ffde00" d="M170.7 0h170.6v512H170.7z"/> <path fill="#de2110" d="M341.3 0H512v512H341.3z"/> </g> </svg>',
  us: '<svg xmlns="http://www.w3.org/2000/svg" id="flag-icons-us" viewBox="0 0 512 512"> <path fill="#bd3d44" d="M0 0h512v512H0"/> <path stroke="#fff" stroke-width="40" d="M0 58h512M0 137h512M0 216h512M0 295h512M0 374h512M0 453h512"/> <path fill="#192f5d" d="M0 0h390v275H0z"/> <marker id="us-a" markerHeight="30" markerWidth="30"> <path fill="#fff" d="m15 0 9.3 28.6L0 11h30L5.7 28.6"/> </marker> <path fill="none" marker-mid="url(#us-a)" d="m0 0 18 11h65 65 65 65 66L51 39h65 65 65 65L18 66h65 65 65 65 66L51 94h65 65 65 65L18 121h65 65 65 65 66L51 149h65 65 65 65L18 177h65 65 65 65 66L51 205h65 65 65 65L18 232h65 65 65 65 66z"/> </svg>',
  ch: '<svg xmlns="http://www.w3.org/2000/svg" id="flag-icons-ch" viewBox="0 0 512 512"> <g fill-rule="evenodd" stroke-width="1pt"> <path fill="red" d="M0 0h512v512H0z"/> <g fill="#fff"> <path d="M96 208h320v96H96z"/> <path d="M208 96h96v320h-96z"/> </g> </g> </svg>',
  cz: '<svg xmlns="http://www.w3.org/2000/svg" id="flag-icons-cz" viewBox="0 0 512 512"> <path fill="#fff" d="M0 0h512v256H0z"/> <path fill="#d7141a" d="M0 256h512v256H0z"/> <path fill="#11457e" d="M300 256 0 56v400z"/> </svg>',
  hu: '<svg xmlns="http://www.w3.org/2000/svg" id="flag-icons-hu" viewBox="0 0 512 512"> <g fill-rule="evenodd"> <path fill="#fff" d="M512 512H0V0h512z"/> <path fill="#388d00" d="M512 512H0V341.3h512z"/> <path fill="#d43516" d="M512 170.8H0V.1h512z"/> </g> </svg>',
  se: '<svg xmlns="http://www.w3.org/2000/svg" id="flag-icons-se" viewBox="0 0 512 512"> <path fill="#005293" d="M0 0h512v512H0z"/> <path fill="#fecb00" d="M134 0v204.8H0v102.4h134V512h102.4V307.2H512V204.8H236.4V0z"/> </svg>',
  dk: '<svg xmlns="http://www.w3.org/2000/svg" id="flag-icons-dk" viewBox="0 0 512 512"> <path fill="#c8102e" d="M0 0h512.1v512H0z"/> <path fill="#fff" d="M144 0h73.1v512H144z"/> <path fill="#fff" d="M0 219.4h512.1v73.2H0z"/> </svg>',
  no: '<svg xmlns="http://www.w3.org/2000/svg" id="flag-icons-no" viewBox="0 0 512 512"> <path fill="#ed2939" d="M0 0h512v512H0z"/> <path fill="#fff" d="M128 0h128v512H128z"/> <path fill="#fff" d="M0 192h512v128H0z"/> <path fill="#002664" d="M160 0h64v512h-64z"/> <path fill="#002664" d="M0 224h512v64H0z"/> </svg>',
  jp: '<svg xmlns="http://www.w3.org/2000/svg" id="flag-icons-jp" viewBox="0 0 512 512"> <defs> <clipPath id="jp-a"> <path fill-opacity=".7" d="M177.2 0h708.6v708.7H177.2z"/> </clipPath> </defs> <g fill-rule="evenodd" stroke-width="1pt" clip-path="url(#jp-a)" transform="translate(-128)scale(.72249)"> <path fill="#fff" d="M0 0h1063v708.7H0z"/> <circle cx="523.1" cy="344.1" r="194.9" fill="#bc002d" transform="translate(-59.7 -34.5)scale(1.1302)"/> </g> </svg>',
  cn: '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" id="flag-icons-cn" viewBox="0 0 512 512"> <defs> <path id="cn-a" fill="#ff0" d="M1-.3-.7.8 0-1 .6.8-1-.3z"/> </defs> <path fill="#ee1c25" d="M0 0h512v512H0z"/> <use xlink:href="#cn-a" width="30" height="20" transform="translate(128 128)scale(76.8)"/> <use xlink:href="#cn-a" width="30" height="20" transform="rotate(-121 142.6 -47)scale(25.5827)"/> <use xlink:href="#cn-a" width="30" height="20" transform="rotate(-98.1 198 -82)scale(25.6)"/> <use xlink:href="#cn-a" width="30" height="20" transform="rotate(-74 272.4 -114)scale(25.6137)"/> <use xlink:href="#cn-a" width="30" height="20" transform="matrix(16 -19.968 19.968 16 256 230.4)"/> </svg>',
  ca: '<svg xmlns="http://www.w3.org/2000/svg" id="flag-icons-ca" viewBox="0 0 512 512"> <path fill="#fff" d="M81.1 0h362.3v512H81.1z"/> <path fill="#d52b1e" d="M-100 0H81.1v512H-100zm543.4 0h181.1v512H443.4zM135.3 247.4l-14 4.8 65.4 57.5c5 14.8-1.7 19.1-6 26.9l71-9-1.8 71.5 14.8-.5-3.3-70.9 71.2 8.4c-4.4-9.3-8.3-14.2-4.3-29l65.4-54.5-11.4-4.1c-9.4-7.3 4-34.8 6-52.2 0 0-38.1 13.1-40.6 6.2l-9.9-18.5-34.6 38c-3.8 1-5.4-.6-6.3-3.8l16-79.7-25.4 14.3q-3.3 1.3-5.6-2.4l-24.5-49-25.2 50.9q-3 2.7-5.4.8l-24.2-13.6 14.5 79.2c-1.1 3-3.9 4-7.1 2.3l-33.3-37.8c-4.3 7-7.3 18.4-13 21-5.7 2.3-25-4.9-37.9-7.7 4.4 15.9 18.2 42.3 9.5 51z"/> </svg>',
  au: '<svg xmlns="http://www.w3.org/2000/svg" id="flag-icons-au" viewBox="0 0 512 512"> <path fill="#00008B" d="M0 0h512v512H0z"/> <path fill="#fff" d="M256 0v32l-95 96 95 93.5V256h-33.5L127 162l-93 94H0v-34l93-93.5L0 37V0h31l96 94 93-94z"/> <path fill="red" d="m92 162 5.5 17L21 256H0v-1.5zm62-6 27 4 75 73.5V256zM256 0l-96 98-2-22 75-76zM0 .5 96.5 95 67 91 0 24.5z"/> <path fill="#fff" d="M88 0v256h80V0zM0 88v80h256V88z"/> <path fill="red" d="M0 104v48h256v-48zM104 0v256h48V0z"/> <path fill="#fff" d="m202 402.8-45.8 5.4 4.6 45.9-32.8-32.4-33 32.2 4.9-45.9-45.8-5.8L93 377.4 69 338l43.6 15 15.8-43.4 15.5 43.5 43.7-14.7-24.3 39.2 38.8 25.1Zm222.7 8-20.5 2.6 2.2 20.5-14.8-14.4-14.7 14.5 2-20.5-20.5-2.4 17.3-11.2-10.9-17.5 19.6 6.5 6.9-19.5 7.1 19.4 19.5-6.7-10.7 17.6zM415 293.6l2.7-13-9.8-9 13.2-1.5 5.5-12.1 5.5 12.1 13.2 1.5-9.8 9 2.7 13-11.6-6.6zm-84.1-60-20.3 2.2 1.8 20.3-14.4-14.5-14.8 14.1 2.4-20.3-20.2-2.7 17.3-10.8-10.5-17.5 19.3 6.8 7.2-19.1 6.7 19.3 19.4-6.3-10.9 17.3zm175.8-32.8-20.9 2.7 2.3 20.9-15.1-14.7-15 14.8 2.1-21-20.9-2.4 17.7-11.5-11.1-17.9 20 6.7 7-19.8 7.2 19.8 19.9-6.9-11 18zm-82.1-83.5-20.7 2.3 1.9 20.8-14.7-14.8L376 140l2.4-20.7-20.7-2.8 17.7-11-10.7-17.9 19.7 6.9 7.3-19.5 6.8 19.7 19.8-6.5-11.1 17.6z"/> </svg>',
  eu: '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" id="flag-icons-eu" viewBox="0 0 512 512"> <defs> <g id="eu-d"> <g id="eu-b"> <path id="eu-a" d="m0-1-.3 1 .5.1z"/> <use xlink:href="#eu-a" transform="scale(-1 1)"/> </g> <g id="eu-c"> <use xlink:href="#eu-b" transform="rotate(72)"/> <use xlink:href="#eu-b" transform="rotate(144)"/> </g> <use xlink:href="#eu-c" transform="scale(-1 1)"/> </g> </defs> <path fill="#039" d="M0 0h512v512H0z"/> <g fill="#fc0" transform="translate(256 258.4)scale(25.28395)"> <use xlink:href="#eu-d" width="100%" height="100%" y="-6"/> <use xlink:href="#eu-d" width="100%" height="100%" y="6"/> <g id="eu-e"> <use xlink:href="#eu-d" width="100%" height="100%" x="-6"/> <use xlink:href="#eu-d" width="100%" height="100%" transform="rotate(-144 -2.3 -2.1)"/> <use xlink:href="#eu-d" width="100%" height="100%" transform="rotate(144 -2.1 -2.3)"/> <use xlink:href="#eu-d" width="100%" height="100%" transform="rotate(72 -4.7 -2)"/> <use xlink:href="#eu-d" width="100%" height="100%" transform="rotate(72 -5 .5)"/> </g> <use xlink:href="#eu-e" width="100%" height="100%" transform="scale(-1 1)"/> </g> </svg>',
};
const LANG_CC = {
    de: "de",
    en: "gb",
    tr: "tr",
    ru: "ru",
    uk: "ua",
    pl: "pl",
    ar: "sa",
    ro: "ro",
  },
  CUR_CC = {
    EUR: "eu",
    USD: "us",
    GBP: "gb",
    CHF: "ch",
    TRY: "tr",
    PLN: "pl",
    RON: "ro",
    CZK: "cz",
    HUF: "hu",
    SEK: "se",
    DKK: "dk",
    NOK: "no",
    JPY: "jp",
    CNY: "cn",
    CAD: "ca",
    AUD: "au",
  };
const flagEl = (cc) =>
  FLAG_SVG[cc]
    ? `<img class="flagi" src="data:image/svg+xml,${encodeURIComponent(FLAG_SVG[cc])}" alt="" aria-hidden="true">`
    : "🌐";
function renderSprache() {
  const el = $("spracheEd");
  if (!el) return;
  const fx = fxRates(),
    c2 = store.settings.cur2 || "";
  const u =
    ui.fx ||
    (ui.fx = {
      a: "100",
      from: "EUR",
      to: c2 || "USD",
    });
  const opts = (sel) =>
    ["EUR", ...FX_CODES]
      .map((c) => `<option value="${c}" ${c === sel ? "selected" : ""}>${geraetRuf("waehrungFlagge", c) || ""} ${c}</option>`)
      .join("");
  const all = ui.fxAll,
    list = all ? FX_CODES : FX_CODES.slice(0, 5);
  el.innerHTML = `<div class="section-title" style="font-size:14px;margin-top:0">Sprache</div>
    <div class="lgt">${LANGS.map(([k, n]) => `<button class="${k === LANG ? "on" : ""}" data-lang="${k}" data-noi18n lang="${k}" aria-pressed="${k === LANG}"><span class="fl" aria-hidden="true">${flagEl(LANG_CC[k])}</span>${n}</button>`).join("")}</div>
    <p class="small muted" style="margin:8px 0 0">Steuern, Gesetze und Rechtstexte bleiben deutsch – übersetzt wird nur die Anzeige.</p>
    <div class="section-title" style="font-size:14px">Zweite Währung auf der Übersicht</div>
    <div class="fxchips" data-noswipe role="radiogroup" aria-label="Zweite Währung"><button class="${!c2 ? "on" : ""}" data-cur2="" role="radio" aria-checked="${!c2}">Keine</button>${FX_CODES.map((c) => `<button class="${c === c2 ? "on" : ""}" data-cur2="${c}" role="radio" aria-checked="${c === c2}" title="${escHtml(curName(c))}" data-noi18n>${flagEl(CUR_CC[c])} ${c}</button>`).join("")}</div>
    <p class="small muted" style="margin:2px 0 0">Hauptwährung bleibt Euro (€) – Beträge werden in Euro gespeichert, dein Kontostand erscheint zusätzlich umgerechnet.</p>
    <div class="section-title" style="font-size:14px">Umrechner</div>
    <div class="fxcard"><div class="r"><input id="fxA" inputmode="decimal" autocomplete="off" aria-label="Betrag" value="${escHtml(u.a)}"><select id="fxFrom" aria-label="Von Währung">${opts(u.from)}</select></div>
      <button class="sw" data-fxswap aria-label="Währungen tauschen">⇅</button>
      <div class="r"><span class="out" id="fxRes">${fxResult()}</span><select id="fxTo" aria-label="In Währung">${opts(u.to)}</select></div>
      <div class="meta" id="fxMeta">${fxMeta()}</div></div>
    <div class="section-title" style="font-size:14px">Kurse · 1 € =</div>
    <div class="fxrl">${list.map((c) => `<div><span class="fl" aria-hidden="true">${flagEl(CUR_CC[c])}</span><span>${escHtml(curName(c))}<span class="c" data-noi18n>${c}</span></span><b>${escHtml(String(fx.r[c] ?? "–").replace(".", ","))}</b></div>`).join("")}</div>
    <div class="row-btns" style="justify-content:flex-start;margin-top:10px"><button class="btn" data-fxall>${all ? "Weniger anzeigen" : `Alle ${FX_CODES.length} Kurse`}</button><button class="btn" data-fxload>Kurse aktualisieren</button></div>
    <p class="small muted" style="margin:6px 0 0">${
      fx.approx
        ? "Ungefähre Kurse – noch nicht aktualisiert."
        : `EZB-Kurse vom ${escHtml(
            fxDate(fx.d, {
              day: "numeric",
              month: "long",
              year: "numeric",
            })
          )}.`
    } Beim Aktualisieren lädt die App die Tageskurse der Europäischen Zentralbank über frankfurter.app – sonst wird nichts gesendet.</p>`;
}
function fxMeta() {
  const u = ui.fx || {},
    x = fxConv(1, u.from, u.to),
    fx = fxRates();
  return x == null
    ? ""
    : `${escHtml(fxFmt(1, u.from, true))} = ${escHtml(fxFmt(x, u.to))}${fx.approx ? ` · <span>ungefähr</span>` : ` · EZB ${escHtml(fxDate(fx.d))}`}`;
}
function fxResult() {
  const u = ui.fx || {};
  const a = parseAmt(u.a || "") || 0,
    x = fxConv(a, u.from, u.to);
  return x == null ? "–" : escHtml(numStr(round2(x)));
}
document.addEventListener("input", (e) => {
  if (e.target.id === "fxA") {
    (
      ui.fx ||
      (ui.fx = {
        from: "EUR",
        to: "USD",
      })
    ).a = e.target.value;
    const r = $("fxRes");
    if (r) r.innerHTML = fxResult();
  }
});
document.addEventListener("click", (e) => {
  const c = e.target.closest("[data-cur2]");
  if (c) {
    store.settings.cur2 = c.dataset.cur2;
    saveSettings();
    renderSprache();
    return;
  }
  if (e.target.closest("[data-fxall]")) {
    ui.fxAll = !ui.fxAll;
    renderSprache();
  }
});
document.addEventListener("change", (e) => {
  const id = e.target.id;
  if (id === "fxFrom" || id === "fxTo") {
    ui.fx[id === "fxFrom" ? "from" : "to"] = e.target.value;
    const r = $("fxRes");
    if (r) r.innerHTML = fxResult();
    const m = $("fxMeta");
    if (m) m.innerHTML = fxMeta();
  }
  if (id === "fxCur2") {
    store.settings.cur2 = e.target.value;
    saveSettings();
  }
  if (id === "fCur") {
    fxSheetHint();
  }
});
document.addEventListener("click", async (e) => {
  const lb = e.target.closest("[data-lang]");
  if (lb) {
    I18N.set(lb.dataset.lang);
    render();
    renderSprache();
    const lg = $("legalBg");
    if (lg && !lg.hidden) legalGate(true);
    return;
  }
  if (e.target.closest("[data-fxswap]")) {
    const u = ui.fx;
    [u.from, u.to] = [u.to, u.from];
    renderSprache();
    return;
  }
  const fl = e.target.closest("[data-fxload]");
  if (fl) {
    fl.disabled = true;
    const o = await fxRefresh();
    fl.disabled = false;
    toast(o ? "Kurse aktualisiert" : "Kurse konnten nicht geladen werden – bist du online?");
    if (o) renderSprache();
  }
});
function fxSheetHint() {
  const s = $("fCur"),
    h = $("fxHint");
  if (!s || !h) return;
  const c = s.value;
  s.classList.toggle("on", c !== "EUR");
  if (c === "EUR") {
    h.hidden = true;
    h.textContent = "";
    return;
  }
  const a = parseAmt($("fAmount").value) || 0,
    x = fxConv(a, c, "EUR"),
    r = fxConv(1, c, "EUR");
  h.hidden = false;
  h.innerHTML = `<b>= ${escHtml(fmtEur(x || 0))}</b> <span>(1 ${c} = ${String(Math.round((r || 0) * 10000) / 10000).replace(".", ",")} €)</span><br><span>Wird in Euro umgerechnet gespeichert.</span>`;
}
async function renderSpeicher() {
  const el = $("speicherEd");
  if (!el) return;
  el.innerHTML = `<p class="small muted">Wird berechnet …</p>`;
  let rc = 0,
    rb = 0,
    lc = 0,
    lb = 0,
    est = null,
    ls = 0;
  try {
    const all = await rcptOp("readonly", (st) => st.getAll());
    rc = (all || []).length;
    rb = sum(all || [], (v) => ((v && v.img) || "").length * 0.75);
  } catch (e) {}
  try {
    const all = await logoStore("readonly", (st) => st.getAll());
    lc = (all || []).filter((v) => v && v.data).length;
    lb = sum(all || [], (v) => ((v && v.data) || "").length * 0.75);
  } catch (e) {}
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      ls += (k.length + (localStorage.getItem(k) || "").length) * 2;
    }
  } catch (e) {}
  try {
    if (navigator.storage && navigator.storage.estimate) est = await navigator.storage.estimate();
  } catch (e) {}
  const mb = (v) =>
    v < 1048576
      ? `${Math.max(1, Math.round(v / 1024))} KB`
      : `${(v / 1048576).toLocaleString("de-DE", {
          maximumFractionDigits: 1,
        })} MB`;
  const tot = rb + lb + ls,
    bar = (v, c) => `<i style="width:${tot ? Math.max(v ? 2 : 0, (v / tot) * 100) : 0}%;background:${c}"></i>`;
  el.innerHTML = `<div class="stor"><b>${mb(tot)}</b><span class="small muted">belegt die App auf diesem Gerät</span><div class="storbar">${bar(rb, "var(--accent)")}${bar(ls, "#7a5bc2")}${bar(lb, "#c27c0e")}</div></div>
    <div class="exr"><span class="exi" style="background:var(--accent)">${svgIcon("camera", 20)}</span><span class="n"><b>Belegfotos</b><small>${rc} ${rc === 1 ? "Foto" : "Fotos"} · ${mb(rb)}</small></span><button class="btn primary" id="spBelege">Ansehen</button></div>
    <div class="exr"><span class="exi" style="background:#7a5bc2">${svgIcon("doc", 20)}</span><span class="n"><b>Buchungen & Einstellungen</b><small>${plural(store.tx.length, "Buchung", "Buchungen")} · ${mb(ls)}</small></span></div>
    <div class="exr"><span class="exi" style="background:#c27c0e">${svgIcon("cart", 20)}</span><span class="n"><b>Geladene Logos</b><small>${lc} · ${mb(lb)}</small></span>${lc ? `<button class="btn" id="logoClear">Leeren</button>` : ""}</div>
    ${est && est.quota ? `<p class="small muted" style="margin:10px 0 0">Frei für die App: ca. ${mb(Math.max(0, est.quota - est.usage))}</p>` : ""}`;
}
document.addEventListener("click", (e) => {
  if (!e.target.closest("#spBelege")) return;
  try {
    if (spsOpen()) spSheetClose();
  } catch (_) {}
  ui.sp = null;
  ui.filter = "mitbeleg";
  ui.view = "list";
  render();
  window.scrollTo({
    top: 0,
  });
});
document.addEventListener("click", async (e) => {
  if (!e.target.closest("#logoClear")) return;
  try {
    await logoStore("readwrite", (st) => st.clear());
    LOGO.map.clear();
    toast("Logo-Speicher geleert");
  } catch (_) {}
  renderSpeicher();
  render();
});
function devId() {
  let id = null;
  try {
    id = localStorage.getItem("hb-devid");
    if (!id) {
      id = newId();
      localStorage.setItem("hb-devid", id);
    }
  } catch (e) {
    id = "local";
  }
  return id;
}
function devType() {
  return IS_DESK ? "pc" : window.AndroidBridge ? "phone" : "web";
}
function devList() {
  try {
    return JSON.parse(localStorage.getItem("hb-devs") || "{}");
  } catch (e) {
    return {};
  }
}
function devStore(id, data) {
  const d = devList();
  if (data === null) delete d[id];
  else d[id] = data;
  try {
    localStorage.setItem("hb-devs", JSON.stringify(d));
  } catch (e) {}
}
function devMe() {
  const d = devList()[devId()] || {};
  return {
    name: d.name || (devType() === "pc" ? "PC" : devType() === "phone" ? "Handy" : "Browser"),
    model: devModel(),
    form: devForm(),
    type: devType(),
    ver: curVerShort(),
    seen: Date.now(),
    /* öffentlicher Geräteschlüssel: damit kann ein anderes Gerät beim Entfernen eines Geräts die neue Kopplung nur für dieses Gerät verschlüsseln */
    ...(pairPub() ? { pk: pairPub() } : {}),
    ...(isMain()
      ? {
          main: true,
        }
      : {}),
  };
}
function devShown(d) {
  const n = String((d && d.name) || "");
  return n && !["PC", "Handy", "Browser", "Gerät"].includes(n) ? n : (d && d.model) || n || "Gerät";
}
function devPing(force) {
  if (!SYNCABLE || !SYNC.token || (store.settings.devOut || {})[devId()]) return;
  const me = devList()[devId()];
  if (!force && me && Date.now() - (me.seen || 0) < 6 * 3600e3 && me.ver === curVerShort()) return;
  const d = devMe();
  devStore(devId(), d);
  enqueue("app", "dev-" + devId(), d);
}
setTimeout(() => {
  try {
    zTripCheck();
  } catch (_) {}
}, 5000);
setTimeout(() => devPing(true), 8000);
setInterval(() => devPing(), 30 * 60e3);
function renderGeraete() {
  const el = $("geraeteEd");
  if (!el) return;
  if (el.contains(document.activeElement) && document.activeElement.tagName === "INPUT") return;
  const me = devId(),
    out = store.settings.devOut || {},
    L = Object.entries(devList()).filter(([id]) => !out[id]);
  if (!L.some(([id]) => id === me)) L.unshift([me, devMe()]);
  const ago = (t) => {
    const m = Math.round((Date.now() - t) / 60000);
    return m < 2
      ? "gerade eben"
      : m < 60
        ? `vor ${m} Min.`
        : m < 1440
          ? `vor ${Math.round(m / 60)} Std.`
          : `vor ${Math.round(m / 1440)} Tagen`;
  };
  el.innerHTML = `${!SYNCABLE || !SYNC.token ? `<div class="notice info" style="margin-bottom:12px"><span>Der Abgleich ist aus – andere Geräte siehst du erst, wenn er an ist.</span><button class="btn" data-spgo="sync">Abgleich</button></div>` : ""}
    ${L.sort((a, b) => (b[0] === me) - (a[0] === me) || (b[1].seen || 0) - (a[1].seen || 0))
      .map(
        ([id, d]) =>
          `<div class="exr">${(() => {
            const pn = String(store.settings.name || "").trim(),
              f = d.form || (d.type === "pc" ? "pc" : "phone");
            const ph = store.settings.photo;
            return pn || ph
              ? `<span class="exi devi">${ph ? `<img src="${escHtml(ph)}" alt="" class="devph">` : `<b>${escHtml(pn[0].toUpperCase())}</b>`}<span class="avdev">${devIc(f, 10)}</span></span><span class="n"><b>${escHtml(pn || devShown(d))}${d.main ? " " + svgIcon("crown", 14) : ""}</b><small>${pn ? escHtml(devShown(d)) + " · " : ""}`
              : `<span class="exi">${devIc(f, 20)}</span><span class="n"><b>${escHtml(devShown(d))}${d.main ? " " + svgIcon("crown", 14) : ""}</b><small>`;
          })()}${d.main ? "Hauptgerät · " : ""}${id === me ? "Dieses Gerät · " : ""}v${escHtml(String(d.ver || "?").replace(/^[vV] ?/, ""))} · ${id === me ? "jetzt aktiv" : "zuletzt " + ago(d.seen || 0)}</small></span>${id === me ? "" : ui.devDelArm === id ? `<button class="btn danger" data-devdel="${escHtml(id)}" style="padding:8px 12px" title="${escHtml(MODE === "pair" ? uiText("rm_note") : "")}">Wirklich entfernen?</button>` : `<button class="btn" data-devdel="${escHtml(id)}" style="padding:8px 12px">Entfernen</button>`}</div>`
      )
      .join("")}
    <div class="small muted" style="margin:8px 2px 0">${L.length} von höchstens 10 Geräten gekoppelt.</div>
    ${MODE === "pair" && SYNC.token && L.length > 1 ? `<div class="small muted" style="margin:6px 2px 0">${escHtml(uiText("rm_note"))}</div>` : ""}
    ${
      SYNCABLE && (!SYNC.token || MODE === "pair")
        ? SYNC.token
          ? `<div class="sacts">
        <button class="sact" id="pairMore">${svgIcon("plusIn", 20)}Gerät hinzufügen</button>
        <button class="sact" id="syncCode">${svgIcon("shield", 20)}Wieder&shy;herstellungs-Code</button></div>
      <p class="small" style="margin:12px 2px 0;text-align:center"><button class="link small" id="pairOther">${ui.pairOtherArm ? "Sicher? Die Daten auf diesem Gerät werden durch die vom anderen Hauptgerät ersetzt – nochmal tippen" : "Dieses Gerät stattdessen mit einem anderen Hauptgerät koppeln"}</button></p>
      <div class="wipe" style="margin-top:14px"><b>Alle Geräte entkoppeln</b><span class="small muted">Löscht die Kopplung und deine verschlüsselten Daten auf dem Server. Die Daten auf jedem Gerät bleiben erhalten.</span><button class="btn danger" id="pairWipe">Kopplung und Server-Daten löschen</button></div>`
          : `<button class="btn primary block" id="devPairStart" style="margin-top:12px">${svgIcon("plusIn", 18)} Geräte koppeln</button>`
        : ""
    }
    ${SYNCABLE && SYNC.token && MODE !== "pair" ? `<div class="wipe" style="margin-top:14px"><b>Handy verloren?</b><span class="small muted">Meldet alle Geräte ab – jedes muss sich mit dem Server-Passwort neu anmelden.</span><button class="btn wipebtn" id="logoutAll">Alle Geräte abmelden</button></div>` : ""}`;
}
document.addEventListener("change", (e) => {
  if (e.target.id !== "devName") return;
  const d = {
    ...devMe(),
    name: e.target.value.trim().slice(0, 30) || devMe().name,
  };
  devStore(devId(), d);
  if (SYNC.token) enqueue("app", "dev-" + devId(), d);
  e.target.blur();
  toast("Gespeichert");
  renderGeraete();
});
document.addEventListener("click", (e) => {
  if (e.target.closest("#devPairStart")) {
    showLogin();
    return;
  }
  if (!e.target.closest("#devUnpair")) return;
  if (!ui.unpairArm) {
    ui.unpairArm = true;
    renderGeraete();
    setTimeout(() => {
      ui.unpairArm = false;
      renderGeraete();
    }, 3000);
    return;
  }
  ui.unpairArm = false;
  pairSave(null);
  SYNC.token = "";
  SYNC.queue = [];
  SYNC.state = "off";
  saveSync();
  renderSyncInfo();
  renderSyncDot();
  toast("Entkoppelt – die Daten bleiben auf diesem Gerät");
});
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-devdel]");
  if (!b) return;
  const id = b.dataset.devdel;
  if (ui.devDelArm !== id) {
    ui.devDelArm = id;
    renderGeraete();
    setTimeout(() => {
      if (ui.devDelArm === id) {
        ui.devDelArm = null;
        renderGeraete();
      }
    }, 4000);
    return;
  }
  ui.devDelArm = null;
  devRemove(id);
});
/* Entfernen: bei der Kopplung mit Schlüsselwechsel (57m), sonst wie bisher nur abmelden */
async function devRemove(id) {
  const name = zDevName(id);
  let r = { ok: false, soft: true };
  if (MODE === "pair" && SYNC.token) {
    toast(uiText("rm_busy"), null, null, 20000);
    try {
      r = await pairRemoveDev(id);
    } catch (e) {
      toast(uiText("rm_fail"), null, null, 8000);
      return;
    }
  }
  store.settings.devOut = {
    ...(store.settings.devOut || {}),
    [id]: Date.now(),
  };
  saveSettings();
  devStore(id, null);
  if (SYNC.token) enqueue("app", "dev-" + id, null);
  renderGeraete();
  if (r.ok)
    toast(
      uiText("rm_done", { n: name }) + (r.left && r.left.length ? " " + uiText("rm_left", { n: r.left.join(", ") }) : ""),
      null,
      null,
      r.left && r.left.length ? 12000 : 6000
    );
  else if (r.old) toast(uiText("rm_old", { n: name }), null, null, 10000);
  else toast(`${name} entfernt – es gleicht nicht mehr ab`);
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-qsw]");
  if (!b) return;
  const k = b.dataset.qsw;
  if (k === "lock") {
    if (spUseSheet()) spSheetOpen("sicherheit");
    else {
      ui.sp = "sicherheit";
      renderSpPages();
    }
    return;
  }
  if (k === "notify") {
    const c = notifyCfg();
    if (c.on) {
      c.on = false;
      notifySave(c);
      toast("Erinnerungen aus");
      renderSetHome();
    } else {
      if (spUseSheet()) spSheetOpen("notify");
      else {
        ui.sp = "notify";
        renderSpPages();
      }
    }
  }
});
function jlSave() {
  saveSettings();
}
document.addEventListener("change", (e) => {
  const t = e.target,
    j = store.settings.jl;
  if (!t.closest || !t.closest("#amtEd") || !j) return;
  if (t.id === "aWork") {
    setWork(t.value);
    setTimeout(() => {
      renderAmtEd();
    }, 50);
    return;
  }
  if (t.id === "aAmt") {
    j.amount = parseAmt(t.value) || 0;
  } else if (t.id === "aDay") {
    j.payDay = Number(t.value);
  } else if (t.id === "aRent") {
    j.rentDirect = t.checked;
  } else if (t.id === "aMini") {
    j.mini = parseAmt(t.value) || 0;
  } else if (t.id === "aUntil") {
    j.until = t.value || "";
  } else if (t.id === "aSince") {
    j.since = t.value || "";
  } else if (t.dataset.potn != null) {
    const p = j.pots[+t.dataset.potn],
      old = p.n,
      nw = t.value.trim() || old;
    p.n = nw;
    for (const k in j.catPot) if (j.catPot[k] === old) j.catPot[k] = nw;
  } else if (t.dataset.potv != null) {
    j.pots[+t.dataset.potv].v = parseAmt(t.value) || 0;
  } else if (t.dataset.catpot != null) {
    j.catPot[t.dataset.catpot] = t.value;
  } else return;
  t.blur();
  jlSave();
  renderAmtEd();
});
document.addEventListener("click", (e) => {
  const t = e.target;
  if (!t.closest("#amtEd")) return;
  const j = jlCfg();
  if (t.closest("[data-potadd]")) {
    j.pots.push({
      n: "Neuer Topf",
      v: 0,
    });
  } else if (t.closest("[data-potsplit]")) {
    j.pots = POT_DEF.map(([n, p]) => ({
      n,
      v: Math.round(((j.amount || 563) * p) / 100),
    }));
    j.catPot = {};
  } else if (t.closest("[data-potdel]")) {
    j.pots.splice(+t.closest("[data-potdel]").dataset.potdel, 1);
  } else if (t.closest("[data-bhdone]")) {
    const x = j.beihilfe.find((x) => x.id === t.closest("[data-bhdone]").dataset.bhdone);
    if (x) x.done = !x.done;
  } else if (t.closest("[data-bhdel]")) {
    const id = t.closest("[data-bhdel]").dataset.bhdel;
    j.beihilfe = j.beihilfe.filter((x) => x.id !== id);
  } else if (t.closest("#bhAdd")) {
    const a = parseAmt($("bhA").value) || 0,
      n = $("bhN").value.trim() || "Arztrechnung";
    if (!a) {
      toast("Bitte einen Betrag eintragen");
      return;
    }
    j.beihilfe.push({
      id: newId(),
      n,
      amt: a,
      d: $("bhD").value || isoToday(),
      done: false,
    });
    toast("Eingetragen");
  } else if (t.closest("[data-termdel]")) {
    const id = t.closest("[data-termdel]").dataset.termdel;
    j.terms = j.terms.filter((x) => x.id !== id);
  } else if (t.closest("#tAdd")) {
    const d = $("tD").value;
    if (!d) {
      toast("Bitte ein Datum wählen");
      return;
    }
    j.terms.push({
      id: newId(),
      n: $("tN").value,
      d,
      t: $("tT").value || "",
    });
    toast("Termin eingetragen");
  } else return;
  jlSave();
  renderAmtEd();
});
