// Server membership is authoritative. Firebase authenticates only the sign-in attempt.
export class AuthError extends Error {
 constructor(code,{status=0,ambiguous=false}={}){super(code);this.name='AuthError';this.code=code;this.status=status;this.ambiguous=ambiguous;}
}
export function transientStorage(readStorage){
 const memory=new Map();
 return {
  getItem(key){if(memory.has(key))return memory.get(key);try{const value=readStorage().getItem(key);if(value!==null){memory.set(key,value);return value}}catch{}return null},
  setItem(key,value){memory.set(key,String(value));try{readStorage().setItem(key,String(value))}catch{}},
  removeItem(key){memory.set(key,null);try{readStorage().removeItem(key)}catch{}}
 };
}
export function bounded(operation,{signal,timeoutMs=15000}={}){
 const controller=new AbortController();let timer,rejectPending;
 const stopped=new Promise((_,reject)=>{rejectPending=reject});
 const abort=()=>{controller.abort();rejectPending(new AuthError('CANCELLED'))};
 if(signal?.aborted){controller.abort();return Promise.reject(new AuthError('CANCELLED'))}
 signal?.addEventListener('abort',abort,{once:true});
 timer=setTimeout(()=>{controller.abort();rejectPending(new AuthError('NETWORK_TIMEOUT'))},timeoutMs);
 let task;try{task=operation(controller.signal)}catch(error){task=Promise.reject(error)}
 return Promise.race([task,stopped]).finally(()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);controller.abort()});
}
export async function authJson(fetcher,path,{method='GET',body,signal,csrf}={}){
 let response;try{response=await fetcher(path,{method,credentials:'same-origin',cache:'no-store',signal,headers:{...(body!==undefined?{'Content-Type':'application/json'}:{}),...(csrf&&method!=='GET'?{'X-CSRF-Token':csrf}:{})},body:body===undefined?undefined:JSON.stringify(body)})}catch{throw new AuthError(signal?.aborted?'CANCELLED':'NETWORK_ERROR')}
 let data;try{data=await response.json()}catch{throw new AuthError('INVALID_RESPONSE',{status:response.status})}
 if(!response.ok)throw new AuthError(typeof data?.error==='string'&&/^[A-Z][A-Z0-9_]{0,63}$/.test(data.error)?data.error:'REQUEST_FAILED',{status:response.status});
 return data;
}
const messages={
 NETWORK_ERROR:'Не удалось связаться с приложением. Проверьте подключение.',NETWORK_TIMEOUT:'Ответ не пришёл вовремя. Проверьте подключение и повторите.',INVALID_RESPONSE:'Приложение вернуло неполный ответ. Повторите проверку.',
 SETUP_REQUIRED:'Вход временно недоступен. Повторите проверку позже.',LOGIN_UNAVAILABLE:'Не удалось начать вход. Повторите попытку.',LOGIN_BUSY:'Слишком много попыток входа. Подождите немного и повторите.',
 INVALID_CHALLENGE:'Попытка входа устарела. Начните вход ещё раз.',SESSION_LIMIT:'Не удалось создать сеанс: достигнут лимит входов. Выйдите из KETO на другом устройстве и повторите.',
 SIGN_IN_BLOCKED:'Доступ этого аккаунта приостановлен. Выберите другой аккаунт.',INVITATION_REQUIRED:'Для этой почты нужно действующее приглашение. Выберите приглашённый аккаунт или откройте ссылку приглашения.',INVITE_NOT_AVAILABLE:'Приглашение недоступно. Откройте новую ссылку приглашения.',
 SESSION_NOT_SAVED:'Google подтвердил вход, но приложение не получило сеанс. Разрешите cookie для этого сайта и попробуйте снова.',SIGN_IN:'Сеанс завершён. Войдите снова.',
 'auth/popup-closed-by-user':'Вход отменён. Можно попробовать ещё раз.','auth/cancelled-popup-request':'Вход отменён. Можно попробовать ещё раз.','auth/popup-blocked':'Браузер заблокировал окно Google. Разрешите всплывающие окна для этого сайта и повторите.',
 'auth/network-request-failed':'Не удалось связаться с Google. Проверьте подключение и повторите.','auth/unauthorized-domain':'Google-вход недоступен для этого адреса приложения.','auth/operation-not-supported-in-this-environment':'Браузер не смог открыть Google-вход. Откройте KETO в обычной вкладке браузера.'
};
export function authMessage(error){return messages[error?.code]||'Не удалось выполнить вход. Повторите попытку.'}
export function authDiagnostic(phase,error){
 // Only a phase, an allowlisted code and status. Never provider text, URL or credentials.
 const code=Object.hasOwn(messages,error?.code)?error.code:({COMPUTE_UNAVAILABLE:true,BRIDGE_NOT_CONFIGURED:true,BUSY_OR_CONSENT_OR_LIMIT:true,REQUEST_PENDING:true,STATE_CHANGED:true,CSRF:true}[error?.code]?'SERVICE_UNAVAILABLE':'REQUEST_FAILED');
 return [phase,code,...(Number.isInteger(error?.status)&&error.status>=400&&error.status<=599?[error.status]:[])].join(' · ');
}
export function createAuthSession({api,authenticate,loadWorkspace,openWorkspace,identityChanged,view,timeoutMs=15000,workspaceTimeoutMs=65000}){
 let generation=0,operation=null,identity=null,config=null,configError=null,configFlight=null,loginFlight=null,phase='checking',lastError=null;
 const emit=(next,error=null)=>{phase=next;lastError=error;view({phase,identity,config,error})};
 const current=job=>job.id===generation&&!job.controller.signal.aborted;
 const begin=()=>{operation?.controller.abort();const job={id:++generation,controller:new AbortController()};operation=job;return job};
 const drop=()=>{identity=null;identityChanged(null)};
 function configuration(){
  if(config)return Promise.resolve(config);if(configFlight)return configFlight;
  configFlight=bounded(signal=>api('/auth/config',{signal}),{timeoutMs}).then(value=>{if(!['firebase_google','direct_google'].includes(value?.provider))throw new AuthError('SETUP_REQUIRED');config=value;configError=null;return config}).catch(error=>{configError=error;return null}).finally(()=>{configFlight=null;if(phase==='signed-out')emit(phase,lastError||configError)});
  return configFlight;
 }
 async function workspace(job){
  emit('loading');
  try{
   const data=await bounded(signal=>loadWorkspace(signal),{signal:job.controller.signal,timeoutMs:workspaceTimeoutMs});
   if(!current(job))return;
   if(!data?.state)throw new AuthError('INVALID_RESPONSE');
   openWorkspace(data);if(current(job))emit('ready');
  }catch(error){if(!current(job))return;if(error.status===401&&error.code==='SIGN_IN'){drop();emit('signed-out',error);configuration()}else emit('workspace-error',error)}
 }
 async function restore(job,{afterLogin=false,loginError=null}={}){
  emit('checking');
  try{
   const value=await bounded(signal=>api('/api/session',{signal}),{signal:job.controller.signal,timeoutMs});
   if(!current(job))return;
   if(!value?.csrf||!['active','pending'].includes(value.user?.status)||!['admin','member'].includes(value.user?.role))throw new AuthError('INVALID_RESPONSE');
   identity=value;identityChanged(value);
   if(value.user.status==='pending'){emit('pending');return}
   await workspace(job);
  }catch(error){
   if(!current(job))return;
   if(error.status===401&&error.code==='SIGN_IN'){drop();emit('signed-out',afterLogin?(loginError||new AuthError('SESSION_NOT_SAVED')):null);configuration()}
   else emit('session-error',error);
  }
 }
 function start(){const job=begin();configuration();return restore(job)}
 function retry(){if(['checking','loading','signing-in','finishing','signing-out','claiming'].includes(phase))return Promise.resolve();const job=begin();configuration();return restore(job)}
 function login(invite=''){
  if(loginFlight)return loginFlight;
  if(phase!=='signed-out'||!config)return Promise.resolve();
  const job=begin();emit('signing-in');
  // Invoke authenticate before the first await so mobile popup activation is retained.
  let task;try{task=authenticate(config,invite,{signal:job.controller.signal,onPhase:next=>{if(current(job))emit(next)}})}catch(error){task=Promise.reject(error)}
  loginFlight=(async()=>{
   try{const result=await task;if(!current(job)||result?.redirect)return;await restore(job,{afterLogin:true})}
   catch(error){if(!current(job))return;if(error.ambiguous)await restore(job,{afterLogin:true,loginError:error});else emit('signed-out',error)}
  })().finally(()=>{loginFlight=null});
  return loginFlight;
 }
 async function logout(){
  if(phase==='signing-out')return;const job=begin();emit('signing-out');
  try{await bounded(signal=>api('/api/logout',{method:'POST',body:{},signal}),{signal:job.controller.signal,timeoutMs});if(!current(job))return;drop();emit('signed-out');configuration()}
  catch(error){if(!current(job))return;if(error.status===401&&error.code==='SIGN_IN'){drop();emit('signed-out');configuration()}else emit('logout-error',error)}
 }
 async function claim(token){
  if(phase!=='pending')return;const job=begin();emit('claiming');
  try{await bounded(signal=>api('/api/invites/claim',{method:'POST',body:{token},signal}),{signal:job.controller.signal,timeoutMs});if(current(job))await restore(job)}
  catch(error){if(!current(job))return;if(error.status===401&&error.code==='SIGN_IN'){drop();emit('signed-out',error);configuration()}else if(!error.status||error.status>=500||error.code==='INVALID_RESPONSE'){await restore(job);if(current(job)&&phase==='pending')emit('pending',error)}else emit('pending',error)}
 }
 function signedOut(error=null){begin();drop();emit('signed-out',error);configuration()}
 function expired(){signedOut(new AuthError('SIGN_IN'))}
 return {start,retry,login,logout,claim,expired,signedOut,get phase(){return phase},get identity(){return identity}};
}
