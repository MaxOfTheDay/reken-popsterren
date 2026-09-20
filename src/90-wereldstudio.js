/* ---- Wereldstudio (?debug&mapedit) ------------------------------------------
   Werelden maken en bijwerken óp de echte kaart, op ware grootte.

   Drie dingen die je in de code niet fatsoenlijk kunt doen:
     - haltes op de richels van een tekening zetten (percentages schatten lukt niet)
     - de weg dáár langs laten lopen: elk stuk heeft een eigen stuurpunt, dus je
       kunt om een rots heen buigen in plaats van eroverheen
     - zien wat er nog níét in het spel staat, en het er in één tik in zetten

   ---- Hoe het paneel in elkaar zit -----------------------------------------
   Links het echte spel, rechts een smal paneel dat bepaalt wat daar gebeurt. Er
   is met opzet géén tweede tekenvlak in het paneel: waar je iets visueel neerzet,
   zet je het op de kaart zelf.

     kijkvak      wat je hiernaast ziet: welk toestel, welke stand, en de knop die
                  er een écht venster van maakt. Staat bóven de tabbladen, want het
                  geldt voor alle drie.
     Werelden     het werk: welke wereld, tekening, gegevens, beloning, kleuren,
                  haltes & weg. Eén kolom, en van boven naar beneden is dat de
                  volgorde waarin je een wereld maakt.
     Beelden      de beelden die níét bij één wereld horen.
     Publiceren   wat er verandert, de controle, en de weg naar main.

   Er was een vijfde ding (het tabblad Voorbeeld). Dat is weg: de hele linkerhelft
   ís het voorbeeld, en een apart voorbeeld-tabblad ernaast was een tweede
   voorvertoningsbegrip dat alleen maar uit de pas kon lopen met het eerste. Wat
   erin stond en waarde had staat nu in het kijkvak.

   Alles wat je zelden nodig hebt (het id, het pad, het ruwe blok) staat onder
   Geavanceerd. Niet omdat het onbelangrijk is, maar omdat het bovenaan in de weg
   staat: bij het maken van wereld twaalf hoor je je niet af te vragen hoe de
   bestandsnamen in elkaar zitten. Zie wereldId/wereldArtPad.

   ---- Wat de studio tekent, tekent het spel --------------------------------
   De kaart hiernaast ís renderTourMap (de studio hangt zich eraan op en legt er
   alleen overlays bovenop), de standen zijn p.stars en p.level, de beloning wordt
   met item.thumb() en avatarSVG() getekend, de haltes zijn .tour-stop en de weg is
   roadD(). Er is dus geen studio-versie die van de echte versie kan afdrijven --
   en dat is de enige reden dat wat je hier ziet iets waard is.

   Een concept leeft in localStorage en wordt ALLEEN met ?debug ingelezen: het
   gewone spel draait altijd op WORLDS uit index.html, dus een half afgemaakte
   wereld kan nooit bij een kind terechtkomen.                                  */
function startMapEdit() {
  const map = $('tour-map');
  const F = id => document.getElementById(id);
  /* Hoeveel er onderaan werkelijk wordt afgedekt: de navigatiebalk plus alles wat
     eronder zit (de 10px marge, en op een toestel met een thuisbalk ook
     env(safe-area-inset-bottom) -- dat zit al in de positie van de balk verwerkt).
     Méten en niet narekenen, en wél vóór de studio de balk verbergt. */
  const navRect = $('main-nav').getBoundingClientRect();
  const ONDER_PX = navRect.height ? (innerHeight - navRect.top) + 8 : 100;
  document.body.classList.add('mapedit');

  /* De voorvertoningsserver zet rechtsonder zijn eigen paneeltje neer met links
     naar de schermen. Die links dragen ?debug&demo&star=p1&screen=... en dus géén
     &mapedit -- één tik erop en de studio was weg zonder weg terug. */
  document.querySelectorAll('#kandidaat nav a').forEach(a => {
    if (a.getAttribute('href').indexOf('mapedit') < 0) a.href = a.getAttribute('href') + '&mapedit';
  });

  const st = document.createElement('style');
  st.textContent = `
    /* De ster staat in de studio uit -- ze dekt precies de richel af waar je een halte
       op probeert te zetten. Met "ster overal" komt ze terug, op élke halte, doorzichtig:
       dan zie je in één blik of ze overal past en of er overal lucht boven is. */
    body.mapedit .mem-fab, body.mapedit .tour-hero { display: none !important; }
    body.mapedit.sterren .tour-hero { display: block !important; }
    /* Het kandidaat-vak van de voorvertoningsserver (incoming/ + schermlinks) doet
       in de studio niets meer: beelden gaan via het Beelden-tabblad en schermen via
       Voorbeeld. Buiten de studio blijft het gewoon staan. */
    body.mapedit #kandidaat { display: none !important; }
    /* In de studio krijgt de kaart telefoon-verhoudingen. Op een breed scherm zou
       hij anders in de kolom-noodstand vallen, en dan zet je haltes neer op een
       vorm die geen enkel kind ooit ziet. */
    body.mapedit #screen-map { padding-right: var(--studio-w, 0px); }
    /* Een toestelmaat in de studio: het vak krijgt de échte pixelmaat van dat
       toestel en wordt daarna alleen visueel verkleind. De container-queries in de
       kaart rekenen met de onverkleinde maat, dus wat je ziet klopt met het toestel
       -- ook als je monitor geen 844 pixels hoog is.

       De doos staat in het midden van de ruimte die het paneel overlaat (--doos-x),
       niet meer tegen de linkerrand geplakt. */
    body.mapedit #tour-map { left: var(--doos-x, 24px); right: auto;
      width: var(--doos-w, min(430px, 60vw)); height: var(--doos-h, 100%);
      transform: scale(var(--doos-s, 1)); transform-origin: top left;
      box-shadow: 0 0 0 1px rgba(255,255,255,.14), 0 10px 40px rgba(0,0,0,.45); }
    /* De kop hoort óp het toestel te liggen, niet erboven te zweven: in het spel
       ligt hij over de tekening heen. Dus dezelfde plek, dezelfde breedte en
       dezelfde schaal als de doos. */
    body.mapedit #screen-map .hub-sticky { position: absolute; z-index: 7;
      left: var(--doos-x, 24px); top: 0; width: var(--doos-w, 430px);
      transform: scale(var(--doos-s, 1)); transform-origin: top left;
      align-self: auto; margin: 0; }
    /* En de navigatiebalk ook: in het spel staat hij onderaan hét scherm, hier
       onderaan de doos. */
    body.mapedit .main-nav { display: flex !important;
      position: absolute; left: var(--doos-x, 24px); bottom: auto; z-index: 7;
      top: calc(var(--doos-h, 100%) * var(--doos-s, 1) - 77px * var(--doos-s, 1));
      width: calc(var(--doos-w, 430px) - 24px); margin-left: calc(12px * var(--doos-s, 1));
      transform: scale(var(--doos-s, 1)); transform-origin: top left; pointer-events: none; }
    body.mapedit.geen-kop #screen-map .hub-sticky,
    body.mapedit.geen-balk .main-nav { display: none !important; }
    /* De kolom-noodstand kijkt naar het vénster, niet naar dit vak -- op een breed
       bureaublad zou hij dus altijd aanslaan. Hier staat hij uit: het vak heeft al
       telefoon-verhoudingen, dus full-bleed is precies wat een kind straks ziet. */
    body.mapedit #tour-map { overflow: hidden; align-items: safe center; padding: 0; }
    body.mapedit .world-frame { min-width: 100%; min-height: 100%; width: auto; }
    body.mapedit.liggend #tour-map { overflow-y: auto; align-items: flex-start; padding: 96px 0;
      background: linear-gradient(180deg, var(--w-sky) 0%, var(--w-deep) 100%); }
    body.mapedit.liggend .world-frame { min-width: 0; min-height: 0; width: min(100cqw, 340px); }
    /* De kop ligt nu absoluut op de doos (zie de regel hierboven), dus hij hoeft niet
       meer uit het flexvak van .screen te worden losgewrikt. */
    @media (max-width: 820px) {
      body.mapedit #tour-map { left: 0; width: 100%; box-shadow: none; }
    }
    .me-spook { opacity: .4; filter: saturate(.5); }
    body.mapedit .tour-stop { cursor: grab; }
    body.mapedit .tour-stop.dragging { cursor: grabbing; z-index: 9; }
    /* Stuurpunt van één stuk weg: klein, ruitvormig, duidelijk iets ánders dan een
       halte. Ze liggen óp de weg, dus gevuld braken ze hem visueel af -- het leek
       alsof de weg de haltes niet netjes raakte. Dus hol.

       Maar hol groen op een lichte lucht is niet te zien, en op een donkere rots
       evenmin. Nu dragen ze hun eigen contrast mee: een donkere rand büiten de
       groene en een lichte bínnen. Die combinatie leest op elke ondergrond, want
       één van de drie steekt altijd af. */
    .me-ctrl { position: absolute; width: 5.4cqw; height: 5.4cqw; margin: -2.7cqw 0 0 -2.7cqw;
      z-index: 4; cursor: grab; border-radius: 2px; transform: rotate(45deg);
      background: rgba(10,40,26,.35); border: 0.5cqw solid rgba(120,255,180,.95);
      box-shadow: 0 0 0 0.35cqw rgba(8,2,20,.75), inset 0 0 0 0.3cqw rgba(255,255,255,.55);
      transition: background .1s, border-color .1s; }
    .me-ctrl:hover { background: rgba(120,255,180,.6); }
    .me-ctrl:active, .me-ctrl.dragging { cursor: grabbing; background: rgba(120,255,180,.9); }
    /* wat je nu bij de kop hebt: een ring die er niet omheen te kijken valt */
    .me-ctrl.gekozen { box-shadow: 0 0 0 0.35cqw rgba(8,2,20,.75),
      inset 0 0 0 0.3cqw rgba(255,255,255,.7), 0 0 0 0.9cqw rgba(255,214,90,.9); }
    .tour-stop.gekozen .dot { outline: 0.7cqw solid rgba(255,214,90,.95); outline-offset: 0.5cqw; }
    body.mapedit.nocurve .me-ctrl { display: none; }

    #studio { position: fixed; top: 0; right: 0; bottom: 0; width: 330px; z-index: 60;
      display: flex; flex-direction: column; overflow: hidden;
      background: #140a22; color: #f2ecfa; border-left: 1px solid rgba(255,255,255,.18);
      font: 400 13px/1.35 system-ui, sans-serif; }
    #studio.dicht { width: 44px; }
    #studio.dicht > *:not(.st-top) { display: none; }
    #studio .st-top { display: flex; align-items: center; gap: 8px; padding: 10px 12px;
      border-bottom: 1px solid rgba(255,255,255,.14); }
    #studio .st-top b { flex: 1; font-size: 13px; letter-spacing: .04em; text-transform: uppercase; }
    #studio.dicht .st-top b, #studio.dicht .st-top .st-chip { display: none; }
    /* Het kijkvak: wát je op de kaart hiernaast ziet -- op welk toestel, in welke
       stand, en met welke balken. Het hoort boven de tabbladen omdat het voor alle
       drie geldt: je bekijkt altijd hetzelfde spel, ook terwijl je beelden sleept
       of staat te publiceren. Hier stond eerder alleen de toestelkiezer; de stand
       zat verstopt in Haltes & weg en het venster in een eigen tabblad. */
    #studio .st-kijk { display: grid; gap: 5px; padding: 8px 12px 9px;
      border-bottom: 1px solid rgba(255,255,255,.14); }
    #studio .st-kijk .kr { display: flex; align-items: center; gap: 6px; }
    #studio .st-kijk label { color: #b79ae0; font-size: 12px; width: 46px; flex: none; }
    #studio .st-kijk select { flex: 1; min-width: 0; padding: 4px 6px; }
    #studio .st-kijk button { padding: 4px 8px; line-height: 1; }
    #studio .st-kijk em { font-style: normal; font-size: 11px; color: #9c86bd;
      font-family: ui-monospace, monospace; white-space: nowrap; }
    #studio .st-kijk .maat { padding-left: 46px; }
    #studio.dicht .st-kijk { display: none; }
    #studio .st-tabs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px;
      padding: 6px 8px 0; border-bottom: 1px solid rgba(255,255,255,.14); }
    #studio .st-tabs button { border: 0; background: none; border-radius: 7px 7px 0 0;
      padding: 7px 2px; font-size: 11.5px; color: #b79ae0; border-bottom: 2px solid transparent; }
    #studio .st-tabs button.on { color: #fff; background: rgba(255,255,255,.08);
      border-bottom-color: #7dffb4; font-weight: 600; }
    #studio .st-body { flex: 1; overflow: auto; padding: 4px 12px 12px; }
    /* beelden per scherm: één regel per plek waar een tekening kan staan */
    #studio .st-scherm { margin: 12px 0 0; }
    #studio .st-scherm > h6 { margin: 0 0 5px; }
    #studio .st-slot { display: grid; grid-template-columns: 1fr auto; gap: 2px 8px;
      align-items: center; padding: 7px 9px; margin-bottom: 4px; border-radius: 8px;
      background: rgba(255,255,255,.05); border: 1px solid transparent;
      transition: background .12s, border-color .12s; }
    #studio .st-slot.over { background: rgba(120,255,180,.14); border-color: rgba(120,255,180,.8); }
    #studio .st-slot.kan { opacity: .72; }
    #studio .st-slot b { font-size: 12.5px; }
    #studio .st-slot small { grid-column: 1 / -1; color: #9c86bd; font-size: 11px;
      font-family: ui-monospace, monospace; overflow-wrap: anywhere; }
    #studio .st-slot .st-dot { width: 8px; height: 8px; border-radius: 50%; }
    #studio .st-slot .st-dot.er { background: #7dffb4; }
    #studio .st-slot .st-dot.weg { background: rgba(255,255,255,.22); }
    /* De tekening van de wereld: het grootste vlak van het hele paneel, want het
       is het eerste wat een wereld nodig heeft. Sleep erop of tik erop. */
    #studio .st-art { display: grid; grid-template-columns: 54px 1fr; gap: 10px;
      align-items: center; padding: 10px; border-radius: 10px; cursor: pointer;
      border: 1.5px dashed rgba(255,255,255,.28); background: rgba(255,255,255,.05);
      transition: background .12s, border-color .12s; }
    #studio .st-art:hover { background: rgba(255,255,255,.09); }
    #studio .st-art.over { background: rgba(120,255,180,.14); border-color: rgba(120,255,180,.85); }
    #studio .st-art.er { border-style: solid; border-color: rgba(120,255,180,.45); }
    #studio .st-art .vb { width: 54px; aspect-ratio: 9 / 16; border-radius: 6px;
      background: rgba(0,0,0,.35) 50% 50% / cover no-repeat;
      border: 1px solid rgba(255,255,255,.18); display: grid; place-items: center;
      font-size: 17px; color: #7a63a0; }
    #studio .st-art b { display: block; font-size: 12.5px; }
    #studio .st-art small { display: block; color: #9c86bd; font-size: 11px; margin-top: 2px;
      font-family: ui-monospace, monospace; overflow-wrap: anywhere; }
    #studio .st-art button { padding: 2px 8px; font-size: 11px; border-radius: 6px; margin-left: 4px; }
    /* Er ligt een nieuwe tekening klaar in incoming/. Huidig en nieuw naast
       elkaar, want dat is de vraag: is deze beter dan wat er staat? Eén duidelijke
       beslissing -- gebruiken of weggooien -- en geen goedkeuringsmolen. */
    #studio .st-nieuw { margin-top: 6px; padding: 8px; border-radius: 10px;
      background: rgba(120,255,180,.09); border: 1px solid rgba(120,255,180,.4); }
    #studio .st-nieuw .paar { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    #studio .st-nieuw figure { margin: 0; }
    #studio .st-nieuw figcaption { font-size: 10.5px; letter-spacing: .08em;
      text-transform: uppercase; color: #b79ae0; margin-bottom: 3px; }
    #studio .st-nieuw .vb { width: 100%; aspect-ratio: 9 / 16; border-radius: 6px;
      background: rgba(0,0,0,.35) 50% 50% / cover no-repeat;
      border: 1px solid rgba(255,255,255,.18); display: grid; place-items: center;
      font-size: 15px; color: #7a63a0; }
    #studio .st-nieuw .st-btns { margin-top: 7px; }
    #studio .st-nieuw small { display: block; margin-top: 5px; color: #9c86bd;
      font-size: 11px; font-family: ui-monospace, monospace; overflow-wrap: anywhere; }
    /* De beloning van deze wereld: het spulletje dat een kind krijgt als hij uit
       is. Hij wordt getekend met dezelfde thumb() als in de kleedkamer -- geen
       tweede tekening voor de studio. */
    #studio .st-bel { display: grid; grid-template-columns: 46px 1fr auto; gap: 9px;
      align-items: center; padding: 8px 9px; border-radius: 9px;
      background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.14); }
    #studio .st-bel.leeg { border-style: dashed; }
    #studio .st-bel.stuk { border-color: rgba(255,120,120,.6); background: rgba(170,40,30,.22); }
    #studio .st-bel .vb { width: 46px; height: 46px; border-radius: 8px;
      background: rgba(0,0,0,.28); display: grid; place-items: center; padding: 3px; }
    #studio .st-bel .vb svg { width: 100%; height: 100%; }
    #studio .st-bel b { display: block; font-size: 12.5px; }
    #studio .st-bel small { display: block; color: #9c86bd; font-size: 11px; margin-top: 2px; }
    #studio .st-bel button { padding: 3px 9px; font-size: 11px; }
    /* Het merk: één vak om naar te kíjken. Zie tekenMerk() voor waarom hier niets
       te slepen valt. Contain en niet cover: een logo mag nooit bijgesneden
       worden, ook niet in een duimnageltje van 52 pixels. */
    #studio .st-merk { display: grid; grid-template-columns: 52px 1fr; gap: 9px;
      align-items: center; margin-top: 6px; padding: 8px 9px; border-radius: 9px;
      background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.14); }
    #studio .st-merk .vb { width: 52px; height: 52px; border-radius: 8px;
      background: rgba(0,0,0,.3) 50% 50% / contain no-repeat;
      border: 1px solid rgba(255,255,255,.18); }
    #studio .st-merk b { display: block; font-size: 12.5px; }
    #studio .st-merk small { display: block; color: #9c86bd; font-size: 11px; margin-top: 2px;
      font-family: ui-monospace, monospace; overflow-wrap: anywhere; }
    #studio #st-pop { position: fixed; z-index: 62; right: 346px; top: 14%;
      padding: 12px 14px 10px; border-radius: 12px; background: #1c0f30;
      border: 1px solid rgba(255,255,255,.28); box-shadow: 0 14px 44px rgba(0,0,0,.55);
      text-align: center; }
    #studio #st-pop b { display: block; margin-top: 4px; font-size: 12.5px; }
    #studio #st-pop small { display: block; color: #9c86bd; font-size: 11px; }
    /* Wat de studio zélf uitrekent en jij dus niet hoeft in te tikken. Grijs en
       klein: het is een bevestiging, geen invoerveld. */
    #studio .st-afgeleid { margin: 2px 0 0; color: #9c86bd; font-size: 11px;
      font-family: ui-monospace, monospace; overflow-wrap: anywhere; }
    /* Geavanceerd: de dingen die je bijna nooit nodig hebt, en die de gewone
       werkwijze in de weg staan zodra ze bovenaan meedoen. Dicht, tenzij je ze
       zoekt. */
    #studio details.st-geav { margin: 16px 0 4px; border-top: 1px solid rgba(255,255,255,.14);
      padding-top: 8px; }
    #studio details.st-geav > summary { cursor: pointer; font-size: 10.5px;
      letter-spacing: .12em; text-transform: uppercase; color: #b79ae0; padding: 3px 0; }
    #studio details.st-geav[open] > summary { margin-bottom: 8px; }
    /* Een tweede-rangs knop: bestaat, maar trekt geen aandacht. Terugdraaien en
       weggooien horen hier -- maken en kiezen niet. */
    #studio button.stil { background: none; border-color: rgba(255,255,255,.16);
      color: #b79ae0; }
    #studio button.stil:hover { background: rgba(255,255,255,.1); color: #fff; }
    #studio .st-let { margin: 8px 0 0; padding: 7px 9px; border-radius: 8px;
      font-size: 11.5px; color: #ffd98a; background: rgba(255,196,61,.14);
      border: 1px solid rgba(255,196,61,.4); }
    #studio h6 { margin: 14px 0 6px; font-size: 10.5px; letter-spacing: .12em;
      text-transform: uppercase; color: #b79ae0; }
    #studio .st-chip { font-size: 10.5px; padding: 2px 7px; border-radius: 99px;
      background: rgba(255,255,255,.12); white-space: nowrap; }
    #studio .st-chip.vuil { background: rgba(255,196,61,.22); color: #ffd98a; }
    #studio .st-chip.schoon { background: rgba(120,255,180,.18); color: #b6ffd6; }
    #studio { color-scheme: dark; }
    #studio button, #studio input, #studio select {
      font: inherit; color: #fff; background: rgba(255,255,255,.1);
      border: 1px solid rgba(255,255,255,.22); border-radius: 7px; padding: 6px 9px; }
    #studio select { background: #23133a; }
    #studio option { background: #23133a; color: #f2ecfa; }
    #studio button { cursor: pointer; }
    #studio button:hover { background: rgba(255,255,255,.18); }
    #studio button.prim { background: rgba(120,255,180,.2); border-color: rgba(120,255,180,.55); font-weight: 600; }
    #studio button.on { background: rgba(120,255,180,.24); border-color: rgba(120,255,180,.6); }
    #studio .st-row { display: grid; grid-template-columns: 74px 1fr; gap: 6px; align-items: center; margin-bottom: 6px; }
    #studio .st-row label { color: #b79ae0; font-size: 12px; }
    #studio .st-row input { width: 100%; min-width: 0; }
    #studio .st-kleur { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
    #studio .st-kleur div { text-align: center; font-size: 10.5px; color: #b79ae0; }
    #studio .st-kleur input { width: 100%; height: 28px; padding: 2px; }
    #studio .st-btns { display: flex; flex-wrap: wrap; gap: 6px; }
    #studio .st-list { display: flex; flex-direction: column; gap: 3px; }
    #studio .st-w { display: flex; align-items: center; gap: 7px; padding: 6px 8px; cursor: pointer;
      border-radius: 7px; border: 1px solid transparent; background: rgba(255,255,255,.05); text-align: left; }
    #studio .st-w.sel { border-color: rgba(120,255,180,.6); background: rgba(120,255,180,.12); }
    #studio .st-w .st-nm { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    #studio .st-w .st-dot { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,.2); }
    #studio .st-w .st-dot.vuil { background: #ffc43d; }
    #studio .st-w .st-dot.nieuw { background: #7dffb4; }
    /* De uitleg stond overal in de weg zodra je de studio één keer gebruikt hebt.
       Nu staat hij achter de ?-knop bovenin: één tik en alles komt terug. */
    #studio .st-hint { display: none; color: #9c86bd; font-size: 11.5px; margin: 6px 0 0; }
    #studio .st-waarschuwing { margin: 10px 0 0; padding: 7px 9px; border-radius: 8px;
      font-size: 11.5px; font-weight: 600; color: #ffd0c4;
      background: rgba(170,40,30,.3); border: 1px solid rgba(255,120,120,.45); }
    #studio .st-xy { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
    #studio .st-xy b { font-size: 12px; color: #b6ffd6; min-width: 62px; }
    #studio .st-xy label { display: flex; align-items: center; gap: 4px;
      font-size: 12px; color: #b79ae0; }
    #studio .st-xy input { width: 62px; }
    #studio .st-check { margin: 8px 0 0; padding: 8px 10px; border-radius: 8px;
      font-size: 11.5px; line-height: 1.5; color: #e6dbf5;
      background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.14); }
    #studio .st-check.schoon { color: #b6ffd6; background: rgba(40,120,70,.2);
      border-color: rgba(120,255,180,.4); }
    #studio .ct-fout { color: #ffb4b4; font-weight: 700; }
    #studio .ct-let { color: #ffd98a; font-weight: 700; }
    #studio .ct-goed { color: #b6ffd6; font-weight: 700; }
    #studio.uitleg .st-hint { display: block; }
    #studio .st-top button.on { background: rgba(120,255,180,.24); border-color: rgba(120,255,180,.6); }
    /* De uitvoer staat buiten de tabbladen: wat er misging moet je kunnen lezen
       terwijl je al ergens anders kijkt. */
    #studio .st-uit { flex: none; padding: 7px 12px 9px; font: 11.5px/1.5 ui-monospace, monospace;
      color: #b6ffd6; white-space: pre-wrap; max-height: 30vh; overflow: auto;
      border-top: 1px solid rgba(255,255,255,.14); }
    #studio .st-uit:empty { display: none; }
    #studio .st-hint code { background: rgba(255,255,255,.1); border-radius: 4px; padding: 0 4px; }
    #me-dump { position: fixed; inset: 8% 360px auto 6%; z-index: 61; display: none;
      max-height: 70vh; padding: 12px; border-radius: 10px; background: #140426; color: #d8ffe8;
      border: 1px solid rgba(255,255,255,.3); font: 12px/1.45 ui-monospace, monospace;
      white-space: pre; overflow: auto; }
    .me-grid { position: absolute; inset: 0; z-index: 2; pointer-events: none;
      background-image:
        repeating-linear-gradient(90deg, rgba(255,255,255,.2) 0 1px, transparent 1px 10%),
        repeating-linear-gradient(180deg, rgba(255,255,255,.2) 0 1px, transparent 1px 10%); }
    /* De veilige zone voor haltemiddelpunten. De maten staan in ZONE in de JS; wat
       ze betekenen staat daar ook. Zie docs/WORLD-ART-BRIEF.md §2. */
    /* Zelfde probleem als bij de stuurpunten: een dunne groene stippellijn verdwijnt
       op een lichte lucht. Een donkere lijn er strak omheen maakt hem overal zichtbaar.
       De maten komen uit ZONE in de JS, zodat de lijn en de controle nooit uiteen
       kunnen lopen -- die lijn en dat lijstje moeten hetzelfde zeggen. */
    .me-safe { position: absolute; z-index: 2;
      pointer-events: none; border: 1.5px dashed rgba(120,255,180,.95); border-radius: 8px;
      box-shadow: 0 0 0 1px rgba(8,2,20,.6), inset 0 0 0 1px rgba(8,2,20,.6); }
    /* De strook die de navigatiebalk straks afdekt, opgemeten aan de échte balk plus
       env(safe-area-inset-bottom) van het toestel. Niet hetzelfde als de onderrand
       van de veilige zone: die is een vaste 16%, dit is wat er op dít toestel
       werkelijk onder zit. Op een lage telefoon is dat meer. */
    /* Waar de langste telefoon (21:9) de zijkanten afsnijdt. Zonder deze lijnen leest
       de veilige zone als een kooi -- alsof alles erbuiten verloren is. Dat is niet zo:
       tussen deze lijn en de groene doos is de tekening op elk toestel gewoon te zien,
       er mag alleen geen halte staan. Verder naar buiten valt weg op een lange
       telefoon, en dáár hoort dus niets te staan wat gelézen moet worden. */
    .me-snee { position: absolute; top: 0; bottom: 0; z-index: 2; pointer-events: none;
      border-left: 1px dashed rgba(255,255,255,.35); border-right: 1px dashed rgba(255,255,255,.35); }
    .me-snee span { position: absolute; top: 12%; left: 4px; font: 600 9px/1.4 system-ui, sans-serif;
      color: rgba(255,255,255,.55); background: rgba(12,2,26,.45); padding: 2px 4px; border-radius: 3px; }
    /* De bovenste strook van de veilige zone (ZONE.y0 tot y0kop): een halte mag daar
       staan, maar de bovenbalk dimt dan zolang de ster er staat. Een streep en geen
       verbod -- en dus zacht goud in plaats van groen of rood. */
    /* Loopt exact zo breed als de groene doos: het is de bovenste strook dáárvan, en
       niet een aparte band over de hele tekening. */
    .me-kopband { position: absolute; z-index: 2; pointer-events: none;
      border-bottom: 1.5px dashed rgba(255,205,110,.8);
      background: repeating-linear-gradient(135deg,
        rgba(255,205,110,.10) 0 9px, rgba(255,205,110,.03) 9px 18px); }
    /* het label bovenin de strook: onderaan dekte het de bovenste halte af, die
       per definitie op de onderrand van deze strook uitkomt */
    .me-kopband span { position: absolute; left: 50%; transform: translateX(-50%);
      top: 3px; padding: 1px 5px; border-radius: 4px;
      font: 700 10px/1.3 system-ui, sans-serif; color: #2a1a00; background: rgba(255,205,110,.85); }
    .me-onder { position: absolute; left: 0; right: 0; bottom: 0; z-index: 2;
      pointer-events: none; background: repeating-linear-gradient(135deg,
        rgba(255,86,86,.16) 0 10px, rgba(255,86,86,.05) 10px 20px);
      border-top: 2px dashed rgba(255,120,120,.9); }
    /* het label bóven de lijn: in de strook zelf viel het achter de navigatiebalk */
    /* gecentreerd: het kader is breder dan het zichtbare vak (cover snijdt de zijkanten
       weg), dus tegen de linkerrand viel het label er half buiten */
    .me-onder span { position: absolute; left: 50%; transform: translateX(-50%);
      top: -15px; padding: 1px 5px; border-radius: 4px;
      font: 700 10px/1.3 system-ui, sans-serif; color: #ffd6d6; background: rgba(90,12,12,.85); }
    .tour-stop.te-laag .dot { outline: 2px solid #ff6b6b; outline-offset: 2px; }
    .tour-stop.botst .cstars { outline: 1.5px dashed rgba(255,190,90,.9); outline-offset: 1px; border-radius: 4px; }
    @media (max-width: 820px) {
      #studio { top: auto; left: 0; width: auto; max-height: 56vh; border-left: 0;
        border-top: 1px solid rgba(255,255,255,.18); }
      #studio.dicht { width: auto; max-height: 44px; }
      body.mapedit #screen-map { padding-right: 0; }
      #me-dump { inset: 6% 6% auto; }
    }`;
  document.head.appendChild(st);

  const panel = document.createElement('div');
  panel.id = 'studio';
  panel.innerHTML = `
    <div class="st-top">
      <b>Wereldstudio</b>
      <span class="st-chip" id="st-status">—</span>
      <button id="st-uitleg" title="Uitleg aan/uit">?</button>
      <button id="st-fold" title="In-/uitklappen">⇥</button>
    </div>
    <div class="st-kijk">
      <div class="kr">
        <label for="st-toestel">toestel</label>
        <select id="st-toestel"></select>
        <button id="st-kop" class="on" title="Bovenbalk aan/uit">▀</button>
        <button id="st-balk" class="on" title="Navigatiebalk aan/uit">▄</button>
      </div>
      <div class="kr">
        <label for="st-stand">stand</label>
        <select id="st-stand">
          <option value="halverwege" selected>halverwege — 3 gedaan, 1 nu</option>
          <option value="slot">op slot — nog niet hier geweest</option>
          <option value="vers">net begonnen — halte 1 is aan de beurt</option>
          <option value="uit">uit — elke show gespeeld</option>
          <option value="perfect">perfect — overal drie sterren</option>
        </select>
      </div>
      <div class="kr">
        <label for="st-vscherm">venster</label>
        <select id="st-vscherm">
          <option value="map">Kaart</option>
          <option value="game">Show</option>
          <option value="end">Einde</option>
          <option value="profile">Wie speelt er</option>
        </select>
        <button id="st-venster" title="Open dit scherm in een écht venster op de gekozen toestelmaat — met Shift: alle maten naast elkaar">⧉</button>
      </div>
      <em class="maat" id="st-toestelmaat"></em>
      <em class="maat" id="st-lan"></em>
    </div>
    <div class="st-tabs">
      <button class="on" data-tab="werelden">Werelden</button>
      <button data-tab="beelden">Beelden</button>
      <button data-tab="spel">Publiceren</button>
    </div>
    <div class="st-body">

      <section data-tab="werelden">
        <h6>Welke wereld</h6>
        <div class="st-list" id="st-list"></div>
        <div class="st-btns" style="margin-top:6px">
          <button class="prim" id="st-new">＋ wereld</button>
          <button class="stil" id="st-revert" title="Deze wereld terug naar wat er in het spel staat">↶ deze terug</button>
        </div>
        <p class="st-hint">Een wereld maken is: naam geven, tekening erop, kleuren
          accepteren, haltes zetten, beloning kiezen, standen doorlopen. Het id en het
          bestandspad rolt de studio er zelf uit — die staan onder <b>Geavanceerd</b>
          voor de zeldzame keer dat je ze met de hand wilt zetten.</p>

        <h6>Tekening</h6>
        <div class="st-art" id="st-art">
          <span class="vb" id="st-art-vb">＋</span>
          <span><b id="st-art-st">nog geen tekening</b><small id="st-art-info"></small></span>
        </div>
        <p class="st-let" id="st-art-let" hidden></p>
        <div class="st-nieuw" id="st-art-nieuw" hidden></div>
        <p class="st-hint">Sleep een beeld hierheen of tik erop. Elke bronmaat mag: hij wordt
          bijgesneden als cover, omgezet naar webp en op de goede plek gezet. Een nieuwe
          erop slepen <b>overschrijft</b> de vorige — er is één tekening per wereld.<br>
          Leg je er een in <code>incoming/</code>, dan komt hij hierboven als <b>nieuw</b>
          naast de huidige te staan en kies je zelf of hij het wordt.</p>

        <h6>Gegevens</h6>
        <div class="st-row"><label>icoon</label><input id="mf-icon" maxlength="4"></div>
        <div class="st-row"><label>naam</label><input id="mf-name"></div>
        <p class="st-afgeleid" id="mf-afgeleid"></p>

        <h6>Beloning</h6>
        <div class="st-bel" id="st-bel">
          <span class="vb" id="st-bel-vb"></span>
          <span><b id="st-bel-naam">—</b><small id="st-bel-uit"></small></span>
          <button id="st-bel-kijk">bekijk</button>
        </div>
        <select id="mf-beloning" style="width:100%;margin-top:6px"></select>
        <p class="st-hint">Wat een kind krijgt zodra deze wereld uit is. Eén spulletje per
          wereld, en het staat níét in de winkel — het is te verdienen. <b>Bekijk</b> zet
          hem even op de paspop.</p>

        <h6>Kleuren</h6>
        <div class="st-kleur">
          <div>weg<input id="mf-road" type="color" title="de gestippelde weg tussen de haltes"></div>
          <div>lucht<input id="mf-sky" type="color" title="alleen zonder tekening, en de rand in liggende stand"></div>
          <div>diepte<input id="mf-deep" type="color" title="alleen zonder tekening, en de rand in liggende stand"></div>
          <div>gloed<input id="mf-glow" type="color" title="alleen zonder tekening"></div>
        </div>
        <div class="st-btns" style="margin-top:6px">
          <button id="st-kleur-art">🎨 haal uit de tekening</button>
          <button class="stil" id="st-kleur-terug">↺ standaard</button>
        </div>
        <p class="st-hint"><b>weg</b> zie je altijd — die ligt over de tekening heen.
          <b>lucht</b>, <b>diepte</b> en <b>gloed</b> dragen een wereld die nog géén
          tekening heeft; lucht en diepte kleuren daarnaast de rand naast de kaart
          in liggende stand.<br>
          <b>Haal uit de tekening</b> doet een vóórstel: hij meet de lucht bovenin, de
          diepte onderin, de warmste veeg en een weg die tegen de corridor afsteekt. Je
          ziet het meteen en je mag er altijd overheen.</p>

        <h6>Haltes &amp; weg</h6>
        <p class="st-waarschuwing" id="st-onder" hidden></p>
        <div class="st-btns">
          <button id="st-zone" class="on">⬚ veilige zone</button>
          <button id="st-grid">▦ raster</button>
          <button id="st-curve" class="on">∿ stuurpunten</button>
          <button id="st-sterren">👧 ster overal</button>
        </div>
        <div class="st-btns" style="margin-top:6px">
          <button class="stil" id="st-undo" title="Ctrl+Z">↶ terug</button>
          <button class="stil" id="st-renodes">↺ haltes</button>
          <button class="stil" id="st-recurve">↺ weg</button>
        </div>
        <div class="st-xy" id="st-xy" hidden>
          <b id="st-wat"></b>
          <label>x<input id="st-x" type="number" step="0.1" min="0" max="100"></label>
          <label>y<input id="st-y" type="number" step="0.1" min="0" max="100"></label>
        </div>
        <p class="st-hint">Sleep <b>ronde haltes</b> naar de richels en de <b>groene ruitjes</b>
          om de weg langs de tekening te leiden. Eén ruitje per stuk weg. Tik er een aan en
          verschuif 'm met de pijltjes (Shift = vijf keer zo grof), of tik de getallen in.
          Ctrl+Z neemt terug.</p>
        <p class="st-hint">De <b>stand</b> bovenin zet de kaart in de standen die een kind
          ziet. De grijze haltes en de grijze sterretjes zijn het zwakst op een getekende
          kaart, en <b>perfect</b> hoort juist trots te voelen — kijk ze alle vijf na
          vóórdat je de volgende wereld laat tekenen.</p>
        <div class="st-btns" style="margin-top:6px">
          <button id="st-contrast-knop">🔍 meet het contrast</button>
        </div>
        <div class="st-check" id="st-contrast" hidden></div>
        <p class="st-hint">Meet de helderheid van de tekening precies waar de haltes en de
          weg komen, en zet dat af tegen de kleuren die eroverheen gaan. Een halte redt zich
          met haar vulling óf met haar lichte ring — één van de twee werkt bijna altijd, dus de
          béste van de slechtste telt. De weg is het gevoeligst — die is dun, doorzichtig en jij
          kiest zijn kleur.</p>

        <details class="st-geav">
          <summary>Geavanceerd</summary>
          <div class="st-row"><label>id</label><input id="mf-id" placeholder="ijs"></div>
          <div class="st-row"><label>bestand</label><input id="mf-art" placeholder="assets/world/ijs-map.webp"></div>
          <p class="st-hint">Het id is de identiteit van een wereld: het pad van de tekening,
            de wereldbadge en de perfecte-wereldtrofee hangen eraan. Hernoemen mag, maar een
            al behaalde badge heet daarna anders. De <b>naam</b> veranderen is vrij — dat is
            bijna altijd wat je bedoelt.</p>
          <p class="st-hint">levels: <b id="mf-levels"></b> — vast. Dit wijzigen hernummert elk level erna,
            en dan verhuizen de sterren van een kind naar een andere wereld.</p>
          <div class="st-btns">
            <button id="st-copy">Kopieer blok</button>
            <button id="st-paste">Plak blok</button>
          </div>
          <p class="st-hint">Het hele WORLDS-blok als tekst — handig om het hierheen te
            plakken vanuit een gesprek met Claude, of andersom.</p>
        </details>
      </section>

      <section data-tab="beelden" hidden>
        <p class="st-hint" style="margin-top:10px">De beelden die <b>niet</b> bij één wereld horen.
          De wereldkaart staat bij <b>Werelden</b>, want die hoort bij de wereld die je aan het
          maken bent. Show en Einde worden later ook per wereld; dan verhuizen ze mee.</p>
        <div class="st-row" style="margin-top:8px"><label>kwaliteit</label><select id="st-kwal">
          <option value="0.9">0.90 — ruim</option>
          <option value="0.82" selected>0.82 — normaal</option>
          <option value="0.72">0.72 — zuinig</option>
        </select></div>
        <div id="st-schermen"></div>
        <div id="st-ongebruikt"></div>
        <div id="st-merk"></div>
        <input type="file" accept="image/*" hidden id="me-file">
      </section>

      <section data-tab="spel" hidden>
        <h6>Wat verandert er</h6>
        <div class="st-check" id="st-diff"></div>

        <h6>Controle</h6>
        <div class="st-btns"><button id="st-check-knop">✓ kijk alle werelden na</button></div>
        <p class="st-hint">Ontbrekende tekeningen en beloningen, haltes buiten de zone, dubbele
          id's en lijsten van de verkeerde lengte — in <b>alle</b> werelden, niet alleen die op
          je scherm. Blokkeert niets; loopt ook vanzelf bij "Zet in het spel".</p>
        <div class="st-check" id="st-check" hidden></div>

        <h6>Werelden vastleggen</h6>
        <div class="st-btns">
          <button class="prim" id="st-push">⇪ Zet in het spel</button>
          <button class="stil" id="st-pull" title="Concept weggooien en terug naar index.html">⟲ Ophalen</button>
        </div>
        <p class="st-hint">Schrijft je concept in index.html. Beelden staan er al zodra je ze
          hebt neergezet.</p>

        <h6>Vastleggen &amp; publiceren</h6>
        <div class="st-row"><label>bericht</label>
          <input id="st-msg" placeholder="feat: IJswereld krijgt zijn kaart"></div>
        <div class="st-btns">
          <button id="st-commit">✓ testen, vastleggen &amp; pushen</button>
          <button id="st-publish">🚀 publiceer naar main</button>
        </div>
        <p class="st-hint">Vastleggen gaat naar de wérkbranch. Publiceren voegt die samen
          met main en dát is wat op de telefoon komt — in twee stappen, en alleen als
          <code>npm test</code> slaagt.</p>
      </section>

    </div>
    <div class="st-uit" id="st-out"></div>`;
  document.body.appendChild(panel);
  const dump = document.createElement('pre');
  dump.id = 'me-dump';
  dump.onclick = () => { dump.style.display = 'none'; };
  document.body.appendChild(dump);
  document.documentElement.style.setProperty('--studio-w', '330px');

  /* De toestelmaten. Eén lijst voor twee dingen: het vak hiernaast (meteen, terwijl
     je tekent) en de voorbeeldvensters (een echte browser, om het te geloven).

     Zes maten, en geen zeven. Elke maat staat hier omdat hij een ándere rand van
     de opmaak bepaalt -- niet omdat het toestel bestaat:
       320x568   de kleinste: hier hapt de vaste kop het meest uit het scherm
       390x844   de gewone telefoon, en de maat waarop alles ontworpen is
       412x920   lang en smal: hier snijdt cover het meest van de zijkanten weg
       768x1024  tablet: hier komt de volle breedte van de tekening in beeld
       844x390 / 1024x768   liggend, en dus de kolom-noodstand

     Een catalogus van dertig toestellen zou hier niets aan toevoegen: wat ertussen
     ligt valt vanzelf tussen twee van deze zes. */
  const MATEN = [
    { id: '390x844',  naam: 'telefoon' },
    { id: '412x920',  naam: 'lange telefoon' },
    { id: '320x568',  naam: 'kleine telefoon' },
    { id: '768x1024', naam: 'tablet' },
    { id: '844x390',  naam: 'telefoon liggend' },
    { id: '1024x768', naam: 'tablet liggend' },
  ];
  const maatVan = id => ({ w: Number(id.split('x')[0]), h: Number(id.split('x')[1]) });

  /* Het kaartvak op de maat van een toestel. Niet met een media-query maar met een
     echte pixelmaat plus een schaal: de kaart rekent met container-queries, dus een
     vak van 390x844 geeft exact de opmaak van dat toestel, ook als het verkleind op
     je monitor staat. Alleen de kolomstand hangt van oorsprong aan de verhouding van
     het vénster; daarvoor zet de studio zelf de klasse .liggend. */
  const R = document.documentElement;
  function zetToestel(id) {
    const st = R.style;
    if (!id) {
      ['--doos-w', '--doos-h', '--doos-s', '--kop-w', '--doos-x'].forEach(k => st.removeProperty(k));
      document.body.classList.remove('liggend');
      F('st-toestelmaat').textContent = 'vult de hoogte';
      renderTourMap(0);
      return;
    }
    const { w, h } = maatVan(id);
    const paneel = panel.classList.contains('dicht') ? 44 : 330;
    const vrijH = innerHeight - 40;
    const vrijW = innerWidth - 48 - paneel;
    const sch = Math.min(1, vrijH / h, vrijW / w);
    st.setProperty('--doos-w', w + 'px');
    st.setProperty('--doos-h', h + 'px');
    st.setProperty('--doos-s', String(sch));
    st.setProperty('--kop-w', Math.round(w * sch) + 'px');
    // in het midden van de ruimte die het paneel overlaat
    st.setProperty('--doos-x', Math.max(12, Math.round((innerWidth - paneel - w * sch) / 2)) + 'px');
    document.body.classList.toggle('liggend', w >= h);
    F('st-toestelmaat').textContent = sch < .999
      ? w + '×' + h + ' · ' + Math.round(sch * 100) + '%' : w + '×' + h;
    renderTourMap(0);
  }
  /* Kop en balk aan/uit: allebei dekken ze een stuk van de tekening af, dus je wil
     kunnen wisselen tussen "wat een kind ziet" en "wat ik teken". */
  F('st-kop').onclick = e => {
    document.body.classList.toggle('geen-kop');
    e.target.classList.toggle('on', !document.body.classList.contains('geen-kop'));
  };
  F('st-balk').onclick = e => {
    document.body.classList.toggle('geen-balk');
    e.target.classList.toggle('on', !document.body.classList.contains('geen-balk'));
  };

  /* Het adres voor een telefoon op hetzelfde wifi. Alles wat hiernaast gemeten
     wordt is een browser op een bureaublad; de echte toets is het scherm waar het
     om gaat -- met de echte thuisbalk en het echte contrast in een zonnige kamer.
     De server geeft het adres door; zonder server is er niets te tonen en zegt de
     regel niets. */
  F('st-lan').textContent = window.__LAN ? 'telefoon: ' + window.__LAN + '/ts' : '';

  const toestelKiezer = F('st-toestel');
  toestelKiezer.appendChild(new Option('vrij — vult de hoogte', ''));
  MATEN.forEach(m => toestelKiezer.appendChild(new Option(m.naam + '  ' + m.id.replace('x', '×'), m.id)));
  toestelKiezer.value = '390x844';
  toestelKiezer.onchange = () => zetToestel(toestelKiezer.value);
  addEventListener('resize', () => zetToestel(toestelKiezer.value));

  /* Drie tabbladen: maken, beelden, vastleggen. Er was er een vierde (Voorbeeld),
     maar de hele linkerhelft ís al een voorbeeld -- dat tabblad was een tweede
     voorvertoningsbegrip naast het echte. Wat er bruikbaars in stond staat nu in
     het kijkvak hierboven: welke stand, welk scherm, en de knop die er een écht
     venster van opent. */
  panel.querySelectorAll('.st-tabs button').forEach(b => {
    b.onclick = () => {
      panel.querySelectorAll('.st-tabs button').forEach(o => o.classList.toggle('on', o === b));
      panel.querySelectorAll('.st-body > section').forEach(sec => {
        sec.hidden = sec.dataset.tab !== b.dataset.tab;
      });
    };
  });

  const shown = () => worldForIndex(viewWorldIdx);
  /* ---- Twee soorten werk, twee soorten context ------------------------------
     Het meeste in dit paneel gaat over één wereld, en dat werk heeft een ster
     nodig: de kaart tekent de voortgang van wie er speelt. Maar niet alles gaat
     over een wereld. Het startscherm, het spelogo, het merkteken en het app-icoon
     horen bij de héle app, en die kijk je juist na op het landingsscherm -- en
     daar is met opzet niemand aan het spelen: goProfiles() laat `cur` los.

     Dat liep stuk. commit() tekende altijd de kaart opnieuw, de kaart vraagt
     renderMapTitle(P()), en P() is dan undefined -- "Cannot read properties of
     undefined (reading 'level')", precies terwijl je de startschermtekening aan
     het vervangen was. Erger nog: het bestand wás al weggeschreven, en de melding
     zei dat het alleen via npm run preview kon.

     De twee regels die dat voorgoed rechtzetten:
       - wie een wereld nodig heeft, vraagt erom (wereldNu / sterNu) en krijgt
         null terug als die er niet is; hij verzint er geen;
       - een globaal beeld vraagt er niet om, want het hoort bij geen wereld. */
  const STUDIO_STER = cur;      // de ster waarmee de studio geopend is
  /* De ster terug als het landingsscherm hem losliet. Dat is geen truc: het
     paneel staat open, de kaart eronder hoort bij déze ster, en zonder hem kan
     geen enkele wereldweergave kloppen. Zo blijft er nooit een halve stand
     achter als je tussen "de hele app" en "één wereld" heen en weer loopt. */
  function sterNu() {
    if (!P() && STUDIO_STER && db.profiles[STUDIO_STER]) cur = STUDIO_STER;
    return P() || null;
  }
  function wereldNu() { return shown(); }
  /* Wat er nu geselecteerd is: een halte of een stuurpunt. Slepen doet dit vanzelf,
     en met de pijltjes verschuif je daarna per 0,2% -- op een verkleind vak is één
     schermpixel geen tekenpixel meer, en een richel raak je niet met de muis alleen. */
  let sel = null;
  const setOut = t => { F('st-out').textContent = t || ''; };
  /* Een storing die een mens kan lezen, en de volle waarheid in de console.
     Wat er misging, wat er met je werk gebeurd is, en waar de details staan --
     nooit een kale JavaScript-regel onderin het paneel. */
  function meldFout(wat, err, raad) {
    console.error('[wereldstudio] ' + wat, err);
    setOut(wat + '.\n' + (raad || 'Je huidige werk blijft staan.')
      + '\nBekijk de console voor technische details.');
  }
  let gridOn = false, curveOn = true, zoneOn = true, sterrenOn = false;

  // ---------------------------------------------------------------- status
  /* Welke beeldbestanden wijken af van wat er in het spel staat.

     Een tekening gaat meteen naar schijf -- er is geen "nog niet bewaard" voor een
     beeld, en dat is met opzet (zie verwerkBeeld). Maar daardoor viel een beeld
     buiten élke verandering die de studio meldde: worldState en tekenDiff kijken
     naar het WORLDS-blok, en het pad in dat blok verandert niet als je hetzelfde
     bestand vervángt. Wie de startschermachtergrond verwisselde kreeg dus te horen
     dat zijn concept "gelijk aan het spel" was, terwijl er een ander bestand lag --
     en dat gold net zo goed voor een wereldtekening die op zijn eigen pad bleef.

     De lijst komt van de server, die het aan git vraagt (zie gewijzigdeAssets in
     test/preview.js). Git is hier de enige bron die het ook ná herladen nog weet,
     en die meteen weer stil is als je een bestand terugzet. Wat de studio zelf
     schrijft komt er in dezelfde tel bij, zodat je het ziet zonder te verversen.

     Zonder de voorbeeldserver (file://) is de lijst leeg -- dan is er ook geen weg
     om een beeld te vervangen. */
  const GEWIJZIGD = new Set(window.__GEWIJZIGD || []);
  function shippedFor(id) { return WORLDS_SHIPPED.filter(w => w.id === id)[0]; }
  function worldState(w) {
    const ship = shippedFor(w.id);
    if (!ship) return 'nieuw';
    return sameWorld(ship, w) ? 'gelijk' : 'vuil';
  }
  function refreshStatus() {
    const vuil = WORLDS.filter(w => worldState(w) !== 'gelijk').length;
    const chip = F('st-status');
    /* Werelden én beelden: allebei staan ze straks in dezelfde commit, dus allebei
       horen ze hier te tellen. "3 niet doorgevoerd" is één getal over één vraag --
       hoeveel dingen wijken af van wat kinderen spelen. */
    const totaal = vuil + GEWIJZIGD.size;
    chip.textContent = totaal ? totaal + ' niet doorgevoerd' : 'gelijk aan het spel';
    chip.className = 'st-chip ' + (totaal ? 'vuil' : 'schoon');
  }
  function refreshList() {
    const list = F('st-list');
    list.innerHTML = '';
    WORLDS.forEach((w, i) => {
      const b = document.createElement('button');
      b.className = 'st-w' + (i === viewWorldIdx ? ' sel' : '');
      const state = worldState(w);
      b.innerHTML = `<span>${w.icon || '·'}</span><span class="st-nm">${esc(w.name)}</span>`
        + `<span class="st-dot ${state === 'gelijk' ? '' : state}" title="${state}"></span>`;
      b.onclick = () => goWorld(i);
      list.appendChild(b);
    });
    refreshStatus();
  }

  // ---------------------------------------------------------------- velden
  const HEX = { road: '#ffffff', sky: '#3d1a63', deep: '#2a0c47', glow: '#ffd880' };
  function fillSheet() {
    const g = wereldNu();
    if (!g) return;           // geen wereld om te tonen: de velden blijven zoals ze staan
    const w = g.world;
    F('mf-icon').value = w.icon || '';
    F('mf-name').value = w.name || '';
    F('mf-id').value = w.id || '';
    F('mf-art').value = (w.art && w.art.indexOf('blob:') !== 0) ? w.art : '';
    F('mf-levels').textContent = w.levels;
    /* Wat er uit de naam volgt, als bevestiging en niet als invoer: het id, het
       pad van de tekening en de trofee die aan dat id hangt. Wie wereld
       twaalf maakt hoeft daar niets over te weten -- maar hij mag het wel zien,
       want het is wat er straks in index.html komt te staan. */
    F('mf-afgeleid').textContent = 'id ' + (w.id || '—')
      + ' · ' + wereldArtPad(w.id || '—')
      + ' · trofee ' + PERFECT_BADGE + (w.id || '—')
      + ' · level ' + shown().first + '–' + (shown().first + w.levels - 1);
    Object.keys(HEX).forEach(k => { F('mf-' + k).value = (w.theme && w.theme[k]) || HEX[k]; });
    vulBeloning();
  }
  /* ---- De beloning van deze wereld -------------------------------------
     Eén spulletje uit ITEMS, en het is niet te koop (zie isBeloning). De lijst
     laat alles zien wat er is, met de spulletjes die al aan een ándere wereld
     vastzitten erbij maar gemerkt -- twee werelden die hetzelfde uitdelen is een
     fout, en de controle zegt dat ook, maar hem hier verbergen zou de vraag
     "waarom staat mijn hoed er niet bij" opleveren.

     Getekend met item.thumb() -- dezelfde tekening als in de kleedkamer en bij het
     wereldfeest. De studio heeft geen eigen tekenwerk voor spulletjes en hoort dat
     ook niet te krijgen. */
  function vulBeloning() {
    const w = shown().world;
    const kiezer = F('mf-beloning');
    kiezer.innerHTML = '';
    kiezer.appendChild(new Option('— geen beloning —', ''));
    ITEMS.forEach(it => {
      // "al van" alleen voor een ánder wereld: bij je eigen beloning zou het
      // lezen alsof je hem van jezelf afpakt
      const ander = beloningWereld(it.id);
      const bezet = ander && ander.id !== w.id;
      const label = (it.emoji ? it.emoji + ' ' : '') + (it.full || it.name)
        + ' · ' + it.cat + (bezet ? '  (al van ' + ander.name + ')' : '');
      kiezer.appendChild(new Option(label, it.id));
    });
    kiezer.value = w.beloning || '';
    const vak = F('st-bel'), it = w.beloning ? item(w.beloning) : null;
    const stuk = !!w.beloning && !it;
    vak.className = 'st-bel' + (stuk ? ' stuk' : it ? '' : ' leeg');
    F('st-bel-vb').innerHTML = it ? (it.thumb ? it.thumb(curBase()) : (it.emoji || '·')) : '·';
    F('st-bel-naam').textContent = stuk ? 'onbekend spulletje' : it ? (it.full || it.name) : 'nog geen beloning';
    F('st-bel-uit').textContent = stuk
      ? w.beloning + ' staat niet in ITEMS — deze wereld deelt niets uit'
      : it ? it.id : 'deze wereld uitspelen levert nu niets op';
    F('st-bel-kijk').disabled = !it;
  }
  F('mf-beloning').onchange = () => {
    const w = shown().world, v = F('mf-beloning').value;
    if (v) w.beloning = v; else delete w.beloning;
    commit(v ? 'beloning: ' + ((item(v) || {}).full || v) : 'beloning weggehaald');
  };
  /* Even op de pop zetten. Geen kleedkamer in de studio: één blik op de paspop met
     dit ding op haar hoofd, en weer weg. Dezelfde avatarSVG als het spel -- dus wat
     je hier ziet is letterlijk wat een kind ziet. */
  F('st-bel-kijk').onclick = () => {
    const it = item(shown().world.beloning);
    if (!it) return;
    const p = P();
    const pop = { ...p, equipped: { ...p.equipped, [it.cat]: it.id } };
    let vak = F('st-pop');
    if (!vak) {
      vak = document.createElement('div');
      vak.id = 'st-pop';
      vak.onclick = () => vak.remove();
      panel.appendChild(vak);
    }
    vak.innerHTML = avatarSVG(pop, 190) + '<b>' + esc(it.full || it.name) + '</b>'
      + '<small>' + esc(shown().world.name) + ' · tik om te sluiten</small>';
  };
  function readSheet() {
    const w = shown().world;
    w.icon = F('mf-icon').value.trim() || w.icon;
    w.name = F('mf-name').value.trim() || w.name;
    /* Het id is de identiteit van een wereld: de bestandsnaam van de tekening komt
       eruit, en de wereldbadge in de trofeeënkast heet 'wereld-<id>'. Het is dus geen
       cosmetische wijziging -- de náám veranderen is dat wel, en dat is bijna altijd
       wat je bedoelt.

       Hernoem je toch, dan verhuist de tekening mee. Zonder dat bleef het bestand als
       wees op schijf staan en stond de wereld zonder beeld, en dan zou je 'm opnieuw
       moeten genereren voor niets. Alleen de letters die ook in een pad mogen. */
    /* Het bestandsveld vóór het id, want het id-blok hieronder mag het laatste woord
       hebben: het veld draagt bij een hernoeming nog de óúde naam, en zette de zojuist
       verhuisde tekening anders weer terug op een pad dat niet meer bestaat. */
    const art = F('mf-art').value.trim();
    if (art) w.art = art; else if (w.art && w.art.indexOf('blob:') !== 0) delete w.art;

    const nid = F('mf-id').value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (nid && nid !== w.id) {
      const oudId = w.id, oudPad = w.art;
      w.id = nid;
      const nieuwPad = slotPad('world');
      const kanon = 'assets/world/' + oudId + '-map.webp';
      if (oudPad === kanon && OP_SCHIJF[kanon]) {
        w.art = nieuwPad;
        OP_SCHIJF[nieuwPad] = OP_SCHIJF[kanon];
        delete OP_SCHIJF[kanon];
        // een hernoemd bestand is hoe dan ook een wijziging: de oude naam
        // verdwijnt uit het spel en de nieuwe komt erbij
        GEWIJZIGD.delete(kanon);
        GEWIJZIGD.add(nieuwPad);
        fetch('/hernoem?van=' + encodeURIComponent(kanon) + '&naar=' + encodeURIComponent(nieuwPad),
          { method: 'POST' })
          .then(r => r.text().then(t => setOut(r.ok
            ? 'wereld heet nu ' + nid + ' · ' + t
            : 'het id is gewijzigd, maar de tekening niet: ' + t)))
          .catch(() => setOut('het id is gewijzigd; de tekening verhuist alleen via npm run preview'));
      } else {
        setOut('wereld heet nu ' + nid + ' — de tekening hoort bij ' + nieuwPad);
      }
      if (P().trophies.indexOf(PERFECT_BADGE + oudId) >= 0) {
        setOut('let op: de perfecte-wereldtrofee stond op ' + PERFECT_BADGE + oudId
          + ' en heet nu ' + PERFECT_BADGE + nid + ' — een al behaalde trofee raak je daarmee kwijt');
      }
      rebuildWorldBadges();
    }
    w.theme = {};
    Object.keys(HEX).forEach(k => {
      const v = F('mf-' + k).value;
      if (v && v.toLowerCase() !== HEX[k]) w.theme[k] = v;
    });
    if (!Object.keys(w.theme).length) delete w.theme;
    commit('');
  }
  panel.querySelectorAll('.st-row input, .st-kleur input').forEach(i => { i.onchange = readSheet; });

  // ---------------------------------------------------------------- tekenen
  function ownNodes() {
    const w = shown().world;
    if (!w.nodes || w.nodes.length !== shown().levels) {
      w.nodes = worldNodes(shown()).map(n => ({ x: n.x, y: n.y }));
    }
    return w.nodes;
  }
  function ownCurve() {
    const w = shown().world;
    if (!w.curve || w.curve.length !== shown().levels - 1) w.curve = worldCurve(shown());
    return w.curve;
  }
  /* Ongedaan maken. Een stapeltje momentopnames van de haltes en de weg van de
     wereld die je bewerkt -- niet van alles, want alleen die twee lijsten veranderen
     door slepen. Wordt gezet vóór elke wijziging, niet erna: zo brengt Ctrl+Z je
     terug naar hoe het was vóór de sleep. */
  const historie = [];
  function bewaarStap(wat) {
    const w = shown().world;
    historie.push({
      idx: viewWorldIdx, wat,
      nodes: w.nodes ? JSON.parse(JSON.stringify(w.nodes)) : null,
      curve: w.curve ? JSON.parse(JSON.stringify(w.curve)) : null,
    });
    if (historie.length > 40) historie.shift();
  }
  function stapTerug() {
    const h = historie.pop();
    if (!h) { setOut('niets meer om terug te nemen'); return; }
    if (h.idx !== viewWorldIdx) { viewWorldIdx = h.idx; }
    const w = shown().world;
    if (h.nodes) w.nodes = h.nodes; else delete w.nodes;
    if (h.curve) w.curve = h.curve; else delete w.curve;
    /* De selectie blijft staan als hij nog bestaat: je wil na een terugname zíen
       waar het punt nu ligt, en meteen verder kunnen bijschuiven. */
    if (sel && !selLijst()[sel.i]) sel = null;
    commit('↶ ' + h.wat + ' teruggenomen (' + historie.length + ' over)');
    markeerSelectie();
    vulXY();
  }

  function leesNodes() { return shown().world.nodes || worldNodes(shown()); }
  function leesCurve() { return shown().world.curve || worldCurve(shown()); }
  function redrawRoad() {
    const frame = map.querySelector('.world-frame');
    if (!frame) return;
    const pts = leesNodes().map(n => ({ x: vbx(n.x), y: vby(n.y) }));
    const c = leesCurve();
    const bg = frame.querySelector('.tour-road-bg'), fg = frame.querySelector('.tour-road-fg');
    const un = frame.querySelector('.tour-road-under');
    const svg = frame.querySelector('.tour-road-svg');
    const ster = sterNu(), hier = wereldNu();
    if (!ster || !hier) return;          // geen ster, geen voortgang om te tekenen
    const tot = Math.min(pts.length, ster.level - hier.first + 1);
    if (bg) { bg.setAttribute('d', roadD(pts, pts.length, c));
      bg.style.strokeDasharray = roadDashArray(svg, pts, c, pts.length); }
    if (un) { un.setAttribute('d', roadD(pts, pts.length, c));
      un.style.strokeDasharray = bg ? bg.style.strokeDasharray : ''; }
    if (fg) { fg.setAttribute('d', roadD(pts, tot, c));
      fg.style.strokeDasharray = roadDashArray(svg, pts, c, tot); }
  }
  function decorate() {
    const frame = map.querySelector('.world-frame');
    if (!frame) return;
    /* De veilige zone staat standaard aan: dat is de één regel die je nodig hebt
       terwijl je haltes neerzet. Het raster van 10% is er los bij, voor wie een
       tekening wil uitmeten. */
    if (zoneOn) {
      const d = document.createElement('div');
      d.className = 'me-safe';
      d.style.left = ZONE.x0 + '%';
      d.style.right = (100 - ZONE.x1) + '%';
      d.style.top = ZONE.y0 + '%';
      d.style.bottom = (100 - ZONE.y1) + '%';
      frame.appendChild(d);
      /* de snede van de langste telefoon: 11,9% per kant (gemeten op 412x961) */
      const sn = document.createElement('div');
      sn.className = 'me-snee';
      sn.style.left = '11.9%';
      sn.style.right = '11.9%';
      sn.innerHTML = '<span>zichtbaar op elk toestel</span>';
      frame.appendChild(sn);
      /* de strook waar een halte mag staan maar de bovenbalk voor de ster opzij gaat */
      const kb = document.createElement('div');
      kb.className = 'me-kopband';
      kb.style.left = ZONE.x0 + '%';
      kb.style.right = (100 - ZONE.x1) + '%';
      kb.style.top = ZONE.y0 + '%';
      kb.style.height = (ZONE.y0kop - ZONE.y0) + '%';
      kb.innerHTML = '<span>hier dimt de bovenbalk</span>';
      frame.appendChild(kb);
      toonOnderrand(frame);
    }
    if (gridOn) { const d = document.createElement('div'); d.className = 'me-grid'; frame.appendChild(d); }
    /* De ster staat in het spel op één halte. Met deze knop op allemaal, doorzichtig:
       zo zie je in één blik of ze overal past -- of ze nergens met haar hoofd in een
       rots staat en of er overal lucht boven de richel is. */
    if (sterrenOn) {
      const bron = frame.querySelector('.tour-hero');
      if (bron) frame.querySelectorAll('.tour-stop').forEach(st => {
        if (st.querySelector('.tour-hero')) return;
        const k = bron.cloneNode(true);
        k.classList.add('me-spook');
        st.appendChild(k);
      });
    }
    leesCurve().forEach((c, i) => {
      const h = document.createElement('div');
      h.className = 'me-ctrl';
      h.dataset.ctrl = i;
      h.style.left = c.x + '%';
      h.style.top = c.y + '%';
      h.title = 'weg tussen halte ' + (i + 1) + ' en ' + (i + 2);
      frame.appendChild(h);
    });
  }
  /* De strook die de navigatiebalk afdekt, en een waarschuwing per halte die erin
     valt. Bewust alleen kijken en zeggen: de haltes staan met de hand neergezet, en
     een editor die ze stiekem verschuift is een editor die je niet meer vertrouwt. */
  function toonOnderrand(frame) {
    const fr = frame.getBoundingClientRect();
    const mr = map.getBoundingClientRect();
    if (!fr.height || !mr.height) return;
    const sch = Number(getComputedStyle(R).getPropertyValue('--doos-s')) || 1;
    const lijn = mr.bottom - ONDER_PX * sch;          // in schermcoördinaten
    const top = (lijn - fr.top) / fr.height * 100;
    if (top >= 100 || top <= 0) return;
    const d = document.createElement('div');
    d.className = 'me-onder';
    d.style.top = top.toFixed(2) + '%';
    d.innerHTML = '<span>navigatiebalk — ' + Math.round(ONDER_PX) + 'px</span>';
    frame.appendChild(d);
    /* Buiten de zone? De stippellijn alleen is te makkelijk over het hoofd te zien,
       zeker op een drukke tekening. Elke halte die eruit valt krijgt een rode rand en
       komt met naam in het paneel te staan -- en er wordt niets automatisch verschoven,
       want de haltes zet jíj neer. */
    const zone = frame.querySelector('.me-safe');
    const zr = zone ? zone.getBoundingClientRect() : null;
    const uit = [];
    frame.querySelectorAll('.tour-stop').forEach(st => {
      const r = st.getBoundingClientRect();
      const d = st.querySelector('.dot').getBoundingClientRect();
      const cx = d.left + d.width / 2, cy = d.top + d.height / 2;
      const redenen = [];
      // 1,5px speling: de standaardslinger raakt de zone précies, en een halve pixel
      // afrondingsverschil hoort geen waarschuwing te zijn
      const sp = 1.5;
      if (r.bottom > lijn + sp) redenen.push('balk');
      if (zr) {
        if (cx < zr.left - sp) redenen.push('links');
        if (cx > zr.right + sp) redenen.push('rechts');
        if (cy < zr.top - sp) redenen.push('boven');
        if (cy > zr.bottom + sp) redenen.push('onder');
      }
      st.classList.toggle('te-laag', redenen.length > 0);
      if (redenen.length) uit.push(st.dataset.lvl - shown().first + 1 + ' (' + redenen.join('+') + ')');
    });
    /* Botsen de sterrengroepjes met elkaar of met een ander rondje? Het ritme is
       krapper dan een haltblokje hoog is (182 tegen 194 tekenpixels), dus de slinger
       naar links en rechts moet het werk doen -- en met de hand neergezette haltes
       kunnen dat per ongeluk opgeven. Alleen kijken en zeggen: er wordt niets
       verschoven, want de haltes zet jíj neer. */
    const botst = [];
    const stops = [...frame.querySelectorAll('.tour-stop')];
    /* Het sterrentabje is een tabje geworden met een eigen, échte breedte (10,2cqw).
       Hiervoor was .cstars een tekstregel over de volle 26cqw van het blokje en
       grotendeels leeg, en werd er daarom met de middelste helft gerekend. Die
       schatting kan nu weg: de rechthoek ís het tabje. */
    const doos = el => { const r = el.getBoundingClientRect();
      return { l: r.left, r: r.right, t: r.top, b: r.bottom }; };
    const raakt = (p1, p2) => p1.l < p2.r && p1.r > p2.l && p1.t < p2.b && p1.b > p2.t;
    stops.forEach((a, i) => {
      const sa = a.querySelector('.cstars');
      if (!sa) return;
      const kern = doos(sa);
      stops.forEach((c, j) => {
        if (j <= i) return;
        const sc = c.querySelector('.cstars');
        if (raakt(kern, doos(c.querySelector('.dot'))) || (sc && raakt(kern, doos(sc)))) {
          botst.push((i + 1) + '\u2194' + (j + 1));
        }
      });
    });
    stops.forEach((st, i) => st.classList.toggle('botst',
      botst.some(x => x.split('\u2194').indexOf(String(i + 1)) >= 0)));

    const chip = F('st-onder');
    if (chip) {
      const regels = [];
      if (uit.length) regels.push('\u26a0 buiten de veilige zone: halte ' + uit.join(', '));
      if (botst.length) regels.push('\u00b7 sterren lopen in elkaar of over een halte: ' + botst.join(', '));
      chip.hidden = !regels.length;
      chip.innerHTML = regels.join('<br>');
    }
  }

  const baseRender = renderTourMap;
  renderTourMap = function () { baseRender.apply(null, arguments); decorate(); markeerSelectie(); };

  /* Elke wijziging: bewaren, opnieuw tekenen, lijst en status bijwerken.

     De kaart hertekenen is het enige deel dat een ster nodig heeft, en dus het
     enige deel dat overgeslagen wordt als die er niet is. De rest van het paneel
     -- de wereldlijst, de velden, de beelden, de diff -- gaat gewoon door: wie
     het startscherm vervangt hoort niet met een leeg paneel achter te blijven
     omdat er toevallig geen kaart te tekenen viel. */
  function commit(msg) {
    saveWorldDraft();
    if (sterNu() && wereldNu()) showWorld(viewWorldIdx);
    refreshList();
    fillSheet();
    if (typeof tekenSchermen === 'function') tekenSchermen();
    if (typeof tekenDiff === 'function') tekenDiff();
    if (msg !== undefined) setOut(msg);
  }
  function goWorld(i) {
    viewWorldIdx = i;
    kies(null);
    // de paspop met de beloning hoort bij de wereld die je toen bekeek
    if (F('st-pop')) F('st-pop').remove();
    historie.length = 0;                       // de historie hoort bij één wereld
    zetStand(F('st-stand') ? F('st-stand').value : 'halverwege');
  }

  // ---------------------------------------------------------------- knoppen
  F('st-uitleg').onclick = e => {
    panel.classList.toggle('uitleg');
    e.target.classList.toggle('on', panel.classList.contains('uitleg'));
  };
  F('st-fold').onclick = () => {
    panel.classList.toggle('dicht');
    document.documentElement.style.setProperty('--studio-w', panel.classList.contains('dicht') ? '44px' : '330px');
    zetToestel(toestelKiezer.value);
  };
  F('st-undo').onclick = stapTerug;
  const uitVeld = () => { bewaarStap('getal ingetikt'); zetXY(Number(F('st-x').value), Number(F('st-y').value)); };
  F('st-x').onchange = uitVeld;
  F('st-y').onchange = uitVeld;

  /* De vier standen waarin een kind de kaart ziet. Schrijft in het profiel maar
     bewaart nooit (geen save()), dus een herlaadbeurt zet alles terug -- net als
     goWorld() al deed. In de studio draai je op het demo-profiel. */
  function zetStand(stand) {
    const q = sterNu(), w = wereldNu();
    if (!q || !w) { setOut('Geen wereld gekozen — kies er een in de lijst.'); return; }
    for (let l = w.first; l < w.first + w.levels; l++) delete q.stars[l];
    /* 'op slot' zet de ster vóór deze wereld: élke halte hier is dan dicht --
       stoffig violet, zonder sterren en zonder pop. Dat is wat een kind ziet als het vooruitkijkt naar
       een wereld waar het nog niet is, en het is de enige stand waarin de tekening
       helemaal onder grijze rondjes verdwijnt -- dus juist die wil je nakijken.
       Op de eerste wereld valt er niets vóór, en dan is 'vers' de laagste stand. */
    if (stand === 'slot') q.level = Math.max(1, w.first - 1);
    else if (stand === 'vers') q.level = w.first;
    else if (stand === 'uit' || stand === 'perfect') {
      for (let l = w.first; l < w.first + w.levels; l++) q.stars[l] = stand === 'perfect' ? 3 : 2;
      q.level = w.first + w.levels;
    } else {
      for (let l = w.first; l < w.first + 3; l++) q.stars[l] = 2 + (l % 2);
      q.level = w.first + 3;
    }
    commit('');
  }
  F('st-stand').onchange = () => zetStand(F('st-stand').value);

  F('st-zone').onclick = e => { zoneOn = !zoneOn; e.target.classList.toggle('on', zoneOn); commit(); };
  F('st-grid').onclick = e => { gridOn = !gridOn; e.target.classList.toggle('on', gridOn); commit(); };
  F('st-sterren').onclick = e => {
    sterrenOn = !sterrenOn;
    document.body.classList.toggle('sterren', sterrenOn);
    e.target.classList.toggle('on', sterrenOn);
    commit();
  };
  F('st-curve').onclick = e => {
    curveOn = !curveOn;
    document.body.classList.toggle('nocurve', !curveOn);
    e.target.classList.toggle('on', curveOn);
  };
  F('st-renodes').onclick = () => { bewaarStap('haltes terugzetten'); delete shown().world.nodes; kies(null); commit('haltes terug naar de slinger'); };
  F('st-recurve').onclick = () => { bewaarStap('weg terugzetten'); delete shown().world.curve; kies(null); commit('weg terug naar de vanzelf-bocht'); };
  /* ---------------------------------------------------------------- beelden
     Per scherm zie je welke tekening daar hoort, hoe groot hij moet zijn en waar
     hij landt. Die tabel komt uit test/scene.js en wordt door de server in de
     pagina gezet -- één lijst, niet twee die uit elkaar lopen. Zonder server
     (bijvoorbeeld rechtstreeks vanaf schijf) valt hij terug op het minimum.

     Omzetten naar webp gebeurt hier, in een canvas. Scheelt een beeldbibliotheek
     in het project, en het beeld is toch al geladen. Meteen op de juiste maat: de
     bron mag dus elk formaat hebben, als de verhouding maar ongeveer klopt.
     Bijsnijden gaat als cover -- vullen en de rest weg, nooit vervormen. */
  const SLOTS = window.__SLOTS || {
    world:   { screen: 'map', label: 'Wereldkaart', waar: 'de kaart, van rand tot rand',
               lever: [1080, 2160], pad: 'assets/world/{wereld}-map.webp', perWereld: true },
  };
  const SCHERMEN = window.__SCHERMEN || [
    { id: 'profile', label: 'Wie speelt er' }, { id: 'map', label: 'Kaart' },
    { id: 'game', label: 'Show' }, { id: 'end', label: 'Einde' },
  ];
  const OP_SCHIJF = window.__ASSETS || {};

  /* Waar landt dit beeld? Een wereldtekening heeft de wereld nodig om zijn pad te
     kennen; het startscherm, het logo en het icoon niet -- die hebben één vast pad
     en bestaan los van welke wereld je bekijkt. Dat onderscheid staat hier en
     nergens anders: shown() vragen voor een globaal beeld was precies de aanname
     die de studio op het landingsscherm liet omvallen. */
  function slotPad(key) {
    const d = SLOTS[key];
    if (!d || !d.pad) return '';
    if (!d.perWereld) return d.pad;
    const w = wereldNu();
    return w ? d.pad.replace('{wereld}', w.world.id) : '';
  }
  /* Vier van de zes plekken uit scene.js leest het spel nog niet: die zijn voorstel
     en leven alleen in incoming/. Dat hoort de studio te zéggen in plaats van een
     knop aan te bieden die niets doet. */
  function tekenSchermen() {
    tekenWereldbeeld();
    const vak = F('st-schermen');
    if (!vak) return;
    vak.innerHTML = '';
    SCHERMEN.forEach(sc => {
      // alleen plekken die het spel écht leest: de vier voorstellen uit scene.js
      // (zaal, landschap, wolken, slotscherm) hebben nog geen doelpad, en een rij
      // die niets doet is een rij die je elke keer opnieuw moet wegdenken
      const keys = Object.keys(SLOTS).filter(k =>
        SLOTS[k].screen === sc.id && !SLOTS[k].perWereld && SLOTS[k].pad);
      if (!keys.length) return;
      const groep = document.createElement('div');
      groep.className = 'st-scherm';
      groep.innerHTML = '<h6>' + esc(sc.label) + '</h6>';
      keys.forEach(k => {
        const d = SLOTS[k], pad = slotPad(k), kan = !pad;
        const kb = OP_SCHIJF[pad];
        const rij = document.createElement('div');
        rij.className = 'st-slot' + (kan ? ' kan' : '');
        rij.dataset.slot = k;
        rij.title = kan ? 'nog niet in het spel — alleen via incoming/'
          : 'sleep een beeld hierheen, of tik om te kiezen';
        rij.innerHTML = '<b>' + esc(d.label) + '</b>'
          + '<span class="st-dot ' + (kan ? '' : kb ? 'er' : 'weg') + '"></span>'
          + '<small>' + d.lever[0] + ' × ' + d.lever[1] + ' — '
          + (kan ? 'nog niet in het spel; leg hem in incoming/ als ' + esc(d.canoniek || k)
             : esc(pad) + (kb ? '  · ' + kb + ' kB' : '  · ontbreekt nog')) + '</small>';
        if (!kan) {
          rij.onclick = () => { bezigSlot = k; F('me-file').click(); };
          ['dragenter', 'dragover'].forEach(n => rij.addEventListener(n, e => {
            e.preventDefault(); rij.classList.add('over');
          }));
          ['dragleave', 'dragend'].forEach(n => rij.addEventListener(n, () => rij.classList.remove('over')));
          rij.addEventListener('drop', e => {
            e.preventDefault();
            rij.classList.remove('over');
            const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
            if (!f) return setOut('daar zat geen bestand bij');
            if (!/^image\//.test(f.type)) return setOut('dat is geen afbeelding: ' + f.name);
            verwerkBeeld(f, k);
          });
        }
        /* Ligt er een kandidaat voor deze plek in incoming/? Dan is de vraag niet
           "welk bestand is dit" maar "wordt hij het". Eén knop, naast de huidige. */
        const k2 = kandidaatVoor(k);
        if (k2 && !kan) {
          const nieuw = document.createElement('div');
          nieuw.className = 'st-nieuw';
          nieuw.innerHTML = '<div class="paar">'
            + '<figure><figcaption>Huidig</figcaption><div class="vb" style="'
            + (kb ? 'background-image:url(\'' + pad + '?v=' + kb + '\')' : '') + '">'
            + (kb ? '' : 'geen') + '</div></figure>'
            + '<figure><figcaption>Nieuw</figcaption><div class="vb" style="background-image:url(\''
            + k2.url + '\')"></div></figure></div>'
            + '<div class="st-btns"><button class="prim">Gebruik deze</button>'
            + '<button class="stil">weggooien</button></div>'
            + '<small>' + esc(k2.file) + '</small>';
          const knoppen = nieuw.querySelectorAll('button');
          knoppen[0].onclick = () => verwerkBeeld(k2.url, k, k2.file);
          knoppen[1].onclick = () => gooiKandidaatWeg(k2);
          groep.appendChild(rij);
          groep.appendChild(nieuw);
          vak.appendChild(groep);
          return;
        }
        groep.appendChild(rij);
      });
      vak.appendChild(groep);
    });
    tekenOngebruikt();
    tekenMerk();
  }
  /* ---- Het merk: alleen kijken --------------------------------------------
     De naam op de telefoon, het spelogo, het merkteken en het app-icoon staan
     hier bij elkaar, zodat je ze kunt terugvinden zonder in de mappen te zoeken.
     Meer niet -- en dat is met opzet.

     Waarom je hier niets kunt slepen, terwijl dat bij een wereldtekening juist
     de hele truc is: een merkbeeld is geen bestand maar een kéten. Er is één
     meester in assets/branding/source/ en daar rollen vijf afgeleiden uit, in
     twee formaten, met een maskeerbaar icoon dat zijn eigen uitsnede heeft. Wie
     hier één afgeleide zou overschrijven, krijgt een logo dat niet meer bij zijn
     eigen meester hoort en vier bestanden die nog wél kloppen. De weg is dus:
     meester vervangen, `npm run merk` draaien. Dat is één regel, en het houdt de
     keten heel.

     De lijst komt uit test/merk.js via de voorvertoningsserver (window.__MERK) --
     dezelfde afspraak als __SLOTS uit test/scene.js. Zonder server is er geen
     lijst en blijft dit vak gewoon leeg. */
  const MERK = window.__MERK || [];
  function tekenMerk() {
    const vak = F('st-merk');
    if (!vak || !MERK.length) return;
    const kB = p => OP_SCHIJF[p] === undefined ? 'ontbreekt' : OP_SCHIJF[p] + ' kB';
    const rij = d => '<div class="st-merk"><div class="vb" style="background-image:url(\''
      + esc(d.uit[0]) + '?v=' + (OP_SCHIJF[d.uit[0]] || 0) + '\')"></div><div><b>'
      + esc(d.merk) + '</b><small>' + d.uit.map(u => esc(u) + ' · ' + kB(u)).join('<br>')
      + '<br>← ' + esc(d.bron) + ' · ' + kB(d.bron) + '</small></div></div>';
    /* Per merkbeeld één vak, niet per afgeleide: drie iconen uit één tekening zijn
       één merkbeeld met drie maten, geen drie merkbeelden. */
    const perMerk = [];
    MERK.forEach(d => {
      const zelfde = perMerk.find(x => x.merk === d.merk);
      if (zelfde) { zelfde.uit.push(d.uit); return; }
      perMerk.push({ merk: d.merk, bron: d.bron, uit: [d.uit] });
    });
    vak.innerHTML = '<h6>Merk</h6>'
      + '<div class="st-merk"><div class="vb" style="background-image:url(\'icon-192.png?v='
      + (OP_SCHIJF['icon-192.png'] || 0) + '\')"></div><div><b id="st-merk-naam">…</b>'
      + '<small>manifest.json · de naam onder het icoon op de telefoon</small></div></div>'
      + perMerk.map(rij).join('')
      + '<p class="st-hint">De meesters staan in <code>assets/branding/source/</code> en gaan de app '
      + 'nooit in. Een nieuw merkbeeld? Vervang de meester en draai <code>npm run merk</code>; '
      + 'dat schrijft alle afgeleiden hierboven opnieuw.</p>';
    fetch('manifest.json').then(r => r.json()).then(m => {
      const el = F('st-merk-naam');
      if (el) el.textContent = m.name || '(geen naam)';
    }).catch(() => { const el = F('st-merk-naam'); if (el) el.textContent = '(manifest niet gelezen)'; });
  }
  /* Wat er op schijf staat en door niemand gelezen wordt. Dat gebeurt vanzelf: een
     wereld wordt hernoemd, een tekening wordt vervangen door eentje met een andere
     naam, of een wereld verdwijnt uit de lijst. Zo'n bestand doet geen kwaad, maar
     het gaat wél mee in de app en in de servicewerker-cache.

     Alleen noemen, nooit zelf opruimen: git weet wat er in het spel hoort te staan
     en een studio die bestanden weggooit is een studio die je niet meer vertrouwt.
     Dit is geen bestandsbeheerder -- het is één regel die zegt dat er iets
     rondslingert. */
  function tekenOngebruikt() {
    const vak = F('st-ongebruikt');
    if (!vak) return;
    const gebruikt = {};
    WORLDS.forEach(w => { if (w.art) gebruikt[w.art] = true; });
    Object.keys(SLOTS).forEach(k => { const d = SLOTS[k]; if (d.pad && !d.perWereld) gebruikt[d.pad] = true; });
    const los = Object.keys(OP_SCHIJF)
      .filter(f => /^assets\/world\//.test(f) && !gebruikt[f]).sort();
    vak.innerHTML = los.length
      ? '<h6>Niet gebruikt</h6><div class="st-check">' + los.map(f =>
          '<span class="ct-let">·</span> ' + esc(f) + '  · ' + OP_SCHIJF[f] + ' kB').join('<br>')
        + '<br><span style="color:#9c86bd">geen enkele wereld wijst hiernaar — opruimen mag met de hand</span></div>'
      : '';
  }
  /* Het tekeningvak van de wereld die je nu bewerkt. Zelfde weg naar binnen als een
     regel in Beelden, maar groot, met een voorbeeldje en op de plek waar je toch al
     bezig bent met die wereld.

     Wat er naast het voorbeeldje staat is met opzet geen pad maar een máát: een
     tekening is goed of niet goed, en daar beslist de verhouding over en niet de
     bestandsnaam. Het pad staat er nog wel bij, klein -- je moet 'm een keer kunnen
     opzoeken. */
  const ART_VERHOUDING = ART_W / ART_H;
  // Opgemeten maten per pad, zodat een herteken-ronde niet elke keer opnieuw laadt.
  const GEMETEN = {};
  function meetTekening(pad) {
    if (!pad) return;
    if (GEMETEN[pad] !== undefined) return;
    GEMETEN[pad] = null;                       // bezig: niet nog eens beginnen
    laadBeeld(pad).then(img => {
      GEMETEN[pad] = { w: img.naturalWidth, h: img.naturalHeight };
      tekenWereldbeeld();
    }).catch(() => { GEMETEN[pad] = { w: 0, h: 0 }; tekenWereldbeeld(); });
  }
  /* Wat er mis kan zijn met een tekening, gemeten in plaats van geraden. Drie
     dingen, en alle drie merk je anders pas op een telefoon:
       - een andere verhouding dan 9:16 wordt als cover bijgesneden, dus er valt
         een strook weg die je bij het tekenen wél zag
       - te weinig pixels wordt zichtbaar zacht op een tablet
       - een bestand dat er niet is laat de wereld stil terugvallen op zijn kleuren */
  function tekeningLet(w, pad, kb) {
    const m = GEMETEN[w.art] || GEMETEN[pad];
    const uit = [];
    /* "Staat het bestand er?" wordt gemeten en niet uit de lijst van de server
       afgeleid: die lijst is er alleen mét `npm run preview`, en zonder server
       riep dit bij élke wereld dat de tekening ontbrak terwijl hij gewoon in beeld
       stond. Een beeld dat laadt bestáát -- dat is een sterker bewijs dan een
       lijstje. */
    if (m && !m.w) uit.push('het bestand staat er niet, of het is geen leesbaar beeld');
    if (m && m.w) {
      const v = m.w / m.h;
      if (Math.abs(v - ART_VERHOUDING) / ART_VERHOUDING > 0.02) {
        uit.push('verhouding ' + v.toFixed(2) + ' in plaats van ' + ART_VERHOUDING.toFixed(2)
          + ' (9:16) — de kaart snijdt als cover bij, dus er valt een strook weg');
      }
      if (m.w < ART_W * 0.7) uit.push('maar ' + m.w + ' pixels breed; ' + ART_W + ' is de maat — dit wordt zacht op een tablet');
    }
    if (kb && kb > 200) uit.push(kb + ' kB is zwaar; de begroting is ~125 kB per wereld');
    return uit;
  }
  function tekenWereldbeeld() {
    const vak = F('st-art');
    const g = wereldNu();
    if (!vak || !g) return;
    const w = g.world, pad = slotPad('world'), kb = OP_SCHIJF[pad];
    const tijdelijk = w.art && w.art.indexOf('blob:') === 0;
    /* Drie toestanden, en ze zijn echt verschillend. De middelste komt voor nadat je
       "Ophalen" hebt gedaan: het bestand staat er nog, maar de wereld wijst er niet
       meer naar. Zonder dat onderscheid staat er "nog geen tekening" naast een
       bestandsmaat, en dat klopt allebei niet. */
    const gemeten = GEMETEN[w.art] || GEMETEN[pad];
    const erIs = kb || tijdelijk || (gemeten && gemeten.w > 0);
    const staat = (w.art && erIs) ? 'klaar' : (kb || (!w.art && gemeten && gemeten.w > 0)) ? 'los' : 'leeg';
    vak.classList.toggle('er', staat === 'klaar');
    const toon = w.art || ((kb || (GEMETEN[pad] && GEMETEN[pad].w > 0)) ? pad : '');
    F('st-art-vb').style.backgroundImage = toon ? `url("${toon}?v=${kb || 0}")` : '';
    F('st-art-vb').textContent = toon ? '' : '＋';
    F('st-art-vb').style.opacity = staat === 'los' ? '.45' : '1';
    /* Zolang de meting loopt weten we nog niet of het bestand er is, en dan hoort
       er ook niet te staan dat het ontbreekt: dat stond er één tel bij élke wereld,
       en een melding die soms onwaar is leer je wegkijken. */
    const nogAanHetMeten = w.art && !gemeten && w.art.indexOf('blob:') !== 0;
    F('st-art-st').innerHTML = staat === 'klaar'
        ? 'tekening staat klaar — <b>sleep een nieuwe erop om te vervangen</b>'
      : staat === 'los' ? 'bestand staat er, maar deze wereld gebruikt het niet '
        + '<button id="st-art-koppel">gebruiken</button>'
      : nogAanHetMeten ? 'tekening ophalen…'
      : w.art ? 'bestand ontbreekt nog' : 'nog geen tekening — sleep er een hierheen';
    meetTekening(toon && toon.indexOf('blob:') !== 0 ? toon : null);
    if (!w.art) meetTekening(pad);
    const m = GEMETEN[toon];
    const maat = m && m.w ? m.w + '×' + m.h + ' · ' + verhoudingNaam(m.w / m.h)
      : m ? 'kan het bestand niet lezen' : toon ? 'meten…' : SLOTS.world.lever[0] + '×' + SLOTS.world.lever[1] + ' gevraagd';
    F('st-art-info').textContent = maat + (kb ? ' · ' + kb + ' kB' : '') + '  ·  ' + pad;
    const let_op = tekeningLet(w, pad, kb);
    F('st-art-let').hidden = !let_op.length;
    F('st-art-let').innerHTML = let_op.map(t => '⚠ ' + esc(t)).join('<br>');
    const kop = F('st-art-koppel');
    if (kop) kop.onclick = e => {
      e.stopPropagation();
      shown().world.art = pad;
      commit('tekening gekoppeld');
    };
    tekenKandidaat();
  }
  // 1215x2160 zegt een mens niets; 9:16 wel. Alleen de verhoudingen die hier
  // voorkomen krijgen een naam, de rest gewoon het getal.
  function verhoudingNaam(v) {
    const bekend = [[9 / 16, '9:16'], [1 / 2, '1:2'], [3 / 4, '3:4'], [2 / 3, '2:3'],
                    [1, '1:1'], [16 / 9, '16:9'], [4 / 5, '4:5']];
    for (const [w, naam] of bekend) if (Math.abs(v - w) / w < 0.015) return naam;
    return v.toFixed(2) + ':1';
  }
  /* ---- Huidig naast nieuw --------------------------------------------------
     Er ligt iets in incoming/ dat bij déze wereld hoort. Dat is de enige plek waar
     een gegenereerde tekening binnenkomt, en de vraag die je dan hebt is niet
     "waar staat dit bestand" maar "is deze beter dan wat er nu staat". Dus: de twee
     naast elkaar, en één knop om te kiezen.

     Bewust géén stille vervanging: wat er in het spel staat verandert alleen als
     jij dat zegt. En bewust geen tweede stap erna -- gebruiken is gebruiken. */
  function kandidaatVoor(key) {
    const lijst = window.__INCOMING || [];
    for (let i = lijst.length - 1; i >= 0; i--) if (lijst[i].slot === key) return lijst[i];
    return null;
  }
  function tekenKandidaat() {
    const vak = F('st-art-nieuw');
    if (!vak) return;
    const k = kandidaatVoor('world');
    const g = wereldNu();
    vak.hidden = !k || !g;
    if (!k || !g) return;
    const w = g.world, pad = slotPad('world'), kb = OP_SCHIJF[pad];
    const huidig = w.art || (kb ? pad : '');
    vak.innerHTML = '<div class="paar">'
      + '<figure><figcaption>Huidig</figcaption><div class="vb" style="'
      + (huidig ? 'background-image:url(\'' + huidig + '?v=' + (kb || 0) + '\')' : '') + '">'
      + (huidig ? '' : 'geen') + '</div></figure>'
      + '<figure><figcaption>Nieuw</figcaption><div class="vb" style="background-image:url(\''
      + k.url + '\')"></div></figure></div>'
      + '<div class="st-btns"><button class="prim" id="st-nieuw-ja">Gebruik deze</button>'
      + '<button class="stil" id="st-nieuw-nee">weggooien</button></div>'
      + '<small>' + esc(k.file) + ' → ' + esc(pad)
      + '<br>de kaart hiernaast toont hem al — zo beoordeel je hem op de echte plek</small>';
    F('st-nieuw-ja').onclick = () => verwerkBeeld(k.url, 'world', k.file);
    F('st-nieuw-nee').onclick = () => gooiKandidaatWeg(k);
  }
  function gooiKandidaatWeg(k) {
    fetch('/incoming-weg?f=' + encodeURIComponent(k.file), { method: 'POST' })
      .then(r => r.text().then(t => {
        if (!r.ok) return setOut('weggooien lukte niet: ' + t);
        window.__INCOMING = (window.__INCOMING || []).filter(x => x.file !== k.file);
        commit(k.file + ' weggegooid');
      }))
      .catch(() => setOut('weggooien kan alleen via npm run preview'));
  }
  {
    const vak = F('st-art');
    vak.onclick = () => { bezigSlot = 'world'; F('me-file').click(); };
    ['dragenter', 'dragover'].forEach(n => vak.addEventListener(n, e => {
      e.preventDefault(); vak.classList.add('over');
    }));
    ['dragleave', 'dragend'].forEach(n => vak.addEventListener(n, () => vak.classList.remove('over')));
    vak.addEventListener('drop', e => {
      e.preventDefault();
      vak.classList.remove('over');
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (!f) return setOut('daar zat geen bestand bij');
      if (!/^image\//.test(f.type)) return setOut('dat is geen afbeelding: ' + f.name);
      verwerkBeeld(f, 'world');
    });
  }
  let bezigSlot = 'world';
  F('me-file').onchange = e => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (f) verwerkBeeld(f, bezigSlot);
  };
  // een beeld dat per ongeluk naast een regel valt mag de pagina niet vervangen
  ['dragover', 'drop'].forEach(n => addEventListener(n, e => {
    if (!e.target.closest || !e.target.closest('.st-slot, .st-art')) e.preventDefault();
  }));

  /* ---- Een vervangen bestand ook wérkelijk laten zien ----------------------
     Een wereldtekening wordt opnieuw getekend zodra de kaart hertekent, dus die
     zag je meteen. Een globaal beeld niet: het startscherm staat in een
     CSS-regel die allang geladen is, en een bestand op schijf vervangen
     verandert daar niets aan. Je kreeg dus "Gewijzigd" te lezen en keek naar de
     oude tekening -- precies de twijfel die dit gereedschap moet wegnemen.

     Wat hier gebeurt: elke regel en elk element dat naar dít pad wijst krijgt er
     een verse ?v= achter. Generiek en niet op selector, want de studio hoort niet
     te weten wélk scherm welk beeld toont -- dat staat in het stijlblad en mag
     daar veranderen zonder dat hier iets stukgaat. */
  function vernieuwBeeld(pad) {
    if (!pad) return;
    const stempel = 'v=' + Date.now();
    const vers = t => String(t).split(pad).join(pad + '?' + stempel);
    const raakt = t => String(t || '').indexOf(pad) >= 0;
    let n = 0;
    for (const blad of Array.from(document.styleSheets)) {
      let regels;
      // een stijlblad van een ander domein geeft hier een uitzondering; die zijn
      // er niet, maar een gereedschap hoort daar niet op om te vallen
      try { regels = blad.cssRules; } catch (e) { continue; }
      for (const r of Array.from(regels || [])) {
        if (!r.style || !raakt(r.style.backgroundImage)) continue;
        r.style.backgroundImage = vers(r.style.backgroundImage);
        n++;
      }
    }
    document.querySelectorAll('img').forEach(i => {
      if (!raakt(i.getAttribute('src'))) return;
      i.src = vers(i.getAttribute('src').split('?')[0]); n++;
    });
    document.querySelectorAll('[style]').forEach(e => {
      if (!raakt(e.getAttribute('style'))) return;
      e.setAttribute('style', vers(e.getAttribute('style'))); n++;
    });
    return n;
  }
  function laadBeeld(src) {
    return new Promise((ok, fout) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => fout(new Error('kan dit beeld niet lezen'));
      i.src = src;
    });
  }
  async function naarWebp(src, bw, bh, kwal) {
    const img = await laadBeeld(src);
    const c = document.createElement('canvas');
    c.width = bw; c.height = bh;
    const g = c.getContext('2d');
    const sch = Math.max(bw / img.naturalWidth, bh / img.naturalHeight);
    const w = img.naturalWidth * sch, h = img.naturalHeight * sch;
    g.drawImage(img, (bw - w) / 2, (bh - h) / 2, w, h);
    const blob = await new Promise(r => c.toBlob(r, 'image/webp', kwal));
    if (!blob) throw new Error('omzetten naar webp lukte niet');
    return { blob, bron: img.naturalWidth + 'x' + img.naturalHeight };
  }
  /* bron: een bestand uit een sleep of een bladeraar, óf de URL van een kandidaat
     uit incoming/. Dezelfde weg naar binnen voor allebei -- het verschil is waar
     het beeld vandaan komt en niet wat ermee moet gebeuren.

     Drie stappen, en ze kunnen elk apart mislukken. Dat lijkt omslachtig maar het
     is precies het verschil dat eerder ontbrak: hiervoor viel álles in één catch,
     en dan kreeg je "vastzetten kan alleen via npm run preview" te zien terwijl
     het bestand al lang en breed op schijf stond en er iets ná het schrijven
     misging. Een melding die de verkeerde stap aanwijst is erger dan geen melding.

       1  omzetten naar webp   -- in de browser, kan aan het beeld liggen
       2  wegschrijven         -- vraagt de server (npm run preview); zonder server
                                  is dít de stap die "alleen via preview" verdient
       3  het paneel bijwerken -- het bestand staat er dan al; gaat hier iets mis,
                                  dan is de vervanging nog steeds gelukt          */
  async function verwerkBeeld(bron, key, naam) {
    const d = SLOTS[key], pad = slotPad(key);
    if (!pad) {
      setOut(d && d.perWereld && !wereldNu()
        ? 'Kies eerst een wereld — deze tekening hoort bij één wereld.'
        : (d ? d.label : key) + ' staat nog niet in het spel.');
      return;
    }
    const eigen = typeof bron !== 'string';
    const url = eigen ? URL.createObjectURL(bron) : bron;
    const label = naam || (eigen ? bron.name : bron.split('/').pop());
    const opruimen = () => { if (eigen) URL.revokeObjectURL(url); };
    setOut('Omzetten…');

    // 1 -- omzetten
    let blob, maat;
    try {
      const r = await naarWebp(url, d.lever[0], d.lever[1], Number(F('st-kwal').value));
      blob = r.blob; maat = r.bron;
    } catch (err) {
      opruimen();
      meldFout('Afbeelding kon niet worden omgezet (' + label + ')', err,
        'De huidige versie blijft behouden.');
      return;
    }

    // 2 -- wegschrijven. Alleen hier hoort "dit vraagt npm run preview" thuis.
    let txt;
    try {
      const r = await fetch('/asset?to=' + encodeURIComponent(pad), { method: 'POST', body: blob });
      txt = (await r.text()).trim();
      if (!r.ok) throw new Error(txt || ('de server gaf ' + r.status));
    } catch (err) {
      /* Geen server: laat 'm dan tenminste tijdelijk zien -- maar alleen een eigen
         bestand, en alleen een wereldtekening. Een kandidaat uit incoming/ bestaat
         sowieso alleen mét server, en de wereld naar dat pad laten wijzen zou een
         art opleveren die na één opruimbeurt nergens meer heen wijst. */
      const w = wereldNu();
      const tijdelijk = key === 'world' && eigen && w;
      if (tijdelijk) { w.world.art = url; commit(''); }
      console.error('[wereldstudio] ' + pad + ' wegschrijven mislukt', err);
      setOut('Afbeelding kon niet worden vastgezet op ' + pad + '.\n'
        + (tijdelijk ? 'Je ziet hem hiernaast, maar alleen in dit venster.\n'
                     : 'De huidige versie blijft behouden.\n')
        + 'Wegschrijven naar de werkmap vraagt om `npm run preview`.\n'
        + 'Bekijk de console voor technische details.');
      return;
    }

    // 3 -- het bestand staat er. Wat hierna komt kan de vervanging niet meer
    //      ongedaan maken, dus het mag ook niet als mislukking gemeld worden.
    opruimen();
    try {
      OP_SCHIJF[pad] = Math.round(blob.size / 1024);
      delete GEMETEN[pad];
      // dit bestand wijkt nu af van wat er in het spel staat -- ook als het pad
      // hetzelfde bleef, en ook als het geen wereldtekening is
      GEWIJZIGD.add(pad);
      if (key === 'world') { const w = wereldNu(); if (w) w.world.art = pad; }
      // en laat 'm meteen zien in plaats van pas na een herlaadbeurt
      vernieuwBeeld(pad);
      /* Een kandidaat die het gewórden is hoort niet als "nieuw" naast zichzelf te
         blijven staan: hij staat nu in het spel. Weg uit incoming/, stil. */
      if (!eigen) {
        window.__INCOMING = (window.__INCOMING || []).filter(x => x.url !== bron);
        fetch('/incoming-weg?f=' + encodeURIComponent(label), { method: 'POST' }).catch(() => {});
      }
      commit('');
      setOut('Gewijzigd · ' + label + '  ' + maat + ' → ' + txt
        + (eigen ? '' : '\nVervers de pagina: de kaart toont nu nog de kandidaat uit incoming/.'));
    } catch (err) {
      console.error('[wereldstudio] ' + pad + ' is vervangen, maar het paneel bijwerken mislukte', err);
      setOut('Gewijzigd · ' + pad + ' staat op schijf.\n'
        + 'Het paneel kon niet worden bijgewerkt; ververs de pagina.\n'
        + 'Bekijk de console voor technische details.');
    }
  }
  /* Een wereld erbij. Het enige wat je invult is de naam -- het id, het pad van de
     tekening en de twee trofeeën rollen daaruit (zie wereldId/wereldArtPad). Zo hoef
     je voor wereld twaalf niet te weten hoe de bestandsnamen in elkaar zitten.

     Achteraan en nergens anders: een wereld ertussen schuiven hernummert elk level
     erna, en de sterren van een kind hangen aan levelnummers. Acht levels, net als
     alle andere -- dat aantal ligt vast zodra er iemand in speelt. */
  F('st-new').onclick = () => {
    const naam = (prompt('Hoe heet de nieuwe wereld?', 'Wereld ' + (WORLDS.length + 1)) || '').trim();
    if (!naam) return;
    const id = vrijWereldId(naam);
    WORLDS.push({ id, name: naam, icon: '✨', levels: 8 });
    rebuildWorldStarts();
    rebuildWorldBadges();
    goWorld(WORLDS.length - 1);
    setOut(naam + ' erbij — id ' + id + ', tekening hoort op ' + wereldArtPad(id));
  };
  F('st-revert').onclick = () => {
    const g = wereldNu();
    if (!g) { setOut('Geen wereld gekozen — kies er een in de lijst.'); return; }
    const ship = shippedFor(g.world.id);
    if (!ship) { setOut('Deze wereld staat nog niet in het spel.'); return; }
    WORLDS[viewWorldIdx] = JSON.parse(JSON.stringify(ship));
    rebuildWorldStarts();
    commit('teruggezet naar het spel');
  };
  F('st-pull').onclick = () => {
    localStorage.removeItem(WORLD_DRAFT_KEY);
    applyWorldDraft(JSON.parse(JSON.stringify(WORLDS_SHIPPED)));
    viewWorldIdx = Math.min(viewWorldIdx, WORLDS.length - 1);
    commit('concept weg — dit is wat er in het spel staat');
  };
  F('st-push').onclick = () => {
    toonControle(controleer(), true);   // stil bij enkel 'let op', luid bij een fout
    saveWorldDraft();
    fetch('/werelden', { method: 'POST', body: worldsSource() })
      .then(r => r.text().then(t => {
        if (!r.ok) return setOut('mislukt: ' + t);
        WORLDS_SHIPPED.length = 0;
        JSON.parse(JSON.stringify(WORLDS)).forEach(w => WORLDS_SHIPPED.push(w));
        refreshList();
        setOut('in index.html gezet — nu npm test, committen, pushen');
      }))
      .catch(() => setOut('alleen via npm run preview — gebruik anders Kopieer'));
  };
  /* ------------------------------------------------------------ contrast
     De regel die bepaalt of een tekening wérkt stond tot nu toe als advies in de
     briefing: houd de corridor waar de route loopt mid-tot-donker. Dat is een
     oordeel, en je moet het zes keer vellen. De studio heeft de tekening in handen
     en weet waar elke halte staat, dus hij kan het gewoon méten.

     Wat er gemeten wordt: de gemiddelde helderheid van de tekening in precies het
     schijfje waar het rondje komt, en langs de weg. Daar tegenover de kleur van wat
     er óverheen komt. Een halte gaat door drie standen (op slot grijs, gedaan paars,
     nu goud) en moet in alle drie te zien blijven, dus de slechtste telt.

     De verhouding is de gebruikelijke (L1+0,05)/(L2+0,05); onder de 2,0 valt iets
     weg, tussen 2 en 3 is het krap. Een doorzichtige wegkleur wordt eerst over de
     tekening gemengd, want dat is wat je werkelijk ziet. */
  const HERKEN = document.createElement('canvas').getContext('2d');
  function naarRgb(kleur) {
    HERKEN.clearRect(0, 0, 1, 1);
    HERKEN.fillStyle = '#000';
    HERKEN.fillStyle = kleur;
    const v = HERKEN.fillStyle;
    if (v.charAt(0) === '#') {
      const h = v.length === 4
        ? v.slice(1).split('').map(c => parseInt(c + c, 16))
        : [1, 3, 5].map(i => parseInt(v.substr(i, 2), 16));
      return { r: h[0], g: h[1], b: h[2], a: 1 };
    }
    const m = v.match(/[\d.]+/g) || [0, 0, 0];
    return { r: +m[0], g: +m[1], b: +m[2], a: m[3] === undefined ? 1 : +m[3] };
  }
  function lum(c) {
    const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); };
    return .2126 * f(c.r) + .7152 * f(c.g) + .0722 * f(c.b);
  }
  function meng(voor, achter) {
    const a = voor.a;
    return { r: voor.r * a + achter.r * (1 - a), g: voor.g * a + achter.g * (1 - a),
             b: voor.b * a + achter.b * (1 - a), a: 1 };
  }
  function verhouding(a, b) {
    const l1 = Math.max(a, b), l2 = Math.min(a, b);
    return (l1 + .05) / (l2 + .05);
  }
  // gemiddelde kleur van een schijfje in de tekening, in procenten van de tekening
  function schijf(data, br, ho, x, y, straal) {
    const cx = x / 100 * br, cy = y / 100 * ho, r = straal / 100 * br;
    let R = 0, G = 0, B = 0, n = 0;
    for (let dy = -r; dy <= r; dy += 1.5) {
      for (let dx = -r; dx <= r; dx += 1.5) {
        if (dx * dx + dy * dy > r * r) continue;
        const px = Math.round(cx + dx), py = Math.round(cy + dy);
        if (px < 0 || py < 0 || px >= br || py >= ho) continue;
        const i = (py * br + px) * 4;
        R += data[i]; G += data[i + 1]; B += data[i + 2]; n++;
      }
    }
    return n ? { r: R / n, g: G / n, b: B / n, a: 1 } : null;
  }
  async function meetContrast() {
    const w = shown().world;
    if (!w.art) return { fout: 'deze wereld heeft nog geen tekening om te meten' };
    const img = await laadBeeld(w.art + '?m=' + Date.now());
    const br = 304, ho = Math.round(br * ART_H / ART_W);
    const c = document.createElement('canvas');
    c.width = br; c.height = ho;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0, br, ho);
    const data = g.getImageData(0, 0, br, ho).data;

    const frame = map.querySelector('.world-frame');
    const dotStraal = 5.15;   // halve .dot, in procenten van de kaderbreedte
    const kleur = naam => {
      const v = getComputedStyle(frame).getPropertyValue(naam).trim();
      return naarRgb(v || '#fff');
    };
    const goud = kleur('--gold-cta-bottom'), paars = kleur('--purple-shadow');
    const grijs = kleur('--gray-bottom');
    const wegKleur = naarRgb(getComputedStyle(frame).getPropertyValue('--w-road').trim() || 'rgba(255,255,255,.42)');

    /* Wát meten we eigenlijk? Mijn eerste versie zette de vulling van het rondje
       tegen de tekening af, en die vlagde elke tekening af -- terecht op papier,
       onzin in de praktijk. Een halte is een dekkende schijf met een lichte ring
       én een schaduw: op een lichte ondergrond draagt de donkere vulling hem, op
       een donkere de lichte ring. Eén van de twee werkt altijd, en daarom houdt
       die halte zich overal staande. Alleen als ze allebei zwak zijn -- een
       middentoon rond de 35 -- wordt het krap.

       Wat wél stil kan mislukken, en wat je bovendien zélf instelt, is de weg: een
       dunne doorzichtige lijn in een kleur per wereld.

       De sterrenrij heb ik gemeten en er weer uit gehaald. Die vlagde op élke
       ondergrond af, en terecht: gedimde grijze sterretjes zíjn stil, dat is de
       bedoeling -- ze zeggen "hier valt nog iets te halen" en horen niet te
       concurreren met de halte. Een meter die bij elke tekening iets roept, leer je
       negeren, en dan is hij minder waard dan geen meter. */
    const uit = { haltes: [], weg: [], fout: null };
    // de witte ring om een halte (.tour-stop). Staat als waarde in het blad en niet
    // als token -- een doorzichtig wit dat niets betekent schrijven we uit, zie de
    // noot bij de verdwenen --glass-*-familie.
    const ring = naarRgb('rgba(255,255,255,.3)');

    leesNodes().forEach((n, i) => {
      const bg = schijf(data, br, ho, n.x, n.y, dotStraal);
      if (!bg) return;
      const L = lum(bg);
      // de vulling óf de ring mag het dragen -- de beste van de twee telt
      const vulling = Math.max(verhouding(L, lum(paars)), verhouding(L, lum(goud)), verhouding(L, lum(grijs)));
      const opRing = ring.a < 1 ? meng(ring, bg) : ring;
      const beste = Math.max(vulling, verhouding(L, lum(opRing)));
      uit.haltes.push({ nr: i + 1, licht: Math.round(L * 100), v: beste });
    });
    // de weg: halverwege elk stuk, waar het stuurpunt hem heen trekt
    leesCurve().forEach((pt, i) => {
      const bg = schijf(data, br, ho, pt.x, pt.y, 2.5);
      if (!bg) return;
      const opDeWeg = wegKleur.a < 1 ? meng(wegKleur, bg) : wegKleur;
      uit.weg.push({ nr: (i + 1) + '–' + (i + 2), licht: Math.round(lum(bg) * 100),
                     v: verhouding(lum(bg), lum(opDeWeg)) });
    });
    return uit;
  }
  function toonContrast(m) {
    const vak = F('st-contrast');
    vak.hidden = false;
    if (m.fout) { vak.className = 'st-check'; vak.textContent = m.fout; return; }
    /* Drempels verschillen per ding, want ze falen anders. Een halte heeft de beste
       van vulling en ring, en die zakt alleen in een smalle middentoonband; de weg en
       de sterretjes zijn dún en doorzichtig en hebben meer nodig. */
    const zwak = { halte: 1.8, weg: 2.5 };
    const merk = (v, g) => v < g ? 'ct-fout' : v < g * 1.3 ? 'ct-let' : 'ct-goed';
    const teken = (v, g) => v < g ? '⚠' : v < g * 1.3 ? '·' : '✓';
    const regel = (naam, o, g) => '<span class="' + merk(o.v, g) + '">' + teken(o.v, g) + ' ' + naam
      + '</span> licht ' + o.licht + ' · contrast ' + o.v.toFixed(1);

    const slechtH = m.haltes.filter(o => o.v < zwak.halte * 1.3);
    const slechtW = m.weg.filter(o => o.v < zwak.weg * 1.3);
    if (!slechtH.length && !slechtW.length) {
      vak.className = 'st-check schoon';
      const alles = m.haltes.concat(m.weg);
      vak.innerHTML = '✓ alles blijft te zien — laagste contrast '
        + Math.min.apply(null, alles.map(o => o.v)).toFixed(1);
      return;
    }
    vak.className = 'st-check';
    const stukken = [];
    if (slechtH.length) stukken.push(slechtH.map(o => regel('halte ' + o.nr, o, zwak.halte)).join('<br>'));
    if (slechtW.length) {
      stukken.push(slechtW.map(o => regel('weg ' + o.nr, o, zwak.weg)).join('<br>'));
      // het advies volgt uit de stukken die fálen, niet uit het eerste stuk
      const gem = slechtW.reduce((n, o) => n + o.licht, 0) / slechtW.length;
      stukken.push('<span class="ct-let">·</span> zet <b>weg</b> '
        + (gem > 45 ? 'donkerder' : 'lichter') + ' voor deze wereld');
    }
    vak.innerHTML = stukken.join('<br>');
  }
  F('st-contrast-knop').onclick = async () => {
    F('st-contrast').hidden = false;
    F('st-contrast').className = 'st-check';
    F('st-contrast').textContent = 'meten\u2026';
    try { toonContrast(await meetContrast()); }
    catch (e) { F('st-contrast').textContent = 'meten lukte niet: ' + pixelFout(e); }
  };

  /* ------------------------------------------------------- kleuren voorstellen
     Vier kleuren per wereld, en ze horen bij de tekening. Ze met de hand uit een
     beeldbewerker halen is precies het soort werk dat de studio kan overnemen: de
     tekening is hier al geladen en de plekken die ertoe doen liggen vast.

       lucht    het gemiddelde van de bovenste strook -- daar begint het verloop
       diepte   het gemiddelde van de onderste strook, een slag donkerder
       gloed    de sterkst verzadigde tint in de ónderste helft, want dáár komt de
                veeg te liggen
       weg      niet uit de tekening maar tégen de tekening: de helderheid die het
                beste afsteekt tegen het donkerste stuk van de route, want dit is
                de enige van de vier die je altíjd ziet

     Het blijft een vóórstel. Het vult de vier velden en je ziet het meteen op de
     kaart; alles eraan is met één tik te overschrijven en "↺ standaard" zet ze
     terug. Er wordt niets automatisch herontworpen -- de studio stelt voor, jij
     beslist. */
  function naarHsl(c) {
    const r = c.r / 255, g = c.g / 255, b = c.b / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    let h = 0;
    if (d) {
      if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0));
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    const l = (mx + mn) / 2;
    return { h, s: d ? d / (1 - Math.abs(2 * l - 1)) : 0, l };
  }
  function hslHex(h, sa, l) {
    const c = (1 - Math.abs(2 * l - 1)) * sa, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
    const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
      : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    const q = v => Math.max(0, Math.min(255, Math.round((v + m) * 255))).toString(16).padStart(2, '0');
    return '#' + q(r) + q(g) + q(b);
  }
  // gemiddelde kleur van een horizontale strook, in procenten van de hoogte
  function strook(data, br, ho, y0, y1) {
    let R = 0, G = 0, B = 0, n = 0;
    for (let y = Math.round(y0 / 100 * ho); y < Math.round(y1 / 100 * ho); y += 2) {
      for (let x = 0; x < br; x += 2) {
        const i = (y * br + x) * 4;
        R += data[i]; G += data[i + 1]; B += data[i + 2]; n++;
      }
    }
    return n ? { r: R / n, g: G / n, b: B / n, a: 1 } : null;
  }
  async function kleurenUitTekening() {
    const w = shown().world;
    if (!w.art) throw new Error('deze wereld heeft nog geen tekening om uit te lezen');
    const img = await laadBeeld(w.art + '?k=' + Date.now());
    const br = 160, ho = Math.round(br * ART_H / ART_W);
    const c = document.createElement('canvas');
    c.width = br; c.height = ho;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0, br, ho);
    const data = g.getImageData(0, 0, br, ho).data;

    const boven = naarHsl(strook(data, br, ho, 0, 14));
    const onder = naarHsl(strook(data, br, ho, 84, 100));
    /* De gloed is de veeg ónderaan het kader (zie .world-frame.no-art), dus die
       wordt daar gezocht en niet in de hele tekening: het gemiddelde van de sterkst
       verzadigde tiende van de onderste veertig procent. Zocht dit over het hele
       beeld, dan won op een junglekaart het bladgroen bovenin -- een kleur die op
       de plek waar de gloed komt te liggen nergens voorkomt. */
    const punten = [];
    for (let y = Math.round(ho * .6); y < ho; y += 3) for (let x = 0; x < br; x += 3) {
      const i = (y * br + x) * 4;
      punten.push(naarHsl({ r: data[i], g: data[i + 1], b: data[i + 2] }));
    }
    punten.sort((a, b) => (b.s * b.l) - (a.s * a.l));
    const top = punten.slice(0, Math.max(1, Math.round(punten.length / 10)));
    const gloedH = top.reduce((n, o) => n + o.h, 0) / top.length;
    const gloedS = top.reduce((n, o) => n + o.s, 0) / top.length;

    /* De weg komt niet úít de tekening maar staat eróp, dus hij wordt niet
       bemonsterd maar gekozen: licht of donker, net wat het beste afsteekt tegen de
       corridor waar de route werkelijk loopt. Precies de verhouding die "meet het
       contrast" straks narekent -- dus de knop stelt niet iets voor wat de meter
       een tel later afkeurt. De tint komt van de gloed, zodat de weg bij de wereld
       hoort in plaats van er als een vreemd wit lint overheen te liggen. */
    const langsDeWeg = leesCurve().map(pt => schijf(data, br, ho, pt.x, pt.y, 4)).filter(Boolean);
    if (!langsDeWeg.length) langsDeWeg.push({ r: 70, g: 40, b: 100, a: 1 });
    const kandidaat = l => hslHex(gloedH, .22, l);
    /* Niet het gemiddelde maar het slechtste stuk telt -- precies zoals "meet het
       contrast" het narekent. Een weg die gemiddeld goed staat maar in het donkerste
       stuk wegvalt is een weg die wegvalt. .68 is de dekking waarmee .tour-road-bg
       werkelijk over de tekening ligt. */
    const scoor = hex => Math.min.apply(null, langsDeWeg.map(bg =>
      verhouding(lum(bg), lum(meng(Object.assign(naarRgb(hex), { a: .68 }), bg)))));
    // Alle helderheden langslopen en de beste nemen. Twee kandidaten (licht of
    // donker) waren genoeg zolang een tekening één toon had; op een kaart die van
    // een donkere grot naar een lichte waterval loopt ligt het optimum ertussenin.
    const reeks = [];
    for (let l = .1; l <= .95; l += .02) { const hex = kandidaat(l); reeks.push({ hex, sc: scoor(hex) }); }
    const besteScore = Math.max.apply(null, reeks.map(o => o.sc));
    /* Van alles wat bijna even goed leest de líchtste. Puur op de hoogste score
       kwam er op een donkere wereld een bijna zwarte weg uit: meetbaar leesbaar,
       maar een weg hoort een verlicht pad te zijn en geen schaduw. Binnen 8% van
       het optimum maakt het voor de ogen niets uit en voor het beeld alles. */
    const beste = reeks.filter(o => o.sc >= besteScore * .92).pop().hex;
    return {
      sky:  hslHex(boven.h, Math.min(.72, Math.max(.2, boven.s)), Math.min(.42, Math.max(.16, boven.l))),
      deep: hslHex(onder.h, Math.min(.7, Math.max(.25, onder.s)), Math.min(.16, Math.max(.05, onder.l * .45))),
      glow: hslHex(gloedH, Math.min(.62, Math.max(.28, gloedS)), .34),
      road: beste,
    };
  }
  /* Een tekening van schijf uitlezen mag niet over file:// -- de browser vervuilt
     het canvas en weigert de pixels. Over http (npm run preview) mag het wél, en
     dat is toch al waar de studio hoort te draaien. Die uitleg hoort in de melding
     te staan; "tainted by cross-origin data" helpt niemand verder. */
  const pixelFout = e => {
    console.error('[wereldstudio] de pixels van de tekening uitlezen mislukte', e);
    if (/tainted|cross-origin|SecurityError/i.test(String(e && e.message))) {
      return 'De tekening uitlezen kan alleen via npm run preview'
        + '\n(over file:// geeft de browser de pixels niet vrij).';
    }
    /* Elke andere storing: zeggen wát er misging en waar de rest staat, in plaats
       van een kale uitzondering onderin het paneel. */
    return 'De tekening kon niet worden uitgelezen.\nDe kleuren blijven zoals ze staan.'
      + '\nBekijk de console voor technische details.';
  };
  F('st-kleur-art').onclick = async () => {
    setOut('kleuren uitlezen…');
    try {
      const voor = await kleurenUitTekening();
      Object.keys(voor).forEach(k => { F('mf-' + k).value = voor[k]; });
      readSheet();
      setOut('voorstel uit de tekening — pas aan wat je anders wilt, of ↺ standaard');
    } catch (e) { setOut(pixelFout(e)); }
  };
  F('st-kleur-terug').onclick = () => {
    Object.keys(HEX).forEach(k => { F('mf-' + k).value = HEX[k]; });
    readSheet();
    setOut('kleuren terug naar de standaard van de app');
  };

  /* ------------------------------------------------------- controle vooraf
     Wát er mis kan zijn staat niet hier maar bij de werelden zelf (zie
     wereldControle): dat is een uitspraak over een wereld en niet over dit paneel,
     en een test kan hem zo aanroepen zonder eerst een studio te openen. Hier staat
     alleen hoe het eruitziet.

     Elk punt draagt het vak waar je het oplost (`waar`). Een waarschuwing die zegt
     wat er mis is maar niet waar je heen moet, laat je zoeken -- en dan is het
     goedkoper om hem te negeren. */
  const WAAR_HEET = { tekening: 'Tekening', gegevens: 'Gegevens', beloning: 'Beloning',
                      haltes: 'Haltes & weg', lijst: 'Welke wereld' };
  function toonControle(punten, stil) {
    const vak = F('st-check');
    if (!vak) return;
    if (!punten.length) {
      vak.className = 'st-check schoon';
      vak.hidden = false;
      vak.innerHTML = '✓ ' + WORLDS.length + ' werelden nagekeken, niets aan de hand';
      return;
    }
    if (stil && !punten.some(x => x.ernst === 'fout')) { vak.hidden = true; return; }
    vak.className = 'st-check';
    vak.hidden = false;
    /* Fouten eerst, opmerkingen daarna -- door elkaar op wereldvolgorde verdronk het
       ene in het andere. En "nog geen tekening" bij drie of meer werelden is in het
       begin gewoon de stand van zaken, dus dat wordt een regel in plaats van zes.
       Hetzelfde geldt voor een nog niet gekozen beloning. */
    let lijst = punten;
    [/nog geen tekening/, /geen beloning/].forEach(re => {
      const zonder = lijst.filter(x => re.test(x.t));
      if (zonder.length > 2) {
        lijst = lijst.filter(x => !re.test(x.t));
        lijst.push({ ernst: 'let op', w: zonder.length + ' werelden', t: zonder[0].t, waar: zonder[0].waar });
      }
    });
    lijst = lijst.slice().sort((a, c) => (a.ernst === 'fout' ? 0 : 1) - (c.ernst === 'fout' ? 0 : 1));
    vak.innerHTML = lijst.map(x =>
      '<span class="' + (x.ernst === 'fout' ? 'ct-fout' : 'ct-let') + '">'
      + (x.ernst === 'fout' ? '⚠' : '·') + ' ' + esc(x.w) + '</span> ' + esc(x.t)
      + (WAAR_HEET[x.waar] ? ' <em style="color:#9c86bd;font-style:normal">→ ' + WAAR_HEET[x.waar] + '</em>' : '')).join('<br>');
  }
  const controleer = () => wereldControle(OP_SCHIJF);
  F('st-check-knop').onclick = () => toonControle(controleer(), false);
  /* Wat er verandert als je nu op "Zet in het spel" drukt. Eén vraag die je vlak
     voor het vastleggen hebt en die nergens beantwoord werd: welke werelden wijken
     af van wat kinderen spelen, en waarin. Geen diff-viewer -- een regel per wereld
     is genoeg om te weten of je het bedoelde. */
  function tekenDiff() {
    const vak = F('st-diff');
    if (!vak) return;
    const regels = [];
    WORLDS.forEach((w, i) => {
      const staat = worldState(w);
      if (staat === 'gelijk') return;
      const ship = shippedFor(w.id);
      const wat = [];
      if (!ship) wat.push('nieuw');
      else {
        if (ship.name !== w.name) wat.push('naam');
        if (ship.icon !== w.icon) wat.push('icoon');
        if (ship.art !== w.art) wat.push('tekening');
        if (ship.beloning !== w.beloning) wat.push('beloning');
        if (JSON.stringify(ship.theme || {}) !== JSON.stringify(w.theme || {})) wat.push('kleuren');
        if (JSON.stringify(ship.nodes || []) !== JSON.stringify(w.nodes || [])) wat.push('haltes');
        if (JSON.stringify(ship.curve || []) !== JSON.stringify(w.curve || [])) wat.push('weg');
        if (!wat.length) wat.push('gewijzigd');
      }
      regels.push('<span class="ct-let">·</span> ' + esc((w.icon || '') + ' ' + w.name)
        + ' — ' + wat.join(', '));
    });
    const weg = WORLDS_SHIPPED.filter(o => !WORLDS.some(w => w.id === o.id));
    weg.forEach(o => regels.push('<span class="ct-fout">⚠</span> ' + esc(o.name) + ' — staat niet meer in de lijst'));
    /* De beelden. Ze staan hier apart en niet bij de wereld die ze gebruikt: een
       beeld hoort bij een bestand, en "Zet in het spel" schrijft alleen het
       WORLDS-blok -- de bestanden staan er al. Wat ze gemeen hebben is de commit,
       en dát is de vraag die dit vak beantwoordt. */
    [...GEWIJZIGD].sort().forEach(f =>
      regels.push('<span class="ct-let">·</span> ' + esc(f) + ' — beeld gewijzigd'));
    vak.className = 'st-check' + (regels.length ? '' : ' schoon');
    vak.innerHTML = regels.length
      ? regels.join('<br>')
      : '✓ je concept is gelijk aan wat er in het spel staat';
  }

  /* ----------------------------------------------------- een écht venster
     Het vak hiernaast heeft telefoon-verhoudingen en container-queries, dus het
     klopt -- maar het is nog altijd één venster op een bureaublad. De noodstand
     voor liggend en voor lage schermen kijkt naar het vénster, en die zie je hier
     dus nooit. Eén knop maakt er een echt venster van: het echte spel, op ware
     toestelmaat, met het concept erin (dat staat in localStorage en het venster
     draait ?debug).

     Geen iframe: dat vecht met de servicewerker en met het lettertype dat het
     laden ophoudt. En geen vinkjeslijst meer: gewoon de maat die hiernaast
     aanstaat, of met Shift alle maten naast elkaar als je ze wilt vergelijken.

     fit= zegt het venster wélke binnenmaat het hoort te hebben. Nodig omdat
     width/height van window.open de BUITENmaat zetten -- en een browser mag daar
     bovendien een minimum op leggen (op Windows ~500px breed). Dan krijg je
     stiekem een breder venster, valt de kaart in de kolomstand en zie je
     gekleurde randen die op een telefoon niet bestaan. Het venster corrigeert
     zichzelf en zegt eronder wat het écht geworden is. */
  function toonVoorbeeld(maten) {
    if (!maten.length) { setOut('kies eerst een toestelmaat'); return; }
    saveWorldDraft();
    const scherm = F('st-vscherm').value;
    let x = 60;
    maten.forEach(m => {
      const w = Number(m.split('x')[0]), h = Number(m.split('x')[1]);
      const url = location.pathname + '?debug&demo&star=p1&screen=' + scherm + '&fit=' + w + 'x' + h;
      const win = open(url, 'wsvoorbeeld' + w + 'x' + h,
        `popup=1,width=${w},height=${h},left=${x},top=80`);
      if (!win) { setOut('het venster werd geblokkeerd — sta pop-ups toe'); return; }
      x += Math.min(w, 520) + 20;
    });
    setOut(maten.length + ' venster(s) geopend — ververs ze na een wijziging');
  }
  F('st-venster').onclick = e => {
    if (e.shiftKey) return toonVoorbeeld(MATEN.map(m => m.id));
    const m = toestelKiezer.value;
    toonVoorbeeld(m ? [m] : [MATEN[0].id]);
  };

  F('st-commit').onclick = () => {
    const bericht = F('st-msg').value.trim();
    if (bericht.length < 8) { setOut('geef eerst een bericht'); F('st-msg').focus(); return; }
    const knop = F('st-commit');
    knop.disabled = true;
    setOut('testen draaien… dit duurt een minuut of twee');
    fetch('/commit', { method: 'POST', body: bericht })
      .then(r => r.text().then(t => {
        setOut(t);
        // vastgelegd = git is schoon: de beelden staan nu in het spel
        if (r.ok) { F('st-msg').value = ''; GEWIJZIGD.clear(); tekenDiff(); refreshStatus(); }
      }))
      .catch(() => setOut('alleen via npm run preview'))
      .then(() => { knop.disabled = false; });
  };
  /* Publiceren in twee stappen: eerst kijken wát er zou landen, dan pas doen. */
  let publishKlaar = false;
  F('st-publish').onclick = () => {
    const knop = F('st-publish');
    const fase = publishKlaar ? 'go' : 'kijk';
    knop.disabled = true;
    setOut(fase === 'go' ? 'testen draaien, daarna samenvoegen…' : 'kijken wat er zou landen…');
    fetch('/publish', { method: 'POST', body: fase })
      .then(r => r.text().then(txt => {
        if (!r.ok) { setOut(txt); publishKlaar = false; knop.textContent = '🚀 publiceer naar main'; return; }
        if (fase === 'go') {
          setOut(txt);
          publishKlaar = false;
          knop.textContent = '🚀 publiceer naar main';
          knop.classList.remove('prim');
          return;
        }
        const m = /^KLAAR:(\d+)\n([\s\S]*)$/.exec(txt);
        setOut(m ? m[2] : txt);
        publishKlaar = true;
        knop.textContent = '🚀 bevestig — ' + (m ? m[1] : '?') + ' naar main';
        knop.classList.add('prim');
      }))
      .catch(() => setOut('alleen via npm run preview'))
      .then(() => { knop.disabled = false; });
  };

  F('st-copy').onclick = () => {
    const txt = worldsSource();
    dump.textContent = txt + '\n\n(tik om te sluiten)';
    dump.style.display = 'block';
    try { navigator.clipboard.writeText(txt); setOut('gekopieerd'); }
    catch (_) { setOut('zie het venster'); }
    console.log(txt);
  };
  F('st-paste').onclick = () => {
    const txt = prompt('Plak een WORLDS-blok of de JSON-lijst:');
    if (!txt) return;
    try {
      const m = /\[[\s\S]*\]/.exec(txt);
      if (!m) throw new Error('geen lijst gevonden');
      const list = (new Function('return (' + m[0] + ')'))();
      if (!Array.isArray(list) || !list.every(w => w && w.id && w.levels > 0)) throw new Error('geen geldige werelden');
      applyWorldDraft(list);
      viewWorldIdx = 0;
      goWorld(0);
      setOut(list.length + ' werelden ingelezen');
    } catch (e) { setOut('niet gelukt: ' + e.message); }
  };

  /* ---------------------------------------------------------------- kiezen
     De geselecteerde halte of stuurpunt: krijgt een ring, zijn x en y komen in twee
     invoervelden, en de pijltjes verschuiven 'm. 0,2% per tik, 1% met Shift -- dat is
     op een tekening van 2160 hoog ruim 4 respectievelijk 21 pixels. */
  const STAP = 0.2;
  function kies(nieuw) {
    sel = nieuw;
    markeerSelectie();
    vulXY();
  }
  function markeerSelectie() {
    const frame = map.querySelector('.world-frame');
    if (!frame) return;
    frame.querySelectorAll('.gekozen').forEach(e => e.classList.remove('gekozen'));
    const el = selEl(frame);
    if (el) el.classList.add('gekozen');
  }
  function selEl(frame) {
    if (!sel) return null;
    return sel.wat === 'weg'
      ? frame.querySelector('.me-ctrl[data-ctrl="' + sel.i + '"]')
      : frame.querySelector('.tour-stop[data-lvl="' + (shown().first + sel.i) + '"]');
  }
  function selLijst() { return sel && sel.wat === 'weg' ? ownCurve() : ownNodes(); }
  function vulXY() {
    const vak = F('st-xy');
    if (!vak) return;
    vak.hidden = !sel;
    if (!sel) return;
    const punt = selLijst()[sel.i];
    if (!punt) return;
    F('st-wat').textContent = (sel.wat === 'weg' ? 'weg ' : 'halte ') + (sel.i + 1);
    F('st-x').value = punt.x.toFixed(1);
    F('st-y').value = punt.y.toFixed(1);
  }
  function zetXY(x, y) {
    if (!sel) return;
    const punt = selLijst()[sel.i];
    if (!punt) return;
    punt.x = Math.max(0, Math.min(100, x));
    punt.y = Math.max(0, Math.min(100, y));
    commit('');
    markeerSelectie();
    vulXY();
  }
  document.addEventListener('keydown', e => {
    if (!document.body.classList.contains('mapedit')) return;
    const inVeld = /^(INPUT|SELECT|TEXTAREA)$/.test((e.target.tagName || ''));
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault(); stapTerug(); return;
    }
    if (inVeld || !sel) return;
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!d) return;
    e.preventDefault();
    const stap = STAP * (e.shiftKey ? 5 : 1);
    const punt = selLijst()[sel.i];
    if (!punt) return;
    if (!e.repeat) bewaarStap('verschuiven met de pijltjes');
    zetXY(punt.x + d[0] * stap, punt.y + d[1] * stap);
  });

  // ---------------------------------------------------------------- slepen
  let drag = null;
  map.addEventListener('pointerdown', e => {
    const frame = map.querySelector('.world-frame');
    if (!frame || !e.target.closest) return;
    const ctrl = e.target.closest('.me-ctrl');
    const stop = ctrl ? null : e.target.closest('.tour-stop');
    if (!ctrl && !stop) return;
    bewaarStap(ctrl ? 'weg verslepen' : 'halte verslepen');
    drag = ctrl
      ? { el: ctrl, frame, list: ownCurve(), i: Number(ctrl.dataset.ctrl), wat: 'weg' }
      : { el: stop, frame, list: ownNodes(), i: Number(stop.dataset.lvl) - shown().first, wat: 'halte' };
    kies({ wat: drag.wat, i: drag.i });
    drag.el.classList.add('dragging');
    try { drag.el.setPointerCapture(e.pointerId); } catch (_) {}
    e.preventDefault(); e.stopPropagation();
  }, true);
  map.addEventListener('pointermove', e => {
    if (!drag) return;
    const r = drag.frame.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, (e.clientX - r.left) / r.width * 100));
    const y = Math.max(0, Math.min(100, (e.clientY - r.top) / r.height * 100));
    const p = drag.list[drag.i];
    if (!p) return;
    p.x = x; p.y = y;
    drag.el.style.left = x + '%';
    drag.el.style.top = y + '%';
    redrawRoad();
    setOut(`${drag.wat} ${drag.i + 1}   x ${x.toFixed(1)}   y ${y.toFixed(1)}`);
    e.preventDefault(); e.stopPropagation();
  }, true);
  const endDrag = () => {
    if (!drag) return;
    drag.el.classList.remove('dragging');
    map.addEventListener('click', ev => { ev.stopPropagation(); ev.preventDefault(); },
      { capture: true, once: true });
    drag = null;
    saveWorldDraft();
    refreshList();
  };
  map.addEventListener('pointerup', endDrag, true);
  map.addEventListener('pointercancel', endDrag, true);

  viewWorldIdx = Math.min(worldFor(P().level).index, WORLDS.length - 1);
  goWorld(viewWorldIdx);
  zetToestel(toestelKiezer.value);

  /* &nieuw -- meteen in "een wereld erbij". De ontwikkelstudio (npm run studio)
     heeft een knop "Wereld toevoegen", en die hoort hier uit te komen en niet in
     een tweede formulier: het maken van een wereld gebeurt óp de kaart, en dit
     paneel is die plek al. Eén vlag scheelt dus een heel tweede begrip van
     "nieuwe wereld" dat met dit paneel uit de pas zou lopen. */
  if (new URLSearchParams(location.search).has('nieuw')) F('st-new').click();
}

