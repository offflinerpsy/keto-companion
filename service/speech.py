"""Bounded in-memory audio decoding and managed-identity Azure transcription."""
from __future__ import annotations
import array,base64,io,math,os,re,subprocess,wave
import httpx
class SpeechError(ValueError):
    def __init__(self,code,paid=False):self.code=code;self.paid=paid;super().__init__(code)
MIMES={'audio/mp4','audio/webm','audio/wav','audio/x-wav'}
def decode_audio(raw):
    try:
        import imageio_ffmpeg
        command=[imageio_ffmpeg.get_ffmpeg_exe(),'-nostdin','-hide_banner','-loglevel','error','-threads','1']
        fd=None
        try:
            if hasattr(os,'memfd_create'):
                # Linux Azure: seekable anonymous RAM file also handles non-fragmented MP4.
                # The fd protocol cannot name arbitrary files or URLs; no audio reaches disk.
                fd=os.memfd_create('keto-audio',flags=os.MFD_CLOEXEC)
                view=memoryview(raw)
                while view:view=view[os.write(fd,view):]
                os.lseek(fd,0,os.SEEK_SET)
                source=['-protocol_whitelist','fd,pipe','-format_whitelist','mov,matroska,webm,wav','-fd',str(fd),'-i','fd:']
                options={'input':None,'pass_fds':(fd,)}
            else:
                source=['-protocol_whitelist','pipe','-format_whitelist','mov,matroska,webm,wav','-i','pipe:0']
                options={'input':raw}
            result=subprocess.run(command+source+['-t','61','-vn','-ac','1','-ar','16000','-acodec','pcm_s16le','-f','wav','pipe:1'],capture_output=True,timeout=10,check=False,**options)
        finally:
            if fd is not None:os.close(fd)
        if result.returncode or len(result.stdout)>2_000_000:raise ValueError()
        with wave.open(io.BytesIO(result.stdout),'rb') as audio:
            if audio.getnchannels()!=1 or audio.getsampwidth()!=2 or audio.getframerate()!=16000:raise ValueError()
            pcm=audio.readframes(61*16000+1)
        seconds=len(pcm)/32000
        if not .25<=seconds<=60:raise SpeechError('AUDIO_DURATION')
        samples=array.array('h',pcm)
        if not samples or math.sqrt(sum(x*x for x in samples)/len(samples))<80:raise SpeechError('AUDIO_SILENT')
        out=io.BytesIO()
        with wave.open(out,'wb') as audio:audio.setnchannels(1);audio.setsampwidth(2);audio.setframerate(16000);audio.writeframes(pcm)
        return out.getvalue()
    except SpeechError:raise
    except (OSError,ValueError,ImportError,subprocess.SubprocessError,wave.Error):raise SpeechError('AUDIO_DECODE') from None
class AudioTranscriber:
    def __init__(self,decoder=decode_audio,transport=None,credential=None):self.decoder=decoder;self.transport=transport;self.credential=credential
    def transcribe(self,data,mime):
        if mime not in MIMES or not isinstance(data,str) or len(data)>1_400_000:raise SpeechError('AUDIO_FORMAT')
        try:raw=base64.b64decode(data,validate=True)
        except (ValueError,TypeError):raise SpeechError('AUDIO_FORMAT') from None
        if not 1<=len(raw)<=1_000_000:raise SpeechError('AUDIO_SIZE')
        wav=self.decoder(raw)
        model=os.getenv('AZURE_TRANSCRIBE_DEPLOYMENT','gpt-transcribe')
        if not re.fullmatch(r'[A-Za-z0-9_.-]{1,100}',model):raise SpeechError('AUDIO_UNAVAILABLE')
        endpoint=os.getenv('AZURE_OPENAI_ENDPOINT','https://offflinerpsy-4097-resource.openai.azure.com').rstrip('/')
        if endpoint!='https://offflinerpsy-4097-resource.openai.azure.com':raise SpeechError('AUDIO_UNAVAILABLE')
        attempted=False
        api_version=os.getenv('AZURE_TRANSCRIBE_API_VERSION','2025-03-01-preview')
        if not re.fullmatch(r'20[0-9]{2}-[0-9]{2}-[0-9]{2}(?:-preview)?',api_version):raise SpeechError('AUDIO_UNAVAILABLE')
        transcription_url=endpoint+'/openai/deployments/'+model+'/audio/transcriptions?api-version='+api_version
        try:
            fields={'model':model,'language':'ru','response_format':'json'}
            if self.transport:attempted=True;result=self.transport(wav,fields)
            else:
                from azure.identity import DefaultAzureCredential
                if self.credential is None:self.credential=DefaultAzureCredential(exclude_interactive_browser_credential=True)
                access=self.credential.get_token('https://cognitiveservices.azure.com/.default')
                with httpx.Client(timeout=httpx.Timeout(45,connect=8),follow_redirects=False) as client:
                    attempted=True
                    with client.stream('POST',transcription_url,data=fields,files={'file':('recording.wav',wav,'audio/wav')},headers={'Authorization':'Bearer '+access.token}) as r:
                        if r.status_code!=200:raise SpeechError('AUDIO_PROVIDER',True)
                        parts=[];size=0
                        for chunk in r.iter_bytes():
                            size+=len(chunk)
                            if size>64000:raise SpeechError('AUDIO_PROVIDER',True)
                            parts.append(chunk)
                        import json
                        result=json.loads(b''.join(parts))
            transcript=result.get('text')
            if not isinstance(transcript,str) or not transcript.strip() or len(transcript)>6000:raise SpeechError('AUDIO_TRANSCRIPT',True)
            return transcript.strip()
        except SpeechError:raise
        except Exception:raise SpeechError('AUDIO_PROVIDER',attempted) from None

def speech_message(code):
    return {'AUDIO_SILENT':'Запись слишком тихая или без сигнала. На распознавание она не отправлялась.', 'AUDIO_DURATION':'Запишите от 0,25 до 60 секунд и попробуйте снова.', 'AUDIO_FORMAT':'Выберите аудио MP4, WebM или WAV без ссылки на файл.', 'AUDIO_SIZE':'Аудио должно быть не больше 1 МБ.', 'AUDIO_DECODE':'Не удалось прочитать запись MP4/WebM/WAV. Запишите заново или введите текст.', 'AUDIO_UNAVAILABLE':'Распознавание пока не настроено. Введите текст.', 'AUDIO_PROVIDER':'Сервис распознавания временно недоступен. Запрос не повторён; попробуйте позже или введите текст.', 'AUDIO_TRANSCRIPT':'Распознанный текст пуст или слишком длинный. Сделайте более короткую запись.'}.get(code,'Не удалось распознать запись. Введите текст или попробуйте позже.')
