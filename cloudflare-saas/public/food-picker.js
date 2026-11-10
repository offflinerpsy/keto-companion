// One accessible picker for prepared foods and reviewed reference candidates.
// Plain buttons keep native keyboard semantics; selecting never records intake.
export function createFoodPicker({root,input,el,call,getState,accept,run,epoch,foodState,onSelect,allergens=[],debounce=220}){
 let version=0,detailVersion=0,timer=null,query='',foods=[],page=0,cursor=null,sourceBusy=false,pending=null;
 const status=el('p','food-search-status'),hint=el('div','food-search-hint'),list=el('div','food-result-list'),source=el('section','food-reference'),sourceStatus=el('p','muted'),sourceRows=el('div','food-result-list'),review=el('section','food-source-review');
 status.setAttribute('role','status');sourceStatus.setAttribute('role','status');list.setAttribute('aria-label','Найденные продукты');source.setAttribute('aria-label','Большой справочник продуктов');review.hidden=source.hidden=true;
 // This section can live inside the own-dish form. An input's Enter key must
 // not implicitly submit that unrelated form; action buttons keep native keys.
 review.addEventListener('keydown',event=>{if(event.key==='Enter'&&event.target?.tagName==='INPUT')event.preventDefault();});
 const button=(label,fn,cls='secondary')=>{const b=el('button',cls,label);b.type='button';b.onclick=()=>run(fn);return b};
 const more=button('Ещё продукты из справочника',()=>loadSource(true));more.hidden=true;more.setAttribute('data-icon','plus');
 source.append(el('h3','','Большой справочник'),el('p','field-help','Состав USDA на 100 г. Перед добавлением проверьте запись.'),sourceStatus,sourceRows,more);root.append(status,hint,list,source,review);
 const current=(stamp,screen,q)=>stamp===version&&screen===epoch()&&q===input.value.trim();
 function invalidate(){version++;detailVersion++;clearTimeout(timer);cursor=null;sourceBusy=false;review.hidden=true;review.replaceChildren();list.replaceChildren();hint.replaceChildren();sourceRows.replaceChildren();source.hidden=true;more.hidden=true;status.textContent='';}
 function select(food){invalidate();onSelect(food);input.value=food.name_ru;status.textContent='Выбран продукт: '+food.name_ru;}
 function option(name,subtitle,fn){const b=button('',fn,'food-option');b.append(el('strong','',name),el('span','muted',subtitle));b.setAttribute('aria-label',name+' · '+subtitle);return b;}
 function drawFoods(){
  list.replaceChildren();const start=page*8;
  for(const food of foods.slice(start,start+8))list.append(option(food.name_ru,foodState(food.state),()=>select(food)));
  const nav=el('div','food-result-pages');
  if(page)nav.append(button('Предыдущие продукты',()=>{page--;drawFoods()}));
  if(start+8<foods.length)nav.append(button('Следующие продукты',()=>{page++;drawFoods()}));
  if(nav.children.length)list.append(nav);
 }
 async function search(){
  invalidate();query=input.value.trim();if(!query)return;
  const stamp=version,screen=epoch(),q=query;status.textContent='Ищем продукты…';
  try{
   const result=await call('keto_kitchen',{action:'foods',query:q});if(!current(stamp,screen,q))return;
   foods=result.foods||[];page=0;drawFoods();status.textContent=foods.length?`В ваших продуктах и базовом каталоге: ${foods.length}. Выберите продукт.`:'В базовом каталоге и ваших продуктах совпадений нет.';
   if(result.search?.label)hint.append(el('span','field-help',result.search.label));
   for(const alternative of result.search?.alternatives||[])hint.append(button(alternative.label,()=>{input.value=alternative.query;return search()},'text-btn'));
   await loadSource(false);
  }catch(error){if(current(stamp,screen,q)){status.textContent='Не удалось загрузить продукты. Попробуйте снова.';list.append(button('Повторить поиск',search));}}
 }
 async function loadSource(append){
  if(sourceBusy||!query||query!==input.value.trim()||(append&&!cursor))return;
  const stamp=version,screen=epoch(),q=query,next=append?cursor:null;sourceBusy=true;source.hidden=false;more.hidden=true;sourceStatus.textContent='Ищем в большом справочнике…';
  try{
   const result=await call('keto_kitchen',{action:'source_search',query:q,values:{cursor:next,limit:8}});if(!current(stamp,screen,q))return;
   if(!append)sourceRows.replaceChildren();sourceStatus.textContent=result.total?`Совпадений в справочнике: ${result.total}`:'В справочнике совпадений нет. Уточните название или добавьте продукт по этикетке.';
   for(const candidate of result.candidates||[]){
    let row;row=option(candidate.name_ru_unofficial||candidate.name_en,candidate.already_imported?'Уже сохранён · выбрать':'USDA · проверить состав',async()=>{
     const detail=++detailVersion,e=epoch(),v=version;
     try{
      if(candidate.personal_food_id){const d=await call('keto_kitchen',{action:'foods',query:candidate.personal_food_id});if(detail!==detailVersion||e!==epoch()||v!==version)return;const food=d.foods?.find(f=>f.food_id===candidate.personal_food_id);if(food)select(food);return;}
      const d=await call('keto_kitchen',{action:'source_detail',values:{candidate_id:candidate.candidate_id}});if(detail!==detailVersion||e!==epoch()||v!==version)return;showReview(d.candidate,row,v,e);
     }catch(error){if(detail===detailVersion&&e===epoch()&&v===version){sourceStatus.textContent='Не удалось открыть состав. Выберите запись ещё раз.';}}
    });sourceRows.append(row);
   }
   cursor=result.next_cursor;more.hidden=!cursor;more.textContent='Ещё продукты из справочника';
  }catch(error){if(current(stamp,screen,q)){sourceStatus.textContent='Дополнительный справочник не загрузился. Выбранный продукт сохранён.';more.hidden=false;more.textContent='Повторить поиск в справочнике';more.onclick=()=>run(()=>loadSource(Boolean(cursor)));}}
  finally{if(stamp===version){sourceBusy=false;}}
 }
 function showReview(candidate,origin,stamp,screen){
  const reviewVersion=detailVersion;
  review.hidden=false;review.replaceChildren(el('h3','','Проверить продукт'),el('p','',candidate.name_en));
  const a=el('a','','Источник USDA');a.href=candidate.source_url;a.target='_blank';a.rel='noopener noreferrer';review.append(a);
  const nutrients=el('dl','intake-nutrients');
  for(const [key,label,unit] of [['energy_kcal','Энергия','ккал'],['protein_g','Белки','г'],['fat_g','Жиры','г'],['carbohydrate_total_g','Общие углеводы','г'],['fiber_g','Клетчатка','г']])nutrients.append(el('dt','',label),el('dd','',candidate[key]==null?'нет данных':new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(candidate[key])+' '+unit));
  review.append(el('p','field-help','На 100 г. Состояние и аллергены нужно проверить; ГИ неизвестен.'),nutrients);
  const field=(label,control)=>{const box=el('label','',label);box.append(control);review.append(box);return control};
  const name=field('Название продукта',el('input'));name.value=candidate.name_ru_unofficial||candidate.name_en;name.maxLength=200;
  const state=field('Состояние продукта',el('select'));
  for(const [value,label] of [['','Выберите состояние'],['ready_to_eat','Готов к употреблению'],['raw','Сырой'],['cooked','Приготовленный'],['dry','Сухой'],['canned','Консервированный'],['ready_to_cook','Для приготовления']]){const o=el('option','',label);o.value=value;state.append(o);}
  const allergy=el('details','food-source-allergens'),checks=[];allergy.append(el('summary','','Проверить аллергены'));
  for(const [value,label] of allergens){const box=el('label','check',label),control=el('input');control.type='checkbox';control.value=value;box.append(control);allergy.append(box);checks.push(control);}
  const checked=el('input');checked.type='checkbox';const confirm=el('label','check','Название, состояние и аллергены проверены');confirm.append(checked);
  const error=el('p','field-error');error.setAttribute('role','alert');
  const save=button('Проверить добавление',async()=>{
   if(save.disabled||reviewVersion!==detailVersion||!current(stamp,screen,query))return;
   if(!name.value.trim()||!state.value||!checked.checked){error.textContent='Проверьте название, выберите состояние и подтвердите проверку аллергенов.';return;}
   save.disabled=true;error.textContent='';
   try{
    const result=await call('keto_kitchen',{action:'source_import',values:{candidate_id:candidate.candidate_id,release_hash:candidate.release_hash,name_ru:name.value.trim(),state:state.value,allergens:checks.filter(x=>x.checked).map(x=>x.value),source_review_confirmed:true},expected_revision:getState().revision});
    if(reviewVersion!==detailVersion||!current(stamp,screen,query))return;
    if(result.proposal?.preview?.food)pending={id:result.proposal.id,food:result.proposal.preview.food,stamp,screen};accept(result);
   }catch(e){if(stamp===version&&screen===epoch())error.textContent=e.message;}
   finally{save.disabled=false;}
  },'primary');
  const cancel=button('Вернуться к результатам',()=>{detailVersion++;review.hidden=true;review.replaceChildren();origin.focus?.({preventScroll:true});});
  review.append(allergy,confirm,error,save,cancel);review.setAttribute('tabindex','-1');review.focus?.({preventScroll:true});review.scrollIntoView?.({block:'nearest'});
 }
 function afterApplied(data){
  if(!pending)return;
  if(data?.receipt?.id===pending.id){const done=pending;pending=null;if(done.stamp===version&&done.screen===epoch())select(done.food);}
  else if(data?.state?.pending&&!data.state.pending.some(p=>p.id===pending.id))pending=null;
 }
 function reset(){invalidate();pending=null;foods=[];query='';input.value='';}
 input.addEventListener('input',()=>{invalidate();const stamp=version;timer=setTimeout(()=>{if(stamp===version)run(search)},debounce);});
 input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();run(search);}});
 return {search,reset,invalidate,afterApplied};
}
