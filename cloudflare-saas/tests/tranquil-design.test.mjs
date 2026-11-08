import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
const read=name=>readFileSync(new URL('../public/'+name,import.meta.url),'utf8');
const html=read('index.html'),css=read('app.css'),app=read('app.js');
const tokens=JSON.parse(readFileSync(new URL('../../docs/design/DESIGN_TOKENS.json',import.meta.url),'utf8'));
const baselineIds=["app", "nav-back", "connection", "help", "refresh", "login", "cf-login", "cf-claim", "cf-claim-button", "cf-switch", "cf-login-message", "deletion-recovery", "deletion-code", "continue-deletion", "deletion-status", "workspace", "nav", "demo-banner", "content", "consent-panel", "consent-form", "c-processing", "c-storage", "c-health", "toast", "holds", "proposals", "developer-mode-controls", "chat-mode", "topic-picker", "topic-new", "topic-edit", "messages", "chat-extras", "chat-confirmations", "suggestions", "chat-form", "photo-preview", "photo-preview-image", "photo-remove", "message", "image-drop-zone", "image-link-open", "photo-status", "photo", "mic-button", "send", "voice-controls", "voice-timer", "voice-stop", "voice-cancel", "voice-status", "composer-help", "state-summary", "onboard-open", "setup-progress", "setup-stage", "setup-consent-slot", "setup-about", "baseline-form", "baseline-name", "baseline-zone", "baseline-age", "baseline-height", "baseline-weight", "baseline-measured", "baseline-weight-help", "baseline-weight-slider", "baseline-category", "activity-choices", "setup-restrictions-slot", "setup-targets", "setup-confirmations", "saved-targets", "calculate-guidance", "target-preview", "apply-targets", "target-confirmations", "manual-targets", "targets-form", "knowledge-cards", "developer-tab", "admin-tab", "reminder-day-template", "reminder-menu-template", "reminder-list", "reminder-form", "reminder-id", "reminder-title", "reminder-time", "reminder-zone", "reminder-weekdays", "reminder-date", "reminder-enabled", "reminder-reset", "dev-enable", "dev-disable", "dev-refresh", "dev-back", "dev-status", "dev-form", "dev-task", "dev-technical", "dev-draft", "dev-approval", "dev-exact", "dev-generate", "dev-cancel", "dev-output", "dev-diff", "dev-test", "dev-receipt", "dev-download", "dev-preview", "dev-finish", "dev-jobs", "kitchen-memory", "kitchen-studio", "recipe-search", "recipe-query", "recipe-note", "recipes", "diary-form", "diary-date", "diary-note", "diary-entries", "menu-gate", "menu-form", "menu-start", "menu-days", "menu-result", "menu-pdf", "menu-share", "menu-download", "pdf-status", "menu-import", "settings-form", "theme", "text_size", "density", "home", "simple_mode", "show_nutrition", "meals_per_day", "max_active_minutes", "history", "open-onboarding-settings", "revoke", "logout", "delete-data", "profile-form", "display-name", "timezone", "goal", "medications", "question-progress", "screen-questions", "question-prev", "question-next", "allergy-options", "source-form", "source-list", "invite-form", "invite-link", "admin-summary", "version", "topic-dialog", "topic-heading", "topic-title", "topic-rename", "topic-clear", "topic-delete", "topic-close", "source-recipe-dialog", "source-recipe-form", "sr-name", "sr-category", "sr-servings", "sr-minutes", "sr-ingredients", "sr-steps", "sr-close", "recipe-dialog", "recipe-detail", "close-recipe", "help-dialog", "help-search", "help-results", "close-help", "image-link-details", "image-link-title", "image-link-url", "image-link-load", "image-link-close"];
const baselineFields=[["input", {"id": "deletion-code"}, false], ["form", {"id": "consent-form"}, false], ["input", {"id": "c-processing", "type": "checkbox"}, true], ["input", {"id": "c-storage", "type": "checkbox"}, true], ["input", {"id": "c-health", "type": "checkbox"}, true], ["select", {"id": "chat-mode"}, false], ["select", {"id": "topic-picker"}, false], ["form", {"id": "chat-form"}, false], ["textarea", {"id": "message", "maxlength": "6000"}, true], ["input", {"id": "photo", "type": "file", "accept": "image/*"}, false], ["form", {"id": "baseline-form"}, false], ["input", {"id": "baseline-name", "maxlength": "80"}, false], ["input", {"id": "baseline-zone"}, true], ["input", {"id": "baseline-age"}, true], ["input", {"id": "baseline-height"}, true], ["input", {"id": "baseline-weight"}, true], ["input", {"id": "baseline-measured", "type": "date"}, true], ["select", {"id": "baseline-category"}, true], ["input", {"name": "activity", "type": "radio"}, false], ["input", {"name": "activity", "type": "radio"}, false], ["input", {"name": "activity", "type": "radio"}, false], ["input", {"name": "planning-goal", "type": "radio"}, false], ["input", {"name": "planning-goal", "type": "radio"}, false], ["input", {"name": "planning-goal", "type": "radio"}, false], ["input", {"name": "planning-mode", "type": "radio"}, false], ["input", {"name": "planning-mode", "type": "radio"}, false], ["form", {"id": "targets-form"}, false], ["input", {"name": "energy_min_kcal", "type": "number", "min": "1200", "max": "6000"}, true], ["input", {"name": "energy_max_kcal", "type": "number", "min": "1200", "max": "6000"}, true], ["input", {"name": "protein_min_g", "type": "number", "min": "1", "max": "300"}, true], ["input", {"name": "protein_max_g", "type": "number", "min": "1", "max": "350"}, true], ["select", {"name": "carb_basis"}, false], ["input", {"name": "carb_max_g", "type": "number", "min": "1", "max": "300"}, true], ["input", {"name": "fiber_min_g", "type": "number", "min": "0", "max": "80"}, true], ["input", {"name": "saturated_fat_max_pct", "type": "number", "min": "1", "max": "30"}, true], ["textarea", {"name": "basis_note", "maxlength": "500"}, true], ["form", {"id": "reminder-form"}, false], ["input", {"id": "reminder-id", "type": "hidden"}, false], ["input", {"id": "reminder-title", "maxlength": "120"}, true], ["input", {"id": "reminder-time", "type": "time"}, true], ["input", {"id": "reminder-zone"}, true], ["input", {"id": "reminder-date", "type": "date"}, false], ["input", {"id": "reminder-enabled", "type": "checkbox"}, false], ["form", {"id": "dev-form"}, false], ["textarea", {"id": "dev-task", "maxlength": "2000"}, true], ["input", {"id": "dev-technical", "type": "checkbox"}, true], ["form", {"id": "recipe-search"}, false], ["input", {"id": "recipe-query", "maxlength": "200"}, false], ["form", {"id": "diary-form"}, false], ["input", {"id": "diary-date", "type": "date"}, true], ["textarea", {"id": "diary-note", "maxlength": "3000"}, true], ["form", {"id": "menu-form"}, false], ["input", {"id": "menu-start", "type": "date"}, true], ["select", {"id": "menu-days"}, false], ["input", {"id": "menu-import", "type": "file", "accept": ".csv,.json"}, false], ["form", {"id": "settings-form"}, false], ["select", {"id": "theme"}, false], ["select", {"id": "text_size"}, false], ["select", {"id": "density"}, false], ["select", {"id": "home"}, false], ["input", {"id": "simple_mode", "type": "checkbox"}, false], ["input", {"id": "show_nutrition", "type": "checkbox"}, false], ["select", {"id": "meals_per_day"}, false], ["input", {"id": "max_active_minutes", "type": "number", "min": "5", "max": "180"}, false], ["form", {"id": "profile-form"}, false], ["input", {"id": "display-name", "maxlength": "80"}, false], ["input", {"id": "timezone"}, true], ["input", {"id": "goal", "maxlength": "200"}, false], ["input", {"id": "medications", "maxlength": "800"}, false], ["form", {"id": "source-form"}, false], ["input", {"name": "title", "maxlength": "140"}, true], ["input", {"name": "author", "maxlength": "140"}, false], ["input", {"name": "url", "type": "url"}, false], ["textarea", {"name": "text", "maxlength": "2000"}, false], ["input", {"name": "upload", "type": "file", "accept": "image/jpeg,image/png,text/plain"}, false], ["input", {"name": "rights", "type": "checkbox"}, true], ["form", {"id": "invite-form"}, false], ["input", {"name": "email", "type": "email"}, true], ["input", {"id": "topic-title", "maxlength": "80"}, false], ["form", {"id": "source-recipe-form"}, false], ["input", {"id": "sr-name", "maxlength": "200"}, true], ["select", {"id": "sr-category"}, false], ["input", {"id": "sr-servings", "type": "number", "min": "0.1", "max": "30"}, true], ["input", {"id": "sr-minutes", "type": "number", "min": "1", "max": "360"}, true], ["textarea", {"id": "sr-ingredients"}, true], ["textarea", {"id": "sr-steps", "maxlength": "5000"}, true], ["input", {"id": "help-search", "type": "search"}, false], ["input", {"id": "image-link-url", "type": "text", "maxlength": "2000"}, false]];
const attrs=tag=>Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(x=>[x[1],x[2]]));
const fieldContract=source=>[...source.matchAll(/<(?:input|select|textarea|form)\b[^>]*>/g)].map(([tag])=>{
 const all=attrs(tag),selected={};for(const key of ['id','name','type','form','min','max','maxlength','accept'])if(key in all)selected[key]=all[key];
 return [tag.match(/^<(\w+)/)[1],selected,/\brequired(?:\s|>)/.test(tag)];
});
const expectedColors={'canvas-warm-cream':'#FAF9F6','card-surface-white':'#FFFFFF','mint-glaze-surface':'#F0F7F5','spruce-teal':'#0E3B36','deep-charcoal':'#1A2421','slate-neutral':'#6C7A76','verdant-mint':'#43A08A','muted-peach':'#F09E81','dusk-indigo':'#4F659C','coral-alert':'#E06A4E'};
test('supplied named palette, shapes and local font policy reach the application',()=>{
 for(const [name,value]of Object.entries(expectedColors)){assert.equal(tokens.tokens['--color-'+name],value);assert(css.includes('--color-'+name+': '+value+';'));}
 for(const [name,value]of Object.entries(tokens.tokens))assert(css.includes(name+': '+value+';'),name);
 assert.equal(tokens.tokens['--radius'],'22px');assert.equal(tokens.tokens['--radius-hero'],'24px');assert.equal(tokens.tokens['--radius-input'],'12px');assert.equal(tokens.tokens['--radius-pill'],'999px');
 assert.match(css,/--bg: var\(--color-canvas-warm-cream\)/);assert.match(css,/--accent: var\(--color-spruce-teal\)/);
 assert.doesNotMatch(css,/@import|@font-face|https?:\/\//);assert.doesNotMatch(html,/fonts\.google/);
 const manifest=JSON.parse(read('manifest.webmanifest'));assert.equal(manifest.background_color,'#FAF9F6');assert.equal(manifest.theme_color,'#0E3B36');
});
function luminance(hex){return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0)}
function contrast(a,b){const v=[luminance(a),luminance(b)].sort((a,b)=>a-b);return(v[1]+.05)/(v[0]+.05)}
test('saved dark enum remains explicit, with readable foreground and control adaptations',()=>{
 assert.match(html,/<option value="ivory-plum">Tranquil Dawn<\/option>/);assert.match(html,/<option value="dark">Тёмная адаптация/);
 assert.match(app,/u\.theme==='dark'\?'dark'/);assert.match(css,/body\.dark\{[^}]*color-scheme:dark/);
 for(const pair of [['#FFFFFF','#0E3B36'],['#5E6F68','#FAF9F6'],['#EFF5F1','#203630'],['#B5C9C0','#203630'],['#142521','#ACDCCD']])assert(contrast(...pair)>=4.5,pair.join('/'));
 assert.match(css,/color:var\(--on-accent\)/);assert.match(css,/--on-accent:#142521/);
});
test('all baseline IDs, form boundaries, input names and validation contracts survive',()=>{
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);assert.equal(ids.length,new Set(ids).size,'unique IDs');
 for(const id of baselineIds)assert(ids.includes(id),id);
 assert.deepEqual(fieldContract(html),baselineFields);
 for(const key of ['dev-approval','dev-exact','dev-preview','image-link-details','chat-confirmations','target-confirmations','setup-confirmations','holds','proposals'])assert(ids.includes(key));
});
test('four primary destinations and source route keys remain usable with icon controls',()=>{
 const nav=html.match(/<nav id="nav"[\s\S]*?<\/nav>/)[0];assert.deepEqual([...nav.matchAll(/data-view="([^"]+)"/g)].map(x=>x[1]),['chat','today','diary','more']);
 assert.equal((nav.match(/aria-hidden="true"/g)||[]).length,4);
 for(const value of ['developer','sources','memory','recipes','targets','settings'])assert(html.includes('data-view="'+value+'"'));
 assert.match(app,/button\.onclick=\(\)=>setView\(item\.view\)/);
 assert.match(html,/id="image-link-open"[^>]*aria-label="Фото по ссылке"/);
 assert(!html.includes('↗'));
});
test('decorative same-origin photograph is limited to login and menu, with readable text surfaces',()=>{
 const images=[...html.matchAll(/<img[^>]*src="\/tranquil-dawn\.webp"[^>]*>/g)].map(x=>x[0]);assert.equal(images.length,2);for(const image of images){assert.match(image,/alt=""/);assert.match(image,/width="960" height="480"/);assert.doesNotMatch(image,/https?:|auth|token/)}
 const chat=html.slice(html.indexOf('<section data-page="chat"'),html.indexOf('<section data-page="setup"'));assert(!chat.includes('dawn-hero'));assert(!chat.includes('dawn-overview'));
 assert.match(css,/background:var\(--hero-surface\)/);assert.match(css,/--hero-surface: rgba\(250,249,246,.96\)/);
 assert.doesNotMatch(html,/6,245|10,000|Breathe\. Move|3\/3|sleep.score/i);
});
class Element{
 constructor(tag='div'){this.tag=tag;this.hidden=false;this.value='';this.dataset={};this.children=[];this.textContent='';this.open=false;this.classList={toggle(){}};this.attributes={};}
 addEventListener(){} setAttribute(k,v){this.attributes[k]=v} replaceChildren(...nodes){this.children=nodes;this.textContent=''} append(...nodes){this.children.push(...nodes)} reset(){} close(){this.open=false} scrollIntoView(){} querySelectorAll(){return []}
}
function harness(actualStateRender=false){
 const nodes={},document={body:new Element(),getElementById(id){return nodes[id]??=new Element()},createElement:tag=>new Element(tag),querySelectorAll:()=>[],querySelector:()=>null};
 const stubs={setupDeveloper:'()=>({reset(){},identity(){},load(){}})',mountDeveloperExtension:'()=>{}',setupMobile:'()=>({reset(){},render(){},resetPhoto(){},setChatBusy(){}})',setupGuidance:'()=>({reset(){},render(){},afterApplied(){},resolve(x){return x}})',createRouter:'()=>({reset(){},go(x){globalThis.lastView=x},back(){}})',setupKitchen:'()=>({render(){},reset(){}})',kitchenActionLabels:'{}',firebaseLogin:'()=>{}'};
 let source=app.replace(/^import \{([^}]+)\} from '[^']+';$/gm,(_,names)=>names.split(',').map(name=>'const '+name+'='+stubs[name]+';').join('')).replace('run(start);','');
 // Render only the changed overview; existing modules are exercised by their own focused tests.
 if(!actualStateRender)source+='\nrenderState=()=>renderTranquilSummary(state);';
 source+='\nglobalThis.api={tranquilSummary,setState,clearScreen,showLogin,call,accept};';
 const context={document,window:{},history:{},location:{href:'https://synthetic.invalid/'},sessionStorage:{getItem(){return null}},URL,FormData,Blob,Response,crypto:webcrypto,Date,Intl,setTimeout,clearTimeout,console};vm.createContext(context);vm.runInContext(source,context);return{context,api:context.api,nodes};
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
 let finish;context.fetch=()=>new Promise(resolve=>finish=resolve);const late=api.call('keto_open').then(api.accept);api.clearScreen();assert.equal(nodes['dawn-overview'].hidden,true);assert.equal(content(nodes['dawn-status-cards']).trim(),'');
 finish(new Response(JSON.stringify({state:first})));await assert.rejects(late,/Сеанс изменился/);assert.equal(nodes['dawn-overview'].hidden,true);
 next.profile.consent.health_data=false;api.setState(next);assert.equal(nodes['dawn-overview'].hidden,true);assert.equal(nodes['dawn-progress'].children.length,0);
 assert.doesNotMatch(app,/localStorage/);
});
test('short-height chat and large text keep dedicated scrolling and compact icon toolbar',()=>{
 assert.match(css,/\.chat-scroll\{[^}]*overflow:auto[^}]*flex:1;min-height:0/);
 assert.match(css,/body\.large \.dawn-status-grid\{grid-template-columns:repeat\(2/);
 assert.match(css,/max-height:650px/);assert.match(css,/\.composer textarea\{min-height:48px;height:48px/);
 const composer=html.slice(html.indexOf('<form id="chat-form"'),html.indexOf('<section data-page="setup"'));
 assert.match(composer,/<div class="composer-bottom">[\s\S]*id="image-link-open"[\s\S]*id="mic-button"[\s\S]*id="send"/);
 assert.doesNotMatch(css,/#(?:holds|proposals|chat-confirmations)\s*\{[^}]*display:none/);
});

test('actual full state renderer updates overview instead of leaving an isolated tested helper unused',()=>{
 const {api,nodes}=harness(true);const s=accepted();Object.assign(s,{version:'test',mobile_version:'test',revision:1,subject_kind:'personal',ui:{theme:'ivory-plum',text_size:'normal',density:'comfortable',simple_mode:false,show_nutrition:true},catalog:{recipes:72},pending:[],chat:[],ui_history:[],diary:[]});s.profile.targets=null;
 api.setState(s);assert.equal(nodes['dawn-overview'].hidden,false);assert.equal(nodes['dawn-status-cards'].children.length,4);assert.match(content(nodes['dawn-status-cards']),/Не задан/);
 api.setState({...s,processing_consent:false});assert.equal(nodes['dawn-overview'].hidden,true);assert.equal(nodes['dawn-status-cards'].children.length,0);
});
