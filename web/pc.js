/* ---------- PC version: its own look ("Magazin") – the big green panel on the left, the pages as pills on top.
   Flip through the pages with the arrow keys, the arrow buttons next to the pills, the mouse on the pills
   or by swiping on a touch screen – endless in both directions. Only active in the PC app. ---------- */
function pcOn(){
  if (pcOn.done || !IS_PC) return; pcOn.done=true;
  const st=document.getElementById("pcCss"); if (st) st.media="all";
  document.documentElement.classList.add("pc");
  const tabs=document.querySelector(".tabs"), first=tabs && tabs.querySelector('.tab[data-go="home"]'), last=tabs && tabs.querySelector(".tab.tset");
  if (first && !tabs.querySelector(".pcarr")){
    first.insertAdjacentHTML("beforebegin", `<button class="pcarr" data-pcstep="-1" aria-label="Vorherige Seite (Pfeil links)"><svg class="i" viewBox="0 0 24 24"><path d="m15 6-6 6 6 6"/></svg></button>`);
    (last||first).insertAdjacentHTML("afterend", `<button class="pcarr" data-pcstep="1" aria-label="Nächste Seite (Pfeil rechts)"><svg class="i" viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg></button>`);
  }
}
const PC_ORDER=["home","list","fix","shop","year","more"];
function pcStep(d){
  if (window.hbCubeGo && window.hbCubeGo(d)) return true;     // turns like the swipe on the phone
  const i=PC_ORDER.indexOf(UI.view); if (i<0 || document.querySelector(".backdrop:not([hidden])")) return false;
  const b=document.querySelector(`.tabs [data-go="${PC_ORDER[(i+d+PC_ORDER.length)%PC_ORDER.length]}"]`); if (b) b.click(); return !!b;
}
document.addEventListener("click", e=>{ const b=e.target.closest("[data-pcstep]"); if (b) pcStep(Number(b.dataset.pcstep)); });
document.addEventListener("keydown", e=>{
  if (!IS_PC || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || (e.key!=="ArrowLeft" && e.key!=="ArrowRight")) return;
  const t=e.target; if (t && t.closest && t.closest('input,textarea,select,[contenteditable="true"],.astack,.srail,[role="slider"],.sheet,.backdrop')) return;
  if (pcStep(e.key==="ArrowRight"?1:-1)) e.preventDefault();
});
function pcHome(o){
  pcOn();
  const {ym, cur, c, accts, mainBal, mainName}=o, [y,m]=ymParts(ym), dim=daysIn(ym);
  const tot=(accts.find(a=>a.total)||{bal:mainBal}).bal, isCur=ym===cur;
  const left=isCur ? Math.max(1, dim-new Date().getDate()) : 0, perDay=isCur ? Math.max(0, mainBal/left) : 0;
  const pct=isCur ? left/dim : ym>cur ? 1 : 0;
  const first=String(S.settings.name||"").trim().split(/\s+/)[0], greet=(($("greet")||{}).textContent||"Hallo").trim();
  const many=accts.filter(a=>!a.total).length>1;
  const html=`<aside class="pchero" id="pcHero">
    <small class="pchi"><span>${esc(greet)}</span>${first?", "+esc(first):""} · <span>${esc(MONTHS[m-1])} ${y}</span></small>
    <div class="pcbal">${esc(eur(tot))}</div>
    <span class="pcsub">${many?`<span>auf allen Konten</span> · ${esc(mainName||"Hauptkonto")} ${esc(eur(mainBal))}`:"auf deinem Konto"}</span>
    <button class="pcring" data-go="year" style="--p:${Math.round(pct*100)}" aria-label="Analyse öffnen"><span>${isCur
      ? `<small>noch pro Tag</small><b>${esc(eur0(perDay))}</b><small>${left} ${left===1?"Tag":"Tage"} übrig</small>`
      : `<small>${c.net>=0?"übrig":"mehr ausgegeben"}</small><b>${esc(eur0(Math.abs(c.net)))}</b><small>im ${esc(MONTHS[m-1])}</small>`}</span></button>
    <div class="pcminis">
      <button data-go="list"><span>Einnahmen</span><b>${esc(eur0(c.income))}</b></button>
      <button data-go="list"><span>Ausgaben</span><b>${esc(eur0(c.expenses))}</b></button>
      <button data-go="fix"><span>Fixkosten offen</span><b>${esc(eur0(c.fixOpen))}</b></button>
    </div>
  </aside>`;
  const v=$("v-home"); if (!v) return; const old=v.querySelector("#pcHero"); if (old) old.remove(); v.insertAdjacentHTML("afterbegin", html);
}
if (IS_PC){ pcOn(); try { if (UI.view==="home") renderHome(); } catch(e){} }
