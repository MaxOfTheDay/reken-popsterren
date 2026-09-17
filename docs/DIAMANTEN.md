# Diamanten — wat ze waard zijn

Doorlichting van de diamanteneconomie, fase 5B. Alle getallen komen uit de formules
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
| extra show (publieksmeter vol) | +5 💎 | 1–2 per show | idem |
| rest van de publieksmeter | +1 💎 per volle 25% | 1× per show | `endLevel` |
| sterren van de show | ⭐ × 5 💎 (5 / 10 / 15) | ja, ook bij overdoen | `endLevel` |
| rang omhoog | 10 / 15 / 20 / 30 / 40 / 50 / 60 💎 | nee, één keer per rang | `checkRankUp` |
| memory (telmodus) | 2 💎 per paar + 3 💎 | ja | `onMemMatch` |
| verse ster | 30 💎 | eenmalig | `defaultProfile` |

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
| twee haperingen | 41 | 1 |
| drie haperingen | 40 | 1 |
| telmodus (5 vragen), goed | 45 | 3 |

**≈ 45 💎 per show**, en dat is opvallend vlak: tussen "het ging moeizaam" en
"foutloos en snel" zit maar 15 💎. Dat is precies goed voor een gezinsspel — moeite
loont, maar een kind dat worstelt loopt niet leeg.

Een memory-potje levert 9–13 💎 in ~1 minuut; een show ~45 💎 in 2–4 minuten. Grinden
op memory is dus langzamer dan gewoon spelen. Er is geen grind-sluiproute.

## 3. Wat er te koop is

82 koopbare spulletjes, samen **4555 💎**. Vier daarvan zijn gratis startspullen.

| categorie | koopbaar | goedkoopste | duurste | mediaan | som |
|---|---|---|---|---|---|
| kleren | 14 | 0 | 110 | 60 | 696 |
| schoenen | 9 | 0 | 80 | 24 | 276 |
| kapsels | 12 | 0 | 90 | 40 | 448 |
| microfoons | 9 | 30 | 100 | 55 | 525 |
| muziek | 9 | 28 | 105 | 60 | 548 |
| accessoires | 11 | 25 | 120 | 35 | 525 |
| dieren | 18 | 22 | 200 | 80 | 1537 |

Daarnaast staan er zes wereldbeloningen in de accessoires. Die hebben **geen prijs**
en zijn niet te koop — alleen te verdienen door de wereld uit te spelen.

De twaalf podia staan nog in `ITEMS` (ze zijn het decor achter de pop) maar sinds
fase 1 niet meer in `CATS`: er is geen tab die ernaartoe wijst, dus er is geen
manier om ze te kopen. Hun prijzen zijn dode gegevens. `test/kleedkamer.test.js`
zaak B legt dat vast, zodat de tab niet stilletjes terug kan komen.

## 4. Het ritme

- Mediaanprijs ≈ 55 💎 ≈ **iets meer dan één show**.
- De duurste spulletjes (draakje 180, pauw 200) ≈ **4 shows**.
- Een verse ster (30 💎) kan in élke categorie meteen iets kiezen.
- De hele tournee is 48 shows → ≈ 2250 💎 spelen + 225 💎 rangbonussen + 30 💎 start
  ≈ **2500 💎**, oftewel iets meer dan de helft van de catalogus.

Dat is de cadans die we willen: spelen → sparen → kiezen → meteen zien. Eén show is
één keuze; alles hebben is een lange reis die ook na de laatste wereld doorloopt.

De "koop alles uit deze categorie"-trofeeën (alle kleren, alle dieren) waren daar
tot fase 5C het anker voor, en zijn nu met pensioen: ze veranderden van betekenis
zodra er één spulletje bijkwam, en ze maakten van de kleedkamer een afvinklijst.
Wat de kleedkamer trekt is de kleedkamer zelf — kiezen en meteen zien.

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
