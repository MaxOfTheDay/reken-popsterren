/* ================= De kaartstand: waar kijk je, en hoe kwam je er ==========
   Vijftien namen die samen één vraag beantwoorden: wat moet de eerstvolgende
   kaart-opbouw doen, en mag er op dit moment überhaupt iets bewegen.

   Ze stonden verspreid over zo'n tweeduizend regels, elk naast de functie die
   hem als eerste zette. Dat leest prima als je die ene functie leest en
   helemaal niet als je wilt weten wat er eigenlijk gebeurt tussen "tik op een
   halte" en "de zaal staat er": dan heb je er zes tegelijk nodig en staan ze
   nergens bij elkaar. Hier staan ze wel bij elkaar, met erbij wie ze zet en wie
   ze opmaakt. Er is geen regel gedrag aan veranderd -- alleen de plaats.

   ---- WAT VOOR SOORT DING IS DIT --------------------------------------------
   Drie soorten, en het verschil doet ertoe:

     STAND        wat er nú waar is. Blijft staan tot iets het verandert.
                  viewWorldIdx, reisVanuit, naShowLvl, kaartBezocht.
     OPDRACHT     een briefje voor de eerstvolgende kaart, dat diezelfde kaart
                  meteen weer weggooit. pendingTravel, reisDoel, kaartFocus,
                  netAf, tourMapVoltooi.
     GRENDEL      er loopt iets, begin niet nog eens. overgangBezig, terugBezig,
                  vluchtOp, wereldReisOp.

   EEN OPDRACHT WORDT ALTIJD VERBRUIKT, EN DAT IS GEEN NETHEID MAAR DE HELE
   WERKING. Blijft er eentje staan, dan doet de kaart bij een ónverwante opening
   -- de tabbalk, de terugknop -- ineens een onthulling of een terugzoom die bij
   een andere stand hoorde. Vandaar overal hetzelfde patroon: lees hem in een
   plaatselijke variabele, zet hem meteen op null, en werk daarna met de kopie.
   Zie goMap, dat dat vier keer achter elkaar doet.

   EEN GRENDEL GAAT ALTIJD WEER OPEN, OOK ALS ER IETS MISGAAT. Elke grendel
   hieronder hangt niet alleen aan animation.onfinish -- die kan uitblijven als
   het scherm tussentijds wisselt -- maar ook aan een vangnet-timer. Blijft er
   eentje hangen, dan staat er een kind op een kaart waar niets meer op reageert.
   Liever drie keer opruimen dan één keer niet.

   ---- WIE ZE ZET EN WIE ZE OPMAAKT ------------------------------------------
     viewWorldIdx    showWorld / renderTourMap / zetKijkstand / de studio
                     -> renderMapTitle, growRoad, openReis, preloadBuurwerelden,
                        preloadNextWorldArt
     pendingTravel   endLevel (na een level-up)            -> goMap
     reisDoel        reisNaarWereld, zetKijkstand          -> goMap
     reisVanuit      openReis                              -> reisSluit
     naShowLvl       endLevel                              -> goMapNaShow
     kaartFocus      goMap                                 -> renderTourMap
     netAf           goMap                                 -> renderTourMap
     tourMapVoltooi  renderTourMap                         -> goMap
     overgangBezig   enterLevel/openReis/reisNaarWereld/wereldVlucht
                     -> eindigOvergang
     terugBezig      goMap                                 -> goMap (vangnet)
     vluchtOp        wereldVlucht                          -> vluchtKlaar
     wereldReisOp    wereldCamera/runWorldChange           -> stopWereldReis
     kaartBezocht    kaartGroet                            -> kaartGroet
   goProfiles leegt pendingTravel en reisDoel als een ander kind gekozen wordt:
   een opdracht van de vorige ster hoort nooit bij de volgende te landen.

   ---- DE VOLGORDE DIE JE NIET MAG OMGOOIEN ----------------------------------
   Twee ervan staan als waarschuwing bij goMap zelf, en ze zijn er alle twee
   ingelopen:

     1  tourMapVoltooi wordt verbruikt NÁ de kaartFocus-controle. Allebei gaan ze
        over dezelfde kaartFocus, en wie eerst is wint -- verwissel ze en de
        terug-grendel wordt gezet op een vlag die al geleegd is.
     2  netAf en kaartFocus worden door renderTourMap geleegd en niet door goMap.
        Dat is met opzet: goMap tekent de kaart soms vóórdat het scherm aan
        staat, en dan moet de opdracht blijven liggen tot er écht getekend wordt.

   ---- WAT HIER NIET IN HOORT ------------------------------------------------
   Geen rAF-klemmetjes van scrollafhandelaars (reisVolgWacht, kastScrollWacht,
   ouderScrollWacht): die horen bij hun scherm en zeggen niets over waar je bent.
   Geen kiesBezig: dat is de sterrenkeuze. En geen spelstand -- G, db en cur
   staan waar ze horen.
   ========================================================================= */

/* ---- STAND: waar je bent -------------------------------------------------- */

// Welke wereld staat er in beeld? Normaal die van p.level, maar met de pijltjes
// onder/boven de kaart kun je terug naar een eerdere wereld om daar haltes te
// verbeteren. Wordt gereset zodra de kaart opnieuw geopend wordt.
let viewWorldIdx = null;

/* De wereld waar de kaart stond toen de reis openging. De ← van dit scherm brengt
   je daar terug -- weglopen van de reis is nooit "ergens anders uitkomen". */
let reisVanuit = null;

/* ---- OPDRACHT: één briefje voor de eerstvolgende kaart --------------------- */

/* De kaart is het hoofdscherm: de eigen ster staat óp de route bij haar volgende
   show, en dé speelknop zit vast aan die halte. Na een level-up reist de ster
   zichtbaar door naar de volgende halte (zie runTravel). */
let pendingTravel = null;   // { from, to } gezet bij een level-up; afgespeeld zodra de kaart opent

/* Eenmalige opdracht aan de eerstvolgende kaart: open op déze wereld. Zelfde soort
   ding als kaartFocus -- hij wordt door goMap meteen verbruikt, dus de kaart daarna
   opent gewoon weer waar de voortgang staat. */
let reisDoel = null;

/* De halte waar de laatste show speelde. Twee losse dingen, bewust:
     naShowLvl   onthouden, zodat élke uitgang van het eindscherm (de knop, de ←,
                 de terugknop van het toestel) op dezelfde plek uitkomt
     kaartFocus  een eenmalige opdracht aan de eerstvolgende kaart-opbouw. Wordt
                 door renderTourMap meteen geleegd, zodat een latere kaart via de
                 navigatiebalk gewoon normaal opengaat. */
let naShowLvl = null, kaartFocus = null;

/* FASE 4C -- welke halte zojuist gespeeld is. Eenmalige opdracht aan de
   eerstvolgende kaart in de éíndstand: daar laat hij het sterrentabje inlanden
   (zie .net-af). Bewust niet naShowLvl hergebruiken: die blijft staan zodat elke
   uitgang van het eindscherm op dezelfde plek uitkomt, en zou het momentje dan
   bij élke kaartopbouw opnieuw afspelen. */
let netAf = null;

/* Het afrondende werk van renderTourMap (schuifstand, --kop-h/--nav-h, de
   terugzoom) als losse functie, zodat goMap() het meteen kan uitvoeren zodra
   het scherm zelf aan staat -- zie de regel bij renderTourMap voor waarom dat
   ooit een requestAnimationFrame was en waarom dat een beeldje te laat is. null
   zolang renderTourMap het al zelf synchroon kon afronden (elke kaartwissel
   behalve de allereerste van een navigatie). */
let tourMapVoltooi = null;

/* ---- GRENDEL: er loopt iets, begin niet nog eens -------------------------- */

/* Eén overgang tegelijk. Een kind tikt drie keer op dezelfde halte; dat hoort
   één keer de zaal in te gaan. De vlag gaat altijd weer uit -- eindigOvergang
   hangt niet alleen aan animation.onfinish (die kan uitblijven als het scherm
   tussentijds weggaat) maar ook aan een vangnet-timer. */
let overgangBezig = false;

// de grendel op de terugweg (zie goMap) -- het tegenhangertje van overgangBezig
let terugBezig = false, terugTimer = null;

let vluchtOp = null;   // de vlucht die nu loopt -- er is er altijd hoogstens één

/* De grendel. Eén reis tegelijk, en hij gaat altijd weer open: de opruimer hangt
   niet alleen aan animation.onfinish (die kan uitblijven als het scherm tussentijds
   wisselt) maar ook aan een vangnet-timer, en élke andere weg naar showWorld roept
   hem ook aan. Blijft hij ooit toch hangen, dan staat er een kind op een kaart waar
   geen enkele wereldknop nog iets doet -- dus liever drie keer opruimen dan één
   keer niet. */
let wereldReisOp = null;

/* ---- DE BEGROETING -------------------------------------------------------- */

// Hoe vaak de kaart al is opengegaan (de eerste keer groet ze niet), plus de twee
// timers van het groetje en de haltepuls. Zie kaartGroet en kaartGroetStop.
let kaartBezocht = 0, groetTimer = null, pulsTimer = null;
