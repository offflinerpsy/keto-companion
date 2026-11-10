// Real bundled app and browser, synthetic membership/HTTP responses. Never family data.
import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const fixtures=JSON.parse(readFileSync('qa/setup-fixtures.json','utf8'));
const deferred=()=>{let resolve;const promise=new Promise(a=>resolve=a);return {promise,resolve}};
async function fixture(page,options={}){
 const h={role:'admin',status:'active',sessionFailure:false,openFailure:false,configFailure:false,loggedIn:true,requests:[],errors:[],...options};
 page.on('pageerror',error=>h.errors.push(error.message));
 await page.route('**/auth/config',route=>route.fulfill({status:h.configFailure?503:200,json:h.configFailure?{error:'SETUP_REQUIRED'}:{provider:'direct_google'}}));
 await page.route('**/api/session',route=>{h.requests.push('session');return route.fulfill({status:h.sessionFailure?503:h.loggedIn?200:401,json:h.sessionFailure?{error:'TEMPORARY_UNAVAILABLE'}:h.loggedIn?{user:{role:h.role,status:h.status,email:'synthetic@example.test'},csrf:'synthetic-csrf'}:{error:'SIGN_IN'}})});
 await page.route('**/api/tools/**',async route=>{
  const name=new URL(route.request().url()).pathname.split('/').at(-1);h.requests.push(name);
  if(name==='keto_open'&&h.holdOpen){const hold=h.holdOpen;h.holdOpen=null;hold.entered.resolve();await hold.release.promise}
  if(h.expired)return route.fulfill({status:401,json:{error:'SIGN_IN'}});
  if(name==='keto_open'&&h.openFailure)return route.fulfill({status:503,json:{error:'COMPUTE_UNAVAILABLE'}});
  if(name==='keto_open'&&h.malformed)return route.fulfill({json:{ok:true}});
  return route.fulfill({json:name==='keto_recipes'?fixtures.recipes:{state:structuredClone(fixtures.ready)}});
 });
 await page.route('**/api/admin/summary',route=>{h.requests.push('admin-summary');return route.fulfill({status:h.role==='admin'?200:403,json:h.role==='admin'?{active:2,pending:0,expired:0,members:[],invites:[]}:{error:'FORBIDDEN'}})});
 await page.route('**/auth/google/start',async route=>{h.requests.push('google-start');if(h.holdLogin){h.holdLogin.entered.resolve();await h.holdLogin.release.promise}return route.fulfill({json:{authorization_url:'http://127.0.0.1:8899/__synthetic_google_return'}})});
 await page.route('**/__synthetic_google_return',route=>{h.loggedIn=true;return route.fulfill({status:302,headers:{location:'/', 'set-cookie':'synthetic_ui_session=active; Path=/; HttpOnly; SameSite=Lax'},body:''})});
 await page.route('**/api/logout',route=>{h.requests.push('logout');if(h.logoutFailure)return route.fulfill({status:503,json:{error:'TEMPORARY_UNAVAILABLE'}});h.loggedIn=false;return route.fulfill({json:{ok:true}})});
 await page.route('**/api/invites/claim',route=>{h.requests.push('claim');h.claimToken=route.request().postDataJSON().token;if(!/^[A-Za-z0-9_-]{43}$/.test(h.claimToken||''))return route.fulfill({status:400,json:{error:'INVALID_INVITE'}});h.status='active';return h.lostClaim?route.abort('failed'):route.fulfill({json:{ok:true}})});
 await page.route('**/api/personal/delete',route=>{h.requests.push('delete');h.loggedIn=false;return route.fulfill({status:202,json:{receipt:'synthetic-deletion-receipt',status:'pending'}})});
 return h;
}
async function ready(page){await expect(page.locator('#workspace')).toBeVisible();await expect(page.locator('#login')).toHaveAttribute('data-auth-phase','ready')}
async function settings(page){await page.getByRole('button',{name:'Профиль и настройки',exact:true}).click();await page.getByRole('button',{name:'Настройки и данные',exact:true}).click()}
async function geometry(page){expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);const box=await page.locator('#cf-auth-retry').boundingBox();expect(box.width).toBeGreaterThan(250);expect(box.height).toBeGreaterThanOrEqual(44)}

test('positive control: server admin boots, reloads and opens members without Google',async({page})=>{
 const h=await fixture(page);await page.goto('/');await ready(page);await page.reload();await ready(page);await page.getByRole('button',{name:'Профиль и настройки',exact:true}).click();await expect(page.locator('#admin-tab')).toBeVisible();await page.locator('#admin-tab').click();await expect(page.locator('#admin-summary')).toContainText('Активны: 2');expect(h.requests.includes('google-start')).toBe(false);expect(h.errors).toEqual([]);
});
test('verified admin with unavailable workspace recovers without another Google login',async({page},info)=>{
 const h=await fixture(page,{openFailure:true});await page.goto('/');await expect(page.locator('#login')).toHaveAttribute('data-auth-phase','workspace-error');await expect(page.locator('#cf-auth-account')).toHaveText('Вход выполнен · администратор');await expect(page.locator('#cf-login')).toBeHidden();await expect(page.locator('#cf-login-message')).toContainText('Вход выполнен');await geometry(page);await page.screenshot({path:`qa/mobile-browser/c18-recovery-${info.project.name}.png`});h.openFailure=false;await page.getByRole('button',{name:'Повторить загрузку',exact:true}).click();await ready(page);await page.getByRole('button',{name:'Профиль и настройки',exact:true}).click();await expect(page.locator('#admin-tab')).toBeVisible();expect(h.requests.includes('google-start')).toBe(false);expect(h.requests.filter(x=>x==='keto_open')).toHaveLength(2);expect(h.errors).toEqual([]);
});
test('temporary session error offers verification, then a server member opens without admin controls',async({page})=>{
 const h=await fixture(page,{sessionFailure:true,role:'member'});await page.goto('/');await expect(page.locator('#login')).toHaveAttribute('data-auth-phase','session-error');await expect(page.locator('#cf-login')).toBeHidden();await expect(page.locator('#cf-auth-account')).toBeHidden();h.sessionFailure=false;await page.getByRole('button',{name:'Проверить вход',exact:true}).click();await ready(page);await page.getByRole('button',{name:'Профиль и настройки',exact:true}).click();await expect(page.locator('#admin-tab')).toBeHidden();expect(h.requests.includes('google-start')).toBe(false);expect(h.errors).toEqual([]);
});
test('missing session uses the ordinary login route and then verifies owner access',async({page})=>{
 const h=await fixture(page,{loggedIn:false});await page.goto('/');await expect(page.locator('#cf-login')).toBeVisible();await page.getByRole('button',{name:'Войти через Google',exact:true}).click();await ready(page);await page.getByRole('button',{name:'Профиль и настройки',exact:true}).click();await expect(page.locator('#admin-tab')).toBeVisible();expect(h.requests.filter(x=>x==='google-start')).toHaveLength(1);expect(h.errors).toEqual([]);
});
test('repeated login click is disabled during the single pending request',async({page})=>{
 const hold={entered:deferred(),release:deferred()},h=await fixture(page,{loggedIn:false,holdLogin:hold});await page.goto('/');await expect(page.locator('#cf-login')).toBeVisible();await page.locator('#cf-login').click();await hold.entered.promise;await expect(page.locator('#cf-auth-actions')).toHaveAttribute('aria-busy','true');await expect(page.locator('#cf-login')).toBeDisabled();await page.evaluate(()=>document.getElementById('cf-login').click());expect(h.requests.filter(x=>x==='google-start')).toHaveLength(1);hold.release.resolve();await ready(page);expect(h.requests.filter(x=>x==='google-start')).toHaveLength(1);expect(h.errors).toEqual([]);
});
test('claim with a lost response rechecks membership and never consumes the invitation twice',async({page})=>{
 const h=await fixture(page,{role:'member',status:'pending',lostClaim:true});const invite='I'.repeat(43);await page.goto('/?invite='+invite);await expect(page.locator('#cf-claim-button')).toBeVisible();await expect(page.locator('#workspace')).toBeHidden();await page.locator('#cf-claim-button').click();await ready(page);expect(h.claimToken).toBe(invite);expect(h.requests.filter(x=>x==='claim')).toHaveLength(1);await page.getByRole('button',{name:'Профиль и настройки',exact:true}).click();await expect(page.locator('#admin-tab')).toBeHidden();expect(h.errors).toEqual([]);
});
test('browser storage denial cannot prevent boot or lose an invitation in the current page',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(window,'sessionStorage',{get(){throw new DOMException('blocked','SecurityError')}}));const h=await fixture(page,{role:'member',status:'pending'});const invite='S'.repeat(43);await page.goto('/?invite='+invite);await expect(page.locator('#cf-claim-button')).toBeVisible();await page.locator('#cf-claim-button').click();await ready(page);expect(h.claimToken).toBe(invite);expect(h.errors).toEqual([]);
});
test('late ordinary refresh cannot restore private UI over failed logout recovery',async({page})=>{
 const h=await fixture(page);await page.goto('/');await ready(page);await page.getByRole('button',{name:'Профиль и настройки',exact:true}).click();const hold={entered:deferred(),release:deferred()};h.holdOpen=hold;await page.locator('#refresh').click();await hold.entered.promise;await page.getByRole('button',{name:'Настройки и данные',exact:true}).click();h.logoutFailure=true;await page.getByRole('button',{name:'Выйти',exact:true}).click();await expect(page.locator('#login')).toHaveAttribute('data-auth-phase','logout-error');const response=page.waitForResponse('**/api/tools/keto_open');hold.release.resolve();await (await response).finished();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await expect(page.locator('#workspace')).toBeHidden();await expect(page.locator('#login')).toBeVisible();await expect(page.locator('#login')).toHaveAttribute('data-auth-phase','logout-error');await expect(page.locator('#cf-login-message')).toContainText('Не удалось подтвердить выход');await expect(page.locator('dialog[open]')).toHaveCount(0);h.logoutFailure=false;await page.getByRole('button',{name:'Повторить выход',exact:true}).click();await expect(page.locator('#cf-login')).toBeVisible();expect(h.errors).toEqual([]);
});
test('confirmed synthetic deletion clears authentication and exposes the receipt and next login',async({page})=>{
 const h=await fixture(page);await page.goto('/');await ready(page);await settings(page);page.once('dialog',dialog=>dialog.accept('УДАЛИТЬ'));await page.getByRole('button',{name:'Удалить мой профиль и дневник',exact:true}).click();await expect(page.locator('#login')).toHaveAttribute('data-auth-phase','signed-out');await expect(page.locator('#cf-login')).toBeVisible();await expect(page.locator('#deletion-recovery')).toHaveAttribute('open','');await expect(page.locator('#deletion-status')).toContainText('synthetic-deletion-receipt');await page.locator('#cf-login').click();await ready(page);expect(h.requests.filter(x=>x==='delete')).toHaveLength(1);expect(h.errors).toEqual([]);
});
test('ordinary server session expiry closes private UI and offers a fresh sign-in',async({page})=>{
 const h=await fixture(page);await page.goto('/');await ready(page);await page.getByRole('button',{name:'Профиль и настройки',exact:true}).click();h.expired=true;h.loggedIn=false;await page.locator('#refresh').click();await expect(page.locator('#cf-login')).toBeVisible();await expect(page.locator('#workspace')).toBeHidden();await expect(page.locator('dialog[open]')).toHaveCount(0);expect(h.errors).toEqual([]);
});
test('config outage does not block an existing verified session',async({page})=>{
 const h=await fixture(page,{configFailure:true});await page.goto('/');await ready(page);expect(h.requests.includes('google-start')).toBe(false);expect(h.errors).toEqual([]);
});
test('malformed bootstrap response stays recoverable at narrow width and large text',async({page},info)=>{
 await page.setViewportSize({width:360,height:640});const h=await fixture(page,{malformed:true});await page.goto('/');await expect(page.locator('#login')).toHaveAttribute('data-auth-phase','workspace-error');await page.evaluate(()=>document.documentElement.style.fontSize='20px');await geometry(page);await page.screenshot({path:`qa/mobile-browser/c18-recovery-large-${info.project.name}.png`});await expect(page.locator('#cf-auth-retry')).toBeEnabled();expect(h.errors).toEqual([]);
});
