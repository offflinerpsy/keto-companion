import base64,json
from types import SimpleNamespace
import pytest
from service.speech import AudioTranscriber,SpeechError
from service.mobile_exports import food_state,grams

def test_transcription_uses_verified_deployment_route(monkeypatch):
 import service.speech as speech
 class Response:
  status_code=200
  def __enter__(self):return self
  def __exit__(self,*args):pass
  def iter_bytes(self):yield json.dumps({'text':'Синтетический текст'}).encode()
 class Client:
  def __init__(self,**kwargs):pass
  def __enter__(self):return self
  def __exit__(self,*args):pass
  def stream(self,method,url,**kwargs):
   assert method=='POST'
   assert url=='https://offflinerpsy-4097-resource.openai.azure.com/openai/deployments/gpt-transcribe/audio/transcriptions?api-version=2025-03-01-preview'
   assert kwargs['data']['language']=='ru'
   return Response()
 monkeypatch.setattr(speech.httpx,'Client',Client)
 credential=SimpleNamespace(get_token=lambda *x:SimpleNamespace(token='synthetic-not-a-credential'))
 transcriber=AudioTranscriber(decoder=lambda x:b'WAV',credential=credential)
 assert transcriber.transcribe(base64.b64encode(b'synthetic').decode(),'audio/mp4')=='Синтетический текст'

def test_api_version_cannot_inject_route(monkeypatch):
 monkeypatch.setenv('AZURE_TRANSCRIBE_API_VERSION','x&redirect=https://invalid.test')
 with pytest.raises(SpeechError,match='AUDIO_UNAVAILABLE'):
  AudioTranscriber(decoder=lambda x:b'WAV',transport=lambda *a:pytest.fail('provider must not be reached')).transcribe('YQ==','audio/wav')

def test_pdf_food_states_are_human_readable():
 assert food_state('canned_drained')=='консервированный, без жидкости'
 assert food_state('unknown')=='состояние уточните в карточке продукта'
 assert grams(12.5)=='12,5' and grams(12.0)=='12'

@pytest.mark.skipif(not hasattr(__import__('os'),'memfd_create'),reason='Linux Azure RAM descriptor branch')
def test_nonfragmented_mp4_seekable_ram_without_audio_files(tmp_path):
 import subprocess,imageio_ffmpeg,io,wave
 from service.speech import decode_audio
 # Synthetic test fixture only; real request path never writes audio to disk.
 f=tmp_path/'synthetic.m4a'
 subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(),'-nostdin','-hide_banner','-loglevel','error','-f','lavfi','-i','sine=frequency=440:duration=1','-c:a','aac',str(f)],check=True,timeout=10)
 raw=decode_audio(f.read_bytes())
 with wave.open(io.BytesIO(raw),'rb') as a:assert .9<a.getnframes()/a.getframerate()<1.2
