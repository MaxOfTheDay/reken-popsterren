/* ================= De kaart: welke wereld, en waar de weg loopt ============
   Hier houdt de sterrenkeuze op en begint de rékenkant van de wereldkaart. Geen
   scherm, geen animatie: alleen wat een wereld uit WORLDS in vormen omzet.

     welke wereld    viewWorldIdx + showWorld -- de enige plek die de kaart naar
                     een andere wereld laat kijken
     de haltes       worldNodes / defaultNodes -- percentages binnen één kader
     de weg          roadPoints, roadParts, roadD, worldCurve -- de slinger
                     erlangs, met per stuk een eigen stuurpunt
     het streeppatroon roadDashArray -- zodat er op élke halte een streepje valt
     de maten        ART_W/ART_H, ZONE, VB_W/vbx/vby

   ALLES REKENT IN PROCENTEN VAN DE TEKENING, en dat is de hele reden dat de weg
   op elk toestel over de achtergrond klopt: kader, tekening, weg en haltes
   schalen samen mee, en er wordt nergens iets opgemeten. Draaien of een ander
   vensterformaat kost dus geen herberekening.

   Eén uitzondering, en hij staat er met opzet als parameter bij: roadDashArray
   heeft een echte <svg> nodig om padlengtes te meten (getTotalLength). Die krijgt
   hij mee; hij zoekt er zelf nooit een op.

   Dit blok heeft geen enkele wereld-toestand nodig behalve WORLDS, en dat is
   waarom er drie dingen op leunen: de kaart (renderTourMap), de reis en de
   wereldstudio. Verander hier iets en je verandert die drie tegelijk.
   ========================================================================== */

/* Toont de fade-randen alleen aan de kant waar nog verder te scrollen valt
   (gedeeld door de kleedkamer-tabbladen en de sterrenrij van het ouderdeel).

   Deze twee horen eigenlijk niet in dít bestand -- ze gaan over een schuivende
   rij en niet over de vormleer van de wereldkaart. Ze stonden hier al toen de
   kaartmaths een eigen bestand kreeg, en ze uit elkaar trekken zou erger zijn
   dan ze samen op de verkeerde plek laten staan. Zet ze samen goed als er ooit
   een bestand voor schuifrijen komt. */
function updateFades(el) {
  const max = el.scrollWidth - el.clientWidth;
  el.classList.toggle('can-left', el.scrollLeft > 2);
  el.classList.toggle('can-right', el.scrollLeft < max - 2);
}
/* Dezelfde randen, maar dan aan de scroll van een rij gehangen -- achter een rAF,
   want updateFades leest scrollWidth en clientWidth en dwingt daarmee de opmaak
   af, en een scrollende vinger vuurt dat tientallen keren per seconde.

   Het klemmetje hoort bij het élement en niet bij de functie: er zijn twee rijen
   (de kleedkamer en het ouderdeel) en er kunnen er meer komen. Eén gedeelde vlag
   zou betekenen dat de ene rij de andere stil kan zetten -- vandaag onmogelijk
   omdat ze op verschillende schermen staan, maar dat is geen eigenschap waar je
   een klemmetje op wilt bouwen.

   Wie de rij ná een hertekening meteen wil bijwerken roept updateFades zelf aan;
   dat blijft synchroon, net als bij kopOpzij. */
function fadesVolgen(el) {
  let wacht = false;
  el.onscroll = () => {
    if (wacht) return;
    wacht = true;
    requestAnimationFrame(() => { wacht = false; updateFades(el); });
  };
}

/* De kaart toont één wereld tegelijk, volledig in beeld -- er valt niets te
   scrollen. Alle haltes staan op percentages binnen één kader met een vaste
   beeldverhouding (zie .world-frame). Dáárom klopt de weg op elk toestel met de
   achtergrondtekening: de weg wordt getekend uit dezelfde percentages als de
   haltes, en kader, tekening, weg en haltes schalen samen mee. Er wordt niets
   opgemeten, dus er is ook geen herberekening nodig bij draaien of resizen. */

// Reservekaart: een wereld zonder eigen haltelijst krijgt een slingerend pad van
// onder naar boven. Zo is een wereld al speelbaar vóórdat zijn tekening klaar is.
function defaultNodes(n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = n > 1 ? i / (n - 1) : 0;
    // Eén doorlopende S: naar rechts, terug naar links, en weer terug. Een snellere
    // slinger (elke halte de andere kant op) ligt wiskundig netter uit elkaar, maar
    // tekent een zigzag -- de bocht bij elke halte wordt dan zo scherp dat de weg
    // als losse rechte stukken leest. Deze frequentie houdt de curve vloeiend; de
    // ruimte tussen de haltes komt van de verticale spreiding hieronder.
    // y van 80% tot 25%: ruim binnen de veilige zone (zie ZONE). Die loopt sinds de
    // kop opzij stapt door tot 14%, maar de standaardslinger blijft bewust op
    // ZONE.y0kop: dit is de opmaak van een wereld die nog géén tekening heeft, en
    // daar is niets te winnen met een halte die de bovenbalk laat dimmen.
    //
    // De onderrand stond op 82 -- de ondergrens van de zone zelf -- en dat is precies
    // één pixel te ver. ZONE.y1 is opgemeten tegen de navigatiebálk, maar op dezelfde
    // plek zweeft ook de pil "⟲ terug naar je eigen wereld", strak boven die balk.
    // De eerste halte van de slinger komt op x 60,1 uit, dus vrijwel midden onder, en
    // op een kort scherm (iPhone SE, 375x667) verdween het sterrentabje daar precies
    // achter die pil -- zie test 7f. Twee procent hoger geeft 8px lucht en verandert
    // verder niets: de slinger is de terugval voor werelden zónder eigen haltes, en
    // alle zes geschreven werelden zetten die zelf.
    //
    // Niet verder omhoog dan dit, en dat is geen smaak: de verticale stap van de
    // slinger (55% / 7 stappen = 13,97cqw) is de krápste afstand tussen twee haltes
    // die er in het hele spel bestaat, en dus de bovengrens voor de hoogte van een
    // raakvlak (zie .tour-stop::before). Elke procent die deze reeks korter wordt,
    // gaat rechtstreeks van dat raakvlak af.
    out.push({ x: 50 + Math.sin(i * 0.9 + 0.4) * 26, y: 80 - t * 55 });
  }
  return out;
}
// De haltes van een wereld, als percentages binnen het kader (0..100).
function worldNodes(w) {
  const given = w.world.nodes;
  return (given && given.length === w.levels) ? given : defaultNodes(w.levels);
}
/* De maat van een wereldtekening, en meteen de viewBox van de weg.

   Dat die twee hetzelfde móéten zijn was een stille aanname, en hij klopte niet:
   de viewBox stond op 1080x1840 terwijl het kader 1:2 was. Een SVG schaalt zijn
   viewBox standaard met preserveAspectRatio="xMidYMid meet" -- dus één uniforme
   schaal, gecentreerd, met ruimte over. De weg werd daardoor in de middelste 719
   van de 844 pixels geperst terwijl de haltes de volle hoogte gebruikten. Gemeten:
   de weg liep er tot 42px naast op een telefoon en 77px op een tablet, het ergst
   bij de eerste en de laatste halte en bijna nul in het midden -- precies het
   patroon van een samengeknepen middenstuk.

   (De haltes staan in procenten van het káder, de weg in viewBox-eenheden. Zolang
   die twee stelsels dezelfde verhouding hebben vallen ze samen, en anders niet.)

   9:16 en niet 1:2, omdat dat de verhouding is die beeldgeneratoren maken: anders
   snijdt de studio bij het inlezen blind 11% van de breedte weg, en die stroken
   zijn op een tablet -- waar de hele breedte in beeld komt -- voorgoed weg. Één
   plek om te wijzigen; de kaart, de weg en de studio volgen vanzelf. */
const ART_W = 1215, ART_H = 2160;

/* De veilige zone voor haltemiddelpunten, in procenten van de tekening. Eén plek:
   de standaardslinger hierboven, de stippellijn in de studio en de controle vooraf
   lezen 'm alle drie hier.

   Opgemeten over acht toestellen. Elke rand wordt door een ánder toestel bepaald,
   en nooit door het ontwerpdoel:
     x 18,5   een 21:9-telefoon (412x961) snijdt het meest van de zijkanten
     y 13,97  een kleine telefoon (320x568): daar is de vaste 62px kop de grootste
              hap van het scherm, en de bovenste stiprand moet er net onderuit
     y 82,3   een iPhone SE (375x667): een vaste balk van 82px op een kort scherm,
              en die kaart schuift niet, dus er valt niets onderuit te halen

   y0 stond lang op 23. Dat was niet de stip maar de ster: zij staat bóven haar
   halte en is bijna 11% van het kader hoog, dus haar kruin raakte de pillen. Die
   11% is een vaste hap op élk toestel -- de kop zelf is maar 6,5 tot 10,9% -- en
   was daarmee twee derde van de bovenmarge. Ze mag nu gewoon vóór de pillen komen:
   die stappen opzij zodra ze er tegenaan staat (zie kopOpzij). Wat overbleef was
   de eis dat de stip zelf aanraakbaar blijft, en dat was 14%.

   FASE 4F -- terug naar 18. Puur de stip aanraakbaar houden gaf haar bijna geen
   lucht meer boven de halte (test 7c-bis dwong de zak tot 7,8cqw om haar kruin
   nog op het scherm te houden), en dat drukte haar half ín de halte in plaats
   van erboven. Geen van de zes geschreven werelden komt in de buurt: hun hoogste
   halte staat op zijn scherpst op 20,7% (Junglewereld). 18 laat dus alles wat er
   al staat ongemoeid en geeft de zak weer ruimte om terug te zakken.

   y0kop is geen grens maar een streep: boven die lijn dimt de bovenbalk op minstens
   één toestel. Alleen de studio en de tekenbrief gebruiken 'm -- de dimming zelf
   wordt gemeten, niet uit dit getal afgeleid. Hij stond op 23 toen de ster 13,1cqw
   was, en op 25 toen ze 16,4cqw was; FASE 4F liet haar weer dieper in de halte
   zakken (zie hierboven) zonder haar kleiner te maken, dus reikt ze opnieuw verder
   boven haar halte uit dan toen -- gemeten (test 7c-bis) komt de streep nu op 28.
   Naar binnen afgerond. Zie docs/WORLD-ART-BRIEF.md §2. */
const ZONE = { x0: 19, x1: 81, y0: 18, y1: 82, y0kop: 28 };
// Percentage -> coördinaat in de viewBox van de weg-SVG (zelfde stelsel als de
// tekening, zodat de weg er exact overheen valt).
const VB_W = ART_W, VB_H = ART_H;
const vbx = x => x / 100 * VB_W, vby = y => y / 100 * VB_H;

/* De weg slingert méér dan de haltes zelf. Een curve dóór alleen de haltes is
   namelijk zo recht als de haltes toevallig liggen -- en drie haltes op een rij
   liggen al snel bijna op één lijn, waardoor de weg als een liniaal leest.
   Daarom krijgt elk stuk tussen twee haltes een stuurpunt dat loodrecht op dat
   stuk naar buiten ligt, om en om naar links en rechts. De haltes blijven exact
   waar ze staan -- ook als ze straks met de hand op de richels van een tekening
   gezet zijn -- maar de weg ertussen bolt. */
const ROAD_BOW = 0.17;
// Waar het stuurpunt van stuk i vanzelf komt te liggen: loodrecht op dat stuk,
// om en om naar links en rechts, en binnen het kader geklemd.
function defaultControl(a, b, i) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const s = (i % 2 ? 1 : -1) * ROAD_BOW * len;
  return {
    x: Math.max(VB_W * .05, Math.min(VB_W * .95, (a.x + b.x) / 2 + (-dy / len) * s)),
    y: Math.max(VB_H * .03, Math.min(VB_H * .97, (a.y + b.y) / 2 + (dx / len) * s)),
  };
}
/* De punten waar de weg doorheen loopt: halte, stuurpunt, halte, stuurpunt, ...
   `curve` is de eigen stuurpuntenlijst van een wereld (percentages, net als de
   haltes) en heeft er één minder dan er haltes zijn. Ontbreekt hij, dan wordt
   elk stuurpunt berekend -- zo werkt een wereld zonder dat er iets ingesteld is,
   en kun je in de studio alsnog elk stuk apart om een rots heen buigen. */
function roadPoints(pts, curve) {
  if (pts.length < 2) return pts;
  const out = [pts[0]];
  for (let i = 0; i < pts.length - 1; i++) {
    const c = curve && curve[i]
      ? { x: vbx(curve[i].x), y: vby(curve[i].y) }
      : defaultControl(pts[i], pts[i + 1], i);
    out.push(c);
    out.push(pts[i + 1]);
  }
  return out;
}
/* De weg als één reeks bezier-stukken plus het gereedschap om er een deel van te
   nemen. smoothPath kijkt naar de buurpunten, dus een korter pad ópnieuw berekenen
   gaf een ander laatste stuk: het gouden (afgelegde) stuk lag dan net níet op het
   grijze. Nu is het gouden pad letterlijk een voorvoegsel van dezelfde d.

   Elk stuk weg tussen twee haltes is precies twee C-opdrachten: halte → stuurpunt
   → halte. */
function roadParts(pts, curve) {
  const d = count => count >= 2 ? smoothPath(roadPoints(pts.slice(0, count), curve)) : '';
  const heel = d(pts.length);
  const m = /^M[^C]*/.exec(heel);
  return { start: m ? m[0] : '', cs: heel.match(/C[^C]*/g) || [] };
}
// De d van de weg tot en met de zoveelste halte (gebruikt voor zowel het hele
// pad als het afgelegde gouden stuk, zodat die twee gegarandeerd samenvallen).
function roadD(pts, count, curve) {
  if (count < 2) return '';
  const parts = roadParts(pts, curve);
  return parts.start + parts.cs.slice(0, (count - 1) * 2).join('');
}

/* Een streeppatroon dat précies op de weg past.

   De weg is gestippeld, en wáár een streepje viel was tot nu toe toeval: 26 aan,
   34 uit, vanaf het begin doorgeteld. Bij sommige haltes hield de stippellijn
   daardoor tot 11px vóór de rand van de halte op. Het pad liep er wel degelijk
   doorheen -- gemeten 0,2 viewBox-eenheid van het middelpunt -- maar omdat de
   halte de weg over een straal van 67 eenheden afdekt, zag je hem niet aankomen.
   Dat las als "de weg raakt de halte niet", en per halte anders.

   Nu krijgt elk stuk weg zijn eigen patroon: n gaten en n+1 streepjes die samen
   exact de lengte van dat stuk zijn. Dus altijd een streepje óp beide haltes,
   op elk toestel en bij elke bocht die je in de studio trekt. */
const DASH_ON = 26, DASH_OFF = 34;
function roadDashArray(svg, pts, curve, count) {
  if (count < 2) return '';
  const parts = roadParts(pts, curve);
  const probe = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  svg.appendChild(probe);
  const tot = [0];
  for (let k = 2; k <= count; k++) {
    probe.setAttribute('d', parts.start + parts.cs.slice(0, (k - 1) * 2).join(''));
    tot.push(probe.getTotalLength());
  }
  probe.remove();
  const uit = [];
  const r = DASH_OFF / DASH_ON;
  for (let i = 0; i + 1 < count; i++) {
    const len = tot[i + 1] - tot[i];
    if (!(len > 0)) continue;
    const n = Math.max(1, Math.round((len - DASH_ON) / (DASH_ON + DASH_OFF)));
    const streep = len / (n + 1 + r * n), gat = streep * r;
    for (let j = 0; j <= n; j++) {
      // het eerste streepje van een stuk sluit aan op het laatste van het vorige:
      // samen één streepje dwars óver de halte, die het toch afdekt
      if (j === 0 && uit.length) uit[uit.length - 1] += streep;
      else uit.push(streep);
      if (j < n) uit.push(gat);
    }
  }
  uit.push(0);   // even aantal, anders herhaalt SVG de lijst dubbel
  return uit.map(v => v.toFixed(1)).join(' ');
}
// De stuurpunten van een wereld in percentages -- berekend waar ze niet gezet zijn.
function worldCurve(w) {
  const pts = worldNodes(w).map(n => ({ x: vbx(n.x), y: vby(n.y) }));
  const own = w.world.curve || [];
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const c = own[i] ? { x: own[i].x, y: own[i].y }
      : (d => ({ x: d.x / VB_W * 100, y: d.y / VB_H * 100 }))(defaultControl(pts[i], pts[i + 1], i));
    out.push(c);
  }
  return out;
}

/* Één plek die de kaart naar een wereld laat kijken.

   Dit stond vier keer los in het bestand als hetzelfde drietal: viewWorldIdx zetten,
   renderMapTitle() en renderTourMap(). Dat drietal móét bij elkaar blijven -- de kop
   en de kaart lezen allebei viewWorldIdx, dus één vergeten regel laat de pil een
   andere wereld noemen dan er onder staat. Vandaar één functie, en niet vier keer
   dezelfde drie regels.

   Dit is ook waar toekomstig overgangswerk (kaart → wereld, wereld → wereld) thuis
   hoort: elke wereldwissel loopt hier langs. De functies zelf blijven bestaan --
   runTravel gebruikt renderTourMap nog apart voor de tussenstand vóór de animatie,
   en de wereldstudio hangt zich aan renderTourMap op.

   travelFrom > 0 = de tussenstand vlak vóór de reis-animatie (zie renderTourMap). */
function showWorld(idx, travelFrom) {
  /* Een directe wisseling breekt een lopende wereldreis af. Dat gebeurt als een
     kind midden in een overgang op de navigatiebalk of de terugknop drukt: dan
     staat er straks een kaart van wereld A met de kop van wereld B, en die twee
     mogen het nooit oneens zijn. stopWereldReis ruimt de schaduwlaag op en zet
     alles terug; hij is bewust leeg als er geen reis loopt.

     wereldCamera roept showWorld aan vóórdat hij zijn eigen reis aanmeldt, dus
     deze regel breekt nooit de reis af waar hij zelf bij hoort. */
  stopWereldReis();
  // Binnen de lijst blijven: worldForIndex geeft buiten de lijst null terug (fase
  // 4A -- er is geen verzonnen wereld meer om op terug te vallen), en de kaart
  // heeft altijd een wereld nodig om te tekenen.
  viewWorldIdx = Math.max(0, Math.min(WORLDS.length - 1, idx | 0));
  renderMapTitle(P(), travelFrom || 0);
  renderTourMap(travelFrom || 0);
  preloadNextWorldArt();
  preloadBuurwerelden();
}
