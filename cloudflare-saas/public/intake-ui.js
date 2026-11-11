// One editor and one server-reviewed confirmation for all consumed-food sources.
import {nutritionOverview,diaryNavigation,validDiaryDay} from './diary-model.js';
const MEALS={breakfast:'Завтрак',lunch:'Обед',dinner:'Ужин',snack:'Перекус'};
const NUTRIENTS=[['energy_kcal','Энергия','ккал'],['protein_g','Белки','г'],['fat_g','Жиры','г'],['carbohydrate_total_g','Общие углеводы','г'],['fiber_g','Клетчатка','г'],['available_carbohydrate_g','Доступные углеводы','г']];
const number=(n,digits=1)=>n==null?'нет данных':new Intl.NumberFormat('ru-RU',{maximumFractionDigits:digits}).format(n);
function savedCheck(el){const mark=el('span','saved-check');mark.setAttribute('aria-hidden','true');mark.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" focusable="false"><path pathLength="1" d="m4 12 5 5L20 6"/></svg>';return mark}
export function profileClock(zone,now=new Date()){
 if(!zone)return null;
 try{const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).map(x=>[x.type,x.value]));return {date:`${p.year}-${p.month}-${p.day}`,time:`${p.hour}:${p.minute}`}}catch{return null}
}
function dayLabel(day){try{return new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric'}).format(new Date(day+'T12:00:00'))}catch{return day||'Дата не указана'}}
export function intakeAmount(entry){return entry?.amount||(entry?.food_id&&entry?.grams!=null?{value:entry.grams,unit:'g'}:entry?.recipe_id&&entry?.portions!=null?{value:entry.portions,unit:'portion'}:null)}
export function intakeName(entry){if(entry?.source_mode==='unquantified'&&!entry?.recipe_id&&!entry?.food_id)return 'Заметка';return entry?.name_ru||entry?.nutrition_snapshot?.name_ru||entry?.nutrition_snapshot?.source?.name_ru||(entry?.note?'Заметка':'Запись о питании')}
export function amountLabel(amount){return !amount?'Количество не указано':`${number(amount.value,3)} ${amount.unit==='g'?'г':amount.unit==='batch'?'всего блюда':'порции'}`}
function entryClock(entry){if(entry?.time)return entry.time;return entry?.eaten_at?profileClock(entry.timezone,new Date(entry.eaten_at))?.time:null}
export function nutritionNodes(el,calculation){
 const grid=el('dl','intake-nutrients'),nutrition=calculation?.nutrition||{},coverage=calculation?.coverage||{};
 for(const [key,label,unit] of NUTRIENTS){const value=nutrition[key],known=coverage[key]?.known_subtotal;grid.append(el('dt','',label),el('dd','',(value==null||coverage[key]?.complete===false)?(known==null||known===0?'нет данных · неполные данные':`учтено ${number(known,key==='energy_kcal'?0:1)} ${unit} · неполные данные`):`${number(value,key==='energy_kcal'?0:1)} ${unit}`))}

 return [grid];
}
export function intakeReviewNodes(el,preview){
 const entry=preview?.entry||{},clock=entryClock(entry),nodes=[el('h4','',intakeName(entry)),el('p','',amountLabel(intakeAmount(entry))),el('p','',`${dayLabel(entry.date)} · ${clock||'время не указано'}`)];
 if(entry.timezone)nodes.push(el('p','muted','Часовой пояс: '+entry.timezone));
 if(MEALS[entry.meal])nodes.push(el('p','',MEALS[entry.meal]));
 if(entry.note&&entry.note!==intakeName(entry))nodes.push(el('p','',entry.note));
 if(preview?.calculation||intakeAmount(entry))nodes.push(...nutritionNodes(el,preview?.calculation));
 if(preview?.legacy_estimate)nodes.push(el('p','notice','Для старой записи состав пересчитан по текущему справочнику. Исторический расчёт не сохранился.'));
 if(preview?.issues?.some(x=>String(x).startsWith('allergen:')))nodes.push(el('p','notice','В составе отмечен аллерген из вашего профиля. Запись фиксирует съеденное и не рекомендует этот продукт.'));
 if(preview?.issues?.includes('allergens_unknown'))nodes.push(el('p','muted','Сведения об аллергенах для этой записи не сохранились.'));
 if(!preview?.calculation)nodes.push(el('p','muted','Количество или состав неизвестны. Эта запись не добавит выдуманные значения к итогам.'));
 const references=entry.nutrition_snapshot?.source?.source_urls||entry.nutrition_snapshot?.references||entry.nutrition_snapshot?.source_refs||preview?.sources||[];
 if(Array.isArray(references)&&references.length){const details=el('details');details.append(el('summary','','Источники состава'));for(const ref of references){const text=typeof ref==='string'?ref:[ref.name_ru||ref.title,ref.source_url||ref.source_ref||ref.url].filter(Boolean).join(' · ');if(text)details.append(el('p','muted',text))}nodes.push(details)}
 return nodes;
}

export function setupIntake({$,el,call,getState,accept,notify,run,openDialog,closeDialog,setView,epoch,isDiaryActive,propose}){
 let selection=null,submitting=false,generation=0,historyGeneration=0,day='',allDates=false,rows=[],historyRevision=null,loadedKey=null,loadingKey=null,loading=false,hasMore=false,receiptEntry=null,summary=null,displayKey=null,navigation=null,navigationAccount=null,zoneProposal=null,nextOffset=0,summaryContext=null;
 const form=$('intake-form'),summaryHelp=el('div','diary-summary-explanation'),incompleteNoteEl=el('p','ux-callout'),netGuide=el('details','ux-guide'),netBody=el('div','ux-guide-body');summaryHelp.id='diary-summary-explanation';summaryHelp.hidden=true;incompleteNoteEl.hidden=true;netBody.append(el('p','','Общие углеводы включают клетчатку. Net-углеводы («чистые») — расчёт после вычитания известной клетчатки; если по продукту нет данных о клетчатке, приложение не приравнивает её к нулю.'),el('p','','Полиолы автоматически не вычитаются. Итоги складываются из записей выбранного дня; для жиров нет искусственной «обязательной квоты».'));netGuide.append(el('summary','','Как считаются чистые (Net) углеводы и итоги?'),netBody);summaryHelp.append(incompleteNoteEl,netGuide);$('diary-summary').insertAdjacentElement?.('afterend',summaryHelp);
 function deviceZone(){return Intl.DateTimeFormat().resolvedOptions().timeZone}
 function stateDay(){return profileClock(getState()?.profile?.timezone)?.date||profileClock(deviceZone())?.date||new Date().toISOString().slice(0,10)}
 function rememberNavigation(){navigation?.save(day,allDates)}
 function ensureNavigation(){const account=getState()?.profile?.owner_account_id;if(account!==navigationAccount){navigationAccount=account;let storage;try{storage=globalThis.sessionStorage}catch{}navigation=diaryNavigation(storage,account);const saved=navigation.read();day=saved?.day||stateDay();allDates=saved?.allDates||false}}
 function zoneControls(){const zone=selection?.entry?.timezone||getState()?.profile?.timezone,valid=Boolean(profileClock(zone));$('intake-zone').textContent=valid?'Время · '+zone:'Для записи подтвердите часовой пояс.';$('intake-zone-confirm').hidden=valid;$('intake-zone-name').textContent=deviceZone();$('intake-now').hidden=!valid;$('intake-time').disabled=!valid;$('intake-clear-time').hidden=!valid||!$('intake-time').value;return valid}
 function validScope(token,stamp){return token===generation&&stamp===epoch()}
 function showStatus(message){$('intake-status').textContent=message||''}
 function buttons(){ $('intake-fields').disabled=submitting;$('intake-review').disabled=submitting;$('intake-review').textContent=submitting?'Проверяем запись…':'Проверить запись'; }
 function open(source={}){
  generation++;selection=structuredClone(source);form.reset();showStatus('');buttons();
  const entry=source.entry,operation=source.operation||'add',amount=source.amount||intakeAmount(entry)||(source.food_id?{value:100,unit:'g'}:{value:1,unit:'portion'});
  const choosing=!entry&&!source.recipe_id&&!source.food_id;
  $('intake-choice').hidden=!choosing;form.hidden=choosing;
  $('intake-title').textContent=operation==='update'?'Исправить запись':operation==='repeat'?'Повторить запись':'Записать съеденное';
  $('intake-name').textContent=choosing?'Выберите, что добавить.':source.name_ru||intakeName(entry);
  if(!choosing){
   const hasAmount=operation==='add'||Boolean(intakeAmount(entry));$('intake-amount-row').hidden=!hasAmount;$('intake-amount-help').hidden=!hasAmount;$('intake-amount').required=hasAmount;
   $('intake-unit').replaceChildren();for(const [value,label]of(amount.unit==='g'?[['g','Граммы']]:[['portion','Порции'],['batch','Доля блюда']])){const o=el('option','',label);o.value=value;$('intake-unit').append(o)}
   $('intake-unit').value=amount.unit;$('intake-amount').value=String(amount.value);$('intake-unit').disabled=amount.unit==='g';
   $('intake-date').value=operation==='update'?entry.date:day||stateDay();
   setTime(operation==='update'?entryClock(entry)||'':'');
   for(const option of Array.from($('intake-meal').options||[]))if(option.dataset.legacy)option.remove();if(entry?.meal&&!MEALS[entry.meal]){const option=el('option','',entry.meal);option.value='legacy';option.dataset.legacy='true';$('intake-meal').append(option)}$('intake-meal').value=entry?.meal?(MEALS[entry.meal]?entry.meal:'legacy'):'';$('intake-note').value=entry?.note||'';selection.initial={date:$('intake-date').value,time:$('intake-time').value||null,meal:$('intake-meal').value,note:$('intake-note').value.trim()};
   zoneControls();
   $('intake-note-options').open=false;$('intake-time-detail').open=false;$('intake-fold').value='';
   updateAmountHelp();
  }
  openDialog('intake',choosing?'intake-recipe':$('intake-amount-row').hidden?'intake-date':'intake-amount');
 }
 function updateAmountHelp(){const u=$('intake-unit').value;$('intake-amount-help').textContent=u==='batch'?'1 — всё приготовленное блюдо; 0,5 — половина всего блюда.':u==='portion'?'1 — одна порция рецепта; 0,5 — половина одной порции.':'Масса съеденного продукта. Миллилитры не приравниваются к граммам.'}
 $('intake-unit').onchange=updateAmountHelp;
 // WebKit can dispatch invalid on an empty optional time after clearing its
 // segmented editor even while validity.valid is true. Recreate that editor's
 // empty state; required/date/amount and server validation remain intact.
 function setTime(value){const input=$('intake-time');if(!value){input.type='text';input.value='';input.type='time'}else input.value=value;$('intake-clear-time').hidden=!value}
 $('intake-time').oninput=()=>{$('intake-clear-time').hidden=!$('intake-time').value};
 $('intake-clear-time').onclick=()=>{setTime('');$('intake-now').focus({preventScroll:true})};
 $('intake-zone-confirm').onclick=()=>run(async()=>{const zone=deviceZone();if(!profileClock(zone)){showStatus('Выберите часовой пояс в профиле.');return}const result=await propose('profile.update',{timezone:zone});zoneProposal=result?.proposal?.id||null});
 $('intake-now').onclick=()=>{const clock=profileClock(selection?.entry?.timezone||getState()?.profile?.timezone);if(!clock){showStatus('Сначала подтвердите часовой пояс в профиле.');return}$('intake-date').value=clock.date;$('intake-time').value=clock.time;$('intake-clear-time').hidden=false};
 $('intake-close').onclick=()=>closeDialog();
 $('intake-recipe').onclick=()=>setView('recipes');$('intake-product').onclick=()=>setView('products');
 $('intake-note-choice').onclick=()=>{setView('diary');$('diary-note-details').open=true;$('diary-date').value=day||stateDay();$('diary-note').focus()};
 form.onsubmit=e=>{e.preventDefault();if(submitting||!selection)return;run(async()=>{
  if((selection.operation||'add')==='add'&&!profileClock(getState()?.profile?.timezone)){showStatus('Подтвердите часовой пояс кнопкой выше. Количество и дата останутся в форме.');$('intake-zone-confirm').focus();return}
  const values={operation:selection.operation||'add'},time=$('intake-time').value||null;
  if(values.operation!=='update'||$('intake-date').value!==selection.initial?.date)values.date=$('intake-date').value;
  // Omit unchanged fields on edits: old records can lack a historical calculation,
  // and a displayed HH:mm value must not erase stored seconds or a DST fold.
  if(values.operation!=='update'||time!==selection.initial?.time)values.time=time;
  if(selection.origin)values.origin=structuredClone(selection.origin);if(selection.generation_id)values.generation_id=selection.generation_id;
  if(selection.entry)values.entry_id=selection.entry.entry_id;else if(selection.food_id)values.food_id=selection.food_id;else values.recipe_id=selection.recipe_id;
  if(!$('intake-amount-row').hidden){const value=Number($('intake-amount').value.trim().replace(',','.'));if(!Number.isFinite(value)||value<=0){showStatus('Укажите количество больше нуля.');return}const amount={value,unit:$('intake-unit').value},original=intakeAmount(selection.entry);if(values.operation!=='update'||original?.value!==amount.value||original?.unit!==amount.unit)values.amount=amount}
  const meal=$('intake-meal').value,note=$('intake-note').value.trim();
  if(meal!=='legacy'&&(values.operation!=='update'||meal!==selection.initial?.meal))values.meal=meal;
  if(values.operation!=='update'||note!==selection.initial?.note)values.note=note;
  if($('intake-fold').value!=='')values.time_fold=Number($('intake-fold').value);
  const token=generation,stamp=epoch(),thread=selection.thread_id||getState().active_thread||'main';submitting=true;buttons();showStatus('');
  try{const result=await call('keto_kitchen',{action:'intake',thread_id:thread,values,expected_revision:selection.revision??getState().revision});if(stamp!==epoch())return;const stillOpen=validScope(token,stamp)&&$('intake-dialog').open;accept(stillOpen?result:{...result,proposal:null,message:'Запись ожидает проверки. Откройте подтверждения вверху.'})}
  catch(error){if(validScope(token,stamp)){showStatus(error.message);if(/дважды|неоднознач|двусмыслен|переход.*час|перевод.*час/i.test(error.message)){$('intake-note-options').open=true;$('intake-time-detail').open=true}}}
  finally{if(stamp===epoch()){submitting=false;buttons()}}
 })};
 function renderSummary(summary){
  const box=$('diary-summary');box.replaceChildren();box.hidden=allDates;summaryHelp.hidden=allDates;
  if(allDates)return;
  const overview=nutritionOverview(summary,summaryContext||getState());
  incompleteNoteEl.textContent=overview.incompleteNote||'';incompleteNoteEl.hidden=!overview.incompleteNote;
  if(!summary)return;
  if(!overview.count)return;
  const heading=el('div','diary-summary-heading');heading.append(el('h2','','Питание за день'),el('span','muted','По записям'));box.append(heading);
  const grid=el('div','diary-macros');
  for(const item of overview.cards){const card=el('article','diary-macro '+item.icon);card.dataset.nutrient=item.key;card.dataset.status=item.tone;
   const title=el('div','macro-heading'),icon=el('span','macro-icon');icon.dataset.icon=item.icon;icon.setAttribute('aria-hidden','true');title.append(icon,el('h3','',item.label));
   const value=el('p','macro-value',item.text),target=el('p','macro-target',item.goal?item.goal:item.icon==='fat'?'Без цели':overview.paused?'Сравнение на паузе':overview.stale?'Нужно обновить ориентир':'Цель не задана');
   card.append(title,value,target);
   if(item.progress!==null){const meter=el('progress','macro-progress');meter.max=1;meter.value=item.progress;meter.setAttribute('aria-label',`${item.label}: ${item.text}; ориентир ${item.goal}`);card.append(meter)}
   const status=el('span','macro-status sr-only',item.status);card.setAttribute('aria-label',`${item.label}: ${item.text}. ${item.goal?'Текущий ориентир '+item.goal+'. ':''}${item.status}`);card.append(status);grid.append(card);
  }
  box.append(grid);
  const note=el('p',overview.incomplete?'diary-summary-note':'sr-only',overview.incomplete?`Неполных записей: ${overview.incomplete}. Учтена известная часть состава.`:'Итоги всех записей за день, включая ещё не показанные.');box.append(note);if(overview.paused||overview.stale)box.append(el('p','diary-summary-note',overview.targetsNote));
  const goals=el('button','text-btn diary-goals',overview.stale?'Обновить ориентиры':overview.agreed?'Текущие ориентиры':'Настроить ориентиры');goals.type='button';goals.setAttribute('aria-label',goals.textContent);goals.title=goals.textContent;goals.textContent='';goals.classList.add('icon-only');goals.dataset.icon='plan';goals.onclick=()=>setView(overview.agreed?'targets':'setup');heading.append(goals);
 }
 function renderRows(){
  const box=$('diary-entries');box.replaceChildren();
  $('diary-discuss').hidden=allDates||!rows.length;
  if(!rows.length&&!loading&&loadedKey===historyKey()){const empty=el('div','diary-empty'),icon=el('span','diary-empty-icon');icon.dataset.icon='plate';icon.setAttribute('aria-hidden','true');empty.append(icon,el('h2','',allDates?'Здесь будет ваша история':'Что было на тарелке?'),el('p','muted',allDates?'Запишите съеденное — оно появится здесь вместе с составом и временем.':'За этот день пока нет записей. Добавьте блюдо или продукт — здесь появятся еда и итоги дня.'));const add=el('button','primary','Добавить еду');add.dataset.icon='plus';add.onclick=()=>open();empty.append(add);box.append(empty)}
  const visible=(!allDates&&receiptEntry?.date===day&&receiptEntry.receiptRevision===historyRevision&&!rows.some(entry=>entry.entry_id===receiptEntry.entry_id))?[receiptEntry,...rows]:rows;
  const ordered=allDates?visible:[...visible].sort((a,b)=>(entryClock(a)||'99:99').localeCompare(entryClock(b)||'99:99'));
  const groups=new Map();
  for(const entry of ordered){const key=[allDates?entry.date:'',entry.meal||'other'].join('|');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(entry)}
  for(const entries of groups.values()){
   const first=entries[0],group=el('section','diary-meal'),heading=el('div','diary-meal-heading'),icon=el('span','meal-icon');icon.dataset.icon=({breakfast:'sunrise',lunch:'sun',dinner:'moon',snack:'apple'})[first.meal]||'plate';icon.setAttribute('aria-hidden','true');
   heading.append(icon,el('h2','',[allDates?dayLabel(first.date):null,MEALS[first.meal]||first.meal||'Без приёма пищи'].filter(Boolean).join(' · ')));group.append(heading);
   for(const entry of entries){const card=el('article','diary-entry');card.dataset.entryId=entry.entry_id;if(entry.entry_id===receiptEntry?.entry_id)card.classList.add('just-saved');
   const clock=entryClock(entry),meta=el('p','diary-entry-meta',clock||'Время не указано');meta.dataset.icon='clock';
   const title=el('div','diary-entry-title');title.append(el('h3','',intakeName(entry)),meta);card.append(title);
   const amount=intakeAmount(entry);if(amount)card.append(el('p','',amountLabel(amount)));
   if(entry.note&&entry.note!==intakeName(entry))card.append(el('p','muted',entry.note));
   const calc=entry.calculation||entry.nutrition_snapshot?.calculation;
   if(calc?.nutrition){const nutrients=el('div','entry-nutrients');for(const [key,label,unit] of NUTRIENTS.slice(0,4)){const value=calc.nutrition[key],complete=value!=null&&calc.coverage?.[key]?.complete!==false;nutrients.append(el('span','',`${key==='energy_kcal'?'':label+' '}${complete?number(value,key==='energy_kcal'?0:1)+' '+unit:'—'}`))}card.append(nutrients)}
   if(!entry.complete)card.append(el('p','entry-coverage','Состав известен не полностью'));
   if(entry.legacy_estimate)card.append(el('p','muted','Состав пересчитан по текущему справочнику.'));
   const actions=el('div','diary-actions');for(const [label,operation]of [['Исправить','update'],['Повторить','repeat']]){const b=el('button','text-btn',label);b.type='button';if(operation==='repeat'){b.title='Откроется новая запись с этим блюдом — проверьте количество и дату';b.setAttribute('aria-description',b.title)}b.onclick=()=>open({operation,entry,revision:historyRevision});actions.append(b)}
   const more=el('details','diary-entry-more'),toggle=el('summary','icon-only');toggle.dataset.icon='more';toggle.setAttribute('aria-label','Ещё: '+intakeName(entry));more.append(toggle);const del=el('button','text-btn danger-button','Удалить запись');del.type='button';del.onclick=()=>run(()=>propose('diary.delete',{entry_id:entry.entry_id},historyRevision));more.append(del);actions.append(more);card.append(actions);group.append(card);
   }box.append(group);
  }
  $('diary-more').hidden=!hasMore;$('diary-more').disabled=loading;
 }
 async function load(append=false){
  if(!getState()?.profile?.consent?.storage||!getState()?.profile?.consent?.health_data)return;
  if(!day)day=stateDay();
  const token=++historyGeneration,stamp=epoch(),key=historyKey(),current=()=>token===historyGeneration&&stamp===epoch(),values={offset:append?nextOffset:0,limit:30};if(!allDates)values.date=day;
  const args={action:'diary_history',values};if(append)args.expected_revision=historyRevision;
  loading=true;loadingKey=key;$('diary-status').textContent='Загружаем записи…';$('diary-more').disabled=true;
  if(!append&&displayKey!==[day,allDates].join('|')){rows=[];hasMore=false;summary=null;displayKey=[day,allDates].join('|');renderSummary(null);renderRows()}
  try{const result=await call('keto_kitchen',args);if(!current())return;
   if(receiptEntry&&result.revision<historyRevision)throw Error('История ещё обновляется. Сохранённая запись остаётся на экране.');
   $('diary-refresh').hidden=true;rows=[...new Map((append?[...rows,...result.entries]:result.entries).map(entry=>[entry.entry_id,entry])).values()];historyRevision=result.revision;loadedKey=key;hasMore=result.has_more;nextOffset=(result.offset||0)+result.entries.length;loading=false;summary=result.summary;summaryContext=result.nutrition_context||((result.revision===getState()?.revision)?null:{profile:{}});
   renderSummary(summary);renderRows();$('diary-status').textContent=allDates&&rows.length?`Показано ${rows.length} из ${result.total}`:'';
   }catch(error){if(!current())return;loading=false;loadedKey=null;hasMore=false;$('diary-status').textContent=(rows.length?'Не удалось обновить историю. Показаны уже полученные записи. ':'Не удалось загрузить записи. ')+error.message;renderRows();$('diary-more').hidden=true;$('diary-refresh').hidden=false}
   finally{if(current()){loading=false;loadingKey=null;if($('diary-status').textContent.startsWith('Загружаем'))$('diary-status').textContent=''}}
 }
 function historyKey(){return [day,allDates,getState()?.revision].join('|')}
 function render(){
  ensureNavigation();if(summaryContext&&getState()?.revision>historyRevision)summaryContext=null;
  if(!day)day=stateDay();$('diary-day').value=day;$('diary-day-label').textContent=dayLabel(day);$('diary-all').textContent=allDates?'К выбранному дню':'Вся история';$('diary-day-controls').hidden=allDates;
  const zone=getState()?.profile?.timezone;$('diary-zone-note').textContent=[profileClock(zone)?`День дневника — по часовому поясу профиля: ${zone}.`:'Дата просмотра — по времени устройства.',allDates?'Показаны записи за разные даты. Дневные итоги рассчитываются при выборе одного дня.':''].filter(Boolean).join(' ');
  if(!loading&&$('diary-status').textContent.startsWith('Загружаем'))$('diary-status').textContent='';
  renderSummary(displayKey===[day,allDates].join('|')?summary:null);
  if(isDiaryActive()&&loadedKey!==historyKey()&&(!loading||loadingKey!==historyKey()))run(()=>load());
 }
 function selectDate(next){if(!validDiaryDay(next)){render();return}day=next;allDates=false;loadedKey=null;rememberNavigation();$('diary-receipt').hidden=receiptEntry?.date!==day;render();if(!isDiaryActive())setView('diary')}
 $('diary-day').onchange=()=>selectDate($('diary-day').value);
 for(const [id,delta]of [['diary-prev',-1],['diary-next',1]])$(id).onclick=()=>{if(!day)return;const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+delta);selectDate(d.toISOString().slice(0,10))};
 $('diary-today').onclick=()=>selectDate(stateDay());
 $('diary-all').onclick=()=>{allDates=!allDates;loadedKey=null;rememberNavigation();$('diary-receipt').hidden=true;render()};
 $('diary-more').onclick=()=>run(()=>load(true));$('diary-refresh').onclick=()=>{$('diary-refresh').hidden=true;run(()=>load())};
 $('diary-add').onclick=()=>open();
 $('diary-discuss').onclick=()=>{setView('chat');const input=$('message');input.value=(input.value.trim()?input.value.trim()+'\n\n':'')+`Обсудим мой дневник за ${day}: что уже съедено, как это соотносится с моими сохранёнными ориентирами и что учесть при выборе следующего приёма пищи?`;input.dispatchEvent(new Event('input',{bubbles:true}));input.focus()};
 function afterApplied(result){
  if(zoneProposal&&result?.state&&!result.state.pending?.some(p=>p.id===zoneProposal)){zoneProposal=null;if(selection){selection.revision=result.state.revision;zoneControls();if(selection.generation_id&&result.receipt?.type==='profile.update'){$('intake-choice').hidden=false;form.hidden=true;$('intake-name').textContent='Часовой пояс сохранён. Подбор обновился — выберите блюдо заново.';selection=null;openDialog('intake','intake-recipe')}else openDialog('intake','intake-date')}}
  if(!result?.receipt)return;
  summaryContext=null;loadedKey=null;if(result.receipt.type==='diary.delete'){$('diary-receipt').hidden=true;receiptEntry=null;historyGeneration++;loading=false;rows=rows.filter(entry=>entry.entry_id!==result.deleted_entry_id);historyRevision=result.receipt.revision;if(result.diary_summary?.date===day)summary=result.diary_summary;else summary=null;renderSummary(summary);renderRows()}
  if(result.entry){historyGeneration++;loading=false;receiptEntry={...result.entry,receiptRevision:result.receipt.revision};day=result.entry.date;allDates=false;rememberNavigation();rows=[result.entry,...rows.filter(entry=>entry.date===day&&entry.entry_id!==result.entry.entry_id)];historyRevision=result.receipt.revision;summary=result.diary_summary;displayKey=[day,allDates].join('|');hasMore=false;renderSummary(summary);renderRows();const box=$('diary-receipt');box.hidden=false;const text=el('p','receipt-heading');text.append(savedCheck(el),el('span','','Сохранено в дневнике · '+dayLabel(day)));box.replaceChildren(text,el('p','receipt-food',intakeName(result.entry)+' · '+amountLabel(intakeAmount(result.entry))));setView('diary',{resetScroll:true});$('content').scrollTop=0}
  render();
 }
 function reset(){generation++;historyGeneration++;navigation?.clear();navigation=null;navigationAccount=null;zoneProposal=null;selection=null;submitting=false;day='';allDates=false;rows=[];summary=null;summaryContext=null;displayKey=null;historyRevision=null;loadedKey=null;loadingKey=null;loading=false;hasMore=false;receiptEntry=null;form.reset();showStatus('');$('intake-name').textContent='';$('intake-zone').textContent='';$('diary-summary').replaceChildren();incompleteNoteEl.textContent='';incompleteNoteEl.hidden=true;netGuide.open=false;summaryHelp.hidden=true;$('diary-receipt').replaceChildren();$('diary-receipt').hidden=true;$('diary-status').textContent='';$('diary-day').value='';$('diary-more').hidden=true;$('diary-discuss').hidden=true;buttons()}
 return {open,render,afterApplied,reset,selectDate,reload:()=>load(),get selectedDate(){return day}};
}
