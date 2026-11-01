/* ================= Trilfeedback (haptics) ================= */
// Werkt op mobiele browsers die de Vibration API ondersteunen (Android/Chrome).
// Staat los van geluid, zodat trillen ook aan kan met de app op stil.
/* Er is geen eigen schakelaar meer: trillen volgt het toestel. Een iPhone of iPad
   kan vanuit een webpagina helemaal niet trillen (daar stond de rij al niet), en
   een recente Android legt web-trillingen stil met zijn eigen "Trillen"-schakelaar.
   Elke trilling is kort en hoort bij een klankje (zie de SFX-tabel), dus een tweede
   knop in het enige paneel waar een kind bij kan was er een te veel.
   db.haptics blijft in de opslag staan (oude saves, back-ups), maar wordt niet
   meer gelezen: wie hem ooit uitzette, voelt de tikjes weer -- het toestel beslist. */
function buzz(pattern) {
  /* Vóór de eerste tik weigert Chrome elke trilling, en zet hij er een fout voor in
     de console. Dat gebeurt alleen als een scherm zichzelf opent zonder tik -- een
     kijkstand (?debug&wereld=...&screen=end) of een test. Hier stond toen nog de
     schakelaar voor (de kijkstanden zetten trillen uit); nu is het deze vraag. */
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) { /* geen trilmotor */ }
}

/* ================= Geluid =================
   Alles wat klinkt wordt hier ter plekke gemaakt met oscillatoren. Er staat geen
   enkel geluidsbestand in assets/ en dat is geen gebrek maar de opzet: niets op
   te halen, niets te ontcijferen, geen eerste keer die traag is, geen regel erbij
   in sw.js en geen byte over de telefoondata van een gezin. De achtergrond staat
   in docs/AUDIO-REVIEW.md.

   DRIE DINGEN DIE JE AAN DE KLANKJES ZELF NIET ZIET:

   1. Er staat één hoofdkraan (de bus) tussen élke noot en de luidspreker. Dat is
      de enige plek waar de som van wat er tegelijk klinkt langskomt, en het is
      wat "geluid uit" middenin een feestje laat werken: een noot die al ingepland
      staat kun je niet meer tegenhouden -- o.start() is definitief -- maar de
      kraan dichtdraaien kan wél. Zie busNaar en toggleSound.
   2. Elke noot begint met een aanzet van een paar milliseconden. Zonder die
      helling springt de versterking in één sample van nul naar vol, en dat hoor je
      als een klikje vóór het klankje -- het duidelijkst op de kortste en zachtste
      (de tik), en het duidelijkst op de goedkoopste luidspreker. Dus precies op
      het toestel waar deze app voor gemaakt is.
   3. Een context die stilgelegd is (schermvergrendeling, een telefoontje, het
      beleid van de browser) geeft géén fout: hij neemt de noot netjes aan en er
      komt niets uit. De app zou dan geluidloos zijn terwijl de schakelaar "Aan"
      blijft zeggen, tot iemand herlaadt. Daarom vraagt audioWakker() bij elke tik
      en elke terugkeer of hij weer wil lopen.

   Wát een klankje betekent staat in SFX, op naam van de gebeurtenis en niet van
   het scherm: 'answer.miss' hoort bij een gemiste vraag, waar dat ook gebeurt. De
   sndX-functies onderaan zijn niets anders dan de oude namen voor die namen. */
let actx = null, bus = null, audioStuk = false;
const AANZET = 0.006;   // de helling aan het begin van elke noot, in seconden
/* De stand van de hoofdkraan als er geluid mag zijn. Hij staat op één en hoort
   daar voorlopig te staan: dit is geen volumeknop maar de plek waar er ooit
   eentje aan kan hangen -- en de stand waar "uit" vandaan en naartoe draait. */
const BUS_OPEN = 1;
/* De context en de kraan, één keer. Mislukt dat (geen WebAudio in deze browser,
   of een keuring die AudioContext met opzet laat gooien), dan blijft audioStuk
   staan en wordt het niet elke tik opnieuw geprobeerd. */
function audioBus() {
  if (bus || audioStuk) return bus;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { audioStuk = true; return null; }
    actx = new AC();
    bus = actx.createGain();
    bus.gain.value = BUS_OPEN;
    bus.connect(actx.destination);
  } catch (e) { actx = null; bus = null; audioStuk = true; }
  return bus;
}
// Zie punt 3 hierboven. Kost niets als hij al loopt, en mag stil mislukken.
function audioWakker() {
  try { if (actx && actx.state !== 'running' && actx.resume) actx.resume(); } catch (e) { /* mag niet */ }
}
document.addEventListener('pointerdown', audioWakker, { passive: true });
/* De context alvast maken, in een rustig moment na het opstarten -- niet pas bij
   de eerste tik. Een AudioContext aanmaken zet de geluidsuitgang van het toestel
   aan, en dat kost op een trage tablet al gauw honderden milliseconden. Gebeurde
   het in sndClick, dan zat die tijd in de allereerste tik van elk bezoek: het
   tandwiel of een ster kiezen bleef dan even hangen (Cloudflare mat die tikken als
   de traagste van de app).

   Vóór een tik mag een context niet spelen; hij komt dan stilgelegd binnen. Dat is
   precies wat punt 3 hierboven al opvangt: audioWakker op de eerste pointerdown, en
   playSfx vraagt het in de tik zelf nog eens (iOS telt alleen een tik of klik als
   toestemming). Met het geluid uit wordt er niets gemaakt, net als voorheen. */
naDeRust(() => { if (db.sound) audioBus(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') audioWakker(); });
/* De kraan naar v draaien in `tijd` seconden. Een helling en geen sprong: een
   kraan die in één sample dichtgaat knipt lopende noten af met een plof. */
function busNaar(v, tijd) {
  if (!bus || !actx) return;
  try {
    const t = actx.currentTime;
    bus.gain.cancelScheduledValues(t);
    bus.gain.setValueAtTime(bus.gain.value, t);
    bus.gain.linearRampToValueAtTime(v, t + tijd);
  } catch (e) { /* geen audio */ }
}
/* Eén noot: een oscillator met zijn eigen versterking, via de bus naar buiten.
   De staart valt exponentieel naar -60 dB, zodat het einde net zo min klikt als
   het begin. Een hele korte noot krijgt een evenredig kortere aanzet -- anders is
   de tik van 60ms voor een tiende van zijn duur aan het opkomen. */
function noot(freq, dur, delay, type, vol) {
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = type || 'sine';
  o.frequency.value = freq;
  o.connect(g); g.connect(bus);
  const t = actx.currentTime + (delay || 0);
  const aan = Math.min(AANZET, dur * 0.25);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol || 0.18, t + aan);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.start(t); o.stop(t + dur);
}

/* ---- De klankjes, op de naam van wat er gebeurde ----
   Eén noot is [hertz, duur, uitstel, golfvorm, versterking]; duur en uitstel in
   seconden. Staat er 0 als hertz, dan komt de toon uit `ladder` (op volgnummer)
   of uit `keuze` (willekeurig). `tril` is het trilpatroon dat erbij hoort -- zie
   buzz(), die zelf al naar de trilmotor kijkt.

   ELKE TRILLING STAAT HIER, naast het klankje waar ze bij hoort, en nergens
   anders: een losse buzz() vlak ná een klankje breekt diens trilling af (een
   nieuwe vibrate() begint opnieuw), dus die won altijd en dan voelt één
   gebeurtenis op elke plek anders. De enige buzz() buiten playSfx is die van
   toggleHaptics -- die hoort bij geen enkel klankje.

   Veertien regels en dertien gebeurtenissen -- 'tap' en 'tap.blij' zijn twee
   kleuren van één tik en geen twee dingen. Daarmee is de woordenschat vol.
   (Erbij in oktober 2026: de kast, omdat Max hem speelser wilde -- een behaalde
   trofee hoort anders te klinken dan een knop. Dat is één gebeurtenis in vier
   metalen, plus het "tok" van een trofee die nog moet komen.) Dit is een spel voor
   vijfjarigen op één tablet in een woonkamer, geen instrument: wat er nog stil is
   -- een schermwissel, een vraag die verschijnt, elk deeltjesfeestje, de
   zaalgloed bij een goed antwoord -- is stil gehouden en niet vergeten. Zie
   docs/AUDIO-REVIEW.md §4.8 voor de plekken waar een klankje láwaai zou zijn. */
const HERHAALREM = 60;   // ms: zo lang herhaalt hetzelfde klankje zichzelf niet
// De toonladder van de kast: C-pentatonisch, ruim twee octaven (zie 'kast.klink').
const KAST_LADDER = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568, 1760, 2093];
const klankTijd = {};
const SFX = {
  // ---- tikken ----
  'tap':            { noten: [[700, 0.06, 0, 'triangle', 0.10]], tril: 8 },
  /* Dezelfde tik, maar speels: de pop aantikken geeft elke keer een andere noot.
     Eén gebeurtenis met twee kleuren, en met opzet geen tweede gebeurtenis. */
  'tap.blij':       { noten: [[0, 0.12, 0, 'triangle', 0.12]], keuze: [784, 880, 988, 1047, 1175], tril: 12 },
  /* Een behaalde trofee aantikken: een klokje op zijn plek op de plank. Van links
     naar rechts loopt hij een pentatonische toonladder op, dus wie langs een rij
     tikt speelt een wijsje -- de kast als xylofoon -- en wie op één trofee blijft
     tikken, loopt de ladder op (zie kastKlink). Pentatonisch omdat elke volgorde
     dan mooi klinkt, ook kriskras.
     Een klokje en geen pieptoon: de grondtoon, een hoge boventoon die snel
     wegsterft (2,76 keer, die van een metalen staafje) en een tikje van het
     hamertje. Hier stond eerst één driehoekstoon, en die klonk als een knop van
     een app in plaats van als speelgoed (Max, oktober 2026).
     Een medaille die meegroeit klinkt in zijn eigen metaal -- vier kleuren van
     één tik, zoals tap en tap.blij er twee zijn:
       brons     houtig en warm, een marimba
       zilver    hetzelfde klokje als hierboven ('kast.klink')
       goud      twee klokjes, een kwint uit elkaar
       diamant   een loopje van drie, met een glinster erachteraan
     De boventonen staan in `boven`: [veelvoud van de toon, duur, uitstel,
     golfvorm, versterking]. Zo liggen ze altijd boven de grondtoon, en dus
     boven de ondergrens van een tabletluidspreker. */
  'kast.klink':     { noten: [[0, 0.55, 0, 'sine', 0.17]],
                      boven: [[2.76, 0.14, 0, 'sine', 0.045], [4, 0.035, 0, 'triangle', 0.03]],
                      ladder: KAST_LADDER, tril: 12 },
  'kast.brons':     { noten: [[0, 0.3, 0, 'sine', 0.2]],
                      boven: [[2, 0.12, 0, 'sine', 0.04], [4, 0.05, 0, 'triangle', 0.05]],
                      ladder: KAST_LADDER, tril: 12 },
  'kast.goud':      { noten: [[0, 0.55, 0, 'sine', 0.16]],
                      boven: [[2.76, 0.14, 0, 'sine', 0.04], [4, 0.035, 0, 'triangle', 0.03],
                              [1.5, 0.55, 0.07, 'sine', 0.14], [4.14, 0.12, 0.07, 'sine', 0.035]],
                      ladder: KAST_LADDER, tril: 12 },
  'kast.diamant':   { noten: [[0, 0.5, 0, 'sine', 0.15]],
                      boven: [[2.76, 0.12, 0, 'sine', 0.04], [1.25, 0.5, 0.06, 'sine', 0.14],
                              [1.5, 0.55, 0.12, 'sine', 0.14], [4, 0.3, 0.18, 'sine', 0.03]],
                      ladder: KAST_LADDER, tril: 12 },
  /* En een die je nog niet hebt: een zacht houten "tok" in plaats van de gewone
     tik. Nog steeds leuk om op te tikken, maar hij zingt niet -- dat doet hij
     pas als hij van jou is. */
  'kast.tok':       { noten: [[440, 0.12, 0, 'sine', 0.16], [880, 0.03, 0, 'triangle', 0.035]], tril: 8 },
  /* Iets aandoen. Dit stond hier als 'reward.claim' op de lijst, maar de drie
     plekken die overbleven doen alle drie hetzelfde en het is geen beloning: je
     zet iets op. Het cadeau-moment zelf -- een trofee die openknalt -- heeft zijn
     eigen fanfare, dus wat hier nog te benoemen viel is de handeling.

     Hij ligt láger dan de twee tikken erboven, en dat is het hele verschil: een
     tik zegt "ik heb je gehoord" en hoort licht te zijn, dit zegt "het zit" en
     hoort te zakken in plaats van te kletteren. Twee warme noten omhoog, en dan
     is het klaar -- de pop die iets anders aanheeft is het echte antwoord. */
  'equip':          { noten: [[587, 0.09, 0, 'triangle', 0.11], [740, 0.20, 0.07, 'triangle', 0.12]], tril: 20 },

  // ---- de vraag ----
  'answer.correct': { noten: [[523, 0.14, 0, 'sine', 0.18], [659, 0.14, 0.11, 'sine', 0.18], [784, 0.22, 0.22, 'sine', 0.18]], tril: 30 },
  /* "Niet die" en niet "fout!". Hier stond ooit een zaagtand van 200 Hz, een derde
     seconde lang: het geluid van een spelshow-buzzer, en dat is precies wat een
     misser in een rekenspel voor vijfjarigen níet hoort te zijn. Twee zachte
     dalende driehoeknoten dus -- in de Muziekwereld leest dat vanzelf als een noot
     die naast zat.

     Ze staan sinds deze ronde wél hoger. De onderste was 311 Hz, en een
     tabletluidspreker begint ruim daarboven; op het toestel waar dit voor gemaakt
     is bleef er van de zachtste helft van dit klankje dus niets over.

     GEEN tril, en dat is de buzzer van hierboven, maar dan voor de hand. Hier
     stond 35ms, en een goed antwoord trilt 30ms: wie de tablet vasthoudt voelde
     goed en "probeer nog eens" als dezelfde zoem. Nu voel je drie dingen: een
     tik bij goed, niets bij de vriendelijke misser, een dubbele tik bij de
     gemiste vraag. */
  'answer.retry':   { noten: [[494, 0.15, 0, 'triangle', 0.09], [392, 0.22, 0.12, 'triangle', 0.08]] },
  /* En dít is de twééde misser: de vraag is gemist en het antwoord komt in beeld.
     Tot nu toe klonk dat precies hetzelfde als "probeer nog eens", en daarmee had
     het enige echte gevolg in het spel geen enkel gewicht. Drie dalende noten in
     plaats van twee en een staart die blijft hangen: niet harder, wel zwaarder.
     Het trillen doet hetzelfde -- één tik werd een dubbele. */
  'answer.miss':    { noten: [[587, 0.14, 0, 'triangle', 0.10], [494, 0.16, 0.12, 'triangle', 0.10], [392, 0.34, 0.26, 'triangle', 0.09]], tril: [0, 35, 55, 45] },
  'streak':         { noten: [[880, 0.1, 0, 'sine', 0.18], [1109, 0.1, 0.09, 'sine', 0.18], [1319, 0.1, 0.18, 'sine', 0.18], [1760, 0.25, 0.27, 'sine', 0.18]], tril: [0, 25, 35, 25, 35, 55] },

  // ---- aankomen en betalen ----
  'diamond':        { noten: [[988, 0.08, 0, 'square', 0.08], [1319, 0.18, 0.08, 'square', 0.08]], tril: 15 },
  /* Aankomen is iets anders dan betalen, en tot voor kort klonk het hetzelfde --
     één muntje voor zeven gebeurtenissen. Dit is geen muntje maar een landing:
     twee driehoeknoten die omhoog gaan en dan blijven staan.
     HET TIKJE VAN AANKOMEN ZIT HIER, en nergens anders -- zie runTravel. */
  'travel.arrive':  { noten: [[659, 0.10, 0, 'triangle', 0.12], [880, 0.22, 0.09, 'triangle', 0.13]], tril: 15 },
  /* En vertrekken. De wandeling over de weg duurt 1400ms en was tot nu toe de
     langste beweging van de hele voortgangslus zonder één noot: ze zette af,
     liep, en pas bij de volgende halte klonk er iets.

     Hij ligt met opzet een kwart onder de aankomst -- vertrek eindigt op D5, de
     aankomst op A5 -- zodat de twee één beweging vormen: laag weg, hoog aan. En
     hij is korter en zachter, want een vertrek is een aanzet en geen gebeurtenis.

     GEEN tril, en dat is geen vergetelheid. De enige trilling van de reis is de
     tik van aankomen; zie het lange commentaar in runTravel waar een tweede
     trilling ooit weggehaald is. */
  'travel.depart':  { noten: [[440, 0.09, 0, 'triangle', 0.09], [587, 0.14, 0.07, 'triangle', 0.10]] },
  /* Een wereld die opengaat: de onthulling van een nieuwe wereld, en de camera
     die over de grens heen klimt. Allebei leenden ze het muntje, en daarna de
     landing van 'travel.arrive' -- maar aankomen op de volgende halte en een
     héle wereld die opengaat zijn niet hetzelfde ding.

     Drie noten die opengaan in plaats van oplopen: een kwint en dan een kwart,
     met de bovenste blijvend. Bewust in D en niet in C, want in C is dit de
     eerste helft van 'celebrate.major' en dan zou een wereld die opengaat
     klinken als het begin van een wereld die uit is. */
  'world.unlock':   { noten: [[587, 0.14, 0, 'triangle', 0.14], [880, 0.14, 0.11, 'triangle', 0.14],
                              [1175, 0.34, 0.22, 'triangle', 0.12]], tril: [0, 20, 40, 30] },
  /* Eén ster die landt op het eindscherm; opts.i zegt de hoeveelste. Dit was het
     enige klankje dat niet op naam bestond -- het stond als los beep()je in
     renderEndStars -- en het is het beste van de app: drie stijgende tonen,
     vastgeklikt op drie sterren die neerkomen. */
  'star.land':      { noten: [[0, 0.20, 0, 'triangle', 0.16]], ladder: [660, 830, 1000], tril: 20 },

  // ---- de twee grote ----
  /* Einde show, en niets anders meer. Dit waren zes noten tot 880ms, en dat was
     precies het probleem: de eerste ster landt op 420ms (zie STERCEREMONIE), dus
     de mooiste ceremonie van het spel speelde ónder de fanfare, en hoe beter de
     show hoe meer erdoorheen ging. Nu een korte opgang die op 330ms uit is en de
     sterren hun eigen moment laat. Hij eindigt op G en de eerste ster begint op de
     E daarboven -- daarom zijn deze drie noten déze drie.

     Het trillen is om dezelfde reden kort: twee tikken, en de lange roffel is
     voor 'celebrate.major'. Hier stond dezelfde roffel als daar, zodat het
     gewoonste en het zeldzaamste moment in de hand nog altijd één ding waren. */
  'show.complete':  { noten: [[523, 0.13, 0, 'sine', 0.18], [659, 0.13, 0.10, 'sine', 0.18], [784, 0.13, 0.20, 'sine', 0.18]], tril: [0, 40, 60, 60] },
  /* En de zeldzame toppen: een wereld uit, álle werelden
     uit, een trofee die openknalt, memory helemaal gevonden. Die klonken stuk voor
     stuk als "einde show" -- hetzelfde klankje voor het gewoonste en het
     zeldzaamste moment van het spel, en dan betekent het geen van beide meer.

     Deze mág lang zijn, want hij begint pas als de sterren gevallen zijn (zie
     naSterren in endLevel). Op het eind twee noten tegelijk: dat is de enige plek
     in de app waar dat met opzet gebeurt, en het is waarom hij groter klinkt
     zonder harder te zijn.

     Zijn roffel is van hem alleen, en hij is op alle vier de plekken dezelfde.
     De trofee en het wereldfeest zetten er elk nog een eigen buzz() achteraan,
     en navigator.vibrate() breekt af in plaats van erbij te doen: dat eigen
     patroon won, en dan voelde hetzelfde feest op elke plek anders. */
  'celebrate.major': { noten: [[523, 0.16, 0, 'sine', 0.17], [659, 0.16, 0.12, 'sine', 0.17],
                               [784, 0.16, 0.24, 'sine', 0.17], [1047, 0.16, 0.36, 'sine', 0.17],
                               [1047, 0.42, 0.50, 'sine', 0.15], [1319, 0.42, 0.50, 'sine', 0.13]],
                       tril: [0, 45, 60, 45, 60, 90] },
};

/* Speel het klankje dat bij deze gebeurtenis hoort.

   DEZE FUNCTIE GOOIT NOOIT, en dat is geen nettigheid maar een harde eis. In de
   Node-keuringen gooit AudioContext met opzet (zie test/app.js), en playSfx wordt
   aangeroepen midden in submitAnswer en vlak naast save(): een exception hier
   breekt de beurt af en laat het spel vastlopen op de vraag.

   opts.i -- de hoeveelste, voor een klankje met een ladder (star.land). */
function playSfx(naam, opts) {
  const def = SFX[naam];
  if (!def) return;
  /* Weg is weg: een app die niet in beeld is, maakt geen geluid. Zo'n klankje
     komt van een timer die nog liep toen het scherm op slot ging, en een
     stilgelegde context bewaart het tot hij weer wakker is -- dan klonken er bij
     terugkomst een paar tegelijk. Ook geen trilling: die voelt niemand. */
  if (document.hidden) return;
  opts = opts || {};
  /* De herhaalrem staat vóór het trillen: een klankje dat overgeslagen wordt, wordt
     helemaal overgeslagen. Hij is er voor de cijfertoetsen en voor snel achter
     elkaar omgedraaide memory-kaartjes -- twee tikken binnen een twintigste
     seconde zijn geen twee antwoorden maar één ratel. */
  const nu = Date.now();
  if (nu - (klankTijd[naam] || 0) < HERHAALREM) return;
  klankTijd[naam] = nu;
  if (def.tril != null) buzz(def.tril);
  if (!db.sound) return;   // stil is echt stil: geen context, geen knopen, niets
  try {
    if (!audioBus()) return;
    audioWakker();   // vooraf gemaakt = stilgelegd tot er getikt is (zie hierboven)
    const toon = def.ladder ? def.ladder[Math.min(opts.i | 0, def.ladder.length - 1)]
      : def.keuze ? pick(def.keuze) : 0;
    def.noten.forEach(n => noot(n[0] || toon, n[1], n[2], n[3], n[4]));
    if (def.boven) def.boven.forEach(b => noot(toon * b[0], b[1], b[2], b[3], b[4]));
  } catch (e) { /* geen audio */ }
}

/* De oude namen, en verder niets. Ze staan er omdat zo'n zeventig aanroepen door
   de hele app heen niet aangeraakt hoeven te worden én omdat ze op de plek waar ze
   staan gewoon goed lezen. Allemaal function-declaraties en geen const: sndTap
   wordt aangeroepen vanuit src/10-feestjes.js, en dat bestand wordt vóór dit
   bestand aan elkaar geplakt -- zie CLAUDE.md regel 0. */
function sndClick() { playSfx('tap'); }
function sndTap() { playSfx('tap.blij'); }
function sndGood() { playSfx('answer.correct'); }
function sndWrong() { playSfx('answer.retry'); }
function sndMis() { playSfx('answer.miss'); }
function sndStreak() { playSfx('streak'); }
function sndCoin() { playSfx('diamond'); }
function sndAankomst() { playSfx('travel.arrive'); }
function sndVertrek() { playSfx('travel.depart'); }
function sndWereld() { playSfx('world.unlock'); }
function sndAan() { playSfx('equip'); }
function sndWin() { playSfx('show.complete'); }
function sndGroot() { playSfx('celebrate.major'); }
function toggleSound() {
  db.sound = !db.sound; save();
  renderGeluid();
  if (!db.sound) {
    cancelSpeech();
    busNaar(0, 0.04);   // en wat al ingepland stond sterft hier: zie punt 1 bovenaan
  } else {
    busNaar(BUS_OPEN, 0.02);
    sndClick();
  }
}

/* ================= Gesproken opdrachten (telmodus) =================
   Kleuters kunnen nog niet lezen, dus in de telmodus wordt élke opdracht
   hardop voorgelezen met de ingebouwde spraak van het toestel (SpeechSynthesis).
   De stem is Vlaams (nl-BE) waar het toestel er een heeft -- iPad, iPhone, Mac
   en Android meestal wel, Chrome op Windows niet -- en anders Nederlands (nl-NL),
   en anders welke Nederlandstalige stem er ook is. Niet elk toestel heeft een Nederlandse stem -- daarom is spraak nooit
   de énige drager: de vraag staat altijd óók volledig in beeld (objecten/stippen),
   en een 🔊-knop leest de opdracht op verzoek opnieuw voor. Ontbreekt een stem,
   dan blijft alles gewoon speelbaar, enkel zonder stemgeluid. */
// 'één' met accenten: anders leest de stem het als het lidwoord "een" ("'n") i.p.v.
// het telwoord. Bij tellen, luisteren en sommen moet het echt "één" klinken.
const NUM_NL = ['nul', 'één', 'twee', 'drie', 'vier', 'vijf', 'zes', 'zeven', 'acht', 'negen', 'tien'];
function numWord(n) { return NUM_NL[n] != null ? NUM_NL[n] : String(n); }
let _voices = [];
function refreshVoices() { try { _voices = window.speechSynthesis ? speechSynthesis.getVoices() : []; } catch (e) { _voices = []; } }
// Vlaams eerst, dan Nederlands, dan elke andere nl-stem. Sommige toestellen
// schrijven nl_BE met een liggend streepje, vandaar [-_].
const STEM_VOORKEUR = [/^nl[-_]BE$/i, /^nl[-_]NL$/i, /^nl(\b|[-_])/i];
function nlVoice() {
  if (!_voices.length) refreshVoices();
  for (const re of STEM_VOORKEUR) { const v = _voices.find(x => re.test(x.lang)); if (v) return v; }
  return null;
}
function hasSpeech() { return 'speechSynthesis' in window; }
/* Mag deze ster een stem horen? Alleen in de telmodus: die is lees-vrij en
   leunt op de stem. Een rekenkind leest de som zelf, ook net na de overstap
   van tellen. Er stond een schakelaar Voorlezen op Oefeningen, en daarna een
   wereld voorlezen na de overstap; allebei zijn bewust weggehaald -- zet de
   stem niet terug in de rekenmodus zonder dat te vragen. */
function stemAan(p) { return p.settings.track === 'count'; }
/* Een rekensom als zin: "7 + 3 = @" -> "zeven plus drie is hoeveel?". Het
   sjabloon is dezelfde bron als wat er in beeld staat, dus ze kunnen niet
   uit elkaar lopen. Boven de tien leest de stem gewoon het cijfer voor.
   × is "maal", zoals op een Vlaamse school. */
const SOM_WOORD = { '+': 'plus', '−': 'min', '×': 'maal', ':': 'gedeeld door', '=': 'is', '@': 'hoeveel' };
function somZin(q) {
  if (!q || !q.tmpl) return '';
  return q.tmpl.split(' ').map(t => SOM_WOORD[t] || numWord(parseInt(t, 10))).join(' ') + '?';
}
/* Wat de stem hardop zegt, zonder tekens. Sommige zinnen komen rechtstreeks uit
   een balk of een kaartje ("nog 2 shows met ⭐⭐⭐", "🔒 Nog niet", "Sterrenhit ·
   Brons"), en een stem leest een emoji voor als zijn naam: "ster ster ster",
   "slot". Dus op één plek, voor élke zin: een rij sterren wordt "drie sterren",
   het middenpuntje een kleine adempauze, en de rest van de emoji valt weg.
   De tekst in beeld blijft zoals hij is. */
function spreekbaar(text) {
  return String(text)
    .replace(/(?:⭐️?)+/g, m => { const n = m.replace(/️/g, '').length; return n === 1 ? ' ster ' : ` ${numWord(n)} sterren `; })
    .replace(/\s*·\s*/g, ', ')
    .replace(/[\p{Extended_Pictographic}️‍]/gu, '')
    .replace(/\s+([,.!?])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}
function cancelSpeech() { try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {} }
// Leest een zin voor. Volgt bewust de geluid-aan/uit-knop (stil = ook geen stem).
function speak(text, opts) {
  opts = opts || {};
  // Voice hoort bij de lees-vrije telmodus; in de rekenmodus geen enkele gesproken
  // uitvoer (ook niet op gedeelde plekken als het trofee-feestje of de ster-status)
  const cp = cur ? P() : null;
  if (cp && cp.settings && !stemAan(cp)) { if (opts.onEnd) opts.onEnd(); return; }
  if (!db.sound || !hasSpeech() || !text) { if (opts.onEnd) opts.onEnd(); return; }
  // Niet tegen een vergrendeld scherm praten: de stem van Android loopt gewoon
  // door met het scherm uit. Wat er nog te zeggen viel, zie stemTerug.
  if (document.hidden) { if (opts.onEnd) opts.onEnd(); return; }
  text = spreekbaar(text);
  if (!text) { if (opts.onEnd) opts.onEnd(); return; }
  try {
    /* Alleen afbreken als er ook iets klinkt. Safari (iPad, iPhone) slikt soms het
       begin van een nieuwe zin in als cancel() en speak() vlak na elkaar komen,
       ook als er niets te stoppen viel. Met opts.wacht schuift de zin achteraan in
       de rij in plaats van de vorige af te breken. */
    if (!opts.wacht && (speechSynthesis.speaking || speechSynthesis.pending)) speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = nlVoice();
    if (v) u.voice = v;
    // De taal volgt de gekozen stem: Safari op iOS kijkt soms alleen naar lang. Zonder
    // stemmenlijst (die komt soms pas later binnen) vragen we gewoon om Vlaams.
    u.lang = v ? v.lang.replace('_', '-') : 'nl-BE';
    u.rate = opts.rate || 0.85;   // rustig tempo voor jonge kinderen
    u.pitch = opts.pitch || 1.15; // iets hoger/vrolijker
    if (opts.onStart) u.onstart = opts.onStart;
    // Ook een fout (of een zin die afgebroken wordt) is een einde: wie erop wacht,
    // mag niet blijven hangen. Eén keer, ook als een browser allebei stuurt.
    if (opts.onEnd) { let af = false; u.onend = u.onerror = () => { if (!af) { af = true; opts.onEnd(); } }; }
    speechSynthesis.speak(u);
  } catch (e) { if (opts.onEnd) opts.onEnd(); }
}
/* Zeg een zin en ga daarna pas verder -- maar nooit eerder dan `rust` en nooit
   later dan STEM_MAX. Elke speak() breekt af wat er nog klonk (cancel), dus wie
   meteen de volgende zin zegt, knipt de vorige doormidden. Zo klonk "Ja, zes!
   Knap gedaan!" als "Ja, zes! Knap ge-" en dan de nieuwe vraag: de stem stotterde.
   Alleen wachten als de stem écht begonnen is (onstart): een toestel zonder stem,
   geluid uit of de rekenmodus zonder Voorlezen gaat gewoon op `rust` door. */
const STEM_ADEM = 250;    // het ademhalinkje tussen twee zinnen
const STEM_MAX = 3200;    // een stem die nooit "klaar" meldt, houdt de show niet op
function zegEnDan(text, opts, rust, dan) {
  let begon = false, klaar = false, wacht = false, gedaan = false;
  const een = () => { if (!gedaan) { gedaan = true; dan(); } };
  speak(text, Object.assign({}, opts, {
    onStart: () => { begon = true; },
    onEnd: () => { klaar = true; if (wacht) setTimeout(een, STEM_ADEM); },
  }));
  setTimeout(() => {
    if (!begon || klaar) { een(); return; }
    wacht = true;
    setTimeout(een, Math.max(0, STEM_MAX - rust));
  }, rust);
}
if (typeof window !== 'undefined' && window.speechSynthesis) {
  refreshVoices();
  speechSynthesis.onvoiceschanged = refreshVoices;
}
// Gaat de app weg (scherm op slot, ander scherm), dan zwijgt de stem meteen --
// ook wat er nog in de rij stond. Zie speak en stemTerug.
document.addEventListener('visibilitychange', () => { if (document.hidden) cancelSpeech(); });
/* De stem ontgrendelen op de eerste tik. Safari (iPhone, iPad) laat spraak pas
   toe na een zin die in een tik begon; daarna mag ook een timer praten. De
   eerste telvraag van een bezoek komt van een timer (de show gaat eerst open),
   en bleef dan stil. Dus zeggen we bij de eerste tik een lege zin, zonder
   volume. Met het geluid uit wacht dit op een tik met het geluid aan -- het
   aanzetten zelf is er ook een. Andere browsers merken er niets van. */
let stemOpen = false;
function stemOntgrendel() {
  if (stemOpen || !db.sound || !hasSpeech()) return;
  stemOpen = true;
  document.removeEventListener('pointerdown', stemOntgrendel, true);
  try {
    if (speechSynthesis.speaking || speechSynthesis.pending) return;   // er klinkt al iets: open
    const u = new SpeechSynthesisUtterance('');
    u.volume = 0;
    speechSynthesis.speak(u);
  } catch (e) { /* dan maar niet */ }
}
document.addEventListener('pointerdown', stemOntgrendel, { capture: true, passive: true });

/* ---- Niet inzoomen ----
   De viewport zegt user-scalable=no, en Android houdt zich daaraan. Safari op iPhone
   en iPad niet (al sinds iOS 10, om toegankelijkheidsredenen): knijpen met twee
   vingers zoomt daar het hele spel in, en een kind vindt de weg terug niet. Dit
   houdt het knijpgebaar tegen; het dubbeltikken doet touch-action in het stijlblad
   (zie de reset in 00-afspraak.css). */
document.addEventListener('gesturestart', e => e.preventDefault());

/* ---- Scherm wakker houden zolang de app open is (Wake Lock API) ----
   Kinderen denken soms lang na zonder het scherm aan te raken; dan mag het
   niet dimmen of vergrendelen. De lock wordt automatisch vrijgegeven als het
   tabblad naar de achtergrond gaat, dus we vragen 'm opnieuw aan zodra de app
   weer zichtbaar is. Niet-ondersteunende browsers negeren dit stil. */
let wakeLock = null;
async function keepAwake() {
  if (!('wakeLock' in navigator) || document.visibilityState !== 'visible' || wakeLock) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => { wakeLock = null; });
  } catch (e) { wakeLock = null; }   // niet ondersteund of geweigerd -> gewoon doorgaan
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') keepAwake(); });
document.addEventListener('pointerdown', keepAwake, { passive: true });   // fallback: browsers die een gebruikersgebaar eisen
/* Het indrukken zien. Elke knop zakt bij :active een paar pixels in (de lip,
   zie .btn en .num-btn), maar Safari op iPhone en iPad zet :active alleen op een
   aanraking als er ergens een touchstart-luisteraar hangt -- zonder deze lege
   veert er op een iPhone niets in, ook niet op het cijferblok. */
document.addEventListener('touchstart', () => {}, { passive: true });
keepAwake();

/* ---- De geluidsschakelaar ----
   Op twee plekken dezelfde rij: in het ouderdeel (het overzicht, "Voor alle
   sterren", zie geluidRijHtml) en in het stopvenster van een show. Dit zet ze allebei goed;
   staat er een niet, dan wordt hij overgeslagen. Onder het tandwiel stond hij
   ook, toen daar nog een menuutje zat -- het tandwiel opent nu meteen Voor ouders. */
function renderGeluid() {
  const setRow = (id, stateId, on, icoOn, icoOff) => {
    const item = $(id), st = $(stateId);
    if (!item || !st) return;
    st.textContent = on ? 'Aan' : 'Uit';
    st.classList.toggle('off', !on);
    item.setAttribute('aria-checked', on ? 'true' : 'false');
    item.querySelector('.gi-ico').textContent = on ? icoOn : icoOff;
    item.classList.toggle('uit', !on);   // het icoon gedempt, zie .gear-item.uit
  };
  setRow('set-sound', 'set-sound-state', db.sound, '🔊', '🔇');
  setRow('quit-sound', 'quit-sound-state', db.sound, '🔊', '🔇');
}

/* ================= Avatar (SVG) ================= */
// De pop is één tekening met twee lagen: vaste onderdelen (hoofd, hals, armen,
// schoenen, vastgehouden spullen) en een BASIS die zegt hoe haar, romp en benen
// eruitzien. Spullen blijven wat ze altijd waren -- een kleur en hooguit een
// patroon, meer niet -- dus dezelfde 'dress_disco' wordt op de ene basis een
// discojurk en op de andere een discoshirt met broek. Daardoor werkt de héle
// kast, élke thema-look en élke trofee meteen voor beide basissen, zonder één
// extra item, zonder filteren en zonder tweede winkel.
//
// Alle ankerpunten liggen vast en zijn voor iedere basis gelijk: schouders op
// y=103, hals 94-112, armen vanaf (84|116, 112), broekspijp-hart op x=86 en 114,
// schoenen op (86|114, 234). Zo hoeft de rest van de tekening (accessoires,
// micro, instrument, huisdier, schoenen) niets van de basis te weten.
const SKIN = '#ffdcb8';
const DEFAULT_BASE = 'meisje';
// De basis van een profiel, met vangnet: een save van vóór deze versie (of een
// met de hand bewerkt bestand) heeft het veld niet en blijft gewoon het meisje.
function baseOf(p) { return (p && BASES[p.base]) ? p.base : DEFAULT_BASE; }
// De basis van de ster die nu speelt. Draait óók vóór er een ster gekozen is
// (renderProfiles bij het opstarten), dus cur is hier vaak null.
function curBase() { return baseOf(db && db.profiles ? db.profiles[cur] : null); }

/* ---- Basis "meisje": staartjes, jurk, blote benen onder de zoom ---- */
// glans: een verloop dat er als tweede laag overheen gaat (licht linksboven,
// schaduw rechtsonder). De pop geeft hem mee; het haarstaaltje in de kleedkamer
// niet, dat blijft een vlakke kleur.
// Elk staartje is een eigen groep, zodat het kan naslingeren (zie .av-staart).
function hairBackStaartjes(hc, glans) {
  const bol = (cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${hc}"/>`
    + (glans ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${glans}"/>` : '');
  return bol(100, 62, 37)
    + `<g class="av-staart av-staart-l">${bol(56, 86, 13)}</g><g class="av-staart av-staart-r">${bol(144, 86, 13)}</g>`;
}
function hairFrontStaartjes(hc) {
  return `<path d="M68 66 A32 32 0 0 1 132 66 Q100 44 68 66 Z" fill="${hc}"/>`;
}
/* Elk been is een eigen groep, en zijn schoen ook (die wordt pas ná de kleren
   getekend, zie avatarSVG): bij het zijpasje schopt het been opzij (.av-been).
   Het draaipunt ligt net onder de zoom, zodat wat draait altijd onder de stof
   uitkomt. Bij een jurk is dat de heup; bij de broek de knie, want de pijpen
   zijn één vorm en schoppen niet mee -- daar zwaait het onderbeen uit de pijp. */
const KNIE_JURK = [[90, 196], [110, 196]], KNIE_BROEK = [[86, 207], [114, 207]];
function beenGroep(kant, knie, inhoud) {
  return `<g class="av-been av-been-${kant}" style="transform-origin:${knie[0]}px ${knie[1]}px">${inhoud}</g>`;
}
// benen: vóór de jurk getekend -- de zoom dekt het bovenstuk vanzelf af
function legsBloot() {
  return beenGroep('l', KNIE_JURK[0], `<line x1="90" y1="192" x2="88" y2="228" stroke="${SKIN}" stroke-width="9" stroke-linecap="round"/>`)
    + beenGroep('r', KNIE_JURK[1], `<line x1="110" y1="192" x2="112" y2="228" stroke="${SKIN}" stroke-width="9" stroke-linecap="round"/>`);
}
// jurk -- zachte ronde schoudertjes i.p.v. scherpe hoeken
function torsoJurk(dc) {
  return `<path d="M86 103 Q78 105 82 110 L66 196 Q100 210 134 196 L118 110 Q122 105 114 103 Q100 110 86 103 Z" fill="${dc}"/>`;
}

/* ---- Basis "jongen": kort haar, shirt met korte mouwen, lange broek ----
   De broek hoort bij de benen-laag (de broek ís de benen), het shirt bij de romp.
   Dezelfde kleur voor allebei: het is één kledingstuk uit de kast, geen twee. */
function hairBackKort(hc, glans) {
  // Een kapje dat óp het hoofd zit in plaats van eromheen valt: tien pixels haar
  // bovenop, langs de slaap nog maar een randje, en op oorhoogte (y=80) is het
  // afgelopen. Zakt het lager, dan omlijst het het gezicht en leest het meteen
  // als een pagekopje.
  //
  // De omtrek blijft bewust rond. Er stond hier een kuifje om die ronding te
  // breken, maar een puntje bovenop een bol hoofd is geen kuif -- dat is een
  // steeltje, en dan is het een appel. Het karakter zit nu in de haargrens
  // (zie hairFrontKort): die loopt schuin, en dat is aan de zíjkant zichtbaar
  // in plaats van bovenop.
  const d = 'M67 80 Q63 44 79 34 Q90 28 100 31 Q113 27 123 37 Q136 47 133 80 Q116 71 100 71 Q84 71 67 80 Z';
  return `<path d="${d}" fill="${hc}"/>` + (glans ? `<path d="${d}" fill="${glans}"/>` : '');
}
function hairFrontKort(hc) {
  // Eén schuine haargrens: rechts hoog bij de slaap (y≈48), links laag tot bijna
  // op de wenkbrauw (y≈68). Dat is een scheiding met het haar naar één kant
  // gekamd -- de vorm die kort haar herkenbaar maakt zónder er iets bovenop te
  // zetten. Het voorhoofd blijft ruimer vrij dan bij de staartjes; juist dat
  // maakt kort haar kort.
  //
  // De bovenrand is een kromme en geen boog met de straal van het hoofd: zo'n
  // boog loopt net ónder de schedelrand door en laat bovenaan een haarlijntje
  // huid staan.
  return `<path d="M68 68 Q68 32 100 32 Q132 32 128 56 Q118 44 96 50 Q76 55 68 68 Z" fill="${hc}"/>`;
}
function legsBroek(dc) {
  // Eerst de blote onderbenen, dán de pijpen eroverheen: zo eindigt de stof
  // netjes op de kuit i.p.v. dat een ronde beenkop erdoorheen prikt. De pijpen
  // zijn bewust breed (18 px, hart op x=86 en 114, precies boven de schoenen):
  // twee dunne kokers maakten van de ster een stokfiguurtje naast de jurk, die
  // veel meer vlak vult. De zoom ligt net onder de knie -- tot op de schoen las
  // het als een lange broek en werd het onderlijf één blok kleur.
  return beenGroep('l', KNIE_BROEK[0], `<line x1="86" y1="200" x2="87" y2="229" stroke="${SKIN}" stroke-width="9" stroke-linecap="round"/>`)
    + beenGroep('r', KNIE_BROEK[1], `<line x1="114" y1="200" x2="113" y2="229" stroke="${SKIN}" stroke-width="9" stroke-linecap="round"/>`)
    + `<path d="M78 156 L77 208 Q86 213 95 208 L100 188 L105 208 Q114 213 123 208 L122 156 Z" fill="${dc}"/>`;
}
function torsoShirt(dc, mic) {
  // Schouders exact als bij de jurk (zelfde Q-bochtjes), daarna licht uitlopend
  // naar de zoom i.p.v. kaarsrecht: een kindershirt valt zo, en het geeft de
  // basis de breedte die een strakke koker miste.
  //
  // De mouwtjes komen ná de romp, want de armen zijn al getekend -- zo steekt de
  // arm uit het shirt en niet ernaast. Elke mouw krijgt een randje op de zoom,
  // dwars op de arm: zonder dat is het een dikke streep die in de arm overloopt
  // in plaats van een mouw die ergens ophoudt. De opgeheven micro-arm heeft
  // vanzelfsprekend zijn eigen mouw en zijn eigen zoom.
  //
  // De linkermouw is een groep: gaat de vrije arm de lucht in, dan gaat zijn
  // mouw mee (.av-mouw-l). Anders kwam de arm opzij uit het shirt, onder een
  // mouw die bleef hangen.
  const mouw = (d, zoom) => `<path d="${d}" stroke="${dc}" stroke-width="13" fill="none" stroke-linecap="round"/>`
    + `<path d="${zoom}" stroke="rgba(0,0,0,.16)" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  return `<path d="M86 103 Q78 105 82 110 L78 165 Q100 171 122 165 L118 110 Q122 105 114 103 Q100 110 86 103 Z" fill="${dc}"/>`
    + `<g class="av-mouw-l">${mouw('M84 110 Q77 116 75 124', 'M69 121 L81 127')}</g>`
    + (mic ? mouw('M116 110 Q123 104 128 100', 'M124 95 L132 105')
           : mouw('M116 110 Q123 116 125 124', 'M119 127 L131 121'))
    // ronde halslijn: een V leest als een overhemd, dit als een T-shirt
    + `<path d="M89 105 Q100 116 111 105" stroke="rgba(0,0,0,.16)" stroke-width="3" fill="none" stroke-linecap="round"/>`
    + `<path d="M78 165 Q100 171 122 165" stroke="rgba(0,0,0,.2)" stroke-width="2" fill="none"/>`;
}

/* ---- Licht op de stof ----
   Dezelfde vorm als het kledingstuk nog een keer, nu gevuld met een verloop:
   licht links, schaduw rechts, en een donkerder zoom. Omdat het een laag óp de
   kleur is, werkt het voor élke kleur, élk patroon en de regenboog -- geen item
   hoeft ervan te weten. stof = de url van dat verloop (zie avatarSVG). */
const ZOOM_SCHADUW = `stroke="#000" stroke-opacity=".13" stroke-width="4" fill="none" stroke-linecap="round"`;
function stofJurk(stof) {
  return `<path d="M86 103 Q78 105 82 110 L66 196 Q100 210 134 196 L118 110 Q122 105 114 103 Q100 110 86 103 Z" fill="${stof}"/>`
    + `<path d="M67 193 Q100 207 133 193" ${ZOOM_SCHADUW}/>`;
}
function stofShirt(stof) {
  return `<path d="M86 103 Q78 105 82 110 L78 165 Q100 171 122 165 L118 110 Q122 105 114 103 Q100 110 86 103 Z" fill="${stof}"/>`
    + `<path d="M79 162 Q100 168 121 162" ${ZOOM_SCHADUW}/>`
    // de broekspijpen krijgen hetzelfde licht
    + `<path d="M78 156 L77 208 Q86 213 95 208 L100 188 L105 208 Q114 213 123 208 L122 156 Z" fill="${stof}"/>`;
}

/* ---- Patronen ----
   Zes patronen, per basis één keer uitgetekend: de coördinaten hangen aan de
   vorm van het kledingstuk, niet aan het item. Een patroon erbij betekent dus
   één regel in élke tabel -- daarom staan ze naast elkaar. */
const PAT_JURK = {
  stars: `<text x="86" y="145" font-size="14" fill="#fff176">★</text><text x="108" y="165" font-size="12" fill="#fff176">★</text>
          <text x="78" y="185" font-size="12" fill="#fff176">★</text><text x="112" y="192" font-size="14" fill="#fff176">★</text>`,
  disco: `<circle cx="90" cy="140" r="4" fill="#fff" opacity="0.8"/><circle cx="110" cy="155" r="4" fill="#80deea" opacity="0.8"/>
          <circle cx="85" cy="175" r="4" fill="#f48fb1" opacity="0.8"/><circle cx="113" cy="182" r="4" fill="#fff59d" opacity="0.8"/>`,
  hearts: `<text x="84" y="146" font-size="13" fill="#fff">♥</text><text x="106" y="164" font-size="11" fill="#ffcdd2">♥</text>
          <text x="79" y="184" font-size="11" fill="#ffcdd2">♥</text><text x="110" y="190" font-size="13" fill="#fff">♥</text>`,
  // gouden sterren + maantje: de toverjurk
  magic: `<text x="85" y="148" font-size="15" fill="#ffd54f">★</text><text x="108" y="172" font-size="11" fill="#ffd54f">★</text>
          <text x="80" y="188" font-size="11" fill="#ffd54f">★</text>
          <path d="M112 138 a9 9 0 1 0 6 15 a11 11 0 1 1 -6 -15 Z" fill="#ffe082"/>`,
  // zeemeermin-schubben: rijen lichte koepeltjes
  scales: `<g fill="none" stroke="rgba(255,255,255,.55)" stroke-width="2.5">
      <path d="M82 152 a7 7 0 0 1 14 0 M96 152 a7 7 0 0 1 14 0"/>
      <path d="M80 168 a7 7 0 0 1 14 0 M94 168 a7 7 0 0 1 14 0 M108 168 a7 7 0 0 1 14 0"/>
      <path d="M84 184 a7 7 0 0 1 14 0 M98 184 a7 7 0 0 1 14 0"/></g>`,
  // OHL: wit met een groene en een rode baan langs de zijkant (zoals de zijpanelen
  // van het echte shirt), de clubletters op de borst en een zwarte zoom. De banen
  // staan aan de rand en niet op de borst: daar moeten de letters passen.
  ohl: `<path d="M83 108 L67 194 L75 197 L88 110 Z" fill="#2e7d32"/>
          <path d="M117 108 L133 194 L125 197 L112 110 Z" fill="#c62828"/>
          <text x="100" y="140" text-anchor="middle" font-size="11.5" font-weight="900" fill="#1b1b1b">OHL</text>
          <path d="M67 190 Q100 205 133 190 L134 196 Q100 209 66 196 Z" fill="#1b1b1b"/>`,
};
// Zelfde zes patronen, nu verdeeld over het shirtvlak (x 78-122, y 112-162) en
// de twee broekspijpen (links x 77-98, rechts x 102-123, y 188-208). Een merkje
// dat over de splitsing tussen de pijpen valt breekt zichtbaar doormidden --
// vandaar per pijp één, niet één over het midden.
const PAT_SHIRT = {
  stars: `<text x="86" y="132" font-size="14" fill="#fff176">★</text><text x="104" y="152" font-size="12" fill="#fff176">★</text>
          <text x="82" y="200" font-size="11" fill="#fff176">★</text><text x="106" y="204" font-size="12" fill="#fff176">★</text>`,
  disco: `<circle cx="89" cy="128" r="4" fill="#fff" opacity="0.8"/><circle cx="110" cy="145" r="4" fill="#80deea" opacity="0.8"/>
          <circle cx="86" cy="196" r="4" fill="#f48fb1" opacity="0.8"/><circle cx="113" cy="200" r="4" fill="#fff59d" opacity="0.8"/>`,
  hearts: `<text x="87" y="132" font-size="13" fill="#fff">♥</text><text x="105" y="152" font-size="11" fill="#ffcdd2">♥</text>
          <text x="83" y="200" font-size="10" fill="#ffcdd2">♥</text><text x="107" y="204" font-size="11" fill="#fff">♥</text>`,
  // gouden sterren + maantje: het toveroutfit
  magic: `<text x="84" y="140" font-size="15" fill="#ffd54f">★</text><text x="84" y="201" font-size="10" fill="#ffd54f">★</text>
          <text x="107" y="205" font-size="9" fill="#ffd54f">★</text>
          <path d="M106 120 a9 9 0 1 0 6 15 a11 11 0 1 1 -6 -15 Z" fill="#ffe082"/>`,
  // zeemeermin-schubben: rijen lichte koepeltjes
  scales: `<g fill="none" stroke="rgba(255,255,255,.55)" stroke-width="2.5">
      <path d="M86 126 a7 7 0 0 1 14 0 M100 126 a7 7 0 0 1 14 0"/>
      <path d="M86 141 a7 7 0 0 1 14 0 M100 141 a7 7 0 0 1 14 0"/>
      <path d="M86 156 a7 7 0 0 1 14 0 M100 156 a7 7 0 0 1 14 0"/>
      <path d="M82 199 a7 7 0 0 1 14 0 M104 199 a7 7 0 0 1 14 0"/></g>`,
  // OHL: groene en rode baan langs de zijkant, clubletters op de borst, zwarte zoom
  ohl: `<path d="M82 109 L78 165 L84 166 L87 108 Z" fill="#2e7d32"/>
          <path d="M118 109 L122 165 L116 166 L113 108 Z" fill="#c62828"/>
          <text x="100" y="134" text-anchor="middle" font-size="10.5" font-weight="900" fill="#1b1b1b">OHL</text>
          <path d="M78 157 Q100 163 122 157 L122 165 Q100 171 78 165 Z" fill="#1b1b1b"/>`,
};

// Een basis erbij? Eén regel hier en één patronentabel hierboven -- de rest van
// de app (winkel, kleedkamer, trofeeën, opslag) hoeft er niets van te weten.
const BASES = {
  meisje: { hairBack: hairBackStaartjes, hairFront: hairFrontStaartjes, legs: legsBloot,  knie: KNIE_JURK,  torso: torsoJurk,  stof: stofJurk,  pat: PAT_JURK },
  jongen: { hairBack: hairBackKort,      hairFront: hairFrontKort,      legs: legsBroek,  knie: KNIE_BROEK, torso: torsoShirt, stof: stofShirt, pat: PAT_SHIRT },
};
// De keuze bij het maken van een ster. Vaste volgorde, met het woord erbij voor
// de ouder en de tekening zelf voor het kind dat nog niet leest. Dit hoort bij
// wie de ster ís -- net als bij een naam kan het achteraf niet meer wisselen, dus
// het staat níet in de kleedkamer tussen de spullen die je wél omruilt.
const BASE_CHOICES = [
  { id: 'meisje', emoji: '👧', name: 'Meisje' },
  { id: 'jongen', emoji: '👦', name: 'Jongen' },
];

let svgUid = 0;
/* Hoe groot het huisdier en het instrument naast de pop komen te staan. Ze staan
   buiten haar silhouet, dus hun maat bepaalt of ze bíj haar horen of met haar
   concurreren:
     groot  de kleedkamer -- daar past ze ze, dus daar moet je zien wát het is
     norm   overal waar de pop op ware grootte staat (show, eindscherm, kaart)
     klein  de sterrenkeuze -- daar staan zes tegels van ~112px naast elkaar, en op
            die maat werd een gitaar van 42px een tweede hoofdonderwerp naast een
            kind van 90px. Kleiner blijft het gewoon háár gitaar.
     kaart  de wereldkaart en de reis: daar staan ze er helemaal niet bij, en het
            zwevende nootje ook niet. Op de kaart zegt ze alleen "hier ben ik, en
            dat ben ik" -- wat ze áánheeft (haar, kleren, hoofddeksel, micro) doet
            dat. Elk los ding kreeg er zijn eigen witte stickerrand en werd een
            tweede en derde sticker naast de hare; een keyboard of DJ-set werd een
            wit vierkant tegeltje op de rand van haar halte. Huisdier en
            instrument horen bij het optreden: show, eindscherm, spiegel.
   De tekening is 250 hoog en de svg knipt alles weg wat eronder valt. Een emoji
   hangt tot bijna een kwart van zijn maat ónder zijn basislijn (de pootjes van
   een krab, de onderkant van een drumstel), dus staat die basislijn op
   248 - een kwart van de maat, en niet op de voeten. Een paar pixels hoger zie je
   niet; een afgehakt drumstel wel. Rechts is er ruimte genoeg: het breedste
   ding komt tot ~1,2 keer zijn maat voorbij x. */
const PROP_MAAT = {
  groot: { pet: [6, 236, 46],  instr: [112, 235, 52] },
  norm:  { pet: [18, 239, 34], instr: [120, 237, 42] },
  kaart: null,
  klein: { pet: [30, 238, 24], instr: [134, 241, 29] },
};
/* Het licht op de pop: één lamp linksboven, voor alles hetzelfde. Elk verloop
   ligt als tweede laag óp een vorm (zie stofJurk, hairBackStaartjes), en kent
   dus geen kleur -- alleen licht en schaduw. Met het nummer van de tekening
   erin, want er staan vaak tien poppen tegelijk op het scherm. */
function lichtDefs(uid) {
  return `<radialGradient id="bol${uid}" cx=".34" cy=".3" r=".8">
      <stop offset="0" stop-color="#fff" stop-opacity=".38"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity=".18"/></radialGradient>
    <radialGradient id="huid${uid}" cx=".42" cy=".38" r=".7">
      <stop offset=".6" stop-color="#e8836a" stop-opacity="0"/><stop offset="1" stop-color="#e8836a" stop-opacity=".22"/></radialGradient>
    <linearGradient id="stof${uid}" x1="0" y1="0" x2="1" y2=".35">
      <stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".42" stop-color="#fff" stop-opacity="0"/>
      <stop offset=".62" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".2"/></linearGradient>
    <radialGradient id="wang${uid}"><stop offset="0" stop-color="#ff8fa3" stop-opacity=".75"/><stop offset="1" stop-color="#ff8fa3" stop-opacity="0"/></radialGradient>
    <radialGradient id="vlek${uid}"><stop offset="0" stop-color="#fff" stop-opacity=".42"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <radialGradient id="grond${uid}"><stop offset="0" stop-color="#1a0628" stop-opacity=".6"/><stop offset=".5" stop-color="#1a0628" stop-opacity=".28"/><stop offset="1" stop-color="#1a0628" stop-opacity="0"/></radialGradient>`;
}
function avatarSVG(p, width, propMaat) {
  // true blijft 'groot': de kleedkamer geeft nog altijd een vlaggetje mee
  const kaart = propMaat === 'kaart';
  const pm = PROP_MAAT[propMaat === true ? 'groot' : propMaat] || PROP_MAAT.norm;
  const eq = p.equipped;
  const B = BASES[baseOf(p)];
  const hair = itemOr(eq.hair, 'hair_blond'), dress = itemOr(eq.dress, 'dress_roze');
  const mic = eq.mic ? item(eq.mic) : null;
  const acc = eq.acc ? item(eq.acc) : null;
  const pet = eq.pet && !kaart ? item(eq.pet) : null;
  const instr = eq.instrument && !kaart ? item(eq.instrument) : null;
  const uid = ++svgUid;
  const hc = hair.color === 'RAINBOW' ? `url(#rb${uid})` : hair.color;
  const dc = dress.color === 'RAINBOW' ? `url(#rb${uid})` : dress.color;

  let s = `<svg viewBox="0 0 200 250" width="${width}" xmlns="http://www.w3.org/2000/svg">`;
  s += `<defs><linearGradient id="rb${uid}" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#ff5f6d"/><stop offset="0.25" stop-color="#ffc371"/>
    <stop offset="0.5" stop-color="#8bd450"/><stop offset="0.75" stop-color="#47c9ff"/>
    <stop offset="1" stop-color="#b06ab3"/></linearGradient>${lichtDefs(uid)}</defs>`;
  /* Huisdier en instrument staan óp het podium, niet aan haar vast: in een
     eigen groep, zodat pasLaag ze uit de dansende tekening kan tillen (zie daar).

     In die groep ligt ook de SCHADUW op het podium: een zachte vlek onder elke
     schoen en een vage brede eronder, en een kleinere onder dier en instrument.
     Zonder schaduw zweefden ze vóór de schijf in plaats van erop te staan. Ze
     hoort in deze laag en niet in de tekening, want de tekening danst: een
     schaduw die mee de lucht in springt is geen schaduw. Hier blijft ze op de
     vloer en krimpt ze als zij opstijgt (zie .av-sch in het stijlblad).
     Alleen waar ze op een podium staat: de groep is er altijd (behalve op de
     kaart, die heeft zijn eigen sticker-schaduw), maar de vlekken staan met
     visibility="hidden" als áttribuut uit. Een portretje of een miniatuur zonder
     pas-laag laat ze dus weg; .prop-laag zet ze aan.
     Geen geneste groep hierin: PROPS_RE knipt tot de eerste sluit-g. */
  if (!kaart) {
    const vlek = (cls, cx, cy, rx, ry, sterk) =>
      `<ellipse class="av-sch ${cls}" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#grond${uid})" fill-opacity="${sterk}" visibility="hidden"/>`;
    // onder een emoji: midden ~ half zijn maat voorbij x, de inkt tot ~een vijfde onder de basislijn
    const onder = (cls, [x, y, m]) => vlek(cls + ' av-sch-wijd', +(x + m * .52).toFixed(1), +(y + m * .18).toFixed(1), +(m * .44).toFixed(1), +(m * .1).toFixed(1), .6)
      + vlek(cls, +(x + m * .52).toFixed(1), +(y + m * .18).toFixed(1), +(m * .26).toFixed(1), +(m * .055).toFixed(1), 1);
    s += '<g class="av-props">';
    s += vlek('av-sch-pop av-sch-wijd', 100, 239, 40, 8, .55)
      + vlek('av-sch-pop av-sch-l', 86, 238.6, 14, 4, 1) + vlek('av-sch-pop av-sch-r', 114, 238.6, 14, 4, 1);
    if (pet) s += onder('av-sch-dier', pm.pet);
    if (instr) s += onder('av-sch-instr', pm.instr);
    if (pet) s += `<text class="av-dier" x="${pm.pet[0]}" y="${pm.pet[1]}" font-size="${pm.pet[2]}">${pet.emoji}</text>`;
    if (instr) s += `<text class="av-instr" x="${pm.instr[0]}" y="${pm.instr[1]}" font-size="${pm.instr[2]}">${instr.emoji}</text>`;
    s += '</g>';
  }
  /* nek: een bruggetje tussen kin en kraag, áchter het hoofd. Zo valt de kin er
     vanzelf overheen en werpt hij een sikkeltje schaduw op de hals (dezelfde
     cirkel als het hoofd, een tikje lager, binnen de hals gehouden). Hier lag de
     nek eerst bóvenop het hoofd: dat verstopte de kin, en een open mond werd
     onderaan plat afgesneden. */
  s += `<clipPath id="nek${uid}"><rect x="90" y="94" width="20" height="18" rx="8"/></clipPath>`
    + `<rect x="90" y="94" width="20" height="18" rx="8" fill="${SKIN}"/>`
    + `<circle cx="100" cy="76.5" r="32" fill="#e6a183" opacity=".7" clip-path="url(#nek${uid})"/>`;
  /* Het hoofd is één groep, met alles wat erop zit: dan kan het los van het lijf
     meeknikken (.av-hoofd), en de staartjes erin nog eens naslingeren. */
  s += `<g class="av-hoofd">`;
  // haar achter het hoofd (staartjes, of de rand van een kort kapsel)
  s += B.hairBack(hc, `url(#bol${uid})`);
  // hoofd, met een warme rand
  s += `<circle cx="100" cy="72" r="32" fill="${SKIN}"/><circle cx="100" cy="72" r="32" fill="url(#huid${uid})"/>`;
  s += B.hairFront(hc);
  // glans: een zachte lichtvlek op de kruin. Een glansstreep las als een kras.
  s += `<ellipse cx="88" cy="41" rx="15" ry="7" transform="rotate(-18 88 41)" fill="url(#vlek${uid})"/>`;
  /* Ogen: een ovaaltje met een lichtje erin -- dat ene witte stipje maakt van een
     tekening een gezicht. Oog en lichtje zijn één groep, zodat knipperen (en
     schrikken, zie .oeps) ze samen meeneemt. De twee ogen samen zijn nog een
     groep: daarmee kijkt ze rond als het stil blijft (zie .kijkt). */
  const oog = x => `<g class="av-oog"><ellipse cx="${x}" cy="72" rx="3.7" ry="4.6" fill="#2b2238"/><circle cx="${x + 1.4}" cy="70.2" r="1.45" fill="#fff"/></g>`;
  s += `<g class="av-blik">${oog(88) + oog(112)}</g>`;
  s += `<circle cx="79" cy="82" r="7" fill="url(#wang${uid})"/><circle cx="121" cy="82" r="7" fill="url(#wang${uid})"/>`;
  /* Twee monden, en er staat er altijd maar één aan. De lach is de gewone; het
     rondje eronder is "oh!" -- de pop die schrikt van een misser (zie .oeps in
     het stijlblad en oepsGezicht). Het rondje staat met opacity="0" als
     áttribuut uit en niet in het stijlblad: deze tekening gaat ook zonder
     stijlblad over straat (een miniatuur, een geëxporteerd plaatje), en dan
     hoort ze gewoon te lachen. Een CSS-regel wint het van een attribuut, dus
     .oeps kan hem wél aanzetten. */
  // de lach is een open, zingende mond met een tongetje -- ze staat op een podium
  s += `<g class="av-mond"><path d="M91 85.5 Q100 89 109 85.5 Q107.5 94.5 100 94.5 Q92.5 94.5 91 85.5 Z" fill="#8a2f36"/>`
    + `<path d="M95 92.2 Q100 89.6 105 92.2 Q103 94.5 100 94.5 Q97 94.5 95 92.2 Z" fill="#ff8f9c"/></g>`;
  s += `<ellipse class="av-mond-o" cx="100" cy="89" rx="5" ry="6" fill="#8a2f36" opacity="0"/>`;
  // accessoire op het hoofd / gezicht
  if (acc) {
    /* Een item mag zijn eigen tekening meebrengen: acc.draw() geeft een stukje SVG
       terug in dezelfde 200x250-ruimte als de rest van de pop (hoofd op 100,72 met
       straal 32; boven het hoofd is vrij vanaf y≈40 tot y=0). Dat is precies wat de
       regels hieronder met de hand doen voor het kroontje, de bril enzovoort --
       met dit haakje hoeft er voor een nieuw item geen regel bij.

       De zes wereldbeloningen lopen hierlangs (fase 4D.2): hun vormen staan bij
       ITEMS zelf, niet hier. Wie géén `draw` meebrengt tekent zijn emoji via spot
       ('top' = op het hoofd, 'zij' = in het haar). */
    // (base, uid): de basis voor wie de vorm moet meebewegen, en het nummer van
    // déze tekening -- nodig om een eigen kleurverloop een id te geven dat niet
    // botst met de tien andere paspoppen die tegelijk op het scherm staan.
    if (acc.draw) s += acc.draw(baseOf(p), uid);
    else {
      if (acc.id === 'acc_strik') s += `<g transform="translate(100,36)"><path d="M0 0 L-17 -9 L-17 9 Z" fill="#ff4081"/><path d="M0 0 L17 -9 L17 9 Z" fill="#ff4081"/><circle r="5" fill="#c2185b"/></g>`;
      if (acc.id === 'acc_bloem') s += `<text x="55" y="52" font-size="22">🌸</text>`;
      if (acc.id === 'acc_bril') s += `<g><circle cx="88" cy="72" r="8.5" fill="#222"/><circle cx="112" cy="72" r="8.5" fill="#222"/><line x1="96" y1="72" x2="104" y2="72" stroke="#222" stroke-width="3"/></g>`;
      if (acc.id === 'acc_koptel') s += `<path d="M68 58 A33 35 0 0 1 132 58" stroke="#e91e63" fill="none" stroke-width="7" stroke-linecap="round"/><circle cx="67" cy="68" r="8" fill="#ad1457"/><circle cx="133" cy="68" r="8" fill="#ad1457"/>`;
      if (acc.id === 'acc_kroon') s += `<path d="M78 40 L84 22 L94 34 L100 18 L106 34 L116 22 L122 40 Z" fill="#ffd740" stroke="#c8a200" stroke-width="2"/><circle cx="100" cy="18" r="3" fill="#ff4081"/>`;
      // nieuwe extra's tekenen generiek via hun emoji: 'zij' = in het haar, 'top' = op het hoofd
      if (acc.spot === 'zij') s += `<text x="53" y="54" font-size="24">${acc.emoji}</text>`;
      if (acc.spot === 'top') s += `<text x="85" y="34" font-size="30">${acc.emoji}</text>`;
    }
  }
  s += `</g>`;   // einde van het hoofd
  // armen: vóór de kleren getekend (i.p.v. erna), zodat de schouders van het
  // kledingstuk er straks overheen vallen -- ziet er zo aan het lichaam vast uit
  // i.p.v. los bovenop geplakt. In rust zijn beide armen elkaars exacte
  // spiegelbeeld in hoek en lengte, hand komt ~halverwege het kledingstuk uit;
  // met een mic/toverstaf wijkt de rechter vanzelfsprekend af (opgeheven naar
  // het gezicht). De bijbehorende decoratie (mic-kop, sterpunt, ...) komt
  // pas ná de kleren (zie verderop) zodat die zelf nooit erdoor verdwijnt.
  // Elke arm eindigt in een handje (zonder leek het een stompje). De vrije arm is
  // een groep: bij een danspasje gaat hij de lucht in (.av-arm-l).
  //
  // EN HIJ VERANDERT DAARBIJ VAN VORM. De bocht van de arm is getekend voor
  // hangen: naar buiten, langs de jurk. Draai je die arm omhoog, dan bolt hij
  // naar beneden en hangt hij als een slap sliertje. Dus vervormt hij onderweg
  // naar dezelfde arm met de bocht de andere kant op -- zelfde schouder, zelfde
  // hand, zelfde lengte. Een SMIL-animatie op d, en niet in het stijlblad: CSS
  // kan een pad niet vervormen in Safari. Ze staat op begin="indefinite" en
  // zetPas start haar, dus deze tekening doet uit zichzelf niets. De duur en de
  // drie stukken (omhoog, boven, omlaag) lopen gelijk met armOp; zie daar.
  // Geen elleboog: een knik in een stokje van negen pixels dik las als een
  // gebroken arm.
  const hand = (x, y) => `<circle cx="${x}" cy="${y}" r="5.6" fill="${SKIN}"/>`;
  const ARM = 'M84 112 Q68 132 64 157', ARM_OP = 'M84 112 Q77 136 64 157';
  s += `<g class="av-arm-l"><path d="${ARM}" stroke="${SKIN}" stroke-width="9" fill="none" stroke-linecap="round">`
    + `<animate class="av-arm-vorm" attributeName="d" dur="${PAS}ms" begin="indefinite" values="${ARM};${ARM_OP};${ARM_OP};${ARM}" keyTimes="0;.22;.78;1" calcMode="spline" keySplines=".42 0 .58 1;0 0 1 1;.42 0 .58 1"/>`
    + `</path>${hand(64, 158)}</g>`;
  s += mic
    ? `<path d="M116 112 Q134 98 145 80" stroke="${SKIN}" stroke-width="9" fill="none" stroke-linecap="round"/>`
    : `<path d="M116 112 Q132 132 136 157" stroke="${SKIN}" stroke-width="9" fill="none" stroke-linecap="round"/>${hand(136, 158)}`;
  // benen: blote benen onder een zoom, of de broekspijpen zelf
  s += B.legs(dc);
  // romp: jurk of shirt, in de kleur (en het patroon) van hetzelfde ene item
  s += B.torso(dc, mic);
  if (dress.pattern && B.pat[dress.pattern]) s += B.pat[dress.pattern];
  s += B.stof(`url(#stof${uid})`);
  // schoenen (schoenkleur is een eigen categorie in de kleedkamer)
  const shoe = eq.shoes ? item(eq.shoes) : null;
  const sc = shoe ? (shoe.color === 'RAINBOW' ? `url(#rb${uid})` : shoe.color) : '#e91e63';
  // met een zooltje en een glimlichtje: lak, geen pantoffel. Elke schoen zit in
  // de groep van zijn been (zie beenGroep), zodat hij meeschopt.
  const schoen = (kant, x, knie) => beenGroep(kant, knie, `<ellipse cx="${x}" cy="234" rx="11" ry="6" fill="${sc}"/>`
    + `<path d="M${x - 10.5} 236 Q${x} 241 ${x + 10.5} 236" stroke="#000" stroke-opacity=".18" stroke-width="2.4" fill="none"/>`
    + `<ellipse cx="${x - 4}" cy="231.4" rx="4" ry="1.7" fill="#fff" opacity=".55"/>`);
  s += schoen('l', 86, B.knie[0]) + schoen('r', 114, B.knie[1]);
  // vastgehouden voorwerp: pas ná de kleren getekend (en na de arm zelf,
  // hierboven), zodat de decoratie nooit onder een schouder verdwijnt. De hand
  // komt over de steel en onder de kop: zo houdt ze hem echt vast.
  if (mic) {
    if (mic.id === 'mic_pintje') {
      // proost! een pintje in de opgeheven hand
      s += hand(145, 81) + `<text x="135" y="82" font-size="26">🍺</text>`;
    } else if (mic.id === 'mic_toverstaf') {
      // toverstaf met fonkelende sterpunt
      s += `<line x1="145" y1="80" x2="159" y2="54" stroke="#6d4c41" stroke-width="4.5" stroke-linecap="round"/>` + hand(145, 81);
      s += `<text x="150" y="58" font-size="18">⭐</text><text x="165" y="40" font-size="12">✨</text>`;
    } else if (mic.emoji) {
      // emoji-microfoon (ijsje, vuur): zelfde steel, het emoji als kop
      s += `<line x1="145" y1="80" x2="153" y2="68" stroke="#555" stroke-width="5" stroke-linecap="round"/>` + hand(145, 81);
      s += `<text x="144" y="70" font-size="22">${mic.emoji}</text>`;
    } else {
      s += `<line x1="145" y1="80" x2="153" y2="68" stroke="#555" stroke-width="5" stroke-linecap="round"/>` + hand(145, 81);
      s += `<circle cx="156" cy="63" r="9" fill="${mic.color === 'RAINBOW' ? `url(#rb${uid})` : mic.color}" stroke="#666" stroke-width="1.5"/>`;
      if (!kaart) s += `<text x="163" y="47" font-size="15">🎵</text>`;
    }
  }
  s += `</svg>`;
  return s;
}
function applyStage(el, p) {
  const st = itemOr(p.equipped.stage, 'stage_disco');
  /* Iedereen staat op een podium: haar eigen, of het parelpodium (stage_disco).
     Op de show, het eindscherm, haar tegel op het startscherm en in het
     nieuwe-ster-formulier -- en in de spiegel (die tekent zijn eigen schijf, zie
     paintShop). Hier stond eerst "op Disco niet", en dan stonden er op het
     startscherm sterren mét en zonder podium naast elkaar.
     Het oude decorvlak (st.bg met drie emoji in de hoeken) is weg: één achtergrond
     voor iedereen (zie .stage), en het podium is wat haar onderscheidt.
     In een zaal vervangt de schijf de gouden richel: de ouder van het podium (het
     paneel met .venue-vloer erin) krijgt .met-podium, en de richel wijkt. De maat
     (1,35 x haar breedte, voeten midden op de bovenkant) staat in het stijlblad
     bij .stage-podium. */
  el.style.background = '';
  el.querySelectorAll('.deco, .stage-podium').forEach(d => d.remove());
  el.classList.add('op-podium');
  const ouder = el.parentElement;
  if (ouder && [...ouder.children].some(c => c.classList && c.classList.contains('venue-vloer'))) ouder.classList.add('met-podium');
  const schijf = document.createElement('div');
  schijf.className = 'stage-podium';
  schijf.innerHTML = podiumHTML(st);
  el.insertBefore(schijf, el.firstChild);
}

/* Knipperen. Elke pop in beeld knippert op haar eigen, onregelmatige ritme:
   ergens tussen drie en zeven tellen, en af en toe twee keer kort na elkaar --
   zoals mensen knipperen. Eerst was het een CSS-animatie van 4,6 tellen, en dan
   knipperden alle sterren op de sterrenkeuze precies tegelijk: een schermpje dat
   een animatie afspeelt, terwijl daar juist nooit twee tegelijk iets doen (zie
   "= De sterrenkeuze leeft").

   Het is een klasse die even aan en weer uit gaat, geen animatie: op de kaart
   draagt ze een SVG-filter dat bij elke beweging ín haar opnieuw berekend wordt,
   en zo kost een knipoog daar twee keer tekenen en verder niets. De volgende
   knipoog van elke pop hangt aan de pop zelf (een nieuwe tekening begint op een
   toevallig moment), en er draait maar één klokje voor allemaal. Alleen in het
   scherm dat open is, met het tabblad zichtbaar, en als er beweging mag.

   Dat klokje tikt niet op de maat maar slaapt tot de eerstvolgende knipoog, en
   staat stil waar geen pop staat (het ouderdeel, een tabblad op de achtergrond).
   Eerst was het een setInterval van vier keer per seconde, op elk scherm: weinig
   werk per tik, maar het liet een telefoon nooit tot rust komen. show() en het
   terugkomen van het tabblad wekken hem (knipperWek). */
const KNIPPER = { tik: 250, min: 3000, max: 7000, dicht: 130, dubbel: .18, tussen: 280, uitDePas: 900 };
let knipperLaatst = 0;
const KNIPPER_POPS = '.screen.active .avatar-holder.levend, #screen-map.active .tour-hero .avatar-holder';
function knipOog(pop) {
  pop.classList.add('knipoog');
  setTimeout(() => pop.classList.remove('knipoog'), KNIPPER.dicht);
}
let knipperKlok = null;
function knipperWek(na = KNIPPER.tik) {
  clearTimeout(knipperKlok);
  knipperKlok = setTimeout(knipperLus, na);
}
function knipperLus() {
  knipperKlok = null;
  if (document.hidden || motionOff()) return;
  const nu = Date.now();
  const pops = document.querySelectorAll(KNIPPER_POPS);
  pops.forEach(pop => {
    const wacht = () => KNIPPER.min + Math.random() * (KNIPPER.max - KNIPPER.min);
    if (!pop.knipperOp) { pop.knipperOp = nu + Math.random() * KNIPPER.max; return; }
    if (nu < pop.knipperOp) return;
    // nooit twee tegelijk: wie aan de beurt is terwijl een ander net knippert,
    // wacht een tel langer
    if (nu - knipperLaatst < KNIPPER.uitDePas) { pop.knipperOp = nu + KNIPPER.uitDePas; return; }
    knipperLaatst = nu;
    knipOog(pop);
    if (Math.random() < KNIPPER.dubbel) setTimeout(() => knipOog(pop), KNIPPER.tussen);
    pop.knipperOp = nu + wacht();
  });
  // Geen pop in beeld: stilstaan tot show() of het tabblad hem wekt. Anders
  // slapen tot de eerstvolgende is (nooit korter dan een tik: zo vangt hij ook
  // een pop die er tussendoor bij komt, op zijn laatst bij haar eigen beurt).
  if (!pops.length) return;
  let eerst = Infinity;
  pops.forEach(pop => { eerst = Math.min(eerst, pop.knipperOp); });
  knipperWek(Math.max(KNIPPER.tik, eerst - nu));
}
knipperWek();
document.addEventListener('visibilitychange', () => { if (!document.hidden) knipperWek(); });

