import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const storage=new Map();let blocked=false;let clock=Date.now();
const makeNode=()=>({textContent:'',innerHTML:'',value:'',open:false,disabled:false,hidden:false,classList:{add(){},remove(){},toggle(){}},addEventListener(k,fn){this[k]=fn},append(){},showModal(){this.open=true},close(){this.open=false}});
const nodes=new Map();
function environment(){
  const context={
    document:{querySelector(s){if(!nodes.has(s))nodes.set(s,makeNode());return nodes.get(s)},querySelectorAll(){return []},createElement:makeNode},
    window:{addEventListener(){},print(){}},navigator:{},Date:class extends Date{static now(){return clock}},
    localStorage:{removeItem:k=>storage.delete(k),getItem:k=>storage.get(k)??null,setItem(k,v){if(blocked)throw Error('Quota');storage.set(k,v)}},
    crypto:{randomUUID:()=>crypto.randomUUID()},setTimeout(){},clearTimeout(){},setInterval(){},clearInterval(){},confirm:()=>true,console
  };
  vm.createContext(context);vm.runInContext(fs.readFileSync(new URL('app.js',import.meta.url),'utf8'),context);return context;
}
let ctx=environment();const run=s=>vm.runInContext(s,ctx);
assert.equal(run("calc(1,60000,{...defaults,minimum:10}).total"),1000);
run("begin(); pause()");assert.equal(run('state'),'paused');assert.equal(run('trip.gpsIncomplete'),true);
await run("finish()");assert.equal(run('state'),'idle');assert.equal(run('readTrips().length'),1);
const id=run('readTrips()[0].id');assert.equal(run('selected.id'),id);
ctx=environment();assert.equal(run('readTrips()[0].id'),id);
await run('saveTrip(readTrips()[0])');assert.equal(run('readTrips().length'),1);
run('begin();pause()');blocked=true;await run('finish()');assert.equal(run('state'),'paused');assert.ok(run('pending'));assert.equal(run('readTrips().length'),1);
blocked=false;await run('finish()');assert.equal(run('state'),'idle');assert.equal(run('readTrips().length'),2);
const history=storage.get('voltfare.pages.trips.v1');
storage.set('voltfare.pages.trips.v1','corrupted');
assert.throws(()=>run('readTrips()'),/no se puede leer/);
run('begin();pause()');await run('finish()');assert.ok(run('pending'));assert.equal(storage.get('voltfare.pages.trips.v1'),'corrupted');
storage.set('voltfare.pages.trips.v1',history);await run('finish()');
assert.equal(run('state'),'idle');assert.match(run("receiptHTML({...selected,tariff:{...selected.tariff,issuer:'<script>'}})"),/&lt;script&gt;/);
assert.ok(!fs.readFileSync(new URL('app.js',import.meta.url),'utf8').includes('/api/trips'));
const html=fs.readFileSync(new URL('index.html',import.meta.url),'utf8');assert.ok(html.includes('src="./app.js"'));assert.ok(html.includes('perderás el historial'));
console.log('OK: mínimos, guardado, recarga, reintentos, duplicados, corrupción, escape de recibos y rutas relativas.');


// Signal recovery uses controlled timestamps and distances near the equator.
run('begin()');
function fix(seconds,lon,accuracy=5){clock+=seconds*1000;ctx.point={coords:{latitude:0,longitude:lon,accuracy,speed:null},timestamp:clock};run('acceptPosition(point)')}
fix(0,0);fix(10,.001);assert.ok(run('trip.measuredKm')>.11);
run("loseGps('test')");fix(30,.005);assert.ok(run('trip.estimatedKm')>.44);
const estimated=run('trip.estimatedKm'),before=run('distanceKm');
fix(1,.005);assert.equal(run('distanceKm'),before);assert.equal(run('trip.estimatedKm'),estimated);
run("loseGps('test')");fix(61,.01);assert.equal(run('distanceKm'),before);
fix(1,100);assert.equal(run('distanceKm'),before);assert.equal(run('gap'),true);
fix(1,.01,100);assert.equal(run('distanceKm'),before);
// Pause/resume and waiting never bridge the excluded distance.
run('pause();begin()');fix(1,.1);assert.equal(run('distanceKm'),before);
run("$('#waitBtn').onclick()");clock+=60000;run('tick()');assert.equal(run('trip.waitMs'),60000);
fix(1,.2);assert.equal(run('distanceKm'),before);
assert.equal(run('calc(0,120000,{...defaults,base:0,perMin:1,waitRate:2},60000).time'),300);
assert.equal(run('calc(0,120000,{...defaults,base:0,countTime:false,waitRate:2},60000).time'),200);
run('pause()');run("$('#manualKm').value='12.5';$('#manualReason').value='Odómetro <test>';$('#adjustForm').submit({preventDefault(){}})");
assert.equal(run('distanceKm'),12.5);assert.equal(run('trip.manual.km'),12.5);
const elapsedSaved=run('elapsed'),activeId=run('trip.id');clock+=3600000;ctx=environment();
assert.equal(run('state'),'paused');assert.equal(run('trip.id'),activeId);assert.equal(run('distanceKm'),12.5);assert.equal(run('elapsed'),elapsedSaved);
await run('finish()');assert.match(run('receiptHTML(selected)'),/Odómetro &lt;test&gt;/);assert.match(run('receiptHTML(selected)'),/Distancia estimada/);
assert.equal(storage.has('voltfare.active.v2'),false);
console.log('OK: GPS short/long gaps, no double distance, invalid positions, pause, waiting, manual correction, active recovery and receipt audit.');
// Exercise the offline shell at the real GitHub Pages subpath.
const listeners={},cached=new Map();let installed;
const scope='https://sgarcia87.github.io/voltfare/';
const sw={URL,self:{location:{origin:'https://sgarcia87.github.io'},registration:{scope},clients:{claim:async()=>{}},addEventListener:(name,fn)=>listeners[name]=fn},caches:{open:async()=>({addAll:async paths=>{for(const path of paths)cached.set(new URL(path,scope).pathname,'cached:'+path)},match:async path=>cached.get(path)}),keys:async()=>[],delete:async()=>{}},fetch:async()=>{throw Error('Offline')}};
vm.createContext(sw);vm.runInContext(fs.readFileSync(new URL('sw.js',import.meta.url),'utf8'),sw);
listeners.install({waitUntil:p=>installed=p});await installed;
for(const path of ['/voltfare/','/voltfare/index.html','/voltfare/app.js']){
  let response;listeners.fetch({request:{method:'GET',url:'https://sgarcia87.github.io'+path},respondWith:p=>response=p});assert.match(await response,/^cached:/);
}
let intercepted=false;listeners.fetch({request:{method:'GET',url:'https://tile.openstreetmap.org/0/0/0.png'},respondWith:()=>intercepted=true});assert.equal(intercepted,false);
console.log('OK: offline shell cache at /voltfare/; external map tiles not cached.');

// The displayed paths update as GPS arrives, retain their first point after gaps,
// and survive an active-trip reload without joining paused portions.
run('begin();route={setLatLngs(points){this.points=JSON.parse(JSON.stringify(points))}};estimatedRoute={setLatLngs(points){this.points=JSON.parse(JSON.stringify(points))}}');
fix(1,0);fix(10,.001);fix(10,.002);
assert.equal(run('route.points[0].length'),3);
run("loseGps('Tunnel')");fix(30,.006);
assert.equal(run('estimatedRoute.points.length'),1);
assert.equal(run('route.points.at(-1).length'),1);
fix(10,.007);assert.equal(run('route.points.at(-1).length'),2);
const pointsBefore=run('segments.flat().length');
run("$('#waitBtn').onclick()");fix(10,.008);assert.equal(run('segments.flat().length'),pointsBefore);
run('pause();checkpoint()');
const measuredPath=run('JSON.stringify(segments)'),estimatedPath=run('JSON.stringify(estimatedSegments)');
ctx=environment();assert.equal(run('JSON.stringify(segments)'),measuredPath);assert.equal(run('JSON.stringify(estimatedSegments)'),estimatedPath);
run('begin()');fix(10,.02);assert.equal(run('segments.at(-1).length'),1);
assert.equal(run("$('#mainBtn').textContent"),'Pausar sin cobrar');
run('pause()');assert.equal(run("$('#mainBtn').textContent"),'Continuar viaje');
console.log('OK: live route updates, gap styles, waiting exclusion, restored paths and state-dependent control descriptions.');

// Location requests must fetch a fresh fix even when a marker already exists.
run(`navigator.geolocation={watchPosition(fn){this.watch=fn;return 1},clearWatch(){},getCurrentPosition(fn){this.once=fn;this.requests=(this.requests||0)+1}};begin()`);
fix(1,.03);
run("$('#locateBtn').onclick()");assert.equal(run('navigator.geolocation.requests'),1);
clock+=1000;run('navigator.geolocation.once({coords:{latitude:0,longitude:.03,accuracy:5},timestamp:Date.now()})');
clock+=16000;run('checkGps()');assert.equal(run('navigator.geolocation.requests'),2);
const frozen=run('distanceKm');run('pause()');clock+=1000;run('navigator.geolocation.once({coords:{latitude:0,longitude:.031,accuracy:5},timestamp:Date.now()})');assert.equal(run('distanceKm'),frozen);
run('begin()');clock+=1000;run('notePosition({coords:{latitude:0,longitude:0,accuracy:5},timestamp:Date.now()})');const received=run('receivedAt');clock+=16000;run('notePosition({coords:{latitude:0,longitude:0,accuracy:5},timestamp:Date.now()-16000})');assert.equal(run('receivedAt'),received);
console.log('OK: fresh locate requests, silent GPS fallback, stale fix rejection, late paused callbacks ignored.');

const staleKm=run('distanceKm');
run('acceptPosition({coords:{latitude:0,longitude:.08,accuracy:5},timestamp:Date.now()-90000})');
assert.equal(run('distanceKm'),staleKm);assert.match(run("$('#gpsInfo').textContent"),/90 segundos/);
assert.match(run('positionIssue({coords:{latitude:0,longitude:0,accuracy:5},timestamp:Date.now()+100000})'),/hora/);
assert.match(run('positionIssue({coords:{latitude:0,longitude:0,accuracy:null},timestamp:Date.now()})'),/precisión/);
assert.match(run('positionIssue({coords:{latitude:NaN,longitude:0,accuracy:5},timestamp:Date.now()})'),/coordenadas/);
run('pause();seekCurrentPosition()');assert.notEqual(run('locateWatch'),null);
run('navigator.geolocation.watch({coords:{latitude:0,longitude:0,accuracy:5},timestamp:Date.now()})');assert.equal(run('locateWatch'),null);
run('seekCurrentPosition();begin()');assert.equal(run('locateWatch'),null);
console.log('OK: stale fixes never billed, specific diagnostics, temporary watch recovery and cleanup.');

run('pause();begin()');
for(const scale of [1,1/1000,1000,1000000]){
  const normalized=run(`normalizePosition({coords:{latitude:0,longitude:0,accuracy:5},timestamp:Date.now()*${scale}})`);
  assert.ok(Math.abs(normalized.timestamp-clock)<1);
  ctx.normalized=normalized;assert.equal(run('validPosition(normalized)'),true);
  ctx.oldFix=run(`normalizePosition({coords:{latitude:0,longitude:0,accuracy:5},timestamp:(Date.now()-90000)*${scale}})`);
  assert.equal(run('validPosition(oldFix)'),false);
}
run('acceptPosition(normalizePosition({coords:{latitude:0,longitude:0,accuracy:5},timestamp:Date.now()/1000}))');
clock+=10000;run('acceptPosition(normalizePosition({coords:{latitude:0,longitude:.001,accuracy:5},timestamp:Date.now()/1000}))');
assert.ok(run('distanceKm')>.11);assert.equal(run('trip.timestampAdjusted'),true);
const clockDistance=run('distanceKm');
run('acceptPosition(normalizePosition({coords:{latitude:0,longitude:.001,accuracy:5},timestamp:Date.now()/1000}))');assert.equal(run('distanceKm'),clockDistance);
run('acceptPosition(normalizePosition({coords:{latitude:0,longitude:.1,accuracy:5},timestamp:(Date.now()-90000)/1000}))');assert.equal(run('distanceKm'),clockDistance);
assert.equal(run('validPosition(normalizePosition({coords:{latitude:0,longitude:0,accuracy:5},timestamp:12345}))'),false);
console.log('OK: GPS clock units, stale data remains stale, live seconds accrue distance, duplicate timestamps do not.');

assert.equal(fs.readFileSync(new URL('app-compat.js',import.meta.url),'utf8'),fs.readFileSync(new URL('app.js',import.meta.url),'utf8'));
assert.ok(!fs.readFileSync(new URL('app.js',import.meta.url),'utf8').includes("addEventListener('beforeunload'"));
assert.ok(!fs.readFileSync(new URL('app.js',import.meta.url),'utf8').includes("addEventListener('pagehide'"));
console.log('OK: compatible and main engines match; no reload-blocking teardown handlers.');

// Regression: the Tesla diagnostic reported a non-calendar counter 19562025000.
for(const increment of [1,1000,1000000,1000000000]){
  run('reset();begin()');
  for(let i=0;i<4;i++){
    clock+=1000;ctx.counterFix={coords:{latitude:0,longitude:i*.0001,accuracy:1.4},timestamp:19562025000+i*increment};
    run('acceptPosition(normalizePosition(counterFix))');
    if(i<3)assert.equal(run('distanceKm'),0);
  }
  assert.ok(run('distanceKm')>.01);assert.equal(run('trip.relativeClock'),true);
  const km=run('distanceKm');clock+=1000;run('acceptPosition(normalizePosition(counterFix))');assert.equal(run('distanceKm'),km);
  clock+=31000;ctx.counterFix.timestamp+=32*increment;run('acceptPosition(normalizePosition(counterFix))');assert.equal(run('distanceKm'),km);assert.equal(run('deviceClock.scale'),null);
}
run('reset();begin()');
for(let i=0;i<4;i++){clock+=1000;run('acceptPosition(normalizePosition({coords:{latitude:0,longitude:0,accuracy:1.4},timestamp:19562025000}))')}
assert.equal(run('distanceKm'),0);assert.equal(run('deviceClock.scale'),null);
for(let i=0;i<4;i++){clock+=1000;run('acceptPosition(normalizePosition({coords:{latitude:0,longitude:0,accuracy:1.4},timestamp:Date.now()-86400000}))')}
assert.equal(run('distanceKm'),0);
run('pause()');assert.equal(run('deviceClock'),null);
console.log('OK: Tesla counter cadence calibration, repeated/frozen values, long outages and stale epoch safeguards.');

run('reset();begin()');let rawCounter=19562025000,longitude=0;
function counterStep(ms,arrival=ms){clock+=arrival;rawCounter+=ms*1000;longitude+=.00005;ctx.packet={coords:{latitude:0,longitude,accuracy:1.4},timestamp:rawCounter};run('acceptPosition(normalizePosition(packet))')}
for(let i=0;i<4;i++)counterStep(1000);
let runningKm=run('distanceKm');const lineCount=run('segments.length');
for(let i=0;i<12;i++){counterStep(200);assert.ok(run('distanceKm')>=runningKm);runningKm=run('distanceKm');assert.equal(run('segments.length'),lineCount);assert.ok(run('deviceClock.scale'))}
clock+=2000;for(let i=0;i<10;i++){counterStep(200,0);assert.ok(run('distanceKm')>=runningKm);runningKm=run('distanceKm');assert.equal(run('segments.length'),lineCount)}
ctx.latePacket={coords:{latitude:0,longitude:0,accuracy:1.4},timestamp:rawCounter-1000000};run('acceptPosition(normalizePosition(latePacket))');assert.equal(run('distanceKm'),runningKm);assert.equal(run('segments.length'),lineCount);
counterStep(31000);assert.equal(run('distanceKm'),runningKm);for(let i=0;i<4;i++)counterStep(1000);assert.ok(run('distanceKm')>=runningKm);
run('checkpoint()');const activeBefore=storage.get('voltfare.active.v2');storage.set('voltFareTariff','preserved');const historyBefore=storage.get('voltfare.pages.trips.v1');blocked=true;await assert.rejects(()=>run('clearTripHistory()'),/No se ha podido borrar/);assert.equal(storage.get('voltfare.pages.trips.v1'),historyBefore);blocked=false;await run('clearTripHistory()');assert.equal(run('readTrips().length'),0);assert.equal(storage.get('voltfare.active.v2'),activeBefore);assert.equal(storage.get('voltFareTariff'),'preserved');assert.ok(run('distanceKm')>=runningKm);
console.log('OK: high-frequency/batched GPS preserves continuous route; gaps never decrease km; clear history preserves active trip/settings and handles failures.');
