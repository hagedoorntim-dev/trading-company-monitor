import fs from 'node:fs/promises';
import { getRealTimeRates, getHistoricalRates } from 'dukascopy-node';
import {assess,closed,mid,M5,H1} from '../lib/analysis.mjs';
const out='docs/data/latest.json',logfile='docs/data/observations.json';
const now=Date.now(), dt=t=>new Date(t).toISOString();
const asTime=t=>{const n=Number(t);if(Number.isFinite(n))return n<1e11?n*1000:n;const v=Date.parse(t);return Number.isFinite(v)?v:NaN};
const norm=rs=>(Array.isArray(rs)?rs:[]).map(x=>({t:asTime(x.timestamp??x.time??x[0]),o:Number(x.open??x[1]),h:Number(x.high??x[2]),l:Number(x.low??x[3]),c:Number(x.close??x[4]),v:Number(x.volume??x[5]??0)})).filter(x=>Number.isFinite(x.t)&&[x.o,x.h,x.l,x.c].every(Number.isFinite));
const join=(bid,ask,span)=>{
 const map=new Map(norm(ask).map(a=>[a.t,a]));
 return norm(bid).filter(b=>map.has(b.t)).map(b=>{const a=map.get(b.t);return{t:b.t,bid:[b.o,b.h,b.l,b.c],ask:[a.o,a.h,a.l,a.c],volume_bid:b.v,volume_ask:a.v}})
 .filter(x=>x.ask[3]>=x.bid[3]&&x.bid[2]>0&&x.ask[2]>0&&x.t+span<=now-3000).sort((a,b)=>a.t-b.t);
};
const example=x=>JSON.stringify(x?.[0]??null).slice(0,240);
async function realtime(tf,p,n){
 try{const r=await getRealTimeRates({instrument:'xauusd',timeframe:tf,priceType:p,format:'json',last:n,volumes:true});
 console.log('realtime',tf,p,'raw',r?.length??typeof r,'parsed',norm(r).length,'example',example(r));return r||[];}
 catch(e){console.warn('realtime',tf,p,'failed',e?.message);return []}
}
async function historical(tf,p,days){
 const from=new Date(now-days*86400000);
 const r=await getHistoricalRates({instrument:'xauusd',timeframe:tf,priceType:p,format:'json',volumes:true,
  dates:{from,to:new Date(now)},batchSize:2,pauseBetweenBatchesMs:250,requestIntervalMs:350,retryCount:2,pauseBetweenRetriesMs:500,rateLimitRetryCount:2});
 console.log('historical',tf,p,'raw',r?.length??typeof r,'parsed',norm(r).length,'example',example(r));return r||[];
}
async function pair(tf,span,n,days){
 const b=await realtime(tf,'bid',n),a=await realtime(tf,'ask',n);
 let result=join(b,a,span);
 console.log('realtime paired',tf,result.length);
 if(result.length>=60)return result;
 console.warn('Using historical fallback for',tf,'because paired candles <60');
 const hb=await historical(tf,'bid',days),ha=await historical(tf,'ask',days);
 result=join(hb,ha,span);console.log('historical paired',tf,result.length);
 return result;
}
async function main(){
 const m5=await pair('m5',M5,160,5),h1=await pair('h1',H1,90,14);
 if(m5.length<60||h1.length<60)throw Error('Niet genoeg gepaarde BID/ASK-kaarsen na realtime + historische fallback: '+m5.length+' / '+h1.length);
 const feed={schema:3,status:'ok',source:'Dukascopy (niet Pepperstone)',instrument:'XAUUSD',fetched_at_utc:dt(now),candles_5m:m5.slice(-220),candles_1h:h1.slice(-100)};
 const assessment=assess(feed,now);
 if(!assessment.fresh)console.warn('GEEN ACTUEEL SIGNAAL – nieuwste gesloten 5m',assessment.last5m&&dt(assessment.last5m),'h1',assessment.last1h&&dt(assessment.last1h));
 await fs.writeFile(out,JSON.stringify(feed));
 let log=[];try{log=JSON.parse(await fs.readFile(logfile,'utf8'))}catch{}if(!Array.isArray(log))log=[];
 const p=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Amsterdam',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(new Date(now));
 const z=Object.fromEntries(p.map(x=>[x.type,x.value])),day=z.year+'-'+z.month+'-'+z.day;
 if(Number(z.hour)===13&&!log.some(x=>x.day===day)&&assessment.fresh){
 log.push({id:'xau_'+day,day,at_utc:dt(now),signal:assessment.signal,entry_mid:assessment.price,spread:assessment.spread,stop:assessment.stop,target:assessment.target,reason:assessment.reason,state:'pending',evaluation:null});}
 const usable=closed(feed.candles_5m,M5,now);
 for(const o of log.filter(x=>x.state==='pending')){
  const base=Date.parse(o.at_utc);if(now-base<3600000)continue;
  const later=usable.find(x=>x.t+M5>=base+3600000&&x.t+M5<=base+4500000);
  if(later){const move=mid(later)-o.entry_mid;o.evaluation={at_utc:dt(later.t+M5),mid:mid(later),move_usd:move,direction_adjusted_usd:o.signal==='BUY'?move:o.signal==='SELL'?-move:null,note:'Koersverschil; geen gerealiseerde P&L'};o.state='evaluated';}
  else if(now-base>36*H1){o.state='no_data';o.evaluation={note:'Geen betrouwbare latere koers voor evaluatie'};}
 }
 await fs.writeFile(logfile,JSON.stringify(log.slice(-500),null,2));
 console.log('Monitor result',JSON.stringify({fresh:assessment.fresh,signal:assessment.signal,last5m:assessment.last5m&&dt(assessment.last5m),last1h:assessment.last1h&&dt(assessment.last1h),observations:log.length}));
}
main().catch(e=>{console.error('FEED FOUT (geen nieuwe gegevens gepubliceerd):',e?.stack||e);process.exitCode=1});
