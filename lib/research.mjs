/** Prospective, indicative market-direction research. NOT a trade/PNL system. */
export const M5 = 300_000;
export const H1 = 3_600_000;

function emaLast(values, period) {
  if (values.length < period) return null;
  let v = values.slice(0, period).reduce((s, x) => s + x, 0) / period;
  for (let i = period; i < values.length; i++) v += (values[i] - v) * 2 / (period + 1);
  return v;
}

function completed(bars, span, asOf) {
  if (!Array.isArray(bars)) return [];
  return bars.filter(x => Number.isFinite(x.t) && x.t + span <= asOf - 3_000 &&
    [x.o, x.h, x.l, x.c].every(Number.isFinite) && x.c > 0)
    .sort((a, b) => a.t - b.t).filter((x, i, a) => i === 0 || x.t !== a[i - 1].t);
}

export function evaluateDirection(feed, asOf = Date.now()) {
  const m5 = completed(feed?.indicative_5m, M5, asOf);
  const h1 = completed(feed?.indicative_1h, H1, asOf);
  const base = { model: 'tc-ema20-ema50-mtf-indicative-v1', signal: 'WACHTEN', reason: 'Onvoldoende gesloten kaarsen', fresh: false, reference_price: null, last_m5_close_utc: null, last_h1_close_utc: null };
  if (feed?.status !== 'indicative' || m5.length < 60 || h1.length < 60) return base;
  const a = m5.at(-1), b = h1.at(-1);
  const age5 = asOf - (a.t + M5), age1 = asOf - (b.t + H1);
  const ageQuote = asOf - Date.parse(feed.quote?.at_utc || '');
  const ageFeed = asOf - Date.parse(feed.fetched_at_utc || '');
  const fresh = age5 >= 0 && age5 <= 17 * 60_000 && age1 >= 0 && age1 <= 75 * 60_000 &&
    ageQuote >= -60_000 && ageQuote <= 17 * 60_000 && ageFeed >= -60_000 && ageFeed <= 17 * 60_000;
  const m5values = m5.map(x => x.c), h1values = h1.map(x => x.c);
  const m20 = emaLast(m5values, 20), m50 = emaLast(m5values, 50);
  const h20 = emaLast(h1values, 20), h50 = emaLast(h1values, 50);
  const trend = (price, fast, slow) => price > fast && fast > slow ? 'UP' : price < fast && fast < slow ? 'DOWN' : 'MIXED';
  const m5trend = trend(a.c, m20, m50), h1trend = trend(b.c, h20, h50);
  let signal = 'WACHTEN';
  if (fresh && m5trend === h1trend && m5trend !== 'MIXED') signal = m5trend === 'UP' ? 'BUY' : 'SELL';
  return { ...base, signal, fresh, reference_price: a.c, last_m5_close_utc: new Date(a.t + M5).toISOString(),
    last_h1_close_utc: new Date(b.t + H1).toISOString(), m5trend, h1trend, ema20_m5: m20, ema50_m5: m50,
    reason: !fresh ? 'Feed of koerskaarsen zijn verouderd' : signal === 'WACHTEN' ? '5m en 1h geven geen eensgezinde trend' : 'Beide tijdframes bevestigen EMA20/50-trend; uitsluitend onderzoeksrichting.' };
}

function amsterdamParts(now) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23' }).formatToParts(new Date(now));
  return Object.fromEntries(parts.map(x => [x.type, x.value]));
}

/** Only actual observations taken between 13:00 and 13:29 local time. No hindsight/backfill. */
export function recordDaily(log, assessment, now = Date.now()) {
  if (!Array.isArray(log)) throw new TypeError('log must be array');
  const p = amsterdamParts(now), date = `${p.year}-${p.month}-${p.day}`;
  if (!['Mon','Tue','Wed','Thu','Fri'].includes(p.weekday) || Number(p.hour) !== 13 || Number(p.minute) >= 30) return log;
  if (!assessment.fresh || !Number.isFinite(assessment.reference_price)) return log;
  if (log.some(x => x.date === date)) return log;
  log.push({ id: `xau-${date}`, date, observed_at_utc: new Date(now).toISOString(), model: assessment.model,
    signal: assessment.signal, price_close: assessment.reference_price,
    last_m5_close_utc: assessment.last_m5_close_utc, last_h1_close_utc: assessment.last_h1_close_utc,
    m5trend: assessment.m5trend, h1trend: assessment.h1trend,
    reason: assessment.reason, state: 'pending', evaluation: null,
    disclaimer: 'Prospectieve OHLC-koersmeting; geen BID/ASK-trade of netto-P&L.' });
  return log;
}

/** Evaluate against the FIRST available later completed 5m bar, not an intrabar high/low. */
export function evaluateAfterHour(log, feed, now = Date.now()) {
  const bars = completed(feed?.indicative_5m, M5, now);
  for (const obs of log) {
    if (obs.state !== 'pending') continue;
    const t = Date.parse(obs.observed_at_utc);
    if (!Number.isFinite(t) || now < t + H1) continue;
    const later = bars.find(x => x.t + M5 >= t + H1 && x.t + M5 <= t + 90 * 60_000);
    if (later) {
      const move = later.c - obs.price_close;
      obs.state = 'evaluated';
      obs.evaluation = { at_utc: new Date(later.t + M5).toISOString(), end_close: later.c,
        move_usd_per_oz: Math.round(move * 10000) / 10000,
        directional_move_usd_per_oz: obs.signal === 'BUY' ? Math.round(move * 10000) / 10000 : obs.signal === 'SELL' ? Math.round(-move * 10000) / 10000 : null,
        note: 'Alleen koersverandering, zonder uitvoerbaarheid, spread, slippage en financieringskosten.' };
    } else if (now > t + 100 * 60_000) {
      obs.state = 'no_data';
      obs.evaluation = { note: 'Geen geldige afgesloten 5-minutenkaars binnen het evaluatievenster; niet meegerekend.' };
    }
  }
  return log;
}
