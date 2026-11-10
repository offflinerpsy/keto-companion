import test from 'node:test';
import assert from 'node:assert/strict';
import {createFoodPicker} from '../public/food-picker.js';

class Node{
 constructor(tag='',cls='',text=''){Object.assign(this,{tag,className:cls,textContent:text,value:'',children:[],handlers:{},attributes:{},hidden:false,disabled:false,checked:false});}
 append(...nodes){for(const node of nodes){node.parent=this;this.children.push(node);}}
 replaceChildren(...nodes){for(const node of this.children)node.parent=null;this.children=[];this.append(...nodes);}
 setAttribute(name,value){this.attributes[name]=value;}
 addEventListener(name,fn){(this.handlers[name]??=[]).push(fn);}
 fire(name,event={}){for(const fn of this.handlers[name]||[])fn(event);}
 focus(){this.focused=true;}
 scrollIntoView(){}
}
const el=(...args)=>new Node(...args),all=node=>[node,...node.children.flatMap(all)],find=(root,label)=>all(root).find(node=>node.tag==='button'&&(node.textContent===label||node.attributes['aria-label']===label));
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}};
const cheese={food_id:'F173414',name_ru:'Сыр чеддер',state:'ready_to_eat'},fish={food_id:'F173725',name_ru:'Минтай',state:'raw'};
const candidate={candidate_id:'USDA1',name_en:'Cheese, gouda',name_ru_unofficial:'Сыр гауда',source_url:'https://fdc.nal.usda.gov/food-details/1/nutrients',release_hash:'a'.repeat(64),fiber_g:null};
function fixture(handler){
 const root=el('div'),input=el('input'),selected=[],accepted=[],calls=[];let screen=1;
 const picker=createFoodPicker({root,input,el,call:async(_,args)=>{calls.push(args);return handler(args)},getState:()=>({revision:5}),accept:data=>accepted.push(data),run:fn=>fn(),epoch:()=>screen,foodState:state=>state,onSelect:food=>selected.push(food),allergens:[['milk','Молоко'],['egg','Яйца']]});
 return {root,input,picker,selected,accepted,calls,changeAccount(){screen++;picker.reset();}};
}
const source=()=>({total:1,candidates:[candidate],next_cursor:null});

test('prepared foods and broad reference are visible; choice is explicit and survives another query',async()=>{
 const f=fixture(args=>args.action==='foods'?{foods:args.query==='рыба'?[fish]:[cheese],search:{label:'Ищем сыр и его виды',alternatives:[{query:'сырые продукты',label:'Сырые продукты'}]}}:source());
 f.input.value='сыр';await f.picker.search();
 assert.equal(f.selected.length,0);assert(find(f.root,'Сыр чеддер · ready_to_eat'));assert(find(f.root,'Сыр гауда · USDA · проверить состав'));assert(find(f.root,'Сырые продукты'));
 const status=f.root.children.find(n=>n.className==='food-search-status');assert.equal(status.focused,undefined);await f.picker.search({reveal:true});assert.equal(status.focused,true);
 status.focused=false;await find(f.root,'Сыр чеддер · ready_to_eat').onclick();assert.deepEqual(f.selected,[cheese]);assert.equal(status.focused,true);
 f.input.value='рыба';await f.picker.search();assert.deepEqual(f.selected,[cheese]);
 await find(f.root,'Минтай · raw').onclick();assert.deepEqual(f.selected,[cheese,fish]);
});

test('late food results and errors do not replace a newer query or its source page',async()=>{
 const old=deferred();const f=fixture(args=>args.action==='foods'?(args.query==='сыр'?old.promise:{foods:[fish]}):{total:0,candidates:[],next_cursor:null});
 f.input.value='сыр';const first=f.picker.search();f.input.value='рыба';await f.picker.search();old.reject(Error('old failure'));await first;
 assert(find(f.root,'Минтай · raw'));assert(!find(f.root,'Повторить поиск'));assert(!f.calls.some(x=>x.action==='source_search'&&x.query==='сыр'));
});

test('source pages append without losing prepared food selection; retry keeps the cursor',async()=>{
 let next=0;const f=fixture(args=>{if(args.action==='foods')return {foods:[cheese]};if(!args.values.cursor)return {...source(),total:2,next_cursor:'next'};if(next++===0)throw Error('temporary');return {total:2,candidates:[{...candidate,candidate_id:'USDA2',name_ru_unofficial:'Сыр бри'}],next_cursor:null};});
 f.input.value='сыр';await f.picker.search();await find(f.root,'Ещё продукты из справочника').onclick();assert(find(f.root,'Сыр чеддер · ready_to_eat'));await find(f.root,'Повторить поиск в справочнике').onclick();assert(find(f.root,'Сыр гауда · USDA · проверить состав'));assert(find(f.root,'Сыр бри · USDA · проверить состав'));assert.equal(f.selected.length,0);assert.equal(f.calls.at(-1).values.cursor,'next');
});

test('late detail and cancelled import proposals stay closed; only the matching receipt selects',async()=>{
 const detail=deferred(),save=deferred();let details=0,imports=0;
 const confirmed={...cheese,food_id:'U12345678',name_ru:'Личная гауда'};
 const proposal={proposal:{id:'proposal-1',preview:{food:confirmed}}};
 const f=fixture(args=>args.action==='foods'?{foods:[cheese]}:args.action==='source_search'?source():args.action==='source_detail'?(details++===0?detail.promise:{candidate}):args.action==='source_import'?(imports++===0?save.promise:proposal):{});
 f.input.value='сыр';await f.picker.search();const delayed=find(f.root,'Сыр гауда · USDA · проверить состав').onclick();
 await find(f.root,'Сыр чеддер · ready_to_eat').onclick();detail.resolve({candidate});await delayed;assert(!find(f.root,'Проверить добавление'));
 f.input.value='сыр';await f.picker.search();await find(f.root,'Сыр гауда · USDA · проверить состав').onclick();
 function fill(){const section=all(f.root).find(n=>n.className==='food-source-review');all(section).find(n=>n.tag==='select').value='ready_to_eat';const labels=all(section).filter(n=>n.tag==='label');labels.find(n=>n.textContent==='Название, состояние и аллергены проверены').children[0].checked=true;labels.find(n=>n.textContent==='Молоко').children[0].checked=true;}
 fill();const pending=find(f.root,'Проверить добавление').onclick();await find(f.root,'Вернуться к результатам').onclick();save.resolve(proposal);await pending;assert.equal(f.accepted.length,0);
 await find(f.root,'Сыр гауда · USDA · проверить состав').onclick();fill();await find(f.root,'Проверить добавление').onclick();assert.equal(f.accepted.length,1);assert.equal(f.selected.length,1);assert.deepEqual(f.calls.at(-1).values.allergens,['milk']);
 f.picker.afterApplied({receipt:{id:'unrelated'}});assert.equal(f.selected.length,1);
 f.picker.afterApplied({receipt:{id:'proposal-1',type:'kitchen.source_import'}});assert.equal(f.selected.at(-1).food_id,'U12345678');
});

test('reset keeps attached picker nodes reusable and discards the prior account response',async()=>{
 const pending=deferred();let count=0;const f=fixture(args=>args.action==='foods'?(count++===0?pending.promise:{foods:[fish]}):{total:0,candidates:[]});
 f.input.value='сыр';const old=f.picker.search();const children=[...f.root.children];f.changeAccount();f.input.value='рыба';await f.picker.search();pending.resolve({foods:[cheese]});await old;
 assert.deepEqual(f.root.children,children);assert(children.every(n=>n.parent===f.root));assert(!find(f.root,'Сыр чеддер · ready_to_eat'));assert(find(f.root,'Минтай · raw'));assert.equal(f.selected.length,0);
});

test('untrusted names stay text and an already-imported reference uses its current personal identity',async()=>{
 const name='<img src=x onerror=alert(1)>',personal={...cheese,food_id:'Uowner123',name_ru:name};
 const f=fixture(args=>args.action==='foods'?{foods:args.query==='Uowner123'?[personal]:[]}:{total:1,candidates:[{...candidate,name_ru_unofficial:name,already_imported:true,personal_food_id:'Uowner123'}],next_cursor:null});
 f.input.value='сыр';await f.picker.search();assert(!all(f.root).some(n=>n.tag==='img'));await find(f.root,name+' · Уже сохранён · выбрать').onclick();assert.deepEqual(f.selected,[personal]);assert(!f.calls.some(x=>x.action==='source_import'));
});
