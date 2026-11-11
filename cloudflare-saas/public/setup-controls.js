import {create} from '../vendor/nouislider-15.8.1/nouislider.mjs';
export function numeric(value,{min=-Infinity,max=Infinity}={}){if(typeof value==='boolean'||value===null||String(value).trim()==='')throw Error('Введите число.');const text=String(value).trim().replace(',','.');if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text))throw Error('Введите число, например 72,5.');const n=Number(text);if(!Number.isFinite(n)||n<min||n>max)throw Error(`Допустимо от ${min} до ${max}.`);return n}
export function stepValue(value,delta,{min,max,step}){const base=String(value).trim()===''?min:numeric(value,{min,max});return Math.max(min,Math.min(max,Math.round((base+delta*step)*1000)/1000))}
export function linkSlider(element,inputs,{min,max,step,labels,localWindow=false,createSlider=create}){
 const values=inputs.map(i=>i.value.trim()===''?min:numeric(i.value,{min,max}));let alive=true;
 createSlider(element,{start:values.length===1?values[0]:values,range:{min,max},step,connect:inputs.length===2?true:[true,false],keyboardSupport:true,handleAttributes:labels.map(label=>({'aria-label':label})),ariaFormat:{to:v=>String(Math.round(v*10)/10),from:Number}});
 const api=element.noUiSlider;const reframe=vals=>{if(!localWindow||vals.some(v=>!Number.isFinite(v)))return;const lo=Math.max(min,Math.floor((Math.min(...vals)-200)/100)*100),hi=Math.min(max,Math.ceil((Math.max(...vals)+200)/100)*100);if(hi>lo)api.updateOptions({range:{min:lo,max:hi}},false)};reframe(values);const update=()=>{if(!alive)return;const raw=api.get(true),array=Array.isArray(raw)?raw:[raw];inputs.forEach((input,i)=>{input.value=String(Math.round(array[i]*10)/10);input.dispatchEvent(new Event('input',{bubbles:true}))})};api.on('slide',update);api.on('change',update);
 const listeners=inputs.map((input,i)=>{const fn=()=>{try{const v=numeric(input.value,{min,max});const current=api.get(true);if(Array.isArray(current)){current[i]=v;reframe(current);api.set(current)}else{reframe([v]);api.set(v)};input.setCustomValidity('')}catch(e){input.setCustomValidity(e.message)}};input.addEventListener('change',fn);return fn});
 return {destroy(){alive=false;inputs.forEach((input,i)=>input.removeEventListener('change',listeners[i]));api.destroy()}};
}

// Reuse field descriptions created by mobile-ui; keep their accessible IDs.
export function setupHints({$,el}){
 document.querySelectorAll('#settings-form .field-help,#profile-form .field-help,#targets-form .field-help').forEach(hint=>hint.classList.add('ux-hint'));
 for(const [id,text] of [
  ['meals_per_day','Число приёмов пищи влияет на новые расчётные меню; сохранённое меню нужно пересчитать отдельно.'],
  ['max_active_minutes','Время активной готовки ограничивает выбор блюд в новых расчётных меню; медицинские ограничения сохраняются.'],
  ['medications','Перечислите названия через запятую. Пустое поле не означает подтверждённое отсутствие приёма лекарств; это проверяется отдельным ответом.']
 ]){
  const input=$(id),label=input.closest('label');let hint=label.querySelector('.ux-hint');
  if(!hint){hint=el('p','ux-hint');hint.id='setup-help-'+id;label.insertAdjacentElement('afterend',hint);input.setAttribute('aria-describedby',[input.getAttribute('aria-describedby'),hint.id].filter(Boolean).join(' '));}
  hint.textContent=text;
 }
 $('medications').placeholder='Названия через запятую, если принимаете';
 $('settings-form').append(el('p','ux-hint','«Посмотреть изменения» открывает проверку выбранных настроек; они сохранятся только после подтверждения.'));
 const stopNote=$('revoke').closest('.panel').querySelector('p.muted');stopNote.className='ux-hint';stopNote.textContent='Остановка обработки прекращает обработку и новые записи, но не удаляет ранее сохранённый дневник; удаление профиля и дневника — отдельное действие.';
 const activityNote=$('activity-choices').parentElement.querySelector('p');activityNote.className='ux-hint';activityNote.textContent='Активность задаёт приблизительный множитель расчётной формулы, а не измеренный расход энергии. Ручной индивидуальный план доступен в разделе «Ваш план питания»; медицинские ограничения сохраняются.';
 $('allergy-options').insertAdjacentElement('afterend',el('p','ux-hint','Нелюбимые продукты — пожелания к меню; они не заменяют медицинские аллергии, которые нужно указать здесь.'));
}
