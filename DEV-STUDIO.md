# Dev Studio

Eén scherm om het spel in te ontwikkelen, na te kijken en te keuren: links de
bedieningen, rechts het échte spel op telefoonmaat.

```
npm run studio
```

Dat is alles. De server start, haalt op de achtergrond de laatste git-informatie
op en opent <http://localhost:8099/studio>.

---

## 1. De eerste keer

Je hebt alleen **node 16 of nieuwer** nodig. Geen `npm install`, geen bouwstap —
de studio draait op de node die je al hebt, net als het spel zelf.

```
git clone https://github.com/MaxOfTheDay/reken-popsterren
cd reken-popsterren
npm run studio
```

`npm install` is er alleen voor de browsertests (`npm test`), niet voor de studio.

Is poort 8099 bezet, dan zegt de studio dat, met het alternatief erbij:

```
PORT=8100 npm run studio
```

## 2. Gewoon starten

```
npm run studio      de studio, en hij opent zelf een venster
npm run preview     hetzelfde, zonder venster (handig in een tweede terminal)
```

Rechtsboven staat altijd wat er draait:

```
main · a83f219 · gelijk
claude/wereld-7 · c91e220 · 3 nieuw op de verte
PR #42 · 8f1c0aa · 2 open wijzigingen
```

Die regel wordt elke halve minuut ververst, dus een `git checkout` in een andere
terminal valt vanzelf op.

**Op je telefoon** (zelfde wifi) staan de korte paden in de terminal:
`192.168.x.x:8099/t` is de kaart, `/t4` de kaart meteen in wereld 4, `/ts` de
wereldstudio.

## 3. Een andere tak of PR testen

In **Draaiende versie**:

1. *Haal op* — `git fetch --all --prune`. Raakt je werkmap niet aan.
2. Kies in de lijst: **Main**, een **open PR** (met titel), of een **tak**.
3. *Wissel*.

Een PR wordt met een losse kop uitgecheckt: kijken, niet doorwerken. Een tak
wordt gewoon uitgecheckt en zo nodig eerst lokaal aangemaakt.

**Staat er werk open in je werkmap, dan weigert de wissel.** De studio doet nooit
een reset, een stash of een force — leg eerst vast en wissel daarna.

Zonder verbinding met GitHub blijven de PR-titels weg en werkt de rest gewoon;
er staat dan bij waaróm. Een `GITHUB_TOKEN` in je omgeving verhoogt de
bezoeklimiet van GitHub.

## 4. Terug naar de laatste main

Knop **Terug naar main** (of kies *Main* en *Wissel*). Dat is
`git checkout main` plus een fast-forward naar `origin/main`.

Loopt je eigen tak achter, dan werkt **Werk bij** hem bij — ook alleen
fast-forward. Lopen tak en verte uiteen, dan zegt de studio dat: samenvoegen is
een keuze en hoort niet achter een knopje.

---

## De rest van het scherm, in het kort

| vak | waarvoor |
|---|---|
| **Werelden** | alle werelden, hun shows, kaart, zaal, beloning en wat er niet klopt. *Open wereldstudio* gaat naar het tekenpaneel (`?debug&mapedit`), *Wereld toevoegen* opent dat paneel meteen in "een wereld erbij", *Keuringen* draait de vier snelle controles. |
| **Testbeeld** | het spel in een stand zetten zonder ernaartoe te spelen: nieuwe speler, halverwege, laatste show, perfect, op slot, alles uit, met of zonder diamanten. De stand geldt voor de wereld die je in de lijst aantikte. |
| **Openen** | rechtstreeks naar een scherm: kaart, werelden, show, einde, kleedkamer, trofeeën, voor ouders. |
| **Beeldkeuring** | toestelmaten (Pixel 10 voorop) en drie schakelaars: randen, raster, animaties uit. |
| **Gereedschap** | herladen, opslag/cache/servicewerker van het kijkvak leegmaken, het spel zonder vlaggen, en de servicewerker aanzetten om de bijwerkstroom van de PWA na te kijken. |

Alles in het kijkvak draait op `?debug&demo`, en dat **grendelt de opslag**: geen
enkele knop hier kan de voortgang van een echt kind raken. De enige uitzondering
is *Gewoon spel* — die draait het spel zonder vlaggen en schrijft dus wél weg,
maar naar de opslag van `localhost`, niet naar die van een geïnstalleerde app.
*Maak schoon* veegt die weer leeg.

Een wereld toevoegen doe je in de wereldstudio: naam geven, tekening erop,
kleuren accepteren, haltes zetten, beloning kiezen, standen doorlopen, *Zet in
het spel*. Zie `docs/UITBREIDEN.md`.
