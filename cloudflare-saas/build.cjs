const fs=require('node:fs'),path=require('node:path'),esbuild=require('../ui-sdk/node_modules/esbuild');
const root='cloudflare-saas',dir=root+'/dist';
async function main(){
await esbuild.build({entryPoints:[root+'/public/app.js'],bundle:true,format:'esm',outfile:root+'/public/app.bundle.js',target:['es2020'],alias:{'firebase/app':path.resolve(root+'/vendor/firebase-13.2.0/firebase-app.js'),'firebase/auth':path.resolve(root+'/vendor/firebase-13.2.0/firebase-auth.js')},plugins:[{name:'firebase-pinned-url',setup(build){build.onResolve({filter:/^https:\/\/www\.gstatic\.com\/firebasejs\/13\.2\.0\/firebase-app\.js$/},()=>({path:path.resolve(root+'/vendor/firebase-13.2.0/firebase-app.js')}));}}],legalComments:'inline'});
const paths=['index.html','app.bundle.js','style.css','help.html','privacy.html','delete.html','firebase-public-config.json'];const types={'json':'application/json; charset=utf-8','html':'text/html; charset=utf-8','js':'text/javascript; charset=utf-8','css':'text/css; charset=utf-8'};let assets={};for(const p of paths)assets['/'+p]={type:types[p.split('.').pop()],text:fs.readFileSync(p==='firebase-public-config.json'?'qa/firebase-public-config.json':root+'/public/'+p,'utf8')};
fs.writeFileSync(root+'/src/embedded-assets.mjs','export const assets='+JSON.stringify(assets)+';\n');fs.mkdirSync(dir+'/assets',{recursive:true});esbuild.buildSync({entryPoints:[root+'/src/standalone.mjs'],bundle:true,format:'esm',outfile:dir+'/worker.mjs',target:['es2022']});
for(const p of paths)fs.copyFileSync(p==='firebase-public-config.json'?'qa/firebase-public-config.json':root+'/public/'+p,dir+'/assets/'+p);
const imports=paths.map((p,i)=>`import a${i} from './assets/${p}';`).join('\n');
const entries=paths.map((p,i)=>`${JSON.stringify('/'+p)}:{type:${JSON.stringify(types[p.split('.').pop()])},text:a${i}}`).join(',');
fs.writeFileSync(dir+'/modular-entry.mjs',`${imports}\nimport worker from '../src/worker.mjs';\nconst assets={${entries}};\nexport default {async fetch(req,env,ctx){const wrapped={...env,ASSETS:{async fetch(request){const path=new URL(request.url).pathname,item=assets[path==='/'?'/index.html':path];return item?new Response(item.text,{headers:{'content-type':item.type}}):new Response('Not Found',{status:404})}}};return worker.fetch(req,wrapped,ctx)}};\n`);
esbuild.buildSync({entryPoints:[dir+'/modular-entry.mjs'],bundle:true,format:'esm',minify:true,external:['./assets/*'],outfile:dir+'/worker-modules.mjs',target:['es2022']});fs.unlinkSync(dir+'/modular-entry.mjs');
console.log('standalone Worker:',fs.statSync(dir+'/worker.mjs').size,'bytes; modular Worker:',fs.statSync(dir+'/worker-modules.mjs').size,'bytes');

}
main().catch(e=>{console.error(e.message);process.exitCode=1});
