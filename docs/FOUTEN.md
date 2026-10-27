# Fouten die kinderen tegenkomen

Het spel telt zijn eigen scriptfouten, anoniem, zodat de wekelijkse rapportage
laat zien wat er bij echte kinderen misgaat. Drie stukken:

| stuk | waar | wat |
|---|---|---|
| de melder | `src/05-foutmelder.js` | vangt `error` en `unhandledrejection`, stuurt één kort briefje per fout (hoogstens drie per bezoek) |
| de ontvanger | `worker/fouten.js` | een Cloudflare Worker die het briefje in Workers Analytics Engine schrijft |
| het uitlezen | de zondagrapportage | één SQL-vraag, zie onderaan |

## Wat er in een briefje staat

`wat` (de melding, hoogstens 120 tekens), `waar` (`index.html:regel:kolom`),
`versie` (dezelfde afdruk als `versie.txt`), `scherm` (welk scherm open stond),
`toestel` (telefoon of tablet). De Worker zet er het soort systeem bij
(Android, iOS, ...). Geen naam, sterren, profiel, IP-adres of koekje.
`kern.test.js` zaak ZB kijkt na dat het briefje bij die vijf velden blijft.

Een regelnummer zegt alleen iets samen met de versie: zoek de commit waarin
`versie.txt` die afdruk kreeg (`git log -S <afdruk> -- versie.txt`) en kijk
in díe `index.html` op die regel.

De melder staat uit zolang `FOUT_ADRES` leeg is, en altijd vanaf `file://`,
localhost en onder `?debug`.

## Opzetten (één keer)

1. Cloudflare-dashboard → **Workers & Pages** → **Create** → **Worker**. Naam:
   `rekensterren-fouten`. Plak `worker/fouten.js` en **Deploy**.
2. In die Worker: **Settings → Bindings → Add → Analytics Engine**.
   Variabele `FOUTEN`, dataset `rekensterren_fouten`. Opnieuw **Deploy**.
3. Het adres van de Worker (`https://rekensterren-fouten.<naam>.workers.dev`)
   gaat in `FOUT_ADRES` in `src/05-foutmelder.js`; daarna `npm run bouw`.
4. Het API-token dat de rapportage gebruikt heeft **Account Analytics: Read**
   nodig om de dataset te lezen.

Of met een token dat **Workers Scripts: Edit** mag: dan kan dit allemaal via de
API (`PUT accounts/<id>/workers/scripts/rekensterren-fouten` met de binding
`{"type":"analytics_engine","name":"FOUTEN","dataset":"rekensterren_fouten"}`).

## Uitlezen

```sh
curl -X POST https://api.cloudflare.com/client/v4/accounts/<id>/analytics_engine/sql --data "
  SELECT blob1 AS wat, blob2 AS waar, blob3 AS versie, blob4 AS scherm,
         blob5 AS toestel, blob6 AS systeem, SUM(_sample_interval) AS keer
  FROM rekensterren_fouten
  WHERE timestamp > NOW() - INTERVAL '7' DAY
  GROUP BY wat, waar, versie, scherm, toestel, systeem
  ORDER BY keer DESC LIMIT 25"
```

Analytics Engine bewaart drie maanden. Het gaat om een handvol briefjes per
week; het gratis plan heeft ruim genoeg.
