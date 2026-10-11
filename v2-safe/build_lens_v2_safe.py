from pathlib import Path
import re,hashlib,json,shutil
src=Path('/mnt/data/work_20261011/lens_v2/v2')
dest=Path('/mnt/data/work_20261011/lens_v2_safe')
dest.mkdir(exist_ok=True)
html=(src/'index.html').read_text()
pattern=r'/\* ============ ONLINE/AI HOOK \(only when truly needed\) ============.*?const BARCODES = \{\};'
replacement='''/* ============ PHOTO RECOGNITION - SECURE PREVIEW ============
 * Browser never contains a provider API key. The Vercel/Cloudflare server-side
 * endpoint is deliberately OFF until secret rotation, authentication and durable
 * per-client rate-limiting have been configured and audited.
 * No paid API calls are made by this preview.
 */
const VISION_PROXY_ENABLED = false;
async function recognizePhotoOnline(dataUrl, mime){
  if (!VISION_PROXY_ENABLED) return null;
  if (mime !== 'image/jpeg' || !/^data:image\\/jpeg;base64,/.test(dataUrl)) return null;
  const image = dataUrl.split(',')[1];
  if (!image || image.length > 1_600_000) return null;
  try {
    const controller=new AbortController();
    const cutoff=setTimeout(()=>controller.abort(), 10000);
    try {
      const response = await fetch('/api/recognize', {
        method:'POST', headers:{'Content-Type':'application/json'},
        credentials:'same-origin', signal:controller.signal,
        body:JSON.stringify({image,mime})
      });
      if (!response.ok) return null;
      const value=await response.json();
      return typeof value.name==='string' && value.name.length<=64 ? value.name.trim() : null;
    } finally { clearTimeout(cutoff); }
  } catch(e){return null;}
}
const BARCODES = {};'''
changed,num=re.subn(pattern,lambda m:replacement,html,flags=re.S)
assert num==1,f'Expected 1 vulnerable hook, got {num}'
changed=changed.replace('<title>KLoCa Lens v2</title>','<title>KLoCa Lens v2 · SAFE PREVIEW</title>')
changed=changed.replace("current = byId(id); if(!current) return;","current = byId(id); if(!current) return; $('btnYes').disabled=false;")
changed=changed.replace("pendingPhoto=dataUrl; current=null;","pendingPhoto=dataUrl; current=null; $('btnYes').disabled=true;")
changed=changed.replace("$('recogName').textContent='인식 중...';", "$('recogName').textContent=VISION_PROXY_ENABLED?'인식 중...':'사진 미리보기';")
changed=changed.replace("$('recogSrc').textContent='사진을 분석하고 있어요';", "$('recogSrc').textContent=VISION_PROXY_ENABLED?'사진을 분석하고 있어요':'AI 자동 인식 미연결 · 직접 선택 가능';")
changed=changed.replace("$('recogName').textContent='인식에 실패했어요';", "$('recogName').textContent=VISION_PROXY_ENABLED?'인식에 실패했어요':'AI 자동 인식이 미연결입니다';")
changed=changed.replace("$('recogSrc').textContent='아래에서 직접 입력해주세요';", "$('recogSrc').textContent='아래에서 직접 입력하거나 선택하세요';")
# Below the scan upload input, show a clear, persistent preview limitation.
notice='''<div id="lensSafetyNotice" role="note" style="font-size:12px;line-height:1.45;margin:8px 18px;padding:10px 12px;background:#fff4d2;border:2px solid #725c3b;border-radius:12px;color:#443727"><strong>안전 미리보기</strong> · 사진 자동 인식은 아직 연결되지 않았습니다. 음식 이름 직접 입력과 재료 선택은 이용할 수 있습니다.</div>'''
assert changed.count('<input type="file" id="fileInput"')==1
changed=changed.replace('<input type="file" id="fileInput" accept="image/*" class="hidden">','<input type="file" id="fileInput" accept="image/*" class="hidden">\n'+notice)
for token in ['__GEMINI_KEY__','AIza','generativelanguage.googleapis.com','const GEMINI_KEY']:
 assert token not in changed,token+' survives'
assert changed.count('VISION_PROXY_ENABLED')>=3
(dest/'index.html').write_text(changed)
for src_image in src.glob('*.png'):
 shutil.copy2(src_image,dest/src_image.name)
(dest/'README.md').write_text('''# KLoCa Lens v2 · SAFE PREVIEW (2026-10-11)

Based on original Google Drive `KLoCa_Lens_v2_20261010.zip`, unchanged original retained.

This intentionally **does not contain or call a provider API key**. The image recognition proxy is disabled. Photo upload preview, manual food search, confirmation, nutrition result, history, and cart are testable without external API spending.

Do not enable `VISION_PROXY_ENABLED` until a same-origin `/api/recognize` server endpoint has:
- replaced and revoked any previously exposed provider keys
- validated user access and given explicit usage limits
- enforced reliable server-side per-user/per-IP rate limiting, abuse monitoring, image/MIME/size limits and timeouts
- withheld provider credentials from HTML / browser JS
- been independently tested and approved by KLoCa QA

`worker.js` / `Code.gs` from the original ZIP were **not deployed** because they have no verified abuse controls.

Test evidence is stored separately. An unconfigured AI endpoint is a feature limitation, not a PASS of AI recognition.
''')
manifest={'build':'Lens v2 SAFE PREVIEW','source_sha256':hashlib.sha256(html.encode()).hexdigest(),'index_sha256':hashlib.sha256(changed.encode()).hexdigest(),'files':['index.html']+sorted(p.name for p in dest.glob('shot-*.png')),'no_public_gemini_key':True,'vision_enabled':False,'external_paid_api_calls':False}
(dest/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'out':str(dest),'html_bytes':len(changed.encode()),'files':manifest['files'],'index_sha256':manifest['index_sha256']},ensure_ascii=False))
