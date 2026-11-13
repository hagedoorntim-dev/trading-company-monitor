import {getRealTimeRates} from 'dukascopy-node';import {pair,MIN} from '../lib/b2-live.mjs';
const opt={instrument:'xauusd',timeframe:'m1',format:'json',last:30,volumes:true,requestIntervalMs:500,rateLimitRetryCount:1};
try{const b=await getRealTimeRates({...opt,priceType:'bid'}),a=await getRealTimeRates({...opt,priceType:'ask'}),now=Date.now(),rows=pair(b,a,now),last=rows.at(-1),age=last?now-last.t-MIN:null;
 const report={source:'Dukascopy XAUUSD',checked_at:new Date(now).toISOString(),paired_closed:rows.length,last_close:last?new Date(last.t+MIN).toISOString():null,age_ms:age,ok:rows.length>=10&&age>=3000&&age<=90000};
 console.log(JSON.stringify(report,null,2));if(!report.ok)process.exitCode=1;
}catch(e){console.error("M1 PROBE FAILED",e.message);process.exitCode=1}
