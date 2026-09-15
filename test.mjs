import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const storage=new Map();let blocked=false;
const makeNode=()=>({textContent:'',innerHTML:'',value:'',open:false,disabled:false,hidden:false,classList:{add(){},remove(){},toggle(){}},addEventListener(){},append(){},showModal(){this.open=true},close(){this.open=false}});
const nodes=new Map();
function environment(){
  const context={
    document:{querySelector(s){if(!nodes.has(s))nodes.set(s,makeNode());return nodes.get(s)},querySelectorAll(){return []},createElement:makeNode},
    window:{addEventListener(){},print(){}},navigator:{},
    localStorage:{getItem:k=>storage.get(k)??null,setItem(k,v){if(blocked)throw Error('Quota');storage.set(k,v)}},
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
