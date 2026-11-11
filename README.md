# Trading Company — automatische goudmonitor

**Status:** onderzoek / demo. Geen live-orders. XAU/USD BID/ASK-data via Dukascopy; kan afwijken van TradingView Pepperstone en Plus500.

## Inhoud
- `docs/index.html`: dashboard (5 minuten en 1 uur, EMA20/50, trendstatus, koersactualiteit).
- `scripts/update_data.mjs`: haalt recente Dukascopy BID/ASK-koersen op en bewaart een demo-oordeel.
- `.github/workflows/market-monitor.yml`: geplande updates en GitHub Pages-publicatie.
- `docs/data/latest.json`: beginstatus; verschijnt als **GEEN LIVE-DATA** tot een succesvolle update.

## Activeren
1. Ga naar **Settings → Pages → Build and deployment → Source** en kies **GitHub Actions**.
2. Ga naar **Actions → Trading Company koersmonitor → Run workflow** (nadat de bestanden zijn toegevoegd).
3. Controleer of `npm run update` slaagt en de pagina een recente **laatst afgesloten 5m-kaars** toont. Bij verouderde data geeft het dashboard **WACHTEN**.
4. Vergelijk actuele koersen met TradingView; verschillen tussen aanbieders zijn normaal. 

> Het gaat om een experimentele onderzoeksmonitor, niet om een gevalideerd handelsadvies. De automatische taak draait in principe ieder kwartier, maar GitHub Actions heeft geen gegarandeerd tijdschema. De data en de demo-log zijn **openbaar** in deze publieke repository.
