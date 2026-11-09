import test from 'node:test';
import assert from 'node:assert/strict';
import {createRouter,mainTab,initialRoute,ROUTES} from '../public/routes.js';
import {createScrollMemory,chatScrollPosition,createDialogController} from '../public/shell-ui.js';
function historyHarness(){
 const listeners={},entries=[{state:null,url:''}],events=[],renders=[];let index=0;
 const location={pathname:'/',search:'',hash:''};
 const history={get state(){return entries[index].state},replaceState(state,_,url){entries[index]={state,url};location.hash=url.startsWith('#')?url:''},pushState(state,_,url){entries.splice(index+1);entries.push({state,url});index++;location.hash=url},back(){events.push(()=>{if(index){index--;location.hash=entries[index].url;listeners.popstate()}})},forward(){events.push(()=>{if(index<entries.length-1){index++;location.hash=entries[index].url;listeners.popstate()}})}};
 let currentFocus={isConnected:true,focus(){this.focused=true},closest:()=>null};
 const nodes=new Map();const $=id=>{if(!nodes.has(id))nodes.set(id,{id,open:false,isConnected:true,showModal(){this.open=true},close(){this.open=false},focus(){currentFocus=this;this.focused=true},closest:()=>null});return nodes.get(id)};
 const dialogs=createDialogController({$,getRouter:()=>router,activeElement:()=>currentFocus});
 const router=createRouter({location,history,listen:(name,fn)=>listeners[name]=fn,render:(route,info)=>renders.push({route,...info}),closeDialog:(...args)=>dialogs.sync(...args)});
 return {router,dialogs,$,history,location,entries,renders,get index(){return index},flush(){while(events.length)events.shift()()},focus:node=>currentFocus=node};
}
test('four roots replace tab history; saved Today remains a nested Recipes screen',()=>{
 const f=historyHarness();f.router.go('chat',{replace:true});
 for(const route of ['diary','recipes','products','chat']){f.router.go(route);assert.equal(f.entries.length,1);assert.equal(mainTab(route),route)}
 assert.equal(initialRoute({guidance:{ready:true},ui:{home:'today'}},''),'today');
 f.router.go('today');assert.equal(mainTab(f.router.current),'recipes');assert.equal(f.router.parent(),'recipes');assert.equal(f.entries.length,2);
 f.router.back();f.flush();assert.equal(f.router.current,'recipes');
 f.router.reset();f.router.go('today',{replace:true});f.router.back();assert.equal(f.router.current,'recipes');
 for(const route of ['setup-consent','settings','sources','reminders','developer','targets','knowledge','memory','admin'])assert(ROUTES.includes(route));
});
test('replacing recipe with confirmation uses one history entry; close restores opener and list route',()=>{
 const f=historyHarness();f.router.go('recipes',{replace:true});const opener={isConnected:true,closest:()=>null,focus(){this.focused=true}};f.focus(opener);
 f.dialogs.open('recipe','close-recipe');assert.equal(f.$('recipe-dialog').open,true);assert.equal(f.entries.length,2);
 f.dialogs.open('proposal','proposal-close');assert.equal(f.$('recipe-dialog').open,false);assert.equal(f.$('proposal-dialog').open,true);assert.equal(f.entries.length,2);assert.equal(f.history.state.ketoDialog,'proposal');
 f.dialogs.close();assert.equal(f.$('proposal-dialog').open,false);assert(opener.focused);f.flush();assert.equal(f.router.current,'recipes');assert.equal(f.index,0);
 f.history.forward();f.flush();assert.equal(f.$('proposal-dialog').open,true);
});
test('opening another dialog before asynchronous Back completes does not close the new dialog',()=>{
 const f=historyHarness();f.router.go('chat',{replace:true});f.dialogs.open('attachments');f.dialogs.close();f.dialogs.open('image');
 f.flush();assert.equal(f.$('image-link-details').open,true);assert.equal(f.$('attachments-dialog').open,false);assert.equal(f.history.state.ketoDialog,'image');
});
test('applied confirmation dismisses synchronously before next route; reset clears every private dialog',()=>{
 const f=historyHarness();f.router.go('setup-about',{replace:true});f.dialogs.open('proposal');f.dialogs.dismiss();f.router.go('setup-restrictions');f.flush();assert.equal(f.router.current,'setup-restrictions');assert.equal(f.$('proposal-dialog').open,false);
 f.dialogs.open('source');f.dialogs.reset();f.router.reset();assert.equal(f.$('source-recipe-dialog').open,false);assert.equal(f.location.hash,'');assert.equal(f.dialogs.current,null);
});
test('route and thread scroll memories are independent and reset between users',()=>{
 const m=createScrollMemory();m.saveRoute('recipes',642);m.saveRoute('diary',120);m.saveThread('main',340);m.saveThread('other',32);
 assert.equal(m.route('recipes'),642);assert.equal(m.route('products'),0);assert.equal(m.thread('main'),340);assert.equal(m.thread('missing'),undefined);
 m.clear();assert.equal(m.route('recipes'),0);assert.equal(m.thread('main'),undefined);
});
test('chat updates preserve reading position and stick only near bottom or after submission',()=>{
 const base={previousThread:'main',nextThread:'main',previousKey:'old',nextKey:'new',top:120,height:1000,clientHeight:400};
 assert.deepEqual(chatScrollPosition(base),{render:true,bottom:false,top:120});
 assert.equal(chatScrollPosition({...base,top:570}).bottom,true);
 assert.equal(chatScrollPosition({...base,submitted:true}).bottom,true);
 assert.equal(chatScrollPosition({...base,nextKey:'old'}).render,false);
 assert.deepEqual(chatScrollPosition({...base,nextThread:'other',saved:240}),{render:true,bottom:false,top:240});
 assert.equal(chatScrollPosition({...base,nextThread:'first'}).bottom,true);
});


test('history from a prior session cannot reopen a private dialog after reset',()=>{
 const f=historyHarness();f.router.go('chat',{replace:true});f.dialogs.open('topic');f.dialogs.reset();f.router.reset();f.history.back();f.flush();f.history.forward();f.flush();f.dialogs.sync('topic');assert.equal(f.$('topic-dialog').open,false);assert.equal(f.dialogs.current,null);
});
