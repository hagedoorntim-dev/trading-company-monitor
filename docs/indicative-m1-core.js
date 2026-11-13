// Indicative OHLC only; never use as B2 BID/ASK or Dukascopy volume.
const MIN=60000;
export function normalizeM1(raw,now=Date.now()){
 if(raw?.symbol!=='XAUUSD'||raw.interval!=='1m'||!Array.isArray(raw.bars))throw Error('Unexpected M1 schema');
 const rows=new Map();
 for(const x of raw.bars){
  if(x.isOpen!==false)continue;
  const t=Date.parse(x.openTime),o=Number(x.open),h=Number(x.high),l=Number(x.low),c=Number(x.close),v=x.tickVolume==null?null:Number(x.tickVolume);
  if(!Number.isFinite(t)||t%MIN||t+MIN>now||![o,h,l,c].every(Number.isFinite)||l<=0||h<Math.max(o,c)||l>Math.min(o,c)||h<l||v===null||!Number.isFinite(v)||v<0)continue;
  rows.set(t,{t,o,h,l,c,tickVolume:v});
 }
 return [...rows.values()].sort((a,b)=>a.t-b.t);
}
export function assessM1(bars,quote,now=Date.now()){
 const last=bars.at(-1),age=last?now-last.t-MIN:null,qtime=Date.parse(quote?.timestamp),qage=now-qtime;
 const bid=Number(quote?.bid),ask=Number(quote?.ask);
 const quoteOK=quote?.symbol==='XAUUSD'&&quote?.stale!==true&&quote?.marketState!=='closed'&&Number.isFinite(qage)&&qage>=-5000&&qage<=90000&&bid>0&&ask>bid&&ask-bid<10;
 const fresh=bars.length>=20&&age!==null&&age>=0&&age<=90000&&quoteOK;
 const gaps=bars.slice(1).filter((x,i)=>x.t-bars[i].t!==MIN).length;
 return {fresh,execution:'WACHTEN',last_close_utc:last?new Date(last.t+MIN).toISOString():null,age_ms:age,quote_at_utc:Number.isFinite(qtime)?new Date(qtime).toISOString():null,quote_age_ms:Number.isFinite(qage)?qage:null,gaps,latest_ohlc:last||null,quote_bid:quoteOK?bid:null,quote_ask:quoteOK?ask:null,reason:fresh?'Indicatieve M1; geen afzonderlijke BID/ASK-kaarsen of Dukascopy-volume':'Onvoldoende verse M1/quote'};
}
