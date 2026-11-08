import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {kitchenModes,kitchenActionLabels,setupKitchen} from '../public/kitchen-ui.js';
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
