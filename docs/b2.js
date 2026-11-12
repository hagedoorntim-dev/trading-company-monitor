// B2 dashboard: calculator and explicitly bounded calendar snapshot. No broker orders.
(() => {
 const $=id=>document.getElementById(id);
 const num=id=>{const v=$(id).value.trim();return v===""?NaN:Number(v)};
 const fmt=n=>n.toLocaleString("nl-NL",{maximumFractionDigits:2});
 $("b2calculate").addEventListener("click",()=>{
   const [a,s,fx,min,step,slip,fee]=["b2atr","b2spread","b2fx","b2min","b2step","b2slip","b2fee"].map(num);
   const out=$("b2result");
   if(![a,s,fx,min,step,slip,fee].every(Number.isFinite)||a<=0||s<=0||fx<=0||min<=0||step<=0||slip<0||fee<0){out.textContent="WACHTEN — vul geldige actuele brokergegevens in";return}
   if(s>.5*a){out.textContent="WACHTEN — spread > 50% ATR";return}
   const cost=3*a+s+slip;
   const q=Math.min(1,Math.max(0,Math.floor((5*fx-fee)/cost/step+1e-10)*step));
   if(q+1e-9<min){out.textContent="WACHTEN — minimumpositie overschrijdt €5 gepland risico";return}
   out.textContent=fmt(q)+" oz · gepland risico €"+fmt((q*cost+fee)/fx)+" · margin en minimumstop nog controleren";
 });
 const events=[
   ["2026-12-04T13:30:00Z","Amerikaanse banencijfers (NFP)"],
   ["2026-12-09T19:00:00Z","Fed rentebesluit"],
   ["2026-12-09T19:30:00Z","Fed persconferentie"],
   ["2026-12-10T13:30:00Z","Amerikaanse CPI"]
 ];
 const render=()=>{
  const now=Date.now(),out=$("b2calendar");out.replaceChildren();
  const p=document.createElement("p");
  const active=events.find(([t])=>now>=Date.parse(t)-300000&&now<=Date.parse(t)+900000);
  p.textContent=now<Date.parse("2026-11-13T00:00:00Z")||now>=Date.parse("2027-01-01T00:00:00Z")?"Kalender buiten geldigheidsperiode — WACHTEN":active?"Gepland nieuwsvenster: WACHTEN — "+active[1]:"Geen geblokkeerd venster in deze momentopname. Dagelijkse broncontrole verplicht; geen live vrijgave.";
  out.append(p);
  const ul=document.createElement("ul");for(const [t,name] of events){if(Date.parse(t)<now-900000)continue;const li=document.createElement("li");li.textContent=new Date(t).toLocaleString("nl-NL",{timeZone:"Europe/Amsterdam",dateStyle:"medium",timeStyle:"short"})+" · "+name;ul.append(li)}out.append(ul);
 };
 render();setInterval(render,30000);
})();