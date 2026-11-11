import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { M5, H1, evaluateDirection, recordDaily, evaluateAfterHour } from '../lib/research.mjs';
const bar = (t,p) => ({ t,o:p,h:p+0.3,l:p-0.3,c:p });
function feed(now, direction=1){
 const m5=Array.from({length:170},(_,i)=>bar(now-(170-i)*M5,4000+direction*i*.2));
 const h1=Array.from({length:120},(_,i)=>bar(now-(120-i)*H1,4000+direction*i*1.2));
 return {status:'indicative',fetched_at_utc:new Date(now-30000).toISOString(),quote:{at_utc:new Date(now-20000).toISOString()},indicative_5m:m5,indicative_1h:h1};
}
test('Directional model requires only closed bars and fresh quote',()=>{
 const now=Date.parse('2026-11-12T12:05:04Z'),f=feed(now);
 assert.equal(evaluateDirection(f,now).signal,'BUY');
 assert.equal(evaluateDirection(feed(now,-1),now).signal,'SELL');
 assert.equal(evaluateDirection(f,now+18*60000).signal,'WACHTEN');
});
test('Future M5 candle must not influence observation',()=>{
 const now=Date.parse('2026-11-12T12:05:04Z'),f=feed(now),before=evaluateDirection(f,now);
 f.indicative_5m.push(bar(now,99999));
 assert.deepEqual(evaluateDirection(f,now),before);
});
test('Dutch 13:00 local window only, one observation per weekday',()=>{
 const now=Date.parse('2026-11-12T12:06:00Z'),f=feed(now),a=evaluateDirection(f,now),log=[];
 recordDaily(log,a,now);recordDaily(log,a,now+60000);
 assert.equal(log.length,1);assert.equal(log[0].date,'2026-11-12');
 assert.equal(recordDaily([],a,Date.parse('2026-11-12T11:40:00Z')).length,0);
});
test('Evaluation requires future closed bar and never reports P&L',()=>{
 const start=Date.parse('2026-11-12T12:06:00Z'),f=feed(start),log=[];
 recordDaily(log,evaluateDirection(f,start),start);f.indicative_5m.push(bar(start+H1,4100));
 evaluateAfterHour(log,f,start+H1+120000);assert.equal(log[0].state,'pending');
 evaluateAfterHour(log,f,start+H1+M5+4000);
 assert.equal(log[0].state,'evaluated');assert.equal(log[0].evaluation.end_close,4100);
 assert.ok(!Object.hasOwn(log[0].evaluation,'pnl_eur'));
});
