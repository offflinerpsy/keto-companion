// Complete source-to-diary paths over the actual HTTP Service and SQLite store.
// Membership and entered food are synthetic; no provider calls or family data.
import {test,expect} from '@playwright/test';

async function state(request){return (await request.get('/__test__/state')).json()}
async function start(page,request){
 await request.post('/__test__/reset',{data:{entries:0}});
 await page.goto('/');await expect(page.locator('[data-page=chat]')).toBeVisible();
}
async function reviewIntake(page,{amount,unit,date,time='12:40'}={}){
 await expect(page.locator('#intake-dialog')).toBeVisible();
 if(amount!==undefined)await page.locator('#intake-amount').fill(amount);
 if(unit!==undefined)await page.locator('#intake-unit').selectOption(unit);
 await page.locator('#intake-date').fill(date);await page.locator('#intake-time').fill(time);
 await page.locator('#intake-meal').selectOption('lunch');await page.locator('#intake-review').click();
 await expect(page.locator('#proposal-dialog')).toBeVisible();
}
async function addToDiary(page){
 await page.locator('#proposals').getByRole('button',{name:'Добавить в дневник',exact:true}).click();
 await expect(page.locator('#proposal-dialog')).toBeHidden();
 await expect(page.locator('[data-page=diary]')).toBeVisible();
 await expect(page.locator('#diary-status')).not.toContainText('Загружаем');
}

test('own dish is calculated and saved before its chosen fraction is recorded once',async({page,request})=>{
 await start(page,request);const before=await state(request),name='Авокадо — своя закуска';
 await page.locator('#nav [data-view=recipes]').click();
 await page.locator('#own-dish-root > details > summary').click();
 await page.locator('#own-form [name=name]').fill(name);
 await page.locator('#own-form [name=servings]').fill('4');
 await page.locator('#own-form [name=search]').fill('Авокадо');
 await page.locator('#own-results').getByRole('button',{name:'Авокадо, мякоть · сырой продукт',exact:true}).click();
 await page.locator('#own-rows').getByRole('textbox',{name:'Граммы съедобной части: Авокадо, мякоть',exact:true}).fill('200');
 await page.locator('#own-form [name=steps]').fill('Размять мякоть и разделить на четыре порции.');
 await page.locator('#own-form').getByRole('button',{name:'Рассчитать блюдо',exact:true}).click();
 await expect(page.locator('#own-save')).toBeVisible();
 expect((await state(request)).stored_diary).toHaveLength(0);
 await page.locator('#own-save').click();await expect(page.locator('#proposal-dialog')).toBeVisible();
 await expect(page.locator('#proposals')).toContainText(name);
 expect((await state(request)).state.kitchen.own_recipes).toEqual(before.state.kitchen.own_recipes);
 await page.locator('#proposals').getByRole('button',{name:'Сохранить своё блюдо',exact:true}).click();
 await expect(page.locator('#proposal-dialog')).toBeHidden();await expect(page.locator('#own-record')).toBeVisible();
 const saved=await state(request),recipeId=await page.locator('#own-saved').inputValue();
 expect(saved.state.kitchen.own_recipes).toHaveLength(before.state.kitchen.own_recipes.length+1);
 expect(saved.stored_diary).toHaveLength(0);
 await page.locator('#own-record').click();await expect(page.locator('#intake-name')).toHaveText(name);
 await expect(page.locator('#intake-amount')).toHaveValue('1');await expect(page.locator('#intake-unit')).toHaveValue('portion');
 await reviewIntake(page,{amount:'0.5',unit:'batch',date:'2026-01-05',time:'18:15'});
 await expect(page.locator('#proposals')).toContainText('0,5 всего блюда');
 await expect(page.locator('#proposals')).toContainText('160 ккал');
 expect((await state(request)).stored_diary).toHaveLength(0);
 await addToDiary(page);const after=await state(request),entry=after.stored_diary[0];
 expect(after.stored_diary).toHaveLength(1);expect(entry.recipe_id).toBe(recipeId);
 expect(entry.amount).toEqual({value:.5,unit:'batch'});expect(entry.portions).toBe(2);
 expect(entry.date).toBe('2026-01-05');expect(entry.eaten_at).toBe('2026-01-05T18:15:00+03:00');
 expect(entry.nutrition_snapshot.source.kind).toBe('own_dish');expect(entry.nutrition_snapshot.basis.base_servings).toBe(4);
 expect(entry.nutrition_snapshot.nutrition.energy_kcal).toBe(80);
 expect(after.state.kitchen.own_recipes).toEqual(saved.state.kitchen.own_recipes);
 expect(after.state.kitchen.pantry).toEqual(before.state.kitchen.pantry);
 await expect(page.locator('#diary-entries')).toContainText(name);await expect(page.locator('#diary-summary')).toContainText('160 ккал');
 await page.screenshot({path:'qa/mobile-browser/c13-own-dish-diary.png'});
});

test('manual grocery review preserves unknowns and records eaten grams independently of stock',async({page,request})=>{
 await start(page,request);const before=await state(request),name='Йогурт — синтетическая этикетка';
 await page.locator('#nav [data-view=products]').click();await page.locator('#shop-root > details > summary').click();
 await expect(page.locator('#shop-methods')).toBeVisible();await expect(page.locator('#shop-cancel')).toBeHidden();
 await expect(page.locator('#shop-form')).toBeHidden();await page.screenshot({path:'qa/mobile-browser/c13-shop-methods.png'});
 await page.locator('#shop-photo-method').click();await expect(page.locator('#shop-photo-stage')).toBeVisible();
 await expect(page.locator('#shop-read')).toBeDisabled();await expect(page.locator('#shop-barcode-stage')).toBeHidden();
 await page.locator('#shop-other-method').click();await page.locator('#shop-manual').click();
 await expect(page.locator('#shop-methods')).toBeHidden();await expect(page.locator('#shop-form')).toBeVisible();
 await expect(page.locator('#shop-allergens')).toBeHidden();await expect(page.locator('#shop-portion')).toBeHidden();
 await page.locator('#shop-form [name=name]').fill(name);
 await page.locator('#shop-form [name=state]').selectOption('ready_to_eat');
 await page.locator('#shop-form [name=unit_basis]').selectOption('per100g');
 for(const [field,value] of Object.entries({energy_kcal:'100',protein_g:'5',fat_g:'7',carb:'4'}))await page.locator(`#shop-form [name=${field}]`).fill(value);
 await page.locator('#shop-form [name=basis]').selectOption('total_includes_fiber');
 await expect(page.locator('#shop-form [name=fiber_g]')).toHaveValue('');
 await page.locator('#shop-allergen-review > summary').click();await page.locator('#shop-allergens input[value=milk]').check();
 await page.locator('#shop-form [name=confirm]').check();await page.locator('#shop-submit').click();
 await expect(page.locator('#proposal-dialog')).toBeVisible();await expect(page.locator('#proposals')).toContainText(name);
 await expect(page.locator('#proposals')).toContainText('клетчатка нет данных');
 const pending=await state(request),proposal=pending.state.pending.find(p=>p.type==='catalog.food.add'),foodId=proposal.payload.food_id;
 expect(proposal.payload.fiber_g).toBeNull();expect(proposal.payload.declared_label.basis).toBe('per100g');
 expect(proposal.payload.allergens).toContain('milk');expect(pending.stored_diary).toHaveLength(0);
 await page.locator('#proposals').getByRole('button',{name:'Сохранить личный продукт',exact:true}).click();
 await expect(page.locator('#proposal-dialog')).toBeHidden();await expect(page.locator('#shop-record')).toBeVisible();
 await expect(page.locator('#shop-saved-name')).toContainText(name);
 expect((await state(request)).stored_diary).toHaveLength(0);
 await page.locator('#shop-next-options > summary').click();await page.locator('#shop-grams').fill('900');
 await page.locator('#shop-record').click();await expect(page.locator('#intake-name')).toHaveText(name);
 await expect(page.locator('#intake-amount')).toHaveValue('100');await expect(page.locator('#intake-unit')).toHaveValue('g');
 await reviewIntake(page,{amount:'125',date:'2026-01-06'});
 await expect(page.locator('#proposals')).toContainText('125 г');await expect(page.locator('#proposals')).toContainText('125 ккал');
 await expect(page.locator('#proposals')).toContainText('нет данных · неполные данные');await expect(page.locator('#proposals')).not.toContainText('учтено 0 г');
 expect((await state(request)).stored_diary).toHaveLength(0);
 await page.screenshot({path:'qa/mobile-browser/c13-shop-intake-review.png'});
 await addToDiary(page);const after=await state(request),entry=after.stored_diary[0];
 expect(after.stored_diary).toHaveLength(1);expect(entry.food_id).toBe(foodId);expect(entry.grams).toBe(125);
 expect(entry.amount).toEqual({value:125,unit:'g'});expect(entry.nutrition_snapshot.source.kind).toBe('product');
 expect(entry.nutrition_snapshot.nutrition.fiber_g).toBeNull();expect(entry.nutrition_snapshot.nutrition.net_carbohydrate_g).toBeNull();
 expect(entry.nutrition_snapshot.allergens).toContain('milk');
 expect(after.state.kitchen.pantry).toEqual(before.state.kitchen.pantry);
 await expect(page.locator('#diary-summary')).toContainText('125 ккал');await expect(page.locator('#diary-summary')).toContainText('неполные данные');
 await expect(page.locator('#diary-entries')).toContainText(name);await page.reload();
 await expect(page.locator('[data-page=diary]')).toBeVisible();await page.locator('#diary-day').fill('2026-01-06');await page.locator('#diary-day').dispatchEvent('change');
 await expect(page.locator('#diary-entries')).toContainText(name);expect((await state(request)).stored_diary[0]).toEqual(entry);
});

test('portion calculator transfers the selected food and grams through explicit diary confirmation',async({page,request})=>{
 await start(page,request);const before=await state(request);
 await page.locator('#nav [data-view=diary]').click();
 await page.locator('[data-page=diary]').getByText('Продукт и порция',{exact:true}).click();
 await page.locator('#portion-query').fill('Авокадо');await page.locator('#portion-search button').click();
 await page.locator('#portion-results').getByRole('button',{name:'Авокадо, мякоть · сырой продукт',exact:true}).click();
 await expect(page.locator('#portion-food')).toHaveValue('F171705');await page.locator('#portion-grams').fill('75');
 await page.locator('#portion-form').getByRole('button',{name:'Рассчитать порцию',exact:true}).click();
 await expect(page.locator('#portion-result')).toContainText('Энергия: 120 ккал');
 await expect(page.locator('#portion-result')).toContainText('ГИ: неизвестен.');
 expect((await state(request)).stored_diary).toHaveLength(0);
 // Changing an amount invalidates the old result and its record action.
 await page.locator('#portion-grams').fill('80');await expect(page.locator('#portion-result')).toBeEmpty();
 await page.locator('#portion-grams').fill('75');await page.locator('#portion-form').getByRole('button',{name:'Рассчитать порцию',exact:true}).click();
 await page.locator('#portion-result').getByRole('button',{name:'Записать съеденное',exact:true}).click();
 await expect(page.locator('#intake-name')).toHaveText('Авокадо, мякоть');await expect(page.locator('#intake-amount')).toHaveValue('75');
 await expect(page.locator('#intake-unit')).toHaveValue('g');await reviewIntake(page,{date:'2026-01-07'});
 await expect(page.locator('#proposals')).toContainText('120 ккал');expect((await state(request)).stored_diary).toHaveLength(0);
 await addToDiary(page);const after=await state(request),entry=after.stored_diary[0];
 expect(after.stored_diary).toHaveLength(1);expect(entry.food_id).toBe('F171705');expect(entry.grams).toBe(75);
 expect(entry.nutrition_snapshot.source.kind).toBe('product');expect(entry.nutrition_snapshot.basis).toEqual({unit:'g',quantity:100});
 expect(entry.nutrition_snapshot.nutrition.energy_kcal).toBe(160);expect(entry).not.toHaveProperty('gi');
 expect(after.state.kitchen.pantry).toEqual(before.state.kitchen.pantry);await expect(page.locator('#diary-summary')).toContainText('120 ккал');
});
