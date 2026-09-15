const $=s=>document.querySelector(s), fmt=n=>n.toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2}),money=n=>fmt(n)+' €';
const defaults={base:3.5,perKm:1.35,perMin:.28,waitRate:.28,extra:0,minimum:0,countTime:true,issuer:'',plate:''};
let tariff={...defaults};
try{Object.assign(tariff,JSON.parse(localStorage.getItem('voltFareTariff')||'{}'))}catch{}
for(const k of ['base','perKm','perMin','waitRate','extra','minimum'])if(!Number.isFinite(tariff[k])||tariff[k]<0||tariff[k]>10000)tariff[k]=defaults[k];
let state='idle', trip=null, elapsed=0, distanceKm=0, lastPos=null, watchId=null, timer=null, speed=null, generation=0, goodAt=0, saving=false, pending=null;
let map=null, marker=null, route=null, segments=[], estimatedSegments=[], estimatedRoute=null, followPosition=true, selected=null, historyOffset=0;
function notify(msg){$('#toast').textContent=msg;$('#toast').classList.add('show');clearTimeout(notify.timer);notify.timer=setTimeout(()=>$('#toast').classList.remove('show'),6000)}
function esc(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function calc(km,ms,r,waitMs=0){const c=n=>Math.round(n*100),base=c(r.base),distance=c(km*r.perKm),time=c((r.countTime?Math.max(0,ms-waitMs)/60000*r.perMin:0)+waitMs/60000*(r.waitRate??0)),extra=c(r.extra),sub=base+distance+time+extra,adjustment=Math.max(0,c(r.minimum)-sub);return {base,distance,time,extra,adjustment,total:sub+adjustment}}
function duration(ms){const s=Math.floor(ms/1000);return String(Math.floor(s/3600)).padStart(2,'0')+':'+String(Math.floor(s/60)%60).padStart(2,'0')+':'+String(s%60).padStart(2,'0')}
function render(){
  const r=trip?.tariff||tariff,t=trip?calc(distanceKm,elapsed,r,trip.waitMs):{base:0,distance:0,time:0,extra:0,adjustment:0,total:0};
  $('#amount').textContent=fmt(t.total/100);$('#distance').innerHTML=fmt(distanceKm)+' <small>km</small>';$('#duration').textContent=duration(elapsed);
  $('#speed').innerHTML=(speed===null?'—':Math.round(speed))+' <small>km/h</small>';
  for(const [id,key] of [['baseLine','base'],['kmLine','distance'],['timeLine','time'],['extraLine','extra'],['minLine','adjustment'],['totalLine','total']])$('#'+id).textContent=money(t[key]/100);
  $('#rateLabel').textContent=fmt(r.perKm)+' €/km · '+(r.countTime?fmt(r.perMin)+' €/min':'Tiempo sin cargo')+' · Mínimo '+money(r.minimum);
  $('#mainBtn').textContent=state==='idle'?'Empezar viaje':state==='running'?'Pausar sin cobrar':'Continuar viaje';
  $('#mainBtn').disabled=saving||!!pending;$('#finishBtn').disabled=!trip||saving;
  $('#finishBtn').textContent=saving?'Guardando…':pending?'Reintentar guardado':'Terminar y guardar';
  $('#settingsBtn').disabled=!!trip;
  $('#waitBtn').disabled=state!=='running'||!!pending;$('#waitBtn').textContent=waiting?'Volver al viaje':'Cobrar espera';
  $('#adjustBtn').disabled=!trip||state!=='paused'||!!pending;
  $('#mainHelp').textContent=state==='idle'?'Empieza a sumar kilómetros e importe.':state==='running'?'Detiene el tiempo y los kilómetros. Podrás continuar después.':'Vuelve a sumar tiempo y kilómetros desde ahora.';
  $('#finishHelp').textContent=pending?'Vuelve a intentar guardar este viaje sin duplicarlo.':'Finaliza el viaje, lo guarda y abre su recibo.';
  $('#waitControl').hidden=state!=='running';$('#extraControls').hidden=!trip;
  $('#waitHelp').textContent=waiting?'Deja de cobrar espera y vuelve a medir el recorrido.':'Cobra '+money(r.waitRate||0)+'/min de espera. No suma kilómetros ni la tarifa normal por minuto.';
  $('#settingsHelp').textContent=trip?'Los precios quedan fijos durante este viaje.':'Elige lo que cobrarás antes de empezar.';
  $('#adjustHelp').textContent=state==='paused'?'Introduce los kilómetros TOTALES del viaje. Sustituyen la distancia actual.':'Pulsa «Pausar sin cobrar» para poder corregir la distancia.';
  $('#journeyHelp').textContent=pending?'El viaje ha terminado, pero falta guardarlo. Pulsa «Reintentar guardado».':state==='idle'?'Revisa los precios y pulsa «Empezar viaje» al salir.':state==='paused'?'En pausa: no se suman tiempo ni kilómetros. Puedes continuar o terminar.':waiting?'En espera: se cobra '+money(r.waitRate||0)+' por minuto. Pulsa «Volver al viaje» antes de circular.':'Viaje en marcha. Al llegar, pulsa «Terminar y guardar».';
  $('#routeBtn').disabled=!map||!segments.some(s=>s.length);

  $('#qualityInfo').textContent=trip?'GPS: '+fmt(trip.measuredKm||0)+' km · Estimados: '+fmt(trip.estimatedKm||0)+' km'+(trip.manual?' · Total ajustado manualmente':'')+(trip.gpsIncomplete?' · Revisar medición':''):'';
  $('#connectionInfo').textContent=(navigator.onLine===false?'Sin internet':'Conexión disponible')+' · '+offlineStatus;
  $('#dot').classList.toggle('live',state==='running'&&Date.now()-goodAt<15000);
  $('#statusText').textContent=state==='idle'?'Listo para iniciar':state==='paused'?'Trayecto en pausa':Date.now()-goodAt<15000?'GPS activo':'Esperando GPS';
}
try{
  if(!window.L)throw Error();
  map=L.map('map').setView([41.808,2.744],10);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).on('tileerror',()=>{$('#gpsInfo').textContent='Mapa sin conexión. El cálculo GPS sigue disponible.'}).addTo(map);
  route=L.polyline([],{color:'#0ba77d',weight:5}).addTo(map);
  estimatedRoute=L.polyline([],{color:'#e9a43b',weight:4,dashArray:'8 8'}).addTo(map);
  map.on('dragstart',()=>{followPosition=false});
}catch{$('#map').textContent='No se pudo cargar el mapa. Comprueba tu conexión; el estimador sigue disponible.'}
function showPosition(c){if(!map)return;const p=[c.latitude,c.longitude];if(!marker)marker=L.circleMarker(p,{radius:8,color:'#fff',weight:3,fillColor:'#14896a',fillOpacity:1}).addTo(map);else marker.setLatLng(p);if(followPosition&&(!map.getBounds().contains(p)||!goodAt))map.setView(p,15)}
function haversine(a,b){const rad=x=>x*Math.PI/180,lat=rad(b.latitude-a.latitude),lon=rad(b.longitude-a.longitude),h=Math.sin(lat/2)**2+Math.cos(rad(a.latitude))*Math.cos(rad(b.latitude))*Math.sin(lon/2)**2;return 12742*Math.asin(Math.min(1,Math.sqrt(h)))}
let lastFix=null,gap=false,waiting=false,lastTick=0;
let offlineStatus='Preparando uso sin conexión';
const ACTIVE_KEY='voltfare.active.v2';
function checkpoint(){
  if(!trip)return;
  try{localStorage.setItem(ACTIVE_KEY,JSON.stringify({trip,elapsed,distanceKm,pending,segments,estimatedSegments,savedAt:Date.now()}))}
  catch{offlineStatus='No se puede guardar el viaje en curso';notify('No se puede guardar el viaje en curso. No cierres esta pestaña.')}
}
function tick(){
  if(state!=='running')return;
  const now=Date.now(),delta=Math.max(0,now-lastTick);lastTick=now;elapsed+=delta;
  if(waiting)trip.waitMs+=delta;
}
function stopGps(){generation++;if(watchId!==null&&navigator.geolocation)navigator.geolocation.clearWatch(watchId);watchId=null;lastPos=null;lastFix=null;gap=false;speed=null}
function loseGps(message){gap=true;trip.gpsIncomplete=true;speed=null;$('#gpsInfo').textContent=message}
function acceptPosition(p){
  const c=p.coords,now=Date.now();
  if(!Number.isFinite(c.latitude)||Math.abs(c.latitude)>90||!Number.isFinite(c.longitude)||Math.abs(c.longitude)>180||!Number.isFinite(c.accuracy)||c.accuracy<0||c.accuracy>50||!Number.isFinite(p.timestamp)||now-p.timestamp>15000||p.timestamp>now+1000){loseGps('Señal imprecisa. Kilómetros pendientes de recuperar.');return}
  const n={latitude:c.latitude,longitude:c.longitude,accuracy:c.accuracy,timestamp:p.timestamp};
  if(lastFix&&n.timestamp<=lastFix.timestamp)return;
  const outage=lastFix?(n.timestamp-lastFix.timestamp)/1000:0;
  if(lastPos&&!waiting){
    const dt=(n.timestamp-lastPos.timestamp)/1000,d=haversine(lastPos,n),threshold=Math.max(5,(c.accuracy+lastPos.accuracy)*.3)/1000;
    const missing=gap||outage>15;
    if(d/dt*3600>180){loseGps('Salto GPS descartado. Esperando una posición coherente.');return}
    if(missing){
      trip.gpsIncomplete=true;
      if(outage<=60&&d<=2&&c.accuracy<=25&&lastPos.accuracy<=25&&d>=threshold){
        distanceKm+=d;trip.estimatedKm+=d;
        estimatedSegments.push([[lastPos.latitude,lastPos.longitude],[n.latitude,n.longitude]]);
      }
      segments.push([[n.latitude,n.longitude]]);lastPos=n;
    }else if(d>=threshold){distanceKm+=d;trip.measuredKm+=d;lastPos=n;segments[segments.length-1].push([n.latitude,n.longitude])}
  }
  if(!lastPos||waiting){lastPos=n;if(!segments.length)segments.push([]);if(!waiting)segments[segments.length-1].push([n.latitude,n.longitude])}
  lastFix=n;gap=false;showPosition(c);goodAt=now;speed=Number.isFinite(c.speed)?Math.max(0,c.speed*3.6):null;
  route?.setLatLngs(segments);estimatedRoute?.setLatLngs(estimatedSegments);
  $('#gpsInfo').textContent='GPS ±'+Math.round(c.accuracy)+' m'+(trip.gpsIncomplete?' · Revisa los kilómetros antes de finalizar':'');
  render();
}
function startGps(){
  stopGps();const g=generation;
  if(!navigator.geolocation){loseGps('Ubicación no disponible. Solo tiempo; puedes ajustar kilómetros al finalizar.');return}
  watchId=navigator.geolocation.watchPosition(p=>{
    if(g!==generation||state!=='running')return;acceptPosition(p);
  },e=>{if(g!==generation||state!=='running')return;loseGps(e.code===1?'Ubicación denegada. Activa el permiso del navegador.':'Sin GPS. El tiempo continúa según tarifa; distancia pendiente.');render()},{enableHighAccuracy:true,maximumAge:0,timeout:15000});
}
function begin(){
  if(pending||saving)return;
  if(!trip){
    if(!confirm('El tiempo comienza al iniciar. Si no hay GPS, no se medirán kilómetros hasta recibir señal. Podrás ajustarlos al finalizar. ¿Iniciar?'))return;
    trip={id:crypto.randomUUID(),started:new Date().toISOString(),tariff:{...tariff},gpsIncomplete:false,measuredKm:0,estimatedKm:0,waitMs:0};elapsed=0;distanceKm=0;segments=[[]];estimatedSegments=[];followPosition=true;route?.setLatLngs([]);estimatedRoute?.setLatLngs([])
  }else segments.push([]);
  state='running';waiting=false;lastTick=Date.now();goodAt=0;startGps();
  timer=setInterval(()=>{tick();if(Date.now()-goodAt>15000)loseGps('Esperando señal GPS. El tiempo continúa según tarifa.');checkpoint();render()},1000);checkpoint();render();
}
function pause(){tick();waiting=false;clearInterval(timer);stopGps();state='paused';checkpoint();render()}
function reset(){clearInterval(timer);stopGps();state='idle';trip=null;pending=null;elapsed=0;distanceKm=0;try{localStorage.removeItem(ACTIVE_KEY)}catch{}render()}
function recover(){
  try{
    const raw=localStorage.getItem(ACTIVE_KEY);if(!raw)return;
    const d=JSON.parse(raw);
    if(!d.trip||typeof d.trip.id!=='string'||!Number.isFinite(d.elapsed)||d.elapsed<0||!Number.isFinite(d.distanceKm)||d.distanceKm<0||!d.trip.tariff)throw Error();
    if(!['measuredKm','estimatedKm','waitMs'].every(k=>Number.isFinite(d.trip[k])&&d.trip[k]>=0)||d.trip.waitMs>d.elapsed||!['base','perKm','perMin','waitRate','extra','minimum'].every(k=>Number.isFinite(d.trip.tariff[k])&&d.trip.tariff[k]>=0))throw Error();
    if(readTrips().some(t=>t.id===d.trip.id)){localStorage.removeItem(ACTIVE_KEY);return}
    trip=d.trip;elapsed=d.elapsed;distanceKm=d.distanceKm;pending=d.pending||null;
    trip.gpsIncomplete=true;trip.recovered=true;state='paused';
    const validPath=a=>Array.isArray(a)&&a.every(s=>Array.isArray(s)&&s.every(p=>Array.isArray(p)&&p.length===2&&Number.isFinite(p[0])&&Math.abs(p[0])<=90&&Number.isFinite(p[1])&&Math.abs(p[1])<=180));
    segments=validPath(d.segments)?d.segments:[[]];estimatedSegments=validPath(d.estimatedSegments)?d.estimatedSegments:[];
    route?.setLatLngs(segments);estimatedRoute?.setLatLngs(estimatedSegments);
    if(map&&segments.some(s=>s.length))map.fitBounds(route.getBounds(),{padding:[24,24],maxZoom:16});
    notify('Viaje recuperado en pausa. El tiempo y la distancia mientras la página estuvo cerrada no se han añadido.');render();
  }catch{notify('No se pudo recuperar el viaje guardado. Sus datos no se han sobrescrito.')}
}
$('#waitBtn').onclick=()=>{if(state!=='running'||pending)return;tick();waiting=!waiting;lastPos=null;lastFix=null;gap=false;segments.push([]);checkpoint();render()};
$('#adjustBtn').onclick=()=>{if(!trip||state!=='paused'||pending)return;$('#manualKm').value=distanceKm.toFixed(3);$('#manualReason').value=trip.manual?.reason||'';$('#adjustment').showModal()};
$('#adjustForm').addEventListener('submit',e=>{
  e.preventDefault();if(!trip||state!=='paused'||pending)return;
  const km=Number($('#manualKm').value),reason=$('#manualReason').value.trim();
  if(!Number.isFinite(km)||km<0||km>100000||!reason)return;
  trip.manual={km,reason,previousKm:distanceKm,at:new Date().toISOString()};distanceKm=km;checkpoint();$('#adjustment').close();render();
});
window.addEventListener('pagehide',()=>{tick();checkpoint()});
window.addEventListener('online',render);window.addEventListener('offline',render);
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('./sw.js').then(()=>navigator.serviceWorker.ready).then(()=>{offlineStatus='Aplicación disponible sin internet';render()}).catch(()=>{offlineStatus='Apertura sin internet no disponible';render()});
}else offlineStatus='Este navegador no permite apertura sin internet';
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
    const complete={...t,tariff:{...t.tariff},totals:calc(t.km,t.elapsed,t.tariff,t.waitMs)};
    try{localStorage.setItem(HISTORY_KEY,JSON.stringify([complete,...trips]))}
    catch{throw Error('No hay espacio o el navegador bloquea el guardado. El viaje sigue pendiente; no cierres la página.')}
    return complete;
  };
  return navigator.locks?.request? navigator.locks.request(HISTORY_KEY,write):write();
}
function localHistory(offset){const trips=readTrips().sort((a,b)=>b.ended.localeCompare(a.ended)||b.id.localeCompare(a.id));return {trips:trips.slice(offset,offset+30),more:trips.length>offset+30}}
async function finish(){
  if(!trip||saving)return;
  if(!pending){pause();if(!confirm(trip.gpsIncomplete?'Hay cortes o estimaciones GPS. Si necesitas corregir kilómetros, cancela y pulsa «Corregir distancia total». ¿Guardar el importe mostrado?':'¿Finalizar y guardar este trayecto?'))return;pending={...trip,ended:new Date().toISOString(),elapsed,km:distanceKm};checkpoint()}
  saving=true;render();
  try{const saved=await saveTrip(pending);reset();showReceipt(saved);notify('Trayecto y recibo guardados en este navegador')}
  catch(e){notify(e.message);$('#gpsInfo').textContent='Guardado pendiente. Pulsa «Reintentar guardado»; no cierres esta página.'}
  finally{saving=false;render()}
}
$('#mainBtn').onclick=()=>state==='running'?pause():begin();$('#finishBtn').onclick=finish;
$('#routeBtn').onclick=()=>{if(!map||!segments.some(s=>s.length))return;followPosition=false;map.fitBounds(route.getBounds(),{padding:[24,24],maxZoom:16})};
$('#locateBtn').onclick=()=>{followPosition=true;if(marker){map.setView(marker.getLatLng(),15);return}if(!navigator.geolocation){notify('Ubicación no disponible');return}navigator.geolocation.getCurrentPosition(p=>{showPosition(p.coords);map?.setView([p.coords.latitude,p.coords.longitude],15);$('#gpsInfo').textContent='Ubicación recibida · ±'+Math.round(p.coords.accuracy)+' m'},()=>notify('No se pudo obtener ubicación. Revisa los permisos.'),{enableHighAccuracy:true,timeout:12000})};
$('#settingsBtn').onclick=()=>{for(const k of ['base','perKm','perMin','waitRate','extra','minimum','issuer','plate'])$('#'+k).value=tariff[k]??'';$('#countTime').checked=tariff.countTime;$('#settings').showModal()};
for(const b of document.querySelectorAll('[data-close]'))b.onclick=()=>$('#'+b.dataset.close).close();
for(const k of ['base','perKm','perMin','waitRate','extra'])$('#'+k).max=10000;
$('#settingsForm').addEventListener('submit',e=>{e.preventDefault();for(const k of ['base','perKm','perMin','waitRate','extra','minimum'])tariff[k]=Number($('#'+k).value);tariff.countTime=$('#countTime').checked;tariff.issuer=$('#issuer').value.trim();tariff.plate=$('#plate').value.trim();try{localStorage.setItem('voltFareTariff',JSON.stringify(tariff))}catch{notify('Tarifa aplicada. El navegador no permite recordar preferencias.')}$('#settings').close();render()});
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
  const rows=[['Inicio',t.totals.base],['Distancia · '+fmt(t.km)+' km × '+money(t.tariff.perKm)+'/km',t.totals.distance],['Tiempo · '+duration(t.elapsed)+' (espera: '+duration(t.waitMs||0)+') · viaje '+(t.tariff.countTime?money(t.tariff.perMin)+'/min':'sin cargo')+' · espera '+money(t.tariff.waitRate||0)+'/min',t.totals.time],['Suplementos',t.totals.extra],['Ajuste al mínimo de '+money(t.tariff.minimum),t.totals.adjustment],['Total estimado',t.totals.total]];
  return '<h1>VoltFare · Recibo de trayecto</h1><p>Referencia: '+esc(t.id)+'</p>'+(t.tariff.issuer?'<p><strong>'+esc(t.tariff.issuer)+'</strong></p>':'')+(t.tariff.plate?'<p>Matrícula: '+esc(t.tariff.plate)+'</p>':'')+'<p>Inicio: '+esc(new Date(t.started).toLocaleString('es-ES'))+'<br>Fin: '+esc(new Date(t.ended).toLocaleString('es-ES'))+'</p><table>'+rows.map(([a,b])=>'<tr><td>'+esc(a)+'</td><td>'+money(b/100)+'</td></tr>').join('')+'</table>'+(t.measuredKm!==undefined?'<p>Distancia GPS: '+fmt(t.measuredKm)+' km. Distancia estimada en cortes breves: '+fmt(t.estimatedKm||0)+' km.</p>':'')+(t.manual?'<p>Ajuste manual del total a '+fmt(t.manual.km)+' km (antes: '+fmt(t.manual.previousKm)+' km). Motivo: '+esc(t.manual.reason)+'. Total facturable de distancia: '+fmt(t.km)+' km.</p>':'')+(t.gpsIncomplete?'<p>Hubo señal GPS incompleta. Las estimaciones usan líneas rectas y pueden omitir curvas o desvíos. Revisa la distancia y cualquier ajuste manual.</p>':'')+(t.recovered?'<p>Viaje recuperado: el intervalo con la página cerrada no está incluido en el tiempo.</p>':'')+'<p>Resumen orientativo del trayecto. No acredita el pago y no sustituye una factura. VoltFare no es un taxímetro homologado.</p>';
}
function showReceipt(t){selected=t;$('#receiptBody').innerHTML=receiptHTML(t);if(!$('#receipt').open)$('#receipt').showModal()}
$('#printBtn').onclick=()=>window.print();
$('#downloadBtn').onclick=()=>{if(!selected)return;const html='<!doctype html><html lang="es"><meta charset="utf-8"><title>Recibo VoltFare</title><style>body{font:16px system-ui;max-width:720px;margin:40px auto;padding:20px;line-height:1.6}table{width:100%;border-collapse:collapse}td{padding:10px;border-bottom:1px solid #ddd}td:last-child{text-align:right}p{overflow-wrap:anywhere}@media print{body{margin:0}}</style>'+receiptHTML(selected)+'</html>';const url=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='VoltFare-'+selected.id+'.html';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000)};
window.addEventListener('beforeunload',e=>{if(trip){e.preventDefault();e.returnValue=''}});
render();
recover();

