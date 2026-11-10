export function createRecipeLibrary({call,readFilters,render,clear=()=>{},status,more,epoch}) {
 let token=0,offset=0,scope=null,retry=null;
 const fingerprint=x=>JSON.stringify(x);
 function invalidate(){token++;retry=null;more(false)}
 async function load(append=false){
  const filters=readFilters(),key=fingerprint(filters);
  if(append&&scope!==key)append=false;
  const start=append?offset:0,serial=++token,screen=epoch();if(!append){clear();scope=null;offset=0}retry={append,key};status('Загрузка…');more(false);
  try{
   const d=await call({...filters,limit:24,offset:start});
   if(serial!==token||screen!==epoch()||fingerprint(readFilters())!==key)return;
   render(d,append);scope=key;offset=start+d.recipes.length;retry=null;status(`Показано ${offset} из ${d.total}`);more(d.has_more,false);
  }catch(e){
   if(serial===token&&screen===epoch()&&fingerprint(readFilters())===key){retry={append,key};status('Не удалось загрузить рецепты. Попробуйте снова.');more(true,true)}
   throw e;
  }
 }
 function next(){const key=fingerprint(readFilters());return load(retry&&retry.key===key?retry.append:true)}
 return {load,next,invalidate};
}
