import fs from 'node:fs/promises';
const BASE='https://biquote.io/api/XAUUSD';
const now=Date.now();
const number=x=>Number(x);
const finite=x=>Number.isFinite(number(x));
async function json(url){
  const control=new AbortController();const timer=setTimeout(()=>control.abort(),12000);
  try{const response=await fetch(url,{headers:{accept:'application/json'},signal:control.signal});if(!response.ok)throw Error(url+' HTTP '+response.status);return await response.json()}
  finally{clearTimeout(timer)}
}
function normalize(result,span){
  if(result?.symbol!=='XAUUSD'||!Array.isArray(result?.bars))throw Error('Unexpected XAUUSD candles schema');
  const bars=result.bars.filter(x=>x.isOpen===false&&typeof x.openTime==='string').map(x=>({
    t:Date.parse(x.openTime),o:number(x.open),h:number(x.high),l:number(x.low),c:number(x.close),tickVolume:number(x.tickVolume??0)
  })).filter(x=>finite(x.t)&&finite(x.o)&&finite(x.h)&&finite(x.l)&&finite(x.c)&&x.o>0&&x.h>=Math.max(x.o,x.c)&&x.l<=Math.min(x.o,x.c)&&x.h>=x.l&&x.t+span<=now-3000).sort((a,b)=>a.t-b.t).filter((x,i,arr)=>i===0||x.t!==arr[i-1].t);
  return bars;
}
function quoteTime(t){
 if(!t||typeof t!=='string')return NaN;
 const m=/^(\d{4})\.(\d{2})\.(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/.exec(t);
 return Date.parse(m?m[1]+'-'+m[2]+'-'+m[3]+'T'+m[4]+':'+m[5]+':'+m[6]+'Z':t);
}
async function main(){
 const [tick,m,h]=await Promise.all([
  json(BASE),json(BASE+'/ohlc?interval=5m&limit=180'),json(BASE+'/ohlc?interval=1h&limit=120')
 ]);
 const bid=number(tick.bid),ask=number(tick.ask);
 if(tick.symbol!=='XAUUSD'||!finite(bid)||!finite(ask)||bid<=0||ask<=bid||ask-bid>10)throw Error('Invalid tick bid/ask quote');
 const m5=normalize(m,300000),h1=normalize(h,3600000);
 if(m5.length<60||h1.length<60)throw Error('Not enough closed mid-OHLC bars '+m5.length+'/'+h1.length);
 const age5=now-(m5.at(-1).t+300000),age1=now-(h1.at(-1).t+3600000);
 const ageQuote=now-quoteTime(tick.time);
 if(age5<0||age5>15*60000||age1<0||age1>75*60000||!Number.isFinite(ageQuote)||ageQuote< -5*60000||ageQuote>15*60000)throw Error('Stale/invalid source '+JSON.stringify({age5,age1,ageQuote,tickTime:tick.time}));
 if(Math.abs((bid+ask)/2-m5.at(-1).c)>Math.max(25,bid*0.01))throw Error('Tick inconsistent with latest M5 candle');
 const data={schema:4,status:'indicative',source:'biquote / '+String(tick.source||'MT5')+' (NIET Pepperstone)',source_kind:'ohlc_without_individual_bid_ask_plus_latest_quote',
  warning:'OHLC-koersen zonder afzonderlijke BID/ASK-zijden; alleen de actuele quote bevat BID/ASK. Handelssignalen blijven uitgeschakeld.',
  fetched_at_utc:new Date(now).toISOString(),instrument:'XAUUSD',
  quote:{bid,ask,at_raw:tick.time,at_utc:new Date(quoteTime(tick.time)).toISOString()},
  indicative_5m:m5.slice(-170),indicative_1h:h1.slice(-120),candles_5m:[],candles_1h:[]};
 await fs.writeFile('docs/data/latest.json',JSON.stringify(data));
 console.log('INDICATIEVE MARKTDATA OK',JSON.stringify({quote:data.quote,m5:m5.length,h1:h1.length,lastM5:new Date(m5.at(-1).t).toISOString(),lastH1:new Date(h1.at(-1).t).toISOString(),age5min:age5/60000,ageH1min:age1/60000}));
}
main().catch(e=>{console.error('GEEN INDICATIEVE MARKTDATA:',e?.stack||e);process.exitCode=1});
