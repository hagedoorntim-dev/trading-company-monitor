# Trading Company — Goudmonitor

Open dashboard: **https://hagedoorntim-dev.github.io/trading-company-monitor/**

## Huidige status

De website en de automatische GitHub Actions-update werken. Een geplande update draait doorgaans eens per 15 minuten, maar GitHub kan geplande taken vertragen.

De gebruikte bron is momenteel **biquote / een MetaTrader 5-bron**. De openbare API biedt recente XAU/USD OHLC-koersen op 5 minuten en 1 uur, plus een actuele BID/ASK-quote. De OHLC-kaarsen bevatten **geen afzonderlijke BID/ASK-zijden**; bovendien zijn dit geen Pepperstone- of Plus500-koersen.

**Daarom blijft elk handelssignaal geblokkeerd: WACHTEN.** De trends en EMA-lijnen zijn uitsluitend een indicatieve weergave. Er worden geen orders geplaatst en er wordt nog geen win/verlies per tradesignaal bijgehouden.

## Techniek

- `docs/index.html`: openbaar webdashboard (5m/1h, EMA20/EMA50, quote, status).
- `scripts/update_indicative.mjs`: actuele quote en OHLC; publiceert **alleen** als de validaties voor juistheid en actualiteit slagen.
- `lib/analysis.mjs`: deterministische proefregels voor toekomstige BID/ASK-data; zijn nu **niet actief**.
- `scripts/update_data.mjs`: eerdere Dukascopy-proef. Momenteel niet gepland; Dukascopy gaf vanaf GitHub HTTP 202/AWS WAF-antwoorden.
- `docs/data/latest.json`: recentste validatie; altijd controleren op `status`, `fetched_at_utc` en laatste afgesloten kaars.
- `docs/data/observations.json`: uitsluitend voor toekomstige gevalideerde demoresultaten.
- `.github/workflows/market-monitor.yml`: herhaalde update, test en publicatie.

## Handelssignalen opnieuw inschakelen

Pas nadat een betrouwbare broker- of prijs-API afzonderlijke historische BID/ASK-kaarsen levert, hebben we genoeg gegevens om de regels te testen op uitvoering, spread en slippage. Tot dat moment blijft de beslismodule vergrendeld.

**Geen werkelijk handelsadvies. Alleen onderzoek en visualisatie.**
