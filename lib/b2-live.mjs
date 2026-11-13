// Frozen research logic: B2 v8, BID prices, Dukascopy quote volume. No orders.
export const MIN=60000;
const F=Number.isFinite;
export function normalizeSide(rows,now){
 const m=new Map();
 for(const r of rows||[]){
  const t=typeof r.timestamp==="number"?r.timestamp:Date.parse(r.timestamp);
  const p=[r.open,r.high,r.low,r.close].map(Number), v=Number(r.volume);
  if(!F(t)||t%MIN!==0||t+MIN>now-3000||!p.every(F)||p[2]<=0||p[1]<Math.max(p[0],p[3])||p[2]>Math.min(p[0],p[3])||r.volume==null||!F(v)||v<0)continue;
  if(m.has(t))throw Error("Duplicate source timestamp "+t);
  m.set(t,{t,p,v});
 }
 return m;
}
export function pair(bid,ask,now){
 const b=normalizeSide(bid,now),a=normalizeSide(ask,now),out=[];
 for(const [t,x] of b){const y=a.get(t);if(!y)continue;
  if(x.v+y.v<=0||y.p[0]<x.p[0]||y.p[3]<x.p[3])continue;
  out.push({t,bid:x.p,ask:y.p,volume_bid:x.v,volume_ask:y.v});
 }
 return out.sort((a,b)=>a.t-b.t);
}
export function ema(x,n){let v=NaN,k=2/(n+1);return x.map(a=>{if(F(a))v=F(v)?k*a+(1-k)*v:a;return v})}
export function atr(b,n){let v=0;return b.map((x,i)=>{const [o,h,l,c]=x.bid,p=i?b[i-1].bid[3]:c,tr=Math.max(h-l,Math.abs(h-p),Math.abs(l-p));if(i<n){v+=tr;if(i===n-1)v/=n;return i===n-1?v:NaN}v=(v*(n-1)+tr)/n;return v})}
function wma(x,n){return x.map((v,i)=>{if(i<n-1)return NaN;let z=0;for(let j=0;j<n;j++){let a=x[i-n+1+j];if(!F(a))return NaN;z+=a*(j+1)}return z/(n*(n+1)/2)})}
export function trend(b){
 const c=b.map(x=>x.bid[3]),z=ema(c.map((x,i)=>i>=34?2*x-c[i-34]:NaN),70),a=atr(b,70),band=a.map((x,i)=>{if(i<278)return NaN;let v=-Infinity;for(let j=i-209;j<=i;j++){if(!F(a[j]))return NaN;v=Math.max(v,a[j])}return 1.2*v});
 let s=0;return c.map((v,i)=>{if(i&&F(band[i])&&F(band[i-1])){if(v>z[i]+band[i]&&c[i-1]<=z[i-1]+band[i-1])s=1;else if(v<z[i]-band[i]&&c[i-1]>=z[i-1]-band[i-1])s=-1}return s});
}
export function aggregate5(b){
 const a=[];for(const x of b){const t=Math.floor(x.t/300000)*300000,q=a.at(-1);if(!q||q.t!==t)a.push({t,bid:[...x.bid]});else{q.bid[1]=Math.max(q.bid[1],x.bid[1]);q.bid[2]=Math.min(q.bid[2],x.bid[2]);q.bid[3]=x.bid[3]}}
 return a;
}
const med=x=>{const a=[...x].sort((a,b)=>a-b),n=a.length;return n?(a[(n-1)>>1]+a[n>>1])/2:NaN};
// Same UTC daily median convention as v8; exclude first potentially partial day.
export function analyze(b,now){
 if(!Array.isArray(b)||b.length<1500)return {status:"warming",reason:"Onvoldoende M1-historie",eligible:false};
 const i=b.length-1,x=b[i],c=b.map(x=>x.bid[3]),a=atr(b,14),e=ema(c,50),s=trend(b);
 const w25=wma(c,25),w50=wma(c,50),h=wma(w25.map((v,j)=>2*v-w50[j]),7);
 let hs=0;for(let j=3;j<h.length;j++){if([1,2,3].every(k=>h[j]>h[j-k]))hs=1;else if([1,2,3].every(k=>h[j]<h[j-k]))hs=-1}
 const m5=aggregate5(b),m5s=trend(m5);let j=m5.length-1;const prior5=Math.floor(x.t/300000)*300000-300000;while(j>=0&&m5[j].t>prior5)j--;
 const t5=j>=0?m5s[j]:0;
 const daily=new Map(),today=Math.floor(x.t/86400000),first=Math.floor(b[0].t/86400000);
 for(let k=0;k<b.length;k++){const day=Math.floor(b[k].t/86400000);if(day<=first||day>=today||!F(a[k]))continue;if(!daily.has(day))daily.set(day,[]);daily.get(day).push(a[k]/c[k]*10000)}
 const days=[...daily.values()].filter(v=>v.length>=600).slice(-20),ref=days.length===20?med(days.map(med)):NaN,relative=a[i]/c[i]*10000/ref;
 const v=b.map(y=>y.volume_bid+y.volume_ask),rv=v[i]/(v.slice(i-20,i).reduce((z,v)=>z+v,0)/20),span=x.bid[1]-x.bid[2],d=s[i]!==s[i-1]?s[i]:0;
 let path=0;for(let k=i-19;k<=i;k++)path+=Math.abs(c[k]-c[k-1]);
 const er=x.t-b[i-20].t===20*MIN&&path>1e-9?Math.abs(c[i]-c[i-20])/path:NaN;
 const body=span>0?Math.abs(c[i]-x.bid[0])/span:0,edge=span>0?(d===1?x.bid[1]-c[i]:c[i]-x.bid[2])/span:1,spread=x.ask[3]-x.bid[3];
 const gates={ema:d!==0&&d*(c[i]-e[i])>0,m5:d!==0&&t5===d,hma:d!==0&&hs===d,candle:d!==0&&body>=.5&&d*(c[i]-x.bid[0])>0&&edge<=.2,volume:F(rv)&&rv>=1.5,atr:F(relative)&&relative>=1&&relative<=3,spread:spread>=0&&spread<=.5*a[i],er:F(er)&&er>=.30};
 const age=now-(x.t+MIN),fresh=age>=3000&&age<=90000,ready=days.length===20&&t5!==0&&hs!==0&&F(relative)&&F(er)&&F(rv);
 return {status:fresh?(ready?"ready":"warming"):"stale",fresh,ready,eligible:false,technical_candidate:fresh&&ready&&d!==0&&Object.values(gates).every(Boolean),historical_candidate:ready&&d!==0&&Object.values(gates).every(Boolean),direction:d,trend:s[i],m5:t5,hma:hs,price:c[i],bid:x.bid[3],ask:x.ask[3],spread,atr:a[i],reference:ref,reference_days:days.length,relative,rv,er,body,edge,gates,failed:d?Object.entries(gates).filter(([,v])=>!v).map(([k])=>k):[],bar_open_utc:new Date(x.t).toISOString(),bar_close_utc:new Date(x.t+MIN).toISOString(),age_ms:age,reason:!fresh?"M1 verouderd":!ready?"Onvoldoende referentie / aaneengesloten candles":!d?"Geen grote pijl":"Onderzoekskandidaat; broker- en nieuwscontrole vereist"};
}
