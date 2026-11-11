import test from 'node:test';
import assert from 'node:assert/strict';
import {parseMovers,rankCandidates,compactNumber,scanWindow,marketDateNY} from '../lib/stock-radar.mjs';
const table='<table><tbody>'+
'<tr><td>1</td><td><a href="/stocks/nvda/">NVDA</a></td><td>NVIDIA Corporation</td><td>+6.25%</td><td>$190.00</td><td>2.4M</td><td>5.0T</td></tr>'+
'<tr><td>2</td><td><a href="/stocks/penny/">PENNY</a></td><td>Unsafe penny</td><td>+80%</td><td>$0.32</td><td>12M</td><td>5M</td></tr>'+
'<tr><td>3</td><td><a href="/stocks/amd/">AMD</a></td><td>Advanced Micro Devices</td><td>-4.5%</td><td>$215.00</td><td>183,000</td><td>295B</td></tr>'+
'</tbody></table>';
test('normalize financial values',()=>{
 assert.equal(compactNumber('$2.4M'),2400000);
 assert.equal(compactNumber('1,514,754'),1514754);
 assert.equal(compactNumber('+6.25%'),6.25);
 assert.equal(compactNumber('—'),null);
});
test('radar filters penny stocks and retains credible movers',()=>{
 const rows=parseMovers(table,'LONG-WATCH');
 assert.deepEqual(rows.map(x=>x.ticker),['NVDA','AMD']);
 const result=rankCandidates(rows);
 assert.equal(result.length,2);
 assert.ok(result.every(x=>x.signal==='WACHTEN'&&x.spread_verified===false));
 assert.ok(result.every(x=>x.premarket_volume>=40000));
});
test('NY market-time gating handles winter and summer clocks',()=>{
 assert.equal(marketDateNY(new Date('2026-11-12T14:07:00Z')).date,'2026-11-12');
 assert.equal(scanWindow(new Date('2026-11-12T14:07:00Z')),true);
 assert.equal(scanWindow(new Date('2026-07-01T13:07:00Z')),true);
 assert.equal(scanWindow(new Date('2026-11-12T14:45:00Z')),false);
 assert.equal(scanWindow(new Date('2026-11-14T14:07:00Z')),false);
});
