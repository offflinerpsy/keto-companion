// Real DOM and styles with synthetic API responses. No clinical/device claim.
import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const fixture=JSON.parse(readFileSync('qa/setup-fixtures.json','utf8'));

async function open(page,{large=false,dark=false,pending=false}={}){
 const state=structuredClone(fixture.ready),requests=[];
 state.ui.text_size=large?'large':'normal';state.ui.theme=dark?'dark':'light';
 state.chat=Array.from({length:36},(_,i)=>({role:i%2?'assistant':'user',text:`Сообщение ${i+1}. Проверяем сохранение места в разговоре при переходе между разделами.`}));
 if(pending)state.pending=[{id:'synthetic-review',type:'diary.add',payload:{date:'2026-11-09',note:'Синтетическая заметка',intake_status:'unquantified'},base_revision:state.revision,expires_at:4102444800}];
 await page.route('**/auth/config',r=>r.fulfill({json:{provider:'direct_google'}}));
 await page.route('**/api/session',r=>r.fulfill({json:{user:{role:'member',status:'active',email:'synthetic@example.test'},csrf:'synthetic'}}));
 await page.route('**/api/tools/**',async route=>{
  const name=new URL(route.request().url()).pathname.split('/').at(-1),args=route.request().postDataJSON();requests.push({name,args});
  if(name==='keto_recipes'){await route.fulfill({json:fixture.recipes});return}
  if(name==='keto_kitchen'&&args.action==='diary_history'){const entries=state.diary.filter(e=>!args.values.date||e.date===args.values.date).map(e=>({...e,name_ru:e.recipe_id?'Сохранённое блюдо':'Заметка',calculation:null,source_mode:'unquantified'}));await route.fulfill({json:{entries,total:entries.length,has_more:false,revision:state.revision,summary:{date:args.values.date,entry_count:entries.length,empty:!entries.length,nutrition:null,unquantified_entries:entries.length}}});return}
  if(name==='keto_apply_proposal'){
   state.pending=[];
   if(args.approved){state.revision++;state.diary.push({entry_id:'synthetic-entry',date:'2026-11-09',note:'Синтетическая заметка',intake_status:'unquantified'});}
   await route.fulfill({json:{state,...(args.approved?{receipt:{id:args.proposal_id,type:'diary.add',revision:state.revision}}:{})}});return;
  }
  await route.fulfill({json:{state}});
 });
 await page.goto('/');await expect(page.locator('[data-page=chat]')).toBeVisible();return requests;
}

for(const [large,dark] of [[false,false],[true,false],[true,true]])test(`ready chat space and controls: large=${large} dark=${dark}`,async({page})=>{
 await open(page,{large,dark});
 await expect(page.locator('#suggestions')).toBeHidden();
 expect(await page.getByTestId('bottom-nav').locator('button').allTextContents()).toEqual(['Чат','Дневник','Рецепты','Продукты']);
 const chat=await page.getByTestId('chat-scroll').boundingBox();expect(chat.height).toBeGreaterThan(500);
 const compose=await page.getByTestId('chat-composer').boundingBox();expect(compose.height).toBeLessThan(150);
 for(const id of ['attachments-open','mic-button','send']){const b=await page.locator('#'+id).boundingBox();expect(b.width).toBeGreaterThanOrEqual(44);expect(b.height).toBeGreaterThanOrEqual(44);}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`qa/mobile-browser/c10-ready-${large?'large':'normal'}-${dark?'dark':'light'}.png`});
});

test('chat scroll survives a section change and attachment dialog browser Back',async({page})=>{
 await open(page);const scroll=page.getByTestId('chat-scroll');
 await scroll.evaluate(e=>e.scrollTop=120);const top=await scroll.evaluate(e=>e.scrollTop);
 await page.locator('#nav [data-view=diary]').click();await page.locator('#nav [data-view=chat]').click();
 await expect.poll(()=>scroll.evaluate(e=>e.scrollTop)).toBe(top);
 await page.locator('#attachments-open').click();await expect(page.locator('#attachments-dialog')).toBeVisible();
 await page.goBack();await expect(page.locator('#attachments-dialog')).toBeHidden();
 await expect(page.locator('#attachments-open')).toBeFocused();expect(await scroll.evaluate(e=>e.scrollTop)).toBe(top);
});

test('closing a review keeps it pending and one explicit confirmation saves it',async({page})=>{
 const requests=await open(page,{pending:true});
 await page.locator('#pending-open').click();await page.locator('#proposal-list button').click();
 await expect(page.locator('#proposals')).toContainText('Синтетическая заметка');
 await page.locator('#proposal-close').click();await expect(page.locator('#proposal-dialog')).toBeHidden();
 expect(requests.filter(x=>x.name==='keto_apply_proposal')).toHaveLength(0);await expect(page.locator('#pending-open')).toBeVisible();
 await page.locator('#pending-open').click();await page.locator('#proposal-list button').click();
 await page.locator('#proposals').getByRole('button',{name:'Добавить в дневник',exact:true}).click();
 await expect(page.locator('#proposal-dialog')).toBeHidden();await expect(page.locator('#pending-open')).toBeHidden();
 expect(requests.filter(x=>x.name==='keto_apply_proposal'&&x.args.approved)).toHaveLength(1);
 await page.locator('#nav [data-view=diary]').click();
 // The note has a fixed date; Today follows the profile timezone.
 await page.locator('#diary-day').fill('2026-11-09');await page.locator('#diary-day').dispatchEvent('change');
 await expect(page.locator('#diary-entries')).toContainText('Синтетическая заметка');
 expect(requests.filter(x=>x.name==='keto_kitchen'&&x.args.action==='diary_history').at(-1)?.args.values.date).toBe('2026-11-09');
});
