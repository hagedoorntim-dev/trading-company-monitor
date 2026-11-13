(() => {
 const $=id=>document.getElementById(id), local=['127.0.0.1','localhost'].includes(location.hostname);
 if(!local)return;
 const fmt=(x,n=2)=>Number.isFinite(x)?x.toLocaleString('nl-NL',{minimumFractionDigits:n,maximumFractionDigits:n}):'—';
 const date=x=>x?new Date(x).toLocaleString('nl-NL',{timeZone:'Europe/Amsterdam'}):'—';
 const put=(id,s)=>{$(id).textContent=s};
 async function refresh(){
  try{
   const [r,l]=await Promise.all([fetch('/api/m1/status',{cache:'no-store'}),fetch('/api/m1/signals',{cache:'no-store'})]);
   if(!r.ok||!l.ok)throw Error('Lokale API niet bereikbaar');
   const z=await r.json(),rows=await l.json(),a=z.analysis||{},fresh=z.live_fresh===true;
   put('m1liveState','WACHTEN');put('m1liveNote',z.source+' | '+(z.source_error?'BRONFOUT: '+z.source_error:fresh?'Actuele gesloten M1 — uitsluitend onderzoek':'Geen actuele gesloten M1 — WACHTEN')+' | Broker/nieuws niet geverifieerd; geen orders.');
   put('m1liveTime',date(a.bar_close_utc));put('m1liveQuote',fmt(a.bid)+' / '+fmt(a.ask));put('m1liveAtr',fmt(a.relative)+' × · '+(a.reference_days??0));put('m1liveVolume',fmt(a.rv)+' × · '+fmt(a.er));put('m1liveBars',String(z.stored_bars??0));
   put('m1liveCandidate',!fresh?'Geen actuele beoordeling':a.technical_candidate?(a.direction===1?'BUY':'SELL')+' onderzoek':a.reason||'—');
   const body=$('m1liveRows');body.replaceChildren();
   for(const ev of rows.slice(-20).reverse()){
    const tr=document.createElement('tr');for(const s of [date(ev.bar_close_utc),ev.direction===1?'BUY':'SELL',ev.technical_candidate?'Kandidaat':'Afgewezen / onbekend',ev.features?.failed?.join(', ')||'—']){const td=document.createElement('td');td.textContent=s;tr.append(td)}body.append(tr);
   }
   if(!body.children.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=4;td.textContent='Nog geen nieuwe grote pijlen geregistreerd.';tr.append(td);body.append(tr)}
  }catch(e){put('m1liveState','WACHTEN');put('m1liveNote','Lokale collector niet bereikbaar; geen live beoordeling.');put('m1liveCandidate','Geen actuele beoordeling')}
 }
 refresh();setInterval(refresh,5000);
})();