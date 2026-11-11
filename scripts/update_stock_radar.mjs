import fs from 'node:fs/promises';
import {marketDateNY,scanWindow,parseMovers,rankCandidates,cleanHtml} from '../lib/stock-radar.mjs';
const OUTPUT='docs/data/stock-radar.json';
const SOURCE='https://stockanalysis.com/markets/premarket/';
const now=new Date(),day=marketDateNY(now);
const base={version:1,generated_at_utc:now.toISOString(),market_date_ny:day.date,
  source:'StockAnalysis.com (openbare premarket-pagina, geen brokerfeed)',
  source_url:SOURCE,status:'no_data',candidates:[],note:'Nog geen geverifieerde premarket-scan.'};
async function get(url){
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),15000);
  try{
    const res=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 (compatible; TradingCompanyResearch/0.5; personal research)','accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8','accept-language':'en-US,en;q=0.8'},signal:ctrl.signal});
    if(!res.ok)throw Error('HTTP '+res.status);
    return await res.text();
  }finally{clearTimeout(timer)}
}
function newsLink(xml){
  for(const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)){
    const item=m[1],title=cleanHtml(item.match(/<title>([\s\S]*?)<\/title>/i)?.[1]||'');
    const url=cleanHtml(item.match(/<link>([\s\S]*?)<\/link>/i)?.[1]||'');
    const dt=new Date(cleanHtml(item.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1]||''));
    if(!title||Number.isNaN(dt.valueOf())||now-dt>48*3600_000||dt-now>300000)continue;
    try{const u=new URL(url);if(!['https:','http:'].includes(u.protocol))continue;return {headline:title.slice(0,180),url:u.href,published_at_utc:dt.toISOString(),verified:false}}catch{}
  }
  return null;
}
async function loadNews(row){
  try{
    const query='"'+row.ticker+'" stock news earnings when:2d';
    const xml=await get('https://news.google.com/rss/search?q='+encodeURIComponent(query)+'&hl=en-US&gl=US&ceid=US:en');
    return newsLink(xml);
  }catch{return null}
}
if(!scanWindow(now)){
  console.log('Buiten het premarket-scanvenster van 08:50–09:29 New York: behoud het vorige snapshot.');
  process.exit(0);
}
try{
  const [gainers,losers]=await Promise.all([
    get('https://stockanalysis.com/markets/premarket/gainers/'),
    get('https://stockanalysis.com/markets/premarket/losers/')
  ]);
  // Voorkomt dat de brondata van de vorige handelsdag als de data van vandaag worden gepresenteerd.
  if(!gainers.includes(day.human)||!losers.includes(day.human))throw Error('Datum premarket-bron komt niet overeen met handelsdag '+day.date);
  const rows=[...parseMovers(gainers,'LONG-WATCH'),...parseMovers(losers,'SHORT-WATCH')];
  const selected=rankCandidates(rows,10);
  // Optioneel nieuwscontext; onbeschikbaarheid hiervan mag geen nieuwsfeit suggereren.
  for(const row of selected)row.news=await loadNews(row);
  const out={...base,status:selected.length?'ok':'no_candidates',candidates:selected,
    note:selected.length?'Indicatieve voorbeurswatchlist; spread, nieuwsinhoud en uitvoerbaarheid zijn niet geverifieerd. Geen instapsignalen.':
    'Geen kandidaten voldeden aan de conservatieve filters of er waren onvoldoende gegevens.'};
  await fs.writeFile(OUTPUT,JSON.stringify(out,null,2)+'\n');
  console.log('Radar gepubliceerd: '+out.status+'; '+selected.length+' kandidaten; '+day.date);
}catch(err){
  const out={...base,note:'Automatische scan kon niet betrouwbaar worden uitgevoerd: '+String(err.message).slice(0,160)};
  await fs.writeFile(OUTPUT,JSON.stringify(out,null,2)+'\n');
  console.warn(out.note);
}
