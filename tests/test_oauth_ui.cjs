const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
class Element{constructor(){this.hidden=true;this.disabled=false;this.value='';this.textContent='';this.dataset={};this.classList={toggle(){}}}addEventListener(){}replaceChildren(){}append(){}setAttribute(){}close(){} }
const nodes={},document={body:new Element(),getElementById(id){return nodes[id]??=new Element()},createElement(){return new Element()},querySelectorAll(){return []}};
const sessionData={};const sessionStorage={setItem(k,v){sessionData[k]=v},getItem(k){return sessionData[k]||null},removeItem(k){delete sessionData[k]}};
const redirects=[],requests=[];const account={homeAccountId:'user-a',username:'synthetic@example.test'};let accounts=[account];
const msal={getAllAccounts:()=>accounts,acquireTokenSilent:async()=>({accessToken:'synthetic-entra-token'})};
const window={location:{href:'https://keto.test/',assign:url=>redirects.push(url)}};window.parent=window;
const context={document,window,sessionStorage,URL,Intl,Date,console,setTimeout,clearTimeout,history:{replaceState(){}},fetch:async(url,opts)=>{requests.push({url,body:JSON.parse(opts.body)});return {ok:true,json:async()=>url==='/oauth/complete'?{redirect:'https://chatgpt.com/connector_platform_oauth_redirect?iss=https%3A%2F%2Fketo.test&state=synthetic&code=synthetic'}:{client_name:'KETO'}}}};
const kitchenModule=fs.readFileSync('cloudflare-saas/public/kitchen-ui.js','utf8').replace(/^export /gm,'');
let source=fs.readFileSync('service/static/app.js','utf8').replace(/^import .*;\n/gm,'').replace('run(start);','');
source+='\nglobalThis.testApi={showOAuthConsent,completeOAuth,set(msalValue,tx){msal=msalValue;authConfig={scope:"synthetic"};oauthTransaction=tx}};';
vm.createContext(context);vm.runInContext(kitchenModule+'\n'+source,context);
(async()=>{const api=context.testApi;api.set(msal,'opaque-transaction');sessionStorage.setItem('keto_oauth_transaction','opaque-transaction');await api.showOAuthConsent();assert.equal(nodes['oauth-connection'].hidden,false);assert.equal(nodes['oauth-account'].textContent,account.username);assert.equal(requests[0].url,'/oauth/request');assert.deepEqual(requests[0].body,{transaction:'opaque-transaction'});assert.equal(redirects.length,0);await api.completeOAuth(true);assert.equal(requests[1].body.approved,true);assert.equal(redirects.length,1);assert.equal(sessionStorage.getItem('keto_oauth_transaction'),null);
 api.set(msal,'other-transaction');await api.showOAuthConsent();accounts=[{homeAccountId:'user-b'}];await api.completeOAuth(true);assert.equal(redirects.length,1);assert.match(nodes['oauth-error'].textContent,/Аккаунт изменился/);assert.equal(nodes['oauth-account'].textContent,'');assert.equal(requests.length,3);
 console.log('OAuth UI no-browser checks passed: explicit consent, account switch, no profile data, callback');})().catch(e=>{console.error(e);process.exitCode=1});
