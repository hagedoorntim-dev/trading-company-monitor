// Trading Company – uitsluitend DEMO; gesloten candles, geen lookahead.
export const M5=300000,H1=3600000;
export function closed(bars,span,now=Date.now()){return (bars||[]).filter(x=>Number.isFinite(x.t)&&x.t+span<=now-3000&&Array.isArray(x.bid)&&Array.isArray(x.ask)&&x.ask[3]>=x.bid[3]&&(x.volume_bid>0||x.volume_ask>0)).sort((a,b)=>a.t-b.t).filter((x,i,a)=>i===0||x.t!==a[i-1].t)}
export const mid=x=>(x.bid[3]+x.ask[3])/2;
export function ema(v,p){const o=Array(v.length).fill(null);if(v.length<p)return o;let s=v.slice(0,p).reduce((a,b)=>a+b,0)/p;o[p-1]=s;for(let i=p;i<v.length;i++){s+=(v[i]-s)*2/(p+1);o[i]=s}return o}
export function atr(a,p=14){if(a.length<=p)return null;let s=0;for(let i=1;i<=p;i++)s+=tr(a[i],a[i-1]);s/=p;for(let i=p+1;i<a.length;i++)s=(s*(p-1)+tr(a[i],a[i-1]))/p;return s}
function tr(x,y){const h=(x.bid[1]+x.ask[1])/2,l=(x.bid[2]+x.ask[2])/2,c=mid(y);return Math.max(h-l,Math.abs(h-c),Math.abs(l-c))}
export function assess(feed,now=Date.now()){
 const a=closed(feed?.candles_5m,M5,now),b=closed(feed?.candles_1h,H1,now),x=a.at(-1),y=b.at(-1);
 const base={signal:"WACHTEN",reason:"Geen bruikbare recente koersdata",fresh:false,price:x?mid(x):null,spread:x?x.ask[3]-x.bid[3]:null,trend5:"—",trend1:"—",ema20:null,ema50:null,ema20h:null,ema50h:null,atr:null,last5m:x?.t??null,last1h:y?.t??null,stop:null,target:null};
 if(a.length<60||b.length<60)return base;
 const va=a.map(mid),vb=b.map(mid),e20=ema(va,20).at(-1),e50=ema(va,50).at(-1),h20=ema(vb,20).at(-1),h50=ema(vb,50).at(-1);
 const dir=(v,f,s)=>v>f&&f>s?"UP":v<f&&f<s?"DOWN":"MIXED";const t5=dir(mid(x),e20,e50),t1=dir(mid(y),h20,h50),A=atr(a),spread=x.ask[3]-x.bid[3];
 const fresh=now-(x.t+M5)<=12*60000&&now-(y.t+H1)<=70*60000&&now-(x.t+M5)>=0;
 const result={...base,fresh,price:mid(x),spread,trend5:t5,trend1:t1,ema20:e20,ema50:e50,ema20h:h20,ema50h:h50,atr:A,last5m:x.t,last1h:y.t};
 if(feed.status!=="ok")return {...result,reason:"Geen bevestigde live-feed: wachten."};
 if(!fresh)return {...result,reason:"Koers verouderd: wachten."};
 if(!(spread>0&&spread<=1.5)||!(A>0))return {...result,reason:"Spread of volatiliteit ongeschikt: wachten."};
 const near=Math.abs(mid(x)-e20)<=.6*A;
 if(near&&t5==="UP"&&t1==="UP")return {...result,signal:"BUY",reason:"EXPERIMENTEEL: 5m en 1h omhoog, koers nabij EMA20.",stop:x.ask[3]-1.5*A,target:x.ask[3]+3*A};
 if(near&&t5==="DOWN"&&t1==="DOWN")return {...result,signal:"SELL",reason:"EXPERIMENTEEL: 5m en 1h omlaag, koers nabij EMA20.",stop:x.bid[3]+1.5*A,target:x.bid[3]-3*A};
 return {...result,reason:"Geen samenhangende trend en EMA20-terugtest."};
}