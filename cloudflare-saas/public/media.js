export class RecorderController{
 constructor({mediaDevices,Recorder,onState,onAudio,clock=()=>Date.now(),interval=(fn,ms)=>globalThis.setInterval(fn,ms),clear=id=>globalThis.clearInterval(id)}){Object.assign(this,{mediaDevices,Recorder,onState,onAudio,clock,interval,clear});this.generation=0;this.mode='idle'}
 emit(mode,message=''){this.mode=mode;this.onState({mode,message,seconds:Math.min(60,Math.floor((this.clock()-(this.started??this.clock()))/1000))})}
 release(){if(this.timer)this.clear(this.timer);this.timer=null;for(const track of this.stream?.getTracks()||[]){track.onended=null;track.stop();}this.stream=null}
 async start(){if(this.mode!=='idle')return;const generation=++this.generation;this.emit('permission','Разрешите микрофон для этой записи.');try{
  if(!this.mediaDevices?.getUserMedia||!this.Recorder)throw Error('Запись недоступна. Используйте диктовку клавиатуры или текст.');
  const mime=['audio/mp4','audio/webm'].find(x=>this.Recorder.isTypeSupported(x));if(!mime)throw Error('Этот браузер не поддерживает запись MP4/WebM. Используйте клавиатуру.');
  const stream=await this.mediaDevices.getUserMedia({audio:true});if(generation!==this.generation){stream.getTracks().forEach(t=>t.stop());return}this.stream=stream;for(const track of stream.getTracks())track.onended=()=>this.cancel('Запись прервана. Начните новую запись.');const recorder=new this.Recorder(stream,{mimeType:mime,audioBitsPerSecond:64000});this.recorder=recorder;this.parts=[];this.bytes=0;this.started=this.clock();
  recorder.ondataavailable=e=>{if(generation!==this.generation)return;if(e.data?.size){this.parts.push(e.data);this.bytes+=e.data.size;if(this.bytes>1000000)this.cancel('Запись больше 1 МБ. Запишите короче.')}};
  recorder.onerror=()=>this.cancel('Запись прервана. Попробуйте ещё раз.');recorder.onstop=async()=>{this.release();if(generation!==this.generation)return;try{const blob=new Blob(this.parts,{type:mime});this.parts=[];if(!blob.size)throw Error('Запись пуста. Попробуйте ещё раз.');if(blob.size>1000000)throw Error('Запись больше 1 МБ.');this.abort=new AbortController();this.emit('recognizing','Распознаю… Можно отменить.');const text=await this.onAudio(blob,mime,this.abort.signal);if(generation!==this.generation)return;this.emit('idle','Текст подготовлен. Проверьте его и нажмите «Отправить».');}catch(e){if(generation===this.generation)this.emit('idle',e.name==='AbortError'?'Распознавание отменено.':e.message)}finally{this.parts=[]}};
  recorder.start(250);this.emit('recording','Идёт запись');this.timer=this.interval(()=>{this.emit('recording','Идёт запись');if(this.clock()-this.started>=60000)this.stop()},250);
 }catch(e){this.release();if(generation===this.generation)this.emit('idle',e.name==='NotAllowedError'?'Нет разрешения на микрофон. Разрешите его в настройках сайта или введите текст.':e.message)}}
 stop(){if(this.mode==='recording'&&this.recorder?.state==='recording'){this.recorder.stop();this.release()}}
 cancel(message='Запись отменена.'){this.generation++;this.abort?.abort();if(this.recorder?.state==='recording')this.recorder.stop();this.release();this.parts=[];this.emit('idle',message)}
}
export async function blobBase64(blob){const bytes=new Uint8Array(await blob.arrayBuffer());let text='';for(const b of bytes)text+=String.fromCharCode(b);return btoa(text)}
export async function prepareImage(file,{bitmap=globalThis.createImageBitmap,document=globalThis.document,URL=globalThis.URL,Image=globalThis.Image}={}){
 if(!file||!file.type?.startsWith('image/')||file.size>12000000)throw Error('Нужно изображение до 12 МБ.');let source,url;
 try{if(bitmap)source=await bitmap(file);else{url=URL.createObjectURL(file);source=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=url})}
  const width=source.width||source.naturalWidth,height=source.height||source.naturalHeight;if(!width||!height||width*height>24000000)throw Error('Изображение слишком большое.');const canvas=document.createElement('canvas');let scale=Math.min(1,1024/Math.max(width,height));canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));canvas.getContext('2d').drawImage(source,0,0,canvas.width,canvas.height);const result=canvas.toDataURL('image/jpeg',.78);if(result.length>1300000)throw Error('После сжатия фото больше 1 МБ. Выберите меньший снимок.');return result;
 }catch(e){throw Error(e.message?.includes('МБ')?e.message:'Не удалось прочитать фото. Для HEIC выберите экспорт в JPEG/PNG и попробуйте снова.')}finally{source?.close?.();if(url)URL.revokeObjectURL(url)}
}

// One attachment controller for picker, paste, drop and explicit public-image URL.
// Dependencies are injectable for focused DOM tests; no global document handlers.
export function setupChatImages({root,$,prepare=prepareImage,link,epoch,setImage,notify}){
 let generation=0;
 const current=(g,e)=>g===generation&&e===epoch();
 function closeLink(){const d=$('image-link-details');if(typeof d.close==='function'){if(d.open)d.close()}else d.open=false}
 function openLink(){const d=$('image-link-details');if(typeof d.showModal==='function'){if(!d.open)d.showModal()}else d.open=true;$('image-link-url').focus()}
 function reset(){generation++;closeLink();$('image-link-load').disabled=false;setImage(null);$('message').required=true;$('photo-preview').hidden=true;$('photo-preview-image').removeAttribute('src');$('photo').value='';$('photo-status').textContent='';$('image-link-url').value='';$('image-drop-zone').classList.remove('dragging')}
 function display(value){setImage(value);$('message').required=false;$('photo-preview-image').src=value;$('photo-preview').hidden=false;$('photo-status').textContent='Фото подготовлено. Отправится только с вашим сообщением.'}
 async function attach(file){const g=++generation,e=epoch();try{const value=await prepare(file);if(current(g,e))display(value)}catch(error){if(current(g,e))notify(error.message)}}
 function first(files){const images=[...files].filter(f=>f.type?.startsWith('image/'));if(images.length){if(images.length>1)notify('За одно сообщение можно отправить одно фото. Выбрано первое.');void attach(images[0]);return true}if(files.length)notify('Нужен файл изображения. Страницу можно добавить текстом или скриншотом.');return false}
 function offerUrl(value){const url=String(value||'').split('\n').find(x=>x.trim()&&!x.startsWith('#'));if(!url)return;try{if(new URL(url).protocol!=='https:')throw Error();$('image-link-url').value=url;openLink();notify('Проверьте ссылку и нажмите «Загрузить фото по ссылке».')}catch{notify('Нужна прямая публичная HTTPS-ссылка на изображение.')}}
 $('photo').onchange=e=>first(e.target.files||[]);$('photo-remove').onclick=reset;
 root.addEventListener('paste',e=>{const files=[...(e.clipboardData?.items||[])].filter(x=>x.kind==='file'&&x.type.startsWith('image/')).map(x=>x.getAsFile()).filter(Boolean);if(!files.length){const text=(e.clipboardData?.getData('text/plain')||'').trim();if(/^https:\/\/[^\s]+$/i.test(text)&&(/\.(?:png|jpe?g|webp|gif)(?:[?#]|$)/i.test(text)||/^https:\/\/(?:images\.unsplash\.com|images\.pexels\.com|upload\.wikimedia\.org)\//i.test(text)))offerUrl(text);return;}const text=e.clipboardData?.getData('text/plain');if(!text)e.preventDefault();first(files)});
 const zone=$('image-drop-zone');zone.onclick=()=>$('photo').click();zone.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('photo').click()}});
 const relevant=e=>[...(e.dataTransfer?.types||[])].some(t=>['Files','text/uri-list'].includes(t));
 root.addEventListener('dragover',e=>{if(relevant(e)){e.preventDefault();e.dataTransfer.dropEffect='copy';zone.classList.add('dragging')}});
 root.addEventListener('dragleave',e=>{if(!root.contains(e.relatedTarget))zone.classList.remove('dragging')});
 root.addEventListener('drop',e=>{if(!relevant(e))return;e.preventDefault();zone.classList.remove('dragging');if(!first(e.dataTransfer.files||[]))offerUrl(e.dataTransfer.getData('text/uri-list'))});
 $('image-link-open').onclick=openLink;$('image-link-close').onclick=()=>{generation++;closeLink();$('image-link-load').disabled=false};$('image-link-details').addEventListener('cancel',()=>{generation++;$('image-link-load').disabled=false});
 $('image-link-load').onclick=async()=>{const g=++generation,e=epoch(),url=$('image-link-url').value;$('image-link-load').disabled=true;try{const value=await link(url);if(current(g,e)){display(value);closeLink()}}catch(error){if(current(g,e))notify(error.message)}finally{if(current(g,e))$('image-link-load').disabled=false}};
 return {reset,attach,offerUrl,invalidate(){generation++}};
}
