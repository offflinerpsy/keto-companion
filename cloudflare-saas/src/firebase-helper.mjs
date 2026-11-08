// Firebase redirect-best-practices option 3: a fixed upstream, never a URL proxy.
export const FIREBASE_HELPER_HOST='keto-companion-auth-261107.firebaseapp.com';
const PATHS=new Set(['/__/auth/handler','/__/auth/iframe','/__/auth/handler.js','/__/auth/iframe.js','/__/auth/experiments.js']);
const REQUEST_LIMIT=65536,RESPONSE_LIMIT=2000000;
export function firebaseHelperOrigin(env,fail){
 if(env.FIREBASE_AUTH_HELPER_MODE===undefined||env.FIREBASE_AUTH_HELPER_MODE==='')return null;
 if(env.FIREBASE_AUTH_HELPER_MODE!=='same-origin')fail(503,'SETUP_REQUIRED');
 let origin;try{origin=new URL(env.PUBLIC_ORIGIN)}catch{fail(503,'SETUP_REQUIRED')}
 if(origin.protocol!=='https:'||origin.origin!==env.PUBLIC_ORIGIN||origin.port||origin.username||origin.password)fail(503,'SETUP_REQUIRED');
 return origin;
}
export async function handleFirebaseHelper(req,env,h,fetcher=fetch){
 const origin=new URL(env.PUBLIC_ORIGIN),url=new URL(req.url);
 if(env.AUTH_PROVIDER!=='firebase_google'||url.origin!==origin.origin||!PATHS.has(url.pathname))h.fail(404,'NOT_FOUND');
 if(!['GET','POST'].includes(req.method)||(req.method==='POST'&&url.pathname!=='/__/auth/handler'))h.fail(405,'METHOD_NOT_ALLOWED');
 if(url.search.length>16384)h.fail(414,'HELPER_QUERY_TOO_LARGE');
 const headers=new Headers();
 for(const name of ['accept','accept-language']){const value=req.headers.get(name);if(value)headers.set(name,value)}
 let body;
 if(req.method==='POST'){
  const type=req.headers.get('content-type')||'';
  if(!/^application\/x-www-form-urlencoded(?:\s*;|$)/i.test(type))h.fail(415,'CONTENT_TYPE');
  headers.set('content-type',type);body=await h.readBounded(req,REQUEST_LIMIT);
 }
 const upstream=new URL(url.pathname+url.search,'https://'+FIREBASE_HELPER_HOST);
 try{
  const response=await fetcher(upstream.href,{method:req.method,headers,body,redirect:'manual',credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(15000)});
  const out=new Headers({'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'});
  // Keep Firebase's helper policy; the app's frame-ancestors:none breaks its iframe.
  for(const name of ['content-type','content-security-policy','x-frame-options']){const value=response.headers.get(name);if(value)out.set(name,value)}
  if([301,302,303,307,308].includes(response.status)){
   const location=response.headers.get('location');if(!location)throw Error('HELPER_REDIRECT');
   const target=new URL(location,upstream);
   if(target.protocol!=='https:'||target.username||target.password||target.port)throw Error('HELPER_REDIRECT');
   if(target.hostname===FIREBASE_HELPER_HOST){if(!PATHS.has(target.pathname))throw Error('HELPER_REDIRECT');target.host=origin.host;}
   else if(target.origin!==origin.origin&&!(target.hostname==='accounts.google.com'&&['/o/oauth2/auth','/o/oauth2/v2/auth'].includes(target.pathname)))throw Error('HELPER_REDIRECT');
   out.set('location',target.href);await response.body?.cancel();return new Response(null,{status:response.status,headers:out});
  }
  if(!response.ok)throw Error('HELPER_UPSTREAM');
  const bytes=await h.readBounded(response,RESPONSE_LIMIT);
  return new Response(bytes,{status:response.status,headers:out});
 }catch{h.fail(502,'FIREBASE_HELPER_UNAVAILABLE')}
}
