/* ================= Foutmelder: welke fouten kinderen tegenkomen =================
   Het spel zag zijn eigen fouten niet. Een kind dat op een telefoon een lege
   kaart of een vastgelopen show krijgt, vertelt dat niemand -- en de browsertests
   draaien op één toestel, met één scherm, in één volgorde. Dit stuk telt wat er
   bij echte kinderen misgaat, en de wekelijkse rapportage (de zondag, naast de
   snelheid uit Cloudflare Web Analytics) leest die telling.

   Zo vroeg mogelijk, meteen na de vensterhoogte: een fout bij het opstarten is
   precies de fout die je het liefst wilt zien, en die valt vóór alles wat erna
   komt. Vandaar het volgnummer 05. Hier staat dus niets dat iets van het spel
   leest bij het laden -- alleen twee luisteraars, en wat ze pas doen als er
   werkelijk iets misgaat.

   Wat er weggaat is één briefje per fout, met precies vijf dingen:
     wat    de foutmelding, ingekort (de eerste regel, hoogstens 120 tekens)
     waar   bestand:regel:kolom in de pagina (index.html is één bestand, dus de
            regel samen met de versie wijst één plek aan)
     versie de afdruk van stijlblad en scriptblok, dezelfde als versie.txt
     scherm welk scherm er open stond (de id, zonder "screen-")
     toestel telefoon of tablet, uit de kortste kant van het scherm
   Geen naam, geen sterren, geen profiel, geen adres, geen koekje. De ontvanger
   (een Cloudflare Worker, zie docs/FOUTEN.md) bewaart het IP-adres niet en zet
   er alleen het soort systeem bij (Android, iOS, ...).

   Zuinig, want een fout in een lus kan honderd keer per seconde vallen:
   dezelfde fout gaat één keer weg, en per bezoek hoogstens FOUT_MAX briefjes.
   Mislukt het versturen (geen net), dan is het briefje gewoon weg -- er wordt
   niets bewaard of opnieuw geprobeerd, en het spel merkt er niets van.

   Nooit vanaf file://, localhost of onder ?debug: dan kijkt er een mens of een
   test mee, en die ziet de fout zelf al in de console. Fouten uit een script van
   buiten (het meetscriptje, een browserextensie) komen als "Script error." zonder
   bestand binnen; die tellen niet mee, ze zijn niet van ons.

   FOUT_ADRES leeg = de melder staat uit. */
const FOUT_ADRES = '';
const FOUT_MAX = 3;
const foutGezien = [];

function foutMeldenMag() {
  return !!FOUT_ADRES && location.protocol === 'https:'
    && !/^(localhost|127\.|\[::1\])/.test(location.hostname || '')
    && (location.search || '').indexOf('debug') === -1;
}

// De plek uit een stack: de eerste regel die naar deze site wijst. Een belofte die
// faalt heeft geen bestand en regel bij zich, alleen dit.
function foutPlekUitStack(stack) {
  const regels = String(stack || '').split('\n');
  for (const r of regels) {
    const m = r.match(/([^\/\s(@]*):(\d+):(\d+)\)?\s*$/);
    if (m && r.indexOf(location.host || '\u0000') !== -1) return (m[1] || 'index.html').replace(/\?.*$/, '') + ':' + m[2] + ':' + m[3];
  }
  return '';
}

// Het briefje zelf, zonder iets te versturen -- zuiver, zodat kern.test.js het kan
// nakijken. `bestand` is een volledig adres; alleen de naam gaat mee.
function foutBriefje(bericht, bestand, regel, kolom) {
  const wat = String(bericht == null ? '' : bericht).split('\n')[0].trim().replace(/^Uncaught /, '').slice(0, 120);
  const naam = String(bestand || '').replace(/[?#].*$/, '').split('/').pop() || 'index.html';
  const waar = regel ? naam + ':' + regel + ':' + (kolom || 0) : '';
  let scherm = '';
  try {
    const act = document.querySelector('.screen.active');
    scherm = act && act.id ? act.id.replace(/^screen-/, '') : '';
  } catch (e) { /* nog geen pagina */ }
  let toestel = '';
  try { toestel = Math.min(screen.width, screen.height) < 600 ? 'telefoon' : 'tablet'; } catch (e) { /* geen scherm */ }
  return { wat: wat, waar: waar, versie: foutVersie(), scherm: scherm, toestel: toestel };
}

// Dezelfde afdruk als mijnVersie in 99-servicewerker.js, maar zonder diens `let`:
// valt de fout bij het opstarten, dan heeft die regel nog niet gedraaid en zou
// mijnVersie zelf omvallen. versieVan is een functie en dus al gehesen.
let foutAfdruk = null;
function foutVersie() {
  if (foutAfdruk == null) {
    try {
      const st = document.querySelector('style');
      const sc = document.querySelector('script:not([src]):not([type])');
      foutAfdruk = versieVan((st ? st.textContent : '') + (sc ? sc.textContent : ''));
    } catch (e) { foutAfdruk = ''; }
  }
  return foutAfdruk;
}

function meldFout(bericht, bestand, regel, kolom) {
  try {
    if (!foutMeldenMag() || foutGezien.length >= FOUT_MAX) return;
    const b = foutBriefje(bericht, bestand, regel, kolom);
    if (!b.wat) return;
    const sleutel = b.wat + '|' + b.waar;
    if (foutGezien.indexOf(sleutel) !== -1) return;
    foutGezien.push(sleutel);
    // text/plain en geen eigen kopregels: dan vraagt de browser niet eerst om
    // toestemming (geen preflight), en gaat het briefje ook mee als de pagina sluit.
    const tekst = JSON.stringify(b);
    if (navigator.sendBeacon) navigator.sendBeacon(FOUT_ADRES, tekst);
    else fetch(FOUT_ADRES, { method: 'POST', body: tekst, mode: 'no-cors', keepalive: true }).catch(() => {});
  } catch (e) { /* de melder zelf mag nooit iets omgooien */ }
}

addEventListener('error', e => {
  // alleen fouten in een script van deze site: een plaatje dat niet laadt komt
  // hier niet langs (dat borrelt niet op), en "Script error." heeft geen bestand
  if (!e || !e.filename || e.filename.indexOf(location.origin) !== 0) return;
  meldFout(e.message || (e.error && e.error.message), e.filename, e.lineno, e.colno);
});
addEventListener('unhandledrejection', e => {
  const r = e && e.reason;
  const bericht = r && r.message ? (r.name && r.message.indexOf(r.name) !== 0 ? r.name + ': ' : '') + r.message : r;
  const plek = r && r.stack ? foutPlekUitStack(r.stack) : '';
  const m = plek.match(/^(.*):(\d+):(\d+)$/);
  meldFout('belofte: ' + bericht, m ? m[1] : '', m ? m[2] : 0, m ? m[3] : 0);
});
