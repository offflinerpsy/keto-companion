// Buttons belong to one persisted assistant message; the server resolves every click.
const TYPES=new Set(['navigate','choose_meal_mode','open_recipe','open_intake','review_proposal']);
const VIEWS=new Set(['chat','diary','recipes','products','today','setup','targets','knowledge','memory','reminders','more']);
const MODES=new Set(['pantry_only','pantry_plus','inspiration']);
const STATUS={unavailable:'Это действие больше недоступно.',expired:'Срок подтверждения истёк.',completed:'Уже выполнено.',stale:'Данные изменились. Подготовьте действие заново.'};

export function setupChatActions({el,call,getState,epoch,getContext=()=>null,refresh,run,notify,navigate,chooseMode,openRecipe,openIntake,showProposal}){
 let serial=0,resolving=false;
 function render(message){
  const wrapper=el('article','chat-message '+(message.role==='user'?'user':'assistant'));
  if(message.id)wrapper.dataset.messageId=message.id;
  wrapper.append(el('div','bubble '+(message.role==='user'?'user':'assistant'),message.text||''));
  if(message.role!=='assistant'||!message.id||!message.thread_id)return wrapper;
  const actions=Array.isArray(message.actions)?message.actions.filter(a=>a&&TYPES.has(a.type)&&typeof a.id==='string'&&typeof a.label==='string').slice(0,3):[];
  if(!actions.length)return wrapper;
  const group=el('div','message-actions');group.setAttribute('aria-label','Действия после ответа');
  const status=el('p','message-action-status');status.setAttribute('role','status');
  function explainDisabled(){
   if(status.textContent.trim()||!Array.from(group.children).every(control=>control.disabled))return;
   status.textContent=[...new Set(actions.map(action=>action.reason||STATUS[action.status]||STATUS.unavailable))].join(' ');
  }
  for(const action of actions){
   const button=el('button','secondary',action.label);button.type='button';button.dataset.actionId=action.id;
   if(action.type==='open_recipe'&&typeof action.fit_note==='string')button.append(el('span','message-action-note',action.fit_note));
   button.disabled=action.status!=='available';
   if(button.disabled)button.setAttribute('aria-description',action.reason||STATUS[action.status]||STATUS.unavailable);
   button.onclick=()=>run(async()=>{
    if(resolving)return;
    const before=getState(),thread=before?.active_thread||'main';
    if(thread!==message.thread_id){notify('Откройте тему этого сообщения.');return}
    const version=before.revision,stamp=epoch(),token=serial,context=getContext();
    resolving=true;for(const control of group.children)control.disabled=true;status.textContent='Открываем…';
    try{
     const result=await call('keto_kitchen',{action:'chat_action',thread_id:message.thread_id,
      values:{message_id:message.id,action_id:action.id},expected_revision:version});
     if(token!==serial||stamp!==epoch()||context!==getContext()||(getState()?.active_thread||'main')!==thread)return;
     if(getState().revision!==version){status.textContent='Данные изменились. Нажмите ещё раз.';return}
     if(result.message_id!==message.id||result.response_thread_id!==message.thread_id||result.action?.id!==action.id){status.textContent='Действие не удалось проверить. Обновите разговор.';return}
     const command=result.command;
     if(!command){status.textContent=result.action?.reason||STATUS[result.action?.status]||STATUS.unavailable;button.dataset.unavailable='true';return}
     button.disabled=false;button.focus?.({preventScroll:true});
     if(command.type!==action.type)throw Error('Действие не удалось проверить. Обновите разговор.');
     if(command.type==='navigate'&&VIEWS.has(command.view))navigate(command.view);
     else if(command.type==='choose_meal_mode'&&MODES.has(command.mode))chooseMode(command.mode);
     else if(command.type==='open_recipe'&&command.recipe?.recipe_id)openRecipe(command.recipe,command.source);
     else if(command.type==='open_intake'&&command.source?.recipe_id)openIntake({...command.source,amount:command.suggested_amount});
     else if(command.type==='review_proposal'&&getState().pending?.some(p=>p.id===command.proposal_id))showProposal(command.proposal_id);
     else throw Error('Это действие больше недоступно.');
     status.textContent='';
    }catch(error){if(token===serial&&stamp===epoch()&&context===getContext()){status.textContent=error.message||'Не удалось открыть. Попробуйте ещё раз.';if(refresh){const retry=el('button','text-btn','Обновить разговор');retry.type='button';retry.onclick=()=>run(async()=>{retry.disabled=true;try{await refresh();if(token===serial&&stamp===epoch())status.textContent='Разговор обновлён. Нажмите нужное действие ещё раз.'}finally{retry.disabled=false}});status.append(retry)}}}
    finally{if(token===serial&&stamp===epoch()){resolving=false;for(const control of group.children){const original=actions.find(a=>a.id===control.dataset.actionId);control.disabled=original?.status!=='available'||control.dataset.unavailable==='true'}explainDisabled()}}
   });
   group.append(button);
  }
  explainDisabled();
  wrapper.append(group,status);return wrapper;
 }
 return {render,reset(){serial++;resolving=false}};
}
