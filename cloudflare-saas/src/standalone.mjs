import worker from './worker.mjs';
import {assets} from './embedded-assets.mjs';
function serveAsset(request){
 const path=new URL(request.url).pathname,item=assets[path==='/'?'/index.html':path];
 if(!item)return new Response('Not Found',{status:404});
 const headers={'content-type':item.type};if(item.etag)headers.etag=item.etag;
 const body=item.binary?(item.bytes??=Uint8Array.from(atob(item.text),c=>c.charCodeAt(0))):item.text;
 return new Response(body,{headers});
}
export default {
 async scheduled(event,env,ctx){
  return worker.scheduled(event,env,ctx);
 },
 async fetch(req,env,ctx){
  const wrapped={...env,ASSETS:{async fetch(request){return serveAsset(request)}}};
  return worker.fetch(req,wrapped,ctx);
 }
};
