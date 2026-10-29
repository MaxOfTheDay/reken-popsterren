/* ================= De hele tournee: de reis boven de werelden uit ===========
   FASE 4B. Hier stond de werelden-kiezer: zes rijen achter de wereldnaam in de
   kop, met een slotje achter wat nog niet mocht. Hij deed wat hij moest doen en
   hij las als een menu -- en precies dát was het probleem. Wat een kind op zo'n
   lijst niet kan zien is het enige wat er te zien valt: dat de werelden samen
   een réis zijn, dat er al een stuk van gelopen is, en dat het verder omhoog
   gaat.

   Wat er nu staat is dezelfde informatie als een plék. Eén baan van beneden naar
   boven, met de werelden eraan geregen als bestemmingen en de ster erop waar ze
   nu is. De wereldkaart blijft precies wat hij was (wélke show speel ik hier);
   dit scherm gaat over de laag erboven (waar ben ik in het geheel).

   DE VOORTGANG WORDT HIER ALLEEN GETEKEND. Elke stand komt uit fase 4A --
   worldAvailable, worldDone, continueWorld -- en de sterrenstand uit worldProgress,
   dezelfde teller waar de wereldbadge in de trofeeënkast op staat. Er wordt hier
   niets bewaard, niets afgeleid uit een plek op het scherm en niets
   vooruitgeschoven. Een bestemming kiezen zet de kaart op die wereld en verder
   niets: p.level, de sterren en de grens blijven staan waar ze stonden.

   WAT ER GEBEURT ALS ER EEN WERELD BIJKOMT: niets. De baan is een optelsom van
   stappen, de bestemmingen hangen aan die som, de route loopt er doorheen en de
   sfeer hangt aan de bestemmingen zelf. Wereld 7 is één regel in WORLDS; wereld
   30 net zo. Er staat nergens een coördinaat, een hoogte of een aanname die aan
   een aantal werelden vastzit -- reisBaan() hieronder is de enige plek waar
   maatvoering bestaat, en die rekent puur met indexen.                        */
const REIS = {
  amp: 11,        // hoe ver een bestemming van de middellijn staat (% van de kolom)
  golf: 0.86,     // hoe snel dat van kant wisselt -- één trage S, geen zigzag
  fase: 0.7,      // waar de slinger begint, zodat wereld 1 niet precies in het midden staat
  bocht: 9,       // hoever de route tússen twee bestemmingen uitbuigt (% van de kolom)
  rek: 0.05,      // hoeveel de afstand per wereld varieert (± deel van een stap)
  /* Hoe groot een bestemming is, per stand -- als deel van een gewone kaart. Deze
     getallen staan óók in het stijlblad (de clamps op .reis-halte.nu / .verder
     zijn 51vw / 40vw tegen 46vw voor een gewone), en dat is de enige
     plek waar dit bestand en dat blad hetzelfde moeten weten. Ze staan hier omdat
     de áfstand tussen twee bestemmingen ervan afhangt: twee kleine kaarten horen
     dichter bij elkaar te staan dan twee grote, anders gaapt het bovenin de reis --
     waar alles nog op slot en dus klein is. */
  maat: { nu: 1.11, open: 1, verder: .87 },
  /* De afstand tussen twee bestemmingen, in stappen:
       kaart * de gemiddelde maat van die twee + weg
     Twee gewone kaarten staan dus precies één stap uit elkaar, en alles wat kleiner
     is schuift naar rato dichter op elkaar. */
  kaart: 0.62, weg: 0.38,
  /* Stappen tussen de onderrand van de baan en de eerste bestemming. Stond op 0,85
     en dat is precies te krap: onderaan gescrold hield de onderste wereld nog maar
     een tiental pixels over boven de navigatiebalk. Dit is de enige maat die deze
     ronde verschoven is, en alleen daarvoor. */
  onder: 1.05,
  boven: 1.45,    // en tussen de laatste bestemming en de bovenrand: daar hangt de mist
  eenheid: 100,   // SVG-eenheden per stap (de y-as van de route)
  start: 0.6,     // waar de route vandaan komt: een half stapje onder wereld 1
  staart: 1.0,    // en hoe ver hij boven de laatste bestemming doorloopt, de wolken in
};
/* Waar een bestemming op de breedte staat, en waar de route ertussen uitbuigt.
   Allebei een sinus van de index, en met opzet geen toeval: dezelfde wereld staat
   altijd op dezelfde plek (ook na opnieuw tekenen), de route slingert zonder ooit
   te knikken, en wereld 7 krijgt vanzelf het volgende punt in dezelfde golf.

   De bestemmingen bewegen weinig (11%) en de route ertussen veel (9% dwars op een
   stap die maar half zo hoog is). Dat is de verhouding die het een wandeling maakt
   in plaats van een grafiek: de plekken liggen rustig, de wég slingert. Andersom --
   ver uiteen liggende kaarten met een rechte lijn ertussen -- leest als een
   organigram, en dan lopen de kaarten bovendien het scherm uit.                  */
function reisX(i) { return 50 + REIS.amp * Math.sin(i * REIS.golf + REIS.fase); }
/* De baan: waar elke bestemming staat, en hoe hoog het geheel wordt. Alles in
   stappen, zodat de CSS er calc(var(--reis-stap) * n) van kan maken en de maat zelf
   in het stijlblad blijft (waar hij van de kaartmaat afhangt en dus meeademt met
   het scherm).

   De stap varieert per wereld met een paar procent. Puur ritme: een reis waarop
   elke afstand exact gelijk is, leest als een liniaal. De uitslag is klein genoeg
   dat de ondergrens uit --reis-stap er nog onder blijft (zie daar).             */
function reisBaan(standen) {
  const maat = st => REIS.maat[st] || 1;
  const y = [];
  let h = REIS.onder;
  for (let i = 0; i < standen.length; i++) {
    if (i) {
      // de kaarten van dit paar bepalen hoeveel ruimte ze nodig hebben, en een
      // paar procent ritme zorgt dat de reis geen liniaal wordt
      const paar = (maat(standen[i - 1]) + maat(standen[i])) / 2;
      h += REIS.kaart * paar + REIS.weg + REIS.rek * Math.sin(i * 1.7 + 0.9);
    }
    y.push(h);
  }
  return { y, hoogte: h + REIS.boven };
}
/* De bestemmingen, in reisvolgorde (wereld 1 eerst, dus onderaan). Puur afgeleid,
   net als alles in fase 4A -- dit is de enige plek waar de standen van de reis
   worden bepaald, en ze komen allemaal ergens ánders vandaan:

     nu       hier ga je verder           continueWorld()   -- de grens, of de toegift
     verder   uitgebracht, nog niet aan de beurt
     open     te bezoeken                 positie op de kaart
     uit      uitgespeeld                 worldProgress().uit
     vol      álle sterren binnen         worldProgress().vol

   Hoevéél bestemmingen er staan komt uit laatsteZichtbareWereld(): alles wat af
   is plus een paar vooruit. Er stond hier ook een stand 'mist' voor een wereld die
   nog niet uitgebracht was -- een vraagteken in de wolken. Die is weg: een wereld
   die er voor een kind nog niet is, hoort er ook niet als vraagteken te staan. Wat
   er voorbij de horizon ligt zegt de mist bovenaan, en die zegt het zonder te
   tellen hoeveel het er zijn.

   De laatste twee zijn geen aparte stand maar een eigenschap: een bestemming kan
   tegelijk "hier ben je" en "vol" zijn (de toegift), en dan hoort ze allebei te
   laten zien. Vandaar losse vlaggen in plaats van één string.

   "Te bezoeken" is exact wat het op de kaart ook is: tot en met de wereld waar ze
   zelf staat. Verder vooruit kíjken mag, er heen reizen niet -- en dat is niet
   deze fase die dat beslist, dat deed de kiezer die hier stond al net zo.       */
/* Mag je naar deze wereld toe? Tot en met de wereld waar ze staat. Podia vraagt
   het ook (zie renderPodiumBar): een podium van verder vooruit mag je zien en
   passen, maar het brengt je niet naar een wereld waar de reis je niet heen laat. */
function wereldTeBezoeken(p, i) { return i >= 0 && i <= worldFor(hereLevel(p)).index; }
function reisPlaatsen(p) {
  const doel = continueWorld(p);
  /* Van wereld 1 tot de horizon, en altijd vanaf het begin. Dat "vanaf het begin"
     is geen luiheid maar een afspraak waar de rest op rekent: de plek van een
     bestemming ín deze lijst is zijn wereldnummer, en renderReis rekent daarmee
     uit welk stuk van de route al gelopen is (zie stuk()). Zou de reis ooit ook
     vanonderen inkorten, dan moet die som mee. */
  const ruw = WORLDS.slice(0, laatsteZichtbareWereld(p) + 1).map((w, i) => {
    const v = worldProgress(p, worldForIndex(i));
    const open = wereldTeBezoeken(p, i);
    const staat = i === doel ? 'nu' : !open ? 'verder' : 'open';
    return { i, world: w, staat, open,
             uit: v.uit, vol: v.vol,
             sterren: v.sterren, max: v.max, perfect: v.perfect, levels: v.levels,
             x: reisX(i) };
  });
  // pas als alle standen bekend zijn valt de baan uit te meten: de afstanden hangen
  // af van hoe groot de kaarten zijn, en dat hangt af van hun stand
  const baan = reisBaan(ruw.map(b => b.staat));
  ruw.forEach((b, i) => { b.y = baan.y[i]; });
  return { plaatsen: ruw, hoogte: baan.hoogte, doel };
}
// wat een schermlezer van een bestemming hoort -- de enige plek met tekst per stand
function reisLabel(b, doel) {
  const sterren = b.max ? `, ${b.sterren} van ${b.max} sterren` : '';
  if (b.i === doel) return b.world.name + ' — hier ben je nu' + sterren;
  if (!b.open) return b.world.name + ' — nog op slot';
  return b.world.name + (b.vol ? ' — helemaal vol' : b.uit ? ' — uitgespeeld' : '')
    + sterren + ', ga erheen';
}
/* Eén stip per show van een wereld, in showvolgorde -- dezelfde volgorde als de
   haltes op zijn wereldkaart. Drie standen, en alleen de eerste is goud:

     vol    drie sterren: deze show is perfect
     half   gespeeld, maar nog geen drie sterren: een gouden ríng, leeg van binnen
     nog    nog niet gespeeld: dof

   Hier stond een ster met een streepje dat volliep, en dat zei het verkeerde op
   precies de plek waar het ertoe doet: 22 van de 24 sterren is een streepje dat
   er vol uitziet, en dan ziet een kind niet dat er nog twee shows te halen zijn.
   Een lege ring tussen gouden stippen ziet ze wél, en die kan ze tellen -- zonder
   te lezen, en zonder dat er "PERFECT" op het scherm hoeft te staan. */
function reisStippen(p, w) {
  let html = '';
  for (let l = w.first; l < w.first + w.levels; l++) {
    const st = p.stars[l] || 0;
    html += `<i class="${st >= 3 ? 'vol' : st ? 'half' : 'nog'}"></i>`;
  }
  return html;
}
/* Het vonkje: een vierpuntige ster, getekend uit vier bolle bogen. */
const VONK = (cx, cy, r) => `M${cx} ${cy - r}q${r * .22} ${r * .78} ${r} ${r}`
  + `q${-r * .78} ${r * .22} ${-r} ${r}q${-r * .22} ${-r * .78} ${-r} ${-r}`
  + `q${r * .78} ${-r * .22} ${r} ${-r}z`;
/* Het ornament van een volle wereld: de ster van het spel, groot en in vol goud,
   met twee vonkjes ernaast. Hier stonden drie vonkjes en verder niets -- zie de
   noot bij .reis-glans waarom dat te weinig was: glinstering is licht, en licht
   zegt op dit scherm "hier ben je". De ster zegt waar het om gaat, en ze zegt het
   met precies het teken dat een kind de hele show door verzamelt.

   Een functie en geen const, omdat STER_PAD verderop in het bestand staat: een
   const leest hem dan bij het inladen -- te vroeg.
   Eén keer bouwen, daarna uit de la. */
let _reisGlans = '';
function reisGlansSVG() {
  if (!_reisGlans) _reisGlans = `<svg viewBox="0 0 30 30" aria-hidden="true">`
    // de ster staat in een geschaalde groep: STER_PAD is op 24x24 getekend
    + `<g transform="translate(3.1 2.6) scale(.84)">`
    + `<path class="rg-ster" vector-effect="non-scaling-stroke" d="${STER_PAD}"/></g>`
    + `<path d="${VONK(25.6, 6.6, 3.3)}" opacity=".9"/>`
    + `<path d="${VONK(4.6, 23.2, 2.4)}" opacity=".75"/></svg>`;
  return _reisGlans;
}
/* Een tik op een wereld die nog op slot zit. Hij brengt je nergens heen -- dat is
   de hele bedoeling van een slot -- maar hij zegt wél waaróm, en in één regel: de
   wereld waar ze nu staat is de wereld die eerst uit moet. Precies dezelfde zin als
   op een spulletje dat je nog moet verdienen ("Speel Muziekwereld uit").

   Het slotje schudt kort mee. Dat is de tikreactie: de kaart zelf drukt al in
   (.reis-halte:active), dus dit hoeft alleen te zeggen wélk ding hier "nee" zegt.
   Geen venster, geen uitleg, geen aftelling. */
function slotWereld(knop, doel) {
  sndClick();
  const slot = knop && knop.querySelector('.reis-zegel.slot');
  if (slot) {
    slot.classList.remove('nee');
    void slot.offsetWidth;
    slot.classList.add('nee');
    setTimeout(() => slot.classList.remove('nee'), 800);
  }
  slotToast(doel);
}
// De ene zin van een slot: de wereld waar ze nu staat moet eerst uit. Ook in Podia.
function slotToast(doel) {
  const w = WORLDS[doel];
  // één teken: het slotje. Het wereldicoon erachter was een tweede emoji in één regel.
  showToast(w ? `🔒 Speel eerst de ${esc(w.name)} uit` : '🔒 Nog niet', null, null, null, 2200);
}
/* De baan opbouwen. Alles hier komt uit reisPlaatsen() en uit de staphoogte in het
   stijlblad -- er wordt niets opgemeten, dus draaien, resizen of een wereld erbij
   vraagt geen enkele herberekening. */
function renderReis() {
  const p = P();
  const track = $('reis-track');
  const { plaatsen, hoogte, doel } = reisPlaatsen(p);
  const n = plaatsen.length;
  reisStopWaarnemer();
  track.innerHTML = '';
  track.style.setProperty('--reis-n', hoogte.toFixed(3));
  $('screen-journey').onscroll = reisScroll;
  telNu($('reis-diamonds'), p.diamonds);
  zetWensPil(p);   // dezelfde pil als op de kaart, met de wens erbij
  reisTerugVullen(WORLDS[doel]);

  /* De route. Tussen elke twee bestemmingen ligt een extra stuurpunt, om en om naar
     links en rechts uit de lijn: dát is wat een verbinding een wéggetje maakt. De
     bestemmingen zelf blijven exact staan waar ze staan.

     Vier lagen over hetzelfde traject (zie .reis-weg-* in het stijlblad): een heel
     flauw doorlopend spoor, de stippen van de hele route dof, het gelopen stuk in
     goud, en het láátste stuk -- van de vorige wereld naar waar ze nu is -- een
     tikje sterker. Alle vier uit dezelfde puntenlijst, met hetzelfde streeppatroon
     vanaf hetzelfde beginpunt: de stippen vallen dus precies op elkaar. */
  const totaalU = hoogte * REIS.eenheid;
  const yU = y => (hoogte - y) * REIS.eenheid;
  const punten = [{ x: reisX(-0.5), y: yU(plaatsen[0].y - REIS.start) }];
  plaatsen.forEach((b, k) => {
    if (k) {
      const vorige = plaatsen[k - 1];
      // dwars op het stuk, om en om -- en in de richting die de slinger tóch al op
      // wil, zodat de bocht de bestemmingen volgt in plaats van ertegenin te gaan
      const kant = (k % 2 ? 1 : -1) * REIS.bocht;
      punten.push({ x: (vorige.x + b.x) / 2 + kant, y: yU((vorige.y + b.y) / 2) });
    }
    punten.push({ x: b.x, y: yU(b.y) });
  });
  const laatste = plaatsen[n - 1];
  punten.push({ x: reisX(n - 1 + REIS.staart), y: yU(laatste.y + REIS.staart) });
  // index van wereld i in die lijst: het beginpunt, dan per wereld een bocht + een bestemming
  const stuk = i => 1 + Math.max(0, i * 2);

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('class', 'reis-route');
  svg.setAttribute('viewBox', `0 0 100 ${totaalU.toFixed(0)}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');
  const pad = (cls, d) => {
    if (!d) return;
    const e = document.createElementNS(svgNS, 'path');
    e.setAttribute('class', cls);
    e.setAttribute('d', d);
    svg.appendChild(e);
  };
  // elke weglaag tweemaal: de grote stippen, en er een halve stap tussenin de kleine
  const weg = (cls, d) => { pad(cls, d); pad(cls + ' klein', d); };
  const heel = smoothPath(punten);
  pad('reis-spoor', heel);
  weg('reis-weg-heel', heel);
  weg('reis-weg-gelopen', smoothPath(punten, stuk(doel)));
  // het laatste stuk apart: van de vorige bestemming tot waar ze nu staat
  if (doel > 0) weg('reis-weg-nu', smoothPath(punten.slice(stuk(doel - 1)), 2));

  // De lucht loopt over de volle breedte, de reis zelf in een kolom -- zie .reis-pad
  const baan = document.createElement('div');
  baan.className = 'reis-pad';
  baan.appendChild(svg);
  track.appendChild(baan);

  plaatsen.forEach((b, k) => {
    const knop = document.createElement('button');
    knop.className = 'reis-halte ' + b.staat + (b.uit ? ' uit' : '') + (b.vol ? ' vol' : '');
    knop.dataset.w = b.i;
    knop.style.left = b.x.toFixed(2) + '%';
    knop.style.bottom = `calc(var(--reis-stap) * ${b.y.toFixed(3)})`;
    // de kleuren van de wereld, als sfeer om zijn bestemming heen. Een wereld die
    // nog niet uit is geeft er geen: die heeft nog geen kleur in dit spel.
    applyWorldTheme(knop, b.world);
    const plaats = document.createElement('span');
    plaats.className = 'reis-plaats';
    /* De tekening hóórt erbij, ook als de wereld nog op slot zit: "ik zie de
       piratenwereld daarboven liggen" is precies waarom een kind doorspeelt. Hij
       staat er dan ontkleurd en gedimd bij (zie .reis-halte.verder). Alleen een
       wereld die nog niet uitgebracht is krijgt er geen -- dat zou verklappen wat
       er nog niet is -- en alleen wat in de buurt van het venster komt wordt
       opgehaald (zie reisStartWaarnemer). */
    if (b.world.art) {
      const art = document.createElement('span');
      art.className = 'reis-art';
      art.dataset.art = wereldKleinPad(b.world.art) || b.world.art;
      art.dataset.groot = b.world.art;
      plaats.appendChild(art);
    } else {
      const ico = document.createElement('span');
      ico.className = 'reis-ico';
      ico.textContent = b.world.icon || '🌍';
      plaats.appendChild(ico);
    }
    /* Naam en sterren liggen ín de tekening. Eén ding dus, in plaats van een kaartje
       met een pil eronder en een badge ernaast -- en de sterrenteller is meteen het
       antwoord op de vraag die de kaart tot nu toe niet beantwoordde: hoe góed heb
       ik die wereld gedaan? Een wereld op slot krijgt geen teller: daar valt nog
       niets te tellen.

       Eén stip per show (zie reisStippen) en geen "13/24": een kind van vijf leest
       geen breuk (zie ook de ster-status-ladder). De stippen staan op een eigen
       regel onder de naam, want acht stippen naast "Onderwaterwereld" passen niet.
       De getallen staan er voor een schermlezer en voor de tests in
       data-sterren/data-max/data-perfect. */
    if (b.open) {
      plaats.insertAdjacentHTML('beforeend', `<span class="reis-label">`
        + `<span class="rn-tekst">${esc(b.world.name)}</span>`
        + `<span class="reis-sterren" data-sterren="${b.sterren}" data-max="${b.max}"`
        + ` data-perfect="${b.perfect}" role="img"`
        + ` aria-label="${b.sterren} van ${b.max} sterren, ${b.perfect} van ${b.levels} shows perfect">`
        + `${reisStippen(p, worldForIndex(b.i))}</span>`
        + `</span>`);
    } else {
      plaats.insertAdjacentHTML('beforeend', `<span class="reis-label">`
        + `<span class="rn-tekst">${esc(b.world.name)}</span></span>`);
    }
    /* Eén teken in de hoek, nooit twee. Een open wereld draagt zijn prijs (zie
       "= De prijs van een wereld"): het podium met de schat erop, als silhouet zo
       lang je hem nog moet winnen, in goud als hij vol is. Dat is het vinkje én
       het sterornament in één, en het zegt er iets bij wat die twee niet zeiden:
       waar je hier voor speelt. Een wereld zonder prijs valt terug op de oude
       tekens; vol gaat dan vóór uit. Op slot blijft het slotje. */
    const prijs = b.open ? wereldPrijsHTML(p, b.i, 46) : '';
    if (prijs) plaats.insertAdjacentHTML('beforeend', `<span class="reis-prijs">${prijs}</span>`);
    else if (b.vol) plaats.insertAdjacentHTML('beforeend',
      `<span class="reis-glans" aria-hidden="true">${reisGlansSVG()}</span>`);
    else if (b.uit) plaats.insertAdjacentHTML('beforeend',
      '<span class="reis-zegel" aria-hidden="true">✓</span>');
    else if (b.staat === 'verder') plaats.insertAdjacentHTML('beforeend',
      '<span class="reis-zegel slot" aria-hidden="true">🔒</span>');
    /* De gloed van "hier ben je" op een eigen laag, vóór de tekening -- zie
       .reis-gloed in het stijlblad voor waarom hij niet in de box-shadow van
       .reis-plaats zelf zit. */
    if (b.staat === 'nu') knop.insertAdjacentHTML('beforeend', '<span class="reis-gloed" aria-hidden="true"></span>');
    knop.appendChild(plaats);
    if (b.i === doel) {
      // een tikje naar de kant waar de route verdergaat: dan kijkt ze de reis in
      const volgende = plaatsen[k + 1];
      const kant = volgende ? Math.max(-12, Math.min(12, (volgende.x - b.x) * 1.2)) : 0;
      knop.style.setProperty('--pop-kant', kant.toFixed(1) + 'px');
      knop.insertAdjacentHTML('beforeend',
        `<div class="reis-pop"><div class="avatar-holder idle">${avatarSVG(p, 56, 'kaart')}</div></div>`);
    }
    knop.setAttribute('aria-label', reisLabel(b, doel));
    if (b.open) {
      knop.onpointerdown = () => reisKaartAlvast(b.i);
      knop.onclick = () => reisTik(b.i, knop);
    }
    else {
      /* aria-disabled en niet disabled. Een <button disabled> krijgt geen enkele
         gebeurtenis en ook geen :active, en dat maakte een wereld op slot het enige
         ding in de app waar tikken helemaal niets teruggeeft -- terwijl het juist
         het ding is waar een kind op tíkt: hij ligt daar groot en in kleur naar je
         te lonken. Overal elders in de app antwoordt een geweigerde tik (de laatste
         bewerking die niet uit mag, een trofee die nog niet vrij is, een spulletje
         dat te duur is). Hier nu ook -- zie slotWereld. */
      knop.setAttribute('aria-disabled', 'true');
      knop.onclick = () => slotWereld(knop, doel);
    }
    baan.appendChild(knop);
  });

  /* Bovenaan houdt de reis niet óp: de route loopt door en verdwijnt in de wolken.
     Die belofte staat er altijd, of er nu nog werelden boven je liggen of niet --
     een kind hoeft niet te weten wat er nog niet is om te voelen dat het doorgaat.
     Geen verzonnen wereld, geen datum, geen knop die niets doet.

     Er komt één pil bij, en die zegt twee verschillende dingen:

       nog meer avonturen   er liggen uitgebrachte werelden voorbij de horizon.
                            Die kán ze halen, dus dit is een doel.
       wordt vervolgd       alles wat er ís, is uit. Dan is "er komt nog meer" het
                            enige dat er nog eerlijk te zeggen valt.

     Nooit allebei: liggen er nog werelden vooruit, dan is de tournee niet uit. En
     een wereld die nog niet uitgebracht is telt voor geen van beide mee -- die
     belooft niets, want hij is er nog niet. */
  const mist = document.createElement('div');
  mist.className = 'reis-mist';
  const vervolg = meerWereldenVooruit(p) ? '✨ Nog meer avonturen'
    : allWorldsDone(p) ? '✨ Wordt vervolgd' : '';
  /* Hier dreven twee ☁️ en een ✨ door de mist. Weg: een emoji is een plaatje
     van een ánder toestel, en naast de geschilderde werelden las het als een
     sticker. De wolken zitten nu in de mist zelf (zie .reis-mist). */
  mist.innerHTML = vervolg ? `<div class="reis-vervolg">${vervolg}</div>` : '';
  track.appendChild(mist);
}
/* De wereldtekeningen zijn de grootste bestanden van de app (~300 kB per stuk), en
   op dit scherm staan er net zoveel als er werelden zijn. Dus: pas ophalen als de
   bestemming in de buurt van het venster komt. Werelden waar ze al geweest is staan
   sowieso al in de cache (de kaart heeft ze getoond en de service worker bewaart
   ze); een wereld die nog op slot zit kost bij het omhoog kijken één keer een
   bestand, en dat is precies wat die verleiding waard is.

   Geen IntersectionObserver in deze browser? Dan gewoon alles ineens -- een oud
   toestel krijgt liever een paar plaatjes te veel dan een scherm met lege vakken. */
let reisWaarnemer = null;
function reisStartWaarnemer() {
  const track = $('reis-track');
  if (!track) return;
  const laden = el => {
    const src = el.dataset.art, groot = el.dataset.groot;
    if (!src) return;
    delete el.dataset.art;
    delete el.dataset.groot;
    ART_GEHAALD.add(src);
    /* Staat hij al in het geheugen, dan is complete meteen waar en tekent het
       kaartje gewoon. Zo niet, dan blijft het vlak leeg tot hij binnen is en komt
       hij dan op (zie .reis-art.laadt). Mislukt hij, dan gaat de klasse er ook af:
       dan staat het vlak er weer zoals altijd.

       Mislukt het kleine bestand (een wereld die nog geen -klein.webp heeft),
       dan nog één keer met de grote tekening: zwaarder, maar beter dan een leeg
       vak. */
    const beeld = new Image();
    beeld.src = src;
    if (!beeld.complete) {
      el.classList.add('laadt');
      beeld.onload = () => el.classList.remove('laadt');
      beeld.onerror = () => {
        if (groot && groot !== src) { el.dataset.art = groot; laden(el); }
        else el.classList.remove('laadt');
      };
    }
    el.style.backgroundImage = `url("${src}")`;
  };
  if (!window.IntersectionObserver) { track.querySelectorAll('.reis-art').forEach(laden); return; }
  reisWaarnemer = new IntersectionObserver((rijen, obs) => {
    rijen.forEach(r => { if (r.isIntersecting) { laden(r.target); obs.unobserve(r.target); } });
  }, { root: $('screen-journey'), rootMargin: '60% 0px' });
  /* De buren van de wereld waar je vandaan komt meteen, zonder op de waarnemer
     te wachten. Die meldt zich pas ná het eerste beeldje, en dan vlogen de
     kaartjes die de camera binnenschuift er leeg in (de kleur van hun wereld) en
     kwam hun tekening er pas na de landing op. Het zijn er dezelfde vijf die
     pilTik bij het neerzetten van de vinger al ophaalt, dus hier liggen ze
     meestal al uitgepakt klaar. */
  track.querySelectorAll('.reis-art').forEach(el => {
    const halte = el.closest('.reis-halte');
    if (halte && reisVanuit != null && Math.abs(+halte.dataset.w - reisVanuit) <= REIS_BUREN) laden(el);
    else reisWaarnemer.observe(el);
  });
}
function reisStopWaarnemer() {
  if (!reisWaarnemer) return;
  reisWaarnemer.disconnect();
  reisWaarnemer = null;
}
/* Waar de reis opengaat. Niet onderaan: een kind dat al vier werelden verder is
   kijkt dan eerst naar een stuk dat het allang gehad heeft, en moet zichzelf gaan
   zoeken. Ook niet precies in het midden -- dan ligt er evenveel achter als vóór
   haar, en deze reis gaat over wat er nog komt.

   60% van de vensterhoogte zet haar net onder het midden: een stuk gereisde weg
   eronder, zij erop, en boven haar de eerstvolgende bestemming in beeld. Alleen bij
   het openen; daarna schuift een kind zelf en wordt ze nooit teruggesleept.

   opWereld = open op déze bestemming in plaats van op die waar de ster staat. Dat
   is precies één geval, en het is het geval waar dit scherm voor bedacht is: een
   kind dat in een éérdere wereld staat te kijken en uitzoomt. Dan hoort het
   kaartje van díe wereld in beeld te komen -- anders zoomt de kaart uit naar een
   plek die buiten het venster valt (zie wereldVlucht). Zonder opWereld verandert
   er niets: in elke andere ingang zijn die twee dezelfde wereld. */
function reisFocus(opWereld) {
  const scherm = $('screen-journey');
  const track = $('reis-track');
  if (!scherm || !track) return;
  const doel = (opWereld != null && track.querySelector(`.reis-halte[data-w="${opWereld}"]`))
    || track.querySelector('.reis-halte.nu') || track.querySelector('.reis-halte');
  if (!doel) return;
  const r = doel.getBoundingClientRect(), s = scherm.getBoundingClientRect();
  if (!r.height) return;
  const mid = (r.top + r.height / 2) - s.top + scherm.scrollTop;
  const max = Math.max(0, scherm.scrollHeight - scherm.clientHeight);
  scherm.scrollTop = Math.max(0, Math.min(max, mid - scherm.clientHeight * 0.6));
  reisVolgKnop();
}
/* Ben je zover weggescrold dat je jezelf niet meer ziet, dan -- en alleen dan --
   verschijnt er rechtsonder een knopje terug. Geen vaste knop "voor het geval dat":
   zolang ze in beeld staat is er niets terug te gaan.

   Meet en tekent niets zwaars: één vergelijking van twee rechthoeken, en de klasse
   verandert alleen als het antwoord ánders is dan het al was. Hij hangt aan de
   scroll van het scherm, dus hij loopt achter een rAF aan. */
function reisVolgKnop() {
  const scherm = $('screen-journey'), knop = $('reis-terug');
  if (!scherm || !knop) return;
  const doel = $('reis-track').querySelector('.reis-halte.nu');
  if (!doel) { knop.classList.remove('aan'); return; }
  const r = doel.getBoundingClientRect(), s = scherm.getBoundingClientRect();
  // ruim gerekend: pas als ze écht weg is, niet als haar rand net wegvalt
  const weg = r.bottom < s.top + 40 || r.top > s.bottom - 40;
  knop.classList.toggle('aan', weg);
  // wijst de kant op waar ze staat, zodat het knopje zegt wáár je heen gaat.
  // Eén pijl die omdraait (.neer), geen nieuwe inhoud: dit loopt bij elk
  // beeldje van het schuiven, en toggle schrijft alleen als het verandert.
  knop.classList.toggle('neer', r.top > s.bottom - 40);
}
/* De inhoud van dat knopje: dezelfde pil als de weg terug op de kaart
   (#world-back) -- de pijl in het gouden capsuletje en de wereld waar ze speelt.
   Het is ook dezelfde vraag ("terug naar waar ik speel"), dus hetzelfde ding, en
   de naam zegt waar hij heen gaat. Eén keer per opbouw van de reis. */
function reisTerugVullen(w) {
  const knop = $('reis-terug');
  if (!knop || !w) return;
  knop.innerHTML = `<span class="wb-cta" aria-hidden="true">${ico('op')}</span>`
    + `<span class="wb-naam">${w.icon} ${esc(korteNaam(w))}</span>`;
  knop.setAttribute('aria-label', `Terug naar ${w.name}`);
}
function reisScroll() {
  rafKlem(reisVolgKnop);
}
// Zacht terug naar waar ze staat. Geen sprong: dit is de enige plek waar dit scherm
// zelf scrollt terwijl een kind aan het kijken is, en dan hoort het te glijden.
function reisTerugNaarNu() {
  sndClick();
  const scherm = $('screen-journey');
  const doel = $('reis-track').querySelector('.reis-halte.nu');
  if (!scherm || !doel) return;
  const r = doel.getBoundingClientRect(), s = scherm.getBoundingClientRect();
  const mid = (r.top + r.height / 2) - s.top + scherm.scrollTop;
  const max = Math.max(0, scherm.scrollHeight - scherm.clientHeight);
  const top = Math.max(0, Math.min(max, mid - scherm.clientHeight * 0.6));
  if (scherm.scrollTo && !motionOff()) scherm.scrollTo({ top, behavior: 'smooth' });
  else scherm.scrollTop = top;
}

/* De reis openen = uitzoomen, en wel op de manier die een kind ook echt zo leest:
   de wereld waar ze in staat krímpt naar het kaartje waar hij op Werelden ligt.
   De camera stapt achteruit en laat zien wat er al die tijd omheen lag.

   Vier dingen gebeuren tegelijk, en alle vier horen ze bij diezelfde ene zin:

     1  de tekening vliegt      van het volle scherm naar zijn bestemming (400ms)
     2  het plaatselijke werk verdwijnt vroeg -- haltes, weg, ster, Memory-knop
        en de terugpil horen bij de ingezoomde wereld en hebben op een kaartje
        van 200 pixels niets te zoeken. Ze zijn weg op 150ms, ruim voordat de
        tekening klein genoeg is om ze nog te kunnen onderscheiden.
     3  de reis eromheen komt op: de stippellijn en de andere werelden. Zacht en
        zonder beweging -- ze vlíegen nergens heen, ze wáren er al.
     4  de koppen kruisen over elkaar heen, met de globe als enige die verhuist.

   WAT ER STIL BLIJFT STAAN, en dat is net zo belangrijk als wat er beweegt: de
   navigatiebalk (die staat buiten de schermen en wordt niet aangeraakt -- beide
   schermen horen bij Kaart) en de diamantenpil rechtsboven. Die tweede staat op
   allebei de schermen op dezelfde plek met dezelfde inhoud, dus hij hoeft niet
   weg en terug: de vertrekkende kop laat hem gewoon staan tot hij weggehaald
   wordt, en er staat er dan al een identieke onder.

   ÉÉRST DE REIS OP ZIJN PLEK, DAN PAS BEWEGEN. reisFocus() draait in de rAF
   hieronder -- dus vóór het eerste beeldje waarop er iets te zien is -- en krijgt
   de wereld mee waar we vandaan komen. Er wordt dus nooit eerst een reis getoond
   die daarna naar de goede plek schuift. */
/* alGetikt: de tik klonk al (de wereldpil, zie pilTik). */
function openReis(alGetikt) {
  if (wereldReisBezig() || overgangBezig) return;   // midden in een wereldwissel valt er niets te kiezen
  /* Eerst een eventuele vorige vlucht afsluiten, en wel hiér -- vóór er één klasse
     op een scherm gaat. De opruimer van die vlucht haalt zijn eigen klassen weer
     weg, en zou hij later draaien (bijvoorbeeld vanuit wereldVlucht), dan veegde
     hij de klassen weg die deze overgang er net op gezet heeft. */
  vluchtKlaar();
  if (alGetikt !== true) sndClick();
  const kaart = $('screen-map');
  const reis = $('screen-journey');
  const vorige = document.querySelector('.screen.active');
  reisVanuit = viewWorldIdx == null ? continueWorld(P()) : viewWorldIdx;
  const bron = worldForIndex(reisVanuit);
  /* Opmeten vóór show(): die zet de kaart op display:none en dan valt er niets
     meer op te meten. Alleen de kaart zelf kan de vlucht dragen -- kom je hier
     vandaan uit een ander scherm, dan is er geen wereld om te laten krimpen. */
  const vanaf = (vorige === kaart && bron) ? kaartVlak() : null;
  const stil = motionOff() || !reis.animate || !kaart.animate;
  const vlieg = !!vanaf && !stil;
  // de kaart schuift soms (tablet); display:none zet dat terug op nul
  const schuif = $('tour-map') ? $('tour-map').scrollTop : 0;
  const kop = kaart.querySelector('.wp-cta-ico');
  const kopVan = vlieg && kop ? kop : null;

  renderReis();
  show('screen-journey');
  /* Meteen .komt-op, en niet pas in de rAF hieronder: in dat ene beeldje ertussen
     zet .screen.active zijn eigen fade (screenIn) aan, en dan komt de reis toch
     één beeldje half doorzichtig op. Zelfde reden als bij de kaart in goMap --
     zie de regel bij MOTION. */
  reis.classList.add('komt-op');
  reisStartWaarnemer();

  /* Reduced motion: geen enkele verplaatsing, wel dezelfde oorzaak en hetzelfde
     gevolg. De reis komt kort op in plaats van eruit te klappen -- opacity is
     geen beweging, en zonder iets is een schermwissel hier een harde knip. */
  if (!vlieg) {
    if (!stil && vorige && vorige !== reis) schermWeg(vorige, false);
    requestAnimationFrame(() => {
      reisFocus(reisVanuit);
      if (stil) { vluchtDoof(reis.querySelector('.reis-pad'), true, 140); return; }
      const hier = reis.querySelector(`.reis-halte[data-w="${reisVanuit}"]`)
        || reis.querySelector('.reis-halte.nu');
      const r = hier && hier.getBoundingClientRect();
      if (r && r.width) reis.style.transformOrigin =
        oorsprongPct(reis, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
      const op = () => { reis.style.transformOrigin = ''; };
      const a = reis.animate(
        [{ transform: 'scale(1.09)' }, { transform: 'none' }],
        { duration: MOTION.kom, delay: MOTION.komNa, easing: MOTION.uit, fill: 'backwards' });
      a.onfinish = op;
      setTimeout(op, MOTION.totaal + MOTION.vangnet);
    });
    return;
  }

  /* De kaart blijft nog even staan, maar zonder zijn tekening: die ligt vanaf nu
     in de vluchtlaag. Wat er overblijft is het plaatselijke werk, en dat doft
     eroverheen weg. .wegvallend haalt hem uit de kolom en legt hem bovenop (zie
     schermWeg), zodat de reis er meteen op volle maat onder staat. */
  overgangBezig = true;
  kaart.classList.add('wegvallend', 'vlucht-weg');
  /* De kop van de kaart dimt als de ster ertegenaan staat (zie .ster-bij-kop).
     Tijdens een vlucht hoort dat niet: de diamantenpil moet stil blijven staan en
     de reis heeft er een identieke onder liggen. Hij komt vanzelf terug zodra de
     volgende kaart zichzelf opmeet. */
  kaart.classList.remove('ster-bij-kop');
  /* Alleen als er iets terug te zetten valt. Een scrollTop schrijven dwingt hier de
     volledige opmaak af van de reis die er net in gezet is (renderReis + show),
     en dan nog eens in het eerste beeldje: gemeten ~280 ms op een 6x vertraagde
     telefoon, vóór de vlucht ook maar begint. Op een telefoon schuift de kaart
     niet (schuif is 0), en 0 is precies waar display:none hem al op zette. */
  if (schuif && $('tour-map')) $('tour-map').scrollTop = schuif;

  requestAnimationFrame(() => {
    reisFocus(reisVanuit);        // pas ná de opmaak: hier staat de baan er en is hij op te meten
    const doel = reis.querySelector(`.reis-halte[data-w="${reisVanuit}"]`)
      || reis.querySelector('.reis-halte.nu');
    const naar = halteVlak(doel);
    // alles wat hieronder een animatie krijgt, zodat de opruimer ze allemaal kent
    const lokaal = [$('tour-map'), $('mem-fab'), $('world-back'),
                    kaart.querySelector('.map-id-btn'), kaart.querySelector('.world-pick')];
    const pad = reis.querySelector('.reis-pad'), mist = reis.querySelector('.reis-mist');
    const terugKnop = reis.querySelector('.header-left');
    /* De globe staat hier met opzet niet bij: die doet niet mee aan het opkomen van
       Werelden, want hij kwám al mee -- zie globeVlucht. */
    const overzicht = [pad, mist, terugKnop, doel];
    // de diamanten: stilstaan waar dat kan, kruisen waar het moet -- zie zelfdePlek
    const muntV = kaart.querySelector('.diamond-badge'), muntN = reis.querySelector('.diamond-badge');
    const muntKruist = !zelfdePlek(muntV, muntN);
    if (muntKruist) { lokaal.push(muntV); overzicht.push(muntN); }
    let camera = null;
    const op = () => {
      overgangBezig = false;
      kaart.classList.remove('wegvallend', 'vlucht-weg');
      if (doel) doel.classList.remove('vlucht-doel');
      if (camera) camera();
      lokaal.concat(overzicht).forEach(el => {
        if (el && el.getAnimations) el.getAnimations().forEach(a => a.cancel());
      });
    };
    if (!naar) { op(); return; }                 // geen bestemming om heen te vliegen

    doel.classList.add('vlucht-doel');
    const kruis = wereldVlucht(vanaf, naar, bron.world, op);

    // 2 -- alles wat alleen in de ingezoomde wereld bestaat
    vluchtDoofAlle(lokaal.filter(x => x !== muntV), false, VLUCHT.detail);
    if (muntKruist) { vluchtDoof(muntV, false, VLUCHT.detail, 60); vluchtDoof(muntN, true, VLUCHT.detail, 150); }
    /* 3 -- de reis eromheen: de route en de andere werelden waren er al. Ze komen
       op én schuiven van buiten het beeld naar hun plek, omdat de camera
       achteruit stapt (zie reisCamera). */
    camera = reisCamera({ x: naar.clip.left + naar.clip.w / 2, y: naar.clip.top + naar.clip.h / 2 },
      reisCameraSchaal(naar, vanaf), 1);
    vluchtDoofAlle([pad, mist], true, VLUCHT.reveal, 40);
    /* 4 -- de kop wisselt van stand. Het rondje van de pil dooft weg (die zit in
       'lokaal'), de ← komt op, en de globe blijft: hij laat de pil
       los en schuift naar het midden. Eén teken dat verhuist, geen kop die de
       andere vervangt -- daarom staat de globe nergens in een fade-lijst. */
    vluchtDoof(terugKnop, true, VLUCHT.detail, 120);
    globeVlucht(kopVan, reis.querySelector('.rt-ico'), kruis);
    /* En op de landing staat het échte kaartje er weer -- nog steeds achter de
       vluchtlaag, die er daarna in 80ms op wegdooft. Geen fade erbij dus: de
       tekening is op dat moment identiek, en wat er overvloeit is precies het
       verschil (de naam, de sterren, het zegel, de ster op de kaart). */
    naVluchtLanding(() => doel.classList.remove('vlucht-doel'));
  });
}
// De reis sluiten is dezelfde beweging als een bestemming kiezen: inzoomen op de
// wereld waar je vandaan kwam.
/* stil: de tik klonk al (het tabblad Kaart, zie navGo). */
/* De globe in de kop van Werelden. Hij staat op de plek van de wereldpil, dus de
   tweede tik van een dubbeltik op de pil komt hier terecht -- en dan vloog je
   terug zodra je er was. Tijdens de vlucht hierheen doet hij daarom niets (de ← en
   🗺 wél: die staan elders en zijn dus bedoeld). */
function reisGlobeTik() {
  if (overgangBezig) return;
  naTik(reisSluit);
}
function reisSluit(stil) {
  /* Nog onderweg naar Werelden (of een klim die loopt): dan straks. Zo is 🗺, ←,
     de 🌍 of terug middenin de vlucht geen dode tik meer. */
  if (overgangBezig || wereldReisBezig()) {
    naLandingZet(() => { if ($('screen-journey').classList.contains('active')) reisSluit(stil); });
    return;
  }
  const idx = reisVanuit == null ? continueWorld(P()) : reisVanuit;
  reisNaarWereld(idx, $('reis-track').querySelector(`.reis-halte[data-w="${idx}"]`), stil === true);
}
/* Een bestemming kiezen = inzoomen op die plek -- letterlijk de vlucht van
   openReis, achteruit afgespeeld: het kaartje groeit uit tot de hele wereld.

   De stapeling draait daarbij om, en dat is het enige echte verschil. Bij het
   uitzoomen ligt het scherm dat vertrekt bovenop (zie de regel bij MOTION); hier
   is dat Werelden, en dáár moet de tekening juist overheen. Dus:

     z 2  Werelden          de nacht eronder blijft staan tot het einde -- dat is
                            wat er te zien is rondom de groeiende tekening. De
                            route en de andere werelden schuiven het beeld uit
                            (reisCamera) en doven in het laatste stuk weg.
     z 3  de vluchtlaag     de tekening zelf
     z 4  de kaart          zonder zijn tekening (die vliegt); de haltes, de weg,
                            de ster en de kop komen er in de laatste tel overheen
                            op, precies waar ze straks staan.

   Op de landing gaat .vlucht-weg eraf: de échte tekening staat er dan op de pixel
   hetzelfde bij, dus die wissel is onzichtbaar. Werelden mag dan weg, en de
   vluchtlaag dooft erachter weg.

   Wat er NIET gebeurt: er wordt niets afgemaakt, niets vrijgespeeld en niets
   verzet. reisDoel is één opdracht aan de eerstvolgende kaart en goMap verbruikt
   hem meteen; p.level, de sterren en de grens blijven precies staan. */
/* ---- De tik op een bestemming: eerst antwoorden, dan pas vliegen ----
   Hetzelfde als naTik (zie "Eerst antwoorden, dan pas het zware werk"), voor de
   tik die Cloudflare daarna als traagste meldde: een wereld kiezen op Werelden.
   De vlucht bouwt de hele kaart van die wereld op en meet hem een paar keer op;
   gebeurde dat binnen de tik, dan wachtte de tik ruim een halve seconde op het
   volgende beeldje (6× vertraagd, gemeten). Nu komen het geluid, het indrukken
   en de rimpel meteen, en vertrekt de vlucht één beeldje later. reisNaarWereld
   zelf blijft synchroon, net als navGo: de suites roepen hem rechtstreeks aan.

   De rimpel staat hier en niet meer alleen in reisNaarWereld: daar komt hij pas
   in de taak die ook de kaart bouwt, en dan tekent hij pas ná al dat werk. */
function reisTik(idx, el) {
  if (tikWacht) return;
  if (overgangBezig) {
    naLandingZet(() => { if ($('screen-journey').classList.contains('active') && el.isConnected) reisTik(idx, el); });
    return;
  }
  sndClick();
  reisKaartAlvast(idx);
  const r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null;
  if (r && r.width) tapRipple(r.left + r.width / 2, r.top + r.height / 2);
  naTik(() => reisNaarWereld(idx, el, true, true));
}
/* En dezelfde tik op de wereldpil, de andere kant op. Die stond op naTik alleen:
   het geluid kwam pas ná het beeldje, er was geen rimpel, en de pil zelf sprong
   terug zodra de vinger losliet -- en daarna gebeurde er op een trage telefoon
   een halve seconde niets (opgemeten: ~0,5s bij 4× vertraagd, ~0,45s op een
   breed scherm). Nu komen het klikje en de rimpel meteen, en blijft de pil
   ingedrukt staan (.bezig) tot de vlucht hem meeneemt: de tik is aangekomen,
   ook als het bouwen even duurt.

   Bij het neerzetten van de vinger (pointerdown in de opmaak) haalt hij alvast de
   kaartjes op waar de camera straks langs schuift -- zie reisBurenAlvast. */
function pilTik(el) {
  if (tikWacht) return;
  if (overgangBezig || wereldReisBezig()) {
    naLandingZet(() => { if ($('screen-map').classList.contains('active')) pilTik(el); });
    return;
  }
  sndClick();
  reisBurenAlvast();
  const r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null;
  if (r && r.width) tapRipple(r.left + r.width / 2, r.top + r.height / 2);
  if (el) el.classList.add('bezig');
  naTik(() => {
    openReis(true);
    // ging er niets open (een wereldwissel was nog bezig), dan staat de pil weer op
    if (el && $('screen-map').classList.contains('active')) el.classList.remove('bezig');
  });
}
/* De kleine kaartjesbeelden van de wereld waar je naar kijkt en van zijn buren,
   alvast uitgepakt: precies wat de camera van Werelden in beeld schuift (zie
   reisStartWaarnemer). Klein en weinig -- vijf bestanden van een vijfde van een
   wereldtekening, en alleen werelden die Werelden ook echt toont. Daarom mag het
   op de tik en niet bij het openen van de kaart (die haalt er hoogstens drie). */
const REIS_BUREN = 2;
const reisBurenBeelden = new Map();
function reisBurenAlvast() {
  const p = P();
  if (!p) return;
  const hier = viewWorldIdx == null ? continueWorld(p) : viewWorldIdx;
  const tot = laatsteZichtbareWereld(p);
  for (let i = Math.max(0, hier - REIS_BUREN); i <= Math.min(tot, hier + REIS_BUREN); i++) {
    const art = WORLDS[i] && WORLDS[i].art;
    const src = wereldKleinPad(art) || art;
    if (!src || reisBurenBeelden.has(src)) continue;
    const beeld = new Image();
    beeld.src = src;
    reisBurenBeelden.set(src, beeld);
    if (beeld.decode) beeld.decode().catch(() => reisBurenBeelden.delete(src));
  }
}
/* De tekening van de bestemming alvast ophalen én uitpakken, bij het neerzetten
   van de vinger. Tussen neerzetten en loslaten zit op een telefoon zo'n honderd
   milliseconden, en die waren ongebruikt: de kaart vroeg zijn tekening pas aan
   als de vlucht al begon, en het eerste beeldje van de vlucht wachtte dan tot hij
   uitgepakt was (1215×2160, het zwaarste plaatje van de app).

   Alleen de wereld waar de vinger op staat -- niet alles wat op Werelden in
   beeld is. Dat zou bij elke keer kijken een handvol volle tekeningen ophalen,
   en dat is precies wat "nooit alles" (zie DE ZWARE SPULLEN) uitsluit. decode()
   zet het uitgepakte beeld in de gedeelde voorraad van de browser, en de kaart
   tekent dezelfde URL. reisAlvastBeeld houdt hem vast tot hij klaar is. */
let reisAlvastBeeld = null;
function reisKaartAlvast(idx) {
  const w = worldForIndex(idx);
  const src = w && w.world && w.world.art;
  if (!src || (reisAlvastBeeld && reisAlvastBeeld.dataset.src === src)) return;
  const beeld = new Image();
  beeld.dataset.src = src;
  beeld.src = src;
  ART_GEHAALD.add(src);
  reisAlvastBeeld = beeld;
  if (beeld.decode) beeld.decode().catch(() => {});
}
/* De kaart bouwt zich op, op de landing van een vlucht -- zie VLUCHT.opbouw.
   Alleen het plaatselijke werk binnen het kader: de weg, de haltes en zij. De kop
   staat erbuiten en doet gewoon mee met vluchtDoofAlle.

   Met 'scale' en 'translate' en niet met transform: een halte staat al op een
   transform (zo hangt hij met zijn hart op de weg), en een animatie op transform
   zou die vervangen. De losse eigenschappen tellen erbij op. fill backwards: tot
   hun beurt staan ze er onzichtbaar, daarna is er niets meer dat blijft hangen. */
function kaartOpbouw(map, start) {
  if (!map || !map.animate) return;
  const tijd = (na, duur, curve) => ({ duration: duur, delay: na, easing: curve, fill: 'backwards' });
  map.querySelectorAll('.tour-road-svg').forEach(w =>
    w.animate([{ opacity: 0 }, { opacity: 1 }], tijd(start, VLUCHT.opbouwDuur, MOTION.uit)));
  const haltes = [...map.querySelectorAll('.tour-stop')];
  haltes.forEach((h, i) => h.animate([{ opacity: 0, scale: '.55' }, { opacity: 1, scale: '1' }],
    tijd(start + VLUCHT.haltePas * (i + 1), VLUCHT.opbouwDuur, MOTION.plop)));
  const zij = map.querySelector('.tour-hero');
  if (!zij) return;
  const na = start + VLUCHT.haltePas * (haltes.length + 2);
  zij.animate([{ opacity: 0, translate: '0 -34px' }, { opacity: 1, translate: '0 0' }],
    tijd(na, VLUCHT.landing, MOTION.plop));
  // en haar halte antwoordt als ze neerkomt -- de plop is op de helft al beneden
  setTimeout(haltePuls, na + Math.round(VLUCHT.landing * .45));
}
function reisNaarWereld(idx, el, stil, alGetikt) {
  if (overgangBezig) return;
  vluchtKlaar();                             // zie openReis: eerst afsluiten, dan pas klassen
  if (!stil) sndClick();
  const reis = $('screen-journey'), kaart = $('screen-map');
  reisStopWaarnemer();
  reisDoel = Math.max(0, Math.min(WORLDS.length - 1, idx | 0));
  const bron = worldForIndex(reisDoel);
  const r = (el && el.getBoundingClientRect) ? el.getBoundingClientRect() : null;
  const kaal = motionOff() || !r || !r.width || !kaart.animate || !reis.classList.contains('active');
  const van = kaal ? null : halteVlak(el);
  if (kaal || !van || !bron) {
    goMap();
    // reduced motion: geen verplaatsing, wel een kort opkomen -- zie openReis
    if (motionOff()) vluchtDoof($('tour-map'), true, 140);
    return;
  }
  overgangBezig = true;
  const punt = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  if (!alGetikt) tapRipple(punt.x, punt.y);  // de tik komt aan (via reisTik: die gaf hem al)
  el.classList.add('vlucht-doel');           // dit kaartje ligt vanaf nu in de lucht
  const kopVan = reis.querySelector('.rt-ico');
  const schuif = reis.scrollTop;             // display:none zet de schuifstand terug op nul

  goMap();                                   // de kaart staat er nú al, op reisDoel
  kaart.classList.add('vlucht-weg', 'vlucht-boven');
  reis.classList.add('wegvallend');
  reis.scrollTop = schuif;

  /* Eén beeldje later: renderTourMap heeft zijn eigen rAF dan gehad (daar wordt de
     kaart op een tablet nog op de juiste halte geschoven), dus nu pas valt er te
     meten waar de tekening straks ligt. */
  requestAnimationFrame(() => {
    const naar = kaartVlak();
    const lokaal = [$('tour-map'), $('mem-fab'), $('world-back'),
                    kaart.querySelector('.map-id-btn'), kaart.querySelector('.world-pick')];
    // ook hier blijft de globe erbuiten: hij vliegt terug naar de pil (globeVlucht)
    const overzicht = [reis.querySelector('.reis-pad'), reis.querySelector('.reis-mist'),
                       reis.querySelector('.header-left')];
    // dezelfde afspraak als bij het uitzoomen, alleen de andere kant op
    const muntV = reis.querySelector('.diamond-badge'), muntN = kaart.querySelector('.diamond-badge');
    const muntKruist = !zelfdePlek(muntV, muntN);
    if (muntKruist) { overzicht.push(muntV); lokaal.push(muntN); }
    let camera = null;
    const op = () => {
      overgangBezig = false;
      kaart.classList.remove('vlucht-weg', 'vlucht-boven');
      reis.classList.remove('wegvallend');
      el.classList.remove('vlucht-doel');
      if (camera) camera();
      lokaal.concat(overzicht).forEach(a => {
        if (a && a.getAnimations) a.getAnimations().forEach(x => x.cancel());
      });
    };
    if (!naar) { op(); kaartKomtOp(punt); return; }

    const kruis = wereldVlucht(van, naar, bron.world, op, true);
    /* Het plaatselijke werk komt op terwijl de tekening uitzakt, en niet in één
       klap op het eind (zie VLUCHT.opbouw): de kop dooft op, het kader bouwt zich
       op. Het kaartvak zelf staat er dus meteen -- wat erin staat komt op. */
    const opbouw = Math.round(kruis * VLUCHT.opbouw);
    const kaartVak = $('tour-map');
    vluchtDoofAlle(lokaal.filter(x => x !== muntN && x !== kaartVak), true, VLUCHT.opbouwDuur, opbouw);
    kaartOpbouw(kaartVak, opbouw);
    /* En de route eromheen laat los -- hij was de omgeving, niet de bestemming.
       Niet meer ter plekke: de camera duwt in (zie reisCamera) en schuift de andere
       werelden het beeld uit, en pas in het laatste stuk doven ze weg. Alleen de ←
       gaat meteen: die hoort bij de kop, en de kop beweegt niet mee. */
    camera = reisCamera(punt, 1, reisCameraSchaal(van, naar));
    const terugKnop = reis.querySelector('.header-left');
    vluchtDoofAlle(overzicht.filter(x => x !== muntV && x !== terugKnop), false,
      VLUCHT.reveal, VLUCHT.duur - VLUCHT.reveal);
    vluchtDoof(terugKnop, false, VLUCHT.detail);
    if (muntKruist) { vluchtDoof(muntV, false, VLUCHT.detail, 60); vluchtDoof(muntN, true, VLUCHT.detail, 150); }
    globeVlucht(kopVan, kaart.querySelector('.wp-cta-ico'), kruis);
    /* de landing: de echte tekening eronder, en Werelden mag weg -- op het einde
       van de beweging, niet op de klok (zie naVluchtLanding). Is de vlucht al
       opgeruimd, dan staat de kaart er gewoon. */
    naVluchtLanding(() => {
      kaart.classList.remove('vlucht-weg');
      reis.classList.remove('wegvallend');
    });
  });
}
/* Bouwt de kaart van één wereld. travelFrom > 0 = de tussenstand vlak vóór de
   reis-animatie: de ster staat dan nog op de vorige halte en de nieuwe halte zit
   nog op slot. Alles staat op percentages binnen het kader, dus er wordt niets
   opgemeten -- draaien of resizen vraagt geen enkele herberekening. */
function renderTourMap(travelFrom) {
  const p = P();
  const cur = worldFor(p.level);
  if (viewWorldIdx == null) viewWorldIdx = cur.index;
  const shown = worldForIndex(viewWorldIdx);
  const nodes = worldNodes(shown);
  const travelling = !!travelFrom;
  // waar ze naartoe loopt: die haltes gaan pas open als ze er is
  const reisTot = travelling ? p.level : 0;
  const playable = travelling ? travelFrom : p.level;   // t/m dit level is alles open
  /* Waar de ster staat, en welke halte goud is. Dat is niet hetzelfde als
     'playable': in de toegift-stand (alles uit) wijst p.level één halte voorbij
     het einde, en dan hoort ze op de laatste halte te staan die er wél is.
     hereLevel() klemt dat; playable blijft p.level, dus alles blijft open. */
  const heroLvl = travelling ? travelFrom : hereLevel(p);
  /* De sterren van de zojuist gespeelde halte landen hier, bij de allereerste
     tekening van de kaart. Of ze überhaupt landen beslist goMap: reist ze meteen
     door naar de volgende halte binnen dezelfde wereld, dan is netAf daar al op
     null gezet en gebeurt hier niets -- het eindscherm heeft die sterren dan net
     gevierd (zie reisBinnenWereld). Bij een wereldgrens en bij terugkomen zonder
     level-up staat hij er wél.

     netAf wordt verbruikt zodra hij gebruikt is, ongeacht travelling -- de latere
     tekening die de aankomst laat zien, raakt deze halte niet nog eens aan. */
  const netAfLvl = netAf;
  netAf = null;

  const map = $('tour-map');
  map.innerHTML = '';
  // een uitstapje: zij speelt in een andere wereld (zie kaartHierDoel)
  if (!travelling && shown.index !== worldFor(hereLevel(p)).index) map.dataset.uitstap = '1';
  else delete map.dataset.uitstap;
  /* Op <html> en niet op het kaartvak: de liggende stand rekent er op
     #screen-map mee uit hoeveel lucht er boven en onder het podium overblijft
     (--podium-lucht in het stijlblad), en die kan niet bij een variabele die
     ónder hem staat. .tour-map erft hem gewoon mee. */
  document.documentElement.style.setProperty('--art-w', ART_W);
  document.documentElement.style.setProperty('--art-h', ART_H);
  const frame = document.createElement('div');
  frame.className = 'world-frame';
  applyWorldArt(frame, shown.world);
  applyWorldTheme(frame, shown.world);
  // ook op het vak eromheen: in liggende stand staat daar de wereld nog een keer,
  // onscherp en donker, in plaats van het paars van de app
  applyWorldTheme(map, shown.world);
  const scherm = $('screen-map');
  applyWorldTheme(scherm, shown.world);
  scherm.style.setProperty('--art', randBeeld(shown.world));

  frame.appendChild(wereldStof(shown, nodes));
  tekenWeg(frame, shown, nodes, playable);

  const stand = { p, playable, travelling, heroLvl, netAfLvl, reisTot };
  nodes.forEach((n, i) => frame.appendChild(haltKnop(shown, nodes, i, stand)));

  // naar een eerdere wereld terug (om daar te verbeteren), of vooruit tot zo ver
  // als ze zelf al gekomen is -- nooit verder
  map.appendChild(frame);

  meetChroom();

  // Past de kaart niet in de vensterverhouding, dan schuift hij: zet de halte waar
  // ze nu staat in beeld. Op een staande telefoon valt er niets te schuiven en doet
  // dit niets.
  //
  // "Valt er iets te schuiven" is sinds --podium-groei niet meer hetzelfde als
  // "steekt er iets buiten het vak uit". In liggende stand steekt het kader met
  // opzet een paar procent boven en onder het vak uit (zie --podium-groei in het
  // stijlblad), en dat is een snede en geen schuifruimte: álle haltes staan al in
  // beeld. Dat merk je aan de opmaak -- het kaartvak staat daar op
  // overflow-y: hidden -- en dus vraagt deze regel het daar ook. Zonder die vraag
  // schoof de kaart hier 35px omhoog zodra het kind op een lage halte stond, puur
  // omdat scrollHeight een paar pixels groter was: dezelfde kaart die per halte
  // net iets anders aangesneden staat, zonder dat er iets zichtbaar werd.
  /* Dit stond hier altijd als requestAnimationFrame, met als reden: goMap()
     roept show() pas ná deze render aan, en zolang het scherm nog niet .active
     is levert elke meting hier (scrollHeight, offsetHeight, getBoundingClientRect)
     domweg 0 op -- display:none heeft geen doos om op te meten. Wachten tot het
     ként dus.

     Maar wachten met requestAnimationFrame is een beeldje wachten, en dat is
     iets anders dan "tot show() geweest is": een rAF-callback loopt vóór de
     eerstvolgende verf, en daarmee ná de verf van dít beeldje. Precies dat
     beeldje toonde de kaart dus altijd al één keer ongeschaald (transform:
     none), vlak voordat kaartTerugZoom hieronder de intreeanimatie alsnog
     start -- scale(1.06) sprong er dan in één klap overheen, in plaats van
     dat je 'm vanaf het eerste zichtbare beeldje al ziet inzoomen. Dát was de
     tikje-te-grote flits waarna de kaart weer terugzakt (zie kaartKomtOp).

     Is het scherm al .active (elke kaartwissel behalve de allereerste van deze
     navigatie), dan is hier meteen wat te meten en hoeft er niet gewacht te
     worden. Staat het nog uit, dan zet goMap() dit apart en voert het zelf uit
     zodra het ná show() precies dezelfde taak nog loopt -- dus nog steeds vóór
     de eerste verf, niet een beeldje erna. */
  const voltooi = () => {
    kaartNaarHier(map);
    meetChroom();
    kopOpzij();
    // Terug uit een show: de kaart komt ingezoomd op die halte binnen en zakt
    // daar vandaan terug. Eénmalig -- de opdracht wordt hier verbruikt.
    if (kaartFocus) { const l = kaartFocus; kaartFocus = null; kaartTerugZoom(map, l); }
  };
  if (scherm.classList.contains('active')) voltooi();
  else tourMapVoltooi = voltooi;
  stofStart();
  // schuift de kaart, dan schuift zij onder de plakkende kop door
  map.onscroll = kaartScroll;
}

/* De weg op de kaart: drie lagen in de viewBox van de tekening, zie hieronder.
   Los van renderTourMap omdat hij niets van de haltes zelf weet -- alleen waar
   ze staan en tot waar ze open zijn. */
function tekenWeg(frame, shown, nodes, playable) {
  // De weg: één vloeiende curve door álle haltes, met het afgelegde stuk in goud
  // eroverheen. Getekend uit dezelfde percentages als de haltes, in de viewBox van
  // de tekening -- daarom valt hij op elk scherm precies op de haltes.
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('class', 'tour-road-svg');
  svg.setAttribute('viewBox', `0 0 ${VB_W} ${VB_H}`);
  svg.setAttribute('aria-hidden', 'true');
  const pts = nodes.map(n => ({ x: vbx(n.x), y: vby(n.y) }));
  const mkPath = cls => { const e = document.createElementNS(svgNS, 'path'); e.setAttribute('class', cls); return e; };
  // drie lagen: een donkere onderlaag voor de leesbaarheid, het hele pad dof, en
  // het afgelegde stuk in goud daar bovenop
  const unPath = mkPath('tour-road-under'), bgPath = mkPath('tour-road-bg'), fgPath = mkPath('tour-road-fg');
  const curve = shown.world.curve;
  const heleWeg = roadD(pts, pts.length, curve);
  unPath.setAttribute('d', heleWeg);
  bgPath.setAttribute('d', heleWeg);
  const lastOpen = Math.min(nodes.length - 1, playable - shown.first);
  fgPath.setAttribute('d', roadD(pts, lastOpen + 1, curve));
  svg.appendChild(unPath);
  svg.appendChild(bgPath);
  svg.appendChild(fgPath);
  frame.appendChild(svg);
  // pas mét de SVG in de opmaak kun je een pad opmeten, dus het streeppatroon hier
  const heelPatroon = roadDashArray(svg, pts, curve, pts.length);
  unPath.style.strokeDasharray = heelPatroon;
  bgPath.style.strokeDasharray = heelPatroon;
  fgPath.style.strokeDasharray = roadDashArray(svg, pts, curve, lastOpen + 1);
}
/* ================= Wereldstof: de kaart ademt een beetje =====================
   Een handvol vage lichtpuntjes ín de tekening, per wereld een eigen beweging:
   sneeuw valt in IJs, belletjes stijgen in Onderwater, vuurvliegjes zweven in de
   jungle. Geen bestand, geen tekst -- alleen een plek die leeft.

   Het is achtergrond, en daar hangen vier regels aan die het zo houden:
   - ONDER alles. De laag is het eerste kind van .world-frame, nog onder de weg,
     en de puntjes vallen nooit op een halte of op de plek waar zij erboven staat
     (stofPlekken). Kinderen kijken naar wat beweegt; dat mag nooit de knop zijn.
   - EEN DING TEGELIJK. De laag komt pas op als de hele kaart stilstaat -- geen
     grendel dicht en geen eindige animatie meer in #screen-map (haar landing, de
     sterren die landen, de klim). Haar wiegen is oneindig en telt niet mee.
   - SLAAPT. Twee minuten zonder tik en het stof dooft uit en staat stil
     (visibility: hidden, gepauzeerd); de volgende tik op de kaart wekt het. Een
     kind dat even wegkijkt houdt zo geen GPU wakker.
   - Wie geen beweging wil, krijgt het niet (stofStart doet dan niets, en het
     stijlblad verbergt de laag ook nog eens).
   Een ander scherm is display: none, dus daar loopt sowieso niets.

   Een wereld die hier niet staat (een nieuwe uit de studio) krijgt FONKEL_STOF:
   zachte fonkelingen, die passen op elke tekening. */
const FONKEL_STOF = { beweging: 'fonkel', kleur: ['#ffffff', '#fff1c4'] };
const WERELD_STOF = {
  muziek:     { beweging: 'stijg',  kleur: ['#ffe9a8', '#ffc4f0'] },
  snoep:      { beweging: 'stijg',  kleur: ['#ffffff', '#ffe0f0'] },
  jungle:     { beweging: 'zweef',  kleur: ['#eaff8f', '#fff3a0'] },
  piraten:    { beweging: 'fonkel', kleur: ['#ffffff', '#fff6d0'] },
  ijs:        { beweging: 'val',    kleur: ['#ffffff', '#eef9ff'] },
  tover:      { beweging: 'zweef',  kleur: ['#ead2ff', '#ffe28a'] },
  circus:     { beweging: 'fonkel', kleur: ['#ffe08a', '#ffffff'] },
  onderwater: { beweging: 'bel',    kleur: ['#e4faff', '#c6f2ff'] },
  ruimte:     { beweging: 'fonkel', kleur: ['#ffffff', '#d6e9ff'] },
  dino:       { beweging: 'zweef',  kleur: ['#fff0a0', '#ffe08a'] },
  vuur:       { beweging: 'stijg',  kleur: ['#fff4cc', '#ffe08a'] },
};
/* duur: per beweging, in seconden (gemiddeld; elk puntje wijkt tot 15% af).
   slaap: zo lang zonder tik blijft het stof aan. Eerst 20 tellen, en dan zag
   een kind dat gewoon naar de kaart keek het juist verdwijnen. */
const STOF = { aantal: 12, wacht: 400, slaap: 120000, duur: { stijg: 13, bel: 12, val: 14, zweef: 10, fonkel: 6 } };
let stofSlaap = 0, stofWacht = 0;

/* Waar de puntjes mogen staan, in procenten van het kader. Altijd dezelfde
   plekken voor dezelfde wereld (een vast zaadje), zodat de kaart niet bij elke
   keer openen anders oogt. Weg van elke halte, en van het vak erboven waar zij
   staat als ze daar is: 13% opzij en van 24% erboven tot 7% eronder -- haar
   maat (20cqw breed, ~40cqw hoog) omgerekend naar procenten van een 1215x2160
   kader. Opzij en in de hoogte binnen ZONE plus een randje: daarbuiten valt de
   tekening op een staande telefoon al van het scherm. Is een vakje helemaal
   bezet door haltes, dan blijft het leeg en worden het er minder. */
function stofPlekken(idx, nodes, beweging) {
  let z = (idx + 1) * 7919;
  const rnd = () => ((z = (z * 9301 + 49297) % 233280) / 233280);
  /* Gespreid: het kader in twaalf vakjes (twee breed, zes hoog) en in elk vakje
     één puntje, als het er vrij kan. Zuiver willekeurig klonterden ze samen in
     het enige grote vrije stuk, en dan is het een zwerm en geen sfeer. */
  /* Binnen ZONE en niet erbuiten: daarbuiten valt de tekening op een staande
     telefoon bijna van het scherm, en een puntje helemaal aan de rand ziet
     niemand. Wat stijgt begint lager en wat valt hoger, zodat de reis zelf
     door het midden gaat (zie de keyframes: een derde van het kader). */
  const schuif = beweging === 'stijg' || beweging === 'bel' ? 12 : beweging === 'val' ? -12 : 0;
  const x0 = ZONE.x0, bx = (ZONE.x1 - ZONE.x0) / 2;
  const y0 = ZONE.y0 - 4 + schuif, by = (ZONE.y1 - ZONE.y0 + 4) / (STOF.aantal / 2);
  const uit = [];
  for (let vak = 0; vak < STOF.aantal; vak++) {
    for (let poging = 0; poging < 40; poging++) {
      const x = x0 + (vak % 2 + rnd()) * bx, y = y0 + (Math.floor(vak / 2) + rnd()) * by;
      if (nodes.every(n => Math.abs(n.x - x) > 13 || y < n.y - 24 || y > n.y + 7)) { uit.push({ x, y, r: rnd() }); break; }
    }
  }
  return uit;
}
function wereldStof(shown, nodes) {
  const stof = WERELD_STOF[shown.world.id] || FONKEL_STOF;
  const laag = document.createElement('div');
  laag.className = 'wereld-stof ' + stof.beweging;
  laag.setAttribute('aria-hidden', 'true');
  laag.innerHTML = stofPlekken(shown.index, nodes, stof.beweging).map((s, i) => {
    const duur = (STOF.duur[stof.beweging] || 10) * (0.85 + s.r * 0.3);
    return `<i style="left:${s.x.toFixed(1)}%;top:${s.y.toFixed(1)}%;--c:${stof.kleur[i % 2]};` +
      `--s:${(0.75 + s.r * 0.5).toFixed(2)};--dx:${((s.r - 0.5) * 8).toFixed(1)};` +
      `animation-duration:${duur.toFixed(1)}s;animation-delay:-${(s.r * duur * 0.9 + i).toFixed(1)}s"></i>`;
  }).join('');
  return laag;
}
// Staat de kaart helemaal stil? Grendels dicht of een eindige animatie in het
// scherm (oneindige, zoals haar wiegen, tellen niet; het opkomen van het stof zelf ook niet).
function kaartRustig() {
  if (overgangBezig || vluchtOp || wereldReisOp) return false;
  const scherm = $('screen-map');
  if (!scherm.getAnimations) return true;
  return !scherm.getAnimations({ subtree: true }).some(a =>
    a.playState === 'running' && a.effect && a.effect.getTiming().iterations !== Infinity
    && !(a.effect.target && a.effect.target.closest && a.effect.target.closest('.wereld-stof')));
}
function stofLaag() {
  const s = $('screen-map');
  return s.classList.contains('active') ? s.querySelector('.wereld-stof') : null;
}
// Wekken: wacht tot de kaart rust, zet het stof aan en begin de slaaptimer.
function stofWek() {
  clearTimeout(stofWacht);
  const laag = stofLaag();
  if (!laag || motionOff()) return;
  if (!kaartRustig()) { stofWacht = setTimeout(stofWek, STOF.wacht); return; }
  laag.classList.add('wakker');
  clearTimeout(stofSlaap);
  stofSlaap = setTimeout(() => { const l = stofLaag(); if (l) l.classList.remove('wakker'); }, STOF.slaap);
}
function stofStart() {
  clearTimeout(stofSlaap);
  clearTimeout(stofWacht);
  stofWacht = setTimeout(stofWek, STOF.wacht);
}
// Elke tik op de kaart wekt het stof, of houdt het wakker.
$('screen-map').addEventListener('pointerdown', stofWek, { passive: true });
/* En zodra er iets anders op de kaart gaat bewegen (haar huppel na een tik, de
   ring van een halte) gaat het stof weer liggen tot dat voorbij is: één ding
   tegelijk, ook na de opkomst. Het scheelt ook werk. Zonder GPU (een trage
   tablet, en elke testbrowser) kost elk puntje de compositor per beeldje: acht
   wakkere puntjes waren daar ruim 100ms per seconde, en precies op het moment
   dat zij springt hoort die tijd naar haar te gaan. Gemeten in sterren zaak
   7e-kwart, die er een op de drie keer over viel. */
$('screen-map').addEventListener('animationstart', e => {
  const laag = stofLaag();
  if (!laag || !laag.classList.contains('wakker') || laag.contains(e.target)) return;
  const a = e.target.getAnimations && e.target.getAnimations().find(x => x.animationName === e.animationName);
  if (!a || a.effect.getTiming().iterations === Infinity) return;
  laag.classList.remove('wakker');
  stofStart();
});

/* Eén halte op de kaart, als knop. stand is wat renderTourMap één keer
   uitrekent en voor elke halte hetzelfde is (wie, tot waar open, waar de ster
   staat, welke halte net af is). */
function haltKnop(shown, nodes, i, stand) {
  const { p, playable, travelling, heroLvl, netAfLvl, reisTot } = stand;
  const n = nodes[i];
  const lvl = shown.first + i;
  const open = lvl <= playable;
  const st = p.stars[lvl] || 0;
  const b = document.createElement('button');
  // tijdens de reis-tussenstand is er even geen "hier spelen"-halte
  b.className = 'tour-stop ' + (!open ? 'locked' : (!travelling && lvl === heroLvl) ? 'next' : 'done');
  b.dataset.lvl = lvl;
  b.style.left = n.x + '%';
  b.style.top = n.y + '%';
  // drie sterren = deze halte is áf (zie .tour-stop.perfect). Sinds fase 4C zit
  // dat in de rand en in het gouden sterrentabje, en niet meer in een glans die
  // eroverheen glijdt -- er valt dus ook niets meer te ontregelen in de tijd.
  if (open && st === 3) b.classList.add('perfect');
  const hero = lvl === heroLvl
    ? `<div class="tour-hero"><div class="avatar-holder idle">${pasLaag(avatarSVG(p, 96, 'kaart'))}</div></div>` : '';

  // gespeeld = deze show is al een keer gedaan, dus er hóórt een score te staan
  // (ook 0 van 3 is een score). De huidige halte krijgt alleen een rij als daar
  // al sterren liggen -- zie starRowHTML.
  const gespeeld = open && lvl < playable;
  // rondje + sterrentabje zitten in één blokje: dat is wat er bij een tik
  // indrukt, en wat als geheel bij deze halte hoort (zie .stop-body)
  const sterrenRij = starRowHTML(st, gespeeld);
  /* Het aankomst-moment hangt aan de sterrenrij en niet aan "gespeeld": speel je
     een halte over zonder dat de voortgang opschuift, dan is gespeeld false maar
     staat er wél een score -- en juist die mag je zien bijwerken. */
  if (lvl === netAfLvl && sterrenRij) b.classList.add('net-af');
  /* Het schatteken bij de laatste halte (fase 6E). Alleen daar, alleen zolang
     de schat van deze wereld nog niet van haar is, en bewust niets meer dan een
     teken. Eén teken op de hele kaart, bij de plek waar de route heen
     loopt -- dat is de bedoeling ("daar ligt iets") en niet een tweede
     statussysteem over de haltes heen. Het verdwijnt zodra ze hem heeft.
     Het teken is een kaartje met de schat erop, in kleur: dezelfde witte tegel
     als in de kleedkamer, met een lipje naar de halte. Eerst was het hier een 🎁
     (dat zegt elders "er ligt een trofee klaar"), daarna de prijs van de wereld
     als silhouet: een bleek podium met een zwarte vorm. Op deze maat las dat
     podium als een vuil schoteltje, en van een getekende schat bleef zwart soms
     alleen een vlek over (de kroon van Onderwater). Dus geen podium en geen
     geheim meer op de kaart: ze ziet wát ze bij de laatste show wint, en dat is
     het lokkertje. Het feestje onthult daarna het podium eronder.
     EN ALLEEN VLAK VOOR HET EIND: zolang de volgende show die van de laatste
     halte is (lvl === playable). Bij haltes 1 tot 7 is de kaart rustig -- een
     prijs die er de hele wereld lang stond was nog een ding op een scherm dat al
     beweegt. Bij de laatste show komt hij één keer op: deze wint hem.
     Staat de halte in het rechterdeel van de tekening, dan hangt het kaartje
     links van haar: rechts viel het anders over de schermrand (Onderwater). */
  const laatste = i === nodes.length - 1 && lvl === playable;
  const schat = laatste ? beloningItem(shown.world) : null;
  const schatTeken = (schat && !p.owned.includes(schat.id))
    ? `<span class="stop-schat${n.x > 70 ? ' links' : ''}" aria-hidden="true">`
      + (schat.thumb ? schat.thumb(curBase()) : `<span class="thumb-emo">${schat.emoji || '🎁'}</span>`) + '</span>' : '';
  b.innerHTML = `${hero}<div class="stop-body"><div class="dot">${i + 1}</div>`
    + `${schatTeken}${sterrenRij}</div>`;
  /* Het slotje is weg; de voorleesnaam zegt het nog wél. Wie de kaart met een
     schermlezer doorloopt heeft geen kleur en geen plek op de route -- daar is
     "nog op slot" het enige wat de staat draagt, en dat is geen beeldruis. */
  b.setAttribute('aria-label', `${shown.world.name}, show ${i + 1}`
    + (open ? ` — ${st} van 3 sterren` : ' — nog op slot')
    + (schatTeken ? ' — hier ligt een wereldschat' : ''));
  // Tikken op een halte is niet "start een level" maar "ga die plek binnen":
  // enterLevel doet het klikje, de halte-reactie en de overgang, en roept
  // startLevel meteen zelf aan. Zie de bewegingstaal boven goMap.
  /* Zij staat ín de knop van haar halte, dus een tik op haar komt hier ook
     langs. Dat is nooit "speel": de halte eronder is de enige weg de zaal in
     (zie kaartTik). */
  if (open) b.onclick = e => {
    const ster = e && e.target && e.target.closest && e.target.closest('.tour-hero');
    if (ster) kaartTik(ster, b); else enterLevel(lvl, b);
  };
  /* De halte waar ze nu naartoe loopt staat nog dicht, maar een kind tikt er al
     op -- daar gaat ze immers heen. Die tik wacht tot ze er is (zie naLanding), en
     dan gaat de nieuwe halte de zaal in. De rimpel zegt meteen dat hij aankwam. */
  else if (travelling && lvl <= reisTot) b.onclick = () => {
    const r = b.getBoundingClientRect();
    tapRipple(r.left + r.width / 2, r.top + r.height / 2);
    naLandingZet(() => {
      const nu = $('tour-map') && $('tour-map').querySelector(`.tour-stop[data-lvl="${lvl}"]`);
      if (nu && !nu.classList.contains('locked') && $('screen-map').classList.contains('active')) enterLevel(lvl, nu);
    });
  };
  else b.onclick = () => slotHalte(b);
  return b;
}
/* Een tik op een halte op slot. Hier deed die tik niets: hij had geen raakvlak,
   dus viel hij door naar de tekening. Werelden antwoordt op een wereld op slot
   met een wiebel en een zin; de kaart doet het zonder woorden. De halte wiebelt
   "nee" (de beweging van het slotje in Werelden), en haar eigen halte zegt waar
   het wél is, met precies de groet van de kaart: zij huppelt, en haar halte
   ringt als ze landt (zie hierBenIk). Staat zij niet op deze kaart (een uitstapje),
   dan is er alleen de wiebel en het tikje. Niet tijdens een overgang of vlucht:
   dan beweegt de kaart al. */
function slotHalte(b) {
  if (overgangBezig || vluchtOp || wereldReisOp) return;
  const dot = b.querySelector('.dot');
  if (dot) {
    dot.classList.remove('nee');
    void dot.offsetWidth;
    dot.classList.add('nee');
    setTimeout(() => dot.classList.remove('nee'), 600);
  }
  sndTap();
  const map = $('tour-map');
  const el = map && map.querySelector('.tour-stop.next .tour-hero .avatar-holder');
  if (!el || el.classList.contains('dancing')) return;
  clearTimeout(groetTimer);   // een groet die nog moest komen: dit ís hem al
  groetTimer = null;
  hierBenIk(el);
}
/* Hoe hoog de kop en de navigatiebalk werkelijk zijn. De wereldknoppen gaan daar
   tussenin staan, en die maten hangen af van het lettertype, de veilige zones van
   het toestel en de toestelmaat die in de studio gekozen is -- dus opmeten in
   plaats van vastzetten. */
/* Komt de ster tegen de bovenbalk aan te staan? Opmeten en niet uitrekenen: waar
   zij staat hangt af van de halte, van de toestelmaat én van hoe ver de kaart
   geschoven is (op een tablet schuift hij, en de kop plakt aan de vensterrand).
   Alleen verticaal vergelijken -- dat dimt ook als ze net naast een pil staat, maar
   het is voorspelbaar, en een halve pil naast haar hoofd leest slechter dan geen. */
/* Aan de scroll van de kaart, en achter een rAF -- niet kopOpzij zelf.

   kopOpzij meet twee rechthoeken op, en dat dwingt de opmaak af. Eén keer is
   niets; bij élke scrollgebeurtenis is het de enige plek in de app die dat doet
   (de kast, het ouderdeel en de reis hangen alle drie al achter zo'n klemmetje).
   Hij stond hier als enige rechtstreeks aan onscroll.

   De klem zit om de áánroep en niet om kopOpzij, want die wordt ook twee keer
   rechtstreeks aangeroepen -- door renderTourMap vlak voordat het beeldje
   geverfd wordt, en door de resize. Die twee moeten synchroon blijven: een
   beeldje later is daar precies het beeldje dat ze moesten wegnemen.

   Op een telefoon schuift de kaart trouwens helemaal niet (één wereld vult het
   kader); dit gaat over een tablet en een breed venster. */
function kaartScroll() { rafKlem(kopOpzij); }
function kopOpzij() {
  const scherm = $('screen-map');
  if (!scherm) return;
  const kop = scherm.querySelector('.screen-header');
  /* Alleen de ster op de kaart die er nú staat (#tour-map). Tijdens een
     wereldreis hangt de vorige wereld er nog even als schaduwlaag naast, mét
     haar ster -- en die vond querySelector eerst. Dan bleef de kop gedimd
     terwijl je naar een wereld keek waar je ster helemaal niet staat. */
  const kaart = $('tour-map');
  const ster = kaart && kaart.querySelector('.tour-hero');
  if (!kop || !ster) { scherm.classList.remove('ster-bij-kop'); return; }
  const k = kop.getBoundingClientRect(), s = ster.getBoundingClientRect();
  scherm.classList.toggle('ster-bij-kop', s.top < k.bottom && s.bottom > k.top);
}
/* Alleen meten wat er ook echt stáát. De navigatiebalk is display:none tot show()
   het scherm aanzet, en goMap() tekent de kaart vóór die show() -- dus bij de eerste
   opbouw was offsetHeight 0 en de onderrand 0, en kwam --nav-h uit op vensterhoogte
   + 12. Op een telefoon viel dat niet op (daar gebruikt .tour-map die maat niet),
   maar op een breed scherm is de padding-bottom van .tour-map er wél op gebouwd:
   die 962px duwde de contentbox naar nul hoogte, 100cqh werd nul, en het kader viel
   terug op zijn ondergrens van 340px -- half buiten beeld. Eén keer het venster
   verslepen zette het recht, en dát maakte het zo'n lastig verhaal.

   Een 0 betekent hier "nog niet opgebouwd", niet "nul hoog": dan liever niets
   schrijven en de CSS zijn eigen terugval laten gebruiken. */
function meetChroom() {
  const scherm = $('screen-map');
  const kop = scherm.querySelector('.hub-sticky');
  const nav = $('main-nav');
  if (kop && kop.offsetHeight) stijlVar(scherm, '--kop-h', (kop.offsetHeight + 12) + 'px');
  if (nav && nav.offsetHeight) {
    const n = nav.getBoundingClientRect();
    /* Dezelfde plek, maar gemeten vanaf de onderrand van het scherm zelf in plaats
       van die van het venster: daar hangt .mem-fab aan (zie daar). Die twee randen
       vallen samen, behalve als het venster na het opstarten van hoogte veranderd
       is (--vh-lock, de adresbalk) -- en precies dan sprong het knopje na elke
       aankomst op de kaart. Layoutmaten voor het scherm, geen omtrek: dit kan
       draaien terwijl het nog inzoomt, en die schaal hoort er niet in. Eerst alles
       meten en dan pas schrijven (zie stijlVar). */
    const ouder = scherm.offsetParent;
    const bodem = (ouder ? ouder.getBoundingClientRect().top : 0) + scherm.offsetTop + scherm.offsetHeight;
    stijlVar(scherm, '--nav-h', (nav.offsetHeight + (innerHeight - n.bottom) + 12) + 'px');
    stijlVar(scherm, '--fab-onder', Math.round(bodem - n.top) + 'px');
  }
  terugUitlijnen();
}
/* Een maat alleen opschrijven als hij verandert. Bij elke aankomst op de kaart
   meten meetChroom, terugUitlijnen en kopOpzij na elkaar, en elke meting moet de
   opmaak van het hele scherm klaar hebben. Schrijft de vorige er een variabele
   tussen -- ook al is het dezelfde waarde als er al stond -- dan rekent de
   browser alles opnieuw uit voor de volgende: drie keer achter elkaar, in het
   eerste beeldje van de overgang (6x geremd: zo'n 250 ms). Meestal is de maat
   gewoon nog dezelfde als de vorige keer, en dan kost de meting nu één keer. */
function stijlVar(el, naam, waarde) {
  if (el.style.getPropertyValue(naam) !== waarde) el.style.setProperty(naam, waarde);
}
/* Schuift de kaart (liggend, of een tablet), dan staat de halte waar zij staat in
   het midden. renderTourMap doet dit bij elke opbouw, de draai hieronder ook, en
   kaartThuis (🗺 op je eigen kaart) glijdt naar dezelfde plek. kaartHierDoel is
   die plek als schuifstand, of null als de kaart niet schuift.

   Op een uitstapje (een eerdere wereld, via Werelden) staat zij er niet, en dan
   is de plek de eerste halte waar nog een ster ontbreekt -- daarvoor kom je er.
   Is alles perfect, dan halte 1. Hier viel de kaart eerst terug op de láátste
   halte, en dan opende hij liggend en op een staande tablet bovenaan: halte 8 in
   beeld, halte 1 en 2 eronder of onder de navigatiebalk. renderTourMap zet het
   vlaggetje; tijdens een reis staat het nooit aan. */
function kaartHierDoel(map) {
  const here = map.querySelector('.tour-stop.next')
    || (map.dataset.uitstap ? map.querySelector('.tour-stop.done:not(.perfect)') || map.querySelector('.tour-stop')
      : map.querySelector('.tour-stop.done:last-of-type'));
  const f = map.querySelector('.world-frame');
  const schuift = here && f && map.scrollHeight > map.clientHeight + 4
    && getComputedStyle(map).overflowY !== 'hidden';
  if (!schuift) return null;
  return Math.max(0, Math.min(map.scrollHeight - map.clientHeight,
    here.getBoundingClientRect().top - f.getBoundingClientRect().top - map.clientHeight / 2));
}
function kaartNaarHier(map) {
  const doel = kaartHierDoel(map);
  if (doel != null) map.scrollTop = doel;
}
addEventListener('resize', () => rafKlem(kaartChroomMeten));
/* Een toestel dat gedraaid wordt, krijgt de kaart opnieuw op haar halte. Staand
   schuift een telefoon niet, liggend wel -- en de schuifstand van staand is dan 0,
   dus kwam de kaart liggend bovenaan uit: de laatste halte in beeld, zij ergens
   eronder buiten het scherm. Alleen bij een échte draai (breed wordt hoog of
   andersom), niet bij elke resize: een adresbalk die inklapt mag een kind dat zelf
   aan het schuiven is niet terugzetten. */
let kaartLiggend = innerWidth > innerHeight;
function kaartChroomMeten() {
  if (!$('screen-map')) return;
  meetChroom(); kopOpzij();
  const liggend = innerWidth > innerHeight;
  if (liggend === kaartLiggend) return;
  kaartLiggend = liggend;
  kaartDraaiBij(0);
}
/* Midden in een vlucht of een klim beweegt de camera zelf; dan pas erna, anders
   trekt de draai de kaart onder de landing vandaan. */
function kaartDraaiBij(n) {
  const map = $('tour-map');
  if (!map || !$('screen-map').classList.contains('active')) return;
  if (wereldReisOp || vluchtOp || overgangBezig) { if (n < 40) setTimeout(() => kaartDraaiBij(n + 1), 150); return; }
  kaartNaarHier(map);
}
/* Drie plekken, altijd -- maar alleen onder een halte die gespeeld is.

   Hiervoor stonden er alleen de verdiende sterren: 1/3 was één los sterretje, 2/3
   waren er twee. Het verschil tussen "bijna af" en "áf" moest je daardoor téllen,
   en dat is precies het ene ding dat een kind op deze kaart in één blik hoort te
   zien -- het is de reden om een show nog eens te spelen. Met drie vaste plekken
   zijn 1/3, 2/3 en 3/3 drie silhouetten die je herkent zonder te kijken.

   Waarom niet ónder élke halte: een halte op slot en een halte waar je nog moet
   spelen hebben per definitie niets verdiend, en drie lege plekken zeggen daar
   niets wat de stoffige vulling of de gouden halte niet al zegt. Ze zouden alleen de kaart
   voller maken en -- onder de huidige halte -- met de ster erbovenop concurreren.
   Vandaar: de rij hoort bij een score, en een score bestaat pas na een show.

   Getekend en niet ⭐: een emoji heeft geen lege variant, en hij wordt per
   toestel anders getekend. Naast elkaar valt dat op. */
const STER_PAD = 'M12 2.6l2.94 5.96 6.58.96-4.76 4.64 1.12 6.55L12 17.62'
  + 'l-5.88 3.09 1.12-6.55L2.48 9.52l6.58-.96z';
function starRowHTML(n, gespeeld) {
  const got = Math.max(0, Math.min(3, n | 0));
  if (!gespeeld && !got) return '';
  /* Drie paden per ster: .cs-lip is het donkere lipje eronder (een fractie
     omlaag), .cs-rand de witte stickerrand (zie "De sterren onder de halte"),
     zodat er geen tabje en geen filter nodig is. .leeg op de svg zelf is de
     haak voor het eenmalige fonkelen. */
  const ster = vol => `<svg viewBox="0 0 24 24" aria-hidden="true"${vol ? '' : ' class="leeg"'}>`
    + `<path class="cs-lip" transform="translate(0 1.5)" d="${STER_PAD}"/>`
    + `<path class="cs-rand" d="${STER_PAD}"/>`
    + `<path class="${vol ? 'cs-vol' : 'cs-leeg'}" d="${STER_PAD}"/></svg>`;
  return `<div class="cstars">${ster(got > 0)}${ster(got > 1)}${ster(got > 2)}</div>`;
}
/* De maat van de reis over de kaart: één duur, één vertraging, één easing. Het
   goud (growRoad hieronder) en de ster (heroRoadFrames) gebruiken alle drie
   dezelfde getallen -- dat is de enige manier waarop ze gegarandeerd samen
   aankomen.

   REIS_WACHT is de opkomst van de kaart en geen beat: die loopt van 110 tot
   300ms (MOTION.komNa + MOTION.kom, zie kaartKomtOp), dus ze zet haar eerste
   stap een tiende nadat het scherm stilstaat. Korter en ze vertrekt terwijl de
   kaart nog inzoomt; langer en het wordt een moment om op te wachten. Hier stond
   dat dit de tel was waarin de sterrenlanding uitdempte -- die landing is weg
   (zie reisBinnenWereld in goMap) en het getal bleef, om deze andere reden. */
const REIS_DUUR = 1400, REIS_WACHT = 400, REIS_EASING = 'ease-in-out';
/* Hoe lang de wandeling duurt hangt af van hoe ver het is. Elke show eindigt
   met deze wandeling, dus een vaste 1400ms was voor een halte vlak naast de
   vorige een tel wachten op niets. Nu: de afstand op het scherm, tussen
   REIS_KORT en REIS_DUUR. Gemeten op 390x844 (werelden 1 tot 11) liggen
   buurhaltes 76 tot 231px uit elkaar: dat wordt 950 tot ongeveer 1280ms, en
   alleen een nog langer stuk (een groot scherm) komt aan de oude 1400. */
const REIS_KORT = 950;
function reisDuur(van, naar) {
  if (!van || !naar) return REIS_DUUR;
  const a = van.getBoundingClientRect(), b = naar.getBoundingClientRect();
  const px = Math.hypot(b.left - a.left, b.top - a.top);
  return Math.round(Math.min(REIS_DUUR, Math.max(REIS_KORT, 700 + px * 2.5)));
}
/* Waar het vonkenspoor onderweg uit kiest. Bewust zonder ⭐ (en zonder 💖 en 🎵,
   die hun eigen plek hebben): een ster is op deze kaart een score en geen sier. */
const REIS_VONKEN = ['✨', '💫'];

/* Het goud van de afgelegde weg groeit mee met het huppelen, in plaats van pas ná
   aankomst in één klap door te schieten.

   PS-36 -- dit gebeurde eerst via één streep die als geheel groeide: fg kreeg zijn
   hele weg-tot-nu als één dash (stroke-dasharray = total) en een dashoffset die
   naar 0 liep. Dat verft dus een dóórlopende, effen gouden streep -- precies het
   stippelpatroon dat de rest van de weg draagt (zie DASH_ON/DASH_OFF) verdween
   voor de duur van de reis en klapte er bij aankomst weer op terug. Een kind ziet
   dat als een sprong: eerst een vage stip-streep die vast staat, dan opeens een
   vast stipje-voor-stipje pad.

   Nu blijft fg zelf de hele reis lang gewoon het echte streeppatroon dragen (zie
   roadDashArray hieronder) -- er verandert dus nooit iets aan hóe de weg getekend
   is. Wat groeit is een onzichtbaar masker: een eigen streep, boven op hetzelfde
   pad, die van de oude naar de nieuwe halte vult en alleen bepaalt wélk stuk van
   de al-gestippelde fg zichtbaar is. Dat masker mag zelf best één brede, effen
   streep zijn -- het wordt nooit getekend, het dekt alleen af. */
function growRoad(map, fromLvl, toLvl, duration, delay) {
  const svg = map.querySelector('.tour-road-svg');
  const fg = svg && svg.querySelector('.tour-road-fg');
  if (!svg || !fg || !fg.animate || !fg.getTotalLength) return null;
  const shown = worldForIndex(viewWorldIdx);
  const pts = worldNodes(shown).map(n => ({ x: vbx(n.x), y: vby(n.y) }));
  const curve = shown.world.curve;
  const fromIdx = fromLvl - shown.first, toIdx = toLvl - shown.first;
  if (fromIdx < 0 || toIdx <= 0 || toIdx >= pts.length) return null;
  const d = roadD(pts, toIdx + 1, curve);
  fg.setAttribute('d', d);
  // het echte streeppatroon voor dit stuk -- hetzelfde dat er zou staan als de
  // reis al voorbij was, dus geen sprong bij aankomst (zie renderTourMap)
  fg.style.strokeDasharray = roadDashArray(svg, pts, curve, toIdx + 1);
  fg.style.strokeDashoffset = '';
  const total = fg.getTotalLength();
  // lengte tot de oude halte: even hetzelfde pad opmeten, ingekort
  const probe = fg.cloneNode();
  probe.removeAttribute('mask');
  probe.setAttribute('d', roadD(pts, fromIdx + 1, curve));
  svg.appendChild(probe);
  const covered = fromIdx > 0 ? probe.getTotalLength() : 0;
  probe.remove();

  // Het masker: een eigen, brede streep over exact hetzelfde pad, die opengeschoven
  // wordt zoals de oude fg dat deed. Verwijdert een eerder masker van een reis die
  // hier is blijven hangen (zie ook stopWereldReis) -- er hoort er maar één te zijn.
  const oud = svg.querySelector('#road-reveal');
  if (oud) oud.remove();
  const svgNS = 'http://www.w3.org/2000/svg';
  const mask = document.createElementNS(svgNS, 'mask');
  mask.id = 'road-reveal';
  mask.setAttribute('maskUnits', 'userSpaceOnUse');
  mask.setAttribute('x', 0); mask.setAttribute('y', 0);
  mask.setAttribute('width', VB_W); mask.setAttribute('height', VB_H);
  const reveal = document.createElementNS(svgNS, 'path');
  reveal.setAttribute('d', d);
  reveal.setAttribute('fill', 'none');
  reveal.setAttribute('stroke', '#fff');
  reveal.setAttribute('stroke-width', 24);   // ruim over de 14 van .tour-road-fg heen
  reveal.setAttribute('stroke-linecap', 'round');
  reveal.style.strokeDasharray = total;
  reveal.style.strokeDashoffset = total - covered;
  mask.appendChild(reveal);
  svg.appendChild(mask);
  fg.setAttribute('mask', 'url(#road-reveal)');

  /* Niet alleen de animatie terug, maar ook de maat waarin hij gedacht is: welk
     pad, en waar op dat pad de oude en de nieuwe halte liggen. De ster loopt
     daar overheen (zie heroRoadFrames) -- met dezelfde lengtes, dezelfde duur
     en dezelfde easing lopen het goud en zij per definitie gelijk op. */
  return {
    anim: reveal.animate(
      [{ strokeDashoffset: total - covered }, { strokeDashoffset: 0 }],
      { duration, delay, easing: REIS_EASING, fill: 'forwards' }),
    pad: fg, van: covered, tot: total, start: pts[fromIdx],
  };
}
/* De ster loopt ÓVER de weg, niet er dwars overheen.

   Hiervoor huppelde ze in een rechte lijn: zes keyframes over translate(dx, dy)
   tussen de twee haltes, met een sprongetje op de oneven punten. Op een recht
   stuk viel dat niet op -- maar de weg bólt (zie ROAD_BOW/defaultControl, en in
   de studio buigt elk stuk apart om een rots heen), en juist in die bochten
   sneed ze de hoek af. Je zag haar dan naast haar eigen gouden spoor lopen: twee
   bewegingen die hetzelfde moment vertellen en toch een andere weg nemen.
   Opgemeten over alle 42 stukken weg van de zes werelden, op een toestel van 390
   breed: gemiddeld 23px naast de weg, en op het bochtigste stuk (Junglewereld,
   stuk 7) 98px -- dat is bijna een hele halte breed.

   Nu komt haar plek uit hetzelfde pad als het goud. growRoad zet fg op de d t/m
   de nieuwe halte en meet waar de oude halte op dat pad ligt (van) en waar de
   nieuwe (tot); hier wordt datzelfde pad op gelijke afstanden afgetast met
   getPointAtLength. Eén voortgang 0 -> 1 stuurt dus allebei:

     goud   strokeDashoffset = tot - (van + lengte * voortgang)
     ster   getPointAtLength(van + lengte * voortgang)

   Ze lopen daardoor niet gelijk op omdat de duur toevallig dezelfde is, maar
   omdat het dezelfde maat is. Beide animaties krijgen dezelfde duur (reisDuur),
   REIS_WACHT en REIS_EASING; die easing werkt op de tíjd en niet op de keyframes, dus de
   keyframes hieronder mogen gewoon op gelijke afstanden liggen -- WAAPI rekent
   de tijd eerst om en interpoleert er daarna tussen. Precies wat het goud ook
   doet, met zijn twee keyframes.

   TWEE LAGEN, en dat is de hele opzet. De halte-laag (.tour-hero) staat éxact op
   de weg -- niets erbij, geen veer, geen boog. Het loopje zit één laag dieper, op
   de tekening zelf (zie heroWalkFrames). Zo kan het loopje nooit haar plek op de
   weg beïnvloeden: wat er ook met haar houding gebeurt, haar voeten staan waar het
   goud is.

   Hier stond eerst wél een veer op deze laag (REIS_VEER, 38 eenheden ~ 12px). Dat
   werkte, maar het was de verkeerde laag: het is houding en geen plek, en twee
   verticale bewegingen boven op elkaar stapelen is precies hoe ze weer van de weg
   af drijft. Eén verticale beweging dus, en die zit binnenin.

   WAT ZE NIET DOET is meedraaien met de bocht. Een tangenthoek zou haar op een
   scherp stuk zichtbaar schuin zetten, en ze staat in de hele app rechtop -- op
   de kaart, in de kleedkamer, op het eindscherm. Alleen haar pósitie volgt de
   weg; haar houding is van haar.

   EENHEDEN. De weg staat in viewBox-eenheden, de ster verschuift in pixels
   binnen het kader. De SVG dekt het kader precies (.tour-road-svg: inset 0,
   100%/100%) en .world-frame heeft dezelfde beeldverhouding als de viewBox (zie
   VB_W), dus er is geen brievenbus en de omrekening is één schaal per as. Haar
   basis is translateX(-50%) binnen haar eigen halte; wat we animeren is dus het
   verschil met de oude halte, niet een absolute plek. */
const REIS_STAPPEN = 40;   // aftastpunten over het stuk weg -- ruim genoeg voor de scherpste bocht
/* Hoeveel pixels één viewBox-eenheid is in het kader waar de kaart in staat.
   Layoutmaten en geen getBoundingClientRect: midden in een kaartovergang staat er
   een transform op de kaart, en daar hoort deze omrekening niets van te merken. */
function kaderSchaal(map) {
  const frame = map && map.querySelector('.world-frame');
  const w = frame ? frame.clientWidth : 0, h = frame ? frame.clientHeight : 0;
  return (w > 0 && h > 0) ? { x: w / VB_W, y: h / VB_H } : null;
}
function heroRoadFrames(map, geo) {
  const pad = geo && geo.pad;
  const sch = kaderSchaal(map);
  if (!sch || !pad || !pad.getPointAtLength || !geo.start) return null;
  const lengte = geo.tot - geo.van;
  if (!(lengte > 0)) return null;
  const frames = [];
  for (let i = 0; i <= REIS_STAPPEN; i++) {
    const t = i / REIS_STAPPEN;
    const pt = pad.getPointAtLength(geo.van + lengte * t);
    const dx = (pt.x - geo.start.x) * sch.x;
    const dy = (pt.y - geo.start.y) * sch.y;
    frames.push({
      transform: `translate(calc(-50% + ${dx.toFixed(2)}px), ${dy.toFixed(2)}px)`,
      offset: t,
    });
  }
  return frames;
}
/* HET LOOPJE. Onderweg gleed ze: haar plek klopte tot op de pixel, maar er
   gebeurde verder niets met haar, en een pop die over een weg schuift leest als
   een pion op een bord in plaats van als iemand die ergens heen gaat.

   Eerst was dit de kleinst mogelijke ingreep die dat omdraaide: drie zachte pasjes
   van een goeie 4px. Dat was het verschil tussen glijden en lopen, maar op een
   telefoon zag je het nauwelijks -- ze schoof nog steeds als een pion.

   HUPPELPASJES (oktober 2026). Nu zijn het drie lichte huppels van ~10px, in de
   taal van haar groet (zie HUPPEL): ze zakt eerst even door de knieën (aanloop),
   elke landing deukt haar een tikje in, en de laatste landing loopt over in de
   landing van de huppel op haar nieuwe halte (zie heroLanding), waarna die halte
   antwoordt met de ring. Elke huppel is een parabool en geen |sin|: in de lucht
   zweeft ze even, en het contact met de weg is kort -- zo leest het als springen.
   Haar schaduw (.tour-hero::after) doet mee: kleiner en lichter in de lucht,
   breder als ze neerkomt, net als bij schaduwHuppel in het stijlblad.

   OP .pas-laag, niet op de houder en niet op de tekening. Die laag bestaat al voor
   de danspasjes en is er om precies één reden (zie het stijlblad bij .pas-laag):
   de ster op de kaart draagt een SVG-filter, en een transform óp een gefilterd
   element laat de browser dat filter elk beeldje opnieuw uitrekenen. Het loopje
   hoort dus op dezelfde laag als de pasjes, met hetzelfde draaipunt bij haar
   voeten -- en dan kost het niets. Het wiegen op de houder erboven (.idle, sway)
   loopt gewoon door: geneste transforms vermenigvuldigen, dus ze wiegt én loopt.

   BEGIN OP NIETS, EIND IN DE DEUK. Het eerste beeldje is exact haar ruststand (de
   aanloop groeit uit nul). Het laatste is de deuk van de landing, en daar neemt
   heroLanding het over op de nieuwe halte, in dezelfde taak -- er zit dus geen
   beeldje tussen waarin ze rechtop terugklikt.

   DEZELFDE TIJD als de baan en het goud: reisDuur, REIS_WACHT, REIS_EASING. De
   easing werkt op de tijd, dus haar pas gaat vanzelf mee met haar snelheid --
   traag aan het begin, vlotter in het midden. */
const REIS_HOP = {
  passen: 3,      // huppels over de hele reis -- 300 tot 430ms per huppel (zie reisDuur)
  hoogte: 26,     // hoogte van één huppel, in viewBox-eenheden (~10px op een telefoon)
  rek: 0.03,      // 3% langer in de lucht, en iets smaller
  deuk: { x: 0.06, y: 0.08, breed: 0.12 },   // de deuk rond elke landing, als deel van één huppel
  aanloop: 0.08,  // het deel van de reis waarin ze door de knieën zakt voor ze afzet
  land: 240,      // ms: de landing op de nieuwe halte (heroLanding)
};
function heroWalkFrames(map) {
  const sch = kaderSchaal(map);
  if (!sch) return null;
  const H = REIS_HOP, stap = [], schaduw = [];
  for (let i = 0; i <= REIS_STAPPEN; i++) {
    const t = i / REIS_STAPPEN;
    let op = 0, deuk;
    if (t < H.aanloop) deuk = Math.sin(Math.PI / 2 * t / H.aanloop);
    else {
      const f = (t - H.aanloop) / (1 - H.aanloop) * H.passen;
      const u = t === 1 ? 1 : f - Math.floor(f);
      op = 4 * u * (1 - u);                                   // 0 op de grond, 1 op het hoogste punt
      deuk = Math.max(0, 1 - Math.min(u, 1 - u) / H.deuk.breed);
    }
    const sx = 1 - op * H.rek * 0.7 + deuk * H.deuk.x;
    const sy = 1 + op * H.rek - deuk * H.deuk.y;
    stap.push({
      transform: `translateY(${(-op * H.hoogte * sch.y).toFixed(2)}px) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`,
      // bij haar voeten, net als de danspasjes -- een rek mag haar niet van de weg tillen
      transformOrigin: '50% 95%',
      offset: t,
    });
    schaduw.push({
      transform: `translateX(-50%) scale(${(1 - op * 0.42 + deuk * 0.12).toFixed(3)})`,
      opacity: (1 - op * 0.55).toFixed(3),
      offset: t,
    });
  }
  return { stap, schaduw };
}
/* Een schaduw animeren gaat met pseudoElement: '::after'. Een browser die die optie
   niet kent negeert hem stil -- en zet de schaduwframes dan op haar hele halte-laag,
   met translateX(-50%) en al. Dus alleen als het toestel het echt kan; anders blijft
   de schaduw gewoon liggen, zoals vroeger. */
const SCHADUW_ANIM = typeof KeyframeEffect !== 'undefined' && 'pseudoElement' in KeyframeEffect.prototype;
/* De landing op de nieuwe halte. Na de reis tekent plaats() de kaart opnieuw en
   staat ze als een nieuw element op haar nieuwe halte; dit zet haar in dezelfde
   taak in de deuk waar de reis eindigde en laat haar uitveren -- dezelfde
   landing als die van de huppel (78% van mvHuppel), met haar schaduw erbij. De
   ring van de halte valt op hetzelfde moment (zie runTravel). */
function heroLanding(map) {
  const hero = map && map.querySelector('.tour-stop.next .tour-hero');
  const laag = hero && hero.querySelector('.pas-laag');
  if (!laag || !laag.animate) return;
  const D = REIS_HOP.deuk, opts = { duration: REIS_HOP.land, easing: 'cubic-bezier(.3,.7,.4,1)' };
  laag.animate([
    { transform: `scale(${1 + D.x}, ${1 - D.y})`, transformOrigin: '50% 95%' },
    { transform: 'scale(.98, 1.02)', transformOrigin: '50% 95%', offset: .55 },
    { transform: 'none', transformOrigin: '50% 95%' }], opts);
  if (SCHADUW_ANIM) hero.animate([
    { transform: 'translateX(-50%) scale(1.12)' }, { transform: 'translateX(-50%)' }],
    { ...opts, pseudoElement: '::after' });
}
/* De terugval als er geen pad te meten valt (geen SVG, een halte die niet in deze
   wereld ligt, een kader dat nog geen maat heeft): de rechte lijn van hiervoor,
   zodat de reis in het ergste geval oud gedrag vertoont in plaats van géén. Het
   afwisselende ease-in/ease-out per keyframe blijft staan -- dát maakt van drie
   knikken drie sprongetjes, en dat kan REIS_EASING over de tijd niet nadoen. */
function heroLineFrames(from, to) {
  const dx = to.offsetLeft - from.offsetLeft;
  const dy = to.offsetTop - from.offsetTop;
  const frames = [];
  for (let i = 0; i <= 6; i++) {
    frames.push({
      transform: `translate(calc(-50% + ${dx * i / 6}px), ${dy * i / 6 + (i % 2 ? -30 : 0)}px)`,
      offset: i / 6,
      easing: i % 2 ? 'ease-in' : 'ease-out',
    });
  }
  return frames;
}
/* De eerste keer dat een wereld opengaat.

   Dezelfde beweging als gewoon rondkijken -- de camera klimt, de afgemaakte wereld
   zakt onder het beeld weg en de nieuwe komt van boven binnen -- maar met meer lucht
   eromheen, want dit is het moment waar de hele wereld naartoe werkte:

     1  de badge van de afgemaakte wereld stijgt van de kaart naar de trofeeënkast
     2  de sterren van de zojuist gespeelde halte landen (zie starRevealBeat) --
        de beloning voor wat je net deed, vóórdat je ergens anders naartoe gaat
     3  een halve tel stilte: de afgemaakte wereld staat er nog, en dat mag even
     4  de camera klimt door, trager dan bij rondkijken en met meer aanzet
     5  de nieuwe wereld zakt op zijn plek -- het kader komt een tikje te groot
        binnen en zoomt na, zoals een camera die tot stilstand komt
     6  confetti en de naam van de wereld (zie vier() in runTravel)

   Wat het níet is: een tussenscherm, een titelkaartje of een beloningsvenster.
   De nieuwe wereld ís de beloning, dus die hoort in beeld te komen -- niet
   aangekondigd te worden door iets dat ervoor staat.

   Eén keer per wereld, en zonder dat daar iets voor opgeslagen wordt. runTravel
   draait alleen op een level-up, en het eindscherm zet p.level (en dus
   pendingTravel) alleen omhoog op de vóórste halte -- zie 'if (lvl === p.level)'
   daar. Een wereldgrens passeer je daardoor precies één keer. Verversen, de app
   opnieuw openen, een show overdoen, later terugkomen via de kiezer: geen van alle
   komt hier langs, want geen van alle is een level-up. Er is dus geen "al
   gezien"-vlag nodig, en er kan er ook geen scheef komen te staan.

   De badge vliegt vóór de stilte, niet erna: dezelfde beweging als flyDiamonds,
   dus dezelfde taal als "je hebt iets verdiend". Hij landt op de káárt waar de
   reis gebeurde, en niet pas op een volgend scherm. */
function runWorldChange(fromLvl, fromW, toW, plaats, vier, still) {
  const map = $('tour-map');
  if (!map || !map.animate || still) { plaats(); vier(); return; }
  /* De grendel gaat dicht vóór de beloningsbeat en de stilte, en niet pas als de
     camera vertrekt. Dat hele stuk is namelijk het enige gat waarin een kind nog
     een wereld zou kunnen kiezen -- en dan reist de kaart eerst daarheen en een
     tel later alsnog naar de wereld die net openging. De kaart zelf gaat om
     dezelfde reden op slot: een tik tijdens de beloning of de stilte hoort geen
     show te starten in een wereld die al uitgespeeld is.

     Wordt het alsnog afgebroken (de navigatiebalk, de terugknop van het
     toestel, een andere ster kiezen), dan zet de opruimer de nieuwe wereld gewoon
     neer -- zónder confetti, want dan staat het kind allang ergens anders te
     kijken. De voortgang en de zichtbare kaart blijven het eens. */
  let gestart = false, timer = 0;
  const wachten = () => {
    clearTimeout(timer);
    map.style.pointerEvents = '';
    if (!gestart && cur) plaats();
  };
  map.style.pointerEvents = 'none';
  wereldReisOp = wachten;
  const beeld = wereldBeeldKlaar(toW);
  /* DE VOLGORDE: eerst de sterren onder de halte die net af is, dán de
     wereldbadge die naar de kast vliegt, en pas als die aankomt de camera. De
     badge vertrok op 0 -- tegelijk met de sterrenlanding en terwijl de kaart nog
     inzoomde, drie plekken tegelijk. Nu vult hij de stilte vóór de klim, en de
     camera vertrekt als hij aankomt (BADGE.landt van zijn vlucht: het tikje,
     daarna is hij nog maar een stipje), nooit eerder dan WERELDREIS.beat. */
  starRevealBeat(fromLvl, () => {
    if (wereldReisOp !== wachten) return;   // ondertussen afgebroken -- wachten() heeft al opgeruimd
    // uit de halte die net af is, waar de sterren net landden -- één plek voor het oog
    const halte = map.querySelector(`.tour-stop[data-lvl="${fromLvl}"] .dot`) || map;
    flyBadge(halte, $('nav-tro'), fromW.world.icon || '🌍');
    timer = setTimeout(() => beeld.then(() => {
      // de tekening liet op zich wachten, en intussen is er afgebroken: wachten() heeft al opgeruimd
      if (wereldReisOp !== wachten) return;
      gestart = true;
      wereldReisOp = null;                    // de stilte geeft de grendel door aan de reis
      map.style.pointerEvents = '';
      const mee = zijReistMee(plaats, vier);
      wereldCamera(1, mee.teken, { duur: WERELDREIS.onthul, easing: WERELDREIS.traag, zoom: true, klaar: mee.klaar });
    }), Math.max(WERELDREIS.beat, Math.round(BADGE.duur * BADGE.landt)));
  });
}
/* De wereldbadge die opstijgt. Kleiner broertje van flyDiamonds: één stuk, vanaf het
   midden van de kaart, met een boogje. */
function flyBadge(vanEl, naarEl, teken) {
  if (!vanEl || !naarEl || !vanEl.animate) return;
  /* Bij beperkte beweging blijft de badge op de kaart en stijgt er niets op, en
     dan klinkt hij ook niet: het grote klankje hoort bij het moment en niet bij
     de vlucht, en dat laten beide aanroepers zelf klinken (zie vier() in
     runTravel en de toegift-tak). */
  if (motionOff()) return;
  const f = vanEl.getBoundingClientRect(), t = naarEl.getBoundingClientRect();
  const d = document.createElement('div');
  d.className = 'fly-badge';
  d.textContent = teken;
  d.style.left = (f.left + f.width / 2) + 'px';
  d.style.top = (f.top + f.height / 2) + 'px';
  document.body.appendChild(d);
  const dx = t.left + t.width / 2 - (f.left + f.width / 2);
  const dy = t.top + t.height / 2 - (f.top + f.height / 2);
  const a = d.animate([
    { transform: 'translate(-50%,-50%) scale(.3)', opacity: 0 },
    { transform: 'translate(-50%,-50%) scale(1.5)', opacity: 1, offset: .25 },
    { transform: `translate(calc(-50% + ${dx * .5}px), calc(-50% + ${dy * .5 - 60}px)) scale(1.2)`, opacity: 1, offset: .65 },
    { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.35)`, opacity: 0 },
  ], { duration: BADGE.duur, easing: 'ease-in-out' });
  a.onfinish = () => d.remove();
  /* Het tikje en het tabblad dat hem opvangt: allebei op het moment dat hij er
     is (BADGE.landt van de vlucht -- daarna is hij nog maar een stipje). Het
     tabblad deed niets, dus de badge verdween ergens in de balk.

     De lichte tik en niet het muntje. Dat stond hier, maar een wereldbadge is
     geen diamant: het muntje betekent overal anders betalen of verdienen. En het
     viel op twee plekken waar het niet hoort: midden in de stilte vóór de
     camera over de grens klimt, en op het slotakkoord van "alle werelden uit".
     Een tik is klein genoeg voor allebei. */
  setTimeout(() => {
    sndTap();
    if (naarEl.isConnected && naarEl.animate) naarEl.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }],
      { duration: 320, easing: MOTION.plop });
  }, Math.round(BADGE.duur * BADGE.landt));
}
const BADGE = { duur: 1100, landt: .82 };

/* De beloning na een level-up: de ster huppelt over de route naar de volgende
   halte, die daar zichtbaar openspringt. Loopt de sprong over een wereldgrens,
   dan is er niets om naartoe te huppelen -- dan wisselt de kaart van wereld en
   krijgt de aankomst een eigen titelkaartje. */
function runTravel(t) {
  const p = P();
  const fromW = worldFor(t.from), toW = worldFor(t.to);
  const crossing = fromW.index !== toW.index;
  const map = $('tour-map');
  const from = map.querySelector(`.tour-stop[data-lvl="${t.from}"]`);
  const to = map.querySelector(`.tour-stop[data-lvl="${t.to}"]`);
  const hero = from && from.querySelector('.tour-hero');
  const still = motionOff();
  /* Twee dingen die bij een wereldwissel niet op hetzelfde moment horen: de nieuwe
     wereld neerzetten en hem vieren. Binnen één wereld vallen ze samen (de ster is
     er, dus feest), maar bij een onthulling staat de wereld er al vóórdat je hem
     ziet -- daar komt het feest pas als de camera stilstaat. Vandaar twee functies
     in plaats van één finish(). */
  const plaats = () => { markWorldSeen(p, toW.index); showWorld(toW.index); };
  const vier = () => {
    const el = map.querySelector(`.tour-stop[data-lvl="${t.to}"]`);
    const dot = el && el.querySelector('.dot');
    /* Binnen een wereld landt ze op haar nieuwe halte, en die antwoordt met de ring
       -- hetzelfde antwoord als op haar groet (zie haltePuls). Hier plopte eerst
       het rondje zelf (.3 -> 1.3 -> 1), en een ring erbovenop zou twee tekens voor
       één landing zijn. Over een grens heen blijft de plop: daar komt ze aan via
       zijReistMee, die zijn eigen ring al heeft. */
    if (!crossing && !still) { heroLanding(map); haltePuls(); }
    else if (dot && dot.animate && !still) dot.animate(
      [{ transform: 'scale(.3)' }, { transform: 'scale(1.3)' }, { transform: 'scale(1)' }],
      { duration: 450, easing: 'ease-out' });
    /* HET TIKJE VAN AANKOMEN ZIT IN sndAankomst -- tril 15, zie de SFX-tabel. Niet
       bij elke pas dus (dat zou een ratel zijn en geen aankomst), maar één keer,
       hier. buzz() kijkt zelf al naar wat het toestel kan;
       zonder trilmotor gebeurt er gewoon niets. vier() draait precies één keer per
       reis -- vanuit finish(), vanuit de wereldwissel, of meteen bij beperkte
       beweging -- en nooit opnieuw bij een hertekening, dus dubbel kan het niet.

       Er stond hier even een eigen buzz() vóór deze regel, en dat was twee keer
       fout: het is een tweede trilling naast een bestaande, én hij werd niet eens
       gevoeld. navigator.vibrate() breekt een lopende trilling af en begint
       opnieuw, dus een tik van 12ms met 15ms er meteen achteraan is gewoon 15ms.
       Wie hier een aankomsttrilling zoekt: hij is er, en hij zit in het klankje.

       Het klánkje is hier wél veranderd: dit was sndCoin -- hetzelfde muntje als de
       kassa in de kleedkamer. Aankomen en betalen zijn niet hetzelfde, en vanaf nu
       klinken ze ook niet meer zo.

       En het zijn er twee geworden, want vier() bedient twee momenten. Binnen een
       wereld kom je aan op de volgende halte; over een grens heen gaat er een héle
       wereld open, en dat is waar de camera net overheen geklommen is. Hetzelfde
       onderscheid dat de confetti en de juichtekst hieronder al maakten -- dit
       leest dus dezelfde vlag en verzint er geen tweede. */
    if (crossing) sndWereld(); else sndAankomst();
    confetti(crossing ? 26 : 14);
    /* Alleen over een grens heen een kaart, in het blauw van "hier ben je". Binnen
       een wereld stond hier "🎤 De volgende show wacht!" -- maar de volgende halte
       pulst al en de pop huppelt er al naartoe; de kaart zei het een tweede keer. */
    if (crossing) showPraise(`${toW.world.icon} ${toW.world.name}`, null, true);
  };
  /* Alleen voor de ster die op reis was. Drukt een kind middenin de wandeling op
     terug, dan staat het op de sterrenkeuze en is er geen ster meer (cur = null):
     de kaart van een ster die er niet meer is ombouwen gooide een fout. De
     voortgang zelf staat al vast -- endLevel heeft p.level gezet -- dus hier valt
     dan niets meer te doen. */
  const finish = () => { if (P() !== p) return; plaats(); vier(); landingVrij(); };
  /* De laatste show van de laatste uitgebrachte wereld. Er is geen volgende halte
     om naartoe te huppelen en geen volgende wereld om te onthullen -- er is een
     toegift: dezelfde wereld, opnieuw te spelen. Dus gaat de badge omhoog, valt
     er confetti, en blijft de ster staan waar ze staat. Geen nepwereld, geen
     "de volgende show wacht" terwijl er geen volgende show is.

     Dit speelt precies één keer: p.level stapt maar één keer over WORLD_LAST heen
     (zie endLevel), en een toegift daarna is geen level-up meer. */
  if (t.to > WORLD_LAST) {
    showWorld(fromW.index);
    /* Pas als de kaart stilstaat: dit draaide in de eerste rAF na goMap, en dan
       viel het hele feest over een kaart die nog binnenkwam. */
    setTimeout(() => {
      if (!$('screen-map').classList.contains('active')) return;
      flyBadge(map, $('nav-tro'), fromW.world.icon || '🌍');
      sndGroot();
      confetti(26);
      showPraise('✨ Alle werelden uit!');
    }, still ? 0 : MOTION.totaal);
    return;
  }
  if (crossing) { runWorldChange(t.from, fromW, toW, plaats, vier, still); return; }
  if (!from || !to || !hero || !hero.animate || still) { finish(); return; }
  /* METEEN VERTREKKEN. Hier stond starRevealBeat: een halve seconde waarin de
     sterren van de zojuist gespeelde halte op de kaart landden, plus 200ms
     stilte, en pás daarna de reis. Met de sterrenlanding weg (zie goMap) is er
     niets meer om op te wachten, en het wachten zelf was nooit het punt.

     Wat overblijft is REIS_WACHT: 400ms, en dat is geen beat maar de opkomst van
     de kaart. Die loopt van 110 tot 300ms (MOTION.komNa + MOTION.kom, zie
     kaartKomtOp) -- ze zet dus haar eerste stap een tiende nadat het scherm tot
     stilstand is gekomen. Eerder zou ze vertrekken terwijl de kaart nog inzoomt.

     Eerst het goud, dan de ster -- niet omdat de volgorde in beeld iets uitmaakt
     (ze krijgen dezelfde vertraging en beginnen dus samen), maar omdat growRoad
     het pad opmeet waar zij overheen loopt. Zonder dat pad is er niets om langs
     te lopen en valt ze terug op de rechte lijn. */
  const duur = reisDuur(from, to);
  const geo = growRoad(map, t.from, t.to, duur, REIS_WACHT);
  const frames = heroRoadFrames(map, geo) || heroLineFrames(from, to);
  const anim = hero.animate(frames,
    { duration: duur, delay: REIS_WACHT, easing: REIS_EASING, fill: 'forwards' });
  /* En het loopje eronder (zie heroWalkFrames): dezelfde tijd, dezelfde easing,
     maar op de tekening in plaats van op de halte-laag. Geen fill -- het laatste
     beeldje staat toch al op niets, en zo laat het de laag daarna gewoon weer
     los. Lukt het niet, dan reist ze zoals hiervoor: glijdend, maar goed. */
  const stap = hero.querySelector('.pas-laag');
  const loopje = heroWalkFrames(map);
  const loopTijd = { duration: duur, delay: REIS_WACHT, easing: REIS_EASING };
  if (stap && stap.animate && loopje) {
    // fill: ze eindigt in de deuk, en die moet blijven staan tot heroLanding hem
    // op de nieuwe halte overneemt -- in dezelfde taak, dus zonder beeldje ertussen
    stap.animate(loopje.stap, { ...loopTijd, fill: 'forwards' });
    if (SCHADUW_ANIM) hero.animate(loopje.schaduw, { ...loopTijd, fill: 'forwards', pseudoElement: '::after' });
  }
  /* Het vonkenspoor loopt mét haar mee en niet voor haar uit. Het hing aan een
     setInterval die meteen ging lopen, dus het eerste vonkje viel op 280ms --
     120ms vóór haar eerste stap, stilstaand naast de halte die ze net had
     afgerond. Dat leest als een vonkje bij de aankomst van de vorige show en niet
     als een spoor. Nu begint het met de beweging en stopt het ermee.

     En zonder ⭐: sparkleAt kiest uit vijf tekens, en juist de ster daarvan is het
     ene teken dat op deze kaart iets betékent (zie het sterrentabje). Stof en
     glinstering onderweg, geen sterren -- die zijn op het eindscherm uitgedeeld. */
  setTimeout(() => {
    /* Hier zet ze af, en dit is de enige plek waar dat een tijdstip is: REIS_WACHT
       is exact de vertraging van de loopanimatie hierboven, dus er komt voor het
       vertrekklankje geen tweede klok bij. Dezelfde voorwaarde als de vonkjes --
       staat ze er niet meer (weggenavigeerd tijdens de wachttijd), dan vertrekt er
       ook niets. Bij beperkte beweging komen we hier niet eens: die tak gaat
       hierboven al rechtstreeks naar finish(), en dan is er geen wandeling om aan
       te kondigen. */
    if (hero.isConnected) sndVertrek();
    const tik = setInterval(() => { if (hero.isConnected) sparkle(hero, REIS_VONKEN); }, 280);
    setTimeout(() => clearInterval(tik), duur);
  }, REIS_WACHT);
  anim.onfinish = finish;
}
