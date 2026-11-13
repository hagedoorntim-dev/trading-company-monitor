// Read-only collector. Run on a trusted machine; bind loopback only.
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {getRealTimeRates,getHistoricalRates} from 'dukascopy-node';
import {pair,analyze,MIN} from '../lib/b2-live.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)), dir=path.resolve(process.env.TC_DATA_DIR||path.join(root,'private-live'));
const port=Number(process.env.TC_PORT||8787), seed=process.env.TC_SEED;
const archive=path.join(dir,'bars'), log=path.join(dir,'signals.jsonl'), stateFile=path.join(dir,'state.json');
await fs.mkdir(archive,{recursive:true});
let bars=new Map(),seen=new Set(),signals=[],lastPoll=null,sourceError=null,lastOK=null,lastAnalysis=null,started=Date.now(),busy=false,backfillAttempt=0,conflicts=0;
const iso=t=>new Date(t).toISOString(),day=t=>iso(t).slice(0,10),sleep=ms=>new Promise(r=>setTimeout(r,ms));
const read=async p=>{try{return await fs.readFile(p,'utf8')}catch(e){if(e.code==='ENOENT')return '';throw e}};
const parseLines=s=>s.split(/\r?\n/).filter(Boolean).map(l=>JSON.parse(l));
const valid=x=>Number.isFinite(x.t)&&x.t%MIN===0&&Array.isArray(x.bid)&&Array.isArray(x.ask)&&x.bid.length===4&&x.ask.length===4&&x.bid.every(Number.isFinite)&&x.ask.every(Number.isFinite)&&x.bid[2]>0&&x.ask[2]>0&&Number.isFinite(x.volume_bid)&&Number.isFinite(x.volume_ask)&&x.volume_bid>=0&&x.volume_ask>=0&&x.volume_bid+x.volume_ask>0&&x.ask[3]>=x.bid[3]&&x.ask[0]>=x.bid[0]&&x.bid[1]>=Math.max(x.bid[0],x.bid[3])&&x.bid[2]<=Math.min(x.bid[0],x.bid[3])&&x.ask[1]>=Math.max(x.ask[0],x.ask[3])&&x.ask[2]<=Math.min(x.ask[0],x.ask[3]);
const ordered=()=>[...bars.values()].sort((a,b)=>a.t-b.t);
async function add(rows){
 const groups=new Map();
 for(const x of rows){if(!valid(x)||x.t+MIN>Date.now()-3000)continue;const old=bars.get(x.t);
  if(old){if(JSON.stringify(old)!==JSON.stringify(x))conflicts++;continue}
  const k=day(x.t);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(x);bars.set(x.t,x);
 }
 for(const [k,a] of groups)await fs.appendFile(path.join(archive,k+'.jsonl'),a.map(x=>JSON.stringify(x)).join('\n')+'\n');
 // Keep 65k recent bars in RAM; retain daily archives on disk.
 if(bars.size>65000)bars=new Map(ordered().slice(-65000).map(x=>[x.t,x]));
}
for(const f of (await fs.readdir(archive)).filter(f=>/^\d{4}-\d{2}-\d{2}\.jsonl$/.test(f)).sort().slice(-55)){
 for(const x of parseLines(await read(path.join(archive,f))))if(valid(x))bars.set(x.t,x);
}
bars=new Map(ordered().slice(-65000).map(x=>[x.t,x]));
for(const x of parseLines(await read(log))){seen.add(x.id);signals.push(x)}
signals=signals.slice(-500);
if(seed&&bars.size<1500){
 const csv=(await read(path.resolve(seed))).trim().split(/\r?\n/),cols=csv.shift().split(',');
 const at=k=>cols.indexOf(k);
 if(['timestamp_utc','bid_open','ask_open','bid_volume','ask_volume'].some(k=>at(k)<0))throw Error("Seed CSV mist kolommen");
 const rows=csv.map(l=>{const x=l.split(',');return {t:Date.parse(x[at('timestamp_utc')]),bid:['open','high','low','close'].map(k=>Number(x[at('bid_'+k)])),ask:['open','high','low','close'].map(k=>Number(x[at('ask_'+k)])),volume_bid:Number(x[at('bid_volume')]),volume_ask:Number(x[at('ask_volume')])}});
 await add(rows);console.log("Seed loaded",bars.size);
}
async function fetchPair(recent,from,to){
 const base={instrument:'xauusd',timeframe:'m1',format:'json',volumes:true,requestIntervalMs:500,rateLimitRetryCount:1};
 const fn=recent?getRealTimeRates:getHistoricalRates;
 const opt=recent?{last:180}:{dates:{from:new Date(from),to:new Date(to)},batchSize:2,retryCount:1,pauseBetweenRetriesMs:1000};
 const b=await fn({...base,...opt,priceType:'bid'}),a=await fn({...base,...opt,priceType:'ask'});
 return pair(b,a,Date.now());
}
async function saveStatus(){
 const data={source:'Dukascopy XAUUSD (niet Plus500)',mode:'research',started_at:iso(started),last_poll_at:lastPoll?iso(lastPoll):null,last_success_at:lastOK?iso(lastOK):null,source_error:sourceError,stored_bars:bars.size,conflicts,analysis:lastAnalysis,execution:'WACHTEN'};
 await fs.writeFile(stateFile+'.tmp',JSON.stringify(data));await fs.rename(stateFile+'.tmp',stateFile);
 return data;
}
async function poll(){
 if(busy)return;busy=true;lastPoll=Date.now();
 try{
  const newest=ordered().at(-1)?.t;
  // Seed recommended. Bootstrap at most one bounded historical request per hour, not per poll.
  if((!newest||Date.now()-newest>3*3600000)&&Date.now()-backfillAttempt>3600000){
   backfillAttempt=Date.now();
   const from=newest?Math.max(newest+MIN,Date.now()-45*86400000):Date.now()-45*86400000;
   const to=Math.min(Date.now(),from+7*86400000);
   try{await add(await fetchPair(false,from,to))}catch(e){console.warn("Backfill failed",e.message)}
  }
  const recent=await fetchPair(true);
  if(!recent.length)throw Error("Geen geldige gekoppelde M1-kaarsen");
  const prev=ordered().at(-1)?.t??0;
  await add(recent);
  const all=ordered(),x=all.at(-1);
  const now=Date.now();lastAnalysis=analyze(all,now);
  if(!lastAnalysis.fresh)throw Error("Bron levert geen actuele gesloten M1-kaars");
  // A previously stored latest bar is not a new live observation. A gap is recorded, not concealed.
  lastOK=now;sourceError=null;
  if(x.t>prev&&x.t+MIN>=started&&lastAnalysis.direction){
   const id='B2-v8:'+x.t, a=lastAnalysis;
   if(!seen.has(id)){
    const event={id,version:'B2-v8',observed_at:iso(now),bar_close_utc:a.bar_close_utc,direction:a.direction,technical_candidate:a.technical_candidate,eligible:false,reason:'Broker/nieuws niet geverifieerd; onderzoek',gap_minutes:prev?Math.max(0,(x.t-prev)/MIN-1):null,features:a};
    await fs.appendFile(log,JSON.stringify(event)+'\n');seen.add(id);signals.push(event);signals=signals.slice(-500);
   }
  }
 }catch(e){sourceError=String(e.message||e);console.error("SOURCE WAIT",sourceError);lastAnalysis=bars.size?analyze(ordered(),Date.now()):null}
 finally{busy=false;await saveStatus();console.log("M1",lastAnalysis?.status||"waiting",lastAnalysis?.bar_close_utc||"—",sourceError||"OK")}
}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.css':'text/css','.pine':'text/plain; charset=utf-8'};
http.createServer(async(req,res)=>{
 try{
  const u=new URL(req.url,'http://localhost');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='GET'){res.writeHead(405);res.end();return}
  if(u.pathname==='/api/m1/status'){
   const a=lastAnalysis,age=a?.bar_close_utc?Date.now()-Date.parse(a.bar_close_utc):null;
   res.setHeader('Content-Type','application/json');res.end(JSON.stringify({source:'Dukascopy XAUUSD (niet Plus500)',execution:'WACHTEN',started_at:iso(started),last_poll_at:lastPoll?iso(lastPoll):null,last_success_at:lastOK?iso(lastOK):null,source_error:sourceError,stored_bars:bars.size,conflicts,analysis:a,age_ms:age,live_fresh:!sourceError&&age!==null&&age>=3000&&age<=90000}));return
  }
  if(u.pathname==='/api/m1/signals'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(signals));return}
  const docs=path.join(root,'docs'),file=path.resolve(docs,'.'+(u.pathname==='/'?'/index.html':decodeURIComponent(u.pathname)));
  if(!file.startsWith(docs+path.sep)){res.writeHead(403);res.end();return}
  const data=await fs.readFile(file);res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(data);
 }catch(e){res.writeHead(404);res.end('Niet beschikbaar')}
}).listen(port,'127.0.0.1',()=>console.log('Trading Company local: http://127.0.0.1:'+port));
while(true){
 const delay=MIN-Date.now()%MIN+5000;await sleep(delay);await poll();
}
