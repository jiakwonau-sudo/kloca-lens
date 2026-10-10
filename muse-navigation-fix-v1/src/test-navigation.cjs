/* Runtime component and state tests. These do not simulate browser DOM
 * reconciliation, CSS layout, permissions, camera, payment, or real API calls. */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const { babelParse } = require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, 'playwright/lib/transform/babelBundle.js'));
const base = path.resolve(__dirname, '..');
const originalPath = path.join(base,'original/muse-version/assets/index-CQlsQNY7.js');
const fixedPath = path.join(base,'fixed/muse-version/assets/index-navigation-fix-v1.js');
const results = [];
function test(name, callback) {
  try { callback(); results.push({name,status:'PASS'}); }
  catch(error) { results.push({name,status:'FAIL',error:error.message}); }
}
function runtime(file, seed = {}, options = {}) {
  let code = fs.readFileSync(file, 'utf8');
  const ast = babelParse(code,'app.js',true);
  // Remove only the browser preload shim and root mount. Evaluate the real
  // app definitions and React runtime, with hooks dispatched by this harness.
  for (const node of [ast.program.body[1],ast.program.body.at(-1)].sort((a,b)=>b.start-a.start))
    code = code.slice(0,node.start)+code.slice(node.end);
  const storage = new Map(Object.entries(seed));
  const context = { console:{error(){},log(){}}, setTimeout, clearTimeout, URLSearchParams,
    localStorage:{get length(){return storage.size;},key(index){return [...storage.keys()][index]??null;},getItem(key){if(options.blockStorage)throw Error('blocked');return storage.get(key)??null;},
      setItem(key,value){if(options.blockStorage || options.fullStorage)throw Error('quota');storage.set(key,String(value));}},
    navigator:{userAgent:'KLoCa component test'} };
  vm.createContext(context); vm.runInContext(code, context);
  context.window = {innerWidth:1280,innerHeight:800,setTimeout,clearTimeout,scrollTo(){},location:{search:'',pathname:'/'}};
  context.requestAnimationFrame = callback => callback();
  const hooks = new Map(); let currentKey = '', hookIndex = 0;
  const hook = init => { const k = currentKey+':'+hookIndex++; if(!hooks.has(k)) hooks.set(k,typeof init==='function'?init():init);return [hooks.get(k),value=>hooks.set(k,typeof value==='function'?value(hooks.get(k)):value)]; };
  context.__dispatcher = {useState:hook,useRef:init=>hook({current:init})[0],useMemo:fn=>fn(),useEffect(){},useLayoutEffect(){},useContext:()=>null,
    useReducer:(reducer,arg,init)=>{const [value,set]=hook(()=>init?init(arg):arg);return [value,action=>set(previous=>reducer(previous,action))];}};
  vm.runInContext('_.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE.H=__dispatcher',context);
  function call(name,props={}) { currentKey=name;hookIndex=0;return vm.runInContext(`${name}(__props)`,Object.assign(context,{__props:props})); }
  let store = call('Ge',{children:null}).props.value;
  store.dispatch = action => {store.state = context.ze(store.state,action);};
  context.M = () => store;
  context.Wn = () => ({user:null});
  function expand(element, key = 'root') {
    if(element===null || element===undefined || element===false) return [];
    if(Array.isArray(element)) return element.flatMap((item,index)=>expand(item,key+'.'+index));
    if(typeof element !== 'object') return [element];
    if(typeof element.type === 'function') {
      if(element.type.prototype?.isReactComponent) {
        const boundary = new element.type(element.props);
        try {return expand(boundary.render(),key+'.child');}
        catch(error) {boundary.state=element.type.getDerivedStateFromError(error);boundary.componentDidCatch?.(error);return expand(boundary.render(),key+'.fallback');}
      }
      currentKey=key+':'+element.type.name;hookIndex=0;
      return expand(element.type(element.props),key+'.result');
    }
    return [element,...expand(element.props?.children,key+'.children')];
  }
  function nodes(name,props={}) {return expand(call(name,props));}
  function button(all,label) {return all.find(node=>node?.type==='button' && node.props['aria-label']===label);}
  function text(all) {return all.filter(node=>typeof node==='string'||typeof node==='number').join(' ');}
  return {context,storage,store,call,nodes,button,text};
}
const macros = {kcal:74,carbs:.4,fiber:0,netCarbs:.4,protein:6.3,fat:5,grams:50};
const entry = {id:'h-fixture',ts:Date.now()-86400000,meal:1,dietType:'standard',items:[{foodId:'egg',name:'계란',emoji:'🥚',qty:1,unitLabel:'개',macros}],totals:macros};
test('Original malformed historical entry reproduces a render TypeError',()=>{
  const bad = {...entry,items:null};
  const r = runtime(originalPath,{'nutrilens.history':JSON.stringify([bad])});
  assert.throws(()=>r.nodes('Wt'),/length|map/);
});
test('Original non-array history reproduces an array-method failure',()=>{
  const r = runtime(originalPath,{'nutrilens.history':'{}'});
  assert.throws(()=>r.nodes('Wt'),/map/);
});
test('Fixed malformed history is isolated and exact raw input is preserved',()=>{
  const raw=JSON.stringify([entry,{...entry,id:'broken',items:null}]);
  const r=runtime(fixedPath,{'nutrilens.history':raw});
  assert.equal(r.store.state.history.length,1);
  assert.equal(r.storage.get('nutrilens.history.recovery.v1'),raw);
  assert.match(r.text(r.nodes('Wt')),/계란/);
});
test('Fixed non-array and invalid JSON history recover without throwing',()=>{
  for(const raw of ['{}','null','[broken']) {
    const r=runtime(fixedPath,{'nutrilens.history':raw});
    assert.match(r.text(r.nodes('Wt')),/아직 기록이 없어요/);
    assert.equal(r.storage.get('nutrilens.history.recovery.v1'),raw);
  }
});
test('Valid historical records retain every field and original totals',()=>{
  const r=runtime(fixedPath,{'nutrilens.history':JSON.stringify([entry])});
  assert.equal(JSON.stringify(r.store.state.history),JSON.stringify([entry]));
  assert.equal(r.storage.has('nutrilens.history.recovery.v1'),false);
  const all=r.nodes('Wt');
  all.find(node=>node?.type==='button'&&node.props.className==='hist-card').props.onClick();
  assert.equal(r.store.state.modalStack[0].entryId,entry.id);
  assert.match(r.text(r.nodes('un',{entryId:entry.id})),/계란/);
});
test('Unknown table food ID is isolated before completeMeals can dereference it',()=>{
  const raw=JSON.stringify([{uid:'bad',foodId:'missing',qty:1,meal:1}]);
  const r=runtime(fixedPath,{'nutrilens.table':raw});
  assert.equal(r.store.state.table.length,0);
  assert.equal(r.storage.get('nutrilens.table.recovery.v1'),raw);
  assert.equal(r.store.completeMeals(),0);
});
test('Real add-to-table / completeMeals / history calculation remains intact',()=>{
  const r=runtime(fixedPath,{'nutrilens.table':JSON.stringify([{uid:'valid',foodId:'egg',qty:2,meal:1}])});
  let saved;
  r.store.dispatch = r.context.M().dispatch;
  // Ge closures use the real useReducer dispatch. Read the provider after completion.
  assert.equal(r.store.completeMeals(),1);
  saved=r.call('Ge',{children:null}).props.value;
  assert.equal(saved.state.table.length,0);
  assert.equal(saved.state.history.length,1);
  assert.equal(saved.state.history[0].items[0].qty,2);
  const before=runtime(originalPath,{'nutrilens.table':JSON.stringify([{uid:'valid',foodId:'egg',qty:2,meal:1}])});
  before.store.completeMeals();
  const baseline=before.call('Ge',{children:null}).props.value;
  assert.equal(saved.state.history[0].totals.kcal,baseline.state.history[0].totals.kcal);
  assert.equal(saved.state.history[0].totals.kcal,147);
});
test('Invalid profile targets and list fields restore valid defaults and preserve original',()=>{
  const raw=JSON.stringify({dietType:'unknown',targets:null,allergies:null,dislikes:{},fontScale:null});
  const r=runtime(fixedPath,{'nutrilens.profile':raw});
  assert.equal(r.store.state.profile.dietType,'standard');
  assert.equal(r.store.state.profile.targets.kcal,2000);
  assert.equal(r.storage.get('nutrilens.profile.recovery.v1'),raw);
  assert.doesNotThrow(()=>r.nodes('KlocaDashboardView'));
});
test('Existing user-entered API key and valid custom targets are preserved',()=>{
  const r=runtime(fixedPath,{'nutrilens.profile':JSON.stringify({geminiKey:'user-test-key',targets:{kcal:1900,netCarbs:200,protein:110,fat:70,fiber:25}})});
  assert.equal(r.store.state.profile.geminiKey,'user-test-key');
  assert.equal(r.store.state.profile.targets.kcal,1900);
});
test('A valid zero carbohydrate target is retained without creating a false recovery warning',()=>{
  const r=runtime(fixedPath,{'nutrilens.profile':JSON.stringify({targets:{kcal:1900,netCarbs:0,protein:110,fat:70,fiber:25}})});
  assert.equal(r.store.state.profile.targets.netCarbs,0);
  assert.equal(r.storage.has('nutrilens.profile.recovery.v1'),false);
});
test('Built-in API key is empty; no paid external request runs in these tests',()=>{
  const r=runtime(fixedPath);
  assert.equal(r.store.state.profile.geminiKey,'');
  assert.equal(/AIza[\w-]{20,}/.test(fs.readFileSync(fixedPath,'utf8')),false);
});
test('Blocked storage no longer prevents initial app or widget rendering',()=>{
  const r=runtime(fixedPath,{}, {blockStorage:true});
  assert.doesNotThrow(()=>r.nodes('Er'));
  assert.doesNotThrow(()=>r.nodes('Tr'));
});
test('Failed backup cannot overwrite the original malformed value',()=>{
  const raw='{"unexpected":"shape"}';
  const r=runtime(fixedPath,{'nutrilens.history':raw},{fullStorage:true});
  r.context.KlocaSave('nutrilens.history','[]');
  assert.equal(r.storage.get('nutrilens.history'),raw);
  assert.match(r.text(r.nodes('KlocaMainView')),/사본을 만들지 못했습니다/);
});
test('Existing first backup is preserved during another malformed-input recovery',()=>{
  const r=runtime(fixedPath,{'nutrilens.history':'null','nutrilens.history.recovery.v1':'first-original'});
  assert.equal(r.storage.get('nutrilens.history.recovery.v1'),'first-original');
  assert([...r.storage.entries()].some(([key,value])=>key.startsWith('nutrilens.history.recovery.v1.')&&value==='null'));
});
test('Existing JSON backup export now includes exact malformed-data recovery copies',()=>{
  const raw=JSON.stringify([entry,{...entry,id:'broken',items:null}]);
  const r=runtime(fixedPath,{'nutrilens.history':raw});
  r.context.KlocaSave('nutrilens.history',JSON.stringify(r.store.state.history));
  const backup=r.context.Qt();
  assert.equal(JSON.stringify(backup.data['nutrilens.history.recovery.v1']),raw);
  assert.equal(backup.data['nutrilens.history'].length,1);
});
test('Home contains the React scan hero and no home dashboard',()=>{
  const r=runtime(fixedPath),all=r.nodes('KlocaMainView');
  assert(all.some(node=>node?.props?.className==='muse-scan-hero'));
  assert(!all.some(node=>node?.props?.id==='dashboard'));
  assert(r.button(all,'사진 올리기'));
});
test('Hero and photo button use the real scan modal action',()=>{
  const r=runtime(fixedPath);
  for(const [name,label] of [['KlocaMuseHero','사진으로 검색'],['KlocaPhotoButton','사진 올리기']]) {
    r.store.state.modalStack=[];r.button(r.nodes(name),label).props.onClick();
    assert.equal(r.store.state.modalStack.at(-1).type,'scan');
  }
});
test('Hero and food collapse remain React state and persist the existing preference keys',()=>{
  const r=runtime(fixedPath);
  r.button(r.nodes('KlocaMuseHero'),'접기').props.onClick();
  assert.equal(r.storage.get('muse-hero-collapsed'),'1');
  assert(r.button(r.nodes('KlocaMuseHero'),'펼치기'));
  r.button(r.nodes('KlocaMarketSection',{children:'foods'}),'식품 목록 접기').props.onClick();
  assert.equal(r.storage.get('muse-food-collapsed'),'1');
  assert(r.nodes('KlocaMarketSection',{children:'foods'}).some(node=>node?.props?.hidden===true));
});
test('Widget records, dashboard and nutritionist dispatch correct destinations',()=>{
  const r=runtime(fixedPath,{'nutrilens.navcollapsed':'0'});
  r.button(r.nodes('Tr'),'기록').props.onClick();
  assert.equal(r.store.state.tab,'history');
  assert.match(r.text(r.nodes('KlocaMainView')),/아직 기록이 없어요/);
  r.button(r.nodes('Tr'),'대시보드 바로가기').props.onClick();
  assert.equal(r.store.state.tab,'dashboard');
  assert.equal(r.store.state.dashCollapsed,false);
  assert.match(r.text(r.nodes('KlocaMainView')),/오늘의 영양 대시보드/);
  r.button(r.nodes('Tr'),'AI 영양사').props.onClick();
  assert.equal(r.store.state.modalStack.at(-1).type,'nutritionist');
  assert.match(r.text(r.nodes('dr')),/AI 영양사/);
});
test('Repeated tab switches do not leave scan hero on records/dashboard',()=>{
  const r=runtime(fixedPath);
  for(let i=0;i<10;i++)for(const tab of ['home','history','dashboard','table']) {
    r.store.dispatch({type:'setTab',tab});const all=r.nodes('KlocaMainView');
    assert.equal(all.some(node=>node?.props?.className==='muse-scan-hero'),tab==='home');
    assert(all.length>0);
  }
});
test('A failing view renders recovery controls and leaves the header/widget reachable',()=>{
  const r=runtime(fixedPath);r.store.state.history=[{...entry,items:null}];r.store.state.tab='history';
  const all=r.nodes('Er');
  assert.match(r.text(all),/화면을 열지 못했어요/);
  assert(r.button(all,'홈으로'));
  assert(r.button(all,'메뉴 펼치기'));
});
test('HTML references only existing assets and has no imperative hero/mutation helper',()=>{
  const dir=path.join(base,'fixed/muse-version');const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
  for(const match of html.matchAll(/(?:src|href)="(assets\/[^"?]+)(?:\?[^"]*)?"/g))assert(fs.existsSync(path.join(dir,match[1])));
  assert(!/MutationObserver|muse-hero\.js|muse-key\.js/.test(html));
  const source=fs.readFileSync(path.join(base,'fix-src/navigation-fix.js'),'utf8');
  assert(!/appendChild|removeChild|insertBefore|innerHTML|querySelector|MutationObserver/.test(source));
});
const report={scope:'Node component and state regression tests; browser reconciliation/layout unverified',
  total:results.length,passed:results.filter(result=>result.status==='PASS').length,results};
fs.writeFileSync(path.join(base,'qa/test-results.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
if(report.passed!==report.total)process.exitCode=1;
