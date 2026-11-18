// Test auf echtem Android (Emulator oder Handy per USB) mit der Test-App "MAMI Test".
// Gesten laufen über "adb shell input" – also durch Androids echte Touch-Verarbeitung.
// Aufruf: node android.cjs [screenshot-ordner]   (App muss laufen)
const {_android}=require('playwright'); const {execFileSync}=require('child_process'); const fs=require('fs');
const SHOT=process.argv[2]||'shots', DEV=process.env.HB_DEVICE||'Android', ADB=process.env.ADB||'adb', SER=process.env.ANDROID_SERIAL;
fs.mkdirSync(SHOT,{recursive:true});
const adb=(...a)=>execFileSync(ADB,[...(SER?['-s',SER]:[]),...a],{maxBuffer:64<<20,timeout:30000});
const sh=(...a)=>adb('shell',...a).toString();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const until=async(fn,ms=6000)=>{ const t=Date.now(); let v; while(Date.now()-t<ms){ v=await fn(); if (v) return v; await sleep(250); } return v; };
const fails=[]; let checks=0;
const T0=Date.now(); const ok=(what,cond,info='')=>{ checks++; info=info+(info?' ':'')+`[${Math.round((Date.now()-T0)/1000)}s]`; if(!cond){ fails.push(`${DEV}: ${what}${info?' – '+info:''}`); console.log('  ✗',what,info); } else console.log('  ✓',what); };
const shot=n=>{ try{ fs.writeFileSync(`${SHOT}/${DEV}-${n}.png`, adb('exec-out','screencap','-p')); }catch(e){} };
(async()=>{
  setTimeout(()=>{ console.log('Zeitlimit erreicht (10 Min) – Test hängt'); try{ fs.writeFileSync(`${SHOT}/${DEV}-zeitlimit.png`, adb('exec-out','screencap','-p')); }catch(_){} process.exit(3); }, 600000).unref();
  const devs=await _android.devices(); const dv=SER?devs.find(d=>d.serial()===SER):devs[0]; if(!dv){ console.log('Kein Android-Gerät gefunden'); process.exit(2); }
  const wv=await dv.webView({pkg:process.env.HB_PKG||'de.sascha.haushaltsbuch.test'},{timeout:60000}); const p=await wv.page(); p.setDefaultTimeout(20000); const b={close:()=>dv.close()}; console.log('verbunden');
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  console.log(`== ${DEV} ==  ${p.url()}`);
  if (process.env.HB_RUN){ const v=await p.evaluate(()=>{ const m=document.querySelector('meta[name=hb-version]'); return m&&m.content; }); ok('Test-App enthält die neue Version', v===process.env.HB_RUN, 'gefunden '+v); }
  // Wie ein eingerichteter Nutzer: Erststart-Fenster abhaken, neu laden
  await p.evaluate(()=>{ const L=localStorage; L.setItem('hb-lang','de'); const H=window.__hbt; L.setItem('hb-legal',H?H.legal():'x'); L.setItem('hb-wiz-skip','1'); L.setItem('hb-danke','1'); if (H) L.setItem('hb-seenlog',H.log());
    const t={}; ['home','beruf','zukunft','shop','list','fix','year','ziele','more','import','belege','gemeinsam'].forEach(k=>t[k]=1); L.setItem('hb-ptour',JSON.stringify(t)); });
  await p.reload(); await sleep(4000);
  const hide=()=>p.evaluate(()=>{ document.querySelectorAll('#wizBg').forEach(x=>x.remove()); document.querySelectorAll('[id$=Bg]:not([hidden]),.backdrop:not([hidden]),#mamiPop').forEach(x=>{ x.hidden=true; }); });
  await hide();
  // Testdaten (mehrere Konten), falls die App-Variablen erreichbar sind
  ok('Test-Zugang der Test-App aktiv', await p.evaluate(()=>!!window.__hbt)); await p.evaluate(()=>{ try{ window.__hbt.seed(); }catch(_){} });
  await sleep(800); await hide();
  // Kalibrieren: wo landet ein Android-Tipp in der Seite?
  // Kalibrier-Fläche über allem, damit der Test-Tipp nichts in der App auslöst
  await p.evaluate(()=>{ window.__tp=null; const o=document.createElement('div'); o.id='hbCal'; o.style.cssText='position:fixed;inset:0;z-index:2147483647;background:transparent;touch-action:none';
    const st=e=>{ e.stopPropagation(); e.preventDefault(); }; o.addEventListener('touchstart',e=>{ window.__tp=[e.touches[0].clientX,e.touches[0].clientY]; st(e); },{passive:false}); ['touchend','click','pointerdown','pointerup','mousedown','mouseup'].forEach(t=>o.addEventListener(t,st)); document.body.appendChild(o); });
  shot('start');
  // tatsächliche Bildschirmgröße inkl. Drehung
  let W,H; { const m=sh('dumpsys','display').match(/mCurrentDisplayRect=Rect\(0, 0 - (\d+), (\d+)\)/)||sh('dumpsys','window','displays').match(/cur=(\d+)x(\d+)/); if (m){ W=+m[1]; H=+m[2]; } else [W,H]=sh('wm','size').match(/(\d+)x(\d+)\s*$/m).slice(1).map(Number); }
  const dpr=await p.evaluate(()=>devicePixelRatio); let tp=null, tx=0, ty=0;
  for (const [fx,fy] of [[0.5,0.15],[0.5,0.5],[0.3,0.3],[0.7,0.6]]){ tx=Math.round(W*fx); ty=Math.round(H*fy); await p.evaluate(()=>{ window.__tp=null; }); sh('input','tap',String(tx),String(ty)); await sleep(700); tp=await p.evaluate(()=>window.__tp); if (tp) break; await hide(); }
  if (!tp){ console.log('Kalibrierung: kein Treffer – App wird neu nach vorne geholt'); sh('am','broadcast','-a','android.intent.action.CLOSE_SYSTEM_DIALOGS'); sh('am','start','-n',(process.env.HB_PKG||'de.sascha.haushaltsbuch.test')+'/de.sascha.haushaltsbuch.MainActivity'); await sleep(8000); await p.evaluate(()=>{ if(!document.getElementById('hbCal')){ const o=document.createElement('div'); o.id='hbCal'; o.style.cssText='position:fixed;inset:0;z-index:2147483647'; o.addEventListener('touchstart',e=>{ window.__tp=[e.touches[0].clientX,e.touches[0].clientY]; e.stopPropagation(); e.preventDefault(); },{passive:false}); document.body.appendChild(o);} }).catch(()=>{});
    for (const [fx,fy] of [[0.5,0.15],[0.5,0.5]]){ tx=Math.round(W*fx); ty=Math.round(H*fy); await p.evaluate(()=>{ window.__tp=null; }); sh('input','tap',String(tx),String(ty)); await sleep(900); tp=await p.evaluate(()=>window.__tp); if (tp) break; } }
  if (!tp){ console.log('Kalibrierung fehlgeschlagen', W, H, sh('dumpsys','window').match(/mCurrentFocus=.*/)); shot('kalibrierung'); process.exit(2); }
  const offX=tx/dpr-tp[0], offY=ty/dpr-tp[1]; await p.evaluate(()=>{ const o=document.getElementById('hbCal'); o&&o.remove(); try{ window.__hbt.seed(); }catch(_){} }); await sleep(1500); await hide();
  const D=(x,y)=>[String(Math.round((x+offX)*dpr)),String(Math.round((y+offY)*dpr))];
  const vw=await p.evaluate(()=>innerWidth), vh=await p.evaluate(()=>innerHeight);
  console.log(`Bildschirm ${W}×${H}, Seite ${vw}×${vh} @${dpr}`);
  const swipe=async(x1,y1,x2,y2,ms=260)=>{ sh('input','swipe',...D(x1,y1),...D(x2,y2),String(ms)); await sleep(400); };
  const settle=async()=>{ let a=await view(); for(let i=0;i<8;i++){ await sleep(500); const b2=await view(); if (b2===a) break; a=b2; } await sleep(600); };
  const tap=async(x,y)=>{ sh('input','tap',...D(x,y)); await sleep(700); };
  const view=()=>p.evaluate(()=>{ try{ return window.__hbt.view(); }catch(_){} const v=[...document.querySelectorAll('[data-view]')].find(e=>!e.hidden && e.offsetParent!==null && !e.closest('.cubestage')); return v?v.dataset.view:'?'; });
  async function checkSwipers(label){
    const list=await p.evaluate(()=>{ document.querySelectorAll('[data-tq]').forEach(x=>x.removeAttribute('data-tq')); const v=(()=>{ try{ return document.querySelector(`[data-view="${window.__hbt.view()}"]`); }catch(_){ return null; } })()||[...document.querySelectorAll('main [data-view]')].find(e=>!e.hidden && e.offsetParent!==null)||document; const out=[];
      v.querySelectorAll('.astack:not(.one),.srail').forEach((e,i)=>{ const r=e.getBoundingClientRect(); if(r.width<50||r.height<30) return; e.dataset.tq=i; out.push({i,n:e.id||e.className.split(' ')[0]}); }); return out; });
    for (const s of list){
      await p.evaluate(i=>document.querySelector(`[data-tq="${i}"]`).scrollIntoView({block:'center'}),s.i); await sleep(500);
      const r=await p.evaluate(i=>{const b=document.querySelector(`[data-tq="${i}"]`).getBoundingClientRect(); return [b.x+b.width/2,b.y+b.height/2];},s.i);
      const snap=()=>p.evaluate(i=>{const e=document.querySelector(`[data-tq="${i}"]`); return e?[...e.children].map(c=>c.style.transform+'|'+c.getAttribute('aria-hidden')).join(';'):'WEG';},s.i);
      const v0=await view(), a=await snap(); await swipe(r[0]+vw*0.28,r[1],r[0]-vw*0.28,r[1],220); const b2=await until(async()=>{ const x=await snap(); return x!==a?x:null; },5000)||a; await settle(); const v1=await view();
      ok(`${label}: ${s.n} wischbar`, a!==b2 && v0===v1, v0!==v1?'Seite hat stattdessen gewechselt':a===b2?'nichts bewegt':'');
      await p.evaluate(()=>scrollTo(0,0)); await sleep(300);
    }
  }
  const isPC=await p.evaluate(()=>document.documentElement.classList.contains('pc'));
  console.log(isPC?'Tablet-/PC-Ansicht':'Handy-Ansicht');
  if (isPC){ await checkSwipers('Start'); for (const g of ['beruf','zukunft','shop','home']){
      const t=await p.evaluate(g=>{ const b=document.querySelector(`.tabs .tab[data-go="${g}"]`); if(!b) return null; const r=b.getBoundingClientRect(); return [r.x+r.width/2,r.y+r.height/2]; },g);
      if (t) await tap(...t); else await p.evaluate(g=>{ try{ window.__hbt.go(g); }catch(_){} },g);
      await sleep(1800); await hide();
      const st=await p.evaluate(g=>{ const b=document.querySelector('.tabs .tab[aria-selected="true"]'); const v=document.querySelector(`[data-view="${g}"]`); return {tab:b&&b.dataset.go, h:v?v.getBoundingClientRect().height:0, op:v?getComputedStyle(v).opacity:'-'}; },g);
      ok(`Leiste → ${g}: richtige Seite`, (await view())===g, 'ist '+(await view()));
      ok(`Leiste → ${g}: Knopf markiert`, st.tab===g, 'markiert '+st.tab);
      ok(`Leiste → ${g}: Inhalt sichtbar`, st.h>200 && st.op==='1', `Höhe ${Math.round(st.h)}, Deckkraft ${st.op}`);
      shot(g); await checkSwipers(g); } }
  else {
  const freeY=()=>p.evaluate(()=>{ const B="#moBg,#mbBg,#tourBg,.hobg,.sheet,.backdrop,.fan,.docrev,.pfed,#lockBg,#loginBg,#astack,#zstack,.srail,.bt3,.bubbles,.fxchips,input,select,textarea,.wiz,[data-noswipe],button,a,.tabs,nav";
    const hs=n=>{ for(;n&&n!==document.body;n=n.parentElement){ if(n.scrollWidth>n.clientWidth+2){ const o=getComputedStyle(n).overflowX; if(o==='auto'||o==='scroll') return true; } } return false; };
    for (const f of [0.6,0.55,0.65,0.5,0.7,0.45,0.75,0.4,0.35,0.8]){ const y=innerHeight*f; let good=true; for (const fx of [0.2,0.5,0.8]){ const e=document.elementFromPoint(innerWidth*fx,y); if(!e||e.closest(B)||hs(e)){ good=false; break; } } if (good) return y; } return innerHeight*0.6; });
  // 1) Seiten per echtem Seitwärts-Wischen
  for (let k=0;k<4;k++){ const from=await view(); await sleep(2500); { const y=await freeY(); await swipe(vw-70,y,70,y,300); } await until(async()=>(await view())!==from,6000); await settle(); await hide(); const to=await view();
    ok(`Seitwärts-Wischen ${from} → ${to}`, to!==from); shot('wisch-'+to); await checkSwipers('auf '+to); }
  for (let k=0;k<2;k++){ const from=await view(); await sleep(2500); { const y=await freeY(); await swipe(70,y,vw-70,y,300); } await until(async()=>(await view())!==from,6000); await settle(); await hide(); const to=await view(); ok(`Zurück-Wischen ${from} → ${to}`, to!==from); await checkSwipers('zurück auf '+to); }
  }
  // 2) Startseite: Konto-Karte antippen dreht um, Abbrechen dreht zurück
  await p.evaluate(()=>{ try{ window.__hbt.go('home'); }catch(_){} }); await sleep(2500); await hide();
  const card=await p.evaluate(()=>{ const c=[...document.querySelectorAll('#astack .acard:not(.side)[data-ci]')].find(x=>x.getBoundingClientRect().width>40); if(!c) return null; const r=c.getBoundingClientRect(); return [r.x+r.width/2,r.y+r.height*0.6]; });
  if (card){ await tap(...card); ok('Konto-Karte antippen dreht um', await until(()=>p.evaluate(()=>!!document.querySelector('#astack .aback')),5000)); shot('karte');
    const x=await p.evaluate(()=>{ const b=document.querySelector('[data-acx]'); if(!b) return null; const r=b.getBoundingClientRect(); return [r.x+r.width/2,r.y+r.height/2]; }); if (x){ await tap(...x); ok('Abbrechen dreht Karte zurück', await until(()=>p.evaluate(()=>!document.querySelector('#astack .aback')),5000)); } }
  // 3) Profilbild -> Einstellungen, echte Android-Zurück-Taste
  const av=await p.evaluate(()=>{ const a=document.getElementById('topAv'); if(!a) return null; const r=a.getBoundingClientRect(); return [r.x+r.width/2,r.y+r.height/2]; });
  if (av){ const v0=await view(); await tap(...av); await sleep(500); const v1=await view(); shot('einstellungen'); ok('Profilbild öffnet Einstellungen', v1!==v0);
    sh('input','keyevent','4'); await sleep(900); const v2=await view(); ok('Android-Zurück-Taste führt zurück', v2===v0, 'jetzt '+v2);
    const alive=sh('pidof',process.env.HB_PKG||'de.sascha.haushaltsbuch.test').trim(); ok('App läuft nach Zurück-Taste noch', !!alive); }
  // 4) Abstürze / JS-Fehler
  const crash=sh('logcat','-d','-s','AndroidRuntime:E'); ok('kein App-Absturz (logcat)', !/FATAL EXCEPTION/.test(crash), crash.split('\n').slice(0,6).join(' | '));
  ok('keine JavaScript-Fehler', errs.length===0, errs.slice(0,3).join(' | '));
  shot('ende'); await b.close().catch(()=>{});
  console.log(`\n${checks-fails.length}/${checks} Prüfungen ok`);
  if (fails.length){ console.log('FEHLER:\n- '+fails.join('\n- ')); process.exit(1); }
})().catch(e=>{ console.error(e); process.exit(2); });
