import {normalizeM1,assessM1} from './indicative-m1-core.js';
const $=id=>document.getElementById(id),base='https://biquote.io/api/XAUUSD',key='tc-indicative-m1-v1',limit=10000;
let archive=new Map(),busy=false,lastCheck=0,lastStatus=null,storageOk=true;
try{const old=JSON.parse(localStorage.getItem(key)||'[]');for(const x of old)if(Number.isFinite(x.t)&&Number.isFinite(x.c))archive.set(x.t,x)}catch{storageOk=false}
const fmt=x=>Number.isFinite(x)?x.toLocaleString('nl-NL',{minimumFractionDigits:2,maximumFractionDigits:3}):'—';
const date=t=>t?new Date(t).toLocaleString('nl-NL',{timeZone:'Europe/Amsterdam',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'}):'—';
const set=(id,s)=>$(id).textContent=s;
const sorted=()=>[...archive.values()].sort((a,b)=>a.t-b.t);
function archiveStatus(){set('stored',String(archive.size));$('download').disabled=!archive.size}
function store(bars){
 for(const x of bars)if(!archive.has(x.t))archive.set(x.t,x);
 archive=new Map(sorted().slice(-limit).map(x=>[x.t,x]));
 try{localStorage.setItem(key,JSON.stringify(sorted()))}catch{storageOk=false}
 if(!storageOk)set('storageNote','Browseropslag niet beschikbaar. Kaarsen blijven alleen in deze sessie bewaard; exporteer CSV voordat je sluit.');
 archiveStatus();
}
async function get(url){const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('HTTP '+r.status);return r.json()}
function render(bars){
 const shown=bars.slice(-120),svg=$('chart');svg.replaceChildren();
 if(!shown.length)return;
 const lo=Math.min(...shown.map(x=>x.l)),hi=Math.max(...shown.map(x=>x.h)),span=Math.max(hi-lo,.001);
 const ns='http://www.w3.org/2000/svg',line=document.createElementNS(ns,'polyline');
 line.setAttribute('points',shown.map((x,i)=>(12+i*576/Math.max(1,shown.length-1))+','+(166-152*(x.c-lo)/span)).join(' '));line.setAttribute('fill','none');line.setAttribute('stroke','#78d5be');line.setAttribute('stroke-width','2');svg.append(line);
 set('chartRange',date(shown[0].t)+' – '+date(shown.at(-1).t+60000)+' | bereik '+fmt(lo)+' – '+fmt(hi)+' USD/oz');
 const body=$('rows');body.replaceChildren();
 for(const x of shown.slice(-20).reverse()){const tr=document.createElement('tr');for(const v of [date(x.t),fmt(x.o),fmt(x.h),fmt(x.l),fmt(x.c),String(x.tickVolume)]){const td=document.createElement('td');td.textContent=v;tr.append(td)}body.append(tr)}
}
function unavailable(note){$('state').className='warn';set('state','WACHTEN — geen actuele data');set('note',note+' | Geen B2-signaal. Eerder opgeslagen kaarsen zijn historisch.');set('quote','—');set('age','—');}
async function refresh(){
 if(busy)return;busy=true;$('refresh').disabled=true;
 try{
  const [raw,q]=await Promise.all([get(base+'/ohlc?interval=1m&limit=120'),get(base+'?allowStale=false')]),now=Date.now(),bars=normalizeM1(raw,now),z=assessM1(bars,q,now);
  lastCheck=now;lastStatus=z;
  if(!z.fresh){unavailable(z.reason);return}
  store(bars);render(bars);$('state').className='good';set('state','ACTUELE INDICATIEVE DATA · B2 WACHTEN');
  set('note','Bron: biquote / MT5. Gecontroleerd '+date(now)+'. Geen afzonderlijke BID/ASK-kaarsen; tickvolume wijkt mogelijk af van Dukascopy. Geen handelsadvies of pushmeldingen.');
  set('time',date(z.last_close_utc));set('close',fmt(z.latest_ohlc.c));set('quote',fmt(z.quote_bid)+' / '+fmt(z.quote_ask));set('age',(z.quote_age_ms/1000).toFixed(1)+' s');set('gaps',String(z.gaps));
 }catch(e){lastStatus=null;unavailable('Bron niet bereikbaar: '+e.message)}finally{busy=false;$('refresh').disabled=false}
}
$('refresh').onclick=refresh;
$('download').onclick=()=>{const header='timestamp_utc,open,high,low,close,tick_volume,source\n';const csv=header+sorted().map(x=>[new Date(x.t).toISOString(),x.o,x.h,x.l,x.c,x.tickVolume,'biquote_MT5_indicative'].join(',')).join('\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv'})),a=document.createElement('a');a.href=url;a.download='TradingCompany_indicative_M1.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
archiveStatus();if(archive.size)render(sorted());refresh();
setInterval(()=>{if(document.visibilityState==='visible')refresh()},20000);
setInterval(()=>{if(lastStatus?.fresh&&Date.now()-lastCheck>90000)unavailable('Laatste broncontrole ouder dan 90 seconden')},5000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh()});
