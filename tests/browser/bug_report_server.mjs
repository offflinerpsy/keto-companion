// Loopback synthetic UI fixture: actual report handler + migration/SQLite.
// Proxy the existing Service-backed intake fixture on 8898; no public network.
import http from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {handleBugReports} from '../../cloudflare-saas/src/bug-reports.mjs';
const db=new DatabaseSync(':memory:');db.exec("PRAGMA foreign_keys=ON; CREATE TABLE users(id TEXT PRIMARY KEY); INSERT INTO users VALUES ('synthetic-member'),('synthetic-admin');");db.exec(readFileSync(new URL('../../cloudflare-saas/migrations/0010_bug_reports.sql',import.meta.url),'utf8'));
let identity='member',loseResponse=false,notDelivered=false;
const port=Number(process.env.KETO_BUG_FIXTURE_PORT||8899);
const h={auth:async(req,_e,opts)=>{if(opts.write&&(req.headers.get('x-csrf-token')!=='synthetic-ui-csrf'||req.headers.get('origin')!==`http://127.0.0.1:${port}`))throw Object.assign(Error('CSRF'),{status:403});if(opts.admin&&identity!=='admin')throw Object.assign(Error('FORBIDDEN'),{status:403});return {u:{id:'synthetic-'+identity,role:identity}}},bodyJson:async req=>req.json(),fail:(status,code)=>{throw Object.assign(Error(code),{status})},json:(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'no-store'}}),sha:async x=>createHash('sha256').update(x).digest('hex'),dbfirst:async(_e,sql,...a)=>db.prepare(sql).get(...a)||null,dbrun:async(_e,sql,...a)=>({meta:{changes:Number(db.prepare(sql).run(...a).changes)}}),dball:async(_e,sql,...a)=>db.prepare(sql).all(...a)};
http.createServer(async(req,res)=>{try{const url=new URL(req.url,`http://127.0.0.1:${port}`);let data='';for await(const chunk of req)data+=chunk;if(Buffer.byteLength(data)>20000)throw Error('fixture body too large');let response;
 if(url.pathname==='/__test__/bug-identity'&&req.method==='POST'){const value=JSON.parse(data);if(!['member','admin'].includes(value.role))throw Error('fixture role');identity=value.role;response=h.json({synthetic_only:true,role:identity})}
 else if(url.pathname==='/__test__/bug-not-delivered'&&req.method==='POST'){notDelivered=true;response=h.json({synthetic_only:true})}
 else if(url.pathname==='/__test__/bug-response-loss'&&req.method==='POST'){loseResponse=true;response=h.json({synthetic_only:true})}
 else if(url.pathname==='/__test__/bug-reports'){response=h.json({synthetic_only:true,reports:db.prepare('SELECT number,status,revision FROM bug_reports ORDER BY number').all()})}
 else if(url.pathname.startsWith('/api/bug-reports')||url.pathname.startsWith('/api/admin/bug-reports')){if(notDelivered&&req.method==='POST'&&url.pathname==='/api/bug-reports'){notDelivered=false;response=h.json({error:'SYNTHETIC_NOT_DELIVERED'},503)}else response=await handleBugReports(new Request(url,{method:req.method,headers:req.headers,...(data?{body:data}:{})}),{},h);if(loseResponse&&req.method==='POST'&&url.pathname==='/api/bug-reports'){loseResponse=false;response=h.json({error:'SYNTHETIC_RESPONSE_LOSS'},503)}}
 else if(url.pathname==='/api/session'){response=h.json({user:{role:identity,status:'active',email:'synthetic-'+identity+'@example.test'},csrf:'synthetic-ui-csrf',version:'C24-synthetic'})}
 else{const headers={...req.headers};delete headers.host;response=await fetch('http://127.0.0.1:8898'+url.pathname+url.search,{method:req.method,headers,...(data?{body:data}:{})})}
 res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch(error){res.writeHead(error.status||500,{'content-type':'application/json'});res.end(JSON.stringify({error:error.message}))}}).listen(port,'127.0.0.1',()=>process.stdout.write(`Synthetic report handler listening http://127.0.0.1:${port}; requires intake_server.py on 8898\n`));
