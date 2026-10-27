# Overzetten: sterren naar een ander toestel

Een ouder zet alle sterren van dit toestel over naar een ander met een code van
zes cijfers. Vooral voor de iPhone: de app op het beginscherm heeft een eigen
opslag, los van Safari, en begint dus leeg. Maar ook voor een nieuwe telefoon of
tablet.

```
toestel A   ⚙️ › Back-up › Overzetten   -> de save naar de Worker, een code terug
toestel B   Code invullen               -> de save terug, de Worker gooit hem weg
            (leeg beginscherm, of ⚙️ › Back-up)
            "Zet op dit toestel" / "Vervangen" -> backupToepassen, zoals een bestand
```

Het is een kopie: A houdt zijn sterren. De save is dezelfde als het
back-upbestand (`JSON.stringify(db)`), met dezelfde keuring (`backupVormOk`) en
dezelfde vervanging (`backupToepassen`).

## De Worker

`worker/overzetten.js`, als `rekensterren-overzetten` op
`https://rekensterren-overzetten.<naam>.workers.dev/`. Drie aanroepen, alle drie
`POST` met een `text/plain`-body (dan is er geen preflight):

| pad | body | antwoord |
|---|---|---|
| `/zet` | de save | `201 { code, tot, sleutel }` |
| `/haal` | `{ code }` | `200 { save }`, of `404` |
| `/stand` | `{ code, sleutel }` | `{ opgehaald, verlopen }` |

* Een code leeft een kwartier en werkt één keer.
* Alleen `https://rekensterren.be` en `https://www.rekensterren.be` mogen hem
  aanroepen. Vanaf `file://` staat Overzetten in het spel dus uit
  (`overzetMag`); `?debug&overzet` zet het aan voor de tests.
* Per adres hoogstens 10 codes maken en 20 codes proberen per tien minuten. Het
  adres zelf wordt niet bewaard, alleen een hash als naam van de teller.
* Bewaard in twee Durable Objects met SQLite (`Codes` per code, `Wachter` per
  adres). Een wekker in elk object wist alles als de tijd om is.

## Opzetten (één keer)

Met een token dat **Workers Scripts: Edit** mag (dat van de foutmelder kan het):

```sh
curl -X PUT https://api.cloudflare.com/client/v4/accounts/<id>/workers/scripts/rekensterren-overzetten \
  -F 'metadata={"main_module":"overzetten.js","compatibility_date":"2026-10-01",
    "bindings":[{"type":"durable_object_namespace","name":"CODES","class_name":"Codes"},
                {"type":"durable_object_namespace","name":"WACHTER","class_name":"Wachter"}],
    "migrations":{"new_tag":"v1","new_sqlite_classes":["Codes","Wachter"]}};type=application/json' \
  -F 'overzetten.js=@worker/overzetten.js;type=application/javascript+module'
curl -X POST https://api.cloudflare.com/client/v4/accounts/<id>/workers/scripts/rekensterren-overzetten/subdomain \
  -H 'Content-Type: application/json' -d '{"enabled":true}'
```

Een latere versie uploaden gaat met dezelfde `PUT`, maar **zonder** het stuk
`migrations` (de klassen bestaan dan al). Het adres staat in `overzetAdres()` in
`src/70-ouderdeel.js`.

## Testen

`npm run test:overzetten` draait de Worker op kaal Node met nagebootste Durable
Objects. `npm run test:ouder` zaak T gaat door de bladen in het spel, met een
nagebootste Worker. De echte weg (twee toestellen) moet je op een toestel
nakijken: workers.dev is vanaf de testmachine niet bereikbaar.
