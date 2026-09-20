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
   staan in plaats van erachter te verdwijnen. */
(function () {
  let w = innerWidth, slot = innerHeight;
  const el = document.documentElement;
  const drift = () => el.style.setProperty('--vh-drift', Math.max(0, innerHeight - slot) + 'px');
  const zet = () => {
    slot = innerHeight;
    el.style.setProperty('--vh-lock', slot + 'px');
    drift();
  };
  zet();
  addEventListener('resize', () => { if (innerWidth !== w) { w = innerWidth; zet(); } else drift(); });
})();
