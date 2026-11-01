/* ================= Trofeeën-scherm ================= */
// Verse start (o.a. nogmaals op het al-actieve Trofeeën-tabblad tikken):
// terug naar boven -- tenzij er een cadeautje klaarligt, dan daarheen.
function openTrophies() {
  renderShelves();
  toonHub('screen-trophies');
  kopKrimpMeten($('screen-trophies'), 'kast');
  $('screen-trophies').scrollTop = 0;
  /* Wie binnenkomt via "🎁 Nieuwe trofee" (eindscherm, toast, het stipje op het
     tabblad) komt voor dat cadeautje. Dat kon overal liggen, tot tweeënhalf
     scherm diep (Verzamelaar staat onderaan), en de kast ging altijd bovenaan
     open, zonder hint. Nu opent hij bij het eerste cadeautje. */
  naarCadeau(false);
  kastScroll();
}
/* Naar het volgende cadeautje in de kast: het eerste onder het midden van het
   scherm, of weer het eerste als je onderaan bent. De 🎁-pil in de kop doet dit
   (zie renderShelves); openTrophies ook, zonder te glijden. */
function naarCadeau(glij) {
  const kast = $('screen-trophies');
  const klaar = [...document.querySelectorAll('#trophy-shelves .trophy-card.ready')];
  if (!klaar.length) return;
  const midden = kast.clientHeight / 2;
  const plek = c => c.getBoundingClientRect().top - kast.getBoundingClientRect().top;
  const volgende = (glij && klaar.find(c => plek(c) > midden + 8)) || klaar[0];
  const top = Math.max(0, kast.scrollTop + plek(volgende) - midden + 40);
  if (glij && !motionOff() && kast.scrollTo) kast.scrollTo({ top, behavior: 'smooth' });
  else kast.scrollTop = top;
}
/* De kop van de kast heeft twee standen (zie .gescrold in het stijlblad): ruim
   bovenaan, krap en dekkend zodra er kaarten onderdoor schuiven. Hier wordt alleen
   de klasse gezet; hoe de twee standen eruitzien staat in de CSS.

   De drempel ligt op 4px en niet op 0: met 0 wisselt de kop bij het minste
   duimtrilletje heen en weer, en een kop die knippert is erger dan een kop die
   iets te lang ruim blijft. Eén rAF-vertraging ertussen, net als bij de reis
   (zie reisScroll): scroll vuurt vaker dan er beeldjes zijn.

   Die drempel beschermt alleen tegen een trillende duim. Tegen een kop die zelf
   de schuifstand terugduwt -- en dat deed hij, op 10px stilgezet wisselde hij
   elk beeldje -- helpt hij niet; daarvoor is kopKrimpMeten (zie daar). */
function kastScroll() { rafKlem(kastGescrold); }
/* Een klare trofee klopt, glanst en wiebelt: drie tot vier animaties per kaart,
   eindeloos. Stil kost dat niets, de grafische kaart doet het. Maar tijdens het
   schuiven tekent de browser elk beeldje ook op de hoofddraad, en dan rekent hij
   bij elk beeldje de stijl van al die animaties opnieuw uit. Met een handvol
   klare trofeeën was dat op een trage telefoon het haperen van de kast (6×
   geremd, negen klare trofeeën: zo'n seconde stijlwerk per veeg, zo nog een
   derde daarvan). Dus staan ze zolang er geschoven wordt even stil (.schuift, zie
   70-feest.css), en lopen ze daarna verder waar ze waren. Midden in een veeg zie
   je het verschil niet: alles beweegt dan toch al. */
let kastStilTimer = null;
function kastSchuift() {
  kastScroll();
  // op de planken en niet op het scherm: de klassen van het scherm zelf zeggen
  // hoe de kop staat (.gescrold), en die horen niet bij elke veeg te wisselen
  const planken = $('trophy-shelves');
  planken.classList.add('schuift');
  clearTimeout(kastStilTimer);
  kastStilTimer = setTimeout(() => planken.classList.remove('schuift'), 200);
}
/* En wat buiten beeld staat, staat helemaal stil. Een klare trofee wiebelt en
   glanst eindeloos (twee animaties per kaart), en een kind dat de kast een tijd
   niet opende heeft er zo tien klaarliggen -- de meeste onder de rand. Die liepen
   allemaal door, en maakten de kast het drukste scherm van het spel terwijl er
   niemand keek (gemeten: tien klare trofeeën, 4x geremd, de grafische kaart was
   de helft van elke seconde bezig). Nu krijgt een kaart die uit beeld is
   .buiten, en dan pauzeert 70-feest.css hem. Komt hij terug in beeld, dan loopt
   hij verder waar hij was. De rand van 48px: dan wiebelt hij al voordat hij in
   beeld schuift, en niet pas als hij er al staat. */
let kastZicht = null;
function kastZichtVolg() {
  if (typeof IntersectionObserver !== 'function') return;
  if (!kastZicht) kastZicht = new IntersectionObserver(rij => rij.forEach(e =>
    e.target.classList.toggle('buiten', !e.isIntersecting)), { rootMargin: '48px 0px' });
  kastZicht.disconnect();
  $('trophy-shelves').querySelectorAll('.trophy-card.ready, .trophy-card.ladder.top')
    .forEach(kaart => kastZicht.observe(kaart));
}
function kastGescrold() { gescrold($('screen-trophies')); }
// De kop krijgt zijn laag zodra er iets onder schuift (4px tegen een trillende duim).
function gescrold(sc) { if (sc) sc.classList.toggle('gescrold', sc.scrollTop > 4); }
// Terug naar de trofeeënkast via de vaste navigatie (kwam van een ánder
// tabblad): hervat gewoon waar je gebleven was -- scrollpositie blijft staan,
// want die reset de browser niet vanzelf bij display:none/flex (zie ook de
// scroll-reset hierboven, die juist bewust wél altijd terug naar boven gaat).
function resumeTrophies() {
  renderShelves();
  toonHub('screen-trophies');
  kopKrimpMeten($('screen-trophies'), 'kast');
  kastScroll();   // de scrollpositie bleef staan, dus de kopstand ook
}
/* De status van een trofee, in prioriteitsvolgorde:
   ready (open trofee) > done (behaald) > locked > bezig > fresh (nog niets gedaan).
   'locked' is voorzien voor trofeeën die nog niet vrij zijn (via een optionele
   t.locked(p)); geen enkele trofee gebruikt dit nu, dus het blijft voorlopig sluimerend.

   FASE 5C -- 'almost' is weg. Dat was een vierde stand met een eigen gouden gloed,
   bedoeld om te zeggen "nog heel even". Maar goud betekent in deze app "verdiend",
   en op een kast vol kaartjes stonden daardoor gouden randen om dingen die je nog
   níet had. Nu is er één stand voor onderweg, en die is rustig: een getal. */
function trophyStatus(p, t) {
  if ((p.readyTrophies || []).includes(t.id)) return 'ready';
  if (p.trophies.includes(t.id)) return 'done';
  if (t.locked && t.locked(p)) return 'locked';
  const prog = t.progress ? t.progress(p) : null;
  return (prog && prog.now > 0) ? 'busy' : 'fresh';
}
// (Her)tekent de hele kast. Losgemaakt van openTrophies zodat "Open trofee"
// meteen kan hertekenen zónder de scrollpositie te verliezen.
let justClaimed = null;   // id van de zojuist geopende trofee (voor de shimmer, één render lang)
/* FASE 5C -- de kast als kast.
   Wat er weg is en waarom, want het is vooral wéghalen:
     - de balk in de kop ("5 van 42" + voortgangsbalk over de hele kast). Een kast
       met een vulmeter is een takenlijst. De teller zelf blijft, klein en in
       woorden, want een kind wil best weten hoeveel er nog te halen valt.
     - de teller per plank ("2 van 5"). Idem, maal vier.
     - de voortgangsbalk op élke kaart. Die stond op tientallen kaartjes tegelijk
       en vertelde bij de meeste niets dat het getal er niet al zei. Waar het getal
       wél iets zegt ("82 / 100 sommen") staat het er nu kaal, zonder balk.
     - de ster-statusbalk bovenaan. De ster-status is een ánder systeem; hij staat
       helemaal niet meer op dit scherm; hij gaat open vanaf het eindscherm.
   Wat er overblijft per kaartje is precies twee dingen: heb ik hem, en waarvoor is
   hij. En op de perfecte plank: welke wereld. */
function renderShelves() {
  const p = P();
  $('screen-trophies').onscroll = kastSchuift;
  $('trophy-shelves').onclick = kastErnaast;
  checkTrophies(p);   // net gehaalde trofeeën komen 'klaar' te liggen
  // alleen wat er ook echt in de kast staat telt mee (zie RETIRED_TROPHIES)
  const earned = earnedActiveCount(p);
  telNu($('trophy-diamonds'), p.diamonds);
  zetWensPil(p);   // dezelfde pil als op de kaart, met de wens erbij
  /* De stand als pil in de kop: 🏆 en het getal, in dezelfde pil als het saldo
     ernaast (zie .kast-chip). Zonder totaal -- dat groeide met elke wereld die
     erbij kwam, en dan loopt een volle kast leeg zonder dat een kind iets kwijt
     is. Wat er nog te halen valt, zie je aan de kaartjes eronder. De woorden
     ("4 verzameld") staan in de aria-label, voor wie voorgelezen wordt. */
  const teller = $('trophy-count');
  teller.innerHTML = `<span aria-hidden="true">🏆</span> <b>${earned}</b>`;
  teller.setAttribute('aria-label', `${earned} verzameld`);
  /* De 🎁-pil naast de stand: zolang er iets klaarligt, met hoeveel. Een tik
     brengt je naar het volgende cadeautje (zie naarCadeau). Geen cadeautje,
     geen pil. Dezelfde gouden pil als "🎁 Nieuwe trofee" op het eindscherm. */
  const klaar = (p.readyTrophies || []).filter(id => !isRetiredTrophy(id)).length;
  const cadeau = $('kast-cadeau');
  if (cadeau) {
    cadeau.hidden = !klaar;
    cadeau.innerHTML = `<span aria-hidden="true">🎁</span> <b>${klaar}</b>`;
    cadeau.setAttribute('aria-label', klaar === 1 ? 'Naar je cadeautje' : `Naar je ${klaar} cadeautjes`);
    cadeau.onclick = () => { sndClick(); naarCadeau(true); };
  }
  const wrap = $('trophy-shelves');
  wrap.innerHTML = '';
  TROPHY_SHELVES.forEach(shelf => {
    const alle = shelf.ids.filter(id => !isRetiredTrophy(id));
    if (!alle.length) return;   // een plank die helemaal met pensioen is, staat er niet
    /* De perfecte plank houdt op bij de horizon (zie binnenHorizon): wat je hebt
       of kunt openen staat er altijd, de rest alleen tot een paar werelden
       vooruit. Daarboven één mistkaartje. De andere planken zijn vaste rijen
       zonder wereld eraan en staan er helemaal. */
    const perfectPlank = shelf.key === 'perfect';
    const vanJou = id => p.trophies.includes(id) || (p.readyTrophies || []).includes(id);
    /* Op de andere planken valt alleen weg wat dit kind niet kán halen (t.voor,
       zie Nieuwe sommen) -- en ook dat alleen zolang ze hem niet heeft. Blijft
       er niets over, dan staat de plank er niet. */
    const ids = perfectPlank ? alle.filter(id => {
      const t = TROPHIES.find(x => x.id === id);
      return !t || binnenHorizon(p, t.index) || vanJou(id);
    }) : alle.filter(id => {
      const t = TROPHIES.find(x => x.id === id);
      return !t || !t.voor || t.voor(p) || vanJou(id);
    });
    if (!ids.length) return;
    const mist = perfectPlank && ids.length < alle.length;
    const groep = document.createElement('section');
    groep.className = 'kast-groep';
    /* De kopregel van de groep: icoon en naam. Het icoon staat aria-hidden -- het
       herhaalt de naam ernaast, en een voorlezer die "microfoon Avontuur" zegt
       maakt de kop juist onduidelijker.
       Er stond rechts nog een stand per plank ("2/4", en voorbij de horizon een
       kaal "3"). Weg, oktober 2026: de 🏆 in de kop telt al, en vier tellers
       onder elkaar maakten van de kast weer een lijst. */
    const head = document.createElement('div');
    head.className = 'groep-kop';
    if (shelf.note) head.setAttribute('aria-label', `${shelf.name}: ${shelf.note}`);
    head.innerHTML = `<span class="groep-ico" aria-hidden="true">${shelf.ico || ''}</span>`
      /* Geen regeltje meer onder de naam (shelf.note): de kast is een plek om naar
         te kíjken, en vier zinnen boven de planken maakten er een leesblad van. De
         tekst staat nog in TROPHY_SHELVES; wie hem wil, vindt hem in de aria-label. */
      + `<div class="groep-tekst"><div class="groep-naam">${shelf.name}</div></div>`;
    groep.appendChild(head);
    const grid = document.createElement('div');
    grid.className = 'trophy-grid' + (shelf.key === 'perfect' ? ' pw-grid' : '');
    /* Een ladder (zie TROPHY_LADDERS) is één kaartje, op de plek van zijn
       eerste trap; de andere trappen slaan we over. */
    const getekend = new Set();
    ids.forEach(id => {
      const ladder = TROPHY_LADDERS.find(l => l.ids.includes(id));
      if (ladder) {
        if (!getekend.has(ladder.key)) { getekend.add(ladder.key); grid.appendChild(ladderCard(ladder, p)); }
        return;
      }
      const t = TROPHIES.find(x => x.id === id);
      if (t) grid.appendChild(trophyCard(t, p));
    });
    if (mist) {
      const wolk = document.createElement('div');
      wolk.className = 'trophy-card pw-card horizon-mist';
      wolk.innerHTML = horizonMistHTML('Nog meer werelden');
      grid.appendChild(wolk);
    }
    groep.appendChild(grid);
    wrap.appendChild(groep);
  });
  justClaimed = null;   // shimmer geldt maar voor deze ene render
  kastBalk(null);       // de kaartjes zijn nieuw, dus is er niets meer getikt
  kastZichtVolg();      // alleen wat in beeld staat glanst (zie kastZichtVolg)
  save();
  updateTroDot();
}
/* Enkelvoud voor "Nog 1 ..."; alleen waar het meervoud lelijk zou staan.

   Precies één regel per label dat een actieve trofee werkelijk teruggeeft uit
   progress() -- niet meer. Er stonden er twaalf die nergens meer vandaan kwamen
   ('steden' uit het stedenmodel, 'outfits'/'schoenen'/'haarkleuren'/'dieren' van
   de koop-alles-trofeeën, 'diamanten' van de saldotrofeeën; zie
   RETIRED_TROPHIES). Een tabel met dode sleutels leest als een lijst van wat er
   bestaat, en dat was het niet meer.

   Komt er een trofee met een nieuw label bij, dan hoort hier één regel bij --
   inhoud.test.js zaak F valt om als dat vergeten wordt. */
const TROPHY_UNIT_SINGULAR = {
  'shows': 'show', 'sommen': 'som',
  'gouden vragen': 'gouden vraag', 'perfecte shows': 'perfecte show',
  'spulletjes': 'spulletje',
  'sommen over de tien': 'som over de tien', 'zoeksommen': 'zoeksom',
  'sommen met drie getallen': 'som met drie getallen',
  // 'uit' is geen telwoord-achtervoegsel maar hoort bij het label ("werelden uit"),
  // dus unitText() knipt het er niet af en staat de hele zin hier.
  'werelden uit': 'wereld uit'
};
// Maakt van een voortgangslabel ("sommen goed") een kaal zelfstandig
// naamwoord ("sommen") voor de "Nog X ..."-tekst; enkelvoud bij precies 1.
function unitText(label, remaining) {
  let noun = label
    .replace(/^paar /, '')
    .replace(/ (gespeeld|bereikt|bezocht|verzameld|goed|gekocht|perfect|tegelijk aan)$/, '');
  if (remaining === 1 && TROPHY_UNIT_SINGULAR[noun]) noun = TROPHY_UNIT_SINGULAR[noun];
  return noun;
}
/* De stand op een kaart die nog loopt, als boog in de rand van de medaille: hoe
   ver die rand vol is, in procenten (zie .temoji in de kast). Hier stond eerst
   "180 / 500" als pil onder het kaartje -- een getal dat een kleuter niet leest,
   een rand die bijna rond is wel. Het getal in woorden komt bij een tik, in de
   balk onderin ("nog 320 sommen", zie kastBalk). Geeft 0 als er niets te tonen valt:
   op nul is er nog geen boog, en buiten 'onderweg' ook niet. */
function trophyBoog(t, p, status) {
  if (status !== 'busy' || !t.progress) return 0;
  /* De Wereldtournee telt werelden, en zijn totaal is precies wat de horizon
     verbergt (zie binnenHorizon): een boog die halfvol staat verklapt net zo goed
     hoeveel werelden er nog komen als "2 / 11" deed. Ligt er nog mist, dan geen
     boog -- een tik zegt hoeveel je er al hebt. */
  if (t.telWerelden && meerWereldenVooruit(p)) {
    /* Eerst stond hier 0: geen boog zolang er mist ligt, want een halfvolle boog
       verklapt hoeveel werelden er nog komen. Maar dan bleef de rand bijna het
       hele spel leeg, en leek de tournee niet begonnen. Nu telt hij tegen de
       werelden die ze kán zien (tot en met de horizon): de boog loopt vol, en
       zakt een stukje terug als er een wereld uit de mist komt. Het totaal
       blijft geheim. */
    return Math.max(0, Math.min(100, Math.round(100 * doneWorldCount(p) / (laatsteZichtbareWereld(p) + 1))));
  }
  const pr = t.progress(p);
  return Math.max(0, Math.min(100, Math.round(100 * pr.now / pr.target)));
}
// Een klare trofee: de medaille wordt zélf het cadeautje, en dus de knop.
// Klaar om te openen = een gouden medaille met 🎁 erin in plaats van het eigen
// icoon (zie giftMedaille). Welke trofee het is zegt de naam eronder; wát je
// gewonnen hebt zie je pas bij het openen, over het hele scherm.
function trophyCard(t, p) {
  const status = trophyStatus(p, t);
  const card = document.createElement('div');
  card.className = `trophy-card ${t.perfect ? 'pw-card ' : ''}${status}`;
  if (status === 'done' && t.id === justClaimed) card.classList.add('just-claimed');
  card.innerHTML = t.perfect ? perfectCardHTML(t, p, status) : normalCardHTML(t, p, status);
  // De beschrijving staat niet meer op het kaartje (zie normalCardHTML), wel hier.
  // Klaar: het 🎁 vervangt het icoon, dus zegt het label wat een tik doet.
  card.setAttribute('aria-label', status === 'ready' ? `Open ${t.name}` : `${t.name}: ${t.desc}`);
  card.onclick = () => tapTrophy(t, card);
  return card;
}
/* Een medaille die meegroeit (zie TROPHY_LADDERS): één kaartje voor alle trappen.
     klaar     ligt er een trap klaar, dan is dit kaartje het cadeautje
               (giftMedaille) en opent een tik de laagste die klaarligt
     anders    het icoon van de ladder op een vlak van het metaal dat je al hebt
               (nog niets: het gewone donkere vlak), met in de rand een boog in
               het metaal van de volgende trap: zo ver ben je op weg naar zilver
     eronder   alleen de naam. Hier stond ook een stipje per trap, maar het
               metaal zegt al hoe ver je bent: brons, zilver, goud, en diamant
               (ijsblauw, met facetten en twee vonkjes) is de top. Eén signaal
               en niet twee (Max, oktober 2026).
   Alles uit wat er al bewaard is: welke trap-id's in p.trophies staan. */
function ladderStand(ladder, p) {
  const trappen = ladder.ids.map(id => TROPHIES.find(t => t.id === id)).filter(Boolean);
  const klaar = trappen.find(t => (p.readyTrophies || []).includes(t.id)) || null;
  const niveau = trappen.filter(t => p.trophies.includes(t.id)).length;
  const volgende = trappen.find(t => !p.trophies.includes(t.id) && !(p.readyTrophies || []).includes(t.id)) || null;
  return { trappen, klaar, niveau, volgende };
}
function ladderCard(ladder, p) {
  const { trappen, klaar, niveau, volgende } = ladderStand(ladder, p);
  const card = document.createElement('div');
  const status = klaar ? 'ready' : niveau ? 'done' : (volgende && volgende.progress(p).now > 0 ? 'busy' : 'fresh');
  const nu = niveau ? trappen[niveau - 1].trap : null;
  card.className = `trophy-card ladder ${status}` + (nu != null ? ` nu-${nu}` : '') + (niveau === trappen.length ? ' top' : '');
  if (trappen.some(t => t.id === justClaimed)) card.classList.add('just-claimed');
  if (klaar) {
    card.innerHTML = giftMedaille(ladder);
    card.setAttribute('aria-label', `Open ${klaar.name}`);
  } else {
    /* De boog telt vanaf de trap die je al hebt, niet vanaf nul: een net
       behaalde zilveren medaille staat met een lege rand op weg naar goud, en
       niet al voor een vijfde vol (100 van de 500 sommen). */
    const boog = ladderBoog(ladder, p);
    const stijl = `--p:${boog}` + (volgende ? `;--straks:var(--m-${volgende.trap})` : '');
    card.innerHTML = `<div class="temoji" style="${stijl}">${nu === 3 ? DIAMANT_VONKJES : ''}<span class="tico">${ladder.emoji}</span></div>`
      + `<div class="tname">${ladder.name}</div>`;
    card.setAttribute('aria-label', niveau ? `${trappen[niveau - 1].name}` : `${ladder.name}: ${trappen[0].desc}`);
  }
  card.onclick = () => tapLadder(ladder, card);
  return card;
}
function ladderBoog(ladder, p) {
  const { trappen, niveau, volgende } = ladderStand(ladder, p);
  if (!volgende) return 0;
  const pr = volgende.progress(p), vorig = niveau ? trappen[niveau - 1].progress(p).target : 0;
  const doel = trapDoel(volgende, p);
  return doel > vorig ? Math.max(0, Math.min(100, Math.round(100 * (pr.now - vorig) / (doel - vorig)))) : 0;
}
/* De trappen van een medaille als rijtje munten: brons, zilver, goud, diamant.
   Het metaal van de medaille zegt hoe ver je bent, maar niet dát er nog meer
   komt: een bronzen medaille zag er voor een kind af uit, en dat er nog drie
   trappen op haar wachtten zag ze nergens (Max, oktober 2026). Dit rijtje staat
   op de twee plekken waar een kind er al naar kijkt -- de balk als je tikt
   (kastBalk) en het openen van een nieuwe trap (celebrateTrophy) -- en níét op
   de plank: daar stond eerst een stipje per trap, en twee signalen naast elkaar
   was te veel.
     behaald   een volle munt in zijn metaal
     volgende  een leeg vakje met de boog erom, in het metaal waar je naartoe gaat
     daarna    een leeg vakje met een rand in zijn metaal: je ziet wélk metaal er
               nog komt, en dat het nog leeg is
   `tot`: tot en met welke trap de munten vol staan (anders: wat je nu hebt), en
   `nieuw`: die munt springt erin. Bij het openen staat er geen boog (`boog:
   false`) -- dat is het moment van wat je kreeg, niet van wat nog moet. */
function trapRij(ladder, p, opts = {}) {
  const { trappen, niveau } = ladderStand(ladder, p);
  const tot = opts.tot != null ? opts.tot : niveau - 1;
  const boog = opts.boog === false ? null : ladderBoog(ladder, p);
  return '<span class="trap-rij" aria-hidden="true">' + trappen.map((t, i) => {
    let k = `trap-munt m-${t.trap}`;
    if (i <= tot) k += i === opts.nieuw ? ' vol nieuw' : ' vol';
    else if (i === tot + 1 && boog != null) k += ' volgende';
    const stijl = i === tot + 1 && boog != null ? ` style="--p:${boog}"` : '';
    return `<i class="${k}"${stijl}></i>`;
  }).join('') + '</span>';
}
/* Het doel van een trap voor de boog. De laatste trap van de Wereldreiziger telt
   alle werelden, en dat totaal verbergt de horizon (zie trophyBoog): zolang er
   mist ligt, telt hij tegen de werelden die ze kan zien. */
function trapDoel(t, p) {
  const doel = t.progress(p).target;
  return t.telWerelden && meerWereldenVooruit(p) ? Math.min(doel, laatsteZichtbareWereld(p) + 1) : doel;
}
/* Diamant is de top, en dat moet je zien zonder te tikken: twee witte vonkjes op
   het ijsblauw, bij de facetten in het stijlblad (.nu-3). Getekend en niet als
   teken, net als het nootje (zie KAST_NOOT). */
const DIAMANT_VONK = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M5 0 6 4 10 5 6 6 5 10 4 6 0 5 4 4Z"/></svg>';
const DIAMANT_VONKJES = `<i class="vonkje">${DIAMANT_VONK}</i><i class="vonkje">${DIAMANT_VONK}</i>`;
function tapLadder(ladder, card) {
  const p = P();
  const { trappen, klaar, niveau, volgende } = ladderStand(ladder, p);
  if (klaar) { openTrophy(klaar.id); return; }
  // een medaille met al een metaal klinkt in dat metaal; nog geen metaal zegt "tok"
  if (niveau) kastKlink(card, trappen[niveau - 1].trap); else kastDof(card);
  if (card.classList.contains('kies')) return;   // nog eens: alleen spelen, de balk staat er al
  /* In de balk staan de munten (trapRij) waar eerst het woord "Zilver" stond:
     het rijtje zegt welk metaal je hebt én wat er nog komt. De stem zegt het
     metaal nog wel (het vierde argument van kastBalk), voor wie niet leest. */
  const kop = { emoji: ladder.emoji, name: ladder.name, naar: ladder.naar };
  const metaal = niveau ? TRAP_NAMEN[trappen[niveau - 1].trap] : '';
  const rij = trapRij(ladder, p);
  if (!volgende) { kastBalk(kop, card, metaal + '!', null, rij); return; }
  const pr = volgende.progress(p), rem = Math.max(0, pr.target - pr.now);
  const zeg = tekst => metaal ? `${metaal} · ${tekst}` : tekst;
  // achter de horizon geen "nog 5 werelden": dat verklapt het totaal (zie tapTrophy)
  if (volgende.telWerelden && meerWereldenVooruit(p)) {
    kastBalk(kop, card, `${pr.now} ${pr.label}`, pr.now, rij, zeg(`${pr.now} ${pr.label}`)); return;
  }
  const nog = rem > 0 ? `nog ${rem} ${unitText(pr.label, rem)}` : 'bijna!';
  kastBalk(kop, card, nog, rem > 0 ? rem : null, rij, zeg(nog));
}
/* Medaille, naam en de voet, in die volgorde. De voet is er alleen als er iets
   in staat: 🔒, of het balkje op de perfecte plank. */
function cardVoet(inhoud) { return inhoud ? `<div class="tvoet">${inhoud}</div>` : ''; }
/* Klaar om te openen: een gouden medaille met een 🎁 erin. Hier stond eerst het
   eigen icoon met een gouden "🎁 Open!"-pil eronder, en daarna (als voorstel) een
   🎁-badge rechtsboven op de medaille: twee signalen voor één ding. Nu is de
   medaille zelf het cadeautje -- één signaal, en het hele rondje is het raakvlak.
   De perfecte plank krijgt hetzelfde, ook waar daar normaal een podium staat:
   "hier ligt iets voor je klaar" moet overal er hetzelfde uitzien. */
function giftMedaille(t) {
  return '<div class="temoji"><span class="tico">🎁</span></div>'
    + `<div class="tname">${t.name}</div>`;
}
/* Medaille en naam -- meer niet. De beschrijving ("500 sommen goed") stond eerst
   op elk kaartje, en een kast vol zinnen leest als een takenlijst. Wat een trofee
   vraagt, zie je als je erop tikt, in de balk onderin (zie kastBalk).
     klaar     het 🎁 in de medaille (zie giftMedaille)
     behaald   de gouden rand (hier stond een ✓)
     onderweg  de boog om de medaille
     op slot   🔒 eronder */
function normalCardHTML(t, p, status) {
  if (status === 'ready') return giftMedaille(t);
  const boog = trophyBoog(t, p, status);
  return `<div class="temoji"${boog ? ` style="--p:${boog}"` : ''}><span class="tico">${t.emoji}</span></div>`
    + `<div class="tname">${t.name}</div>`
    + cardVoet(status === 'locked' ? '<div class="tstand">🔒</div>' : '');
}
/* De perfecte werelden. Dit is de duurste kaart van de kast en dat mag je zien:
   het wereldicoon staat in een medaillon met de kleuren van díe wereld (theme.sky
   en theme.glow, dezelfde twee die de wereldkaart gebruikt), en behaald komt daar
   de gouden ring omheen (de ster in de hoek is weg, zie .pw-medal in de kast).

   Sinds de prijs van een wereld staat er geen medaillon meer maar die prijs zelf,
   in goud (zie perfectCardHTML): hetzelfde ding als op het wereldfeest, de reis en
   in Podia. Een kind dat daar "Perfecte wereld!" kreeg, herkent hier hetzelfde
   ding terug. Het medaillon blijft alleen voor een wereld zonder podium.

   Niet behaald is niet grijs: de wereldkleuren blijven staan, alleen gedempt. Een
   kleuter die de IJswereld nog moet perfectioneren ziet zo toch dat er een blauwe
   prijs op haar wacht -- dát is het lokkertje, en een grijze plaat is dat niet. */
function perfectCardHTML(t, p, status) {
  const w = t.wereld || {};
  const th = w.theme || {};
  const kleur = `--pw-sky:${th.sky || '#3a1f6e'};--pw-glow:${th.glow || '#7a2f63'}`;
  /* Geen 'Overal drie sterren' op het kaartje. Dat stond er zes keer onder elkaar,
     terwijl de kop van de plank het al zegt -- en zes keer dezelfde regel maakt van
     een prijzenkast een formulier. Wat een kaartje hier moet zeggen is welke wereld
     het is; wat je ervoor moet doen staat één regel hoger, voor alle zes tegelijk.

     Hoe ver de wereld al is komt er alleen bij als er iets te tellen valt, als
     balkje (.tbalk): de boog van een medaille, recht -- hier staat een podium en
     geen rand om te vullen. Het stond er als "5 / 8". Op een wereld waar nog geen
     ster staat zegt een leeg balkje niets wat het gedempte podium niet al zegt, en
     op een behaalde wereld zou het vol zijn, wat het goud al vertelt. */
  const balk = () => { const pr = t.progress(p);
    return `<div class="tbalk"><i style="width:${Math.round(100 * pr.now / pr.target)}%"></i></div>`; };
  if (status === 'ready') return giftMedaille(t);
  const stand = status === 'busy' ? balk() : '';
  /* Het kaartje toont de prijs van die wereld (zie "= De prijs van een wereld"):
     hetzelfde podium met dezelfde schat als op de reis en in Podia, en behaald
     in goud. Zo is de grootste prijs van het spel geen los medaillon meer dat je
     nergens anders terugziet, maar de gouden stand van iets wat je al kent. Een
     wereld zonder podium houdt het medaillon. */
  const i = typeof t.index === 'number' ? t.index : -1;
  const st = i >= 0 ? wereldPrijsStand(p, i) : null;
  /* Gewonnen is in de kast altijd het volle podium in goud, ook als de twee
     stukken nog niet gekocht zijn: deze trofee gaat over hoe je speelde, niet
     over wat je kocht. Elders (Podia, de kaart) blijft kleur "gekocht"
     betekenen -- zie "= De prijs van een wereld". */
  /* Gewonnen is in de kast het podium met een gouden rand; in kleur alleen als
     het van haar is. Hier stond eerst "gewonnen is altijd het volle podium in
     goud, ook ongekocht": deze trofee gaat over hoe je speelde. Dat zegt nu de
     ⭐-stempel eronder, en de 🎪-stempel ernaast zegt het podium (zie "= Het
     diploma van een wereld") -- dan hoort het podium zelf niet iets anders te
     zeggen dan zijn stempel. Elders (Podia, de kaart) betekent kleur hetzelfde. */
  if (st) st.goud = status === 'done';
  const prijs = st ? wereldPrijsHTML(p, i, 72, st) : '';
  // Een wereld die uit is heeft een diploma: twee stempels onder de naam.
  const stempels = i >= 0 && worldAvailable(i) && worldProgress(p, worldForIndex(i)).uit
    ? `<div class="dip-stempels klein">${diplomaStempels(p, i, true)}</div>` : '';
  /* Onderweg: geen balkje meer maar een witte rand om het podium die vol loopt
     (--p, zie .pw-card.busy in de kast) -- dezelfde taal als de boog om een
     medaille. Wit en niet goud: goud betekent hier "gewonnen", en een gouden rand
     die halfvol stond las al als bijna-van-mij (Max, oktober 2026). Gewonnen
     krijgt de gloed en twee vonkjes. */
  const naam = pwNaam(t.name);
  if (prijs) {
    // met stempels loopt de witte rand om de ⭐-stempel, niet nog eens om het podium
    const pr = status === 'busy' && !stempels ? t.progress(p) : null;
    const stijl = pr ? ` style="--p:${Math.round(100 * pr.now / pr.target)}"` : '';
    return `<div class="pw-medal pw-prijs${stempels ? ' met-diploma' : ''}"${stijl}>${prijs}${status === 'done' ? DIAMANT_VONKJES : ''}</div>`
      + `<div class="tname">${naam}</div>` + stempels;
  }
  return `<div class="pw-medal" style="${kleur}"><span class="pw-ico">${t.emoji}</span></div>`
    + `<div class="tname">${naam}</div>`
    + cardVoet(stand);
}
/* Een wereldnaam breekt vóór "wereld" en niet midden in het woord: op een derde
   van een telefoon past "Onderwaterwereld" niet op één regel, en dan brak hij als
   "Onderwaterwerel / d". Met een zacht afbreekstreepje wordt het
   "Onderwater- / wereld", en past hij wel, dan zie je niets. */
function pwNaam(naam) { return esc(naam).replace(/(.)wereld$/, '$1&shy;wereld'); }
/* ================= = Het diploma van een wereld =================
   Elke wereld die uit is heeft een diploma: haar pop in de wereld, met de schat
   van die wereld op, op een podium. Je opent het door in de kast op de wereld te
   tikken. Het is geen prijs erbij -- één wereld is één prijs -- maar een plaatje
   van wat ze al heeft, en een grote mag het als plaatje delen.

   Drie dingen, elk met een eigen teken en niets dat twee dingen tegelijk zegt:
     wereld uit   het diploma bestaat. Daarvoor houdt de kast de balk met
                  "nog N shows" (zie tapTrophy)
     podium       waar ze op staat: het podium van de wereld als het van haar
                  is, anders het parelpodium -- en de 🎪-stempel
     perfect      de ⭐-stempel, in goud. Goud betekent ook hier alleen "overal
                  drie sterren"; de lijst eromheen blijft in de wereldkleuren
   Een stempel die nog ontbreekt is een gestippelde cirkel met eronder wat je
   ervoor doet (💎 wat de stukken nog kosten, of 🗺️ Speel). Onderweg naar perfect
   loopt er een witte rand om de ⭐ vol, net als op de perfecte plank. De rij met
   een stip per halte die er eerst stond, zei te veel tegelijk (Max, november
   2026): de kaart zegt al welke halte nog geen drie sterren heeft.

   Alles afgeleid, niets bewaard: uit en perfect staan in p.stars, het podium in
   p.owned. Dezelfde regel als de prijs van een wereld. */
function diplomaStand(p, i) {
  const w = WORLDS[i], v = worldProgress(p, worldForIndex(i));
  const podium = wereldPodium(w);
  const heeftPodium = !!podium && podiumVanJou(p, podium);
  // wat de stukken die ze nog mist samen kosten (de schat heeft ze: de wereld is uit)
  const prijs = podium ? podiumStukken(podium).filter(it => !(p.owned || []).includes(it.id))
    .reduce((som, it) => som + (it.price || 0), 0) : 0;
  return { w, podium, heeftPodium, prijs, perfect: v.vol, voortgang: Math.round(100 * v.perfect / v.levels) };
}
/* De twee stempels. klein = het rijtje onder de wereld in de kast: alleen de
   twee rondjes, zonder wat je moet doen (dat staat op het diploma zelf). */
// De ster op de ⭐-stempel: getekend en wit, want een ⭐-emoji op een gouden
// stempel is goud op goud -- dan zie je een lege munt.
const DIP_STER = '<svg class="dip-ster" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9z"/></svg>';
function diplomaStempels(p, i, klein) {
  const d = diplomaStand(p, i);
  const th = d.w.theme || {};
  const kleur = `--dip-a:${th.sky || '#3a1f6e'};--dip-b:${th.glow || '#7a2f63'}`;
  const pod = d.podium ? `<span class="dip-mini">${podiumHTML(d.podium)}</span>` : '🎪';
  const stempel = (soort, heb, binnen, label, actie) => {
    const rond = `<span class="dip-stempel ${soort} ${heb ? 'heb' : 'mist'}"${soort === 'ster' && !heb ? ` style="--p:${d.voortgang}"` : ''}>${binnen}</span>`;
    if (klein) return rond;
    const onder = heb ? '<span class="dip-actie leeg"></span>' : `<span class="dip-actie ${soort === 'ster' ? 'doe' : ''}">${actie}</span>`;
    return `<button class="dip-plek" type="button" data-dip="${heb ? '' : soort}" aria-label="${label}"${heb ? ' tabindex="-1"' : ''}>${rond}${onder}</button>`;
  };
  if (!d.podium) return stempel('ster', d.perfect, DIP_STER, d.perfect ? 'Perfect' : 'Speel voor drie sterren', '🗺️ Speel');
  return `<span class="dip-rij" style="${kleur}">`
    + stempel('pod', d.heeftPodium, pod, d.heeftPodium ? 'Podium van jou' : `Podium: nog ${d.prijs} diamanten`, `💎 ${d.prijs}`)
    + stempel('ster', d.perfect, DIP_STER, d.perfect ? 'Perfect' : 'Speel voor drie sterren', '🗺️ Speel')
    + '</span>';
}
// Haar pop zoals ze op het diploma staat: met de schat van de wereld op, en op
// het podium van de wereld als het van haar is. Een kopie: ze draagt niets echt.
function diplomaPop(p, d) {
  const q = JSON.parse(JSON.stringify(p));
  const schat = beloningItem(d.w);
  if (schat) q.equipped[schat.cat] = schat.id;
  q.equipped.stage = d.heeftPodium ? d.podium.id : 'stage_disco';
  return q;
}
/* HET PERFECTE DIPLOMA: alles van de wereld is van haar -- elke show drie
   sterren, en het podium (als de wereld er een heeft). Dan krijgt het diploma
   wat de show haar gaf toen ze het verdiende: een gouden lijst, de bundel van
   het zaallicht op haar en een gloeiend podium, en een paar vonkjes. Alleen
   dan, zodat een gewoon diploma rustig blijft en goud iets betekent. Er komt
   bewust geen zegel bij: met de sterstempel en de medaille in de kast zou dat
   een derde ster-in-een-rondje op dezelfde kaart zijn. */
function diplomaTop(d) { return d.perfect && (d.heeftPodium || !d.podium); }
// de vonkjes rond haar: links/boven in % van het beeld, en hun maat
const DIP_VONKEN = [[18, 32, 16], [76, 26, 13], [27, 62, 10], [70, 58, 18], [50, 12, 11]];
function openDiploma(i) {
  const p = P();
  const d = diplomaStand(p, i);
  const th = d.w.theme || {};
  const q = diplomaPop(p, d);
  const top = diplomaTop(d);
  const ov = openOverlay('diploma-laag',
    `<div class="diploma${top ? ' top' : ''}" role="dialog" aria-label="${top ? 'Perfect diploma' : 'Diploma'} ${esc(d.w.name)}" style="--dip-a:${th.sky || '#3a1f6e'};--dip-b:${th.glow || '#7a2f63'}">`
    + '<button class="dip-x" type="button" aria-label="Sluiten">✕</button>'
    + '<div class="dip-binnen">'
    +   `<div class="dip-beeld"><img class="dip-kunst" src="${d.w.art || ''}" alt="" draggable="false">`
    +     (top ? '<div class="dip-bundel"></div>' + DIP_VONKEN.map(([x, y, m], n) =>
             `<span class="dip-vonk" style="left:${x}%;top:${y}%;--m:${m}px;--n:${n}">✦</span>`).join('') : '')
    +     `<div class="dip-pop"><div class="dip-podium">${podiumHTML(item(q.equipped.stage))}</div>`
    +       `<div class="dip-av">${avatarSVG(q, 124)}</div></div></div>`
    +   `<div class="dip-label">${top ? 'Perfect diploma' : 'Diploma'}</div>`
    +   `<div class="dip-naam">${esc(p.name)}</div>`
    +   `<div class="dip-wereld">${esc(d.w.name)}</div>`
    +   `<div class="dip-stempels">${diplomaStempels(p, i, false)}</div>`
    +   '<button class="btn soft dip-deel" type="button">📤 Delen</button>'
    + '</div></div>', { fade: 250 });
  // naast het diploma tikken sluit, net als ✕ en terug
  ov.onclick = e => { if (e.target === ov) { sndClick(); ov._close(); } };
  ov.querySelector('.dip-x').onclick = () => { sndClick(); ov._close(); };
  ov.querySelectorAll('.dip-plek').forEach(knop => knop.onclick = () => {
    const soort = knop.dataset.dip;
    if (!soort) return;
    sndClick(); ov._close();
    if (soort === 'ster') naarWereldKaart(i);
    // naar dat podium in Podia, en terug brengt haar weer in de kast
    else { openKleedkamerItem(d.podium.id); dressReturnTo = 'trophies'; }
  });
  ov.querySelector('.dip-deel').onclick = () => { sndClick(); diplomaDelen(i); };
  speak(`Diploma ${d.w.name}`);
}
/* Delen: het diploma als plaatje, getekend op een canvas -- zonder bibliotheek,
   dus met de hand: de lijst, de wereld, het podium, haar pop (dezelfde SVG als
   overal), de tekst en de twee stempels. Geen knoppen en geen "wat moet je nog
   doen": een plaatje voor oma is af.

   Daarna navigator.share met het bestand (telefoon: het deelblad), en waar dat
   niet kan een download. Vanaf file:// weigert de browser een canvas met een
   tekening van schijf terug te geven (een "besmet" canvas); dan zegt een toast
   het, in plaats van niets te doen. */
const DIP_B = 600, DIP_H = 860;   // het plaatje: 2× de kaart van 300 breed
function diplomaLaad(src) {
  return new Promise((ja, nee) => { const im = new Image(); im.onload = () => ja(im); im.onerror = nee; im.src = src; });
}
function diplomaRond(c, x, y, b, h, r) {
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + b, y, x + b, y + h, r); c.arcTo(x + b, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + b, y, r); c.closePath();
}
async function diplomaBeeld(i) {
  const p = P(), d = diplomaStand(p, i), th = d.w.theme || {};
  const a = th.sky || '#3a1f6e', b = th.glow || '#7a2f63';
  const q = diplomaPop(p, d);
  const st = item(q.equipped.stage);
  // met haar schaduw aan (in de show doet .prop-laag dat, zie .av-sch)
  const svg = avatarSVG(q, 248).replace(/visibility="hidden"/g, '');
  const [kunst, pop] = await Promise.all([
    diplomaLaad(d.w.art),
    diplomaLaad('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)),
    document.fonts && document.fonts.load ? document.fonts.load('700 60px Fredoka') : null,
  ]);
  const cv = document.createElement('canvas');
  cv.width = DIP_B; cv.height = DIP_H;
  const c = cv.getContext('2d');
  // de lijst in de wereldkleuren (perfect: in goud), en het donkere vlak erin
  const top = diplomaTop(d);
  const lijst = c.createLinearGradient(0, 0, DIP_B, DIP_H);
  if (top) [[0, '#fff3c4'], [0.22, '#ffd740'], [0.48, '#c98a12'], [0.62, '#ffe58a'], [0.82, '#b9780c'], [1, '#ffd740']]
    .forEach(([o, k]) => lijst.addColorStop(o, k));
  else { lijst.addColorStop(0, a); lijst.addColorStop(1, b); }
  diplomaRond(c, 0, 0, DIP_B, DIP_H, 56); c.fillStyle = lijst; c.fill();
  const vlak = c.createLinearGradient(0, 0, 0, DIP_H);
  vlak.addColorStop(0, '#2a1958'); vlak.addColorStop(1, '#1a0e3b');
  diplomaRond(c, 6, 6, DIP_B - 12, DIP_H - 12, 50); c.fillStyle = vlak; c.fill();
  // de wereld, bijgesneden zoals op het diploma (midden, iets onder het midden)
  const BH = 400;
  c.save(); diplomaRond(c, 6, 6, DIP_B - 12, BH, 50); c.clip();
  const s = Math.max((DIP_B - 12) / kunst.width, BH / kunst.height);
  const kb = kunst.width * s, kh = kunst.height * s;
  c.drawImage(kunst, 6 + ((DIP_B - 12) - kb) / 2, 6 + (BH - kh) * 0.7, kb, kh);
  const waas = c.createLinearGradient(0, 6 + BH * 0.4, 0, 6 + BH);
  waas.addColorStop(0, 'rgba(31,18,71,0)'); waas.addColorStop(1, '#1f1247');
  c.fillStyle = waas; c.fillRect(6, 6, DIP_B - 12, BH);
  const px = DIP_B / 2, py = 6 + BH - 52, rx = 160, ry = 26;
  // perfect: de bundel van boven op haar podium (zie .dip-bundel)
  if (top) {
    const bl = c.createLinearGradient(0, 0, 0, py + 20);
    bl.addColorStop(0, 'rgba(255,236,168,0)'); bl.addColorStop(0.4, 'rgba(255,236,168,.42)');
    bl.addColorStop(0.85, 'rgba(255,216,128,.3)'); bl.addColorStop(1, 'rgba(255,216,128,0)');
    c.fillStyle = bl; c.beginPath();
    c.moveTo(px - 30, 0); c.lineTo(px + 30, 0); c.lineTo(px + 210, py + 20); c.lineTo(px - 210, py + 20); c.fill();
  }
  c.restore();
  // het podium: zijband, dan de bovenkant (de kleuren van podiumHTML)
  const v = st.vloer || item('stage_disco').vloer;
  if (top) { c.save(); c.shadowColor = 'rgba(255,193,7,.8)'; c.shadowBlur = 24; }
  c.fillStyle = v[2]; c.beginPath(); c.ellipse(px, py + 16, rx, ry, 0, 0, Math.PI * 2); c.fill();
  const boven = c.createRadialGradient(px, py - 6, 10, px, py, rx);
  boven.addColorStop(0, v[0]); boven.addColorStop(0.72, v[1]);
  c.fillStyle = boven; c.beginPath(); c.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2); c.fill();
  c.lineWidth = 4; c.strokeStyle = v[3]; c.stroke();
  if (top) c.restore();
  // haar pop, met de voeten midden op het podium: de schoenen staan op 239 van
  // de 250 hoog, dus +16 zet ze vlak onder het midden van de bovenkant
  const ph = 248 * pop.height / pop.width;
  c.drawImage(pop, px - 124, py - ph + 16, 248, ph);
  // de tekst
  c.textAlign = 'center'; c.fillStyle = '#fff';
  c.globalAlpha = top ? 1 : 0.7; c.font = '600 24px Fredoka, sans-serif';
  if (top) c.fillStyle = '#ffd740';
  c.fillText(top ? 'P E R F E C T   D I P L O M A' : 'D I P L O M A', px, BH + 70);
  c.fillStyle = '#fff';
  c.globalAlpha = 1; c.font = '700 64px Fredoka, sans-serif';
  c.fillText(p.name, px, BH + 140);
  c.globalAlpha = 0.85; c.font = '500 32px Fredoka, sans-serif';
  c.fillText(d.w.name, px, BH + 186);
  c.globalAlpha = 1;
  // de stempels: gekleurd als je hem hebt, gestippeld als hij nog ontbreekt
  const sy = BH + 290;
  const stempel = (x, heb, goud, teken) => {
    c.save();
    c.beginPath(); c.arc(x, sy, 58, 0, Math.PI * 2);
    if (heb) {
      const g = c.createRadialGradient(x - 20, sy - 20, 6, x, sy, 58);
      if (goud) { g.addColorStop(0, '#fff6cf'); g.addColorStop(0.55, '#ffc94a'); g.addColorStop(1, '#c98a12'); }
      else { g.addColorStop(0, '#ffffff'); g.addColorStop(0.15, a); g.addColorStop(1, b); }
      c.fillStyle = g; c.fill();
      c.lineWidth = 5; c.strokeStyle = goud ? '#ffe08a' : 'rgba(255,255,255,.55)'; c.stroke();
    } else {
      c.setLineDash([10, 9]); c.lineWidth = 4; c.strokeStyle = 'rgba(255,255,255,.35)'; c.stroke();
      c.globalAlpha = 0.35;
    }
    c.setLineDash([]);
    teken(x);
    c.restore();
  };
  // dezelfde ster als DIP_STER (24 eenheden breed), op 3× getekend
  const ster = x => {
    c.save(); c.translate(x - 36, sy - 36); c.scale(3, 3);
    c.fillStyle = '#fff'; c.shadowColor = 'rgba(150,90,0,.6)'; c.shadowOffsetY = 0.6;
    c.fill(new Path2D('M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9z'));
    c.restore();
  };
  const podium = x => {
    const pv = d.podium.vloer || v;
    c.fillStyle = pv[2]; c.beginPath(); c.ellipse(x, sy + 9, 38, 11, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = pv[1]; c.beginPath(); c.ellipse(x, sy, 38, 11, 0, 0, Math.PI * 2); c.fill();
    c.lineWidth = 2; c.strokeStyle = pv[3]; c.stroke();
  };
  if (d.podium) { stempel(px - 80, d.heeftPodium, false, podium); stempel(px + 80, d.perfect, true, ster); }
  else stempel(px, d.perfect, true, ster);
  c.textBaseline = 'alphabetic'; c.globalAlpha = 0.5; c.font = '500 22px Fredoka, sans-serif';
  c.fillText('rekensterren.be', px, DIP_H - 30);
  return new Promise((ja, nee) => {
    try { cv.toBlob(bl => bl ? ja(bl) : nee(new Error('geen plaatje')), 'image/png'); } catch (e) { nee(e); }
  });
}
async function diplomaDelen(i) {
  const d = WORLDS[i];
  const naam = `diploma-${(P().name || 'ster').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${d.id}.png`;
  let blob;
  try { blob = await diplomaBeeld(i); }
  catch (e) { showToast('📤 Delen lukt hier niet', null, null, 'hint'); return; }
  const file = typeof File === 'function' ? new File([blob], naam, { type: 'image/png' }) : null;
  if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
    // weggetikt deelblad is geen fout: dan gebeurt er gewoon niets
    try { await navigator.share({ files: [file], title: `Diploma ${d.name}` }); } catch (e) { /* geannuleerd */ }
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = naam;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
/* Tikken mag, en elke tik speelt: klaar opent de trofee; anders klinkt hij (of
   zegt hij "tok") en zegt de balk onderin wat hij is of wat er nog moet gebeuren.
   Nog eens op dezelfde speelt nog eens -- de balk blijft dan gewoon staan. Hier
   ging de balk bij de tweede tik weer weg, zoals in de kleedkamer, maar dan was
   om de andere tik op een trofee geen spelen maar wegzetten: wie op één medaille
   trommelde, zag hem op en neer gaan (Max, oktober 2026). De balk gaat nu weg als
   je ernaast tikt (zie kastErnaast), iets anders tikt of weggaat.
   Geen kringetje vanaf de vinger (tapRipple) en geen indrukken van het kaartje:
   de medaille reageert zelf, en drie dingen tegelijk was er twee te veel. */
function tapTrophy(t, card) {
  const p = P();
  const st = trophyStatus(p, t);
  if (st === 'ready') { openTrophy(t.id); return; }
  /* Een wereld die uit is opent zijn diploma (zie "= Het diploma van een
     wereld"): daar staat wat er nog te halen valt, met de weg erheen. Een wereld
     die nog niet uit is houdt de balk met "nog N shows" en de 🗺️-knop. */
  if (t.perfect && worldAvailable(t.index) && worldProgress(p, worldForIndex(t.index)).uit) {
    kastBalk(null);
    if (st === 'done') kastKlink(card); else sndClick();
    openDiploma(t.index);
    return;
  }
  // eerst het klankje en het bewegen: behaald klinkt, de rest zegt "tok" (zie kastKlink)
  if (st === 'done') kastKlink(card); else kastDof(card);
  // nog eens op dezelfde: alleen spelen -- de balk staat er al, en de stem hoeft
  // hem niet bij elke tik opnieuw voor te lezen
  if (card.classList.contains('kies')) return;
  /* Een trofee die ergens anders verdiend wordt (t.naar) ging hier eerst meteen
     naar de kleedkamer -- en dus zag je bij Verzamelaar nooit hoe ver je was. Nu
     doet hij wat elke trofee doet, en staat de weg erheen als knop in de balk. */
  if (st === 'done') { kastBalk(t, card, t.desc); return; }
  if (st === 'locked') { kastBalk(t, card, '🔒 Nog niet'); return; }
  if (!t.progress) { kastBalk(t, card, t.desc); return; }
  const pr = t.progress(p), rem = Math.max(0, pr.target - pr.now);
  /* Een perfecte wereld: wat er nog moet, en een knop naar die wereld op de
     kaart -- daar staat op elke halte met drie sterren een gouden cijfer, dus zie
     je welke shows het nog zijn. Alleen als ze er al heen kan (anders zou de
     knop haar naar een wereld sturen die nog dicht is). */
  if (t.perfect) {
    const kop = { emoji: '', name: t.name, perfect: true,
      naar: wereldTeBezoeken(p, t.index) ? 'kaart' : null, wereldIdx: t.index };
    kastBalk(kop, card, `nog ${rem} ${rem === 1 ? 'show' : 'shows'} met ⭐⭐⭐`, rem);
    return;
  }
  // achter de horizon geen "nog 9 werelden": dat is hetzelfde totaal, anders gezegd
  if (t.telWerelden && meerWereldenVooruit(p)) { kastBalk(t, card, `${pr.now} ${pr.label}`, pr.now); return; }
  kastBalk(t, card, rem > 0 ? `nog ${rem} ${unitText(pr.label, rem)}` : 'bijna!', rem > 0 ? rem : null);
}
/* De tikken in de kast (oktober 2026). Max miste hoe speels het aantikken eerst
   was: behaald klonk en deed iets, nog niet was stiller. De kast is daarom een
   beetje speelgoed: elke tik speelt, en de balk onderin blijft wat hij is.
     behaald   kastKlink: de medaille wordt kort ingedrukt en wipt dan omhoog de
               getikte stand in, er gaat een glans over en een ring licht van af,
               en er zweeft een muzieknootje op. Hij speelt een klokje op zijn
               plek op de plank ('kast.klink': langs een rij tikken is een
               wijsje); blijf je op dezelfde tikken, dan gaat elke tik een toon
               hoger, tot je even stopt. Een medaille die meegroeit klinkt, ringt
               en noot in zijn eigen metaal.
     nog niet  kastDof: een houten "tok", omhoog en daar "nog niet" schudden, en
               de boog in de rand loopt opnieuw vol van leeg tot waar je bent --
               zo zie je bij elke tik hoe ver je al bent.
   Zonder beweging (motionOff) blijft alleen het klankje over. */
const KAST_KLANK = ['kast.brons', 'kast.klink', 'kast.goud', 'kast.diamant'];
const KAST_NOOT_KLEUR = ['var(--m-0)', 'var(--m-1)', 'var(--m-2)', 'var(--m-3)'];
// Een achtste en twee gebalkte: hetzelfde nootje als een tekening en niet als
// letter, want ♪ staat niet in de letter van het spel en een 🎵-emoji is grijs.
const KAST_NOOT = [
  '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M9 3v11.3A3.5 3.5 0 1 0 11 17.5V8h6V3z"/></svg>',
  '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M8 4v10.3A3.2 3.2 0 1 0 10 17.3V9l9-2v5.3A3.2 3.2 0 1 0 21 15.3V2z"/></svg>'];
function kastKlink(card, trap) {
  const plek = [...card.parentElement.children].indexOf(card);
  // trommelen: elke volgende tik op dezelfde een toon hoger, na een pauze weer van onder
  const keer = card._keer || 0;
  card._keer = keer + 1;
  clearTimeout(card._keerWeg);
  card._keerWeg = setTimeout(() => { card._keer = 0; }, 900);
  playSfx(KAST_KLANK[trap == null ? 1 : trap], { i: (plek + keer) % KAST_LADDER.length });
  if (motionOff()) return;
  opnieuw(card, 'klink');
  kastNoot(card, trap);
}
// Het nootje: rechtsboven van de medaille omhoog, en weg.
function kastNoot(card, trap) {
  const m = card.querySelector('.temoji, .pw-medal');
  if (!m) return;
  const r = m.getBoundingClientRect(), c = card.getBoundingClientRect();
  const n = document.createElement('span');
  n.className = 'kast-noot';
  n.innerHTML = KAST_NOOT[(card._keer || 0) % 2];
  n.style.left = (r.right - c.left - 16) + 'px';
  n.style.top = (r.top - c.top - 10) + 'px';
  if (trap != null) n.style.setProperty('--noot', KAST_NOOT_KLEUR[trap]);
  card.appendChild(n);
  setTimeout(() => n.remove(), 850);
}
function kastDof(card) {
  playSfx('kast.tok');
  if (motionOff()) return;
  opnieuw(card, 'dof');
  /* de boog opnieuw laten vollopen: --p van 0 naar wat er stond, met een uitloop.
     Wat er stond onthoudt hij (dataset.p): wie tikt terwijl hij nog loopt, leest
     anders een halve boog als het doel. */
  const m = card.querySelector('.temoji, .pw-prijs');
  if (!m) return;
  const doel = parseFloat(m.dataset.p || m.style.getPropertyValue('--p')) || 0;
  if (!doel) return;
  m.dataset.p = doel;
  const t0 = performance.now();
  const stap = t => {
    const k = Math.min(1, (t - t0) / 520);
    m.style.setProperty('--p', (doel * (1 - Math.pow(1 - k, 3))).toFixed(1));
    if (k < 1) requestAnimationFrame(stap);
  };
  m.style.setProperty('--p', 0);
  requestAnimationFrame(stap);
}
// Naast de trofeeën tikken zet de balk uit (zie tapTrophy).
function kastErnaast(e) { if (!e.target.closest('.trophy-card')) kastBalk(null); }
// Een klasse opnieuw laten afspelen, ook als hij er nog op stond (tweede tik).
function opnieuw(el, klasse) {
  el.classList.remove(klasse); void el.offsetWidth; el.classList.add(klasse);
  clearTimeout(el['_' + klasse]);
  el['_' + klasse] = setTimeout(() => el.classList.remove(klasse), 650);
}
/* De balk onderin de kast: wat de getikte trofee is of vraagt. Dezelfde balk als
   in de kleedkamer (.dress-bar: naam links, het verdere ernaast) en op dezelfde
   plek, zodat "tik op iets en onderin staat wat het is" op beide verzamelschermen
   hetzelfde werkt. Hier stond eerst een pil die op het kaartje zelf twee tellen
   omklapte -- en op een kaartje zonder pil kwam er eentje bij, bovenop de naam.
   De balk blijft staan tot je iets anders tikt, dezelfde nog eens, of weggaat
   (toonHub en renderShelves zetten hem uit). Het getal in de tekst staat in goud
   (getal), net als "Nog 12 💎" in de kleedkamer. De stem leest hem voor, zoals
   de pil deed. kastBalk(null) zet hem uit. */
/* `rij` (een medaille die meegroeit): de munten van trapRij, op een eigen regel
   onder de naam, met de tekst erachter. `stem`: wat er hardop gezegd wordt, als
   dat meer is dan er staat -- de munten zelf kun je niet voorlezen. */
function kastBalk(t, card, tekst, getal, rij, stem) {
  const bar = $('kast-bar');
  document.querySelectorAll('#trophy-shelves .trophy-card.kies').forEach(k => k.classList.remove('kies'));
  const kast = $('screen-trophies');
  if (!t) { bar.innerHTML = ''; bar.style.display = 'none'; return; }
  card.classList.add('kies');
  const sub = getal != null ? esc(tekst).replace(String(getal), `<span class="db-highlight">${getal}</span>`) : esc(tekst);
  /* t.naar: deze trofee verdien je in de kleedkamer, dus staat er rechts één
     knop die die lade opent -- dezelfde kleine knop als Speel in de balk van de
     kleedkamer. Alleen het icoon van waar je heen gaat, geen woord. */
  const naarKaart = t.naar === 'kaart';
  const knop = t.naar ? `<button class="btn small" id="kast-naar" type="button" aria-label="${naarKaart ? 'Naar de wereld' : 'Naar de kleedkamer'}">${naarKaart ? '🗺️' : t.naar === 'stage' ? '🎪' : '👕'}</button>` : '';
  bar.classList.toggle('met-trappen', !!rij);
  bar.innerHTML = rij
    ? `<div class="db-info"><span class="db-name">${t.emoji} ${esc(t.name)}</span>`
      + `<span class="db-trappen">${rij}<span class="db-sub">${sub}</span></span></div>` + knop
    : `<div class="db-info"><span class="db-name">${t.perfect ? '' : t.emoji + ' '}${esc(t.name)}</span>`
      + `<span class="db-sub">· ${sub}</span></div>` + knop;
  if (knop) $('kast-naar').onclick = () => {
    sndClick(); kastBalk(null);
    if (naarKaart) naarWereldKaart(t.wereldIdx); else openKleedkamerCat(t.naar);
  };
  bar.style.display = 'flex';
  onderVrijMeet();   // ruimte onderin, zodat ook de onderste plank boven de balk kan -- vóór de scroll hieronder
  speak(stem || tekst);
  /* Viel de getikte trofee achter de balk (een tik vlak boven de navigatie), dan
     schuift de kast hem erboven -- hetzelfde als zichtbaarBovenBalk in de
     kleedkamer. */
  const teveel = card.getBoundingClientRect().bottom - (bar.getBoundingClientRect().top - 12);
  if (teveel > 0 && kast.scrollBy) kast.scrollBy({ top: teveel, behavior: motionOff() ? 'auto' : 'smooth' });
}
// Het claim-moment: van 'klaar' naar 'behaald', met een kort, vrolijk feestje.
/* Een trofee openen geeft TROFEE_DIAMANTEN 💎 (oktober 2026, Max). Eerst gaf hij
   niets dan het moment, terwijl de kop van de kast wel het saldo toont. Klein met
   opzet: met alle trappen samen is het een paar honderd over het hele spel, een
   handvol spulletjes. Alleen hier, waar een kind zelf een cadeautje opent; een
   trofee die elders vanzelf in de kast komt (zie awardTrophy) geeft niets. */
const TROFEE_DIAMANTEN = 5;
function openTrophy(id) {
  const p = P();
  const t = TROPHIES.find(x => x.id === id);
  if (!t || p.trophies.includes(id) || !(p.readyTrophies || []).includes(id)) return;
  awardTrophy(p, id);   // uit de klaarlijst, in de kast -- dezelfde regel als overal
  p.diamonds += TROFEE_DIAMANTEN;
  save();
  const saldo = $('trophy-diamonds'), was = saldo ? saldo.textContent : null;
  celebrateTrophy(t);
  justClaimed = id;   // net-behaalde kaart krijgt eenmalig een gouden shimmer
  renderShelves();    // kaart wordt 'Behaald!', scrollpositie blijft
  /* Het saldo blijft staan tot het feestje dichtgaat: dan vliegen de diamanten
     van de geopende medaille naar de pil, en telt hij op (zie celebrateTrophy). */
  if (saldo && was != null) saldo.textContent = was;
}
// Klein beloningsmoment: pop-up + confetti, blijft in beeld tot er ergens
// op het scherm getikt wordt (geen auto-sluit-timer meer) -- de overlay
// beslaat het hele scherm (position:fixed; inset:0), dus "ergens tikken"
// werkt overal, niet alleen op het kaartje zelf.
/* Een nieuwe trap van een medaille die meegroeit: onder de naam het rijtje
   munten (zie trapRij), en de nieuwe munt springt erin. Dít is het moment dat
   een kind leert dat er trappen zijn -- "ik heb zilver, en er is nog goud". */
function tpTrappen(t) {
  if (t.trap == null) return '';
  const ladder = TROPHY_LADDERS.find(l => l.ids.includes(t.id));
  if (!ladder) return '';
  const i = ladder.ids.indexOf(t.id);
  return `<div class="tp-trappen">${trapRij(ladder, P(), { tot: i, nieuw: i, boog: false })}</div>`;
}
function celebrateTrophy(t) {
  const reduce = motionOff();
  sndClick();          // 'optil'-tik op het moment van openen
  const ov = openOverlay('trophy-pop-overlay',
    '<div class="pop-panel trophy-pop"><div class="tp-head">Nieuwe trofee!</div>'
    + '<div class="tp-stage">'
    +   '<div class="tp-rays" aria-hidden="true"></div>'
    +   '<div class="tp-ring" aria-hidden="true"></div>'
    +   '<div class="tp-chest" aria-hidden="true">🎁</div>'
    // een trap van een medaille die meegroeit: de rand in zijn eigen metaal
    +   `<div class="tp-emoji"${t.trap != null ? ` style="--tp-vlak:var(--m-vlak-${t.trap});--tp-rand:var(--m-rand-${t.trap})"` : ''}>${t.emoji}</div>`
    + '</div>'
    + `<div class="tp-name">${t.name}</div>`
    + tpTrappen(t)
    /* Waarvoor: "6 werelden uitgespeeld". Er stond alleen de naam, en een kind
       wist bij het openen niet wát ze gedaan had. Bij een trap zegt het metaal
       van de grote medaille hierboven welke trap het is. */
    + `<div class="tp-waarom">${esc(t.desc)}</div>`
    + `<div class="tp-joepie">Joepie! <span class="tp-dia">+${TROFEE_DIAMANTEN} 💎</span></div></div>`,
    // het sprankelen loopt door zolang de trofee open staat -- stoppen bij het sluiten.
    // De gouden shimmer over de net behaalde kaart (.just-claimed) liep af onder
    // dit feestje, waar niemand hem zag. Hij begint daarom opnieuw zodra het
    // feestje dichtgaat: eerst het geschenk, dan waar het in de kast terechtkwam.
    { fade: 300, onClose: o => {
      if (o._spark) clearInterval(o._spark);
      const kaart = document.querySelector('.trophy-card.just-claimed');
      if (kaart) { kaart.classList.remove('just-claimed'); void kaart.offsetWidth; kaart.classList.add('just-claimed'); }
      // de diamanten van deze trofee: van de medaille naar het saldo, dan telt hij op
      const saldo = $('trophy-diamonds');
      if (saldo && cur) {
        flyDiamonds((kaart && kaart.querySelector('.temoji, .pw-medal')) || kaart, saldo, 3);
        telStraks(saldo, P().diamonds);
      }
    } });
  const pop = ov.querySelector('.trophy-pop');
  // De uitbarsting: kist knalt open, emoji slaat in, confetti-kanon + feestgeluid.
  const burst = () => {
    if (!ov.isConnected || pop.classList.contains('burst')) return;
    pop.classList.add('burst');
    sndGroot();          // het trillen zit erin, net als op de andere drie plekken
    if (!reduce) {
      const center = () => { const r = pop.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height * 0.42]; };
      const [cx, cy] = center();
      confettiBurst(cx, cy, 30, t.emoji);
      // blijf sprankelen zolang de trofee 'open' blijft (tot je sluit)
      ov._spark = setInterval(() => {
        if (!ov.isConnected) { clearInterval(ov._spark); return; }
        const [x, y] = center();
        confettiBurst(x, y, 5);
      }, 1100);
    }
    speak('Joepie! Je hebt de trofee ' + t.name + '!');
  };
  if (reduce) burst();
  else setTimeout(burst, 480);   // eerst even spanning: de kist schudt
  // Ongeduldig? Eerste tik opent meteen; daarna sluit een tik het feestje.
  ov.onclick = () => { if (!pop.classList.contains('burst')) burst(); else ov._close(); };
}
/* ================= Wereldfeest (fase 4D.1) =================================
   Eén laag voor twee mijlpalen, en met opzet één en niet twee: de laatste show van
   een wereld kan tegelijk de show zijn die hem perfect maakt, en dan zijn twee
   schermen achter elkaar geen twee keer zo feestelijk maar twee keer zo lang.

   Wat er staat is wat er gebeurd is, in die volgorde:
     wereld uit   -> het spulletje dat je nu hebt
     perfect      -> de trofee die je nu hebt
   Allebei mogen alleen staan. Er staat nooit iets dat nog moet gebeuren, en er is
   niets te kiezen: tikken sluit, en dan ben je terug op het eindscherm waar
   "Verder op tournee" staat. Geen eigen navigatie dus -- de weg vooruit is de weg
   die er al was.

   Bewust klein gehouden: één pop, één uitbarsting confetti, en klaar. De
   trofee-ceremonie van de kast (een kist die schudt en openknalt) is er voor het
   moment dat een kind zélf een cadeautje opent; dit is een moment dat overkomt en
   dat hoort korter te zijn. */
function wereldFeest(f) {
  if (!f || (!f.spul && !f.perfect)) return;
  const reduce = motionOff();
  const w = f.wereld;
  // De kop zegt het grootste dat er gebeurd is. "Wereld uit!" wint van "Perfecte
  // wereld!" als ze samenvallen -- dan staat perfect eronder als de gouden regel.
  const kop = f.spul ? 'Wereld uit!' : 'Perfecte wereld!';
  /* ÉÉN PRIJS, NIET DRIE RIJEN. Hier stonden de schat, het podium en de trofee
     als drie rijen onder elkaar: drie soorten prijs, met drie namen, en het
     podium heette dan nog anders dan de wereld. Nu staat er wat de wereld ís: zijn
     prijs (zie "= De prijs van een wereld"), het podium met de schat erop, groot.
     Daaronder de som van het podium -- de schat (✓) plus de twee stukken uit de
     winkel, met hun prijs of hun vinkje, net als in de lade van Podia -- en een
     gouden regel als hij ook perfect is: dan staat de rand al in goud.

     Heeft ze de twee stukken al, dan is het podium nu af: "Nieuw podium!", en ze
     staat er meteen op (zoals kopen ook meteen aandoet) -- het eindscherm eronder
     laat het zien zodra deze laag weg is. Dan geen som: er valt niets meer bij te
     doen. */
  const i = WORLDS.indexOf(w);
  const podium = wereldPodium(w);
  const q0 = P();
  const podiumAf = !!f.spul && !!podium && podiumVanJou(q0, podium) && !q0.owned.includes(podium.id);
  if (podiumAf) {
    q0.equipped.stage = podium.id;
    save();
    if ($('end-stage')) applyStage($('end-stage'), q0);
  }
  const prijs = i >= 0 ? wereldPrijsHTML(q0, i, 116) : '';
  const titel = podiumAf ? 'Nieuw podium!' : f.spul ? 'Nieuwe wereldschat!' : 'Overal drie sterren';
  const naam = podiumAf ? podium.name : f.spul ? (f.spul.full || f.spul.name) : '';
  let som = '';
  if (f.spul && podium && !podiumAf) {
    som = '<div class="wf-som">' + podiumStukken(podium).map(it => {
      const heeft = q0.owned.includes(it.id);
      const stand = heeft ? 'owned' : q0.diamonds < it.price ? 'need' : 'price';
      return `<span class="mini-kaart${heeft ? ' owned' : ''}">${itemThumb(it)}`
        + `<span class="item-status ${stand}">${heeft ? '✓' : '💎 ' + it.price}</span></span>`;
    }).join('<span class="pb-plus" aria-hidden="true">+</span>') + '</div>';
  }
  const goud = (f.perfect && f.spul) ? '<div class="wf-goud">⭐ Perfecte wereld!</div>' : '';
  const rijen = `<div class="wf-prijs">${prijs}</div>`
    + `<div class="wf-tekst"><b>${titel}</b>${naam ? `<span>${esc(naam)}</span>` : ''}</div>`
    + som + goud;
  /* Eén knop, en alleen als er echt iets nieuws te dragen is: aandoen. Het ding
     staat op het scherm, het is van haar, en de enige gedachte die een kind op dat
     moment heeft is "die wil ik op". Zonder deze knop is het antwoord daarop: dit
     wegtikken, het eindscherm lezen, de tweede knop vinden, de kleedkamer in. */
  // "Doe aan" en niet "Aandoen": dat is woord voor woord de knop in de kleedkamer
  // (zie renderDressBar). Eén zin voor één handeling, waar hij ook staat.
  // En hij ziet eruit als die knop ook: de gewone verhoogde .btn.small, zoals
  // "Koop" in de kleedkamer. Hij was een plat geel pilletje, vlak onder het
  // even platte gele "Perfecte wereld!" dat níét tikbaar is -- twee keer
  // hetzelfde vorm voor twee verschillende dingen.
  const aanKnop = f.spul ? `<button class="btn small wf-aan" type="button">Doe aan</button>` : '';
  const ov = openOverlay('wereld-feest-overlay',
    `<div class="pop-panel wereld-feest">`
    + `<div class="wf-kop">${kop}</div>`
    + `<div class="wf-wereld">${w.icon || '🌍'} ${esc(w.name)}</div>`
    + `<div class="wf-rijen wf-een">${rijen}</div>`
    + aanKnop + `</div>`,
    /* Geen "Tik om verder te gaan" meer: hij sluit zichzelf, elke tik sluit hem,
       en een kind van vijf leest die regel toch niet. */
    { fade: 300, onClose: () => $('screen-end').classList.remove('feest-open') });
  $('screen-end').classList.add('feest-open');
  let af = false;
  const dicht = () => { if (af) return; af = true; ov._close(); };
  ov.onclick = dicht;
  /* Hij sluit zichzelf, anders dan de trofeeënkast. Dat
     verschil is precies het verschil tussen de twee momenten: een cadeautje in de
     kast open je zélf en blijft dus open tot jij zegt dat je klaar bent, maar dit
     overkomt je ná de show -- en dan mag het je niet vasthouden. Eronder staat
     "Verder op tournee", en daar wilde het kind toch al heen.

     Staat de Aandoen-knop er, dan krijgt hij ruimer de tijd: een knop die onder
     je vinger vandaan verdwijnt is erger dan geen knop, en een zesjarige moet de
     regel eerst nog lezen. Zes tellen is lang genoeg om te kijken, te begrijpen
     en te tikken -- en kort genoeg om geen scherm te zijn dat wacht. Wie eerder
     klaar is tikt ernaast en is weg; wie de knop mist vindt hem terug op het
     eindscherm eronder ("👕 Pas je ..."), dus er gaat niets verloren. */
  setTimeout(dicht, f.spul ? 6000 : 3100);
  const aan = ov.querySelector('.wf-aan');
  if (aan) aan.onclick = (e) => {
    e.stopPropagation();   // anders sluit de tik óók de laag via ov.onclick hierboven
    sndAan();              // dezelfde handeling als in de kleedkamer, dus hetzelfde klankje
    const q = P();
    q.equipped[f.spul.cat] = f.spul.id;
    noticeReady(checkTrophies(q));   // een outfit-combo kan een geheime trofee zijn
    save();
    const pop = $('end-avatar');
    // Mét de danslaag: elke pas beweegt .pas-laag, en zonder die laag stond de
    // pop na het aandoen stil -- ook bij elke tik daarna.
    if (pop) { popKleren(pop, avatarSVG(q, 150)); dance('end-avatar'); }
    dicht();
  };
  sndGroot();
  if (!reduce) {
    const panel = ov.querySelector('.wereld-feest');
    const r = panel.getBoundingClientRect();
    confettiBurst(r.left + r.width / 2, r.top + r.height * 0.42, 26, f.spul ? f.spul.emoji : (w.icon || '⭐'));
  }
  // lees-vrij: dezelfde twee zinnen die er staan, meer niet
  speak(f.spul
    ? `${w.name} uit! Een nieuwe wereldschat: een ${f.spul.name}.` + (podiumAf ? ' En een nieuw podium!' : '')
      + (f.perfect ? ' En een perfecte wereld!' : '')
    : `Perfecte wereld! ${w.name}.`);
}
// tijdens het spelen: geen groot feest, wél een vriendelijke hint naar de kast
function noticeReady(trofees) {
  if (!trofees || !trofees.length) return;
  updateTroDot();
  showToast(`🎁 ${trofees.length === 1 ? 'Nieuwe trofee' : trofees.length + ' nieuwe trofeeën'}`, null, null, 'goud', 1900);
}
// rood stipje op het Trofeeën-tabblad zolang er trofeeën klaarliggen om te openen
// De memory-knop belooft nu wat hij oplevert (2 per paar + 3 als de hele set uit
// is). Stond er niet op: een gouden knop zonder aangekondigde beloning.
function memPayout(p) { return buildMemoryDeck(p).pairs * MEM_PAIR_GAIN + MEM_DONE_BONUS; }
function updateTroDot() {
  if (!cur) return;
  const p = P();
  const nieuw = (p.readyTrophies || []).length > 0;
  $('nav-tro').classList.toggle('has-new', nieuw);
  // het stipje zegt "er ligt iets klaar"; een schermlezer krijgt dat in woorden
  $('nav-tro').setAttribute('aria-label', nieuw ? 'Trofeeën, nieuw' : 'Trofeeën');
}

