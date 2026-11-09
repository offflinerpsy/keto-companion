import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {kitchenModes,kitchenActionLabels,setupKitchen,sourceImportPreview} from '../public/kitchen-ui.js';
import {ROUTES} from '../public/routes.js';
import {OPS} from '../src/compute.mjs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('Kitchen tool dispatcher, labels, memory route and strict mode identities',()=>{
 assert.equal(OPS.keto_kitchen,'kitchen');assert(ROUTES.includes('memory'));assert.deepEqual(kitchenModes.map(m=>m[0]),['pantry_only','pantry_plus','inspiration']);for(const key of ['pantry','save','favorite','rate','diary','forget','accept_day'])assert(kitchenActionLabels[key]);
 assert.equal(typeof setupKitchen,'function');const ui=read('../public/kitchen-ui.js');for(const id of ['kitchen-composer','kitchen-candidate','pantry-chips','product-questions','kitchen-day','memory-fact'])assert(ui.includes(id));
 assert(ui.includes("basis:'portion'"));assert(ui.includes("basis:'batch'"));assert(ui.includes("type='submit'"));assert(!ui.includes('innerHTML'));
});
test('Studio keeps secondary reference library, four tabs and mobile minimum widths',()=>{
 const html=read('../public/index.html'),css=read('../public/app.css');assert(html.includes('data-testid="kitchen-studio"'));assert(html.includes('data-testid="recipe-library"'));assert(html.includes('data-testid="kitchen-memory"'));
 const nav=html.match(/<nav id="nav"[\s\S]*?<\/nav>/)[0];assert.equal((nav.match(/data-view=/g)||[]).length,4);
 assert(css.includes('@media(max-width:600px)'));assert(css.includes('grid-template-columns:minmax(0,1fr)'));assert(css.includes('min-height:44px'));assert(css.includes('minmax(min(100%,300px),1fr)'));
 const app=read('../public/app.js');assert(app.includes('memory:\'Что я помню\''));assert(app.includes('r.draft_label?kitchen.card(r)'));assert(app.includes('kitchen.reset()'));
});
test('Studio has no public deployment/model setting, model numbers or paid search on product input',()=>{
 const ui=read('../public/kitchen-ui.js');assert(!/KETO_RECIPE_DEPLOYMENT|AZURE_OPENAI|api_key|temperature_c\s*=/.test(ui));assert(ui.includes("action:'foods'"));assert(ui.includes("action:'parse'"));assert(!ui.includes('nutrition.energy_kcal='));
});

test('chat and memory confirmations remain visible and numbers accept decimal comma',()=>{const js=readFileSync(new URL('../public/kitchen-ui.js',import.meta.url),'utf8');assert(js.includes("document.body.dataset.view==='chat'"));assert(js.includes("document.body.dataset.view==='memory'"));assert(js.includes("replace(',','.')"));assert(js.includes("number-control"));assert(js.includes('dayCard'));});

test('Owner appliances have explicit choices and accessible model-specific hints',()=>{const ui=read('../public/kitchen-ui.js');for(const name of ['multicooker','air_fryer','waffle_iron'])assert(ui.includes(name));assert(ui.includes('kitchen-equipment-help'));assert(ui.includes('aria-describedby'));assert(ui.includes('без давления'));assert(ui.includes('equipment_note'));});

class Node {
 constructor(tag='div',cls='',text=''){Object.assign(this,{tag,cls,textContent:text,children:[],dataset:{},attributes:{},value:'',disabled:false});}
 prepend(...items){this.children.unshift(...items)} querySelector(selector){return selector==='[data-source-more]'?this.children.find(x=>x.dataset.sourceMore):null} append(...items){this.children.push(...items)} replaceChildren(...items){this.children=items} setAttribute(k,v){this.attributes[k]=v} dispatchEvent(){} remove(){} focus(){} scrollIntoView(){}
}
function descendants(node){return [node,...node.children.flatMap(descendants)]}
test('empty stepper recovers and parse preserves existing quantity and reports unresolved products',async()=>{
 const host=new Node(),memory=new Node(),nodes={'kitchen-studio':host,'kitchen-memory':memory,proposals:new Node()};
 let parseCalls=0,resolveParse;const pending=new Promise(r=>resolveParse=r);
 const state={kitchen:{pantry:[],preferences:[],legacy_disliked:[],favorites_details:[]},profile:{allergies:[],settings:{favorites:[],disliked_food_ids:[]}},revision:1};
 const ui=setupKitchen({$:id=>nodes[id],el:(...a)=>new Node(...a),call:async(name,p)=>{if(p.action==='foods')return {foods:[],total:0};if(p.action==='status')return {};if(p.action==='parse'){parseCalls++;return pending}},getState:()=>state,accept(){},run:fn=>fn(),notify(){},setView(){},epoch:()=>1});
 let all=descendants(host);const servings=all.find(n=>n.id==='kitchen-servings'),time=all.find(n=>n.id==='kitchen-time');
 servings.value='';await all.find(n=>n.attributes['aria-label']==='Увеличить Порций всего').onclick();assert.equal(servings.value,'2');
 time.value='';await all.find(n=>n.attributes['aria-label']==='Увеличить Минут на блюдо').onclick();assert.equal(time.value,'25');
 const free=all.find(n=>n.id==='kitchen-free'),parse=all.find(n=>n.textContent==='Разобрать продукты');free.value='Есть яйца и неизвестное';const first=parse.onclick();await parse.onclick();assert.equal(parseCalls,1);
 resolveParse({pantry:[{food_id:'synthetic',name_ru:'Яйца',state:'raw',grams:100}],questions:[{text:'Неизвестный продукт',choices:[]}]});await first;
 all=descendants(host);assert(all.some(n=>n.textContent.includes('Неизвестный продукт')));assert(all.some(n=>n.textContent==='Яйца'));assert(all.some(n=>String(n.textContent).includes('уточнений: 1')));
 const grams=all.find(n=>n.attributes['aria-label']==='Яйца: граммы');grams.value='75';grams.oninput();await parse.onclick();all=descendants(host);assert.equal(all.find(n=>n.attributes['aria-label']==='Яйца: граммы').value,'75');
 ui.reset();assert.equal(servings.value,'1');assert.equal(time.value,'20');
});

test('help participates in browser history and back closes the dialog first',async()=>{
 const {createRouter}=await import('../public/routes.js');let listeners={},closed=0,rendered=[];
 const location={hash:'#diary',pathname:'/',search:''},stack=[];
 const history={state:null,pushState(state,_,hash){stack.push(this.state);this.state=state;location.hash=hash},replaceState(state,_,hash){this.state=state;location.hash=hash},back(){this.state=stack.pop()||null;listeners.popstate()}};
 const router=createRouter({location,history,listen:(event,fn)=>listeners[event]=fn,render:r=>rendered.push(r),closeDialog:()=>closed++});
 router.go('diary');const initial=closed;router.openDialog('help');assert.equal(history.state.ketoDialog,'help');router.back();assert.equal(closed,initial+1);assert.equal(router.current,'diary');assert.deepEqual(rendered,['diary']);
});

test('new parsed ingredient keeps its stated mass',async()=>{
 const host=new Node(),nodes={'kitchen-studio':host,'kitchen-memory':new Node(),proposals:new Node()};
 setupKitchen({$:id=>nodes[id],el:(...a)=>new Node(...a),call:async()=>({pantry:[{food_id:'z',state:'raw',grams:200}],food_names:{z:'Кабачок'},questions:[]}),getState:()=>({}),accept(){},run:fn=>fn(),notify(){},setView(){},epoch:()=>1});
 let all=descendants(host);all.find(n=>n.id==='kitchen-free').value='кабачок 200 г';await all.find(n=>n.textContent==='Разобрать продукты').onclick();all=descendants(host);assert.equal(all.find(n=>n.attributes['aria-label']==='Кабачок: граммы').value,200);
});
test('selected named product survives debounce and an older search response',async()=>{
 const host=new Node(),nodes={'kitchen-studio':host,'kitchen-memory':new Node(),proposals:new Node()};let finish,searches=[];
 const food={food_id:'id-cheese',name_ru:'Чеддер',state:'ready_to_eat'},other={food_id:'other',name_ru:'Авокадо',state:'raw'};
 const ui=setupKitchen({$:id=>nodes[id],el:(...a)=>new Node(...a),call:async(_,p)=>{if(p.action==='status')return {};if(p.action==='foods'&&!p.query)return {foods:[food,other],total:2};searches.push(p.query);return new Promise(r=>finish=r)},getState:()=>({active_thread:'main'}),accept(){},run:fn=>fn(),notify(){},setView(){},epoch:()=>1});
 await ui.load();const input=descendants(host).find(n=>n.id==='kitchen-product');input.value='аво';input.oninput();await new Promise(r=>setTimeout(r,300));assert.deepEqual(searches,['аво']);
 input.value='Чеддер · готов к употреблению';input.oninput();finish({foods:[other],total:1});await new Promise(r=>setTimeout(r,300));assert.deepEqual(searches,['аво']);await descendants(host).find(n=>n.textContent==='Добавить').onclick();assert(descendants(host).some(n=>n.textContent==='Чеддер'));assert(!descendants(host).some(n=>n.textContent==='id-cheese'));
});

test('selected exclusion survives debounce and stale response in actual generation request',async()=>{
 const host=new Node(),nodes={'kitchen-studio':host,'kitchen-memory':new Node(),proposals:new Node()};let finish,generated,queries=[];
 const cheese={food_id:'cheddar-key',name_ru:'Чеддер',state:'ready_to_eat'},other={food_id:'other-key',name_ru:'Авокадо',state:'raw'};
 const originalFormData=globalThis.FormData;globalThis.FormData=class{get(){return 'inspiration'}};
 try{
  setupKitchen({$:id=>nodes[id],el:(...a)=>new Node(...a),call:async(_,p)=>{if(p.action==='generate'){generated=p;return {recipes:[]}}queries.push(p.query);if(p.query==='сыр')return {foods:[cheese]};return new Promise(r=>finish=r)},getState:()=>({active_thread:'main',revision:1}),accept(){},run:fn=>fn(),notify(){},setView(){},epoch:()=>1});
  const all=descendants(host),avoid=all.find(n=>n.id==='kitchen-avoid');avoid.value='сыр';avoid.oninput();await new Promise(r=>setTimeout(r,300));assert.deepEqual(queries,['сыр']);
  avoid.value='аво';avoid.oninput();await new Promise(r=>setTimeout(r,300));avoid.value='Чеддер · готов к употреблению';avoid.oninput();finish({foods:[other]});await new Promise(r=>setTimeout(r,300));assert.deepEqual(queries,['сыр','аво']);
  all.find(n=>n.id==='kitchen-meal').value='dinner';all.find(n=>n.id==='kitchen-equipment').value='pan';const form=all.find(n=>n.tag==='form');form.onsubmit({preventDefault(){}});await new Promise(r=>setTimeout(r,0));assert.deepEqual(generated.spec.avoid,['cheddar-key']);
 }finally{globalThis.FormData=originalFormData}
});

test('USDA candidate is reviewed before a personal import proposal',async()=>{
 const host=new Node(),nodes={'kitchen-studio':host,'kitchen-memory':new Node(),proposals:new Node()};let sent;
 const candidate={candidate_id:'USDA123',name_en:'Cheese, example',name_ru_unofficial:'Сыр пример',category_ru:'Сыр',source_url:'https://fdc.nal.usda.gov/food-details/123/nutrients',release_hash:'a'.repeat(64),energy_kcal:100,protein_g:2,fat_g:3,carbohydrate_total_g:4,fiber_g:null};
 const state={active_thread:'main',revision:3};globalThis.document={body:{dataset:{view:'recipes'}}};
 setupKitchen({$:id=>nodes[id],el:(...a)=>new Node(...a),call:async(_,p)=>{if(p.action==='source_search')return {total:1,candidates:[candidate],next_cursor:null};if(p.action==='source_detail')return {candidate};if(p.action==='source_import'){sent=p;return {proposal:{id:'p'}}}},getState:()=>state,accept(){},run:fn=>fn(),notify(){},setView(){},epoch:()=>1});
 let all=descendants(host),input=all.find(n=>n.id==='kitchen-product');input.value='сыр';await all.find(n=>n.textContent==='Искать в USDA').onclick();all=descendants(host);await all.find(n=>n.textContent.includes('Сыр пример · USDA')).onclick();all=descendants(host);assert(all.some(n=>n.textContent.includes('клетчатка, г на 100 г: нет данных')));const review=all.find(n=>n.textContent==='Проверка записи USDA');assert(review);
 const stateSelect=all.find(n=>n.tag==='select'&&n.children.some(c=>c.textContent==='Выберите состояние'));stateSelect.value='raw';const checkbox=all.find(n=>n.tag==='label'&&n.textContent.startsWith('Я проверил')).children[0];checkbox.checked=true;await all.find(n=>n.textContent==='Подготовить добавление личного продукта').onclick();assert.equal(sent.action,'source_import');assert.equal(sent.values.candidate_id,'USDA123');assert.equal(sent.values.state,'raw');assert.deepEqual(sent.values.allergens,[]);assert.equal(sent.values.source_review_confirmed,true);
});

test('food picker bounds results, cancels pending detail after trusted selection, and blocks implicit Enter',async()=>{
 const host=new Node(),nodes={'kitchen-studio':host,'kitchen-memory':new Node(),proposals:new Node()};let resolveDetail,calls=[];const detail=new Promise(r=>resolveDetail=r);
 const foods=Array.from({length:19},(_,i)=>({food_id:'F'+i,name_ru:'Продукт '+i,state:'raw'}));
 const ui=setupKitchen({$:id=>nodes[id],el:(...a)=>new Node(...a),call:async(_,p)=>{calls.push(p.action);if(p.action==='status')return {};if(p.action==='foods')return {foods,total:foods.length};if(p.action==='source_search')return {total:1,candidates:[{candidate_id:'USDA1',name_en:'Reference',category_ru:'Категория'}],next_cursor:null};if(p.action==='source_detail')return detail},getState:()=>({active_thread:'main',revision:1}),accept(){},run:fn=>fn(),notify(){},setView(){},epoch:()=>1});
 await ui.load();let all=descendants(host),list=all.find(n=>n.attributes['aria-label']==='Продукты справочника и личные продукты');assert.equal(list.children.filter(n=>n.textContent.includes('справочник / личный')).length,8);await list.children.find(n=>n.textContent==='Следующие продукты').onclick();assert(list.children.some(n=>n.textContent.startsWith('Продукт 8')));assert(!list.children.some(n=>n.textContent.startsWith('Продукт 0')));await list.children.find(n=>n.textContent==='Следующие продукты').onclick();assert(list.children.some(n=>n.textContent.startsWith('Продукт 18')));await list.children.find(n=>n.textContent==='Предыдущие продукты').onclick();
 const product=all.find(n=>n.id==='kitchen-product');product.value='example';await all.find(n=>n.textContent==='Искать в USDA').onclick();all=descendants(host);const pending=all.find(n=>n.textContent.includes('Reference · USDA')).onclick();await list.children.find(n=>n.textContent.startsWith('Продукт 8')).onclick();assert.equal(list.hidden,true);resolveDetail({candidate:{name_en:'Late reference'}});await pending;assert(!descendants(host).some(n=>n.textContent==='Проверка записи USDA'));
 const picker=all.find(n=>n.cls==='kitchen-picker');let blocked=0;for(const tagName of ['INPUT','SELECT'])picker.onkeydown({key:'Enter',target:{tagName},preventDefault(){blocked++}});assert.equal(blocked,2);assert(!calls.includes('generate')&&!calls.includes('source_import'));
});
test('source import preview renders Russian allergen names and understandable unknowns',()=>{
 const parts=sourceImportPreview((...a)=>new Node(...a),{name_ru:'Еда',state:'raw',allergens:['milk','egg','unexpected']},'Original',[['milk','Молоко'],['egg','Яйца']],()=> 'сырой');
 assert.equal(parts[1].textContent,'Источник: Original · USDA; аллергены: Молоко, Яйца, Неизвестный аллерген (unexpected)');assert(!parts[1].textContent.includes('milk'));assert(read('../public/app.js').includes('sourceImportPreview(el,p.preview.food,p.preview.original_name,ALLERGENS,foodState)'));
});
test('confirmed pantry preview keeps dirty kitchen draft and explicitly starts with current saved stock',async()=>{
 const host=new Node(),nodes={'kitchen-studio':host,'kitchen-memory':new Node(),proposals:new Node()};let calls=[];
 const state={active_thread:'main',revision:9,kitchen:{pantry:[{food_id:'scanned',name_ru:'Личный сыр',state:'ready_to_eat',grams:null},{food_id:'egg',name_ru:'Яйца',state:'raw',grams:200}],preferences:[],legacy_disliked:[],favorites_details:[]},profile:{allergies:[],settings:{favorites:[],disliked_food_ids:[]}}};
 const ui=setupKitchen({$:id=>nodes[id],el:(...a)=>new Node(...a),call:async(_,p)=>{calls.push(p);if(p.action==='parse')return {pantry:[{food_id:'draft',name_ru:'Черновик',state:'raw',grams:75}],questions:[]};if(p.action==='generate')return {recipes:[],questions:['Личный продукт не допущен к проверенным способам.']};if(p.action==='status')return {spec:{pantry:[{food_id:'old',state:'raw',grams:1}],meal:'dinner',servings:1,time_budget:20,equipment:'pan',max_missing_items:2,mode:'pantry_only'}};if(p.action==='foods')return {foods:[]}},getState:()=>state,accept(){ui.render()},run:fn=>fn(),notify(){},setView(){},epoch:()=>1});
 let all=descendants(host);all.find(n=>n.id==='kitchen-free').value='Черновик';await all.find(n=>n.textContent==='Разобрать продукты').onclick();all=descendants(host);assert(all.some(n=>n.textContent==='Черновик'));all.find(n=>n.id==='kitchen-meal').value='dinner';all.find(n=>n.id==='kitchen-equipment').value='pan';ui.previewSavedPantry('Личный сыр');all=descendants(host);assert(all.some(n=>n.textContent.includes('масса не указана')));assert(all.some(n=>n.textContent.includes('не допущены')));assert.equal(calls.filter(p=>p.action==='generate').length,0);await all.find(n=>n.textContent==='Начать подбор по сохранённой кладовой').onclick();const sent=calls.find(p=>p.action==='generate');assert.deepEqual(sent.spec.pantry,[{food_id:'scanned',state:'ready_to_eat',grams:null},{food_id:'egg',state:'raw',grams:200}]);assert.equal(sent.spec.mode,'pantry_only');all=descendants(host);assert(all.some(n=>n.textContent==='Черновик'));assert(all.some(n=>n.textContent.includes('Подходящих проверенных блюд не найдено')));assert(!sent.spec.pantry.some(i=>i.food_id==='old'));
});
test('confirmed pantry preview rejects changed revision and discards a late result after cancellation',async()=>{
 const host=new Node(),nodes={'kitchen-studio':host,'kitchen-memory':new Node(),proposals:new Node()};let sent=0,finish;const state={active_thread:'main',revision:1,kitchen:{pantry:[{food_id:'a',name_ru:'А',state:'raw',grams:null}],preferences:[],legacy_disliked:[],favorites_details:[]},profile:{allergies:[],settings:{favorites:[],disliked_food_ids:[]}}};
 const ui=setupKitchen({$:id=>nodes[id],el:(...a)=>new Node(...a),call:async(_,p)=>{if(p.action==='generate'){sent++;return await new Promise(r=>finish=r)}},getState:()=>state,accept(){throw Error('stale result accepted')},run:async fn=>{try{return await fn()}catch{}},notify(){},setView(){},epoch:()=>1});let all=descendants(host);all.find(n=>n.id==='kitchen-meal').value='dinner';all.find(n=>n.id==='kitchen-equipment').value='pan';ui.previewSavedPantry('А');state.revision=2;state.kitchen.pantry=[{food_id:'b',name_ru:'Б',state:'raw',grams:12}];await descendants(host).find(n=>n.textContent==='Начать подбор по сохранённой кладовой').onclick();assert.equal(sent,0);assert(descendants(host).some(n=>n.textContent==='Б · 12 г'));const pending=descendants(host).find(n=>n.textContent==='Начать подбор по сохранённой кладовой').onclick();await new Promise(r=>setImmediate(r));assert.equal(sent,1);ui.cancelSavedPreview();finish({recipes:[]});await pending;const panel=descendants(host).find(n=>n.dataset.testid==='confirmed-pantry-preview');assert.equal(panel.hidden,true);assert.equal(panel.children.length,0);
});
