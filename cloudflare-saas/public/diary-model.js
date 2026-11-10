// Display the server's complete-day calculation; never derive nutrition targets here.
const format=(n,digits=1)=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:digits}).format(n);
const finite=n=>typeof n==='number'&&Number.isFinite(n);
export function nutritionOverview(summary,state={}){
 const count=summary?.entry_count??0;
 const target=state.profile?.targets,stale=Boolean(state.guidance?.targets_stale);
 const paused=Boolean(state.holds?.length)||state.screening?.can_plan===false;
 const agreed=target?.status==='agreed',active=agreed&&!stale&&!paused;
 const net=agreed&&target.carb_basis==='net_estimate';
 const specs=[
  ['energy_kcal','Энергия','ккал','energy',active?[target.energy_min_kcal,target.energy_max_kcal]:null],
  ['protein_g','Белки','г','protein',active?[target.protein_min_g,target.protein_max_g]:null],
  [net?'net_carbohydrate_g':'carbohydrate_total_g',net?'Net-углеводы':'Углеводы','г','carbs',active?[null,target.carb_max_g]:null],
  ['fat_g','Жиры','г','fat',null],
  ['fiber_g','Клетчатка','г','fiber',active?[target.fiber_min_g,null]:null]
 ];
 const cards=specs.map(([key,label,unit,icon,range])=>{
  const coverage=summary?.coverage?.[key],complete=count>0&&coverage?.complete===true&&finite(summary?.nutrition?.[key]);
  const value=count>0?(complete?summary.nutrition[key]:finite(coverage?.known_subtotal)?coverage.known_subtotal:null):null;
  const [low,high]=range||[],hasTarget=finite(low)||finite(high),denominator=finite(high)?high:low;
  const goal=hasTarget?(finite(low)&&finite(high)?`${format(low)}–${format(high)} ${unit}`:finite(high)?`до ${format(high)} ${unit}`:`от ${format(low)} ${unit}`):'';
  let status=!count?'Нет записей':!complete?'Неполные данные':hasTarget?(finite(high)&&value>high?'Выше ориентира':finite(low)&&value<low?'Пока ниже ориентира':finite(low)&&finite(high)?'В диапазоне':'В пределах ориентира'):'По записям';
  const tone=!complete?'unknown':hasTarget&&finite(high)&&value>high?'above':hasTarget&&(!finite(low)||value>=low)?'within':'neutral';
  return {key,label,unit,icon,value,complete,goal,status,tone,
   text:value===null?'—':`${complete?'':'учтено '}${format(value,key==='energy_kcal'?0:1)} ${unit}`,
   progress:complete&&hasTarget&&denominator>0?Math.min(1,value/denominator):null};
 });
 return {count,agreed,stale,paused,net,cards,incomplete:summary?.incomplete_entries||0,
  targetsNote:paused?'Сравнение с ориентирами приостановлено. Проверьте ограничения в профиле.':stale?'Ориентиры нужно обновить после изменений профиля.':agreed?'Сравнение с текущими сохранёнными ориентирами.':'Личные ориентиры пока не согласованы.'};
}

export function validDiaryDay(value){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value}

// Only navigation is persisted; there is no local copy of the health diary.
export function diaryNavigation(storage,account){
 const key=account?'keto.diary.navigation.v1:'+encodeURIComponent(account):null;
 return {
  read(){try{const value=key?JSON.parse(storage.getItem(key)||'null'):null;return validDiaryDay(value?.day)?{day:value.day,allDates:value.allDates===true}:null}catch{return null}},
  save(day,allDates){if(key&&validDiaryDay(day))try{storage.setItem(key,JSON.stringify({day,allDates:Boolean(allDates)}))}catch{}},
  clear(){if(key)try{storage.removeItem(key)}catch{}}
 };
}
