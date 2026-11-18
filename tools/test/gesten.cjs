// Gesten-Test: echte Fingergesten auf Handy- und Tablet-Größe.
// Aufruf: node gesten.cjs <url> [screenshot-ordner]
const {chromium}=require('playwright');
const URL=process.argv[2]||'http://127.0.0.1:8077/app.html', SHOT=process.argv[3]||'/tmp/hbtest/shots';
require('fs').mkdirSync(SHOT,{recursive:true});
const DEVICES=[{name:'Handy',w:412,h:915,dpr:2.6},{name:'Tablet',w:820,h:1180,dpr:2}];
const fails=[]; let checks=0;
const ok=(dev,what,cond,info='')=>{ checks++; if(!cond){ fails.push(`${dev}: ${what}${info?' – '+info:''}`); console.log('  ✗',what,info); } else console.log('  ✓',what); };

async function runDevice(b,D){
  console.log(`\n== ${D.name} (${D.w}×${D.h}) ==`);
  const c=await b.newContext({viewport:{width:D.w,height:D.h},hasTouch:true,isMobile:true,deviceScaleFactor:1,
    userAgent:'Mozilla/5.0 (Linux; Android 14; Test) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36'});
  await c.addInitScript(()=>{ const o=EventTarget.prototype.addEventListener; EventTarget.prototype.addEventListener=function(t,f,x){ if(t==='pointerdown'&&this.id){ (window.__L=window.__L||[]).push(this); } return o.call(this,t,f,x); }; });
  const p=await c.newPage(); const errs=[];
  p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error' && !/net::|Failed to load|favicon|CSP|Content Security/i.test(m.text())) errs.push('console: '+m.text()); });
  await p.goto(URL); await p.waitForTimeout(1500);
  // Erststart-Fenster (Sprache, Zustimmung, Einrichtung, Touren) wie bei einem eingerichteten Nutzer abhaken
  await p.evaluate(()=>{ const L=localStorage; L.setItem('hb-lang','de'); L.setItem('hb-legal',typeof LEGAL_VER!=='undefined'?LEGAL_VER:'x'); L.setItem('hb-wiz-skip','1'); L.setItem('hb-danke','1');
    try{ L.setItem('hb-seenlog',CHANGELOG[0][0]); }catch(_){}
    const t={}; document.querySelectorAll('[data-view]').forEach(v=>t[v.dataset.view]=1); ['home','beruf','zukunft','shop','list','fix','year','ziele','more','import','belege','gemeinsam'].forEach(k=>t[k]=1); L.setItem('hb-ptour',JSON.stringify(t)); });
  await p.reload(); await p.waitForTimeout(2500);
  const cdp=await c.newCDPSession(p);
  const hide=()=>p.evaluate(()=>{ document.querySelectorAll('#wizBg').forEach(x=>x.remove()); document.querySelectorAll('[id$=Bg]:not([hidden]),.backdrop:not([hidden]),#mamiPop').forEach(x=>{ x.hidden=true; }); document.documentElement.classList.remove('tourOn'); });
  await hide();
  // Testdaten: Hauptkonto + Space -> mehrere Konto-Karten
  await p.evaluate(()=>{ const T=window.__T(), d=new Date().toISOString().slice(0,10); T.S.settings.accountAnchors={Hauptkonto:{date:d,balance:1200,ts:Date.now()},Tagesgeld:{date:d,balance:400,ts:Date.now()}}; T.S.settings.name='Test'; T.render(); });
  await p.waitForTimeout(800); await hide();
  const isPC=await p.evaluate(()=>window.__T().IS_PC);
  const view=()=>p.evaluate(()=>window.__T().UI.view);
  const touch=async(x1,y1,x2,y2,steps=12)=>{ const t=(type,x,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y}]});
    await t('touchStart',x1,y1); for(let i=1;i<=steps;i++){ await t('touchMove',x1+(x2-x1)*i/steps,y1+(y2-y1)*i/steps); await p.waitForTimeout(16);} await t('touchEnd'); await p.waitForTimeout(700); };
  const tap=async(x,y)=>{ await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]}); await p.waitForTimeout(40); await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await p.waitForTimeout(600); };

  // Alles prüfen, was man in der aktuellen Seite seitwärts wischen kann
  async function checkSwipers(label){
    const list=await p.evaluate(()=>{ const v=document.querySelector(`[data-view="${window.__T().UI.view}"]`)||document; const out=[]; document.querySelectorAll('[data-tq]').forEach(x=>x.removeAttribute('data-tq'));
      v.querySelectorAll('.astack:not(.one),.srail').forEach((e,i)=>{ const r=e.getBoundingClientRect(); if(r.width<50||r.height<30) return; e.dataset.tq=i; out.push({i,cls:e.className.split(' ')[0],id:e.id,x:r.x+r.width/2,y:r.y+r.height/2,top:r.top,h:r.height}); }); return out; });
    for (const s of list){
      if (s.top<0 || s.top+s.h>D.h){ await p.evaluate(i=>document.querySelector(`[data-tq="${i}"]`).scrollIntoView({block:'center'}),s.i); await p.waitForTimeout(400);
        const r=await p.evaluate(i=>{const b=document.querySelector(`[data-tq="${i}"]`).getBoundingClientRect(); return {x:b.x+b.width/2,y:b.y+b.height/2};},s.i); s.x=r.x; s.y=r.y; }
      const snap=()=>p.evaluate(i=>{const e=document.querySelector(`[data-tq="${i}"]`); return e?[...e.children].map(ch=>ch.style.transform+'|'+ch.getAttribute('aria-hidden')).join(';'):'WEG';},s.i); const idx=()=>p.evaluate(()=>JSON.stringify([window.__T().UI.zkIdx,window.__T().UI.cardIdx]));
      const hit=await p.evaluate(([x,y])=>{const e=document.elementFromPoint(x,y); return e?(e.id||e.className||e.tagName)+'':'-';},[s.x,s.y]); const i0=await idx(); const v0=await view(), a=await snap(); await touch(s.x+110,s.y,s.x-110,s.y); const b2=await snap(), v1=await view(), i1=await idx(); if(a===b2) console.log('   dbg',i0,i1, await p.evaluate(i=>{const e=document.querySelector(`[data-tq="${i}"]`); const L=(window.__L||[]).filter(x=>x.id===e.id); return {cards:e._cards&&e._cards.map(c=>c.parentNode===e), key:e._key, kids:e.children.length, inst:L.length, same:L.map(x=>x===e), conn:L.map(x=>x.isConnected), all:document.querySelectorAll('#'+e.id).length};},s.i));
      ok(D.name,`${label}: ${s.id||s.cls} wischbar`, a!==b2 && v0===v1, v0!==v1?'Seite hat stattdessen gewechselt':a===b2?'nichts bewegt (Finger auf: '+hit+')':'');
      await p.evaluate(()=>window.scrollTo(0,0)); await p.waitForTimeout(200);
    }
    return list.length;
  }

  const ORDER=['home','beruf','zukunft','shop'];
  if (!isPC){
    // 1) Jede Seite per echtem Seitwärts-Wischen erreichen und dort alles wischen
    await p.evaluate(()=>{ const T=window.__T(); T.UI.view='home'; T.render(); }); await p.waitForTimeout(3500); await hide();
    for (let k=0;k<ORDER.length;k++){
      const from=await view(); await p.waitForTimeout(2500); // Vorab-Aufbau abwarten (wie im echten Leben)
      await touch(D.w-40,D.h*0.72,40,D.h*0.72,14); await hide();
      const to=await view(); ok(D.name,`Seitwärts-Wischen ${from} → nächste Seite`, to!==from, 'Seite blieb '+from);
      await checkSwipers(`nach Wischen auf ${to}`);
    }
    // 2) Andersherum
    for (let k=0;k<2;k++){ const from=await view(); await p.waitForTimeout(2500); await touch(40,D.h*0.72,D.w-40,D.h*0.72,14); await hide(); ok(D.name,`Zurück-Wischen von ${from}`, (await view())!==from); await checkSwipers(`nach Zurück-Wischen auf ${await view()}`); }
  }
  // 3) Jede Seite direkt öffnen + nach Hintergrund-Abgleich (render mit/ohne keep)
  for (const v of ORDER){
    await p.evaluate(v=>{ const T=window.__T(); T.UI.view=v; T.render(); },v); await p.waitForTimeout(700); await hide();
    const n=await checkSwipers(`${v} direkt`);
    await p.evaluate(()=>{ const T=window.__T(); T.render.keep=true; T.render(); T.render.keep=false; T.render(); }); await p.waitForTimeout(600);
    if (n) await checkSwipers(`${v} nach Abgleich`);
    await p.screenshot({path:`${SHOT}/${D.name}-${v}.png`});
  }
  // 4) Konto-Karte antippen -> dreht sich um, Esc schließt
  await p.evaluate(()=>{ const T=window.__T(); T.UI.view='home'; T.render(); }); await p.waitForTimeout(800); await hide();
  const card=await p.evaluate(()=>{ const c=[...document.querySelectorAll('#astack .acard:not(.side)[data-ci]')].find(x=>x.getBoundingClientRect().width>40); if(!c) return null; const r=c.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height*0.6}; });
  if (card){ await tap(card.x,card.y); await p.waitForTimeout(500); ok(D.name,'Konto-Karte antippen dreht um', await p.evaluate(()=>!!document.querySelector('#astack .aback')));
    await p.keyboard.press('Escape'); await p.waitForTimeout(600); ok(D.name,'Esc dreht Karte zurück', await p.evaluate(()=>!document.querySelector('#astack .aback'))); }
  // 5) Profilbild -> Einstellungen, Zurück-Taste schließt
  const av=await p.evaluate(()=>{ const a=document.getElementById('topAv'); if(!a) return null; const r=a.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; });
  if (av){ const v0=await view(); await tap(av.x,av.y); await p.waitForTimeout(600); const v1=await view(); ok(D.name,'Profilbild öffnet Einstellungen', v1!==v0 || await p.evaluate(()=>!!document.querySelector('.sheet:not([hidden]),#spBg:not([hidden])')));
    await p.evaluate(()=>window.hbBack&&window.hbBack()); await p.waitForTimeout(600); ok(D.name,'Zurück-Taste führt zurück', (await view())===v0 || (await view())==='home'); }
  ok(D.name,'keine JavaScript-Fehler', errs.length===0, errs.slice(0,3).join(' | '));
  await c.close();
}
(async()=>{ const b=await chromium.launch();
  for (const D of DEVICES) await runDevice(b,D);
  await b.close();
  console.log(`\n${checks-fails.length}/${checks} Prüfungen ok`);
  if (fails.length){ console.log('FEHLER:\n- '+fails.join('\n- ')); process.exit(1); }
})().catch(e=>{ console.error(e); process.exit(2); });
