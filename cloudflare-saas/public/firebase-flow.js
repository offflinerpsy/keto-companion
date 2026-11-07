// SDK is injected here to keep the click, cancellation and cleanup flow testable without a browser.
export async function firebaseFlow(sdk,config,invite,request){
 let auth;
 try{
  const app=sdk.getApps().length?sdk.getApps()[0]:sdk.initializeApp(config);
  auth=sdk.getAuthInstance(app);
  const provider=new sdk.GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});
  // Start both operations from the click before yielding; the popup retains user activation.
  const challenge=request('/auth/firebase/start',{invite});
  const popup=sdk.signInWithPopup(auth,provider);
  const [challengeResult,popupResult]=await Promise.allSettled([challenge,popup]);
  if(popupResult.status==='rejected')throw popupResult.reason;if(challengeResult.status==='rejected')throw challengeResult.reason;const transaction=challengeResult.value,result=popupResult.value;
  const token=await result.user.getIdToken();await request('/auth/firebase/complete',{transaction:transaction.transaction,token});
 }catch(e){
  if(e?.code==='auth/popup-closed-by-user'||e?.code==='auth/cancelled-popup-request')throw Error('Вход отменён. Попробуйте ещё раз.');
  if(e?.code==='auth/popup-blocked')throw Error('Браузер заблокировал окно входа. Разрешите всплывающие окна и попробуйте снова.');
  throw e;
 }finally{if(auth)await sdk.signOut(auth).catch(()=>{});}
}
