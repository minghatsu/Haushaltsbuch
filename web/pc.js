/* PC-Ansicht */
function pcOn(){
  if (pcOn.done || !IS_PC) return; pcOn.done=true;
  const st=document.getElementById("pcCss"); if (st) st.media="all";
  document.documentElement.classList.add("pc");
  if (IS_TAB){ const h=document.documentElement; h.classList.add("istab"); const o=()=>h.classList.toggle("tabp", innerHeight>innerWidth); o(); addEventListener("resize", o); }
  const tabs=document.querySelector(".tabs"), first=tabs && tabs.querySelector('.tab[data-go="home"]'), last=tabs && tabs.querySelector(".tab.tset");
  if (first && !tabs.querySelector(".pcarr")){
    first.insertAdjacentHTML("beforebegin", `<button class="pcarr" data-pcstep="-1" aria-label="Vorherige Seite (Pfeil links)"><svg class="i" viewBox="0 0 24 24"><path d="m15 6-6 6 6 6"/></svg></button>`);
    (last||first).insertAdjacentHTML("afterend", `<button class="pcarr" data-pcstep="1" aria-label="Nächste Seite (Pfeil rechts)"><svg class="i" viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg></button>`);
  }
}
const PC_ORDER=["home","list","fix","shop","year","more"];
const PC_ANIM={busy:false, pass:false};
function pcTiles(sec, leaving){
  if (!sec) return [];
  const out=[];
  if (!leaving && ((sec.id==="v-fix" && sec.classList.contains("pcfcal")) || sec.id==="v-list" || sec.id==="v-shop")) return out;
  for (const c of sec.children){
    if (c.matches(".hcols,.cols")) c.querySelectorAll(":scope > .hcol > *, :scope > .col > *").forEach(x=>out.push(x));
    else if (leaving && c.matches("#setHome")) c.querySelectorAll(".pcsl, .pcsr .pcsph, .pcsr .sabody, .pcsr .pctk, .pcsr .invpc > section").forEach(x=>out.push(x));
    else if (leaving && c.matches(".pcset,.pcana,.pcshop,.pcsnone,.zstack")) [...c.querySelectorAll(":scope > *")].forEach(x=>{ if (x.matches(".pcsr,.pcana > .pcac")) [...x.children].forEach(y=>out.push(y)); else out.push(x); });
    else out.push(c);
  }
  return out.filter(e=>{ if (e.hidden || e.closest("[hidden]")) return false; const r=e.getBoundingClientRect(); return r.width>0 && r.height>0 && r.bottom>0 && r.top<innerHeight; }).slice(0,40);
}
function pcCalm(){ return matchMedia("(prefers-reduced-motion: reduce)").matches; }
function pcGo(k, nav){
  if (PC_ANIM.busy){ PC_ANIM.next=()=>pcGo(k, nav); return true; }
  const sec=document.querySelector(`[data-view="${UI.view}"]`), olds=pcCalm()?[]:[...pcTiles(sec, true), ...(window.pcDockEls&&UI.view==="home"?pcDockEls():[])];
  PC_ANIM.busy=true; if (k==="home") pcHome.intro=true; document.documentElement.classList.add("pcanim");
  const outs=olds.map((e,i,a)=>e.animate([{opacity:1,transform:"none"},{opacity:0,transform:`translateY(${Math.round(innerHeight*0.6+i*24)}px) rotate(${i%2?9:-9}deg)`}],
    {duration:300, delay:(a.length-1-i)*22, easing:"cubic-bezier(.55,0,1,.45)", fill:"forwards"}));
  const done=()=>{
    PC_ANIM.pass=true; try { nav(); } finally { PC_ANIM.pass=false; }
    const news0=pcCalm()?[]:[...pcTiles(document.querySelector(`[data-view="${UI.view}"]`)), ...(window.pcDockEls?pcDockEls():[])];
    news0.forEach(e=>{ e.style.opacity="0"; });
    outs.forEach(a=>{ try { a.cancel(); } catch(_){} });
    { const dk=$("pcDock"); if (dk && !dk.hidden && !pcCalm()) dk.animate([{opacity:0,transform:"translateX(60px)"},{opacity:1,transform:"none"}],{duration:420,easing:"cubic-bezier(.2,.8,.2,1)",fill:"backwards"}); }
    {
      const news=pcCalm()?[]:[...pcTiles(document.querySelector(`[data-view="${UI.view}"]`)), ...(window.pcDockEls?pcDockEls():[])];
      news0.forEach(e=>{ e.style.opacity=""; });
      news.forEach((e,i)=>e.animate([{opacity:0,transform:`translateY(${-Math.round(innerHeight*0.8)}px) rotate(${i%2?-6:6}deg)`},{opacity:1,transform:"translateY(14px) rotate(0)",offset:.6},{transform:"translateY(-6px)",offset:.8},{opacity:1,transform:"none"}],
        {duration:560, delay:i*Math.min(45, 630/Math.max(1,news.length)), easing:"cubic-bezier(.3,.7,.3,1)", fill:"backwards"}));
      setTimeout(()=>{ PC_ANIM.busy=false; const n=PC_ANIM.next; PC_ANIM.next=null; if (n) n(); }, 160);
      clearTimeout(pcGo.t); pcGo.t=setTimeout(()=>{ if (!PC_ANIM.busy) document.documentElement.classList.remove("pcanim"); }, 160+Math.min(14,news.length)*45+700);
    }
  };
  if (outs.length) Promise.all(outs.map(a=>a.finished)).then(done, done); else done();
  return true;
}
function pcStep(d){
  if (PC_ANIM.busy){ PC_ANIM.pend=(PC_ANIM.pend||0)+d; PC_ANIM.next=()=>{ const n=PC_ANIM.pend; PC_ANIM.pend=0; if (n) pcStep(n); }; return true; }
  const i=PC_ORDER.indexOf(UI.view); if (i<0 || (UI.view==="more" && UI.sp) || document.querySelector(".backdrop:not([hidden])")) return false;
  const b=document.querySelector(`.tabs [data-go="${PC_ORDER[((i+d)%PC_ORDER.length+PC_ORDER.length)%PC_ORDER.length]}"]`); if (!b) return false;
  return pcGo(b.dataset.go, ()=>b.click());
}
window.pcStep=pcStep;
document.addEventListener("click", e=>{ const b=e.target.closest("[data-pcstep]"); if (b) pcStep(Number(b.dataset.pcstep)); });
document.addEventListener("click", e=>{
  if (!IS_PC || PC_ANIM.pass) return;
  const b=e.target.closest("[data-go]"); if (!b || !PC_ORDER.includes(b.dataset.go) || b.dataset.go===UI.view || b.dataset.scroll || document.querySelector(".backdrop:not([hidden])")) return;
  e.preventDefault(); e.stopImmediatePropagation();
  pcGo(b.dataset.go, ()=>b.click());
}, true);
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
  const first=String(S.settings.name||"").trim().split(/\s+/)[0], greet=first ? (I18N.tr ? I18N.tr("Hallo") : "Hallo") : devModel();
  const many=accts.filter(a=>!a.total).length>1;
  const hi=Math.max(0, accts.findIndex(a=>a.total)), heroCol=accts.length ? userCol("acct", accts[hi].name) : "";
  const html=`<aside class="pchero" id="pcHero"${heroCol?` style="--herocol:${heroCol};--herocol2:color-mix(in srgb, ${heroCol} 78%, #000);--heroring:color-mix(in srgb, ${heroCol} 45%, #fff);background:linear-gradient(160deg, ${heroCol} 0%, color-mix(in srgb, ${heroCol} 62%, #000) 70%);box-shadow:0 18px 40px color-mix(in srgb, ${heroCol} 20%, transparent)"`:""}>
    <small class="pchi"><span>${esc(greet)}</span>${first?", "+esc(first):""} · <span>${esc(MONTHS[m-1])} ${y}</span></small>
    <div class="pcbal" data-cv="${tot}" data-cf="eur">${esc(eur(tot))}</div>
    <span class="pcsub">${many?"auf allen Konten":"auf deinem Konto"}</span>
    <div class="pcaccs">${accts.filter(a=>!a.total).map(a=>{ const ac=userCol("acct", a.name); return `<button class="${a.main?"main":""}" data-spgo="konten"${ac?` style="background:color-mix(in srgb, ${ac} 55%, transparent)"`:""}><span>${esc(a.main?(mainName||"Hauptkonto"):a.name)}</span><b data-cv="${Number(a.bal)||0}" data-cf="eur">${esc(eur(Number(a.bal)||0))}</b></button>`; }).join("")}<button class="add" data-spgo="konten"><span>+ Space</span><b>anlegen</b></button></div>
    <button class="pcring" data-go="year" style="--p:${Math.round(pct*100)}" aria-label="Analyse öffnen"><span>${isCur
      ? `<small>noch pro Tag</small><b data-cv="${perDay}">${esc(eur0(perDay))}</b><small>${left} ${left===1?"Tag":"Tage"} übrig</small><small class="pcravg">bisher Ø ${esc(eur0(c.expenses/Math.max(1,new Date().getDate())))} / Tag</small>`
      : `<small>${c.net>=0?"übrig":"mehr ausgegeben"}</small><b data-cv="${Math.abs(c.net)}">${esc(eur0(Math.abs(c.net)))}</b><small>im ${esc(MONTHS[m-1])}</small>`}</span></button>
    <div class="pcminis">
      <button data-go="list"><span>Einnahmen</span><b data-cv="${c.income}">${esc(eur0(c.income))}</b></button>
      <button data-go="list"><span>Ausgaben</span><b data-cv="${c.expenses}">${esc(eur0(c.expenses))}</b></button>
      <button data-go="fix"><span>Fixkosten offen</span><b data-cv="${c.fixOpen}">${esc(eur0(c.fixOpen))}</b></button>
    </div>
  </aside>`;
  const v=$("v-home"); if (!v) return; const old=v.querySelector("#pcHero"); if (old) old.remove(); v.insertAdjacentHTML("afterbegin", html);
  if (pcHome.intro){ pcHome.intro=false; pcHeroIntro.t0=performance.now()+260; }
  if (performance.now() < (pcHeroIntro.t0||0)+1100) pcHeroIntro(v.querySelector("#pcHero"));
  const hc=v.querySelector(".hcols"); if (hc && hc.children.length===2){ const [a,b]=[...hc.children], A=[...a.children], B=[...b.children];
    a.replaceChildren(...A.flatMap((x,i)=>B[i]?[x,B[i]]:[x]), ...B.slice(A.length)); b.remove(); }
}
if (IS_PC){ pcOn(); pcHome.intro=true; try { if (UI.view==="home") renderHome(); } catch(e){} }
/* Fußzeile */
if (IS_DESK){
  const _keys=accTabKeys; accTabKeys = t => _keys(t).filter(k=>k!=="recht");
  const LEG=[["impressum","Impressum"],["datenschutz","Datenschutz"],["agb","Nutzungsbedingungen"],["lizenzen","Lizenzen"]].filter(([k])=>LEGAL[k]);
  document.body.insertAdjacentHTML("beforeend", `<footer class="pcfoot" id="pcFoot"><span class="pcfn"><b>Finanz MAMI</b> · PC <span id="pcVer"></span></span>
    <button class="pcfs" id="pcSync" data-spgo="sync"><i></i><span id="pcSyncT"></span></button>
    <span class="pcfr">
    ${LEG.map(([k,t])=>`<button data-pclegal="${k}">${t}</button>`).join("")}</span></footer>
    <div class="backdrop" id="pcLegalBg" hidden><div class="sheet pclegal" role="dialog" aria-modal="true"><div class="sheet-head"><h2 id="pcLegalT"></h2><button class="icon-btn" data-pclegalclose="1" aria-label="Schließen"><svg class="i" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div><div class="legal" id="pcLegalB"></div></div></div>`);
  const foot=()=>{ const v=$("pcVer"); if (v) v.textContent=verFull();
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
if (IS_PC){
  const PC_I18N={
    "Neu in dieser Version":["New in this version","Bu sürümde yeni","Новое в этой версии","Нове в цій версії","Nowości w tej wersji","الجديد في هذا الإصدار","Nou în această versiune"],
    "Abgeglichen {n}:{n}":["Synced {n}:{n}","Eşitlendi {n}:{n}","Синхронизировано {n}:{n}","Синхронізовано {n}:{n}","Zsynchronizowano {n}:{n}","تمت المزامنة {n}:{n}","Sincronizat {n}:{n}"],
    "Wird abgeglichen …":["Syncing …","Eşitleniyor …","Синхронизация …","Синхронізація …","Synchronizacja …","جارٍ المزامنة …","Se sincronizează …"],
    "Scan prüfen":["Check scan","Taramayı kontrol et","Проверить скан","Перевірити скан","Sprawdź skan","تحقق من المسح","Verifică scanarea"],
    "Neu scannen":["Scan again","Yeniden tara","Сканировать снова","Сканувати знову","Skanuj ponownie","امسح مرة أخرى","Scanează din nou"],
    "Scanner":["Scanner","Tarayıcı","Сканер","Сканер","Skaner","الماسح","Scaner"],
    "Seite leer":["Page empty","Sayfa boş","Страница пустая","Сторінка порожня","Strona pusta","الصفحة فارغة","Pagină goală"],
    "nichts erkannt":["nothing found","hiçbir şey yok","ничего не найдено","нічого не знайдено","nic nie znaleziono","لم يُعثر على شيء","nimic găsit"],
    "Gescannt":["Scanned","Tarandı","Отсканировано","Відскановано","Zeskanowano","تم المسح","Scanat"],
    "{n} dpi":["{n} dpi","{n} dpi","{n} dpi","{n} dpi","{n} dpi","{n} dpi","{n} dpi"],
    "Beleg":["Receipt","Fiş","Чек","Чек","Paragon","الإيصال","Bon"],
    "Gefunden":["Found","Bulundu","Найден","Знайдено","Znaleziono","تم العثور عليه","Găsit"],
    "Nicht gefunden":["Not found","Bulunamadı","Не найден","Не знайдено","Nie znaleziono","لم يُعثر عليه","Negăsit"],
    "Ecken an den Beleg ziehen":["Drag the corners to the receipt","Köşeleri fişe sürükle","Перетащи углы к чеку","Перетягни кути до чека","Przeciągnij rogi do paragonu","اسحب الزوايا إلى الإيصال","Trage colțurile la bon"],
    "Die Seite ist leer – leg den Beleg mit der Schrift nach unten auf die Glasscheibe und klicke auf „Neu scannen“.":["The page is empty – put the receipt face down on the glass and click “Scan again”.","Sayfa boş – fişi yazılı yüzü aşağı gelecek şekilde cama koy ve “Yeniden tara”ya tıkla.","Страница пустая – положи чек текстом вниз на стекло и нажми «Сканировать снова».","Сторінка порожня – поклади чек текстом донизу на скло й натисни «Сканувати знову».","Strona jest pusta – połóż paragon tekstem do dołu na szybie i kliknij „Skanuj ponownie”.","الصفحة فارغة – ضع الإيصال ووجهه للأسفل على الزجاج واضغط «امسح مرة أخرى».","Pagina e goală – pune bonul cu fața în jos pe sticlă și apasă „Scanează din nou”."],
    "Zieh die gelben Ecken an den Rand des Belegs, dann wird nur der Beleg übernommen.":["Drag the yellow corners to the edge of the receipt, then only the receipt is used.","Sarı köşeleri fişin kenarına sürükle, böylece yalnızca fiş alınır.","Перетащи жёлтые углы к краю чека – тогда возьмётся только чек.","Перетягни жовті кути до краю чека – тоді візьметься лише чек.","Przeciągnij żółte rogi do krawędzi paragonu – wtedy zostanie użyty tylko paragon.","اسحب الزوايا الصفراء إلى حافة الإيصال، فيُؤخذ الإيصال فقط.","Trage colțurile galbene la marginea bonului, apoi se preia doar bonul."],
    "Wirklich endgültig löschen?":["Really delete for good?","Gerçekten kalıcı olarak silinsin mi?","Удалить навсегда?","Видалити назавжди?","Na pewno usunąć na zawsze?","هل تريد الحذف نهائيًا؟","Ștergi definitiv?"],
    "Aktualisieren":["Refresh","Yenile","Обновить","Оновити","Odśwież","تحديث","Reîmprospătează"],
    "Aktualisiert":["Updated","Güncellendi","Обновлено","Оновлено","Zaktualizowano","تم التحديث","Actualizat"],
    "Feedback gelöscht":["Feedback deleted","Geri bildirim silindi","Отзыв удалён","Відгук видалено","Opinia usunięta","تم حذف الملاحظات","Feedback șters"],
    "Buchung anklicken":["Click a booking","Bir kayda tıkla","Нажми на запись","Натисни на запис","Kliknij wpis","انقر على قيد","Apasă pe o înregistrare"],
    "dann erscheint sie hier groß – mit Beleg":["it then shows up here, with its receipt","burada fişiyle büyük görünür","она появится здесь с чеком","він з'явиться тут із чеком","pojawi się tutaj z paragonem","سيظهر هنا مع الإيصال","apare aici, cu bonul"],
    "Kein Beleg":["No receipt","Fiş yok","Нет чека","Немає чека","Brak paragonu","لا إيصال","Fără bon"],
    "Beleg hinzufügen":["Add receipt","Fiş ekle","Добавить чек","Додати чек","Dodaj paragon","إضافة إيصال","Adaugă bon"],
    "Duplizieren":["Duplicate","Kopyala","Дублировать","Дублювати","Duplikuj","تكرار","Duplică"],
    "nächste Buchung":["next booking","sonraki kayıt","следующая запись","наступний запис","następny wpis","القيد التالي","următoarea"],
    "diesen Monat":["this month","bu ay","в этом месяце","цього місяця","w tym miesiącu","هذا الشهر","luna aceasta"],
    "{n} Buchungen":["{n} bookings","{n} kayıt","{n} записей","{n} записів","{n} wpisów","{n} قيود","{n} înregistrări"],
    "Bezahlt":["Paid","Ödeme","Оплата","Оплата","Płatność","الدفع","Plată"],
    "Karte / Konto":["Card / account","Kart / hesap","Карта / счёт","Картка / рахунок","Karta / konto","بطاقة / حساب","Card / cont"],
    "Wiederkehrend":["Recurring","Tekrarlayan","Повторяется","Повторюється","Cykliczne","متكرر","Recurent"],
    "Art":["Type","Tür","Тип","Тип","Rodzaj","النوع","Tip"],
    "Netto":["Net","Net","Нетто","Нетто","Netto","الصافي","Net"],
    "Text":["Text","Metin","Текст","Текст","Tekst","النص","Text"],
    "überfällig":["overdue","gecikmiş","просрочено","прострочено","po terminie","متأخر","restant"],
    "Ohne festen Tag":["No fixed day","Sabit gün yok","Без определённого дня","Без визначеного дня","Bez stałego dnia","بدون يوم محدد","Fără zi fixă"],
    "auf einen Tag im Kalender ziehen":["drag onto a day in the calendar","takvimde bir güne sürükle","перетащите на день в календаре","перетягніть на день у календарі","przeciągnij na dzień w kalendarzu","اسحبه إلى يوم في التقويم","trage pe o zi din calendar"],
    "hierher ziehen, um den Tag zu entfernen":["drag here to remove the day","günü kaldırmak için buraya sürükle","перетащите сюда, чтобы убрать день","перетягніть сюди, щоб прибрати день","przeciągnij tutaj, aby usunąć dzień","اسحبه إلى هنا لإزالة اليوم","trage aici pentru a elimina ziua"],
    "In den nächsten 7 Tagen":["In the next 7 days","Önümüzdeki 7 gün","В ближайшие 7 дней","У найближчі 7 днів","W ciągu 7 dni","خلال الأيام السبعة القادمة","În următoarele 7 zile"],
    "Noch offen":["Still open","Hâlâ açık","Ещё открыто","Ще відкрито","Jeszcze otwarte","لا يزال مفتوحًا","Încă deschis"],
    "Gruppen":["Groups","Gruplar","Группы","Групи","Grupy","المجموعات","Grupuri"],
    "Posten":["items","kalem","поз.","поз.","pozycji","بنود","poziții"],
    "bezahlt · {n} von {n}":["paid · {n} of {n}","ödendi · {n}/{n}","оплачено · {n} из {n}","оплачено · {n} з {n}","zapłacone · {n} z {n}","مدفوع · {n} من {n}","plătit · {n} din {n}"],
    "Klick = abhaken · Betrag anklicken = nur für {m} ändern · Ziehen = Tag ändern":["Click = tick off · Click the amount = change for {m} only · Drag = change the day","Tıkla = işaretle · Tutara tıkla = yalnızca {m} için değiştir · Sürükle = günü değiştir","Клик = отметить · Клик по сумме = изменить только на {m} · Перетащить = сменить день","Клік = позначити · Клік по сумі = змінити лише на {m} · Перетягнути = змінити день","Klik = odhacz · Klik w kwotę = zmień tylko na {m} · Przeciągnij = zmień dzień","نقرة = تأشير · النقر على المبلغ = تغيير {m} فقط · السحب = تغيير اليوم","Clic = bifează · Clic pe sumă = schimbă doar pentru {m} · Trage = schimbă ziua"],
    "nichts":["nothing","hiçbir şey","ничего","нічого","nic","لا شيء","nimic"],
    "Fixkoste am {n}. eintragen":["Add a fixed cost on the {n}","{n}. güne sabit gider ekle","Добавить расход на {n}-е","Додати витрату на {n}-те","Dodaj koszt stały na {n}.","أضف تكلفة ثابتة في يوم {n}","Adaugă o cheltuială fixă pe {n}"],
    "Neue Fixkosten":["New fixed cost","Yeni sabit gider","Новый постоянный расход","Нова постійна витрата","Nowy koszt stały","تكلفة ثابتة جديدة","Cheltuială fixă nouă"],
    "Betrag ab {m} {n}":["Amount from {m} {n}","{m} {n} itibarıyla tutar","Сумма с {m} {n}","Сума з {m} {n}","Kwota od {m} {n}","المبلغ من {m} {n}","Sumă din {m} {n}"],
    "ohne":["none","yok","нет","немає","brak","بدون","fără"],
    "Rhythmus":["Rhythm","Sıklık","Периодичность","Періодичність","Częstotliwość","التكرار","Frecvență"],
    "Privat":["Private","Özel","Личное","Особисте","Prywatne","خاص","Privat"],
    "Monatlich":["Monthly","Aylık","Ежемесячно","Щомісяця","Co miesiąc","شهريًا","Lunar"],
    "Vierteljährlich":["Quarterly","Üç ayda bir","Ежеквартально","Щокварталу","Co kwartał","كل ثلاثة أشهر","Trimestrial"],
    "Halbjährlich":["Every six months","Altı ayda bir","Раз в полгода","Раз на пів року","Co pół roku","كل ستة أشهر","Semestrial"],
    "Jährlich":["Yearly","Yıllık","Ежегодно","Щороку","Co rok","سنويًا","Anual"],
    "Bestimmte Monate":["Certain months","Belirli aylar","Определённые месяцы","Певні місяці","Wybrane miesiące","أشهر محددة","Anumite luni"],
    "Änderungen gelten ab {m} {n} – frühere Monate bleiben, wie sie waren.":["Changes apply from {m} {n} – earlier months stay as they were.","Değişiklikler {m} {n} itibarıyla geçerli – önceki aylar aynı kalır.","Изменения действуют с {m} {n} – прошлые месяцы не меняются.","Зміни діють з {m} {n} – попередні місяці не змінюються.","Zmiany obowiązują od {m} {n} – wcześniejsze miesiące pozostają bez zmian.","تسري التغييرات من {m} {n} – تبقى الأشهر السابقة كما هي.","Modificările se aplică din {m} {n} – lunile anterioare rămân la fel."],
    "Gilt ab {m} {n} für alle folgenden Monate.":["Applies from {m} {n} to all following months.","{m} {n} itibarıyla sonraki tüm aylar için geçerli.","Действует с {m} {n} для всех следующих месяцев.","Діє з {m} {n} для всіх наступних місяців.","Obowiązuje od {m} {n} we wszystkich kolejnych miesiącach.","يسري من {m} {n} لكل الأشهر التالية.","Se aplică din {m} {n} pentru toate lunile următoare."],
    "Wirklich löschen?":["Really delete?","Gerçekten silinsin mi?","Точно удалить?","Справді видалити?","Na pewno usunąć?","هل تريد الحذف فعلًا؟","Sigur ștergi?"],
    "Klick = abhaken · Stift = bearbeiten · Ziehen = Tag ändern · + im Tag = neu eintragen":["Click = tick off · Pencil = edit · Drag = change the day · + in a day = add new","Tıkla = işaretle · Kalem = düzenle · Sürükle = günü değiştir · Günde + = yeni ekle","Клик = отметить · Карандаш = изменить · Перетащить = сменить день · + в дне = добавить","Клік = позначити · Олівець = змінити · Перетягнути = змінити день · + у дні = додати","Klik = odhacz · Ołówek = edytuj · Przeciągnij = zmień dzień · + w dniu = dodaj","نقرة = تأشير · القلم = تعديل · السحب = تغيير اليوم · + في اليوم = إضافة","Clic = bifează · Creion = editează · Trage = schimbă ziua · + în zi = adaugă"],
    "Ø im Monat":["Ø per month", "Aylık ort.", "Ø в месяц", "Ø на місяць", "Ø miesięcznie", "المتوسط شهريًا", "Ø pe lună"],
    "+ Läden auswählen":["+ Choose shops", "+ Mağaza seç", "+ Выбрать магазины", "+ Вибрати магазини", "+ Wybierz sklepy", "+ اختر المتاجر", "+ Alege magazine"],
    "Einkaufszettel":["Shopping list", "Alışveriş listesi", "Список покупок", "Список покупок", "Lista zakupów", "قائمة التسوق", "Listă de cumpărături"],
    "{n} offen · ca. {n} €":["{n} open · approx. {n} €", "{n} açık · yakl. {n} €", "{n} открыто · ок. {n} €", "{n} відкрито · бл. {n} €", "{n} otwarte · ok. {n} €", "{n} مفتوحة · حوالي {n} €", "{n} deschise · cca. {n} €"],
    "Schreib auf, was du brauchst – die App sagt dir, wo es am günstigsten ist.":["Write down what you need – the app tells you where it is cheapest.", "Neye ihtiyacın olduğunu yaz – uygulama en ucuz nerede olduğunu söyler.", "Запиши, что нужно – приложение подскажет, где дешевле.", "Запиши, що потрібно – застосунок підкаже, де дешевше.", "Zapisz, czego potrzebujesz – aplikacja powie ci, gdzie jest najtaniej.", "اكتب ما تحتاجه – سيخبرك التطبيق أين هو الأرخص.", "Notează ce îți trebuie – aplicația îți spune unde e cel mai ieftin."],
    "So kaufst du am günstigsten":["Cheapest way to shop", "En ucuz alışveriş", "Как купить дешевле всего", "Як купити найдешевше", "Najtaniej kupisz tak", "هكذا تتسوق بأرخص سعر", "Cel mai ieftin cumperi așa"],
    "· spart ca. {n} €":["· saves approx. {n} €", "· yakl. {n} € tasarruf", "· экономия ок. {n} €", "· економія бл. {n} €", "· oszczędzasz ok. {n} €", "· توفير حوالي {n} €", "· economisești cca. {n} €"],
    "Laden offen":["Shop not set", "Mağaza belirsiz", "Магазин не выбран", "Магазин не вибрано", "Sklep nieustalony", "المتجر غير محدد", "Magazin nestabilit"],
    "Erledigte löschen ({n})":["Delete done ({n})", "Bitenleri sil ({n})", "Удалить выполненные ({n})", "Видалити виконані ({n})", "Usuń zrobione ({n})", "حذف المنجز ({n})", "Șterge bifatele ({n})"],
    "Auf deinem Zettel":["On your list", "Listende", "В твоём списке", "У твоєму списку", "Na twojej liście", "في قائمتك", "Pe lista ta"],
    "Letzte Einkäufe":["Recent purchases", "Son alışverişler", "Последние покупки", "Останні покупки", "Ostatnie zakupy", "آخر المشتريات", "Cumpărături recente"],
    "Hier hast du in letzter Zeit nichts gekauft.":["You haven't bought anything here lately.", "Son zamanlarda burada bir şey almadın.", "Ты здесь давно ничего не покупал.", "Ти тут давно нічого не купував.", "Ostatnio nic tu nie kupowałeś.", "لم تشترِ شيئًا هنا مؤخرًا.", "N-ai cumpărat nimic aici în ultima vreme."],
    "automatisch":["automatic", "otomatik", "автоматически", "автоматично", "automatycznie", "تلقائي", "automat"],
    "Merken":["Save", "Kaydet", "Запомнить", "Запам'ятати", "Zapamiętaj", "حفظ", "Salvează"],
    "Gemerkte Angebote":["Saved offers", "Kaydedilen fırsatlar", "Сохранённые акции", "Збережені акції", "Zapisane oferty", "العروض المحفوظة", "Oferte salvate"],
    "Deine Preise hier":["Your prices here", "Buradaki fiyatların", "Твои цены здесь", "Твої ціни тут", "Twoje ceny tutaj", "أسعارك هنا", "Prețurile tale aici"],
    "· aus Quittungen":["· from receipts", "· fişlerden", "· из чеков", "· з чеків", "· z paragonów", "· من الإيصالات", "· din bonuri"],
    "+ Angebot merken":["+ Save offer", "+ Fırsatı kaydet", "+ Запомнить акцию", "+ Запам'ятати акцію", "+ Zapisz ofertę", "+ احفظ العرض", "+ Salvează oferta"],
    "Prospekt":["Leaflet", "Broşür", "Проспект", "Проспект", "Gazetka", "النشرة", "Catalog"],
    "hier am günstigsten":["cheapest here", "en ucuz burada", "здесь дешевле всего", "тут найдешевше", "tu najtaniej", "الأرخص هنا", "cel mai ieftin aici"],
    "zuletzt nicht eingekauft":["not shopped here lately", "son zamanlarda alışveriş yok", "давно не покупал", "давно не купував", "ostatnio bez zakupów", "لم تتسوق هنا مؤخرًا", "fără cumpărături recente"],
    "{n} erledigte gelöscht":["{n} done deleted", "{n} biten silindi", "{n} выполненных удалено", "{n} виконаних видалено", "Usunięto {n} zrobionych", "تم حذف {n} من المنجز", "{n} bifate șterse"],
    "Andere Webseiten sind hier gesperrt":["Other websites are blocked here","Diğer web siteleri burada engelli","Другие сайты здесь заблокированы","Інші сайти тут заблоковано","Inne strony są tu zablokowane","المواقع الأخرى محظورة هنا","Alte site-uri sunt blocate aici"],
    "Im Browser öffnen ↗":["Open in browser ↗", "Tarayıcıda aç ↗", "Открыть в браузере ↗", "Відкрити в браузері ↗", "Otwórz w przeglądarce ↗", "افتح في المتصفح ↗", "Deschide în browser ↗"],
    "Seite wird geladen …":["Loading page …", "Sayfa yükleniyor …", "Страница загружается …", "Сторінка завантажується …", "Wczytywanie strony …", "جارٍ تحميل الصفحة …", "Se încarcă pagina …"],
    "Prospekt ist offen":["Leaflet is open", "Broşür açık", "Проспект открыт", "Проспект відкрито", "Gazetka jest otwarta", "النشرة مفتوحة", "Catalogul este deschis"],
    "Angebot aus dem Prospekt merken":["Save an offer from the leaflet", "Broşürden fırsat kaydet", "Запомнить акцию из проспекта", "Запам'ятати акцію з проспекту", "Zapisz ofertę z gazetki", "احفظ عرضًا من النشرة", "Salvează o ofertă din catalog"],
    "Noch nichts gemerkt.":["Nothing saved yet.", "Henüz bir şey kaydedilmedi.", "Пока ничего не сохранено.", "Поки нічого не збережено.", "Jeszcze nic nie zapisano.", "لم يُحفظ شيء بعد.", "Nimic salvat încă."],
    "Vor":["Forward", "İleri", "Вперёд", "Вперед", "Dalej", "تقدّم", "Înainte"],
    "Neu laden":["Reload", "Yenile", "Обновить", "Оновити", "Odśwież", "إعادة التحميل", "Reîncarcă"],
    "🛒 Angebote picken":["🛒 Pick offers","🛒 Fırsat seç","🛒 Выбрать акции","🛒 Вибрати акції","🛒 Wybierz oferty","🛒 اختر العروض","🛒 Alege oferte"],
    "🛒 Angebot picken":["🛒 Pick offer", "🛒 Fırsat seç", "🛒 Выбрать акцию", "🛒 Вибрати акцію", "🛒 Wybierz ofertę", "🛒 اختر عرضًا", "🛒 Alege oferta"],
    "✓ Picken an – Esc zum Beenden":["✓ Picking on – Esc to stop", "✓ Seçim açık – bitirmek için Esc", "✓ Выбор включён – Esc для выхода", "✓ Вибір увімкнено – Esc для виходу", "✓ Wybieranie wł. – Esc, aby zakończyć", "✓ الاختيار مفعّل – Esc للإنهاء", "✓ Alegere activă – Esc pentru oprire"],
    "✎ Rahmen ziehen – Esc zum Beenden":["✎ Draw a frame – Esc to stop", "✎ Çerçeve çiz – bitirmek için Esc", "✎ Обведи рамкой – Esc для выхода", "✎ Обведи рамкою – Esc для виходу", "✎ Narysuj ramkę – Esc, aby zakończyć", "✎ ارسم إطارًا – Esc للإنهاء", "✎ Trage un chenar – Esc pentru oprire"],
    "Klick auf ein Angebot – es kommt auf den Einkaufszettel":["Click an offer – it goes on the shopping list", "Bir fırsata tıkla – alışveriş listesine eklenir", "Нажми на акцию – она попадёт в список", "Натисни на акцію – вона потрапить у список", "Kliknij ofertę – trafi na listę zakupów", "انقر على عرض – سيُضاف إلى قائمة التسوق", "Apasă pe o ofertă – ajunge pe listă"],
    "Hier ist kein Text zu lesen – zieh einen Rahmen um das Angebot":["No text to read here – draw a frame around the offer", "Burada okunacak metin yok – fırsatın etrafına çerçeve çiz", "Здесь нет текста – обведи акцию рамкой", "Тут немає тексту – обведи акцію рамкою", "Brak tekstu – narysuj ramkę wokół oferty", "لا يوجد نص هنا – ارسم إطارًا حول العرض", "Aici nu e text – trage un chenar în jurul ofertei"],
    "Erkannt – stimmt das?":["Recognised – is this right?", "Tanındı – doğru mu?", "Распознано – верно?", "Розпізнано – правильно?", "Rozpoznano – zgadza się?", "تم التعرف – هل هذا صحيح؟", "Recunoscut – e corect?"],
    "Text wird erkannt …":["Recognising text …", "Metin tanınıyor …", "Текст распознаётся …", "Текст розпізнається …", "Rozpoznawanie tekstu …", "جارٍ التعرف على النص …", "Se recunoaște textul …"],
    "Nicht alles erkannt – bitte kurz ergänzen":["Not everything recognised – please complete","Her şey tanınmadı – lütfen tamamla","Распознано не всё – дополни, пожалуйста","Розпізнано не все – доповни, будь ласка","Nie wszystko rozpoznano – uzupełnij","لم يُتعرَّف على كل شيء – أكمل من فضلك","Nu s-a recunoscut tot – completează"],
    "✎ Rahmen ziehen":["✎ Draw frame","✎ Çerçeve çiz","✎ Обвести рамкой","✎ Обвести рамкою","✎ Narysuj ramkę","✎ ارسم إطارًا","✎ Trage chenar"],
    "Zieh einen Rahmen um das Angebot":["Draw a frame around the offer","Fırsatın etrafına çerçeve çiz","Обведи акцию рамкой","Обведи акцію рамкою","Narysuj ramkę wokół oferty","ارسم إطارًا حول العرض","Trage un chenar în jurul ofertei"],
    "Die Seite lädt gerade nicht":["The page is not loading right now","Sayfa şu anda yüklenmiyor","Страница сейчас не загружается","Сторінка зараз не завантажується","Strona teraz się nie ładuje","الصفحة لا تُحمَّل حاليًا","Pagina nu se încarcă acum"],
    "Noch einmal versuchen":["Try again","Tekrar dene","Попробовать снова","Спробувати ще раз","Spróbuj ponownie","حاول مرة أخرى","Încearcă din nou"],
    "Hier ist kein Angebot zu erkennen – klick direkt auf den Kasten des Angebots":["No offer found here – click right on the offer's box","Burada fırsat bulunamadı – doğrudan fırsat kutusuna tıkla","Здесь нет акции – нажми прямо на карточку","Тут немає акції – натисни прямо на картку","Nie znaleziono oferty – kliknij bezpośrednio w ramkę oferty","لا يوجد عرض هنا – انقر مباشرة على مربع العرض","Nicio ofertă aici – apasă direct pe caseta ofertei"],
    "Verwerfen":["Discard", "Vazgeç", "Отбросить", "Відкинути", "Odrzuć", "تجاهل", "Renunță"],
    "Als Angebot":["As offer", "Fırsat olarak", "Как акцию", "Як акцію", "Jako oferta", "كعرض", "Ca ofertă"],
    "Auf den Zettel":["On the list", "Listeye", "В список", "У список", "Na listę", "إلى القائمة", "Pe listă"],
    "Einklappen":["Collapse","Daralt","Свернуть","Згорнути","Zwiń","طيّ","Restrânge"],
    "Aufklappen":["Expand","Genişlet","Развернуть","Розгорнути","Rozwiń","توسيع","Extinde"],
    "Ja":["Yes","Evet","Да","Так","Tak","نعم","Da"],"Nein":["No","Hayır","Нет","Ні","Nie","لا","Nu"],
    "Abgleich aus":["Sync off","Eşitleme kapalı","Синхронизация выкл.","Синхронізацію вимкнено","Synchronizacja wył.","المزامنة متوقفة","Sincronizare oprită"]};
  const LL=["en","tr","ru","uk","pl","ar","ro"];
  for (const [k,v] of Object.entries(PC_I18N)) if (!I18N_K.includes(k)){ I18N_K.push(k); LL.forEach((l,i)=>{ (I18N_T[l]=I18N_T[l]||[])[I18N_K.length-1]=v[i]; }); }
  if (LANG!=="de") try { I18N.set(LANG); } catch(e){}
}
/* Start */
if (IS_PC){
  const PCH=()=>{ const h=S.settings.pcHome||(S.settings.pcHome={}); h.order=Array.isArray(h.order)?h.order:[]; h.min=Array.isArray(h.min)?h.min:[]; return h; };
  const BIC={cash:"cash",budgets:"target",fix:"repeat",tax:"shield",goals:"piggy",debts:"bank",recent:"list",gemeinsam:"heart",offers:"cart",...HX_IC};
  const name=k=>(HOME_BLOCKS.find(b=>b[0]===k)||[k,k])[1];
  const _k2=accTabKeys; accTabKeys = t => _k2(t).filter(k=>k!=="start");
  homeOrder = () => { const o=[...new Set(PCH().order)].filter(k=>HOME_BLOCKS.some(b=>b[0]===k)); for (const [k] of HOME_BLOCKS) if (!o.includes(k)) o.push(k); return o; };
  const _hb=homeBlocks; homeBlocks = html => { const keep=S.settings.homeHidden; S.settings.homeHidden=[...PCH().min]; try { return _hb(html); } finally { S.settings.homeHidden=keep; } };
  const save=()=>{ try { saveSettings(); } catch(e){} };

  document.body.insertAdjacentHTML("beforeend", `<div class="pcdock" id="pcDock" aria-label="Minimierte Kacheln"></div>`);
  function dock(){
    const d=$("pcDock"); if (!d) return; const on=UI.view==="home", m=PCH().min.filter(k=>HOME_BLOCKS.some(b=>b[0]===k));
    document.documentElement.classList.toggle("pcdocked", on && m.length>0);
    d.hidden=!on || !m.length;
    const have=[...d.children].map(x=>x.dataset.pcrest).join(","); if (have===m.join(",")) return;
    d.innerHTML=m.map(k=>`<button class="pcdi" data-pcrest="${k}" aria-label="${esc(name(k))} wieder anzeigen"><span>${ic(BIC[k]||"tag",22)}</span><em>${esc(name(k))}</em></button>`).join("");
  }
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

  const snap=()=>new Map([...document.querySelectorAll("#v-home .hblock")].map(t=>[t.dataset.hb, t.getBoundingClientRect()]));
  function glide(before, skip){ document.querySelectorAll("#v-home .hblock").forEach(t=>{ if (t.dataset.hb===skip) return; const a=before.get(t.dataset.hb); if (!a) return; const r=t.getBoundingClientRect(), dx=a.left-r.left, dy=a.top-r.top;
    if (Math.abs(dx)>1 || Math.abs(dy)>1) t.animate([{transform:`translate(${dx}px,${dy}px)`},{transform:"none"}],{duration:420,easing:"cubic-bezier(.2,.8,.2,1)"}); }); }
  document.addEventListener("click", e=>{
    const b=e.target.closest("[data-pcmin]"); if (!b) return; const k=b.dataset.pcmin, tile=b.closest(".hblock"); if (!tile || PC_ANIM.busy) return;
    const r=tile.getBoundingClientRect(), h=PCH(), before=snap(); if (!h.min.includes(k)) h.min.push(k);
    const fly=tile.cloneNode(true); fly.classList.add("pcfly"); Object.assign(fly.style,{left:r.left+"px",top:r.top+"px",width:r.width+"px",height:r.height+"px"}); document.body.appendChild(fly);
    tile.remove(); save();
    glide(before, k);
    const di=document.querySelector(`#pcDock [data-pcrest="${k}"]`); if (di) di.style.opacity="0";
    const t=dockSpot(k), dx=t.x-(r.left+r.width/2), dy=t.y-(r.top+r.height/2), sc=Math.max(0.06, 52/Math.max(r.width,r.height));
    fly.animate([{transform:"none",opacity:1,borderRadius:"24px"},{transform:"translateY(-18px) scale(1.04) rotate(-3deg)",opacity:1,offset:.18},{transform:`translate(${dx*0.4}px,${dy*0.4-40}px) scale(.55) rotate(-8deg)`,opacity:1,offset:.55},{transform:`translate(${dx}px,${dy}px) scale(${sc}) rotate(10deg)`,opacity:.15,borderRadius:"50%"}],
      {duration:680, easing:"cubic-bezier(.45,0,.2,1)", fill:"forwards"}).finished.then(()=>{
        fly.remove();
        const d2=document.querySelector(`#pcDock [data-pcrest="${k}"]`); if (d2){ d2.style.opacity=""; d2.animate([{transform:"scale(.3)"},{transform:"scale(1.25)",offset:.6},{transform:"none"}],{duration:420,easing:"cubic-bezier(.3,.7,.3,1)"}); }
      });
  });
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
        PCH().order=homeOrder().map(k=>min.includes(k) || !dom.includes(k) ? k : it.next().value); save(); });
  };
  document.addEventListener("pointerup", drop); document.addEventListener("pointercancel", drop);
  decorate();
}
/* Hell / Dunkel */
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
    if (document.startViewTransition && !pcCalm()){
      const vt=document.startViewTransition(apply);
      vt.ready.then(()=>{ const R=Math.hypot(Math.max(x,innerWidth-x), Math.max(y,innerHeight-y));
        document.documentElement.animate({clipPath:[`circle(0px at ${x}px ${y}px)`,`circle(${R}px at ${x}px ${y}px)`]},{duration:650,easing:"cubic-bezier(.4,0,.2,1)",pseudoElement:"::view-transition-new(root)"}); }).catch(()=>{});
    } else apply();
  });
}
/* + Knopf */
if (IS_PC){
  const fan=$("fanBg"), rc=fan && fan.querySelector('[data-addpick="receipt"]');
  if (rc && IS_DESK){    rc.dataset.addpick="pcscan"; rc.innerHTML=`<svg class="i" viewBox="0 0 24 24"><path d="M4 14h16v4.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5z"/><path d="M6 14 8.5 5.5h7L18 14"/><path d="M7.5 17h3"/></svg><span>Scannen</span>`; }
  openAddMenu = () => { if (!fan.hidden){ fanClose(); return; } fanOpen();
    if (IS_TAB) return;
    const R=140; [180,135,90].forEach((a,i)=>{ const t=a*Math.PI/180, b=fan.children[i]; b.style.setProperty("--dx", Math.round(Math.cos(t)*R)+"px"); b.style.setProperty("--dy", Math.round(-Math.sin(t)*R-14)+"px"); }); };
  const SCANW={}; window.hbScanDone=(id,data,err)=>{ const f=SCANW[id]; if (f){ delete SCANW[id]; f(data,err); } };
  const scanNow=()=>new Promise(ok=>{ const id=newId(); SCANW[id]=(d,e)=>ok({d,e}); window.AndroidBridge.scan(id); });
  const PCSCAN={on:false};
  function pcScanTexts(on){ PCSCAN.on=on; const t=document.querySelector("#docRev .drtop b"), r=$("drRetake"), d=$("docRev");
    if (t) t.textContent=on?"Scan prüfen":"Foto prüfen"; if (r) r.textContent=on?"Neu scannen":"Neu aufnehmen"; if (d) d.setAttribute("aria-label", on?"Scan prüfen":"Foto prüfen"); }
  const _dc=drChecks; drChecks = () => {
    if (!PCSCAN.on) return _dc();
    const A=DR.A, info=DR.info, blank=A.sharp<8 && A.light>190, R=[];
    R.push(["Scanner", ...(blank?["bad","Seite leer","nichts erkannt"]:["good","Gescannt","300 dpi"])]);
    R.push(["Beleg", ...(A.found?["good","Gefunden","4 Ecken"]:["warn","Nicht gefunden","Ecken an den Beleg ziehen"])]);
    if (info.lines){ const n=info.lines.length, r=n?parseReceipt(info.lines):{}; R.push(["Text", ...(!n?["bad","Kein Text",""]:r.amount==null?["warn",`${n} Zeilen`,"kein Betrag"]:["good",`${n} Zeilen`,"Betrag gefunden"])]); }
    $("drChecks").innerHTML=R.map(([t,lv,a,b])=>`<div class="drc ${lv}"><i></i><span><small>${t}</small><b>${a}</b>${b?`<em>${b}</em>`:""}</span></div>`).join("");
    const tips=[];
    if (blank) tips.push("Die Seite ist leer – leg den Beleg mit der Schrift nach unten auf die Glasscheibe und klicke auf „Neu scannen“.");
    else if (!A.found) tips.push("Zieh die gelben Ecken an den Rand des Belegs, dann wird nur der Beleg übernommen.");
    $("drTip").textContent=tips.join(" "); $("drTip").hidden=!tips.length;
  };
  async function pcScan(){
    if (!window.AndroidBridge || !window.AndroidBridge.scan){ toast("Für den Scanner einmal die neue PC-App installieren – bis dahin kannst du ein Bild auswählen", null, null, 7000); return smartScanFallback({}); }
    toast("Scanner läuft … Beleg bitte auflegen", null, null, 60000);
    const {d,e}=await scanNow();
    if (!d){ toast(e==="noscanner" ? "Kein Scanner gefunden – ist er eingeschaltet und angeschlossen?" : "Scannen hat nicht geklappt: "+e, e==="noscanner"?()=>smartScanFallback({}):null, e==="noscanner"?"Bild wählen":null, 9000); return; }
    toast("Gescannt", null, null, 1200);
    try {
      let img=d; try { const blob=await (await fetch(d)).blob(); img=await shrinkImage(new File([blob],"scan.jpg",{type:"image/jpeg"})); } catch(_){}
      pcScanTexts(true); let rv; try { rv=await docReview(img,{}); } finally { pcScanTexts(false); }
      if (!rv) return; if (rv.action==="retake") return pcScan(); img=rv.img;
      scanWorking(true); const lines=await ocrDataUrl(img); scanWorking(false);
      const im=await loadImg(img), r=docClassify(lines||[], im.naturalHeight/im.naturalWidth);
      camReview({type:(r&&r.type)||"rcpt", img, lines:lines||[], W:im.naturalWidth, H:im.naturalHeight, noBoxes:false});
    } catch(x){ scanWorking(false); toast(x.message||"Der Scan konnte nicht gelesen werden"); }
  }
  document.addEventListener("click", e=>{ const b=e.target.closest('[data-addpick="pcscan"]'); if (!b) return; e.stopImmediatePropagation(); closeAddMenu(); setTimeout(pcScan, 120); }, true);
}
if (IS_PC){
  const av=()=>{ try { renderAvatar(); } catch(_){} };
  const _r2=render; render = (...a) => { const x=_r2(...a); try { av(); } catch(e){} return x; };
  av();
}
/* Monatswechsel */
if (IS_PC){
  const NUM=/\d{1,3}(?:[.   ,]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?/;
  const parse=s=>{ const m=String(s).match(NUM); if (!m) return null; const t=m[0], dm=t.match(/[.,](\d{1,2})$/), dec=dm && !(dm[1].length===3) ? dm[1].length : 0;
    const dc=dec ? t[t.length-dec-1] : "", int=dec ? t.slice(0,-dec-1) : t, g=(int.match(/[.   ,]/)||[""])[0];
    const v=Number(int.replace(/[^\d]/g,"")+(dec?"."+t.slice(-dec):"")); return {t, v, dec, dc, g}; };
  const fmt=(p,v)=>{ const neg=v<0; v=Math.abs(v); let [i,f]=v.toFixed(p.dec).split("."); if (p.g) i=i.replace(/\B(?=(\d{3})+(?!\d))/g, p.g); return (neg?"-":"")+i+(p.dec?p.dc+f:""); };
  const amounts=root=>{ const out=new Map(), cnt={};
    root.querySelectorAll("b,span,strong,div,em,small,text,td").forEach(e=>{ if (e.closest(".cubestage,.pctl")) return; if (e.children.length) return;
      const s=(e.textContent||"").trim(); if (s.length>22 || !/€/.test(s) || !/\d/.test(s)) return;
      const a=e.closest("[data-hb],[id]"), key=(a?(a.dataset.hb||a.id):"")+"|"+e.tagName; cnt[key]=(cnt[key]||0)+1; out.set(key+"#"+cnt[key], e); });
    return out; };
  const bars=root=>{ const out=new Map(), cnt={};
    root.querySelectorAll('[style*="width:"],[style*="width :"]').forEach(e=>{ if (e.closest(".cubestage")) return; const w=e.style.width; if (!/%$/.test(w)) return;
      const a=e.closest("[data-hb],[id]"), key=(a?(a.dataset.hb||a.id):"")+"|bar"; cnt[key]=(cnt[key]||0)+1; out.set(key+"#"+cnt[key], [e, parseFloat(w)]); });
    return out; };
  let lastYm=UI.ym, lastView=UI.view;
  const _r3=render; render = (...a) => {
    const changed = UI.ym!==lastYm && UI.view===lastView && !pcCalm(), d = UI.ym>lastYm ? 1 : -1;
    let oldA=null, oldB=null; const sec=document.querySelector(`[data-view="${UI.view}"]`);
    if (changed && sec){ oldA=new Map([...amounts(sec)].map(([k,e])=>[k, parse(e.textContent)])); oldB=new Map([...bars(sec)].map(([k,[e,w]])=>[k,w])); }
    lastYm=UI.ym; lastView=UI.view;
    const x=_r3(...a);
    if (oldA){ try { pcMonthAnim(sec, oldA, oldB, d); } catch(e){ console.warn("month", e); } }
    return x;
  };
  function pcMonthAnim(sec, oldA, oldB, d){
    document.querySelectorAll("#monthpill select").forEach(s=>s.animate([{transform:`translateY(${d*18}px)`,opacity:0},{transform:"none",opacity:1}],{duration:380,easing:"cubic-bezier(.2,.8,.2,1)"}));
    const now=amounts(sec), runs=[];
    for (const [k,e] of now){ const o=oldA.get(k), n=parse(e.textContent); if (!o || !n || o.v===n.v) continue;
      runs.push({e, fin:e.textContent, n, a:o.v, b:n.v}); }
    const t0=performance.now()+60, D=900, ease=t=>1-Math.pow(1-t,3);
    const step=nowT=>{ const t=Math.max(0,Math.min(1,(nowT-t0)/D)), k=ease(t);
      for (const r of runs){ if (!r.e.isConnected) continue; r.e.textContent = t>=1 ? r.fin : r.fin.replace(r.n.t, fmt(r.n, r.a+(r.b-r.a)*k)); }
      if (t<1 && runs.length) requestAnimationFrame(step); };
    requestAnimationFrame(step);
    for (const [k,[e,w]] of bars(sec)){ const o=oldB.get(k); if (o==null || Math.abs(o-w)<0.5) continue; e.animate([{width:o+"%"},{width:w+"%"}],{duration:800,easing:"cubic-bezier(.2,.8,.2,1)"}); }
    [...sec.querySelectorAll(".pchero, #v-home .hblock > *, :scope > .card, :scope > .cols .card, :scope .card")].filter(e=>!e.closest(".cubestage")).slice(0,16)
      .forEach((c,i)=>c.animate([{boxShadow:"0 0 0 0 rgba(63,191,138,0)"},{boxShadow:"0 0 0 3px rgba(63,191,138,.45)"},{boxShadow:"0 0 0 0 rgba(63,191,138,0)"}],{duration:900,delay:i*55,easing:"ease-out"}));
  }
}
if (IS_PC){
  const th=$("pcTheme");
  if (th && !$("pcHelp")) th.insertAdjacentHTML("beforebegin", `<button class="roundbtn pchelp" id="pcHelp" data-spgo="hilfe" aria-label="Hilfe" title="Hilfe – Fragen und Antworten"><svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 0 1 4.9.7c0 1.7-2.5 2.2-2.5 3.8"/><circle cx="12" cy="17.2" r=".6" fill="currentColor"/></svg></button>`);
}
if (IS_PC){
  const hp=$("pcHelp")||$("pcTheme");
  if (hp && !$("pcRefresh")) hp.insertAdjacentHTML("beforebegin", `<button class="roundbtn pcrefresh" id="pcRefresh" aria-label="Aktualisieren" title="Aktualisieren"><svg class="i" viewBox="0 0 24 24"><path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4.5v4h-4"/></svg></button>`);
  document.addEventListener("click", async e=>{
    const b=e.target.closest("#pcRefresh"); if (!b || b.classList.contains("busy")) return;
    b.classList.remove("ok"); b.classList.add("busy"); const t0=Date.now();
    try {
      if (typeof syncNow==="function"){ await syncNow(); for (let i=0;i<60 && SYNC.busy;i++) await new Promise(r=>setTimeout(r,250)); }
      try { UPD.last=0; await ghCheck(false); } catch(_){}
      render();
    } catch(_){}
    await new Promise(r=>setTimeout(r, Math.max(0, 700-(Date.now()-t0))));
    const bad=SYNC.token && SYNC.state!=="ok"; b.classList.remove("busy"); if (!bad) b.classList.add("ok");
    try { if (typeof renderSyncInfo==="function") renderSyncInfo(); } catch(_){}
    toast(bad ? "Aktualisiert – Abgleich gerade nicht möglich" : "Aktualisiert");
    setTimeout(()=>b.classList.remove("ok"), 1400);
  });
}
if (IS_PC){
  const w=document.querySelector(".top .wrap");
  if (w && !$("pcActs")){ const g=document.createElement("div"); g.id="pcActs"; g.className="pcacts";
    ["pcRefresh","pcHelp","pcTheme","ptourQ","bellBtn"].forEach(id=>{ const e=$(id); if (e) g.appendChild(e); });
    const st=$("settingsBtn"); if (st && st.parentElement===w) w.insertBefore(g, st); else w.appendChild(g); }
}
/* Posteingang */
if (IS_PC){
  const FB={items:[], open:null, imgs:{}, last:0, busy:false};
  const devReq=(action, qs, body)=>new Promise((ok,no)=>{
    const base=pairUrl(); if (!base || !updKey()) return no(new Error("kein Schlüssel"));
    const id=newId(); httpWaiting[id]=r=>{ let j={}; try{ j=JSON.parse(r.text); }catch(e){} if (r.status>=200 && r.status<300) ok(j); else no(new Error(j.error||("Server "+(r.status||"nicht erreichbar")))); };
    window.AndroidBridge.http(id, body?"POST":"GET", apiUrl(base, action, qs||""), "Dev "+updKey(), body?JSON.stringify(body):""); });
  const unread=()=>FB.items.filter(x=>!x.read).length;
  function fbBtn(){
    let b=$("pcInbox"); const show=!!updKey();
    if (!show){ if (b) b.remove(); return; }
    if (!b){ const h=$("pcHelp")||$("pcTheme"); if (!h) return; h.insertAdjacentHTML("beforebegin", `<button class="roundbtn pcinbox" id="pcInbox" aria-label="Feedback-Eingang" title="Feedback-Eingang"><svg class="i" viewBox="0 0 24 24"><path d="M4 13.5 6.5 5h11l2.5 8.5V18a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18z"/><path d="M4 13.5h4.5l1.2 2h4.6l1.2-2H20"/></svg><span class="badge" hidden>0</span></button>`); b=$("pcInbox"); }
    const n=unread(), bd=b.querySelector(".badge"), was=Number(bd.textContent)||0; bd.textContent=n; bd.hidden=!n;
    if (n>was && was>=0 && FB.last) { b.animate([{transform:"rotate(0)"},{transform:"rotate(-14deg) scale(1.12)",offset:.25},{transform:"rotate(10deg)",offset:.5},{transform:"rotate(-6deg)",offset:.75},{transform:"none"}],{duration:700}); }
  }
  async function fbLoad(force){
    if (!updKey() || FB.busy || (!force && Date.now()-FB.last<50*1000)) return fbBtn();
    FB.busy=true; const before=unread();
    try { const j=await devReq("feedlist"); FB.items=j.items||[]; const n=unread(); if (FB.last && n>before) toast(n-before===1?"Neues Feedback ist da":`${n-before} neue Feedbacks sind da`, ()=>fbOpen(), "Ansehen", 8000); FB.last=Date.now(); }
    catch(e){ FB.err = /Unbekannte Aktion/i.test(e.message) ? "Auf dem Server läuft noch die alte pair.php – bitte die neue in den Ordner „haushaltsbuch“ kopieren." : e.message; }
    finally { FB.busy=false; fbBtn(); if (!$("pcFbBg").hidden) fbRender(); }
  }
  document.body.insertAdjacentHTML("beforeend", `<div class="backdrop" id="pcFbBg" hidden><div class="sheet pcfbsheet" role="dialog" aria-modal="true" aria-label="Feedback-Eingang"><div class="sheet-head"><h2>Feedback-Eingang</h2><button class="icon-btn" data-pcfbx="1" aria-label="Schließen"><svg class="i" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div><div id="pcFbBody"></div></div></div>`);
  const KIND={fehler:["Fehler","#c2410c"], idee:["Idee","#3d63a8"], lob:["Lob","#1a7a5c"], absturz:["Absturz","#b91c1c"]};
  const KIC={fehler:"🐞", idee:"💡", lob:"💚", absturz:"💥"};
  const PGI={Start:"🏠", Buchungen:"📋", Fixkosten:"📅", Einkauf:"🛒", Analyse:"📊", Einstellungen:"⚙️", allgemein:"🌐"};
  const ago=ts=>{ const s=Date.now()/1000-ts; if (s<90) return "gerade"; if (s<3600) return `vor ${Math.round(s/60)} Min.`; if (s<86400) return `vor ${Math.round(s/3600)} Std.`; if (s<172800) return "gestern"; return new Date(ts*1000).toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"}); };
  function fbParse(x){ const full=String(x.text||""), pm=full.match(/^📍 (.*)\n/), pgs=pm?pm[1].split(", "):[]; let rest=pm?full.slice(pm[0].length):full, meta=null;
    const k=rest.lastIndexOf("\n\n---\n"); if (k>=0){ const m=rest.slice(k+6).trim(); rest=rest.slice(0,k);
      const parts=m.replace(/^Finanz MAMI\s*/,"").split(" · "); meta={Version:parts[0]||"", Rolle:parts[1]||"", Gerät:parts[2]||"", Gruppe:parts[3]||""}; }
    rest=rest.trim(); return {pgs, body:rest, title:(rest.split("\n")[0]||"(ohne Text)").slice(0,140), meta}; }
  function fbRender(){
    const el=$("pcFbBody"); if (!el) return;
    const crashes=FB.items.filter(x=>x.kind==="absturz").length;
    if (!FB.items.length){ el.innerHTML=`<p class="muted" style="padding:20px 0;text-align:center">${FB.err?esc(FB.err):"Noch kein Feedback angekommen."}</p>`; return; }
    if (!FB.open || !FB.items.some(x=>x.id===FB.open)) FB.open=null;
    const top=`<div class="pcfbtop"><button class="btn" data-pcfbcopyall="1">Alles Ungelesene für Claude kopieren</button>${crashes?`<button class="btn" data-pcfbcopyall="absturz">Alle ${crashes} Abstürze kopieren</button>`:""}</div>`;
    const list=FB.items.map(x=>{ const [kl,kc]=KIND[x.kind]||KIND.idee, f=fbParse(x); x.images=Math.max(0,Math.min(5,parseInt(x.images,10)||0));
      return `<button class="pcfbi ${x.read?"":"new"} ${FB.open===x.id?"on":""}" data-pcfb="${esc(x.id)}" style="--kc:${kc}"><span class="pcfbih"><span class="pcfbk">${KIC[x.kind]||""} ${kl}</span><small>${esc(ago(x.ts))}${x.images?` · 🖼 ${x.images}`:""}</small></span><b>${esc(f.title)}</b>${f.pgs.length?`<span class="pcfbpgs">${f.pgs.map(g=>`<span class="pcfbpg">${esc(g)}</span>`).join("")}</span>`:""}</button>`; }).join("");
    const x=FB.items.find(i=>i.id===FB.open); let det;
    if (!x) det=`<div class="pcfbd empty"><div><div style="font-size:40px">📬</div><b>Meldung anklicken</b><p class="muted small">Dann erscheint sie hier groß – mit Bildern und Gerät.</p></div></div>`;
    else { const [kl,kc]=KIND[x.kind]||KIND.idee, f=fbParse(x), d=new Date(x.ts*1000);
      det=`<div class="pcfbd" style="--kc:${kc}"><div class="pcfbdh"><span class="pcfbk big">${KIC[x.kind]||""} ${kl}</span>${f.pgs.map(g=>`<span class="pcfbpg big">${PGI[g]||""} ${esc(g)}</span>`).join("")}<small>${d.toLocaleDateString("de-DE")} · ${d.toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"})}${x.mailed?" · ✉":""}</small></div>
        <div class="pcfbtx">${esc(f.body)||'<span class="muted">(ohne Text)</span>'}</div>
        ${x.images?`<div class="pcfbimgs">${Array.from({length:x.images},(_,n)=>{ const u=FB.imgs[x.id+"/"+(n+1)]; return u?`<a data-pcfbimg="${esc(u)}"><img src="${esc(u)}" alt="Bild ${n+1}"></a>`:`<span class="ph">…</span>`; }).join("")}</div>`:""}
        ${f.meta?`<div class="pcfbkv">${Object.entries(f.meta).filter(([,v])=>v).map(([k,v])=>`<div><small>${k}</small><b>${esc(v)}</b></div>`).join("")}</div>`:""}
        <div class="row-btns pcfbact"><button class="btn primary" data-pcfbcopy="${esc(x.id)}">Für Claude kopieren</button><button class="btn" data-pcfbunread="${esc(x.id)}">Als ungelesen markieren</button><button class="btn danger" data-pcfbdel="${esc(x.id)}">${FB.delArm===x.id?"Wirklich endgültig löschen?":"Löschen"}</button></div></div>`; }
    el.innerHTML=top+`<div class="pcfbgrid"><div class="pcfbl">${list}</div>${det}</div>`;
  }
  async function fbShow(id){
    FB.open = id; const x=FB.items.find(i=>i.id===id); fbRender();
    if (!x || FB.open!==id) return;
    if (!x.read){ x.read=true; fbBtn(); devReq("feedread","",{id}).catch(()=>{}); }
    for (let n=1;n<=x.images;n++){ const k=id+"/"+n; if (FB.imgs[k]) continue; try { const j=await devReq("feedimg", `&id=${encodeURIComponent(id)}&n=${n}`); FB.imgs[k]=j.d; if (FB.open===id) fbRender(); } catch(_){} }
  }
  function fbOpen(){ const bg=$("pcFbBg"); bg.hidden=false; requestAnimationFrame(()=>bg.classList.add("show")); fbRender(); fbLoad(true); }
  const fbClose=()=>{ const bg=$("pcFbBg"); bg.classList.remove("show"); setTimeout(()=>{ bg.hidden=true; },200); };
  document.addEventListener("click", e=>{
    if (e.target.closest("#pcInbox")){ fbOpen(); return; }
    if (e.target.closest("[data-pcfbx]") || e.target===$("pcFbBg")){ fbClose(); return; }
    const h=e.target.closest("[data-pcfb]"); if (h){ fbShow(h.dataset.pcfb); return; }
    const fbTxt=x=>{ const [kl]=KIND[x.kind]||KIND.idee, d=new Date(x.ts*1000); return `### ${kl} vom ${d.toLocaleDateString("de-DE")} ${d.toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"})}${x.images?` (${x.images} Bild${x.images>1?"er":""} – im Posteingang)`:""}\n${String(x.text||"").trim()}`; };
    const cp=async(t,msg)=>{ try { await navigator.clipboard.writeText(t); toast(msg); } catch(_){ toast("Kopieren ging nicht"); } };
    const c1=e.target.closest("[data-pcfbcopy]"); if (c1){ const x=FB.items.find(i=>i.id===c1.dataset.pcfbcopy); if (x) cp("Feedback aus Finanz MAMI:\n\n"+fbTxt(x), "Kopiert – einfach bei Claude einfügen"); return; }
    const ca=e.target.closest("[data-pcfbcopyall]"); if (ca){ const all=ca.dataset.pcfbcopyall==="absturz", L=FB.items.filter(x=>all?x.kind==="absturz":!x.read);
      if (!L.length){ toast("Nichts Ungelesenes da"); return; } cp(`${all?"Abstürze":"Feedback"} aus Finanz MAMI (${L.length}):\n\n`+L.map(fbTxt).join("\n\n"), `${L.length} kopiert – einfach bei Claude einfügen`); return; }
    const u=e.target.closest("[data-pcfbunread]"); if (u){ const x=FB.items.find(i=>i.id===u.dataset.pcfbunread); if (x){ x.read=false; FB.open=null; fbRender(); fbBtn(); devReq("feedread","",{id:x.id, unread:1}).catch(()=>{}); } return; }
    const dl=e.target.closest("[data-pcfbdel]"); if (dl){ const id=dl.dataset.pcfbdel;
      if (FB.delArm!==id){ FB.delArm=id; fbRender(); clearTimeout(FB.delT); FB.delT=setTimeout(()=>{ FB.delArm=null; fbRender(); }, 4000); return; }
      FB.delArm=null; const row=document.querySelector(".pcfbd");
      devReq("feeddel","",{id}).then(()=>{ const done=()=>{ FB.items=FB.items.filter(i=>i.id!==id); FB.open=null; fbRender(); fbBtn(); toast("Feedback gelöscht"); };
        if (row && !pcCalm()) row.animate([{opacity:1,transform:"none"},{opacity:0,transform:"translateX(60px) scale(.96)"}],{duration:260,easing:"ease-in"}).finished.then(done,done); else done(); })
        .catch(err=>toast(/Unbekannte Aktion/i.test(err.message)?"Zum Löschen bitte die neue pair.php auf den Server laden":"Löschen hat nicht geklappt: "+err.message));
      return; }
    const im=e.target.closest("[data-pcfbimg]"); if (im){ const w=window.open(""); if (w) w.document.write(`<img src="${im.dataset.pcfbimg}" style="max-width:100%">`); }
  });
  document.addEventListener("keydown", e=>{ if (e.key==="Escape" && !$("pcFbBg").hidden) fbClose(); });
  setTimeout(()=>fbLoad(true), 5000); setInterval(()=>fbLoad(false), 60*1000);
  addEventListener("focus", ()=>fbLoad(false)); document.addEventListener("visibilitychange", ()=>{ if (!document.hidden) fbLoad(false); });
  const _r4=render; render = (...a) => { const x=_r4(...a); try { fbBtn(); } catch(e){} return x; };
  function relBtn(){ let b=$("pcRel"); if (!updKey()){ if (b) b.remove(); return; }
    if (!b){ const h=$("pcInbox")||$("pcTheme"); if (!h) return; h.insertAdjacentHTML("beforebegin", `<button class="roundbtn pcrel" id="pcRel" aria-label="Entwickler" title="Entwickler: Freigabe, Tester, Testdaten"><svg class="i" viewBox="0 0 24 24"><path d="M12 15V3M7 8l5-5 5 5"/><path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/></svg><i class="dot" hidden></i></button>`); b=$("pcRel"); }
    const d=b.querySelector(".dot"); if (d) d.hidden=!(REL.mine && REL.all && REL.mine!==REL.all); }
  const DS={busy:false, d:null, err:"", t:0};
  async function dsLoad(force){ if (DS.busy || (!force && Date.now()-DS.t<60e3)) return; DS.busy=true; DS.err="";
    try { DS.d=await devReq("devstats"); DS.t=Date.now(); } catch(e){ DS.err=e.message||"Server nicht erreichbar"; } finally { DS.busy=false; window.pcRelPaint(); } }
  function devPanelHtml(){ const tab=UI.devTab||"rel";
    const tabs=`<div class="seg pcdevseg">${[["rel","Freigabe"],["stat","Tester"],["test","Testdaten"]].map(([k,l])=>`<button class="${tab===k?"on":""}" data-devtab="${k}">${l}</button>`).join("")}</div>`;
    if (tab==="rel") return tabs+relCardHtml();
    if (tab==="stat"){ const d=DS.d; if (!d) return tabs+`<p class="small muted" style="padding:14px 0">${DS.err?esc(DS.err):"Wird geladen …"}</p>`;
      const fm={phone:"Handy",tablet:"Tablet",pc:"PC",laptop:"Laptop"}, byV={};
      for (const v of d.versions||[]){ const k="v"+(v.ver||"?"); (byV[k]=byV[k]||[]).push(v); }
      const inv=(d.invites||[]).map(i=>`<div class="pcdsr"><b>${i.lvl==0?"👑 Dein Code":"Tester-Code"}</b><span>${esc(i.code)}</span><em>${i.used}${+i.max?" / "+i.max:""} Geräte</em></div>`).join("") || `<p class="small muted">Noch keine Einladung verschickt.</p>`;
      const ver=Object.entries(byV).map(([k,L])=>`<div class="pcdsr"><b>${esc(k)}</b><span>${L.map(v=>`${v.n}× ${fm[v.form]||v.form}${v.role==="dev"?" (du)":""}`).join(" · ")}</span></div>`).join("") || `<p class="small muted">Noch keine Meldungen – die Apps melden sich einmal am Tag.</p>`;
      return tabs+`<div class="pcds"><div class="pcdsk"><div><b>${d.activations|0}</b><small>freigeschaltet</small></div><div><b>${d.active7|0}</b><small>aktiv (7 Tage)</small></div></div>
        <h4>Einladungen</h4>${inv}<h4>Versionen (14 Tage)</h4>${ver}<button class="link small" data-dsreload="1">Neu laden</button></div>`; }
    const coupled=!!SYNC.token;
    return tabs+`<div class="pcds"><p class="small muted" style="margin:6px 0 10px">Nur für ein Testgerät: füllt die App mit Beispiel-Buchungen der letzten 3 Monate oder setzt sie komplett zurück.</p>
      ${coupled?`<div class="notice warn"><span>Dieses Gerät ist gekoppelt – Testdaten würden auf alle deine Geräte übertragen. Deshalb hier gesperrt.</span></div>`:
      `<button class="btn primary block" data-testfill="1">Testdaten laden</button><button class="btn block ${UI.testArm?"danger":""}" data-testwipe="1" style="margin-top:8px">${UI.testArm?"Wirklich alles löschen?":"Alles zurücksetzen"}</button>`}</div>`; }
  async function testFill(){ const C=cats("ausgabe"), today=new Date(); let n=0;
    const shops={"Lebensmittel":["Rewe","Aldi","Lidl","Edeka"],"Haushalt & Pflichten":["dm","Rossmann"],"Spaß & Freizeit":["Kino","Restaurant","Café"],"Tanken & Parken":["Aral","Shell"]};
    for (let m=0;m<3;m++) for (let i=0;i<22;i++){ const d=new Date(today.getFullYear(), today.getMonth()-m, 1+Math.floor(Math.random()*27)); if (d>today) continue;
      const cat=C[Math.floor(Math.random()*C.length)], sh=(shops[cat]||["Laden"])[Math.floor(Math.random()*(shops[cat]||["Laden"]).length)];
      await put("tx", newId(), {date:isoOf(d), amount:Math.round((4+Math.random()*80)*100)/100, kind:"ausgabe", cat, note:sh, ts:Date.now(), test:true}); n++; }
    for (let m=0;m<3;m++){ const d=new Date(today.getFullYear(), today.getMonth()-m, 1); await put("tx", newId(), {date:isoOf(d), amount:2150, kind:"einnahme", cat:(cats("einnahme")[0]||{}).name||cats("einnahme")[0]||"Gehalt", note:"Gehalt (Test)", ts:Date.now(), test:true}); n++; }
    const F=[["Miete",650],["Strom",68],["Handy",19.99],["Internet",34.99],["Netflix",13.99]]; let k=S.fixed.length;
    for (const [name,amount] of F) await put("fixed", newId(), {name, amount, kind:"privat", order:k++, test:true});
    render(); toast(`${n} Test-Buchungen und ${F.length} Fixkosten angelegt`); }
  document.addEventListener("click", async e=>{
    const t=e.target.closest("[data-devtab]"); if (t){ UI.devTab=t.dataset.devtab; if (UI.devTab==="stat") dsLoad(); window.pcRelPaint(); return; }
    if (e.target.closest("[data-dsreload]")){ dsLoad(true); return; }
    if (e.target.closest("[data-testfill]")){ if (SYNC.token) return; await testFill(); return; }
    if (e.target.closest("[data-testwipe]")){ if (SYNC.token) return; if (!UI.testArm){ UI.testArm=true; window.pcRelPaint(); setTimeout(()=>{ UI.testArm=false; window.pcRelPaint(); }, 5000); return; } UI.testArm=false; $("pcRelPop")?.remove(); await wipeAll(); toast("Alles zurückgesetzt"); return; }
  });
  window.pcRelPaint=()=>{ try { relBtn(); const pop=$("pcRelPop"); if (pop) pop.innerHTML=devPanelHtml(); } catch(_){} };
  document.addEventListener("click", e=>{ const pop=$("pcRelPop");
    if (e.target.closest("#pcRel")){ if (pop){ pop.remove(); return; } const r=e.target.closest("#pcRel").getBoundingClientRect(); const el=document.createElement("div"); el.id="pcRelPop"; el.className="pcrelpop";
      el.style.top=(r.bottom+10)+"px"; el.style.left=Math.max(12, Math.min(innerWidth-342, r.right-330))+"px"; el.innerHTML=devPanelHtml(); document.body.appendChild(el); relLoad(true); if ((UI.devTab||"rel")==="stat") dsLoad(); return; }
    if (pop && !e.target.closest("#pcRelPop") && document.contains(e.target)) pop.remove(); });
  const _r5=render; render = (...a) => { const x=_r5(...a); try { relBtn(); } catch(e){} return x; };
  setTimeout(()=>{ relBtn(); relLoad(); }, 4000); setInterval(()=>{ if (document.visibilityState==="visible") relLoad(); }, 10*60e3);
}
/* Buchungen */
if (IS_PC){
  const B={sel:null, sig:"", arm:null, armT:0, closed:new Set(), busy:new Set(), n:0};
  try { (JSON.parse(localStorage.getItem("hb-pc-closed")||"[]")||[]).forEach(d=>B.closed.add(d)); } catch(_){}
  const saveClosed=()=>{ try { localStorage.setItem("hb-pc-closed", JSON.stringify([...B.closed].filter(d=>d>=shiftYm(ymOf(new Date()),-24)))); } catch(_){} };
  function nCols(){ const lc=$("listCard"), w=lc && lc.clientWidth; return Math.max(1, Math.min(5, Math.floor(((w||720)+14)/(330+14)))); }
  const isIn=t=>t.kind==="einnahme"||(t.kind==="umbuchung"&&t._k0==="einnahme");
  const ttl=t=>t.note||t.cat||KIND_LABEL[t.kind];
  const amtTxt=(t,v)=>(t.kind==="umbuchung"?"":isIn(t)?"+ ":"− ")+eur(v==null?t.amount:v);
  const clip=`<svg class="i" viewBox="0 0 24 24" style="width:13px;height:13px;vertical-align:-1px" aria-label="mit Beleg"><path d="M16.5 7.5 9 15a2.1 2.1 0 0 1-3-3l8-8a3.5 3.5 0 0 1 5 5l-8.5 8.5a5 5 0 0 1-7-7L11 3"/></svg>`;
  function shown(){ let l=txFilter(monthCalc(UI.ym).tx);
    const q=(UI.q||"").trim().toLowerCase(); if (q) l=l.filter(t=>((t.note||"")+" "+(t.cat||"")+" "+KIND_LABEL[t.kind]).toLowerCase().includes(q)); return sortTx(l); }
  function sub(t){ return [t.note?t.cat:"", t.kind==="betrieb"?"Betrieblich":t.kind==="vorauszahlung"?"aus Rücklage":t.kind==="umbuchung"?"Umschuldung · zählt nicht":"", t.pay==="bar"?"💶 bar":""].filter(Boolean).join(" · "); }
  const _rl=renderList;
  renderList = function(){
    UI.calDay=null; _rl(); $("calCard").hidden=true;
    const lc=$("listCard"), list=shown();
    if (!$("pcDet")){ $("v-list").insertAdjacentHTML("beforeend", `<div class="card pcdet" id="pcDet"></div>`); }
    lc.classList.toggle("pcdiary", list.length>0);
    if (list.length){
      const days={}; for (const t of list.slice().reverse()) (days[t.date]=days[t.date]||[]).push(t);
      const chev=`<svg class="i" viewBox="0 0 24 24" style="width:16px;height:16px"><path d="m6 9 6 6 6-6"/></svg>`;
      const card=([d,ts])=>{ const net=sum(ts,t=>t.kind==="umbuchung"?0:isIn(t)?t.amount:-t.amount), dt=new Date(d+"T12:00"), cl=B.closed.has(d);
        return `<div class="pcday ${cl?"closed":""}" data-pcday="${d}"><div class="pcdh" data-pcfold="${d}" role="button" tabindex="0" aria-expanded="${!cl}" title="${cl?"Aufklappen":"Einklappen"}"><span class="pcdn">${pad(dt.getDate())}<i class="pcdbadge">${ts.length}</i></span><span class="pcdw"><b>${esc(dt.toLocaleDateString(LOCD(),{weekday:"long"}))}</b><small>${esc(MONTHS[dt.getMonth()])}</small></span><span class="pcdmini" aria-hidden="true">${ts.slice(0,5).map(t=>`<span>${avatar(t)}</span>`).join("")}</span><b class="pcdnet ${net>=0?"pos":""}">${net>=0?"+":"−"} ${esc(eur(Math.abs(net)))}</b><span class="pcdchev">${chev}</span></div>
          <div class="pcdrows">${ts.map(t=>`<button class="pcbr ${isIn(t)?"inc":""} ${B.sel===t.id?"sel":""}" data-pcsel="${esc(t.id)}">${avatar(t)}<span class="grow"><b>${esc(ttl(t))}${hasReceipt(t.id)?" "+clip:""}</b>${sub(t)?`<small>${esc(sub(t))}</small>`:""}</span><b class="amt">${esc(amtTxt(t))}</b></button>`).join("")}</div></div>`; };
      const ents=Object.entries(days), n=nCols(), w=ents.map(([d,ts])=>B.closed.has(d)?1.3:1.6+ts.length), tot=sum(w,x=>x), cols=[[]]; let acc=0;
      ents.forEach((e,i)=>{ if (cols.length<n && cols[cols.length-1].length && acc+w[i]/2>tot*cols.length/n) cols.push([]); cols[cols.length-1].push(e); acc+=w[i]; });
      B.n=n; lc.innerHTML = `<div class="pccols">${cols.map(c=>`<div class="pccol">${c.map(card).join("")}</div>`).join("")}</div><i class="pchl" aria-hidden="true"></i>`;
    }
    if (B.sel && !list.some(t=>t.id===B.sel)) B.sel=null;
    placeHl(false); det(false);
  };
  function placeHl(anim){
    const lc=$("listCard"), hl=lc && lc.querySelector(".pchl"); if (!hl) return;
    const r=B.sel && lc.querySelector(`[data-pcsel="${CSS.escape(B.sel)}"]`);
    lc.querySelectorAll(".pcbr").forEach(x=>x.classList.toggle("sel", x===r));
    if (!r || r.closest(".pcday.closed") || !r.offsetHeight){ hl.style.opacity=0; return; }
    const cr=lc.getBoundingClientRect(), b=r.getBoundingClientRect();
    const to={left:b.left-cr.left+"px", top:b.top-cr.top+"px", width:b.width+"px", height:b.height+"px"};
    if (anim && hl.style.opacity==="1" && !pcCalm()){ const fr={left:hl.style.left, top:hl.style.top, width:hl.style.width, height:hl.style.height}; hl.animate([fr,to],{duration:380,easing:"cubic-bezier(.2,.8,.2,1)"}); }
    else if (anim && !pcCalm()) hl.animate([{opacity:0,transform:"scale(.92)"},{opacity:1,transform:"none"}],{duration:260,easing:"cubic-bezier(.2,.8,.2,1)"});
    Object.assign(hl.style,to); hl.style.opacity=1;
  }
  function detHtml(t){
    const dt=new Date(t.date+"T12:00"), same=monthCalc(UI.ym).tx.filter(x=>ttl(x)===ttl(t)), rc=hasReceipt(t.id);
    const kv=[["Kategorie", t.cat||"–"], ["Art", KIND_LABEL[t.kind]||t.kind], ["Bezahlt", t.pay==="bar"?"💶 bar":"Karte / Konto"], ["Wiederkehrend", t.wk?"Ja":"Nein"]];
    if (isIn(t) && t.net!=null && Math.abs(t.net-t.amount)>0.004) kv.push(["Netto", eur(t.net)]);
    return `<div class="pcdx">
      <div class="pcdtop">${avatar(t)}<div class="grow"><h2>${esc(ttl(t))}</h2><span class="muted">${esc(dt.toLocaleDateString(LOCD(),{weekday:"long", day:"numeric", month:"long", year:"numeric"}))}</span></div><button class="roundbtn" data-pcdclose="1" aria-label="Schließen" title="Schließen">✕</button></div>
      <div class="pcdbig ${isIn(t)?"pos":""}">${esc(amtTxt(t))}</div>
      <div class="pcdbody"><div class="pcdkv">${kv.map(([a,b])=>`<div><span class="muted">${esc(a)}</span><b>${esc(b)}</b></div>`).join("")}
        ${same.length>1?`<div class="pcdsame"><small class="muted"><b>${esc(ttl(t))}</b> <span>diesen Monat</span></small><div><span>${same.length} Buchungen</span><b>${esc(amtTxt(t, sum(same,x=>x.amount)))}</b></div></div>`:""}</div>
        <div class="pcrc ${rc?"":"none"}"><i class="slot"></i>${rc?`<div class="paper"><img alt="Beleg" data-pcrimg="${esc(t.id)}"></div><span class="muted small">Beleg</span>`:`<div class="paper empty">${ic("receipt",28)}<span>Kein Beleg</span></div><button class="link small" data-edit="${esc(t.id)}">Beleg hinzufügen</button>`}</div></div>
      <div class="pcdact"><button class="btn primary" data-edit="${esc(t.id)}">✎ <span>Bearbeiten</span></button><button class="btn" data-pcdup="${esc(t.id)}">⧉ <span>Duplizieren</span></button><button class="btn danger" data-pcdel="${esc(t.id)}">${B.arm===t.id?"Wirklich löschen?":"🗑 Löschen"}</button><span class="muted small pcdkey">↑ ↓ <span>nächste Buchung</span></span></div></div>`;
  }
  function count(el, t, ms){ const v=t.amount, t0=performance.now(), e=x=>1-Math.pow(1-x,3);
    const st=n=>{ if (!el.isConnected) return; const k=Math.min(1,(n-t0)/ms); el.textContent=amtTxt(t, v*e(k)); if (k<1) requestAnimationFrame(st); }; requestAnimationFrame(st); }
  async function det(anim){
    const box=$("pcDet"); if (!box) return; const t=B.sel && S.tx.find(x=>x.id===B.sel);
    const sig=t ? JSON.stringify([t, hasReceipt(t.id), B.arm===t.id, LANG]) : "none|"+LANG;
    if (sig===B.sig && !anim) return; B.sig=sig;
    if (!t){ box.innerHTML=`<div class="pcdnone"><span class="pcdhand">${ic("receipt",34)}</span><b>Buchung anklicken</b><span class="muted">dann erscheint sie hier groß – mit Beleg</span></div>`; box.classList.add("empty"); return; }
    box.classList.remove("empty");
    const calm=pcCalm(), old=box.firstElementChild;
    if (anim && !calm && old) await old.animate([{opacity:1,filter:"blur(0)"},{opacity:0,filter:"blur(6px)"}],{duration:180,fill:"forwards"}).finished.catch(()=>{});
    if (B.sel!==t.id) return;
    box.innerHTML=detHtml(t);
    const img=box.querySelector("[data-pcrimg]"), paper=box.querySelector(".paper");
    if (anim && !calm){
      box.firstElementChild.animate([{opacity:0,transform:"scale(.97)"},{opacity:1,transform:"none"}],{duration:300,easing:"cubic-bezier(.2,.8,.2,1)"});
      count(box.querySelector(".pcdbig"), t, 1000);
      paper.animate([{transform:"translateY(-110%) rotate(0)",clipPath:"inset(100% 0 0 0)"},{transform:"translateY(-45%) rotate(0)",clipPath:"inset(0 0 0 0)",offset:.5},{transform:"translateY(-45%) rotate(0)",offset:.62},{transform:"translateY(8px) rotate(-5deg)",offset:.85},{transform:"rotate(-2deg)"}],{duration:1500,easing:"ease-out",fill:"backwards"});
    }
    if (img){ const src=await rcptGet(t.id); if (src && img.isConnected) img.src=src; }
  }
  function pick(id){ if (!id || id===B.sel) return; B.sel=id; B.arm=null; placeHl(true); det(true);
    const r=document.querySelector(`#listCard [data-pcsel="${CSS.escape(id)}"]`); if (r) r.scrollIntoView({block:"nearest", behavior:pcCalm()?"auto":"smooth"}); }
  document.addEventListener("click", e=>{
    if (UI.view!=="list") return;
    const r=e.target.closest("[data-pcsel]"); if (r){ pick(r.dataset.pcsel); return; }
    if (e.target.closest("[data-pcdclose]")){ B.sel=null; placeHl(false); det(true); return; }
    const du=e.target.closest("[data-pcdup]"); if (du){ const t=S.tx.find(x=>x.id===du.dataset.pcdup); if (!t) return;
      openSheet(t.kind==="umbuchung"?(t._k0||"ausgabe"):t.kind==="abhebung"?"ausgabe":t.kind); UI.cat=t.cat; UI.pay=t.pay||"karte"; $("fAmount").value=numStr(t.amount); $("fNote").value=t.note||""; $("fWk").checked=!!t.wk; renderSheet(); return; }
    const dl=e.target.closest("[data-pcdel]"); if (dl){ const id=dl.dataset.pcdel;
      if (B.arm!==id){ B.arm=id; det(false); clearTimeout(B.armT); B.armT=setTimeout(()=>{ B.arm=null; det(false); },3000); return; }
      B.arm=null; const old=S.tx.find(x=>x.id===id); if (!old) return;
      const l=shown(), i=l.findIndex(x=>x.id===id), next=l[i+1]||l[i-1];
      (async()=>{ const img=hasReceipt(id)?await rcptGet(id):null;
        if (await safe(()=>delTxDoc(old))){ if (img) await rcptDel(id); B.sel=next?next.id:null; render(); det(true);
          toast("Gelöscht", async ()=>{ await safe(()=>restoreTx(old)); if (img) await rcptPut(id, img); B.sel=id; render(); }); } })();
      return; }
  });
  document.addEventListener("dblclick", e=>{ if (UI.view!=="list") return; const r=e.target.closest("[data-pcsel]"); if (!r) return; const t=S.tx.find(x=>x.id===r.dataset.pcsel); if (t) openSheet(null, t); });
  document.addEventListener("keydown", e=>{
    if (UI.view!=="list" || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || (e.key!=="ArrowUp" && e.key!=="ArrowDown" && e.key!=="Escape" && e.key!=="Enter")) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement||{}).tagName||"") || !$("sheetBg").hidden || document.querySelector(".backdrop.show:not([hidden])")) return;
    if (e.key==="Escape"){ if (B.sel){ B.sel=null; placeHl(false); det(true); } return; }
    if (e.key==="Enter"){ const t=B.sel && S.tx.find(x=>x.id===B.sel); if (t){ e.preventDefault(); openSheet(null, t); } return; }
    const ids=[...document.querySelectorAll("#listCard .pcday:not(.closed) [data-pcsel]")].map(x=>x.dataset.pcsel); if (!ids.length) return;
    e.preventDefault(); if (document.activeElement && document.activeElement.closest && document.activeElement.closest(".pcbr")) document.activeElement.blur(); const i=ids.indexOf(B.sel); pick(ids[i<0 ? 0 : Math.max(0, Math.min(ids.length-1, i+(e.key==="ArrowDown"?1:-1)))]);
  });
  addEventListener("resize", ()=>{ if (UI.view!=="list") return; if (nCols()!==B.n) renderList(); else placeHl(false); });
  function follow(ms){ const t0=performance.now(); const st=n=>{ placeHl(false); if (n-t0<ms) requestAnimationFrame(st); }; requestAnimationFrame(st); }
  async function fold(d){
    const day=document.querySelector(`#listCard [data-pcday="${d}"]`); if (!day || B.busy.has(d)) return;
    const close=!day.classList.contains("closed"), body=day.querySelector(".pcdrows"), dn=day.querySelector(".pcdn"), rows=[...body.children];
    const badge=day.querySelector(".pcdbadge"), minis=[...day.querySelectorAll(".pcdmini>span")], head=day.querySelector(".pcdh");
    const E="cubic-bezier(.2,.8,.2,1)", st=()=>{ head.setAttribute("aria-expanded", String(!close)); head.title=close?"Aufklappen":"Einklappen"; if (close) B.closed.add(d); else B.closed.delete(d); saveClosed(); };
    if (pcCalm()){ day.classList.toggle("closed", close); st(); placeHl(false); return; }
    B.busy.add(d);
    try {
      if (close){
        const h=body.offsetHeight, nb=dn.getBoundingClientRect(), cx=nb.left+nb.width/2, cy=nb.top+nb.height/2;
        const fl=rows.map((r,i)=>{ const rb=r.getBoundingClientRect();
          return r.animate([{transform:"none",opacity:1},{transform:`translate(${cx-(rb.left+rb.width/2)}px,${cy-(rb.top+rb.height/2)}px) scale(.08)`,opacity:.15}],{duration:440,delay:Math.min(i,8)*60,easing:"cubic-bezier(.6,0,.4,1)",fill:"forwards"}); });
        if (rows.some(r=>r.classList.contains("sel"))) $("listCard").querySelector(".pchl").animate([{opacity:1},{opacity:0}],{duration:200});
        await Promise.all(fl.map(a=>a.finished));
        day.classList.add("closed"); st();
        dn.animate([{transform:"scale(1)"},{transform:"scale(1.3)"},{transform:"scale(1)"}],{duration:380,easing:E});
        badge.animate([{opacity:0,transform:"scale(0)"},{opacity:1,transform:"scale(1.4)",offset:.6},{opacity:1,transform:"none"}],{duration:420,easing:E});
        minis.forEach((m,i)=>m.animate([{transform:"scale(0)",opacity:0},{transform:"scale(1.25)",opacity:1,offset:.6},{transform:"none",opacity:1}],{duration:380,delay:120+i*60,easing:E,fill:"backwards"}));
        body.style.display="block"; body.style.overflow="hidden"; const sh=body.animate([{height:h+"px"},{height:"0px"}],{duration:360,easing:"cubic-bezier(.5,0,.2,1)"}); follow(380); await sh.finished; body.style.display=""; body.style.overflow="";
        fl.forEach(a=>a.cancel());
      } else {
        badge.animate([{opacity:1,transform:"none"},{opacity:0,transform:"scale(0)"}],{duration:200,easing:"ease-in"});
        minis.forEach(m=>m.animate([{transform:"none",opacity:1},{transform:"scale(0)",opacity:0}],{duration:200,easing:"ease-in"}));
        day.classList.remove("closed"); st();
        const h=body.offsetHeight; dn.animate([{transform:"scale(1)"},{transform:"scale(1.25)"},{transform:"scale(1)"}],{duration:380,easing:E});
        body.animate([{height:"0px"},{height:h+"px"}],{duration:420,easing:E}); follow(1100);
        const nb=dn.getBoundingClientRect(), cx=nb.left+nb.width/2, cy=nb.top+nb.height/2;
        await Promise.all(rows.map((r,i)=>{ const rb=r.getBoundingClientRect(), dy=cy-(rb.top+rb.height/2)+ (rb.top-body.getBoundingClientRect().top)*0;
          return r.animate([{transform:`translate(${cx-(rb.left+rb.width/2)}px,${dy}px) scale(.08)`,opacity:.15},{transform:"translate(0,4px) scale(1.02)",opacity:1,offset:.8},{transform:"none",opacity:1}],{duration:520,delay:Math.min(i,8)*80,easing:E,fill:"backwards"}).finished; }));
      }
    } finally { B.busy.delete(d); placeHl(false); }
  }
  document.addEventListener("click", e=>{ if (UI.view!=="list") return; const h=e.target.closest("[data-pcfold]"); if (h) fold(h.dataset.pcfold); });
  document.addEventListener("keydown", e=>{ const h=e.target.closest && e.target.closest("[data-pcfold]"); if (h && (e.key==="Enter"||e.key===" ")){ e.preventDefault(); e.stopPropagation(); fold(h.dataset.pcfold); } }, true);
}
/* Fixkosten-Kalender */
if (IS_PC){
  const F={pop:null, ring:0, drag:null, fresh:null, gone:null, first:true};
  const FCOL={Wohnen:"#2f7d5b",Schulden:"#b5473a",Auto:"#c27c0e",Versicherung:"#5b7f95","Sparen & Vorsorge":"#3d63a8","Abos & Handy":"#d14d72",Betrieb:"#6b5bb0",Sonstiges:"#0e8aa0"};
  const FIC={Wohnen:"home",Schulden:"bank",Auto:"car",Versicherung:"shield","Sparen & Vorsorge":"piggy","Abos & Handy":"phone",Betrieb:"case",Sonstiges:"dots"};
  const SV={pen:`<svg class="i" viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4"/></svg>`, bin:`<svg class="i" viewBox="0 0 24 24"><path d="M5 7h14M10 11v6M14 11v6M6.5 7l1 12.5h9L17.5 7M9.5 7V4.5h5V7"/></svg>`, x:`<svg class="i" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>`, plus:`<svg class="i" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>`};
  const col=a=>FCOL[a]||"#0e8aa0";
  const E="cubic-bezier(.2,.8,.2,1)", BO="cubic-bezier(.3,1.5,.5,1)";
  const dayOf=(f,ym)=>{ const D=daysIn(ym); let d=null;
    if (Array.isArray(f.days) && f.days.length){ for (const e of f.days) if (e.from<=ym) d=e.day; }
    if (d==null && f.day>=1) d=f.day; if (d==null) d=fixDay(f,ym);
    return d>=1 ? Math.min(D, d|0) : null; };
  const withDay=(f,ym,day)=>{ const base=Array.isArray(f.days)&&f.days.length ? f.days : f.day>=1 ? [{from:"0000-00", day:f.day|0}] : []; const p=base.filter(e=>e.from<ym); p.push({from:ym, day:day||0}); return p; };
  const clean=f=>{ const d={...f}; delete d.id; return d; };
  const _rf=renderFix;
  renderFix = function(){
    if (UI.fixEdit) { $("v-fix").classList.remove("pcfcal"); return _rf(); }
    if ($("v-fix").contains(document.activeElement) && document.activeElement.id==="fxAmtIn") return;
    const ym=UI.ym, c=monthCalc(ym), paid=c.paid||{}, cur=ymOf(new Date()), today=ym===cur?new Date().getDate():ym<cur?99:0;
    const mName=MONTHS[ymParts(ym)[1]-1], D=daysIn(ym), [y,m]=ymParts(ym), first=(new Date(y,m-1,1).getDay()+6)%7;
    const all=fixedSorted().filter(f=>dueIn(f,ym) || f.id in paid);
    const amtOf=f=>f.id in paid?Number(paid[f.id])||0:planAmt(f,ym);
    const total=sum(all,amtOf), pSum=sum(all.filter(f=>f.id in paid),amtOf), nPaid=all.filter(f=>f.id in paid).length;
    const by={}, none=[]; for (const f of all){ const d=dayOf(f,ym); if (d) (by[d]=by[d]||[]).push(f); else none.push(f); }
    const chip=f=>{ const on=f.id in paid, a=fixArea(f), d=dayOf(f,ym), late=!on && d && d<today, ed=UI.amtEdit===f.id;
      return `<div class="pcfc ${on?"on":""} ${late?"late":""}" style="--c:${col(a)}" data-pay="${esc(f.id)}" data-pcfid="${esc(f.id)}" draggable="${ed?"false":"true"}" role="checkbox" tabindex="0" aria-checked="${on}" title="${esc(f.name)} · ${esc(a)}${late?" · überfällig":""}">
        ${brandFor(f.name)?brandBadge(brandFor(f.name)):tile(f.kind==="betrieb"?"betrieb":"fix", f.name)}<span class="n" lang="de">${esc(f.name)}</span>
        ${ed?`<input class="in fxamt-in" id="fxAmtIn" data-fxamtin="${esc(f.id)}" inputmode="decimal" value="${esc(numStr(amtOf(f)))}" aria-label="Betrag für ${esc(f.name)} im ${esc(mName)}">`
          :`<button class="a" data-fxamt="${esc(f.id)}" title="Betrag nur für ${esc(mName)} ändern">${esc(eur(amtOf(f)))}</button>`}
        <i class="ck"></i><button class="pe" data-pcfedit="${esc(f.id)}" title="Bearbeiten" aria-label="${esc(f.name)} bearbeiten">${SV.pen}</button></div>`; };
    let cells="";
    for (let i=0;i<first;i++) cells+=`<div class="pcfd x"></div>`;
    for (let d=1; d<=D; d++){ const fs=by[d]||[], s=sum(fs,amtOf), wd=(first+d-1)%7;
      cells+=`<div class="pcfd ${d===today?"today":""} ${wd>4?"we":""}" data-pcfday="${d}"><div class="dh"><b>${pad(d)}</b>${s?`<span>${esc(eur0(s))}</span>`:""}</div>${fs.map(chip).join("")}<button class="pcfadd" data-pcfnew="${d}" title="Fixkoste am ${d}. eintragen" aria-label="Fixkoste am ${d}. eintragen">${SV.plus}</button></div>`; }
    const wk=["Mo","Di","Mi","Do","Fr","Sa","So"].map(w=>`<span>${w}</span>`).join("");
    const soon=ym===cur ? all.filter(f=>!(f.id in paid)).map(f=>({f,d:dayOf(f,ym)})).filter(x=>x.d && x.d>=today && x.d<=today+6) : [];
    const groups={}; for (const f of all) (groups[fixArea(f)]=groups[fixArea(f)]||[]).push(f);
    const gl=Object.entries(groups).sort((a,b)=>sum(b[1],amtOf)-sum(a[1],amtOf)).map(([a,fs])=>{ const p=fs.filter(f=>f.id in paid).length;
      return `<div class="gl" style="--c:${col(a)}"><span class="gi">${ic(FIC[a]||"dots",17)}</span><span class="gn"><span>${esc(a)}</span><i class="gb"><i style="width:${Math.round(p/fs.length*100)}%"></i></i></span><small>${p}/${fs.length}</small><b>${esc(eur0(sum(fs,amtOf)))}</b></div>`; }).join("");
    const R=50, C=2*Math.PI*R, pct=total?pSum/total:0;
    $("v-fix").classList.add("pcfcal");
    $("v-fix").innerHTML = `
      <div class="card pcfcalc"><div class="wd">${wk}</div><div class="grid">${cells}</div></div>
      <div class="pcfside">
        <div class="card pcfsum"><span class="small muted">Im ${esc(mName)} fest verplant</span><div class="big" data-v="${total}">${esc(eur0(total))}</div>
          <div class="pcfring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="${R}" class="bg"/><circle cx="60" cy="60" r="${R}" class="fg" style="stroke-dasharray:${C.toFixed(1)};stroke-dashoffset:${(C*(1-F.ring)).toFixed(1)}" data-to="${(C*(1-pct)).toFixed(1)}"/></svg>
            <div><b>${esc(eur0(pSum))}</b><span class="small muted">bezahlt · ${nPaid} von ${all.length}</span></div></div>
          <div class="kv"><span>Noch offen</span><b>${esc(eur0(total-pSum))}</b></div>
          ${ym===cur?`<div class="kv"><span>In den nächsten 7 Tagen</span><b>${soon.length?`${soon.length} <span>Posten</span> · ${esc(eur0(sum(soon,x=>amtOf(x.f))))}`:"nichts"}</b></div>`:""}
          <div class="row-btns">${all.length&&nPaid<all.length?`<button class="btn" id="payAll">Alle abhaken</button>`:""}<button class="btn" id="fixEditBtn">Liste bearbeiten</button></div></div>
        ${gl?`<div class="card pcfgr"><div class="small muted" style="margin-bottom:6px">Gruppen</div>${gl}</div>`:""}
        <div class="card pcfnone" data-pcfday="0"><div class="small muted"><b>Ohne festen Tag</b> · <span>${none.length?"auf einen Tag im Kalender ziehen":"hierher ziehen, um den Tag zu entfernen"}</span></div>${none.map(chip).join("")}<button class="pcfadd wide" data-pcfnew="0">${SV.plus}<span>Neue Fixkosten</span></button></div>
        <div class="small muted pcfhint">Klick = abhaken · Stift = bearbeiten · Ziehen = Tag ändern · + im Tag = neu eintragen</div>
      </div>`;
    const calm=pcCalm(), root=$("v-fix");
    requestAnimationFrame(()=>{ const r=root.querySelector(".pcfring .fg"); if (r) r.style.strokeDashoffset=r.dataset.to; F.ring=pct;
      if (!calm){
        const q=id=>root.querySelector(`[data-pcfid="${CSS.escape(id)}"]`);
        if (F.pop){ const el=q(F.pop); if (el){ el.animate(el.classList.contains("on")?[{transform:"scale(1)"},{transform:"scale(1.09)"},{transform:"scale(1)"}]:[{transform:"scale(.93)"},{transform:"scale(1)"}],{duration:380,easing:BO});
          const k=el.querySelector(".ck"); if (k && el.classList.contains("on")) k.animate([{transform:"scale(0) rotate(-90deg)"},{transform:"scale(1.25)"},{transform:"none"}],{duration:420,easing:BO}); } }
        if (F.fresh){ const el=q(F.fresh); if (el){ el.animate([{opacity:0,transform:"translateY(-26px) scale(.7)"},{opacity:1,transform:"translateY(3px) scale(1.03)",offset:.7},{opacity:1,transform:"none"}],{duration:520,easing:E});
          const cell=el.closest(".pcfd,.pcfnone"); if (cell) cell.animate([{boxShadow:"inset 0 0 0 2px #1a7a5c"},{boxShadow:"inset 0 0 0 2px #1a7a5c00"}],{duration:900,easing:"ease-out"}); } }
      }
      F.pop=null; F.fresh=null; });
  };
  const root=$("v-fix");
  // Intro
  function enter(){
    if (pcCalm() || !root.classList.contains("pcfcal")) return;
    const cells=[...root.querySelectorAll(".pcfd")], chips=[...root.querySelectorAll(".pcfcalc .pcfc")], side=[...root.querySelectorAll(".pcfside>*")];
    const cal=root.querySelector(".pcfcalc"), cols=7;
    const ring=root.querySelector(".pcfring .fg"), bars=[...root.querySelectorAll(".pcfgr .gb>i")], big=root.querySelector(".pcfsum .big");
    if (cal) cal.animate([{opacity:0},{opacity:1}],{duration:260,easing:"ease-out",fill:"backwards"});
    {
      cells.forEach((el,i)=>{ const r=Math.floor(i/cols), c=i%cols; el.style.transformOrigin="50% 0";
        el.animate([{opacity:0,transform:"perspective(700px) rotateX(-88deg)"},{opacity:1,transform:"perspective(700px) rotateX(8deg)",offset:.7},{opacity:1,transform:"none"}],{duration:560,delay:80+r*90+c*28,easing:E,fill:"backwards"}); });
      chips.forEach(el=>{ const i=cells.indexOf(el.closest(".pcfd")), r=Math.floor(i/cols), c=i%cols;
        el.animate([{opacity:0,transform:"translateY(-14px) scale(.85)"},{opacity:1,transform:"none"}],{duration:380,delay:420+r*90+c*28,easing:BO,fill:"backwards"}); });
    }
    side.forEach((el,i)=>el.animate([{opacity:0,transform:"translateX(70px)"},{opacity:1,transform:"none"}],{duration:520,delay:120+i*90,easing:E,fill:"backwards"}));
    if (ring){ const C=ring.style.strokeDasharray; ring.animate([{strokeDashoffset:C},{strokeDashoffset:ring.dataset.to}],{duration:1100,delay:350,easing:E,fill:"backwards"}); }
    bars.forEach((el,i)=>el.animate([{width:"0%"},{width:el.style.width}],{duration:800,delay:450+i*70,easing:E,fill:"backwards"}));
    if (big){ const to=Number(big.dataset.v)||0, t0=performance.now()+250, txt=big.textContent; const step=t=>{ const k=Math.min(1,Math.max(0,(t-t0)/900)), e=1-Math.pow(1-k,3); big.textContent=eur0(to*e); if (k<1) requestAnimationFrame(step); else big.textContent=txt; }; requestAnimationFrame(step); }
  }
  new MutationObserver(()=>{ if (!root.hidden) requestAnimationFrame(enter); }).observe(root, {attributes:true, attributeFilter:["hidden"]});
  // Abhaken
  root.addEventListener("click", e=>{
    const ed=e.target.closest("[data-pcfedit]"); if (ed){ e.stopPropagation(); e.preventDefault(); popEdit(ed.dataset.pcfedit, ed.closest(".pcfc")); return; }
    const nw=e.target.closest("[data-pcfnew]"); if (nw){ e.stopPropagation(); e.preventDefault(); popNew(+nw.dataset.pcfnew, nw); return; }
    const p=e.target.closest("[data-pay]"); if (p && !e.target.closest("[data-fxamt],#fxAmtIn")) F.pop=p.dataset.pay;
  }, true);
  root.addEventListener("contextmenu", e=>{ const c=e.target.closest(".pcfc"); if (c){ e.preventDefault(); popEdit(c.dataset.pcfid, c); } });
  root.addEventListener("keydown", e=>{ const p=e.target.closest && e.target.closest(".pcfc"); if (!p || e.target!==p) return;
    if (e.key==="Enter"||e.key===" "){ e.preventDefault(); p.click(); } else if (e.key==="F2"||e.key==="e"){ e.preventDefault(); popEdit(p.dataset.pcfid, p); } else if (e.key==="Delete"){ e.preventDefault(); popEdit(p.dataset.pcfid, p, true); } });
  // Ziehen
  let ghost=null;
  root.addEventListener("dragstart", e=>{ const c=e.target.closest && e.target.closest(".pcfc"); if (!c) return; if (e.target.closest("input,textarea,select") || c.querySelector("#fxAmtIn")){ e.preventDefault(); return; } popClose(); F.drag=c.dataset.pcfid; e.dataTransfer.effectAllowed="move"; try { e.dataTransfer.setData("text/plain", F.drag); } catch(_){}
    ghost=c.cloneNode(true); ghost.classList.add("pcfghost"); ghost.style.width=c.offsetWidth+"px"; document.body.appendChild(ghost); try { e.dataTransfer.setDragImage(ghost, 24, 18); } catch(_){}
    setTimeout(()=>{ c.classList.add("drag"); root.classList.add("dragging"); },0); });
  root.addEventListener("dragend", ()=>{ F.drag=null; if (ghost){ ghost.remove(); ghost=null; } root.classList.remove("dragging"); root.querySelectorAll(".drag,.over").forEach(x=>x.classList.remove("drag","over")); });
  root.addEventListener("dragover", e=>{ if (!F.drag) return; const d=e.target.closest("[data-pcfday]"); if (!d || d.classList.contains("x")) return; e.preventDefault(); root.querySelectorAll(".over").forEach(x=>x!==d&&x.classList.remove("over")); d.classList.add("over"); });
  root.addEventListener("dragleave", e=>{ const d=e.target.closest("[data-pcfday]"); if (d && !d.contains(e.relatedTarget)) d.classList.remove("over"); });
  root.addEventListener("drop", async e=>{ const d=e.target.closest("[data-pcfday]"), id=F.drag; if (!d || !id) return; e.preventDefault(); F.drag=null;
    const f=S.fixed.find(x=>x.id===id); if (!f) return; const n=+d.dataset.pcfday, ym=UI.ym; if ((dayOf(f,ym)||0)===n){ renderFix(); return; }
    const before=clean(f), data=clean(f); data.days=withDay(f,ym,n); delete data.day; F.fresh=id;
    if (await safe(()=>put("fixed", id, data))) toast(n?`${f.name}: ab ${monthName(ym)} am ${n}.`:`${f.name}: ohne festen Tag`, ()=>safe(()=>put("fixed", id, before)), "Rückgängig"); });
  // Editor
  const pop=document.createElement("div"); pop.id="pcfPop"; pop.className="pcfpop"; pop.hidden=true; document.body.appendChild(pop);
  let popFor=null;
  function place(anchor){
    const r=anchor.getBoundingClientRect(), w=pop.offsetWidth, h=pop.offsetHeight;
    let x=r.left+r.width/2-w/2, yy=r.bottom+10, up=false; x=Math.max(12, Math.min(innerWidth-w-12, x));
    if (yy+h>innerHeight-50){ yy=r.top-h-10; up=true; }
    pop.style.left=x+"px"; pop.style.top=Math.max(12,yy)+"px"; pop.style.setProperty("--ax", (r.left+r.width/2-x)+"px"); pop.classList.toggle("up", up);
    if (!pcCalm()) pop.animate([{opacity:0,transform:`translateY(${up?8:-8}px) scale(.92)`},{opacity:1,transform:"none"}],{duration:260,easing:BO});
  }
  function popClose(){ if (pop.hidden) return; const done=()=>{ pop.hidden=true; pop.innerHTML=""; popFor=null; };
    if (pcCalm()) return done(); pop.animate([{opacity:1,transform:"none"},{opacity:0,transform:"scale(.94)"}],{duration:150,easing:"ease-in"}).onfinish=done; }
  const field=(lbl,inner)=>`<label class="pf"><span>${lbl}</span>${inner}</label>`;
  function form(f, day){
    const ym=UI.ym, mon=monthName(ym), D=daysIn(ym);
    return `<div class="ph"><b>${f?esc(f.name):"Neue Fixkosten"}</b><button class="px" data-pfx aria-label="Schließen">${SV.x}</button></div>
      ${field("Name",`<input class="in" data-pf="name" value="${f?esc(f.name):""}" placeholder="z. B. Miete, Netflix, Versicherung" autocomplete="off">`)}
      <div class="pr2">${field(`Betrag ab ${esc(mon)}`,`<input class="in" data-pf="amount" inputmode="decimal" value="${f?esc(numStr(listAmt(f,ym))):""}" placeholder="0,00">`)}
        ${field("Tag",`<select class="in" data-pf="day"><option value="0">ohne</option>${Array.from({length:D},(_,i)=>`<option value="${i+1}" ${day===i+1?"selected":""}>${i+1}.</option>`).join("")}</select>`)}</div>
      <div class="pr2">${field("Rhythmus",`<select class="in" data-pf="rhythm">${RHYTHMS.filter(r=>r[0]!=="monate").map(([k,l])=>`<option value="${k}" ${(f&&f.rhythm||"monatlich")===k?"selected":""}>${l}</option>`).join("")}${f&&f.rhythm==="monate"?`<option value="monate" selected>Bestimmte Monate</option>`:""}</select>`)}
        ${field("Art",`<select class="in" data-pf="kind"><option value="privat" ${!f||f.kind!=="betrieb"?"selected":""}>Privat</option><option value="betrieb" ${f&&f.kind==="betrieb"?"selected":""}>Betrieblich</option></select>`)}</div>
      ${(()=>{ const a=f&&aboCfg()[f.id]||{}; return `<div class="pfsec">Vertrag <small>(optional – Erinnerung 30 Tage vor der Frist)</small></div><div class="pr2">${field("Läuft bis",`<input class="in" type="date" data-pf="aboend" value="${esc(a.end||"")}">`)}${field("Kündigungsfrist",`<select class="in" data-pf="abonot">${ABO_NOT.map(([v,l])=>`<option value="${v}" ${Number(a.notice||0)===v?"selected":""}>${l}</option>`).join("")}</select>`)}</div>`; })()}
      <div class="small muted pnote">${f?`Änderungen gelten ab ${esc(mon)} – frühere Monate bleiben, wie sie waren.`:`Gilt ab ${esc(mon)} für alle folgenden Monate.`}</div>
      <div class="pa">${f?`<button class="btn pdel" data-pfdel>${SV.bin}<span>Löschen</span></button>`:""}<span style="flex:1"></span><button class="btn" data-pfx>Abbrechen</button><button class="btn primary" data-pfok>${f?"Speichern":"Eintragen"}</button></div>`;
  }
  function popEdit(id, anchor, del){ const f=S.fixed.find(x=>x.id===id); if (!f || !anchor) return; popFor={id, anchor}; pop.innerHTML=form(f, dayOf(f,UI.ym)); pop.hidden=false; place(anchor);
    const el=pop.querySelector(del?"[data-pfdel]":"[data-pf=name]"); if (el){ el.focus(); if (el.select) el.select(); } }
  const seg=m=>`<div class="rfseg"><button class="${m==="fix"?"on":""}" data-pfmode="fix">📅 Fixkosten</button><button class="${m==="rate"?"on rate":""}" data-pfmode="rate">🏦 Rate / Schulden</button></div>`;
  function newHtml(day, m){ if (m==="rate") return `<div class="ph"><b>Neue Rate</b><button class="px" data-pfx aria-label="Schließen">${SV.x}</button></div>${seg(m)}<div class="rfroot">${rateFormHtml(day)}</div>
      <div class="pa"><span style="flex:1"></span><button class="btn" data-pfx>Abbrechen</button><button class="btn primary rfgo" data-pfok>Rate anlegen</button></div>`;
    return form(null, day).replace('</div>', '</div>'+seg(m)); }
  function popNew(day, anchor, m){ if (!anchor) return; popFor={id:null, day, anchor, mode:m||"fix"}; pop.innerHTML=newHtml(day, popFor.mode); pop.hidden=false; place(anchor); const i=pop.querySelector('[data-pf=name],[data-rf=name]'); if (i) i.focus(); }
  const val=k=>{ const el=pop.querySelector(`[data-pf="${k}"]`); return el?el.value:""; };
  async function popSave(){
    if (popFor && !popFor.id && popFor.mode==="rate"){ const r=rateRead(pop), err=rateCheck(r); if (err){ toast(err); return; } popClose(); const n=await rateCreate(r); if (n) toast(`${n} als Rate eingetragen`); return; }
    const ym=UI.ym, name=val("name").trim(), v=parseAmt(val("amount")||"0"), day=+val("day")||0, rh=val("rhythm"), kind=val("kind");
    if (!name){ const n=pop.querySelector("[data-pf=name]"); n.focus(); if (!pcCalm()) n.animate([{transform:"translateX(0)"},{transform:"translateX(-6px)"},{transform:"translateX(6px)"},{transform:"translateX(-3px)"},{transform:"none"}],{duration:300}); return; }
    if (!(v>=0)){ toast("Betrag ungültig"); return; }
    const nv=Math.round(v*100)/100, cm=Number(ym.slice(5,7));
    if (!popFor.id){
      const id=newId(), d={name, amount:nv, kind, order:S.fixed.length, from:ym, days:[{from:ym, day}]};
      if (rh!=="monatlich"){ d.rhythm=rh; d.months=rhythmMonths(rh, cm); }
      F.fresh=id; const ae=val("aboend"), an=Number(val("abonot"))||0; popClose(); if (ae||an){ S.settings.abos={...(S.settings.abos||{}), [id]:{end:ae, notice:an}}; saveSettings(); } if (await safe(()=>put("fixed", id, d))) toast(`${name} eingetragen`, ()=>safe(()=>del("fixed", id)), "Rückgängig"); return;
    }
    const f=S.fixed.find(x=>x.id===popFor.id); if (!f){ popClose(); return; }
    { const ae=val("aboend"), an=Number(val("abonot"))||0, A={...(S.settings.abos||{})}, o=A[f.id]||{}; if ((o.end||"")!==ae || Number(o.notice||0)!==an){ if (ae||an||o.abo) A[f.id]={...o, end:ae, notice:an}; else delete A[f.id]; S.settings.abos=A; saveSettings(); } }
    const before=clean(f), d=clean(f); d.name=name; d.kind=kind;
    if (Math.abs(nv-listAmt(f,ym))>0.004){ const np=withPrice(f, ym, nv); d.amount=np.amount; if (np.prices) d.prices=np.prices; else delete d.prices; }
    if ((dayOf(f,ym)||0)!==day){ d.days=withDay(f,ym,day); delete d.day; }
    if (rh!==(f.rhythm||"monatlich")){ if (rh==="monatlich"){ delete d.rhythm; delete d.months; } else if (rh!=="monate"){ d.rhythm=rh; d.months=rhythmMonths(rh, Array.isArray(f.months)&&f.months.length?Math.min(...f.months):cm); } }
    F.fresh=f.id; popClose();
    if (await safe(()=>put("fixed", f.id, d))) toast(`${name} gespeichert`, ()=>safe(()=>put("fixed", f.id, before)), "Rückgängig");
  }
  async function popDelete(){
    const f=S.fixed.find(x=>x.id===popFor.id); if (!f) return popClose();
    const ym=UI.ym, before=clean(f), anchor=popFor.anchor;
    const used=Object.keys(S.months).some(k=>k<ym && S.months[k] && S.months[k].paid && f.id in S.months[k].paid) || (f.from && f.from<ym);
    popClose();
    const ticks=Object.keys(S.months).filter(k=>k>=ym && S.months[k] && S.months[k].paid && f.id in S.months[k].paid).map(k=>[k, clone(S.months[k])]);
    const unTick=async()=>{ for (const [k,mo] of ticks){ const n=clone(mo); delete n.paid[f.id]; await put("months", k, n); } };
    const reTick=async()=>{ for (const [k,mo] of ticks) await put("months", k, mo); };
    const go=async()=>{ if (used){ const d=clean(f); d.until=shiftYm(ym,-1); if (await safe(async()=>{ await unTick(); await put("fixed", f.id, d); })) toast(`${f.name} ab ${monthName(ym)} gelöscht`, ()=>safe(async()=>{ await put("fixed", f.id, before); await reTick(); }), "Rückgängig"); }
      else if (await safe(async()=>{ await unTick(); await del("fixed", f.id); })) toast(`${f.name} gelöscht`, ()=>safe(async()=>{ await put("fixed", f.id, before); await reTick(); }), "Rückgängig"); };
    if (anchor && anchor.isConnected && !pcCalm()){ anchor.style.pointerEvents="none"; const a=anchor.animate([{opacity:1,transform:"none",filter:"blur(0)"},{opacity:.9,transform:"scale(1.06)",offset:.25},{opacity:0,transform:"scale(.3) rotate(-8deg)",filter:"blur(3px)"}],{duration:380,easing:"cubic-bezier(.5,0,.75,0)",fill:"forwards"}); a.onfinish=go; }
    else go();
  }
  pop.addEventListener("click", e=>{ e.stopPropagation();
    if (e.target.closest("[data-pfx]")) return popClose();
    const pm=e.target.closest("[data-pfmode]"); if (pm && popFor && !popFor.id){ popFor.mode=pm.dataset.pfmode; pop.innerHTML=newHtml(popFor.day, popFor.mode); place(popFor.anchor); const i=pop.querySelector('[data-pf=name],[data-rf=name]'); if (i) i.focus(); return; }
    if (e.target.closest("[data-pfok]")) return popSave();
    const db=e.target.closest("[data-pfdel]"); if (db){ if (db.classList.contains("arm")) return popDelete(); db.classList.add("arm"); db.querySelector("span").textContent="Wirklich löschen?"; setTimeout(()=>{ if (db.isConnected){ db.classList.remove("arm"); db.querySelector("span").textContent="Löschen"; } }, 3500); } });
  pop.addEventListener("keydown", e=>{ if (e.key==="Escape"){ e.stopPropagation(); popClose(); } else if (e.key==="Enter" && e.target.tagName!=="BUTTON"){ e.preventDefault(); popSave(); } });
  document.addEventListener("mousedown", e=>{ if (!pop.hidden && !pop.contains(e.target) && !e.target.closest("[data-pcfedit],[data-pcfnew]")) popClose(); }, true);
  addEventListener("resize", ()=>popClose());
  document.addEventListener("scroll", ()=>{ if (!pop.hidden && popFor && popFor.anchor && popFor.anchor.isConnected){ const r=popFor.anchor.getBoundingClientRect(); if (r.bottom<0||r.top>innerHeight) popClose(); } }, true);
}

/* Buchungen */
if (IS_PC){
  const root=$("v-list"), E="cubic-bezier(.2,.8,.2,1)", BO="cubic-bezier(.3,1.5,.5,1)";
  const vis=el=>{ const r=el.getBoundingClientRect(); return r.bottom>0 && r.top<innerHeight && r.width>0; };
  function enter(){
    if (pcCalm()) return;
    const tops=[...root.children].filter(x=>x!==$("listCard") && x.id!=="pcDet" && !x.hidden && vis(x));
    const cols=[...root.querySelectorAll(".pccol")], det=$("pcDet");
    tops.forEach((el,i)=>el.animate([{opacity:0,transform:"translateY(-16px)"},{opacity:1,transform:"none"}],{duration:380,delay:i*50,easing:E,fill:"backwards"}));
    cols.forEach((c,ci)=>{ const days=[...c.querySelectorAll(":scope>.pcday")].filter(vis);
      days.forEach((d,di)=>{
        { const r=d.getBoundingClientRect(), dx=innerWidth*0.5-(r.left+r.width/2), dy=innerHeight-(r.top);
          d.animate([{opacity:0,transform:`translate(${dx}px,${dy}px) rotate(${(di+ci)%2?14:-14}deg) scale(.7)`},{opacity:1,offset:.3},{opacity:1,transform:"translateY(-6px) rotate(0) scale(1.02)",offset:.85},{opacity:1,transform:"none"}],{duration:700,delay:80+(di*cols.length+ci)*55,easing:"cubic-bezier(.3,.7,.3,1)",fill:"backwards"});
        } });
    });
    { const n=cols.reduce((m,c)=>Math.max(m,[...c.querySelectorAll(":scope>.pcday")].filter(vis).length),0)*cols.length, t=80+n*55+700;
      root.querySelectorAll(".pchl").forEach(h=>h.animate([{opacity:0},{opacity:0,offset:.8},{opacity:1}],{duration:t+250,easing:"ease-out"})); }
    if (det && vis(det)){
      det.animate([{opacity:0,transform:"translateX(80px)"},{opacity:1,transform:"none"}],{duration:560,delay:180,easing:E,fill:"backwards"});
      const paper=det.querySelector(".paper"); if (paper) paper.animate([{transform:"translateY(-102%)"},{transform:"none"}],{duration:1100,delay:600,easing:"cubic-bezier(.35,.6,.3,1)",fill:"backwards"});
    }
  }
  new MutationObserver(()=>{ if (!root.hidden) requestAnimationFrame(enter); }).observe(root, {attributes:true, attributeFilter:["hidden"]});
}
/* Einkauf */
if (IS_PC){
  const root=$("v-shop"), E="cubic-bezier(.2,.8,.2,1)", BO="cubic-bezier(.3,1.5,.5,1)";
  const CATN={super:"Supermarkt",disc:"Discounter",drog:"Drogerie",kleid:"Kleidung",elek:"Elektronik",bau:"Baumarkt",moebel:"Möbel",tier:"Tierbedarf",online:"Online"};
  const badge=sh=>brandBadge({t:sh.name.replace(/ .*/,"").slice(0,1), bg:sh.color, ink:sh.ink||"#fff", domain:SHOP_DOMAINS[sh.id]||""});
  const shopBy=id=>SHOPS.find(x=>x.id===id);
  const list=()=>S.settings.shoplist||[];
  const chosen=()=>(S.settings.shops||[]).map(shopBy).filter(Boolean);
  const K={fresh:null, gone:null, swap:false, prev:""};
  function bestFor(name){
    const tk=priceToks(name); if (!tk.length) return null; const mine=new Set(S.settings.shops||[]), by={};
    for (const e of (S.settings.pricebook||[])) if (sameProduct(tk, priceToks(e.n))){ if (!by[e.s] || by[e.s].d<=e.d) by[e.s]=e; }
    const td=isoToday();
    for (const d of (S.settings.deals||[])) if ((!d.until||d.until>=td) && d.price && sameProduct(tk, priceToks(d.text))){ if (!by[d.shop] || d.price<by[d.shop].p) by[d.shop]={s:d.shop,p:d.price,deal:true}; }
    const all=Object.values(by).filter(x=>shopBy(x.s)); if (!all.length) return null;
    all.sort((a,b)=>(mine.has(b.s)-mine.has(a.s)) || a.p-b.p);
    const pool=all.filter(x=>mine.has(x.s)).length?all.filter(x=>mine.has(x.s)):all, best=pool.slice().sort((a,b)=>a.p-b.p)[0], worst=pool.slice().sort((a,b)=>b.p-a.p)[0];
    return {s:best.s, p:best.p, save:worst.p-best.p, deal:!!best.deal};
  }
  const where=it=>{ if (it.s) return {s:it.s, p:it.p!=null?it.p:null, manual:true}; return bestFor(it.n); };
  function saveList(l){ zSave(l); }
  function renderShopPC(){
    const ch=chosen();
    if (!ch.length){ root.classList.remove("pcshop"); root.innerHTML=`<div class="pcsnone">${zettelCard()}${offersCard()}</div>`; return; }
    const cats=[...new Set(ch.map(x=>x.cat))]; if (UI.shopCat && !cats.includes(UI.shopCat)) UI.shopCat="";
    const shown=UI.shopCat?ch.filter(x=>x.cat===UI.shopCat):ch;
    if (!ch.some(x=>x.id===UI.shopSel)) UI.shopSel=ch[0].id;
    const stats=Object.fromEntries(shopStats().map(o=>[o.shop.id,o])), mx=Math.max(1,...ch.map(x=>(stats[x.id]||{}).sum||0));
    const L=list(), W=L.map(it=>({it, w:where(it)}));
    const left=`<div class="card pcsl"><div class="pcslh"><b>Deine Läden</b><span class="small muted">Ø im Monat</span></div>
      ${cats.length>1?`<div class="pcscats">${[["","Alle"],...cats.map(c=>[c,CATN[c]||c])].map(([c,l])=>`<button class="${(UI.shopCat||"")===c?"on":""}" data-pcscat="${c}">${esc(l)}</button>`).join("")}</div>`:""}
      <div class="pcsls">${shown.map(sh=>{ const st=stats[sh.id]||{sum:0,count:0}, nd=shopDeals(sh.id).length, nz=W.filter(x=>!x.it.done && x.w && x.w.s===sh.id).length;
        return `<button class="pcsli ${sh.id===UI.shopSel?"on":""}" data-pcshop="${sh.id}" style="--c:${sh.color}">${badge(sh)}<span class="pcstx"><b>${esc(sh.name)}</b><small>${esc(CATN[sh.cat]||"")}</small><i class="bar"><i style="width:${Math.round(st.sum/mx*100)}%"></i></i></span><span class="r"><b>${esc(eur0(st.sum/6))}</b>${nd||nz?`<small>${nd?`${ic("tag",12)}${nd}`:""}${nz?`${ic("list",12)}${nz}`:""}</small>`:""}</span></button>`; }).join("")}</div>
      <button class="pcsadd" data-go="more" data-scroll="shopEd">+ Läden auswählen</button></div>`;
    const sh=shopBy(UI.shopSel), st=stats[sh.id]||{sum:0,count:0,last:""};
    const deals=shopDeals(sh.id), prices=shopPrices(sh.id), name=n=>n.charAt(0).toUpperCase()+n.slice(1);
    const recent=S.tx.filter(t=>t.kind==="ausgabe" && sh.re.test(nrm(t.note))).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6);
    const rmax=Math.max(1,...recent.map(t=>t.amount)), mine=W.filter(x=>x.w && x.w.s===sh.id);
    const canWeb=!!((window.AndroidBridge && window.AndroidBridge.pageOpen) || window.pcPageDemo), web=canWeb || !!(K.pg && K.PG.open && K.PG.embed);
    const det=web ? `<div class="card pcsweb" id="pcsWeb" style="--c:${sh.color}"></div>` : `<div class="card pcsd" style="--c:${sh.color};--k:${sh.ink||"#fff"}">
      <div class="pcsdh"><div class="lg">${badge(sh)}</div><div class="grow"><h2>${esc(sh.name)}</h2><span class="small muted">${esc(CATN[sh.cat]||"")} · ${st.count?`Ø ${esc(eur0(st.sum/6))} im Monat · ${st.count} Einkäufe in 6 Monaten${st.last?` · zuletzt am ${esc(shortDate(st.last))}`:""}`:"zuletzt nicht eingekauft"}</span></div>
        <button class="btn primary" data-openshop="${esc(sh.url)}">${ic("cart",16)} Prospekt</button></div>
      <div class="pcsdc"><div>
        <div class="ssh">Gemerkte Angebote</div>
        ${deals.map(d=>`<div class="pccp"><div class="grow"><b>${esc(d.text)}</b><small class="muted">${d.until?`bis ${esc(shortDate(d.until))}`:"ohne Datum"}</small></div>${d.price?`<b class="pp">${esc(eur(d.price))}</b>`:""}<button class="x" data-dealdel="${esc(d.id)}" aria-label="Angebot löschen">×</button></div>`).join("")}
        ${UI.dealAdd===sh.id?`<div class="pccp form"><input class="in" id="dealText" placeholder="Was? z. B. Kaffee 500 g" aria-label="Was"><div class="pr2"><input class="in" id="dealPrice" inputmode="decimal" placeholder="Preis €" aria-label="Preis"><input class="in" type="date" id="dealUntil" value="${esc(nextSat())}" aria-label="Bis wann"></div><div class="pa"><button class="btn" data-dealcancel>Abbrechen</button><button class="btn primary" data-dealsave="${esc(sh.id)}">Merken</button></div></div>`
          :`<button class="pccp add" data-dealadd="${esc(sh.id)}">+ Angebot merken</button>`}
        ${mine.length?`<div class="ssh" style="margin-top:20px">Auf deinem Zettel</div>${mine.map(({it,w})=>`<div class="pczr ${it.done?"done":""}"><span>${esc(it.n)}</span>${w.p!=null?`<b>${esc(eur(w.p))}</b>`:""}</div>`).join("")}`:""}
      </div><div>
        ${prices.length?`<div class="ssh">Deine Preise hier <span class="muted">· aus Quittungen</span></div>
          ${prices.map(x=>`<div class="pcpr"><span class="grow"><b>${esc(name(x.w))}</b>${x.best?`<small class="warn">bei ${esc((shopBy(x.best.s)||{name:x.best.s}).name)} ${esc(eur(x.best.p))}</small>`:x.cheapest?`<small class="pos">hier am günstigsten</small>`:""}</span><b>${esc(eur(x.e.p))}</b></div>`).join("")}`:""}
        <div class="ssh" ${prices.length?'style="margin-top:20px"':""}>Letzte Einkäufe</div>
        ${recent.length?`<div class="pcbars">${recent.slice().reverse().map(t=>`<div><span class="v">${esc(eur0(t.amount))}</span><i style="height:${Math.max(6,Math.round(t.amount/rmax*100))}%"></i><small>${esc(shortDate(t.date))}</small></div>`).join("")}</div>`
          :`<div class="small muted">Hier hast du in letzter Zeit nichts gekauft.</div>`}
      </div></div></div>`;
    const open=W.filter(x=>!x.it.done), done=W.filter(x=>x.it.done), groups={};
    for (const x of open){ const k=x.w?x.w.s:""; (groups[k]=groups[k]||[]).push(x); }
    const save=sum(open,x=>x.w&&x.w.save>0?x.w.save*zQ(x.it):0), est=sum(open,x=>x.w&&x.w.p?x.w.p*zQ(x.it):0);
    const opts=id=>`<option value="">automatisch</option>${ch.map(o=>`<option value="${o.id}" ${o.id===id?"selected":""}>${esc(o.name)}</option>`).join("")}`;
    const row=({it,w})=>{ const so=w&&shopBy(w.s);
      return `<div class="pczi ${it.done?"done":""}" data-pczi="${esc(it.id)}"><button class="cb" data-pczck="${esc(it.id)}" aria-label="${esc(it.n)} ${it.done?"wieder offen":"erledigt"}"></button><label class="pczq" title="Menge ändern"><input type="number" min="1" max="99" value="${zQ(it)}" data-pczq="${esc(it.id)}" aria-label="Menge ${esc(it.n)}"><span>x</span></label><span class="n">${esc(it.n)}</span>
        <button class="ws" data-zpick="${esc(it.id)}" title="Laden ändern" aria-label="Laden für ${esc(it.n)} wählen">${so?badge(so):`<span class="q">?</span>`}</button>
        <b class="p">${w&&w.p!=null?esc(eur(w.p*zQ(it))):""}</b>${it.done&&it.by&&zTrip()?zWho(it.by,18):""}${it.extra?`<span class="zdaz">DAZU</span>`:""}<button class="del" data-pczdel="${esc(it.id)}" aria-label="${esc(it.n)} löschen">×</button></div>`; };
    const tab=UI.pczTab||"zettel", nd=deals.length;
    const pickCard=`${web && K.pick?(K.pick.busy?`<div class="pcwpick busy"><i class="sp"></i><span>Text wird erkannt …</span></div>`:`<div class="pcwpick"><div class="ssh">Erkannt – stimmt das?</div>${K.pick.raw?`<div class="small muted pkraw">Gelesen: ${esc(K.pick.raw)}</div>`:""}<input class="in" id="pkN" value="${esc(K.pick.n||"")}" placeholder="Was?" aria-label="Was"><div class="pr2"><input class="in" id="pkP" inputmode="decimal" value="${K.pick.p!=null?esc(Number(K.pick.p).toFixed(2).replace(".",",")):""}" placeholder="Preis €" aria-label="Preis"><input class="in" type="date" id="pkU" value="${esc(K.pick.u||nextSat())}" aria-label="Bis wann"></div><div class="pa"><button class="btn" data-pkx>Verwerfen</button><button class="btn" data-pkok="deal">Als Angebot</button><button class="btn primary" data-pkok="zettel">Auf den Zettel</button></div></div>`):""}`;
    const tabs=`<div class="pcztabs" role="tablist">${[["zettel","Zettel"],["deals",`Angebote${nd?` (${nd})`:""}`],["buys","Einkäufe"]].map(([k,l])=>`<button role="tab" data-pcztab="${k}" class="${tab===k?"on":""}" aria-selected="${tab===k}">${l}</button>`).join("")}</div>`;
    const T=zTrip(), tripBox=T?(()=>{ const devs=T.devs||[], all=list();
        const part=d=>{ const mine=all.filter(it=>{ const s0=(where(it)||{}).s||""; return (T.assign||{})[s0]===d.id || (!(T.assign||{})[s0]) || it.by===d.id; }), dn=mine.filter(it=>it.done && (it.by===d.id || devs.length<=1)).length;
          return `<div class="pcztd">${zWho(d.id,20)}<b>${esc(zDevName(d.id))}</b><i class="pcztp"><i style="width:${mine.length?Math.round(dn/mine.length*100):0}%;background:${zDevCol(d.id)}"></i></i><small>${(T.fin||{})[d.id]?"fertig ✓":`${dn}/${mine.length}`}</small></div>`; };
        return `<div class="pcztrip"><div class="pczth"><b>🛒 Einkauf läuft …</b><button class="btn" data-pcztripx>Abbrechen</button></div>${devs.map(part).join("")}<div class="small muted">Was du jetzt dazuschreibst, erscheint auf dem Handy oben mit „NEU“.</div></div>`; })():"";
    const zBody=`${tripBox}<div class="pczact">${T?"":`<button class="btn primary" data-pczsend title="Der Zettel geht auf deine gekoppelten Handys – dort wird eingekauft">📱 Einkauf starten</button>`}<button class="btn" data-pczpdf title="Als PDF speichern">📄 PDF</button><button class="btn" data-pczprint title="Drucken">🖨 Drucken</button></div>
      <div class="pczadd"><input class="in" id="pczIn" placeholder="Was brauchst du?" autocomplete="off" aria-label="Was brauchst du?"><button class="btn primary" data-pczadd aria-label="Hinzufügen">+</button></div>
      <div class="pczl">${open.map(row).join("")||`<div class="small muted pcze">Schreib auf, was du brauchst – die App sagt dir, wo es am günstigsten ist.</div>`}${done.length?`<div class="pczdone">${done.map(row).join("")}</div>`:""}</div>
      ${Object.keys(groups).length?`<div class="pcroute"><div class="ssh">So kaufst du am günstigsten${save>0.004?` <span class="pos">· spart ca. ${esc(eur(save))}</span>`:""}</div>
        ${Object.entries(groups).sort((a,b)=>(a[0]==="")-(b[0]==="") || b[1].length-a[1].length).map(([k,xs])=>{ const so=shopBy(k);
          return `<button class="pcstop" ${so?`data-pcshop="${k}"`:""} style="--c:${so?so.color:"#9aa"}">${so?badge(so):`<span class="q">?</span>`}<span class="grow"><b>${so?esc(so.name):"Laden offen"}</b><small class="muted">${xs.map(x=>(zQ(x.it)>1?zQ(x.it)+"x ":"")+esc(x.it.n)).join(", ")}</small></span>${sum(xs,x=>(x.w&&x.w.p||0)*zQ(x.it))?`<b>${esc(eur(sum(xs,x=>(x.w&&x.w.p||0)*zQ(x.it))))}</b>`:""}</button>`; }).join("")}</div>`:""}
      ${done.length?`<button class="pczclr" data-pczclr>Erledigte löschen (${done.length})</button>`:""}
`;
    const dBody=`<div class="pcwdeal"><div class="ssh">Angebot merken <span class="muted">· ${esc(sh.name)}</span></div><div class="pccp form"><input class="in" id="pcpDT" placeholder="Was? z. B. ${sh.cat==="kleid"?"Pullover":sh.cat==="elek"?"Kopfhörer":sh.cat==="moebel"?"Regal":"Kaffee 500 g"}" aria-label="Was"><div class="pr2"><input class="in" id="pcpDP" inputmode="decimal" placeholder="Preis €" aria-label="Preis"><input class="in" type="date" id="pcpDU" value="${esc(nextSat())}" aria-label="Bis wann"></div><div class="pa"><button class="btn primary" data-pcpdeal>Merken</button></div></div></div>
      <div class="ssh" style="margin-top:16px">Gemerkt bei ${esc(sh.name)}</div>
      ${deals.map(d=>`<div class="pccp"><div class="grow"><b>${esc(d.text)}</b><small class="muted">${d.until?`bis ${esc(shortDate(d.until))}`:"ohne Datum"}</small></div>${d.price?`<b class="pp">${esc(eur(d.price))}</b>`:""}<button class="x" data-dealdel="${esc(d.id)}" aria-label="Angebot löschen">×</button></div>`).join("")||`<div class="small muted">Noch nichts gemerkt – pick ein Angebot im Prospekt oder trag es oben ein.</div>`}
      ${mine.length?`<div class="ssh" style="margin-top:16px">Auf deinem Zettel</div>${mine.map(({it,w})=>`<div class="pczr ${it.done?"done":""}"><span>${esc(it.n)}</span>${w.p!=null?`<b>${esc(eur(w.p))}</b>`:""}</div>`).join("")}`:""}
      ${prices.length?`<div class="ssh" style="margin-top:16px">Deine Preise hier <span class="muted">· aus Quittungen</span></div>
        ${prices.map(x=>`<div class="pcpr"><span class="grow"><b>${esc(name(x.w))}</b>${x.best?`<small class="warn">bei ${esc((shopBy(x.best.s)||{name:x.best.s}).name)} ${esc(eur(x.best.p))}</small>`:x.cheapest?`<small class="pos">hier am günstigsten</small>`:""}</span><b>${esc(eur(x.e.p))}</b></div>`).join("")}`:""}`;
    const bBody=`<div class="pczst">${badge(sh)}<span><b>${esc(sh.name)}</b><small class="muted">${st.count?`Ø ${esc(eur0(st.sum/6))} im Monat · ${st.count} Einkäufe in 6 Monaten${st.last?` · zuletzt am ${esc(shortDate(st.last))}`:""}`:"zuletzt nicht eingekauft"}</small></span></div>
      ${recent.length?`<div class="pcbars">${recent.slice().reverse().map(t=>`<div><span class="v">${esc(eur0(t.amount))}</span><i style="height:${Math.max(6,Math.round(t.amount/rmax*100))}%"></i><small>${esc(shortDate(t.date))}</small></div>`).join("")}</div>
        <div class="pczrl">${recent.map(t=>`<div class="pcpr"><span class="grow"><b>${esc(shortDate(t.date))}</b><small class="muted">${esc(t.cat||"")}${hasReceipt(t.id)?" · 📎 Bon":""}</small></span><b>${esc(eur(t.amount))}</b></div>`).join("")}</div>`
        :`<div class="small muted">Hier hast du in letzter Zeit nichts gekauft.</div>`}`;
    const zet=`<div class="card pcz">${pickCard}${tabs}<div class="pczh"><b>${tab==="zettel"?"Einkaufszettel":tab==="deals"?"Angebote":"Einkäufe"}</b><span class="small muted">${tab==="zettel"?`${open.length} offen${est?` · ca. ${esc(eur(est))}`:""}`:esc(sh.name)}</span></div>${tab==="zettel"?zBody:tab==="deals"?dBody:bBody}</div>`;
    root.classList.add("pcshop");
    const keep=document.activeElement && document.activeElement.id==="pczIn", val=keep?document.activeElement.value:"";
    const kept={}; ["pcpDT","pcpDP","pcpDU"].forEach(k=>{ const el=$(k); if (el) kept[k]=el.value; }); const fid=document.activeElement&&root.contains(document.activeElement)?document.activeElement.id:"";
    if (K.pg && root.contains(K.pg)) document.body.append(K.pg);
    root.innerHTML=left+det+zet;
    for (const k in kept){ const el=$(k); if (el && kept[k]) el.value=kept[k]; } if (fid && /^pcpD/.test(fid) && $(fid)) $(fid).focus();
    if (web){ $("pcsWeb").appendChild(K.pg); requestAnimationFrame(()=>K.place()); }
    if (canWeb && UI.view==="shop" && !root.hidden && document.visibilityState!=="hidden" && !(K.PG.open && K.PG.embed && K.PG.shop && K.PG.shop.id===sh.id))
      requestAnimationFrame(()=>{ if (UI.view==="shop" && !(K.PG.open && K.PG.shop && K.PG.shop.id===sh.id)) K.open(sh.url, sh); });
    if (keep){ const i=$("pczIn"); i.value=val; i.focus(); }
    const calm=pcCalm();
    requestAnimationFrame(()=>{ if (calm) { K.fresh=null; K.swap=false; return; }
      if (K.swap){ const d=root.querySelector(".pcsd"); d.animate([{opacity:0,transform:"translateY(10px) scale(.985)",filter:"blur(4px)"},{opacity:1,transform:"none",filter:"blur(0)"}],{duration:380,easing:E});
        const h=d.querySelector(".pcsdh .lg"); if (h) h.animate([{transform:"scale(.4) rotate(-20deg)"},{transform:"scale(1.1) rotate(4deg)",offset:.7},{transform:"none"}],{duration:560,easing:E});
        d.querySelectorAll(".pccp,.pcpr,.pczr").forEach((el,i)=>el.animate([{opacity:0,transform:"translateX(-10px)"},{opacity:1,transform:"none"}],{duration:320,delay:80+i*40,easing:E,fill:"backwards"}));
        d.querySelectorAll(".pcbars i").forEach((el,i)=>el.animate([{transform:"scaleY(0)"},{transform:"none"}],{duration:600,delay:150+i*60,easing:BO,fill:"backwards"})); }
      if (K.fresh){ const el=root.querySelector(`[data-pczi="${CSS.escape(K.fresh)}"]`); if (el) el.animate([{opacity:0,transform:"translateY(-16px) rotate(-2deg)"},{opacity:1,transform:"translateY(2px)",offset:.7},{opacity:1,transform:"none"}],{duration:420,easing:E}); }
      K.fresh=null; K.swap=false; });
  }
  renderShop = renderShopPC;
  rerenderShopPanel = renderShopPC;
  function enter(){ if (pcCalm() || !root.classList.contains("pcshop")) return;
    root.querySelectorAll(".pcsli,.pcsadd,.pcscats").forEach((el,i)=>el.animate([{opacity:0,transform:"translateX(-40px)"},{opacity:1,transform:"none"}],{duration:460,delay:i*45,easing:E,fill:"backwards"}));
    const d=root.querySelector(".pcsd"); if (d){ d.animate([{opacity:0,transform:"translateY(30px) scale(.97)"},{opacity:1,transform:"none"}],{duration:560,delay:120,easing:E,fill:"backwards"});
      d.querySelectorAll(".pcbars i").forEach((el,i)=>el.animate([{transform:"scaleY(0)"},{transform:"none"}],{duration:700,delay:450+i*70,easing:BO,fill:"backwards"})); }
    const z=root.querySelector(".pcz"); if (z){ z.animate([{opacity:0,transform:"translateX(60px) rotate(2deg)"},{opacity:1,transform:"none"}],{duration:560,delay:200,easing:E,fill:"backwards"});
      z.querySelectorAll(".pczi").forEach((el,i)=>el.animate([{opacity:0,clipPath:"inset(0 100% 0 0)"},{opacity:1,clipPath:"inset(0 0 0 0)"}],{duration:420,delay:450+i*60,easing:"ease-out",fill:"backwards"})); } }
  new MutationObserver(()=>{ if (!root.hidden){ requestAnimationFrame(enter); if (K.PG && !K.PG.open) renderShopPC(); } }).observe(root, {attributes:true, attributeFilter:["hidden"]});
  document.addEventListener("visibilitychange", ()=>{ if (document.visibilityState==="visible" && UI.view==="shop" && K.PG && !K.PG.open) renderShopPC(); });
  async function addItem(){ const i=$("pczIn"); const n=(i&&i.value||"").trim(); if (!n) return; const r=zAddTo(list(), {id:newId(), n:n.slice(0,60), done:false}); K.fresh=r.more?null:r.id; i.value=""; saveList(r.list); if (r.more) toast(`${n}: jetzt ${zQ(r.list.find(x=>x.id===r.id))}x`); }
  root.addEventListener("click", e=>{
    const c=e.target.closest("[data-pcscat]"); if (c){ UI.shopCat=c.dataset.pcscat; renderShopPC(); return; }
    const tb=e.target.closest("[data-pcztab]"); if (tb){ UI.pczTab=tb.dataset.pcztab; renderShopPC(); return; }
    if (e.target.closest("[data-pczsend]")){ zStartFromPC(); return; }
    if (e.target.closest("[data-pcztripx]")){ zEnd(); toast("Einkauf abgebrochen – der Zettel bleibt"); return; }
    if (e.target.closest("[data-pczpdf]")){ zPrint("pdf"); return; }
    if (e.target.closest("[data-pczprint]")){ zPrint("print"); return; }
    const s=e.target.closest("[data-pcshop]"); if (s){ if (K.pg && K.PG.open && K.PG.embed){ const o=shopBy(s.dataset.pcshop); if (o && o.id!==UI.shopSel) K.open(o.url, o); return; } if (UI.shopSel!==s.dataset.pcshop){ UI.shopSel=s.dataset.pcshop; UI.dealAdd=null; K.swap=true; renderShopPC(); } return; }
    if (e.target.closest("[data-pczadd]")){ addItem(); return; }
    const ck=e.target.closest("[data-pczck]"); if (ck){ const id=ck.dataset.pczck, row=ck.closest(".pczi");
      const go=()=>saveList(list().map(x=>x.id===id?(x.done?{...x, done:false, by:undefined}:{...x, done:true, by:devId()}):x));
      if (row && !pcCalm() && !row.classList.contains("done")){ row.classList.add("striking"); setTimeout(go, 420); } else go(); return; }
    const dl=e.target.closest("[data-pczdel]"); if (dl){ const id=dl.dataset.pczdel, row=dl.closest(".pczi"), old=list();
      const go=()=>{ saveList(old.filter(x=>x.id!==id)); toast("Gelöscht", ()=>saveList(old), "Rückgängig"); };
      if (row && !pcCalm()) row.animate([{opacity:1,transform:"none"},{opacity:0,transform:"translateX(60px)"}],{duration:240,easing:"ease-in"}).onfinish=go; else go(); return; }
    if (e.target.closest("[data-pczclr]")){ const old=list(), n=old.filter(x=>x.done).length; saveList(old.filter(x=>!x.done)); toast(`${n} erledigte gelöscht`, ()=>saveList(old), "Rückgängig"); return; }
  });
  function webDeal(){ const t=$("pcpDT"), wsh=(K.PG&&K.PG.shop)||shopBy(UI.shopSel); if (!t || !wsh) return; const text=(t.value||"").trim(), pr=parseAmt($("pcpDP").value||""), until=$("pcpDU").value||"";
    if (!text){ t.focus(); return; }
    const keep=(S.settings.deals||[]).filter(x=>!x.until || x.until>=isoOf(new Date(Date.now()-14*864e5)));
    S.settings.deals=[...keep, {id:newId(), shop:wsh.id, text:text.slice(0,60), price:pr>0?Math.round(pr*100)/100:null, until}];
    t.value=""; $("pcpDP").value=""; saveSettings(); toast("Angebot gemerkt"); }
  root.addEventListener("click", e=>{ if (e.target.closest("[data-pcpdeal]")) webDeal(); });
  root.addEventListener("keydown", e=>{ if (e.key==="Enter" && /^pcpD/.test(e.target.id||"")){ e.preventDefault(); webDeal(); } });
  root.addEventListener("change", e=>{ const s=e.target.closest("[data-pczshop]"); if (!s) return; const id=s.dataset.pczshop, v=s.value; saveList(list().map(x=>x.id===id?(v?{...x, s:v}:(({s:_,...r})=>r)(x)):x)); });
  root.addEventListener("keydown", e=>{ if (e.target.id==="pczIn" && e.key==="Enter"){ e.preventDefault(); addItem(); } });
  root.addEventListener("change", e=>{ const q=e.target.closest("[data-pczq]"); if (q) zSetQ(q.dataset.pczq, q.value); });
  root.addEventListener("focusin", e=>{ if (e.target.matches("[data-pczq]")) e.target.select(); });
  /* Webseite im Fenster */
  const NB=()=>window.AndroidBridge && window.AndroidBridge.pageOpen ? window.AndroidBridge : null;
  const PG={open:false, url:"", shop:null, st:{}, ro:null, embed:false}; let lastView=UI.view;
  const pg=document.createElement("div"); pg.id="pcPage"; pg.className="pcpage"; pg.hidden=true;
  pg.innerHTML=`<div class="pcpbar"><button data-pcpnav="back" title="Zurück" aria-label="Zurück">‹</button><button data-pcpnav="fwd" title="Vor" aria-label="Vor">›</button><button data-pcpnav="reload" class="rl" title="Neu laden" aria-label="Neu laden">⟳</button><button data-pcpnav="pick" class="wide pick" title="Angebot anklicken – es kommt auf den Einkaufszettel">🛒 Angebote picken</button>
    <div class="url" title="Gesperrt: hier geht nur diese eine Webseite"><span class="lk">🔒</span><span class="u"></span><small class="t"></small><em class="only"></em></div><button data-pcpnav="close" class="x" title="Schließen (Esc)" aria-label="Schließen">✕</button></div>
    <div class="pcphole" id="pcpHole"><div class="pcpload"><i></i><span>Seite wird geladen …</span></div></div>`;
  const side=document.createElement("aside"); side.id="pcpSide"; side.className="pcpside"; side.hidden=true;
  document.body.append(pg, side);
  const host=u=>{ try { return new URL(u).hostname.replace(/^www\./,""); } catch(_){ return ""; } };
  const shopOf=u=>{ const h=host(u); if (!h) return null; return SHOPS.find(sh=>sh.url===u) || SHOPS.find(sh=>{ const d=SHOP_DOMAINS[sh.id]||host(sh.url); return d && (h===d || h.endsWith("."+d)); }) || null; };
  const holeRect=()=>{ const r=$("pcpHole").getBoundingClientRect(); return {x:r.left, y:r.top, w:r.width, h:r.height}; };
  function bar(){ const st=PG.st||{}, u=st.url||PG.url;
    if (st.loading && pg.classList.contains("failed")){ pg.classList.remove("failed"); const l=pg.querySelector(".pcpload"); if (l) l.innerHTML=`<i></i><span>Seite wird geladen …</span>`; }
    pg.querySelector(".u").textContent=host(u)+(()=>{ try { const x=new URL(u); return (x.pathname+x.search).replace(/\/$/,""); } catch(_){ return ""; } })();
    pg.querySelector(".t").textContent=st.title||"";
    pg.querySelector(".only").textContent=(()=>{ const h=host(PG.url).split("."); return h.length>1?"nur "+h.slice(-2).join("."):""; })();
    pg.querySelector('[data-pcpnav="back"]').disabled=!st.back; pg.querySelector('[data-pcpnav="fwd"]').disabled=!st.fwd;
    pg.querySelector(".rl").classList.toggle("spin", !!st.loading); pg.classList.toggle("ready", st.loading===false); }
  window.hbPageState=st=>{ PG.st=st||{}; bar(); };
  window.hbPageError=msg=>{ const l=pg.querySelector(".pcpload"); if (!l) return; pg.classList.remove("ready"); pg.classList.add("failed");
    l.innerHTML=`<b>Die Seite lädt gerade nicht</b><span class="small muted">${esc(msg||"")}</span><button class="btn" data-pcpnav="reload">Noch einmal versuchen</button>`; };
  function sideHtml(){
    const sh=PG.shop; if (!sh) return "";
    const deals=shopDeals(sh.id), mine=list().map(it=>({it, w:where(it)})).filter(x=>x.w && x.w.s===sh.id);
    return `<div class="sh" style="--c:${sh.color}">${badge(sh)}<div><b>${esc(sh.name)}</b><small class="muted">Prospekt ist offen</small></div></div>
      <div class="ssh">Angebot aus dem Prospekt merken</div>
      <div class="pccp form"><input class="in" id="pcpDT" placeholder="Was? z. B. ${sh.cat==="kleid"?"Pullover":sh.cat==="elek"?"Kopfhörer":sh.cat==="moebel"?"Regal":"Kaffee 500 g"}" aria-label="Was"><div class="pr2"><input class="in" id="pcpDP" inputmode="decimal" placeholder="Preis €" aria-label="Preis"><input class="in" type="date" id="pcpDU" value="${esc(nextSat())}" aria-label="Bis wann"></div><div class="pa"><button class="btn primary" data-pcpdeal>Merken</button></div></div>
      <div class="ssh">Einkaufszettel <span class="muted">· für ${esc(sh.name)}</span></div>
      <div class="pczl">${mine.map(({it,w})=>`<div class="pczi ${it.done?"done":""}" data-pczi="${esc(it.id)}"><button class="cb" data-pczck="${esc(it.id)}" aria-label="${esc(it.n)}"></button><span class="n">${esc(it.n)}</span><b class="p">${w.p!=null?esc(eur(w.p)):""}</b><button class="del" data-pczdel="${esc(it.id)}" aria-label="${esc(it.n)} löschen">×</button></div>`).join("")}</div>
      <div class="pczadd"><input class="in" id="pcpZ" placeholder="Was brauchst du bei ${esc(sh.name)}?" autocomplete="off" aria-label="Was brauchst du?"><button class="btn primary" data-pcpzadd aria-label="Hinzufügen">+</button></div>
      <div class="ssh">Schon gemerkt bei ${esc(sh.name)}</div>
      ${deals.length?deals.map(d=>`<div class="pccp"><div class="grow"><b>${esc(d.text)}</b><small class="muted">${d.until?`bis ${esc(shortDate(d.until))}`:"ohne Datum"}</small></div>${d.price?`<b class="pp">${esc(eur(d.price))}</b>`:""}<button class="x" data-dealdel="${esc(d.id)}" aria-label="Angebot löschen">×</button></div>`).join(""):`<div class="small muted">Noch nichts gemerkt.</div>`}`;
  }
  function sideRender(){ if (!PG.open || !PG.shop) return; const a=document.activeElement, id=a&&side.contains(a)?a.id:"", v=id?a.value:"", keep={};
    ["pcpDT","pcpDP","pcpDU","pcpZ"].forEach(k=>{ const el=$(k); if (el) keep[k]=el.value; });
    side.innerHTML=sideHtml(); for (const k in keep){ const el=$(k); if (el) el.value=keep[k]; } if (id){ const el=$(id); if (el){ el.focus(); el.value=v; } } }
  const E2="cubic-bezier(.2,.8,.2,1)";
  function place(){ const b=NB(); if (b && PG.open) b.pageBounds(holeRect()); }
  function pageOpen(url, shop){
    if (!NB() && !window.pcPageDemo){ window.open(url, "_blank", "noopener"); return; }
    const sh=shop!==undefined?shop:shopOf(url), was=PG.open, wasEmbed=PG.embed;
    PG.url=url; PG.shop=sh; PG.st={url}; PG.open=true; bar(); pg.classList.remove("ready","withside"); side.hidden=true;
    const go=()=>{ const b=NB(); if (b) b.pageOpen(url, holeRect()); else if (window.pcPageDemo) window.pcPageDemo(url, holeRect()); };
    if (sh){
      PG.embed=true; pg.classList.add("embed"); pg.hidden=false; if (PG.pick && !wasEmbed) pickToggle(false); document.documentElement.classList.remove("pcpageon");
      UI.shopSel=sh.id; UI.dealAdd=null; if (!(S.settings.shops||[]).includes(sh.id)) UI.shopCat="";
      if (UI.view!=="shop"){ UI.view="shop"; lastView="shop"; render(); window.scrollTo({top:0}); } else renderShopPC();
      if (wasEmbed || pcCalm()){ requestAnimationFrame(go); if (wasEmbed && !pcCalm()) pg.querySelector(".pcphole").animate([{opacity:.3},{opacity:1}],{duration:300}); return; }
      const w=$("pcsWeb"); if (w) w.animate([{opacity:0,transform:"translateY(14px) scale(.98)",filter:"blur(3px)"},{opacity:1,transform:"none",filter:"blur(0)"}],{duration:340,easing:E2});
      setTimeout(go, 320); return;
    }
    if (PG.pick) pickToggle(false); PG.embed=false; pg.classList.remove("embed"); document.body.append(pg); pg.hidden=false; document.documentElement.classList.add("pcpageon");
    if (wasEmbed) renderShopPC();
    if (was || pcCalm()){ requestAnimationFrame(go); return; }
    pg.animate([{opacity:0,transform:"translateY(30px) scale(.97)"},{opacity:1,transform:"none"}],{duration:340,easing:E2});
    setTimeout(go, 330);
  }
  function pageClose(){ if (!PG.open) return; if (PG.pick) pickToggle(false); K.pick=null; PG.open=false; const b=NB(); if (b) b.pageNav("close"); else if (window.pcPageDemo) window.pcPageDemo(null);
    if (PG.embed){ PG.embed=false; pg.hidden=true; document.body.append(pg); pg.classList.remove("embed"); if (UI.view==="shop"){ K.swap=true; renderShopPC(); } return; }
    const done=()=>{ pg.hidden=true; side.hidden=true; side.innerHTML=""; document.documentElement.classList.remove("pcpageon"); };
    if (pcCalm()) return done();
    pg.animate([{opacity:1,transform:"none"},{opacity:0,transform:"translateY(24px) scale(.97)"}],{duration:240,easing:"ease-in"}).onfinish=done;
    if (!side.hidden) side.animate([{opacity:1,transform:"none"},{opacity:0,transform:"translateX(50px)"}],{duration:220,easing:"ease-in",fill:"forwards"}); }
  const PICK_SRC="(() => {\n  const W = window; if (W.__hbPick) return W.__hbPick;\n  const TOP = W === W.top;\n  const PR = /(\\d{1,4})\\s*[.,]\\s*(\\d{2})(?![\\d.]\\d|\\.(?!\\d)|\\d|\\s?(?:gbit|mbit|gb|tb|mb|mah|ghz|mhz|hz|zoll|cm|mm|kg|ml|kw|w|v|l|m|g)\\b|\\s?%)|[-–]\\s*[.,]\\s*(\\d{2})(?!\\d)|(\\d{1,4})\\s*[.,]\\s*[-–]/i;\n  const BAD = /^(uvp|statt|je |grundpreis|1 ?kg|100 ?g|1 ?l |\\d+ ?%|-?\\d+ ?%|ab |nur |aktion|angebot|knaller|neu|online|in den warenkorb|merken|details|zum angebot|mehr|versch\\.|verschiedene|auch |inkl|versand|lieferung|markt ausw|jetzt |spare |bewert|\\d+ bewertung)|:$/i;\n  const txt = (e) => (e && (e.innerText || e.textContent) || \"\").replace(/ /g, \" \").trim();\n  const PRG = new RegExp(PR.source, \"g\");\n  const UNIT = /(=|zzgl|pfand|uvp|statt|grundpreis|sparst|ersparnis|spare |rabatt|vorher|bisher|ursprüngl|\\bje\\b|\\(1|pro\\s|€\\s?\\/|\\/\\s?(kg|l|st|stk|stück|m|m²|qm|lfm|100 ?g|100 ?ml)\\b)/i;\n  const FILL = /\\b(aktion|knaller|angebot|angebote|preis|statt|uvp|nur|ab|je|neu|top|deal|super|sale|rabatt|bonus|coupon|app|payback|auch|alkoholfrei)\\b|€/gi;\n  const nameish = (t) => /[a-zäöüß]{4}/i.test(String(t).replace(PRG, \" \").replace(FILL, \" \"));\n  const fs = (e) => { try { return parseFloat(getComputedStyle(e).fontSize) || 0; } catch (x) { return 0; } };\n  const maxFs = (e) => { let m = fs(e); for (const k of e.querySelectorAll(\"*\")) m = Math.max(m, fs(k)); return m; };\n  function hasPrice(e) { return PR.test(txt(e)) || !!e.querySelector(\"[itemprop=price],[class*=price i],[class*=preis i],[data-price]\"); }\n  function valOf(e) {\n    const it = e.matches && e.matches(\"[itemprop=price]\") ? e : null; if (it) { const v = parseFloat(String(it.getAttribute(\"content\") || txt(it)).replace(\",\", \".\")); if (v > 0) return v; }\n    const t = txt(e).replace(/\\s+/g, \" \"); const m = price(t); if (m != null) return m;\n    const CENT = /(^|[-_\\s])(cents?|decimals?|fraction(al)?|nachkomma)([-_\\s]|$)/i;\n    const sup = [...e.querySelectorAll(\"*\")].find((k) => k.matches(\"sup,small\") || CENT.test(String(k.className || \"\")) || CENT.test(k.getAttribute(\"data-testid\") || \"\"));\n    if (sup && /^\\d{2}$/.test(txt(sup).replace(/[^\\d]/g, \"\"))) { const w = t.replace(txt(sup), \"\").replace(/[^\\d]/g, \"\"); if (w.length <= 4 && (w || /[-–.,]/.test(t))) return Number((w || \"0\") + \".\" + txt(sup).replace(/[^\\d]/g, \"\")); }\n    return null;\n  }\n  function cardPrice(c) {\n    const it = c.querySelector(\"[itemprop=price]\"); if (it) { const v = valOf(it); if (v) return v; }\n    const own = (p) => p ? [...p.childNodes].filter((n) => n.nodeType === 3).map((n) => n.nodeValue).join(\" \") : \"\";\n    const els = [c, ...c.querySelectorAll(\"*\")].filter((e) => { const t = txt(e); return t && t.length <= 24 && !UNIT.test(t) && !UNIT.test(own(e.parentElement)); });\n    let best = null;\n    const app = (e) => { for (let x = e, i = 0; x && x !== c && i < 3; i++, x = x.parentElement) if (/\\bapp\\b/i.test(txt(x)) && txt(x).length < 30) return true; return false; };\n    const struck = (e) => { for (let x = e, i = 0; x && i < 4; i++, x = x.parentElement) { if (x.matches(\"s,del,strike\")) return true; try { if (/line-through/.test(getComputedStyle(x).textDecorationLine)) return true; } catch (z) {} if (x === c) break; } return false; };\n    for (const e of els) { if (struck(e)) continue; const v = valOf(e); if (!(v > 0 && v < 100000)) continue; const f = maxFs(e), r = e.getBoundingClientRect(), a = app(e) ? 1 : 0;\n      if (!best || a < best.app || (a === best.app && (f > best.f + 0.5 || (Math.abs(f - best.f) <= 0.5 && r.width * r.height < best.a)))) best = { v, f, a: r.width * r.height, app: a }; }\n    if (best) return best.v;\n    const all = txt(c).split(/\\n+/).filter((l) => !UNIT.test(l)).join(\"\\n\"); return price(all);\n  }\n  function cardName(c) {\n    let best = null;\n    const clean = (t) => String(t || \"\").replace(/\\s+/g, \" \").trim().replace(/[:\\s,(*¹⁴⁵⁶⁷⁸⁹⁰†]+$/, \"\").replace(/^[^A-Za-zÄÖÜäöü0-9\"„]+/, \"\");\n    const ok = (t) => !(t.length < 3 || t.length > 90 || PR.test(t) || UNIT.test(t) || BAD.test(t) || /bewertung|rezension|sternen?\\b|bitte w(ä|ae)hle|entdecken|alle anzeigen|mehr erfahren|zum produkt/i.test(t) || !nameish(t));\n    const consider = (t, f) => { t = clean(t); if (!ok(t)) return; if (!best || f > best.f + 0.5) best = { t, f }; };\n    const all = [];\n    const tw = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);\n    for (let n = tw.nextNode(); n; n = tw.nextNode()) { const pe = n.parentElement; if (!pe) continue; const st = getComputedStyle(pe); if (st.display === \"none\" || st.visibility === \"hidden\") continue;\n      const pr = pe.getBoundingClientRect(); if (pr.width < 3 || pr.height < 3) continue;\n      const t = clean(n.nodeValue); if (!t) continue; all.push({ t, f: fs(pe) }); consider(t, fs(pe)); }\n    if (best && best.t.length <= 24) { const i = all.findIndex((a) => a.t === best.t && Math.abs(a.f - best.f) < 0.01), nx = all[i + 1];\n      if (nx && Math.abs(nx.f - best.f) <= 0.5 && ok(nx.t) && best.t.length + nx.t.length < 90) best = { t: best.t + \" \" + nx.t, f: best.f }; }\n    if (!best) { let e = c; for (let i = 0; e && i < 3 && !best; i++, e = e.parentElement) { const img = e.querySelector(\"img[alt]\"); if (img) consider(img.alt, 0); } }\n    return best ? best.t.replace(/\\s+,/g, \",\").replace(/(\\.\\.\\.|…)$/, \"\").trim() : \"\";\n  }\n  const alike = (a, b) => { if (a.tagName !== b.tagName) return false; const ca = String(a.className || \"\").split(/\\s+/).filter(Boolean), cb = String(b.className || \"\").split(/\\s+/).filter(Boolean);\n    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect(), sim = (x, y) => Math.abs(x - y) <= Math.max(x, y) * 0.3 + 2;\n    if ((ca.length || cb.length) && !ca.some((x) => cb.includes(x))) return false;\n    return sim(ra.height, rb.height) && (sim(ra.width, rb.width) || (Math.abs(ra.top - rb.top) < 12 && Math.abs(ra.left - rb.left) > 20)); };\n  const isList = (e) => { const ks = [...e.children].filter((k) => { const kt = txt(k); return kt.length > 12 && hasPrice(k) && nameish(kt); });\n    if (ks.length >= 3) return ks.filter((k) => k.querySelector(\"img,picture\")).length >= 3 || ks.some((k) => ks.some((o) => o !== k && alike(k, o)));\n    return ks.length === 2 && alike(ks[0], ks[1]) && ks.every((k) => k.querySelector(\"img,picture,canvas,svg\") || hasBg(k)); };\n  function whole(e) {\n    const vw = innerWidth * innerHeight;\n    while (e.parentElement && e.parentElement !== document.body && e.parentElement !== document.documentElement) {\n      const p = e.parentElement, r = p.getBoundingClientRect();\n      if (isList(p) || txt(p).length > 900 || r.width * r.height > vw * 0.6) break;\n      e = p;\n    }\n    return e;\n  }\n  const hasBg = (e) => { try { const b = getComputedStyle(e).backgroundImage; return b && b !== \"none\" && /url\\(/.test(b); } catch (x) { return false; } };\n  const pics = (e) => e.querySelectorAll(\"img,picture,canvas,svg image\").length + (hasBg(e) ? 1 : 0);\n  function imgBox(el) {\n    let e = el && el.nodeType === 1 ? el : el && el.parentElement;\n    for (let i = 0; e && i < 6 && !(e.matches(\"img,picture,canvas\") || hasBg(e)); i++) e = e.parentElement;\n    if (!e || e === document.body || e === document.documentElement) return null;\n    const vw = innerWidth * innerHeight, r0 = e.getBoundingClientRect(); if (r0.width < 60 || r0.height < 40 || r0.width * r0.height > vw * 0.7) return null;\n    while (e.parentElement && e.parentElement !== document.body && e.parentElement !== document.documentElement) {\n      const p = e.parentElement, r = p.getBoundingClientRect();\n      if (pics(p) > Math.max(1, pics(e)) || r.width * r.height > vw * 0.6 || txt(p).length > 300) break;\n      e = p;\n    }\n    return e;\n  }\n  function cand(el) {\n    let e = el && el.nodeType === 1 ? el : el && el.parentElement, priceOnly = null;\n    for (let i = 0; e && e !== document.body && e !== document.documentElement && i < 14; i++, e = e.parentElement) {\n      const t = txt(e); if (t.length > 900) break;\n      if (isList(e)) break;\n      if (!hasPrice(e)) continue;\n      const r = e.getBoundingClientRect(); if (r.width < 50 || r.height < 24) continue;\n      if (nameish(t)) return whole(e);\n      if (!priceOnly) priceOnly = e;\n    }\n    return priceOnly;\n  }\n  function price(t) { const m = String(t).match(PR); if (!m) return null; if (m[1]) return Number(m[1] + \".\" + m[2]); if (m[3]) return Number(\"0.\" + m[3]); if (m[4]) return Number(m[4]); return null; }\n  function read(c) {\n    const t = txt(c);\n    const u = t.match(/(?:bis|gültig bis)\\s*(?:[a-z]{2,10}\\.?,?\\s*)?(\\d{1,2})\\.(\\d{1,2})\\.?(\\d{2,4})?/i);\n    const r = c.getBoundingClientRect();\n    return { name: cardName(c).slice(0, 60), price: cardPrice(c), until: u ? { d: +u[1], m: +u[2], y: u[3] ? +u[3] : 0 } : null, rect: TOP ? { x: r.left, y: r.top, w: r.width, h: r.height } : null };\n  }\n  let hov = null, hovOld = \"\", mode = \"\", box = null, layer = null, sx = 0, sy = 0, skip = false;\n  const send = (o) => console.log(\"__HBPICK__\" + JSON.stringify(o));\n  function mark(c) { if (hov === c) return; if (hov) hov.style.cssText = hovOld; hov = c; if (c) { hovOld = c.style.cssText; c.style.setProperty(\"outline\", \"3px solid #1a7a5c\", \"important\"); c.style.setProperty(\"outline-offset\", \"2px\", \"important\"); c.style.setProperty(\"box-shadow\", \"0 10px 30px rgba(26,122,92,.35)\", \"important\"); } }\n  function over(e) { if (mode === \"pick\") mark(cand(e.target) || (TOP ? imgBox(e.target) : null)); }\n  function stop(e) { if (!mode) return; e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); }\n  function click(e) {\n    if (mode !== \"pick\") return; stop(e);\n    if (skip) { skip = false; return; }\n    const c = cand(e.target);\n    const photo = (b) => { mark(null); const r = b.getBoundingClientRect(); if (b.animate) b.animate([{ transform: \"scale(1)\" }, { transform: \"scale(.95)\" }, { transform: \"scale(1)\" }], { duration: 420 });\n      setTimeout(() => send({ lasso: { x: Math.max(0, r.left), y: Math.max(0, r.top), w: Math.min(r.width, innerWidth - Math.max(0, r.left)), h: Math.min(r.height, innerHeight - Math.max(0, r.top)) } }), 450); };\n    if (!c) { const b = TOP ? imgBox(e.target) : null; if (b) return photo(b); return send({ fail: true, why: \"nocard\", tag: e.target && e.target.tagName }); }\n    const r = read(c);\n    if (!r.price || !r.name) { const b = TOP ? (imgBox(e.target) || c) : null; if (b && !r.price) return photo(b); }\n    if (c.animate) c.animate([{ transform: \"scale(1)\" }, { transform: \"scale(.95)\" }, { transform: \"scale(1)\" }], { duration: 420 });\n    if (!r.price || !r.name) return send({ fail: true, why: \"noprice\", partial: r });\n    send(r);\n  }\n  function cursor(on) { document.documentElement.style.setProperty(\"cursor\", on ? \"copy\" : \"\", on ? \"important\" : \"\"); if (document.body) document.body.style.setProperty(\"cursor\", on ? \"copy\" : \"\", on ? \"important\" : \"\"); }\n  function lassoOn() {\n    if (!TOP || layer) return;\n    layer = document.createElement(\"div\");\n    layer.style.cssText = \"position:fixed;inset:0;z-index:2147483646;cursor:crosshair;background:rgba(194,124,14,.06)\";\n    const tip = document.createElement(\"div\"); tip.textContent = \"Zieh einen Rahmen um das Angebot\";\n    tip.style.cssText = \"position:fixed;left:50%;top:14px;transform:translateX(-50%);background:#c27c0e;color:#fff;font:700 14px system-ui,sans-serif;padding:8px 16px;border-radius:12px;pointer-events:none;box-shadow:0 6px 18px rgba(0,0,0,.2)\";\n    layer.appendChild(tip);\n    layer.addEventListener(\"pointerdown\", (e) => { e.preventDefault(); tip.style.display = \"none\"; sx = e.clientX; sy = e.clientY; box = document.createElement(\"div\");\n      box.style.cssText = \"position:fixed;z-index:2147483647;border:2.5px dashed #1a7a5c;background:rgba(26,122,92,.10);border-radius:10px;pointer-events:none\";\n      document.documentElement.appendChild(box); layer.setPointerCapture(e.pointerId); move(e); });\n    layer.addEventListener(\"pointermove\", move);\n    layer.addEventListener(\"pointerup\", (e) => { if (!box) return; const r = box.getBoundingClientRect(); box.remove(); box = null; skip = true; setTimeout(() => { skip = false; }, 400);\n      if (r.width < 20 || r.height < 14) return; set(\"pick\"); send({ lasso: { x: r.left, y: r.top, w: r.width, h: r.height } }); });\n    document.documentElement.appendChild(layer);\n  }\n  function move(e) { if (!box) return; const x = Math.min(sx, e.clientX), y = Math.min(sy, e.clientY); Object.assign(box.style, { left: x + \"px\", top: y + \"px\", width: Math.abs(e.clientX - sx) + \"px\", height: Math.abs(e.clientY - sy) + \"px\" }); }\n  function set(m) { mode = m; cursor(m === \"pick\"); if (m !== \"pick\") mark(null); if (m === \"lasso\") lassoOn(); else if (layer) { layer.remove(); layer = null; } }\n  [\"click\", \"auxclick\", \"dblclick\", \"contextmenu\"].forEach((t) => W.addEventListener(t, t === \"click\" ? click : stop, true));\n  W.addEventListener(\"mouseover\", over, true);\n  [\"pointerdown\", \"mousedown\", \"touchstart\"].forEach((t) => W.addEventListener(t, (e) => { if (mode === \"pick\") stop(e); }, { capture: true, passive: false }));\n  W.__hbPick = { set, test: { cand, read, imgBox } };\n  return W.__hbPick;\n})()";
  /* Angebot picken */
  PG.pick=false;
  function pickToggle(on){ const b=NB(); PG.pick=!!on && !!(b && b.pagePick); if (on && !PG.pick){ toast("Dafür braucht es die neue PC-App – kommt mit dem nächsten Update"); return; }
    if (b && b.pagePick) b.pagePick(PG.pick?"pick":"", PICK_SRC); pg.classList.toggle("picking", PG.pick); pg.classList.remove("lassoing");
    const pb=pg.querySelector(".pick"); if (pb){ pb.textContent=PG.pick?"✓ Picken an – Esc zum Beenden":"🛒 Angebote picken"; if (!pcCalm()) pb.animate([{transform:"scale(.9)"},{transform:"scale(1.06)"},{transform:"none"}],{duration:320}); }
    if (PG.pick) toast("Klick auf ein Angebot – es kommt auf den Einkaufszettel"); }
  function lassoStart(){ const b=NB(); if (!b || !b.pagePick){ toast("Dafür braucht es die neue PC-App – kommt mit dem nächsten Update"); return; }
    if (pg.classList.contains("lassoing")){ pickToggle(false); return; }
    PG.pick=true; b.pagePick("lasso", PICK_SRC); pg.classList.add("picking","lassoing"); const pb=pg.querySelector(".pick"); if (pb) pb.textContent="✓ Picken an – Esc zum Beenden";
    toast("Zieh einen Rahmen um das Angebot"); }
  window.hbPagePickOff=()=>pickToggle(false);
  const untilIso=u=>{ if (!u || !u.d || !u.m) return ""; const now=new Date(); let y=u.y?(u.y<100?2000+u.y:u.y):now.getFullYear(); if (!u.y && u.m<now.getMonth()+1-6) y++; return `${y}-${pad(u.m)}-${pad(u.d)}`; };
  function fly(text, r){ if (pcCalm()) return; const h=$("pcpHole"), z=$("pczIn"); if (!h || !z) return; const hr=h.getBoundingClientRect(), zr=z.getBoundingClientRect();
    const x0=Math.min(r?hr.left+r.x+r.w/2:hr.right-60, hr.right-40), y0=r?hr.top+r.y+r.h/2:hr.top+80, x1=zr.left+40, y1=zr.top+zr.height/2;
    const f=document.createElement("div"); f.className="pcfly2"; f.textContent=text; document.body.appendChild(f);
    f.animate([{left:x0+"px",top:y0+"px",transform:"translate(-50%,-50%) scale(1)",opacity:1},{left:(x0+x1)/2+"px",top:Math.min(y0,y1)-90+"px",transform:"translate(-50%,-50%) scale(.9) rotate(-6deg)",offset:.5},{left:x1+"px",top:y1+"px",transform:"translate(-50%,-50%) scale(.55)",opacity:.3}],{duration:850,easing:"cubic-bezier(.5,0,.3,1)",fill:"forwards"}).onfinish=()=>f.remove(); }
  function addPicked(n, p, until, rect, asDeal){
    if (!PG.shop) return; n=String(n||"").trim().slice(0,60); if (!n) return;
    if (asDeal){ const keep=(S.settings.deals||[]).filter(x=>!x.until || x.until>=isoOf(new Date(Date.now()-14*864e5)));
      S.settings.deals=[...keep, {id:newId(), shop:PG.shop.id, text:n, price:p>0?Math.round(p*100)/100:null, until:until||nextSat()}]; saveSettings(); toast(`Angebot gemerkt: ${n}`); return; }
    const id=newId(); K.fresh=id; fly(n+(p?" · "+eur(p):""), rect);
    setTimeout(()=>{ const before=list(), r=zAddTo(before, {id, n, done:false, s:PG.shop.id, ...(p>0?{p:Math.round(p*100)/100}:{}), ...(until?{u:until}:{})}); saveList(r.list); toast(r.more?`${n}: jetzt ${zQ(r.list.find(x=>x.id===r.id))}x auf dem Zettel`:`Auf dem Zettel: ${n}${p?" · "+eur(p):""}`, ()=>saveList(before), "Rückgängig"); }, pcCalm()?0:700); }
  function readOcr(lines){
    const L=(lines||[]).map(l=>({t:String(l.t||"").replace(/[¹²³⁴⁵⁶⁷⁸⁹⁰*]+/g,"").trim(), h:+l.h||0, w:!!l.w})).filter(l=>l.t), all=L.map(l=>l.t).join("\n");
    const shopN=PG.shop?nrm(PG.shop.name):"";
    const BAD=/^(uvp|statt|je|grundpreis|ab|nur|aktion|angebot|angebote|preis|kg|1 ?kg|1 ?l|100 ?g|\d+ ?%|wochen|deal|knaller|kauf \d|super|top|neu|sale|tipp)\b/i;
    const pr=t=>{ let m=t.match(/(\d{1,4})\s*[.,]\s*(\d{2})(?!\d)/); if (m) return +(m[1]+"."+m[2]); m=t.match(/[-–]\s*[.,]\s*(\d{2})(?!\d)/); if (m) return +("0."+m[1]); m=t.match(/(\d{1,4})\s*[.,]\s*[-–]/); if (m) return +m[1];
      m=t.replace(/\s+/g," ").match(/^\D{0,3}(\d{1,3})\s(\d{2})\D{0,3}$/); if (m) return +(m[1]+"."+m[2]); return null; };
    const prW=t=>{ const v=pr(t); if (v!=null) return v; const m=t.replace(/[oO]/g,"0").match(/^\D{0,2}(\d{3,4})\D{0,8}$/); return m ? +m[1]/100 : null; };
    const UNIT=/(=|zzgl|pfand|uvp|statt|grundpreis|\(1|je\s*\d|\bkg\b|\bl\b|100\s*g|%)/i;
    let cands=L.map((l,i)=>({v:l.w?prW(l.t):pr(l.t), h:l.h, i, t:l.t, w:l.w})).filter(x=>x.v>0 && x.v<10000 && !UNIT.test(x.t));
    const mh=Math.max(0,...cands.map(x=>x.h)), big=cands.filter(x=>!mh || x.h>=mh*0.6), pick=(big.length?big:cands).slice(-1)[0];
    const price=pick?pick.v:null;
    const clean=t=>t.replace(/^[^A-Za-zÄÖÜäöü0-9]+/,"").replace(/[\s,(.…]+$/,"").trim();
    const noShop=t=>shopN ? t.replace(new RegExp("^"+shopN.replace(/[^a-z0-9]/g,"")+"[\\s.…:-]*","i"),"") : t;
    const names=L.map((l,i)=>({t:clean(noShop(clean(l.t))), h:l.h, i, raw:noShop(l.t), w:l.w})).filter(l=>!l.w && /[a-zäöüß]{3}/.test(l.raw) && pr(l.raw)==null && !BAD.test(l.raw) && !/^(bis|gültig)/i.test(l.raw) && !UNIT.test(l.raw) && l.t.length>=4
     );
    const top=names.slice().sort((a,b)=>(b.h-a.h)||(b.t.length-a.t.length))[0];
    const name=top?[top.t]:[]; if (top && top.h){ const nx=names.find(l=>l.i===top.i+1 && Math.abs(l.h-top.h)<=top.h*0.15); if (nx) name.push(nx.t); }
    const u=all.match(/bis\s*(?:[a-z]{2,10}\.?,?\s*)?(\d{1,2})\.(\d{1,2})\.?(\d{2,4})?/i);
    return {n:name.join(" ").replace(/\s+/g," ").slice(0,60), p:price, u:u?untilIso({d:+u[1],m:+u[2],y:u[3]?+u[3]:0}):""}; }
  window.hbPagePick=async res=>{
    if (!res || !PG.open) return;
    if (res.fail && res.partial && (res.partial.name || res.partial.price)){ K.pick={n:res.partial.name||"", p:res.partial.price||null, u:untilIso(res.partial.until), rect:res.partial.rect}; renderShopPC(); const el=$(K.pick.n?"pkP":"pkN"); if (el) el.focus(); toast("Nicht alles erkannt – bitte kurz ergänzen"); return; }
    if (res.fail){ if (res.lassoFailed){ toast("Das hat nicht geklappt – bitte noch einmal"); return; }
      toast("Hier ist kein Angebot zu erkennen – klick direkt auf den Kasten des Angebots"); return; }
    if (res.reading){ pg.classList.remove("lassoing"); const pb=pg.querySelector(".pick"); if (pb) pb.textContent="✓ Picken an – Esc zum Beenden"; K.pick={busy:true}; renderShopPC(); return; }
    if (res.img){ pg.classList.remove("lassoing"); const pb=pg.querySelector(".pick"); if (pb) pb.textContent="✓ Picken an – Esc zum Beenden";
      K.pick={busy:true}; renderShopPC();
      try { let lines=Array.isArray(res.lines)&&res.lines.length?res.lines:null;
        if (!lines){ await loadTesseract(); const r=await window.Tesseract.recognize(res.img, "deu"); lines=((r.data&&r.data.lines)||[]).map(l=>({t:l.text.trim(), h:l.bbox?l.bbox.y1-l.bbox.y0:0})); }
        K.pick=readOcr(lines); K.pick.raw=lines.map(l=>l.t).join(" · ").slice(0,160); if (!lines.length) K.pick.raw="(kein Text erkannt)"+(res.ocrErr?" – "+res.ocrErr:"");
        for (const t of (res.badges||[])){ const c=String(t).replace(/[oO]/g,"0").replace(/\s+/g,""), m=c.match(/(\d{1,4})[.,](\d{2})/)||c.match(/^\D*(\d{1,3})(\d{2})\D*$/);
          if (m){ K.pick.p=+(m[1]+"."+m[2]); K.pick.raw="Preis-Kreis: "+m[1]+","+m[2]+" · "+K.pick.raw; break; } } }
      catch(e){ K.pick={n:"", p:null, u:"", raw:"(Texterkennung nicht erreichbar"+(res.ocrErr?" – "+res.ocrErr:"")+")"}; toast("Texterkennung ging nicht – bitte selbst eintragen"); }
      K.pick.rect=res.rect; renderShopPC(); const el=$(K.pick.n?"pkP":"pkN"); if (el) el.focus(); return; }
    if (res.name) addPicked(res.name, res.price, untilIso(res.until), res.rect);
  };
  root.addEventListener("click", e=>{
    if (e.target.closest("[data-pkx]")){ K.pick=null; renderShopPC(); return; }
    const ok=e.target.closest("[data-pkok]"); if (ok && K.pick){ const n=($("pkN").value||"").trim(), p=parseAmt($("pkP").value||""), u=$("pkU").value||"", r=K.pick.rect;
      if (!n){ $("pkN").focus(); return; } K.pick=null; renderShopPC(); addPicked(n, p>0?p:null, u, r, ok.dataset.pkok==="deal"); }
  });
  root.addEventListener("keydown", e=>{ if (e.key==="Enter" && /^pk[NPU]$/.test(e.target.id||"")){ e.preventDefault(); const b=root.querySelector('[data-pkok="zettel"]'); if (b) b.click(); } });
  K.PG=PG; K.pg=pg; K.place=place; K.open=pageOpen;
  try { const b=NB(); if (b) b.pageNav("close"); } catch(_){}
  window.hbPageRequest=url=>pageOpen(url);
  window.hbPageBlocked=()=>{ toast("Andere Webseiten sind hier gesperrt"); const u=pg.querySelector(".url"); if (u && !pcCalm()) u.animate([{transform:"none"},{transform:"translateX(-6px)"},{transform:"translateX(6px)"},{transform:"translateX(-3px)"},{transform:"none"}],{duration:320}); };
  window.hbPageClose=pageClose;
  openPage=url=>pageOpen(url);
  pg.addEventListener("click", e=>{ const n=e.target.closest("[data-pcpnav]"); if (!n) return; const c=n.dataset.pcpnav;
    if (c==="close") return pageClose(); if (c==="pick") return pickToggle(!PG.pick); if (c==="lasso") return lassoStart(); const b=NB(); if (b) b.pageNav(c); });
  side.addEventListener("click", e=>{
    if (e.target.closest("[data-pcpdeal]")){ const text=($("pcpDT").value||"").trim(), pr=parseAmt($("pcpDP").value||""), until=$("pcpDU").value||"";
      if (!text){ $("pcpDT").focus(); return; }
      const keep=(S.settings.deals||[]).filter(x=>!x.until || x.until>=isoOf(new Date(Date.now()-14*864e5)));
      S.settings.deals=[...keep, {id:newId(), shop:PG.shop.id, text:text.slice(0,60), price:pr>0?Math.round(pr*100)/100:null, until}];
      $("pcpDT").value=""; $("pcpDP").value=""; saveSettings(); sideRender(); toast("Angebot gemerkt"); return; }
    if (e.target.closest("[data-pcpzadd]")) return sideAdd();
    const ck=e.target.closest("[data-pczck]"); if (ck){ const id=ck.dataset.pczck; saveList(list().map(x=>x.id===id?{...x, done:!x.done}:x)); return; }
    const dl=e.target.closest("[data-pczdel]"); if (dl){ const id=dl.dataset.pczdel, old=list(); saveList(old.filter(x=>x.id!==id)); toast("Gelöscht", ()=>saveList(old), "Rückgängig"); return; }
  });
  function sideAdd(){ const i=$("pcpZ"), n=(i&&i.value||"").trim(); if (!n) return; i.value=""; saveList(zAddTo(list(), {id:newId(), n:n.slice(0,60), done:false, s:PG.shop.id}).list); }
  side.addEventListener("keydown", e=>{ if (e.key==="Enter"){ if (e.target.id==="pcpZ"){ e.preventDefault(); sideAdd(); } else if (/^pcpD/.test(e.target.id)){ e.preventDefault(); side.querySelector("[data-pcpdeal]").click(); } } });
  document.addEventListener("keydown", e=>{ if (e.key==="Escape" && PG.open && !document.querySelector(".backdrop.show:not([hidden])")){ e.preventDefault(); if (PG.pick) pickToggle(false); else if (!PG.embed) pageClose(); } });
  addEventListener("resize", ()=>place());
  new ResizeObserver(()=>place()).observe($("pcpHole"));
  new MutationObserver(()=>{ const b=NB(); if (!b || !PG.open) return; b.pageShow(!document.querySelector(".backdrop.show:not([hidden]),#pcFbBg:not([hidden])")); }).observe(document.body, {subtree:true, attributes:true, attributeFilter:["class","hidden"]});
  const _r6=render; render=(...a)=>{ const x=_r6(...a); if (PG.open){ if (UI.view!==lastView) pageClose(); else if (!PG.embed) sideRender(); } lastView=UI.view; return x; };
}
/* Analyse */
/* Hover */
const TT=o=>` data-tt="${esc(JSON.stringify(o))}"`;
if (IS_PC){
  const box=document.createElement("div"); box.id="pctt"; box.setAttribute("role","tooltip"); document.body.appendChild(box);
  let cur=null;
  const hide=()=>{ cur=null; box.classList.remove("on"); };
  document.addEventListener("mouseover",e=>{
    const g=e.target.closest&&e.target.closest("[data-tt]"); if (!g){ if (cur) hide(); return; }
    if (g===cur) return; cur=g; let o; try{ o=JSON.parse(g.dataset.tt); }catch(_){ return hide(); }
    box.style.setProperty("--ttc",o.c||"var(--accent)");
    box.innerHTML=`<div class="h">${esc(o.h||"")}</div>${(o.r||[]).map(r=>`<div class="r${r[3]?" m":""}"><i style="background:${r[2]||"var(--accent)"}"></i><span>${esc(r[0])}</span><b>${esc(r[1])}</b></div>`).join("")}${o.f?`<div class="f" style="color:${o.fc||"var(--fg)"}">${esc(o.f)}</div>`:""}`;
    const marks=[...g.querySelectorAll("circle,.b")], rs=(marks.length?marks:[g]).map(m=>m.getBoundingClientRect()), gr=g.getBoundingClientRect();
    const cx=marks.length?(Math.min(...rs.map(r=>r.left))+Math.max(...rs.map(r=>r.right)))/2:gr.left+gr.width/2, top=Math.min(...rs.map(r=>r.top));
    box.classList.add("on"); const bw=box.offsetWidth, bh=box.offsetHeight;
    let x=Math.max(8,Math.min(innerWidth-bw-8,cx-bw/2)), y=top-bh-12, below=false;
    if (y<8){ y=Math.max(...rs.map(r=>r.bottom))+12; below=true; }
    box.classList.toggle("below",below); box.style.left=x+"px"; box.style.top=y+"px"; box.style.setProperty("--ax",Math.max(14,Math.min(bw-14,cx-x))+"px");
  });
  addEventListener("scroll",hide,true); addEventListener("blur",hide);
  document.addEventListener("click",()=>setTimeout(hide,0));
}
if (IS_PC){
  const sg=v=>(v>=0?"+ ":"− ")+eur0(Math.abs(v));
  const netBars=(pts,onIdx)=>{ const W=520,H=118,n=pts.length,bw=W/n, vals=pts.filter(p=>!p.fut).map(p=>Math.abs(p.v)), mx=Math.max(1,...vals), mid=H/2;
    let s=`<svg class="pcab" viewBox="0 0 ${W} ${H+24}" role="img" aria-label="Übrig pro Monat"><line x1="0" x2="${W}" y1="${mid}" y2="${mid}" stroke="var(--line)" stroke-dasharray="4 5"/>`;
    pts.forEach((p,i)=>{ const h=p.fut?0:Math.max(3,Math.abs(p.v)/mx*(mid-6)), x=i*bw+bw*.22, w=bw*.56, y=p.v>=0?mid-h:mid, on=i===onIdx;
      const c=p.v>=0?"var(--good)":"var(--bad)";
      s+=`<g class="pcabg" data-pcaym="${p.ym}" style="--i:${i}"><rect x="${i*bw}" y="0" width="${bw}" height="${H+24}" fill="transparent"/>${p.fut?"":`<rect class="b" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="${Math.min(7,w/3).toFixed(1)}" fill="${c}" opacity="${on?1:.38}"/>`}
        <text x="${(x+w/2).toFixed(1)}" y="${H+18}" text-anchor="middle" font-size="13" font-weight="${on?800:500}" fill="${on?"var(--fg)":"var(--muted)"}">${esc(p.l)}</text></g>`.replace('<g class="pcabg"', `<g class="pcabg"${TT({h:p.t+" "+p.ym.slice(0,4), c:p.fut?"var(--line)":c, r:[[p.v>=0?"Übrig":"Mehr ausgegeben", p.fut?"–":sg(p.v), c]]})}`); });
    return s+`</svg>`; };
  const yearBars=(rows,ym)=>{ const W=520,H=124,cw=W/12, mx=Math.max(1,...rows.map(r=>Math.max(r.c.income,r.c.expenses)));
    let s=`<svg class="pcab" viewBox="0 0 ${W} ${H+22}" role="img" aria-label="Einnahmen und Ausgaben pro Monat">`;
    rows.forEach((r,i)=>{ const x=i*cw, on=r.ym===ym, hi=r.c.income/mx*(H-4), he=r.c.expenses/mx*(H-4), bw=Math.min(10,cw*.3);
      s+=`<g class="pcabg" data-pcaym="${r.ym}" style="--i:${i}">${on?`<rect x="${x+2}" y="0" width="${cw-4}" height="${H}" rx="9" fill="var(--accent-soft)"/>`:`<rect x="${x}" y="0" width="${cw}" height="${H+22}" fill="transparent"/>`}
        <rect class="b" x="${(x+cw/2-bw-1.5).toFixed(1)}" y="${(H-hi).toFixed(1)}" width="${bw}" height="${hi.toFixed(1)}" rx="3" fill="var(--good)"/><rect class="b" x="${(x+cw/2+1.5).toFixed(1)}" y="${(H-he).toFixed(1)}" width="${bw}" height="${he.toFixed(1)}" rx="3" fill="var(--bad)" opacity=".55"/>
        <text x="${(x+cw/2).toFixed(1)}" y="${H+17}" text-anchor="middle" font-size="12" font-weight="${on?800:500}" fill="${on?"var(--fg)":"var(--muted)"}">${esc(MSHORT[i].slice(0,1))}</text></g>`.replace('<g class="pcabg"', `<g class="pcabg"${TT({h:MONTHS[i]+" "+r.ym.slice(0,4), c:"var(--accent)", r:[["Einnahmen",eur0(r.c.income),"var(--good)"],["Ausgaben",eur0(r.c.expenses),"var(--bad)"]], f:(r.c.income-r.c.expenses>=0?"Übrig ":"Mehr ausgegeben ")+eur0(Math.abs(r.c.income-r.c.expenses)), fc:r.c.income-r.c.expenses>=0?"var(--good)":"var(--bad)"})}`); });
    return s+`</svg>`; };
  const _ath=anaTabsHtml;
  const _ry=renderYear; renderYear=function(...a){ UI.anaMode="m"; return _ry(...a); };
  anaTabsHtml = function(a){
    const {tiles, GRP, TL, ord, rows, ym, mc, y, inc, exp}=a;
    const mode="m", cur=ymOf(new Date()), [, mi]=ymParts(ym), mn=MONTHS[mi-1];
    const g3=GRP[2]||["Steuer",[]], g3n=/steuer/i.test(g3[0]) ? "Steuer" : String(g3[0]).replace(/&amp;/g,"&").split(/[ &]/)[0];
    const row=t=>`<button class="arw" data-anaopen="${t.k}" style="--tc:${userCol("ana",t.k)||themeCol(TL[t.k][1], ord.indexOf(t.k))}"><span class="ai">${ic(t.icon,18)}</span><span class="an"><b>${t.k==="wk"&&!hasJob()?"Steuererklärung":t.k==="fix"?"Fixkosten geplant":TL[t.k][0]}</b><small>${t.sub||""}</small></span><span class="av">${esc(t.short||"")}<span class="ch">›</span></span></button>`;
    const skip=t=>t.k==="tax"||(t.k==="goal"&&/noch kein/i.test(String(t.sub||"").replace(/<[^>]+>/g,"")));
    for (const t of tiles) if (t.k==="calc"){ const m=String(t.sub||"").match(/^Stand heute (.+?) · frei (.+)$/); if (m && m[1]===m[2]){ t.sub="Stand heute "+m[1]; t.short=String(t.short||"").replace(/^frei\s+/,""); } }
    const rowsFor=ks=>{ const ts=tiles.filter(t=>ks.includes(t.k)&&!skip(t)).sort((p,q)=>ks.indexOf(p.k)-ks.indexOf(q.k)); return ts.length?`<div class="card pcarl"><div class="arl">${ts.map(row).join("")}</div></div>`:""; };
    const M=true, net=mc.net, expn=mc.expenses;
    const pts=Array.from({length:6},(_,k)=>{ const m=shiftYm(ym,k-5); return {ym:m, l:MSHORT[ymParts(m)[1]-1], t:MONTHS[ymParts(m)[1]-1], v:monthCalc(m).net}; });
    const hist=Array.from({length:12},(_,k)=>{ const m=shiftYm(ym,k-11), c=monthCalc(m); return {ym:m, i:ymParts(m)[1], v:c.expenses, has:c.tx.length>0||c.expenses>0}; });
    const withData=hist.filter(h=>h.has), avg=withData.length?sum(withData,h=>h.v)/withData.length:0;
    const line=(()=>{ const W=520,H=140, n=hist.length, mx=Math.max(1,...hist.map(h=>h.v), avg)*1.08, X=i=>10+i*(W-20)/(n-1), Y=v=>H-v/mx*(H-8);
      const pts2=hist.map((h,i)=>h.has?[X(i),Y(h.v)]:null);
      let d="", on=false; pts2.forEach(p=>{ if (!p){ on=false; return; } d+=(on?"L":"M")+p[0].toFixed(1)+" "+p[1].toFixed(1)+" "; on=true; });
      return `<svg class="pcab" viewBox="0 0 ${W} ${H+22}" role="img" aria-label="Ausgaben der letzten 12 Monate">${avg?`<line x1="0" x2="${W}" y1="${Y(avg).toFixed(1)}" y2="${Y(avg).toFixed(1)}" stroke="var(--faint)" stroke-dasharray="4 5"/><text x="${W-2}" y="${(Y(avg)-6).toFixed(1)}" text-anchor="end" font-size="11" fill="var(--muted)">Ø ${esc(eur0(avg))}</text>`:""}
        <path d="${d}" fill="none" stroke="var(--bad)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" class="pcaln"/>
        ${hist.map((h,i)=>`<g class="pcabg" data-pcaym="${h.ym}"><rect x="${(X(i)-(W-20)/(n-1)/2).toFixed(1)}" y="0" width="${((W-20)/(n-1)).toFixed(1)}" height="${H+22}" fill="transparent"/>${h.has?`<circle cx="${X(i).toFixed(1)}" cy="${Y(h.v).toFixed(1)}" r="${h.ym===ym?6:3.5}" fill="var(--bad)"/>`:""}<text x="${X(i).toFixed(1)}" y="${H+17}" text-anchor="middle" font-size="11" font-weight="${h.ym===ym?800:500}" fill="${h.ym===ym?"var(--fg)":"var(--muted)"}">${esc(MSHORT[h.i-1].slice(0,1))}</text></g>`.replace('<g class="pcabg"', `<g class="pcabg"${(()=>{ const pp=avg&&h.has?Math.round((h.v-avg)/avg*100):null; return TT({h:MONTHS[h.i-1]+" "+h.ym.slice(0,4), c:"var(--bad)", r:[["Ausgaben",h.has?eur0(h.v):"–","var(--bad)"],...(avg?[["Ø",eur0(avg),"var(--faint)",1]]:[])], f:pp==null?"":pp===0?"genau im Ø":(pp>0?"+":"−")+Math.abs(pp)+" % "+(pp>0?"über":"unter")+" Ø", fc:pp>0?"var(--bad)":"var(--good)"}); })()}`)).join("")}</svg>`; })();
    const isCur=ym===cur, past=withData.filter(h=>h.ym!==ym), avgP=past.length?sum(past,h=>h.v)/past.length:0, frac=isCur?Math.min(1,new Date().getDate()/daysIn(ym)):1;
    const dAvg=avgP&&(!isCur||new Date().getDate()>=3)?Math.round((expn-avgP*frac)/(avgP*frac)*100):null;
    const chip=(p,inv)=>p==null?"":`<span class="pcachg ${(inv?-p:p)>0?"up":"dn"}">${p>0?"+":p<0?"−":"±"}${Math.abs(p)} %</span>`;
    const col1=`<div class="pcac"><div class="pcah"><h2>Verlauf</h2><span>letzte 12 Monate</span></div>
      <div class="card pcabig" data-anaopen="trend"><small>Ausgaben im ${esc(mn)}</small><div style="display:flex;align-items:baseline;gap:10px"><div class="pcan">${esc(eur0(expn))}</div>${dAvg!=null?chip(dAvg)+`<span class="pcas" style="margin:0">${isCur?"zum Ø bis heute":"zum Ø"}</span>`:""}</div>${line}</div>
      <div class="card pcabig" data-anaopen="kpi"><small>${net>=0?"Übrig":"Mehr ausgegeben"} pro Monat</small>${netBars(pts,5)}</div></div>`;
    const prevM=Array.from({length:6},(_,k)=>monthCalc(shiftYm(ym,-(k+1)))).filter(c=>c.tx.length||c.expenses>0), avgOf={};
    for (const c of prevM) for (const [n,v] of catTotals(c.tx, c.fixPaid)) avgOf[n]=(avgOf[n]||0)+v/prevM.length;
    const ct=catTotals(mc.tx, mc.fixPaid).slice(0,6);
    const catRows=ct.map(([c,v])=>{ const a0=avgOf[c]||0, p=a0>0?Math.round((v-a0)/a0*100):null;
      return `<button class="pcacat" data-anaopen="cat" style="--tc:${catColor("ausgabe",c)}"><span class="ai">${esc(String(c).trim().slice(0,1).toUpperCase())}</span><span class="an"><span class="t"><b>${esc(c)}</b></span><small class="muted">${a0>0?`Ø ${esc(eur0(a0))} im Monat`:"vorher nichts"}</small></span>${p==null?`<span class="pcachg nw">neu</span>`:chip(p)}<em class="pcav">${esc(eur0(v))}</em></button>`; }).join("");
    const lastY=Array.from({length:12},(_,i)=>monthCalc(`${y-1}-${String(i+1).padStart(2,"0")}`).expenses), hasLast=lastY.some(v=>v>0);
    const cmp=(()=>{ const W=520,H=120,cw=W/12, mx=Math.max(1,...lastY,...rows.map(r=>r.c.expenses));
      return `<svg class="pcab" viewBox="0 0 ${W} ${H+22}" role="img" aria-label="${y} gegen ${y-1}">${rows.map((r,i)=>{ const x=i*cw, hb=lastY[i]/mx*(H-4), ha=r.ym>cur?0:r.c.expenses/mx*(H-4);
        return `<g class="pcabg" data-pcaym="${r.ym}" style="--i:${i}"><rect x="${x}" y="0" width="${cw}" height="${H+22}" fill="transparent"/><rect class="b" x="${(x+cw/2-10).toFixed(1)}" y="${(H-hb).toFixed(1)}" width="9" height="${hb.toFixed(1)}" rx="3" fill="var(--faint)" opacity=".55"/>${ha?`<rect class="b" x="${(x+cw/2+1).toFixed(1)}" y="${(H-ha).toFixed(1)}" width="9" height="${ha.toFixed(1)}" rx="3" fill="var(--bad)"/>`:""}
          <text x="${(x+cw/2).toFixed(1)}" y="${H+17}" text-anchor="middle" font-size="11" font-weight="${r.ym===ym?800:500}" fill="${r.ym===ym?"var(--fg)":"var(--muted)"}">${esc(MSHORT[i].slice(0,1))}</text></g>`.replace('<g class="pcabg"', `<g class="pcabg"${(()=>{ const fut=r.ym>cur, pp=!fut&&lastY[i]>0?Math.round((r.c.expenses-lastY[i])/lastY[i]*100):null; return TT({h:MONTHS[i], c:"var(--bad)", r:[[String(y),fut?"–":eur0(r.c.expenses),"var(--bad)"],[String(y-1),eur0(lastY[i]),"var(--faint)",1]], f:pp==null?"":pp===0?"gleich wie "+(y-1):(pp>0?"+":"−")+Math.abs(pp)+" % zu "+(y-1), fc:pp>0?"var(--bad)":"var(--good)"}); })()}`); }).join("")}</svg>`; })();
    const ytd=sum(rows.filter(r=>r.ym<=ym),r=>r.c.expenses), ytdL=sum(lastY.slice(0,mi),v=>v), dY=ytdL>0?Math.round((ytd-ytdL)/ytdL*100):null;
    const col2=`<div class="pcac"><div class="pcah"><h2>Kategorien im Vergleich</h2></div>
      ${ct.length?`<div class="card pcarl"><div class="pcach"><b>${esc(mn)} gegen deinen Schnitt</b><button data-anaopen="cat">Alle ›</button></div>${catRows}</div>`:`<div class="card pcarl muted pcaempty">Im ${esc(mn)} ist noch nichts gebucht.</div>`}
      <div class="card pcabig" data-anaopen="io"><small>${y} gegen ${y-1}</small><div style="display:flex;align-items:baseline;gap:10px;margin-top:4px"><b style="font-size:22px">${esc(eur0(ytd))}</b>${hasLast&&dY!=null?chip(dY)+`<span class="pcas" style="margin:0">zu ${y-1} bis ${esc(mn)}</span>`:`<span class="pcas" style="margin:0">ausgegeben bis ${esc(mn)}</span>`}</div>
        <div class="pcalg"><span><i style="background:var(--bad)"></i>${y}</span><span><i style="background:var(--faint);opacity:.55"></i>${y-1}</span></div>${cmp}</div>
      ${rowsFor(["calc","plan"])}</div>`;
    const tt=tiles.find(t=>t.k==="tax"); let tx=null; try { tx=taxCalc(y); } catch(e){}
    const box=(l,v)=>`<div><small>${l}</small><b>${v}</b></div>`;
    const col3=`<div class="pcac"><div class="pcah"><h2>${esc(g3n)}</h2><span>${y} · Schätzung</span></div>
      ${tt?`<div class="card pcabig" data-anaopen="tax"><small>Voraussichtlich</small><div class="pcan">${esc(tt.short||"")}</div><div class="pcas">${tt.sub||""}</div>
        ${tx?`<div class="pcabox">${box("Zu versteuern",esc(eur0(tx.zve)))}${hasSelf()?box("Rücklage",esc(eur0(tx.resBal||0))):box("Steuern gesamt",esc(eur0((tx.mine?tx.mine.total:0)+(tx.gewst||0))))}</div>`:""}</div>`:""}
      ${rowsFor(g3[1])}</div>`;
    return `<div class="pcana">${col1}${col2}${col3}</div>`;
  };
  document.addEventListener("click", e=>{ const g=e.target.closest("[data-pcaym]"); if (!g || UI.view!=="year") return; e.stopPropagation(); if (g.dataset.pcaym===UI.ym) return; UI.ym=g.dataset.pcaym; render(); }, true);
  const yv=document.getElementById("v-year"); if (yv) yv.classList.add("pca");
}
/* Einstellungen am PC */
if (IS_PC){
  const PCSET=[["Geld",()=>["konten","budgets",...(isJobless()?["amt"]:hasProfile()?["amt","steuer"]:["steuer"]),"invest","export"]],
    ["Anpassen",()=>["farben","sprache","kategorien","laeden"]],
    ["Sicherheit",()=>["sicherheit",...(SYNCABLE||window.AndroidBridge?["geraete"]:[]),"backup",...(CAN_NOTIFY?["notify"]:[]),"speicher"]]];
  const syncOn=()=>!!(SYNCABLE||window.AndroidBridge), parts=k=>k==="geraete"&&syncOn()?["sync","geraete"]:[k], alias={sync:"geraete"};
  const title=k=>k==="geraete"&&syncOn()?"Geräte & Abgleich":accTitle(k), sub=k=>accSub(k);
  const col=k=>themeCol(ACC_COL[k]||"#1a7a5c");
  let shown="";
  const showPane=(k,anim)=>{ const r=$("pcsR"); if (!r) return; accRestoreAll(); const ks=parts(k);
    const tp=window.pcTilePane && window.pcTilePane(k);
    r.innerHTML=`<div class="pcsp${anim?" pcsanim":""}"><div class="pcsph"><span class="saic" style="background:${col(k)}">${ic(accIcon(k),20)}</span><h2>${esc(title(k))}</h2></div>${tp || ks.map(x=>`<div class="sabody" id="sab-${x}"></div>`).join("")}</div>`;
    if (!tp) ks.forEach(x=>{ try{ accMount(x); }catch(e){ console.warn("pcset",x,e); } });
    shown=k; };
  const moveHl=()=>{ const L=$("pcsL"), hl=L&&L.querySelector(".pcshl"), b=L&&L.querySelector(".pcsi.on"); if (!hl) return;
    if (!b){ hl.style.opacity=0; return; } hl.style.opacity=1; hl.style.top=b.offsetTop+"px"; hl.style.height=b.offsetHeight+"px"; };
  renderSetHome=function(){
    const el=$("setHome"); if (!el) return;
    if (!$("pcsL")){ accRestoreAll(); shown="";
      el.innerHTML=`<div class="pcset"><nav class="pcsl" id="pcsL"><label class="pcss"><svg class="i" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/></svg><input id="setQ" type="search" placeholder="Einstellung suchen …" autocomplete="off" aria-label="Einstellung suchen"></label><div class="pcsits"><div class="pcshl"></div><div id="pcsItems"></div></div></nav><section class="pcsr" id="pcsR"></section></div>`; }
    const q=(ACC.q||"").trim().toLowerCase(), its=$("pcsItems"), groups=PCSET.map(([g,f])=>[g,f()]);
    const want=JSON.stringify([q,groups]);
    if (its.dataset.w!==want){ its.dataset.w=want;
      const hit=k=>!q||(title(k)+" "+sub(k)+" "+parts(k).map(x=>liveSp(x).map(e=>e.textContent).join(" ")).join(" ")).toLowerCase().includes(q);
      const html=groups.map(([g,ks])=>{ ks=ks.filter(hit); return ks.length?`<div class="pcsg">${esc(I18N.tr?I18N.tr(g):g)}</div>`+ks.map(k=>`<button class="pcsi" data-pcset="${k}"><span class="saic" style="background:${col(k)}">${ic(accIcon(k),16)}</span><span class="sat"><b>${esc(title(k))}</b><small data-pcsub="${k}">${esc(sub(k))}</small></span></button>`).join(""):""; }).join("");
      its.innerHTML=html||`<p class="small muted" style="padding:10px 12px">Nichts gefunden für „${esc(ACC.q)}“.</p>`;
      if (q){ const first=its.querySelector("[data-pcset]"); if (first && !its.querySelector(`[data-pcset="${alias[UI.pcset]||UI.pcset}"]`)) UI.pcset=first.dataset.pcset; }
    } else its.querySelectorAll("[data-pcsub]").forEach(s=>{ const t=sub(s.dataset.pcsub); if (s.textContent!==t) s.textContent=t; });
    if (!UI.pcset || !SP_PAGES[alias[UI.pcset]||UI.pcset]) UI.pcset="konten";
    const cur=alias[UI.pcset]||UI.pcset;
    its.querySelectorAll(".pcsi").forEach(b=>b.classList.toggle("on",b.dataset.pcset===cur));
    if (shown!==cur || !$("pcsR").children.length) showPane(cur, !!shown);
    else if (window.pcTileRepaint) window.pcTileRepaint();
    requestAnimationFrame(moveHl);
  };
  accGo=function(k){
    if (k==="profil"){ spSheetOpen("profil"); return; }
    if (k==="feedback"){ fbFloatOpen(); return; }
    if (k==="weiter"){ invOpen(); return; }
    if (!SP_PAGES[k]) return;
    ACC.q=""; const q=$("setQ"); if (q) q.value="";
    UI.pcset=alias[k]||k;
    if (UI.view!=="more"){ UI.view="more"; render(); }
    renderSetHome(); window.scrollTo({top:0});
  };
  const _rsp=renderSpPages; renderSpPages=function(...a){ if (UI.sp && !spsOpen() && UI.sp!=="profil" && SP_PAGES[UI.sp]) UI.pcset=alias[UI.sp]||UI.sp; return _rsp.apply(this,a); };
  document.addEventListener("click", e=>{ const b=e.target.closest("[data-pcset]"); if (!b) return; UI.pcset=b.dataset.pcset; UI.pctAdd=""; renderSetHome(); });
  addEventListener("resize", ()=>requestAnimationFrame(moveHl));
  const _rce=renderColorEd; renderColorEd=function(...a){ const r=_rce.apply(this,a);
    document.querySelectorAll(".colsec").forEach(s=>{ const h=s.querySelector("h3"); if (h && /^(Leiste unten|Bottom bar)$/i.test(h.textContent.trim())) s.hidden=true; }); return r; };
}
/* Einstellungen am PC */
if (IS_PC){
  const PT={};
  const trash=`<svg class="i" viewBox="0 0 24 24" style="width:16px;height:16px"><path d="M4.5 7h15M9.5 7V4.8h5V7M6.5 7l.9 12.2h9.2l.9-12.2M10.2 10.5v5.5M13.8 10.5v5.5"/></svg>`;
  const ring=(p,c)=>{ const q=Math.max(0,Math.min(1,p)); return `<svg class="pctring" viewBox="0 0 48 48"><circle cx="24" cy="24" r="19" fill="none" stroke="var(--sunk)" stroke-width="6"/><circle class="pcta" cx="24" cy="24" r="19" fill="none" stroke="${p>1?"var(--bad)":c}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${(q*119.4).toFixed(1)} 200" transform="rotate(-90 24 24)"/><text x="24" y="28" text-anchor="middle" font-size="11.5" font-weight="800" fill="var(--fg)">${Math.round(p*100)}%</text></svg>`; };
  const delBtn=(attr,v)=>`<button class="pctdel" ${attr}="${esc(v)}" aria-label="Löschen" title="Löschen">${trash}</button>`;
  const armed=b=>{ if (b.dataset.armed==="1") return true; b.dataset.armed="1"; b.classList.add("arm"); b.innerHTML=`<b>Wirklich löschen?</b>`; setTimeout(()=>{ if (b.isConnected){ b.dataset.armed=""; b.classList.remove("arm"); b.innerHTML=trash; } },3000); return false; };
  UI.pctAdd=UI.pctAdd||"";

  PT.budgets=()=>{ const b=S.settings.budgets||{}, ym=ymOf(new Date()), mc=monthCalc(ym), spent=Object.fromEntries(catTotals(mc.tx, mc.fixPaid));
    const ks=Object.keys(b).filter(k=>b[k]>0), free=cats("ausgabe").filter(c=>!(b[c]>0));
    const tot=sum(ks,k=>b[k]), used=sum(ks,k=>spent[k]||0);
    return `<p class="pcthint">${ks.length?`${esc(eur0(used))} von ${esc(eur0(tot))} im ${esc(MONTHS[ymParts(ym)[1]-1])} ausgegeben. Betrag antippen zum Ändern.`:"Leg fest, wie viel du pro Monat für eine Kategorie ausgeben willst – die Startseite zeigt dann, wie du liegst."}</p>
      <div class="pctg">${ks.map((k,i)=>{ const s=spent[k]||0, c=catColor("ausgabe",k), col=c.startsWith("#")?c:cssVar(c);
        return `<div class="pctk" style="--i:${i}">${delBtn("data-pcbdel",k)}<div class="pctrow">${ring(s/b[k], col)}<div class="pctt"><b>${esc(k)}</b><small>${esc(eur0(s))} von <input class="pctin" data-pcbset="${esc(k)}" value="${esc(numStr(b[k]))}" inputmode="decimal" aria-label="Budget ${esc(k)}"> €</small><small class="${s>b[k]?"bad":""}">${s>b[k]?`${esc(eur0(s-b[k]))} drüber`:`noch ${esc(eur0(b[k]-s))}`}</small></div></div></div>`; }).join("")}
      ${UI.pctAdd==="budgets"?`<div class="pctk pctform" style="--i:${ks.length}"><b>Neues Budget</b><label>Kategorie<select class="in" id="pcbCat">${free.map(c=>`<option>${esc(c)}</option>`).join("")}</select></label><label>Pro Monat<input class="in" id="pcbAmt" inputmode="decimal" placeholder="z. B. 150"></label><div class="pctbtns"><button class="btn" data-pctcancel>Abbrechen</button><button class="btn primary" data-pcbadd>Anlegen</button></div></div>`
        : free.length?`<button class="pctk pctnew" data-pctnew="budgets" style="--i:${ks.length}">+ Budget anlegen</button>`:""}</div>`; };

  const acctList=()=>{ const A=S.settings.accountAnchors||{}, sp=S.settings.spaces||[];
    return [...new Set([...Object.keys(A), ...accountNames(), ...sp])].sort((a,b)=>(b==="Hauptkonto")-(a==="Hauptkonto")||a.localeCompare(b,"de")); };
  PT.konten=()=>{ const today=isoToday(), names=acctList(), A=S.settings.accountAnchors||{}, imp=new Set(accountNames()), sp=new Set(S.settings.spaces||[]);
    const y=new Date().getFullYear(), sb=(S.settings.startBalance||{})[y];
    return `<p class="pcthint">Trag einmal ein, was heute auf einem Konto ist – die App rechnet von da an mit deinen Buchungen weiter. Geld zwischen diesen Konten zählt als Umbuchung, nicht als Ausgabe.</p>
      <div class="pctg">${names.map((n,i)=>{ const bal=accountBalance(n,today);
        return `<div class="pctk" style="--i:${i}">${n==="Hauptkonto"?"":delBtn("data-pcadel",n)}<small class="muted">${esc(n)}${imp.has(n)?" · aus Kontoauszug":sp.has(n)?" · Space":""}</small><div class="pctbig"><input class="pctin big" data-pcaset="${esc(n)}" value="${bal==null?"":esc(numStr(Math.round(bal*100)/100))}" placeholder="Stand eintragen" inputmode="decimal" aria-label="Stand ${esc(n)}"> <span>€</span></div><small class="muted">${A[n]?`Stand heute${A[n].date!==today?` · eingetragen am ${esc(shortDate(A[n].date))}`:""}`:"noch kein Stand"}</small></div>`; }).join("")}
      <div class="pctk" style="--i:${names.length}"><small class="muted">Kontostand am 1. Januar ${y}</small><div class="pctbig"><input class="pctin big" data-pcstart="${y}" value="${sb!=null?esc(numStr(sb)):""}" placeholder="0,00" inputmode="decimal" aria-label="Kontostand Jahresanfang"> <span>€</span></div><small class="muted">damit die Jahresrechnung stimmt</small></div>
      ${UI.pctAdd==="konten"?`<div class="pctk pctform" style="--i:${names.length+1}"><b>Neues Konto oder Space</b><label>Name<input class="in" id="pcaName" placeholder="z. B. Urlaub"></label><label>Stand heute<input class="in" id="pcaBal" inputmode="decimal" placeholder="0,00"></label><div class="pctbtns"><button class="btn" data-pctcancel>Abbrechen</button><button class="btn primary" data-pcaadd>Anlegen</button></div></div>`
        :`<button class="pctk pctnew" data-pctnew="konten" style="--i:${names.length+1}">+ Konto oder Space</button>`}</div>`; };

  const aboList=()=>{ const A=aboCfg(); return S.fixed.filter(f=>!debtFor(f.id) && (fixArea(f)==="Abos & Handy" || A[f.id])).sort((x,y)=>(aboDeadline(A[x.id])||"9999").localeCompare(aboDeadline(A[y.id])||"9999")||String(x.name).localeCompare(String(y.name))); };
  const NOT=[[0,"jederzeit"],[0.5,"2 Wochen"],[1,"1 Monat"],[2,"2 Monate"],[3,"3 Monate"],[6,"6 Monate"]];
  PT.abos=()=>{ const A=aboCfg(), today=isoToday(), L=aboList(), ym=ymOf(new Date());
    const perM=sum(L,f=>{ const a=planAmt(f,ym), r=f.rhythm||"monatlich"; return r==="monatlich"?a:r==="quartal"?a/3:r==="halbjahr"?a/6:r==="jahr"?a/12:a; });
    return `<p class="pcthint">${L.length?`${L.length} Abos und Verträge · zusammen etwa ${esc(eur0(perM))} im Monat. Die App erinnert dich 30 Tage vor der Kündigungsfrist.`:"Noch keine Abos. Leg hier Streaming, Handy, Fitnessstudio & Co. an."}</p>
      <div class="pctg">${L.map((f,i)=>{ const a=A[f.id]||{}, dl=aboDeadline(a), d=dl?Math.round((new Date(dl+"T12:00")-new Date(today+"T12:00"))/864e5):null, b=brandFor(f.name);
        return `<div class="pctk" style="--i:${i}">${delBtn("data-pcodel",f.id)}<div class="pctrow">${b?brandBadge(b):tile("ausgabe",f.cat||f.name)}<div class="pctt"><b>${esc(f.name)}</b><small>${esc(eur(listAmt(f,ym)))} · ${esc(f.rhythm==="jahr"?"jährlich":f.rhythm==="quartal"?"vierteljährlich":f.rhythm==="halbjahr"?"halbjährlich":"monatlich")}</small></div></div>
          <div class="pctab"><label>Läuft bis<input class="in" type="date" data-aboend="${esc(f.id)}" value="${esc(a.end||"")}"></label><label>Frist<select class="in" data-abonot="${esc(f.id)}">${NOT.map(([v,l])=>`<option value="${v}" ${Number(a.notice||0)===v?"selected":""}>${l}</option>`).join("")}</select></label></div>
          <small class="${d!=null&&d<=30?"warn":"muted"}">${dl?(d<0?"Frist vorbei – verlängert sich":d===0?"Heute letzter Tag zum Kündigen":`kündigen bis ${esc(new Date(dl+"T12:00").toLocaleDateString("de-DE"))}`):"ohne Laufzeit eingetragen"}</small></div>`; }).join("")}
      ${UI.pctAdd==="abos"?`<div class="pctk pctform" style="--i:${L.length}"><b>Neues Abo</b><label>Name<input class="in" id="pcoName" placeholder="z. B. Netflix"></label><div class="pctab"><label>Betrag<input class="in" id="pcoAmt" inputmode="decimal" placeholder="0,00"></label><label>Rhythmus<select class="in" id="pcoRh"><option value="monatlich">monatlich</option><option value="jahr">jährlich</option><option value="quartal">vierteljährlich</option></select></label></div><div class="pctbtns"><button class="btn" data-pctcancel>Abbrechen</button><button class="btn primary" data-pcoadd>Anlegen</button></div><small class="muted">Steht danach auch bei den Fixkosten.</small></div>`
        :`<button class="pctk pctnew" data-pctnew="abos" style="--i:${L.length}">+ Abo anlegen</button>`}</div>`; };

  window.pcTilePane=k=>PT[k]?`<div class="pctpane" data-pctk="${k}">${PT[k]()}</div>`:null;
  const repaint=()=>{ const el=document.querySelector("#pcsR .pctpane"); if (!el) return; if (el.contains(document.activeElement) && /INPUT|SELECT/.test(document.activeElement.tagName)) return; const k=el.dataset.pctk; el.innerHTML=PT[k](); el.classList.add("still"); };
  window.pcTileRepaint=repaint;
  const after=(msg)=>{ UI.pctAdd=""; try { document.activeElement && document.activeElement.blur(); } catch(_){} if (msg) toast(msg); repaint(); };

  document.addEventListener("click", async e=>{
    const n=e.target.closest("[data-pctnew]"); if (n){ UI.pctAdd=n.dataset.pctnew; repaint(); setTimeout(()=>{ const f=document.querySelector("#pcsR .pctform input, #pcsR .pctform select"); if (f) f.focus(); },30); return; }
    if (e.target.closest("[data-pctcancel]")){ after(); return; }
    let b=e.target.closest("[data-pcbdel]"); if (b){ if (!armed(b)) return; const B={...(S.settings.budgets||{})}; delete B[b.dataset.pcbdel]; S.settings.budgets=B; await saveSettings(); after("Budget gelöscht"); return; }
    if (e.target.closest("[data-pcbadd]")){ const c=$("pcbCat").value, v=parseAmt($("pcbAmt").value); if (!(v>0)){ toast("Bitte einen Betrag eingeben"); $("pcbAmt").focus(); return; }
      S.settings.budgets={...(S.settings.budgets||{}), [c]:Math.round(v*100)/100}; await saveSettings(); after(`Budget für ${c} angelegt`); return; }
    b=e.target.closest("[data-pcadel]"); if (b){ if (!armed(b)) return; const n2=b.dataset.pcadel, A={...(S.settings.accountAnchors||{})}; delete A[n2]; S.settings.accountAnchors=A; S.settings.spaces=(S.settings.spaces||[]).filter(x=>x!==n2); await saveSettings(); after(`${n2} entfernt`); return; }
    if (e.target.closest("[data-pcaadd]")){ const nm=$("pcaName").value.trim(), raw=$("pcaBal").value.trim(); if (!nm){ toast("Bitte einen Namen eingeben"); $("pcaName").focus(); return; }
      if (nm!=="Hauptkonto" && !(S.settings.spaces||[]).includes(nm)) S.settings.spaces=[...(S.settings.spaces||[]), nm];
      if (raw){ const v=parseAmt(raw); if (!isFinite(v)){ toast("Bitte eine Zahl eingeben"); return; } S.settings.accountAnchors={...(S.settings.accountAnchors||{}), [nm]:{date:isoToday(), balance:Math.round(v*100)/100}}; }
      await saveSettings(); after(`${nm} angelegt`); return; }
    b=e.target.closest("[data-pcodel]"); if (b){ if (!armed(b)) return; const id=b.dataset.pcodel, f=S.fixed.find(x=>x.id===id); const A={...(S.settings.abos||{})}; delete A[id]; S.settings.abos=A;
      if (await safe(()=>del("fixed", id))){ await saveSettings(); after(`${f?f.name:"Abo"} gelöscht`); } return; }
    if (e.target.closest("[data-pcoadd]")){ const nm=$("pcoName").value.trim(), v=parseAmt($("pcoAmt").value), rh=$("pcoRh").value; if (!nm){ toast("Bitte einen Namen eingeben"); $("pcoName").focus(); return; } if (!(v>0)){ toast("Bitte einen Betrag eingeben"); $("pcoAmt").focus(); return; }
      const id=newId(), doc={name:nm, amount:Math.round(v*100)/100, kind:"privat", order:S.fixed.length}; if (rh!=="monatlich") doc.rhythm=rh;
      if (await safe(()=>put("fixed", id, doc))){ S.settings.abos={...(S.settings.abos||{}), [id]:{abo:1}}; await saveSettings(); after(`${nm} angelegt`); } return; }
  });
  document.addEventListener("change", async e=>{
    const t=e.target;
    if (t.dataset.pcbset){ const v=parseAmt(t.value); const B={...(S.settings.budgets||{})}; if (!(v>0)){ toast("Bitte einen Betrag eingeben"); t.value=numStr(B[t.dataset.pcbset]||""); return; } B[t.dataset.pcbset]=Math.round(v*100)/100; S.settings.budgets=B; t.blur(); await saveSettings(); toast("Budget gespeichert"); repaint(); return; }
    if (t.dataset.pcaset){ const raw=t.value.trim(); if (!raw) return; const v=parseAmt(raw); if (!isFinite(v)){ toast("Bitte eine Zahl eingeben"); return; } S.settings.accountAnchors={...(S.settings.accountAnchors||{}), [t.dataset.pcaset]:{date:isoToday(), balance:Math.round(v*100)/100}}; t.blur(); await saveSettings(); toast("Stand gespeichert"); repaint(); return; }
    if (t.dataset.pcstart){ const y=t.dataset.pcstart, raw=t.value.trim(), sb={...(S.settings.startBalance||{})}; if (!raw) delete sb[y]; else { const v=parseAmt(raw); if (!isFinite(v)){ toast("Bitte eine Zahl eingeben"); return; } sb[y]=Math.round(v*100)/100; } S.settings.startBalance=sb; t.blur(); await saveSettings(); toast("Gespeichert"); repaint(); return; }
    if ((t.dataset.aboend!=null || t.dataset.abonot!=null) && t.closest(".pctpane")) setTimeout(repaint, 50);
  });
  document.addEventListener("keydown", e=>{ if (e.key==="Enter" && e.target.closest(".pctform")){ e.preventDefault(); const ok=e.target.closest(".pctform").querySelector(".btn.primary"); if (ok) ok.click(); } if (e.key==="Escape" && e.target.closest(".pctform")){ e.stopPropagation(); after(); } }, true);
}

/* Tablet */
if (IS_TAB){
  const H=document.documentElement, calm=()=>pcCalm();
  /* Dock */
  const dock=document.querySelector(".tabs"), plus=dock && dock.querySelector(".tab.plus");
  let bub=null;
  function dockPlace(){
    if (!dock) return;
    if (!bub){ bub=document.createElement("i"); bub.className="tabbub"; dock.prepend(bub); }
    const on=dock.querySelector('.tab[aria-selected="true"]');
    if (on){ bub.style.left=on.offsetLeft+"px"; bub.style.top=on.offsetTop+"px"; bub.style.width=on.offsetWidth+"px"; bub.style.height=on.offsetHeight+"px";
      bub.style.setProperty("--bubc", getComputedStyle(on).getPropertyValue("--tc")||"#1a7a5c"); bub.style.opacity=1; } else bub.style.opacity=0;
  }
  const _rd=render; render=(...a)=>{ const x=_rd(...a); if (UI.view!=="more") UI.tabOpen=0; requestAnimationFrame(dockPlace); return x; };
  addEventListener("resize", ()=>requestAnimationFrame(dockPlace)); setTimeout(dockPlace, 60); setTimeout(dockPlace, 600);

  /* Einstellungen */
  const GROUPS=()=>[["Geld","#6b8e23",["konten","budgets","schulden",...(isJobless()?["amt"]:hasProfile()?["amt","steuer"]:["steuer"]),"invest","export"]],
    ["Anpassen","#1a7a5c",["farben","sprache","kategorien","start","laeden"]],
    ["Sicherheit","#3d63a8",["sicherheit",...(SYNCABLE||window.AndroidBridge?["geraete"]:[]),"backup",...(CAN_NOTIFY?["notify"]:[]),"speicher"]],
    ["Hilfe","#c27c0e",["neu","hilfe",...(canInvite()?["weiter"]:[]),"recht"]]];
  const tTitle=k=>k==="geraete"&&(SYNCABLE||window.AndroidBridge)?"Geräte & Abgleich":accTitle(k);
  function tabSetHTML(){
    const n=String(S.settings.name||"").trim(), p=S.settings.photo, f=devForm(), badge=`<span class="avdev">${devIc(f,11)}</span>`;
    const av=p?`<img src="${esc(p)}" alt="">${badge}`:n?`<span class="avl">${esc(n[0].toUpperCase())}</span>${badge}`:devIc(f,24);
    
    return `<div class="card tsprof"><button class="topav ${!p&&!n?"devav":""}" data-tsprof="1" aria-label="Profil">${av}</button><div style="min-width:0"><b>${esc(n||devModel())}</b><small>${esc([n?devModel():"",SYNC.token?"Abgleich an":"Abgleich aus",verFull()].filter(Boolean).join(" · "))}</small></div><span style="flex:1"></span><button class="btn" data-tsprof="1">Profil bearbeiten</button></div>
      <div class="tsqs">${quickSw().map(qsTile).join("")}</div>
      <div class="tsgr">${GROUPS().map(([g,c,ks])=>`<div class="card tsg" style="--gc:${c}"><h3><span class="saic" style="background:${c}">${ic(accIcon(ks[0]),16)}</span>${esc(I18N.tr?I18N.tr(g):g)}</h3>${ks.filter(k=>SP_PAGES[k]||k==="weiter").map(k=>`<button data-tsgo="${k}"><span class="saic" style="background:${themeCol(ACC_COL[k]||c)};width:28px;height:28px;border-radius:9px">${ic(accIcon(k),14)}</span>${esc(tTitle(k))}<small>${esc(accSub(k)||"")} ›</small></button>`).join("")}</div>`).join("")}</div>`;
  }
  const _rsh=renderSetHome;
  renderSetHome=function(...a){
    const r=_rsh.apply(this,a), el=$("setHome"); if (!el) return r;
    const ps=el.querySelector(".pcset"); if (!ps) return r;
    let mix=$("tabSet"); if (!mix){ ps.insertAdjacentHTML("beforebegin", `<div id="tabSet"></div>`); mix=$("tabSet"); }
    const open=!!UI.tabOpen; mix.hidden=open; ps.hidden=!open;
    if (!open){ const h=tabSetHTML(); if (mix.dataset.h!==h){ mix.dataset.h=h; mix.innerHTML=h; } }
    else { const ph=ps.querySelector(".pcsph"); if (ph && !ps.querySelector("[data-tsback]")) ph.insertAdjacentHTML("beforebegin", `<button class="tsback" data-tsback="1"><svg class="i" viewBox="0 0 24 24" style="width:16px;height:16px"><path d="m15 6-6 6 6 6"/></svg> Einstellungen</button>`); }
    return r;
  };
  const _ag=accGo; accGo=function(k){ if (k!=="profil") UI.tabOpen=1; return _ag(k); };
  document.addEventListener("click", e=>{
    const g=e.target.closest("[data-tsgo]"); if (g){ const k=g.dataset.tsgo; if (k==="weiter"){ invOpen(); return; } UI.tabOpen=1; UI.pcset=k; renderSetHome(); window.scrollTo({top:0});
      const pn=document.querySelector("#setHome .pcsr"); if (pn && !calm()) pn.animate([{opacity:0,transform:"translateX(60px)"},{opacity:1,transform:"none"}],{duration:420,easing:"cubic-bezier(.2,.9,.3,1.2)"}); return; }
    if (e.target.closest("[data-tsback]")){ UI.tabOpen=0; renderSetHome(); window.scrollTo({top:0});
      const m=$("tabSet"); if (m && !calm()) [...m.querySelectorAll(".card,.tssw>button")].forEach((x,i)=>x.animate([{opacity:0,transform:"translateY(26px) scale(.97)"},{opacity:1,transform:"none"}],{duration:480,delay:i*35,easing:"cubic-bezier(.3,1.3,.5,1)",fill:"backwards"})); return; }
    if (e.target.closest("[data-tsprof]")){ accGo("profil"); return; }
    const w=e.target.closest("[data-tssw]"); if (w){ const k=w.dataset.tssw;
      if (k==="dark"){ const t=$("pcTheme"); if (t) t.click(); setTimeout(renderSetHome, 50); return; }
      UI.tabOpen=1; UI.pcset=k; renderSetHome(); window.scrollTo({top:0}); }
  });

  /* Wischen */
  { let x0=null, y0=0, t0=0, dx=0, sec=null, horiz=null;
    const blocked=t=>t.closest("input,textarea,select,.sheet,.backdrop,.astack,.srail,.table-wrap,.fxchips,.tabs,.pcfcalc,[draggable=true],.pcsweb,.leaflet-container");
    document.addEventListener("touchstart", e=>{ if (e.touches.length!==1 || blocked(e.target) || PC_ANIM.busy || (UI.view==="more" && UI.tabOpen) || document.querySelector(".backdrop:not([hidden])")){ x0=null; return; }
      x0=e.touches[0].clientX; y0=e.touches[0].clientY; t0=Date.now(); dx=0; horiz=null; sec=document.querySelector(`[data-view="${UI.view}"]`); }, {passive:true, capture:true});
    document.addEventListener("touchmove", e=>{ if (x0===null || !sec) return; const t=e.touches[0]; dx=t.clientX-x0; const dy=t.clientY-y0;
      if (horiz===null && (Math.abs(dx)>12 || Math.abs(dy)>12)) horiz=Math.abs(dx)>Math.abs(dy)*1.4;
      if (horiz && !calm()){ const k=dx/innerWidth; sec.style.transition="none"; sec.style.transform=`translateX(${dx*0.55}px) rotate(${k*3}deg) scale(${1-Math.abs(k)*0.06})`; sec.style.opacity=String(1-Math.abs(k)*0.5); } }, {passive:true, capture:true});
    document.addEventListener("touchend", e=>{ if (x0===null || !sec) return; const s=sec, go=horiz && Math.abs(dx)>80 && Date.now()-t0<1200; x0=null;
      if (horiz && !calm()){ s.style.transition="transform .45s cubic-bezier(.3,1.5,.5,1), opacity .3s"; s.style.transform=""; s.style.opacity=""; setTimeout(()=>{ s.style.transition=""; }, 460); }
      if (go){ e.stopImmediatePropagation(); pcStep(dx<0?1:-1); } }, {passive:true, capture:true});
  }

}
