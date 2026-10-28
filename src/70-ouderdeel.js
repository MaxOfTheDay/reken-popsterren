/* ================= Nieuwe ster ================= */
/* Eén formulier, niet een reeks stappen: het zijn vier keuzes en een ouder mag ze
   allemaal tegelijk zien. De naam en het uiterlijk zijn wat een kind leuk vindt;
   de manier van spelen is de enige die een kind niet zelf kan beantwoorden en
   tegelijk de belangrijkste -- een kleuter in de rekenmodus loopt meteen vast. */
let newStar = null;
let newStarReturn = 'profile';   // waar ← en Android-terug naartoe gaan
function openNewStar(from) {
  if (Object.keys(db.profiles).length >= MAX_PROFILES) return;
  sndClick();
  newStarReturn = from || 'profile';
  // De oefeninstellingen komen uit defaultProfile zelf, zodat het concept en de
  // echte standaarden niet uit elkaar kunnen lopen: wie de openklapper dicht
  // laat, krijgt exact wat de app anders stilletjes had gekozen.
  newStar = {
    // base bewust leeg: wie je bent is de eerste vraag van het formulier en de
    // enige zonder voorkeuze. Zou hier 'meisje' staan, dan zou een ouder die
    // doorklikt nooit merken dat er iets te kiezen valt -- precies de aanname
    // waar deze versie vanaf wil.
    name: '', base: null, hair: 'hair_blond', dress: 'dress_roze',
    /* De modus ook bewust leeg, om dezelfde reden als base. Hier stond Rekenen
       al aan, en "Hoe speel je?" staat op een telefoon en een liggende tablet
       onder de Klaar-balk: een ouder kon klaar zijn zonder de vraag gezien te
       hebben, en een kleuter belandde zo in de sommen. Nu wijst Klaar hem aan
       (wijsOntbrekende), net als "wie ben je?". */
    settings: Object.assign(defaultProfile('', 'dress_roze').settings, { track: null }),
    open: false          // de openklapper begint dicht, elke keer opnieuw
  };
  renderNewStar();
  toonHub('screen-newstar');
  const el = $('screen-newstar');
  if (el) el.scrollTop = 0;
}
function closeNewStar() {
  newStar = null;
  if (newStarReturn === 'settings') { renderSettings(); toonHub('screen-settings'); settingsToTop(); }
  else goProfiles();
}
/* Haar en kleren als kleur alleen: een rondje per kleur, de naam alleen voor de
   schermlezer (aria-label) en als tooltip. Hier stonden tien pillen met een woord
   ("Blond", "Groen") dat een kind van vijf niet leest -- het kijkt naar het
   bolletje, dus is het bolletje nu de knop. En het formulier is twee rijen korter,
   zodat pop, haar en kleren op een gewone telefoon samen in beeld staan. */
function swatchChips(group, ids, sel) {
  return ids.map(id => {
    const it = item(id);
    return `<button class="chip swatch${id === sel ? ' on' : ''}" data-g="${group}" data-v="${id}"`
      + ` aria-label="${esc(it.name)}" aria-pressed="${id === sel}" title="${esc(it.name)}">`
      + `<span class="sw" style="background:${it.color}"></span></button>`;
  }).join('');
}
function renderNewStar() {
  const n = newStar;
  const s = n.settings;
  // een echt profiel als voorbeeld: precies wat de ster straks wordt, geen namaak
  /* Zolang "wie ben je?" open staat, zegt het voorbeeld ook niets: een gedimde
     figuur met een vraagteken. Hier stond meteen een meisje -- de standaardfiguur
     -- terwijl die vraag met opzet géén voorkeuze heeft (zie openNewStar). De korte
     haren van de jongen zijn als schim het minst uitgesproken; welke figuur het
     ook is, je ziet er alleen de omtrek van. */
  const wacht = !n.base;
  const preview = defaultProfile(n.name || '…', n.dress, { hair: n.hair, base: n.base || 'jongen' });
  const ok = nieuweSterKlaar();
  // Elke chip-tik bouwt dit paneel opnieuw op. Met een opengeklapt paneel eronder
  // is dat merkbaar: zonder de scrolstand vast te houden springt het formulier
  // bij élke tik naar boven (n.open doet hetzelfde voor de openklapper zelf).
  const scr = $('screen-newstar');
  const keep = scr ? scr.scrollTop : 0;
  /* De twee zwaarste keuzes ("wie ben je?" en "hoe speel je?") als twee volle
     helften met het icoon boven het woord: exact het onderdeel dat het ouderdeel
     voor dezelfde vragen gebruikt (zie half in oefenenPanelHtml). Ze stonden
     hier als gewone pillen -- dezelfde vraag, twee verschillende bedieningen. */
  const halfChip = (v, ico, label, on) => `<button class="chip gestapeld${on ? ' on' : ''}" data-v="${v}">`
    + `<span class="mc-ico" aria-hidden="true">${ico}</span><span class="mc-label">${label}</span></button>`;
  /* Het voorbeeld staat BUITEN het vel, op de tekening -- zie .newstar-preview in
     het stijlblad. Daar staat ook waarom: binnen het vel is het een icoontje op
     papier, erbuiten is het dezelfde pop op dezelfde poort als op de
     sterrenkeuze, en het vel eronder is er een schermhoogte korter van. */
  $('newstar-body').innerHTML = `<div class="settings-panel">
    <div class="newstar-preview${wacht ? ' wacht' : ''}"><div class="stage" id="newstar-stage"><div class="avatar-holder idle levend">${avatarSVG(preview, 132)}</div>${wacht ? '<span class="ns-vraag" aria-hidden="true">?</span>' : ''}</div></div>
    <div class="set-card newstar-vel">
      <div class="ns-groep">
        <div class="set-field"><label class="lbl">Wie ben je?</label>
          <div class="chip-row mode-row" id="newstar-base">${BASE_CHOICES.map(b =>
            halfChip(b.id, b.emoji, b.name, b.id === n.base)).join('')}</div></div>
        <div class="set-field"><label class="lbl" for="newstar-name">Naam</label>
          <div class="name-edit-wrap"><input type="text" id="newstar-name" value="${esc(n.name)}" maxlength="12" placeholder="Hoe heet je ster?" autocomplete="off" enterkeyhint="done"><span class="name-edit-ico" aria-hidden="true">✏️</span></div></div>
      </div>
      <div class="ns-groep">
        <div class="set-field"><label class="lbl">Haar</label>
          <div class="chip-row" id="newstar-hair">${swatchChips('hair', START_HAIR, n.hair)}</div></div>
        <div class="set-field"><label class="lbl">Kleren</label>
          <div class="chip-row" id="newstar-dress">${swatchChips('dress', START_DRESS, n.dress)}</div></div>
      </div>
      <div class="ns-groep">
        <!-- Tot hier kiest het kind; vanaf hier de ouder. Dezelfde woorden als
             bovenaan het blad "als app". Geen kaart en geen uitleg: één lijntje. -->
        <div class="ns-ouder">Voor papa of mama</div>
        <div class="set-field"><label class="lbl">Hoe speel je?</label>
          <div class="chip-row mode-row" id="newstar-track">
            ${halfChip('count', '🧸', 'Leren tellen', s.track === 'count')}
            ${halfChip('math', '🧮', 'Rekenen', s.track === 'math')}
          </div>
          ${s.track ? `<div class="note">${s.track === 'count'
            ? 'Nog niet lezen: tellen met plaatjes.'
            : 'Met cijfers en sommen.'}</div>` : ''}</div>
        <!-- De oefening hangt van de modus af, dus pas zichtbaar als die gekozen is. -->
        ${s.track ? `<details class="set-reveal" id="newstar-oefen"${n.open ? ' open' : ''}>
          <summary>
            <span class="sr-ico" aria-hidden="true">⚙️</span>
            <span class="sr-text"><span class="sr-title">Oefening</span>
              <span class="sr-val">${oefenSamenvatting(s)}</span></span>
          </summary>
          <div class="set-reveal-body">
            ${s.track === 'math' ? `<div class="reveal-group">${oeLbl('Wat oefent je ster?')}${themaTegels(s, 'ns-')}</div>` : ''}
            ${oefenGroups(s, 'ns-').map(g => `<div class="reveal-group">${oeLbl(g.kop)}${g.html}</div>`).join('')}
            <div class="note" style="margin-top:14px">Later te wijzigen bij 👨‍👩‍👧 Voor ouders.</div>
          </div>
        </details>` : ''}
      </div>
      <div class="newstar-voet">
        <button class="btn newstar-go" id="newstar-go" aria-disabled="${ok ? 'false' : 'true'}">🌟 Klaar!</button>
      </div>
    </div>
  </div>`;
  applyStage($('newstar-stage'), preview);
  // bindChips en niet chip: de sjabloon hierboven gebruikt de globale chip(v, label, on)
  // uit het ouderdeel, en een gelijknamige const hier zou die in dit hele bereik
  // afdekken (ReferenceError, nog vóór de eerste regel van de sjabloon).
  const bindChips = (id, fn) => { const el = $(id); if (el) el.querySelectorAll('.chip').forEach(c => c.onclick = () => { sndClick(); fn(c.dataset.v); renderNewStar(); }); };
  bindChips('newstar-base',  v => newStar.base = v);
  bindChips('newstar-hair',  v => newStar.hair = v);
  bindChips('newstar-dress', v => newStar.dress = v);
  bindChips('newstar-track', v => {
    s.track = v;
    // De standaardlengte verschilt per modus (kleuters krijgen een kortere ronde).
    // Alleen bijstellen zolang een ouder er zelf niet aan gezeten heeft -- anders
    // zet even-de-andere-modus-bekijken haar keuze stilletjes terug.
    if (!newStar.perLevelSet) s.perLevel = (v === 'count' ? COUNT_OPTS.perLevel : DEFAULT_PERLEVEL);
  });
  // dezelfde velden als in het ouderdeel; er is alleen nog niets om op te slaan
  bindOefenChips(s, null, 'ns-', id => {
    if (id === 'set-perlevel') newStar.perLevelSet = true;
    sndClick();                 // net als de basis-, haar-, kleren- en modus-chips hierboven
    renderNewStar();
  });
  const dt = $('newstar-oefen');
  if (dt) dt.ontoggle = () => { newStar.open = dt.open; if (dt.open) sndClick(); };
  // alleen de waarde bijhouden, niet hertekenen: hertekenen midden in het typen
  // zou het veld (en de cursor) opnieuw opbouwen
  const nm = $('newstar-name');
  nm.oninput = e => {
    newStar.name = e.target.value;
    merkKlaarKnop();
  };
  /* Enter is op een telefoon de enige knop die het toetsenbord zelf aanbiedt, en
     hij deed niets: het veld staat niet in een <form>, dus de toets viel in het
     niets terwijl de Klaar-knop onder het opgeklapte toetsenbord verstopt zat.

     Nu betekent Enter wat hij belooft: klaar met dit veld. Het toetsenbord gaat
     weg (blur), en is het formulier af, dan is dat meteen dezelfde tik als op
     Klaar. Is het nog niet af -- de vraag "wie ben je?" heeft geen voorkeuze --
     dan blijft het formulier gewoon staan, nu wel zichtbaar. Er wordt niets
     extra's gevalideerd: createStar houdt precies dezelfde regels aan. */
  nm.onkeydown = e => {
    if (e.key !== 'Enter' || e.isComposing) return;
    e.preventDefault();                       // nooit een regeleinde of een dwaal-submit
    nm.blur();
    /* Onvoorwaardelijk naar createStar: die weigert zelf als er nog iets ontbreekt
       (dezelfde regel als altijd) en wijst dan aan wát. Hiervoor stopte Enter bij
       een uitgeschakelde knop en gebeurde er niets -- het toetsenbord ging weg en
       daar bleef het bij. */
    createStar();
  };
  $('newstar-go').onclick = createStar;
  if (scr) { scr.scrollTop = keep; requestAnimationFrame(() => { scr.scrollTop = keep; }); }
}
/* Staat de Klaar-knop op "kan"? Eén bron, gelezen door de knop zelf en door het
   naamveld terwijl er getypt wordt. */
function nieuweSterKlaar() { return !!(newStar && newStar.name.trim() && newStar.base && newStar.settings.track); }
function merkKlaarKnop() {
  const go = $('newstar-go');
  if (go) go.setAttribute('aria-disabled', nieuweSterKlaar() ? 'false' : 'true');
}
/* Wat er nog mist, en waar het antwoord hoort te komen. Dit is het enige dat een
   geweigerde Klaar-tik doet: het veld dat aan de beurt is in beeld zetten, er twee
   keer zacht omheen kloppen in het paars van "kies". (Er stond ook nog een regel
   bovenaan -- "Kies eerst wie je bent 👆" -- maar die zei hetzelfde als de ring.)

   Waarom dit er is: "Wie ben je?" heeft met opzet geen voorkeuze (zie openNewStar),
   en dus is een net ingevuld formulier regelmatig nog niet af. De grijze knop zei
   dát wel, maar niet wát -- en tikken erop gaf helemaal niets terug.

   Bewust géén foutstijl: geen rood, geen kruisje, geen melding die blijft staan.
   Er is niets fout gegaan; er is alleen nog niet getikt. En bewust geen focus op
   het naamveld: na Enter is het toetsenbord net weg, en dat meteen weer opengooien
   is precies wat het formulier onhandelbaar maakte. */
function wijsOntbrekende() {
  if (!newStar) return;
  // van boven naar onder: wie ben je, de naam, en dan hoe je speelt
  const chips = id => [...($(id) || { querySelectorAll: () => [] }).querySelectorAll('.chip')];
  const doelen = !newStar.base ? chips('newstar-base')
    : !newStar.name.trim() ? [$('newstar-name')].filter(Boolean)
    : chips('newstar-track');
  if (!doelen.length) return;
  sndClick();
  const anker = doelen[0];
  if (anker.scrollIntoView) anker.scrollIntoView({ block: 'center', behavior: motionOff() ? 'auto' : 'smooth' });
  doelen.forEach(el => {
    el.classList.remove('vraagt');
    void el.offsetWidth;                 // anders herstart de animatie niet
    el.classList.add('vraagt');
  });
  setTimeout(() => doelen.forEach(el => el.classList.remove('vraagt')), 2400);
  /* Geen melding meer: de paarse ring om wat er nog gekozen moet worden zegt het
     al, op de plek zelf. Paars is "kies", en een zin erbovenop was dubbel. */
}
function createStar() {
  /* Twee keer Klaar is één ster. Enter én de knop komen hier allebei uit, en op
     een telefoon liggen die twee tikken vlak na elkaar: zonder deze regel maakte
     de tweede tik een tweede ster (of, sinds de naam moet kloppen, een melding
     dat je eigen naam al bezet is). newStar wordt onderaan losgelaten, dus dit is
     meteen ook de grendel op alles wat er daarna nog binnenkomt. */
  if (!newStar) return;
  // pas hier valideren, niet tijdens het typen: een veld dat zichzelf corrigeert
  // terwijl je bezig bent is niet te gebruiken (zie de opmerking bij set-name)
  const name = newStar.name.trim().replace(/\s+/g, ' ').slice(0, 12);
  if (!name || !newStar.base || !newStar.settings.track) return wijsOntbrekende();
  const taken = Object.values(db.profiles).some(p => p.name.toLowerCase() === name.toLowerCase());
  if (taken) {
    showToast('⚠️ Die naam bestaat al', null, null, null, 2600);
    return;
  }
  const key = nextProfileKey();
  // vóór het toevoegen uitrekenen: anders telt de nieuwe ster (nog zonder order)
  // zichzelf mee als de 90-bak en begint iedereen op 91
  const order = nextOrder();
  // defaultProfile neemt élke instelling aan (zie de opmerking daar), dus het
  // concept gaat er in één keer in -- aangeraakt of niet.
  db.profiles[key] = defaultProfile(name, newStar.dress, { ...newStar.settings, hair: newStar.hair, base: newStar.base });
  db.profiles[key].order = order;   // expliciet: assignProfileOrder gaat op naam
  save();
  newStar = null;
  /* Een ster maken ís beginnen. Hiervoor kwam een kind dat net haar pop had
     gekozen terug op de sterrenkeuze, waar ze zichzelf tussen haar broers en
     zussen moest opzoeken en nóg een keer moest tikken -- een bevestigingsscherm
     met kaarten erop. Nu stapt ze meteen haar eerste wereld in, langs precies
     dezelfde weg als elke andere tik op een tegel (selectProfile -> goMap, en dus
     de grens uit continueWorld: voor een verse ster is dat wereld 1, halte 1).

     Uit het ouderdeel blijft het wél een terugkeer: daar is een ster maken iets
     wat een ouder doet terwijl er misschien een ánder kind aan het spelen is, en
     dan is meteen wegspringen naar de kaart van de nieuwe ster juist verkeerd.
     Het onderdeel blijft staan: de "+" staat boven alle drie de tabbladen, dus
     wie hem vanuit Oefenen indrukte, ziet nu meteen hoe de nieuwe ster oefent. */
  if (newStarReturn === 'settings') { setKey = key; setTab = 'voortgang'; renderSettings(); toonHub('screen-settings'); settingsToTop(); }
  else { kiesBezig = false; selectProfile(key); }
  /* Alleen dat ze er staat. Hier stond eronder "Jouw eerste show begint!", maar er
     begint niets tot ze zelf op halte 1 tikt -- en die gouden halte pulst al en de
     pop zwaait al. Die tik is haar eerste eigen stap; de kaart hoeft hem niet voor
     te zeggen. */
  showToast(`👋 Welkom, ${esc(name)}`, null, null, 'blauw');
}

/* ================= Instellingen ================= */
/* Het ouderdeel: wit papier, rustige letters, geen feest. Twee niveaus:

     HET OVERZICHT  -- waar ⚙️ opent. Elke ster als één rij (portret, naam, hoe
                       het gaat), "Nieuwe ster", en daaronder wat voor álle
                       sterren geldt: geluid, als app, de back-up.
     ÉÉN STER       -- tik op een rij. ← gaat terug naar het overzicht, en de
                       drie onderdelen (Voortgang, Oefeningen, ✏️) gaan alleen
                       over haar.

   Hiervoor was er alleen het tweede niveau, met een rij sterren in de kop en
   "⋯" als derde tabblad. Onder ⋯ stonden dan haar naam en het wissen náást het
   geluid en de back-up, en met haar ster gemarkeerd erboven las alles daar als
   "van Lotte" -- ook het amber stipje van de back-up. Nu staat wat over één kind
   gaat bij dat kind, en wat over de app gaat op een pagina zonder kind erboven.

   Deze kop stond eerder boven "Nieuwe ster" hierboven, en dat was geen kleine
   slordigheid: de README zegt dat je op sectienaam zoekt om ergens te komen, dus
   wie "= Instellingen" zocht kwam tweehonderd regels te vroeg uit, midden in een
   formulier dat over iets anders gaat. Een inhoudsopgave die je op de verkeerde
   plek afzet is erger dan geen. */
// null = het overzicht; anders de sleutel van de ster waar je naar kijkt.
let setKey = null;
// 'voortgang' (lezen) | 'oefenen' (hoe dit kind oefent). Wie ze is: zie openWieBlad.
let setTab = 'voortgang';
function openSettings() {
  // Altijd het overzicht: daar staat elk kind met hoe het gaat, dus wie even wil
  // kijken heeft aan één scherm genoeg. Nul sterren mag ook: dan is er alleen de
  // lege pagina, want dáár zit "Back-up terugzetten" -- de reden dat een nieuw
  // toestel hier komt.
  setKey = null;
  setTab = 'voortgang';
  renderSettings();
  toonHub('screen-settings');
  // één keer aanhangen (een tweede toewijzing aan onscroll vervángt de vorige,
  // dus er kan er nooit meer dan één staan -- zelfde patroon als de kast)
  $('screen-settings').onscroll = ouderScroll;
  settingsToTop();
}
function closeSettings() {
  save();
  goProfiles();
}
/* ← linksboven, en de terugknop van Android (zie backTarget): van één ster
   terug naar het overzicht, en van het overzicht het ouderdeel uit. */
function ouderTerug() {
  if (!setKey || !db.profiles[setKey]) return closeSettings();
  setKey = null;
  renderSettings();
  settingsToTop();
}
function openSter(key) {
  sndClick();
  setKey = key;
  setTab = 'voortgang';
  renderSettings();
  settingsToTop();
}
/* Tabblad "Voortgang" -- het ouderrapport, alleen-lezen.

   Een ouder komt hier met drie vragen: waar staat ze, past het, en moet ik iets
   doen? Die drie horen bij één plek -- de stap waar ze nu is -- en staan dus
   in één kaart, het leerpad:

     LEERPAD      -- wat al kan (één rij ✓), de stap van nu met hoe ver ze is,
                     wat er nog komt. Rechtsboven één label: past het niveau
                     (vgStand). Onder haar stap één regel, alleen als er iets
                     gebeurt: het spel schuift zelf door, het spel maakt het
                     lichter, of een knop voor de ouder.
     EXTRA OEFENEN -- de sommen die nog lastig zijn. Alleen bij rekenen, en
                     alleen als die er zijn.
     MEER CIJFERS -- dicht: de tellers sinds het begin en de oogst.

   Hier stond eerst een aparte kaart "Hoe gaat het met …?" met een stoplicht,
   een rij bolletjes en tellers sinds het begin. Die beantwoordde een andere
   vraag dan zijn kop (de uitdaging, niet het kind), geel betekende goed nieuws,
   en de bolletjes en de tellers telden over twee verschillende tijden. Valkuil:
   zet in het label niets wat niet uit uitdagingStand komt -- de tellers sinds
   het begin horen in Meer cijfers, anders spreken ze het label tegen. */
/* Het label: één woord over het niveau, en de kleur zegt wie er aan zet is.
   Groen: niets te doen. Geel: het gaat vlot (het spel schuift door, of de ouder
   kan een stap zetten). Oranje: het spel helpt nu. Grijs: nog te vroeg. */
const STAND_TEKST = {
  goed:   { ico: '✓', kop: 'Past goed' },
  vlot:   { ico: '↑', kop: 'Gaat vlot' },
  pittig: { ico: '↓', kop: 'Even pittig' },
  meer:   { ico: '★', kop: 'Klaar voor meer' },
  stap:   { ico: '•', kop: 'Nieuwe stap' },
  nieuw:  { ico: '•', kop: 'Net begonnen' },
};
/* De stand van het label. Een tip (grensTip, telTip) gaat voor: dan is er iets
   voor de ouder te doen, en dat is het eerste wat die moet zien. Anders de
   uitdaging op deze stap; is die er nog niet, dan "nieuwe stap" (ze speelde al,
   maar nog te weinig op deze stap) of "net begonnen". */
function vgStand(p) {
  if (p.settings.track === 'count' ? telTip(p) : grensTip(p)) return 'meer';
  const u = uitdagingStand(p);
  /* Zelf kiezen schuift niet zelf door en kent geen tip: gaat het vlot, dan is
     dát het moment voor de ouder om iets bij te vinken ("Klaar voor meer", en
     Aanpassen wordt een volle knop -- zie zelfGekozenHtml). Anders bleef een
     kind dat het allang kon eindeloos hetzelfde spelen. */
  if (u && zelfGekozen(p.settings)) return u.stand === 'vlot' ? 'meer' : u.stand;
  if (u) return u.stand;
  return p.stap ? 'stap' : 'nieuw';
}
function vgLabel(stand) {
  const t = STAND_TEKST[stand];
  return `<span class="vg-tag ${stand}" data-stand="${stand}"><b aria-hidden="true">${t.ico}</b>${t.kop}</span>`;
}
// De notitie over de stem staat los boven het leerpad, en alleen als er iets mis is.
function stemKaartHtml(p) {
  const stem = stemAan(p) ? stemNotitie(p.name) : '';
  return stem ? `<div class="set-card vg-kaart"><div class="note stem-notitie">${stem}${!db.sound
    ? '<button class="btn small purple stem-aan" id="stem-aan" type="button">🔊 Zet aan</button>' : ''}</div></div>` : '';
}
/* Het leerpad van rekenen staat in 55-vragen (LEERPAD, padRijen): Voortgang en
   Oefeningen tekenen allebei die rijen, met naam en voorbeeld. OVERSLAAN IS GEEN
   WEGHALEN: zoek het getal en drie getallen kan de ouder uitvinken (keuze: de
   naam van de vlag); zo'n rij blijft staan, doorgestreept, en houdt zijn nummer.
   Eerst viel hij weg, en dan schoof alles erachter een nummer op. */
/* EÉN RIJ VAN DE LADDER, voor Voortgang én Oefenen. Bolletje, naam, en rechts
   een voorbeeld in een vaste kolom. Met een v is het een knop (.chip met data-v,
   daar hangt bindOefenChips aan); zonder is het een rij om te lezen.

   Hiervoor stond hetzelfde leerpad twee keer in twee talen: Voortgang had een
   pad met ringen, een "nu"-label en voorbeelden in grijze pilletjes, Oefenen de
   ladder. Een ouder die van het ene tabblad naar het andere ging las dezelfde
   stappen twee keer, en moest de tweede keer opnieuw uitzoeken wat wat was. */
function flRij(klas, n, naam, vb, v, lijnen) {
  const binnen = `<span class="fl-n">${n}</span><span class="fl-naam">${naam}</span><span class="fl-vb">${vb || ''}</span>${lijnen || ''}`;
  return v == null
    ? `<div class="fl-rij${klas}"${/\bhier\b/.test(klas) ? ' aria-current="step"' : ''}>${binnen}</div>`
    : `<button class="chip fl-rij${klas}" data-v="${v}">${binnen}</button>`;
}
// de pop van het kind in het bolletje van de stap waar ze nu is
const flAva = p => `<span class="fl-ava">${avatarSVG(p, 26)}</span>`;
// het lege vakje van "zoek het getal", als vakje en niet als teken
const flVb = vb => (vb || '').replace('▢', '<i class="fl-vak"></i>');
/* Het leerpad. De klassen niveau-blok en niveau-bezig zijn gebleven: dat zijn
   "het blok over het niveau" en "de regel waar het kind nú is", en de tests
   lezen ze zo.

   Er staat geen percentage of balk in, en dat blijft zo. FASE 5D.1: hier stond
   "Niveau-inschatting -- 50%" met een half gevulde balk, en dat is een gevecht
   dat geen uitleg eronder kan winnen: een getal van honderd met een balk ís een
   rapportcijfer. Een ouder las "mijn kind zit op de helft", en dat betekent
   p.perf niet -- het is een meelopende maat waarmee het spel de vragen
   makkelijker of moeilijker maakt, en hij zweeft rond het midden omdat hij
   dáárop stuurt. p.perf stuurt nog precies zoals hiervoor; hij wordt alleen
   niet getoond. Wat wél onder haar stap staat is hoe ver ze op die stap is, in
   de maat waarmee het spel zelf doorschuift: bij rekenen de shows met drie
   sterren op rij (padNa), bij tellen de stapjes binnen een fase
   (countTrack.rung).

   Dezelfde rijen als de ladder op Oefeningen (flRij), maar om te lezen: wat al
   kan is één rij met een ✓, met de namen van die ladder (de eerste en de
   laatste, "Tot 10 … Drie getallen"); dan de stap van nu met haar pop in het
   bolletje, dan wat er komt. Rechtsboven het label (vgStand), onderaan
   "Aanpassen ›" naar dezelfde ladder op Oefeningen. Een tip staat onder haar
   stap, één regel met de knop ernaast: daar is wat hij verandert. */
/* DE KAARTKOP. Elke kaart op Voortgang en Oefeningen begint met deze ene kop:
   paars, even groot, met rechts eventueel iets kleins (het label op het
   leerpad). Daaronder heten de velden van een kaart met het kleine grijze
   label (oeLbl). Hier stonden drie soorten kop naast elkaar -- groot paars op
   Voortgang, klein paars op Meer cijfers, klein grijs op Oefeningen -- en
   dezelfde ladder kreeg op het ene tabblad een titel en op het andere een
   veldlabel. ouder.test.js zaak Q houdt het bij één. */
const kaartKop = (titel, rechts) => `<div class="kaart-kop"><h2>${titel}</h2>${rechts || ''}</div>`;
// het kleine grijze label boven een veld in een kaart (zie kaartKop)
const oeLbl = (tekst, teken) => `<div class="oe-lbl">${teken ? `<span class="oe-teken">${teken}</span>` : ''}${tekst}</div>`;
const klaarNamen = namen => namen.length > 2 ? `${namen[0]} … ${namen[namen.length - 1]}` : namen.join(', ');
/* Waar ze nu staat, en hoe ver ze op die stap is: { naam, meter, tekst }. De
   meter is in de maat waarmee het spel zelf doorschuift -- bij rekenen de shows
   met drie sterren op rij (padNa, bolletjes), bij tellen de stapjes binnen een
   fase (countTrack.rung, streepjes). Voortgang zet hem onder haar stap op het
   leerpad, het overzicht naast haar naam: één bron, zodat die twee nooit iets
   anders zeggen. */
function stapNu(p) {
  const s = p.settings;
  if (s.track === 'count') {
    const st = countLiveStage(p), top = countTopRung(st);
    const rung = Math.min(top, Math.max(0, (p.countTrack && p.countTrack.rung) || 0));
    return { naam: COUNT_STAGE_LABELS[st], vb: COUNT_STAGE_VB[st],
      meter: `<span class="vg-rungs" aria-hidden="true">${Array.from({ length: top + 1 }, (_, i) => `<i class="${i <= rung ? 'aan' : ''}"></i>`).join('')}</span>`,
      tekst: `stapje ${rung + 1} van ${top + 1}`, waar: `Fase ${st} van ${countMaxStage(s)}` };
  }
  if (!themaAan(s, 'rekenen')) return ladderStap(p, Object.keys(LADDERS).find(k => themaAan(s, k)));
  const nuId = padNu(p);
  if (nuId === 'alles') return { naam: 'Alles door elkaar', vb: '', meter: '', tekst: '', waar: '' };
  const speel = padRijen(s).rijen.filter(r => !r.uit);
  const nu = speel.find(r => r.id === nuId);
  const pad = p.pad && p.pad.rij === nuId ? p.pad : { shows: 0, goed: 0 };
  const goed = Math.min(PAD_GOED, pad.goed || 0), nog = PAD_GOED - goed;
  return { naam: nu.naam, vb: nu.vb,
    meter: `<span class="vg-bol" aria-hidden="true">${Array.from({ length: PAD_GOED }, (_, i) => `<i class="${i < goed ? 'aan' : ''}"></i>`).join('')}</span>`,
    tekst: nog > 0 ? `nog ${nog}× ⭐⭐⭐` : 'nog 1 show', waar: `Stap ${speel.indexOf(nu) + 1} van ${speel.length}` };
}
// Hetzelfde voor de ladder van tafels of geld (zie LADDERS): waar ze staat en hoe ver.
function ladderStap(p, k) {
  const L = LADDERS[k], nuId = ladderNu(p, k);
  if (nuId === 'alles') return { naam: L.eind, vb: '', meter: '', tekst: '', waar: '' };
  const { rijen, lo, hi } = ladderRijen(p.settings, k);
  const nu = rijen[L.idx[nuId]];
  const t = p[L.stand] && p[L.stand].rij === nuId ? p[L.stand] : { goed: 0 };
  const goed = Math.min(PAD_GOED, t.goed || 0), nog = PAD_GOED - goed;
  return { naam: nu.naam, vb: nu.vb,
    meter: `<span class="vg-bol" aria-hidden="true">${Array.from({ length: PAD_GOED }, (_, i) => `<i class="${i < goed ? 'aan' : ''}"></i>`).join('')}</span>`,
    tekst: nog > 0 ? `nog ${nog}× ⭐⭐⭐` : 'nog 1 show', waar: `Stap ${L.idx[nuId] - lo + 1} van ${hi - lo + 1}` };
}
/* Wat Zelf kiezen aangevinkt heeft, als rijen om te lezen: [{ naam, vb }]. Bij
   rekenen de + − rijen en dan × en ÷ uit de kaart Sommen, met de tafels in de
   naam; bij tellen de fases. Voortgang en het overzicht lezen allebei dit. */
function zelfRijen(s) {
  if (s.track === 'count') return kiesFasen(s).map(v => ({ naam: COUNT_STAGE_LABELS[v], vb: COUNT_STAGE_VB[v] }));
  const rijen = kiesGekozen(s).map(r => ({ naam: r.naam, vb: r.vb }));
  const t = s.tables.slice().sort((a, b) => a - b), b = t[t.length - 1], a = b === 7 ? 8 : 7;
  if (s.ops.includes('x')) rijen.push({ naam: `Tafels van ${t.join(', ')}`, vb: `${a} × ${b}` });
  if (s.ops.includes(':')) rijen.push({ naam: `Delen door ${t.join(', ')}`, vb: `${a * b} : ${b}` });
  THEMA_ERBIJ.filter(k => themaAan(s, k)).forEach(k => rijenInst({ settings: s }, k).rijen.forEach(r => rijen.push({ naam: r.naam, vb: LADDERS[k].vb(r) })));
  return rijen;
}
/* Geld of de klok bij Zelf kiezen met nog niets aangevinkt: dan staat de rij
   waar ze op de ladder is al aan (of de eerste, zonder ster), zoals kiesStart
   bij rekenen -- de lijst staat nooit leeg terwijl er wél iets gespeeld wordt. */
function rijenKiesStart(s, p) {
  if (!zelfGekozen(s)) return;
  THEMA_ERBIJ.filter(k => themaAan(s, k) && !(s[LADDERS[k].kies] || []).length).forEach(k => {
    const L = LADDERS[k], nu = p ? ladderNu(p, k) : L.pad[0].id;
    s[L.kies] = [nu === 'alles' ? L.pad[ladderRijen(s, k).hi].id : nu];
  });
}
function leerpadHtml(p) {
  const s = p.settings;
  if (zelfGekozen(s)) return zelfGekozenHtml(p);
  if (s.track !== 'count') return (themaAan(s, 'rekenen') ? rekenLadderHtml(p) : '')
    + Object.keys(LADDERS).filter(k => themaAan(s, k)).map(k => themaLadderHtml(p, k)).join('');
  return rekenLadderHtml(p);
}
function rekenLadderHtml(p) {
  const s = p.settings;
  const stand = vgStand(p);
  const rijen = [];
  let kop, onder = '', verder;   // onder: de regel onder haar stap; verder: schuift het pad nog zelf door?
  if (s.track === 'count') {
    const st = countLiveStage(p), hi = countMaxStage(s);
    kop = 'tellen';
    verder = st < hi;
    if (st > 1) rijen.push(flRij(' klaar', '✓', klaarNamen(COUNT_STAGE_LABELS.slice(1, st))));
    const nu = stapNu(p);
    rijen.push(flRij(' hier niveau-bezig', flAva(p), `${nu.naam}<small class="vg-hoever">${nu.meter}${nu.tekst}</small>`, nu.vb));
    // de twee volgende fases, en de laatste die de ouder toelaat; wat ertussen zit is één rij "⋮"
    for (let v = st + 1; v <= Math.min(hi, st + 2); v++) rijen.push(flRij(' later', v, COUNT_STAGE_LABELS[v], COUNT_STAGE_VB[v]));
    const tussen = hi - st - 3;
    if (tussen > 0) rijen.push(flRij(' later vg-gat', '⋮', `nog ${tussen} ${mv(tussen, 'fase', 'fases')}`));
    if (hi > st + 2) rijen.push(flRij(' later', hi, COUNT_STAGE_LABELS[hi], COUNT_STAGE_VB[hi]));
    // dezelfde "tot"-lijn als op Oefeningen; zonder grens is rekenen de volgende stap
    rijen.push(hi < COUNT_STAGE_MAX ? '<div class="fl-lijn">tot</div>' : flRij(' later', '🧮', 'Daarna rekenen'));
    const tt = telTip(p);
    if (tt) onder = vgOnder({ fase: 'Volgende fase?', qmax: 'Grotere aantallen?', rekenen: 'Klaar om te rekenen?' }[tt.soort],
      `<button class="btn small purple" id="tel-tip-ja" type="button">${tt.knop}</button>`);
  } else {
    // dezelfde tekens als de tegels op Oefeningen
    const glyph = { '+': '+', '-': '−' };
    kop = `${['+', '-'].filter(o => s.ops.includes(o)).map(o => glyph[o]).join(' ')} tot ${s.max}`;
    const alle = padRijen(s).rijen;
    const nuId = padNu(p);
    verder = nuId !== 'alles';
    const nr = nuId === 'alles' ? alle.length : alle.findIndex(r => r.id === nuId);   // = hoeveel rijen er al achter liggen
    if (nr) rijen.push(flRij(' klaar', '✓', klaarNamen(alle.slice(0, nr).map(r => r.naam))));
    if (nuId === 'alles') {
      rijen.push(flRij(' hier niveau-bezig', flAva(p), 'Alles door elkaar', ''));
    } else {
      const nu = stapNu(p);
      rijen.push(flRij(' hier niveau-bezig', flAva(p), `${nu.naam}<small class="vg-hoever">${nu.meter}${nu.tekst}</small>`, flVb(nu.vb)));
      alle.slice(nr + 1).forEach((r, i) => rijen.push(flRij(` later${r.uit ? ' overgeslagen' : ''}`, nr + 2 + i, r.naam, flVb(r.vb))));
      rijen.push(flRij(' later', '∞', 'Alles door elkaar'));
    }
    const grens = grensTip(p);
    if (grens) {
      const [tekst, knop] = grens.soort === 'grens' ? ['Grotere getallen?', `Tot ${grens.naar}`]
        : grens.naar === 'mix' ? ['Af en toe zelf typen?', 'Afwisselen'] : ['Altijd zelf typen?', 'Zelf typen'];
      onder = vgOnder(tekst, `<button class="btn small purple" id="grens-tip-ja" type="button" data-soort="${grens.soort}" data-v="${grens.naar}">${knop}</button>`);
    }
  }
  // zonder tip: alleen een regel als het spel zelf iets doet
  if (!onder && stand === 'pittig') onder = vgOnder('Het spel maakt het nu wat makkelijker.');
  if (!onder && stand === 'vlot' && verder) onder = vgOnder('Gaat zelf door naar de volgende stap.');
  // de regel hoort bij haar stap: direct onder die rij, in hetzelfde vlak
  if (onder) {
    const i = rijen.findIndex(r => r.includes('niveau-bezig'));
    rijen[i] = rijen[i].replace('fl-rij hier niveau-bezig', 'fl-rij hier niveau-bezig met-onder') + onder;
  }
  return `<div class="set-card vg-kaart niveau-blok">
    ${kaartKop(`Leerpad <span>· ${kop}</span>`, vgLabel(stand))}
    <div class="fase-ladder vg-ladder">${rijen.join('')}</div>
    <div class="vg-voet"><button class="vg-aanpas" id="leerpad-aanpas" type="button">Aanpassen ›</button></div>
  </div>`;
}
/* De ladder van tafels of geld op Voortgang: dezelfde vorm als die van rekenen -- wat ze
   haalde in één ✓-rij, haar rij met de pop en hoe ver, de rest grijs eronder.
   Tips om een lijn te verzetten zijn er hier niet: de ladder is kort, en
   "vanaf" en "tot" staan één tik verder, op Oefeningen. */
function themaLadderHtml(p, k) {
  const s = p.settings, L = LADDERS[k];
  const { rijen, lo, hi } = ladderRijen(s, k);
  const speel = rijen.slice(lo, hi + 1);
  const nuId = ladderNu(p, k);
  const nr = nuId === 'alles' ? speel.length : speel.findIndex(r => r.id === nuId);
  const uit = [];
  if (nr) uit.push(flRij(' klaar', '✓', klaarNamen(speel.slice(0, nr).map(r => r.naam))));
  if (nuId === 'alles') uit.push(flRij(' hier niveau-bezig', flAva(p), L.eind, ''));
  else {
    const nu = ladderStap(p, k);
    uit.push(flRij(' hier niveau-bezig', flAva(p), `${nu.naam}<small class="vg-hoever">${nu.meter}${nu.tekst}</small>`, flVb(nu.vb)));
    speel.slice(nr + 1).forEach((r, i) => uit.push(flRij(' later', nr + 2 + i, r.naam, flVb(r.vb))));
    uit.push(flRij(' later', '∞', L.eind));
  }
  const kop = k === 'tafels' ? `Tafels <span>· ${['x', ':'].filter(o => s.ops.includes(o)).map(o => ({ x: '×', ':': '÷' })[o]).join(' ')}</span>` : THEMA[k].naam;
  return `<div class="set-card vg-kaart niveau-blok">
    ${kaartKop(kop)}
    <div class="fase-ladder vg-ladder">${uit.join('')}</div>
    <div class="vg-voet"><button class="vg-aanpas" id="${k === 'tafels' ? 'tafel' : k}-aanpas" type="button">Aanpassen ›</button></div>
  </div>`;
}
/* Voortgang bij Zelf kiezen: geen pad om op te staan, dus ook geen "hier" en
   geen ✓ voor wat al kan -- alleen wat er aangevinkt staat, in dezelfde rijen
   als de lijst op Oefeningen (het vinkje in het bolletje), met het label
   erboven. "Klaar voor meer" maakt Aanpassen een volle knop: dat is hier de
   enige manier om verder te komen (zie vgStand). */
function zelfGekozenHtml(p) {
  const stand = vgStand(p);
  const rijen = zelfRijen(p.settings).map(r => flRij(' kies aan', '✓', r.naam, flVb(r.vb)));
  const onder = stand === 'pittig' ? vgOnder('Het spel maakt het nu wat makkelijker.') : '';
  return `<div class="set-card vg-kaart niveau-blok zelf-blok">
    ${kaartKop('Zelf gekozen', vgLabel(stand))}
    <div class="fase-ladder vg-ladder vg-zelf">${rijen.join('')}</div>${onder}
    <div class="vg-voet"><button class="vg-aanpas${stand === 'meer' ? ' vol' : ''}" id="leerpad-aanpas" type="button">Aanpassen ›</button></div>
  </div>`;
}
// De regel onder haar stap: wat er nu gebeurt, met hooguit één knop.
const vgOnder = (tekst, knop) => `<div class="vg-onder"${knop ? ' id="grens-tip"' : ''}><span>${tekst}</span>${knop || ''}</div>`;
/* De sommen waar het spel nu extra op oefent -- het nuttigste blok van het
   oude scherm, dat helemaal onderaan stond. Alleen bij rekenen: de telmodus
   kent geen lijst met losse lastige vragen, die stuurt per fase. */
function oefentExtraHtml(p) {
  if (p.settings.track === 'count') return '';
  // p.weak wordt op sjabloon gesleuteld ("7 × 8 = @"), met @ als de lege plek.
  // Die plaatshouder is intern; een ouder hoort gewoon de som te zien.
  const weak = Object.entries(p.weak).sort((a, b) => b[1].w - a[1].w).slice(0, 8)
    .map(([tmpl, e]) => tmpl.replace('@', e.ans == null ? '?' : e.ans));
  // Geen lastige sommen: dan geen kaart. "Geen lastige sommen op dit moment"
  // was een hele kaart om te zeggen dat er niets te zeggen is.
  if (!weak.length) return '';
  // onderhoud zichtbaar maken: geleerde sommen komen later nog eens terug,
  // zodat we merken of het blijft zitten (i.p.v. ze definitief te vergeten)
  const nLearned = Object.keys(p.learned || {}).length;
  return `<div class="set-card vg-kaart">
    ${kaartKop('Oefent extra op')}
    ${vlotHtml(p)}
    <div class="practice-chips">${weak.map(t => `<span class="practice-chip">${t}</span>`).join('')}</div>
    ${nLearned ? `<div class="note vg-noot">🧠 ${nLearned} geleerde ${mv(nLearned, 'som komt', 'sommen komen')} later terug.</div>` : ''}
  </div>`;
}
/* Vlotheid, per soort som: komt een goed antwoord er zó uit, of wordt het
   uitgerekend? Een woord per teken ("+ vlot · − rekent nog") en geen
   percentage met een balk: dat las als een rapportcijfer, net als het oude
   niveaugetal (FASE 5D.1). Pas na tien sommen van die soort, anders zegt het
   niets. Hier stond één zin over alle soorten samen, en dan zag je niet dat
   plus vlot ging en min niet. */
function vlotHtml(p) {
  const glyph = { '+': '+', '-': '−', 'x': '×', ':': '÷' };
  const ops = (p.settings.ops || []).filter(o => p.opTrack[o] && p.opTrack[o].n >= 10);
  if (!ops.length) return '';
  return `<div class="vg-vlot">${ops.map(o => {
    const t = p.opTrack[o];
    return `<span><b>${glyph[o]}</b> ${(t.fast == null ? 0.5 : t.fast) >= FLUENT_MIN ? 'vlot' : 'rekent nog'}</span>`;
  }).join('')}</div>`;
}
/* "Meer cijfers": wat er sinds het begin gebeurde, dicht tot een ouder hem
   opent. Shows, sommen en % goed tellen over alles -- daarom staan ze hier en
   niet bij het label, dat alleen over de stap van nu gaat.
   De trofeeteller is een breuk, en die is altijd meervoud: "1/18 trofeeën"
   spreek je uit als "1 van de 18 trofeeën". De noemer komt uit
   activeTrophies() -- dezelfde bron als de kop van de kast, zodat er nooit
   twee verschillende totalen in de app kunnen staan. */
function meerCijfersHtml(p) {
  const shows = playedCount(p);
  const answered = p.stats.correct + p.stats.wrong;
  const getallen = [
    [shows, mv(shows, 'show', 'shows')],
    [answered, p.settings.track === 'count' ? mv(answered, 'vraag', 'vragen') : mv(answered, 'som', 'sommen')],
  ];
  if (answered) getallen.push([Math.round(100 * p.stats.correct / answered) + '%', 'goed']);
  const stars = totalStarCount(p);
  const perfect = perfectCount(p);
  const oogst = [
    [stars, mv(stars, 'ster', 'sterren')],
    [perfect, mv(perfect, 'perfecte show', 'perfecte shows')],
    [`${earnedActiveCount(p)}/${activeTrophies().length}`, 'trofeeën'],
  ];
  return `<details class="set-card vg-kaart vg-meer"><summary>${kaartKop('Meer cijfers')}</summary>
    <div class="vg-cijfers">${getallen.map(([n, w]) => `<span class="vg-getal"><b>${n}</b> ${w}</span>`).join('')}
      <span class="vg-cijfers-lijn" aria-hidden="true"></span>${
      oogst.map(([n, w]) => `<span class="oogst-item"><b>${n}</b> ${w}</span>`).join('')}</div>
  </details>`;
}
function statsPanelHtml(p) {
  return `<div class="settings-panel">${stemKaartHtml(p)}${leerpadHtml(p)}${oefentExtraHtml(p)}${meerCijfersHtml(p)}</div>`;
}
/* Kan dit toestel de stem laten horen? Een ouder ziet dat anders nergens: zonder
   stem blijft de telmodus speelbaar, maar valt de luisteroefening (fase 5) stil
   weg en klinkt er geen telwoord meer. Leeg als alles in orde is. Het geluid
   eerst: dat is één tik, en dan doet de rest er niet toe.

   Die tik zit er nu ook bij (#stem-aan, zie stemKaartHtml): hier stond "zet het
   aan met het tandwiel op het beginscherm", en dan moest een ouder het ouderdeel
   uit, het tandwiel in en weer terug -- voor één schakelaar. (De schakelaar zelf
   staat inmiddels ook in het ouderdeel, onder ⋯.) */
function stemNotitie(naam) {
  if (!db.sound) return `🔇 Het geluid staat uit, dus ${esc(naam || 'je ster')} hoort de vragen niet.`;
  if (!hasSpeech()) return '🔇 Dit toestel kan niet voorlezen. Alles blijft speelbaar, maar de luisteroefening (fase 5) wordt overgeslagen.';
  /* Eén regel; de uitleg pas als een ouder erom vraagt. Hier stond een zin van
     vijfendertig woorden, de langste tekst van Voortgang, over een instelling
     van het toestel en niet van het spel. */
  if (!nlVoice()) return '🗣️ Geen Nederlandse stem op dit toestel.'
    + '<details class="stem-hoe"><summary>Hoe?</summary>Kies een Nederlandse stem bij de spraakinstellingen van het toestel'
    + ' (tekst-naar-spraak). Zonder klinkt het voorlezen met een vreemde uitspraak, en valt de luisteroefening (fase 5) weg.</details>';
  return '';
}
/* Een tip voor de ouder: de getallengrens omhoog.

   Het leerpad (zie LEERPAD) houdt op bij de lijn "tot": daarna is het "alles
   door elkaar", binnen de grens die de ouder koos. Het spel zet die grens zelf niet hoger -- dat is de
   keuze van de ouder, en een kind dat ineens tot honderd moet zonder dat iemand
   het wist is geen verrassing maar een tegenvaller. Dus zegt het hier wanneer
   het tijd lijkt, en doet de ouder het met één tik (of niet).

   Wanneer: het kind speelt voorbij de laatste rij van het leerpad, en heeft
   daar al GRENS_TIP_SHOWS shows met drie sterren gehaald. Sterren en geen p.perf:
   die laatste is een gemiddelde over de laatste paar antwoorden en springt heen
   en weer; drie sterren in een hele reeks shows is een stand die blijft staan.
   Alleen voor rekenen, alleen als er nog een blok op de ladder is (10, 20,
   100, 1000 -- dezelfde blokken als op het leerpad van het tabblad Oefeningen).

   Zet de ouder de grens om (met de tip of op Oefeningen), dan begint het tellen
   opnieuw: s.grensTipBasis onthoudt hoeveel drie-sterrenshows er toen al waren,
   en pas GRENS_TIP_SHOWS nieuwe op de nieuwe grens geven de volgende tip. Anders
   stond direct na "tot 20" al de vraag of het niet 100 moest.

   EERST HET ANTWOORDEN, DAN DE GETALLEN. Bij "kiezen uit 4" is een gok goedkoop
   (er is een hint en een tweede kans), en zelf typen is de grootste stap in
   uitdaging mét dezelfde getallen -- voor een kind van zes of zeven een
   vriendelijker stap dan ineens tot vijftig. Dus stelt de tip eerst Afwisselen
   voor, dan Zelf typen, en pas daarna een hogere grens. Elke stap telt opnieuw
   (grensTipBasis), net als bij de grens. Geeft { soort: 'mode' | 'grens', naar }. */
const GRENS_LADDER = [10, 20, 100, 1000];
const GRENS_TIP_SHOWS = 6;
/* GESPEELDE SHOWS, NIET HALTES. Hier stond: hoeveel haltes vanaf wereld 6 drie
   sterren hebben. Dat zijn er hoogstens 48 (zes werelden van acht), en een halte
   die al drie sterren had overdoen telde niet. Dus stond een kind dat overal
   drie sterren had na één tip stil: de ouder tikte hem aan, grensTipBasis werd
   48, en er kwam nooit meer een -- ook niet als het daarna maanden dezelfde
   sommen speelde. Nu telt p.grensDrie elke show met drie sterren op "alles door
   elkaar", overdoen inbegrepen (zie telGrensDrie), net zoals de telmodus al
   shows telt (countTrack.plafond).

   Een save van vóór dit veld heeft het nog niet; dan is het beginpunt de oude
   telling, zodat grensTipBasis (die daarop gezet werd) blijft kloppen. De eerste
   show die meetelt schrijft het veld weg; tot dan wordt er niets opgeslagen.
   Die oude telling begon bij wereld 6 (index 5): de eerste wereld zonder nieuwe
   stap, toen een stap nog een wereld was. Dat getal hoort bij die oude saves en
   verandert dus niet mee met het leerpad. */
const GRENS_OUD_VANAF = 5;
function grensDrieHaltes(p) {
  const vanaf = GRENS_OUD_VANAF;
  if (vanaf >= WORLD_AVAIL) return 0;
  let drie = 0;
  for (let l = WORLD_START[vanaf]; l <= WORLD_LAST; l++) if ((p.stars || {})[l] >= 3) drie++;
  return drie;
}
function grensDrieSterren(p) {
  return typeof p.grensDrie === 'number' ? p.grensDrie : grensDrieHaltes(p);
}
// Na een rekenshow (zie endLevel): drie sterren voorbij de laatste rij telt.
function telGrensDrie(p, sterren) {
  if (sterren < 3 || padNu(p) !== 'alles') return;
  p.grensDrie = grensDrieSterren(p) + 1;
}
const MODE_LADDER = { kies: 'mix', mix: 'typ' };
function grensTip(p) {
  const s = p.settings;
  if (s.track === 'count' || zelfGekozen(s)) return null;   // Zelf kiezen: zie vgStand
  if (grensDrieSterren(p) - (s.grensTipBasis || 0) < GRENS_TIP_SHOWS) return null;
  if (MODE_LADDER[s.mode]) return { soort: 'mode', naar: MODE_LADDER[s.mode] };
  // de grens is alleen van plus en min: tafels lopen altijd tot × 10
  if (!s.ops.includes('+') && !s.ops.includes('-')) return null;
  const naar = GRENS_LADDER.find(v => v > s.max);
  return naar ? { soort: 'grens', naar } : null;
}
/* Dezelfde soort tip voor de telmodus. Daar groeit het spel zelf mee, maar
   alleen tot de grenzen die de ouder koos: de hoogste fase, cijfers aan/uit en
   de hoogste hoeveelheid. Staat het kind daar al GRENS_TIP_SHOWS shows lang met
   drie sterren tegenaan (countTrack.plafond, zie telPlafondTel), dan zegt het
   spel dat hier -- en is de volgende stap één tik.

   Op de allerlaatste fase is er in de telmodus niets meer te leren: dan is de
   volgende stap de rekenshow. Zonder deze tip speelde een kind dat het goed
   deed vanaf ongeveer wereld 3 tot het einde van de kaart dezelfde soort
   geschreven som tot tien.

   Geeft { soort, tekst, knop, doe(p) } terug, of null. De volgorde: eerst de
   fase (daar zit het meeste nieuws), dan de hoeveelheid, dan pas rekenen. */
function telTip(p) {
  const s = p.settings;
  if (s.track !== 'count' || !p.countTrack || zelfGekozen(s)) return null;
  if ((p.countTrack.plafond || 0) < GRENS_TIP_SHOWS) return null;
  const hi = countMaxStage(s);
  const qnaar = [6, 8, 10].find(v => v > (s.qmax || 10));
  const qtip = () => ({ soort: 'qmax',
    tekst: `Tot ${s.qmax} gaat foutloos. Grotere aantallen?`, knop: `Tot ${qnaar}`, doe: p => { p.settings.qmax = qnaar; } });
  // onder de tien houdt countMaxStage het bij fase 11: dan zijn het de aantallen
  if (qnaar && hi === COUNT_STAGE_MAX - 1 && (s.stageMax || COUNT_STAGE_MAX) >= COUNT_STAGE_MAX) return qtip();
  if (hi < COUNT_STAGE_MAX) {
    return { soort: 'fase',
      tekst: `Fase ${hi} gaat foutloos. Verder groeien?`, knop: `Tot fase ${hi + 1}`, doe: p => { p.settings.stageMax = hi + 1; } };
  }
  if (qnaar) return qtip();
  return { soort: 'rekenen',
    tekst: 'De laatste fase gaat foutloos. Klaar om te rekenen? <span class="tip-klein">Plus en min tot 10, ze leest de sommen zelf.</span>', knop: 'Naar rekenen', doe: naarRekenen };
}
/* Van tellen naar rekenen, zoals de tip het doet. Sterren, kaart en kleren
   hangen niet aan de modus, dus die blijven gewoon staan. Tot 10 en geen 20:
   de wereld waar het kind dan zit kan al over het tiental willen (leerstap 3),
   en tot 10 kán dat niet -- de grenstip stelt 20 later zelf voor. */
function naarRekenen(p) {
  const s = p.settings;
  s.track = 'math';
  s.ops = ['+', '-'];
  s.max = 10;
  s.mode = 'kies';
  s.grensTipBasis = grensDrieSterren(p);
  s.padVanaf = null;
  s.padTot = null;
  p.pad = null;                 // het leerpad begint vooraan (zie padNu)
}

// Tabblad "Oefening" — alle bewerkbare instellingen, gegroepeerd in kaarten.
// Meerkeuze- en enkelkeuze-chips zien er bewust hetzelfde uit (alleen kleur
// wisselt) -- dit is een laagdrempelig, direct-manipulatie schermpje: één tik
// laat meteen zien of een groep er meerdere naast elkaar toestaat of niet.
function chip(v, label, on, extra) {
  return `<button class="chip ${on ? 'on' : ''}${extra ? ' ' + extra : ''}" data-v="${v}">${label}</button>`;
}
const COUNT_STAGE_LABELS = ['', 'Tellen 1–3', 'Tellen 1–5', 'Meer / minder', 'Evenveel', 'Luister', 'Cijfers', 'Eén meer / minder', 'Samen / splitsen', 'Som met tekens', 'Cijfers met stippen', 'Geschreven som', 'Tot 20'];
// Per fase een voorbeeld, rechts in de ladder op Oefeningen: wat het kind daar ziet.
const COUNT_STAGE_VB = ['', '🍎🍎🍎', '🍎🍎🍎🍎🍎', '🐞🐞 · 🐞🐞🐞🐞', '●●● = ●●●', '🔊 → ●●●●', '4 = ●●●●', '5 → 6', '●●● + ●●', '🍎 + 🍎🍎', '2 + 3', '4 + 3', '10 + 4'];
/* De oefenvelden zelf, los van de omlijsting eromheen. Het ouderdeel zet ze in
   .set-card primary met een icoonkop; het maakformulier zet ze plat in een
   openklapper. Eén bron, twee omlijstingen -- anders staan dezelfde zeven
   keuzes straks op twee plekken en lopen ze uit elkaar.

   pfx houdt de twee kopieën uit elkaar. #screen-settings staat vóór
   #screen-newstar in de DOM en schermen worden verborgen, niet weggehaald, dus
   zonder voorvoegsel vindt getElementById in bindOefenChips stilletjes de
   verkeerde kopie. Het ouderdeel houdt pfx = '' (alle bestaande selectors en
   tests blijven kloppen), het maakformulier gebruikt 'ns-'. */
/* WELKE INSTELLING IN WELKE KAART. Oefenen is een kaart per thema en dan één
   voor de show, in beide modi in dezelfde volgorde:
     rekenen  + en −, en het leerpad of de vinkjes (alleen als het thema aan staat)
     tafels   × en ÷, en de tafelladder of "Tafels van" (idem; zie THEMAS)
     show     hoe een show speelt (antwoorden, hoeveel vragen)
   Bij tellen is het nog altijd wat · pad · show: wat het kind oefent en hoe
   groot, het leerpad, en hoe een show speelt (met het memory-spel).
   Welke thema's aan staan, staat erboven, in de kaart Wat oefent ze (zie
   themaKaartHtml) -- niet hier, want het maakformulier heeft die ook.
   Elke instelling staat hier één keer, met zijn kaart, en heeft op het scherm
   precies één bediening (data-instelling). Hiervoor groeide er een tweede kaart
   waar alles in belandde wat nergens anders paste: de extra's stonden daar als
   schakelaar én op het leerpad als stap, en "Cijfers" deed wat de lijn "tot"
   op de faseladder al deed. test/kern.test.js zaak ZD houdt dit vast: een
   instelling met twee bedieningen, of een bediening in de verkeerde kaart, valt
   daar om. Komt er een instelling bij, dan kiest hij hier eerst zijn kaart. */
const OEFEN_INSTELLINGEN = {
  math:  { rekenen: ['ops', 'padVanaf', 'kies'], tafels: ['tafelOps', 'tafelLijn', 'tables'], geld: ['geldLijn', 'kiesGeld'], klok: ['klokLijn', 'kiesKlok'], kalender: ['kalLijn', 'kiesKalender'], lijn: ['lijnLijn', 'kiesLijn'], show: ['mode', 'perLevel'] },
  count: { wat: ['qmax'], pad: ['stage', 'kiesFasen'], show: ['repr', 'perLevel', 'memory'] },
};
function oefenGroups(s, pfx, p) {       // -> [{ kaart, kop, ico?, html }], in de volgorde van OEFEN_INSTELLINGEN
  pfx = pfx || '';                       // p: het kind, als er een is (het maakformulier heeft er nog geen)
  // Het teken alleen, groot: een ouder leest + − × ÷ sneller dan "Plus" of "Delen".
  // Het woord staat er voor een schermlezer nog bij (aria-label).
  const opDefs = [['+', '+', 'Plus'], ['-', '−', 'Min'], ['x', '×', 'Maal'], [':', '÷', 'Delen']];
  const availMax = COUNT_STAGE_MAX;
  const stageNums = [];
  for (let v = 1; v <= availMax; v++) stageNums.push(v);
  const lo = Math.min(Math.max(1, s.stage || 1), availMax);
  const hi = Math.min(Math.max(lo, s.stageMax || availMax), availMax);
  /* DE LADDER, in beide modi dezelfde. Elke stap een rij: bolletje, naam, en
     rechts een voorbeeld in een vaste kolom ("8 + 5" zegt sneller wat "over het
     tiental" is dan een zin). Wat het kind speelt staat tussen twee lijnen,
     "vanaf" en "tot"; wat erbuiten valt is gedempt. In het bolletje van de stap
     waar het kind nu is staat haar eigen pop in plaats van het nummer.

     Er is geen keuzevenster: je tikt op de stap zelf, en dan verhuist de
     dichtstbijzijnde lijn (zie bindOefenChips). Bij rekenen is "tot" de grens
     van plus en min, en een grijze rij eronder aantikken laat hem zakken. "tot" is ook wat
     vroeger de schakelaar "Cijfers" deed: tot fase 5 komen er geen cijfers.

     DE LIJNEN NEMEN GEEN PLAATS IN. Eerst was een lijn een eigen regel tussen
     twee stappen, en die stond er alleen als hij iets afsneed. Dan schoof bij
     elke tik alles erachter een regel op -- soms ook de stap waar je net op
     tikte. Nu staat er tussen élke twee stappen dezelfde vaste naad
     (.fase-ladder.naad), en de lijn wordt ín die naad getekend: hij hangt aan
     de rand van zijn stap (.fl-lijn.boven / .onder) en duwt niets weg. Er
     verschuift dus nooit iets; alleen de lijn verhuist, en glijdt daarbij
     (zie lijnGlij in bindOefenChips). Beide lijnen staan er altijd, ook als ze
     niets afsnijden: dan leest de ladder altijd "vanaf ... tot".

     GEEN VINKJES OP HET LEERPAD. Hier stond rechts een kolom vinkjes, om zoek
     het getal en drie getallen over te slaan. Op een pad dat zelf doorschuift
     zijn begin en eind de enige keuzes die tellen; wie precies wil zeggen wat
     er gespeeld wordt, kiest Zelf kiezen (kiesHtml), en daar is het vinkje de
     hele bediening. Een oude save waarin er een uit stond, speelt nog zo
     (doorgestreept, padRijen); een tik die "tot" verzet neemt ze weer mee.

     GEEN BLOKKOPPEN. "TOT 20" en "TOT 100" boven de blokken zeiden wat de lijn
     "tot" al zegt ("tot 20" aan het eind van een blok) en wat de voorbeelden
     laten zien (12 + 5 tegen 56 + 23). Onzichtbaar maar wel plaats innemend
     gaf een gat dat er raar uitzag; nu is elke naad even groot.

     rijen: [{ v, naam, vb, uit?, blok? }] -- blok: de grens van zijn blok (rekenen).
     hi = Infinity: geen "tot" (rekenen zonder plus of min).
     staart: een rij om te lezen achteraan (zie het leerpad van rekenen). */
  const ava = p ? flAva(p) : '';
  const lijn = (woord, kant) => `<span class="fl-lijn ${kant}" aria-hidden="true">${woord}</span>`;
  const ladder = (id, instelling, rijen, lo, hi, hier, staart) => `<div class="fase-ladder naad" id="${pfx}${id}" data-instelling="${instelling}">${rijen.map((r, i) => {
    // "tot" aan het eind van een blok zegt welk: "tot 20"
    const totWoord = r.blok && rijen[i + 1] && rijen[i + 1].blok !== r.blok ? `tot ${r.blok}` : 'tot';
    return flRij(`${r.v < lo ? ' voor' : r.v > hi ? ' uit' : ''}${r.v === hier ? ' hier' : ''}${r.uit ? ' overgeslagen' : ''}`,
      r.v === hier && ava ? ava : i + 1, r.naam, r.vb, r.v,
      (r.v === lo ? lijn('vanaf', 'boven') : '') + (r.v === hi ? lijn(totWoord, 'onder') : ''));
  }).join('')}${staart || ''}</div>`;
  /* ZELF KIEZEN (zie zelfGekozen): dezelfde rijen, maar elk met een vinkje in
     het bolletje, zonder nummer -- een nummer zou een volgorde beloven die er
     hier niet is -- en zonder lijnen. Tussen de blokken een dun streepje.
     De laatste die aan staat mag niet uit (blockedMinOne). */
  const kiesHtml = (id, instelling, rijen, aan) => `<div class="fase-ladder kies-lijst" id="${pfx}${id}" data-instelling="${instelling}">${rijen.map((r, i) =>
    (r.blok && i && rijen[i - 1].blok !== r.blok ? '<div class="kies-naad" aria-hidden="true"></div>' : '')
    + flRij(` kies${aan.includes(r.v) ? ' aan' : ''}`, '✓', r.naam, r.vb, r.v).replace('<button ', `<button role="checkbox" aria-checked="${aan.includes(r.v)}" `)).join('')}</div>`;
  /* Elke kaart heeft een kop (kop, zie kaartKop); de velden daarbinnen krijgen
     kleine labels, geen hulpregels: het voorbeeld en de vorm van de bediening
     zeggen wat een tik doet. Drie vormen, elk voor één soort keuze:
       balk         één uit een rij (getallen tot, antwoord, vragen per show)
       meerbalk     dezelfde balk, maar meer tegelijk mag (+ − × ÷, de tafels)
       schakelaar   aan of uit (memory, alleen bij tellen)
     en bij Zelf kiezen de vinkjes hierboven. Alles blijft .chip met een data-v
     in een houder met het oude id -- daar hangt bindOefenChips aan, en de tests
     ook. */
  const lbl = oeLbl;
  /* Eén keuze uit een rij (kiezen · mix · typen, vragen per show): een
     balk met gelijke vakken, dezelfde vorm als de moduskeuze onderaan. Van links
     naar rechts wordt het moeilijker. Eerst was dit een trap met treden die naar
     rechts hoger werden, maar de lege treden lazen als uitgeschakeld in plaats
     van als te kiezen. */
  const balk = (id, instelling, items, sel) => `<div class="oe-seg" id="${pfx}${id}" data-instelling="${instelling}">${items.map(([v, t]) => chip(v, t, v === sel)).join('')}</div>`;
  // Een rij die aan of uit staat; de hele rij is de knop. data-v is wat een tik
  // ervan maakt ('on'/'off', zie bindOefenChips).
  const aanUit = (id, instelling, ico, woord, aan) => `<div id="${pfx}${id}"><button class="chip oe-rij${aan ? ' on' : ''}" data-v="${aan ? 'off' : 'on'}" data-instelling="${instelling}" role="switch" aria-checked="${aan}">`
    + `<span class="oe-i" aria-hidden="true">${ico}</span><span class="oe-w">${woord}</span><span class="oe-stand" aria-hidden="true"></span></button></div>`;
  const perShow = `${lbl('Vragen per show')}${balk('set-perlevel', 'perLevel', [[5, '5'], [8, '8'], [10, '10']], s.perLevel)}`;
  /* De kaart pad wisselt met de modus (zie zelfGekozen): het leerpad met zijn
     lijnen, of bij Zelf kiezen de lijst met vinkjes. Wat erboven staat (wat)
     en eronder (show) is in beide modi precies hetzelfde. */
  const vrij = zelfGekozen(s);
  const fases = stageNums.map(v => ({ v, naam: COUNT_STAGE_LABELS[v], vb: COUNT_STAGE_VB[v] }));
  if (s.track === 'count') return [{
    kaart: 'wat', kop: 'Hoeveelheden tot', html: `${balk('set-qmax', 'qmax', [[6, '6'], [8, '8'], [10, '10']], s.qmax || 10)}`
  }, vrij ? {
    kaart: 'pad', kop: `Wat oefent ${p ? esc(p.name) : 'je ster'}?`, html: kiesHtml('set-kiesfasen', 'kiesFasen', fases, kiesFasen(s))
  } : {
    kaart: 'pad', kop: 'Leerpad', html: `${ladder('set-fase', 'stage', fases, lo, hi, p && countLiveStage(p))}`
  }, {
    kaart: 'show', kop: 'Tonen als', html: `${balk('set-repr', 'repr',
      [['objects', 'Voorwerpen'], ['mix', 'Mix'], ['dots', 'Stippen']], s.repr || 'objects')}
      ${perShow}
      ${aanUit('set-memory', 'memory', '🃏', 'Memory', s.memory !== false)}`
  }];
  /* Het leerpad van rekenen: de rijen van LEERPAD die op háár pad staan (zie
     padRijen), genummerd op plaats. Twee lijnen, net als bij tellen:
       vanaf  boven de rij waar het spel minstens begint (s.padVanaf)
       tot    onder de laatste rij die ze speelt (s.padTot, of het eind van
              het blok). Dit ís ook de grens: de balk "Getallen tot" is weg,
              want die zei met een getal wat de lijn hier met de rijen zegt.
     Onder "tot" staat grijs wat komt als de lijn zakt: de rest van het blok,
     en het volgende blok (Getallen bouwen, Tientallen, Tot 100 en Over het
     tiental) -- niet alles tot het eind, alleen de volgende stap. "Alles door elkaar" staat helemaal onderaan om te lezen:
     daar begin je niet, maar een kind voorbij de laatste rij staat daar. */
  const { rijen: padR, later: padL } = padRijen(s);
  const padAlle = padR.concat(padL);
  const blok = r => r.soort === 'bereik' && r.bereik > 20 ? r.bereik : 20;
  const speel = padR.filter(r => !r.uit);
  const startPos = speel.length ? padR.indexOf(padVanafRij(s, speel)) + 1 : 1;
  const nuId = p && padNu(p);
  const voorbij = nuId === 'alles';
  const hierPos = p && !voorbij ? padR.findIndex(r => r.id === nuId) + 1 : 0;
  const eind = flRij(` eind${voorbij ? ' hier' : ''}`, voorbij && ava ? ava : '∞',
    'Alles door elkaar<small>alles tot de lijn, gemengd</small>');
  const padRijenLadder = padAlle.map((r, i) => ({ v: i + 1, naam: r.naam, vb: flVb(r.vb), uit: r.uit, blok: blok(r) }));
  // Zelf kiezen: de + − rijen (kiesRijen), met hun id als waarde
  const kiesLijst = kiesRijen(s).map(r => ({ v: r.id, naam: r.naam, vb: flVb(r.vb), blok: padBlok(r, { max: 20 }) }));
  /* + − en × ÷ staan elk in de kaart van hun thema, als een balk met alleen
     hun eigen twee tekens; de laatste van een thema kan niet uit (zet het thema
     uit, bovenaan). "Getallen tot" gold vroeger ongezegd ook voor de tafels:
     met tot 20 en de tafel van 7 kwam er nooit meer dan 7 × 2. Nu is "tot"
     alleen van plus en min, en is een tafel altijd heel: × 1 tot × 10 (zie
     genTriple).
     Er is geen stem-schakelaar (rekenen is zonder stem, zie stemAan) en bij
     rekenen geen memory (zie memoryAan). */
  const opsBalk = (id, instelling, defs) => `<div class="oe-ops" id="${pfx}${id}" data-instelling="${instelling}">${defs.map(([v, teken, woord]) =>
    `<button class="chip${s.ops.includes(v) ? ' on' : ''}" data-v="${v}" aria-label="${woord}" aria-pressed="${s.ops.includes(v)}">${teken}</button>`).join('')}</div>`;
  /* De ladders van tafels en geld (zie LADDERS): dezelfde ladder met dezelfde
     twee lijnen, en onderaan om te lezen "alles door elkaar". Bij Zelf kiezen
     de balk "Tafels van" of de vinkjes van geld: daar tikt de ouder precies
     aan welke. */
  const themaLadder = k => {
    const L = LADDERS[k], lr = ladderRijen(s, k);
    const nu = p && ladderNu(p, k), voorbij = nu === 'alles';
    const staart = flRij(` eind${voorbij ? ' hier' : ''}`, voorbij && ava ? ava : '∞', L.eind);
    return ladder(L.id, L.lijn, lr.rijen.map((r, i) => ({ v: i + 1, naam: r.naam, vb: flVb(r.vb) })),
      lr.lo + 1, lr.hi + 1, p && !voorbij ? L.idx[nu] + 1 : 0, staart);
  };
  /* Onder Vragen per show hoe een show eruitziet: één icoontje per vraag, in
     de volgorde van themaPlan -- dan hoeft niemand uit te leggen wat "de helft
     sommen" betekent. Alleen als er meer dan één thema aan staat; anders is
     elke vraag hetzelfde. Onder Kiezen/Mix/Typen staat bewust niets: dat de
     klok (en een woord bij de kalender) altijd kiest, ziet een ouder in de show
     zelf, en een regel uitleg erbij was er een te veel. */
  const showMix = themasAan(s).length > 1
    ? `<div class="oe-mix" role="img" aria-label="Een show: ${themaPlan(s, s.perLevel).map(k => THEMA[k].naam.toLowerCase()).join(', ')}">${themaPlan(s, s.perLevel).map(k => themaIcoon(k, 20)).join('')}</div>` : '';
  const rijenKies = k => { const L = LADDERS[k];
    return kiesHtml(`set-kies${k}`, L.kies, L.pad.map(r => ({ v: r.id, naam: r.naam, vb: L.vb(r) })), s[L.kies] || []); };
  const tafelsVan = `${lbl('Tafels van')}
      <div class="oe-tafels" id="${pfx}set-tables" data-instelling="tables">${[1,2,3,4,5,6,7,8,9,10].map(v => chip(v, v, s.tables.includes(v))).join('')}</div>`;
  return [themaAan(s, 'rekenen') && {
    kaart: 'rekenen', kop: 'Rekenen', ico: 'rekenen', html: `${opsBalk('set-ops', 'ops', opDefs.slice(0, 2))}${vrij
      ? kiesHtml('set-kies', 'kies', kiesLijst, (s.kies || []))
      : ladder('set-startstap', 'padVanaf', padRijenLadder, startPos, padR.length, hierPos, eind)}`
  }, themaAan(s, 'tafels') && {
    kaart: 'tafels', kop: 'Tafels', ico: 'tafels', html: `${opsBalk('set-tafelops', 'tafelOps', opDefs.slice(2))}${vrij ? tafelsVan : themaLadder('tafels')}`
  }, themaAan(s, 'lijn') && {
    kaart: 'lijn', kop: 'Getallenlijn', ico: 'lijn', html: vrij ? rijenKies('lijn') : themaLadder('lijn')
  }, themaAan(s, 'geld') && {
    kaart: 'geld', kop: 'Geld', ico: 'geld', html: vrij ? rijenKies('geld') : themaLadder('geld')
  }, themaAan(s, 'klok') && {
    kaart: 'klok', kop: 'Klok', ico: 'klok', html: vrij ? rijenKies('klok') : themaLadder('klok')
  }, themaAan(s, 'kalender') && {
    kaart: 'kalender', kop: 'Kalender', ico: 'kalender', html: vrij ? rijenKies('kalender') : themaLadder('kalender')
  }, {
    kaart: 'show', kop: 'Antwoord', html: `${balk('set-mode', 'mode', [['kies', 'Kiezen'], ['mix', 'Mix'], ['typ', 'Typen']], s.mode)}
      ${perShow}${showMix}`
  }].filter(Boolean);
}
/* Wat er in de dichte openklapper te lezen staat: een ouder die hem nooit opent
   ziet zo tóch waar haar kind mee begint. */
function oefenSamenvatting(s) {
  if (s.track === 'count') {
    const top = countMaxStage(s);   // klemt al op stageMax én op de cijfers-uit-grens
    return `fase ${s.stage}${top > s.stage ? '–' + top : ''}`
         + ` · hoeveelheden tot ${s.qmax || 10} · ${s.perLevel} ${mv(s.perLevel, 'vraag', 'vragen')}`;
  }
  // dezelfde volgorde en dezelfde tekens als de velden (zie oefenGroups)
  const glyph = { '+': '+', '-': '−', 'x': '×', ':': '÷' };
  const modes = { kies: 'kiezen', typ: 'typen', mix: 'mix' };
  const totRij = s.padTot && padRijen(s).rijen.slice(-1)[0];   // de lijn midden in een blok: zeg de rij
  const tot = (s.ops.includes('+') || s.ops.includes('-')) ? ` · tot ${totRij ? totRij.naam.toLowerCase() : s.max}` : '';
  // de tafels: op het leerpad zegt de ladder welke, bij Zelf kiezen de ouder
  const tafels = themaAan(s, 'tafels') && zelfGekozen(s)
    ? ` · tafels ${s.tables.slice().sort((a, b) => a - b).join(', ')}` : '';
  const rijen = padRijen(s).rijen.filter(r => !r.uit);
  const start = s.padVanaf && rijen.length && padVanafRij(s, rijen) !== rijen[0] && padVanafRij(s, rijen);
  return `${['+', '-', 'x', ':'].filter(o => s.ops.includes(o)).map(o => glyph[o]).join(' ')}${tot}${tafels}${themaAan(s, 'geld') ? ' · €' : ''}${themaAan(s, 'klok') ? ' · 🕐' : ''}${themaAan(s, 'kalender') ? ' · 📅' : ''}${themaAan(s, 'lijn') ? ' · 📏' : ''}`
       + ` · ${modes[s.mode] || s.mode}${start ? ` · vanaf ${start.naam.toLowerCase()}` : ''}`
       + ` · ${s.perLevel} ${mv(s.perLevel, 'vraag', 'vragen')}`;
}
/* DE VOLGORDE VAN OEFENEN. Eerst wat ze oefent en hoe (themaKaartHtml), dan
   per thema zijn kaart, dan hoe een show speelt: de kaarten van oefenGroups,
   en verder niets.
   De modus (tellen of rekenen) staat hier niet: die wordt één keer gekozen,
   bij het maken van de ster, en daarna nog één keer als de tip in Voortgang
   zegt dat het tijd is om te rekenen. Hij staat in haar blad, bij wie ze is
   (zie wieBladHtml). Onderaan Oefeningen was hij nog steeds het eerste waar
   een duim op viel na het scrollen. */
function oefenenPanelHtml(p, s) {
  const cards = oefenGroups(s, '', p).filter(g => g.html).map(g => `
    <div class="set-card oefen-kaart primary" data-kaart="${g.kaart}">${kaartKop(g.ico ? `${themaIcoon(g.ico, 22)}${g.kop}` : g.kop)}${g.html}</div>`).join('');
  return `<div class="settings-panel">${themaKaartHtml(s, p)}${cards}
  </div>`;
}
/* DE THEMA'S, als tegels: wat ze oefent (zie THEMAS). Meer tegelijk mag, de
   laatste kan niet uit. Elke tegel is een schakelaar (role=switch), met het
   woord onder het icoontje -- uit is grijs én lichter, niet alleen een andere
   kleur. Gedeeld met het maakformulier (pfx 'ns-'). */
function themaTegels(s, pfx) {
  return `<div class="thema-bar" id="${pfx || ''}set-themas">${THEMAS.map(t => {
    const aan = themaAan(s, t.id);
    return `<button class="chip thema${aan ? ' on' : ''}" data-v="${t.id}" role="switch" aria-checked="${aan}">${themaIcoon(t.id, 30)}<span>${t.naam}</span></button>`;
  }).join('')}</div>`;
}
/* WAT OEFENT ZE, EN HOE? Bovenaan Oefeningen één kaart: eerst de thema's
   (themaTegels; alleen bij rekenen), dan de twee manieren (zie zelfGekozen),
   voor alle thema's samen:
     🧭 Leerpad      het spel schuift zelf door; de ouder zet begin en eind
     ✋ Zelf kiezen  precies wat de ouder aanvinkt, om de beurt
   Eerst wat, dan hoe: zo leest de kaart van boven naar onder. De manier staat
   niet in oefenGroups, want het maakformulier begint altijd op het leerpad --
   wie precies wil kiezen, doet dat als de ster er is. */
function themaKaartHtml(s, p) {
  const vrij = zelfGekozen(s);
  const tellen = s.track === 'count';
  const meer = !tellen && themasAan(s).length > 1;
  return `
    <div class="set-card oefen-kaart primary modus-kaart" data-kaart="hoe">
      ${tellen ? '' : `${kaartKop(`Wat oefent ${p ? esc(p.name) : 'ze'}?`)}${themaTegels(s, '')}<div class="thema-naad" aria-hidden="true"></div>`}
      <div class="oe-seg" id="set-modus" data-instelling="modus">${chip('pad', '🧭 Leerpad', !vrij)}${chip('vrij', '✋ Zelf kiezen', vrij)}</div>
      <p class="modus-uitleg">${vrij ? 'Alleen wat je aanvinkt.' : meer ? 'Elk thema groeit vanzelf mee.' : 'Groeit vanzelf mee.'}</p>
    </div>`;
}

/* ---- Beheer: alles wat géén oefeninstelling is ----
   Twee soorten dingen, en het verschil moet te zien zijn:
     - kindgebonden : naam, meisje of jongen, opnieuw beginnen, verwijderen.
                      Die staan in haar blad, onder haar naam in de kop (wieBladHtml).
     - app-breed    : geluid, als app, back-up (exportData schrijft de héle db weg
                      -- alle sterren plus geluid -- en importData vervángt die
                      helemaal). Die staan op het overzicht, onder "Voor alle
                      sterren" (appWideCardsHtml).
   Eerst stonden de twee samen onder één tabblad, met een streepje ertussen. Dat
   streepje hielp niet: de gekozen ster stond erboven, dus las de back-up als de
   hare. Nu staat er boven het app-brede deel geen ster meer.
   Terugzetten bestaat óók als er nog geen enkele ster is, en dat is niet
   theoretisch: een familie met een nieuwe telefoon heeft nul sterren en wil
   juist dán bij "Back-up terugzetten" -- zie beheerEmptyHtml, dat daar zijn
   eigen, kortere kaart voor heeft.

   HIËRARCHIE IN DE KNOPPEN.
     vol paars  -- de knop die iets maakt en niets kan kwijtmaken (back-up maken;
                   dat is bovendien wat je hier het vaakst komt doen)
     .paper     -- de knoppen die iets vervángen (terugzetten). De bevestiging
                   erachter is ongewijzigd -- dit is de vindbaarheid, niet de
                   beveiliging.
   Wat er sindsdien bij kwam (overzetten naar een ander toestel) groeide uit de
   back-up, niet ernaast: het staat in hetzelfde blad (openBackupBlad). */
/* Geluid: één rij, de eerste onder "Voor alle sterren" -- het geldt voor het
   hele toestel, niet voor één kind. Dezelfde rij als in "Show stoppen?" (zie
   renderGeluid); de hele rij is de schakelaar. */
function geluidRijHtml() {
  return `
      <button class="gear-item" id="set-sound" role="switch" aria-checked="${db.sound ? 'true' : 'false'}">
        <span class="gi-ico" aria-hidden="true">${db.sound ? '🔊' : '🔇'}</span><span class="gi-label">Geluid<span class="gi-sub">Muziek en de stem die voorleest</span></span><span class="gi-state${db.sound ? '' : ' off'}" id="set-sound-state">${db.sound ? 'Aan' : 'Uit'}</span>
      </button>`;
}
/* Wat voor alle sterren geldt, onderaan het overzicht: één kaart met stille
   rijen, in deze volgorde:

     * Geluid -- de schakelaar.
     * Back-up › -- de datum van de laatste back-up, grijs. Nooit, of langer dan
       BACKUP_OUD_DAGEN geleden, dan is die datum amber met een stipje: de
       herinnering blijft, maar een ouder die hier voor iets anders komt kijkt
       niet meer tegen een gele balk en twee grote knoppen aan. Een back-up maak
       je zelden; de knoppen staan in het blad erachter (openBackupBlad).
     * Als app › -- zolang het spel nog in de browser draait. Die opent hetzelfde
       blad als het knopje op de sterrenkeuze (openAppBlad). Hij staat als laatste
       omdat hij verdwijnt zodra het spel geïnstalleerd is: dan schuift er niets.

   Hier stond eerst een eigen back-upkaart met een amber regel en Maken naast
   Terugzetten. Die vroeg bij elk bezoek even hard om aandacht als de sterren
   erboven, voor iets wat een ouder een paar keer per jaar doet. */
function appWideCardsHtml() {
  const alsApp = (beginschermNetErop || speeltAlsApp()) ? '' : `
      <button class="gear-item" id="set-alsapp" type="button">
        <span class="gi-ico" aria-hidden="true">📲</span><span class="gi-label">Als app</span><span class="gi-pijl" aria-hidden="true">›</span>
      </button>`;
  return `
    <div class="set-card geluid-kaart">${geluidRijHtml()}
      <button class="gear-item" id="set-backup" type="button">
        <span class="gi-ico" aria-hidden="true">🗄️</span><span class="gi-label">Back-up${backupStandHtml()}</span><span class="gi-pijl" aria-hidden="true">›</span>
      </button>${alsApp}
    </div>
    ${importInvoerHtml()}`;
}
/* Wanneer de laatste back-up was. Amber zolang er nooit een was of de laatste
   langer dan vier weken geleden is -- vier weken spelen is te veel om kwijt te
   raken; grijs daarna. Alleen hier, in het ouderdeel: een kind krijgt hier nooit
   een melding over te zien. */
const BACKUP_OUD_DAGEN = 28;
function backupDagen(nu) {
  const t = db.backupAt ? Date.parse(db.backupAt) : NaN;
  return isNaN(t) ? null : Math.max(0, Math.floor(((nu || Date.now()) - t) / 86400000));
}
function backupOud(nu) {
  const dagen = backupDagen(nu);
  return dagen === null || dagen > BACKUP_OUD_DAGEN;
}
function backupWanneer(nu) {
  const dagen = backupDagen(nu);
  return dagen === null ? 'Nog nooit gemaakt'
    : dagen === 0 ? 'Vandaag'
    : dagen === 1 ? 'Gisteren'
    : dagen < 14 ? `${dagen} dagen geleden`
    : dagen < 60 ? `${Math.floor(dagen / 7)} weken geleden`
    : `${Math.floor(dagen / 30)} maanden geleden`;
}
// De onderregel van de rij Back-up. Dezelfde id als de oude regel in de kaart, dus
// exportData werkt hem ter plekke bij.
function backupStandHtml(nu) {
  const oud = backupOud(nu);
  return `<span class="gi-sub backup-stand${oud ? ' oud' : ''}" id="set-backup-stand">${backupWanneer(nu)}`
    + (oud ? '<span class="gi-dot" aria-hidden="true"></span>' : '') + '</span>';
}
// Het verborgen bestandsveld achter "terugzetten". Eén keer per paneel, en in
// beide panelen (met en zonder sterren) onder hetzelfde id -- bindSettings bindt
// het op dat id, en er staat er nooit meer dan één tegelijk.
function importInvoerHtml() {
  return `<input type="file" id="set-import-file" accept="application/json,.json" style="display:none">`;
}
/* De weg naar over/: de pagina die in twintig seconden zegt wat dit spel is,
   met het filmpje erop. Voor de ouder die het aan iemand anders wil laten zien --
   daarom staat hij hier en niet in het spel: een kind komt er zo nooit per
   ongeluk. Hij staat onderaan het overzicht, waar ⚙️ opent (en zonder sterren
   onder de lege pagina, beheerEmptyHtml). Eerder stond hij als allerlaatste
   onder ⋯, twee schermen diep achter de back-up, en dan vond geen ouder hem;
   daarna onder Voortgang, toen ⚙️ daar nog opende.
   Hij is een voetregel zonder kaart: het is geen
   instelling maar een verwijzing, en een witte kaart met een volle paarse knop
   vroeg even hard om aandacht als de back-up erboven. Het filmpje zit niet in de
   app zelf; het wordt pas opgehaald als iemand op afspelen tikt (en sw.js bewaart
   het niet).

   De link opent in hetzelfde venster, niet met target="_blank": over/ valt
   binnen de scope van het manifest, dus in de geïnstalleerde app blijft hij in
   de app. Een nieuw venster kan een app niet openen -- dat gaf hem aan de
   browser, en dan leek het alsof je uit de app gegooid werd. Terug gaat met
   "Terug naar het spel" bovenaan de pagina (of de terugknop van Android).
   Zonder net blijft hij hier: over/ staat met opzet niet in de voorraad, en in
   een schermvullende app op een iPhone is er geen terugknop -- je zou vastzitten
   op een foutpagina van de browser. */
const OVER_URL = 'https://www.rekensterren.be/over/';
function ouderVoetHtml() {
  return `
    <div class="ouder-voet">
      <a class="ov-link" id="set-over" href="over/index.html">🎬 Over Rekensterren <span aria-hidden="true">›</span></a>
      <button class="ov-link" id="set-deel" type="button">📤 Deel de link</button>
    </div>`;
}
// Naar over/: eerst bewaren (we verlaten de pagina), en zonder net niet weg.
// Twee ingangen met dezelfde handler: de voetregel onder het overzicht (set-over) en de
// stille regel op het lege beginscherm (over-hint, in de markup van index.html).
function naarOver(e) {
  if (navigator.onLine === false) {
    e.preventDefault();
    showToast('📶 Geen internet');
    return;
  }
  save();
}
// Delen: eerst het deelmenu van het toestel, anders de link naar het klembord,
// en lukt ook dat niet, dan staat hij in de melding zodat je hem kunt overtikken.
function deelOver() {
  const melding = t => showToast(t);
  if (navigator.share) {
    navigator.share({ title: 'Rekensterren', text: 'Een reken- en telspel voor kinderen van 5 tot 8.', url: OVER_URL })
      .catch(() => {});   // wegtikken is geen fout
    return;
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(OVER_URL)
      .then(() => melding('✓ Link gekopieerd'), () => melding(esc(OVER_URL)));
    return;
  }
  melding(esc(OVER_URL));
}
/* Nul sterren: geen naam om te wijzigen, geen voortgang om te wissen -- en ook
   niets om een back-up van te maken. Wie hier zonder sterren komt, komt bijna
   altijd om een back-up terug te zetten: een nieuw toestel, of de app op het
   beginscherm na Safari (het blad "als app" wijst hierheen: ⚙️ → Voor ouders). Dus is terugzetten hier de volle knop, en staat
   er geen "Back-up maken" -- die schreef met nul sterren een leeg bestand weg dat
   er precies zo uitzag als een echte back-up. Eén kaart, want het is één vraag:
   waar begin je? Een ster maken is de tweede mogelijkheid, en die staat hier
   gewoon als knop (de kiezer met zijn "+" is er zonder sterren niet). */
function beheerEmptyHtml() {
  /* Met overzetten erbij (zie = Overzetten) zijn er twee manieren om je sterren
     terug te krijgen: een code van het andere toestel, of een bestand. Twee
     tegels naast elkaar, de code eerst -- dat is de snelste. Zonder overzetten
     (vanaf file://) blijft het de ene volle knop. */
  const terug = overzetMag()
    ? `<div class="bb-tegels">
        <button class="bb-tegel" id="oz-code" type="button">${ozIco('code')}Code invullen</button>
        <button class="bb-tegel" id="set-import" type="button">${ozIco('terug')}Back-up terugzetten</button>
      </div>
      <div class="data-btns"><button class="btn small paper" id="set-newstar">➕ Nieuwe ster maken</button></div>`
    : `<div class="data-btns">
        <button class="btn small purple" id="set-import">📂 Back-up terugzetten…</button>
        <button class="btn small paper" id="set-newstar">➕ Nieuwe ster maken</button>
      </div>`;
  return `<div class="settings-panel">
    <div class="set-card">
      <div class="set-card-head"><div class="ico">🌟</div><div><h2>Nog geen sterren</h2><div class="sub">Al gespeeld op een ander toestel?${overzetMag() ? '' : ' Zet de back-up hier terug.'}</div></div></div>
      ${terug}
      ${importInvoerHtml()}
    </div>${beginschermKaartHtml(false)}${ouderVoetHtml()}
  </div>`;
}
/* = Onomkeerbaar: één vraag, één vorm =========================================
   Alles wat sterren weggooit (voortgang wissen, een ster verwijderen, een
   back-up terugzetten over wat er staat) vraagt het hier, en nergens anders.
   Ze schreven hun venster eerst elk met de hand, en liepen daardoor uiteen: een
   andere titel, Weg/Blijft in het ene en een lap tekst in het andere, trofeeën
   die in de ene lijst wel en in de andere niet stonden, en geen woord over de
   back-up. De keuring houdt het zo (kern zaak ZG): showConfirm wordt alleen
   hiervandaan aangeroepen.
     titel   wat er gebeurt, als vraag ("Lotte verwijderen?") -- tekst, geen html
     weg     wat er verdwijnt (html: namen dus door esc)
     blijft  wat er blijft; leeg laat de regel weg
     ja      het woord op de rode knop
     nee     optioneel: waar "Nee, terug" heen gaat (anders: venster dicht)
     doe     doet het, en geeft { melding, terug } terug: de melding onderaan en
             hoe het teruggedraaid wordt (zie meldMetTerug)
   Staat er geen recente back-up (backupOud), dan staat er een amberen regel
   onder, met "Eerst maken": dat maakt hem meteen, zonder de vraag te verlaten. */
function gevaarVraag({ titel, weg, blijft, ja, nee, doe }) {
  showConfirm(titel, '', ja, () => {
    const { melding, terug } = doe();
    if (melding) meldMetTerug(melding, terug);   // geen melding: het ging niet door
  });
  $('confirm-body').innerHTML = `<div class="gv-lijst"><div><b>Weg:</b> ${weg}</div>`
    + (blijft ? `<div><b>Blijft:</b> ${blijft}</div>` : '') + '</div>'
    + (profileKeys().length && backupOud() ? `<button class="gv-backup" id="gv-backup" type="button">`
      + `<span aria-hidden="true">🗄️</span><span class="gv-wanneer">${backupDagen() === null ? 'Geen back-up' : `Back-up ${backupWanneer().replace(' geleden', '')} oud`}</span>`
      + '<b>Eerst maken ›</b></button>' : '');
  const bk = $('gv-backup');
  if (bk) bk.onclick = () => {
    sndClick();
    exportData();
    bk.outerHTML = '<div class="gv-backup klaar"><span aria-hidden="true">✓</span><span class="gv-wanneer">Back-up gemaakt</span></div>';
  };
  if (nee) $('confirm-no').onclick = nee;
}
/* De melding na iets onomkeerbaars, met "↶ Terug" erin. Onderaan, en niet op
   de gewone plek bovenin: daar viel hij over de tabs of over de rij van de ster
   die er nog staat. TERUG_DUUR lang; daarna is het echt weg. terug() zet alleen
   de gegevens terug -- opslaan en opnieuw tekenen gebeurt hier, voor elk scherm
   waar je dan toevallig staat. */
const TERUG_DUUR = 6000;
function meldMetTerug(melding, terug) {
  showToast(`${melding}<button class="toast-terug" type="button">↶ Terug</button>`, null, null, null, TERUG_DUUR);
  const t = $('toast');
  t.classList.add('onder', 'met-knop');
  t.querySelector('.toast-terug').onclick = () => {
    sndClick();
    hideToast();
    terug();
    save();
    if ($('screen-settings').classList.contains('active')) { renderSettings(); settingsToTop(); }
    renderProfiles();
  };
}
// "Sem", "Sem en Noor", "Sem, Noor en Lina"
function opsomming(woorden) {
  return woorden.length < 2 ? woorden.join('') : woorden.slice(0, -1).join(', ') + ' en ' + woorden[woorden.length - 1];
}
/* HET BLAD VAN ÉÉN STER -- een tik op haar naam in de kop (zie renderWie).
   Wie ze is (meisje of jongen, de naam) en, onder een lijn, de twee onomkeerbare
   dingen. Hier stond eerst een derde tabblad "✏️" naast Voortgang en Oefeningen;
   maar die twee zeggen hoe het gaat en wat ze oefent, en dit doe je zelden. Haar
   naam aantikken om hem te veranderen is een gebaar dat een ouder al kent.
   "Hoe speelt ze?" (tellen of rekenen) staat hier ook, met dezelfde twee
   helften als op het maakformulier: net als meisje of jongen kies je het één
   keer en verander je het zelden. Wisselen kost niets -- elke modus houdt zijn
   eigen instellingen -- dus er komt geen "weet je het zeker" tussen.
   Het blad staat in het gewone bevestigingsvenster, net als het blad "als app".
   Onderaan, onder een lijn, de twee onomkeerbare dingen als rijen. Ze zeggen
   allebei wat er blíjft ("Alles op nul, Lotte blijft" tegen "Weg van dit
   toestel"): dat is precies het verschil tussen de twee. Een tik vervangt het
   blad door één vraag (gevaarVraag); "Nee, terug" brengt je terug in haar blad. */
function wieBladHtml(p) {
  return `<div class="settings-sheet wie-blad">
    <div class="wb-pop" aria-hidden="true">${avatarSVG(p, 64)}</div>
    <div class="chip-row mode-row" id="set-base" role="group" aria-label="Meisje of jongen">${BASE_CHOICES.map(b =>
      `<button class="chip gestapeld${baseOf(p) === b.id ? ' on' : ''}" data-v="${b.id}">`
      + `<span class="mc-ico" aria-hidden="true">${b.emoji}</span><span class="mc-label">${b.name}</span></button>`).join('')}</div>
    <div class="name-edit-wrap"><input type="text" id="set-name" aria-label="Naam" value="${esc(p.name)}" maxlength="12" enterkeyhint="done"><span class="name-edit-ico" aria-hidden="true">✏️</span></div>
    <div class="set-field wb-modus"><div class="lbl">Hoe speelt <span class="set-naam">${esc(p.name)}</span>?</div>
      <div class="chip-row mode-row" id="set-track" role="group" aria-label="Tellen of rekenen">${[['count', '🧸', 'Leren tellen'], ['math', '🧮', 'Rekenen']].map(([v, ico, woord]) =>
        `<button class="chip gestapeld${(p.settings.track === 'count') === (v === 'count') ? ' on' : ''}" data-v="${v}">`
        + `<span class="mc-ico" aria-hidden="true">${ico}</span><span class="mc-label">${woord}</span></button>`).join('')}</div></div>
    <!-- twee rijen in rode letters: ze zeggen wat er gebeurt en openen elk één
         vraag (gevaarVraag). Geen openklapper meer ervoor -- die herhaalde
         dezelfde uitleg als de vraag erachter, en klapte het blad open tot de knop
         op een smalle telefoon onder de rand viel. -->
    <div class="wb-gevaar">
      <button class="gear-item" id="set-reset" type="button"><span class="gi-ico" aria-hidden="true">🔄</span>`
        + `<span class="gi-label">Voortgang wissen<span class="gi-sub">Alles op nul, <span class="set-naam">${esc(p.name)}</span> blijft</span></span>`
        + `<span class="gi-pijl" aria-hidden="true">›</span></button>
      <button class="gear-item" id="set-delete" type="button"><span class="gi-ico" aria-hidden="true">🗑️</span>`
        + `<span class="gi-label"><span class="set-naam">${esc(p.name)}</span> verwijderen<span class="gi-sub">Weg van dit toestel</span></span>`
        + `<span class="gi-pijl" aria-hidden="true">›</span></button>
    </div>
  </div>`;
}
function openWieBlad() {
  const p = setKey && db.profiles[setKey];
  if (!p) return;
  $('confirm-title').textContent = '';
  $('confirm-body').innerHTML = wieBladHtml(p);
  $('confirm-actions').innerHTML = '<button class="btn small purple" id="wie-klaar">Klaar</button>';
  $('wie-klaar').onclick = closeConfirmModal;
  bindWie(p);
  $('confirm-modal').classList.add('open');
  syncBackGuard();
}
/* Het overzicht: waar ⚙️ opent. Bovenaan elke ster als één rij, met hoe het
   gaat met hetzelfde label als het leerpad op Voortgang (vgLabel) -- wie
   alleen even wil kijken, ziet het hier al voor alle kinderen tegelijk. Een tik
   opent haar pagina. "Nieuwe ster" is de laatste rij, met dezelfde gestreepte
   cirkel als de "+"-tegel op de sterrenkeuze; bij zes sterren is er geen plek
   meer, en dan staat hij er niet (openNewStar weigert dan toch).
   Daaronder, na het streepje, wat voor álle sterren geldt. */
function overzichtHtml() {
  const rij = key => {
    const p = db.profiles[key];
    /* Onder haar naam: waar ze staat en hoe ver (stapNu, dezelfde regel als op
       Voortgang); het label staat naast haar naam. Hier stond "Net begonnen · 5
       shows": het label was vaak voor elk kind hetzelfde, en het aantal shows
       zegt een ouder weinig. Zo zie je zonder door te tikken hoe het met elk
       kind gaat. Het label op de eerste regel en niet rechts: op 320 punten
       hield de stap er dan geen letter meer over. */
    /* De tweede regel zegt het in woorden: "Over het tiental · Stap 3 van 6".
       Hier stonden bolletjes achter de stap (de shows met drie sterren), en
       niemand zag wat die telden. Bij Zelf kiezen: ✋ en het eerste wat er
       aangevinkt staat, "+2" voor de rest. */
    let regel;
    if (zelfGekozen(p.settings)) {
      const z = zelfRijen(p.settings);
      regel = `<span>✋ ${z.length ? z[0].naam : ''}</span>${z.length > 1 ? ` <em>+${z.length - 1}</em>` : ''}`;
    } else {
      const nu = stapNu(p);
      regel = `<span>${nu.naam}</span>${nu.waar ? ` <em>· ${nu.waar}</em>` : ''}`;
    }
    return `<button class="ster-rij" type="button" data-key="${key}">`
      + `<span class="who-portrait" aria-hidden="true">${avatarSVG(p, 90)}</span>`
      + `<span class="sr-tekst"><span class="sr-wie"><b>${esc(p.name)}</b>${vgLabel(vgStand(p))}</span>`
      + `<small class="sr-stap">${regel}</small></span>`
      + `<span class="sr-pijl" aria-hidden="true">›</span></button>`;
  };
  const nieuw = profileKeys().length < MAX_PROFILES
    ? `<button class="ster-rij sr-nieuw" type="button" id="set-newstar"><span class="sr-plus" aria-hidden="true">＋</span><span class="sr-tekst"><b>Nieuwe ster</b></span></button>`
    : '';
  return `<div class="settings-panel">
    <div class="set-card ster-lijst" id="set-sterren">${profileKeys().map(rij).join('')}${nieuw}</div>
    <div class="sheet-rule"><span>Voor alle sterren</span></div>
    ${appWideCardsHtml()}${ouderVoetHtml()}
  </div>`;
}

// Feedback wanneer een meerkeuze-chip niet uit mag (de laatste blijft altijd aan).
function blockedMinOne(el) {
  el.classList.remove('shake');
  void el.offsetWidth;
  el.classList.add('shake');
  showToast('Minstens 1', null, null, null, 1500);
}
// gewone instellingen slaan meteen op -- geen aparte "Opslaan"-knop nodig,
// alleen een kort, subtiel pilletje in de kop dat het bevestigt
// Bij een wissel van onderdeel bovenaan beginnen: van een lang paneel naar een
// kort paneel landde je anders halverwege. Twee keer, want de nieuwe inhoud staat
// er pas na de hertekening.
function settingsToTop() {
  const el = $('screen-settings');
  if (!el) return;
  el.scrollTop = 0;
  requestAnimationFrame(() => { el.scrollTop = 0; });
  ouderScroll();          // bovenaan = de doorschijnende plaat
}
/* De plaat van de kop van het ouderdeel wordt dekkend zodra er kaarten onderdoor
   schuiven (zie #screen-settings.gescrold in het stijlblad); van maat verandert
   hij niet. Dezelfde drempel van 4px als in de trofeeënkast (kastScroll) -- op 0
   wisselt hij bij het minste duimtrilletje heen en weer -- en dezelfde rAF-rem,
   want scroll vuurt vaker dan er beeldjes zijn. */
function ouderScroll() { rafKlem(ouderGescrold); }
function ouderGescrold() { gescrold($('screen-settings')); }
/* Elke keuze in het ouderdeel wordt meteen bewaard; er is geen Opslaan-knop.
   Hier flitste eerst na elke tik een groen "✓ Opgeslagen" rechtsboven. Dat is
   weg: de keuze die oplicht ís de bevestiging (zoals in de instellingen van een
   telefoon), en de rechterkop is nu van ▶.

   ▶ rechtsboven: meteen spelen als het kind dat je net bekeek. Het spiegelbeeld
   van ← linksboven, dat terug naar het keuzescherm gaat -- waar je dan dat kind
   weer moest opzoeken en aantikken. Dit is precies die tik (selectProfile),
   zonder de omweg. Goud, want goud is spelen. */
function speelAlsGekozen() {
  if (!setKey || !db.profiles[setKey]) return;
  save();
  selectProfile(setKey);
}
function speelAlsKnop(p) {
  const b = $('speel-als');
  if (!b) return;
  b.hidden = !p;
  if (!p) return;
  b.setAttribute('aria-label', 'Speel als ' + p.name);
  b.title = 'Speel als ' + p.name;
}
// De twee onderdelen van één ster. Waarde = staat, label = wat er staat.
const SET_TABS = [['voortgang', 'Voortgang'], ['oefenen', 'Oefeningen']];

/* De kop van één ster: haar portret en haar naam, tussen ← en ▶ in. Hier stond
   eerst een scrollende rij met álle sterren plus een "+", om van kind te
   wisselen zonder terug te gaan. Dat wisselen doet nu het overzicht, één ← terug,
   en de kop zegt nog maar één ding: over wie dit gaat.
   Portret, naam en ✏️ zijn samen één knop (#settings-wie, een pil): een tik
   opent haar blad (openWieBlad). Groot genoeg om te raken, en "tik op de naam om
   hem te veranderen" hoeft niemand uitgelegd te worden.
   renderSettings loopt bij élke tik op een schakelaar of chip; de pop wordt
   alleen opnieuw getekend als er iets aan veranderde (zelfde reden als vroeger
   bij de rij: op een trage tablet was dat het dure deel). */
let lastWieHtml = null;
function renderWie(p) {
  const html = `<span class="who-portrait" aria-hidden="true">${avatarSVG(p, 65)}</span>`
    + `<span class="wie-naam">${esc(p.name)}</span><span class="wie-pen" aria-hidden="true">✏️</span>`;
  if (html === lastWieHtml && $('settings-wie').childElementCount) return;
  lastWieHtml = html;
  $('settings-wie').innerHTML = html;
  $('settings-wie').setAttribute('aria-label', p.name + ' aanpassen');
}

/* Niveau 2 -- wát: Voortgang | Oefeningen, twee even brede helften. Bewust
   zonder emoji: rustiger, en de iconen staan al op de kaartkoppen, waar ze iets
   betekenen. Hier stond eerst nog een smal derde vakje (eerst "⋯" met de back-up
   eronder, daarna "✏️"); wie ze is staat nu achter haar naam in de kop. */
function renderSectionTabs() {
  const t = $('settings-subtabs');
  t.innerHTML = SET_TABS.map(([v, label]) =>
    `<button class="${setTab === v ? 'on' : ''}" role="tab" aria-selected="${setTab === v}" data-t="${v}">${label}</button>`).join('');
  t.querySelectorAll('button').forEach(b => b.onclick = () => {
    if (b.dataset.t === setTab) return;
    sndClick(); setTab = b.dataset.t; renderSettings(); settingsToTop();
  });
}

function renderSettings() {
  // De selectie kan naar een verdwenen ster wijzen (net verwijderd, of een import
  // met andere sleutels): dan terug naar het overzicht.
  if (setKey && !db.profiles[setKey]) setKey = null;
  const p = setKey ? db.profiles[setKey] : null;
  // Op het overzicht (en zonder sterren) is er geen "wie" en geen "wat daarover";
  // dan staat de titel er, zonder tabbladen en zonder ▶.
  $('screen-settings').classList.toggle('met-ster', !!p);
  $('settings-wie').style.display = p ? '' : 'none';
  $('settings-subtabs').style.display = p ? '' : 'none';
  speelAlsKnop(p);
  if (!p) {
    lastWieHtml = null;
    $('settings-wie').innerHTML = '';
    $('settings-subtabs').innerHTML = '';
    $('settings-body').innerHTML = profileKeys().length ? overzichtHtml() : beheerEmptyHtml();
    bindSettings(null, null);
    return;
  }
  renderWie(p);
  renderSectionTabs();
  const s = p.settings;
  $('settings-body').innerHTML = setTab === 'oefenen' ? oefenenPanelHtml(p, s) : statsPanelHtml(p);
  bindSettings(p, s);
}

/* Elk onderdeel toont maar een déél van de bedieningen, dus alles wordt alleen
   gebonden als het er ook echt staat. Vijf regels deden dat hiervoor niet
   ($('set-name') e.d. zonder controle) -- die wierpen meteen een TypeError zodra
   een paneel ze niet bevat, waarna de rest van de bindingen stilletjes wegviel. */
/* De bediening bij oefenGroups, gedeeld door het ouderdeel en het maakformulier.

   p mag null zijn: bij het maken bestáát er nog geen ster om countTrack op bij
   te stellen (defaultProfile leidt die straks zelf af uit opts.stage).
   done(id) is wat er ná een geslaagde wijziging moet gebeuren -- opslaan +
   hertekenen in het ouderdeel, alleen hertekenen op het maakformulier -- en
   krijgt de groep mee, zodat de aanroeper kan zien wát er veranderde.
   Een handler die de wijziging wéigert geeft false terug; dan volgt er geen
   done() (de "kies er minstens 1"-schud sloeg het opslaan hiervoor ook over). */
/* De lijnen van de ladder glijden naar hun nieuwe plek. Na een tik wordt het
   paneel opnieuw opgebouwd, dus de oude lijn bestaat dan niet meer: vóór de tik
   onthouden we waar elke lijn stond (ten opzichte van de ladder, want de
   stappen zelf bewegen niet -- zie oefenGroups), en na de opbouw laten we de
   nieuwe lijn van daar naar zijn plek schuiven. */
let lijnGlij = null;
const lijnKant = l => l.classList.contains('boven') ? 'vanaf' : 'tot';
function lijnPlekken(ladder) {
  const top = ladder.getBoundingClientRect().top, plek = {};
  // op kant en niet op woord: "tot" kan "tot 20" heten, en dan glijdt hij nog steeds
  ladder.querySelectorAll('.fl-lijn').forEach(l => { plek[lijnKant(l)] = l.getBoundingClientRect().top - top; });
  return plek;
}
/* Welke lijn verhuist een tik op rij v, met "vanaf" op lo en "tot" op hi?
   Eén regel voor beide ladders (tellen en rekenen), zodat ze hetzelfde doen:
   boven de band "vanaf", eronder "tot", erbinnen de dichtste (even ver: "tot"),
   en op de rij van "vanaf" zelf "tot" -- dan wordt de band die ene rij, waar
   die tik anders niets deed. Geeft 'vanaf' of 'tot'. */
function dichtsteLijn(v, lo, hi) {
  return v < lo || (v > lo && v <= hi && v - lo < hi - v) ? 'vanaf' : 'tot';
}
function bindOefenChips(s, p, pfx, done) {
  const bind = (id, fn) => {
    const el = $((pfx || '') + id);
    if (el) el.querySelectorAll('.chip').forEach(c => c.onclick = () => {
      if (el.classList.contains('naad')) lijnGlij = { id: el.id, plek: lijnPlekken(el) };
      if (fn(c) !== false) done(id);
    });
  };
  const glij = lijnGlij && $(lijnGlij.id);
  if (glij && !motionOff()) {
    const nu = lijnPlekken(glij);
    glij.querySelectorAll('.fl-lijn').forEach(l => {
      const d = lijnGlij.plek[lijnKant(l)] - nu[lijnKant(l)];
      if (!d) return;
      l.animate([{ transform: `translateY(${d}px)` }, { transform: 'none' }],
        { duration: 160, easing: 'cubic-bezier(.2, .8, .2, 1)' });
    });
  }
  if (glij) lijnGlij = null;
  // meerkeuze-chips (aan/uit) -- de laatst overgebleven mag niet uit (er moet altijd
  // iets geoefend worden); dat blokkeren gebeurde eerst stilletjes, nu met een
  // duidelijke schud + tekstje zodat het niet als "kapot" aanvoelt
  // + − en × ÷: de laatste van een thema blijft aan (een thema uitzetten gaat bovenaan)
  const opTik = c => {
    const v = c.dataset.v, eigen = THEMAS.find(t => t.ops && t.ops.includes(v)).ops;
    if (s.ops.includes(v)) {
      if (s.ops.filter(o => eigen.includes(o)).length > 1) s.ops = s.ops.filter(o => o !== v);
      else return blockedMinOne(c), false;
    } else s.ops.push(v);
  };
  bind('set-ops', opTik);
  bind('set-tafelops', opTik);
  // de thema's (zie themaZet): het laatste blijft aan
  bind('set-themas', c => {
    if (!themaZet(s, c.dataset.v, !themaAan(s, c.dataset.v))) return blockedMinOne(c), false;
    rijenKiesStart(s, p);
  });
  bind('set-tables', c => {
    const v = parseInt(c.dataset.v, 10);
    if (s.tables.includes(v)) {
      if (s.tables.length > 1) s.tables = s.tables.filter(t => t !== v);
      else return blockedMinOne(c), false;
    } else s.tables.push(v);
  });
  // enkelkeuze-chips
  bind('set-mode', c => {
    s.mode = c.dataset.v;
    if (p) s.grensTipBasis = grensDrieSterren(p);   // ook een antwoordstap telt opnieuw
  });
  bind('set-perlevel', c => { s.perLevel = parseInt(c.dataset.v, 10); });
  /* Leerpad of Zelf kiezen (zie themaKaartHtml). Naar Zelf kiezen: is er nog
     niets aangevinkt, dan staat de stap waar ze nu is al aan (kiesStart, of de
     fase van nu), en een toast zegt welke -- zo begint de lijst nooit leeg.
     Wat er al eens aangevinkt was, blijft. Terug naar het leerpad: ze staat
     waar ze stond, want p.pad en countTrack zijn niet aangeraakt. */
  bind('set-modus', c => {
    const vrij = c.dataset.v === 'vrij';
    if (vrij === zelfGekozen(s)) return false;
    if (!vrij) { delete s.modus; return; }
    s.modus = 'vrij';
    s.missNum = s.chain3 = true;   // overslaan was iets van het leerpad
    rijenKiesStart(s, p);
    const count = s.track === 'count';
    const had = count ? kiesFasen(s).length : kiesGekozen(s).length;
    if (had || !p) return;
    if (count) s.kiesFasen = [countLiveStage(p)];
    else s.kies = kiesStart(p);
    const eerste = zelfRijen(s)[0];
    if (eerste) showToast(`✓ ${eerste.naam} · daar was ${esc(p.name)}`);
  });
  // Zelf kiezen: een vinkje aan of uit. De laatste blijft aan -- er moet iets te spelen zijn.
  const vink = (lijst, v, geldig) => {
    const aan = lijst.filter(x => geldig.includes(x));
    if (!aan.includes(v)) return aan.concat(v);
    return aan.length > 1 ? aan.filter(x => x !== v) : null;
  };
  bind('set-kies', c => {
    const nu = vink(s.kies || [], c.dataset.v, kiesRijen(s).map(r => r.id));
    if (!nu) return blockedMinOne(c), false;
    s.kies = nu;
  });
  THEMA_ERBIJ.forEach(k => bind(`set-kies${k}`, c => {
    const L = LADDERS[k], nu = vink(s[L.kies] || [], c.dataset.v, L.pad.map(r => r.id));
    if (!nu) return blockedMinOne(c), false;
    s[L.kies] = nu;
  }));
  bind('set-kiesfasen', c => {
    const nu = vink(s.kiesFasen || [], parseInt(c.dataset.v, 10), Array.from({ length: COUNT_STAGE_MAX }, (_, i) => i + 1));
    if (!nu) return blockedMinOne(c), false;
    s.kiesFasen = nu;
  });
  // telmodus-instellingen
  /* De faseladder: een tik verhuist de dichtstbijzijnde lijn naar die fase.
     Welke lijn dat is zegt dichtsteLijn. Daarna doet het wat de twee losse
     kiezers hiervoor deden: de start tilt het kind mee omhoog, de grens houdt
     het tegen. */
  bind('set-fase', c => {
    const v = parseInt(c.dataset.v, 10);
    const top = COUNT_STAGE_MAX;                       // dezelfde klem als de ladder
    const lo = Math.min(Math.max(1, s.stage || 1), top);
    const hi = Math.min(Math.max(lo, s.stageMax || top), top);
    const vanaf = dichtsteLijn(v, lo, hi) === 'vanaf';
    if (vanaf) {
      s.stage = v;
      if (s.stageMax < v) s.stageMax = v;               // plafond mag niet onder de start
    } else {
      s.stageMax = v;
      if (s.stage > v) s.stage = v;                     // start mag niet boven het plafond
    }
    telPlafondOpnieuw(p);                               // de tip telt opnieuw (zie telTip)
    if (p) {
      if (!p.countTrack) p.countTrack = { stage: s.stage, rung: 0, streak: 0, seen: 0, acc: 0.5 };
      const st = vanaf ? Math.max(p.countTrack.stage, v) : p.countTrack.stage;
      p.countTrack.stage = Math.min(st, countMaxStage(s)); // live-stand binnen bereik
    }
  });
  /* Het leerpad van rekenen (zie oefenGroups): precies zoals de faseladder
     hierboven -- een tik verhuist de lijn die dichtsteLijn zegt naar die rij,
     en een grijze rij eronder haalt "tot" erheen. "tot" is ook de grens van de getallen: padTotOp zet die op het blok
     van de rij (tot 10, 20, 100), met wennen als hij omhoog gaat. Zonder plus en
     min is er geen "tot" en verhuist alleen "vanaf".
     Haar plek op het pad blijft (padNu): "vanaf" tilt haar hoogstens mee omhoog. */
  bind('set-startstap', c => {
    const v = parseInt(c.dataset.v, 10);
    const { rijen, later } = padRijen(s);
    const r = rijen.concat(later)[v - 1];
    if (!r) return false;
    const speel = rijen.filter(x => !x.uit);
    const lo = speel.length ? rijen.indexOf(padVanafRij(s, speel)) + 1 : 1, hi = rijen.length;
    const plusMin = s.ops.includes('+') || s.ops.includes('-');
    if (plusMin && dichtsteLijn(v, lo, hi) === 'tot') {
      const max = s.max;
      s.missNum = s.chain3 = true;   // een oude save die er een oversloeg: "tot" verzetten neemt ze weer mee
      padTotOp(s, r);
      if (p && s.max !== max) s.grensTipBasis = grensDrieSterren(p);   // de tip telt opnieuw (zie grensTip)
      return;
    }
    s.padVanaf = v === 1 ? null : r.id;
  });
  /* De ladders van tafels en geld (zie LADDERS): dezelfde regel als de twee
     ladders hierboven. "vanaf" tilt haar hoogstens mee omhoog (ladderNu), en
     de twee lijnen kunnen elkaar niet kruisen. */
  Object.entries(LADDERS).forEach(([k, L]) => bind(L.id, c => {
    const v = parseInt(c.dataset.v, 10);
    if (!L.pad[v - 1]) return false;
    const { lo, hi } = ladderRijen(s, k);
    const l = s[L.lijn] = { ...s[L.lijn] };
    const id = (i, rand) => i === rand ? null : L.pad[i].id;
    if (dichtsteLijn(v, lo + 1, hi + 1) === 'vanaf') {
      l.vanaf = id(v - 1, 0);
      if (v - 1 > hi) l.tot = id(v - 1, L.pad.length - 1);
    } else {
      l.tot = id(v - 1, L.pad.length - 1);
      if (v - 1 < lo) l.vanaf = id(v - 1, 0);
    }
  }));
  bind('set-qmax', c => { s.qmax = parseInt(c.dataset.v, 10); telPlafondOpnieuw(p); });
  bind('set-memory', c => { s.memory = (c.dataset.v === 'on'); });
  bind('set-repr', c => { s.repr = c.dataset.v; });
}
/* De bediening van haar blad (openWieBlad). Alleen gebonden als het blad open
   gaat, en opnieuw na elke hertekening ervan. */
function bindWie(p) {
  const on = (id, ev, fn) => { const el = $(id); if (el) el[ev] = fn; };
  on('set-name', 'oninput', e => {
    p.name = e.target.value.trim() || p.name;
    save();
    // de naam staat ook in de kop: die meteen laten meelopen, zonder hertekenen
    // (dat zou de focus uit het invulveld halen)
    const lbl = $('settings-wie').querySelector('.wie-naam');
    if (lbl) lbl.textContent = p.name;
    lastWieHtml = null;
    // en in het blad zelf, dat haar ook bij naam noemt (.set-naam)
    document.querySelectorAll('#confirm-body .set-naam').forEach(n => { n.textContent = p.name; });
    // en in wat ▶ rechtsboven voorleest
    speelAlsKnop(p);
  });
  /* Enter betekent "klaar met dit veld", net als op het maakformulier (zie daar):
     het toetsenbord gaat weg en de kaarten eronder zijn weer te zien. Er wordt
     niets verzonden -- de naam is al opgeslagen bij elke aanslag -- dus dit is
     alleen de uitgang die een telefoontoetsenbord zelf aanbiedt en die hier
     eerder in het niets viel. */
  on('set-name', 'onkeydown', e => {
    if (e.key !== 'Enter' || e.isComposing) return;
    e.preventDefault();
    e.target.blur();
  });
  on('set-reset', 'onclick', () => {
    sndClick();
    gevaarVraag({
      titel: `Voortgang van ${p.name} wissen?`,
      weg: 'alle diamanten, sterren, trofeeën en spulletjes.',
      blijft: `${esc(p.name)} zelf: naam, figuur, startoutfit en oefeninstellingen.`,
      ja: 'Ja, wissen',
      nee: openWieBlad,                       // nee: terug in haar blad, niet ernaast
      doe: () => {
        // Wissen raakt de voortgang, niet wie ze is en niet hoe ze oefent: haar
        // startoutfit, plek in de rij én álle instellingen gaan mee. Dat gold
        // eerder alleen voor de telmodus -- in de rekenmodus vielen bewerkingen,
        // bereik, tafels, antwoordmethode en de extra uitdagingen stilletjes terug
        // op de standaardwaarden, terwijl de waarschuwing dat niet zei.
        const dress = p.startDress || p.equipped.dress || 'dress_roze';
        // settings kent geen haar en geen basisfiguur, dus zonder dit werd een
        // bruinharige ster blond en een jongen een meisje
        const opts = { ...p.settings, hair: p.startHair || 'hair_blond', base: p.base };
        const key = setKey;
        db.profiles[key] = defaultProfile(p.name, dress, opts);
        db.profiles[key].order = p.order;   // plek in de rij behouden na een reset
        save(); renderSettings();
        // p zelf is niet aangeraakt: er staat een nieuw profiel op haar plek
        return { melding: '✓ Voortgang gewist', terug: () => { db.profiles[key] = p; } };
      },
    });
  });
  /* Meisje of jongen, ook na het maken. Op het maakformulier is dat de enige vraag
     zonder voorkeuze, en een verkeerde tik was daarna nergens meer recht te zetten
     dan door de ster te verwijderen -- met al haar voortgang. Haar en kleren gaan
     mee naar de andere figuur, net als in het voorbeeld van het formulier. */
  /* Tellen of rekenen: wisselen tussen de rekenshow en de lees-vrije telmodus
     (het maakformulier heeft zijn eigen #newstar-track). Oefeningen eronder
     schakelt mee om, en het blad blijft open. */
  const modus = $('set-track');
  if (modus) modus.querySelectorAll('.chip').forEach(c => c.onclick = () => {
    const s = p.settings;
    if (s.track === c.dataset.v) return;
    sndClick();
    s.track = c.dataset.v;
    telPlafondOpnieuw(p);
    if (s.track === 'count' && !p.countTrack) p.countTrack = { stage: s.stage, rung: 0, streak: 0, seen: 0, acc: 0.5 };
    save();
    renderSettings();
    openWieBlad();
  });
  const basis = $('set-base');
  if (basis) basis.querySelectorAll('.chip').forEach(c => c.onclick = () => {
    if (p.base === c.dataset.v) return;
    sndClick();
    p.base = c.dataset.v;
    save();
    renderSettings();      // haar portret in de kop
    openWieBlad();         // en het blad zelf, met de nieuwe figuur en keuze
  });
  on('set-delete', 'onclick', () => {
    sndClick();
    const andere = profileKeys().filter(k => k !== setKey).map(k => esc(db.profiles[k].name));
    gevaarVraag({
      titel: `${p.name} verwijderen?`,
      weg: `${esc(p.name)}, met alle diamanten, sterren, trofeeën en spulletjes.`,
      // de laatste ster: dan blijft er niets, en dat hoeft geen regel te krijgen
      blijft: andere.length ? opsomming(andere) + '.' : '',
      ja: 'Ja, verwijderen',
      nee: openWieBlad,
      doe: () => {
        const key = setKey;
        delete db.profiles[key];
        if (cur === key) cur = null;         // niet met een verdwenen ster verder spelen
        setKey = null;                       // terug naar het overzicht, waar de anderen staan
        save();
        if (profileKeys().length) { renderSettings(); settingsToTop(); }
        else closeSettings();                // laatste ster weg -> terug naar het welkomscherm
        return {
          melding: `✓ ${esc(p.name)} is verwijderd`,
          terug: () => {
            // in die paar tellen kan er een nieuwe ster op haar sleutel gekomen zijn
            const k = db.profiles[key] ? nextProfileKey() : key;
            db.profiles[k] = p;
            // stond Voor ouders nog open, dan weer op haar pagina, waar het begon
            if ($('screen-settings').classList.contains('active')) setKey = k;
          },
        };
      },
    });
  });
}
function bindSettings(p, s) {
  const bind = (id, fn) => { const el = $(id); if (el) el.querySelectorAll('.chip').forEach(c => c.onclick = () => fn(c)); };
  const on = (id, ev, fn) => { const el = $(id); if (el) el[ev] = fn; };
  // de tip in Voortgang (zie grensTip): dezelfde instelling als op Oefeningen, met één tik
  on('grens-tip-ja', 'onclick', e => {
    sndClick();
    const d = e.currentTarget.dataset;
    if (d.soort === 'mode') s.mode = d.v;
    else grensOmhoog(s, parseInt(d.v, 10));
    s.grensTipBasis = grensDrieSterren(p);
    save();
    renderSettings();
  });
  // en die van de telmodus (zie telTip): de tip weet zelf wat de volgende stap is
  on('tel-tip-ja', 'onclick', () => {
    const tt = telTip(p);
    if (!tt) return;
    sndClick();
    tt.doe(p);
    telPlafondOpnieuw(p);
    save();
    renderSettings();
  });
  // "Aanpassen ›" op het leerpad: naar dezelfde ladder op Oefeningen, midden in beeld
  const naarLadder = (...ids) => () => {
    sndClick();
    setTab = 'oefenen';
    renderSettings();
    const lad = ids.map(id => $(id)).find(Boolean);
    if (lad) requestAnimationFrame(() => lad.scrollIntoView({ block: 'center' }));
  };
  on('leerpad-aanpas', 'onclick', naarLadder('set-startstap', 'set-fase', 'set-kies', 'set-kiesfasen', 'set-tables', 'set-kiesgeld', 'set-kiesklok', 'set-kieskalender', 'set-kieslijn'));
  on('tafel-aanpas', 'onclick', naarLadder('set-tafelpad'));
  on('geld-aanpas', 'onclick', naarLadder('set-geldpad'));
  on('klok-aanpas', 'onclick', naarLadder('set-klokpad'));
  // De velden zelf staan óók op het maakformulier; de bediening is gedeeld.
  // Het maakformulier heeft niets op te slaan, dus wat er ná een wijziging
  // gebeurt komt van de aanroeper (hier: opslaan + hertekenen).
  bindOefenChips(s, p, '', () => { save(); renderSettings(); });
  on('set-newstar', 'onclick', () => openNewStar('settings'));
  // het geluid aan, vanaf de notitie in Voortgang (zie stemNotitie): dezelfde
  // schakelaar als op het overzicht, en dan staat de notitie er niet meer
  on('stem-aan', 'onclick', () => { if (!db.sound) toggleSound(); renderSettings(); });
  on('set-sound', 'onclick', toggleSound);
  on('set-alsapp', 'onclick', () => openAppBlad(false));
  on('set-backup', 'onclick', openBackupBlad);
  on('oz-code', 'onclick', () => openCodeBlad(false));
  // het overzicht: een tik op een ster opent haar pagina
  document.querySelectorAll('#set-sterren .ster-rij[data-key]').forEach(b => {
    b.onclick = () => openSter(b.dataset.key);
  });
  on('set-export', 'onclick', exportData);
  on('set-deel', 'onclick', deelOver);
  on('set-over', 'onclick', naarOver);
  on('set-import', 'onclick', () => { const f = $('set-import-file'); if (f) f.click(); });
  on('set-import-file', 'onchange', e => {
    if (e.target.files[0]) importData(e.target.files[0]);
    e.target.value = '';   // zelfde bestand opnieuw kunnen kiezen
  });
}

// Alle profielen + instellingen als JSON-bestand downloaden.
function exportData() {
  /* Wanneer de laatste back-up was, voor de regel in de back-upkaart. Hij staat
     in db, dus hij reist mee ín het bestand: wie dat later terugzet, ziet de
     datum van díe back-up -- en dat klopt ook. Een tik op de knop telt als een
     back-up; of het bestand echt bewaard werd kan een webpagina niet weten. */
  db.backupAt = new Date().toISOString();
  save();
  opslagVasthouden(true);
  const data = JSON.stringify(db, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  // tot op de seconde: met alleen een datum overschreef een tweede back-up op
  // dezelfde dag de eerste in de downloadmap
  const stamp = new Date().toISOString().slice(0, 19).replace('T', '-').replace(/:/g, '');
  a.href = url;
  a.download = `rekensterren-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  // de regel bovenaan de kaart meteen bijwerken, zonder het hele paneel te herbouwen
  const stand = $('set-backup-stand');
  if (stand) stand.outerHTML = backupStandHtml();
  const blad = $('bb-stand');
  if (blad) blad.outerHTML = backupBladStandHtml();
}

/* Is dit een save van óns? Hiervoor stond hier "heeft p1 én p2". Die sleutels
   zijn niet meer heilig: een familie kan één ster hebben, of vijf, of er net
   eentje verwijderd hebben. Dus kijken we naar de vórm van elk profiel in plaats
   van naar de namen van de sleutels -- en meteen streng genoeg dat migrate() er
   verderop niet op stukloopt. Een lege back-up (familie wiste iedereen) mag ook;
   data.sound is dan het merkteken dat dit een bestand van óns is.
   Gedeeld door het back-upbestand en overzetten (= Overzetten): één keuring. */
function backupVormOk(data) {
  const profs = data && typeof data === 'object' ? data.profiles : null;
  const okShape = p => !!p && typeof p === 'object' && typeof p.name === 'string'
    && Array.isArray(p.owned) && !!p.stars && typeof p.stars === 'object'
    && !!p.equipped && typeof p.equipped === 'object';
  return !!profs && typeof profs === 'object' && !Array.isArray(profs)
    && Object.values(profs).every(okShape)
    && (Object.keys(profs).length > 0 || typeof data.sound === 'boolean');
}
/* Een gekeurde save in de plaats van de huidige zetten. false = niets veranderd.
   Eerst in een lokale kopie bijwerken en pas daarna de echte db vervangen:
   migrate() kan op een beschadigd profiel gooien, en dat gebeurde hiervoor ná
   "db = data" -- dan was de app dood terwijl de opslag nog goed was. */
function backupToepassen(data) {
  const next = data;
  if (typeof next.sound !== 'boolean') next.sound = true;
  if (typeof next.haptics !== 'boolean') next.haptics = true;
  try { Object.values(next.profiles).forEach(migrate); }
  catch (e) { return false; }
  db = next;             // normalizeProfiles leest de globale db
  normalizeProfiles();
  cur = null;
  setKey = null;         // naar het overzicht: daar staan alle teruggezette sterren
  save();
  return true;
}

// Een eerder opgeslagen back-upbestand inlezen en terugzetten. Overschrijft
// ALLE huidige profielen, dus (net als bij wissen) eerst een bevestiging --
// pas ná "ja" wordt de huidige voortgang echt vervangen.
function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    let data;
    try {
      data = JSON.parse(reader.result);
      if (!backupVormOk(data)) throw new Error('ongeldig back-upbestand');
    } catch (e) {
      showNotice('Oeps!', 'Kon dit bestand niet lezen. Kies een geldig back-upbestand.');
      return;
    }
    const hier = profileKeys().map(k => esc(db.profiles[k].name));
    gevaarVraag({
      titel: 'Back-up terugzetten?',
      weg: hier.length ? `wat er nu op dit toestel staat: ${opsomming(hier)}.` : 'niets, er staan hier nog geen sterren.',
      ja: 'Ja, terugzetten',
      doe: () => {
        const oud = db;          // backupToepassen zet een nieuwe db neer; deze blijft heel
        if (!backupToepassen(data)) {
          showNotice('Oeps!', 'Dit back-upbestand is beschadigd; er is niets veranderd.');
          return { melding: '', terug: null };
        }
        renderSettings();
        return { melding: '✓ Back-up geladen', terug: () => { db = oud; cur = null; setKey = null; } };
      },
    });
  };
  reader.onerror = () => showNotice('Oeps!', 'Kon dit bestand niet lezen.');
  reader.readAsText(file);
}

/* ================= Het back-upblad =========================================
   Achter de rij "Back-up ›" op het overzicht van Voor ouders. Bovenaan wanneer
   de laatste was, daaronder vier tegels in twee paren:
     Bestand        Maken · Terugzetten        (exportData / importData)
     Ander toestel  Overzetten · Code invullen (= Overzetten, hieronder)
   Het tweede paar staat er alleen als overzetten kan (overzetMag). */
function backupBladStandHtml() {
  const oud = backupOud();
  const w = backupWanneer();
  const tekst = (backupDagen() === null ? 'Nog nooit een back-up gemaakt' : 'Laatste back-up: ' + w.toLowerCase())
    + ' · alles staat alleen op dit toestel';
  return `<div class="bb-stand${oud ? ' oud' : ''}" id="bb-stand">${oud ? '<span class="gi-dot" aria-hidden="true"></span>' : ''}${tekst}</div>`;
}
function openBackupBlad() {
  sndClick();
  const tegel = (id, ico, t) => `<button class="bb-tegel" id="${id}" type="button">${ico}${t}</button>`;
  $('confirm-title').innerHTML = '🗄️ Back-up';
  $('confirm-body').innerHTML = `<div class="bb-blad">${backupBladStandHtml()}
      <div class="bb-kop">Bestand</div>
      <div class="bb-tegels">${tegel('bb-maak', ozIco('maak'), 'Maken')}${tegel('bb-terug', ozIco('terug'), 'Terugzetten')}</div>`
    + (overzetMag() ? `<div class="bb-kop">Ander toestel</div>
      <div class="bb-tegels">${tegel('bb-zet', ozIco('zet'), 'Overzetten')}${tegel('bb-code', ozIco('code'), 'Code invullen')}</div>` : '')
    + '</div>';
  $('confirm-actions').innerHTML = '<button class="btn small paper" id="bb-dicht">Sluiten</button>';
  $('bb-dicht').onclick = closeConfirmModal;
  $('bb-maak').onclick = exportData;
  // het bestandsveld staat in het paneel (importInvoerHtml); de vraag erna gebruikt
  // dit venster opnieuw, dus eerst dicht
  $('bb-terug').onclick = () => { closeConfirmModal(); const f = $('set-import-file'); if (f) f.click(); };
  const z = $('bb-zet'), c = $('bb-code');
  if (z) z.onclick = openOverzetBlad;
  if (c) c.onclick = () => openCodeBlad(false);
  $('confirm-modal').classList.add('open');
  syncBackGuard();
}

/* ================= Overzetten ===============================================
   Je sterren naar een ander toestel, met een code van zes cijfers. Voor de
   iPhone vooral: de app op het beginscherm krijgt een eigen opslag, los van
   Safari, en begint dus leeg -- ook als er in Safari al weken gespeeld is. En
   voor een nieuwe telefoon of tablet.

     toestel A  "Overzetten"     -> de hele save naar de ontvanger, een code terug
     toestel B  "Code invullen"  -> de save terug, de ontvanger gooit hem weg
                "Zet op dit toestel" / "Vervangen" -> backupToepassen

   Het is een kopie, geen verhuizing: A houdt zijn sterren. Het is ook dezelfde
   save als het back-upbestand (JSON.stringify(db)), met dezelfde keuring
   (backupVormOk) en dezelfde vervanging (backupToepassen) -- er is geen tweede
   weg om sterren terug te zetten.

   DE ONTVANGER is een Cloudflare Worker (worker/overzetten.js, docs/OVERZETTEN.md):
   een code leeft een kwartier en werkt één keer, raden wordt per adres geremd,
   en er blijft niets van over. Er gaat pas iets naar buiten als een ouder hier op
   een knop tikt; een gewone start doet niets.

   overzetMag: alleen op https (de ontvanger neemt alleen rekensterren.be aan, en
   vanaf file:// is er geen herkomst). ?debug&overzet zet hem ook vanaf file://
   aan, zodat de browsertests er met een nagebootste ontvanger doorheen kunnen. */
// Een functie en geen const: overzetMag wordt al bij het opstarten gelezen
// (renderProfiles), en dit stuk staat ná de code die dat doet (CLAUDE.md, regel 0).
function overzetAdres() { return 'https://rekensterren-overzetten.maxheyrman.workers.dev/'; }
function overzetMag() {
  if (!overzetAdres()) return false;
  const q = location.search || '';
  return location.protocol === 'https:' || (/[?&]debug\b/.test(q) && /[?&]overzet\b/.test(q));
}
// Getekende iconen, in de lijn van de tegeltjes in het blad "als app". Ook een
// functie, om dezelfde reden als overzetAdres.
function ozIco(naam) {
  const i = d => `<svg class="oz-i" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  return i({
    zet: '<rect x="2" y="5" width="8" height="14" rx="2"/><rect x="14" y="5" width="8" height="14" rx="2"/><path d="M8 12h8M13.5 9.5 16 12l-2.5 2.5"/>',
    code: '<rect x="3" y="6" width="18" height="12" rx="3"/><path d="M7 12h.01M10.5 12h.01M14 12h.01M17.5 12h.01"/>',
    maak: '<path d="M12 3v11M7.5 9.5 12 14l4.5-4.5M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>',
    terug: '<path d="M12 14V3M7.5 7.5 12 3l4.5 4.5M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>',
  }[naam]);
}
const OVERZET_POLL = 3000;   // hoe vaak het toestel met de code vraagt of hij al opgehaald is

// Eén aanroep. Geeft { status, data } of gooit bij geen net. text/plain: dan is
// er geen preflight nodig (zie de Worker).
async function ozVraag(pad, body) {
  const r = await fetch(overzetAdres() + pad, {
    method: 'POST', headers: { 'Content-Type': 'text/plain' }, body, cache: 'no-store',
  });
  let data = null;
  try { data = await r.json(); } catch (e) { data = null; }
  return { status: r.status, data };
}
function ozFoutTekst(status) {
  if (status === 0) return navigator.onLine === false ? 'Geen internet' : 'Dat lukte niet. Probeer het nog eens.';
  if (status === 429) return 'Even te veel geprobeerd. Wacht tien minuten.';
  if (status === 413) return 'Te veel om over te zetten. Maak een back-upbestand.';
  return 'Dat lukte niet. Probeer het nog eens.';
}
function ozKaart(p, soort) {
  const sterren = soort === 'ok' ? '' : `<small><span aria-hidden="true">⭐</span> ${totalStarCount(p)}</small>`;
  return `<div class="oz-ster${soort ? ' ' + soort : ''}"><span class="who-portrait" aria-hidden="true">${avatarSVG(p, 90)}</span>`
    + `<b>${esc(p.name)}</b>${sterren}${soort === 'ok' ? '<span class="oz-vink" aria-hidden="true">✓</span>' : ''}</div>`;
}
// De profielen van een save, in hun eigen volgorde.
function ozProfielen(data) { return profileKeys(data.profiles).map(k => data.profiles[k]); }
function ozCodeHtml(code, soort, nu) {
  let h = `<div class="oz-code${soort ? ' ' + soort : ''}" aria-hidden="true">`;
  for (let i = 0; i < 6; i++) {
    if (i === 3) h += '<span class="oz-gat"></span>';
    h += `<span class="oz-c${i === nu ? ' nu' : ''}">${code[i] || ''}</span>`;
  }
  return h + '</div>';
}
function ozToon(titel, body, acties) {
  $('confirm-title').innerHTML = titel;
  $('confirm-body').innerHTML = `<div class="oz-blad" id="oz-blad">${body}</div>`;
  $('confirm-actions').innerHTML = acties;
  $('confirm-modal').classList.add('open');
  syncBackGuard();
}
const ozOpen = nr => { const b = $('oz-blad'); return !!b && b.dataset.nr === String(nr) && $('confirm-modal').classList.contains('open'); };
let ozNr = 0;   // elk blad een eigen nummer: een antwoord voor een gesloten blad doet niets

/* ---- Toestel A: de code tonen ---- */
function openOverzetBlad() {
  sndClick();
  const nr = ++ozNr;
  const gezichten = profileKeys().map(k => `<span class="oz-mini">${avatarSVG(db.profiles[k], 60)}</span>`).join('');
  ozToon(ozIco('zet') + ' Naar ander toestel',
    `<div class="oz-mee">${gezichten}</div>${ozCodeHtml('', 'laden')}<div class="oz-onder" id="oz-onder"></div>`,
    '<button class="btn small paper" id="oz-dicht">Sluiten</button>');
  $('oz-blad').dataset.nr = nr;
  $('oz-dicht').onclick = closeConfirmModal;
  ozVraag('zet', JSON.stringify(db)).then(
    r => {
      if (!ozOpen(nr)) return;
      if (r.status !== 201 || !r.data || !/^\d{6}$/.test(r.data.code)) { ozZetFout(nr, r.status); return; }
      ozToonCode(nr, r.data);
    },
    () => { if (ozOpen(nr)) ozZetFout(nr, 0); });
}
function ozZetFout(nr, status) {
  $('oz-blad').innerHTML = `<div class="oz-fout">${ozFoutTekst(status)}</div>`;
  $('confirm-actions').innerHTML = '<button class="btn small paper" id="oz-dicht">Sluiten</button><button class="btn small purple" id="oz-weer">Opnieuw</button>';
  $('oz-dicht').onclick = closeConfirmModal;
  $('oz-weer').onclick = openOverzetBlad;
}
function ozToonCode(nr, { code, tot, sleutel }) {
  const duur = 15 * 60 * 1000;
  const rest = Math.max(0, Math.min(duur, tot - Date.now()));
  const mee = $('oz-blad').querySelector('.oz-mee');
  $('oz-blad').innerHTML = (mee ? mee.outerHTML : '')
    + `<div role="img" aria-label="Code ${code.split('').join(' ')}">${ozCodeHtml(code)}</div>`
    // de balk loopt leeg in de tijd die nog rest: een animatie van een kwartier die
    // al (duur - rest) gevorderd is
    + `<div class="oz-tijd"><i style="animation-duration:${duur}ms;animation-delay:-${duur - rest}ms"></i></div>`
    + `<div class="oz-waar">Daar: <span class="ab-kbd">${ozIco('code')} Code invullen</span></div>`
    + '<div class="oz-wacht" aria-hidden="true"><i></i><i></i><i></i></div>';
  $('oz-blad').classList.add('met-code');
  const vraag = () => {
    if (!ozOpen(nr)) return;
    if (document.hidden) { setTimeout(vraag, OVERZET_POLL); return; }
    ozVraag('stand', JSON.stringify({ code, sleutel })).then(r => {
      if (!ozOpen(nr)) return;
      if (r.data && r.data.opgehaald) { ozOvergezet(); return; }
      if (r.data && r.data.verlopen) { ozVerlopen(); return; }
      setTimeout(vraag, OVERZET_POLL);
    }, () => setTimeout(vraag, OVERZET_POLL));
  };
  setTimeout(vraag, OVERZET_POLL);
}
function ozOvergezet() {
  $('confirm-title').innerHTML = ozIco('zet') + ' Overgezet';
  $('oz-blad').classList.remove('met-code');
  $('oz-blad').innerHTML = `<div class="oz-sterren">${profileKeys().map(k => ozKaart(db.profiles[k], 'ok')).join('')}</div>`;
  $('confirm-actions').innerHTML = '<button class="btn small purple" id="oz-dicht">Klaar</button>';
  $('oz-dicht').onclick = closeConfirmModal;
  sndClick();
}
function ozVerlopen() {
  $('oz-blad').classList.remove('met-code');
  $('oz-blad').innerHTML = '<div class="oz-fout">Deze code is verlopen.</div>';
  $('confirm-actions').innerHTML = '<button class="btn small paper" id="oz-dicht">Sluiten</button><button class="btn small purple" id="oz-weer">Nieuwe code</button>';
  $('oz-dicht').onclick = closeConfirmModal;
  $('oz-weer').onclick = openOverzetBlad;
}

/* ---- Toestel B: de code invullen ----
   Zes vakjes, met één echt invoerveld er onzichtbaar overheen: dan krijgt een
   telefoon het grote cijferklavier (inputmode numeric) en kan iOS een code uit
   een bericht voorstellen (one-time-code). Bij het zesde cijfer gaat hij meteen
   weg -- geen "Ophalen"-knop. Klopt hij niet, dan worden de vakjes rood en
   begint het volgende cijfer opnieuw. vanStart: geopend vanaf het lege
   beginscherm (dan daarheen terug, met confetti), anders vanuit Voor ouders. */
function openCodeBlad(vanStart) {
  sndClick();
  const nr = ++ozNr;
  ozToon(ozIco('code') + ' Code invullen',
    `<div class="oz-invoer">${ozCodeHtml('', '', 0)}
       <input id="oz-veld" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="one-time-code" maxlength="6" aria-label="Code van zes cijfers"></div>
     <div class="oz-onder" id="oz-onder"><div class="oz-waar">Andere toestel: <span class="ab-kbd">⚙️ › Back-up › Overzetten</span></div></div>`,
    '<button class="btn small paper" id="oz-dicht">Annuleer</button>');
  $('oz-blad').dataset.nr = nr;
  $('oz-dicht').onclick = closeConfirmModal;
  const veld = $('oz-veld');
  let fout = '', bezig = false;
  const teken = () => {
    const v = veld.value;
    const soort = fout ? 'fout' : bezig ? 'laden' : '';
    $('oz-blad').querySelector('.oz-code').outerHTML = ozCodeHtml(fout || v, soort, fout || bezig ? -1 : Math.min(v.length, 5));
  };
  veld.oninput = () => {
    if (bezig) return;
    const v = veld.value.replace(/\D/g, '').slice(0, 6);
    veld.value = v;
    if (fout) { fout = ''; $('oz-onder').innerHTML = ''; }
    teken();
    if (v.length < 6) return;
    bezig = true;
    teken();
    ozVraag('haal', JSON.stringify({ code: v })).then(
      r => {
        if (!ozOpen(nr)) return;
        bezig = false;
        let data = r.data && r.data.save;
        if (r.status === 200 && backupVormOk(data)) { veld.blur(); ozGevonden(data, vanStart); return; }
        fout = v;
        veld.value = '';
        $('oz-onder').innerHTML = `<div class="oz-fout">${r.status === 404 || r.status === 400 ? 'Klopt niet of is verlopen' : r.status === 200 ? 'Deze sterren konden niet gelezen worden' : ozFoutTekst(r.status)}</div>`;
        teken();
      },
      () => {
        if (!ozOpen(nr)) return;
        bezig = false; fout = v; veld.value = '';
        $('oz-onder').innerHTML = `<div class="oz-fout">${ozFoutTekst(0)}</div>`;
        teken();
      });
  };
  // in dezelfde tik als de knop: alleen dan opent een telefoon het klavier
  veld.focus();
}

/* Wat er in de save zit, vóór er iets verandert. De pop van elke ster met haar
   sterren; staan er op dit toestel al sterren, dan staan die er grijs onder,
   met de zin dat ze verdwijnen -- en heet de knop "Vervangen". Pas die knop zet
   de save in de plaats (backupToepassen); Annuleer laat alles staan. */
function ozGevonden(data, vanStart) {
  let kopie;
  try {
    kopie = JSON.parse(JSON.stringify(data));
    Object.values(kopie.profiles).forEach(migrate);   // de kaartjes tekenen een gemigreerde kopie
  } catch (e) {
    $('oz-onder').innerHTML = '<div class="oz-fout">Deze sterren konden niet gelezen worden</div>';
    return;
  }
  const nieuw = ozProfielen(kopie);
  const hier = profileKeys().map(k => db.profiles[k]);
  $('confirm-title').innerHTML = '<span aria-hidden="true">⭐</span> Sterren gevonden';
  $('oz-blad').innerHTML = `<div class="oz-sterren">${nieuw.map(p => ozKaart(p)).join('')}</div>`
    + (nieuw.length ? '' : '<div class="oz-waar">Er staan geen sterren in.</div>')
    + (hier.length ? `<div class="oz-vervang"><div class="oz-sterren">${hier.map(p => ozKaart(p, 'weg')).join('')}</div>`
      + '<span>Staat nu op dit toestel en verdwijnt</span></div>' : '');
  $('confirm-actions').innerHTML = '<button class="btn small paper" id="oz-dicht">Annuleer</button>'
    + `<button class="btn small purple" id="oz-ja">${hier.length ? 'Vervangen' : 'Zet op dit toestel'}</button>`;
  $('oz-dicht').onclick = closeConfirmModal;
  $('oz-ja').onclick = () => {
    closeConfirmModal();
    const oud = db;            // backupToepassen zet een nieuwe db neer; deze blijft heel
    if (!backupToepassen(data)) { showNotice('Oeps!', 'Deze sterren zijn beschadigd; er is niets veranderd.'); return; }
    if ($('screen-settings').classList.contains('active')) renderSettings();
    renderProfiles();
    // Vervangen gooit weg wat er stond, dus net als bij elke ander verlies een
    // melding met Terug (zie meldMetTerug). Het blad zelf blijft zijn eigen vorm:
    // het is geen vraag maar een voorbeeld van wat er komt.
    if (hier.length) meldMetTerug('✓ Sterren overgezet', () => { db = oud; cur = null; setKey = null; });
    else showToast('✓ Sterren overgezet');
    if (vanStart) confetti(50);
  };
}

/* ================= Op het beginscherm =======================================
   Eén kaart in Beheer, ná "Back-up & herstel": uitleg voor een ouder over hoe
   Rekensterren als app op dit toestel komt. Uitleg en niets anders -- geen knop,
   geen schakelaar, geen vraag op de kaart van het kind.

   DE BROWSER DOET HET INSTALLEREN, NIET WIJ. Chrome stelt het soms zelf voor
   (ook bij een eerste bezoek), en dat voorstel blijft precies zoals het is: er
   luistert hier met opzet niets naar beforeinstallprompt, dus er wordt niets
   tegengehouden, uitgesteld of vervangen door een eigen knop. Die knop zou
   bovendien alleen in Chromium bestaan en elders dood op het scherm staan. Wat
   de app wél kan is vertellen waar het zit als het voorstel voorbij is -- per
   soort browser, want het menu heet overal anders. inhoud.test.js zaak J kijkt
   na dat die luisteraar er ook niet stilletjes bij komt.

   NIETS HIERVAN WORDT BEWAARD. Niet in db (die gaat in zijn geheel de back-up
   in, en een terugzetting vervángt hem), en ook niet in een eigen sleutel: een
   vlag "geïnstalleerd" wordt fout zodra iemand de app weer verwijdert. Of de
   kaart er staat wordt dus elke keer opnieuw aan de browser gevraagd.

   GEÏNSTALLEERD HERKENNEN. manifest.json zet display:fullscreen, dus een
   geïnstalleerde app op Android antwoordt op (display-mode: fullscreen) en
   níét op standalone -- wie alleen naar standalone kijkt, toont deze kaart in de
   app zelf. Een browser die fullscreen niet kan valt terug op standalone of
   minimal-ui, en iOS zegt het alleen via navigator.standalone. Alle vier dus.

   HET IOS-VOORBEHOUD. Een app op het beginscherm van een iPhone of iPad krijgt
   zijn eigen opslag, los van Safari: de sterren uit Safari staan er niet in. Wie
   al gespeeld heeft, maakt dus eerst een back-up -- en daarom staat deze kaart
   vlak onder die van de back-up, en zegt de waarschuwing "hierboven". */
function speeltAlsApp(w) {
  w = w || window;
  const mm = w.matchMedia;
  const stand = m => { try { return !!(mm && mm.call(w, '(display-mode: ' + m + ')').matches); } catch (e) { return false; } };
  return stand('fullscreen') || stand('standalone') || stand('minimal-ui')
    || !!(w.navigator && w.navigator.standalone === true);
}
/* Welke uitleg past bij deze browser. Een grove indeling op de user agent, en dat
   mag: er hangt geen gedrag aan, alleen een zin, en de 'anders'-zin klopt overal.

     ios          Safari op iPhone of iPad
     ios-elders   een andere browser of een app-in-app op iOS: daar kan het
                  niet (betrouwbaar), dus eerst naar Safari
     android      Chrome op Android
     desktop      Chrome of Edge op een computer
     inapp        een ingebouwde browser (WhatsApp, Facebook, Gmail...) op Android
     anders       de rest: het menu, en anders Chrome

   Een iPad vermomt zich sinds iPadOS 13 als Mac ("Macintosh" in de user agent);
   hij verraadt zich doordat een Mac geen aanraakscherm heeft. */
function beginschermSoort(nav) {
  nav = nav || navigator;
  const ua = String(nav.userAgent || '');
  const inApp = /FBAN|FBAV|FB_IAB|Instagram|Line\/|WhatsApp|Snapchat|Pinterest|LinkedInApp|musical_ly|TikTok|GSA\/|; wv\)/.test(ua);
  const ipadAlsMac = /Macintosh/.test(ua) && (nav.maxTouchPoints || 0) > 1;
  if (/iPhone|iPad|iPod/.test(ua) || ipadAlsMac) {
    const safari = /Safari\//.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|YaBrowser|DuckDuckGo/.test(ua) && !inApp;
    return safari ? 'ios' : 'ios-elders';
  }
  if (inApp) return 'inapp';
  if (/Android/.test(ua)) {
    return /Chrome\//.test(ua) && !/SamsungBrowser|OPR\/|Firefox|EdgA|YaBrowser|UCBrowser/.test(ua) ? 'android' : 'anders';
  }
  if (/Mobi/.test(ua)) return 'anders';
  return /Chrome\/|Edg\//.test(ua) && !/OPR\//.test(ua) ? 'desktop' : 'anders';
}
// De zinnen per soort. De eerste is de uitleg; een tweede staat er los onder.
function beginschermUitleg(soort, hasStars) {
  // Alleen iets om te redden als er ook iets gespeeld is.
  const redden = kant => hasStars
    ? `Heb je al gespeeld in ${kant}? Maak dan hierboven eerst een back-up. Zet die terug nadat je Rekensterren vanaf het beginscherm hebt geopend.`
    : null;
  switch (soort) {
    case 'android': return ['Chrome stelt soms zelf voor om Rekensterren te installeren.',
      'Geen voorstel gezien? Tik op ⋮ en kies ‘App installeren’ of ‘Toevoegen aan startscherm’.'];
    case 'ios': return ['Tik in Safari op Deel en kies ‘Zet op beginscherm’.', redden('Safari')];
    case 'ios-elders': return ['Open deze pagina in Safari. Tik daar op Deel en kies ‘Zet op beginscherm’.',
      redden('deze browser')];
    case 'desktop': return ['Klik op het installeer-icoon in de adresbalk, of kies ‘App installeren’ in het menu van je browser.'];
    case 'inapp': return ['Je bekijkt deze pagina in een andere app. Open hem in Chrome om Rekensterren als app te installeren.'];
    default: return ['Kies in het menu van je browser ‘App installeren’ of ‘Toevoegen aan startscherm’. Staat dat er niet bij? Open de pagina dan in Chrome.'];
  }
}
/* Net geïnstalleerd in déze sessie. Alleen in het geheugen: het tabblad waarin
   het gebeurde draait zelf nog in de browser, dus speeltAlsApp() zegt daar nog
   nee -- maar de kaart heeft haar werk gedaan. Bij de volgende start wordt het
   gewoon weer aan de browser gevraagd. */
let beginschermNetErop = false;
/* De uitleg als kaart staat alleen nog op de lege pagina (beheerEmptyHtml). Met
   sterren is het de rij "Als app ›" op het overzicht, die het blad hieronder
   opent (appWideCardsHtml). */
function beginschermKaartHtml(hasStars) {
  if (beginschermNetErop || speeltAlsApp()) return '';
  const [uitleg, tweede] = beginschermUitleg(beginschermSoort(), hasStars);
  return `
    <div class="set-card secundair" id="set-beginscherm">
      <div class="set-card-head"><div class="ico">📲</div><div><h2>Op het beginscherm</h2><div class="sub">Rekensterren als app op dit toestel</div></div></div>
      <div class="note">${uitleg}</div>${tweede ? `
      <div class="note" style="margin-top:8px">${tweede}</div>` : ''}
    </div>`;
}
addEventListener('appinstalled', () => {
  beginschermNetErop = true;
  ['set-beginscherm', 'set-alsapp'].forEach(id => { const k = $(id); if (k) k.remove(); });
  installVoorstel = null;
  appKnopZet();
  renderGeluid();
  if ($('app-blad')) closeConfirmModal();
});

/* ================= Speel als app ============================================
   In het ouderdeel is het een rij op het overzicht, en daar komt een ouder
   zelden. Dit is de weg ernaartoe die je wél ziet: een knopje "⊞ Als app" linksboven op de
   sterrenkeuze, het spiegelbeeld van het tandwiel. Een tik opent een blad met
   de stappen voor déze browser.

   WAT EROP STAAT. "Als app", en niet "Speel als app": een kind leest "Speel"
   en tikt, en dit knopje is voor de ouder. Het teken is het vierkantje met de
   plus (#ico-erbij), omdat Safari precies dat teken naast "Zet op beginscherm"
   zet: wat de ouder hier ziet, zoekt die straks in dat menu. Eerder stond er 📲,
   en dat ziet er op elk toestel anders uit.

   WAAR, EN WAAROM DAAR. Linksboven, op dezelfde hoogte als het tandwiel. Daar
   raakt het op geen enkele schermmaat het logo, de tegels of de MAX-ster (die
   is ook een verstopte tik, zie maxPlekZet), en het blijft staan waar het staat
   bij één ster of zes. Onderaan midden lag het op een kleine telefoon over MAX,
   en daar tikken kinderen; onder de tegels schoof het mee met het raster.

   WANNEER. Alleen op de sterrenkeuze, alleen in de browser (speeltAlsApp), en
   pas vanaf het tweede bezoek: wie het spel voor het eerst opent, moet eerst
   kunnen spelen. Behalve op een iPhone of iPad zolang er nog geen ster is: daar
   krijgt de app op het beginscherm een eigen, lege opslag, dus wat er in Safari
   gespeeld is gaat niet mee (zie het blad). Vóór de eerste ster is installeren
   gratis; erna kost het een back-up. Op Android en de computer gaan de sterren
   gewoon mee, dus daar blijft het bij het tweede bezoek. "Niet nu" laat het twee weken met rust; na drie keer "Niet nu"
   komt het knopje niet meer terug. De kaart in Beheer blijft wél -- het knopje
   gaat weg, de weg niet.

   WAT HIERVAN BEWAARD WORDT. Drie getallen in een eigen sleutel (APPKNOP_KEY):
   het aantal bezoeken, tot wanneer het knopje rust, en hoe vaak er "Niet nu"
   gezegd is. Bewust niet in db: dat gaat de back-up in en een terugzetting
   vervángt hem, en dit gaat over dit toestel en niet over de sterren. En er
   staat nergens "geïnstalleerd" in -- dat wordt nog altijd elke keer aan de
   browser gevraagd, om dezelfde reden als bij de kaart.

   HET VOORSTEL VAN CHROME. Chrome geeft de pagina een beforeinstallprompt mee
   als hij hem installeerbaar vindt. Dat event wordt hier bewaard, zodat de knop
   "Installeren" in het blad in één tik het installeervenster van Chrome opent.
   Er wordt NOOIT preventDefault op gezet: Chrome toont zijn eigen voorstel dus
   precies zoals vroeger, en dit is er alleen een tweede deur naar. Elders
   (Safari, Samsung Internet, Firefox) komt het event niet, en staan er gewoon
   de stappen. inhoud.test.js zaak J kijkt na dat het bij bewaren blijft.

   ?debug. Onder ?debug blijft het knopje weg, tenzij er &appknop bij staat: de
   browsersuites openen de pagina vaak meerdere keren in dezelfde opslag, en
   dan stond er vanaf de tweede keer ineens een knop in hun beeld. */
const APPKNOP_KEY = 'rekenPopsterren_appknop';
const APPKNOP = { vanafBezoek: 2, rustDagen: 14, maxNee: 3 };
let installVoorstel = null;
addEventListener('beforeinstallprompt', e => { installVoorstel = e; });
function appKnopLees() {
  try {
    const s = JSON.parse(localStorage.getItem(APPKNOP_KEY) || 'null');
    return s && typeof s === 'object' ? s : {};
  } catch (e) { return {}; }
}
function appKnopSchrijf(s) {
  try { localStorage.setItem(APPKNOP_KEY, JSON.stringify(s)); } catch (e) { /* vol of dicht: dan maar elke keer */ }
}
// Eén bezoek per keer dat de pagina opstart -- in de app telt er niets.
(function () {
  if (speeltAlsApp()) return;
  const s = appKnopLees();
  s.bezoek = (s.bezoek | 0) + 1;
  appKnopSchrijf(s);
})();
// Mag er iets over "als app" staan: niet in de app zelf, en niet net na installeren.
function appUitlegNodig() { return !beginschermNetErop && !speeltAlsApp(); }
function appKnopTonen(nu) {
  if (!appUitlegNodig()) return false;
  const zoek = location.search || '';
  if (zoek.indexOf('debug') !== -1 && zoek.indexOf('appknop') === -1) return false;
  const s = appKnopLees();
  const iosLeeg = /^ios/.test(beginschermSoort()) && profileKeys().length === 0;
  if ((s.bezoek | 0) < APPKNOP.vanafBezoek && !iosLeeg) return false;
  if ((s.nee | 0) >= APPKNOP.maxNee) return false;
  return !(s.rustTot > (nu || Date.now()));
}
// Het knopje volgt het scherm: show() en renderProfiles roepen dit aan.
function appKnopZet() {
  const k = $('app-knop');
  if (!k) return;
  const opLanding = $('screen-profile').classList.contains('active');
  k.style.display = opLanding && appKnopTonen() ? '' : 'none';
}
function appKnopNietNu() {
  const s = appKnopLees();
  s.nee = (s.nee | 0) + 1;
  s.rustTot = Date.now() + APPKNOP.rustDagen * 24 * 3600 * 1000;
  appKnopSchrijf(s);
  closeConfirmModal();
  appKnopZet();
}
/* Het deel-icoon van Safari, getekend en niet als plaatje: dan klopt het op
   elke schermmaat en kost het niets. Het plus-vierkantje van "Zet op
   beginscherm" is #ico-erbij uit de tekenset, hetzelfde als op het knopje. */
const DEEL_SVG = '<svg class="ab-svg" viewBox="0 0 24 24" fill="none" stroke="#0a84ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="M8 7l4-4 4 4"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg>';
function isIpad(nav) {
  nav = nav || navigator;
  const ua = String(nav.userAgent || '');
  return /iPad/.test(ua) || (/Macintosh/.test(ua) && (nav.maxTouchPoints || 0) > 1);
}
/* Safari 26 (iOS 26) zet op een iPhone standaard een smalle balk onderaan:
   ‹, het adres, en ···. De deelknop zit dáárachter; de oude werkbalk met Deel
   in het midden zie je alleen nog als iemand die indeling zelf terugzet. Het
   systeem in de user agent staat sinds 26 bevroren op 18_x, maar "Version/26"
   klopt wel -- daar wordt dus op gekeken. */
function isSafari26(nav) {
  const m = /Version\/(\d+)/.exec(String((nav || navigator).userAgent || ''));
  return !!m && +m[1] >= 26;
}
/* Wat er in het blad staat. Geeft { html, installeer } terug: installeer zegt of
   er een knop "Installeren" bij hoort (alleen als Chrome zijn voorstel gaf).
   nieuw: Safari 26 of later (zie isSafari26). */
function appBladInhoud(soort, ipad, hasStars, kanInstalleren, nieuw) {
  const stap = (n, t) => `<div class="ab-stap"><span class="ab-nr">${n}</span><span>${t}</span></div>`;
  const kbd = t => `<span class="ab-kbd">${t}</span>`;
  const erbij = kbd(ico('erbij') + ' Zet op beginscherm');
  /* Wat je eraan hebt, in drie tegeltjes in plaats van een zin: een eigen
     icoon, het hele scherm, en spelen zonder internet. */
  const voordeel = (pad, t) => `<span class="ab-vd"><svg class="ab-vd-i" viewBox="0 0 24 24" aria-hidden="true">${pad}</svg>${t}</span>`;
  let html = '<div class="ab-voor">Voor papa of mama</div><div class="ab-voordelen">'
    + voordeel('<rect x="6" y="2.5" width="12" height="19" rx="3"/><path d="M10.5 18.5h3"/>', 'Eigen icoon')
    + voordeel('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>', 'Heel scherm')
    + voordeel('<path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9 9 0 0 1 13 0M9 16a4 4 0 0 1 6 0M3 3l18 18"/>', 'Zonder internet')
    + '</div>';
  if (soort === 'ios') {
    if (ipad) {
      html += stap(1, `Tik in Safari rechtsboven op ${kbd(DEEL_SVG + ' Deel')}`) + stap(2, `Kies ${erbij}`);
    } else if (nieuw) {
      // een nagetekende smalle balk van Safari 26, met ··· omcirkeld
      html += stap(1, `Tik onderaan op ${kbd('···')}`)
        + '<div class="ab-balk26" aria-hidden="true"><span class="ab-rond">‹</span><span class="ab-adres">rekensterren.be</span><span class="ab-rond ab-doel">···</span></div>'
        + stap(2, `Tik op ${kbd(DEEL_SVG + ' Deel')} en dan op ${erbij}`);
    } else {
      html += stap(1, `Tik in Safari onderaan op ${kbd(DEEL_SVG + ' Deel')}`)
        + '<div class="ab-balk" aria-hidden="true"><span>‹</span><span>›</span><span class="ab-doel">' + DEEL_SVG + '</span><span>📖</span><span>⧉</span></div>'
        + stap(2, `Kies ${erbij}`);
    }
    html += stap(3, `Tik op ${kbd('Voeg toe')}`);
    /* De app op het beginscherm krijgt een eigen opslag, los van Safari: hij begint
       leeg. Met overzetten (= Overzetten) neem je je sterren mee met een code --
       de knop staat onderaan dit blad; anders blijft het de weg via een bestand. */
    const meenemen = hasStars && overzetMag();
    if (hasStars) html += meenemen
      ? '<div class="ab-noot">⭐ Al gespeeld in Safari? De app begint leeg. Neem je sterren mee met een code.</div>'
      : '<div class="ab-noot">⭐ Al gespeeld in Safari? De app begint leeg. Maak eerst een back-up via ⚙️ › Back-up, en zet hem in de app terug.</div>';
    return { html, installeer: false, meenemen };
  }
  if (soort === 'android' && kanInstalleren) {
    html += '<div class="ab-noot">Je sterren blijven gewoon staan.</div>';
    return { html, installeer: true };
  }
  const [uitleg, tweede] = beginschermUitleg(soort, hasStars);
  html += `<p class="ab-uitleg">${uitleg}</p>` + (tweede ? `<div class="ab-noot">${tweede}</div>` : '');
  return { html, installeer: false };
}
// vanKnop: geopend via het knopje linksboven (dan telt "Niet nu").
function openAppBlad(vanKnop) {
  sndClick();
  const hasStars = profileKeys().length > 0;   // zoals in Beheer: wie een ster heeft, heeft iets te redden
  const { html, installeer, meenemen } = appBladInhoud(beginschermSoort(), isIpad(), hasStars, !!installVoorstel, isSafari26());
  $('confirm-title').innerHTML = ico('erbij') + ' Rekensterren als app';
  $('confirm-body').innerHTML = `<div id="app-blad">${html}</div>`;
  $('confirm-actions').innerHTML =
    `<button class="btn small paper" id="app-blad-dicht">${vanKnop ? 'Niet nu' : 'Sluiten'}</button>`
    + (installeer ? '<button class="btn small purple" id="app-blad-installeer">Installeren</button>' : '')
    + (meenemen ? `<button class="btn small purple" id="app-blad-mee">${ozIco('zet')} Sterren meenemen</button>` : '');
  $('app-blad-dicht').onclick = vanKnop ? appKnopNietNu : closeConfirmModal;
  const mee = $('app-blad-mee');
  if (mee) mee.onclick = openOverzetBlad;
  const ik = $('app-blad-installeer');
  if (ik) ik.onclick = () => {
    const e = installVoorstel;
    installVoorstel = null;   // het voorstel kan maar één keer opgevraagd worden
    closeConfirmModal();
    if (e) e.prompt();
  };
  $('confirm-modal').classList.add('open');
  syncBackGuard();
}

