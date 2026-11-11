/** Parser + selectie voor een onderzoeksradar, nooit een koop-/verkoopsignaal. */
const TECH = new Set(['NVDA','AMD','COIN','NBIS','MSFT','AAPL','GOOGL','GOOG','META','AMZN','TSLA','PLTR','AVGO','MU','INTC','SMCI','CRWV','ORCL','ARM','TSM','APP','SNOW','NET','DDOG','SHOP','ASML','AMAT','LRCX','QCOM','PANW','CRWD','HOOD','MSTR']);
export function cleanHtml(s) {
  return String(s).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ')
    .replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&#x27;/gi,"'")
    .replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)))
    .replace(/&#x([a-f0-9]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)))
    .replace(/\s+/g,' ').trim();
}
export function compactNumber(value) {
  if (typeof value==='number') return Number.isFinite(value)?value:null;
  const s=String(value||'').replace(/[$€,%\s,]/g,'').replace(/[−–]/g,'-');
  const m=s.match(/^([+-]?\d+(?:\.\d+)?)([KMBT])?$/i);
  return m?Number(m[1])*({K:1e3,M:1e6,B:1e9,T:1e12}[m[2]?.toUpperCase()]||1):null;
}
export function marketDateNY(date=new Date()) {
  const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date).map(x=>[x.type,x.value]));
  return {date:p.year+'-'+p.month+'-'+p.day,weekday:p.weekday,hour:Number(p.hour),minute:Number(p.minute),human:new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',year:'numeric'}).format(date)};
}
export function scanWindow(date=new Date()){
  const p=marketDateNY(date);
  return ['Mon','Tue','Wed','Thu','Fri'].includes(p.weekday)&&p.hour===9&&p.minute<=29 ||
         ['Mon','Tue','Wed','Thu','Fri'].includes(p.weekday)&&p.hour===8&&p.minute>=50;
}
export function parseMovers(html,direction){
  const results=[],seen=new Set();
  for(const match of String(html).matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
    const tr=match[1],cells=[...tr.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(x=>cleanHtml(x[1]));
    if(cells.length<6)continue;
    const anchor=tr.match(/href=["'](?:https?:\/\/stockanalysis\.com)?\/stocks\/([A-Za-z0-9.-]+)\/?(?:["'?#])/i);
    let ticker=anchor?anchor[1].toUpperCase():null;
    if(!ticker && /^[A-Z][A-Z0-9.-]{0,7}$/.test(cells[1]||''))ticker=cells[1];
    if(!ticker || !/^[A-Z][A-Z0-9.-]{0,7}$/.test(ticker) || seen.has(ticker))continue;
    const col=cells.findIndex(x=>x.toUpperCase()===ticker),idx=col>=0?col:1;
    const name=cells[idx+1],gap=compactNumber(cells[idx+2]),price=compactNumber(cells[idx+3]),volume=compactNumber(cells[idx+4]),marketCap=compactNumber(cells[idx+5]);
    if(!name || !Number.isFinite(gap)||!Number.isFinite(price)||!Number.isFinite(volume)||!Number.isFinite(marketCap))continue;
    if(price<5||price>300||marketCap<250_000_000||volume<40_000||Math.abs(gap)<2||Math.abs(gap)>35)continue;
    seen.add(ticker);
    results.push({ticker,name:name.slice(0,100),direction,gap_pct:gap,premarket_price:price,premarket_volume:volume,market_cap:marketCap,tech:TECH.has(ticker)});
  }
  return results;
}
export function rankCandidates(rows,limit=10){
  return rows.map(r=>{
    const gapScore=Math.min(20,Math.abs(r.gap_pct)*2);
    const volumeScore=Math.min(25,Math.max(0,Math.log10(r.premarket_volume/40_000+1)*14));
    const capScore=r.market_cap>2e9?15:r.market_cap>500e6?10:5;
    const sizeScore=r.premarket_price<=100?10:r.premarket_price<=200?7:4;
    const score=Math.round(gapScore+volumeScore+capScore+sizeScore+(r.tech?10:0));
    return {...r,score,signal:'WACHTEN',spread_verified:false,news_verified:false};
  }).sort((a,b)=>b.score-a.score).slice(0,limit);
}
