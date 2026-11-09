// One editor and one server-reviewed confirmation for all consumed-food sources.
const MEALS={breakfast:'Завтрак',lunch:'Обед',dinner:'Ужин',snack:'Перекус'};
const NUTRIENTS=[['energy_kcal','Энергия','ккал'],['protein_g','Белки','г'],['fat_g','Жиры','г'],['carbohydrate_total_g','Общие углеводы','г'],['fiber_g','Клетчатка','г']];
const number=(n,digits=1)=>n==null?'нет данных':new Intl.NumberFormat('ru-RU',{maximumFractionDigits:digits}).format(n);
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
 for(const [key,label,unit] of NUTRIENTS){const value=nutrition[key],known=coverage[key]?.known_subtotal;grid.append(el('dt','',label),el('dd','',(value==null||coverage[key]?.complete===false)?(known==null?'нет данных':`учтено ${number(known,key==='energy_kcal'?0:1)} ${unit} · неполные данные`):`${number(value,key==='energy_kcal'?0:1)} ${unit}`))}
 if(calculation?.available_carbohydrate_g!=null)grid.append(el('dt','','Доступные углеводы'),el('dd','',number(calculation.available_carbohydrate_g)+' г'));
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
 let selection=null,submitting=false,generation=0,historyGeneration=0,day='',allDates=false,rows=[],historyRevision=null,loadedKey=null,loadingKey=null,loading=false,hasMore=false,receiptEntry=null;
 const form=$('intake-form');
 function stateDay(){return profileClock(getState()?.profile?.timezone)?.date||''}
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
   $('intake-unit').replaceChildren();for(const [value,label]of(amount.unit==='g'?[['g','Граммы']]:[['portion','Порции'],['batch','Доля всего блюда']])){const o=el('option','',label);o.value=value;$('intake-unit').append(o)}
   $('intake-unit').value=amount.unit;$('intake-amount').value=String(amount.value);$('intake-unit').disabled=amount.unit==='g';
   $('intake-date').value=operation==='update'?entry.date:day||stateDay();
   $('intake-time').value=operation==='update'?entryClock(entry)||'':'';
   for(const option of Array.from($('intake-meal').options||[]))if(option.dataset.legacy)option.remove();if(entry?.meal&&!MEALS[entry.meal]){const option=el('option','',entry.meal);option.value='legacy';option.dataset.legacy='true';$('intake-meal').append(option)}$('intake-meal').value=entry?.meal?(MEALS[entry.meal]?entry.meal:'legacy'):'';$('intake-note').value=entry?.note||'';selection.initial={date:$('intake-date').value,time:$('intake-time').value||null,meal:$('intake-meal').value,note:$('intake-note').value.trim()};
   const zone=entry?.timezone||getState()?.profile?.timezone;
   $('intake-zone').textContent=zone?'Время еды · '+zone:'Для времени еды подтвердите часовой пояс в профиле.';
   $('intake-note-options').open=false;$('intake-time-detail').open=false;$('intake-fold').value='';
   updateAmountHelp();
  }
  openDialog('intake',choosing?'intake-recipe':$('intake-amount-row').hidden?'intake-date':'intake-amount');
 }
 function updateAmountHelp(){const u=$('intake-unit').value;$('intake-amount-help').textContent=u==='batch'?'1 — всё приготовленное блюдо; 0,5 — половина всего блюда.':u==='portion'?'1 — одна порция рецепта; 0,5 — половина одной порции.':'Масса съеденного продукта. Миллилитры не приравниваются к граммам.'}
 $('intake-unit').onchange=updateAmountHelp;
 $('intake-now').onclick=()=>{const clock=profileClock(selection?.entry?.timezone||getState()?.profile?.timezone);if(!clock){showStatus('Сначала подтвердите часовой пояс в профиле.');return}$('intake-date').value=clock.date;$('intake-time').value=clock.time};
 $('intake-close').onclick=()=>closeDialog();
 $('intake-recipe').onclick=()=>setView('recipes');$('intake-product').onclick=()=>setView('products');
 $('intake-note-choice').onclick=()=>{setView('diary');$('diary-note-details').open=true;$('diary-date').value=day||stateDay();$('diary-note').focus()};
 form.onsubmit=e=>{e.preventDefault();if(submitting||!selection)return;run(async()=>{
  const values={operation:selection.operation||'add'},time=$('intake-time').value||null;
  if(values.operation!=='update'||$('intake-date').value!==selection.initial?.date)values.date=$('intake-date').value;
  // Omit unchanged fields on edits: old records can lack a historical calculation,
  // and a displayed HH:mm value must not erase stored seconds or a DST fold.
  if(values.operation!=='update'||time!==selection.initial?.time)values.time=time;
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
  const box=$('diary-summary');box.replaceChildren();box.hidden=allDates;
  if(allDates||!summary)return;
  const count=summary.entry_count??summary.entries_count??summary.recorded_entries??(summary.known_entries||0)+(summary.unquantified_entries||0);
  if(summary.empty===true||count===0){box.append(el('p','muted','На эту дату записей пока нет.'));return}
  box.append(el('h2','','Итоги записей'),...nutritionNodes(el,{nutrition:summary.nutrition,coverage:summary.coverage}));
  const incomplete=summary.incomplete_entries??summary.unquantified_entries??0;
  box.append(el('p','muted',incomplete?`Записей с неполными данными: ${incomplete}. Показана известная часть состава.`:'Сумма сохранённых записей за выбранную дату.'));
 }
 function renderRows(){
  const box=$('diary-entries');box.replaceChildren();
  if(!rows.length&&!loading)box.append(el('p','muted',allDates?'В дневнике пока нет записей.':'Добавьте еду или заметку за этот день.'));
  for(const entry of rows){const card=el('article','diary-entry');card.dataset.entryId=entry.entry_id;
   const clock=entryClock(entry),meta=[allDates?dayLabel(entry.date):null,clock||'Время не указано',MEALS[entry.meal]].filter(Boolean).join(' · ');
   card.append(el('p','diary-entry-meta',meta),el('h3','',intakeName(entry)));
   const amount=intakeAmount(entry);if(amount)card.append(el('p','',amountLabel(amount)));
   if(entry.note&&entry.note!==intakeName(entry))card.append(el('p','muted',entry.note));
   const calc=entry.calculation||entry.nutrition_snapshot?.calculation;
   if(calc?.nutrition){const n=calc.nutrition;card.append(el('p','muted',`Энергия: ${n.energy_kcal==null?'нет данных':number(n.energy_kcal,0)+' ккал'} · белки: ${n.protein_g==null?'нет данных':number(n.protein_g)+' г'} · углеводы: ${n.carbohydrate_total_g==null?'нет данных':number(n.carbohydrate_total_g)+' г'}`))}
   if(entry.legacy_estimate)card.append(el('p','muted','Состав пересчитан по текущему справочнику.'));
   const actions=el('div','diary-actions');for(const [label,operation]of [['Исправить','update'],['Повторить','repeat']]){const b=el('button','text-btn',label);b.type='button';b.onclick=()=>open({operation,entry,revision:historyRevision});actions.append(b)}
   const more=el('details','diary-entry-more');more.append(el('summary','','Ещё'));const del=el('button','text-btn danger-button','Удалить запись');del.type='button';del.onclick=()=>run(()=>propose('diary.delete',{entry_id:entry.entry_id},historyRevision));more.append(del);actions.append(more);card.append(actions);box.append(card);
  }
  $('diary-more').hidden=!hasMore;$('diary-more').disabled=loading;
 }
 async function load(append=false){
  if(!getState()?.profile?.consent?.storage||!getState()?.profile?.consent?.health_data)return;
  if(!day)day=stateDay();if(!day&&!allDates){$('diary-status').textContent='Выберите дату или подтвердите часовой пояс в профиле.';return}
  const token=++historyGeneration,stamp=epoch(),key=historyKey(),current=()=>token===historyGeneration&&stamp===epoch(),values={offset:append?rows.length:0,limit:30};if(!allDates)values.date=day;
  const args={action:'diary_history',values};if(append)args.expected_revision=historyRevision;
  loading=true;loadingKey=key;$('diary-status').textContent='Загружаем записи…';$('diary-more').disabled=true;
  if(!append){rows=[];hasMore=false;renderSummary(null);renderRows()}
  try{const result=await call('keto_kitchen',args);if(!current())return;
   $('diary-refresh').hidden=true;rows=append?[...rows,...result.entries]:result.entries;historyRevision=result.revision;loadedKey=key;hasMore=result.has_more;loading=false;
   renderSummary(result.summary);renderRows();$('diary-status').textContent=allDates?`Показано ${rows.length} из ${result.total}`:'';
  }catch(error){if(!current())return;loading=false;loadedKey=key;$('diary-status').textContent=error.message;renderRows();if(append){hasMore=false;$('diary-more').hidden=true}$('diary-refresh').hidden=false}
 }
 function historyKey(){return [day,allDates,getState()?.revision].join('|')}
 function render(){
  if(!day)day=stateDay();$('diary-day').value=day;$('diary-all').textContent=allDates?'К выбранному дню':'Вся история';$('diary-day-controls').hidden=allDates;
  if(isDiaryActive()&&loadedKey!==historyKey()&&(!loading||loadingKey!==historyKey()))run(()=>load());
 }
 function selectDate(next){day=next;allDates=false;loadedKey=null;render();if(!isDiaryActive())setView('diary')}
 $('diary-day').onchange=()=>selectDate($('diary-day').value);
 for(const [id,delta]of [['diary-prev',-1],['diary-next',1]])$(id).onclick=()=>{if(!day)return;const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+delta);selectDate(d.toISOString().slice(0,10))};
 $('diary-today').onclick=()=>selectDate(stateDay());
 $('diary-all').onclick=()=>{allDates=!allDates;loadedKey=null;render()};
 $('diary-more').onclick=()=>run(()=>load(true));$('diary-refresh').onclick=()=>{$('diary-refresh').hidden=true;run(()=>load())};
 $('diary-add').onclick=()=>open();
 function afterApplied(result){
  if(!result?.receipt)return;
  loadedKey=null;if(result.receipt.type==='diary.delete'){$('diary-receipt').hidden=true;receiptEntry=null}
  if(result.entry){receiptEntry=result.entry;day=result.entry.date;allDates=false;const box=$('diary-receipt');box.hidden=false;box.replaceChildren(el('p','','Запись сохранена'));const edit=el('button','text-btn','Исправить');edit.type='button';edit.onclick=()=>open({operation:'update',entry:receiptEntry});box.append(edit);setView('diary')}
  render();
 }
 function reset(){generation++;historyGeneration++;selection=null;submitting=false;day='';allDates=false;rows=[];historyRevision=null;loadedKey=null;loadingKey=null;loading=false;hasMore=false;receiptEntry=null;form.reset();showStatus('');$('intake-name').textContent='';$('intake-zone').textContent='';$('diary-summary').replaceChildren();$('diary-receipt').replaceChildren();$('diary-receipt').hidden=true;$('diary-status').textContent='';$('diary-day').value='';$('diary-more').hidden=true;buttons()}
 return {open,render,afterApplied,reset,selectDate,reload:()=>load(),get selectedDate(){return day}};
}
