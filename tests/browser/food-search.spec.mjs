// Actual HTTP/SQLite search, source review, receipts and mobile layout.
// The account and entered food are synthetic; no paid or family data is used.
import {test,expect} from '@playwright/test';
const baseRows='#portion-results > .food-result-list > .food-option';
const sourceRows='#portion-results .food-reference .food-result-list > .food-option';
const reviewSelector='#portion-results .food-source-review';
const cheeseIds=['F170845','F170855','F173414','F173418','F173420'];
async function state(request){return (await request.get('/__test__/state')).json()}
async function tool(request,name,args){const response=await request.post('/api/tools/'+name,{headers:{'x-csrf-token':'synthetic-ui-csrf'},data:args});expect(response.ok()).toBeTruthy();return response.json()}
async function start(page,request){await request.post('/__test__/reset',{data:{entries:0}});await page.goto('/');await expect(page.locator('[data-page=chat]')).toBeVisible()}
async function portion(page){await page.locator('#nav [data-view=diary]').click();await page.locator('[data-page=diary]').getByText('Продукт и порция',{exact:true}).click()}
function responseFor(page,name,predicate){return page.waitForResponse(r=>r.url().endsWith('/api/tools/'+name)&&predicate(r.request().postDataJSON()))}
async function searchFood(page,query){const result=responseFor(page,'keto_kitchen',a=>a.action==='foods'&&a.query===query);await page.locator('#portion-query').fill(query);await page.locator('#portion-query').press('Enter');const data=await (await result).json();await expect(page.locator('#portion-results > .food-search-status')).not.toContainText('Ищем');return data}
async function searchRecipes(page,query){const result=responseFor(page,'keto_recipes',a=>a.query===query&&a.offset===0);await page.locator('#recipe-query').fill(query);await page.locator('#recipe-search button').click();const data=await (await result).json();await expect(page.locator('#recipe-note')).toContainText(`из ${data.total}`);return data}
async function contained(page,selector){const bad=await page.locator(selector).evaluate(root=>[root,...root.querySelectorAll('input,select,button')].filter(el=>el.getClientRects().length&&el.getBoundingClientRect().width>0).map(el=>({tag:el.id||el.tagName,left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right,overflow:/^(INPUT|SELECT)$/.test(el.tagName)?0:el.scrollWidth-el.clientWidth})).filter(el=>el.left<-.5||el.right>innerWidth+.5||el.overflow>1));expect(bad).toEqual([]);expect(await page.locator('html').evaluate(el=>el.scrollWidth-innerWidth)).toBeLessThanOrEqual(1)}

test('cheese search separates raw foods and a reviewed reference product stays selected through intake',async({page,request},info)=>{
 await start(page,request);await portion(page);const found=await searchFood(page,'сыр');
 expect(found.foods.map(f=>f.food_id).sort()).toEqual(cheeseIds);await expect(page.locator(baseRows)).toHaveCount(5);
 await expect(page.locator(sourceRows)).toHaveCount(8);await expect(page.locator('#portion-results')).toContainText('Ищем сыр и его виды');
 await contained(page,'#portion-results');await page.screenshot({path:`qa/mobile-browser/c17-cheese-${info.project.name}.png`});
 const gouda=await searchFood(page,'гауда');expect(gouda.foods).toHaveLength(0);await expect(page.locator(sourceRows).first()).toBeInViewport();await expect(page.locator('#portion-results > .food-search-status')).toBeFocused();await searchFood(page,'сыр');await expect(page.locator(baseRows)).toHaveCount(5);
 await page.locator(baseRows).filter({hasText:'Сыр чеддер'}).click();await expect(page.locator('#portion-results > .food-search-status')).toBeFocused();await page.locator('#portion-grams').fill('75');
 await searchFood(page,'сыр');await expect(page.locator(sourceRows)).toHaveCount(8);
 await expect(page.locator('#portion-food')).toHaveValue('F173414');await expect(page.locator('#portion-grams')).toHaveValue('75');
 const next=responseFor(page,'keto_kitchen',a=>a.action==='source_search'&&a.values.cursor);
 await page.getByRole('button',{name:'Ещё продукты из справочника',exact:true}).click();expect((await (await next).json()).candidates).toHaveLength(8);await expect(page.locator(sourceRows)).toHaveCount(16);
 const names=await page.locator(sourceRows).allTextContents();expect(new Set(names).size).toBe(16);
 await page.locator(sourceRows).first().click();const review=page.locator(reviewSelector);await expect(review).toBeVisible();
 await review.getByRole('button',{name:'Вернуться к результатам',exact:true}).click();await expect(review).toBeHidden();await expect(page.locator(sourceRows).first()).toBeFocused();
 await page.locator(sourceRows).first().click();await expect(review).toBeVisible();
 const personalName='Сыр — личная синтетическая проверка длинного названия';
 await review.getByLabel('Название продукта',{exact:true}).fill(personalName);await review.getByRole('combobox',{name:'Состояние продукта',exact:true}).selectOption('ready_to_eat');
 await review.locator('summary').click();await review.locator('input[value=milk]').check();await review.getByRole('checkbox',{name:'Название, состояние и аллергены проверены',exact:true}).check();
 for(const width of [360,390,402,430]){await page.setViewportSize({width,height:420});await contained(page,reviewSelector)}
 await page.setViewportSize({width:402,height:681});await page.screenshot({path:`qa/mobile-browser/c17-source-review-${info.project.name}.png`});
 await review.getByRole('button',{name:'Проверить добавление',exact:true}).click();await expect(page.locator('#proposal-dialog')).toBeVisible();
 const before=await state(request),proposal=before.state.pending.find(p=>p.type==='kitchen.source_import'),food=proposal.preview.food;
 expect(food.recipe_eligible).toBe(false);expect(before.stored_diary).toHaveLength(0);expect((await tool(request,'keto_kitchen',{action:'foods',query:food.food_id})).foods).toHaveLength(0);
 await expect(page.locator('#portion-food')).toHaveValue('F173414');
 await page.locator('#proposals').getByRole('button',{name:'Добавить личный продукт',exact:true}).click();await expect(page.locator('#proposal-dialog')).toBeHidden();
 await expect(page.locator('#portion-food')).toHaveValue(food.food_id);await expect(page.locator('#portion-selected-name')).toHaveText(personalName);await expect(page.locator('#portion-grams')).toHaveValue('75');await expect(page.locator('#portion-results > .food-search-status')).toBeFocused();
 expect((await tool(request,'keto_kitchen',{action:'foods',query:food.food_id})).foods.map(f=>f.food_id)).toEqual([food.food_id]);expect((await state(request)).stored_diary).toHaveLength(0);
 await page.locator('#portion-form').getByRole('button',{name:'Рассчитать порцию',exact:true}).click();await page.locator('#portion-result').getByRole('button',{name:'Записать съеденное',exact:true}).click();
 await expect(page.locator('#intake-amount')).toHaveValue('75');await page.locator('#intake-date').fill('2026-01-08');await page.locator('#intake-review').click();await expect(page.locator('#proposal-dialog')).toBeVisible();
 expect((await state(request)).stored_diary).toHaveLength(0);await page.locator('#proposals').getByRole('button',{name:'Добавить в дневник',exact:true}).click();await expect(page.locator('#proposal-dialog')).toBeHidden();
 const after=await state(request);expect(after.stored_diary).toHaveLength(1);expect(after.stored_diary[0].food_id).toBe(food.food_id);expect(after.stored_diary[0].grams).toBe(75);expect(after.intent_calls).toBe(0);
 await expect(page.locator('#diary-entries')).toContainText(personalName);
});

test('raw disambiguation and the own-dish picker preserve deliberate selections',async({page,request})=>{
 await start(page,request);await portion(page);await searchFood(page,'сыр');await page.locator('#portion-results').getByRole('button',{name:'Сырые продукты',exact:true}).click();
 await expect(page.locator('#portion-query')).toHaveValue('сырые продукты');await expect(page.locator('#portion-results > .food-search-status')).not.toContainText('Ищем');
 await expect(page.locator('#portion-results')).toContainText('Ищем продукты в сыром виде');expect((await page.locator(baseRows).allTextContents()).every(x=>x.includes('сырой продукт'))).toBeTruthy();
 await page.locator('#nav [data-view=recipes]').click();await page.locator('#own-dish-root > details > summary').click();const query=page.locator('#own-form [name=search]'),rows=page.locator('#own-results > .food-result-list > .food-option');
 await query.fill('сыр');await query.press('Enter');await expect(rows).toHaveCount(5);await expect(page.locator('#own-results .food-reference .food-option')).toHaveCount(8);
 await rows.filter({hasText:'Сыр чеддер'}).click();const grams=page.locator('#own-rows input');await grams.fill('40');await query.fill('сыр');await query.press('Enter');await expect(rows).toHaveCount(5);await rows.filter({hasText:'Сыр чеддер'}).click();await expect(grams).toHaveCount(1);await expect(grams).toHaveValue('40');
 await page.locator('#own-form [name=name]').fill('Синтетическое блюдо с сыром');await page.locator('#own-form [name=steps]').fill('Нарезать сыр и подать.');
 await query.fill('сыр');await query.press('Enter');const source=page.locator('#own-results .food-reference .food-option');await expect(source).toHaveCount(8);await source.first().click();const review=page.locator('#own-results .food-source-review');await expect(review).toBeVisible();
 const mutations=[];page.on('request',r=>{if(r.url().endsWith('/api/tools/keto_kitchen')&&['own_dish_calculate','own_dish_save','source_import'].includes(r.postDataJSON().action))mutations.push(r.postDataJSON().action)});
 await review.getByLabel('Название продукта',{exact:true}).press('Enter');await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));expect(mutations).toEqual([]);await expect(page.locator('#own-preview')).toBeEmpty();
 await review.getByRole('combobox',{name:'Состояние продукта',exact:true}).selectOption('ready_to_eat');await review.getByRole('checkbox',{name:'Название, состояние и аллергены проверены',exact:true}).check();await review.getByRole('button',{name:'Проверить добавление',exact:true}).focus();await page.keyboard.press('Enter');await expect(page.locator('#proposal-dialog')).toBeVisible();expect(mutations).toEqual(['source_import']);
 await page.locator('#proposals').getByRole('button',{name:'Отмена',exact:true}).click();await expect(page.locator('#proposal-dialog')).toBeHidden();await review.getByRole('button',{name:'Вернуться к результатам',exact:true}).click();
 await page.locator('#own-form').getByRole('button',{name:'Рассчитать блюдо',exact:true}).click();await page.locator('#own-save').click();await page.locator('#proposals').getByRole('button',{name:'Сохранить своё блюдо',exact:true}).click();await expect(page.locator('#proposal-dialog')).toBeHidden();
 await query.fill('яиц');await query.press('Enter');await expect(rows).toHaveCount(2);await rows.first().click();await expect(page.locator('#own-rows input')).toHaveCount(1);expect((await state(request)).stored_diary).toHaveLength(0);
});

test('all 108 recipes are reachable and egg search keeps every ingredient and filter',async({page,request},info)=>{
 await start(page,request);await page.locator('#nav [data-view=recipes]').click();await expect(page.locator('#recipe-note')).toContainText('из 108');let found=await searchRecipes(page,'');expect(found.recipes).toHaveLength(24);const records=[...found.recipes];
 while(found.has_more){const next=responseFor(page,'keto_recipes',a=>a.query===''&&a.offset===records.length);await page.locator('#recipe-more').click();found=await (await next).json();records.push(...found.recipes);await expect(page.locator('#recipes .recipe-card')).toHaveCount(records.length)}
 expect(records).toHaveLength(108);expect(new Set(records.map(r=>r.recipe_id)).size).toBe(108);expect(await page.locator('#recipes .recipe-card h3').allTextContents()).toEqual(records.map(r=>r.name_ru));await expect(page.locator('#recipe-more')).toBeHidden();
 found=await searchRecipes(page,'Яйцо');expect(found.total).toBe(24);expect(found.recipes.every(r=>r.ingredients.some(i=>i.food_id==='F171287'))).toBeTruthy();expect(found.recipes.some(r=>r.recipe_id==='B05')).toBeTruthy();await expect(page.locator('#recipes .recipe-card')).toHaveCount(24);
 await page.screenshot({path:`qa/mobile-browser/c17-egg-recipes-${info.project.name}.png`});
 found=await searchRecipes(page,'яйцо без сыра');expect(found.total).toBeGreaterThan(0);expect(found.recipes.every(r=>r.ingredients.some(i=>i.food_id==='F171287')&&!r.ingredients.some(i=>cheeseIds.includes(i.food_id)))).toBeTruthy();
 found=await searchRecipes(page,'яйцо лунная мука');expect(found.total).toBe(0);await expect(page.locator('#recipes .recipe-card')).toHaveCount(0);
 await page.locator('#recipe-category').selectOption('breakfast');await page.locator('#recipe-minutes').fill('10');found=await searchRecipes(page,'яиц');expect(found.total).toBeGreaterThan(0);expect(found.recipes.every(r=>r.category==='breakfast'&&r.active_minutes<=10)).toBeTruthy();await contained(page,'[data-page=recipes]');
});

test('a cancelled source review ignores a late real import proposal',async({page,request})=>{
 await start(page,request);await portion(page);await searchFood(page,'сыр');await expect(page.locator(sourceRows)).toHaveCount(8);await page.locator(baseRows).filter({hasText:'Сыр чеддер'}).click();await page.locator('#portion-grams').fill('75');await searchFood(page,'сыр');await expect(page.locator(sourceRows)).toHaveCount(8);await page.locator(sourceRows).first().click();const review=page.locator(reviewSelector);await expect(review).toBeVisible();await review.getByRole('combobox',{name:'Состояние продукта',exact:true}).selectOption('ready_to_eat');await review.getByRole('checkbox',{name:'Название, состояние и аллергены проверены',exact:true}).check();
 let release,received;const gate=new Promise(resolve=>{release=resolve}),arrived=new Promise(resolve=>{received=resolve});
 await page.route('**/api/tools/keto_kitchen',async route=>{if(route.request().postDataJSON().action!=='source_import')return route.continue();const response=await route.fetch();expect(response.ok()).toBeTruthy();expect((await response.json()).proposal.type).toBe('kitchen.source_import');received();await gate;await route.fulfill({response})});
 await review.getByRole('button',{name:'Проверить добавление',exact:true}).click();await arrived;await review.getByRole('button',{name:'Вернуться к результатам',exact:true}).click();const late=responseFor(page,'keto_kitchen',a=>a.action==='source_import');release();await (await late).finished();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));
 await expect(page.locator('#proposal-dialog')).toBeHidden();await expect(page.locator('#portion-food')).toHaveValue('F173414');await expect(page.locator('#portion-grams')).toHaveValue('75');expect((await state(request)).stored_diary).toHaveLength(0);
 await page.unroute('**/api/tools/keto_kitchen');await searchFood(page,'яиц');await expect(page.locator(baseRows)).toHaveCount(2);await expect(page.locator('#proposal-dialog')).toBeHidden();
});
