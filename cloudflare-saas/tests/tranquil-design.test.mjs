import {createFoodPicker} from '../public/food-picker.js';
import {setupChatActions} from '../public/chat-actions.js';
import {setupIntake,intakeReviewNodes} from '../public/intake-ui.js';
import {createScrollMemory,chatScrollPosition,createDialogController} from '../public/shell-ui.js';
import {mainTab,MAIN_ROUTES} from '../public/routes.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import {sourceImportPreview,setupKitchen} from '../public/kitchen-ui.js';
import {createRecipeLibrary} from '../public/recipe-library.js';
import {createRecipePageCalls} from '../public/recipe-page-calls.js';
import {renderTodayPlan} from '../public/today-plan.js';
const read=name=>readFileSync(new URL('../public/'+name,import.meta.url),'utf8');
const html=read('index.html'),css=read('app.css')+read('diary.css')+read('motion.css'),app=read('app.js');
const tokens=JSON.parse(readFileSync(new URL('../../docs/design/DESIGN_TOKENS.json',import.meta.url),'utf8'));
const baselineIds=["app", "nav-back", "connection", "help", "refresh", "login", "cf-login", "cf-claim", "cf-claim-button", "cf-switch", "cf-login-message", "deletion-recovery", "deletion-code", "continue-deletion", "deletion-status", "workspace", "nav", "demo-banner", "content", "consent-panel", "consent-form", "c-processing", "c-storage", "c-health", "toast", "holds", "proposals", "developer-mode-controls", "chat-mode", "topic-picker", "topic-new", "topic-edit", "messages", "chat-extras", "chat-confirmations", "suggestions", "chat-form", "photo-preview", "photo-preview-image", "photo-remove", "message", "image-drop-zone", "image-link-open", "photo-status", "photo", "mic-button", "send", "voice-controls", "voice-timer", "voice-stop", "voice-cancel", "voice-status", "composer-help", "state-summary", "onboard-open", "setup-progress", "setup-stage", "setup-consent-slot", "setup-about", "baseline-form", "baseline-name", "baseline-zone", "baseline-age", "baseline-height", "baseline-weight", "baseline-measured", "baseline-weight-help", "baseline-weight-slider", "baseline-category", "activity-choices", "setup-restrictions-slot", "setup-targets", "setup-confirmations", "saved-targets", "calculate-guidance", "target-preview", "apply-targets", "target-confirmations", "manual-targets", "targets-form", "knowledge-cards", "developer-tab", "admin-tab", "reminder-day-template", "reminder-menu-template", "reminder-list", "reminder-form", "reminder-id", "reminder-title", "reminder-time", "reminder-zone", "reminder-weekdays", "reminder-date", "reminder-enabled", "reminder-reset", "dev-enable", "dev-disable", "dev-refresh", "dev-back", "dev-status", "dev-form", "dev-task", "dev-technical", "dev-draft", "dev-approval", "dev-exact", "dev-generate", "dev-cancel", "dev-output", "dev-diff", "dev-test", "dev-receipt", "dev-download", "dev-preview", "dev-finish", "dev-jobs", "kitchen-memory", "kitchen-studio", "recipe-search", "recipe-query", "recipe-note", "recipes", "diary-form", "diary-date", "diary-note", "diary-entries", "menu-gate", "menu-form", "menu-start", "menu-days", "menu-result", "menu-pdf", "menu-share", "menu-download", "pdf-status", "menu-import", "settings-form", "theme", "text_size", "density", "home", "simple_mode", "show_nutrition", "meals_per_day", "max_active_minutes", "history", "open-onboarding-settings", "revoke", "logout", "delete-data", "profile-form", "display-name", "timezone", "goal", "medications", "question-progress", "screen-questions", "question-prev", "question-next", "allergy-options", "source-form", "source-list", "invite-form", "invite-link", "admin-summary", "version", "topic-dialog", "topic-heading", "topic-title", "topic-rename", "topic-clear", "topic-delete", "topic-close", "source-recipe-dialog", "source-recipe-form", "sr-name", "sr-category", "sr-servings", "sr-minutes", "sr-ingredients", "sr-steps", "sr-close", "recipe-dialog", "recipe-detail", "close-recipe", "help-dialog", "help-search", "help-results", "close-help", "image-link-details", "image-link-title", "image-link-url", "image-link-load", "image-link-close"];
const baselineFields=[["input", {"id": "deletion-code"}, false], ["form", {"id": "consent-form"}, false], ["input", {"id": "c-processing", "type": "checkbox"}, true], ["input", {"id": "c-storage", "type": "checkbox"}, true], ["input", {"id": "c-health", "type": "checkbox"}, true], ["select", {"id": "chat-mode"}, false], ["select", {"id": "topic-picker"}, false], ["form", {"id": "chat-form"}, false], ["textarea", {"id": "message", "maxlength": "6000"}, true], ["input", {"id": "photo", "type": "file", "accept": "image/*"}, false], ["form", {"id": "baseline-form"}, false], ["input", {"id": "baseline-name", "maxlength": "80"}, false], ["input", {"id": "baseline-zone"}, true], ["input", {"id": "baseline-age"}, true], ["input", {"id": "baseline-height"}, true], ["input", {"id": "baseline-weight"}, true], ["input", {"id": "baseline-measured", "type": "date"}, true], ["select", {"id": "baseline-category"}, true], ["input", {"name": "activity", "type": "radio"}, false], ["input", {"name": "activity", "type": "radio"}, false], ["input", {"name": "activity", "type": "radio"}, false], ["input", {"name": "planning-goal", "type": "radio"}, false], ["input", {"name": "planning-goal", "type": "radio"}, false], ["input", {"name": "planning-goal", "type": "radio"}, false], ["input", {"name": "planning-mode", "type": "radio"}, false], ["input", {"name": "planning-mode", "type": "radio"}, false], ["form", {"id": "targets-form"}, false], ["input", {"name": "energy_min_kcal", "type": "number", "min": "1200", "max": "6000"}, true], ["input", {"name": "energy_max_kcal", "type": "number", "min": "1200", "max": "6000"}, true], ["input", {"name": "protein_min_g", "type": "number", "min": "1", "max": "300"}, true], ["input", {"name": "protein_max_g", "type": "number", "min": "1", "max": "350"}, true], ["select", {"name": "carb_basis"}, false], ["input", {"name": "carb_max_g", "type": "number", "min": "1", "max": "300"}, true], ["input", {"name": "fiber_min_g", "type": "number", "min": "0", "max": "80"}, true], ["input", {"name": "saturated_fat_max_pct", "type": "number", "min": "1", "max": "30"}, true], ["textarea", {"name": "basis_note", "maxlength": "500"}, true], ["form", {"id": "reminder-form"}, false], ["input", {"id": "reminder-id", "type": "hidden"}, false], ["input", {"id": "reminder-title", "maxlength": "120"}, true], ["input", {"id": "reminder-time", "type": "time"}, true], ["input", {"id": "reminder-zone"}, true], ["input", {"id": "reminder-date", "type": "date"}, false], ["input", {"id": "reminder-enabled", "type": "checkbox"}, false], ["form", {"id": "dev-form"}, false], ["textarea", {"id": "dev-task", "maxlength": "2000"}, true], ["input", {"id": "dev-technical", "type": "checkbox"}, true], ["form", {"id": "recipe-search"}, false], ["input", {"id": "recipe-query", "maxlength": "200"}, false], ["form", {"id": "diary-form"}, false], ["input", {"id": "diary-date", "type": "date"}, true], ["textarea", {"id": "diary-note", "maxlength": "3000"}, true], ["form", {"id": "menu-form"}, false], ["input", {"id": "menu-start", "type": "date"}, true], ["select", {"id": "menu-days"}, false], ["input", {"id": "menu-import", "type": "file", "accept": ".csv,.json"}, false], ["form", {"id": "settings-form"}, false], ["select", {"id": "theme"}, false], ["select", {"id": "text_size"}, false], ["select", {"id": "density"}, false], ["select", {"id": "home"}, false], ["input", {"id": "simple_mode", "type": "checkbox"}, false], ["input", {"id": "show_nutrition", "type": "checkbox"}, false], ["select", {"id": "meals_per_day"}, false], ["input", {"id": "max_active_minutes", "type": "number", "min": "5", "max": "180"}, false], ["form", {"id": "profile-form"}, false], ["input", {"id": "display-name", "maxlength": "80"}, false], ["input", {"id": "timezone"}, true], ["input", {"id": "goal", "maxlength": "200"}, false], ["input", {"id": "medications", "maxlength": "800"}, false], ["form", {"id": "source-form"}, false], ["input", {"name": "title", "maxlength": "140"}, true], ["input", {"name": "author", "maxlength": "140"}, false], ["input", {"name": "url", "type": "url"}, false], ["textarea", {"name": "text", "maxlength": "2000"}, false], ["input", {"name": "upload", "type": "file", "accept": "image/jpeg,image/png,text/plain"}, false], ["input", {"name": "rights", "type": "checkbox"}, true], ["form", {"id": "invite-form"}, false], ["input", {"name": "email", "type": "email"}, true], ["input", {"id": "topic-title", "maxlength": "80"}, false], ["form", {"id": "source-recipe-form"}, false], ["input", {"id": "sr-name", "maxlength": "200"}, true], ["select", {"id": "sr-category"}, false], ["input", {"id": "sr-servings", "type": "number", "min": "0.1", "max": "30"}, true], ["input", {"id": "sr-minutes", "type": "number", "min": "1", "max": "360"}, true], ["textarea", {"id": "sr-ingredients"}, true], ["textarea", {"id": "sr-steps", "maxlength": "5000"}, true], ["input", {"id": "help-search", "type": "search"}, false], ["input", {"id": "image-link-url", "type": "text", "maxlength": "2000"}, false]];
const attrs=tag=>Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(x=>[x[1],x[2]]));
const fieldContract=source=>[...source.matchAll(/<(?:input|select|textarea|form)\b[^>]*>/g)].map(([tag])=>{
 const all=attrs(tag),selected={};for(const key of ['id','name','type','form','min','max','maxlength','accept'])if(key in all)selected[key]=all[key];
 return [tag.match(/^<(\w+)/)[1],selected,/\brequired(?:\s|>)/.test(tag)];
});
const expectedColors={'canvas-warm-cream':'#FAF9F6','card-surface-white':'#FFFFFF','mint-glaze-surface':'#F0F7F5','spruce-teal':'#0E3B36','deep-charcoal':'#1A2421','slate-neutral':'#6C7A76','verdant-mint':'#43A08A','muted-peach':'#F09E81','dusk-indigo':'#4F659C','coral-alert':'#E06A4E'};
test('system typography and neutral blue application palette are explicit',()=>{
 assert.match(css,/--color-canvas-warm-cream: #F2F2F7/);assert.match(css,/--color-card-surface-white: #FFFFFF/);
 assert.match(css,/--color-spruce-teal: #005FCC/);assert.match(css,/--font-plus-jakarta-sans: -apple-system, BlinkMacSystemFont, system-ui, sans-serif/);
 assert.match(css,/--text-body: 17px/);assert.doesNotMatch(css,/@import|@font-face|https?:\/\//);assert.doesNotMatch(html,/fonts\.google/);
});
function luminance(hex){return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0)}
function contrast(a,b){const v=[luminance(a),luminance(b)].sort((a,b)=>a-b);return(v[1]+.05)/(v[0]+.05)}
test('saved dark enum remains explicit, with readable foreground and control adaptations',()=>{
 assert.match(html,/<option value="ivory-plum">Светлая<\/option>/);assert.match(html,/<option value="light" hidden>Светлая<\/option>/);assert.match(html,/<option value="dark">Тёмная<\/option>/);
 assert.match(app,/u\.theme==='dark'\?'dark'/);assert.match(css,/body\.dark\{[^}]*color-scheme:dark/);
 for(const pair of [['#FFFFFF','#005FCC'],['#50545B','#F2F2F7'],['#F2F3F5','#1C1E24'],['#C3C7D0','#1C1E24'],['#101B2D','#83B8FF'],['#83B8FF','#263448']])assert(contrast(...pair)>=4.5,pair.join('/'));
 assert.match(css,/color:var\(--on-accent\)/);assert.match(css,/--on-accent:#101B2D/);
});
test('all baseline IDs, form boundaries, input names and validation contracts survive',()=>{
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);assert.equal(ids.length,new Set(ids).size,'unique IDs');
 for(const id of baselineIds)assert(ids.includes(id),id);
 const fieldKey=([tag,a])=>tag+':'+(a.id?'id='+a.id:'name='+a.name);
 const baselineKeys=new Set(baselineFields.map(fieldKey));
 const stable=fields=>fields.map(f=>JSON.stringify(f)).sort();assert.deepEqual(stable(fieldContract(html).filter(f=>baselineKeys.has(fieldKey(f)))),stable(baselineFields));
 for(const key of ['dev-approval','dev-exact','dev-preview','image-link-details','chat-confirmations','target-confirmations','setup-confirmations','holds','proposals'])assert(ids.includes(key));
});
test('four primary destinations preserve the nested menu and source route keys',()=>{
 const nav=html.match(/<nav id="nav"[\s\S]*?<\/nav>/)[0];assert.deepEqual([...nav.matchAll(/data-view="([^"]+)"/g)].map(x=>x[1]),['chat','diary','recipes','products']);
 assert.deepEqual([...nav.matchAll(/<span>(Сегодня|Рецепты|Продукты|Дневник|Чат)<\/span>/g)].map(x=>x[1]),['Чат','Дневник','Рецепты','Продукты']);
 assert.match(html,/<button data-view="more"[^>]*aria-label="Профиль и настройки"/);
 for(const value of ['developer','sources','memory','recipes','targets','settings'])assert(html.includes('data-view="'+value+'"'));
 assert.match(app,/button\.onclick=\(\)=>setView\(item\.view\)/);
 assert.match(html,/id="image-link-open"[^>]*aria-label="Фото по ссылке"/);
 assert(!html.includes('↗'));
});
test('menu and login keep task content clear without decorative photo heroes',()=>{
 assert.doesNotMatch(html,/<img[^>]*src="\/tranquil-dawn\.webp"/);
 assert.doesNotMatch(html,/class="dawn-hero/);
 const menuStart=html.indexOf('<section data-page="today"'),nextPage=html.indexOf('<section data-page="',menuStart+1);
 const menu=html.slice(menuStart,nextPage<0?html.length:nextPage);
 assert.match(menu,/<h1>Моё меню<\/h1>/);
 assert.doesNotMatch(menu,/НЕ ЖЁСТКИЙ ГРАФИК|Начните с простого блюда/);
 const chat=html.slice(html.indexOf('<section data-page="chat"'),html.indexOf('<section data-page="setup"'));
 assert(!chat.includes('dawn-hero'));assert(!chat.includes('dawn-overview'));
 assert.doesNotMatch(html,/6,245|10,000|Breathe\. Move|3\/3|sleep.score/i);
});

class Element{
 constructor(tag='div'){this.tag=tag;this.hidden=false;this.value='';this.dataset={};this.children=[];this.textContent='';this.open=false;this.classList={toggle(){}};this.attributes={};}
 addEventListener(name,fn){(this.listeners??={})[name]=fn} prepend(...nodes){this.children.unshift(...nodes)} dispatchEvent(){} focus(){} querySelector(){return null} setAttribute(k,v){this.attributes[k]=v} replaceChildren(...nodes){this.children=nodes;this.textContent=''} append(...nodes){this.children.push(...nodes)} reset(){} showModal(){this.open=true} close(){this.open=false} scrollIntoView(){} querySelectorAll(){return []}
}
function harness(actualStateRender=false,realRecipeLoads=false){
 const nodes={},document={body:new Element(),getElementById(id){return nodes[id]??=new Element()},createElement:tag=>new Element(tag),querySelectorAll:()=>[],querySelector:()=>null};
  const stubs={createFoodPicker:'createFoodPickerFixture',setupChatActions:'setupChatActionsFixture',setupIntake:'setupIntakeFixture',intakeReviewNodes:'intakeReviewNodesFixture',createScrollMemory:'createScrollMemoryFixture',chatScrollPosition:'chatScrollPositionFixture',createDialogController:'createDialogControllerFixture',mainTab:'mainTabFixture',MAIN_ROUTES:'mainRoutesFixture',createRecipePageCalls:'createRecipePageCallsFixture',renderTodayPlan:'renderTodayPlanFixture',setupShop:'()=>({reset(){},afterApplied(){}})',createRecipeLibrary:'()=>({load:async()=>{},next:async()=>{},invalidate(){}})',setupOwnDish:'()=>({reset(){},update(){},savedReceipt(){},afterApplied(){}})',sourceImportPreview:'sourceImportPreviewFixture',setupDeveloper:'()=>({reset(){},identity(){},load(){}})',mountDeveloperExtension:'()=>{}',setupMobile:'()=>({reset(){},render(){},resetPhoto(){},setChatBusy(){},resizeComposer(){},changingTopic(){return false}})',setupGuidance:'()=>({reset(){},render(){},afterApplied(){},resolve(x){return x}})',createRouter:'()=>({reset(){},go(x){globalThis.lastView=x},back(){},openDialog(){},dismissDialog(){}})',setupKitchen:'()=>({render(){},load:async()=>true,invalidatePageLookups(){},reset(){globalThis.kitchenReset?.()}})',kitchenActionLabels:'{}',firebaseLogin:'()=>{}'};
 if(realRecipeLoads){stubs.setupKitchen='setupKitchenFixture';stubs.createRecipeLibrary='createRecipeLibraryFixture'}
 let source=app.replace(/^import \{([^}]+)\} from '[^']+';$/gm,(_,names)=>names.split(',').map(name=>'const '+name+'='+stubs[name]+';').join('')).replace('run(start);','');
 // Render only the changed overview; existing modules are exercised by their own focused tests.
 if(!actualStateRender)source+='\nrenderState=()=>renderTranquilSummary(state);';
 source+='\nglobalThis.api={intake,tranquilSummary,setState,clearScreen,showLogin,call,accept,renderProposals,renderDiary,renderView,setSynthetic(value){state=value}};';
  const context={createFoodPickerFixture:createFoodPicker,setupChatActionsFixture:setupChatActions,setupIntakeFixture:setupIntake,intakeReviewNodesFixture:intakeReviewNodes,createScrollMemoryFixture:createScrollMemory,chatScrollPositionFixture:chatScrollPosition,createDialogControllerFixture:createDialogController,mainTabFixture:mainTab,mainRoutesFixture:MAIN_ROUTES,createRecipePageCallsFixture:createRecipePageCalls,renderTodayPlanFixture:renderTodayPlan,sourceImportPreviewFixture:sourceImportPreview,setupKitchenFixture:setupKitchen,createRecipeLibraryFixture:createRecipeLibrary,document,window:{},history:{},location:{href:'https://synthetic.invalid/'},sessionStorage:{getItem(){return null}},URL,FormData,Blob,Response,crypto:webcrypto,Date,Intl,setTimeout,clearTimeout,console};vm.createContext(context);vm.runInContext(source,context);return{context,api:context.api,nodes};
}
function accepted(){return {processing_consent:true,profile:{owner_account_id:'synthetic-a',profile_revision:5,consent:{storage:true,health_data:true},targets:{}},screening:{can_plan:true},holds:[],guidance:{targets_stale:false},kitchen:{pantry:[{grams:null}]},diary:[{intake_status:'unquantified'}],plans:[]}}
const content=node=>[node.textContent,...node.children.map(content)].join(' ');
test('overview uses saved counts; unquantified intake stays unknown and progress reflects defined steps',()=>{
 const {api}=harness(),state=accepted(),summary=api.tranquilSummary(state);assert.equal(summary.cards[2].value,'1');assert.equal(summary.cards[3].value,'1');assert.equal(summary.completed,3);assert.equal(summary.steps.length,4);
 assert.match(summary.cards[3].note,/не сумма потребления/);assert(!JSON.stringify(summary).includes('ккал'));
 state.plans=[{status:'user_accepted',profile_revision:5,days:[{date:'2026-11-08'}]}];assert.equal(api.tranquilSummary(state).completed,4);
 state.plans[0].status='calculated_draft';assert.equal(api.tranquilSummary(state).completed,3);
 state.plans[0].status='user_accepted';state.plans[0].profile_revision=4;assert.equal(api.tranquilSummary(state).completed,3);
 state.guidance.targets_stale=true;assert.equal(api.tranquilSummary(state).cards[1].value,'Нужен пересмотр');assert.equal(api.tranquilSummary(state).completed,2);
 state.holds=['synthetic_hold'];assert.equal(api.tranquilSummary(state).completed,1);
});
test('missing state stays unknown; an empty diary counts records without claiming zero food',()=>{
 const {api}=harness(),state=accepted();delete state.kitchen;delete state.diary;delete state.profile.targets;delete state.guidance;
 const summary=api.tranquilSummary(state);assert.equal(summary.cards[1].value,'Нет данных');assert.equal(summary.cards[2].value,'Нет данных');assert.equal(summary.cards[3].value,'Нет данных');assert.equal(summary.completed,2);
 state.diary=[];assert.equal(api.tranquilSummary(state).cards[3].value,'0');state.profile.targets={};assert.equal(api.tranquilSummary(state).cards[1].value,'Статус не уточнён');
});
test('no personal overview reads occur before all accepted consents',()=>{
 const {api}=harness();assert.equal(api.tranquilSummary(null),null);
 for(const key of ['processing','storage','health']){const state=accepted();if(key==='processing')state.processing_consent=false;else state.profile.consent[key==='storage'?'storage':'health_data']=false;
 Object.defineProperty(state,'diary',{get(){throw Error('private read before consent')}});Object.defineProperty(state.profile,'targets',{get(){throw Error('private read before consent')}});assert.equal(api.tranquilSummary(state),null);}
});
test('account change, consent revocation and clearScreen remove old overview; late response is rejected',async()=>{
 const {api,nodes,context}=harness(),first=accepted();first.diary=Array.from({length:7},()=>({intake_status:'unquantified'}));api.setState(first);assert.equal(nodes['dawn-overview'].hidden,false);assert(content(nodes['dawn-status-cards']).includes('7'));
 const next=accepted();next.profile.owner_account_id='synthetic-b';next.diary=[];api.setState(next);assert(!content(nodes['dawn-status-cards']).includes('7'));
 const button=nodes['dawn-status-cards'].children[3].children.at(-1);button.onclick();assert.equal(context.lastView,'diary');
 let finish;context.fetch=()=>new Promise(resolve=>finish=resolve);const late=api.call('keto_open').then(api.accept);await new Promise(resolve=>setImmediate(resolve));api.clearScreen();assert.equal(nodes['dawn-overview'].hidden,true);assert.equal(content(nodes['dawn-status-cards']).trim(),'');
 finish(new Response(JSON.stringify({state:first})));await assert.rejects(late,/Сеанс изменился/);assert.equal(nodes['dawn-overview'].hidden,true);
 next.profile.consent.health_data=false;api.setState(next);assert.equal(nodes['dawn-overview'].hidden,true);assert.equal(nodes['dawn-progress'].children.length,0);
 assert.doesNotMatch(app,/localStorage/);
});
test('short-height chat and large text keep dedicated scrolling and compact icon toolbar',()=>{
 assert.match(css,/\.chat-scroll\{[^}]*overflow:auto[^}]*flex:1;min-height:0/);
 assert.match(css,/body\.large \.dawn-status-grid\{grid-template-columns:repeat\(2/);
 assert.match(css,/max-height:650px/);assert.match(css,/\.composer textarea\{min-height:48px;height:48px/);
 const composer=html.slice(html.indexOf('<form id="chat-form"'),html.indexOf('<section data-page="setup"'));
 assert.match(composer,/<div class="composer-bottom composer-row">[\s\S]*id="attachments-open"[\s\S]*id="message"[\s\S]*id="mic-button"[\s\S]*id="send"/);
 assert.doesNotMatch(css,/#(?:holds|proposals|chat-confirmations)\s*\{[^}]*display:none/);
});

test('actual full state renderer updates overview instead of leaving an isolated tested helper unused',()=>{
 const {api,nodes}=harness(true);const s=accepted();Object.assign(s,{version:'test',mobile_version:'test',revision:1,subject_kind:'personal',ui:{theme:'ivory-plum',text_size:'normal',density:'comfortable',simple_mode:false,show_nutrition:true},catalog:{recipes:72},pending:[],chat:[],ui_history:[],diary:[]});s.profile.targets=null;
 api.setState(s);assert.equal(nodes['dawn-overview'].hidden,false);assert.equal(nodes['dawn-status-cards'].children.length,4);assert.match(content(nodes['dawn-status-cards']),/Не задан/);
 api.setState({...s,processing_consent:false});assert.equal(nodes['dawn-overview'].hidden,true);assert.equal(nodes['dawn-status-cards'].children.length,0);
});

test('pantry confirmation presents names and known or unknown mass without machine keys',()=>{
 const {api,nodes}=harness();const s=accepted();Object.assign(s,{revision:4,pending:[{id:'p',type:'kitchen.pantry',base_revision:4,payload:{items:[{food_id:'ID123',state:'raw',grams:120},{food_id:'ID456',state:'raw',grams:null}]},preview:{items:[{food_id:'ID123',name_ru:'Яйца',state:'raw',grams:120},{food_id:'ID456',name_ru:'Кабачок',state:'raw',grams:null}]}}]});api.setSynthetic(s);api.renderProposals();const shown=content(nodes.proposals);assert.match(shown,/Яйца/);assert.match(shown,/120 г/);assert.match(shown,/Кабачок/);assert.match(shown,/масса не указана/);assert.doesNotMatch(shown,/ID123|ID456|items|undefined/);assert.match(shown,/Сохранить продуктов: 2/);
});
test('diary reads full history and displays the named saved amount',async()=>{const {api,nodes,context}=harness();const s=accepted();s.revision=4;s.profile.timezone='Europe/Minsk';api.setSynthetic(s);let args;context.fetch=async(_,options)=>{args=JSON.parse(options.body);return new Response(JSON.stringify({entries:[{entry_id:'old-entry',date:'2026-11-09',recipe_id:'r',name_ru:'Омлет',amount:{value:.5,unit:'portion'}}],total:1,has_more:false,revision:4,summary:null}),{status:200})};await api.intake.reload();assert.equal(args.action,'diary_history');assert.equal(args.values.limit,30);assert.match(content(nodes['diary-entries']),/Омлет/);assert.match(content(nodes['diary-entries']),/0,5 порции/);assert.match(content(nodes['diary-entries']),/Исправить/);assert.match(content(nodes['diary-entries']),/Повторить/)});

test('old pantry proposal with no readable preview cannot apply',()=>{
 const {api,nodes}=harness();const s=accepted();Object.assign(s,{revision:4,pending:[{id:'old',type:'kitchen.pantry',base_revision:4,payload:{items:[{food_id:'hidden-id',state:'raw',grams:120}]}}]});api.setSynthetic(s);api.renderProposals();const card=nodes.proposals.children[0];const button=card.children.find(n=>n.textContent==='Сохранить продуктов: 1');assert.equal(button.disabled,true);assert.match(content(card),/Отмените его и подготовьте/);assert.doesNotMatch(content(card),/hidden-id/);
});

test('diary draft survives cancellation and clears only unchanged confirmed submission',async()=>{
 for(const scenario of ['cancel','unchanged','edited']){
  const {api,nodes,context}=harness(),s=accepted();const payload={date:'2026-11-09',note:'Заметка',intake_status:'unquantified'};
  Object.assign(s,{revision:4,pending:[{id:'diary-p',type:'diary.add',base_revision:4,payload}]});api.setSynthetic(s);context.document.getElementById('diary-date').value=payload.date;context.document.getElementById('diary-note').value=scenario==='edited'?'Заметка изменена':payload.note;
  let request;context.fetch=async(_,opts)=>{request=JSON.parse(opts.body);return new Response(JSON.stringify({state:{...s,pending:[]},...(request.approved?{receipt:{id:'diary-p',type:'diary.add'}}:{})}),{status:200})};
  api.renderProposals();const card=nodes.proposals.children[0];const button=card.children.find(n=>n.textContent===(scenario==='cancel'?'Отмена':'Добавить в дневник'));await button.listeners.click();
  assert.equal(request.approved,scenario!=='cancel');assert.equal(nodes['diary-note'].value,scenario==='unchanged'?'':scenario==='edited'?'Заметка изменена':payload.note);
 }
});

test('kitchen action confirmations disclose preference, forgotten fact, day and pantry removals',()=>{
 const {api,nodes}=harness(),s=accepted();Object.assign(s,{revision:4,kitchen:{pantry:[{food_id:'old',name_ru:'Молоко'},{food_id:'stay',name_ru:'Яйца'}],preferences:[{id:'f',text:'Не люблю рыбу'}]},pending:[
 {id:'1',type:'kitchen.remember',base_revision:4,payload:{text:'Не люблю сыр',food_ids:['private']}},
 {id:'2',type:'kitchen.forget',base_revision:4,payload:{fact_id:'f'}},
 {id:'3',type:'kitchen.accept_day',base_revision:4,payload:{recipe_id:'internal',thread_id:'secret'},preview:{day_items:['Омлет','Рыба']}},
 {id:'4',type:'kitchen.pantry',base_revision:4,payload:{items:[{food_id:'stay',state:'raw',grams:null}]},preview:{items:[{food_id:'stay',name_ru:'Яйца',state:'raw',grams:null}]}}]});
 api.setSynthetic(s);api.renderProposals();const shown=content(nodes.proposals);for(const text of ['Не люблю сыр','Не люблю рыбу','Омлет','Рыба','Удаляется продуктов: 1 — Молоко'])assert(shown.includes(text),text);assert.doesNotMatch(shown,/private|internal|secret/);
});
test('reset sequence clears forms before kitchen defaults, keeping body inputs blank',()=>{
 const {api,nodes,context}=harness();const events=[];const field=context.document.getElementById('synthetic-portions'),body=context.document.getElementById('baseline-weight');field.value='3';body.value='80';
 context.document.querySelectorAll=selector=>selector==='form'?[{reset(){events.push('forms');field.value='';body.value=''}}]:[];
 context.kitchenReset=()=>{events.push('kitchen');field.value='1'};
 api.clearScreen();assert.deepEqual(events,['forms','kitchen']);assert.equal(field.value,'1');assert.equal(body.value,'');
});
test('recipes route marks recipes as active and exposes current page identity',()=>{
 const {api,context}=harness();const buttons=['chat','diary','recipes','products'].map(view=>{const b=new Element('button');b.dataset.view=view;b.classList={toggle(_,on){b.active=on}};return b});
 context.document.querySelectorAll=selector=>selector==='#nav [data-view],.head-actions [data-view]'?buttons:[];api.renderView('recipes',{reason:'history'});const recipes=buttons.find(b=>b.dataset.view==='recipes'),today=buttons.find(b=>b.dataset.view==='chat');assert.equal(recipes.active,true);assert.equal(recipes.attributes['aria-current'],'page');assert.equal(today.active,false);assert.match(html,/<section data-page="recipes"[^>]*>[\s\S]*?<h1>Рецепты<\/h1>/);
});

test('shop proposal renders a typed Russian review instead of internal fields',()=>{
 const {api,nodes}=harness();const s=accepted();s.revision=4;s.pending=[{id:'p',type:'catalog.food.add',base_revision:4,payload:{food_id:'Uinternal123',name_ru:'Молоко',state:'ready_to_eat',allergens:['milk'],provenance:{type:'shop_label',provider:'open_food_facts',barcode:'3017620422003',license:'ODbL'},source_ref:'https://world.openfoodfacts.org/product/3017620422003',declared_label:{basis:'per100ml',mass_g:103,energy_kcal:52,protein_g:3.2,fat_g:3,carbohydrate_g:4.7,fiber_g:null,carbohydrate_basis:'available_excludes_fiber'},energy_kcal:50.49,protein_g:3.11,fat_g:2.91,carbohydrate_total_g:null,fiber_g:null}}];api.setSynthetic(s);api.renderProposals();const shown=content(nodes.proposals);for(const text of ['Молоко','На 100 мл','103 г','Молоко','нет данных','Open Food Facts','ODbL','Сохранить личный продукт'])assert(shown.toLowerCase().includes(text.toLowerCase()),text);assert.doesNotMatch(shown,/Uinternal123|declared_label|carbohydrate_total_g|provenance|Применить/);
});
test('actual recipe route serializes initial reads and drops stale navigation results',async()=>{
 const {api,context,nodes}=harness(false,true),s=accepted();s.active_thread='main';s.kitchen={pantry:[],preferences:[],legacy_disliked:[],favorites_details:[]};s.profile.allergies=[];s.profile.settings={favorites:[],disliked_food_ids:[]};api.setSynthetic(s);
 const requests=[],pending=[];let active=0,max=0;context.fetch=async(url,opts)=>{active++;max=Math.max(max,active);if(active>1)throw Error('synthetic server lock collision');const args=JSON.parse(opts.body);requests.push({url,args});return await new Promise(resolve=>pending.push(data=>{active--;resolve(new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}}))}))};
 const flush=()=>new Promise(r=>setImmediate(r));const respond=async data=>{assert(pending.length,'pending fetch');pending.shift()(data);await flush()};
 api.renderView('recipes',{reason:'user'});api.renderView('recipes',{reason:'user'});await flush();assert.equal(requests.length,1);assert.match(requests[0].url,/keto_recipes/);assert.equal(nodes['kitchen-studio'].attributes['aria-busy'],'true');
 await respond({recipes:[],total:0,note:'ok',has_more:false});assert.equal(requests[1].args.action,'status');await respond({});assert.equal(requests[2].args.action,'foods');await respond({foods:[],total:0});assert.equal(max,1);assert.equal(nodes['kitchen-studio'].attributes['aria-busy'],'false');assert.equal(requests.length,3);
 api.renderView('today',{reason:'user'});api.renderView('recipes',{reason:'user'});await flush();assert.equal(requests.length,4);api.renderView('today',{reason:'user'});api.renderView('recipes',{reason:'user'});await respond({recipes:[],total:99,note:'STALE RESULT',has_more:false});assert.equal(requests.length,5);assert(!nodes['recipe-note'].textContent.includes('99'));await respond({recipes:[],total:0,note:'fresh',has_more:false});await respond({});await respond({foods:[],total:0});assert.equal(max,1);assert.equal(nodes['recipe-note'].textContent,'Показано 0 из 0');assert.equal(requests.length,7);
});
test('recipe reentry cancels debounced kitchen search and waits for an in-flight page lookup',async()=>{
 const {api,context,nodes}=harness(false,true),s=accepted();s.active_thread='main';s.kitchen={pantry:[],preferences:[],legacy_disliked:[],favorites_details:[]};s.profile.allergies=[];s.profile.settings={favorites:[],disliked_food_ids:[]};api.setSynthetic(s);
 const req=[],pending=[];let active=0,max=0;context.fetch=async(url,opts)=>{active++;max=Math.max(max,active);if(active>1)throw Error('synthetic server lock collision');const args=JSON.parse(opts.body);req.push({url,args});return await new Promise(resolve=>pending.push(data=>{active--;resolve(new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}}))}))};const flush=()=>new Promise(r=>setImmediate(r));const respond=async data=>{assert(pending.length,'pending fetch');pending.shift()(data);await flush()};const finishLoad=async()=>{await respond({recipes:[],total:0,note:'ok',has_more:false});await respond({});await respond({foods:[],total:0})};const walk=n=>[n,...n.children.flatMap(walk)];
 api.renderView('recipes',{reason:'user'});await flush();await finishLoad();const product=walk(nodes['kitchen-studio']).find(n=>n.id==='kitchen-product'),avoid=walk(nodes['recipe-kitchen-slot']).find(n=>n.id==='kitchen-avoid');product.value='сохранённый ввод';product.oninput();avoid.value='не люблю сыр';avoid.oninput();api.renderView('today',{reason:'user'});api.renderView('recipes',{reason:'user'});await flush();assert.equal(req.length,4);await new Promise(r=>setTimeout(r,300));assert.equal(req.length,4,'cancelled debounce must not issue foods');assert.equal(product.value,'сохранённый ввод');assert.equal(avoid.value,'не люблю сыр');await finishLoad();
 avoid.value='поиск в процессе';avoid.oninput();await new Promise(r=>setTimeout(r,300));assert.equal(req.length,7);assert.equal(req[6].args.action,'foods');api.renderView('today',{reason:'user'});api.renderView('recipes',{reason:'user'});await flush();assert.equal(req.length,7,'automatic read waits for in-flight lookup');await respond({foods:[{food_id:'stale',name_ru:'СТАРЫЙ',state:'raw'}],total:1});assert.equal(req.length,8);assert.match(req[7].url,/keto_recipes/);assert(!walk(nodes['kitchen-studio']).some(n=>n.textContent.includes('СТАРЫЙ')));assert.equal(avoid.value,'поиск в процессе');await finishLoad();assert.equal(max,1);assert.equal(req.length,10);
});


test('Products loads stock serially without an unnecessary recipe catalogue request',async()=>{
 const {api,context}=harness(false,true),s=accepted();s.active_thread='main';s.kitchen={pantry:[],preferences:[],legacy_disliked:[],favorites_details:[]};s.profile.allergies=[];s.profile.settings={favorites:[],disliked_food_ids:[]};api.setSynthetic(s);
 const requests=[];context.fetch=async(url,opts)=>{const args=JSON.parse(opts.body);requests.push({url,args});return new Response(JSON.stringify(args.action==='foods'?{foods:[],total:0}:{}),{status:200,headers:{'Content-Type':'application/json'}})};
 api.renderView('products',{reason:'user'});await new Promise(r=>setImmediate(r));assert.deepEqual(requests.map(r=>r.args.action),['status','foods']);assert(!requests.some(r=>r.url.includes('keto_recipes')));
});
