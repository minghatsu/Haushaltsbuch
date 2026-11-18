// Test auf echtem Android (Emulator oder Handy per USB) mit der Test-App "MAMI Test".
// Gesten laufen über "adb shell input" – also durch Androids echte Touch-Verarbeitung.
// Aufruf: node android.cjs [screenshot-ordner]   (App muss laufen)
const {_android}=require('playwright'); const {execFileSync}=require('child_process'); const fs=require('fs');
const SHOT=process.argv[2]||'shots', DEV=process.env.HB_DEVICE||'Android', ADB=process.env.ADB||'adb', SER=process.env.ANDROID_SERIAL;
fs.mkdirSync(SHOT,{recursive:true});
const adb=(...a)=>execFileSync(ADB,[...(SER?['-s',SER]:[]),...a],{maxBuffer:64<<20});
const sh=(...a)=>adb('shell',...a).toString();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const fails=[]; let checks=0;
const ok=(what,cond,info='')=>{ checks++; if(!cond){ fails.push(`${DEV}: ${what}${info?' – '+info:''}`); console.log('  ✗',what,info); } else console.log('  ✓',what); };
const shot=n=>{ try{ fs.writeFileSync(`${SHOT}/${DEV}-${n}.png`, adb('exec-out','screencap','-p')); }catch(e){} };
(async()=>{
  const devs=await _android.devices(); const dv=SER?devs.find(d=>d.serial()===SER):devs[0]; if(!dv){ console.log('Kein Android-Gerät gefunden'); process.exit(2); }
  const wv=await dv.webView({pkg:process.env.HB_PKG||'de.sascha.haushaltsbuch.test'},{timeout:60000}); const p=await wv.page(); const b={close:()=>dv.close()};
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  console.log(`== ${DEV} ==  ${p.url()}`);
  if (process.env.HB_RUN){ const v=await p.evaluate(()=>{ const m=document.querySelector('meta[name=hb-version]'); return m&&m.content; }); ok('Test-App enthält die neue Version', v===process.env.HB_RUN, 'gefunden '+v); }
  // Wie ein eingerichteter Nutzer: Erststart-Fenster abhaken, neu laden
  await p.evaluate(()=>{ const L=localStorage; L.setItem('hb-lang','de'); try{ L.setItem('hb-legal',LEGAL_VER); }catch(_){ L.setItem('hb-legal','x'); } L.setItem('hb-wiz-skip','1'); L.setItem('hb-danke','1'); try{ L.setItem('hb-seenlog',CHANGELOG[0][0]); }catch(_){}
    const t={}; ['home','beruf','zukunft','shop','list','fix','year','ziele','more','import','belege','gemeinsam'].forEach(k=>t[k]=1); L.setItem('hb-ptour',JSON.stringify(t)); });
  await p.reload(); await sleep(4000);
  const hide=()=>p.evaluate(()=>{ document.querySelectorAll('#wizBg').forEach(x=>x.remove()); document.querySelectorAll('[id$=Bg]:not([hidden]),.backdrop:not([hidden]),#mamiPop').forEach(x=>{ x.hidden=true; }); });
  await hide();
  // Testdaten (mehrere Konten), falls die App-Variablen erreichbar sind
  await p.evaluate(()=>{ try{ const d=new Date().toISOString().slice(0,10); S.settings.accountAnchors={Hauptkonto:{date:d,balance:1200,ts:Date.now()},Tagesgeld:{date:d,balance:400,ts:Date.now()}}; S.settings.name='Test'; render(); }catch(_){} });
  await sleep(800); await hide();
  // Kalibrieren: wo landet ein Android-Tipp in der Seite?
  await p.evaluate(()=>{ window.__tp=null; addEventListener('touchstart',e=>{ window.__tp=[e.touches[0].clientX,e.touches[0].clientY]; },{capture:true,passive:true}); });
  const [W,H]=sh('wm','size').match(/(\d+)x(\d+)\s*$/m).slice(1).map(Number);
  sh('input','tap',String(Math.round(W/2)),String(Math.round(H*0.15))); await sleep(500);
  const tp=await p.evaluate(()=>window.__tp), dpr=await p.evaluate(()=>devicePixelRatio);
  if (!tp){ console.log('Kalibrierung fehlgeschlagen'); process.exit(2); }
  const offX=W/2/dpr-tp[0], offY=H*0.15/dpr-tp[1]; await hide();
  const D=(x,y)=>[String(Math.round((x+offX)*dpr)),String(Math.round((y+offY)*dpr))];
  const vw=await p.evaluate(()=>innerWidth), vh=await p.evaluate(()=>innerHeight);
  console.log(`Bildschirm ${W}×${H}, Seite ${vw}×${vh} @${dpr}`);
  const swipe=async(x1,y1,x2,y2,ms=260)=>{ sh('input','swipe',...D(x1,y1),...D(x2,y2),String(ms)); await sleep(900); };
  const tap=async(x,y)=>{ sh('input','tap',...D(x,y)); await sleep(700); };
  const view=()=>p.evaluate(()=>{ const v=[...document.querySelectorAll('[data-view]')].find(e=>!e.hidden && e.offsetParent!==null && !e.closest('.cubestage')); return v?v.dataset.view:'?'; });
  async function checkSwipers(label){
    const list=await p.evaluate(()=>{ document.querySelectorAll('[data-tq]').forEach(x=>x.removeAttribute('data-tq')); const v=[...document.querySelectorAll('[data-view]')].find(e=>!e.hidden && e.offsetParent!==null && !e.closest('.cubestage'))||document; const out=[];
      v.querySelectorAll('.astack:not(.one),.srail').forEach((e,i)=>{ const r=e.getBoundingClientRect(); if(r.width<50||r.height<30) return; e.dataset.tq=i; out.push({i,n:e.id||e.className.split(' ')[0]}); }); return out; });
    for (const s of list){
      await p.evaluate(i=>document.querySelector(`[data-tq="${i}"]`).scrollIntoView({block:'center'}),s.i); await sleep(500);
      const r=await p.evaluate(i=>{const b=document.querySelector(`[data-tq="${i}"]`).getBoundingClientRect(); return [b.x+b.width/2,b.y+b.height/2];},s.i);
      const snap=()=>p.evaluate(i=>{const e=document.querySelector(`[data-tq="${i}"]`); return e?[...e.children].map(c=>c.style.transform+'|'+c.getAttribute('aria-hidden')).join(';'):'WEG';},s.i);
      const v0=await view(), a=await snap(); await swipe(r[0]+vw*0.28,r[1],r[0]-vw*0.28,r[1],220); const b2=await snap(), v1=await view();
      ok(`${label}: ${s.n} wischbar`, a!==b2 && v0===v1, v0!==v1?'Seite hat stattdessen gewechselt':a===b2?'nichts bewegt':'');
      await p.evaluate(()=>scrollTo(0,0)); await sleep(300);
    }
  }
  const isPC=await p.evaluate(()=>document.documentElement.classList.contains('pc'));
  console.log(isPC?'Tablet-/PC-Ansicht':'Handy-Ansicht');
  if (isPC){ await checkSwipers('Start'); for (const g of ['beruf','zukunft','shop','home']){ await p.evaluate(g=>{ try{ UI.view=g; render(); }catch(_){} },g); await sleep(900); await hide(); shot(g); await checkSwipers(g); } }
  else {
  // 1) Seiten per echtem Seitwärts-Wischen
  for (let k=0;k<4;k++){ const from=await view(); await sleep(2500); await swipe(vw-30,vh*0.72,30,vh*0.72,280); await hide(); const to=await view();
    ok(`Seitwärts-Wischen ${from} → ${to}`, to!==from); shot('wisch-'+to); await checkSwipers('auf '+to); }
  for (let k=0;k<2;k++){ const from=await view(); await sleep(2500); await swipe(30,vh*0.72,vw-30,vh*0.72,280); await hide(); const to=await view(); ok(`Zurück-Wischen ${from} → ${to}`, to!==from); await checkSwipers('zurück auf '+to); }
  }
  // 2) Startseite: Konto-Karte antippen dreht um, Abbrechen dreht zurück
  await p.evaluate(()=>{ try{ UI.view='home'; render(); }catch(_){ const b=document.querySelector('[data-go="home"]'); b&&b.click(); } }); await sleep(900); await hide();
  const card=await p.evaluate(()=>{ const c=document.querySelector('#astack .acard:not(.side)[data-ci]'); if(!c) return null; const r=c.getBoundingClientRect(); return [r.x+r.width/2,r.y+r.height*0.6]; });
  if (card){ await tap(...card); await sleep(400); ok('Konto-Karte antippen dreht um', await p.evaluate(()=>!!document.querySelector('#astack .aback'))); shot('karte');
    const x=await p.evaluate(()=>{ const b=document.querySelector('[data-acx]'); if(!b) return null; const r=b.getBoundingClientRect(); return [r.x+r.width/2,r.y+r.height/2]; }); if (x){ await tap(...x); await sleep(500); ok('Abbrechen dreht Karte zurück', await p.evaluate(()=>!document.querySelector('#astack .aback'))); } }
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
