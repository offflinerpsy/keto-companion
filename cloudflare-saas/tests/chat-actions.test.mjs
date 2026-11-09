import test from 'node:test';
import assert from 'node:assert/strict';
import {setupChatActions} from '../public/chat-actions.js';

class Node{
 constructor(tag,cls,text){this.tag=tag;this.className=cls;this.textContent=text||'';this.children=[];this.dataset={};this.attributes={}}
 append(...items){this.children.push(...items)}
 setAttribute(key,value){this.attributes[key]=value}
}
function fixture(){
 const f={state:{active_thread:'main',revision:7,pending:[]},stamp:0,context:0,calls:[],opened:[],notices:[]};
 f.reply=async()=>({message_id:'m1',response_thread_id:'main',action:{id:'a1'},command:{type:'open_intake',source:{recipe_id:'B01',name_ru:'Омлет',thread_id:'main',origin:{thread_id:'main',message_id:'m1',action_id:'a1'}},suggested_amount:{value:.5,unit:'portion'}}});
 f.ui=setupChatActions({el:(...a)=>new Node(...a),call:async(...a)=>{f.calls.push(a);return f.reply()},getState:()=>f.state,epoch:()=>f.stamp,getContext:()=>f.context,run:fn=>fn(),notify:t=>f.notices.push(t),navigate:v=>f.opened.push({view:v}),chooseMode:m=>f.opened.push({mode:m}),openRecipe:r=>f.opened.push({recipe:r}),openIntake:s=>f.opened.push({intake:s}),showProposal:p=>f.opened.push({proposal:p})});
 f.message={id:'m1',thread_id:'main',role:'assistant',text:'Проверьте съеденную долю.',actions:[{id:'a1',type:'open_intake',label:'Записать съеденное',status:'available',target:{recipe_id:'old-untrusted-target'}}]};
 f.row=()=>f.ui.render(f.message);return f;
}
test('restored action resolves its exact message and opens the common editor without a write',async()=>{
 const f=fixture(),row=f.row();await row.children[1].children[0].onclick();
 assert.equal(f.calls.length,1);assert.equal(f.calls[0][0],'keto_kitchen');assert.deepEqual(f.calls[0][1],{action:'chat_action',thread_id:'main',values:{message_id:'m1',action_id:'a1'},expected_revision:7});
 assert.equal(f.opened[0].intake.recipe_id,'B01');assert.deepEqual(f.opened[0].intake.origin,{thread_id:'main',message_id:'m1',action_id:'a1'});assert.deepEqual(f.opened[0].intake.amount,{value:.5,unit:'portion'});
});
test('topic switch and identity reset discard an outstanding action response',async()=>{
 for(const reset of [false,true]){
  const f=fixture();let release;const reply=await f.reply();f.reply=()=>new Promise(r=>release=r);const pending=f.row().children[1].children[0].onclick();
  if(reset){f.stamp++;f.ui.reset()}else f.state.active_thread='other';release(reply);await pending;assert.equal(f.opened.length,0);
 }
});
test('unavailable or mismatched actions cannot open a replacement target',async()=>{
 const f=fixture(),row=f.row();f.reply=async()=>({message_id:'m1',response_thread_id:'main',action:{id:'a1',status:'unavailable',reason:'Блюдо больше недоступно.'},command:null});await row.children[1].children[0].onclick();assert.equal(f.opened.length,0);assert.equal(row.children[1].children[0].disabled,true);assert.match(row.children[2].textContent,/недоступно/);
 const g=fixture();g.reply=async()=>({message_id:'another',response_thread_id:'main',action:{id:'a1'},command:{type:'open_intake',source:{recipe_id:'B02'}}});await g.row().children[1].children[0].onclick();assert.equal(g.opened.length,0);
});
test('unknown commands, arbitrary navigation and unbounded action lists fail closed',async()=>{
 const f=fixture();f.message.actions.push({id:'bad',type:'apply',label:'Save',status:'available'});f.message.actions.push(...Array.from({length:6},(_,i)=>({...f.message.actions[0],id:'extra'+i})));assert.equal(f.row().children[1].children.length,3);
 f.message.actions=[{id:'a1',type:'navigate',label:'Открыть',status:'available'}];const row=f.row();f.reply=async()=>({message_id:'m1',response_thread_id:'main',action:{id:'a1'},command:{type:'navigate',view:'https://example.test/'}});await row.children[1].children[0].onclick();assert.equal(f.opened.length,0);assert.match(row.children[2].textContent,/недоступно/);
});
test('double tap makes one read and intervening state changes require a fresh resolution',async()=>{
 const f=fixture();let release;const reply=await f.reply();f.reply=()=>new Promise(r=>release=r);const row=f.row(),button=row.children[1].children[0];const first=button.onclick();await button.onclick();assert.equal(f.calls.length,1);f.state.revision++;release(reply);await first;assert.equal(f.opened.length,0);assert.match(row.children[2].textContent,/изменились/);assert.equal(button.disabled,false);
});

test('newer route or dialog navigation wins over a late action response',async()=>{
 const f=fixture();let release;const reply=await f.reply();f.reply=()=>new Promise(r=>release=r);
 const pending=f.row().children[1].children[0].onclick();f.context++;release(reply);await pending;
 assert.equal(f.opened.length,0);
});
