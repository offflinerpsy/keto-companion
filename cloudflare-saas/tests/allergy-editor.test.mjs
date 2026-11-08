// Execute actual editor function with a minimal DOM; no browser, credentials or users.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
class Element{
 constructor(tag='div'){this.tagName=tag;this.children=[];this.value='';this.checked=false;this.dataset={}}
 append(...items){this.children.push(...items)}
 replaceChildren(...items){this.children=[...items]}
}
for(const path of ['cloudflare-saas/public/app.js','service/static/app.js']){
 test('allergy editor preserves every supported and existing unknown restriction: '+path,()=>{
  const source=readFileSync(path,'utf8');
  const allergies=source.match(/const ALLERGENS=\[.*?\];/)[0];
  const questions=source.match(/const QUESTIONS=\[.*?\];/)[0];
  const fill=source.match(/^function fillOnboard\(\).*$/m)[0];
  const nodes={};const document={createElement:tag=>new Element(tag)};
  const $=id=>nodes[id]??=new Element();
  const el=(tag,cls,text)=>{const x=new Element(tag);x.textContent=text;return x};
  const expected=['mustard','gluten','mollusc','lupin','sulfite','egg','legacy_custom_restriction'];
  const state={profile:{screening:{adult:true},display_name:'Test',goal:null,timezone:'Europe/Minsk',medications:[],allergies:expected}};
  const context={state,document,$,el,Intl,screenDraft:{},questionPage:0,renderQuestions(){}};
  vm.createContext(context);vm.runInContext(allergies+'\n'+questions+'\n'+fill+'\nfillOnboard();',context);
  const inputs=nodes['allergy-options'].children.flatMap(x=>x.children).filter(x=>x.tagName==='input');
  assert.equal(inputs.length,17);assert.deepEqual(inputs.filter(x=>x.checked).map(x=>x.value).sort(),expected.sort());
  // Only an explicit unchecked box removes a specific restriction; others persist.
  inputs.find(x=>x.value==='mustard').checked=false;
  assert.deepEqual(inputs.filter(x=>x.checked).map(x=>x.value).sort(),expected.filter(x=>x!=='mustard').sort());
  assert(nodes['allergy-options'].children.some(x=>x.children.some(y=>y.textContent==='Сохранённое ограничение: legacy_custom_restriction')));
 });
}
