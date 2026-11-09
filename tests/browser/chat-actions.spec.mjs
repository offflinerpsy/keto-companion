import {test,expect} from '@playwright/test';
async function snapshot(request){return (await request.get('/__test__/state')).json()}
async function start(page,request){await request.post('/__test__/reset',{data:{entries:0}});await page.goto('/');await expect(page.locator('[data-page=chat]')).toBeVisible()}
async function send(page,text){await page.locator('#message').fill(text);await page.locator('#send').click();await expect(page.locator('#send')).toBeEnabled();await expect(page.locator('.bubble.pending')).toHaveCount(0)}
function button(page,message,action){return page.locator(`[data-message-id="${message.id}"] [data-action-id="${action.id}"]`)}

test('hunger choices survive reload and preserve unsent text without model or diary writes',async({page,request})=>{
 await start(page,request);await send(page,'Хочу поесть');
 await expect(page.locator('.message-actions button')).toHaveCount(3);
 const before=await snapshot(request),message=before.state.chat.at(-1);expect(before.intent_calls).toBe(0);expect(before.stored_diary).toHaveLength(0);
 await expect(page.locator('#toast')).toBeHidden();await page.reload();
 const after=await snapshot(request);expect(after.state.chat.at(-1).id).toBe(message.id);
 await expect(page.locator('.message-actions button')).toHaveCount(3);
 await page.locator('#message').fill('Сохраните мой неотправленный вопрос');
 const action=message.actions.find(a=>a.type==='choose_meal_mode'&&a.target.mode==='inspiration');await button(page,message,action).click();
 await expect(page.locator('[data-page=recipes]')).toBeVisible();await expect(page.getByTestId('mode-inspiration')).toBeChecked();
 await page.locator('#nav [data-view=chat]').click();await expect(page.locator('#message')).toHaveValue('Сохраните мой неотправленный вопрос');
 expect((await snapshot(request)).intent_calls).toBe(0);expect((await snapshot(request)).stored_diary).toHaveLength(0);
 await page.screenshot({path:'qa/mobile-browser/c12-context-actions.png'});
});

test('selected generated recipe opens the shared editor and returns focus to its message action',async({page,request})=>{
 await start(page,request);await page.locator('#nav [data-view=recipes]').click();await page.locator('#recipe-kitchen-disclosure summary').first().click();
 await page.getByTestId('mode-inspiration').check();await page.getByTestId('kitchen-generate').click();
 const candidate=page.getByTestId('kitchen-results').getByTestId('kitchen-candidate').first();await expect(candidate).toBeVisible();
 const name=await candidate.locator('h3').first().innerText();await candidate.getByRole('button',{name:'Выбрать для чата',exact:true}).click();
 await page.locator('#nav [data-view=chat]').click();await send(page,'Запиши половину порции');
 const data=await snapshot(request),message=data.state.chat.at(-1),action=message.actions.find(a=>a.type==='open_intake');expect(action).toBeTruthy();
 expect(data.stored_diary).toHaveLength(0);await page.reload();const open=button(page,message,action);await open.click();
 await expect(page.locator('#intake-dialog')).toBeVisible();await expect(page.locator('#intake-name')).toHaveText(name);await expect(page.locator('#intake-amount')).toHaveValue('0.5');
 await page.locator('#intake-close').click();await expect(open).toBeFocused();
 await open.click();await page.locator('#intake-date').fill('2026-01-03');await page.locator('#intake-review').click();await expect(page.locator('#proposal-dialog')).toBeVisible();
 expect((await snapshot(request)).stored_diary).toHaveLength(0);await page.locator('#proposals').getByRole('button',{name:'Добавить в дневник',exact:true}).click();
 await expect(page.locator('[data-page=diary]')).toBeVisible();await expect(page.locator('#diary-entries')).toContainText(name);expect((await snapshot(request)).stored_diary).toHaveLength(1);
});

test('a delayed contextual action cannot replace a newer destination',async({page,request})=>{
 await start(page,request);await send(page,'Хочу поесть');const message=(await snapshot(request)).state.chat.at(-1),action=message.actions[0];
 let release,entered;const waiting=new Promise(resolve=>entered=resolve),gate=new Promise(resolve=>release=resolve);
 await page.route('**/api/tools/keto_kitchen',async route=>{const args=route.request().postDataJSON();if(args.action!=='chat_action')return route.continue();const response=await route.fetch();entered();await gate;await route.fulfill({response})});
 await button(page,message,action).click();await waiting;await page.locator('#nav [data-view=diary]').click();release();
 await expect(page.locator('[data-page=diary]')).toBeVisible();await expect(page.locator('#diary-status')).not.toContainText('Загружаем');await expect(page.locator('[data-page=recipes]')).toBeHidden();
});

test('an action offers a usable refresh after another device changes the revision',async({page,request})=>{
 await start(page,request);await send(page,'Хочу поесть');const message=(await snapshot(request)).state.chat.at(-1),action=message.actions[0];
 await request.post('/__test__/concurrent-note');await button(page,message,action).click();
 const refresh=page.getByRole('button',{name:'Обновить разговор',exact:true});await expect(refresh).toBeVisible();await refresh.click();
 await expect(page.locator('.message-action-status')).toContainText('Разговор обновлён');await button(page,message,action).click();
 await expect(page.locator('[data-page=recipes]')).toBeVisible();expect((await snapshot(request)).stored_diary).toHaveLength(1);
});
