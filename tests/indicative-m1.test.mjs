import test from 'node:test';import assert from 'node:assert/strict';import {normalizeM1,assessM1} from '../lib/indicative-m1.mjs';
const now=Date.UTC(2026,10,13,12,35,10);
const raw={symbol:'XAUUSD',interval:'1m',bars:Array.from({length:25},(_,i)=>({openTime:new Date(now-10000-(25-i)*60000).toISOString(),open:3900,high:3902,low:3899,close:3901,tickVolume:10,isOpen:false}))};
const q={symbol:'XAUUSD',timestamp:new Date(now-1000).toISOString(),bid:3900,ask:3901,stale:false,marketState:'open'};
test('closed M1 and quote validated, never executable',()=>{const b=normalizeM1(raw,now),a=assessM1(b,q,now);assert.equal(a.fresh,true);assert.equal(a.execution,'WACHTEN');assert.equal(a.age_ms,10000)});
test('open, future and invalid bars excluded',()=>{const r={...raw,bars:[...raw.bars,{...raw.bars[0],isOpen:true},{...raw.bars[0],openTime:new Date(now+60000).toISOString()}]};assert.equal(normalizeM1(r,now).length,25)});
test('stale quote and stale M1 fail closed',()=>{const b=normalizeM1(raw,now);assert.equal(assessM1(b,{...q,stale:true},now).fresh,false);assert.equal(assessM1(b,q,now+180000).fresh,false)});
