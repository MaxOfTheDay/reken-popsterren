/*
 * De ontwikkelstudio: de pagina waar je op uitkomt met `npm run studio`.
 *
 * Wat hij is: één scherm met links de bedieningen en rechts het échte spel in
 * een vak op telefoonmaat. Meer niet. Er staat geen tweede spel in, geen
 * nagebouwde kaart en geen eigen begrip van voortgang -- rechts draait
 * index.html zoals hij is, met de vlaggen die index.html zelf al kent.
 *
 * Waarom deze pagina en niet het paneel in de app zelf: wat hier staat gaat over
 * dingen die de app niet weet en ook niet hoort te weten -- welke tak er
 * uitgecheckt staat, welke PR's er openstaan, welke bestanden er op schijf
 * liggen. Dat is werk voor de server. Alles wat wél over het spel gaat (een
 * wereld tekenen, haltes zetten, kleuren kiezen) blijft in de wereldstudio
 * (?debug&mapedit); de knop ernaartoe staat hier, het formulier niet.
 *
 * Er zit geen bibliotheek in en er is geen bouwstap. De pagina is één bestand
 * dat deze functie uitschrijft, net als de app zelf.
 */
const scenario = require('./scenario');

const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const CSS = `
:root{
  --bg:#0d0616; --vlak:#170d26; --rand:#2e2040; --tekst:#f1e9f7; --zacht:#a793bc;
  --goud:#ffb43d; --groen:#7fe0a8; --rood:#ff8f7a; --blauw:#8fd6ff;
}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--tekst);
  font:13px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}
a{color:var(--blauw)}
button,select,input{font:inherit;color:inherit}
header{display:flex;align-items:center;gap:10px;padding:8px 14px;
  border-bottom:1px solid var(--rand);background:var(--vlak);position:sticky;top:0;z-index:5}
header b{font-size:14px;letter-spacing:.02em}
.versie{display:flex;align-items:center;gap:8px;margin-left:auto;font:600 12px ui-monospace,monospace}
.stip{width:8px;height:8px;border-radius:99px;background:var(--groen);flex:none}
.stip.vuil{background:var(--goud)} .stip.weg{background:var(--rood)}
.hoofd{display:flex;align-items:flex-start;gap:14px;padding:14px;max-width:1600px}
.kolom{width:370px;flex:none;display:flex;flex-direction:column;gap:10px;
  position:sticky;top:53px;max-height:calc(100vh - 66px);overflow:auto;padding-right:4px}
.kolom::-webkit-scrollbar{width:8px}
.kolom::-webkit-scrollbar-thumb{background:#2e2040;border-radius:8px}
/* flex:none is hier geen opmaakdetail: de kolom is een flexkolom met een
   maximale hoogte, en zonder dit krimpen de vakken om te passen -- dan verdwijnt
   de helft van de knoppen achter een rand zonder dat er iets aan te klikken is. */
section{background:var(--vlak);border:1px solid var(--rand);border-radius:10px;
  overflow:hidden;flex:none}
section > h2{margin:0;padding:8px 11px;font-size:11px;letter-spacing:.11em;text-transform:uppercase;
  color:var(--goud);display:flex;align-items:center;gap:7px;cursor:pointer;user-select:none}
section > h2::before{content:'▾';opacity:.55;font-size:10px}
section.dicht > h2::before{content:'▸'}
section.dicht > .inhoud{display:none}
.inhoud{padding:0 11px 11px}
.rij{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.rij + .rij{margin-top:6px}
button{background:#241635;border:1px solid var(--rand);border-radius:6px;padding:4px 9px;
  cursor:pointer;line-height:1.35}
button:hover{border-color:#4a3566;background:#2c1b40}
button.aan{border-color:var(--goud);color:var(--goud)}
button.prim{background:#3a2352;border-color:#57407a}
button:disabled{opacity:.4;cursor:default}
select{background:#241635;border:1px solid var(--rand);border-radius:6px;padding:4px 6px;max-width:100%}
small,.zacht{color:var(--zacht)}
.mono{font:12px/1.5 ui-monospace,SFMono-Regular,monospace}
.melding{margin-top:7px;padding:6px 8px;border-radius:6px;background:#1f1330;
  border:1px solid var(--rand);white-space:pre-wrap;font:11.5px/1.5 ui-monospace,monospace}
.melding.fout{border-color:#6b2b2b;color:var(--rood)}
.melding.ok{border-color:#2b6b45;color:var(--groen)}
.melding:empty{display:none}
.melding.kort{max-height:120px;overflow:auto}

/* --- werelden --- */
.wlijst{display:flex;flex-direction:column;gap:3px}
.w{display:grid;grid-template-columns:22px 1fr auto;gap:7px;align-items:center;
  padding:5px 7px;border-radius:7px;border:1px solid transparent;cursor:pointer;text-align:left;width:100%}
.w:hover{background:#1f1330}
.w.op{border-color:var(--goud);background:#241635}
.w .ic{font-size:15px}
.w .nm{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.w .nm small{display:block;color:var(--zacht);font-size:11px}
.vlag{font-size:11px;padding:1px 6px;border-radius:99px;border:1px solid}
.vlag.ok{color:var(--groen);border-color:#2b6b45}
.vlag.let{color:var(--goud);border-color:#6b5223}
.vlag.fout{color:var(--rood);border-color:#6b2b2b}
.kv{display:grid;grid-template-columns:auto 1fr;gap:2px 10px;margin:7px 0 0;font-size:12px}
.kv dt{color:var(--zacht)} .kv dd{margin:0;overflow-wrap:anywhere}
.punt{margin-top:5px;padding:5px 7px;border-radius:6px;font-size:11.5px;
  background:#1f1330;border-left:3px solid var(--goud)}
.punt.fout{border-left-color:var(--rood)}
.punt b{display:block;font-weight:600}

/* --- het kijkvak --- */
.kijk{flex:1;min-width:0;display:flex;flex-direction:column;gap:8px;align-items:center}
.kijkbalk{display:flex;gap:6px;align-items:center;width:100%;flex-wrap:wrap}
.doos{border:1px solid var(--rand);border-radius:14px;background:#000;overflow:hidden;
  box-shadow:0 12px 40px rgba(0,0,0,.5);flex:none}
.doos iframe{border:0;display:block;background:#000}
.nu{font:11.5px/1.5 ui-monospace,monospace;color:var(--zacht);overflow-wrap:anywhere;width:100%}
`;

/* Het scriptblok van de pagina. Staat als tekst in dit bestand en niet in een
   los .js: de studio is bewust één pagina die de server uitschrijft, zodat er
   geen tweede bestand is dat je kunt vergeten mee te sturen. */
const JS = String.raw`
const $ = s => document.querySelector(s);
const el = (t, k, tx) => { const e = document.createElement(t); if (k) e.className = k;
  if (tx != null) e.textContent = tx; return e; };
let WERELD = 1;                 // welke wereld er gekozen is (1-gebaseerd)
let TOESTEL = TOESTELLEN[0].id;
let URL_NU = '/?debug&demo&star=p1&wereld=1&stand=halverwege&screen=map';
const knop = {};                // de aan/uit-schakelaars van de beeldkeuring

/* ---- het kijkvak ---------------------------------------------------------- */
function maat() {
  if (!TOESTEL) return null;
  return { w: +TOESTEL.split('x')[0], h: +TOESTEL.split('x')[1] };
}
function pasVak() {
  const doos = $('#doos'), f = $('#spel');
  const m = maat();
  const ruimH = innerHeight - 150, ruimB = $('.kijk').clientWidth - 4;
  if (!m) {
    doos.style.width = ruimB + 'px'; doos.style.height = ruimH + 'px';
    f.style.width = ruimB + 'px'; f.style.height = ruimH + 'px';
    f.style.transform = ''; $('#maat').textContent = Math.round(ruimB) + '×' + Math.round(ruimH);
    return;
  }
  const s = Math.min(1, ruimH / m.h, ruimB / m.w);
  f.style.width = m.w + 'px'; f.style.height = m.h + 'px';
  f.style.transformOrigin = '0 0';
  f.style.transform = 'scale(' + s + ')';
  doos.style.width = Math.round(m.w * s) + 'px';
  doos.style.height = Math.round(m.h * s) + 'px';
  $('#maat').textContent = m.w + '×' + m.h + (s < .999 ? ' · ' + Math.round(s * 100) + '%' : '');
}
function ga(u) {
  URL_NU = u;
  $('#spel').src = u;
  $('#nu').textContent = u;
}
function herlaad() { ga(URL_NU); }

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
  st.textContent = Object.keys(OVERLAYS).filter(k => knop[k]).map(k => OVERLAYS[k]).join('\n');
}

/* ---- versie --------------------------------------------------------------- */
async function haalVersie() {
  const f = await (await fetch('/api/versie')).json();
  $('#vsam').textContent = f.samenvatting;
  const stip = $('#vstip');
  stip.className = 'stip' + (f.vuil ? ' vuil' : (f.achter ? ' weg' : ''));
  const d = $('#vdetail');
  d.innerHTML = '';
  const zet = (k, v) => { if (v == null || v === '') return;
    d.appendChild(el('dt', null, k)); d.appendChild(el('dd', null, v)); };
  zet('bron', f.naam + (f.los ? ' (losse kop — alleen kijken)' : ''));
  zet('commit', f.sha + ' · ' + (f.onderwerp || ''));
  zet('gemaakt', f.wanneer ? new Date(f.wanneer).toLocaleString('nl-NL') + ' · ' + (f.auteur || '') : '');
  zet('werkmap', f.vuil ? f.vuil + ' open wijziging' + (f.vuil === 1 ? '' : 'en') : 'schoon');
  if (f.upstream) zet('verte', f.upstream + ' · ' +
    (f.achter ? f.achter + ' nieuw daar' : 'niets nieuws') + (f.voor ? ', ' + f.voor + ' hier niet gepusht' : ''));
  else zet('verte', 'geen — deze tak staat alleen hier');
  if (f.vanMain) zet('t.o.v. main', f.vanMain.achter + ' achter, ' + f.vanMain.voor + ' voor');
  zet('opgehaald', f.opgehaald ? new Date(f.opgehaald).toLocaleString('nl-NL') : 'nog niet');
  $('#bijwerk').disabled = !f.achter || !!f.vuil || f.los;
  if (f.vuil) $('#vuil').textContent = f.vuileRegels.join('\n');
  else $('#vuil').textContent = '';
}

async function haalBronnen() {
  const k = $('#bron');
  k.innerHTML = '<option>bezig…</option>';
  const b = await (await fetch('/api/bronnen')).json();
  k.innerHTML = '';
  const eerste = document.createElement('option');
  eerste.value = ''; eerste.textContent = 'kies een bron om te testen…';
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

async function doe(pad, body, waar) {
  const m = $(waar);
  m.className = 'melding'; m.textContent = 'bezig…';
  try {
    const r = await fetch(pad, { method: 'POST', body: body || '' });
    const j = await r.json();
    m.className = 'melding ' + (j.ok ? 'ok' : 'fout');
    m.textContent = j.tekst + (j.vuileRegels ? '\n\n' + j.vuileRegels.join('\n') : '');
    await haalVersie();
    if (j.ok) { await haalBronnen(); await haalWerelden(); herlaad(); }
  } catch (e) { m.className = 'melding fout'; m.textContent = String(e.message); }
}

/* ---- werelden ------------------------------------------------------------- */
let WERELDEN = null;
async function haalWerelden() {
  const r = await fetch('/api/werelden');
  WERELDEN = await r.json();
  /* index.html kan stuk zijn -- je test nu eenmaal ook takken waar iemand nog
     middenin zit. Dan hoort de studio te zéggen wat er mis is en verder gewoon te
     werken; een lege pagina zonder uitleg zou je de fout in je eigen werk laten
     zoeken. */
  if (!WERELDEN || !WERELDEN.werelden) {
    $('#walg').textContent = 'de werelden zijn niet te lezen uit index.html';
    $('#wmeld').className = 'melding fout';
    $('#wmeld').textContent = (WERELDEN && WERELDEN.tekst) || 'onbekende fout';
    $('#wlijst').innerHTML = ''; $('#wdetail').innerHTML = ''; $('#wtitel').textContent = '';
    return;
  }
  const lijst = $('#wlijst');
  lijst.innerHTML = '';
  WERELDEN.werelden.forEach(w => {
    const b = el('button', 'w' + (w.nr === WERELD ? ' op' : ''));
    b.appendChild(el('span', 'ic', w.icoon || '·'));
    const nm = el('span', 'nm');
    nm.appendChild(el('b', null, w.naam));
    nm.appendChild(el('small', null, 'wereld ' + w.nr + ' · show ' + w.eerste + '–' + w.laatste +
      ' · ' + w.levels + ' shows' + (w.uitgebracht ? '' : ' · nog niet uitgebracht')));
    b.appendChild(nm);
    b.appendChild(el('span', 'vlag ' + (w.fouten ? 'fout' : w.letop ? 'let' : 'ok'),
      w.fouten ? w.fouten + ' fout' : w.letop ? w.letop + ' let op' : 'in orde'));
    b.onclick = () => { WERELD = w.nr; haalWerelden(); };
    lijst.appendChild(b);
  });
  const alg = $('#walg');
  alg.innerHTML = '';
  alg.textContent = WERELDEN.werelden.length + ' werelden · shows 1–' + WERELDEN.laatsteLevel +
    ' · ' + WERELDEN.fouten + ' fout, ' + WERELDEN.letop + ' let op';
  WERELDEN.lijstPunten.forEach(p => {
    const d = el('div', 'punt' + (p.ernst === 'fout' ? ' fout' : ''));
    d.appendChild(el('b', null, p.ernst + ' · de wereldlijst'));
    d.appendChild(document.createTextNode(p.t));
    alg.appendChild(d);
  });
  tekenWereld();
  tekenScenario();
}
function tekenWereld() {
  const w = (WERELDEN.werelden.filter(x => x.nr === WERELD)[0]) || WERELDEN.werelden[0];
  if (!w) return;
  WERELD = w.nr;
  const d = $('#wdetail');
  d.innerHTML = '';
  const dl = el('dl', 'kv');
  const zet = (k, v) => { dl.appendChild(el('dt', null, k)); dl.appendChild(el('dd', null, v)); };
  zet('id', w.id);
  zet('volgorde', 'wereld ' + w.nr + (w.slotVan ? ' — gaat open als ' + w.slotVan + ' uit is' : ' — de eerste, altijd open'));
  zet('shows', w.levels + ' (show ' + w.eerste + ' t/m ' + w.laatste + ')');
  zet('kaart', w.art ? w.art + (w.artKb ? ' · ' + w.artKb + ' kB' : ' · ONTBREEKT') : 'geen — speelt op de kleuren');
  zet('zaal', w.zaal.tekst);
  zet('beloning', w.beloning ? (w.beloningNaam || '?') + ' (' + w.beloning + ')' + (w.beloningErIs ? '' : ' — BESTAAT NIET') : 'geen');
  zet('trofee', w.trofee);
  zet('haltes', w.haltes + (w.haltesEigen ? ' gezet' : ' (standaardslinger)') + ' · ' + w.stuurpunten + ' stuurpunten');
  zet('uitgebracht', w.uitgebracht ? 'ja' : 'nee — wel genummerd, niet speelbaar');
  d.appendChild(dl);
  w.punten.forEach(p => {
    const b = el('div', 'punt' + (p.ernst === 'fout' ? ' fout' : ''));
    b.appendChild(el('b', null, p.ernst + ' · ' + p.waar));
    b.appendChild(document.createTextNode(p.t));
    d.appendChild(b);
  });
  tekenVoorkeuzes($('#wkijk'), 'wereld', true);
  $('#wtitel').textContent = (w.icoon || '') + ' ' + w.naam;
  document.querySelectorAll('#wlijst .w').forEach((b, i) =>
    b.classList.toggle('op', WERELDEN.werelden[i].nr === WERELD));
}

/* ---- scenario's ----------------------------------------------------------- */
function tekenVoorkeuzes(vak, plek, kort) {
  vak.innerHTML = '';
  const groepen = {};
  VOORKEUZES.filter(v => v.plek === plek).forEach(v => {
    (groepen[v.groep] = groepen[v.groep] || []).push(v);
  });
  Object.keys(groepen).forEach(g => {
    vak.appendChild(el('div', 'zacht', g));
    const rij = el('div', 'rij');
    groepen[g].forEach(v => {
      // bij de wereld staat al wélke wereld het is; "deze wereld" erbij is ruis
      const naam = kort ? v.label.replace(/ (van )?deze wereld$/, '') : v.label;
      const b = el('button', null, naam);
      if (v.uitleg) b.title = v.uitleg;
      b.onclick = () => ga(bouw(vul(v, WERELD)));
      rij.appendChild(b);
    });
    vak.appendChild(rij);
  });
}
function tekenScenario() { tekenVoorkeuzes($('#scen'), 'algemeen', false); }
/* Dezelfde twee functies als in test/scenario.js -- bewust hier herhaald in
   plaats van het bestand mee te sturen, want het zijn negen regels en een
   tweede <script> uit node_modules is precies wat deze app niet heeft. De test
   (test/hub.test.js) kijkt na of ze hetzelfde blijven doen. */
function bouw(p) {
  const d = ['debug', 'demo', 'star=' + (p.star || 'p1')];
  if (p.wereld) d.push('wereld=' + p.wereld);
  if (p.stand) d.push('stand=' + p.stand);
  if (p.diamanten != null) d.push('diamanten=' + p.diamanten);
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
function huidigeStand() {
  const q = new URLSearchParams(URL_NU.split('?')[1] || '');
  return { wereld: q.get('wereld'), stand: q.get('stand'), diamanten: q.get('diamanten') };
}

/* ---- opbouw --------------------------------------------------------------- */
function init() {
  // secties in- en uitklappen, en dat onthouden
  document.querySelectorAll('section > h2').forEach(h => {
    const s = h.parentNode;
    if (localStorage.getItem('studio-dicht-' + s.id) === '1') s.classList.add('dicht');
    h.onclick = () => { s.classList.toggle('dicht');
      localStorage.setItem('studio-dicht-' + s.id, s.classList.contains('dicht') ? '1' : '0'); };
  });

  // toestellen
  const tv = $('#toestellen');
  TOESTELLEN.forEach(t => {
    const b = el('button', t.id === TOESTEL ? 'aan' : '', t.label);
    b.title = t.uitleg || '';
    b.onclick = () => { TOESTEL = t.id;
      tv.querySelectorAll('button').forEach(x => x.classList.remove('aan'));
      b.classList.add('aan'); pasVak(); };
    tv.appendChild(b);
  });

  // schermen
  const sv = $('#schermen');
  SCHERMEN.forEach(s => {
    const b = el('button', null, s.label);
    b.onclick = () => { const st = huidigeStand();
      ga(bouw({ wereld: st.wereld || WERELD, stand: st.stand || 'halverwege',
                diamanten: st.diamanten, screen: s.id })); };
    sv.appendChild(b);
  });

  // beeldkeuring
  const qv = $('#qa');
  [['randen', 'Randen', 'elk element krijgt een lijntje — zo zie je de opmaak'],
   ['raster', 'Raster', 'tien procent per vak, over het hele scherm'],
   ['stil', 'Stil', 'animaties en overgangen uit']].forEach(([k, lab, tip]) => {
    const b = el('button', null, lab);
    b.title = tip;
    b.onclick = () => { knop[k] = !knop[k]; b.classList.toggle('aan', knop[k]); pasOverlays(); };
    qv.appendChild(b);
  });

  $('#spel').addEventListener('load', pasOverlays);
  addEventListener('resize', pasVak);

  $('#haalop').onclick = () => doe('/api/haalop', '', '#bronmeld');
  $('#bijwerk').onclick = () => doe('/api/bijwerken', '', '#bronmeld');
  $('#wisselknop').onclick = () => {
    const ref = $('#bron').value;
    if (!ref) return;
    doe('/api/wissel', ref, '#bronmeld');
  };
  $('#naarmain').onclick = () => doe('/api/wissel', 'main', '#bronmeld');

  $('#wstudio').onclick = () => open(bouw({ wereld: WERELD, stand: 'halverwege', screen: 'map', mapedit: 1 }), '_blank');
  $('#wnieuw').onclick = () => open(bouw({ wereld: WERELD, stand: 'halverwege', screen: 'map', mapedit: 1, nieuw: 1 }), '_blank');
  $('#wkeuring').onclick = async () => {
    const m = $('#wmeld'); m.className = 'melding'; m.textContent = 'de keuringen draaien…';
    const j = await (await fetch('/api/keuring', { method: 'POST' })).json();
    m.className = 'melding ' + (j.ok ? 'ok' : 'fout');
    m.textContent = j.tekst;
    haalWerelden();
  };

  $('#herlaad').onclick = herlaad;
  $('#schoon').onclick = async () => {
    const w = $('#spel').contentWindow;
    try {
      w.localStorage.clear(); w.sessionStorage.clear();
      if (w.caches) for (const k of await w.caches.keys()) await w.caches.delete(k);
      if (w.navigator.serviceWorker) {
        for (const r of await w.navigator.serviceWorker.getRegistrations()) await r.unregister();
      }
      $('#gmeld').className = 'melding ok';
      $('#gmeld').textContent = 'opslag, cache en servicewerker van het vak leeggemaakt';
    } catch (e) { $('#gmeld').className = 'melding fout'; $('#gmeld').textContent = String(e.message); }
    herlaad();
  };
  $('#normaal').onclick = () => ga('/');
  $('#metsw').onclick = () => ga(bouw({ wereld: WERELD, stand: 'halverwege', screen: 'map', sw: 1 }));
  $('#swstand').onclick = async () => {
    const w = $('#spel').contentWindow, m = $('#gmeld');
    try {
      const rs = w.navigator.serviceWorker ? await w.navigator.serviceWorker.getRegistrations() : [];
      const cs = w.caches ? await w.caches.keys() : [];
      m.className = 'melding';
      m.textContent = (rs.length ? rs.map(r => 'servicewerker: ' + (r.active ? 'actief' : 'nog niet actief') +
        ' · ' + (r.scope || '')).join('\n') : 'geen servicewerker — de voorbeeldserver zet hem uit; ' +
        'gebruik "met servicewerker" om het bijwerken na te kijken') + '\ncaches: ' + (cs.join(', ') || 'geen');
    } catch (e) { m.className = 'melding fout'; m.textContent = String(e.message); }
  };
  $('#nieuwvenster').onclick = () => {
    const m = maat();
    // "Gewoon spel" is '/' zonder vraagteken; dan hoort &fit= een ?fit= te zijn
    const voeg = URL_NU.indexOf('?') >= 0 ? '&' : '?';
    open(URL_NU + (m ? voeg + 'fit=' + m.w + 'x' + m.h : ''), '_blank',
      m ? 'width=' + m.w + ',height=' + m.h : '');
  };

  pasVak();
  ga(bouw({ wereld: 1, stand: 'halverwege', screen: 'map' }));
  haalVersie(); haalBronnen(); haalWerelden();
  setInterval(haalVersie, 30000);     // een checkout in een ander venster valt zo vanzelf op
}
document.addEventListener('DOMContentLoaded', init);
`;

function pagina(gegevens) {
  return `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<title>Rekensterren — Dev Studio</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>${CSS}</style>
</head>
<body>
<header>
  <b>Rekensterren · Dev Studio</b>
  <span class="zacht">${esc(gegevens.adres)}</span>
  <span class="versie"><span class="stip" id="vstip"></span><span id="vsam">…</span></span>
</header>

<div class="hoofd">
  <div class="kolom">

    <section id="s-bron">
      <h2>Draaiende versie</h2>
      <div class="inhoud">
        <dl class="kv" id="vdetail"></dl>
        <div class="rij" style="margin-top:8px">
          <button id="haalop" title="git fetch --all --prune — raakt je werkmap niet aan">Haal op</button>
          <button id="bijwerk" title="alleen fast-forward">Werk bij</button>
          <button id="naarmain">Terug naar main</button>
        </div>
        <div class="rij" style="margin-top:8px">
          <select id="bron" style="flex:1"></select>
          <button class="prim" id="wisselknop">Wissel</button>
        </div>
        <div class="melding" id="bronmeld"></div>
        <div class="melding mono kort" id="vuil"></div>
      </div>
    </section>

    <section id="s-werelden">
      <h2>Werelden</h2>
      <div class="inhoud">
        <div class="zacht" id="walg"></div>
        <div class="wlijst" id="wlijst" style="margin-top:6px"></div>
        <h3 style="margin:11px 0 0;font-size:13px" id="wtitel"></h3>
        <div id="wdetail"></div>
        <div id="wkijk" style="margin-top:8px"></div>
        <div class="zacht" style="margin-top:9px">Bewerken</div>
        <div class="rij" style="margin-top:3px">
          <button id="wstudio" title="de wereldstudio: tekening, kleuren, haltes, beloning">Open wereldstudio</button>
          <button class="prim" id="wnieuw">Wereld toevoegen</button>
          <button id="wkeuring" title="node test/inhoud|kern|saves|kleedkamer — een paar seconden">Keuringen</button>
        </div>
        <div class="melding mono" id="wmeld"></div>
      </div>
    </section>

    <section id="s-scen">
      <h2>Testbeeld</h2>
      <div class="inhoud"><div id="scen"></div></div>
    </section>

    <section id="s-open">
      <h2>Openen</h2>
      <div class="inhoud"><div class="rij" id="schermen"></div></div>
    </section>

    <section id="s-qa">
      <h2>Beeldkeuring</h2>
      <div class="inhoud">
        <div class="rij" id="toestellen"></div>
        <div class="rij" id="qa"></div>
      </div>
    </section>

    <section id="s-ger" class="dicht">
      <h2>Gereedschap</h2>
      <div class="inhoud">
        <div class="rij">
          <button id="herlaad">Herlaad</button>
          <button id="schoon" title="opslag, cache en servicewerker van het kijkvak">Maak schoon</button>
          <button id="normaal" title="het spel zonder enige vlag">Gewoon spel</button>
        </div>
        <div class="rij">
          <button id="metsw" title="de voorbeeldserver zet de servicewerker normaal uit">Met servicewerker</button>
          <button id="swstand">Servicewerker-stand</button>
        </div>
        <div class="melding mono" id="gmeld"></div>
        <p class="zacht" style="margin:8px 0 0">
          Op je telefoon (zelfde wifi): <span class="mono">${esc(gegevens.lan || 'geen netwerkadres gevonden')}</span>
        </p>
      </div>
    </section>

  </div>

  <div class="kijk">
    <div class="kijkbalk">
      <span class="zacht" id="maat"></span>
      <button id="nieuwvenster" style="margin-left:auto" title="op ware toestelmaat, in een echt venster">Eigen venster ⧉</button>
    </div>
    <div class="doos" id="doos"><iframe id="spel" title="het spel"></iframe></div>
    <div class="nu" id="nu"></div>
  </div>
</div>

<script>
const TOESTELLEN = ${JSON.stringify(scenario.TOESTELLEN)};
const SCHERMEN = ${JSON.stringify(scenario.SCHERMEN)};
const VOORKEUZES = ${JSON.stringify(scenario.VOORKEUZES)};
${JS}
</script>
</body>
</html>`;
}

module.exports = { pagina };
