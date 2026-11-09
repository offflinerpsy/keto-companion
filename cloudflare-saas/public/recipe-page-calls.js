// The protected service admits only one request at a time for this page.
export function createRecipePageCalls({call,epoch}){
 let tail=Promise.resolve();const pending=new Set();
 function invoke(...args){
  const stamp=epoch();
  const result=tail.catch(()=>{}).then(()=>{if(stamp!==epoch())throw Error('Сеанс изменился. Обновите экран.');if(args[2]?.signal?.aborted)throw Object.assign(Error('Ожидание отменено.'),{name:'AbortError'});return call(...args)});
  tail=result;pending.add(result);result.then(()=>pending.delete(result),()=>pending.delete(result));return result;
 }
 async function settle(current){while(pending.size){await Promise.allSettled([...pending]);if(!current())return false}return current()}
 return {invoke,settle};
}
