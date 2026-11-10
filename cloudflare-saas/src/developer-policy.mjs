// Shared policy; the trusted container independently validates the same boundary.
export const EDITABLE=['cloudflare-saas/public/app.css','cloudflare-saas/public/help.html','cloudflare-saas/public/developer-extension.js'];
export const sha256=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),x=>x.toString(16).padStart(2,'0')).join('');
export function technicalTask(value){
 if(typeof value!=='string'||!value.trim()||value.length>2000||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value))throw Error('TECHNICAL_TASK_REQUIRED');
 return value; // Exact owner-approved text, never enriched with personal context.
}
export async function validatePatch(patch,snapshot){
 if(!patch||Object.keys(patch).sort().join()!=='files,notes,summary'||typeof patch.summary!=='string'||patch.summary.length>1200||typeof patch.notes!=='string'||patch.notes.length>2000||!Array.isArray(patch.files)||!patch.files.length||patch.files.length>3)throw Error('PATCH_SHAPE');
 const seen=new Set();let size=0;
 for(const file of patch.files){
  if(!file||Object.keys(file).sort().join()!=='before_sha256,content,path'||!EDITABLE.includes(file.path)||seen.has(file.path)||typeof file.content!=='string'||file.content.includes('\0'))throw Error('PROTECTED_SCOPE');
  seen.add(file.path);size+=new TextEncoder().encode(file.content).length;
  const before=snapshot.sources.find(x=>x.path===file.path);
  if(!before||file.before_sha256!==before.sha256||await sha256(before.content)!==before.sha256)throw Error('BASELINE_MISMATCH');
  if(file.content===before.content)throw Error('EMPTY_PATCH');
 }
 if(size>60000)throw Error('PATCH_TOO_LARGE');
 return {patch,patch_hash:await sha256(JSON.stringify(patch.files.map(({path,before_sha256,content})=>({path,before_sha256,content}))))};
}
export function unifiedDiff(patch,snapshot){
 return patch.files.map(f=>{const before=snapshot.sources.find(s=>s.path===f.path).content;const a=before.split('\n'),b=f.content.split('\n');if(a.at(-1)==='')a.pop();if(b.at(-1)==='')b.pop();return '--- a/'+f.path+'\n+++ b/'+f.path+'\n@@ -1,'+a.length+' +1,'+b.length+' @@\n'+a.map(x=>'-'+x).join('\n')+(a.length?'\n':'')+(!before.endsWith('\n')&&a.length?'\\ No newline at end of file\n':'')+b.map(x=>'+'+x).join('\n')+(b.length?'\n':'')+(!f.content.endsWith('\n')&&b.length?'\\ No newline at end of file\n':'')}).join('');
}
export const PREVIEW_CSP="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'; frame-src 'none'; worker-src 'none'";
export function privatePreview(patch,snapshot){
 const file=path=>patch.files.find(x=>x.path===path)?.content??snapshot.preview?.[path]??snapshot.sources.find(x=>x.path===path)?.content??'';
 const css=['cloudflare-saas/public/app.css','cloudflare-saas/public/diary.css','cloudflare-saas/public/motion.css'].map(file).join('').replace(/<\/style/gi,'<\\/style');
 // Candidate HTML/JS run ONLY in an opaque sandbox. No real state or parent API.
 const js=file('cloudflare-saas/public/developer-extension.js').replace(/<\/script/gi,'<\\/script');
 const fixture='<main id="content"><h1>KETO · синтетический предпросмотр</h1><p>Нет личных данных. Ничего не опубликовано.</p><nav><button>Чат</button><button>Меню</button><button>Дневник</button><button>Ещё</button></nav><section class="panel"><h2>Пример рецепта</h2><p>Демонстрационная карточка без расчёта питания.</p></section><div class="bubble assistant">Как сделать интерфейс удобнее?</div><form class="composer"><textarea aria-label="Демонстрационный черновик"></textarea><button type="button">Отправить</button></form></main>';
 return '<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="'+PREVIEW_CSP+'"><style>'+css+'</style></head><body>'+fixture+'<script>Object.defineProperty(window,"fetch",{value:async()=>new Response(JSON.stringify({synthetic:true,state:null}),{headers:{"Content-Type":"application/json"}}),writable:false});</script><script type="module">'+js+'\nif(typeof mountDeveloperExtension==="function")mountDeveloperExtension(document.getElementById("content"));\n</script><details><summary>Изменённая справка</summary>'+file('cloudflare-saas/public/help.html')+'</details></body></html>';
}

export const TEST_STAGES=['syntax','build','product','python'];
export function validTestReceipt(result,job,digest){
 return Boolean(result&&result.baseline===job.baseline&&result.patch_hash===job.patch_hash&&result.image_digest===digest&&result.exit_code===0&&result.status==='passed'&&Array.isArray(result.stages)&&result.stages.length===TEST_STAGES.length&&result.stages.every((s,i)=>s.name===TEST_STAGES[i]&&s.exit_code===0&&(i<2||(Number.isInteger(s.passed_count)&&s.passed_count>0))));
}
