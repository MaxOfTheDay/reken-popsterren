/*
 * De standen waarin je het spel wilt zien, met een naam erop.
 *
 * Eén lijst, twee lezers: de studiopagina (test/hub.js) zet er knoppen van, en
 * test/hub.test.js kijkt na of elke knop een URL oplevert die het spel ook
 * werkelijk begrijpt. Zonder die ene lijst zou er een knop kunnen staan met een
 * vlag die de app niet kent -- een knop die niets doet is erger dan geen knop.
 *
 * De vlaggen zelf staan in index.html (zoek op "Ontwikkelaarsschakelaars"); hier
 * staat alleen wat ze betekenen in gewone taal, en wélke combinaties de moeite
 * waard zijn. Alles draait op ?debug&demo, en dat grendelt de opslag: geen enkele
 * knop hieronder kan de voortgang van een echt kind raken.
 */

/* De standen ín een wereld. De namen komen letterlijk uit zetKijkstand. */
const STANDEN = [
  { id: 'slot',       label: 'Op slot',          uitleg: 'de wereld ervóór is nog niet uit — dit ziet een kind dat vooruitkijkt' },
  { id: 'vers',       label: 'Net begonnen',     uitleg: 'halte 1 is aan de beurt, nog geen ster' },
  { id: 'halverwege', label: 'Halverwege',       uitleg: 'drie shows gedaan, de vierde staat klaar' },
  { id: 'bijna',      label: 'Bijna uit',        uitleg: 'alles op de laatste show na — speel die uit voor de wereldovergang' },
  { id: 'uit',        label: 'Uitgespeeld',      uitleg: 'elke show gedaan, twee sterren' },
  { id: 'perfect',    label: 'Perfect',          uitleg: 'overal drie sterren — de wereldbadge met de ster' },
];

/* De schermen die het spel met &screen= rechtstreeks kan openen. */
const SCHERMEN = [
  { id: 'profile', label: 'Wie speelt er' },
  { id: 'map',     label: 'Wereldkaart' },
  { id: 'reis',    label: 'Werelden' },
  { id: 'game',    label: 'De show' },
  { id: 'end',     label: 'Einde van een show' },
  { id: 'dress',   label: 'Kleedkamer' },
  { id: 'tro',     label: 'Trofeeën' },
  { id: 'ouder',   label: 'Voor ouders' },
];

/* De voorkeuzes: één klik, een stand die ergens over gaat. Ze staan hier en niet
   in de pagina zodat een test ze kan nalopen.

   `wereld: 'gekozen'` betekent: neem de wereld die in de lijst aangetikt is. Dat
   scheelt zes knoppen per wereld en houdt deze lijst even lang als er wereld
   zeven, acht en negen bij komen.

   `plek` zegt wáár de knop hoort, en dat is geen opmaak maar een scheiding van
   twee bezigheden. 'wereld' is het nakijken van één wereld -- die knoppen staan
   bij die wereld, want daar doe je dat. 'algemeen' gaat over de stand van het
   hele spel en staat los bij Testbeeld. Zo staat geen enkele knop twee keer. */
const VOORKEUZES = [
  { id: 'nieuw', plek: 'algemeen', groep: 'Voortgang', label: 'Nieuwe speler',
    uitleg: 'niets gespeeld, halte 1 van wereld 1',
    params: { wereld: 1, stand: 'vers', screen: 'map' } },
  { id: 'hier-vers', plek: 'wereld', groep: 'Stand', label: 'Net begonnen',
    uitleg: 'alles ervóór uit, hier nog niets',
    params: { wereld: 'gekozen', stand: 'vers', screen: 'map' } },
  { id: 'hier-half', plek: 'wereld', groep: 'Stand', label: 'Halverwege',
    uitleg: 'drie shows gedaan',
    params: { wereld: 'gekozen', stand: 'halverwege', screen: 'map' } },
  { id: 'hier-bijna', plek: 'wereld', groep: 'Stand', label: 'Bijna uit',
    uitleg: 'speel hem uit en je ziet de wereldovergang en de beloning',
    params: { wereld: 'gekozen', stand: 'bijna', screen: 'map' } },
  { id: 'hier-perfect', plek: 'wereld', groep: 'Stand', label: 'Perfecte wereld',
    uitleg: 'overal drie sterren',
    params: { wereld: 'gekozen', stand: 'perfect', screen: 'map' } },
  { id: 'hier-slot', plek: 'wereld', groep: 'Stand', label: 'Op slot',
    uitleg: 'zoals een kind hem ziet dat er nog niet is',
    params: { wereld: 'gekozen', stand: 'slot', screen: 'map' } },
  { id: 'laat', plek: 'algemeen', groep: 'Voortgang', label: 'Alles uitgespeeld',
    uitleg: 'elke uitgebrachte wereld perfect — de toegift-stand',
    params: { stand: 'alles', screen: 'map' } },

  { id: 'show-eerste', plek: 'wereld', groep: 'Shows', label: 'Eerste show van deze wereld',
    params: { wereld: 'gekozen', stand: 'vers', screen: 'game' } },
  { id: 'show-laatste', plek: 'wereld', groep: 'Shows', label: 'Laatste show van deze wereld',
    params: { wereld: 'gekozen', stand: 'bijna', screen: 'game' } },
  { id: 'show-einde', plek: 'wereld', groep: 'Shows', label: 'Einde van een show',
    uitleg: 'het sterrenscherm na afloop',
    params: { wereld: 'gekozen', stand: 'halverwege', screen: 'end' } },

  { id: 'arm', plek: 'algemeen', groep: 'Diamanten', label: 'Geen diamanten',
    params: { wereld: 'gekozen', stand: 'halverwege', diamanten: 0, screen: 'dress' } },
  { id: 'koopklaar', plek: 'algemeen', groep: 'Diamanten', label: 'Genoeg om te kopen',
    params: { wereld: 'gekozen', stand: 'halverwege', diamanten: 120, screen: 'dress' } },
  { id: 'kast-vol', plek: 'algemeen', groep: 'Diamanten', label: 'Volle kleedkamer',
    uitleg: 'alles uit, dus elke wereldbeloning verdiend',
    params: { stand: 'alles', diamanten: 999, screen: 'dress' } },
  { id: 'trofeeen', plek: 'algemeen', groep: 'Diamanten', label: 'Trofeeënkast',
    params: { stand: 'alles', screen: 'tro' } },
];

/* De toestelmaten. Dezelfde zes als in de wereldstudio (zie MATEN in
   startMapEdit), met de namen die je hier wilt lezen. Elke maat staat er omdat
   hij een ándere rand van de opmaak bepaalt -- niet omdat het toestel bestaat. */
const TOESTELLEN = [
  { id: '412x920',  label: 'Pixel 10',        uitleg: 'het doel — lang en smal' },
  { id: '390x844',  label: 'Gewone telefoon', uitleg: 'de maat waarop alles ontworpen is' },
  { id: '320x568',  label: 'Kleine telefoon', uitleg: 'hier hapt de vaste kop het meest uit het scherm' },
  { id: '768x1024', label: 'Tablet',          uitleg: 'de volle breedte van de tekening' },
  { id: '844x390',  label: 'Liggend',         uitleg: 'de kolom-noodstand' },
  { id: '',         label: 'Vullend',         uitleg: 'zo groot als het vak is' },
];

/* Van parameters naar een URL die het spel begrijpt.
   ?debug&demo&star=p1 staat er altijd: debug zet de schakelaars aan, demo vult
   twee voorbeeldsterren in het geheugen, en star kiest er een. Die drie samen
   zijn ook de grendel op de opslag. */
function url(params, basis) {
  const p = params || {};
  const d = ['debug', 'demo', 'star=' + (p.star || 'p1')];
  if (p.wereld) d.push('wereld=' + p.wereld);
  if (p.stand) d.push('stand=' + p.stand);
  if (p.diamanten != null) d.push('diamanten=' + p.diamanten);
  if (p.stage) d.push('stage=' + p.stage);
  if (p.screen) d.push('screen=' + p.screen);
  if (p.mapedit) d.push('mapedit');
  if (p.nieuw) d.push('nieuw');
  if (p.fit) d.push('fit=' + p.fit);
  return (basis || '/') + '?' + d.join('&');
}

/* Een voorkeuze invullen met de wereld die nu gekozen is. */
function vul(voorkeuze, wereldNr) {
  const p = Object.assign({}, voorkeuze.params);
  if (p.wereld === 'gekozen') p.wereld = wereldNr || 1;
  return p;
}

module.exports = { STANDEN, SCHERMEN, VOORKEUZES, TOESTELLEN, url, vul };
