// SDK is injected to exercise cancellation and exchange without real credentials.
import {AuthError,authMessage,bounded} from './auth-session.js';
export async function firebaseFlow(sdk,config,invite,request,{signal,timeoutMs=120000,requestTimeoutMs=15000,onPhase=()=>{},isCurrent=()=>true}={}){
 let auth,finished=false,exchanging=false;
 try{
  return await bounded(async attempt=>{
   const app=sdk.getApps().length?sdk.getApps()[0]:sdk.initializeApp(config);
   auth=sdk.getAuthInstance(app);
   const provider=new sdk.GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});
   // Both start in click activation. A network await here blocks mobile popups.
   const challenge=bounded(child=>request('/auth/firebase/start',{invite},{signal:child}),{signal:attempt,timeoutMs:requestTimeoutMs});
   const popup=sdk.signInWithPopup(auth,provider);
   Promise.resolve(popup).then(()=>{if(finished&&isCurrent())sdk.signOut(auth).catch(()=>{})},()=>{});
   const [transaction,result]=await Promise.all([challenge,popup]);
   if(attempt.aborted)throw new AuthError('CANCELLED');
   const token=await result.user.getIdToken();
   if(attempt.aborted)throw new AuthError('CANCELLED');
   onPhase('finishing');exchanging=true;
   await bounded(child=>request('/auth/firebase/complete',{transaction:transaction.transaction,token},{signal:child}),{signal:attempt,timeoutMs:requestTimeoutMs});
  },{signal,timeoutMs});
 }catch(error){
  const failure=error instanceof AuthError?error:new AuthError(error?.code||'NETWORK_ERROR');
  if(exchanging&&(!failure.status||failure.status>=500||failure.code==='INVALID_RESPONSE'))failure.ambiguous=true;
  failure.message=authMessage(failure);throw failure;
 }finally{finished=true;if(auth&&isCurrent())await bounded(()=>sdk.signOut(auth),{timeoutMs:2000}).catch(()=>{});}
}
