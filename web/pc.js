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
/* page change "Fallen & Springen": the tiles of the old page drop away slightly tilted, one after another,
   the tiles of the new page fall in from above and bounce into place */
const PC_ANIM={busy:false, pass:false};
function pcTiles(sec){
  if (!sec) return [];
  const out=[];
  for (const c of sec.children){
    if (c.matches(".hcols,.cols")) c.querySelectorAll(":scope > .hcol > *, :scope > .col > *").forEach(x=>out.push(x));
    else out.push(c);
  }
  return out.filter(e=>{ if (e.hidden || e.closest("[hidden]")) return false; const r=e.getBoundingClientRect(); return r.width>0 && r.height>0 && r.bottom>0 && r.top<innerHeight; }).slice(0,14);
}
const pcCalm = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
function pcGo(k, nav){
  if (PC_ANIM.busy){ PC_ANIM.next=()=>pcGo(k, nav); return true; }   // pressed again during the animation: goes on right after
  const sec=document.querySelector(`[data-view="${UI.view}"]`), olds=pcCalm()?[]:pcTiles(sec);
  PC_ANIM.busy=true;
  const outs=olds.map((e,i,a)=>e.animate([{opacity:1,transform:"none"},{opacity:0,transform:`translateY(${Math.round(innerHeight*0.6+i*24)}px) rotate(${i%2?9:-9}deg)`}],
    {duration:300, delay:(a.length-1-i)*22, easing:"cubic-bezier(.55,0,1,.45)", fill:"forwards"}));
  const done=()=>{
    PC_ANIM.pass=true; try { nav(); } finally { PC_ANIM.pass=false; }
    outs.forEach(a=>{ try { a.cancel(); } catch(_){} });
    requestAnimationFrame(()=>{
      const news=pcCalm()?[]:pcTiles(document.querySelector(`[data-view="${UI.view}"]`));
      news.forEach((e,i)=>e.animate([{opacity:0,transform:`translateY(${-Math.round(innerHeight*0.8)}px) rotate(${i%2?-6:6}deg)`},{opacity:1,transform:"translateY(14px) rotate(0)",offset:.6},{transform:"translateY(-6px)",offset:.8},{opacity:1,transform:"none"}],
        {duration:560, delay:i*45, easing:"cubic-bezier(.3,.7,.3,1)", fill:"backwards"}));
      setTimeout(()=>{ PC_ANIM.busy=false; const n=PC_ANIM.next; PC_ANIM.next=null; if (n) n(); }, 160);
    });
  };
  if (outs.length) Promise.all(outs.map(a=>a.finished)).then(done, done); else done();
  return true;
}
function pcStep(d){
  if (PC_ANIM.busy){ PC_ANIM.next=()=>pcStep(d); return true; }
  const i=PC_ORDER.indexOf(UI.view); if (i<0 || (UI.view==="more" && UI.sp) || document.querySelector(".backdrop:not([hidden])")) return false;
  const b=document.querySelector(`.tabs [data-go="${PC_ORDER[(i+d+PC_ORDER.length)%PC_ORDER.length]}"]`); if (!b) return false;
  return pcGo(b.dataset.go, ()=>b.click());
}
document.addEventListener("click", e=>{ const b=e.target.closest("[data-pcstep]"); if (b) pcStep(Number(b.dataset.pcstep)); });
// a click on a page (pills, the tiles of the green panel …) gets the same animation
document.addEventListener("click", e=>{
  if (!IS_PC || PC_ANIM.pass) return;
  const b=e.target.closest("[data-go]"); if (!b || !PC_ORDER.includes(b.dataset.go) || b.dataset.go===UI.view || b.dataset.scroll || document.querySelector(".backdrop:not([hidden])")) return;
  e.preventDefault(); e.stopImmediatePropagation();
  pcGo(b.dataset.go, ()=>b.click());
}, true);
// touch screen: swipe left / right, endless
{ let x0=null, y0=0, t0=0;
  document.addEventListener("touchstart", e=>{ if (!IS_PC || e.touches.length!==1 || e.target.closest("input,textarea,select,.sheet,.backdrop,.astack,.srail,.table-wrap,.fxchips")){ x0=null; return; } x0=e.touches[0].clientX; y0=e.touches[0].clientY; t0=Date.now(); }, {passive:true});
  document.addEventListener("touchend", e=>{ if (x0===null) return; const t=e.changedTouches[0], dx=t.clientX-x0, dy=t.clientY-y0; x0=null;
    if (Math.abs(dx)>90 && Math.abs(dx)>Math.abs(dy)*1.8 && Date.now()-t0<900) pcStep(dx<0?1:-1); }, {passive:true});
}
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
  // one column of tiles in the original order – the stylesheet spreads them over as many columns as the screen has room for
  const hc=v.querySelector(".hcols"); if (hc && hc.children.length===2){ const [a,b]=[...hc.children], A=[...a.children], B=[...b.children];
    a.replaceChildren(...A.flatMap((x,i)=>B[i]?[x,B[i]]:[x]), ...B.slice(A.length)); b.remove(); }
}
if (IS_PC){ pcOn(); try { if (UI.view==="home") renderHome(); } catch(e){} }
