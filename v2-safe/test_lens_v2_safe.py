from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image
import json,re
root=Path('/mnt/data/work_20261011/lens_v2_safe')
html=(root/'index.html').read_text()
res=[]
def emit(case,ok,detail=''):
 print(('PASS' if ok else 'FAIL'),case,detail[:200],flush=True)
 res.append({'case':case,'pass':bool(ok),'detail':detail[:400]})
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 ctx=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
 pg=ctx.new_page();errors=[];outbound=[]
 pg.on('pageerror',lambda e:errors.append(str(e)))
 pg.on('request',lambda r:outbound.append(r.url) if 'generativelanguage' in r.url or '/api/recognize' in r.url else None)
 pg.evaluate("""() => {let data={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>Object.prototype.hasOwnProperty.call(data,k)?data[k]:null,setItem:(k,v)=>data[k]=String(v),removeItem:k=>delete data[k],clear:()=>data={}}});}""")
 pg.set_content(html,wait_until='domcontentloaded',timeout=15000)
 pg.wait_for_timeout(300)
 emit('Boot and safe preview label',pg.locator('#lensSafetyNotice').count()==1 and 'SAFE PREVIEW' in pg.title(),pg.title())
 emit('No frontend provider key',not re.search(r'AIza[\w-]{25,}',html) and '__GEMINI_KEY__' not in html)
 emit('Scan start screen',pg.locator('#s-scan').evaluate('(e)=>e.classList.contains("on")'))
 pg.screenshot(path=str(root/'QA_boot_390.png'))
 # Simulate photo upload, use small test input PNG
 image=root/'shot-carrot.png'
 pg.locator('#fileInput').set_input_files(str(image))
 pg.wait_for_timeout(1200)
 state=pg.evaluate('''() => ({active:[...document.querySelectorAll('.screen.on')].map(x=>x.id),name:document.querySelector('#recogName').textContent,source:document.querySelector('#recogSrc').textContent,shownImage:!!document.querySelector('#recogCard img')})''')
 emit('Photo upload preview without remote AI',state['shownImage'] and state['active']==['s-confirm'] and '미연결' in state['name'],str(state))
 emit('No third-party AI request',len(outbound)==0,str(outbound))
 pg.screenshot(path=str(root/'QA_photo_390.png'))
 # manual selection/confirmation/data persistence
 pg.locator('#nameInput').fill('아보카도')
 suggestions=pg.locator('#suggest div[data-id]').count()
 emit('Manual food matching returns candidates',suggestions>0,str(suggestions))
 pg.locator('#btnTyped').click()
 emit('Manual selection has correct food',pg.locator('#recogName').inner_text()=='아보카도',pg.locator('#recogSrc').inner_text())
 pg.locator('#btnYes').click()
 active=pg.locator('.screen.on').first.get_attribute('id')
 hero=pg.locator('#heroNc').inner_text()
 emit('Confirm shows local nutrition',active=='s-result' and hero not in ['', '–'],f'{active} netcarb={hero}')
 pg.screenshot(path=str(root/'QA_result_390.png'))
 pg.locator('#btnSave').click()
 local=pg.evaluate('''() => ({history:localStorage.getItem('lens_hist_v2'),cart:localStorage.getItem('lens_cart_v2')})''')
 emit('History saved locally',bool(local['history']) and '"avo"' in local['history'],str(local)[:140])
 emit('No JS runtime errors',len(errors)==0,str(errors[:5]))
 ctx.close();b.close()
(root/'QA_RESULTS_20261011.json').write_text(json.dumps({'mode':'Playwright set_content on about:blank; real UI clicks/photo FileReader, no network and no provider credentials','results':res,'pass':sum(x['pass'] for x in res),'fail':sum(not x['pass'] for x in res)},ensure_ascii=False,indent=2)+'\n')
print('SUMMARY',len(res),sum(x['pass'] for x in res),'pass',sum(not x['pass'] for x in res),'fail')
