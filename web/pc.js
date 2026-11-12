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
  if (sec && ((sec.id==="v-fix" && sec.classList.contains("pcfcal")) || sec.id==="v-list")) return out;   // these pages have their own entrance
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
  PC_ANIM.busy=true; if (k==="home") pcHome.intro=true; document.documentElement.classList.add("pcanim");
  const outs=olds.map((e,i,a)=>e.animate([{opacity:1,transform:"none"},{opacity:0,transform:`translateY(${Math.round(innerHeight*0.6+i*24)}px) rotate(${i%2?9:-9}deg)`}],
    {duration:300, delay:(a.length-1-i)*22, easing:"cubic-bezier(.55,0,1,.45)", fill:"forwards"}));
  const done=()=>{
    PC_ANIM.pass=true; try { nav(); } finally { PC_ANIM.pass=false; }
    // the new tiles get their animation right away (in the same frame), so the finished page never flashes up first
    const news0=pcCalm()?[]:[...pcTiles(document.querySelector(`[data-view="${UI.view}"]`)), ...(window.pcDockEls?pcDockEls():[])];
    news0.forEach(e=>{ e.style.opacity="0"; });
    outs.forEach(a=>{ try { a.cancel(); } catch(_){} });
    { const dk=$("pcDock"); if (dk && !dk.hidden && !pcCalm()) dk.animate([{opacity:0,transform:"translateX(60px)"},{opacity:1,transform:"none"}],{duration:420,easing:"cubic-bezier(.2,.8,.2,1)",fill:"backwards"}); }
    {
      const news=pcCalm()?[]:[...pcTiles(document.querySelector(`[data-view="${UI.view}"]`)), ...(window.pcDockEls?pcDockEls():[])];
      news0.forEach(e=>{ e.style.opacity=""; });
      news.forEach((e,i)=>e.animate([{opacity:0,transform:`translateY(${-Math.round(innerHeight*0.8)}px) rotate(${i%2?-6:6}deg)`},{opacity:1,transform:"translateY(14px) rotate(0)",offset:.6},{transform:"translateY(-6px)",offset:.8},{opacity:1,transform:"none"}],
        {duration:560, delay:i*45, easing:"cubic-bezier(.3,.7,.3,1)", fill:"backwards"}));
      setTimeout(()=>{ PC_ANIM.busy=false; const n=PC_ANIM.next; PC_ANIM.next=null; if (n) n(); }, 160);
      clearTimeout(pcGo.t); pcGo.t=setTimeout(()=>{ if (!PC_ANIM.busy) document.documentElement.classList.remove("pcanim"); }, 160+Math.min(14,news.length)*45+600);
    }
  };
  if (outs.length) Promise.all(outs.map(a=>a.finished)).then(done, done); else done();
  return true;
}
function pcStep(d){
  // pressed several times during an animation: the steps add up and are done in one go afterwards
  if (PC_ANIM.busy){ PC_ANIM.pend=(PC_ANIM.pend||0)+d; PC_ANIM.next=()=>{ const n=PC_ANIM.pend; PC_ANIM.pend=0; if (n) pcStep(n); }; return true; }
  const i=PC_ORDER.indexOf(UI.view); if (i<0 || (UI.view==="more" && UI.sp) || document.querySelector(".backdrop:not([hidden])")) return false;
  const b=document.querySelector(`.tabs [data-go="${PC_ORDER[((i+d)%PC_ORDER.length+PC_ORDER.length)%PC_ORDER.length]}"]`); if (!b) return false;
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
    <span class="pcfr"><button data-spgo="neu">Neu in dieser Version</button><button data-spgo="feedback">Feedback</button>
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
    "Neue Fixkoste":["New fixed cost","Yeni sabit gider","Новый постоянный расход","Нова постійна витрата","Nowy koszt stały","تكلفة ثابتة جديدة","Cheltuială fixă nouă"],
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
    "Einklappen":["Collapse","Daralt","Свернуть","Згорнути","Zwiń","طيّ","Restrânge"],
    "Aufklappen":["Expand","Genişlet","Развернуть","Розгорнути","Rozwiń","توسيع","Extinde"],
    "Ja":["Yes","Evet","Да","Так","Tak","نعم","Da"],"Nein":["No","Hayır","Нет","Ні","Nie","لا","Nu"],
    "Abgleich aus":["Sync off","Eşitleme kapalı","Синхронизация выкл.","Синхронізацію вимкнено","Synchronizacja wył.","المزامنة متوقفة","Sincronizare oprită"]};
  const LL=["en","tr","ru","uk","pl","ar","ro"];
  for (const [k,v] of Object.entries(PC_I18N)) if (!I18N_K.includes(k)){ I18N_K.push(k); LL.forEach((l,i)=>{ (I18N_T[l]=I18N_T[l]||[])[I18N_K.length-1]=v[i]; }); }
  if (LANG!=="de") try { I18N.set(LANG); } catch(e){}
}
/* ---------- start page tiles: drag & drop to sort, "minimize" to the dock on the right edge (they can never be deleted).
   The PC keeps its own order (S.settings.pcHome), the phone keeps its own. ---------- */
if (IS_PC){
  const PCH=()=>{ const h=S.settings.pcHome||(S.settings.pcHome={}); h.order=Array.isArray(h.order)?h.order:[]; h.min=Array.isArray(h.min)?h.min:[]; return h; };
  const BIC={cash:"cash",budgets:"target",fix:"repeat",tax:"shield",goals:"piggy",debts:"bank",recent:"list",gemeinsam:"heart",offers:"cart",...HX_IC};
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
  // the check window speaks about the scanner, not about a phone camera
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
/* profile photo next to the greeting – without a photo the first letter of the name */
if (IS_PC){
  const av=()=>{ const ta=$("topAv"); if (!ta) return; if (ta.querySelector("img")) return; const n=String(S.settings.name||"").trim();
    ta.hidden=false; ta.textContent=(n[0]||"?").toUpperCase(); };
  const _r2=render; render = (...a) => { const x=_r2(...a); try { av(); } catch(e){} return x; };
  av();
}
/* ---------- month / year change ("Zahlenwalze"): the month name rolls on, every amount runs from the old
   to the new value, bars grow or shrink, each tile lights up briefly ---------- */
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
    // the month name rolls on in the direction of the change
    document.querySelectorAll("#monthpill select").forEach(s=>s.animate([{transform:`translateY(${d*18}px)`,opacity:0},{transform:"none",opacity:1}],{duration:380,easing:"cubic-bezier(.2,.8,.2,1)"}));
    const now=amounts(sec), runs=[];
    for (const [k,e] of now){ const o=oldA.get(k), n=parse(e.textContent); if (!o || !n || o.v===n.v) continue;
      runs.push({e, fin:e.textContent, n, a:o.v, b:n.v}); }
    const t0=performance.now()+60, D=900, ease=t=>1-Math.pow(1-t,3);
    const step=nowT=>{ const t=Math.max(0,Math.min(1,(nowT-t0)/D)), k=ease(t);
      for (const r of runs){ if (!r.e.isConnected) continue; r.e.textContent = t>=1 ? r.fin : r.fin.replace(r.n.t, fmt(r.n, r.a+(r.b-r.a)*k)); }
      if (t<1 && runs.length) requestAnimationFrame(step); };
    requestAnimationFrame(step);
    // bars: from the old width to the new one
    for (const [k,[e,w]] of bars(sec)){ const o=oldB.get(k); if (o==null || Math.abs(o-w)<0.5) continue; e.animate([{width:o+"%"},{width:w+"%"}],{duration:800,easing:"cubic-bezier(.2,.8,.2,1)"}); }
    // every tile lights up briefly, one after another
    [...sec.querySelectorAll(".pchero, #v-home .hblock > *, :scope > .card, :scope > .cols .card, :scope .card")].filter(e=>!e.closest(".cubestage")).slice(0,16)
      .forEach((c,i)=>c.animate([{boxShadow:"0 0 0 0 rgba(63,191,138,0)"},{boxShadow:"0 0 0 3px rgba(63,191,138,.45)"},{boxShadow:"0 0 0 0 rgba(63,191,138,0)"}],{duration:900,delay:i*55,easing:"ease-out"}));
  }
}
/* help: a "?" button in the header, next to light / dark */
if (IS_PC){
  const th=$("pcTheme");
  if (th && !$("pcHelp")) th.insertAdjacentHTML("beforebegin", `<button class="roundbtn pchelp" id="pcHelp" data-spgo="hilfe" aria-label="Hilfe" title="Hilfe – Fragen und Antworten"><svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 0 1 4.9.7c0 1.7-2.5 2.2-2.5 3.8"/><circle cx="12" cy="17.2" r=".6" fill="currentColor"/></svg></button>`);
}
/* refresh: sync with the server, look for an update, redraw */
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
/* ---------- feedback inbox for the developer (only with the update key): all feedback from the app, with pictures ---------- */
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
    if (!updKey() || FB.busy || (!force && Date.now()-FB.last<4*60*1000)) return fbBtn();
    FB.busy=true; const before=unread();
    try { const j=await devReq("feedlist"); FB.items=j.items||[]; const n=unread(); if (FB.last && n>before) toast(n-before===1?"Neues Feedback ist da":`${n-before} neue Feedbacks sind da`, ()=>fbOpen(), "Ansehen", 8000); FB.last=Date.now(); }
    catch(e){ FB.err = /Unbekannte Aktion/i.test(e.message) ? "Auf dem Server läuft noch die alte pair.php – bitte die neue in den Ordner „haushaltsbuch“ kopieren." : e.message; }
    finally { FB.busy=false; fbBtn(); if (!$("pcFbBg").hidden) fbRender(); }
  }
  document.body.insertAdjacentHTML("beforeend", `<div class="backdrop" id="pcFbBg" hidden><div class="sheet pcfbsheet" role="dialog" aria-modal="true" aria-label="Feedback-Eingang"><div class="sheet-head"><h2>Feedback-Eingang</h2><button class="icon-btn" data-pcfbx="1" aria-label="Schließen"><svg class="i" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div><div id="pcFbBody"></div></div></div>`);
  const KIND={fehler:["Fehler","#c2410c"], idee:["Idee","#3d63a8"], lob:["Lob","#1a7a5c"]};
  function fbRender(){
    const el=$("pcFbBody"); if (!el) return;
    if (!FB.items.length){ el.innerHTML=`<p class="muted" style="padding:20px 0;text-align:center">${FB.err?esc(FB.err):"Noch kein Feedback angekommen."}</p>`; return; }
    el.innerHTML=FB.items.map(x=>{ const [kl,kc]=KIND[x.kind]||KIND.idee, op=FB.open===x.id, d=new Date(x.ts*1000), body=String(x.text||"");
      return `<div class="pcfb ${x.read?"":"new"} ${op?"open":""}" style="--kc:${kc}"><button class="pcfbh" data-pcfb="${esc(x.id)}"><span class="pcfbk">${kl}</span><span class="pcfbt">${esc(body.split("\n")[0].slice(0,120))}</span><small>${d.toLocaleDateString("de-DE")} ${d.toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"})}${x.images?` · ${x.images} ${x.images===1?"Bild":"Bilder"}`:""}${x.mailed?" · ✉":""}</small></button>
        ${op?`<div class="pcfbb"><pre>${esc(body)}</pre>${x.images?`<div class="pcfbimgs">${Array.from({length:x.images},(_,i)=>{ const u=FB.imgs[x.id+"/"+(i+1)]; return u?`<a data-pcfbimg="${esc(u)}"><img src="${esc(u)}" alt="Bild ${i+1}"></a>`:`<span class="ph">…</span>`; }).join("")}</div>`:""}
          <div class="row-btns" style="justify-content:flex-start;margin-top:10px"><button class="btn" data-pcfbunread="${esc(x.id)}">Als ungelesen markieren</button><button class="btn danger" data-pcfbdel="${esc(x.id)}">${FB.delArm===x.id?"Wirklich endgültig löschen?":"Löschen"}</button></div></div>`:""}</div>`; }).join("");
  }
  async function fbShow(id){
    FB.open = FB.open===id ? null : id; const x=FB.items.find(i=>i.id===id); fbRender();
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
    const u=e.target.closest("[data-pcfbunread]"); if (u){ const x=FB.items.find(i=>i.id===u.dataset.pcfbunread); if (x){ x.read=false; FB.open=null; fbRender(); fbBtn(); devReq("feedread","",{id:x.id, unread:1}).catch(()=>{}); } return; }
    const dl=e.target.closest("[data-pcfbdel]"); if (dl){ const id=dl.dataset.pcfbdel;
      if (FB.delArm!==id){ FB.delArm=id; fbRender(); clearTimeout(FB.delT); FB.delT=setTimeout(()=>{ FB.delArm=null; fbRender(); }, 4000); return; }
      FB.delArm=null; const row=dl.closest(".pcfb");
      devReq("feeddel","",{id}).then(()=>{ const done=()=>{ FB.items=FB.items.filter(i=>i.id!==id); FB.open=null; fbRender(); fbBtn(); toast("Feedback gelöscht"); };
        if (row && !pcCalm()) row.animate([{opacity:1,transform:"none"},{opacity:0,transform:"translateX(60px) scale(.96)"}],{duration:260,easing:"ease-in"}).finished.then(done,done); else done(); })
        .catch(err=>toast(/Unbekannte Aktion/i.test(err.message)?"Zum Löschen bitte die neue pair.php auf den Server laden":"Löschen hat nicht geklappt: "+err.message));
      return; }
    const im=e.target.closest("[data-pcfbimg]"); if (im){ const w=window.open(""); if (w) w.document.write(`<img src="${im.dataset.pcfbimg}" style="max-width:100%">`); }
  });
  document.addEventListener("keydown", e=>{ if (e.key==="Escape" && !$("pcFbBg").hidden) fbClose(); });
  setTimeout(()=>fbLoad(true), 5000); setInterval(()=>fbLoad(false), 60*1000);
  const _r4=render; render = (...a) => { const x=_r4(...a); try { fbBtn(); } catch(e){} return x; };
}
/* ---------- Buchungen: diary (one card per day) + the chosen booking big on the right ("Beleg wird gedruckt") ---------- */
if (IS_PC){
  const B={sel:null, sig:"", arm:null, armT:0, closed:new Set(), busy:new Set(), n:0};
  try { (JSON.parse(localStorage.getItem("hb-pc-closed")||"[]")||[]).forEach(d=>B.closed.add(d)); } catch(_){}
  const saveClosed=()=>{ try { localStorage.setItem("hb-pc-closed", JSON.stringify([...B.closed].filter(d=>d>=shiftYm(ymOf(new Date()),-24)))); } catch(_){} };
  function nCols(){ const lc=$("listCard"), w=lc && lc.clientWidth; return Math.max(1, Math.min(5, Math.floor(((w||720)+14)/(330+14)))); }   // never more than 5 columns
  const isIn=t=>t.kind==="einnahme"||(t.kind==="umbuchung"&&t._k0==="einnahme");
  const ttl=t=>t.note||t.cat||KIND_LABEL[t.kind];
  const amtTxt=(t,v)=>(t.kind==="umbuchung"?"":isIn(t)?"+ ":"− ")+eur(v==null?t.amount:v);
  const clip=`<svg class="i" viewBox="0 0 24 24" style="width:13px;height:13px;vertical-align:-1px" aria-label="mit Beleg"><path d="M16.5 7.5 9 15a2.1 2.1 0 0 1-3-3l8-8a3.5 3.5 0 0 1 5 5l-8.5 8.5a5 5 0 0 1-7-7L11 3"/></svg>`;
  function shown(){ let l=monthCalc(UI.ym).tx; if (UI.filter!=="alle") l=l.filter(t=>t.kind===UI.filter);
    const q=(UI.q||"").trim().toLowerCase(); if (q) l=l.filter(t=>((t.note||"")+" "+(t.cat||"")+" "+KIND_LABEL[t.kind]).toLowerCase().includes(q)); return sortTx(l); }
  function sub(t){ return [t.note?t.cat:"", t.kind==="betrieb"?"Betrieblich":t.kind==="vorauszahlung"?"aus Rücklage":t.kind==="umbuchung"?"Umschuldung · zählt nicht":"", t.pay==="bar"?"💶 bar":""].filter(Boolean).join(" · "); }
  const _rl=renderList;
  renderList = function(){
    UI.calDay=null; _rl(); $("calCard").hidden=true;
    const lc=$("listCard"), list=shown();
    if (!$("pcDet")){ $("v-list").insertAdjacentHTML("beforeend", `<div class="card pcdet" id="pcDet"></div>`); }
    lc.classList.toggle("pcdiary", list.length>0);
    if (list.length){
      const days={}; for (const t of list.slice().reverse()) (days[t.date]=days[t.date]||[]).push(t);   // day 1 first
      const chev=`<svg class="i" viewBox="0 0 24 24" style="width:16px;height:16px"><path d="m6 9 6 6 6-6"/></svg>`;
      const card=([d,ts])=>{ const net=sum(ts,t=>t.kind==="umbuchung"?0:isIn(t)?t.amount:-t.amount), dt=new Date(d+"T12:00"), cl=B.closed.has(d);
        return `<div class="pcday ${cl?"closed":""}" data-pcday="${d}"><div class="pcdh" data-pcfold="${d}" role="button" tabindex="0" aria-expanded="${!cl}" title="${cl?"Aufklappen":"Einklappen"}"><span class="pcdn">${pad(dt.getDate())}<i class="pcdbadge">${ts.length}</i></span><span class="pcdw"><b>${esc(dt.toLocaleDateString(LOCD(),{weekday:"long"}))}</b><small>${esc(MONTHS[dt.getMonth()])}</small></span><span class="pcdmini" aria-hidden="true">${ts.slice(0,5).map(t=>`<span>${avatar(t)}</span>`).join("")}</span><b class="pcdnet ${net>=0?"pos":""}">${net>=0?"+":"−"} ${esc(eur(Math.abs(net)))}</b><span class="pcdchev">${chev}</span></div>
          <div class="pcdrows">${ts.map(t=>`<button class="pcbr ${isIn(t)?"inc":""} ${B.sel===t.id?"sel":""}" data-pcsel="${esc(t.id)}">${avatar(t)}<span class="grow"><b>${esc(ttl(t))}${hasReceipt(t.id)?" "+clip:""}</b>${sub(t)?`<small>${esc(sub(t))}</small>`:""}</span><b class="amt">${esc(amtTxt(t))}</b></button>`).join("")}</div></div>`; };
      // fixed columns, filled from top left (day 1) to bottom right (last day) – folding a day never moves cards to another column
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
  // fold a day: the bookings fly into the big day number (which pulses and gets a counter); unfolding lets them jump out again
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
/* ---------- Fixkosten: month calendar – every fixed cost sits on its day; move, edit, delete and add right here ---------- */
if (IS_PC){
  const F={pop:null, ring:0, drag:null, fresh:null, gone:null, first:true};
  const FCOL={Wohnen:"#2f7d5b",Schulden:"#b5473a",Auto:"#c27c0e",Versicherung:"#5b7f95","Sparen & Vorsorge":"#3d63a8","Abos & Handy":"#d14d72",Betrieb:"#6b5bb0",Sonstiges:"#0e8aa0"};
  const FIC={Wohnen:"home",Schulden:"bank",Auto:"car",Versicherung:"shield","Sparen & Vorsorge":"piggy","Abos & Handy":"phone",Betrieb:"case",Sonstiges:"dots"};
  const SV={pen:`<svg class="i" viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4"/></svg>`, bin:`<svg class="i" viewBox="0 0 24 24"><path d="M5 7h14M10 11v6M14 11v6M6.5 7l1 12.5h9L17.5 7M9.5 7V4.5h5V7"/></svg>`, x:`<svg class="i" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>`, plus:`<svg class="i" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>`};
  const col=a=>FCOL[a]||"#0e8aa0";
  const E="cubic-bezier(.2,.8,.2,1)", BO="cubic-bezier(.3,1.5,.5,1)";
  // the day of a fixed cost: a move applies from its month on, earlier months keep their day
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
      return `<div class="pcfc ${on?"on":""} ${late?"late":""}" style="--c:${col(a)}" data-pay="${esc(f.id)}" data-pcfid="${esc(f.id)}" draggable="true" role="checkbox" tabindex="0" aria-checked="${on}" title="${esc(f.name)} · ${esc(a)}${late?" · überfällig":""}">
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
        <div class="card pcfnone" data-pcfday="0"><div class="small muted"><b>Ohne festen Tag</b> · <span>${none.length?"auf einen Tag im Kalender ziehen":"hierher ziehen, um den Tag zu entfernen"}</span></div>${none.map(chip).join("")}<button class="pcfadd wide" data-pcfnew="0">${SV.plus}<span>Neue Fixkoste</span></button></div>
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
  // ---- coming into the page: the days flip down like calendar pages, week by week
  function enter(){
    if (pcCalm() || !root.classList.contains("pcfcal")) return;
    const cells=[...root.querySelectorAll(".pcfd")], chips=[...root.querySelectorAll(".pcfcalc .pcfc")], side=[...root.querySelectorAll(".pcfside>*")];
    const cal=root.querySelector(".pcfcalc"), cols=7;
    const ring=root.querySelector(".pcfring .fg"), bars=[...root.querySelectorAll(".pcfgr .gb>i")], big=root.querySelector(".pcfsum .big");
    if (cal) cal.animate([{opacity:0},{opacity:1}],{duration:260,easing:"ease-out",fill:"backwards"});
    { // calendar pages flip down week by week
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
  // ---- tick (pop) · pencil / plus open the editor instead of ticking
  root.addEventListener("click", e=>{
    const ed=e.target.closest("[data-pcfedit]"); if (ed){ e.stopPropagation(); e.preventDefault(); popEdit(ed.dataset.pcfedit, ed.closest(".pcfc")); return; }
    const nw=e.target.closest("[data-pcfnew]"); if (nw){ e.stopPropagation(); e.preventDefault(); popNew(+nw.dataset.pcfnew, nw); return; }
    const p=e.target.closest("[data-pay]"); if (p && !e.target.closest("[data-fxamt],#fxAmtIn")) F.pop=p.dataset.pay;
  }, true);
  root.addEventListener("contextmenu", e=>{ const c=e.target.closest(".pcfc"); if (c){ e.preventDefault(); popEdit(c.dataset.pcfid, c); } });
  root.addEventListener("keydown", e=>{ const p=e.target.closest && e.target.closest(".pcfc"); if (!p || e.target!==p) return;
    if (e.key==="Enter"||e.key===" "){ e.preventDefault(); p.click(); } else if (e.key==="F2"||e.key==="e"){ e.preventDefault(); popEdit(p.dataset.pcfid, p); } else if (e.key==="Delete"){ e.preventDefault(); popEdit(p.dataset.pcfid, p, true); } });
  // ---- drag a fixed cost onto another day: it stays there from this month on
  let ghost=null;
  root.addEventListener("dragstart", e=>{ const c=e.target.closest && e.target.closest(".pcfc"); if (!c) return; popClose(); F.drag=c.dataset.pcfid; e.dataTransfer.effectAllowed="move"; try { e.dataTransfer.setData("text/plain", F.drag); } catch(_){}
    ghost=c.cloneNode(true); ghost.classList.add("pcfghost"); ghost.style.width=c.offsetWidth+"px"; document.body.appendChild(ghost); try { e.dataTransfer.setDragImage(ghost, 24, 18); } catch(_){}
    setTimeout(()=>{ c.classList.add("drag"); root.classList.add("dragging"); },0); });
  root.addEventListener("dragend", ()=>{ F.drag=null; if (ghost){ ghost.remove(); ghost=null; } root.classList.remove("dragging"); root.querySelectorAll(".drag,.over").forEach(x=>x.classList.remove("drag","over")); });
  root.addEventListener("dragover", e=>{ if (!F.drag) return; const d=e.target.closest("[data-pcfday]"); if (!d || d.classList.contains("x")) return; e.preventDefault(); root.querySelectorAll(".over").forEach(x=>x!==d&&x.classList.remove("over")); d.classList.add("over"); });
  root.addEventListener("dragleave", e=>{ const d=e.target.closest("[data-pcfday]"); if (d && !d.contains(e.relatedTarget)) d.classList.remove("over"); });
  root.addEventListener("drop", async e=>{ const d=e.target.closest("[data-pcfday]"), id=F.drag; if (!d || !id) return; e.preventDefault(); F.drag=null;
    const f=S.fixed.find(x=>x.id===id); if (!f) return; const n=+d.dataset.pcfday, ym=UI.ym; if ((dayOf(f,ym)||0)===n){ renderFix(); return; }
    const before=clean(f), data=clean(f); data.days=withDay(f,ym,n); delete data.day; F.fresh=id;
    if (await safe(()=>put("fixed", id, data))) toast(n?`${f.name}: ab ${monthName(ym)} am ${n}.`:`${f.name}: ohne festen Tag`, ()=>safe(()=>put("fixed", id, before)), "Rückgängig"); });
  // ---- the editor bubble (edit · delete · new)
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
    return `<div class="ph"><b>${f?esc(f.name):"Neue Fixkoste"}</b><button class="px" data-pfx aria-label="Schließen">${SV.x}</button></div>
      ${field("Name",`<input class="in" data-pf="name" value="${f?esc(f.name):""}" placeholder="z. B. Miete, Netflix, Versicherung" autocomplete="off">`)}
      <div class="pr2">${field(`Betrag ab ${esc(mon)}`,`<input class="in" data-pf="amount" inputmode="decimal" value="${f?esc(numStr(listAmt(f,ym))):""}" placeholder="0,00">`)}
        ${field("Tag",`<select class="in" data-pf="day"><option value="0">ohne</option>${Array.from({length:D},(_,i)=>`<option value="${i+1}" ${day===i+1?"selected":""}>${i+1}.</option>`).join("")}</select>`)}</div>
      <div class="pr2">${field("Rhythmus",`<select class="in" data-pf="rhythm">${RHYTHMS.filter(r=>r[0]!=="monate").map(([k,l])=>`<option value="${k}" ${(f&&f.rhythm||"monatlich")===k?"selected":""}>${l}</option>`).join("")}${f&&f.rhythm==="monate"?`<option value="monate" selected>Bestimmte Monate</option>`:""}</select>`)}
        ${field("Art",`<select class="in" data-pf="kind"><option value="privat" ${!f||f.kind!=="betrieb"?"selected":""}>Privat</option><option value="betrieb" ${f&&f.kind==="betrieb"?"selected":""}>Betrieblich</option></select>`)}</div>
      <div class="small muted pnote">${f?`Änderungen gelten ab ${esc(mon)} – frühere Monate bleiben, wie sie waren.`:`Gilt ab ${esc(mon)} für alle folgenden Monate.`}</div>
      <div class="pa">${f?`<button class="btn pdel" data-pfdel>${SV.bin}<span>Löschen</span></button>`:""}<span style="flex:1"></span><button class="btn" data-pfx>Abbrechen</button><button class="btn primary" data-pfok>${f?"Speichern":"Eintragen"}</button></div>`;
  }
  function popEdit(id, anchor, del){ const f=S.fixed.find(x=>x.id===id); if (!f || !anchor) return; popFor={id, anchor}; pop.innerHTML=form(f, dayOf(f,UI.ym)); pop.hidden=false; place(anchor);
    const el=pop.querySelector(del?"[data-pfdel]":"[data-pf=name]"); if (el){ el.focus(); if (el.select) el.select(); } }
  function popNew(day, anchor){ if (!anchor) return; popFor={id:null, day, anchor}; pop.innerHTML=form(null, day); pop.hidden=false; place(anchor); pop.querySelector("[data-pf=name]").focus(); }
  const val=k=>{ const el=pop.querySelector(`[data-pf="${k}"]`); return el?el.value:""; };
  async function popSave(){
    const ym=UI.ym, name=val("name").trim(), v=parseAmt(val("amount")||"0"), day=+val("day")||0, rh=val("rhythm"), kind=val("kind");
    if (!name){ const n=pop.querySelector("[data-pf=name]"); n.focus(); if (!pcCalm()) n.animate([{transform:"translateX(0)"},{transform:"translateX(-6px)"},{transform:"translateX(6px)"},{transform:"translateX(-3px)"},{transform:"none"}],{duration:300}); return; }
    if (!(v>=0)){ toast("Betrag ungültig"); return; }
    const nv=Math.round(v*100)/100, cm=Number(ym.slice(5,7));
    if (!popFor.id){
      const id=newId(), d={name, amount:nv, kind, order:S.fixed.length, from:ym, days:[{from:ym, day}]};
      if (rh!=="monatlich"){ d.rhythm=rh; d.months=rhythmMonths(rh, cm); }
      F.fresh=id; popClose(); if (await safe(()=>put("fixed", id, d))) toast(`${name} eingetragen`, ()=>safe(()=>del("fixed", id)), "Rückgängig"); return;
    }
    const f=S.fixed.find(x=>x.id===popFor.id); if (!f){ popClose(); return; }
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
    // earlier months keep it (with their ticks) – it only disappears from this month on
    const used=Object.keys(S.months).some(k=>k<ym && S.months[k] && S.months[k].paid && f.id in S.months[k].paid) || (f.from && f.from<ym);
    popClose();
    // ticks of this and later months go with it (undo brings them back)
    const ticks=Object.keys(S.months).filter(k=>k>=ym && S.months[k] && S.months[k].paid && f.id in S.months[k].paid).map(k=>[k, clone(S.months[k])]);
    const unTick=async()=>{ for (const [k,mo] of ticks){ const n=clone(mo); delete n.paid[f.id]; await put("months", k, n); } };
    const reTick=async()=>{ for (const [k,mo] of ticks) await put("months", k, mo); };
    const go=async()=>{ if (used){ const d=clean(f); d.until=shiftYm(ym,-1); if (await safe(async()=>{ await unTick(); await put("fixed", f.id, d); })) toast(`${f.name} ab ${monthName(ym)} gelöscht`, ()=>safe(async()=>{ await put("fixed", f.id, before); await reTick(); }), "Rückgängig"); }
      else if (await safe(async()=>{ await unTick(); await del("fixed", f.id); })) toast(`${f.name} gelöscht`, ()=>safe(async()=>{ await put("fixed", f.id, before); await reTick(); }), "Rückgängig"); };
    // puff: the chip shrinks, spins a little and is gone
    if (anchor && anchor.isConnected && !pcCalm()){ anchor.style.pointerEvents="none"; const a=anchor.animate([{opacity:1,transform:"none",filter:"blur(0)"},{opacity:.9,transform:"scale(1.06)",offset:.25},{opacity:0,transform:"scale(.3) rotate(-8deg)",filter:"blur(3px)"}],{duration:380,easing:"cubic-bezier(.5,0,.75,0)",fill:"forwards"}); a.onfinish=go; }
    else go();
  }
  pop.addEventListener("click", e=>{ e.stopPropagation();
    if (e.target.closest("[data-pfx]")) return popClose();
    if (e.target.closest("[data-pfok]")) return popSave();
    const db=e.target.closest("[data-pfdel]"); if (db){ if (db.classList.contains("arm")) return popDelete(); db.classList.add("arm"); db.querySelector("span").textContent="Wirklich löschen?"; setTimeout(()=>{ if (db.isConnected){ db.classList.remove("arm"); db.querySelector("span").textContent="Löschen"; } }, 3500); } });
  pop.addEventListener("keydown", e=>{ if (e.key==="Escape"){ e.stopPropagation(); popClose(); } else if (e.key==="Enter" && e.target.tagName!=="BUTTON"){ e.preventDefault(); popSave(); } });
  document.addEventListener("mousedown", e=>{ if (!pop.hidden && !pop.contains(e.target) && !e.target.closest("[data-pcfedit],[data-pcfnew]")) popClose(); }, true);
  addEventListener("resize", ()=>popClose());
  document.addEventListener("scroll", ()=>{ if (!pop.hidden && popFor && popFor.anchor && popFor.anchor.isConnected){ const r=popFor.anchor.getBoundingClientRect(); if (r.bottom<0||r.top>innerHeight) popClose(); } }, true);
}

/* ---------- Buchungen: entrance when the page comes into view – the day cards are dealt like playing cards ---------- */
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
