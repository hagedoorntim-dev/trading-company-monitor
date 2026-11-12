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

## US Stock Momentum Radar (v0.5)

De radar staat in hetzelfde dashboard als de goudmonitor: https://hagedoorntim-dev.github.io/trading-company-monitor/

- GitHub Actions probeert elke 15 minuten scripts/update_stock_radar.mjs uit te voeren; alleen tussen 08:50 en 09:29 New Yorkse tijd op werkdagen wordt een nieuwe premarket-snapshot gemaakt.
- De scanner gebruikt openbare premarket-overzichten op StockAnalysis.com en optionele verwijzingen naar recente nieuwsresultaten. De bron kan onbeschikbaar zijn of structuur wijzigen. In dat geval publiceert hij geen verzonnen cijfers en toont het dashboard expliciet GEEN ACTUELE RADAR.
- Filtervoorwaarden: premarketkoers tussen $5 en $300, volume minimaal 40.000 aandelen, marktkapitalisatie minimaal $250 miljoen, absolute premarket-beweging tussen 2% en 35%. Dit zijn onderzoeksfilters, geen uitvoerbaarheidsbewijs. Maximaal 10 kandidaten.
- Kandidaten zijn LONG-WATCH of SHORT-WATCH, uitsluitend gebaseerd op de richting van de premarket-beweging. Dit zijn geen BUY/SELL-signalen. De spread en nieuwsinhoud zijn niet onafhankelijk bevestigd.
- Het dashboard vermeldt de beursdatum en scantijd. Vorige-daggegevens worden als verouderd gemarkeerd. De vaste tech-volglijst biedt links naar grafieken maar bevat geen verzonnen aanbevelingen.
- Het radarbestand is docs/data/stock-radar.json; de code is lib/stock-radar.mjs, scripts/update_stock_radar.mjs en tests/stock-radar.test.mjs. De scanner wordt door .github/workflows/market-monitor.yml opgeroepen.
- De ChatGPT-taak voor dagelijkse radarberichten is gepauzeerd. Alleen het GitHub-dashboard kan deze data tonen. Er zijn geen brokerorders en geen pushmeldingen.

Let op: geautomatiseerde bronophaling en publicatie worden pas operationeel bevestigd nadat een echte premarket-run in GitHub Actions is gelukt. De openbare bron is geen gegarandeerde marktdata-API en kan zonder waarschuwing weigeren of veranderen.


## B2 Regime Momentum (v0.6)

- `docs/TradingCompany_B2_v1.pine`: M1 paper-detector, closed M5, big AlgoAlpha changes, HMA approximation, candle, relative chart volume, ATR regime, ER20, verified manual spread/calendar/risk controls. Default minimum 0.15 oz based on user-confirmed Plus500 amount; increment must be verified. Pine is not yet compiled in TradingView; chart volume and BID/ASK data differ from Dukascopy. No real orders.
- `docs/index.html` / `docs/b2.js`: B2 status/checklist, risk calculator, official calendar snapshot verified 12 Nov 2026 (NFP/CPI/FOMC in December), TradingView market-news widget and primary-source links. Calendar snapshot is not a continuously verified feed. No broker/TradingView webhook. Dashboard B2 remains WACHTEN until validated M1 BID/ASK and comparable volume feed exist.
- Broker candidate: Plus500 demo, 0.15 oz minimum confirmed earlier; spread $1.13 previously observed, not guaranteed. Verify order step, minimum stop, margin, actual spread, slippage, currency and overnight costs. No deployment verification or live fills claimed.
- Existing premarket radar remains unchanged; its candidates are watchlist only, news verification required. No ChatGPT radar notifications.
