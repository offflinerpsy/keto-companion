// Session-only presentation state; never persisted or shared between accounts.
export function createScrollMemory(){
 const routes=new Map(),threads=new Map();
 return {
  saveRoute(key,top){if(key)routes.set(key,Math.max(0,Number(top)||0))},
  route:key=>routes.get(key)||0,
  saveThread(key,top){if(key)threads.set(key,Math.max(0,Number(top)||0))},
  thread:key=>threads.get(key),
  clear(){routes.clear();threads.clear()}
 };
}
export function chatScrollPosition({previousThread,nextThread,previousKey,nextKey,top,height,clientHeight,saved,submitted=false}){
 const changed=previousThread!==nextThread;
 if(changed)return {render:true,bottom:saved===undefined,top:saved||0};
 const render=previousKey!==nextKey;
 return {render,bottom:render&&(submitted||height-clientHeight-top<80),top};
}
export function createDialogController({$,getRouter,activeElement=()=>document.activeElement}){
 const ids={intake:'intake-dialog',recipe:'recipe-dialog',help:'help-dialog',proposal:'proposal-dialog',attachments:'attachments-dialog',topic:'topic-dialog',image:'image-link-details',source:'source-recipe-dialog'};
 let current=null,returnFocus=null,version=0;const visited=new Set();
 function sync(kind,{restore=true}={}){
  const previous=current;if(kind&&!visited.has(kind))kind=null;
  if(kind!==current)version++;
  for(const [key,id]of Object.entries(ids)){const dialog=$(id);if(dialog?.open&&key!==kind)dialog.close()}
  if(kind&&ids[kind]){const dialog=$(ids[kind]);if(!dialog.open){if(!current)returnFocus=activeElement();dialog.showModal()}current=kind;return}
  current=null;
  if(previous&&restore){const target=returnFocus?.isConnected&&!returnFocus.closest('[hidden]')?returnFocus:!$('pending-open')?.hidden?$('pending-open'):$('content');target?.focus({preventScroll:true})}
  if(previous)returnFocus=null;
 }
 function open(kind,focus){if(!ids[kind])return;visited.add(kind);if(!current)returnFocus=activeElement();if(getRouter().openDialog(kind)===false)return;sync(kind,{restore:false});if(focus)$(focus)?.focus({preventScroll:true})}
 return {open,sync,dismiss:()=>getRouter().dismissDialog(),close:()=>getRouter().closeDialog(),reset(){sync(null,{restore:false});returnFocus=null;visited.clear()},get current(){return current},get version(){return version}};
}
