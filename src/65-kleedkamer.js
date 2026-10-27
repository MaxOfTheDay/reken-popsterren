/* ================= Kleedkamer (passen én kopen) ================= */
/* ---- Item-miniaturen: teken het echte kledingstuk in zijn kleur (en patroon)
   i.p.v. een kaal kleurbolletje. Emoji-items (dieren, instrumenten, pintje,
   toverstaf, extra's) houden hun emoji; podia krijgen hun eerste deco-emoji in
   de bol. De vormen komen uit dezelfde tekencode als de paspop. ---- */
let thumbUid = 0;
const RB_STOPS = '<stop offset="0" stop-color="#ff5f6d"/><stop offset=".3" stop-color="#ffc371"/><stop offset=".6" stop-color="#8bd450"/><stop offset="1" stop-color="#47c9ff"/>';
// De miniaturen tekenen wat dít kind straks aan heeft: op de jongens-basis
// hangt er een shirt met broek in het rek en geen jurk. Zelfde item, zelfde
// prijs, zelfde trofee -- alleen de vorm volgt de basis, net als bij de pop.
const OUTFIT_THUMBS = {
  meisje: {
    view: '62 104 76 108', cls: '',
    shape: dc => `<path d="M84 106 L66 196 Q100 209 134 196 L116 106 Q100 113 84 106 Z" fill="${dc}" stroke="rgba(0,0,0,.2)" stroke-width="1.5"/>`,
    pat: {
      stars: `<text x="86" y="145" font-size="14" fill="#fff176">★</text><text x="108" y="165" font-size="12" fill="#fff176">★</text><text x="78" y="185" font-size="12" fill="#fff176">★</text><text x="112" y="192" font-size="14" fill="#fff176">★</text>`,
      hearts: `<text x="84" y="146" font-size="13" fill="#fff">♥</text><text x="106" y="164" font-size="11" fill="#ffcdd2">♥</text><text x="79" y="184" font-size="11" fill="#ffcdd2">♥</text><text x="110" y="190" font-size="13" fill="#fff">♥</text>`,
      magic: `<text x="85" y="148" font-size="15" fill="#ffd54f">★</text><text x="108" y="172" font-size="11" fill="#ffd54f">★</text><text x="80" y="188" font-size="11" fill="#ffd54f">★</text><path d="M112 138 a9 9 0 1 0 6 15 a11 11 0 1 1 -6 -15 Z" fill="#ffe082"/>`,
      disco: `<circle cx="90" cy="140" r="4" fill="#fff" opacity=".8"/><circle cx="110" cy="155" r="4" fill="#80deea" opacity=".8"/><circle cx="85" cy="175" r="4" fill="#f48fb1" opacity=".8"/><circle cx="113" cy="182" r="4" fill="#fff59d" opacity=".8"/>`,
      ohl: `<path d="M84 107 L67 194 L75 197 L89 110 Z" fill="#2e7d32"/><path d="M116 107 L133 194 L125 197 L111 110 Z" fill="#c62828"/><text x="100" y="140" text-anchor="middle" font-size="11.5" font-weight="900" fill="#1b1b1b">OHL</text><path d="M67 190 Q100 205 133 190 L134 196 Q100 209 66 196 Z" fill="#1b1b1b"/>`,
      scales: `<g fill="none" stroke="rgba(255,255,255,.6)" stroke-width="2.5"><path d="M82 152 a7 7 0 0 1 14 0 M96 152 a7 7 0 0 1 14 0"/><path d="M80 168 a7 7 0 0 1 14 0 M94 168 a7 7 0 0 1 14 0 M108 168 a7 7 0 0 1 14 0"/><path d="M84 184 a7 7 0 0 1 14 0 M98 184 a7 7 0 0 1 14 0"/></g>`,
    },
  },
  jongen: {
    // Mouwtjes en een echte broek i.p.v. twee kokers: zonder die T-vorm zijn
    // shirt en broek even breed en wordt het één lange pijp die niets zegt.
    // Vak-verhouding blijft dicht bij die van de jurk, zodat een shirt in het rek
    // niet ineens veel smaller oogt dan een jurk ernaast.
    view: '62 98 76 120', cls: 'smal',
    shape: dc => `<path d="M82 158 L79 208 Q87 213 95 208 L100 188 L105 208 Q113 213 121 208 L118 158 Z" fill="${dc}" stroke="rgba(0,0,0,.2)" stroke-width="1.5"/>`
      + `<path d="M86 104 L70 118 L77 131 L83 124 L78 166 L122 166 L117 124 L123 131 L130 118 L114 104 Q100 112 86 104 Z" fill="${dc}" stroke="rgba(0,0,0,.2)" stroke-width="1.5"/>`,
    // De kledingstukken staan hier op dezelfde plek als op de pop, dus dezelfde
    // patronentabel past precies -- en dan kán het miniatuur ook niet meer uit de
    // pas lopen met wat je straks aanhebt. (De jurk heeft in de winkel wél een
    // eigen, vereenvoudigde vorm en houdt daarom zijn eigen tabel hierboven.)
    pat: PAT_SHIRT,
  },
};
function dressThumb(it, base) {
  const uid = ++thumbUid;
  const t = OUTFIT_THUMBS[base] || OUTFIT_THUMBS[DEFAULT_BASE];
  const rainbow = it.color === 'RAINBOW';
  const dc = rainbow ? `url(#dt${uid})` : it.color;
  const defs = rainbow ? `<defs><linearGradient id="dt${uid}" x1="0" y1="0" x2="1" y2="1">${RB_STOPS}</linearGradient></defs>` : '';
  const inner = (it.pattern && t.pat[it.pattern]) || '';
  return `<svg viewBox="${t.view}" xmlns="http://www.w3.org/2000/svg">${defs}${t.shape(dc)}${inner}</svg>`;
}
const HAIR_THUMBS = {
  meisje: { view: '38 22 124 88', draw: hc => hairBackStaartjes(hc) + `<circle cx="100" cy="72" r="32" fill="${SKIN}"/>` + hairFrontStaartjes(hc) },
  // krapper uitgesneden dan bij de staartjes: kort haar bedekt minder, dus zonder
  // strakkere uitsnede zou de kleur -- het enige wat je hier koopt -- verzuipen
  jongen: { view: '62 22 76 78',  draw: hc => hairBackKort(hc)      + `<circle cx="100" cy="72" r="32" fill="${SKIN}"/>` + hairFrontKort(hc) },
};
function hairThumb(it, base) {
  const uid = ++thumbUid;
  const t = HAIR_THUMBS[base] || HAIR_THUMBS[DEFAULT_BASE];
  const rainbow = it.color === 'RAINBOW';
  const hc = rainbow ? `url(#ht${uid})` : it.color;
  const defs = rainbow ? `<defs><linearGradient id="ht${uid}" x1="0" y1="0" x2="1" y2="1">${RB_STOPS}</linearGradient></defs>` : '';
  return `<svg viewBox="${t.view}" xmlns="http://www.w3.org/2000/svg">${defs}${t.draw(hc)}</svg>`;
}
function shoesThumb(it) {
  const uid = ++thumbUid;
  const rainbow = it.color === 'RAINBOW';
  const c = rainbow ? `url(#st${uid})` : it.color;
  const defs = rainbow ? `<defs><linearGradient id="st${uid}" x1="0" y1="0" x2="1" y2="1">${RB_STOPS}</linearGradient></defs>` : '';
  return `<svg viewBox="2 0 56 46" xmlns="http://www.w3.org/2000/svg">${defs}
    <line x1="20" y1="8" x2="19" y2="28" stroke="#ffdcb8" stroke-width="7" stroke-linecap="round"/>
    <line x1="40" y1="8" x2="41" y2="28" stroke="#ffdcb8" stroke-width="7" stroke-linecap="round"/>
    <ellipse cx="18" cy="33" rx="13" ry="7" fill="${c}"/><ellipse cx="42" cy="33" rx="13" ry="7" fill="${c}"/></svg>`;
}
function micThumb(it) {
  const uid = ++thumbUid;
  const rainbow = it.color === 'RAINBOW';
  const c = rainbow ? `url(#mt${uid})` : it.color;
  const defs = rainbow ? `<defs><linearGradient id="mt${uid}" x1="0" y1="0" x2="1" y2="1">${RB_STOPS}</linearGradient></defs>` : '';
  return `<svg viewBox="0 0 48 62" xmlns="http://www.w3.org/2000/svg">${defs}
    <rect x="20" y="24" width="8" height="34" rx="4" fill="#546e7a"/>
    <rect x="14" y="52" width="20" height="6" rx="3" fill="#455a64"/>
    <circle cx="24" cy="16" r="15" fill="${c}" stroke="rgba(0,0,0,.28)" stroke-width="1.5"/>
    <path d="M14 12 h20 M14 16 h20 M14 20 h20" stroke="rgba(0,0,0,.16)" stroke-width="1.3"/>
    <ellipse cx="19" cy="10" rx="4" ry="3" fill="rgba(255,255,255,.5)"/></svg>`;
}
// Elk miniatuur komt uit hetzelfde vak (.item-thumb); alleen de inhoud verschilt.
function itemThumb(it, base) {
  base = base || curBase();
  const zone = (inner, extra) => `<div class="item-thumb${extra ? ' ' + extra : ''}">${inner}</div>`;
  /* Een item mag zijn eigen miniatuur meebrengen -- dezelfde afspraak als acc.draw
     bij de paspop, maar dan in zijn eigen vakje (52px hoog) i.p.v. in de 200x250 van
     de pop. De zes wereldbeloningen doen dat (fase 4D.2); de rest tekent zijn
     emoji, en dat is voor een strik of een zonnebril prima.

     Let op de volgorde: thumb() gaat vóór emoji. Een item mag dus allebei hebben --
     de emoji blijft dan staan voor de plekken die geen SVG aankunnen (de naam in de
     kleedkamerbalk, de confetti bij het wereldfeest). */
  if (it.thumb) return zone(it.thumb(base));
  if (it.emoji) return zone(`<span class="thumb-emo">${it.emoji}</span>`);
  if (it.cat === 'dress') return zone(dressThumb(it, base), (OUTFIT_THUMBS[base] || OUTFIT_THUMBS[DEFAULT_BASE]).cls);
  if (it.cat === 'hair')  return zone(hairThumb(it, base));
  if (it.cat === 'shoes') return zone(shoesThumb(it));
  if (it.cat === 'mic')   return zone(micThumb(it));
  // een podium is een plek en geen voorwerp: de schijf zelf, zoals ze erop staat
  /* Een wereldpodium is de prijs van zijn wereld, en draagt daarom zijn schat
     (zie "= De prijs van een wereld"): zonder namen op de kaartjes was het anders
     een rij bijna gelijke schijven. Disco en een oud gekocht podium zonder wereld
     blijven een kale schijf. */
  if (it.cat === 'stage') {
    const i = podiumWereldIdx(it);
    const prijs = (i >= 0 && cur) ? wereldPrijsHTML(P(), i, 60) : '';
    return prijs ? zone(prijs, 'thumb-prijs') : zone(podiumHTML(it), 'thumb-podium');
  }
  return zone(`<span class="thumb-swatch" style="background:${it.color}"></span>`, 'thumb-staal');
}

let shopCat = 'dress';
let shopSelectedId = null;
/* Het stuk dat in de podiumbalk gekozen is (zie renderPodiumBar): een stuk van het
   gekozen podium dat nog niet van haar is. Leeg = de balk gaat over het hele podium. */
let podiumStuk = null;
let shopJustBoughtId = null;
/* Het "Nieuw!"-venster loopt op een timer (zie confirmShopBuy). Er is er precies
   een tegelijk: wie snel twee dingen achter elkaar koopt, of tussendoor iets
   anders aantikt, laat anders een timer van het vorige moment achter die daarna
   alsnog het rek komt herbouwen. Hij controleerde dat al op de id, maar een
   opgeruimde timer kan sowieso niets meer aanrichten. */
let shopBoughtTimer = null;
let dressReturnTo = null;      // 'trophies' als je hier via een trofeeënkast-kaart kwam -- terug-navigatie gaat dan naar de kast i.p.v. de kaart
// FASE 1: de Looks-lijst (complete thema-outfits als spaardoel) is uit de kleedkamer
// gehaald. Wat overblijft is één vraag: kies een soort, kies een stuk, doe het aan.
// Verse start (o.a. nogmaals op het al-actieve Kleedkamer-tabblad tikken):
// altijd terug naar de standaardcategorie, zonder selectie.
function openKleedkamer() {
  shopCat = 'dress'; shopSelectedId = null; dressReturnTo = null;
  toonHub('screen-dress');
  ladeRuimteOpnieuw();
  renderShop();   // ná show(): renderDressBar mag de balk zelf verbergen zolang niets gekozen is
  $('screen-dress').scrollTop = 0;   // altijd bovenaan beginnen bij (her)openen
}
// Terug naar de kleedkamer via de vaste navigatie (kwam van een ánder
// tabblad): hervat waar je gebleven was -- categorie, selectie en scrollpositie
// blijven allemaal gewoon staan (het zijn simpele variabelen die niets anders al
// aanraakte). Een gerichte sprong hierheen (bv. vanuit de Verzamelaar-trofee, zie
// openKleedkamerCat) heeft die variabelen intussen al naar zijn eigen doel gezet
// -- dát wordt dus vanzelf de nieuwe "waar je gebleven was"-stand.
// De scrollpositie blijft alleen staan zolang niemand de opmaak opvraagt terwijl
// renderShop het rek vervangt: een leeg rek maakt het scherm te kort om te
// scrollen, en dan zet de browser het terug naar bovenaan. Zie renderShop.
function resumeKleedkamer() {
  toonHub('screen-dress');
  renderShop();
}
// vanuit een trofee met een `naar`: open die categorie meteen in de kleedkamer
function openKleedkamerCat(cat) {
  shopCat = cat; shopSelectedId = null; dressReturnTo = 'trophies';
  toonHub('screen-dress');
  ladeRuimteOpnieuw();
  renderShop();
  $('screen-dress').scrollTop = 0;
}
/* Rechtstreeks naar één spulletje: de juiste lade open, en het stuk meteen aan --
   of, als het nog niet van haar is, gekozen met zijn prijs in de lade onderaan.

   Waarvoor: een wereldbeloning komt binnen als een plaatje met een naam op het
   feestje ná de show, en verhuist daarna stilletjes naar de kleedkamer -- waar hij
   in de zesde lade ligt, achter een rij die opzij geschoven moet worden. Wie hem
   wilde zien moest dus raden waar. Dit is dat gat en verder niets: geen nieuw
   scherm, geen nieuwe stand, alleen de twee variabelen die de kleedkamer toch al
   heeft, op de plek gezet waar het kind heen wilde. */
function openKleedkamerItem(id) {
  const it = item(id);
  if (!it) return openKleedkamer();
  /* Een wereldschat die nog niet van haar is ligt niet in Accessoires -- daar
     staan alleen spullen die je kunt kopen of al hebt. Hij is het slotje op zijn
     podium, dus daar gaan we heen, met dat podium gekozen. */
  const p = P();
  const podium = (isBeloning(it.id) && !p.owned.includes(it.id)) ? podiumVan(it.id) : null;
  shopCat = podium ? PODIA_CAT : it.cat; shopSelectedId = null; podiumStuk = null; dressReturnTo = null;
  toonHub('screen-dress');
  ladeRuimteOpnieuw();
  renderShop();
  if (podium) id = podium.id;
  /* Van haar? Dan doet ze het aan, en niet "even passen": dit pad wordt gelopen
     vanaf de knop "Bekijk je <spulletje>" na een wereld, en de pop droeg het daar
     toch al als voorbeeld. Eén stap eerder echt is precies de beloning die het
     moment bedoelde -- en het is dezelfde afspraak als bij een tik op het kaartje.
     Nog niet van haar (je wens, of een podium waar nog stukken aan ontbreken) ->
     gekozen, met wat er nog moet in de lade onderaan. */
  const doel = item(id);
  if (bezit(p, doel)) {
    if (p.equipped[doel.cat] !== doel.id) equipShopItem(doel.id);
  } else {
    shopSelectedId = id;
    if (doel.cat === PODIA_CAT) podiumStuk = volgendStuk(p, doel);
    paintShop();
  }
  /* Hier niet bovenaan beginnen (zoals openKleedkamer en openKleedkamerCat), maar
     bij het kaartje zelf: dit is een tik op één spulletje, en het zesde wereld-
     spulletje staat onder de rand. De pop draagt het al, dus zonder dit stond het
     bewijs buiten beeld. 'center' en niet 'nearest': de navigatiebalk ligt over
     het rek, en 'nearest' parkeert een kaartje daar net achter. */
  const scherm = $('screen-dress');
  scherm.scrollTop = 0;
  const kaart = $('item-grid').querySelector(`.item-card[data-item="${id}"]`);
  if (kaart && kaart.scrollIntoView) kaart.scrollIntoView({ block: 'center' });
}
/* De kop van de kleedkamer heeft twee standen, net als die van de kast (zie
   kastScroll): bovenaan, en gescrold. Hier wordt alleen de klasse gezet, met
   dezelfde drempel en dezelfde rAF als bij de kast.

   Op een gewoon scherm verandert er gescrold niets meer: de balk is de dichte
   bovenkant van de lade, dus daar schuift niets zichtbaar onderdoor. Op een
   laag staand scherm krimpt de spiegel; dan moet de inhoud eronder stil blijven
   staan, net als bij de kast, en daarvoor meet renderShop met kopKrimpMeten. */
function kleedScroll() { rafKlem(kleedGescrold); }
function kleedGescrold() { gescrold($('screen-dress')); }
/* Het rek opnieuw opbouwen. Eén keer per categoriewissel, per aankoop en per
   keer dat de kleedkamer opengaat -- en verder niet: kijken en aandoen gaan via
   paintShop() hieronder, dat dezelfde kaartjes laat staan en alleen hun stand
   bijwerkt. Dat scheelde niet alleen werk maar vooral sprongen: de grid werd
   vroeger bij élke tik van nul opgebouwd, en dan verschuift wat je net aanraakte
   onder je vinger vandaan. */
function renderShop() {
  const p = P();
  /* De kopstand volgt de schuifstand. Élke weg hierheen loopt hierlangs -- het
     tabblad, terugkomen, een categorie, een spulletje, Podia -- en de
     rAF in kleedScroll leest de stand pas als de aanroeper hem heeft gezet (de
     meeste zetten hem ná deze functie terug op nul). */
  $('screen-dress').onscroll = kleedScroll;
  /* De ← staat er alleen als hij iets anders doet dan de tabbladbalk: terug
     naar de kast waar je vandaan kwam (zie dressBack). Vanaf het tabblad is de
     balk zelf de weg terug, net als op de kaart. */
  $('screen-dress').classList.toggle('met-terug', dressReturnTo === 'trophies');
  ladenPlaatsen();
  kleedScroll();
  const grid = $('item-grid');
  /* De nieuwe kaartjes komen eerst in een los stapeltje en gaan pas onderaan in
     één keer het rek in. Het rek staat dus nooit leeg zolang deze functie loopt,
     en dat is waar het om gaat: vraagt er tussendoor iets de opmaak op, dan meet
     de browser een leeg rek, is het scherm ineens niet meer hoog genoeg om te
     scrollen, en zet hij het terug naar bovenaan. Precies zo verloor de
     kleedkamer vroeger haar plek als je van een ander tabblad terugkwam (zie
     resumeKleedkamer). */
  const kaarten = document.createDocumentFragment();
  /* DE BALK MET DE LADEN. Acht knoppen in één stuk: de zeven kledingsoorten en
     als achtste 🎪 Podia. Alleen tekens, geen woorden -- het woord staat in het
     aria-label -- en niets om te scrollen: elke lade staat altijd in beeld.

     Zo is hij er niet altijd geweest. Eerst een scrollende rij pilletjes waar er
     op een telefoon vijf à zes van in beeld stonden (met een berekende kier om te
     laten zien dat er meer was), en Podia als schakelaar 👕 | 🎪 in de kop: klein,
     ver weg van wat hij schakelde, en het shirt drie keer op het scherm. Nu is het
     één onderdeel van hetzelfde materiaal als de tabbalk onderaan, en wat aanstaat
     zegt hetzelfde blauwe licht dat daar schuift. Podia staat achteraan: het is
     de vloer onder haar voeten, het laatste wat je aankleedt.

     Het licht (.rij-licht) blijft staan als de knoppen opnieuw gebouwd worden --
     anders kan het niet schuiven -- en weet via --i waar het heen moet. */
  const tabs = $('shop-tabs');
  tabs.querySelectorAll('.tab-btn').forEach(b => b.remove());
  let licht = tabs.querySelector('.rij-licht');
  if (!licht) {
    licht = document.createElement('span');
    licht.className = 'rij-licht';
    licht.setAttribute('aria-hidden', 'true');
    tabs.appendChild(licht);
  }
  const laden = [...CATS, { id: PODIA_CAT, ico: PODIA_CHIP.ico, name: PODIA_CHIP.name }];
  laden.forEach((c, i) => {
    const b = document.createElement('button');
    const aan = c.id === shopCat;
    b.type = 'button';
    b.className = 'tab-btn' + (aan ? ' active' : '');
    b.setAttribute('aria-label', c.name);
    b.setAttribute('aria-pressed', aan ? 'true' : 'false');
    b.innerHTML = `<span class="tab-ico" aria-hidden="true">${c.ico}</span>`;
    b.onclick = () => {
      sndClick();
      if (aan) return;
      shopCat = c.id; shopSelectedId = null; podiumStuk = null;
      ladeRuimteOpnieuw(); renderShop();
      $('screen-dress').scrollTop = 0;   // een nieuwe lade begint bovenaan
    };
    tabs.appendChild(b);
    if (aan) tabs.style.setProperty('--i', i);
  });
  tabs.style.setProperty('--n', laden.length);
  shopItems(p).forEach(it => {
    const card = document.createElement('div');
    card.dataset.item = it.id;
    /* De klasse staat er meteen op en het pilletje blijft leeg: paintShop()
       hieronder vult de stand van élk kaartje in en is daarmee de enige plek waar
       dat gebeurt -- maar hij zoekt ze op met .item-card, dus zonder deze regel
       vindt hij er nul.
       Geen wereldteken in de hoek meer. Een schat is in zijn lade gewoon een van
       je spullen; bij wélke wereld hij hoort zegt zijn podium. */
    card.className = 'item-card';
    /* Geen naam meer op het kaartje: het plaatje zegt het, en een rek vol woorden
       was vooral drukte voor een kind dat nog niet (vlot) leest. De naam is niet
       weg, hij staat op de plek waar hij iets betekent: in de balk onderaan zodra
       je iets kiest om te kopen, even als bordje in de spiegel als je iets aandoet
       (naamBordje), hardop waar de stem aan staat, en voor een schermlezer in het
       aria-label hieronder. */
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', it.full || it.name);
    card.innerHTML = itemThumb(it) + `<div class="item-status"></div>`;
    /* Tikken op kleren die van je zijn = ze aandoen. Er zat een stap tussen --
       eerst kiezen, dan "Doe aan" in de balk onderaan -- en die stap kostte een
       kind van vijf een tweede tik op een andere plek van het scherm voor iets
       waar niets aan te bevestigen valt: aandoen kost niets en is met één tik
       terug te draaien. Kopen blijft wél twee stappen, want dát kost diamanten.

       Drie gevallen, en meer zijn het er niet:
         van jou, nog niet aan  -> meteen aan (equipShopItem doet het geluid, het
                                   opslaan en het danspasje)
         van jou en al aan      -> bij kleren, schoenen en podium niets.
                                   Nadrukkelijk géén "dan maar uit": een kind dat
                                   nog eens op haar jurk tikt wil hem niet kwijt,
                                   en een pop zonder jurk bestaat niet. Wel het
                                   danspasje, zodat de tik antwoord krijgt.
                                   Bij de optionele spullen (micro, instrument,
                                   extra, dier) wél uit: die kan de pop ook
                                   missen, en zonder deze tik was een eenmaal
                                   gekozen micro nooit meer kwijt te raken. Het
                                   gouden ✓ zegt dat hij aan is.
                                   Een podium ook: eraf = terug op Disco.
         nog niet van jou       -> kiezen: de pop past het en de lade onderaan
                                   zegt wat het kost (bij een podium: wat er nog
                                   ontbreekt). */
    card.onclick = () => {
      if (it.id === 'mic_pintje') bumpPintjeTaps(card);   // easter egg telt hier mee, ook los aangetikt
      const p2 = P();
      /* Past ze iets dat niet van haar is, dan is een tik op wat ze écht aanheeft
         (het gouden ✓) of nog eens op het blauwe kaartje: "laat maar, terug naar
         mij". Eerst deed de eerste niets (de pop bleef in het paskleed staan, de
         lade bleef "Koop" zeggen) en trok hij bij een micro je eígen micro uit --
         precies het omgekeerde van wat het kind vroeg. Pas ná deze tik, als er
         niets meer gepast wordt, gelden de drie gevallen hieronder weer. */
      if (shopSelectedId && (shopSelectedId === it.id || (bezit(p2, it) && p2.equipped[it.cat] === it.id))) {
        return stopPassen();
      }
      if (bezit(p2, it)) {
        if (p2.equipped[it.cat] === it.id) {
          if (OPTIONELE_SPULLEN.includes(it.cat) || it.cat === PODIA_CAT) return unequipShopItem(it.cat);
          sndClick(); tapDance('shop-avatar'); return;
        }
        naamBordje(it);
        return equipShopItem(it.id);
      }
      sndClick();
      speak(it.full || it.name);   // de balk zegt het in letters; wie niet leest, hoort het
      /* Stond er een "Nieuw!"-kaartje open, dan verandert de vólgorde zodra dat
         feestje voorbij is (het spulletje verhuist naar de bezit-groep), en dus
         moet het rek dan wél opnieuw. In alle andere gevallen blijft het staan
         waar het staat. */
      const herbouw = !!shopJustBoughtId;
      clearTimeout(shopBoughtTimer);
      shopJustBoughtId = null; shopSelectedId = it.id;
      podiumStuk = it.cat === PODIA_CAT ? volgendStuk(P(), it) : null;
      herbouw ? renderShop() : paintShop();
      if (it.cat === PODIA_CAT) zichtbaarBovenBalk(it.id);
    };
    kaarten.appendChild(card);
  });
  /* Achteraan Podia: de horizon. Liggen er voorbij de laatste wereld die je
     vooruit ziet nog podia, dan één wolk in plaats van een rij sloten -- zie
     zichtbarePodia. Geen klik en geen stand: zonder data-item vindt paintShop er
     geen spulletje bij en laat hem staan. */
  if (shopCat === PODIA_CAT && meerPodia(p)) {
    const wolk = document.createElement('div');
    wolk.className = 'item-card horizon-mist';
    wolk.innerHTML = horizonMistHTML('Nog meer podia');
    kaarten.appendChild(wolk);
  }
  grid.textContent = '';
  grid.appendChild(kaarten);
  rekBreedte();
  paintShop();
  // de kop krimpt op een laag scherm als er gescrold wordt (zie 75-kleedkamer.css)
  kopKrimpMeten($('screen-dress'), 'kleedkamer');
}
/* Elk kaartje in het rek even breed, ook op de laatste rij. Het rek is een
   flex-wrap met justify-content:center (zie .item-grid), zodat een halve laatste
   rij in het midden staat in plaats van links. Maar met flex-grow rekte die
   laatste rij ook óp: op een tablet stonden er vijf kaartjes per rij en dan vier
   duidelijk bredere eronder. CSS kan het aantal kolommen niet afronden, dus
   rekenen we hier de breedte van een vólle rij uit en geven die aan élk kaartje
   (--kaart-b). Zonder die waarde (geen opmaak, een nagebootst scherm) valt
   .item-card terug op het oude meegroeien. KAART_GAT is de gap van .item-grid.

   De breedte hangt alleen van het venster af. Ze wordt dus onthouden tot het
   venster verandert: rek.clientWidth opvragen is een volledige opmaakronde, en
   die zat bij élke tik op een lade in de tik. */
const KAART_GAT = 10;
let rekBreedteBij = '';
function rekBreedte() {
  const rek = $('item-grid');
  if (!rek || rekBreedteBij === venstermaat()) return;
  if (!rek.clientWidth || typeof getComputedStyle !== 'function') return;
  const min = parseFloat(getComputedStyle(rek).getPropertyValue('--kaart-min')) || 104;
  /* clientWidth rondt áf naar het dichtstbijzijnde hele getal, dus een rek van
     625,6 meldt zich als 626 -- en een rij die op 626 precies past, breekt dan
     op het laatste kaartje af (drie per rij op een bureaublad waar er vier
     pasten). Eén pixel eraf vangt dat altijd. Niet getBoundingClientRect: het
     scherm komt binnen met een schaal van 1.03, en die meet hij mee. */
  const w = rek.clientWidth - 1;
  const n = Math.max(1, Math.floor((w + KAART_GAT) / (min + KAART_GAT)));
  const b = Math.min((w - (n - 1) * KAART_GAT) / n, min * 1.7);
  rek.style.setProperty('--kaart-b', Math.floor(b) + 'px');
  rek.style.setProperty('--kaart-groei', '0');
  rekBreedteBij = venstermaat();
}
addEventListener('resize', () => rafKlem(rekBreedte));
/* Waar de balk met de laden staat. Op een telefoon in de kop: die plakt, dus de
   balk blijft in beeld terwijl het rek eronder scrolt. Liggend en breed is de kop
   een kolom links, en dan is de balk de bovenkant van de lade rechts -- daar
   hoort hij in het scherm zelf, vlak vóór het rek, waar hij in zijn eigen kolom
   plakt. Eén element dat verhuist, geen tweede balk: renderShop en het licht
   blijven precies hetzelfde. Hoe hij er op elke plek uitziet staat bij "Het
   podium en de lade" in 75-kleedkamer.css; deze vraag moet daar gelijk mee
   lopen. */
const LADE_NAAST = '(orientation: landscape) and (max-height: 500px), (min-width: 1000px) and (orientation: landscape)';
function ladenPlaatsen() {
  const balk = $('shop-tabs-wrap'), scherm = $('screen-dress'), rek = $('item-grid');
  if (!balk || !scherm || !rek || !window.matchMedia || !scherm.insertBefore) return;
  const kop = scherm.querySelector('.hub-sticky');
  const doel = matchMedia(LADE_NAAST).matches ? scherm : kop;
  if (!doel || balk.parentNode === doel) return;
  if (doel === scherm) scherm.insertBefore(balk, rek); else kop.appendChild(balk);
}
addEventListener('resize', () => rafKlem(ladenPlaatsen));
/* Wat er in het rek staat, en in welke volgorde. Twee groepen:

     0  van jou   -- je eigen kast, meteen bovenaan en meteen aan te doen
     1  te koop   -- op prijs oplopend, dus goedkoop eerst

   Er was een derde ("te verdienen", de wereldbeloningen achteraan op slot). Die is
   in fase 6E uit de laden gehaald: een slotje tussen de prijzen maakte van een
   beloning stille winkelwaar die toevallig niet te koop is. Een schat die je nog
   niet hebt staat nu als slotje op zijn podium (Podia); een schat die je wél hebt
   staat gewoon bij je eigen spullen, want dáár kies je wat je aandoet. Een
   beloning heeft geen prijs en krijgt binnen die groep een groot eindig getal --
   geen Infinity, want twee ervan geven dan Infinity - Infinity = NaN, en een
   vergelijker die NaN teruggeeft is geen vergelijker meer.

   Podia volgt dezelfde twee groepen, en binnen een groep de volgorde van de
   tournee in plaats van een prijs: een podium kost wat er nog aan ontbreekt, en
   dat verschilt per kind.

   Het spulletje dat nét gekocht is telt hier even nog als "te koop": zo blijft het
   tijdens zijn "Nieuw!"-moment staan waar het kind het aantikte, en verhuist het
   pas naar de bezit-groep als dat moment voorbij is (zie confirmShopBuy). */
function shopItems(p) {
  const groep = it => (bezit(p, it) && it.id !== shopJustBoughtId) ? 0 : 1;
  // Podia: zichtbarePodia staat al op tournee-volgorde, en sort is stabiel
  if (shopCat === PODIA_CAT) return zichtbarePodia(p).sort((a, b) => groep(a) - groep(b));
  const rang = it => (typeof it.price === 'number' ? it.price : 1e9);
  return ITEMS.filter(i => i.cat === shopCat && (!isBeloning(i.id) || p.owned.includes(i.id))).slice()
    .sort((a, b) => (groep(a) - groep(b)) || (rang(a) - rang(b)));
}
/* DE TAG: het ene pilletje op een kaartje, op de plek van het prijskaartje. Eén
   vorm (hetzelfde stille vlak) en vijf standen, van zacht naar luid:

     need   💎 45   te koop, nog niet genoeg -- gedempt
     price  💎 45   te koop, genoeg -- wit
     slot   🔒      eerst een wereld uitspelen (tik: een bubbeltje zegt welke)
     owned  ✓      van jou -- een zacht vinkje
     on     ✓      draag je nu / sta je op -- een gouden vinkje, en het kaartje
                    krijgt zijn gouden rand
     new    Nieuw!  net gekocht -- goud, twee tellen

   Geen woorden meer ("Van jou", "✓ Aan ✕", "Speel uit"): een kind van vijf leest
   ze niet, en een rij van zeventien keer "Van jou" was het luidste op het scherm.
   Het vinkje zegt het, en het goud zit op één plek -- wat aan is. Wie wil weten
   wat een tag betekent krijgt het als aria-label.

   Een gedeelde bouwsteen: de kleedkamer, de stukken in de lade onderaan en
   straks de kast gebruiken hem allemaal. Zie .item-status in het stijlblad. */
const TAG_WOORD = { on: 'Aan', owned: 'Van jou', slot: 'Op slot', new: 'Nieuw' };
function zetTag(el, stand, prijs) {
  if (!el) return;
  el.className = 'item-status ' + stand;
  el.textContent = stand === 'new' ? 'Nieuw!' : (stand === 'on' || stand === 'owned') ? '✓'
    : stand === 'slot' ? '🔒' : `💎 ${prijs}`;
  if (TAG_WOORD[stand]) el.setAttribute('aria-label', TAG_WOORD[stand]);
  else el.removeAttribute('aria-label');
}
// De stand van één spulletje (of podium) voor dit kind. De volgorde ís de rangorde.
function tagStand(it, p) {
  if (shopJustBoughtId === it.id) return 'new';
  if (p.equipped[it.cat] === it.id && bezit(p, it)) return 'on';
  if (bezit(p, it)) return 'owned';
  if (it.cat === 'stage' ? podiumOpSlot(p, it) : isBeloning(it.id)) return 'slot';
  return p.diamonds < tagPrijs(it, p) ? 'need' : 'price';
}
// Wat er op het prijskaartje staat: een podium kost wat er nog aan ontbreekt.
function tagPrijs(it, p) { return it.cat === 'stage' ? podiumPrijs(p, it) : it.price; }
/* Eén kaartje, één stand. Zet de klassen van het kaartje en zijn tag -- zonder
   het kaartje opnieuw op te bouwen, zodat aandoen en kiezen geen sprong in het
   rek geven. */
function dressCardState(card, it, p) {
  const stand = tagStand(it, p);
  const owned = bezit(p, it);
  card.className = 'item-card'
    + (stand === 'on' ? ' equipped' : (owned ? ' owned' : ''))
    + (shopSelectedId === it.id ? ' selected' : '')
    + (!owned && p.wens === it.id ? ' gewenst' : '')
    + (stand === 'new' ? ' just-bought' : '');
  const tag = card.querySelector('.item-status');
  if (it.cat === PODIA_CAT && (stand === 'price' || stand === 'need') && it.stukken) return zetSetRij(tag, it, p);
  zetTag(tag, stand, tagPrijs(it, p));
}
/* DE VERZAMELKAART. Een podium dat nog niet af is, draagt onder zijn schijf geen
   bedrag maar zijn set: drie kleine vakjes met zijn drie stukken. Wat ze heeft
   staat in kleur met een groene rand, wat nog ontbreekt als donker silhouet.
   Eerst stond hier "💎 210": geen prijs maar het totaal van wat er nog
   ontbrak, met dezelfde tag als een spulletje dat je in één keer koopt. Een kind
   las dan "dit podium kost 210" -- terwijl je stukken verzamelt. Wat het kost
   staat per stuk in de balk, als je het podium aantikt.
   Een podium op slot (de schat ontbreekt nog) houdt gewoon zijn 🔒: dat is de
   eerste stap van de set, en die zegt het slotje al. De vakjes worden alleen
   opnieuw getekend als er iets veranderd is (paintShop loopt vaak). */
function zetSetRij(el, st, p) {
  if (!el) return;
  const stukken = podiumStukken(st);
  const sleutel = stukken.map(s => ((p.owned || []).includes(s.id) ? 1 : 0)).join('');
  if (el.classList.contains('set-rij') && el.dataset.set === sleutel) return;
  el.className = 'item-status set-rij';
  el.dataset.set = sleutel;
  el.setAttribute('aria-label', `${sleutel.split('1').length - 1} van de ${stukken.length}`);
  el.innerHTML = stukken.map((s, i) => `<span class="sv${sleutel[i] === '1' ? ' heb' : ''}">${itemThumb(s)}</span>`).join('');
}
/* Alles bijwerken behalve het rek zelf: de pop (met het gekozen stuk al aan), het
   podium, de diamantenteller, de balk onderaan en de stand van elk kaartje dat er
   al staat. Dit is wat er gebeurt bij kiezen en aandoen -- de kaartjes blijven
   dezelfde elementen, dus er verschuift niets en de scrollpositie blijft. */
function paintShop() {
  const p = P();
  const selected = shopSelectedId ? item(shopSelectedId) : null;
  /* Passen mag, maar een schat die nog niet van jou is past niemand. Bij een
     koopstuk is de pop de etalage ("zo zou je eruitzien voor 45 💎") en dat hoort
     zo te blijven; bij een wereldschat is juist het níet weten de beloning, en
     één tik zou daar het hele raadsel uit halen. De pop blijft dus staan zoals ze
     staat, en het kaartje blijft het medaillon met het vraagteken. */
  const geheim = selected && isBeloning(selected.id) && !p.owned.includes(selected.id);
  const preview = (selected && !geheim) ? previewProfile(p, selected) : p;
  /* De teller. Loopt er een afteltelling (na een aankoop, zie telNaar), dan
     schrijft die hem en mag deze regel er niet overheen -- anders staat het
     eindbedrag er al voordat het kind de diamanten heeft zien gaan. */
  zetTeller($('shop-diamonds'), p.diamonds);
  zetWensPil(p);   // de 💎-pil draagt ook hier de wens (zie "= Mijn wens")
  /* De pop, en het podium onder haar voeten. Hier stond ooit applyStage(): het
     oude decorvlak áchter haar, met drie emoji in de hoeken -- dat beantwoordde de
     vraag van dit scherm ("hoe ziet mijn ster eruit?") met iets anders. Wat er nu
     staat is alleen de schijf waar ze op staat: van jou, of als voorbeeld van het
     podium dat je net aantikte. De spiegel houdt zijn eigen licht (zie .spiegel).
     De schijf wordt alleen opnieuw getekend als het een ander podium is. */
  const podium = itemOr(preview.equipped.stage, 'stage_disco');
  const plek = $('shop-podium');
  if (plek && plek.dataset.podium !== podium.id) {
    plek.innerHTML = podiumHTML(podium);
    plek.dataset.podium = podium.id;
  }
  popKleren($('shop-avatar'), avatarSVG(preview, 165, true));   // zonder haar pasje te breken
  renderDressBar(selected, p);
  ladeRuimte();
  $('item-grid').querySelectorAll('.item-card').forEach(card => {
    const it = item(card.dataset.item);
    if (it) dressCardState(card, it, p);
  });
}
/* De ruimte onder het rek (zie 75-kleedkamer): alleen voor de lade als die er
   ook is, en voor de podiumbalk -- drie keer zo hoog -- nog meer. Hij groeit
   meteen mee als de lade opengaat, maar krimpt pas weer bij een nieuwe lade of
   een nieuw bezoek (ladeRuimteOpnieuw). Anders sprong het rek, wie helemaal
   onderaan stond, 66px omlaag op het moment dat je iets kocht of terugtikte: de
   lade gaat dicht, het scherm wordt korter en de browser trekt de stand terug. */
function ladeRuimte() {
  const scherm = $('screen-dress'), lade = $('dress-bar');
  if (lade.style.display === 'none') return;
  scherm.classList.add('met-lade');
  if (lade.classList.contains('podium-bar')) scherm.classList.add('met-podiumbalk');
}
function ladeRuimteOpnieuw() {
  $('screen-dress').classList.remove('met-lade', 'met-podiumbalk');
}
function previewProfile(p, it) {
  const preview = { ...p, equipped: { ...p.equipped } };
  /* Een podium past ze als schijf: alleen het podium verandert in de spiegel,
     plus het ene stuk dat in de balk gekozen is (dat pas je, zoals elk
     spulletje). Eerst trok ze hier de hele set aan, en dan stond ze in de spiegel
     in kleren die niet van haar waren -- wat van jou is en wat niet, was dan niet
     meer te zien. */
  if (it.cat === PODIA_CAT && podiumStuk) preview.equipped[item(podiumStuk).cat] = podiumStuk;
  preview.equipped[it.cat] = it.id;
  return preview;
}

// 🎲 Verras me: een willekeurige outfit uit wat de ster al bezit, met een vreugdedansje.
// Optionele spullen (micro, instrument, extra, dier) blijven soms bewust weg,
// anders hangt de ster altijd vol.
function surpriseOutfit() {
  const p = P();
  const optioneel = OPTIONELE_SPULLEN;
  CATS.forEach(c => {
    const bezit = ITEMS.filter(i => i.cat === c.id && p.owned.includes(i.id));
    if (!bezit.length) return;
    if (optioneel.includes(c.id)) p.equipped[c.id] = Math.random() < 0.35 ? null : pick(bezit).id;
    else p.equipped[c.id] = pick(bezit).id;
  });
  shopSelectedId = null;
  // ook een gegokte outfit kan per toeval een geheime combo raken
  const trofees = checkTrophies(p);
  noticeReady(trofees);
  save();
  // alleen ándere spullen aan: het rek zelf verandert niet, dus alleen bijwerken
  paintShop();
  tapDance('shop-avatar', true);
  /* Dit was de enige gebeurtenis in de hele app die wél trilde en niet klonk: een
     buzz(20) zonder noot. Nu hetzelfde klankje als elk ander aandoen -- en de tril
     van 20 zit erin, dus hij is niet weg maar verhuisd. */
  sndAan();
}

/* ================= Mijn wens ==================================================
   Eén spulletje dat je nog niet kunt betalen, vastgezet met een hartje in de lade
   onderaan. De 💎-pil op de kaart draagt het dan mee: het emoji van je wens naast
   je diamanten, met een streepje eronder dat volloopt naarmate je spaart. Is er
   genoeg, dan wordt de pil goud, en tikken brengt je meteen naar dát spulletje.
   Het eindscherm draagt hem ook (eindWens): daar krijg je de diamanten.

   Waarom: de droomspulletjes kosten vier tot zes shows. Dat is een goed doel,
   maar een kind van zes houdt "ik spaar voor het draakje" niet vijf shows lang
   in haar hoofd -- en de pil zei tot nu toe alleen hoeveel je hebt, niet waarvoor.

   Opslag: p.wens is een item-id, en verder niets. Er is er hoogstens één; een
   nieuwe vervangt de oude, nog eens tikken haalt hem weg, en kopen ruimt hem op
   (confirmShopBuy). Wat niet meer klopt -- een id dat niet bestaat, iets dat al
   van je is, een wereldschat -- gooit migrate() weg. */
function wensItem(p) {
  const it = p.wens ? item(p.wens) : null;
  return (it && typeof it.price === 'number' && !p.owned.includes(it.id)) ? it : null;
}
function zetWens(id) {
  const p = P();
  if (p.wens === id) delete p.wens; else p.wens = id;
  save();
  sndClick();
  const it = item(id);
  renderDressBar(it, p);
  paintShop();
  if (p.wens === id) {
    showToast('💖 Je wens');
    toastWeg(1300);
  }
}
/* Het teken van de wens: zijn emoji, of anders zijn eigen kleine tekening. Hier
   stond het teken van zijn lade (👕 voor kleren, 💇 voor haar) -- maar ruim de
   helft van de winkel heeft geen emoji (kapsels, outfits, schoenen, micro's), en
   dan zag elke outfit-wens er in de pil hetzelfde uit: een shirtje. Nu is het de
   tekening van het kaartje zelf, op de maat van een letter (.wens-tek). */
function wensTekenHTML(it) {
  return it.emoji ? esc(it.emoji) : `<span class="wens-tek">${itemThumb(it)}</span>`;
}
/* De 💎-pil bijwerken: met wens, of gewoon zoals hij altijd was. Dezelfde pil
   staat op de drie schermen met de tabbladbalk -- de kaart, Werelden en de kast
   -- en is daar alle drie dezelfde knop. Hij was alleen op de kaart een knop: op
   Werelden en in de kast zag hij er precies zo uit, maar deed een tik niets, en
   stond de wens er niet bij. In de show, op het eindscherm en in memory blijft
   hij een gewone teller: daar is ze aan het spelen.

   De kleedkamer heeft hem sinds oktober 2026 ook, met de wens erbij: dat was de
   enige 💎-pil met tabbladbalk zonder. Daar is hij alleen een knop zolang er een
   wens is -- een tik brengt je dan naar dat kaartje, met Koop of Speel in de
   lade. Zonder wens is hij er een teller: "naar de kleedkamer" vanuit de
   kleedkamer zou een knop zijn die niets doet.

   Is er genoeg gespaard (.wens-klaar), dan wordt de hele pil goud: hetzelfde goud
   als de 🎁-pil in de kast, en dat betekent in deze app "hier ligt iets voor je
   klaar, tik maar". Daarom is hij overal waar hij goud kan worden ook een knop.
   Een tik koopt niets -- kopen is de enige stap die niet terug kan, en die blijft
   achter de Koop-knop in de lade. Hij brengt je er alleen heen. */
const WENS_PILLEN = ['map-diamonds', 'reis-diamonds', 'trophy-diamonds', 'shop-diamonds'];
function zetWensPil(p) {
  const it = wensItem(p);
  WENS_PILLEN.forEach(id => {
    const pil = $(id) && $(id).closest('.diamond-badge');
    const plek = pil && pil.querySelector('.wens-mini');
    if (!plek) return;
    const kleed = id === 'shop-diamonds';
    if (!it) {
      plek.innerHTML = '';
      plek.removeAttribute('data-wens');
      pil.classList.remove('met-wens', 'wens-klaar');
      pil.style.removeProperty('--wens');
      if (kleed) {
        pil.onclick = null;
        pil.removeAttribute('role'); pil.removeAttribute('tabindex'); pil.removeAttribute('aria-label');
      } else {
        pil.onclick = () => navTik('dress');
        pil.setAttribute('aria-label', 'Naar de kleedkamer');
      }
      return;
    }
    const klaar = p.diamonds >= it.price;
    // alleen opnieuw tekenen als het een ander spulletje is: de pil wordt vaak bijgewerkt
    if (plek.dataset.wens !== it.id) { plek.innerHTML = wensTekenHTML(it); plek.dataset.wens = it.id; }
    pil.classList.add('met-wens');
    pil.classList.toggle('wens-klaar', klaar);
    pil.style.setProperty('--wens', Math.min(100, Math.round(100 * p.diamonds / it.price)) + '%');
    pil.onclick = () => { sndClick(); openKleedkamerItem(it.id); };
    if (kleed) { pil.setAttribute('role', 'button'); pil.tabIndex = 0; }
    pil.setAttribute('aria-label', klaar ? `Je wens: ${it.full || it.name} -- je kunt hem kopen!`
      : `Je wens: ${it.full || it.name}, nog ${it.price - p.diamonds} diamanten`);
  });
}
/* De wens op het eindscherm. Het moment waarop ze diamanten krijgt zei niets over
   waarvoor ze spaart; nu draagt het 💎-vakje dezelfde wens en hetzelfde streepje
   als de pil op de kaart. Het streepje begint op wat er vóór de show was en loopt
   vol als de diamanten in de teller landen (eindWensVul).

   Genoeg? Dan wordt het vakje níét goud: het is geen knop, en twee gouden dingen
   voor één tik is er één te veel. Het vakje houdt een vol streepje en een
   wiebelende wens, en de tweede knop neemt het over: de wens ervoor en een gouden
   rand, en hij gaat meteen naar dát spulletje. Alleen als die knop nog gewoon
   "Kleedkamer" is -- een nieuw wereldspulletje of podium gaat voor (zie endLevel). */
function eindWens(p, opbrengst) {
  const vakje = $('end-earn').querySelector('.earn-chip');
  const it = wensItem(p);
  if (!vakje || !it) return null;
  const deel = n => Math.max(0, Math.min(1, n / it.price));
  vakje.classList.add('met-wens');
  vakje.style.setProperty('--wens-f', deel(p.diamonds - opbrengst).toFixed(3));
  vakje.insertAdjacentHTML('beforeend', `<span class="wens-mini" aria-hidden="true">${wensTekenHTML(it)}</span>`);
  return { it, vakje, na: deel(p.diamonds), klaar: p.diamonds >= it.price };
}
function eindWensVul(w, wanneer) {
  if (!w) return;
  const vul = () => { w.vakje.style.setProperty('--wens-f', w.na.toFixed(3)); w.vakje.classList.toggle('wens-klaar', w.klaar); };
  if (wanneer > 0) setTimeout(vul, wanneer); else vul();
}

/* De lade onderaan: naam links, dé knop rechts. Bij te weinig diamanten geen dood
   spoor maar een concreet doel: "Nog X 💎" + meteen spelen.
   Hij komt alleen op voor iets dat nóg niet van je is -- een aankoop is de enige
   beslissing die dit scherm kent, en de enige die niet met één tik terug te draaien
   valt. Alles wat al van je is antwoordt op het kaartje zelf en op de pop. */
function renderDressBar(it, p) {
  const bar = $('dress-bar');
  const naam = (it2) => `${it2.emoji ? it2.emoji + ' ' : ''}${it2.full || it2.name}`;
  if (!it) {
    // niets gekozen: geen hint nodig, de kaartjes nodigen zelf al uit tot tikken
    bar.innerHTML = '';
    bar.style.display = 'none';
    return;
  }
  bar.style.display = 'flex';
  bar.classList.toggle('podium-bar', it.cat === PODIA_CAT);
  if (it.cat === PODIA_CAT) return renderPodiumBar(bar, it, p);
  const owned = p.owned.includes(it.id);
  /* Van jou? Dan is er niets te beslissen -- je hebt het al aan (één tik deed dat)
     of het staat één tik van je af. De lade kwam hier met "Doe aan" of met "Die
     draag je nu", en dat is precies wat het kaartje en de pop óók al zeggen: drie
     plekken voor één mededeling, waarvan er twee onder in beeld ruimte kostten. */
  if (owned) { bar.innerHTML = ''; bar.style.display = 'none'; return; }
  const tekort = it.price - p.diamonds;
  if (tekort > 0) {
    /* Te duur? Dan kan het je wens worden (zie "= Mijn wens"): het hartje zet hem
       vast, en de 💎-pil op de kaart draagt hem tot hij te koop is. */
    /* Op een smalle telefoon (320) paste dit niet: de naam én "Nog 190 💎" werden
       allebei afgekapt, en dan was juist het bedrag weg. Daar valt de naam weg
       (.db-woord, zie 75-kleedkamer) en blijft het emoji staan: welk spulletje het
       is, zeggen het blauwe kaartje en de pop al. */
    bar.innerHTML = `
      <div class="db-info"><span class="db-name">${it.emoji ? it.emoji + ' ' : ''}<span class="db-woord">${it.full || it.name}</span></span>
        <span class="db-sub"><span class="db-woord">· </span>Nog <span class="db-highlight">${tekort}</span> 💎</span></div>
      ${wensKnop(it, p)}
      <button class="btn small" id="db-earn">Speel</button>`;
    $('db-wens').onclick = () => zetWens(it.id);
    /* De show waar de kaart je nu heen stuurt. Is alles uit, dan staat p.level op
       WORLD_LAST + 1 -- een level dat niet bestaat. Een show dáár speelde gewoon,
       onder de naam van de laatste halte, en schreef p.stars[49] weg: precies de
       fout die fase 4A uit het spel haalde, en die wereld 7 later zou laten
       beginnen met een halte die al gespeeld lijkt. Dan dus de laatste show. */
    $('db-earn').onclick = () => { sndClick(); startLevel(Math.min(P().level, WORLD_LAST)); };
    return;
  }
  /* Genoeg voor je wens? Dan blijft het hartje naast Koop staan. Hier verdween
     het zodra je genoeg had, en dan kon je je wens niet meer terugnemen zonder
     hem te kopen -- terwijl de pil op de kaart er goud om bleef staan. Een
     spulletje dat je al kunt kopen wordt geen nieuwe wens: daar is Koop voor. */
  const wens = p.wens === it.id;
  bar.innerHTML = `
    <div class="db-info"><span class="db-name">${naam(it)}</span></div>
    ${wens ? wensKnop(it, p) : ''}
    <button class="btn small" id="db-buy">Koop · ${it.price} 💎</button>`;
  if (wens) $('db-wens').onclick = () => zetWens(it.id);
  $('db-buy').onclick = () => confirmShopBuy(it.id);
}
// Het hartje in de lade: leeg (🤍) of vol (💖). Geen tekst: het hart zegt het.
function wensKnop(it, p) {
  const gewenst = p.wens === it.id;
  return `<button class="wens-knop${gewenst ? ' aan' : ''}" id="db-wens" type="button"
        aria-pressed="${gewenst}" aria-label="${gewenst ? 'Geen wens meer' : 'Maak er je wens van'}">${gewenst ? '💖' : '🤍'}</button>`;
}

/* De lade onderaan voor een podium dat nog niet van jou is: zijn drie stukken als
   kleine kaartjes, met + ertussen, en daaronder hoogstens één knop. Er komt geen
   nieuw teken bij -- elk stuk draagt dezelfde tag als in zijn eigen lade.

   De knop is wat je nu kunt doen, en anders is er geen:
     de schat ontbreekt       -> 🗺️ Speel: naar die wereld op de kaart
     alleen koopstukken, genoeg 💎 -> Koop · 55 💎: alles wat ontbreekt in één keer
     te weinig 💎             -> "Nog X 💎" + Speel, zoals bij elk spulletje
   Een tik op een stuk brengt je naar dat stuk in zijn eigen lade (daar aandoen of
   los kopen gaat zoals altijd); een tik op het slotje zegt welke wereld. */
function renderPodiumBar(bar, st, p) {
  if (podiumVanJou(p, st)) { bar.innerHTML = ''; bar.style.display = 'none'; return; }
  const stukken = podiumStukken(st);
  // het gekozen stuk geldt alleen zolang het bij dit podium hoort en nog te koop is
  if (podiumStuk && (!stukken.some(it => it.id === podiumStuk) || bezit(p, item(podiumStuk)))) podiumStuk = null;
  const kaartjes = stukken.map((it, i) => (i ? '<b class="pb-plus" aria-hidden="true">+</b>' : '')
    + `<button class="mini-kaart" type="button" data-stuk="${it.id}" aria-label="${esc(it.full || it.name)}">`
    + itemThumb(it) + '<span class="item-status"></span></button>').join('');
  const wereldIdx = podiumWereldIdx(st);
  /* Eén knop. Is er een stuk gekozen, dan gaat hij over dat stuk; anders over
     wat er aan het hele podium nog ontbreekt. */
  const los = podiumStuk ? item(podiumStuk) : null;
  const prijs = los ? los.price : podiumPrijs(p, st);
  let knop = '';
  if (!los && podiumOpSlot(p, st)) knop = '<button class="btn small" id="db-speel">🗺️ Speel</button>';
  else if (prijs > p.diamonds) knop = `<span class="db-sub">Nog <span class="db-highlight">${prijs - p.diamonds}</span> 💎</span>`
    + '<button class="btn small" id="db-earn">Speel</button>';
  else knop = `<button class="btn small" id="db-buy">Koop · ${prijs} 💎</button>`;
  bar.innerHTML = `<div class="pb-stukken">${kaartjes}</div><div class="pb-knop">${knop}</div>`;
  /* De stukjes zijn kleine kaartjes uit het rek, en ze doen ook wat die doen
     (zie de kaartklik in renderShop): van jou = één tik doet het aan of uit,
     nog niet van jou = kiezen (blauw) en passen, 🔒 = het bubbeltje. Alleen
     ga je nergens heen: het podium blijft gekozen, en na een aankoop schuift
     de keuze door naar het volgende stuk dat nog ontbreekt. */
  bar.querySelectorAll('.mini-kaart').forEach(k => {
    const it = item(k.dataset.stuk);
    const stand = tagStand(it, p);
    k.classList.toggle('op-slot', stand === 'slot');
    k.classList.toggle('equipped', stand === 'on');
    k.classList.toggle('owned', stand === 'owned');
    k.classList.toggle('selected', it.id === podiumStuk);
    zetTag(k.querySelector('.item-status'), stand, it.price);
    k.onclick = () => {
      const q = P();
      if (tagStand(it, q) === 'slot') { sndClick(); return slotBel(k, WORLDS[wereldIdx], wereldIdx); }
      if (bezit(q, it)) {
        if (q.equipped[it.cat] !== it.id) return equipShopItem(it.id, st.id);
        if (OPTIONELE_SPULLEN.includes(it.cat)) return unequipShopItem(it.cat, st.id);
        sndClick(); tapDance('shop-avatar'); return;
      }
      sndClick();
      podiumStuk = podiumStuk === it.id ? null : it.id;
      paintShop();
    };
  });
  /* Een wereld verder vooruit dan waar ze staat: dan brengt Speel haar naar waar
     ze nu speelt (de kaart opent vanzelf op die grens), en niet naar een wereld
     die de reis nog op slot houdt -- dat verklapte die hele wereld, en zette hem
     ook nog op "al gezien" (worldsSeen). */
  if ($('db-speel')) $('db-speel').onclick = () => { sndClick(); naarWereldKaart(wereldTeBezoeken(P(), wereldIdx) ? wereldIdx : -1); };
  if ($('db-earn')) $('db-earn').onclick = () => { sndClick(); startLevel(Math.min(P().level, WORLD_LAST)); };
  if ($('db-buy')) $('db-buy').onclick = () => (los ? confirmShopBuy(los.id, st.id) : confirmShopBuy(st.id));
}
/* Het bubbeltje bij een 🔒: 🗺️ + het wereldteken -> 🔓. Twee tellen, geen
   woorden (wel gesproken in de telmodus), en een tik erop brengt je naar die
   wereld. Er staat er hoogstens één. */
const SLOT_BEL_DUUR = 2000;
let slotBelTimer = null;
function slotBel(bij, w, wereldIdx) {
  const oud = document.querySelector('.slot-bel');
  if (oud) oud.remove();
  clearTimeout(slotBelTimer);
  if (!w || !bij || !bij.getBoundingClientRect) return;
  // nog op slot op de reis: hetzelfde antwoord als daar (zie slotWereld)
  if (!wereldTeBezoeken(P(), wereldIdx)) return slotToast(continueWorld(P()));
  const bel = document.createElement('button');
  bel.type = 'button';
  bel.className = 'slot-bel';
  bel.setAttribute('aria-label', `Speel eerst de ${w.name} uit`);
  bel.innerHTML = `<span aria-hidden="true">🗺️ ${w.icon || '🌍'} → 🔓</span>`;
  const r = bij.getBoundingClientRect();
  bel.style.left = Math.round(r.left + r.width / 2) + 'px';
  bel.style.top = Math.round(r.top - 8) + 'px';
  bel.onclick = () => { bel.remove(); sndClick(); naarWereldKaart(wereldIdx); };
  document.body.appendChild(bel);
  slotBelTimer = setTimeout(() => bel.remove(), SLOT_BEL_DUUR);
  // in de lees-vrije telmodus zegt de stem het (speak zwijgt daarbuiten zelf)
  speak(`Speel eerst de ${w.name} uit.`);
}
// Naar de kaart van één wereld, zoals de Werelden-lijst dat doet: reisDoel is één
// opdracht aan de eerstvolgende kaart (zie src/17-kaartstand.js).
function naarWereldKaart(idx) {
  const oud = document.querySelector('.slot-bel');
  if (oud) oud.remove();
  if (idx >= 0) reisDoel = idx;
  goMap();
}
/* Het podium dat je aantikt hoort in beeld te blijven, en de balk die dan opkomt
   kan er net overheen vallen. Dan schuift de houder waar het rek in scrolt het
   kaartje tot boven de balk -- welke houder dat ook is: hij wordt opgezocht en
   niet aangenomen. (scrollIntoView met een scroll-margin deed hier niets.) */
function zichtbaarBovenBalk(id) {
  const kaart = $('item-grid').querySelector(`.item-card[data-item="${id}"]`);
  const bar = $('dress-bar');
  if (!kaart || !bar || bar.style.display === 'none' || !kaart.getBoundingClientRect) return;
  const teveel = kaart.getBoundingClientRect().bottom - (bar.getBoundingClientRect().top - 12);
  if (teveel <= 0) return;
  let houder = kaart.parentElement;
  while (houder && !(houder.scrollHeight > houder.clientHeight && /auto|scroll/.test(getComputedStyle(houder).overflowY))) houder = houder.parentElement;
  if (houder && houder.scrollBy) houder.scrollBy({ top: teveel, behavior: motionOff() ? 'auto' : 'smooth' });
}
/* Niets meer passen: de pop staat weer in wat van haar is, en de lade onderaan
   gaat dicht. Er verandert niets aan wat ze bezit of draagt, dus het rek blijft
   staan (paintShop) -- hetzelfde als een tweede tik op een stuk in de podiumbalk. */
function stopPassen() {
  shopSelectedId = null; podiumStuk = null;
  sndClick();
  paintShop();
  tapDance('shop-avatar');
}
// De schijf in de spiegel is een snelkoppeling naar Podia.
function openPodia(ev) {
  if (ev) ev.stopPropagation();
  sndClick();
  shopCat = PODIA_CAT; shopSelectedId = null; podiumStuk = null;
  ladeRuimteOpnieuw(); renderShop();
  $('screen-dress').scrollTop = 0;
}

/* ---- Een teller die naar zijn nieuwe stand toe loopt --------------------------
   Betalen is het enige moment waarop het getal in de portemonnee omlaag gaat, en
   het sprong. Een sprong van 60 naar 15 is geen gebeurtenis maar een ander getal:
   je ziet niet dat er iets af ging, alleen dat er iets anders staat. Een halve
   seconde aftellen maakt er wel een gebeurtenis van -- en het loopt gelijk op met
   de diamanten die op datzelfde moment de portemonnee uit vliegen.

   Kort en ease-out: het meeste is in de eerste 200ms al gebeurd, dus het voelt
   niet als wachten. Alleen het getal verandert -- de pil staat rechts in een
   raster-kop, dus wat er aan breedte af gaat trekt niets anders mee.

   Beperkte beweging, geen echte frames (de node-harnas) of een pil die er niet
   is: dan gewoon het eindbedrag. */
const tellers = new WeakMap();
function zetTeller(el, naar) {
  if (!el) return;
  if (!tellers.has(el)) el.textContent = naar;   // loopt er niets, dan is dit de enige schrijver
}
/* ---- En dezelfde teller, maar dan bij verdienen (PS-53) ------------------
   Betalen gaat hierboven al goed. Verdienen ging andersom, en dat was precies
   verkeerd om: bij een goed antwoord stond het nieuwe getal er op t=0, en pas
   daarna vertrokken de diamanten die het zouden komen brengen. Wat je zag was
   een teller die al klopte en een paar ruiten die daarna voor niets overvlogen
   -- de oorzaak kwam ná het gevolg.

   De volgorde hoort te zijn: je verdient iets, het reist, het komt aan. Alleen
   het gétal wacht; p.diamonds en save() gebeuren gewoon meteen, want een
   animatie mag nooit bepalen wat er bewaard is.

   DIA_AANKOMST is hetzelfde moment als waarop flyDiamonds de pil laat opveren:
   dat ís de aankomst. Eén getal, twee gebruikers, en daarom staat het hier en
   niet twee keer. */
const DIA_AANKOMST = 600;
const telWacht = new WeakMap();
function telStraks(el, naar, na) {
  if (!el) return;
  clearTimeout(telWacht.get(el));
  telWacht.delete(el);
  // Geen beweging, dus ook niets om op te wachten: er komen geen diamanten
  // overvliegen (zie flyDiamonds), dus het getal hoort er meteen te staan.
  if (motionOff()) { el.textContent = naar; return; }
  telWacht.set(el, setTimeout(() => {
    telWacht.delete(el);
    telNaar(el, naar, MOTION.snel);
  }, na == null ? DIA_AANKOMST : na));
}
/* Meteen dít getal, en wat er nog onderweg was gaat van tafel. Voor elk scherm
   dat opnieuw getekend wordt: daar hoort geen aftelling van een vorig moment
   overheen te vallen, en tellen vanaf het getal van een ánder kind al helemaal
   niet. */
function telNu(el, naar) {
  if (!el) return;
  clearTimeout(telWacht.get(el));
  telWacht.delete(el);
  const lopend = tellers.get(el);
  if (lopend) { cancelAnimationFrame(lopend.id); tellers.delete(el); }
  el.textContent = naar;
}
function telNaar(el, naar, ms) {
  if (!el) return;
  const lopend = tellers.get(el);
  if (lopend) cancelAnimationFrame(lopend.id);
  tellers.delete(el);
  // Vanaf wat er nu staat en niet vanaf een onthouden waarde: onderbreek je een
  // aftelling met een tweede aankoop, dan telt hij verder waar het oog was.
  const nu = parseInt(el.textContent, 10);
  const van = Number.isFinite(nu) ? nu : naar;
  if (motionOff() || van === naar) { el.textContent = naar; return; }
  const t0 = performance.now();
  const stap = () => {
    const k = Math.min(1, (performance.now() - t0) / ms);
    const e = 1 - Math.pow(1 - k, 3);
    el.textContent = Math.round(van + (naar - van) * e);
    if (k < 1) { const id = requestAnimationFrame(stap); if (id) { tellers.set(el, { id }); return; } }
    tellers.delete(el);
    el.textContent = naar;
  };
  const id = requestAnimationFrame(stap);
  if (id) tellers.set(el, { id }); else el.textContent = naar;
}
/* ---- Een handjevol sterretjes boven het gekochte kaartje ----------------------
   Hier stond confetti(12): stukjes die over de volle breedte van het scherm naar
   beneden regenden, tot vier seconden lang, en die zich niets aantrokken van
   prefers-reduced-motion. Dat is een feest over het hele beeld voor iets wat op
   een kaartje van ruim honderd pixels gebeurt -- en wie drie dingen koopt
   speelt de rest van de kleedkamer onder een regenbui.

   Nu is het een klein boeketje recht boven het kaartje zelf, met dezelfde stukjes
   en dezelfde animatie als het confetti-kanon (.burst-bit/burstOut) maar met een
   korte straal en een korte duur: nadruk op dit ene spulletje, weg voor je erover
   nadenkt. burstOut is puur transform + opacity, dus het kost geen opmaak. */
function koopVonken(el) {
  if (!el || motionOff() || !el.getBoundingClientRect) return;
  const r = el.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height * .42;
  const emo = ['✨', '⭐', '💫', '🌟'];
  for (let i = 0; i < 6; i++) {
    const b = document.createElement('div');
    b.className = 'burst-bit';
    b.textContent = emo[i % emo.length];
    // een waaier omhoog (-90 graden is recht boven), niet een bol naar alle kanten
    const hoek = (-90 + (i - 2.5) * 26 + rnd(-7, 7)) * Math.PI / 180;
    const straal = rnd(34, 58);
    b.style.left = cx + 'px'; b.style.top = cy + 'px';
    b.style.fontSize = '17px';
    b.style.animationDuration = '.62s';
    b.style.setProperty('--dx', Math.round(Math.cos(hoek) * straal) + 'px');
    b.style.setProperty('--dy', Math.round(Math.sin(hoek) * straal) + 'px');
    b.style.setProperty('--rot', rnd(-80, 80) + 'deg');
    document.body.appendChild(b);
    setTimeout(() => b.remove(), 700);
  }
}
// Diamant-feedback: een paar diamanten vliegen van A naar B, en de teller-pil
// pulseert aan de portemonnee-kant. Verdienen = naar de portemonnee toe
// (spelscherm), betalen = van de portemonnee wég (kleedkamer).
/* duur: hoe lang het eerste steentje vliegt (de volgende elk een stukje later).
   De kleedkamer neemt de gewone 620; de show sneller (DIA_SHOW), omdat daar na
   een seconde de volgende som al komt. */
const DIA_SHOW = 420;
function flyDiamonds(fromEl, toEl, n, duur) {
  duur = duur || 620;
  const na = Math.round(duur * 0.18);
  if (!fromEl || !toEl || !fromEl.animate) return;
  /* Bij beperkte beweging vliegt er niets. Dat mag, want de diamanten zijn hier
     al: elke aanroep komt ná p.diamonds en ná de teller op het scherm (zie
     submitAnswer en confirmShopBuy). Deze boog vertelt alleen wáár ze vandaan
     komen -- de opbrengst zelf staat er met of zonder. */
  if (motionOff()) return;
  const f = fromEl.getBoundingClientRect(), t = toEl.getBoundingClientRect();
  const dx = t.left + t.width / 2 - (f.left + f.width / 2);
  const dy = t.top + t.height / 2 - (f.top + f.height / 2);
  for (let i = 0; i < n; i++) {
    const d = document.createElement('div');
    d.className = 'fly-dia';
    d.textContent = '💎';
    d.style.left = (f.left + f.width / 2 - 11) + 'px';
    d.style.top = (f.top + f.height / 2 - 11) + 'px';
    document.body.appendChild(d);
    d.animate([
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: `translate(${dx * 0.5 + (i - 1) * 26}px, ${dy * 0.4 - 46}px) scale(1.2)`, offset: .5 },
      { transform: `translate(${dx}px, ${dy}px) scale(.5)`, opacity: .85 }
    ], { duration: duur + i * na, easing: 'ease-in-out' }).onfinish = () => d.remove();
    setTimeout(() => d.remove(), duur + 280 + i * na);
  }
  // pulseer de portemonnee: meteen als de diamanten eruit vertrekken,
  // pas bij aankomst als ze erin vallen
  const fromBadge = fromEl.closest && fromEl.closest('.diamond-badge');
  const toBadge = toEl.closest && toEl.closest('.diamond-badge');
  const badge = fromBadge || toBadge;
  if (badge && badge.animate) setTimeout(() => badge.animate(
    [{ transform: 'scale(1)' }, { transform: 'scale(1.3)' }, { transform: 'scale(1)' }],
    { duration: 340, easing: 'ease-out' }), fromBadge ? 0 : duur - 20);
}

/* blijf: het podium dat gekozen blijft als dit stuk vanuit zijn balk gekocht
   wordt (zie renderPodiumBar). Zonder blijf gaat de keuze weg, zoals altijd. */
function confirmShopBuy(id, blijf) {
  const it = item(id);
  const p = P();
  if (bezit(p, it)) return equipShopItem(id, blijf);
  // Een wereldbeloning heeft geen prijs en is dus niet te koop, en een podium
  // zonder zijn schat ook niet. De balk biedt de knop niet eens aan; dit is het
  // slot op de deur, niet de deur zelf.
  if (isBeloning(it.id) || (it.cat === PODIA_CAT && podiumOpSlot(p, it))) return;
  /* Een podium kopen = de stukken kopen die er nog aan ontbreken, in één keer.
     Wat er dan in p.owned komt zijn die stukken -- het podium zelf niet, dat is
     afgeleid. Ze komen in hun eigen lade te liggen, als gewone spullen. */
  const prijs = tagPrijs(it, p);
  const erbij = it.cat === PODIA_CAT ? podiumRest(p, it).map(x => x.id) : [it.id];
  // welke podia er vóór deze aankoop al van haar waren (zie nieuwPodium hieronder)
  const podiaVoor = ITEMS.filter(st => st.cat === PODIA_CAT && podiumVanJou(p, st)).map(st => st.id);
  if (p.diamonds < prijs) {
    sndWrong();
    showToast(`Nog ${prijs - p.diamonds} 💎`);
    toastWeg(1800);
    return;
  }
  p.diamonds -= prijs;
  erbij.forEach(id2 => { if (!p.owned.includes(id2)) p.owned.push(id2); });
  if (erbij.includes(p.wens)) delete p.wens;   // de wens is uitgekomen
  p.equipped[it.cat] = it.id;
  /* Was dit los gekocht stuk het laatste van een podium? Dan is dat podium nu af,
     en ze gaat erop staan -- kopen doet aan, en dit is wat het stuk aan haar
     geeft. Het moment zelf (een toast "Nieuw podium!") komt als de diamanten
     aankomen; de spiegel laat het podium dan al zien. Een podium dat ze als
     geheel kocht krijgt geen tweede feestje: dat kaartje zegt al "Nieuw!". */
  const nieuwPodium = it.cat === PODIA_CAT ? null
    : ITEMS.find(st => st.cat === PODIA_CAT && podiumVanJou(p, st) && !podiaVoor.includes(st.id)) || null;
  if (nieuwPodium) p.equipped.stage = nieuwPodium.id;
  /* De lade ging over "wil je dit kopen?" en dat is beantwoord: hij verdwijnt, en
     wat ervoor in de plaats komt is het gouden "Nieuw!" op het kaartje plus de pop
     die het al draagt. Het kaartje wordt hieronder op zijn id opgezocht en niet
     meer op .selected, want die klasse hoort nu alleen nog bij kiezen om te kopen.
     Kwam de aankoop uit de podiumbalk, dan blijft die staan en kiest hij het
     volgende stuk dat nog te koop is -- de reeks loopt door zonder te zoeken. */
  shopSelectedId = blijf || null;
  podiumStuk = blijf ? (podiumRest(p, item(blijf)).find(x => tagStand(x, p) !== 'slot') || { id: null }).id : null;
  clearTimeout(shopBoughtTimer);        // een vorig "Nieuw!"-venster is hiermee voorbij
  shopJustBoughtId = it.id;
  sndCoin();
  /* De afteltelling start vóór het opnieuw tekenen: paintShop zou het eindbedrag er
     anders meteen neerzetten, en dan valt er niets meer af te tellen. Hij loopt
     gelijk op met de diamanten die hieronder de portemonnee uit vliegen. */
  telNaar($('shop-diamonds'), p.diamonds, 520);
  const trofees = checkTrophies(p);
  save();
  /* DE VOLGORDE van een aankoop, in drie tellen:
       0    betalen -- het muntje, de teller telt af, drie 💎 vliegen naar de pop
       600  aankomst (DIA_AANKOMST) -- de pop danst in haar nieuwe spulletje, met
            het klankje van aandoen, en het kaartje viert mee: goud, "Nieuw!",
            het boeketje vonken
       1600 pas dán de trofee-hint, als die er is -- bovenaan, als de dans uit is
     Hier gebeurde dat allemaal op 0: twee klankjes over elkaar (het muntje en
     het tikje van tapDance), de pop die al danste vóór er iets betaald was, en
     een trofeetoast die precies over de pop viel op het moment dat zij het
     middelpunt moest zijn. De lade gaat wél meteen weg: de vraag "kopen?" is
     beantwoord, en een knop die blijft staan nodigt uit om nog eens te tikken. */
  renderDressBar(blijf ? item(blijf) : null, p);
  flyDiamonds($('shop-diamonds'), $('shop-spiegel'), 3);   // betalen: diamanten verláten de portemonnee, naar de paspop
  const stil = motionOff();
  // nieuwe trofee klaar? stipje aan + vriendelijke hint -- na het podium, als dat er is
  setTimeout(() => noticeReady(trofees), stil ? 0 : KOOP_HINT + (nieuwPodium ? PODIUM_TOAST : 0));
  setTimeout(() => {
    if (shopJustBoughtId !== it.id || !$('screen-dress').classList.contains('active')) return;
    koopKomtAan(it);
    if (nieuwPodium) {
      showToast('🎪 Nieuw podium', null, null, 'goud');   // de naam zegt de stem
      toastWeg(PODIUM_TOAST);
      speak(`Nieuw podium! ${nieuwPodium.name}.`);
    }
  }, stil ? 0 : DIA_AANKOMST);
  /* Als het "Nieuw!"-moment voorbij is verhuist het spulletje naar de bezit-groep
     bovenaan. Dat is een sprong, en een sprong die je niet ziet is een spulletje
     dat weg lijkt -- dus reist het beeld mee naar waar het nu staat (rekSchuift),
     en de rest van het rek schuift mee in plaats van te verspringen. */
  shopBoughtTimer = setTimeout(() => {
    shopBoughtTimer = null;
    if (shopJustBoughtId !== it.id) return;
    shopJustBoughtId = null;
    rekSchuift(() => renderShop());
    const na = $('item-grid').querySelector(`.item-card[data-item="${it.id}"]`);
    if (na && na.scrollIntoView) na.scrollIntoView({ block: 'nearest', behavior: motionOff() ? 'auto' : 'smooth' });
  }, KOOP_HERSCHIK);
}
const KOOP_HINT = 1600, KOOP_HERSCHIK = 1800;   // de hint pas als de dans (600 + PAS) uit is
const PODIUM_TOAST = 1900;                      // zo lang staat "Nieuw podium!" in beeld
/* Het tweede tel van een aankoop: de diamanten zijn bij de pop. */
function koopKomtAan(it) {
  /* paintShop en niet renderShop -- dezelfde afspraak als bij kiezen en aandoen.
     De volgorde verandert nog niet (het gekochte stuk telt tijdens zijn
     "Nieuw!"-moment nog als te koop, zie shopItems), dus er valt niets te
     herschikken; herbouwen gooide alleen het hele rek weg en tekende elk
     kaartje met zijn miniatuur opnieuw -- een lade vol SVG's, precies op het
     moment dat er een animatie moet lopen. Nu blijft het kaartje hetzelfde
     element en krijgt het er alleen zijn nieuwe staat bij. Dat is wat de pop en
     de gouden glans nodig hebben: iets om op te starten dat er al stond. */
  paintShop();
  const kaart = $('item-grid').querySelector(`.item-card[data-item="${it.id}"]`)
    || $('dress-bar').querySelector(`.mini-kaart[data-stuk="${it.id}"]`);   // gekocht uit de podiumbalk
  koopVonken(kaart);                    // een klein boeketje boven het kaartje zelf
  sndAan();                             // hetzelfde klankje als aandoen: dat is wat er nu gebeurt
  const pop = $('shop-avatar');
  // vreugdedansje in het nieuwe spulletje -- of, danst ze nog, dat pasje uit (zie dance)
  if (!pop.classList.contains('dancing') && zetPas(pop, pick(MOVES))) pasUit(pop);
  sparkle(pop);
}
/* Het rek opnieuw opbouwen zonder dat de kaartjes verspringen: elk kaartje
   onthoudt waar het stond, en glijdt na het herbouwen van daar naar zijn
   nieuwe plek (de FLIP-truc: alleen transform, dus goedkoop). Wie geen beweging
   wil, krijgt gewoon het nieuwe rek. */
const REK_SCHUIF = 320;
function rekSchuift(bouw) {
  const rek = $('item-grid');
  if (!rek || motionOff()) { bouw(); return; }
  const was = new Map();
  rek.querySelectorAll('.item-card').forEach(c => was.set(c.dataset.item, c.getBoundingClientRect()));
  bouw();
  rek.querySelectorAll('.item-card').forEach(c => {
    const r0 = was.get(c.dataset.item);
    if (!r0 || !c.animate) return;
    const r1 = c.getBoundingClientRect();
    const dx = r0.left - r1.left, dy = r0.top - r1.top;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
    c.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
      { duration: REK_SCHUIF, easing: MOTION.uit });
  });
}

/* Categorieën waar de pop ook zonder kan: een lege plek is daar een geldige stand
   (nieuwe sterren beginnen zo, en de willekeurige outfit laat ze soms leeg). */
const OPTIONELE_SPULLEN = ['mic', 'instrument', 'acc', 'pet'];

/* Het omgekeerde van equipShopItem: de plek leeg, de rest blijft. Zelfde
   nawerk -- trofeecheck, opslaan, het rek bijwerken zonder het te herbouwen. */
function unequipShopItem(cat, blijf) {
  if (!OPTIONELE_SPULLEN.includes(cat) && cat !== PODIA_CAT) return;
  const p = P();
  if (!p.equipped[cat]) return;
  const herbouw = !!shopJustBoughtId;
  clearTimeout(shopBoughtTimer);
  // van een podium afstappen = terug op Disco, het podium van iedereen
  p.equipped[cat] = cat === PODIA_CAT ? 'stage_disco' : null;
  shopJustBoughtId = null;
  shopSelectedId = blijf || null;   // uit de podiumbalk: het podium blijft gekozen
  sndClick();
  noticeReady(checkTrophies(p));
  save();
  herbouw ? renderShop() : paintShop();
  tapDance('shop-avatar');
}

/* Het naambordje: na het aandoen staat de naam van het stuk anderhalve tel boven
   in de spiegel, en waar de stem aan staat zegt hij hem ook. Alleen bij een tik op
   een kaartje -- de podiumbalk heeft de naam al in zijn eigen balk staan. Eén
   bordje tegelijk: een nieuwe tik vervangt het vorige. */
let naamBordjeTimer = null;
function naamBordje(it) {
  const spiegel = $('shop-spiegel');
  if (!spiegel) return;
  const naam = it.full || it.name;
  let b = spiegel.querySelector('.naam-bordje');
  if (!b) { b = document.createElement('div'); b.className = 'naam-bordje'; b.setAttribute('aria-hidden', 'true'); spiegel.appendChild(b); }
  b.textContent = (it.emoji ? it.emoji + ' ' : '') + naam;
  b.classList.remove('weg'); void b.offsetWidth; b.classList.add('aan');
  clearTimeout(naamBordjeTimer);
  naamBordjeTimer = setTimeout(() => b.classList.replace('aan', 'weg'), 1500);
  speak(naam);
}
function equipShopItem(id, blijf) {
  const it = item(id);
  const p = P();
  if (!bezit(p, it)) return;
  const herbouw = !!shopJustBoughtId;   // zie de kaartklik: het rek herschikt na een aankoop
  clearTimeout(shopBoughtTimer);
  p.equipped[it.cat] = it.id;
  shopJustBoughtId = null;
  /* En géén keuze meer. "Gekozen" is sinds de tik-om-aan-te-doen één ding: het
     stuk dat je bekíjkt om te kopen. Bleef het hier staan, dan droeg de pop het
     stuk dat aanstaat terwijl de lade onderaan over datzelfde stuk nog iets
     anders beweerde -- twee standen voor één kledingstuk. Behalve in de
     podiumbalk (blijf): daar is het podium gekozen, niet dit stuk. */
  shopSelectedId = blijf || null;
  sndAan();
  // een outfit-combo kan een (geheime) trofee zijn — check dus ook bij het aandoen
  const trofees = checkTrophies(p);
  noticeReady(trofees);
  save();
  // Aandoen verandert niets aan wat je bézit, dus ook niets aan de volgorde: de
  // kaartjes blijven staan waar ze staan en alleen hun stand gaat om. Het enige
  // wat zichtbaar beweegt is de pop -- en dat is precies de bedoeling.
  herbouw ? renderShop() : paintShop();
  // Een stil danspasje, geen tweede geluidje: sndAan() hierboven heeft het aandoen
  // al gezegd, en wat er te zien valt is dat zíj iets anders aanheeft.
  dance('shop-avatar');
}


