// The protected service admits only one request at a time for this page.
import {bounded} from './auth-session.js';
export function createRecipePageCalls({call,epoch,timeoutMs=65000}){
 let tail=Promise.resolve(),session=epoch();const pending=new Set();
 function invoke(...args){
  const stamp=epoch();
  // A previous account's unfinished transport must not block a new session.
  if(stamp!==session){session=stamp;tail=Promise.resolve();pending.clear()}
  const result=tail.catch(()=>{}).then(()=>{if(stamp!==epoch())throw Object.assign(Error('Сеанс изменился. Обновите экран.'),{code:'STALE_SESSION'});if(args[2]?.signal?.aborted)throw Object.assign(Error('Ожидание отменено.'),{name:'AbortError'});
   // The bridge has a 55-second deadline. Bound the browser wait too, even when
   // a lost connection never settles; no request is retried by this queue.
   return bounded(signal=>call(args[0],args[1],{...args[2],signal}),{signal:args[2]?.signal,timeoutMs}).catch(error=>{if(error.code==='NETWORK_TIMEOUT')error.message='Ответ не пришёл вовремя. Запрос не повторён. Обновите приложение и проверьте результат перед новым действием.';throw error});
  });
  tail=result;pending.add(result);result.then(()=>pending.delete(result),()=>pending.delete(result));return result;
 }
 async function settle(current){while(pending.size){await Promise.allSettled([...pending]);if(!current())return false}return current()}
 return {invoke,settle};
}
