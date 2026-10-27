"use strict";
/* De hoogte van dít beeldje vastleggen, vóór al het andere hieronder.
   manifest.json zet display:fullscreen, en op Android staat de statusbalk (klok,
   batterij) bij het opstarten nog even in beeld en vervaagt hij een fractie later
   vanzelf weg. Dat vergroot innerHeight, en alles wat op 100% hoogte staat (zie
   html,body in het stijlblad) groeit dan mee -- ook de wereldkaart, met zijn
   cover-vullende .world-frame voorop: hij landt goed en springt een moment later
   nog een tikje. Geen enkele animatie of overgang veroorzaakt dat; het is de
   browser die een écht grotere doos doorgeeft.

   100svh loste dit niet op: die eenheid gaat over de eigen, inklapbare werkbalk
   van de browser (zoals Safari's adresbalk), niet over een statusbalk die het
   besturingssysteem in een fullscreen-PWA erover legt en zelf weer wegneemt --
   Chrome op Android rekent die twee kennelijk niet hetzelfde toe.

   Dus hier, met de hand: --vh-lock is de hoogte van het allereerste beeldje, en
   dat is altijd van vóórdat de balk kan zijn gaan vervagen (die vervaagt pas een
   moment later, nooit eerder). Een latere resize wijzigt 'm alleen als ook de
   breedte anders is -- draaien, een ander vensterformaat -- want dat is een échte
   afmeting; een balk die op- of dichtklapt raakt nooit de breedte.

   En --vh-drift is het verschil dat daardoor ontstaat: hoeveel het venster op dit
   moment ónder dat vastgelegde slot is uitgegroeid. Dat is precies nul zolang de
   statusbalk er nog staat, en de hoogte van die balk zodra hij weg is. Alles wat
   via height:100% aan <body> hangt heeft er niets aan -- dat staat al stil -- maar
   position:fixed rekent tegen het vénster en niet tegen <body>, dus de zwevende
   balken ónderaan zakten in hun eentje mee. Zie de regel bij .main-nav in het
   stijlblad, die ze met dit getal terugzet.

   Hij loopt nooit onder nul: een venster dat juist kléiner wordt is op een telefoon
   het toetsenbord dat openschuift, en daar hóórt de bediening bovenop te blijven
   staan in plaats van erachter te verdwijnen.

   Maar "alleen de breedte telt" was te streng. Een venster wordt ook zonder andere
   breedte écht hoger of lager: de deler van Android-split-screen, een opvouwbare
   telefoon, een pc-venster dat je alleen in de hoogte trekt. Dan bleef de app op
   zijn oude maat staan -- met een lege vlakte eronder, of met zijn onderkant van
   het scherm af. Een hoogte zonder nieuwe breedte wordt dus nog maar in twee
   gevallen genegeerd:
     - er staat een tekstveld open: dat is het toetsenbord (zie hierboven);
     - het venster groeide een klein stukje (tot STATUSBALK): dat is de statusbalk
       die wegvaagt. Die groei wordt niet meteen overgenomen -- dan sprong de kaart
       alsnog -- maar bij de eerstvolgende schermwissel (vhVolg, vanuit show()):
       het oude scherm is dan al weg en het nieuwe nog niet getekend, dus er is
       niets dat zichtbaar verspringt. Tot dan vult --vh-drift het gat, zoals
       hierboven. Zo houdt de app niet de hele sessie een balk tekort.
   Al het andere legt de hoogte meteen opnieuw vast, net als draaien.

   venstermaat() is de maat waar de opmaak écht op staat: de breedte en het slot,
   niet innerHeight. Wie een meting onthoudt per venstermaat (kopKrimpMeten,
   rekBreedte), meet zo opnieuw zodra het slot verschuift, ook als het venster
   zelf al eerder zo groot was. */
const STATUSBALK = 80;
let vhSlot = innerHeight, vhBreedte = innerWidth;
function venstermaat() { return vhBreedte + 'x' + vhSlot; }
function vhZet() {
  const el = document.documentElement;
  vhSlot = innerHeight;
  el.style.setProperty('--vh-lock', vhSlot + 'px');
  vhDrift();
}
function vhDrift() {
  document.documentElement.style.setProperty('--vh-drift', Math.max(0, innerHeight - vhSlot) + 'px');
}
function vhTyptIemand() {
  const a = document.activeElement;
  if (!a) return false;
  if (a.isContentEditable || a.tagName === 'TEXTAREA') return true;
  return a.tagName === 'INPUT' && !/^(checkbox|radio|button|submit|reset|file|range|color|image)$/i.test(a.type || '');
}
/* De klaargelegde groei overnemen. Zegt of er iets veranderd is; dan krijgen de
   metingen die op een resize luisteren er één, zodat ze de nieuwe maat zien. */
function vhVolg() {
  if (innerWidth !== vhBreedte || innerHeight <= vhSlot || vhTyptIemand()) return false;
  vhZet();
  try { dispatchEvent(new Event('resize')); } catch (e) { /* geen Event: niets te melden */ }
  return true;
}
vhZet();
addEventListener('resize', () => {
  if (innerWidth !== vhBreedte) { vhBreedte = innerWidth; vhZet(); return; }
  const verschil = innerHeight - vhSlot;
  if (verschil === 0 || vhTyptIemand() || (verschil > 0 && verschil <= STATUSBALK)) vhDrift();
  else vhZet();
});
