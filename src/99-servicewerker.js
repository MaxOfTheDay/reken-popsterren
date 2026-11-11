if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  /* Een browser mag het aanmelden weigeren (een privévenster, uitgezette
     sitegegevens, een toestel dat het zomaar "Rejected" noemt -- dat laatste
     kwam eind oktober drie keer binnen van Android). Het spel draait dan gewoon
     door, maar zonder voorraad: zonder net is er dan geen spel. Dat is stil,
     dus geen onopgevangen belofte (die telde als een crash), maar wel één
     briefje "sw: ..." zodat de zondagrapportage telt hoeveel toestellen zonder
     voorraad spelen. */
  navigator.serviceWorker.register('sw.js').catch(e => {
    try { meldFout('sw: ' + ((e && (e.name + ' ' + (e.message || '')).trim()) || 'geweigerd')); } catch (e2) { /* melder stil */ }
  });
  /* Welke tekeningen er vandaag bestaan weet alleen dit bestand -- sw.js kent
     geen werelden en hoort ze ook niet te kennen. Deze lijst laat hem opruimen wat
     er niet meer bij hoort (een wereld die weg is, een tekening die hernoemd is),
     zodat de voorraad meegroeit met de werelden die er zíjn en niet met alle
     werelden die er ooit geweest zijn.

     Achter in de rij, en pas als er een service worker aan het roer staat: dit is
     opruimwerk, en opruimwerk komt ná het scherm. Zie het bericht-blok in sw.js. */
  /* En wat er al getoond is (bewaar). Bij het allereerste bezoek draait de
     service worker nog niet als het spel zijn tekeningen ophaalt: de kaart van
     haar wereld, het decor van de zaal, de tegeltjes van Werelden gingen
     buiten hem om en kwamen in geen voorraad. Zonder net daarna -- de app thuis
     op het beginscherm gezet, in de auto gespeeld -- stond de kaart er zonder
     tekening. Een iPhone-app is bij elke eerste start zo'n eerste bezoek. Dus
     zegt het spel welke tekeningen het al heeft opgehaald; die staan nog in de
     gewone browsercache, dus dit kost geen tweede download. Wat er ná dit
     bericht komt, loopt vanzelf via de service worker.

     Naar de actieve worker (ready) en niet naar de controller: die is er bij een
     eerste bezoek pas als clients.claim() klaar is, en dan kwam dit nooit aan. */
  naDeRust(() => {
    navigator.serviceWorker.ready.then(reg => {
      const sw = reg.active;
      if (!sw) return;
      const art = [];
      WORLDS.forEach(w => {
        [w.art, wereldKleinPad(w.art), w.venue && w.venue.art].forEach(a => {
          if (a && a.indexOf('blob:') !== 0 && !art.includes(a)) art.push(a);
        });
      });
      /* Wat al binnen is (de resource-lijst), plus de wereld waar elke ster nu
         staat: haar kaart kan op een trage verbinding nog onderweg zijn als dit
         bericht vertrekt, en staat dan nog niet in die lijst. */
      const bewaar = (performance.getEntriesByType ? performance.getEntriesByType('resource') : [])
        .map(e => e.name).filter(u => u.indexOf(location.origin + '/') === 0 && u.indexOf('/assets/') > 0);
      Object.values(db.profiles).forEach(p => {
        const w = worldFor(hereLevel(p)).world;
        [w.art, wereldKleinPad(w.art), w.venue && w.venue.art].forEach(a => {
          if (a && a.indexOf('blob:') !== 0) bewaar.push(a);
        });
      });
      sw.postMessage({ art: art, bewaar: bewaar });
    }).catch(() => {});
  });
}

/* ================= Een nieuwe versie, voor wie de app nooit dichtdoet ==========
   Bij elke start haalt sw.js het spel netwerk-eerst op, dus wie de app opent
   speelt de nieuwste versie. Maar een app op het beginscherm -- of een tabblad
   dat openblijft -- gaat soms dagen niet dicht. Het toestel zet hem in de
   achtergrond en haalt hem later precies zo terug, met de code van toen in het
   geheugen. Een oplossing die vandaag uitkomt, bereikt dat kind dan pas als het
   systeem de app een keer echt afsluit.

   Dus: komt de app terug na een lange pauze, dan vraagt hij versie.txt op (een
   paar bytes, zie test/bouw.js) en vergelijkt die met zijn eigen afdruk. Is er
   een nieuwere én staat het kind op een rustpunt, dan laadt hij stil opnieuw.

   Alleen op een rustpunt: de sterrenkeuze of de kaart, zonder venster of laag
   erover en zonder overgang die nog loopt. Nooit in een show, op de reis, in een
   feestje of in de kleedkamer -- daar wacht hij gewoon op de volgende terugkeer.
   Er valt niets te verliezen: save() schrijft meteen weg, er staat niets in de
   wachtrij. Alleen cur leeft in het geheugen, en die gaat via sessionStorage mee
   over het herladen, zodat wie op haar kaart stond daar ook weer uitkomt.

   Geen melding, geen "er is een update": voor een kind is dit gewoon de app die
   weer opengaat, en dat is het moment waarop zoiets ook hoort te gebeuren. */
const VERSIE_PAUZE = 30 * 60 * 1000;
const VERSIE_TERUG = 'rekenPopsterren_terug';
// Dezelfde rekensom als versieVan in test/bouw.js (zaak H kijkt of ze gelijk zijn).
function versieVan(tekst) {
  let h = 0x811c9dc5;
  for (let i = 0; i < tekst.length; i++) { h ^= tekst.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}
// De afdruk van wat hier draait: het stijlblad en het scriptblok zoals ze in de
// pagina staan. Pas uitgerekend als hij nodig is -- het is een halve megabyte tekst.
let eigenVersie = null;
function mijnVersie() {
  if (eigenVersie == null) {
    const st = document.querySelector('style');
    const sc = document.querySelector('script:not([src]):not([type])');
    eigenVersie = versieVan((st ? st.textContent : '') + (sc ? sc.textContent : ''));
  }
  return eigenVersie;
}
function opRustpunt() {
  if (document.hidden) return false;
  const act = document.querySelector('.screen.active');
  if (!act || (act.id !== 'screen-profile' && act.id !== 'screen-map')) return false;
  if (document.querySelector('.modal-bg.open, .rp-overlay')) return false;
  // kiesBezig blijft aan tot de sterrenkeuze terugkomt, dus alleen dáár betekent
  // hij "er is net een ster gekozen"
  if (act.id === 'screen-profile' && kiesBezig) return false;
  return !(overgangBezig || terugBezig || vluchtOp || wereldReisOp);
}
function kijkNaarVersie() {
  // vanaf file:// is er niets op te vragen, en onder ?debug kijken de tests mee
  if (!/^https?:$/.test(location.protocol) || location.search.indexOf('debug') !== -1) return;
  if (!opRustpunt()) return;
  fetch('versie.txt', { cache: 'no-store' })
    .then(r => r.ok ? r.text() : '')
    .then(t => {
      t = t.trim();
      if (!/^[0-9a-f]{8}$/.test(t) || t === mijnVersie() || !opRustpunt()) return;
      try {
        if (cur && $('screen-map').classList.contains('active')) {
          sessionStorage.setItem(VERSIE_TERUG, JSON.stringify({ ster: cur, t: Date.now() }));
        }
      } catch (e) { /* geen sessionStorage: dan op de sterrenkeuze */ }
      location.reload();
    })
    .catch(() => {});
}
let wegSinds = 0;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { wegSinds = Date.now(); return; }
  const lang = wegSinds && Date.now() - wegSinds >= VERSIE_PAUZE;
  wegSinds = 0;
  if (lang) kijkNaarVersie();
});
/* Net herladen voor een nieuwe versie? Dan terug naar de kaart van dezelfde ster.
   Alleen binnen een minuut: een briefje dat blijft liggen (het herladen lukte
   niet) hoort niet bij een volgende start in dit tabblad. */
(function terugNaVersie() {
  let t = null;
  try {
    t = JSON.parse(sessionStorage.getItem(VERSIE_TERUG) || 'null');
    sessionStorage.removeItem(VERSIE_TERUG);
  } catch (e) { return; }
  if (!t || cur || !(Date.now() - t.t < 60000) || !db.profiles[t.ster]) return;
  cur = t.ster;
  goMap();
})();
