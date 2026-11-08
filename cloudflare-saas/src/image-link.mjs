import {bridgeCall} from './compute.mjs';
// A conservative first-release list addresses DNS rebinding on Workers fetch.
// No configurable arbitrary hosts and no cf.resolveOverride claim.
export const IMAGE_HOSTS=['images.unsplash.com','images.pexels.com','upload.wikimedia.org'];
const LIMIT=4*1024*1024;
export function safeImageUrl(value){
 if(typeof value!=='string'||value.length>2000)throw Error('IMAGE_LINK_UNSUPPORTED');
 let u;try{u=new URL(value)}catch{throw Error('IMAGE_LINK_UNSUPPORTED')}
 if(u.protocol!=='https:'||u.port||u.username||u.password||u.hash||!IMAGE_HOSTS.includes(u.hostname)||/\s|\\/.test(value))throw Error('IMAGE_LINK_UNSUPPORTED');
 // Signed/private URLs are deliberately unsupported. Keep raw links out of logs.
 if([...u.searchParams.keys()].some(k=>!/^(w|h|width|height|fit|crop|auto|fm|format|q|quality|dpr)$/i.test(k)))throw Error('IMAGE_LINK_PRIVATE_QUERY');
 return u;
}
export function publicAddress(ip){
 if(typeof ip!=='string')return false;
 if(ip.includes(':')){
  // Only ordinary global-unicast IPv6; deny mapped, ULA, loopback, multicast,
  // documentation, transition and special-use ranges conservatively.
  const p=ip.toLowerCase();return /^[23][0-9a-f]{3}:[0-9a-f:]+$/.test(p)&&!p.startsWith('2001:')&&!p.startsWith('2002:')&&!p.startsWith('3fff:');
 }
 const a=ip.split('.');if(a.length!==4||a.some(x=>!/^\d{1,3}$/.test(x)||+x>255))return false;const [x,y,z]=a.map(Number);
 return !(x===0||x===10||x===127||x>=224||(x===100&&y>=64&&y<=127)||(x===169&&y===254)||(x===172&&y>=16&&y<=31)||(x===192&&(y===0||y===168||y===2))||(x===198&&(y===18||y===19||y===51&&z===100))||(x===203&&y===0&&z===113));
}
async function bounded(response,limit){const reader=response.body?.getReader();if(!reader)throw Error('INVALID_IMAGE');let size=0,parts=[];try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>limit)throw Error('IMAGE_TOO_LARGE');parts.push(value)}}catch(e){await reader.cancel();throw e}const bytes=new Uint8Array(size);let at=0;for(const p of parts){bytes.set(p,at);at+=p.length}return bytes}
async function dns(host,signal,fetcher){
 const replies=await Promise.all(['A','AAAA'].map(async type=>{const u='https://cloudflare-dns.com/dns-query?'+new URLSearchParams({name:host,type});const r=await fetcher(u,{headers:{accept:'application/dns-json'},redirect:'error',credentials:'omit',referrerPolicy:'no-referrer',signal});if(!r.ok)throw Error('IMAGE_DNS_REJECTED');const d=JSON.parse(new TextDecoder().decode(await bounded(r,32768)));if(d.Status!==0)throw Error('IMAGE_DNS_REJECTED');return (d.Answer||[]).filter(a=>[1,28].includes(a.type)).map(a=>a.data)}));
 const all=replies.flat();if(!all.length||all.some(ip=>!publicAddress(ip)))throw Error('IMAGE_DNS_REJECTED');
}
export function imageMagic(bytes,mime){
 if(mime==='image/jpeg')return bytes.length>3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 if(mime==='image/png')return bytes.length>=8&&[137,80,78,71,13,10,26,10].every((b,i)=>bytes[i]===b);
 const ascii=(a,b)=>String.fromCharCode(...bytes.slice(a,b));
 if(mime==='image/gif')return ['GIF87a','GIF89a'].includes(ascii(0,6));
 if(mime==='image/webp')return bytes.length>=12&&ascii(0,4)==='RIFF'&&ascii(8,12)==='WEBP';return false;
}
export async function fetchPublicImage(value,fetcher=fetch){
 let u=safeImageUrl(value);const signal=AbortSignal.timeout(8000);
 for(let hop=0;hop<=2;hop++){
  await dns(u.hostname,signal,fetcher);
  const r=await fetcher(u.href,{method:'GET',headers:{accept:'image/jpeg,image/png,image/webp,image/gif'},redirect:'manual',credentials:'omit',referrerPolicy:'no-referrer',signal});
  if([301,302,303,307,308].includes(r.status)){await r.body?.cancel();if(hop===2)throw Error('IMAGE_REDIRECT_LIMIT');u=safeImageUrl(new URL(r.headers.get('location')||'',u).href);continue}
  if(!r.ok)throw Error('IMAGE_UNAVAILABLE');const mime=(r.headers.get('content-type')||'').split(';')[0].toLowerCase();
  if(!['image/jpeg','image/png','image/webp','image/gif'].includes(mime)){await r.body?.cancel();throw Error('IMAGE_NOT_DIRECT')}
  if(Number(r.headers.get('content-length'))>LIMIT){await r.body?.cancel();throw Error('IMAGE_TOO_LARGE')}
  const bytes=await bounded(r,LIMIT);if(!imageMagic(bytes,mime))throw Error('INVALID_IMAGE');return {bytes,mime};
 }
 throw Error('IMAGE_REDIRECT_LIMIT');
}
export async function handleImageLink(req,env,h){
 const {u,raw}=await h.auth(req,env,{write:true}),x=await h.bodyJson(req,8000);
 if(Object.keys(x).sort().join()!=='remote_request_acknowledged,url'||x.remote_request_acknowledged!==true)h.fail(400,'INVALID_BODY');
 const allowed=()=>h.dbfirst(env,"SELECT c.consent_revision FROM consents c JOIN users u ON u.id=c.user_id JOIN sessions s ON s.user_id=u.id WHERE c.user_id=? AND c.storage=1 AND c.health=1 AND c.processing=1 AND u.status='active' AND s.token_hash=? AND s.expires_at>?",u.id,sessionHash,Math.floor(Date.now()/1000));const sessionHash=await h.sha(raw),before=await allowed();if(!before)h.fail(403,'CONSENT_REQUIRED');
 try{
  const {bytes,mime}=await fetchPublicImage(x.url);let binary='';for(const b of bytes)binary+=String.fromCharCode(b);
  // Existing bridge bound is 1.5 MB. Resize locally after upload instead of
  // forwarding an oversized source to the sanitizer.
  if(bytes.length>1000000)h.fail(413,'IMAGE_UPLOAD_REQUIRED');
  const clean=await bridgeCall(env,u.id,'sanitize_image',null,{image_data_url:'data:'+mime+';base64,'+btoa(binary)}),after=await allowed();
  if(!after||after.consent_revision!==before.consent_revision)h.fail(409,'CONSENT_CHANGED');
  const data=clean.response?.image_data_url;if(clean.state!==null||typeof data!=='string'||!data.startsWith('data:image/jpeg;base64,')||data.length>1400000)throw Error('INVALID_IMAGE');
  return h.json({image_data_url:data,saved:false,message:'Фото подготовлено. Проверьте его и отправьте с сообщением.'});
 }catch(e){if(e.status)throw e;const code=['IMAGE_LINK_UNSUPPORTED','IMAGE_LINK_PRIVATE_QUERY','IMAGE_DNS_REJECTED','IMAGE_REDIRECT_LIMIT','IMAGE_TOO_LARGE','IMAGE_NOT_DIRECT','INVALID_IMAGE','IMAGE_UNAVAILABLE'].includes(e.message)?e.message:'IMAGE_PROCESSING_UNAVAILABLE';h.fail(code==='IMAGE_TOO_LARGE'?413:422,code)}
}
