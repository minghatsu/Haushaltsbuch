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
function pcCalm(){ return matchMedia("(prefers-reduced-motion: reduce)").matches; }
function pcGo(k, nav){
  if (PC_ANIM.busy){ PC_ANIM.next=()=>pcGo(k, nav); return true; }   // pressed again during the animation: goes on right after
  const sec=document.querySelector(`[data-view="${UI.view}"]`), olds=pcCalm()?[]:[...pcTiles(sec), ...(window.pcDockEls?pcDockEls():[])];
  PC_ANIM.busy=true; if (k==="home") pcHome.intro=true;
  const outs=olds.map((e,i,a)=>e.animate([{opacity:1,transform:"none"},{opacity:0,transform:`translateY(${Math.round(innerHeight*0.6+i*24)}px) rotate(${i%2?9:-9}deg)`}],
    {duration:300, delay:(a.length-1-i)*22, easing:"cubic-bezier(.55,0,1,.45)", fill:"forwards"}));
  const done=()=>{
    PC_ANIM.pass=true; try { nav(); } finally { PC_ANIM.pass=false; }
    outs.forEach(a=>{ try { a.cancel(); } catch(_){} });
    requestAnimationFrame(()=>{
      const news=pcCalm()?[]:[...pcTiles(document.querySelector(`[data-view="${UI.view}"]`)), ...(window.pcDockEls?pcDockEls():[])];
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
/* the green panel appears: the amounts count up and the ring fills itself */
function pcHeroIntro(h){
  if (!h || pcCalm()) return;
  const ease=t=>1-Math.pow(1-t,3), ring=h.querySelector(".pcring"), P=Number((ring&&ring.style.getPropertyValue("--p"))||0);
  const nums=[...h.querySelectorAll("[data-cv]")].map(e=>({e, v:Number(e.dataset.cv)||0, f:e.dataset.cf==="eur"?eur:eur0, fin:e.textContent}));
  const t0=pcHeroIntro.t0, D=1100;
  const k0=ease(Math.max(0,Math.min(1,(performance.now()-t0)/D)));
  nums.forEach(n=>{ n.e.textContent=n.f(n.v*k0); }); if (ring) ring.style.setProperty("--p", (P*k0).toFixed(1));
  const step=now=>{ if (!h.isConnected) return; const t=Math.max(0, Math.min(1,(now-t0)/D)), k=ease(t);
    nums.forEach(n=>{ n.e.textContent = t>=1 ? n.fin : n.f(n.v*k); });
    if (ring) ring.style.setProperty("--p", (P*k).toFixed(1));
    if (t<1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
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
    <div class="pcbal" data-cv="${tot}" data-cf="eur">${esc(eur(tot))}</div>
    <span class="pcsub">${many?"auf allen Konten":"auf deinem Konto"}</span>
    <div class="pcaccs">${accts.filter(a=>!a.total).map(a=>`<button class="${a.main?"main":""}" data-spgo="konten"><span>${esc(a.main?(mainName||"Hauptkonto"):a.name)}</span><b data-cv="${Number(a.bal)||0}" data-cf="eur">${esc(eur(Number(a.bal)||0))}</b></button>`).join("")}<button class="add" data-spgo="konten"><span>+ Space</span><b>anlegen</b></button></div>
    <button class="pcring" data-go="year" style="--p:${Math.round(pct*100)}" aria-label="Analyse öffnen"><span>${isCur
      ? `<small>noch pro Tag</small><b data-cv="${perDay}">${esc(eur0(perDay))}</b><small>${left} ${left===1?"Tag":"Tage"} übrig</small>`
      : `<small>${c.net>=0?"übrig":"mehr ausgegeben"}</small><b data-cv="${Math.abs(c.net)}">${esc(eur0(Math.abs(c.net)))}</b><small>im ${esc(MONTHS[m-1])}</small>`}</span></button>
    <div class="pcminis">
      <button data-go="list"><span>Einnahmen</span><b data-cv="${c.income}">${esc(eur0(c.income))}</b></button>
      <button data-go="list"><span>Ausgaben</span><b data-cv="${c.expenses}">${esc(eur0(c.expenses))}</b></button>
      <button data-go="fix"><span>Fixkosten offen</span><b data-cv="${c.fixOpen}">${esc(eur0(c.fixOpen))}</b></button>
    </div>
  </aside>`;
  const v=$("v-home"); if (!v) return; const old=v.querySelector("#pcHero"); if (old) old.remove(); v.insertAdjacentHTML("afterbegin", html);
  // drawn again while it is still counting (data arriving): the new panel simply goes on counting
  if (pcHome.intro){ pcHome.intro=false; pcHeroIntro.t0=performance.now()+260; }
  if (performance.now() < (pcHeroIntro.t0||0)+1100) pcHeroIntro(v.querySelector("#pcHero"));
  // one column of tiles in the original order – the stylesheet spreads them over as many columns as the screen has room for
  const hc=v.querySelector(".hcols"); if (hc && hc.children.length===2){ const [a,b]=[...hc.children], A=[...a.children], B=[...b.children];
    a.replaceChildren(...A.flatMap((x,i)=>B[i]?[x,B[i]]:[x]), ...B.slice(A.length)); b.remove(); }
}
if (IS_PC){ pcOn(); pcHome.intro=true; try { if (UI.view==="home") renderHome(); } catch(e){} }
/* ---------- footer (status bar): name, version, sync state, help and the legal texts ---------- */
if (IS_PC){
  // the legal texts live in the footer on the PC, not in the settings
  const _keys=accTabKeys; accTabKeys = t => _keys(t).filter(k=>k!=="recht");
  const LEG=[["impressum","Impressum"],["datenschutz","Datenschutz"],["agb","Nutzungsbedingungen"],["lizenzen","Lizenzen"]].filter(([k])=>LEGAL[k]);
  document.body.insertAdjacentHTML("beforeend", `<footer class="pcfoot" id="pcFoot"><span class="pcfn"><b>Finanz MAMI</b> · PC <span id="pcVer"></span></span>
    <button class="pcfs" id="pcSync" data-spgo="sync"><i></i><span id="pcSyncT"></span></button>
    <span class="pcfr"><button data-spgo="neu">Neu in dieser Version</button><button data-spgo="hilfe">Hilfe</button><button data-spgo="feedback">Feedback</button>
    ${LEG.map(([k,t])=>`<button data-pclegal="${k}">${t}</button>`).join("")}</span></footer>
    <div class="backdrop" id="pcLegalBg" hidden><div class="sheet pclegal" role="dialog" aria-modal="true"><div class="sheet-head"><h2 id="pcLegalT"></h2><button class="icon-btn" data-pclegalclose="1" aria-label="Schließen"><svg class="i" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div><div class="legal" id="pcLegalB"></div></div></div>`);
  const foot=()=>{ const v=$("pcVer"); if (v) v.textContent="v"+curVerShort();
    const s=$("pcSync"), t=$("pcSyncT"); if (!s||!t) return;
    const st = !SYNC.token ? "off" : SYNC.state==="ok" ? "ok" : SYNC.state==="pending" ? "busy" : SYNC.state==="offline" ? "offline" : "err";
    s.dataset.st=st;
    const tm = SYNC.last ? new Date(SYNC.last).toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"}) : "";
    const txt = st==="off" ? "Abgleich aus" : st==="ok" ? `Abgeglichen ${tm}` : st==="busy" ? "Wird abgeglichen …" : st==="offline" ? "Offline – wird nachgeholt" : "Server nicht erreichbar";
    if (t.textContent!==txt) t.textContent=txt; };
  foot(); setInterval(foot, 3000);
  const pcLegalClose=()=>{ const bg=$("pcLegalBg"); bg.classList.remove("show"); setTimeout(()=>{ bg.hidden=true; }, 200); };
  document.addEventListener("click", e=>{
    const b=e.target.closest("[data-pclegal]");
    if (b){ const k=b.dataset.pclegal; $("pcLegalT").textContent=(LEG.find(x=>x[0]===k)||[,""])[1]; $("pcLegalB").innerHTML=LEGAL[k][1](); const bg=$("pcLegalBg"); bg.hidden=false; requestAnimationFrame(()=>bg.classList.add("show")); return; }
    if (e.target.closest("[data-pclegalclose]") || e.target===$("pcLegalBg")) pcLegalClose();
  });
  document.addEventListener("keydown", e=>{ if (e.key==="Escape" && !$("pcLegalBg").hidden) pcLegalClose(); });
}
/* translations of the PC-only texts (kept here, so a PC change does not touch the shared app) */
if (IS_PC){
  const PC_I18N={
    "Neu in dieser Version":["New in this version","Bu sürümde yeni","Новое в этой версии","Нове в цій версії","Nowości w tej wersji","الجديد في هذا الإصدار","Nou în această versiune"],
    "Abgeglichen {n}:{n}":["Synced {n}:{n}","Eşitlendi {n}:{n}","Синхронизировано {n}:{n}","Синхронізовано {n}:{n}","Zsynchronizowano {n}:{n}","تمت المزامنة {n}:{n}","Sincronizat {n}:{n}"],
    "Wird abgeglichen …":["Syncing …","Eşitleniyor …","Синхронизация …","Синхронізація …","Synchronizacja …","جارٍ المزامنة …","Se sincronizează …"],
    "Abgleich aus":["Sync off","Eşitleme kapalı","Синхронизация выкл.","Синхронізацію вимкнено","Synchronizacja wył.","المزامنة متوقفة","Sincronizare oprită"]};
  const LL=["en","tr","ru","uk","pl","ar","ro"];
  for (const [k,v] of Object.entries(PC_I18N)) if (!I18N_K.includes(k)){ I18N_K.push(k); LL.forEach((l,i)=>{ (I18N_T[l]=I18N_T[l]||[])[I18N_K.length-1]=v[i]; }); }
  if (LANG!=="de") try { I18N.set(LANG); } catch(e){}
}
/* ---------- start page tiles: drag & drop to sort, "minimize" to the dock on the right edge (they can never be deleted).
   The PC keeps its own order (S.settings.pcHome), the phone keeps its own. ---------- */
if (IS_PC){
  const PCH=()=>{ const h=S.settings.pcHome||(S.settings.pcHome={}); h.order=Array.isArray(h.order)?h.order:[]; h.min=Array.isArray(h.min)?h.min:[]; return h; };
  const BIC={cash:"cash",budgets:"target",fix:"repeat",tax:"shield",goals:"piggy",debts:"bank",recent:"list",gemeinsam:"heart",offers:"cart"};
  const name=k=>(HOME_BLOCKS.find(b=>b[0]===k)||[k,k])[1];
  // the settings section "Startseite anpassen" is not needed on the PC – everything happens right on the page
  const _k2=accTabKeys; accTabKeys = t => _k2(t).filter(k=>k!=="start");
  homeOrder = () => { const o=[...new Set(PCH().order)].filter(k=>HOME_BLOCKS.some(b=>b[0]===k)); for (const [k] of HOME_BLOCKS) if (!o.includes(k)) o.push(k); return o; };
  const _hb=homeBlocks; homeBlocks = html => { const keep=S.settings.homeHidden; S.settings.homeHidden=[...PCH().min]; try { return _hb(html); } finally { S.settings.homeHidden=keep; } };
  const save=()=>{ try { saveSettings(); } catch(e){} };

  // dock with the minimized tiles
  document.body.insertAdjacentHTML("beforeend", `<div class="pcdock" id="pcDock" aria-label="Minimierte Kacheln"></div>`);
  function dock(){
    const d=$("pcDock"); if (!d) return; const on=UI.view==="home", m=PCH().min.filter(k=>HOME_BLOCKS.some(b=>b[0]===k));
    document.documentElement.classList.toggle("pcdocked", on && m.length>0);
    d.hidden=!on || !m.length;
    const have=[...d.children].map(x=>x.dataset.pcrest).join(","); if (have===m.join(",")) return;
    d.innerHTML=m.map(k=>`<button class="pcdi" data-pcrest="${k}" aria-label="${esc(name(k))} wieder anzeigen"><span>${ic(BIC[k]||"tag",22)}</span><em>${esc(name(k))}</em></button>`).join("");
  }
  // controls on every tile
  function decorate(){
    dock();
    if (UI.view!=="home") return;
    document.querySelectorAll('#v-home .hblock').forEach(b=>{ if (b.closest(".cubestage") || b.querySelector(":scope > .pctl")) return;
      b.insertAdjacentHTML("afterbegin", `<div class="pctl"><button class="pcgrip" data-pcgrip="1" aria-label="Kachel verschieben" title="Ziehen zum Verschieben"><svg class="i" viewBox="0 0 24 24" style="width:16px;height:16px"><circle cx="9" cy="6" r="1.3"/><circle cx="15" cy="6" r="1.3"/><circle cx="9" cy="12" r="1.3"/><circle cx="15" cy="12" r="1.3"/><circle cx="9" cy="18" r="1.3"/><circle cx="15" cy="18" r="1.3"/></svg></button><button class="pcmin" data-pcmin="${b.dataset.hb}" aria-label="Kachel minimieren" title="Minimieren">${ic("minus",16)}</button></div>`); });
  }
  const _ph=pcHome; pcHome = o => { _ph(o); decorate(); };
  setInterval(dock, 1000);
  const _render=render; render = (...a) => { const x=_render(...a); try { dock(); } catch(e){} return x; };
  window.pcDockEls = () => UI.view==='home' && !$("pcDock").hidden ? [...$("pcDock").children] : [];
  const dockSpot=k=>{ const el=document.querySelector(`#pcDock [data-pcrest="${k}"]`); if (el){ const r=el.getBoundingClientRect(); return {x:r.left+r.width/2, y:r.top+r.height/2}; } return {x:innerWidth-50, y:innerHeight/2}; };

  // the other tiles glide to their new places (also when the whole page is drawn anew)
  const snap=()=>new Map([...document.querySelectorAll("#v-home .hblock")].map(t=>[t.dataset.hb, t.getBoundingClientRect()]));
  function glide(before, skip){ document.querySelectorAll("#v-home .hblock").forEach(t=>{ if (t.dataset.hb===skip) return; const a=before.get(t.dataset.hb); if (!a) return; const r=t.getBoundingClientRect(), dx=a.left-r.left, dy=a.top-r.top;
    if (Math.abs(dx)>1 || Math.abs(dy)>1) t.animate([{transform:`translate(${dx}px,${dy}px)`},{transform:"none"}],{duration:420,easing:"cubic-bezier(.2,.8,.2,1)"}); }); }
  // minimize: the tile lifts, spins a little and flies into the dock; the others close the gap
  document.addEventListener("click", e=>{
    const b=e.target.closest("[data-pcmin]"); if (!b) return; const k=b.dataset.pcmin, tile=b.closest(".hblock"); if (!tile || PC_ANIM.busy) return;
    const r=tile.getBoundingClientRect(), h=PCH(), before=snap(); if (!h.min.includes(k)) h.min.push(k);
    const fly=tile.cloneNode(true); fly.classList.add("pcfly"); Object.assign(fly.style,{left:r.left+"px",top:r.top+"px",width:r.width+"px",height:r.height+"px"}); document.body.appendChild(fly);
    tile.remove(); save();                          // draws the page without the tile (and with the dock)
    glide(before, k);
    const di=document.querySelector(`#pcDock [data-pcrest="${k}"]`); if (di) di.style.opacity="0";
    const t=dockSpot(k), dx=t.x-(r.left+r.width/2), dy=t.y-(r.top+r.height/2), sc=Math.max(0.06, 52/Math.max(r.width,r.height));
    fly.animate([{transform:"none",opacity:1,borderRadius:"24px"},{transform:"translateY(-18px) scale(1.04) rotate(-3deg)",opacity:1,offset:.18},{transform:`translate(${dx*0.4}px,${dy*0.4-40}px) scale(.55) rotate(-8deg)`,opacity:1,offset:.55},{transform:`translate(${dx}px,${dy}px) scale(${sc}) rotate(10deg)`,opacity:.15,borderRadius:"50%"}],
      {duration:680, easing:"cubic-bezier(.45,0,.2,1)", fill:"forwards"}).finished.then(()=>{
        fly.remove();
        const d2=document.querySelector(`#pcDock [data-pcrest="${k}"]`); if (d2){ d2.style.opacity=""; d2.animate([{transform:"scale(.3)"},{transform:"scale(1.25)",offset:.6},{transform:"none"}],{duration:420,easing:"cubic-bezier(.3,.7,.3,1)"}); }
      });
  });
  // restore: the icon pops out of the dock and the tile grows back into its old place; the others make room
  document.addEventListener("click", e=>{
    const b=e.target.closest("[data-pcrest]"); if (!b || PC_ANIM.busy) return; const k=b.dataset.pcrest, from=b.getBoundingClientRect(), h=PCH(), before=snap();
    h.min=h.min.filter(x=>x!==k); save();
    glide(before, k);
    const tile=document.querySelector(`#v-home .hblock[data-hb="${k}"]`); if (!tile) return;
    const r=tile.getBoundingClientRect(); if (r.bottom>innerHeight-50 || r.top<120){ tile.scrollIntoView({block:"center"}); }
    const r2=tile.getBoundingClientRect(), dx=from.left+from.width/2-(r2.left+r2.width/2), dy=from.top+from.height/2-(r2.top+r2.height/2), sc=Math.max(0.06, 52/Math.max(r2.width,r2.height));
    tile.animate([{transform:`translate(${dx}px,${dy}px) scale(${sc}) rotate(10deg)`,opacity:.3,borderRadius:"50%"},{transform:"translate(0,-14px) scale(1.03) rotate(-1.5deg)",opacity:1,offset:.7},{transform:"none",opacity:1}],
      {duration:700, easing:"cubic-bezier(.3,.7,.3,1)"});
  });
  // drag & drop (mouse, pen and touch): the tile lifts off, the others make room smoothly
  let D=null;
  const tiles=()=>[...document.querySelectorAll("#v-home .hcol > .hblock, #v-home .hlist > .hblock")];
  function flip(move){ const els=tiles().filter(t=>t!==D.ph), before=new Map(els.map(t=>[t,t.getBoundingClientRect()])); move();
    for (const t of els){ const a=before.get(t), b=t.getBoundingClientRect(); const dx=a.left-b.left, dy=a.top-b.top; if (dx||dy) t.animate([{transform:`translate(${dx}px,${dy}px)`},{transform:"none"}],{duration:260,easing:"cubic-bezier(.2,.8,.2,1)"}); } }
  document.addEventListener("pointerdown", e=>{
    const g=e.target.closest("[data-pcgrip]"); if (!g || e.button>0) return; const tile=g.closest(".hblock"); if (!tile) return;
    e.preventDefault(); const r=tile.getBoundingClientRect();
    const ph=document.createElement("div"); ph.className="hblock pcph"; ph.style.height=r.height+"px";
    const fly=tile.cloneNode(true); fly.classList.add("pcfly","pclift"); Object.assign(fly.style,{left:r.left+"px",top:r.top+"px",width:r.width+"px",height:r.height+"px"}); document.body.appendChild(fly);
    tile.replaceWith(ph); D={tile, ph, fly, ox:e.clientX-r.left, oy:e.clientY-r.top, id:e.pointerId, last:0};
    fly.animate([{transform:"none"},{transform:"rotate(-2deg) scale(1.03)"}],{duration:180,fill:"forwards",easing:"ease-out"});
    document.documentElement.classList.add("pcdragging");
  });
  document.addEventListener("pointermove", e=>{
    if (!D || e.pointerId!==D.id) return;
    D.fly.style.left=(e.clientX-D.ox)+"px"; D.fly.style.top=(e.clientY-D.oy)+"px";
    // scroll the page when the tile gets near the top or bottom edge
    if (e.clientY>innerHeight-70) scrollBy(0,14); else if (e.clientY<130) scrollBy(0,-14);
    const now=Date.now(); if (now-D.last<60) return; D.last=now;
    const over=document.elementsFromPoint(e.clientX,e.clientY).find(x=>x.matches && x.matches("#v-home .hcol > .hblock, #v-home .hlist > .hblock") && x!==D.ph);
    if (!over) return; const ro=over.getBoundingClientRect(), after=e.clientY>ro.top+ro.height/2;
    if ((after && over.nextElementSibling===D.ph) || (!after && over.previousElementSibling===D.ph)) return;
    flip(()=>over.insertAdjacentElement(after?"afterend":"beforebegin", D.ph));
  });
  const drop=e=>{
    if (!D || (e && e.pointerId!==D.id)) return; const {tile, ph, fly}=D; D=null; document.documentElement.classList.remove("pcdragging");
    const r=ph.getBoundingClientRect(), f=fly.getBoundingClientRect();
    fly.getAnimations().forEach(a=>a.cancel());
    fly.animate([{transform:"rotate(-2deg) scale(1.03)"},{transform:`translate(${r.left-f.left}px,${r.top-f.top}px) rotate(1deg) scale(.99)`,offset:.8},{transform:`translate(${r.left-f.left}px,${r.top-f.top}px)`}],{duration:280,easing:"cubic-bezier(.2,.8,.2,1)",fill:"forwards"})
      .finished.then(()=>{ ph.replaceWith(tile); fly.remove();
        tile.animate([{transform:"scale(.98)"},{transform:"scale(1.01)",offset:.5},{transform:"none"}],{duration:260});
        const dom=tiles().map(t=>t.dataset.hb), min=PCH().min, it=dom[Symbol.iterator]();
        // minimized tiles keep their place, so they come back where they were
        PCH().order=homeOrder().map(k=>min.includes(k) || !dom.includes(k) ? k : it.next().value); save(); });
  };
  document.addEventListener("pointerup", drop); document.addEventListener("pointercancel", drop);
  decorate();
}
/* ---------- light / dark: a button in the header, the sun turns into a moon ---------- */
if (IS_PC){
  const _k3=accTabKeys; accTabKeys = t => _k3(t).filter(k=>k!=="dark");
  const bell=$("bellBtn");
  if (bell && !$("pcTheme")) bell.insertAdjacentHTML("beforebegin", `<button class="roundbtn pctheme" id="pcTheme" aria-label="Hell oder dunkel" title="Hell / Dunkel">
    <svg viewBox="0 0 24 24" class="pcsm"><mask id="pcMoonCut"><rect x="0" y="0" width="24" height="24" fill="#fff"/><circle class="pccut" cx="24" cy="4" r="7" fill="#000"/></mask>
      <circle class="pcorb" cx="12" cy="12" r="5" mask="url(#pcMoonCut)"/>
      <g class="pcrays"><path d="M12 1.5v2.5M12 20v2.5M1.5 12H4M20 12h2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8"/></g></svg></button>`);
  const isDark=()=>document.documentElement.dataset.theme==="dark";
  const sync=()=>{ const b=$("pcTheme"); if (b){ b.setAttribute("aria-pressed", String(isDark())); b.title = isDark() ? "Hell schalten" : "Dunkel schalten"; } };
  sync();
  document.addEventListener("click", e=>{
    const b=e.target.closest("#pcTheme"); if (!b) return;
    const t=isDark()?"light":"dark", r=b.getBoundingClientRect(), x=r.left+r.width/2, y=r.top+r.height/2;
    const apply=()=>{ document.documentElement.dataset.theme=t; try{ localStorage.setItem("hb-theme",t); }catch(_){} sync(); try{ render(); }catch(_){} };
    b.animate([{transform:"rotate(0) scale(1)"},{transform:"rotate(-25deg) scale(.86)",offset:.4},{transform:"rotate(0) scale(1)"}],{duration:520,easing:"cubic-bezier(.3,.7,.3,1)"});
    // the new look spreads out from the button as a growing circle (where the browser supports it)
    if (document.startViewTransition && !pcCalm()){
      const vt=document.startViewTransition(apply);
      vt.ready.then(()=>{ const R=Math.hypot(Math.max(x,innerWidth-x), Math.max(y,innerHeight-y));
        document.documentElement.animate({clipPath:[`circle(0px at ${x}px ${y}px)`,`circle(${R}px at ${x}px ${y}px)`]},{duration:650,easing:"cubic-bezier(.4,0,.2,1)",pseudoElement:"::view-transition-new(root)"}); }).catch(()=>{});
    } else apply();
  });
}
/* ---------- "+" : a big round button; it opens the same three circles as on the phone –
   instead of "Foto" (no camera on the PC) the PC scans straight from the scanner ---------- */
if (IS_PC){
  const fan=$("fanBg"), rc=fan && fan.querySelector('[data-addpick="receipt"]');
  if (rc){ rc.dataset.addpick="pcscan"; rc.innerHTML=`<svg class="i" viewBox="0 0 24 24"><path d="M4 14h16v4.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5z"/><path d="M6 14 8.5 5.5h7L18 14"/><path d="M7.5 17h3"/></svg><span>Scannen</span>`; }
  // always the circles (not the list window of the wide layout); they open to the left and upwards, the button sits in the corner
  openAddMenu = () => { if (!fan.hidden){ fanClose(); return; } fanOpen();
    const R=140; [180,135,90].forEach((a,i)=>{ const t=a*Math.PI/180, b=fan.children[i]; b.style.setProperty("--dx", Math.round(Math.cos(t)*R)+"px"); b.style.setProperty("--dy", Math.round(-Math.sin(t)*R-14)+"px"); }); };
  const SCANW={}; window.hbScanDone=(id,data,err)=>{ const f=SCANW[id]; if (f){ delete SCANW[id]; f(data,err); } };
  const scanNow=()=>new Promise(ok=>{ const id=newId(); SCANW[id]=(d,e)=>ok({d,e}); window.AndroidBridge.scan(id); });
  async function pcScan(){
    if (!window.AndroidBridge || !window.AndroidBridge.scan){ toast("Für den Scanner einmal die neue PC-App installieren – bis dahin kannst du ein Bild auswählen", null, null, 7000); return smartScanFallback({}); }
    toast("Scanner läuft … Beleg bitte auflegen", null, null, 60000);
    const {d,e}=await scanNow();
    if (!d){ toast(e==="noscanner" ? "Kein Scanner gefunden – ist er eingeschaltet und angeschlossen?" : "Scannen hat nicht geklappt: "+e, e==="noscanner"?()=>smartScanFallback({}):null, e==="noscanner"?"Bild wählen":null, 9000); return; }
    toast("Gescannt", null, null, 1200);
    try {
      let img=d; try { const blob=await (await fetch(d)).blob(); img=await shrinkImage(new File([blob],"scan.jpg",{type:"image/jpeg"})); } catch(_){}
      const rv=await docReview(img,{}); if (!rv) return; if (rv.action==="retake") return pcScan(); img=rv.img;
      scanWorking(true); const lines=await ocrDataUrl(img); scanWorking(false);
      const im=await loadImg(img), r=docClassify(lines||[], im.naturalHeight/im.naturalWidth);
      camReview({type:(r&&r.type)||"rcpt", img, lines:lines||[], W:im.naturalWidth, H:im.naturalHeight, noBoxes:false});
    } catch(x){ scanWorking(false); toast(x.message||"Der Scan konnte nicht gelesen werden"); }
  }
  document.addEventListener("click", e=>{ const b=e.target.closest('[data-addpick="pcscan"]'); if (!b) return; e.stopImmediatePropagation(); closeAddMenu(); setTimeout(pcScan, 120); }, true);
}
