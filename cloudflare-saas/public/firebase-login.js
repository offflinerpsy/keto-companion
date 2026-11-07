import {initializeApp,getApps} from 'firebase/app';
import {initializeAuth,inMemoryPersistence,browserPopupRedirectResolver,GoogleAuthProvider,signInWithPopup,signOut} from 'firebase/auth';
import {firebaseFlow} from './firebase-flow.js';
let auth;
export function firebaseLogin(config,invite,request){
 const sdk={initializeApp,getApps,GoogleAuthProvider,signInWithPopup,signOut,getAuthInstance:app=>auth??=initializeAuth(app,{persistence:inMemoryPersistence,popupRedirectResolver:browserPopupRedirectResolver})};
 return firebaseFlow(sdk,config,invite,request);
}
