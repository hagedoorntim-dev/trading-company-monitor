# Trading Company — Goudmonitor

Open dashboard: **https://hagedoorntim-dev.github.io/trading-company-monitor/**

## Huidige status

De website en de automatische GitHub Actions-update zijn operationeel. Er zijn geplande updatepogingen op minuten 07, 22, 37 en 52, maar GitHub kan geplande taken vertragen of overslaan. De website markeert verouderde data.

De gebruikte bron is momenteel **biquote / een MetaTrader 5-bron**. De openbare API biedt recente XAU/USD OHLC-koersen op 5 minuten en 1 uur, plus een actuele BID/ASK-quote. De OHLC-kaarsen bevatten **geen afzonderlijke BID/ASK-zijden**; bovendien zijn dit geen Pepperstone- of Plus500-koersen.

**Daarom blijft elk uitvoerbaar handelssignaal geblokkeerd: WACHTEN.** Nieuw in v0.4: een afzonderlijke indicatieve richtingshypothese (BUY/SELL/WACHTEN als onderzoekslabel, niet als advies), gebaseerd op de laatst afgesloten 5m- en H1-kaarsen met EMA20/50. Bij een succesvolle update op een werkdag tussen 13:00 en 13:29 Nederlandse tijd leggen we prospectief één oordeel vast. Na ongeveer 60 minuten meten we uitsluitend de latere koersverandering in USD per ounce. Er wordt niets met terugwerkende kracht geregistreerd; door gemiste cronruns kan een dag ontbreken. Geen orders, brokerfills, netto-winst of bewezen betrouwbaarheid.

## Techniek

- `docs/index.html`: openbaar webdashboard (5m/1h, EMA20/EMA50, quote, status).
- `scripts/update_indicative.mjs`: actuele quote en OHLC; publiceert **alleen** als de validaties voor juistheid en actualiteit slagen.
- `lib/research.mjs`: prospectieve EMA20/EMA50-trendhypothese, alleen afgesloten M5/H1-kaarsen en logboek-evaluatie na 60 minuten.
- `tests/research.test.mjs`: beschermt tegen toekomstdata, dubbele metingen en ongeldige timing.
- `lib/analysis.mjs`: deterministische proefregels voor toekomstige BID/ASK-data; zijn nu **niet actief**.
- `scripts/update_data.mjs`: eerdere Dukascopy-proef. Momenteel niet gepland; Dukascopy gaf vanaf GitHub HTTP 202/AWS WAF-antwoorden.
- `docs/data/latest.json`: recentste validatie; altijd controleren op `status`, `fetched_at_utc` en laatste afgesloten kaars.
- `docs/data/observations.json`: indicatieve onderzoekswaarnemingen zonder daadwerkelijke handelsuitvoering, met achteraf gemeten koersverandering.
- `.github/workflows/market-monitor.yml`: herhaalde update, test en publicatie.

## Handelssignalen opnieuw inschakelen

Pas nadat een betrouwbare broker- of prijs-API afzonderlijke historische BID/ASK-kaarsen levert, hebben we genoeg gegevens om de regels te testen op uitvoering, spread en slippage. Tot dat moment blijft de beslismodule vergrendeld.

**Geen werkelijk handelsadvies. Alleen onderzoek en visualisatie.**
