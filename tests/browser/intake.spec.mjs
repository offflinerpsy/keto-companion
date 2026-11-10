// Actual UI, HTTP validation and persisted calculations; synthetic membership only.
import {test,expect} from '@playwright/test';

async function stored(request){return (await (await request.get('/__test__/state')).json()).stored_diary}
async function open(page,request,entries=0){await request.post('/__test__/reset',{data:{entries}});await page.goto('/');await expect(page.locator('[data-page=chat]')).toBeVisible()}
async function recipe(page){
 await page.locator('#nav [data-view=recipes]').click();
 await page.locator('#recipe-query').fill('Омлет со шпинатом и авокадо');await page.locator('#recipe-search button').click();
 await page.locator('#recipes .recipe-card').filter({has:page.getByRole('heading',{name:'Омлет со шпинатом и авокадо',exact:true})}).click();
 await page.locator('#recipe-dialog').getByRole('button',{name:'Записать съеденное',exact:true}).click();
 await expect(page.locator('#intake-dialog')).toBeVisible();
}
async function prepare(page,{amount='0.5',date='2026-01-03',time='12:40',unit='portion'}={}){
 await page.locator('#intake-amount').fill(amount);await page.locator('#intake-unit').selectOption(unit);
 await page.locator('#intake-date').fill(date);await page.locator('#intake-time').fill(time);await page.locator('#intake-meal').selectOption('lunch');
 await page.locator('#intake-review').click();await expect(page.locator('#proposal-dialog')).toBeVisible();
 await expect(page.locator('#proposals')).toContainText('Омлет со шпинатом и авокадо');
}
async function apply(page,label='Добавить в дневник'){
 await page.locator('#proposals').getByRole('button',{name:label,exact:true}).click();
 await expect(page.locator('[data-page=diary]')).toBeVisible();await expect(page.locator('#proposal-dialog')).toBeHidden();
 await expect(page.locator('#diary-status')).not.toContainText('Загружаем');
}

test('recipe, amount, eating time, review and persistence form one complete path',async({page,request})=>{
 await open(page,request);await recipe(page);await prepare(page);
 expect(await stored(request)).toHaveLength(0);
 await expect(page.locator('#proposals')).toContainText('0,5 порции');await expect(page.locator('#proposals')).toContainText('12:40');
 await page.screenshot({path:'qa/mobile-browser/c11-intake-review.png'});
 await apply(page);const before=await stored(request);expect(before).toHaveLength(1);
 expect(before[0].date).toBe('2026-01-03');expect(before[0].time).toBe('12:40');expect(before[0].portions).toBe(.5);expect(before[0].nutrition_snapshot).toBeTruthy();
 await expect(page.locator('#diary-day')).toHaveValue('2026-01-03');await expect(page.locator('#diary-summary')).toContainText('198 ккал');
 await expect(page.locator('#diary-entries')).toContainText('Омлет со шпинатом и авокадо');
 await page.screenshot({path:'qa/mobile-browser/c11-day-saved.png'});
 await page.reload();await expect(page.locator('[data-page=diary]')).toBeVisible();
 await expect(page.locator('#diary-day')).toHaveValue('2026-01-03');
 await expect(page.locator('#diary-entries')).toContainText('0,5 порции');expect((await stored(request))[0]).toEqual(before[0]);
});

test('cancel does not log; edit keeps identity; repeat creates a new reviewed record',async({page,request})=>{
 await open(page,request);await recipe(page);await prepare(page);
 await page.locator('#proposals').getByRole('button',{name:'Отмена',exact:true}).click();
 await expect(page.locator('#proposal-dialog')).toBeHidden();expect(await stored(request)).toHaveLength(0);
 await recipe(page);await prepare(page);await apply(page);const first=(await stored(request))[0];
 await page.locator('#diary-entries').getByRole('button',{name:'Исправить',exact:true}).click();
 await page.locator('#intake-amount').fill('0.25');await page.locator('#intake-clear-time').click();await page.locator('#intake-meal').selectOption('');
 await expect(page.locator('#intake-time')).toHaveValue('');expect(await page.locator('#intake-form').evaluate(form=>Array.from(form.elements).filter(x=>x.willValidate&&!x.validity.valid).map(x=>({id:x.id,value:x.value,badInput:x.validity.badInput,message:x.validationMessage})))).toEqual([]);
 await page.locator('#intake-review').click();await expect(page.locator('#proposal-dialog')).toBeVisible();await apply(page,'Сохранить исправление');
 const edited=(await stored(request))[0];expect(edited.entry_id).toBe(first.entry_id);expect(edited.recorded_at).toBe(first.recorded_at);expect(edited.portions).toBe(.25);expect(edited.time).toBeNull();expect(edited.meal||'').toBe('');
 await page.locator('#diary-entries').getByRole('button',{name:'Повторить',exact:true}).click();await expect(page.locator('#intake-time')).toHaveValue('');
 await page.locator('#intake-date').fill('2026-01-04');await page.locator('#intake-review').click();await expect(page.locator('#proposal-dialog')).toBeVisible();expect(await stored(request)).toHaveLength(1);
 await apply(page);const repeated=await stored(request);expect(repeated).toHaveLength(2);expect(repeated[1].entry_id).not.toBe(first.entry_id);expect(repeated[1].date).toBe('2026-01-04');expect(repeated[0]).toEqual(edited);
});

test('history beyond sixty stays reachable, and stale pagination is explicitly refreshed',async({page,request})=>{
 await open(page,request,75);const initial=await stored(request);expect(initial).toHaveLength(75);
 await page.locator('#nav [data-view=diary]').click();await page.locator('#diary-all').click();
 await expect(page.locator('#diary-entries .diary-entry')).toHaveCount(30);await page.locator('#diary-more').click();await expect(page.locator('#diary-entries .diary-entry')).toHaveCount(60);
 await page.locator('#diary-more').click();await expect(page.locator('#diary-entries .diary-entry')).toHaveCount(75);
 const old=page.locator(`[data-entry-id="${initial[0].entry_id}"]`);await old.getByRole('button',{name:'Исправить',exact:true}).click();await expect(page.locator('#intake-date')).toHaveValue('2026-10-01');await page.locator('#intake-close').click();
 await page.reload();await expect(page.locator('#diary-entries .diary-entry')).toHaveCount(30);
 await request.post('/__test__/concurrent-note');await page.locator('#diary-more').click();
 await expect(page.locator('#diary-refresh')).toBeVisible();await expect(page.locator('#diary-entries .diary-entry')).toHaveCount(30);
 await page.locator('#diary-refresh').click();await expect(page.locator('#diary-status')).toContainText('из 76');
 await page.locator('#diary-entries').getByRole('button',{name:'Исправить',exact:true}).first().click();
 await page.locator('#intake-review').click();await expect(page.locator('#proposal-dialog')).toBeVisible();
 await page.locator('#proposals').getByRole('button',{name:'Отмена',exact:true}).click();
});

test('editing a legacy note preserves missing historical snapshot and precise eating time',async({page,request})=>{
 await open(page,request);await request.post('/__test__/legacy-record');await page.reload();
 await page.locator('#nav [data-view=diary]').click();await page.locator('#diary-all').click();
 await page.locator('#diary-entries').getByRole('button',{name:'Исправить',exact:true}).click();
 await page.locator('#intake-note-options summary').first().click();await page.locator('#intake-note').fill('Исправлена только заметка');
 await page.locator('#intake-review').click();await expect(page.locator('#proposal-dialog')).toBeVisible();
 await expect(page.locator('#proposals')).toContainText('Исторический расчёт не сохранился');
 await apply(page,'Сохранить исправление');const entry=(await stored(request))[0];
 expect(entry.entry_id).toBe('synthetic_legacy');expect(entry.note).toBe('Исправлена только заметка');
 expect(entry.eaten_at).toBe('2026-01-03T12:40:17+03:00');expect(entry.recorded_at).toBe('2026-01-04T10:00:00Z');
 expect(entry.meal).toBe('Поздний завтрак');expect(entry).not.toHaveProperty('nutrition_snapshot');expect(entry.portions).toBe(.5);
});
