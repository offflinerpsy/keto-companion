const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
class Element {
  constructor(tag='div'){this.tag=tag;this.children=[];this.textContent='';this.value='';this.hidden=false;this.disabled=false;this.dataset={};this.classList={toggle(){}};this.listeners={};}
  append(...xs){this.children.push(...xs)}
  replaceChildren(...xs){this.children=xs;this.textContent=''}
  addEventListener(type,fn){this.listeners[type]=fn}
  setAttribute(){} scrollIntoView(){} close(){this.open=false} showModal(){this.open=true}
  insertAdjacentElement(){} closest(){return null}
}
const nodes={};const document={body:new Element('body'),getElementById(id){return nodes[id]??=new Element()},createElement(tag){return new Element(tag)},querySelectorAll(){return []},querySelector(){return null},activeElement:null};
const kitchenModule=fs.readFileSync('cloudflare-saas/public/kitchen-ui.js','utf8').replace(/^export /gm,'');
const source=fs.readFileSync('service/static/app.js','utf8').replace(/^import .*;\n/gm,'').split("$('microsoft-login').onclick=")[0];
const context={document,window:{},Intl,Date,setTimeout,clearTimeout,console};vm.createContext(context);
vm.runInContext(kitchenModule+'\n'+source+`
const kitchen=setupKitchen({$,el,call,getState:()=>state,accept,run,notify,setView,epoch:()=>screenEpoch});\nglobalThis.api={setState,renderPlan,renderProposals,openRecipe,clearScreen,readable,numberRu,foodState,call};`,context);
const api=context.api;
function state(owner,opts={}){return {version:'0.2.0',revision:1,subject_kind:'demo',profile:{owner_account_id:owner,profile_revision:1,consent:{storage:true,health_data:true},settings:{},targets:null},ui:{theme:'dark',text_size:'large',density:'comfortable',simple_mode:false,show_nutrition:true},processing_consent:true,screening:{can_plan:false},holds:[],diary:[],plans:[],pending:[],chat:[],ui_history:[],catalog:{recipes:72},...opts};}
const plan={status:'user_accepted',profile_revision:1,days:[{date:'2026-11-08',meals:[{name_ru:'Тестовое блюдо',ingredients:[{name_ru:'Яйцо',grams_edible:0.5,state:'raw'}]}]}]};
api.setState(state('A',{chat:[{role:'user',text:'Личные данные A'}],plans:[plan]}));
assert.equal(nodes.messages.children[0].textContent,'Личные данные A');
api.setState(state('B'));
assert.notEqual(nodes.messages.children[0].textContent,'Личные данные A');assert.equal(nodes['menu-result'].children.length,0);
api.setState(state('B',{plans:[{...plan,status:'stale_requires_recheck'}]}));assert.match(nodes['menu-result'].children[1].textContent,/пересчёта/);
api.setState(state('B',{pending:[{id:'p',type:'plan.accept',payload:plan,expired:true,base_revision:1}]}));
const card=nodes.proposals.children[0];assert(card.children.some(x=>x.tag==='details'));assert(card.children.some(x=>x.disabled===true));assert(card.children.some(x=>x.textContent.includes('истёк')));
assert.equal(api.numberRu(0.5),'0,5');assert.equal(api.foodState('ready_to_eat'),'готовый к употреблению');assert(!api.readable('Сначала скрининг: adult,allergies_reviewed').includes('adult'));
api.openRecipe({active_minutes:10,name_ru:'Блюдо',ingredients:plan.days[0].meals[0].ingredients,steps_ru:['Шаг'],nutrition:{energy_kcal:10,protein_g:0.5,carbohydrate_total_g:1},allergens:['egg'],recipe_id:'B01'});
assert.equal(nodes['recipe-detail'].children[2].children[0].children[0].textContent,'Яйцо · сырой продукт');assert(nodes['recipe-detail'].children.some(x=>x.textContent.includes('Яйца')));
nodes['diary-note'].value='private';api.setState(state('B',{processing_consent:false,profile:{...state('B').profile,consent:{storage:false,health_data:false}}}));assert.equal(nodes['diary-note'].value,'');
const html=fs.readFileSync('service/static/index.html','utf8'),css=fs.readFileSync('service/static/style.css','utf8');assert.match(html,/id="c-processing" type="checkbox" required><span>/);assert.match(html,/отметьте все три пункта/);assert.match(css,/nav\{overflow:visible;white-space:normal;flex-wrap:wrap\}/);assert.match(css,/#toast\{position:static/);
let resolveFetch; context.fetch=()=>new Promise(resolve=>{resolveFetch=resolve});
(async()=>{const pending=api.call('keto_open');await Promise.resolve();await Promise.resolve();api.clearScreen();resolveFetch({ok:true,json:async()=>({state:state('A')})});await assert.rejects(pending,/Сеанс изменился/);console.log('UI no-browser checks passed: account switch and late response, stale plan, expired preview, translations, consent, navigation, inline feedback');})().catch(error=>{console.error(error);process.exitCode=1});
