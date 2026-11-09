// The Quagga2 distribution is loaded only after an explicit scan request.
let libraryPromise;
export function loadScanner(){
 if(globalThis.Quagga)return Promise.resolve(globalThis.Quagga);
 if(!libraryPromise)libraryPromise=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='/quagga-1.13.0.min.js';script.onload=()=>globalThis.Quagga?resolve(globalThis.Quagga):reject(Error('scanner unavailable'));script.onerror=()=>reject(Error('scanner unavailable'));document.head.append(script)}).catch(e=>{libraryPromise=null;throw e});
 return libraryPromise;
}
export function validScanCode(s){if(typeof s!=='string'||!/^\d+$/.test(s)||![8,12,13].includes(s.length))return false;let sum=0;for(let i=s.length-2,j=0;i>=0;i--,j++)sum+=Number(s[i])*(j%2?1:3);return (10-sum%10)%10===Number(s.at(-1))}
export function createScanner({video,load=loadScanner,getMedia=constraints=>navigator.mediaDevices.getUserMedia(constraints),replaceVideo=old=>{const fresh=old.cloneNode(false);old.replaceWith(fresh);return fresh},capture=preview=>{const canvas=document.createElement('canvas');canvas.width=preview.videoWidth;canvas.height=preview.videoHeight;if(!canvas.width||!canvas.height)return null;canvas.getContext('2d').drawImage(preview,0,0);return canvas.toDataURL('image/jpeg',0.85)},schedule=(fn,ms)=>setTimeout(fn,ms),cancelTimer=id=>clearTimeout(id),onState=()=>{},onCode=()=>{}}){
 let token=0,stream=null,active=false,timer=null,flight=Promise.resolve();
 function stop(){token++;active=false;if(timer!==null)cancelTimer(timer);timer=null;const s=stream;stream=null;if(s)for(const track of s.getTracks())track.stop();video.srcObject=null;video.hidden=true}
 async function start(){stop();const id=token;active=true;onState('opening');try{
  // Each camera attempt owns its preview; an old play promise cannot affect a new one.
  video=replaceVideo(video);const preview=video;preview.hidden=false;
  const lib=await load();if(id!==token)return;
  const acquired=await getMedia({audio:false,video:{facingMode:'environment'}});if(id!==token){for(const t of acquired.getTracks())t.stop();return}stream=acquired;for(const track of acquired.getTracks())track.addEventListener?.('ended',()=>{if(id===token){stop();onState('error')}},{once:true});
  preview.srcObject=acquired;await preview.play();if(id!==token)return;onState('scanning');
  async function scan(){try{
   // decodeSingle has shared internals: no overlapping decoder invocation across attempts.
   await flight.catch(()=>{});if(id!==token||!active)return;const src=capture(preview);if(src){const work=Promise.resolve().then(()=>lib.decodeSingle({src,numOfWorkers:0,locate:true,decoder:{readers:['ean_reader','ean_8_reader','upc_reader']} }));flight=work;const result=await work;if(id!==token||!active)return;const code=result?.codeResult?.code;if(validScanCode(code)){stop();onCode(code);return}}
   if(id===token&&active)timer=schedule(()=>{timer=null;scan()},500);
  }catch(e){if(id===token){stop();onState('error')}}}
  scan();
 }catch(e){if(id!==token)return;stop();onState(e?.name==='NotAllowedError'||e?.name==='SecurityError'?'denied':'error')}}
 return {start,stop};
}
