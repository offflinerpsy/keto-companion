// Dates in plans are local calendar dates; do not convert through UTC.
export function localCalendarDate(date=new Date()){
 return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
}
export function renderTodayPlan({plan,draft,root,empty,el,formatDate,openRecipe,acceptPlan,now=new Date()}){
 const today=localCalendarDate(now),days=plan.days||[],todayDays=days.filter(d=>d.date===today),otherDays=days.filter(d=>d.date!==today);
 empty.hidden=!draft&&plan.status!=='stale_requires_recheck'&&todayDays.some(d=>d.meals.length>0);
 root.replaceChildren(el('h2','',draft?'Черновик меню':'Выбранное меню'));
 if(plan.status==='stale_requires_recheck')root.append(el('div','notice danger','Профиль изменился: это меню требует пересчёта. Не используйте как актуальное.'));
 function dayCard(day){const box=el('article','menu-day');box.append(el('h3','',formatDate(day.date)));for(const meal of day.meals){const part=el('div','meal');part.append(el('h3','',meal.name_ru));const b=el('button','text-btn','Граммовки и приготовление');b.addEventListener('click',()=>openRecipe(meal));part.append(b);box.append(part)}return box}
 for(const day of todayDays)root.append(dayCard(day));
 if(otherDays.length){const details=el('details','panel');details.append(el('summary','','Другие дни плана'),...otherDays.map(dayCard));root.append(details)}
 if(draft){const b=el('button','primary','Выбрать это меню');b.addEventListener('click',acceptPlan);root.append(b)}
}
