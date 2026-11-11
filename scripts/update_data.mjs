import fs from 'node:fs/promises';
import {getRealTimeRates} from 'dukascopy-node';
import {assess,closed,mid,M5,H1} from '../lib/analysis.mjs';
const out='docs/data/latest.json',logfile='docs/data/observations.json';
const now=Date.now();
const dt=t=>new Date(t).toISOString();
const norm=rs=>(rs||[]).map(x=>({t:Number(x.timestamp??x[0]),o:Number(x.open??x[1]),h:Number(x.high??x[2]),l:Number(x.low??x[3]),c:Number(x.close??x[4]),v:Number(x.volume??x[5]??0)})).filter(x=>Number.isFinite(x.t)&&[x.o,x.h,x.l,x.c].every(Number.isFinite));
const join=(bid,ask,span)=>{const map=new Map(norm(ask).map(a=>[a.t,a]));return norm(bid).filter(b=>map.has(b.t)).map(b=>{const a=map.get(b.t);return{t:b.t,bid:[b.o,b.h,b.l,b.c],ask:[a.o,a.h,a.l,a.c],volume_bid:b.v,volume_ask:a.v}}).filter(x=>x.ask[3]>=x.bid[3]&&x.bid[2]>0&&x.ask[2]>0&&x.t+span<now-3000).sort((a,b)=>a.t-b.t);};
const request=(timeframe,priceType,last)=>getRealTimeRates({instrument:'xauusd',timeframe,priceType,format:'json',last,volumes:true});
async function main(){
 // The library's getRealTimeRates is experimental: never claim that a call succeeded without validating time.
 const m5=join(await request('m5','bid',900),await request('m5','ask',900),M5);
 const h1=join(await request('h1','bid',240),await request('h1','ask',240),H1);
 if(m5.length<60||h1.length<60)throw new Error('Niet genoeg gepaarde BID/ASK-kaarsen: '+m5.length+' / '+h1.length);
 const feed={schema:3,status:'ok',source:'Dukascopy realtime (niet Pepperstone)',instrument:'XAUUSD',fetched_at_utc:dt(now),candles_5m:m5.slice(-900),candles_1h:h1.slice(-240)};
 // NB: Data with status=ok may still be stale, so assess() checks actual candle timestamps.
 const assessment=assess(feed,now);
 if(!assessment.fresh)console.warn('Feed heeft nog geen actuele afgesloten kaars: WACHTEN');
 await fs.writeFile(out,JSON.stringify(feed));
 let log=[];try{log=JSON.parse(await fs.readFile(logfile,'utf8'))}catch{} if(!Array.isArray(log))log=[];
 const p=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Amsterdam',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(new Date(now));
 const z=Object.fromEntries(p.map(x=>[x.type,x.value])),day=z.year+'-'+z.month+'-'+z.day;
 if(Number(z.hour)===13&&!log.some(x=>x.day===day)&&assessment.fresh){
  log.push({id:'xau_'+day,day,at_utc:dt(now),signal:assessment.signal,entry_mid:assessment.price,spread:assessment.spread,stop:assessment.stop,target:assessment.target,reason:assessment.reason,state:'pending',evaluation:null});
 }
 const usable=closed(feed.candles_5m,M5,now);
 for(const o of log.filter(x=>x.state==='pending')){
  const base=Date.parse(o.at_utc);if(now-base<3600000)continue;
  const later=usable.find(x=>x.t+M5>=base+3600000&&x.t+M5<=base+4500000);
  if(later){const move=mid(later)-o.entry_mid;o.evaluation={at_utc:dt(later.t+M5),mid:mid(later),move_usd:move,direction_adjusted_usd:o.signal==='BUY'?move:o.signal==='SELL'?-move:null,note:'Koersverschil; geen gerealiseerde P&L'};o.state='evaluated';}
  else if(now-base>36*H1){o.state='no_data';o.evaluation={note:'Geen betrouwbare latere koers voor evaluatie'};}
 }
 await fs.writeFile(logfile,JSON.stringify(log.slice(-500),null,2));
 console.log(JSON.stringify({status:feed.status,fresh:assessment.fresh,last5m:assessment.last5m&&dt(assessment.last5m),signal:assessment.signal,observations:log.length}));
}
main().catch(e=>{console.error('FEED FOUT (geen nieuwe gegevens gepubliceerd):',e?.stack||e);process.exitCode=1});
