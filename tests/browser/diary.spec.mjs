import {test,expect} from '@playwright/test';
async function open(page,request,options={}){expect((await request.post('/__test__/reset',{data:options})).ok()).toBe(true);await page.goto('/');await expect(page.locator('#workspace')).toBeVisible()}
async function state(request){return (await (await request.get('/__test__/state')).json())}
async function control(request,values){expect((await request.post('/__test__/controls',{data:values})).ok()).toBe(true)}
async function recipe(page){await page.locator('#nav [data-view=recipes]').click();await page.locator('#recipe-query').fill('Омлет со шпинатом и авокадо');await page.locator('#recipe-search button').click();await page.locator('#recipes .recipe-card').filter({has:page.getByRole('heading',{name:'Омлет со шпинатом и авокадо',exact:true})}).click();await page.locator('#recipe-dialog').getByRole('button',{name:'Записать съеденное',exact:true}).click()}
async function review(page){await page.locator('#intake-amount').fill('0.5');await page.locator('#intake-date').fill('2026-01-03');await page.locator('#intake-time').fill('12:40');await page.locator('#intake-meal').selectOption('lunch');await page.locator('#intake-review').click();await expect(page.locator('#proposal-dialog')).toBeVisible()}
async function confirm(page){await page.locator('#proposals').getByRole('button',{name:'Добавить в дневник',exact:true}).click();await expect(page.locator('[data-page=diary]')).toBeVisible();await expect(page.locator('#proposal-dialog')).toBeHidden()}

test('durable receipt keeps food and full-day totals through failed refresh and reload',async({page,request},info)=>{
 await open(page,request);await recipe(page);await review(page);await control(request,{history_fail:true});await confirm(page);
 await expect(page.locator('#diary-refresh')).toBeVisible();await expect(page.locator('#diary-entries')).toContainText('Омлет со шпинатом и авокадо');await expect(page.locator('#diary-entries')).toContainText('12:40');await expect(page.locator('#diary-summary')).toContainText('198 ккал');
 expect((await state(request)).stored_diary).toHaveLength(1);await page.screenshot({path:`qa/mobile-browser/c16-${info.project.name}-saved-refresh-error.png`});
 await control(request,{history_fail:false});await page.locator('#diary-refresh').click();await expect(page.locator('#diary-entries .diary-entry')).toHaveCount(1);
 await page.reload();await expect(page.locator('#diary-day')).toHaveValue('2026-01-03');await expect(page.locator('#diary-entries')).toContainText('0,5 порции');await expect(page.locator('#diary-summary')).toContainText('198 ккал');
 await page.screenshot({path:`qa/mobile-browser/c16-${info.project.name}-day.png`});
 await page.locator('#nav [data-view=chat]').click();await page.locator('#message').fill('Хочу простой ужин без духовки.');await page.locator('#nav [data-view=diary]').click();
 const beforeDiscussion=(await state(request)).state.chat;await page.locator('#diary-discuss').click();await expect(page.locator('#message')).toHaveValue(/^Хочу простой ужин без духовки\.[\s\S]*2026-01-03/);expect((await state(request)).stored_diary).toHaveLength(1);expect((await state(request)).intent_calls).toBe(0);expect((await state(request)).state.chat).toEqual(beforeDiscussion);
});

test('new receipt outside the first page stays visible and pagination has no gaps',async({page,request})=>{
 await open(page,request,{entries:31,same_day:true});const before=(await state(request)).stored_diary.map(x=>x.entry_id);
 await recipe(page);await page.locator('#intake-amount').fill('0.5');await page.locator('#intake-date').fill('2026-01-03');await page.locator('#intake-time').fill('02:30');await page.locator('#intake-review').click();await expect(page.locator('#proposal-dialog')).toBeVisible();const acknowledgement=page.waitForResponse(r=>r.url().endsWith('/api/tools/keto_apply_proposal')&&r.request().postDataJSON()?.approved===true);await confirm(page);const receipt=await (await acknowledgement).json();
 const entries=(await state(request)).stored_diary,added=entries.find(x=>!before.includes(x.entry_id));expect(entries).toHaveLength(32);
 await expect(page.locator('#diary-more')).toBeVisible();await expect(page.locator('#diary-entries .diary-entry')).toHaveCount(31);await expect(page.locator(`[data-entry-id="${added.entry_id}"]`)).toContainText('02:30');
 expect(receipt.diary_summary.entry_count).toBe(32);await expect(page.locator('#diary-summary [data-nutrient="energy_kcal"] .macro-value')).toHaveText(new Intl.NumberFormat('ru-RU',{maximumFractionDigits:0}).format(receipt.diary_summary.nutrition.energy_kcal)+' ккал');
 const nextPage=page.waitForRequest(r=>r.url().endsWith('/api/tools/keto_kitchen')&&r.postDataJSON()?.action==='diary_history');await page.locator('#diary-more').click();expect((await nextPage).postDataJSON().values.offset).toBe(30);await expect(page.locator('#diary-entries .diary-entry')).toHaveCount(32);await expect(page.locator('#diary-more')).toBeHidden();
 const shown=await page.locator('#diary-entries .diary-entry').evaluateAll(nodes=>nodes.map(x=>x.dataset.entryId));expect(new Set(shown).size).toBe(32);expect(shown.sort()).toEqual(entries.map(x=>x.entry_id).sort());
});

test('native motion preserves reduced-motion, focus and mobile scroll boundaries',async({page,request})=>{
 for(const reducedMotion of ['no-preference','reduce']){
  await page.emulateMedia({reducedMotion});await page.setViewportSize({width:402,height:420});await open(page,request);await recipe(page);
  const samples=await page.locator('#intake-dialog').evaluate(async dialog=>{const samples=[];for(let i=0;i<16;i++){await new Promise(requestAnimationFrame);const r=dialog.getBoundingClientRect();samples.push({left:r.left,right:r.right,overflow:dialog.scrollWidth-dialog.clientWidth})}return samples});
  for(const sample of samples){expect(sample.left).toBeGreaterThanOrEqual(10);expect(sample.right).toBeLessThanOrEqual(392);expect(sample.overflow).toBeLessThanOrEqual(1)}
  await expect(page.locator('#intake-dialog')).toHaveCSS('transform','none');expect(await page.locator('dialog[open]').count()).toBe(1);
  await page.locator('#intake-note-options > summary').click();await page.locator('#intake-time-detail > summary').click();
  await page.locator('#intake-dialog').evaluate(async d=>{await Promise.allSettled(d.getAnimations({subtree:true}).map(a=>a.finished))});
  const fold=page.locator('#intake-fold');await fold.focus();await fold.scrollIntoViewIfNeeded();await expect(fold).toBeInViewport({ratio:1});
  const box=await fold.boundingBox(),footer=await page.locator('#intake-review').boundingBox();expect(box.y+box.height).toBeLessThanOrEqual(footer.y-7);
  if(reducedMotion==='reduce'){
   const motion=await page.locator('#intake-dialog').evaluate(d=>({dialog:getComputedStyle(d).animationName,backdrop:getComputedStyle(d,'::backdrop').animationName,chevron:getComputedStyle(d.querySelector('summary'),'::after').transitionDuration}));expect(motion).toEqual({dialog:'none',backdrop:'none',chevron:'0s'});
  }
  await page.locator('#intake-dialog').evaluate(x=>x.scrollLeft=80);expect(await page.locator('#intake-dialog').evaluate(x=>x.scrollLeft)).toBe(0);
  await review(page);await confirm(page);expect(await page.locator('dialog[open]').count()).toBe(0);await expect(page.locator('#diary-receipt .saved-check')).toBeVisible();expect((await state(request)).stored_diary).toHaveLength(1);
  if(reducedMotion==='reduce'){await expect(page.locator('.saved-check path')).toHaveCSS('animation-name','none');await expect(page.locator('.saved-check path')).toHaveCSS('stroke-dashoffset','0px')}
  expect(await page.evaluate(()=>Math.max(document.documentElement.scrollWidth-document.documentElement.clientWidth,document.querySelector('#content').scrollWidth-document.querySelector('#content').clientWidth))).toBeLessThanOrEqual(1);
 }
});

test('a confirmed deletion disappears even when subsequent history fails',async({page,request})=>{
 await open(page,request);await recipe(page);await review(page);await confirm(page);await expect(page.locator('#diary-entries .diary-entry')).toHaveCount(1);
 await page.locator('.diary-entry-more summary').click();await page.getByRole('button',{name:'Удалить запись',exact:true}).click();await expect(page.locator('#proposal-dialog')).toBeVisible();await control(request,{history_fail:true});
 await page.locator('#proposals').getByRole('button',{name:'Удалить запись',exact:true}).click();await expect(page.locator('#proposal-dialog')).toBeHidden();await expect(page.locator('#diary-refresh')).toBeVisible();await expect(page.locator('#diary-entries .diary-entry')).toHaveCount(0);await expect(page.locator('#diary-summary')).not.toContainText('198');expect((await state(request)).stored_diary).toHaveLength(0);
});

test('missing timezone permits browsing and confirms device zone without losing intake draft',async({page,request})=>{
 await open(page,request,{timezone:false});await page.locator('#nav [data-view=diary]').click();await expect(page.locator('#diary-day')).not.toHaveValue('');await expect(page.locator('#diary-entries')).toContainText('Что было на тарелке?');expect((await state(request)).state.profile.timezone).toBeNull();
 await recipe(page);await page.locator('#intake-amount').fill('0.75');await page.locator('#intake-date').fill('2026-01-03');await expect(page.locator('#intake-time')).toBeDisabled();await page.locator('#intake-zone-confirm').click();await expect(page.locator('#proposals')).toContainText('Europe/Minsk');expect((await state(request)).state.profile.timezone).toBeNull();
 await page.locator('#proposals').getByRole('button',{name:'Применить',exact:true}).click();await expect(page.locator('#intake-dialog')).toBeVisible();await expect(page.locator('#intake-amount')).toHaveValue('0.75');await expect(page.locator('#intake-date')).toHaveValue('2026-01-03');await expect(page.locator('#intake-time')).toBeEnabled();expect((await state(request)).stored_diary).toHaveLength(0);
});

test('confirmation waits for in-flight history instead of colliding with account lock',async({page,request})=>{
 await open(page,request);await recipe(page);await review(page);await control(request,{history_delay_ms:1800,single_request:true});await page.goto('/#diary');await expect(page.locator('[data-page=diary]')).toBeVisible();
 await expect.poll(async()=> (await (await request.get('/__test__/controls')).json()).active).toBe(true);
 await page.locator('#pending-open').click();await page.locator('#proposal-list .pending-item').first().click();await confirm(page);expect((await state(request)).stored_diary).toHaveLength(1);expect((await (await request.get('/__test__/controls')).json()).rejected).toBe(0);
});

test('temporal inputs stay within the modal at narrow widths and the footer remains reachable',async({page,request},info)=>{
 await open(page,request);await recipe(page);
 for(const width of [402,360,390,430]){
  await page.setViewportSize({width,height:681});await page.locator('#intake-date').fill('2026-01-03');await page.locator('#intake-time').fill('12:40');
  const geometry=await page.locator('#intake-dialog').evaluate(dialog=>{const d=dialog.getBoundingClientRect(),fields=[...dialog.querySelectorAll('input:not([type=hidden]),select,textarea')].filter(x=>x.getClientRects().length);return {width:innerWidth,left:d.left,right:d.right,overflow:dialog.scrollWidth-dialog.clientWidth,fields:fields.map(x=>{const r=x.getBoundingClientRect(),style=getComputedStyle(x),p=x.parentElement.getBoundingClientRect();return {right:r.right,parentRight:p.right,left:r.left,parentLeft:p.left,font:parseFloat(style.fontSize),appearance:style.appearance,type:x.type}})}});
  expect(geometry.left).toBeGreaterThanOrEqual(10);expect(geometry.right).toBeLessThanOrEqual(width-10);expect(geometry.overflow).toBeLessThanOrEqual(1);
  for(const field of geometry.fields){expect(field.right).toBeLessThanOrEqual(field.parentRight+1);expect(field.left).toBeGreaterThanOrEqual(field.parentLeft-1);expect(field.font).toBeGreaterThanOrEqual(16);if(['date','time'].includes(field.type))expect(field.appearance).toBe('none')}
  await page.locator('#intake-dialog').evaluate(dialog=>{dialog.scrollLeft=80;dialog.scrollTop=dialog.scrollHeight});expect(await page.locator('#intake-dialog').evaluate(x=>x.scrollLeft)).toBe(0);await expect(page.locator('#intake-review')).toBeInViewport();
 }
 await page.setViewportSize({width:402,height:681});await page.locator('#intake-dialog').evaluate(x=>x.scrollTop=0);await page.screenshot({path:`qa/mobile-browser/c16-${info.project.name}-intake.png`});
 await page.setViewportSize({width:402,height:420});await page.locator('#intake-note-options summary').first().click();await page.locator('#intake-note').fill('Проверка последнего поля');await page.locator('#intake-note').scrollIntoViewIfNeeded();
 for(const id of ['intake-note','intake-fold']){
  if(id==='intake-fold')await page.locator('#intake-time-detail > summary').click();
  const field=page.locator('#'+id);await field.focus();await field.scrollIntoViewIfNeeded();await expect(field).toBeInViewport({ratio:1});
  const box=await field.boundingBox(),footer=await page.locator('#intake-review').boundingBox();expect(box.y+box.height).toBeLessThanOrEqual(footer.y-7);expect(await field.evaluate(x=>{const r=x.getBoundingClientRect();return x.contains(document.elementFromPoint(r.left+r.width/2,r.bottom-3))})).toBe(true);
 }
 await expect(page.locator('#intake-review')).toBeInViewport({ratio:1});
 await page.setViewportSize({width:402,height:681});
 await page.locator('#intake-close').click();await page.locator('#nav [data-view=diary]').click();const date=await page.locator('#diary-day').boundingBox(),next=await page.locator('#diary-next').boundingBox();expect(date.x+date.width).toBeLessThanOrEqual(next.x-8);
});
