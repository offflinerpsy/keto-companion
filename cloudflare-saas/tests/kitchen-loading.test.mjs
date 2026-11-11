import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';

class Element{
 constructor(tag='div',text=''){this.tag=tag;this.textContent=text;this.value='';this.children=[];this.dataset={};this.attributes={};this.disabled=false}
 append(...nodes){this.children.push(...nodes);if(this.tag==='select'&&this.value==='')this.value=nodes[0].value}
 replaceChildren(...nodes){this.children=nodes;this.textContent=''}
 setAttribute(key,value){this.attributes[key]=value}
 querySelector(){return null}
}
const walk=node=>[node,...node.children.flatMap(walk)];
function harness(call){
 const nodes={'kitchen-studio':new Element(),'recipe-kitchen-slot':new Element()},pending=[],accepted=[];
 const state={revision:7,active_thread:'main',kitchen:{pantry:[]}};
 const context={setTimeout,clearTimeout,crypto:webcrypto,Intl,FormData:class{get(){return 'inspiration'}}};
 vm.createContext(context);vm.runInContext(readFileSync('cloudflare-saas/public/kitchen-ui.js','utf8').replace(/^export /gm,''),context);
 let epoch=1;
 const ui=context.setupKitchen({$:id=>nodes[id]||null,el:(tag,cls,text)=>new Element(tag,text||''),call,getState:()=>state,accept:data=>accepted.push(data),run:fn=>{const task=fn();task.catch(()=>{});pending.push(task);return task},notify(){},setView(){},epoch:()=>epoch});
 const form=walk(nodes['recipe-kitchen-slot']).find(node=>node.tag==='form'),button=walk(form).find(node=>node.dataset.testid==='kitchen-generate'),status=form.children.at(-1);
 return {nodes,ui,form,button,status,pending,accepted,reset(){epoch++;ui.reset()}};
}
test('failed dish generation replaces checking text, enables action and never retries',async()=>{
 let reject,calls=0;const h=harness(async()=>{calls++;return new Promise((_,fail)=>reject=fail)});
 h.form.onsubmit({preventDefault(){}});assert.equal(h.button.disabled,true);assert.match(h.status.textContent,/Проверяю/);
 h.form.onsubmit({preventDefault(){}});assert.equal(calls,1);
 reject(Object.assign(Error('Сервис временно недоступен. Запрос не повторён.'),{code:'COMPUTE_UNAVAILABLE'}));
 await assert.rejects(h.pending[0],/Сервис временно/);assert.equal(h.button.disabled,false);assert.match(h.status.textContent,/Запрос не повторён/);assert.doesNotMatch(h.status.textContent,/Проверяю/);assert.equal(calls,1);
});
test('local validation failure also terminates the checking status without dispatch',async()=>{
 let calls=0;const h=harness(async()=>{calls++});const avoid=walk(h.form).find(node=>node.id==='kitchen-avoid');avoid.value='unselected';
 h.form.onsubmit({preventDefault(){}});await assert.rejects(h.pending[0],/выберите название/);assert.equal(calls,0);assert.equal(h.button.disabled,false);assert.match(h.status.textContent,/выберите название/);
});
test('late rejection after session reset cannot restore previous checking or error text',async()=>{
 let reject;const h=harness(()=>new Promise((_,fail)=>reject=fail));h.form.onsubmit({preventDefault(){}});h.reset();reject(Error('old private failure'));
 await assert.rejects(h.pending[0]);assert.equal(h.status.textContent,'');assert.equal(h.button.disabled,false);assert.equal(h.accepted.length,0);
});
test('saved pantry generation reports failure in its own result area',async()=>{
 const h=harness(async()=>{throw Error('Результат пока неизвестен. Проверьте приложение.')});h.ui.previewSavedPantry('Авокадо');
 const preview=walk(h.nodes['recipe-kitchen-slot']).find(node=>node.dataset.testid==='confirmed-pantry-preview');
 const start=walk(preview).find(node=>node.tag==='button'&&node.textContent==='Начать подбор по сохранённым запасам');start.onclick();await assert.rejects(h.pending[0]);
 assert.equal(start.disabled,false);assert.equal(h.button.disabled,false);assert(walk(preview).some(node=>node.textContent.includes('Результат пока неизвестен')));assert(!walk(preview).some(node=>node.textContent==='Подбираю блюда…'));
});
