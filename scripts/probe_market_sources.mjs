// Probe public, unauthenticated quote sources. Diagnostics only; no trades, no stored prices.
const probes=[
 ['biquote_tick','https://biquote.io/api/XAUUSD'],
 ['biquote_m5','https://biquote.io/api/XAUUSD/ohlc?interval=5m&limit=100'],
 ['biquote_h1','https://biquote.io/api/XAUUSD/ohlc?interval=1h&limit=100'],
 ['xaus_spot','https://xaus.com/api/v1/spot']
];
for (const [name,url] of probes){
 const ctl=new AbortController();const timeout=setTimeout(()=>ctl.abort(),7500);
 try{
  const r=await fetch(url,{headers:{'accept':'application/json'},signal:ctl.signal});
  const body=await r.text();let data;try{data=JSON.parse(body)}catch{}
  let info={name,http:r.status,contentType:r.headers.get('content-type'),dataType:typeof data};
  if(data){
   if(name==='biquote_tick')info={...info,symbol:data.symbol,has_bid:Number.isFinite(Number(data.bid)),has_ask:Number.isFinite(Number(data.ask)),source:data.source,at:data.time};
   if(name==='biquote_m5'||name==='biquote_h1')info={...info,symbol:data.symbol,bars:data.bars?.length,newest:data.bars?.[0]?.openTime,newest_open:data.bars?.[0]?.isOpen,has_bid_ask_per_candle:Boolean(data.bars?.[0]?.bid&&data.bars?.[0]?.ask)};
   if(name==='xaus_spot')info={...info,at:data.data_state?.as_of,status:data.data_state?.status,pricePresent:Number.isFinite(Number(data.spot_usd_oz))};
  }else info.bodyExcerpt=body.slice(0,80);
  console.log('FEED PROBE:',JSON.stringify(info));
 }catch(e){console.log('FEED PROBE:',JSON.stringify({name,error:e.message}))}
 finally{clearTimeout(timeout)}
}
