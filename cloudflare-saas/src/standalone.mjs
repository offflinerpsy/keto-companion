import worker from './worker.mjs';
import {assets} from './embedded-assets.mjs';
export default {
 async fetch(req,env,ctx){
  const wrapped={...env,ASSETS:{async fetch(request){const path=new URL(request.url).pathname;const item=assets[path==='/'?'/index.html':path];return item?new Response(item.text,{headers:{'content-type':item.type}}):new Response('Not Found',{status:404})}}};
  return worker.fetch(req,wrapped,ctx);
 }
};
