import test from 'node:test';import assert from 'node:assert/strict';import {pair,analyze,aggregate5,MIN,ema,atr} from '../lib/b2-live.mjs';
const start=Date.UTC(2026,9,1);
function bar(t,p=3900,v=10){return {timestamp:t,open:p,high:p+1,low:p-1,close:p+.2,volume:v}}
test("pair excludes open, unpaired, invalid and zero-volume minutes",()=>{const b=[bar(start),bar(start+MIN),bar(start+2*MIN),bar(start+3*MIN,3900,0)],a=[bar(start,3901),bar(start+2*MIN,3901),bar(start+3*MIN,3901,0)];assert.equal(pair(b,a,start+3*MIN+5000).length,2);assert.equal(pair(b,a,start+2*MIN+1000).length,1)});
test("duplicate timestamps rejected",()=>assert.throws(()=>pair([bar(start),bar(start)],[bar(start,3901)],start+2*MIN)));
test("closed M5 groups",()=>{const b=pair([bar(start),bar(start+MIN),bar(start+5*MIN)],[bar(start,3901),bar(start+MIN,3901),bar(start+5*MIN,3901)],start+7*MIN);assert.equal(aggregate5(b).length,2)});
test("insufficient history fails closed",()=>{assert.equal(analyze([],start).eligible,false);assert.equal(analyze([],start).status,"warming")});
test("EMA and ATR use BID",()=>{assert.equal(ema([1,2,3],3).at(-1),2.25);const b=pair([bar(start),bar(start+MIN)],[bar(start,3901),bar(start+MIN,3901)],start+3*MIN);assert.equal(atr(b,2).at(-1),2)});
test("20 previous UTC days and stale data never become executable",()=>{const b=[],a=[];for(let day=0;day<23;day++)for(let m=0;m<700;m++){const t=start+day*86400000+m*MIN,p=3900+Math.sin((day*700+m)/13)*8+(day*700+m)*.001;b.push(bar(t,p));a.push(bar(t,p+.5))}const now=b.at(-1).timestamp+MIN+5000,x=pair(b,a,now);const z=analyze(x,now);assert.equal(z.reference_days,20);assert.equal(z.eligible,false);assert.equal(z.fresh,true);assert.equal(analyze(x,now+180000).status,"stale")});
