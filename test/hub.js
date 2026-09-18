/*
 * De ontwikkelstudio: de pagina waar je op uitkomt met `npm run studio`.
 *
 * Eén scherm, twee werkbladen, en een klein hoekje ernaast:
 *
 *   TESTOMGEVING   speel en controleer de game in een gekozen toestand
 *   WERELDSTUDIO   bouw en beheer de werelden
 *   App & merk     het beeld dat bij de héle app hoort en bij geen wereld
 *
 * Dat zijn geen drie panelen die toevallig naast elkaar staan. Het zijn twee
 * bezigheden -- iets nakijken en iets maken -- en één voorraadkast. Wie een stand
 * wil zien hoeft niets over werelden te weten; wie een wereld bouwt hoeft niet
 * langs de gitknoppen. Het derde hoekje bestaat omdat het startscherm, het logo
 * en het app-icoon van niemand zijn zolang ze in een wereld gepropt worden.
 *
 * Wat de pagina níét is: een tweede spel. Rechts draait index.html zoals hij is,
 * met de vlaggen die index.html zelf al kent. Er staat geen nagebouwde kaart in en
 * geen eigen begrip van voortgang -- de standen zijn p.stars en p.level, precies
 * wat het spel opslaat. Alles wat écht tekenen is (haltes zetten, kleuren kiezen,
 * de weg buigen) blijft in de wereldstudio ín de app (?debug&mapedit); die opent
 * hier gewoon in het kijkvak.
 *
 * Er zit geen bibliotheek in en er is geen bouwstap. De pagina is één bestand dat
 * deze functie uitschrijft, net als de app zelf.
 */
const scenario = require('./scenario');
const scene = require('./scene');

const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* De opmaak. Eén accent (goud) voor "dit is actief of dit is de hoofdknop", en
   verder vooral afstand en hiërarchie in plaats van randen: een vak in een vak in
   een vak leest als ruis, en dan weegt alles even zwaar. */
const CSS = `
:root{
  --bg:#0c0517; --vlak:#150c23; --vlak2:#1c1230; --rand:#2b1e3d; --lijn:#231734;
  --tekst:#f2ecf8; --zacht:#a08ab8; --stil:#7d6a95;
  --goud:#ffb43d; --groen:#7fe0a8; --rood:#ff8f7a; --blauw:#8fd6ff;
  --kop:44px;
}
*{box-sizing:border-box}
html,body{height:100%}
body{margin:0;background:var(--bg);color:var(--tekst);overflow-x:hidden;
  font:13px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}
a{color:var(--blauw)}
button,select,input{font:inherit;color:inherit}
h2,h3,h4{margin:0;font-weight:600}

/* ---- de schil ------------------------------------------------------------- */
header{display:flex;align-items:center;gap:12px;height:var(--kop);padding:0 14px;
  border-bottom:1px solid var(--lijn);background:var(--vlak);
  position:sticky;top:0;z-index:20}
.merk{font-size:13px;font-weight:700;letter-spacing:.01em;white-space:nowrap}
.merk span{color:var(--stil);font-weight:400}
/* de werkbladkiezer: twee bezigheden, en ze horen als één ding te lezen */
.kiezer{display:flex;background:#0f0719;border:1px solid var(--rand);border-radius:8px;padding:2px;gap:2px}
.kiezer button{background:none;border:0;border-radius:6px;padding:4px 12px;cursor:pointer;
  color:var(--zacht);font-weight:600;letter-spacing:.02em;white-space:nowrap}
.kiezer button:hover{color:var(--tekst)}
.kiezer button.op{background:#32204a;color:var(--goud)}
.watdoetdit{color:var(--stil);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.rechts{margin-left:auto;display:flex;align-items:center;gap:10px;flex:none}
/* het hoekje ernaast -- bewust stiller dan de twee werkbladen */
#naar-merk{background:none;border:1px solid var(--rand);border-radius:7px;padding:4px 10px;
  color:var(--zacht);cursor:pointer}
#naar-merk:hover{color:var(--tekst);border-color:#42305e}
#naar-merk.op{border-color:var(--goud);color:var(--goud)}
.bouwchip{display:flex;align-items:center;gap:7px;font:600 12px ui-monospace,monospace;
  color:var(--zacht);white-space:nowrap}
.stip{width:8px;height:8px;border-radius:99px;background:var(--groen);flex:none}
.stip.let{background:var(--goud)} .stip.fout{background:var(--rood)}

/* ---- het rooster ---------------------------------------------------------- */
.werkblad{display:grid;gap:16px;padding:14px;align-items:start;
  grid-template-rows:auto minmax(0,1fr)}
body[data-blad="test"] .werkblad{grid-template-columns:332px minmax(0,1fr);
  grid-template-areas:"zij kijk" "zij kijk"}
body[data-blad="wereld"] .werkblad{grid-template-columns:212px 358px minmax(0,1fr);
  grid-template-areas:"lijst editor kijk" "lijst editor kijk"}
body[data-blad="merk"] .werkblad{grid-template-columns:392px minmax(0,1fr);
  grid-template-areas:"merkvak kijk" "merkvak kijk"}
#zij{grid-area:zij} #wlijst-vak{grid-area:lijst} #weditor{grid-area:editor}
#merkvak{grid-area:merkvak} .kijk{grid-area:kijk}
/* Wat niet in dit werkblad hoort staat er ook niet: een paneel met een grid-area
   die in dit rooster niet bestaat, wordt door de browser ergens anders neergezet
   en duwt dan het kijkvak weg. Weg is hier dus letterlijk weg. */
body[data-blad="test"] #wlijst-vak, body[data-blad="test"] #weditor,
body[data-blad="test"] #merkvak,
body[data-blad="wereld"] #zij, body[data-blad="wereld"] #merkvak,
body[data-blad="merk"] #zij, body[data-blad="merk"] #wlijst-vak,
body[data-blad="merk"] #weditor{display:none}
[hidden]{display:none!important}
/* Een laptop van 1280 heeft geen drie volle kolommen; dan gaat de wereldlijst
   bóven de editor staan en houdt het kijkvak zijn breedte. */
@media (max-width:1340px){
  body[data-blad="wereld"] .werkblad{grid-template-columns:330px minmax(0,1fr);
    grid-template-areas:"lijst kijk" "editor kijk"}
}
@media (max-width:1020px){
  body[data-blad="test"] .werkblad,
  body[data-blad="merk"] .werkblad{grid-template-columns:300px minmax(0,1fr)}
  body[data-blad="wereld"] .werkblad{grid-template-columns:300px minmax(0,1fr)}
}
.paneel{display:flex;flex-direction:column;gap:14px;min-width:0;
  position:sticky;top:calc(var(--kop) + 14px);max-height:calc(100vh - var(--kop) - 28px);
  overflow:auto;overscroll-behavior:contain;padding-right:6px}
.paneel::-webkit-scrollbar{width:8px}
.paneel::-webkit-scrollbar-thumb{background:#2b1e3d;border-radius:8px}
/* twee panelen naast elkaar in dezelfde kolom (wereldlijst boven de editor) */
@media (max-width:1340px){
  body[data-blad="wereld"] #wlijst-vak{position:static;max-height:none}
  body[data-blad="wereld"] #weditor{top:calc(var(--kop) + 14px);max-height:calc(100vh - var(--kop) - 28px)}
}

/* ---- secties: een kop, wat eronder, en een haarlijn ertussen --------------- */
.vak{display:flex;flex-direction:column;gap:8px;flex:none}
.vak + .vak{border-top:1px solid var(--lijn);padding-top:14px}
.vak > h2{font-size:10.5px;letter-spacing:.13em;text-transform:uppercase;color:var(--stil);
  display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
.vak > h2 .tel{color:var(--zacht);letter-spacing:0;text-transform:none;font-weight:400;font-size:11px}
.vak.vouw > h2{cursor:pointer;user-select:none}
.vak.vouw > h2::before{content:'▾';font-size:9px;opacity:.6}
.vak.dicht > h2::before{content:'▸'}
.vak.dicht > :not(h2){display:none}
.groep{display:flex;flex-direction:column;gap:6px}
.groep > h3{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--zacht)}
.rij{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.rij.eind{justify-content:flex-end}

/* ---- bedieningen: één hoogte, één vorm ------------------------------------ */
button{background:#241635;border:1px solid var(--rand);border-radius:7px;padding:0 10px;
  height:28px;line-height:1;display:inline-flex;align-items:center;gap:6px;cursor:pointer}
button:hover:not(:disabled){border-color:#4a3566;background:#2c1b40}
button.op{border-color:var(--goud);color:var(--goud);background:#2b1d16}
button.prim{background:#3a2352;border-color:#57407a}
button.stil{background:none;border-color:transparent;color:var(--zacht)}
button.stil:hover:not(:disabled){color:var(--tekst);background:#1f1330}
button:disabled{opacity:.35;cursor:default}
select,input[type=text],input[type=number]{background:#1a1029;border:1px solid var(--rand);
  border-radius:7px;height:28px;padding:0 7px;max-width:100%;min-width:0}
input[type=number]{width:74px}
label.veld{display:flex;flex-direction:column;gap:3px;min-width:0}
label.veld > span{font-size:11px;color:var(--zacht)}
.raster2{display:grid;grid-template-columns:1fr 1fr;gap:7px}
small,.zacht{color:var(--zacht)}
.stiller{color:var(--stil);font-size:11.5px}
.mono{font:12px/1.5 ui-monospace,SFMono-Regular,monospace}

/* ---- status: één woordenlijst, één vorm ----------------------------------- */
.chip{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;padding:2px 8px;
  border-radius:99px;background:#1f1330;color:var(--zacht);white-space:nowrap}
.chip.ok{color:var(--groen)} .chip.let{color:var(--goud)} .chip.fout{color:var(--rood)}
.chip.ok::before,.chip.let::before,.chip.fout::before{content:'';width:6px;height:6px;
  border-radius:99px;background:currentColor}
.melding{padding:7px 9px;border-radius:8px;background:#1a1029;border-left:3px solid var(--rand);
  white-space:pre-wrap;font-size:12px;overflow-wrap:anywhere}
.melding.fout{border-left-color:var(--rood)}
.melding.let{border-left-color:var(--goud)}
.melding.ok{border-left-color:var(--groen)}
.melding:empty{display:none}
.melding.mono{font:11.5px/1.5 ui-monospace,monospace;max-height:150px;overflow:auto}

/* ---- huidige build -------------------------------------------------------- */
.bouwkop{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
.bouwkop b{font-size:14px}
.bouwkop .sha{font:12px ui-monospace,monospace;color:var(--zacht)}
.bouwkop .los{font-size:11px;color:var(--goud)}
details.tech{font-size:12px}
details.tech > summary{cursor:pointer;color:var(--stil);font-size:11.5px;list-style:none}
details.tech > summary::before{content:'▸ ';font-size:9px}
details.tech[open] > summary::before{content:'▾ '}
.kv{display:grid;grid-template-columns:auto 1fr;gap:2px 10px;margin:7px 0 0;font-size:12px}
.kv dt{color:var(--stil)} .kv dd{margin:0;overflow-wrap:anywhere;color:var(--zacht)}

/* ---- wereldlijst ---------------------------------------------------------- */
.wlijst{display:flex;flex-direction:column;gap:2px}
.w{display:grid;grid-template-columns:20px 1fr auto;gap:8px;align-items:center;height:auto;
  padding:6px 8px;border-radius:8px;border:1px solid transparent;background:none;
  text-align:left;width:100%;cursor:pointer}
.w:hover{background:#1a1029}
.w.op{background:#2b1d16;border-color:var(--goud)}
.w .ic{font-size:15px;line-height:1}
.w .nm{min-width:0;display:flex;flex-direction:column;gap:1px}
.w .nm b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}
.w .nm small{color:var(--stil);font-size:10.5px}
.w.op .nm small{color:var(--zacht)}
.bol{width:7px;height:7px;border-radius:99px;background:var(--groen);flex:none}
.bol.let{background:var(--goud)} .bol.fout{background:var(--rood)}

/* ---- keuringspunten ------------------------------------------------------- */
.punt{display:flex;gap:7px;align-items:flex-start;font-size:12px;color:var(--zacht);
  padding:5px 8px;border-radius:7px;background:#1a1029}
.punt .bol{margin-top:5px}
.punt b{display:block;color:var(--tekst);font-weight:600}

/* ---- het beeldkaartje: overal hetzelfde ----------------------------------- */
.kaart{display:grid;grid-template-columns:76px 1fr;gap:10px;padding:9px;border-radius:10px;
  background:var(--vlak2);border:1px solid transparent;cursor:pointer}
.kaart:hover{border-color:#42305e}
.kaart.over{border-color:var(--goud);background:#2b1d16}
/* Een kandidaat is nog niet opgeslagen, en dat hoort te zien te zijn zonder dat je
   het bijschrift leest. */
.kaart.kandidaat{border-color:var(--goud);background:#231a2c;
  box-shadow:inset 3px 0 0 var(--goud)}
/* contain en niet cover: de verhouding van het bestand is hier informatie --
   daar hangt af of de kaart straks een strook wegsnijdt. */
.kaart .vb{width:76px;height:76px;border-radius:8px;background:#0a0413 center/contain no-repeat;
  border:1px solid var(--rand);display:flex;align-items:center;justify-content:center;
  color:var(--stil);font-size:20px}
.kaart .op1{display:flex;flex-direction:column;gap:3px;min-width:0}
.kaart .naam{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
.kaart .naam b{font-size:13px}
.kaart .maat{font:11.5px ui-monospace,monospace;color:var(--zacht)}
.kaart .pad{font:11px/1.45 ui-monospace,monospace;color:var(--stil);overflow-wrap:anywhere;
  white-space:pre-wrap}
.kaart .let{font-size:11.5px;color:var(--goud);white-space:pre-wrap}
.kaart .doe{display:flex;gap:6px;flex-wrap:wrap;margin-top:3px}
.kaart .doe button{height:24px;font-size:12px}

/* ---- het kijkvak ---------------------------------------------------------- */
.kijk{display:flex;flex-direction:column;gap:8px;min-width:0;align-items:center;
  position:sticky;top:calc(var(--kop) + 14px)}
/* De bedieningen van het kijkvak staan bij het kijkvak, niet in de zijkolom: ze
   gelden in alle drie de werkbladen, en "welk toestel" is een vraag over wat je
   ziet. Boven de balk hangt de échte maat, precies zo breed als het vak zelf --
   anders zweeft "412 × 920" helemaal links terwijl het toestel in het midden
   staat, en dan hoort de maat zichtbaar bij niets. */
.kijkbalk{display:flex;gap:8px;align-items:center;flex-wrap:wrap;width:100%}
.kijkbalk .lab{font-size:11px;color:var(--stil)}
.kijkbalk .scheid{width:1px;height:18px;background:var(--lijn)}
.kijkmaat{display:flex;gap:8px;align-items:baseline;justify-content:center;
  width:var(--doosb,100%);max-width:100%}
.kijkmaat .maat{font:600 12px ui-monospace,monospace;color:var(--tekst)}
.kijkmaat .schaal{font:11.5px ui-monospace,monospace;color:var(--stil)}
.doos{border-radius:16px;background:#000;overflow:hidden;flex:none;
  box-shadow:0 18px 50px rgba(0,0,0,.55),0 0 0 1px var(--rand)}
.doos iframe{border:0;display:block;background:#000}
.nu{font:11px/1.5 ui-monospace,monospace;color:var(--stil);overflow-wrap:anywhere;
  width:100%;text-align:center}
`;

/* Het scriptblok van de pagina. Staat als tekst in dit bestand en niet in een
   los .js: de studio is bewust één pagina die de server uitschrijft, zodat er
   geen tweede bestand is dat je kunt vergeten mee te sturen. */
const JS = String.raw`
const $ = s => document.querySelector(s);
const el = (t, k, tx) => { const e = document.createElement(t); if (k) e.className = k;
  if (tx != null) e.textContent = tx; return e; };
const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ---- de woordenlijst ------------------------------------------------------
   Dezelfde stand hoort overal hetzelfde te heten. Acht woorden, en geen negende:
   wie "dirty", "stale" of "HEAD detached" leest moet raden, en raden kost meer
   dan het scheelt. De techniek blijft staan -- in de details en in de tooltip. */
const WOORD = {
  opgeslagen: 'Opgeslagen', nietOpgeslagen: 'Niet opgeslagen', gewijzigd: 'Gewijzigd',
  waarschuwing: 'Waarschuwing', fout: 'Fout', opgehaald: 'Opgehaald',
  up: 'Up-to-date', nieuwer: 'Main is nieuwer',
};
const WERKBLADEN = {
  test:   { naam: 'Testomgeving', wat: 'Speel en controleer de game in een gekozen toestand' },
  wereld: { naam: 'Wereldstudio', wat: 'Bouw en beheer de werelden' },
  merk:   { naam: 'App & merk',   wat: 'Beeld dat bij de hele app hoort, niet bij één wereld' },
};

/* ---- de stand van de studio zelf -------------------------------------------
   Eén object, zodat "wat staat er aan" op één plek te lezen is. De wereldkeuze en
   het toestel zijn gedeeld -- dat is wat je tussen twee werkbladen wél wilt
   meenemen. De rest is per werkblad, en daarom wordt de URL bij het wisselen
   opnieuw opgebouwd in plaats van meegesleept: zo staat er nooit een scherm uit
   het ene werkblad in het andere. */
const S = {
  blad: 'test',
  wereld: 1,
  toestel: TOESTELLEN[0].id,
  eigen: { w: 412, h: 920 },
  test: { star: 'p1', stand: 'halverwege', diamanten: '', screen: 'map' },
  wstand: 'halverwege',
  bewerken: false,
  vlaggen: {},
  url: '',
};
let WERELDEN = null, BEELDEN = null;

/* ---- foutafhandeling -------------------------------------------------------
   Een storing hoort niet als kale JavaScript onderin te belanden. Drie zinnen:
   wat er misging, wat er met je werk gebeurd is, waar de details staan. De volle
   waarheid gaat naar de console -- die is er voor wie hem nodig heeft, en hij
   wordt tijdens het ontwikkelen nooit ingeslikt. */
function meld(waar, soort, tekst) {
  const m = $(waar);
  if (!m) return;
  m.className = 'melding' + (soort ? ' ' + soort : '');
  m.textContent = tekst || '';
}
function meldFout(waar, wat, err, raad) {
  console.error('[studio] ' + wat, err);
  meld(waar, 'fout', wat + '.\n' + (raad || 'Je huidige werk blijft staan.')
    + '\nBekijk de console voor technische details.');
}

/* ---- het kijkvak -----------------------------------------------------------
   Het spel is hier de hoofdzaak, niet een postzegel naast de knoppen. Het vak
   groeit dus mee met het venster en mag ook groter dan ware grootte -- tot
   MAX_SCHAAL, want daarboven kijk je naar vergrote pixels in plaats van naar het
   spel. De échte toestelmaat staat er altijd bij: dát is wat een telefoon doet,
   en de schaal is alleen hoe hard we hem voor jouw ogen opblazen. */
const MAX_SCHAAL = 1.5;
function maat() {
  if (!S.toestel || S.toestel === 'vullend') return null;   // vullend = zo groot als het vak
  if (S.toestel === 'eigen') return { w: S.eigen.w, h: S.eigen.h };
  const d = S.toestel.split('x');
  return { w: +d[0], h: +d[1] };
}
function pasVak() {
  const doos = $('#doos'), f = $('#spel'), m = maat();
  const top = doos.getBoundingClientRect().top;
  const ruimH = Math.max(320, innerHeight - top - 40);
  const ruimB = Math.max(280, $('.kijk').clientWidth);
  if (!m) {
    doos.style.width = ruimB + 'px'; doos.style.height = ruimH + 'px';
    f.style.width = ruimB + 'px'; f.style.height = ruimH + 'px';
    f.style.transform = '';
    $('.kijk').style.setProperty('--doosb', Math.round(ruimB) + 'px');
    $('#maat').textContent = Math.round(ruimB) + ' × ' + Math.round(ruimH);
    $('#schaal').textContent = 'vullend';
    return;
  }
  const s = Math.min(MAX_SCHAAL, ruimH / m.h, ruimB / m.w);
  f.style.width = m.w + 'px'; f.style.height = m.h + 'px';
  f.style.transformOrigin = '0 0';
  f.style.transform = 'scale(' + s + ')';
  doos.style.width = Math.round(m.w * s) + 'px';
  doos.style.height = Math.round(m.h * s) + 'px';
  $('.kijk').style.setProperty('--doosb', Math.round(m.w * s) + 'px');
  $('#maat').textContent = m.w + ' × ' + m.h;
  $('#schaal').textContent = Math.round(s * 100) + '%';
}
function ga(u) {
  S.url = u;
  $('#spel').src = u;
  $('#nu').textContent = u;
}
function herlaad() { ga(S.url); }

/* De schakelaars van de beeldkeuring werken door een stijlblad ín het vak te
   hangen. Dat kan omdat de studio en het spel op dezelfde server staan, en het
   betekent dat er in het spel zelf geen enkele regel voor nodig is -- geen
   debug-CSS die per ongeluk meegaat naar een kind. */
const OVERLAYS = {
  randen: '*{outline:1px solid rgba(255,180,61,.35)!important}',
  raster: 'body::after{content:"";position:fixed;inset:0;z-index:99998;pointer-events:none;' +
    'background:linear-gradient(to right,rgba(143,214,255,.25) 1px,transparent 1px) 0 0/10% 100%,' +
    'linear-gradient(to bottom,rgba(143,214,255,.25) 1px,transparent 1px) 0 0/100% 10%}',
  stil: '*,*::before,*::after{animation:none!important;transition:none!important;' +
    'scroll-behavior:auto!important}',
};
function pasOverlays() {
  const d = $('#spel').contentDocument;
  if (!d || !d.head) return;
  let st = d.getElementById('studio-qa');
  if (!st) { st = d.createElement('style'); st.id = 'studio-qa'; d.head.appendChild(st); }
  st.textContent = Object.keys(OVERLAYS).filter(k => S.vlaggen[k]).map(k => OVERLAYS[k]).join('\n');
}

/* ---- de URL van het werkblad -----------------------------------------------
   Elk werkblad stelt zijn eigen stand samen; er wordt niets van het ene naar het
   andere meegesleept behalve de wereld die je gekozen hebt. Zo kan er nooit een
   kleedkamer uit de Testomgeving in de Wereldstudio blijven hangen. */
function bladUrl() {
  if (S.blad === 'wereld') {
    return bouw({ wereld: S.wereld, stand: S.wstand, screen: 'map',
                  mapedit: S.bewerken ? 1 : 0 });
  }
  if (S.blad === 'merk') return bouw({ screen: 'profile' });
  const t = S.test;
  return bouw({ star: t.star, wereld: S.wereld, stand: t.stand,
                diamanten: t.diamanten === '' ? null : Number(t.diamanten),
                screen: t.screen });
}
function toonBlad() { ga(bladUrl()); }

/* ---- werkblad wisselen ---------------------------------------------------- */
function naarBlad(naam) {
  if (S.blad === naam) return;
  if (naam !== 'wereld') S.bewerken = false;   // "bewerken" hoort bij één werkblad
  S.blad = naam;
  document.body.dataset.blad = naam;
  document.querySelectorAll('.kiezer button').forEach(b => b.classList.toggle('op', b.dataset.blad === naam));
  $('#naar-merk').classList.toggle('op', naam === 'merk');
  $('#watdoetdit').textContent = WERKBLADEN[naam].wat;
  if (naam === 'wereld' && S.toestel === 'vullend') S.toestel = TOESTELLEN[0].id;
  tekenToestellen();
  toonBlad();
  requestAnimationFrame(pasVak);
  if (naam === 'merk' && !BEELDEN) haalBeelden();
}

/* ---- huidige build ---------------------------------------------------------
   De vraag is niet "wat weet git" maar "wat draai ik nu, en wijkt dat ergens van
   af". Vier dingen dus, en de rest staat onder Details: bron, commit, of main
   verder is, en of er hier iets openstaat. */
function tijdGeleden(iso) {
  if (!iso) return 'nog niet';
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'zojuist';
  if (m < 60) return m + ' min geleden';
  const u = Math.round(m / 60);
  return u < 24 ? u + ' uur geleden' : Math.round(u / 24) + ' dagen geleden';
}
async function haalVersie() {
  let f;
  try { f = await (await fetch('/api/versie')).json(); }
  catch (e) { meldFout('#bronmeld', 'De versie kon niet worden opgehaald', e,
    'Draait de studio nog? De rest van de pagina blijft werken.'); return; }
  $('#vsam').textContent = f.samenvatting;
  const achter = f.vanMain ? f.vanMain.achter : f.achter;
  const ernst = f.vuil ? 'let' : (achter ? 'let' : 'ok');
  $('#vstip').className = 'stip ' + ernst;

  $('#vbron').textContent = f.naam || '—';
  $('#vsha').textContent = f.sha || '';
  $('#vlos').textContent = f.los ? 'losse kop — alleen kijken' : '';

  const chips = $('#vchips');
  chips.innerHTML = '';
  const chip = (soort, tekst, tip) => {
    const c = el('span', 'chip' + (soort ? ' ' + soort : ''), tekst);
    if (tip) c.title = tip;
    chips.appendChild(c);
  };
  if (f.vuil) chip('let', WOORD.gewijzigd + ' · ' + f.vuil + ' bestand' + (f.vuil === 1 ? '' : 'en'),
    'niet vastgelegd werk in de werkmap');
  if (achter) chip('let', WOORD.nieuwer + ' · ' + achter, 'origin/main loopt voor op deze bron');
  if (!f.vuil && !achter) chip('ok', WOORD.up, 'gelijk met main en niets openstaand');
  if (f.voor) chip('', f.voor + ' niet gepusht');
  chip('', WOORD.opgehaald + ' ' + tijdGeleden(f.opgehaald));

  const d = $('#vdetail');
  d.innerHTML = '';
  const zet = (k, v) => { if (v == null || v === '') return;
    d.appendChild(el('dt', null, k)); d.appendChild(el('dd', null, v)); };
  zet('commit', (f.sha || '') + ' · ' + (f.onderwerp || ''));
  zet('gemaakt', f.wanneer ? new Date(f.wanneer).toLocaleString('nl-NL') + ' · ' + (f.auteur || '') : '');
  zet('werkmap', f.vuil ? f.vuil + ' open wijziging' + (f.vuil === 1 ? '' : 'en') : 'schoon');
  zet('verte', f.upstream ? f.upstream + ' · ' + (f.achter ? f.achter + ' nieuw daar' : 'niets nieuws')
    : 'geen — deze tak staat alleen hier');
  if (f.vanMain) zet('t.o.v. main', f.vanMain.achter + ' achter, ' + f.vanMain.voor + ' voor');
  if (f.vuil) zet('open werk', f.vuileRegels.join('\n'));
  $('#bijwerk').disabled = !f.achter || !!f.vuil || f.los;
  $('#naarmain').disabled = (f.naam === 'main' && !f.los) || !!f.vuil;
  if ($('#v-open').hidden === !f.vuil) { /* al goed */ } else haalOpenWerk();
}

/* ---- Open werk -------------------------------------------------------------
   Een wissel weigert zolang er iets openstaat, en dat hoort zo. Maar tot nu toe
   stond je daarna met een melding zonder uitweg: geen enkele knop hier kon er iets
   mee, en dan ga je zoeken naar de reden dat je gereedschap stuk is terwijl het op
   een beslissing van jou wacht.

   Drie uitwegen, in deze volgorde: opzij (niets kwijt), vastleggen (houden),
   terugdraaien (weg). Alleen de laatste doet werk weg, en die gaat daarom in twee
   stappen -- net als publiceren. */
let TERUGWACHT = false;      // staat het terugdraaien op zijn tweede klik te wachten?
async function haalOpenWerk() {
  let o;
  try { o = await (await fetch('/api/openwerk')).json(); }
  catch (e) { console.error('[studio] open werk ophalen mislukt', e); return; }
  const vak = $('#v-open');
  const regels = (o && o.regels) || [];
  vak.hidden = !regels.length;
  TERUGWACHT = false;
  if (!regels.length) return;
  $('#otel').textContent = regels.length + ' bestand' + (regels.length === 1 ? '' : 'en');
  $('#olijst').textContent = regels.map(r => r.pad).join('\n');
  $('#o-vast').textContent = o.isMain ? 'Vastleggen op een nieuwe tak…' : 'Vastleggen…';
  $('#o-weg').textContent = 'Terugdraaien…';
}
function openWerkKnoppen() {
  $('#o-opzij').onclick = async () => {
    await doeOpen('/api/opzij', '', 'Opzij zetten…');
    $('#o-terugrij').hidden = false;
  };
  $('#o-haalterug').onclick = () => doeOpen('/api/haalterug', '', 'Terughalen…');
  $('#o-vast').onclick = () => {
    const rij = $('#o-vastrij');
    rij.hidden = !rij.hidden;
    if (!rij.hidden) $('#o-bericht').focus();
  };
  $('#o-vastdoe').onclick = async () => {
    const b = $('#o-bericht').value.trim();
    await doeOpen('/api/vastleggen', b, 'Vastleggen…');
    $('#o-bericht').value = '';
    $('#o-vastrij').hidden = true;
  };
  $('#o-bericht').onkeydown = e => { if (e.key === 'Enter') $('#o-vastdoe').click(); };
  /* Twee klikken, net als publiceren. De eerste vertelt alleen wat er zou
     verdwijnen; pas de tweede voert het uit. */
  $('#o-weg').onclick = async () => {
    const fase = TERUGWACHT ? 'go' : 'kijk';
    const j = await doeOpen('/api/terugdraaien', fase, TERUGWACHT ? 'Terugdraaien…' : 'Nakijken…');
    TERUGWACHT = !!(j && j.wacht);
    $('#o-weg').classList.toggle('op', TERUGWACHT);
    $('#o-weg').textContent = TERUGWACHT ? 'Ja, terugdraaien' : 'Terugdraaien…';
  };
}
async function doeOpen(pad, body, bezig) {
  meld('#omeld', '', bezig || 'Bezig…');
  let j;
  try {
    const r = await fetch(pad, { method: 'POST', body: body || '' });
    j = await r.json();
  } catch (e) {
    meldFout('#omeld', 'De opdracht kon niet worden uitgevoerd', e,
      'Er is niets veranderd. Draait npm run studio nog?');
    return null;
  }
  meld('#omeld', j.ok ? (j.wacht ? 'let' : 'ok') : 'fout', j.tekst);
  if (!j.wacht) {
    await haalVersie();
    await haalOpenWerk();
    await tekenBeeldenVers();
    await haalWerelden();
    herlaad();
  }
  return j;
}

async function haalBronnen() {
  const k = $('#bron');
  k.innerHTML = '<option>bezig…</option>';
  let b;
  try { b = await (await fetch('/api/bronnen')).json(); }
  catch (e) { k.innerHTML = '<option value="">geen lijst — zie console</option>';
    console.error('[studio] bronnen ophalen mislukt', e); return; }
  k.innerHTML = '';
  const eerste = document.createElement('option');
  eerste.value = ''; eerste.textContent = 'Kies een bron om te testen…';
  k.appendChild(eerste);
  const groep = naam => { const g = document.createElement('optgroup'); g.label = naam; k.appendChild(g); return g; };
  const zet = (g, waarde, tekst) => { const o = document.createElement('option');
    o.value = waarde; o.textContent = tekst; g.appendChild(o); };
  const g0 = groep('Hoofdlijn');
  zet(g0, 'main', 'Main — ' + (b.main.sha || '') + ' · ' + (b.main.onderwerp || '').slice(0, 46));
  if (b.prs.length) {
    const g1 = groep('Open pull requests');
    b.prs.forEach(p => zet(g1, p.ref, 'PR #' + p.nummer + ' — ' + p.titel.slice(0, 52) + (p.concept ? ' (concept)' : '')));
  }
  const g2 = groep(b.prReden ? 'Takken (PR-titels: ' + b.prReden + ')' : 'Takken');
  b.takken.forEach(t => zet(g2, t.ref,
    (t.pr ? 'PR #' + t.pr.nummer + ' — ' : '') + t.ref.replace(/^origin\//, '') +
    ' · ' + String(t.datum).slice(0, 10) + (t.waar === 'hier' ? ' · hier' : '')));
  if (b.meer) {
    const g3 = groep('…');
    zet(g3, '', b.meer + ' oudere takken niet getoond — gebruik git checkout');
    g3.lastChild.disabled = true;
  }
  k.value = '';
}

async function doe(pad, body, waar, bezig) {
  meld(waar, '', bezig || 'Bezig…');
  let j;
  try {
    const r = await fetch(pad, { method: 'POST', body: body || '' });
    j = await r.json();
  } catch (e) {
    meldFout(waar, 'De opdracht kon niet worden uitgevoerd', e,
      'Er is niets veranderd. Draait npm run studio nog?');
    return;
  }
  meld(waar, j.ok ? 'ok' : 'fout',
    j.tekst + (j.vuileRegels ? '\n\n' + j.vuileRegels.join('\n') : ''));
  await haalVersie();
  await haalOpenWerk();
  if (j.ok) { await haalBronnen(); await haalWerelden(); await tekenBeeldenVers(); toonBlad(); }
}

/* ---- werelden --------------------------------------------------------------
   De lijst is de navigator: icoon, naam, volgorde en één bolletje dat zegt of er
   iets aan mankeert. Meer hoeft een rij niet te dragen -- de rest staat rechts
   zodra je hem aantikt. */
async function haalWerelden() {
  try { WERELDEN = await (await fetch('/api/werelden')).json(); }
  catch (e) { WERELDEN = null; console.error('[studio] werelden ophalen mislukt', e); }
  /* index.html kan stuk zijn -- je test nu eenmaal ook takken waar iemand nog
     middenin zit. Dan hoort de studio te zéggen wat er mis is en verder gewoon te
     werken; een lege pagina zonder uitleg zou je de fout in je eigen werk laten
     zoeken. */
  if (!WERELDEN || !WERELDEN.werelden) {
    $('#wlijst').innerHTML = '';
    $('#weditor-in').innerHTML = '';
    meld('#wmeld', 'fout', 'De werelden zijn niet te lezen uit index.html.\n'
      + ((WERELDEN && WERELDEN.tekst) || 'Onbekende fout.')
      + '\nDe rest van de studio blijft werken.');
    return;
  }
  meld('#wmeld', '', '');
  const lijst = $('#wlijst');
  lijst.innerHTML = '';
  WERELDEN.werelden.forEach(w => {
    const b = el('button', 'w' + (w.nr === S.wereld ? ' op' : ''));
    b.appendChild(el('span', 'ic', w.icoon || '·'));
    const nm = el('span', 'nm');
    nm.appendChild(el('b', null, w.naam));
    nm.appendChild(el('small', null, 'wereld ' + w.nr + ' · show ' + w.eerste + '–' + w.laatste
      + (w.uitgebracht ? '' : ' · niet uitgebracht')));
    b.appendChild(nm);
    const bol = el('span', 'bol ' + (w.fouten ? 'fout' : w.letop ? 'let' : ''));
    bol.title = w.fouten ? w.fouten + ' ' + WOORD.fout.toLowerCase()
      : w.letop ? w.letop + ' ' + WOORD.waarschuwing.toLowerCase() : 'in orde';
    b.appendChild(bol);
    b.onclick = () => kiesWereld(w.nr);
    lijst.appendChild(b);
  });
  const t = $('#wtel');
  t.textContent = WERELDEN.werelden.length + ' werelden · '
    + (WERELDEN.fouten ? WERELDEN.fouten + ' fout' : WERELDEN.letop
       ? WERELDEN.letop + ' waarschuwing' + (WERELDEN.letop === 1 ? '' : 'en') : 'in orde');
  tekenWereld();
  tekenScenario();
}
function kiesWereld(nr) {
  S.wereld = nr;
  document.querySelectorAll('#wlijst .w').forEach((b, i) =>
    b.classList.toggle('op', WERELDEN.werelden[i].nr === nr));
  const kw = $('#sc-wereld');
  if (kw) kw.value = String(nr);
  tekenWereld();
  toonBlad();
}
function huidigeWereld() {
  if (!WERELDEN || !WERELDEN.werelden) return null;
  return WERELDEN.werelden.filter(x => x.nr === S.wereld)[0] || WERELDEN.werelden[0] || null;
}

/* Het wereldoverzicht: vier groepen, in de volgorde waarin je ernaar kijkt.
   Wereld (wie is dit) · Tekening (hoe ziet het eruit) · Voortgang (hoe speelt het)
   · Controles (wat houdt publiceren tegen). Paden staan er wel, maar klein en
   onderaan het kaartje: ze zijn techniek, geen kop. */
function tekenWereld() {
  const vak = $('#weditor-in');
  const w = huidigeWereld();
  if (!vak) return;
  vak.innerHTML = '';
  if (!w) return;
  S.wereld = w.nr;
  $('#wtitel').textContent = (w.icoon || '') + ' ' + w.naam;

  const groep = (titel, tel) => {
    const g = el('div', 'vak');
    const h = el('h2', null, titel);
    if (tel) h.appendChild(el('span', 'tel', tel));
    g.appendChild(h);
    vak.appendChild(g);
    return g;
  };

  // WERELD
  const g1 = groep('Wereld');
  const dl = el('dl', 'kv');
  const zet = (k, v) => { dl.appendChild(el('dt', null, k)); dl.appendChild(el('dd', null, v)); };
  zet('naam', w.naam);
  zet('icoon', w.icoon || '—');
  zet('volgorde', 'wereld ' + w.nr + (w.slotVan ? ' — gaat open als ' + w.slotVan + ' uit is'
    : ' — de eerste, altijd open'));
  zet('id', w.id);
  g1.appendChild(dl);
  const rij1 = el('div', 'rij');
  const bew = el('button', S.bewerken ? 'op' : '', 'Bewerken in het kijkvak');
  bew.title = 'opent ?debug&mapedit: naam, icoon, tekening, kleuren, haltes en beloning';
  bew.onclick = () => { S.bewerken = !S.bewerken; bew.classList.toggle('op', S.bewerken);
    if (S.bewerken) { S.toestel = 'vullend'; tekenToestellen(); }
    toonBlad(); requestAnimationFrame(pasVak); };
  rij1.appendChild(bew);
  const eigenv = el('button', 'stil', 'Eigen venster ⧉');
  eigenv.onclick = () => open(bouw({ wereld: S.wereld, stand: S.wstand, screen: 'map', mapedit: 1 }), '_blank');
  rij1.appendChild(eigenv);
  g1.appendChild(rij1);

  // TEKENING
  const g2 = groep('Tekening');
  g2.appendChild(beeldKaart(wereldAsset(w)));
  const zaal = el('div', 'stiller', 'Zaal: ' + w.zaal.tekst
    + (w.beloning ? ' · beloning: ' + (w.beloningNaam || w.beloning)
       + (w.beloningErIs ? '' : ' — bestaat niet') : ' · geen beloning'));
  g2.appendChild(zaal);

  // VOORTGANG
  const g3 = groep('Voortgang');
  const dl3 = el('dl', 'kv');
  const zet3 = (k, v) => { dl3.appendChild(el('dt', null, k)); dl3.appendChild(el('dd', null, v)); };
  zet3('shows', w.levels + ' (show ' + w.eerste + ' t/m ' + w.laatste + ')');
  zet3('opent', w.slotVan ? 'zodra ' + w.slotVan + ' uit is' : 'meteen');
  zet3('beloning', w.beloning ? (w.beloningNaam || '?') + ' (' + w.beloning + ')'
    + (w.beloningErIs ? '' : ' — BESTAAT NIET') : 'geen');
  zet3('trofee', w.trofee);
  zet3('haltes', w.haltes + (w.haltesEigen ? ' gezet' : ' (standaardslinger)')
    + ' · ' + w.stuurpunten + ' stuurpunten');
  zet3('uitgebracht', w.uitgebracht ? 'ja' : 'nee — wel genummerd, niet speelbaar');
  g3.appendChild(dl3);
  const g3b = el('div', 'groep');
  g3b.appendChild(el('h3', null, 'Bekijk de stand'));
  const rijs = el('div', 'rij');
  VOORKEUZES.filter(v => v.plek === 'wereld' && v.params.screen === 'map').forEach(v => {
    const naam = v.label.replace(/ (van )?deze wereld$/, '');
    const b = el('button', v.params.stand === S.wstand ? 'op' : '', naam);
    if (v.uitleg) b.title = v.uitleg;
    b.onclick = () => { S.wstand = v.params.stand;
      rijs.querySelectorAll('button').forEach(x => x.classList.remove('op'));
      b.classList.add('op'); toonBlad(); };
    rijs.appendChild(b);
  });
  g3b.appendChild(rijs);
  const rijs2 = el('div', 'rij');
  VOORKEUZES.filter(v => v.plek === 'wereld' && v.params.screen !== 'map').forEach(v => {
    const b = el('button', 'stil', v.label.replace(/ (van )?deze wereld$/, ''));
    if (v.uitleg) b.title = v.uitleg;
    b.onclick = () => ga(bouw(vul(v, S.wereld)));
    rijs2.appendChild(b);
  });
  g3b.appendChild(rijs2);
  g3.appendChild(g3b);

  // CONTROLES
  const punten = (w.punten || []).concat(
    (WERELDEN.lijstPunten || []).map(p => ({ ernst: p.ernst, waar: 'de wereldlijst', t: p.t })));
  const fout4 = punten.filter(p => p.ernst === 'fout').length;
  const g4 = groep('Controles', !punten.length ? 'in orde'
    : (fout4 ? fout4 + ' fout' : punten.length + ' waarschuwing' + (punten.length === 1 ? '' : 'en')));
  if (!punten.length) {
    g4.appendChild(el('div', 'stiller', 'Geen ontbrekende bestanden, geen ongeldige instellingen.'));
  } else {
    punten.forEach(p => {
      const d = el('div', 'punt');
      d.appendChild(el('span', 'bol ' + (p.ernst === 'fout' ? 'fout' : 'let')));
      const tx = el('div');
      tx.appendChild(el('b', null, (p.ernst === 'fout' ? WOORD.fout : WOORD.waarschuwing) + ' · ' + p.waar));
      tx.appendChild(document.createTextNode(p.t));
      d.appendChild(tx);
      g4.appendChild(d);
    });
  }
  const rij4 = el('div', 'rij');
  const keur = el('button', null, 'Keuringen draaien');
  keur.title = 'node test/inhoud|kern|saves|kleedkamer — een paar seconden';
  keur.onclick = async () => {
    meld('#wmeld', '', 'De keuringen draaien…');
    try {
      const j = await (await fetch('/api/keuring', { method: 'POST' })).json();
      meld('#wmeld', j.ok ? 'ok' : 'fout', j.tekst);
    } catch (e) { meldFout('#wmeld', 'De keuringen konden niet worden gedraaid', e); return; }
    haalWerelden();
  };
  rij4.appendChild(keur);
  g4.appendChild(rij4);
}

/* Een wereldtekening in dezelfde vorm als een globaal beeld. Zo is er één kaartje
   voor één beeld, waar dat beeld ook bij hoort -- en dus ook één manier om het te
   vervangen. */
function wereldAsset(w) {
  const d = SLOTS.world;
  const pad = w.art || d.pad.replace('{wereld}', w.id);
  return { id: 'world-' + w.id, soort: 'los', label: 'Wereldkaart',
    uitleg: 'de tekening onder de route, van rand tot rand',
    pad, kb: w.artKb, lever: d.lever, budget: d.budget || null, schrijfbaar: true,
    scherm: 'map' };
}

/* ---- het beeldkaartje ------------------------------------------------------
   Eén component voor elk beeld in de studio: voorbeeld, maat, verhouding,
   bestandsmaat met de aanbevolen begroting ernaast, de stand, en vervangen door
   te slepen of te tikken. Het is bewust hetzelfde kaartje voor een wereldkaart en
   voor het app-icoon: die twee zijn allebei "een beeld dat ergens hoort", en twee
   verschillende kaartjes zouden alleen maar twee gewoontes opleveren.

   Kiezen is nog niet vervangen. Een gekozen bestand wordt een KANDIDAAT: je ziet
   hem op het echte scherm staan, met zijn maat en zijn waarschuwingen erbij, en
   pas "Gebruik deze" schrijft hem weg. Dat is dezelfde volgorde als incoming/ al
   had -- huidig naast nieuw, en jij kiest -- alleen nu ook voor een bestand dat je
   zelf aanwijst. */
const GEMETEN = {};
/* Een versiestempel per pad. Stond hier eerst de bestandsmaat in kB, en dat gaat
   mis zodra een nieuwe tekening toevallig op dezelfde afgeronde kB uitkomt: dan is
   de URL gelijk en kijk je naar het oude beeld. Een stempel verandert altijd. */
const STEMPEL = {};
function stempel(pad, kb) {
  if (STEMPEL[pad] != null) return STEMPEL[pad];
  return kb == null ? 0 : kb;
}
function verversPad(pad) {
  if (!pad) return;
  STEMPEL[pad] = Date.now();
  delete GEMETEN[pad];
}
/* De tekeningenvoorraad van de servicewerker weg. sw.js bewaart alles onder
   /assets/ voorraad-eerst en laat het stuk achter de ? weg bij het opzoeken, dus
   geen enkel ?v= komt daar langs. Staat er een servicewerker (bijvoorbeeld na
   "Met servicewerker"), dan is dit het enige dat een vervangen tekening wél
   zichtbaar maakt. */
async function voorraadWeg() {
  try { if (window.caches) await caches.delete('rekenpop-art-2'); } catch (e) { /* mag */ }
  try {
    const w = $('#spel').contentWindow;
    if (w && w.caches) await w.caches.delete('rekenpop-art-2');
  } catch (e) { /* ander domein of nog niet geladen */ }
}
function meetBeeld(pad, klaar) {
  if (!pad) return null;
  if (GEMETEN[pad] !== undefined) return GEMETEN[pad];
  GEMETEN[pad] = null;
  const i = new Image();
  i.onload = () => { GEMETEN[pad] = { w: i.naturalWidth, h: i.naturalHeight }; klaar(); };
  i.onerror = () => { GEMETEN[pad] = { w: 0, h: 0 }; klaar(); };
  i.src = (pad.indexOf('blob:') === 0 ? pad : '/' + pad + '?m=' + stempel(pad, Date.now()));
  return null;
}
function verhoudingNaam(v) {
  const bekend = [[9 / 16, '9:16'], [1 / 2, '1:2'], [3 / 4, '3:4'], [2 / 3, '2:3'],
                  [1, '1:1'], [16 / 9, '16:9'], [4 / 5, '4:5']];
  for (const [w, naam] of bekend) if (Math.abs(v - w) / w < 0.015) return naam;
  return v.toFixed(2) + ':1';
}
function isGewijzigd(pad) {
  return !!(BEELDEN && BEELDEN.gewijzigd && BEELDEN.gewijzigd.indexOf(pad) >= 0);
}
/* Wat er mis kan zijn met dit beeld, gemeten in plaats van geraden. Nooit een
   weigering: een verhouding die een paar procent afwijkt snijdt de app gewoon bij,
   en een zware tekening wérkt -- hij kost alleen data. Vandaar waarschuwingen en
   geen fouten. */
function beeldLet(a, m) {
  const uit = [];
  if (m && m.w && a.lever && a.lever[0] && a.lever[1]) {
    const wil = a.lever[0] / a.lever[1], is = m.w / m.h;
    const af = Math.abs(is - wil) / wil;
    if (af > 0.02) {
      uit.push('verhouding ' + verhoudingNaam(is) + ' in plaats van ' + verhoudingNaam(wil)
        + (af > 0.15 ? ' — er valt een flinke strook weg' : ' — er valt een strook weg'));
    }
    if (m.w < a.lever[0] * 0.7) uit.push('maar ' + m.w + ' pixels breed; ' + a.lever[0] + ' is de maat');
  }
  return uit;
}

/* ---- de kandidaat ----------------------------------------------------------
   Eén tegelijk, want je beoordeelt er ook maar één tegelijk. Hij leeft alleen in
   dit venster: er staat niets op schijf tot je "Gebruik deze" kiest, en Annuleer
   laat geen spoor na. */
let KANDIDAAT = null;     // { asset, bestand, url, maat }

function kandidaatCss() {
  if (!KANDIDAAT) return '';
  /* Dezelfde generator als de voorbeeldserver voor incoming/ gebruikt, uit
     test/scene.js. Dus: dezelfde uitsnede, dezelfde sluier en dezelfde plek als
     de regel die straks in het spel staat -- wat je hier beoordeelt is wat je
     krijgt. Een eigen regeltje in deze pagina zou daar ooit vanaf gaan wijken. */
  try { return css({ [KANDIDAAT.asset.id]: KANDIDAAT.url }, { scrim: true }); }
  catch (e) { console.error('[studio] kandidaatopmaak maken mislukte', e); return ''; }
}
/* De kandidaat ín het kijkvak hangen. Zelfde weg als de beeldkeuring-overlays:
   een stijlblad in het document van het spel, zodat er in het spel zelf geen
   enkele regel voor nodig is. */
function pasKandidaat() {
  const d = $('#spel').contentDocument;
  if (!d || !d.head) return;
  let st = d.getElementById('studio-kandidaat');
  if (!st) { st = d.createElement('style'); st.id = 'studio-kandidaat'; d.head.appendChild(st); }
  st.textContent = kandidaatCss();
}
function kiesKandidaat(a, bestand) {
  if (!/^image\//.test(bestand.type)) {
    return meld('#beeldmeld', 'fout', 'Dat is geen afbeelding: ' + bestand.name);
  }
  if (KANDIDAAT) URL.revokeObjectURL(KANDIDAAT.url);
  const url = URL.createObjectURL(bestand);
  KANDIDAAT = { asset: a, bestand, url, maat: null };
  const i = new Image();
  i.onload = () => {
    KANDIDAAT.maat = { w: i.naturalWidth, h: i.naturalHeight };
    tekenBeelden();
    meld('#beeldmeld', 'let', 'Kandidaat · ' + bestand.name + ' — nog niet opgeslagen.\n'
      + 'Bekijk hem op het echte scherm en kies dan "Gebruik deze".');
  };
  i.onerror = () => {
    console.error('[studio] kandidaat niet leesbaar', bestand.name);
    KANDIDAAT = null;
    meld('#beeldmeld', 'fout', 'Deze afbeelding kon niet worden gelezen.\n'
      + 'Er is niets veranderd.\nBekijk de console voor technische details.');
    tekenBeelden();
  };
  i.src = url;
  // meteen naar het scherm waar hij hoort, zodat je hem in context ziet
  if (a.scherm) toonScherm(a);
  else { tekenBeelden(); pasKandidaat(); }
}
function laatKandidaat() {
  if (!KANDIDAAT) return;
  URL.revokeObjectURL(KANDIDAAT.url);
  KANDIDAAT = null;
  pasKandidaat();
  tekenBeelden();
  meld('#beeldmeld', '', '');
}
/* Het scherm waar dit beeld op staat, in het kijkvak. Voor de kleedkamer en de
   kast is dát de hele vraag: niet "is deze tekening mooi" maar "kun je de namen op
   de kaartjes er nog op lezen". */
function toonScherm(a) {
  const p = { star: S.test.star, wereld: S.wereld, stand: S.test.stand || 'halverwege',
              screen: a.scherm === 'profile' ? 'profile' : a.scherm };
  if (a.scherm === 'dress') p.diamanten = 240;      // een kleedkamer met iets te kiezen
  if (a.scherm === 'tro') p.stand = 'alles';        // een kast met iets erin
  if (a.scherm === 'profile') { delete p.wereld; delete p.stand; }
  ga(bouw(p));
}

function beeldKaart(a) {
  const kaart = el('div', 'kaart');
  const doel = a.soort === 'keten' ? a.meester : a.pad;
  const kandidaat = KANDIDAAT && KANDIDAAT.asset.id === a.id ? KANDIDAAT : null;
  if (kandidaat) kaart.classList.add('kandidaat');

  const teken = () => {
    kaart.innerHTML = '';
    const vb = el('div', 'vb');
    if (kandidaat) vb.style.backgroundImage = 'url("' + kandidaat.url + '")';
    else if (a.kb != null) vb.style.backgroundImage = 'url("/' + a.pad + '?v=' + stempel(a.pad, a.kb) + '")';
    else vb.textContent = '＋';
    kaart.appendChild(vb);

    const op = el('div', 'op1');
    const naam = el('div', 'naam');
    naam.appendChild(el('b', null, a.label));
    const veranderd = isGewijzigd(doel) || (a.afgeleiden || []).some(d => isGewijzigd(d.pad));
    naam.appendChild(el('span', 'chip ' + (kandidaat ? 'let' : a.kb == null ? '' : veranderd ? 'let' : 'ok'),
      kandidaat ? 'Niet opgeslagen'
        : a.kb == null ? 'Nog geen tekening' : veranderd ? WOORD.gewijzigd : WOORD.opgeslagen));
    /* Op schijf staan en gebruikt worden zijn twee dingen. De kleedkamer en de
       kast lenen de gedeelde schil tot index.html hun tekening noemt; dat verschil
       hoort op het kaartje te staan en niet in iemands hoofd. */
    if (a.schermkunst) {
      naam.appendChild(el('span', 'chip ' + (a.aan ? 'ok' : ''),
        a.aan ? 'In gebruik' : 'Niet in gebruik'));
    }
    op.appendChild(naam);
    if (a.uitleg) op.appendChild(el('div', 'stiller', a.uitleg));

    /* Alleen meten wat er is. Een plek zonder tekening opvragen levert een 404 in
       de console op, en juist in dít venster hoort die stil te blijven -- een
       console vol verwachte fouten is een console die je niet meer leest. */
    const m = kandidaat ? kandidaat.maat : (a.kb == null ? null : meetBeeld(a.pad, teken));
    const stukken = [];
    if (m && m.w) stukken.push(m.w + ' × ' + m.h + ' · ' + verhoudingNaam(m.w / m.h));
    else if (m) stukken.push('kan het bestand niet lezen');
    else if (kandidaat || a.kb != null) stukken.push('meten…');
    else stukken.push(a.lever[0] + ' × ' + (a.lever[1] || '?') + ' gevraagd');
    if (kandidaat) stukken.push(Math.round(kandidaat.bestand.size / 1024) + ' kB bron');
    else if (a.kb != null) stukken.push(a.kb + ' kB');
    op.appendChild(el('div', 'maat', stukken.join('  ·  ')));

    const waarschuwing = beeldLet(a, m);
    const kb = kandidaat ? null : a.kb;
    if (a.budget && kb && kb > a.budget * 1.1) {
      waarschuwing.unshift(kb + ' kB — aanbevolen ±' + a.budget + ' kB');
    }
    if (waarschuwing.length) {
      op.appendChild(el('div', 'let', waarschuwing.map(t => '⚠ ' + t).join('\n')));
    }

    op.appendChild(el('div', 'pad', a.soort === 'keten'
      ? 'meester ' + a.meester + (a.meesterKb != null ? ' · ' + a.meesterKb + ' kB' : '')
        + a.afgeleiden.map(d => '\n→ ' + d.pad + ' · ' + (d.kb == null ? 'ontbreekt' : d.kb + ' kB')).join('')
      : a.pad));

    const doeR = el('div', 'doe');
    if (kandidaat) {
      const ja = el('button', 'prim', 'Gebruik deze');
      ja.onclick = e => { e.stopPropagation(); pasKandidaatToe(); };
      doeR.appendChild(ja);
      const nee = el('button', 'stil', 'Annuleer');
      nee.onclick = e => { e.stopPropagation(); laatKandidaat(); };
      doeR.appendChild(nee);
    } else {
      if (a.scherm) {
        const zie = el('button', null, 'Voorbeeld');
        zie.title = 'het echte scherm met deze tekening erachter';
        zie.onclick = e => { e.stopPropagation(); toonScherm(a); };
        doeR.appendChild(zie);
      }
      const knop = el('button', 'prim', a.kb == null ? 'Kiezen…' : 'Vervangen…');
      knop.onclick = e => { e.stopPropagation(); kiesBestand(a); };
      doeR.appendChild(knop);
      /* Aan- en uitzetten zonder het bestand aan te raken. "Uit" is hier de
         terugzetknop: de kleedkamer en de kast staan dan weer op de gedeelde
         schil, precies zoals ze eruitzagen voordat er een tekening was. */
      if (a.schermkunst && a.kb != null) {
        const sch = el('button', 'stil', a.aan ? 'Zet uit' : 'Zet aan in het spel');
        sch.title = a.aan ? 'het spel gebruikt weer de gedeelde schil; het bestand blijft staan'
                          : 'index.html gaat deze tekening laden';
        sch.onclick = e => { e.stopPropagation(); zetSchermkunst(a, !a.aan); };
        doeR.appendChild(sch);
      }
      if (a.soort === 'keten') {
        const her = el('button', 'stil', 'Afgeleiden bijwerken');
        her.title = 'npm run merk — maakt ' + a.afgeleiden.length + ' bestand(en) opnieuw uit de meester';
        her.onclick = e => { e.stopPropagation(); draaiMerk(); };
        doeR.appendChild(her);
      }
    }
    op.appendChild(doeR);
    kaart.appendChild(op);
  };
  teken();

  if (a.schrijfbaar) {
    kaart.title = 'sleep een afbeelding hierheen, of tik om er een te kiezen';
    kaart.onclick = () => kiesBestand(a);
    ['dragenter', 'dragover'].forEach(n => kaart.addEventListener(n, e => {
      e.preventDefault(); kaart.classList.add('over');
    }));
    ['dragleave', 'dragend'].forEach(n => kaart.addEventListener(n, () => kaart.classList.remove('over')));
    kaart.addEventListener('drop', e => {
      e.preventDefault(); kaart.classList.remove('over');
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (!f) return meld('#beeldmeld', 'fout', 'Daar zat geen bestand bij.');
      kiesKandidaat(a, f);
    });
  } else {
    kaart.style.cursor = 'default';
  }
  return kaart;
}
let bezigMet = null;
function kiesBestand(a) {
  if (!a.schrijfbaar) return;
  bezigMet = a;
  $('#kiesbestand').click();
}

/* ---- vastzetten ------------------------------------------------------------
   Drie stappen, en ze kunnen elk apart mislukken. Dat onderscheid is het halve
   verhaal: hiervoor viel alles in één catch, en dan kreeg je "kan alleen via npm
   run preview" te zien terwijl het bestand er allang stond.

     1  omzetten naar webp -- in een canvas, hier in de browser
     2  wegschrijven       -- vraagt de server; alleen hier hoort "dit vraagt
                              npm run preview" thuis
     3  bijwerken          -- het bestand staat er dan al; gaat hier iets mis,
                              dan is de vervanging nog steeds gelukt

   Een los beeld wordt op zijn eigen maat bijgesneden (vullen en de rest weg, nooit
   vervormen) -- dezelfde cover als de app doet. Een meester niet: die is de bron,
   en bijsnijden zou de keten vervalsen; hij wordt alleen omgezet en zo nodig
   teruggeschaald. */
function laadBeeld(src) {
  return new Promise((ok, fout) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = () => fout(new Error('kan dit beeld niet lezen: ' + src));
    i.src = src;
  });
}
async function naarWebp(src, a) {
  const img = await laadBeeld(src);
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  g.imageSmoothingQuality = 'high';
  if (a.soort === 'keten') {
    const max = 1600;
    const sch = Math.min(1, max / img.naturalWidth);
    c.width = Math.round(img.naturalWidth * sch);
    c.height = Math.round(img.naturalHeight * sch);
    g.drawImage(img, 0, 0, c.width, c.height);
  } else {
    c.width = a.lever[0]; c.height = a.lever[1];
    const sch = Math.max(c.width / img.naturalWidth, c.height / img.naturalHeight);
    const w = img.naturalWidth * sch, h = img.naturalHeight * sch;
    g.drawImage(img, (c.width - w) / 2, (c.height - h) / 2, w, h);
  }
  const kwal = a.soort === 'keten' ? 0.95 : 0.85;
  const blob = await new Promise(r => c.toBlob(r, 'image/webp', kwal));
  if (!blob) throw new Error('omzetten naar webp lukte niet');
  return { blob, maat: img.naturalWidth + '×' + img.naturalHeight };
}
async function pasKandidaatToe() {
  if (!KANDIDAAT) return;
  const a = KANDIDAAT.asset, bestand = KANDIDAAT.bestand, url = KANDIDAAT.url;
  const doel = a.soort === 'keten' ? a.meester : a.pad;
  meld('#beeldmeld', '', 'Omzetten…');

  let blob, maat;
  try { const r = await naarWebp(url, a); blob = r.blob; maat = r.maat; }
  catch (err) {
    meldFout('#beeldmeld', 'Afbeelding kon niet worden omgezet (' + bestand.name + ')', err,
      'De huidige versie blijft behouden.');
    return;
  }

  let txt;
  try {
    const r = await fetch('/asset?to=' + encodeURIComponent(doel), { method: 'POST', body: blob });
    txt = (await r.text()).trim();
    if (!r.ok) throw new Error(txt || ('de server gaf ' + r.status));
  } catch (err) {
    console.error('[studio] ' + doel + ' wegschrijven mislukt', err);
    meld('#beeldmeld', 'fout', 'Afbeelding kon niet worden vervangen.\n'
      + 'De huidige versie blijft behouden; je kandidaat staat er nog.\n'
      + 'Wegschrijven naar de werkmap vraagt om npm run preview.\n'
      + 'Bekijk de console voor technische details.');
    return;
  }

  // vanaf hier staat het bestand er: wat hierna misgaat maakt dat niet ongedaan
  URL.revokeObjectURL(url);
  KANDIDAAT = null;
  meld('#beeldmeld', 'ok', WOORD.gewijzigd + ' · ' + bestand.name + ' ' + maat + ' → ' + txt);
  try {
    verversPad(a.pad);
    (a.afgeleiden || []).forEach(d => verversPad(d.pad));
    await voorraadWeg();
    if (a.soort === 'keten') await draaiMerk(true);
    /* Een schermtekening die nog niet aanstond zet je hiermee meteen aan: je hebt
       hem net goedgekeurd op het echte scherm, dus "nu nog een tweede knop" is een
       stap die niets toevoegt. Uitzetten kan altijd nog. */
    if (a.schermkunst && !a.aan) await schrijfSchermkunst(a.schermkunst, a.pad, true);
    await tekenBeeldenVers();
    await haalWerelden();
    await haalVersie();
    pasKandidaat();
    herlaad();
  } catch (err) {
    console.error('[studio] ' + doel + ' is vervangen, maar bijwerken mislukte', err);
    meld('#beeldmeld', 'let', WOORD.gewijzigd + ' · ' + doel + ' staat op schijf.\n'
      + 'Het paneel kon niet worden bijgewerkt; ververs de pagina.\n'
      + 'Bekijk de console voor technische details.');
  }
}

/* Aan- of uitzetten in het spel: schrijft het SCHERMKUNST-blok in index.html.
   Het bestand blijft staan -- uitzetten is geen weggooien. */
async function schrijfSchermkunst(sleutel, pad, aan) {
  const nu = {};
  (BEELDEN ? BEELDEN.assets : []).forEach(x => {
    if (x.schermkunst) nu[x.schermkunst] = x.aan ? x.pad : null;
  });
  nu[sleutel] = aan ? pad : null;
  const r = await fetch('/schermkunst', { method: 'POST', body: JSON.stringify(nu) });
  const txt = (await r.text()).trim();
  if (!r.ok) throw new Error(txt || ('de server gaf ' + r.status));
  return txt;
}
async function zetSchermkunst(a, aan) {
  meld('#beeldmeld', '', aan ? 'Aanzetten…' : 'Uitzetten…');
  try {
    await schrijfSchermkunst(a.schermkunst, a.pad, aan);
  } catch (err) {
    meldFout('#beeldmeld', (aan ? 'Aanzetten' : 'Uitzetten') + ' van ' + a.label + ' mislukte', err,
      'Er is niets veranderd. Wijzigen van index.html vraagt om npm run preview.');
    return;
  }
  meld('#beeldmeld', 'ok', a.label + (aan ? ' staat nu in het spel.' : ' gebruikt weer de gedeelde schil.'));
  await tekenBeeldenVers();
  await haalVersie();
  herlaad();
}

async function draaiMerk(stil) {
  if (!stil) meld('#beeldmeld', '', 'De afgeleiden worden opnieuw gemaakt…');
  let j;
  try { j = await (await fetch('/api/merk', { method: 'POST' })).json(); }
  catch (err) {
    meldFout('#beeldmeld', 'De afgeleiden konden niet worden bijgewerkt', err,
      'De meester is wel bewaard; draai npm run merk met de hand.');
    return;
  }
  if (!stil) meld('#beeldmeld', j.ok ? 'ok' : 'fout', j.tekst);
  (BEELDEN ? BEELDEN.assets : []).forEach(a =>
    (a.afgeleiden || []).forEach(d => verversPad(d.pad)));
  await voorraadWeg();
  if (stil) return;
  await tekenBeeldenVers();
  await haalVersie();
}

/* ---- App & merk ------------------------------------------------------------
   Wat bij de héle app hoort en bij geen wereld. Klein met opzet: het zijn vier
   beelden, en daar hoort geen derde applicatie omheen -- alleen een plek waar je
   ze kunt vinden. */
async function haalBeelden() {
  try { BEELDEN = await (await fetch('/api/beelden')).json(); }
  catch (e) { BEELDEN = null; console.error('[studio] beelden ophalen mislukt', e); }
  tekenBeelden();
}
/* Opnieuw ophalen én tekenen. Na een vervanging: de maten, de stand "in gebruik"
   en de lijst gewijzigde bestanden komen allemaal van de server. */
async function tekenBeeldenVers() { await haalBeelden(); }
function tekenBeelden() {
  const vak = $('#merklijst');
  if (!vak) return;
  vak.innerHTML = '';
  if (!BEELDEN) {
    meld('#beeldmeld', 'fout', 'De beelden konden niet worden opgehaald.\n'
      + 'De rest van de studio blijft werken.\nBekijk de console voor technische details.');
    return;
  }
  const groepen = {};
  BEELDEN.assets.forEach(a => (groepen[a.groep] = groepen[a.groep] || []).push(a));
  Object.keys(groepen).forEach(naam => {
    const g = el('div', 'groep');
    g.appendChild(el('h3', null, naam));
    groepen[naam].forEach(a => g.appendChild(beeldKaart(a)));
    vak.appendChild(g);
  });
  if (S.blad === 'wereld') tekenWereld();    // de wereldkaart hangt aan dezelfde lijst
}

/* ---- testscenario ----------------------------------------------------------
   De vraag is "zet het spel in déze stand", en het antwoord is een URL die het
   spel zelf al begrijpt. Er wordt hier dus niets nagebouwd: de snelkeuzes en de
   losse velden stellen allebei dezelfde vlaggen samen (zie bouw). */
function tekenScenario() {
  const vak = $('#snel');
  if (!vak) return;
  vak.innerHTML = '';
  const rij = el('div', 'rij');
  VOORKEUZES.filter(v => v.plek === 'algemeen').forEach(v => {
    const b = el('button', null, v.label);
    if (v.uitleg) b.title = v.uitleg;
    b.onclick = () => {
      const p = vul(v, S.wereld);
      S.test.star = p.star || 'p1';
      S.test.stand = p.stand || 'halverwege';
      S.test.diamanten = p.diamanten == null ? '' : String(p.diamanten);
      S.test.screen = p.screen || 'map';
      if (p.wereld) S.wereld = Number(p.wereld) || S.wereld;
      velden();
      toonBlad();
    };
    rij.appendChild(b);
  });
  vak.appendChild(rij);
  vulWereldKiezer();
  velden();
}
function vulWereldKiezer() {
  const k = $('#sc-wereld');
  if (!k || !WERELDEN || !WERELDEN.werelden) return;
  k.innerHTML = '';
  WERELDEN.werelden.forEach(w => {
    const o = document.createElement('option');
    o.value = String(w.nr);
    o.textContent = (w.icoon || '') + ' ' + w.naam + (w.uitgebracht ? '' : ' (niet uitgebracht)');
    k.appendChild(o);
  });
  k.value = String(S.wereld);
}
function velden() {
  const z = (id, v) => { const e = $(id); if (e) e.value = v; };
  z('#sc-star', S.test.star);
  z('#sc-wereld', String(S.wereld));
  z('#sc-stand', S.test.stand);
  z('#sc-dia', S.test.diamanten);
  z('#sc-scherm', S.test.screen);
}

/* ---- toestellen ------------------------------------------------------------
   Staand is de standaard, want dat is waar dit spel op gespeeld wordt. De rest
   staat erbij omdat elke maat een ándere rand van de opmaak bepaalt, niet omdat
   het toestel bestaat. Een eigen maat verschijnt pas als je erom vraagt.

   Eén kiezer en geen rij knoppen: zeven maten naast elkaar is een muur, en dit is
   een keuze die je een paar keer per sessie maakt. De maat die er werkelijk uit
   komt staat er groot onder, bij het vak zelf. */
function tekenToestellen() {
  const k = $('#toestel');
  k.innerHTML = '';
  TOESTELLEN.forEach(t => {
    const o = document.createElement('option');
    o.value = t.id || 'vullend';
    o.textContent = t.label + (t.id ? '  ' + t.id.replace('x', ' × ') : '');
    o.title = t.uitleg || '';
    k.appendChild(o);
  });
  const e = document.createElement('option');
  e.value = 'eigen'; e.textContent = 'Eigen maat…';
  k.appendChild(e);
  k.value = S.toestel;
  $('#eigenmaat').hidden = S.toestel !== 'eigen';
}

/* Dezelfde twee functies als in test/scenario.js -- bewust hier herhaald in
   plaats van het bestand mee te sturen, want het zijn negen regels en een
   tweede <script> uit node_modules is precies wat deze app niet heeft. De test
   (test/hub.test.js) kijkt na of ze hetzelfde blijven doen. */
function bouw(p) {
  const d = ['debug', 'demo', 'star=' + (p.star || 'p1')];
  if (p.wereld) d.push('wereld=' + p.wereld);
  if (p.stand) d.push('stand=' + p.stand);
  if (p.diamanten != null) d.push('diamanten=' + p.diamanten);
  if (p.stage) d.push('stage=' + p.stage);
  if (p.screen) d.push('screen=' + p.screen);
  if (p.mapedit) d.push('mapedit');
  if (p.nieuw) d.push('nieuw');
  if (p.sw) d.push('sw');
  return '/?' + d.join('&');
}
function vul(v, nr) {
  const p = Object.assign({}, v.params);
  if (p.wereld === 'gekozen') p.wereld = nr || 1;
  return p;
}

/* ---- opbouw --------------------------------------------------------------- */
function init() {
  document.body.dataset.blad = 'test';
  $('#watdoetdit').textContent = WERKBLADEN.test.wat;
  document.querySelectorAll('.kiezer button').forEach(b => {
    b.onclick = () => naarBlad(b.dataset.blad);
  });
  $('#naar-merk').onclick = () => naarBlad(S.blad === 'merk' ? 'test' : 'merk');

  // vakken in- en uitklappen, en dat onthouden
  document.querySelectorAll('.vak.vouw > h2').forEach(h => {
    const s = h.parentNode;
    if (localStorage.getItem('studio-dicht-' + s.id) === '1') s.classList.add('dicht');
    h.onclick = () => { s.classList.toggle('dicht');
      localStorage.setItem('studio-dicht-' + s.id, s.classList.contains('dicht') ? '1' : '0'); };
  });

  tekenToestellen();
  $('#toestel').onchange = e => { S.toestel = e.target.value; tekenToestellen(); pasVak(); };
  $('#eigen-b').onchange = e => { S.eigen.w = Math.max(240, Number(e.target.value) || 412); pasVak(); };
  $('#eigen-h').onchange = e => { S.eigen.h = Math.max(320, Number(e.target.value) || 920); pasVak(); };

  // beeldkeuring
  const qv = $('#qa');
  [['randen', 'Randen', 'elk element krijgt een lijntje — zo zie je de opmaak'],
   ['raster', 'Raster', 'tien procent per vak, over het hele scherm'],
   ['stil', 'Stil', 'animaties en overgangen uit']].forEach(([k, lab, tip]) => {
    const b = el('button', null, lab);
    b.title = tip;
    b.onclick = () => { S.vlaggen[k] = !S.vlaggen[k]; b.classList.toggle('op', S.vlaggen[k]); pasOverlays(); };
    qv.appendChild(b);
  });

  // scenario-velden
  $('#sc-star').onchange = e => { S.test.star = e.target.value; toonBlad(); };
  $('#sc-wereld').onchange = e => { kiesWereld(Number(e.target.value) || 1); };
  $('#sc-stand').onchange = e => { S.test.stand = e.target.value; toonBlad(); };
  $('#sc-dia').onchange = e => { S.test.diamanten = e.target.value; toonBlad(); };
  $('#sc-scherm').onchange = e => { S.test.screen = e.target.value; toonBlad(); };

  $('#spel').addEventListener('load', () => { pasOverlays(); pasKandidaat(); });
  addEventListener('resize', pasVak);

  $('#haalop').onclick = () => doe('/api/haalop', '', '#bronmeld', 'Ophalen…');
  $('#bijwerk').onclick = () => doe('/api/bijwerken', '', '#bronmeld', 'Bijwerken…');
  $('#wisselknop').onclick = () => {
    const ref = $('#bron').value;
    if (!ref) return meld('#bronmeld', 'let', 'Kies eerst een bron uit de lijst.');
    doe('/api/wissel', ref, '#bronmeld', 'Wisselen…');
  };
  $('#naarmain').onclick = () => doe('/api/wissel', 'main', '#bronmeld', 'Wisselen…');

  $('#wnieuw').onclick = () => open(bouw({ wereld: S.wereld, stand: 'halverwege',
    screen: 'map', mapedit: 1, nieuw: 1 }), '_blank');

  $('#kiesbestand').onchange = e => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (f && bezigMet) kiesKandidaat(bezigMet, f);
  };
  // een beeld dat per ongeluk naast een kaartje valt mag de pagina niet vervangen
  ['dragover', 'drop'].forEach(n => addEventListener(n, e => {
    if (!e.target.closest || !e.target.closest('.kaart')) e.preventDefault();
  }));

  $('#herlaad').onclick = herlaad;
  $('#schoon').onclick = async () => {
    const w = $('#spel').contentWindow;
    try {
      w.localStorage.clear(); w.sessionStorage.clear();
      if (w.caches) for (const k of await w.caches.keys()) await w.caches.delete(k);
      if (w.navigator.serviceWorker) {
        for (const r of await w.navigator.serviceWorker.getRegistrations()) await r.unregister();
      }
      meld('#gmeld', 'ok', 'Opslag, cache en servicewerker van het kijkvak leeggemaakt.');
    } catch (e) { meldFout('#gmeld', 'Het kijkvak kon niet worden leeggemaakt', e); }
    herlaad();
  };
  $('#normaal').onclick = () => ga('/');
  $('#metsw').onclick = () => ga(bouw({ wereld: S.wereld, stand: 'halverwege', screen: 'map', sw: 1 }));
  $('#swstand').onclick = async () => {
    const w = $('#spel').contentWindow;
    try {
      const rs = w.navigator.serviceWorker ? await w.navigator.serviceWorker.getRegistrations() : [];
      const cs = w.caches ? await w.caches.keys() : [];
      meld('#gmeld', '', (rs.length ? rs.map(r => 'servicewerker: ' + (r.active ? 'actief' : 'nog niet actief')
        + ' · ' + (r.scope || '')).join('\n') : 'Geen servicewerker — de voorbeeldserver zet hem uit; '
        + 'gebruik "Met servicewerker" om het bijwerken na te kijken.') + '\ncaches: ' + (cs.join(', ') || 'geen'));
    } catch (e) { meldFout('#gmeld', 'De stand van de servicewerker is niet te lezen', e); }
  };
  $('#nieuwvenster').onclick = () => {
    const m = maat();
    // "Gewoon spel" is '/' zonder vraagteken; dan hoort &fit= een ?fit= te zijn
    const voeg = S.url.indexOf('?') >= 0 ? '&' : '?';
    open(S.url + (m ? voeg + 'fit=' + m.w + 'x' + m.h : ''), '_blank',
      m ? 'width=' + m.w + ',height=' + m.h : '');
  };

  openWerkKnoppen();
  /* Eerst schoonmaken, dan pas beelden ophalen.

     Waarom dit hier moet: het spel registreert een servicewerker met bereik '/',
     en die bedient dus óók deze pagina. sw.js serveert alles onder /assets/
     voorraad-eerst en negeert het stuk achter de ? -- dus een vervangen tekening
     kwam nergens meer doorheen, ook niet in het voorbeeldje op een kaartje. De
     voorbeeldserver zet hem sindsdien uit (zie panel() in test/preview.js), maar
     een registratie uit een oudere sessie blijft staan tot iemand hem opruimt.
     Dat is wat hier gebeurt, één keer per keer dat je de studio opent. */
  (async () => {
    try {
      if (navigator.serviceWorker) {
        for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
      }
      await voorraadWeg();
    } catch (e) { console.error('[studio] servicewerker opruimen mislukte', e); }
    haalBeelden();
  })();

  pasVak();
  toonBlad();
  haalVersie(); haalBronnen(); haalWerelden(); haalOpenWerk();
  setInterval(haalVersie, 30000);     // een checkout in een ander venster valt zo vanzelf op
}
document.addEventListener('DOMContentLoaded', init);
`;

function pagina(gegevens) {
  const opties = (lijst, waarde) => lijst.map(x =>
    '<option value="' + esc(x.id) + '"' + (x.id === waarde ? ' selected' : '') + '>'
    + esc(x.label) + '</option>').join('');
  return `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<title>Rekensterren — Dev Studio</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<!-- Een eigen icoontje, als data-URI. Zonder dit vraagt elke browser /favicon.ico
     op, krijgt een 404 en zet die in de console -- en juist in dít venster hoort
     de console stil te zijn, zodat een échte fout opvalt. -->
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Crect width='16' height='16' rx='4' fill='%23170d26'/%3E%3Cpath d='M8 3l1.5 3.2 3.5.4-2.6 2.4.7 3.4L8 10.7 4.9 12.4l.7-3.4L3 6.6l3.5-.4z' fill='%23ffb43d'/%3E%3C/svg%3E">
<style>${CSS}</style>
</head>
<body data-blad="test">
<header>
  <span class="merk">Rekensterren <span>· Dev Studio</span></span>
  <nav class="kiezer">
    <button data-blad="test" class="op">Testomgeving</button>
    <button data-blad="wereld">Wereldstudio</button>
  </nav>
  <span class="watdoetdit" id="watdoetdit"></span>
  <span class="rechts">
    <button id="naar-merk" title="het beeld dat bij de hele app hoort">App &amp; merk</button>
    <span class="bouwchip"><span class="stip" id="vstip"></span><span id="vsam">…</span></span>
  </span>
</header>

<div class="werkblad">

  <!-- ============ TESTOMGEVING ============ -->
  <div class="paneel" id="zij">

    <section class="vak" id="v-bouw">
      <h2>Huidige build</h2>
      <div class="bouwkop">
        <b id="vbron">…</b><span class="sha" id="vsha"></span><span class="los" id="vlos"></span>
      </div>
      <div class="rij" id="vchips"></div>
      <div class="rij">
        <button id="haalop" class="prim" title="git fetch --all --prune — raakt je werkmap niet aan">Ophalen</button>
        <button id="bijwerk" title="alleen fast-forward">Bijwerken</button>
        <button id="naarmain">Naar main</button>
      </div>
      <div class="rij">
        <select id="bron" style="flex:1"></select>
        <button id="wisselknop">Wissel</button>
      </div>
      <div class="melding" id="bronmeld"></div>
      <details class="tech"><summary>Details</summary><dl class="kv" id="vdetail"></dl></details>
    </section>

    <section class="vak" id="v-open" hidden>
      <h2>Open werk <span class="tel" id="otel"></span></h2>
      <p class="stiller" style="margin:0">Zolang dit er staat weigert een wissel.
        De studio ruimt niets op zonder dat jij het zegt.</p>
      <div class="mono stiller" id="olijst" style="white-space:pre-wrap;max-height:120px;overflow:auto"></div>
      <div class="rij">
        <button class="prim" id="o-opzij" title="git stash — alles komt terug met Haal terug">Opzij zetten</button>
        <button id="o-vast">Vastleggen…</button>
        <button class="stil" id="o-weg" title="deze bestanden terug naar wat er in het spel staat">Terugdraaien…</button>
      </div>
      <div class="rij" id="o-vastrij" hidden>
        <input type="text" id="o-bericht" placeholder="wat is er veranderd?" style="flex:1">
        <button class="prim" id="o-vastdoe">Leg vast</button>
      </div>
      <div class="rij" id="o-terugrij" hidden>
        <button class="stil" id="o-haalterug" title="git stash pop">Haal terug wat opzij staat</button>
      </div>
      <div class="melding" id="omeld"></div>
    </section>

    <section class="vak" id="v-scen">
      <h2>Testscenario</h2>
      <div class="groep">
        <h3>Snelkeuze</h3>
        <div id="snel"></div>
      </div>
      <div class="groep">
        <h3>Zelf samenstellen</h3>
        <div class="raster2">
          <label class="veld"><span>Speler</span>
            <select id="sc-star"><option value="p1">Lotte — ver gevorderd</option>
              <option value="p2">Sem — net begonnen</option></select></label>
          <label class="veld"><span>Wereld</span><select id="sc-wereld"></select></label>
          <label class="veld"><span>Stand</span>
            <select id="sc-stand">${opties(scenario.STANDEN)}</select></label>
          <label class="veld"><span>Scherm</span>
            <select id="sc-scherm">${opties(scenario.SCHERMEN, 'map')}</select></label>
          <label class="veld"><span>Diamanten</span>
            <input type="text" id="sc-dia" placeholder="zoals het is"></label>
        </div>
      </div>
    </section>

    <section class="vak vouw dicht" id="v-ger">
      <h2>Gereedschap</h2>
      <div class="rij">
        <button id="schoon" title="opslag, cache en servicewerker van het kijkvak">Kijkvak leegmaken</button>
        <button id="normaal" title="het spel zonder enige vlag">Gewoon spel</button>
      </div>
      <div class="rij">
        <button id="metsw" title="de voorbeeldserver zet de servicewerker normaal uit">Met servicewerker</button>
        <button id="swstand">Servicewerker-stand</button>
      </div>
      <div class="melding" id="gmeld"></div>
      <p class="stiller" style="margin:0">Op je telefoon (zelfde wifi):
        <span class="mono">${esc(gegevens.lan || 'geen netwerkadres gevonden')}</span></p>
    </section>

  </div>

  <!-- ============ WERELDSTUDIO · de lijst ============ -->
  <div class="paneel" id="wlijst-vak">
    <section class="vak">
      <h2>Werelden <span class="tel" id="wtel"></span></h2>
      <div class="wlijst" id="wlijst"></div>
      <div class="rij">
        <button class="prim" id="wnieuw">+ Wereld</button>
      </div>
      <div class="melding" id="wmeld"></div>
    </section>
  </div>

  <!-- ============ WERELDSTUDIO · de wereld ============ -->
  <div class="paneel" id="weditor">
    <h3 id="wtitel" style="font-size:15px"></h3>
    <div id="weditor-in" style="display:flex;flex-direction:column;gap:14px"></div>
  </div>

  <!-- ============ APP &amp; MERK ============ -->
  <div class="paneel" id="merkvak">
    <section class="vak">
      <h2>App &amp; merk</h2>
      <p class="stiller" style="margin:0">Beeld dat bij de hele app hoort. Een merkbeeld heeft
        één meester; de bestanden die de app laadt rollen daaruit.</p>
      <div id="merklijst" style="display:flex;flex-direction:column;gap:14px"></div>
      <div class="melding" id="beeldmeld"></div>
    </section>
  </div>

  <!-- ============ het kijkvak ============ -->
  <div class="kijk">
    <div class="kijkbalk">
      <span class="lab">Toestel</span>
      <select id="toestel"></select>
      <span class="rij" id="eigenmaat" hidden>
        <input type="number" id="eigen-b" value="412" min="240" max="2400" title="breedte">
        <span class="stiller">×</span>
        <input type="number" id="eigen-h" value="920" min="320" max="2400" title="hoogte">
      </span>
      <span class="scheid"></span>
      <span class="rij" id="qa"></span>
      <button class="stil" id="herlaad" style="margin-left:auto">Herladen</button>
      <button class="stil" id="nieuwvenster"
        title="op ware toestelmaat, in een echt venster">Eigen venster ⧉</button>
    </div>
    <div class="kijkmaat"><span class="maat" id="maat"></span><span class="schaal" id="schaal"></span></div>
    <div class="doos" id="doos"><iframe id="spel" title="het spel"></iframe></div>
    <div class="nu" id="nu"></div>
  </div>

</div>

<input type="file" id="kiesbestand" accept="image/*" hidden>

<script>
const TOESTELLEN = ${JSON.stringify(scenario.TOESTELLEN)};
const VOORKEUZES = ${JSON.stringify(scenario.VOORKEUZES)};
const SLOTS = ${JSON.stringify(scene.SLOTS, (k, v) => v instanceof RegExp ? undefined : v)};
/* De opmaakgenerator uit test/scene.js, letterlijk. Hiermee tekent de studio een
   kandidaat met exact dezelfde regel als de voorbeeldserver en als het spel --
   zelfde uitsnede, zelfde sluier, zelfde plek. Zie cssJs() daar. */
${scene.cssJs()}
${JS}
</script>
</body>
</html>`;
}

module.exports = { pagina };
