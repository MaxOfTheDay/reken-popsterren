# Diamanten — wat ze waard zijn

Doorlichting van de diamanteneconomie, fase 5B — bijgewerkt in oktober 2026 met
11 werelden (zie §6). Alle getallen komen uit de formules
in `index.html` zelf (`submitAnswer`, `endLevel`, `checkRankUp`, `onMemMatch`) en uit
de catalogus `ITEMS`; er is niets geschat waar het uit te rekenen viel.

De rolverdeling waar dit document van uitgaat, en die niet vervaagd mag worden:

| munt | zegt | komt van |
|---|---|---|
| ⭐ sterren | hoe goed ik speelde | een show afmaken |
| 💎 diamanten | wat ik zelf mag kiezen | spelen, in kleine porties |
| 🎁 wereldbeloning | waar ik geweest ben | een wereld uitspelen |
| 🏆 trofee | wat ik beheers | een mijlpaal halen |

Diamanten kopen **alleen** optionele kleedkamerspullen. Ze kopen geen werelden, geen
shows, geen herkansingen, geen moeilijkheid, geen trofeeën en geen wereldbeloningen.

---

## 1. Waar diamanten vandaan komen

| bron | hoeveel | herhaalbaar | waar |
|---|---|---|---|
| goed antwoord | 2 💎 | ja, elke vraag | `submitAnswer` |
| … in één keer goed, binnen de spotlight (12 s) | +1 💎 | ja | idem |
| … derde op een rij | +2 💎 | ja, elke 3 | idem |
| gouden vraag (kans 50% per show, hoogstens één) | × 3 op die vraag | ja | idem |
| applaus (publieksmeter vol) | +5 💎 | 1–2 per show | idem |
| rest van de publieksmeter | +1 💎 per volle 25% | 1× per show | `endLevel` |
| sterren van de show | ⭐ × 5 💎 (5 / 10 / 15) | ja, ook bij overdoen | `endLevel` |
| memory (tellen én rekenen, 4–6 paren) | 2 💎 per paar + 3 💎 | ja | `onMemMatch` |
| verse ster | 30 💎 | eenmalig | `defaultProfile` |

De ster-status (rang omhoog: 10 tot 60 💎, samen 225) stond hier ook; die is in
oktober 2026 met pensioen gegaan, zie §6.

Trofeeën geven **geen** diamanten, en er is er sinds fase 5C ook geen enkele meer
die naar je saldo kijkt. De twee spaar-trofeeën (`rich` 100 💎, `diamond250` 250 💎)
zijn met pensioen: ze beloonden precies het tegenovergestelde van waar deze munt
voor is. Diamanten zijn er om uit te geven in de kleedkamer; een prijs voor een
hoog saldo leert een kind dat sparen beter is dan kiezen. Er blijft één koop-trofee
over (`shopper`, 10 gekochte spulletjes), en die kijkt naar wat je hébt, niet naar
wat je over hebt.

## 2. Wat één show opbrengt

Een show in de rekenmodus is 8 vragen (`DEFAULT_PERLEVEL`), in de telmodus 5.
Doorgerekend met bovenstaande formules, gemiddeld over wel/geen gouden vraag:

| hoe het ging | 💎 per show | ⭐ |
|---|---|---|
| foutloos en snel | 55 | 3 |
| foutloos, rustig tempo | 47 | 3 |
| één hapering | 48 | 2 |
| twee haperingen | 46 | 2 |
| drie haperingen | 45 | 2 |
| telmodus (5 vragen), goed | 45 | 3 |

**≈ 45 💎 per show**, en dat is opvallend vlak: tussen "het ging moeizaam" en
"foutloos en snel" zit maar 10 💎 (tot drie haperingen zijn het twee sterren, zie `showStars`). Dat is precies goed voor een gezinsspel — moeite
loont, maar een kind dat worstelt loopt niet leeg.

Een memory-potje levert 9–13 💎 in ~1 minuut; een show ~45 💎 in 2–4 minuten. Grinden
op memory is dus langzamer dan gewoon spelen. Er is geen grind-sluiproute.

## 3. Wat er te koop is

94 koopbare spulletjes, samen **5885 💎** (stand oktober 2026). Vijf gratis
startspullen komen daar nog bij.

| categorie | in de winkel | goedkoopste | duurste | mediaan | som |
|---|---|---|---|---|---|
| kleren | 14 | 0 | 150 | 60 | 736 |
| schoenen | 9 | 0 | 80 | 24 | 276 |
| kapsels | 12 | 0 | 90 | 40 | 448 |
| microfoons | 12 | 15 | 100 | 55 | 660 |
| muziek | 9 | 28 | 130 | 60 | 573 |
| accessoires | 15 | 25 | 180 | 35 | 720 |
| dieren | 27 | 22 | 250 | 75 | 2472 |

Daarnaast één wereldschat per wereld. Die hebben **geen prijs** en zijn niet te
koop — alleen te verdienen door de wereld uit te spelen.

**Podia** koop je niet los. Elk wereldpodium is van jou zodra je zijn drie stukken
hebt: de wereldschat (alleen te verdienen) plus twee gewone winkelstukken (samen
± 145 tot 325 💎). Dat is afgeleid uit `p.owned`; zie "= Podia" in `src/25-kern.js`.
De `price` op een podiumregel in `ITEMS` is een overblijfsel uit de oude winkel en
wordt nergens gebruikt. Het podium mét zijn schat is meteen de **prijs van de
wereld** die het spel overal tekent (kaart, reis, Podia): schat → podium → goud
voor een perfecte wereld, zie "= De prijs van een wereld".

## 4. Het ritme

- Mediaanprijs ≈ 55 💎 ≈ **iets meer dan één show**. Elke categorie heeft een
  instap onder het startsaldo van 30 💎.
- De droomspulletjes (Draakje en Pauw 250, Eenhoorn 200, diadeem 180) ≈ **4 tot
  6 shows** — het grootste deel van een wereld sparen. Daar is *Mijn wens* voor
  (zie §6).
- Eén wereld = 8 shows ≈ **400 💎**, en dat schaalt niet mee: elke wereld betaalt
  hetzelfde. Wat wél moet meegroeien is de winkel — zie de vuistregel hieronder.

Gesimuleerd over de 11 werelden van nu (88 shows, de echte formules, 2000 runs):

| profiel | 💎 per show | na wereld 1 | na wereld 11 |
|---|---|---|---|
| sterk (95% in één keer, snel) | 53 | ± 450 | ± 4500 |
| gemiddeld (85%, meestal snel) | 48 | ± 400 | ± 4000 |
| beginner (72%, traag) | 42 | ± 360 | ± 3500 |
| telmodus (5 vragen) | 40 | ± 345 | ± 3350 |
| gemiddeld + de helft van de niet-3★-shows overgedaan | 62 | ± 520 | ± 5450 |

Een gemiddeld kind kan aan het eind zo'n twee derde van de winkel betalen, een
kind dat veel overspeelt bijna alles. Dat is de cadans die we willen: spelen →
sparen → kiezen → meteen zien, en er is altijd nog iets om naar te verlangen.

**Vuistregel voor een nieuwe wereld:** 4 à 7 winkelstukken erbij, samen ± 500 💎,
waarvan één van 150 💎 of meer (zie `docs/UITBREIDEN.md`). Zonder dat raakt de
winkel leeg: met 11 werelden en de oude catalogus (78 stuks, 4555 💎) kon een kind
dat overspeelt in wereld 9 alles al hebben.

## 5. Wat er níét veranderd is, en waarom

Fase 5B heeft **geen enkele prijs, opbrengst of bonus aangeraakt**. De doorlichting
vond geen prijs die uit de toon valt, geen categorie zonder betaalbare instap, geen
onbereikbaar spulletje en geen obsolete diamantenbron. Bestaande saldi en
inventarissen blijven dus exact geldig.

Wat wél opviel, als materiaal voor een productbeslissing (níét autonoom uitgevoerd):

1. **Dieren zijn een derde van de winkel** (1537 van 4555 💎) en de enige categorie
   met echt duur spul. Wie dieren niet leuk vindt, ziet een veel kleinere winkel.
2. **De accessoires zijn emoji, de wereldbeloningen zijn tekeningen.** Daardoor is in
   die ene categorie het verdiende spulletje altijd mooier dan het gekochte — precies
   het onderscheid dat we níét op "mooier" willen leggen maar op "anders te krijgen".
   De goedkoopste verbetering is drie of vier bestaande dure accessoires (diadeem,
   kroontje, bloemenkrans) dezelfde getekende behandeling geven als de zes
   beloningen. Geen nieuwe items, wel nieuw tekenwerk.
3. **Microfoons hebben geen goedkope instap**: 30 💎 is precies het startsaldo, terwijl
   elke andere categorie er ruim onder blijft. Eén microfoon van ~15 💎 zou die
   categorie even toegankelijk maken als de rest.

Geen van drieën is dringend, en alle drie zijn ze een keuze over inhoud en niet over
balans.

## 6. Oktober 2026: elf werelden

Met 6 werelden was de catalogus ruim de helft van wat een kind kon verdienen. Met
11 werelden was dat 93% (gemiddeld kind) tot alles in wereld 9 (wie overspeelt),
en het Draakje en de Pauw waren al in wereld 1 samen te betalen. Wat er veranderd
is:

1. **16 nieuwe winkelstukken**, allemaal emoji (geen tekenwerk): tien dieren
   (Aapje, Krabbetje, Rendiertje, Olifantje, Octopus, Otter, Langnek,
   Ruimtevriendje, T-rex), vier accessoires (Kersjes, Ankerspeldje, Schelpje,
   Maantje), twee emoji-microfoons (IJsje, Vuur) en een **rode microfoon van
   15 💎** — de goedkope instap die microfoons nog misten (zie §5, punt 3).
2. **Zes droomspulletjes duurder**: Draakje 180 → 250, Pauw 200 → 250, Eenhoorn
   130 → 200, diadeem 120 → 180, regenboogoutfit 110 → 150, DJ-set 105 → 130.
   Alles onder de 100 bleef staan: dát is de laag die van één show één keuze maakt.
3. **De ster-status is met pensioen.** De ladder was een derde voortgangsmeter
   naast de kaart en de kast, en stopte op 125 sterren (rond wereld 7) terwijl er
   264 zijn. Zijn 225 💎 over de hele tournee (± 5% van het inkomen) mist niemand.
4. **Mijn wens.** Een hartje in de lade zet één te duur spulletje vast als wens;
   de 💎-pil (kaart, Werelden, kast én kleedkamer) toont dan zijn emoji of eigen
   tekening en een streepje dat volloopt, en wordt goud zodra je hem kunt kopen —
   een tik brengt je naar dat spulletje, kopen doe je daar. Het 💎-vakje op het
   eindscherm draagt hetzelfde streepje; is er genoeg, dan gaat de
   Kleedkamer-knop er meteen heen. Eén veld in de opslag (`p.wens`), dat kopen
   weer opruimt.

Bewust níét gedaan: spullen per wereld laten vrijkomen. De winkel blijft helemaal
open. Wél horen sinds de podia twee winkelstukken per wereld bij zijn podium; ze
blijven gewoon los te koop, het podium is wat je krijgt als je de set rond hebt.
