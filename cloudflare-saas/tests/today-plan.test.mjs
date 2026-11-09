import test from 'node:test';
import assert from 'node:assert/strict';
import {localCalendarDate,renderTodayPlan} from '../public/today-plan.js';
class Node {constructor(tag,cls='',text=''){Object.assign(this,{tag,cls,text,children:[],hidden:false})}append(...nodes){this.children.push(...nodes)}replaceChildren(...nodes){this.children=nodes}addEventListener(name,fn){this['on'+name]=fn}}
const el=(...args)=>new Node(...args),makeDay=(date,name)=>({date,meals:[{name_ru:name}]}),childrenText=n=>[n.text,...n.children.flatMap(childrenText)];
function render(days,{draft=false,status='active',now=new Date(2026,10,9,23,30)}={}){const root=el('div'),empty=el('div');let opened=null,accepted=false;const plan={days,status};renderTodayPlan({plan,draft,root,empty,el,formatDate:x=>x,openRecipe:m=>opened=m,acceptPlan:()=>accepted=true,now});return {root,empty,get opened(){return opened},get accepted(){return accepted}}}
test('local today is visible first; other dates remain in full plan and actions work',()=>{
 const view=render([makeDay('2026-11-10','Завтра'),makeDay('2026-11-09','Сегодня'),makeDay('2026-11-08','Вчера')]);assert.equal(view.empty.hidden,true);const details=view.root.children.find(x=>x.tag==='details');assert(details);assert(childrenText(view.root.children.find(x=>x.tag==='article')).includes('Сегодня'));assert(!childrenText(details).includes('Сегодня'));assert(childrenText(details).includes('Завтра'));assert(childrenText(details).includes('Вчера'));view.root.children.find(x=>x.tag==='article').children[1].children[1].onclick();assert.equal(view.opened.name_ru,'Сегодня');
});
test('future or past only keeps empty action visible; draft and stale remain explicitly unselected',()=>{
 for(const date of ['2026-11-08','2026-11-10']){const view=render([makeDay(date,'Другое')]);assert.equal(view.empty.hidden,false);assert.equal(view.root.children.some(x=>x.tag==='article'),false);assert(view.root.children.some(x=>x.tag==='details'))}
 const draft=render([makeDay('2026-11-09','Черновик')],{draft:true});assert.equal(draft.empty.hidden,false);draft.root.children.find(x=>x.tag==='button').onclick();assert.equal(draft.accepted,true);assert.equal(render([makeDay('2026-11-09','Старое')],{status:'stale_requires_recheck'}).empty.hidden,false);
});
test('calendar day uses local components at late evening without UTC conversion',()=>{const d=new Date(2026,10,9,23,30);assert.equal(localCalendarDate(d),'2026-11-09')});
