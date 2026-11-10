import test from 'node:test';
import assert from 'node:assert/strict';
import {nutritionOverview,diaryNavigation,validDiaryDay} from '../public/diary-model.js';
const targets={status:'agreed',energy_min_kcal:1700,energy_max_kcal:1900,protein_min_g:85,protein_max_g:180,carb_basis:'net_estimate',carb_max_g:40,fiber_min_g:25};
const state={profile:{targets},guidance:{targets_stale:false}};
function summary(){const nutrition={energy_kcal:400,protein_g:20,fat_g:30,carbohydrate_total_g:20,net_carbohydrate_g:12,fiber_g:8};return {entry_count:2,nutrition,coverage:Object.fromEntries(Object.entries(nutrition).map(([key,value])=>[key,{complete:true,known_subtotal:value}]))}}
test('agreed targets preserve net basis, ranges and no invented fat target',()=>{
 const view=nutritionOverview(summary(),state),cards=Object.fromEntries(view.cards.map(c=>[c.key,c]));
 assert.equal(cards.energy_kcal.goal,'1 700–1 900 ккал');assert.equal(cards.net_carbohydrate_g.value,12);assert.equal(cards.net_carbohydrate_g.progress,.3);
 assert.equal(cards.fat_g.goal,'');assert.equal(cards.fat_g.progress,null);assert.equal(cards.protein_g.status,'Пока ниже ориентира');
});
test('a note or incomplete label prevents exact progress despite a numeric subtotal',()=>{
 const data=summary();data.incomplete_entries=1;data.coverage.energy_kcal.complete=false;data.coverage.net_carbohydrate_g={complete:false,known_subtotal:null};data.nutrition.net_carbohydrate_g=null;
 const cards=nutritionOverview(data,state).cards;assert.equal(cards[0].text,'учтено 400 ккал');assert.equal(cards[0].progress,null);assert.equal(cards[2].text,'—');assert.equal(cards[2].progress,null);
});
test('empty day, missing targets and stale targets do not manufacture a daily norm',()=>{
 const empty=nutritionOverview({entry_count:0,nutrition:{energy_kcal:0}},state);assert.ok(empty.cards.every(c=>c.value===null&&c.progress===null));
 for(const profile of [{}, {targets:{...targets,status:'draft'}}])assert.ok(nutritionOverview(summary(),{profile}).cards.every(c=>c.goal===''&&c.progress===null));
 const stale=nutritionOverview(summary(),{...state,guidance:{targets_stale:true}});assert.equal(stale.stale,true);assert.ok(stale.cards.every(c=>c.progress===null&&c.goal===''));
});
test('navigation is account-scoped, validates dates and persists no diary content',()=>{
 const map=new Map(),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
 const alice=diaryNavigation(storage,'synthetic-a'),bob=diaryNavigation(storage,'synthetic-b');alice.save('2026-01-03',true);
 assert.deepEqual(alice.read(),{day:'2026-01-03',allDates:true});assert.equal(bob.read(),null);assert.deepEqual(Object.keys(JSON.parse([...map.values()][0])),['day','allDates']);
 alice.save('2026-02-31',false);assert.equal(alice.read().day,'2026-01-03');alice.clear();assert.equal(alice.read(),null);assert.equal(validDiaryDay('2026-02-31'),false);
 assert.equal(diaryNavigation(undefined,'synthetic').read(),null);
});

test('manual targets pause comparison when a clinical hold exists',()=>{
 const view=nutritionOverview(summary(),{...state,holds:['clinician_review']});assert.equal(view.paused,true);assert.equal(view.agreed,true);assert.ok(view.cards.every(card=>card.progress===null));
});
