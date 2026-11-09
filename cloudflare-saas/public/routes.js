export const ROUTES=['chat','today','diary','more','recipes','products','settings','sources','reminders','admin','developer','targets','knowledge','memory','setup-consent','setup-about','setup-restrictions','setup-targets'];
export const MAIN_ROUTES=['chat','diary','recipes','products'];
export function mainTab(route){return route==='today'?'recipes':MAIN_ROUTES.includes(route)?route:'more'}
export function routeValue(hash,fallback='chat'){const value=String(hash||'').replace(/^#/,'');return ROUTES.includes(value)?value:fallback}
export function initialRoute(state,hash){const g=state.guidance;if(g&&!g.ready){if(['recipes','products'].includes(routeValue(hash,'')))return routeValue(hash,'');return 'setup-'+g.stage}return routeValue(hash,state.ui?.home||'chat')}
export function createRouter({location,history,listen,render,closeDialog=()=>{},fallback=()=> 'chat'}){
 let current='',depth=0,origin='more',closingDialog=false,pendingDialog=null,pendingRoute=null;
 function display(route,reason){depth=history.state?.ketoDepth||0;origin=history.state?.ketoOrigin||origin;closeDialog(history.state?.ketoDialog||null,{restore:route===current});if(route===current&&reason==='history')return;current=route;render(route,{reason,origin,depth})}
 function go(value,{replace=false,reason='user'}={}){
  const route=routeValue('#'+value,fallback());if(closingDialog){pendingRoute={route,replace,reason};pendingDialog=null;return}if(route===current)return;
  const inDialog=Boolean(history.state?.ketoDialog);if(route==='today'&&current!=='recipes'&&!replace&&!inDialog){depth=0;history.replaceState({ketoRoute:'recipes',ketoDepth:0,ketoOrigin:'more'},'','#recipes')}if(!MAIN_ROUTES.includes(route))origin=route==='today'?'recipes':current||'more';
  const swap=replace||MAIN_ROUTES.includes(route)||inDialog;
  const nextDepth=MAIN_ROUTES.includes(route)?0:swap?Math.max(0,depth-(inDialog?1:0)):depth+1;
  history[swap?'replaceState':'pushState']({ketoRoute:route,ketoDepth:nextDepth,ketoOrigin:origin},'','#'+route);display(route,reason);
 }
 function back(){if(history.state?.ketoDialog){if(!closingDialog){closingDialog=true;history.back()}return}if(current==='today'&&depth===0){go('recipes',{replace:true});return}if(depth>0){history.back();return}go(current==='more'?'chat':current==='setup-consent'?'recipes':current.startsWith('setup-')?['setup-consent','setup-about','setup-restrictions','setup-targets'][Math.max(0,['setup-consent','setup-about','setup-restrictions','setup-targets'].indexOf(current)-1)]:'more',{replace:true})}
 listen('popstate',()=>{closingDialog=false;display(routeValue(location.hash,fallback()),'history');if(pendingRoute){const next=pendingRoute;pendingRoute=null;go(next.route,next)}else if(pendingDialog){const kind=pendingDialog;pendingDialog=null;openDialog(kind);closeDialog(kind,{restore:false})}});
 listen('hashchange',()=>{const valid=routeValue(location.hash,fallback());if(location.hash!=='#'+valid)history.replaceState({ketoRoute:valid,ketoDepth:depth},'','#'+valid);display(valid,'history')});
 function openDialog(kind='recipe'){if(closingDialog){pendingDialog=kind;return false}const replacing=Boolean(history.state?.ketoDialog);history[replacing?'replaceState':'pushState']({ketoRoute:current,ketoDepth:replacing?depth:depth+1,ketoOrigin:origin,ketoDialog:kind},'','#'+current);if(!replacing)depth++;return true}
 return {go,back,openDialog,
  dismissDialog(){if(history.state?.ketoDialog){depth=Math.max(0,depth-1);history.replaceState({ketoRoute:current,ketoDepth:depth,ketoOrigin:origin},'','#'+current)}closeDialog(null,{restore:true})},
  closeDialog(){if(closingDialog)return;if(history.state?.ketoDialog){closingDialog=true;closeDialog(null,{restore:true});history.back()}else closeDialog(null,{restore:true})},
  get current(){return current},
  reset(){current='';depth=0;origin='more';closingDialog=false;pendingDialog=null;pendingRoute=null;history.replaceState(null,'',location.pathname+location.search)},
  parent(){return current==='today'?'recipes':current.startsWith('setup-')?'setup':origin||'more'}
 };
}
