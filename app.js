const $=s=>document.querySelector(s), fmt=n=>n.toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2}),money=n=>fmt(n)+' €';
const defaults={base:3.5,perKm:1.35,perMin:.28,extra:0,minimum:0,countTime:true,issuer:'',plate:''};
let tariff={...defaults};
try{Object.assign(tariff,JSON.parse(localStorage.getItem('voltFareTariff')||'{}'))}catch{}
for(const k of ['base','perKm','perMin','extra','minimum'])if(!Number.isFinite(tariff[k])||tariff[k]<0||tariff[k]>10000)tariff[k]=defaults[k];
let state='idle', trip=null, elapsed=0, distanceKm=0, startAt=0, lastPos=null, watchId=null, timer=null, speed=null, generation=0, goodAt=0, saving=false, pending=null;
let map=null, marker=null, route=null, segments=[], selected=null, historyOffset=0;
function notify(msg){$('#toast').textContent=msg;$('#toast').classList.add('show');clearTimeout(notify.timer);notify.timer=setTimeout(()=>$('#toast').classList.remove('show'),6000)}
function esc(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function calc(km,ms,r){const c=n=>Math.round(n*100),base=c(r.base),distance=c(km*r.perKm),time=c(r.countTime?ms/60000*r.perMin:0),extra=c(r.extra),sub=base+distance+time+extra,adjustment=Math.max(0,c(r.minimum)-sub);return {base,distance,time,extra,adjustment,total:sub+adjustment}}
function duration(ms){const s=Math.floor(ms/1000);return String(Math.floor(s/3600)).padStart(2,'0')+':'+String(Math.floor(s/60)%60).padStart(2,'0')+':'+String(s%60).padStart(2,'0')}
function render(){
  const r=trip?.tariff||tariff,t=trip?calc(distanceKm,elapsed,r):{base:0,distance:0,time:0,extra:0,adjustment:0,total:0};
  $('#amount').textContent=fmt(t.total/100);$('#distance').innerHTML=fmt(distanceKm)+' <small>km</small>';$('#duration').textContent=duration(elapsed);
  $('#speed').innerHTML=(speed===null?'—':Math.round(speed))+' <small>km/h</small>';
  for(const [id,key] of [['baseLine','base'],['kmLine','distance'],['timeLine','time'],['extraLine','extra'],['minLine','adjustment'],['totalLine','total']])$('#'+id).textContent=money(t[key]/100);
  $('#rateLabel').textContent=fmt(r.perKm)+' €/km · '+(r.countTime?fmt(r.perMin)+' €/min':'Tiempo sin cargo')+' · Mínimo '+money(r.minimum);
  $('#mainBtn').textContent=state==='idle'?'Iniciar trayecto':state==='running'?'Pausar':'Reanudar';
  $('#mainBtn').disabled=saving||!!pending;$('#finishBtn').disabled=!trip||saving;
  $('#finishBtn').textContent=saving?'Guardando…':pending?'Reintentar guardado':'Finalizar';
  $('#settingsBtn').disabled=!!trip;
  $('#dot').classList.toggle('live',state==='running'&&Date.now()-goodAt<15000);
  $('#statusText').textContent=state==='idle'?'Listo para iniciar':state==='paused'?'Trayecto en pausa':Date.now()-goodAt<15000?'GPS activo':'Esperando GPS';
}
try{
  if(!window.L)throw Error();
  map=L.map('map').setView([41.808,2.744],10);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).on('tileerror',()=>{$('#gpsInfo').textContent='Mapa sin conexión. El cálculo GPS sigue disponible.'}).addTo(map);
  route=L.polyline([],{color:'#0ba77d',weight:5}).addTo(map);
}catch{$('#map').textContent='No se pudo cargar el mapa. Comprueba tu conexión; el estimador sigue disponible.'}
function showPosition(c){if(!map)return;const p=[c.latitude,c.longitude];if(!marker)marker=L.circleMarker(p,{radius:8,color:'#fff',weight:3,fillColor:'#14896a',fillOpacity:1}).addTo(map);else marker.setLatLng(p);if(!map.getBounds().contains(p)||!goodAt)map.setView(p,15)}
function haversine(a,b){const rad=x=>x*Math.PI/180,lat=rad(b.latitude-a.latitude),lon=rad(b.longitude-a.longitude),h=Math.sin(lat/2)**2+Math.cos(rad(a.latitude))*Math.cos(rad(b.latitude))*Math.sin(lon/2)**2;return 12742*Math.asin(Math.min(1,Math.sqrt(h)))}
function stopGps(){generation++;if(watchId!==null&&navigator.geolocation)navigator.geolocation.clearWatch(watchId);watchId=null;lastPos=null;speed=null}
function startGps(){
  stopGps();const g=generation;
  if(!navigator.geolocation){trip.gpsIncomplete=true;$('#gpsInfo').textContent='Este navegador no ofrece ubicación. No se medirán kilómetros.';return}
  watchId=navigator.geolocation.watchPosition(p=>{
    if(g!==generation||state!=='running')return;
    const c=p.coords;
    if(!Number.isFinite(c.latitude)||!Number.isFinite(c.longitude)||!Number.isFinite(c.accuracy)||c.accuracy>50||Date.now()-p.timestamp>15000){
      trip.gpsIncomplete=true;lastPos=null;speed=null;$('#gpsInfo').textContent='Señal imprecisa. Distancia suspendida hasta recuperar GPS.';return;
    }
    const n={latitude:c.latitude,longitude:c.longitude,accuracy:c.accuracy,timestamp:p.timestamp};
    showPosition(c);goodAt=Date.now();speed=Number.isFinite(c.speed)?Math.max(0,c.speed*3.6):null;
    if(lastPos){
      const dt=(n.timestamp-lastPos.timestamp)/1000,d=haversine(lastPos,n);
      if(dt<=0)return;
      if(dt>30||d/dt*3600>220){trip.gpsIncomplete=true;lastPos=null;segments.push([])}
      else if(d*1000>=Math.max(5,(c.accuracy+lastPos.accuracy)*.3)){distanceKm+=d;lastPos=n;segments[segments.length-1].push([c.latitude,c.longitude])}
    }
    if(!lastPos){lastPos=n;if(!segments.length)segments.push([]);segments[segments.length-1].push([c.latitude,c.longitude])}
    route?.setLatLngs(segments);
    $('#gpsInfo').textContent='GPS ±'+Math.round(c.accuracy)+' m'+(trip.gpsIncomplete?' · Hay tramos sin medición':'');
    render();
  },e=>{if(g!==generation)return;trip.gpsIncomplete=true;lastPos=null;speed=null;$('#gpsInfo').textContent=e.code===1?'Ubicación denegada. Activa el permiso del navegador.':'Sin señal GPS. El tiempo continúa; la distancia no se estima.';render()},{enableHighAccuracy:true,maximumAge:0,timeout:15000});
}
function begin(){
  if(pending||saving)return;
  if(!trip){trip={id:crypto.randomUUID(),started:new Date().toISOString(),tariff:{...tariff},gpsIncomplete:false};elapsed=0;distanceKm=0;segments=[[]];route?.setLatLngs([])}
  else segments.push([]);
  state='running';startAt=Date.now()-elapsed;goodAt=0;startGps();
  timer=setInterval(()=>{elapsed=Date.now()-startAt;if(Date.now()-goodAt>15000){speed=null;trip.gpsIncomplete=true;$('#gpsInfo').textContent='Esperando señal GPS. El tiempo continúa.'}render()},500);render();
}
function pause(){if(state==='running')elapsed=Date.now()-startAt;clearInterval(timer);stopGps();state='paused';render()}
function reset(){clearInterval(timer);stopGps();state='idle';trip=null;pending=null;elapsed=0;distanceKm=0;render()}
// Local-only GitHub Pages edition. No trip data is sent to a backend.
const HISTORY_KEY='voltfare.pages.trips.v1';
function readTrips(){
  let raw;
  try{raw=localStorage.getItem(HISTORY_KEY)}catch{throw Error('El navegador bloquea el almacenamiento local. Permítelo y vuelve a intentarlo.')}
  if(raw===null)return [];
  try{
    const trips=JSON.parse(raw);
    if(!Array.isArray(trips)||!trips.every(t=>t&&typeof t.id==='string'&&Number.isFinite(t.km)&&Number.isFinite(t.elapsed)&&t.tariff&&t.totals&&Number.isFinite(t.totals.total)&&Number.isFinite(Date.parse(t.started))&&Number.isFinite(Date.parse(t.ended))))throw Error();
    return trips;
  }catch{throw Error('El historial local no se puede leer. No se ha sobrescrito: conserva los datos del navegador para recuperarlo.')}
}
async function saveTrip(t){
  const write=()=>{
    const trips=readTrips(),existing=trips.find(r=>r.id===t.id);
    if(existing)return existing;
    const complete={...t,tariff:{...t.tariff},totals:calc(t.km,t.elapsed,t.tariff)};
    try{localStorage.setItem(HISTORY_KEY,JSON.stringify([complete,...trips]))}
    catch{throw Error('No hay espacio o el navegador bloquea el guardado. El viaje sigue pendiente; no cierres la página.')}
    return complete;
  };
  return navigator.locks?.request? navigator.locks.request(HISTORY_KEY,write):write();
}
function localHistory(offset){const trips=readTrips().sort((a,b)=>b.ended.localeCompare(a.ended)||b.id.localeCompare(a.id));return {trips:trips.slice(offset,offset+30),more:trips.length>offset+30}}
async function finish(){
  if(!trip||saving)return;
  if(!pending){pause();if(!confirm('¿Finalizar y guardar este trayecto?'))return;pending={...trip,ended:new Date().toISOString(),elapsed,km:distanceKm}}
  saving=true;render();
  try{const saved=await saveTrip(pending);reset();showReceipt(saved);notify('Trayecto y recibo guardados en este navegador')}
  catch(e){notify(e.message);$('#gpsInfo').textContent='Guardado pendiente. Pulsa «Reintentar guardado»; no cierres esta página.'}
  finally{saving=false;render()}
}
$('#mainBtn').onclick=()=>state==='running'?pause():begin();$('#finishBtn').onclick=finish;
$('#locateBtn').onclick=()=>{if(marker){map.setView(marker.getLatLng(),15);return}if(!navigator.geolocation){notify('Ubicación no disponible');return}navigator.geolocation.getCurrentPosition(p=>{showPosition(p.coords);map?.setView([p.coords.latitude,p.coords.longitude],15);$('#gpsInfo').textContent='Ubicación recibida · ±'+Math.round(p.coords.accuracy)+' m'},()=>notify('No se pudo obtener ubicación. Revisa los permisos.'),{enableHighAccuracy:true,timeout:12000})};
$('#settingsBtn').onclick=()=>{for(const k of ['base','perKm','perMin','extra','minimum','issuer','plate'])$('#'+k).value=tariff[k]??'';$('#countTime').checked=tariff.countTime;$('#settings').showModal()};
for(const b of document.querySelectorAll('[data-close]'))b.onclick=()=>$('#'+b.dataset.close).close();
for(const k of ['base','perKm','perMin','extra'])$('#'+k).max=10000;
$('#settingsForm').addEventListener('submit',e=>{e.preventDefault();for(const k of ['base','perKm','perMin','extra','minimum'])tariff[k]=Number($('#'+k).value);tariff.countTime=$('#countTime').checked;tariff.issuer=$('#issuer').value.trim();tariff.plate=$('#plate').value.trim();try{localStorage.setItem('voltFareTariff',JSON.stringify(tariff))}catch{notify('Tarifa aplicada. El navegador no permite recordar preferencias.')}$('#settings').close();render()});
async function loadHistory(more=false){
  if(!more){historyOffset=0;$('#historyList').textContent='Cargando…';$('#moreBtn').hidden=true}
  try{
    const data=localHistory(historyOffset);
    if(!more)$('#historyList').textContent='';
    if(!data.trips.length&&!more)$('#historyList').textContent='Aún no hay trayectos. Al finalizar el primero aparecerá aquí su recibo.';
    for(const t of data.trips){const div=document.createElement('div');div.className='trip-row';div.innerHTML='<div><strong>'+esc(new Date(t.started).toLocaleString('es-ES'))+'</strong><small>'+fmt(t.km)+' km · '+duration(t.elapsed)+' · '+money(t.totals.total/100)+'</small></div>';const b=document.createElement('button');b.className='gear';b.textContent='Ver recibo';b.onclick=()=>showReceipt(t);div.append(b);$('#historyList').append(div)}
    historyOffset+=data.trips.length;$('#moreBtn').hidden=!data.more;
  }catch(e){if(!more){$('#historyList').textContent=e.message;const b=document.createElement('button');b.textContent='Reintentar';b.className='gear';b.onclick=()=>loadHistory();$('#historyList').append(b)}else notify(e.message)}
}
$('#historyBtn').onclick=()=>{$('#history').showModal();loadHistory()};
$('#moreBtn').onclick=async()=>{$('#moreBtn').disabled=true;await loadHistory(true);$('#moreBtn').disabled=false};
function receiptHTML(t){
  const rows=[['Inicio',t.totals.base],['Distancia · '+fmt(t.km)+' km × '+money(t.tariff.perKm)+'/km',t.totals.distance],['Tiempo · '+duration(t.elapsed)+(t.tariff.countTime?' × '+money(t.tariff.perMin)+'/min':' sin cargo'),t.totals.time],['Suplementos',t.totals.extra],['Ajuste al mínimo de '+money(t.tariff.minimum),t.totals.adjustment],['Total estimado',t.totals.total]];
  return '<h1>VoltFare · Recibo de trayecto</h1><p>Referencia: '+esc(t.id)+'</p>'+(t.tariff.issuer?'<p><strong>'+esc(t.tariff.issuer)+'</strong></p>':'')+(t.tariff.plate?'<p>Matrícula: '+esc(t.tariff.plate)+'</p>':'')+'<p>Inicio: '+esc(new Date(t.started).toLocaleString('es-ES'))+'<br>Fin: '+esc(new Date(t.ended).toLocaleString('es-ES'))+'</p><table>'+rows.map(([a,b])=>'<tr><td>'+esc(a)+'</td><td>'+money(b/100)+'</td></tr>').join('')+'</table>'+(t.gpsIncomplete?'<p>Medición incompleta: hubo tramos sin señal GPS fiable. La distancia y el importe pueden estar infravalorados.</p>':'')+'<p>Resumen orientativo del trayecto. No acredita el pago y no sustituye una factura. VoltFare no es un taxímetro homologado.</p>';
}
function showReceipt(t){selected=t;$('#receiptBody').innerHTML=receiptHTML(t);if(!$('#receipt').open)$('#receipt').showModal()}
$('#printBtn').onclick=()=>window.print();
$('#downloadBtn').onclick=()=>{if(!selected)return;const html='<!doctype html><html lang="es"><meta charset="utf-8"><title>Recibo VoltFare</title><style>body{font:16px system-ui;max-width:720px;margin:40px auto;padding:20px;line-height:1.6}table{width:100%;border-collapse:collapse}td{padding:10px;border-bottom:1px solid #ddd}td:last-child{text-align:right}p{overflow-wrap:anywhere}@media print{body{margin:0}}</style>'+receiptHTML(selected)+'</html>';const url=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='VoltFare-'+selected.id+'.html';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000)};
window.addEventListener('beforeunload',e=>{if(trip){e.preventDefault();e.returnValue=''}});
render();
