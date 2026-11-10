import {initializeApp,getApps} from 'firebase/app';
import {initializeAuth,inMemoryPersistence,browserPopupRedirectResolver,GoogleAuthProvider,signInWithPopup,signOut} from 'firebase/auth';
import {firebaseFlow} from './firebase-flow.js';
let auth,flight=null,attempt=0;
export function firebaseLogin(config,invite,request,options={}){
 if(flight)return flight;const id=++attempt;
 const sdk={initializeApp,getApps,GoogleAuthProvider,signInWithPopup,signOut,getAuthInstance:app=>auth??=initializeAuth(app,{persistence:inMemoryPersistence,popupRedirectResolver:browserPopupRedirectResolver})};
 flight=firebaseFlow(sdk,config,invite,request,{...options,isCurrent:()=>id===attempt}).finally(()=>{if(id===attempt)flight=null});return flight;
}
