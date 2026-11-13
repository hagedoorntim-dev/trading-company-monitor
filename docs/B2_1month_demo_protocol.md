# B2 — één maand TradingView Essential / Plus500-demo

## Installatie en push
1. Open PEPPERSTONE:XAUUSD, gewone candles, 1 minuut. Vervang bestaand Pine Script door docs/TradingCompany_B2_v1.3.1.pine, sla op en voeg toe aan grafiek.
2. Controleer dat de automatische ATR-referentie twintig dagen toont; geen handmatige referentie voor de nieuwe automatische meldingen.
3. Maak een alert op de indicator, conditie TEST | eenmalige push, eenmaal per bar close, Notify in App aan. Op iPhone: TradingView ingelogd op dezelfde account, iOS meldingen toegestaan. Markt moet open zijn.
4. Na ontvangst: verwijder testalert. Maak één nieuwe alert met conditie Any alert() function call. B2 technische kandidaatmeldingen aan. Notify in App aan; kies einddatum passend bij betaalmaand.
5. Hermaak alerts na elke script-/input-/symbool-/timeframewijziging. Serveralert is een snapshot. Bij stopzetten abonnement/afloop: controleer en sluit eventuele open demo-posities zelf; brokerstop blijft altijd ingesteld.
6. Hoofdalert bewaakt alleen richting van een eerder verzonden kandidaat, niet jouw echte posities. Eventueel afzonderlijke EXIT | controleer LONG of SHORT-alert voor een open demopositie, vooral na reset/herstart; verwijder die na sluiting. Exit komt bij de volgende tegengestelde grote pijl, ongeacht de overige filters. Geen orderautomatisering.

## Kandidaat → demo, geen echte order
- Bewaar het signaal-ID, signaaltijd, ontvangsttijd, TV-slot en ATR. De melding kan een technische kandidaat zijn maar NOOIT een geverifieerde brokerorder. Niet verplicht wachten. Vervalt drie minuten na sluiting signaalcandle (experimentele grens).
- Vóór instap: laatste gesloten M1 bevestigt nog dezelfde AA-trend, EMA50-kant, gesloten M5-trend en HMA; ATR-regime 1–3, ER20 ≥0,30. Controleer nieuwsvenster (5 min vóór/15 min na relevante NFP/CPI/FOMC), onverwacht nieuws, actuele spread ≤0,5 × actuele ATR, minimum stopafstand, margin, EUR/USD, contractstap, volumepariteit nog niet bewezen. Bij onzekerheid, verlopen signaal of ongeldige voorwaarden: overslaan en reden opslaan. Sterke kaars en RV zijn voorwaarden op oorspronkelijke signaalcandle; niet opnieuw eisen bij de latere controle.
- Beschermende stop op 3× oorspronkelijke signaal-ATR vanaf daadwerkelijke fill, in richting tegen de positie. Bereken hoeveelheid op maximaal EUR 5 gepland risico inclusief spread, slippage en kosten; rond af op geverifieerde brokerstap. Geen garantie tegen grotere verliezen bij gaps. Geen echte orders, geen automatische uitvoering.
- Bij tegengestelde grote pijl: controleer/sluit nog open demo-positie; stop blijft actief tot daadwerkelijke sluiting. Noteer werkelijke exit, eventuele slippage en kosten. Geen nieuwe positie als bestaande nog open is.
- Log elke kandidaat, ook gemiste/afgewezen. Noteer geen fictieve fills of P&L. Houd grafieksimulaties gescheiden van demoresultaten.

## Evaluatie
Na een maand: aantal technische kandidaten, ontvangen push, gemiste push (vergelijk chart/alertlog), ontvangstvertraging, fillvertraging, afwijsredenen, werkelijke spread/slippage, demoresultaat, drawdown, abonnementskosten apart. Geen winstverwachting of promotie naar echt geld op basis van één maand of enkele trades. Doel minstens 100 afgeronde prospectieve trades en minstens 8 weken, langer indien nodig. B2-regels blijven vast.

Gebruik de lokale template docs/B2_demo_log_template.csv (download en bewaar buiten publieke repo). Geen accountnummers, wachtwoorden of persoonlijke brokergegevens committen.
