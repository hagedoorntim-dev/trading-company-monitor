import {test} from 'node:test';import {strict as assert} from 'node:assert';import {assess,closed,M5,H1} from '../lib/analysis.mjs';
const bar=(t,v=100)=>({t,bid:[v,v+1,v-1,v],ask:[v+.2,v+1.2,v-.8,v+.2],volume_bid:1,volume_ask:1});
test("open 5m-candle uitgesloten",()=>assert.equal(closed([bar(0),bar(300000)],M5,600000).length,1));
test("zonder data altijd wachten",()=>assert.equal(assess({status:'ok',candles_5m:[],candles_1h:[]}).signal,'WACHTEN'));
test("stale feed blokkeert signalen",()=>{const feed={status:"ok",candles_5m:Array.from({length:80},(_,i)=>bar(i*M5,100+i)),candles_1h:Array.from({length:80},(_,i)=>bar(i*H1,100+i))};assert.equal(assess(feed,100*H1).signal,'WACHTEN')});
test("ongevalideerde feed blokkeert signalen",()=>{const now=80*H1+M5;const feed={status:"historical_demo",candles_5m:Array.from({length:900},(_,i)=>bar(now-(900-i)*M5,100+i)),candles_1h:Array.from({length:80},(_,i)=>bar(i*H1,100+i))};assert.equal(assess(feed,now).signal,'WACHTEN')});