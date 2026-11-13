import assert from 'node:assert/strict';
import {normalizeM1, assessM1} from '../lib/indicative-m1.mjs';
const base='https://biquote.io/api/XAUUSD';
async function get(url){
 const r=await fetch(url,{signal:AbortSignal.timeout(15000),headers:{accept:'application/json'}});
 if(!r.ok)throw Error('HTTP '+r.status+' '+url);
 return r.json();
}
try{
 const [raw,quote]=await Promise.all([get(base+'/ohlc?interval=1m&limit=120'),get(base+'?allowStale=false')]);
 const now=Date.now(),bars=normalizeM1(raw,now),z=assessM1(bars,quote,now);
 console.log(JSON.stringify({checked_at:new Date(now).toISOString(),source:'biquote / MT5',raw_bars:raw.bars?.length,closed_bars:bars.length,...z},null,2));
 assert(z.fresh,'No fresh validated indicative M1');
}catch(e){console.error('M1 INDICATIVE PROBE FAILED:',e.message);process.exitCode=1}
