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
