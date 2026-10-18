/* Gebouwd door npm run bouw uit src/90-wereldstudio.js -- bewerk het daar, niet hier. */











































function startMapEdit() {
  const map = $('tour-map');
  const F = id => document.getElementById(id);




  const navRect = $('main-nav').getBoundingClientRect();
  const ONDER_PX = navRect.height ? (innerHeight - navRect.top) + 8 : 100;
  document.body.classList.add('mapedit');




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
    body.mapedit.st-kijken :is(.me-ctrl, .me-safe, .me-snee, .me-kopband, .me-onder, .me-grid) { display: none; }

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
      border-bottom: 1px solid rgba(255,255,255,.14);
      /* minmax(0, ..): anders is de kolom zo breed als de langste optie in een
         keuzelijst, en viel de knop aan het eind van de rij buiten het paneel --
         precies de ▶ waarmee je een wereld probeert */
      grid-template-columns: minmax(0, 1fr); }
    #studio .st-kijk .kr { display: flex; align-items: center; gap: 6px; }
    #studio .st-kijk label { color: #b79ae0; font-size: 12px; width: 46px; flex: none; }
    #studio .st-kijk select { flex: 1; min-width: 0; padding: 4px 6px; }
    #studio .st-kijk button { padding: 4px 8px; line-height: 1; }
    #studio .st-kijk em { font-style: normal; font-size: 11px; color: #9c86bd;
      font-family: ui-monospace, monospace; white-space: nowrap; }
    #studio .st-kijk .maat { padding-left: 46px; }
    #studio.dicht .st-kijk { display: none; }
    /* De vier stappen: één rij, en de stap waar je bent licht op. */
    #studio .st-stappen { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2px;
      padding: 6px 8px 0; border-bottom: 1px solid rgba(255,255,255,.14); }
    #studio .st-stappen button { border: 0; background: none; border-radius: 7px 7px 0 0;
      padding: 7px 2px; font-size: 11.5px; color: #b79ae0; border-bottom: 2px solid transparent; }
    #studio .st-stappen button.on { color: #fff; background: rgba(255,255,255,.08);
      border-bottom-color: #7dffb4; font-weight: 600; }
    #studio .st-nav { flex: none; display: flex; gap: 6px; padding: 8px 12px;
      border-top: 1px solid rgba(255,255,255,.14); }
    #studio .st-nav #st-verder { margin-left: auto; }
    #studio.dicht .st-stappen, #studio.dicht .st-nav { display: none; }
    #studio button.groot { padding: 10px 16px; font-size: 14px; }
    #studio .st-top b#st-wnaam { text-transform: none; letter-spacing: 0; font-size: 14px;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
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
    /* Een wereld erbij, zonder prompt(): een veld en een knop, op de plek waar de
       lijst staat. Een modaal venster haalt je uit het werk; dit niet. */
    #studio .st-nieuwrij { display: flex; gap: 6px; margin-top: 6px; }
    #studio .st-nieuwrij input { flex: 1; min-width: 0; }
    #studio .st-noot { color: #9c86bd; font-size: 11.5px; margin: 6px 0 0; }
    #studio .st-vink { display: flex; align-items: center; gap: 7px; margin: 4px 0 6px;
      font-size: 12px; color: #e6dbf5; cursor: pointer; }
    #studio .st-vink input { width: 15px; height: 15px; margin: 0; }
    #studio .st-row input[type=range] { padding: 0; }
    /* De twee uitklapvakken met een prompt en de schat-tekentafel. Hun velden
       staan in .st-prow en niet in .st-row: élk veld in een .st-row schrijft bij
       een wijziging de wereld weg (readSheet), en een idee of een thema is geen
       wereldgegeven. */
    #studio .st-prow { display: grid; grid-template-columns: 74px 1fr; gap: 6px; align-items: center; margin-bottom: 6px; }
    #studio .st-prow label { color: #b79ae0; font-size: 12px; }
    #studio .st-prow input { width: 100%; min-width: 0; }
    #studio .st-prow input[type=range] { padding: 0; }
    #studio details.st-prompt, #studio details.st-schat { margin: 8px 0 0; padding: 7px 9px;
      border-radius: 8px; background: rgba(255,255,255,.04); border: 1px dashed rgba(255,255,255,.2); }
    #studio details.st-prompt > summary, #studio details.st-schat > summary { cursor: pointer;
      font-size: 12px; color: #e6dbf5; }
    #studio details[open].st-prompt > summary, #studio details[open].st-schat > summary { margin-bottom: 8px; }
    #studio details.st-schat .st-btns { margin: 4px 0 6px; }
    #studio textarea { width: 100%; box-sizing: border-box; min-height: 58px; resize: vertical;
      font: 11px/1.4 ui-monospace, monospace; color: #fff; background: rgba(255,255,255,.08);
      border: 1px solid rgba(255,255,255,.22); border-radius: 7px; padding: 6px 8px; margin-bottom: 6px; }
    #studio textarea.over { border-color: rgba(120,255,180,.85); background: rgba(120,255,180,.12); }
    /* Het voorbeeld: de schat op allebei de paspoppen, en het miniatuur zoals de
       kleedkamer het toont -- de drie plekken waar een kind hem ziet. */
    #studio .st-sc-vb { display: grid; grid-template-columns: 1fr 1fr 58px; gap: 6px; align-items: end;
      margin-bottom: 6px; }
    #studio .st-sc-vb > div { border-radius: 8px; background: rgba(0,0,0,.28); text-align: center;
      font-size: 10px; color: #9c86bd; padding: 3px 2px 2px; }
    #studio .st-sc-vb svg { display: block; width: 100%; height: auto; }
    #studio .st-sc-vb .mini svg { height: 52px; }
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
    #studio button:disabled { opacity: .4; cursor: default; }
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
      <b id="st-wnaam">Wereldstudio</b>
      <span class="st-chip" id="st-status">—</span>
      <button id="st-uitleg" title="Uitleg aan/uit">?</button>
      <button id="st-fold" title="In-/uitklappen">⇥</button>
    </div>
    <div class="st-stappen">
      <button data-stap="1" class="on">1 Kaart</button>
      <button data-stap="2">2 Haltes</button>
      <button data-stap="3">3 Schat</button>
      <button data-stap="4">4 Publiceren</button>
    </div>
    <div class="st-body">

      <section data-stap="1">
        <p class="st-let" id="st-concept" hidden></p>
        <div class="st-row"><label>icoon</label><input id="mf-icon" maxlength="4"></div>
        <div class="st-row"><label>naam</label><input id="mf-name"></div>
        <h6>Tekening</h6>
        <div class="st-art" id="st-art">
          <span class="vb" id="st-art-vb">＋</span>
          <span><b id="st-art-st">nog geen tekening</b><small id="st-art-info"></small></span>
        </div>
        <p class="st-let" id="st-art-let" hidden></p>
        <div class="st-nieuw" id="st-art-nieuw" hidden></div>
        <p class="st-hint">Sleep een beeld op het vak, of tik erop. Elke maat mag: de studio snijdt
          hem bij, verkleint hem en zet de kleuren en de zaal er automatisch bij.</p>
        <details class="st-prompt" id="st-kaartprompt" hidden>
          <summary>✨ Prompt voor de tekening</summary>
          <div class="st-prow"><label>thema</label><input id="kp-thema"></div>
          <div class="st-prow"><label>inspiratie</label><input id="kp-insp" placeholder="optioneel"></div>
          <div class="st-btns"><button id="kp-kopieer">Kopieer de prompt</button></div>
        </details>
        <details class="st-geav" id="st-fijn">
          <summary>Kleuren &amp; zaal · automatisch</summary>
          <div class="st-kleur">
            <div>weg<input id="mf-road" type="color" title="de gestippelde weg tussen de haltes"></div>
            <div>lucht<input id="mf-sky" type="color" title="alleen zonder tekening, en de rand in liggende stand"></div>
            <div>diepte<input id="mf-deep" type="color" title="de vloer onder de show, en de rand in liggende stand"></div>
            <div>gloed<input id="mf-glow" type="color" title="alleen zonder tekening"></div>
          </div>
          <div class="st-btns" style="margin-top:6px">
            <button id="st-kleur-art">🎨 opnieuw uit de tekening</button>
            <button class="stil" id="st-kleur-terug">↺ standaard</button>
          </div>
          <div class="st-row" style="margin-top:10px"><label>zaal</label>
            <input id="mf-dim" type="range" min="0" max="1" step="0.01"></div>
          <p class="st-afgeleid" id="mf-dim-uit"></p>
          <div class="st-btns" style="margin-top:4px">
            <button id="st-zaal-kijk" title="de eerste show van deze wereld, op de gekozen toestelmaat">▶ bekijk in de show</button>
            <button class="stil" id="st-zaal-terug">↺ standaard</button>
          </div>
          <p class="st-hint">De <b>weg</b> zie je altijd op de kaart. Lucht, diepte en gloed zie je in de
            show (de diepte is de vloer) en op de kaart alleen zonder tekening of aan de rand in
            liggende stand. De <b>zaal</b> is de wazige tekening achter de sommen in
            een show: hoe lichter de tekening, hoe donkerder hij moet. De studio kiest beide zelf als
            je een tekening neerzet.</p>
        </details>
      </section>

      <section data-stap="2" hidden>
        <p class="st-waarschuwing" id="st-onder" hidden></p>
        <p class="st-noot">Sleep de rondjes naar de plekken op de tekening, en de groene ruitjes om de weg te buigen.</p>
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
        <p class="st-hint">Tik een halte of ruitje aan en verschuif hem met de pijltjes (Shift = vijf keer
          zo grof), of tik de getallen in. Ctrl+Z neemt terug.</p>
        <details class="st-geav">
          <summary>Hulpmiddelen</summary>
          <div class="st-btns">
            <button id="st-zone" class="on">⬚ veilige zone</button>
            <button id="st-grid">▦ raster</button>
            <button id="st-curve" class="on">∿ stuurpunten</button>
            <button id="st-sterren">👧 ster overal</button>
          </div>
          <div class="st-btns" style="margin-top:6px">
            <button id="st-contrast-knop">🔍 meet het contrast</button>
          </div>
          <div class="st-check" id="st-contrast" hidden></div>
          <p class="st-hint">Het contrast meet de tekening precies waar de haltes en de weg komen. De
            weg is het gevoeligst: die is dun en doorzichtig.</p>
        </details>
      </section>

      <section data-stap="3" hidden>
        <div class="st-bel" id="st-bel">
          <span class="vb" id="st-bel-vb"></span>
          <span><b id="st-bel-naam">—</b><small id="st-bel-uit"></small></span>
          <button id="st-bel-kijk">bekijk</button>
        </div>
        <select id="mf-beloning" hidden></select>
        <div class="st-schat" id="st-schat">
          <h6>Je eigen schat</h6>
          <div class="st-prow"><label>emoji</label><input id="sc-emoji" maxlength="4"></div>
          <div class="st-prow"><label>naam</label><input id="sc-naam" placeholder="bv. Regenboogkroon"></div>
          <textarea id="sc-svg" rows="3" spellcheck="false"
            placeholder="plak hier de SVG, of sleep een .svg-bestand erop"></textarea>
          <div class="st-sc-vb" id="sc-vb" hidden></div>
          <div class="st-prow"><label>hoger</label><input id="sc-hoogte" type="range" min="-12" max="12" step="0.5" value="0"></div>
          <div class="st-prow"><label>groter</label><input id="sc-grootte" type="range" min="0.7" max="1.3" step="0.02" value="1"></div>
          <p class="st-check" id="sc-let" hidden></p>
          <div class="st-btns">
            <button class="prim" id="sc-gebruik" disabled>✓ Maak dit de schat</button>
            <button class="stil" id="sc-weg" hidden>✕ schat weg</button>
          </div>
          <details class="st-prompt" open>
            <summary>✨ Prompt voor de schat</summary>
            <div class="st-prow"><label>idee</label><input id="sc-idee" placeholder="bv. een regenboogkroontje"></div>
            <div class="st-btns"><button id="sc-prompt">Kopieer de prompt</button></div>
            <p class="st-hint" style="display:block">Voor Claude of ChatGPT: een schat is een tekening in SVG.</p>
          </details>
        </div>
      </section>

      <section data-stap="4" hidden>
        <div class="st-check" id="st-klaar"></div>
        <p class="st-noot" id="st-kijknoot">Kijk nog één keer naar de kaart hiernaast en de schat op de pop.</p>
        <p class="st-let" id="st-live" hidden></p>
        <div class="st-btns" style="margin-top:10px">
          <button class="prim groot" id="st-publiceer">🚀 Publiceer</button>
        </div>
        <p class="st-noot" id="st-pubwat"></p>
      </section>

      <section data-stap="meer" hidden>
        <h6>Bekijken</h6>
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
            <label for="st-vscherm">probeer</label>
            <select id="st-vscherm">
              <option value="map">de kaart, in deze stand</option>
              <option value="game:vers">de eerste show</option>
              <option value="game:bijna">de laatste show → wereldfeest</option>
              <option value="end:halverwege">het einde van een show</option>
              <option value="reis:vers">de reis naar deze wereld</option>
              <option value="profile">wie speelt er</option>
            </select>
            <button id="st-venster" title="Speel het in een écht venster op de gekozen toestelmaat, met deze wereld en je concept erin — met Shift: alle maten naast elkaar">▶</button>
          </div>
          <em class="maat" id="st-toestelmaat"></em>
          <em class="maat" id="st-lan"></em>
        </div>

        <h6>Werelden</h6>
        <div class="st-list" id="st-list"></div>
        <div class="st-btns" style="margin-top:6px">
          <button class="prim" id="st-new">＋ wereld</button>
          <button class="stil" id="st-revert" title="Deze wereld terug naar wat er in het spel staat">↶ deze terug</button>
          <button class="stil" id="st-weg" title="Alleen voor een wereld die nog niet in het spel staat">✕ weg</button>
        </div>
        <div class="st-nieuwrij" id="st-nieuwrij" hidden>
          <input id="st-nieuwnaam" placeholder="naam, bv. Regenboogwereld">
          <button class="prim" id="st-nieuwmaak">Maak</button>
        </div>
        <p class="st-noot" id="st-nieuwid" hidden></p>

        <h6>Gegevens</h6>
        <label class="st-vink"><input type="checkbox" id="mf-released">
          uitgebracht — kinderen kunnen hem spelen</label>
        <p class="st-afgeleid" id="mf-afgeleid"></p>
        <div class="st-row"><label>id</label><input id="mf-id" placeholder="ijs"></div>
        <div class="st-row"><label>bestand</label><input id="mf-art" placeholder="assets/world/ijs-map.webp"></div>
        <p class="st-hint">Het id ligt vast zodra de wereld uitgebracht is: de trofee en de schat van
          elk kind hangen eraan. levels: <b id="mf-levels"></b>, vast.</p>
        <div class="st-btns">
          <button id="st-copy">Kopieer blok</button>
          <button id="st-paste">Plak blok</button>
        </div>

        <h6>Beelden van de app</h6>
        <div class="st-row" style="margin-top:8px"><label>kwaliteit</label><select id="st-kwal">
          <option value="0.9">0.90 — ruim</option>
          <option value="0.82" selected>0.82 — normaal</option>
          <option value="0.72">0.72 — zuinig</option>
        </select></div>
        <div id="st-schermen"></div>
        <div id="st-ongebruikt"></div>
        <div id="st-merk"></div>
        <input type="file" accept="image/*" hidden id="me-file">

        <h6>Wat verandert er</h6>
        <div class="st-check" id="st-diff"></div>
        <div class="st-btns" style="margin-top:6px"><button id="st-check-knop">✓ kijk alle werelden na</button></div>
        <div class="st-check" id="st-check" hidden></div>

        <h6>Losse stappen</h6>
        <div class="st-btns">
          <button id="st-push">⇪ Opslaan in het project</button>
          <button class="stil" id="st-pull" title="Concept weggooien en terug naar wat er in het project staat">⟲ Concept weg</button>
        </div>
        <div class="st-row" style="margin-top:6px"><label>bericht</label>
          <input id="st-msg" placeholder="feat: IJswereld krijgt zijn kaart"></div>
        <div class="st-btns">
          <button id="st-commit">✓ keuren, vastleggen &amp; pushen</button>
          <button id="st-pr" title="alleen je tak naar GitHub; main verandert pas als je de PR samenvoegt">⇡ push voor een PR</button>
          <button id="st-publish" title="voegt hier samen met main en pusht main — zonder PR">🚀 publiceer naar main</button>
        </div>
        <p class="st-let" id="st-pw" hidden>Publiceren draait ook de browsertests, en daarvoor
          ontbreekt playwright. Draai één keer <code>npm install</code> in de projectmap.</p>
      </section>

    </div>
    <div class="st-nav">
      <button class="stil" id="st-terug">← Terug</button>
      <button class="stil" id="st-meer" title="bekijken, andere werelden, gegevens, beelden, losse stappen">⋯ Meer</button>
      <button class="prim" id="st-verder">Volgende →</button>
    </div>
    <div class="st-uit" id="st-out"></div>`;
  document.body.appendChild(panel);
  const dump = document.createElement('pre');
  dump.id = 'me-dump';
  dump.onclick = () => { dump.style.display = 'none'; };
  document.body.appendChild(dump);
  document.documentElement.style.setProperty('--studio-w', '330px');














  const MATEN = [
    { id: '390x844',  naam: 'telefoon' },
    { id: '412x920',  naam: 'lange telefoon' },
    { id: '320x568',  naam: 'kleine telefoon' },
    { id: '768x1024', naam: 'tablet' },
    { id: '844x390',  naam: 'telefoon liggend' },
    { id: '1024x768', naam: 'tablet liggend' },
  ];
  const maatVan = id => ({ w: Number(id.split('x')[0]), h: Number(id.split('x')[1]) });






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

    st.setProperty('--doos-x', Math.max(12, Math.round((innerWidth - paneel - w * sch) / 2)) + 'px');
    document.body.classList.toggle('liggend', w >= h);
    F('st-toestelmaat').textContent = sch < .999
      ? w + '×' + h + ' · ' + Math.round(sch * 100) + '%' : w + '×' + h;
    renderTourMap(0);
  }


  F('st-kop').onclick = e => {
    document.body.classList.toggle('geen-kop');
    e.target.classList.toggle('on', !document.body.classList.contains('geen-kop'));
  };
  F('st-balk').onclick = e => {
    document.body.classList.toggle('geen-balk');
    e.target.classList.toggle('on', !document.body.classList.contains('geen-balk'));
  };






  F('st-lan').textContent = window.__LAN ? 'telefoon: ' + window.__LAN + '/ts' : '';

  const toestelKiezer = F('st-toestel');
  toestelKiezer.appendChild(new Option('vrij — vult de hoogte', ''));
  MATEN.forEach(m => toestelKiezer.appendChild(new Option(m.naam + '  ' + m.id.replace('x', '×'), m.id)));
  toestelKiezer.value = '390x844';
  toestelKiezer.onchange = () => zetToestel(toestelKiezer.value);
  addEventListener('resize', () => zetToestel(toestelKiezer.value));














  const STAPPEN = ['1', '2', '3', '4'];
  let stapNu = '1', stapVoorMeer = '1';
  function toonStap(stap) {
    stap = String(stap);
    if (stap !== 'meer' && STAPPEN.indexOf(stap) < 0) stap = '1';
    if (stap === 'meer' && stapNu !== 'meer') stapVoorMeer = stapNu;
    stapNu = stap;
    panel.querySelectorAll('.st-stappen button').forEach(b => b.classList.toggle('on', b.dataset.stap === stap));
    panel.querySelectorAll('.st-body > section').forEach(sec => { sec.hidden = sec.dataset.stap !== stap; });
    const i = STAPPEN.indexOf(stap);
    F('st-terug').hidden = stap !== 'meer' && i <= 0;
    F('st-terug').textContent = stap === 'meer' ? '← Terug naar de stappen' : '← Terug';
    F('st-verder').hidden = stap === 'meer' || i === STAPPEN.length - 1;
    F('st-verder').textContent = i === STAPPEN.length - 2 ? 'Naar publiceren →' : 'Volgende →';
    F('st-meer').classList.toggle('on', stap === 'meer');
    panel.querySelector('.st-body').scrollTop = 0;
    if (stap === 'meer' && /^http/.test(location.protocol)) {


      fetch('/api/versie').then(r => r.json())
        .then(v => { F('st-pw').hidden = v.browserTests !== false; })
        .catch(() => {});
    }

    document.body.classList.toggle('st-kijken', stap === '4');
    if (stap === '4' && typeof tekenPubliceer === 'function') tekenPubliceer(true);
  }
  panel.querySelectorAll('.st-stappen button').forEach(b => { b.onclick = () => toonStap(b.dataset.stap); });
  F('st-verder').onclick = () => toonStap(STAPPEN[Math.min(STAPPEN.length - 1, STAPPEN.indexOf(stapNu) + 1)]);
  F('st-terug').onclick = () => toonStap(stapNu === 'meer' ? stapVoorMeer
    : STAPPEN[Math.max(0, STAPPEN.indexOf(stapNu) - 1)]);
  F('st-meer').onclick = () => toonStap(stapNu === 'meer' ? stapVoorMeer : 'meer');

  const shown = () => worldForIndex(viewWorldIdx);

















  const STUDIO_STER = cur;




  function sterNu() {
    if (!P() && STUDIO_STER && db.profiles[STUDIO_STER]) cur = STUDIO_STER;
    return P() || null;
  }
  function wereldNu() { return shown(); }



  let sel = null;
  let wegWacht = null;
  const setOut = t => { F('st-out').textContent = t || ''; };



  function meldFout(wat, err, raad) {
    console.error('[wereldstudio] ' + wat, err);
    setOut(wat + '.\n' + (raad || 'Je huidige werk blijft staan.')
      + '\nBekijk de console voor technische details.');
  }
  let gridOn = false, curveOn = true, zoneOn = true, sterrenOn = false;



















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



    const totaal = vuil + GEWIJZIGD.size;
    chip.textContent = totaal ? 'niet gepubliceerd' : '';
    chip.title = totaal ? totaal + ' ding' + (totaal === 1 ? '' : 'en') + ' anders dan in het project' : '';
    chip.hidden = !totaal;
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


  const HEX = { road: '#ffffff', sky: '#3d1a63', deep: '#2a0c47', glow: '#ffd880' };
  function fillSheet() {
    const g = wereldNu();
    if (!g) return;
    const w = g.world;
    F('st-wnaam').textContent = ((w.icon || '') + ' ' + (w.name || '')).trim() || 'Wereldstudio';
    F('mf-icon').value = w.icon || '';
    F('mf-name').value = w.name || '';
    F('mf-id').value = w.id || '';
    F('mf-art').value = (w.art && w.art.indexOf('blob:') !== 0) ? w.art : '';
    F('mf-levels').textContent = w.levels;




    F('mf-afgeleid').textContent = 'id ' + (w.id || '—')
      + ' · ' + wereldArtPad(w.id || '—')
      + ' · trofee ' + PERFECT_BADGE + (w.id || '—')
      + ' · level ' + shown().first + '–' + (shown().first + w.levels - 1);
    Object.keys(HEX).forEach(k => { F('mf-' + k).value = (w.theme && w.theme[k]) || HEX[k]; });
    F('mf-released').checked = w.released !== false;
    vulKaartPrompt(w);

    F('st-weg').hidden = viewWorldIdx < WORLDS_SHIPPED.length;
    vulZaal();
    vulBeloning();
  }






  const DIM_STANDAARD = VENUE_TERUGVAL.dim;




  function vulZaal() {
    const w = shown().world;
    const eigen = w.venue && typeof w.venue.dim === 'number';
    const v = eigen ? w.venue.dim : DIM_STANDAARD;
    F('mf-dim').value = String(v);
    zegDim(v, eigen);
  }
  function zegDim(v, eigen) {


    F('mf-dim-uit').textContent = 'helderheid ' + Math.round(v * 100) + '%'
      + (eigen ? '' : ' — de standaard') + (v > .9 ? ' · de tekening praat mee met de som' : '');
  }
  F('mf-dim').addEventListener('input', () => {
    const v = Number(F('mf-dim').value);
    zegDim(v, Math.abs(v - DIM_STANDAARD) > .004);
  });
  F('st-zaal-terug').onclick = () => {
    F('mf-dim').value = String(DIM_STANDAARD);
    readSheet();
    setOut('zaal terug naar de standaard');
  };
  F('st-zaal-kijk').onclick = () => {
    saveWorldDraft();
    const m = toestelKiezer.value || MATEN[0].id;
    toonVoorbeeld([m], 'game:vers');
  };

















  function vrijeSchatten(w) {
    return ITEMS.filter(it => {
      if (it.price != null) return false;
      const ander = beloningWereld(it.id);
      return !ander || ander.id === w.id;
    });
  }
  function vulBeloning() {
    const w = shown().world;
    const kiezer = F('mf-beloning');
    kiezer.innerHTML = '';
    kiezer.appendChild(new Option('— nog geen wereldschat —', ''));
    const vrij = vrijeSchatten(w);
    vrij.forEach(it => kiezer.appendChild(new Option((it.emoji ? it.emoji + ' ' : '') + (it.full || it.name), it.id)));
    const huidig = w.beloning ? item(w.beloning) : null;
    if (w.beloning && !vrij.some(it => it.id === w.beloning)) {
      kiezer.appendChild(new Option('⚠ ' + (huidig ? (huidig.full || huidig.name) + ' — staat in de winkel'
        : w.beloning + ' — bestaat niet'), w.beloning));
    }
    kiezer.value = w.beloning || '';


    kiezer.disabled = !!w.schat;
    kiezer.title = w.schat ? 'deze wereld heeft een getekende schat — haal die weg om een andere te kiezen' : '';
    const vak = F('st-bel'), it = huidig;
    const stuk = !!w.beloning && (!it || it.price != null);
    vak.className = 'st-bel' + (stuk ? ' stuk' : it ? '' : ' leeg');
    F('st-bel-vb').innerHTML = it ? (it.thumb ? it.thumb(curBase()) : (it.emoji || '·')) : '·';
    F('st-bel-naam').textContent = !it && w.beloning ? 'onbekend spulletje' : it ? (it.full || it.name) : 'nog geen wereldschat';
    F('st-bel-uit').textContent = !it && w.beloning
      ? w.beloning + ' staat niet in ITEMS — deze wereld deelt niets uit'
      : it && it.price != null ? it.id + ' staat in de winkel voor ' + it.price + ' 💎 — geen wereldschat'
      : it && it.uitWereld ? it.id + ' · getekend in de studio' : it ? it.id : 'deze wereld uitspelen levert nu niets op';
    F('st-bel-kijk').disabled = !it;
    vulSchatVak(w, vrij);
  }
  F('mf-beloning').onchange = () => {
    const w = shown().world, v = F('mf-beloning').value;
    if (v) w.beloning = v; else delete w.beloning;
    commit(v ? 'beloning: ' + ((item(v) || {}).full || v) : 'beloning weggehaald');
  };

























  const SCHAT_ATTR = ['d', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'width', 'height', 'x1', 'y1', 'x2', 'y2',
    'points', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit',
    'fill-rule', 'clip-rule', 'opacity', 'fill-opacity', 'stroke-opacity', 'transform',
    'font-size', 'font-weight', 'font-family', 'text-anchor', 'dominant-baseline'];





  const SCHAT_DOEL = { onder: 54, hoog: 42, breed: 80 };
  function schoonSvg(tekst) {
    const weg = new Set();

    const m = /<svg[\s\S]*<\/svg>/i.exec(tekst);
    const bron = m ? m[0] : '<svg xmlns="http://www.w3.org/2000/svg">' + tekst + '</svg>';
    const doc = new DOMParser().parseFromString(bron, 'image/svg+xml');
    const wortel = doc.documentElement;
    if (doc.getElementsByTagName('parsererror').length || !wortel || wortel.nodeName.toLowerCase() !== 'svg') {
      return { fout: 'Dit is geen leesbare SVG. Plak alleen de code, van <svg tot en met </svg>.' };
    }
    const waarde = v => String(v).replace(/[<>"&]/g, '').trim();



    const verloopKleur = {};
    Array.from(wortel.getElementsByTagName('*')).forEach(g => {
      if (!/gradient$/i.test(g.nodeName) || !g.getAttribute('id')) return;
      const stop = Array.from(g.childNodes).filter(n => n.nodeType === 1 && /stop$/i.test(n.nodeName))[0];
      const kleur = stop && (stop.getAttribute('stop-color')
        || ((stop.getAttribute('style') || '').match(/stop-color\s*:\s*([^;]+)/) || [])[1]);
      if (kleur) verloopKleur[g.getAttribute('id')] = kleur.trim();
    });
    const attrs = (el, alleenOpmaak) => {
      const uit = {};
      const st = el.getAttribute('style');
      if (st) st.split(';').forEach(d => {
        const i = d.indexOf(':');
        if (i < 0) return;
        const k = d.slice(0, i).trim().toLowerCase(), v = d.slice(i + 1).trim();
        if (SCHAT_ATTR.indexOf(k) >= 0) uit[k] = v; else if (k) weg.add('stijl ' + k);
      });
      Array.from(el.attributes).forEach(a => {
        const k = a.name.toLowerCase();
        if (k === 'style') return;
        if (SCHAT_ATTR.indexOf(k) >= 0) { uit[k] = a.value; return; }
        if (!/^(xmlns|id$|data-|version$|viewbox$|xml:|baseprofile$|preserveaspectratio$|width$|height$)/.test(k)) weg.add(k);
      });
      Object.keys(uit).forEach(k => {
        if (!/url\s*\(|javascript:|&/i.test(uit[k])) return;
        const ref = /url\s*\(\s*['"]?#([^'")\s]+)/.exec(uit[k]);
        if ((k === 'fill' || k === 'stroke') && ref && verloopKleur[ref[1]]) {
          uit[k] = verloopKleur[ref[1]];
          weg.add('verloop (nu effen)');
        } else if (k === 'fill' || k === 'stroke') {
          uit[k] = 'none';
          weg.add('patroon of verloop');
        } else {
          delete uit[k];
          weg.add(k);
        }
      });

      if (alleenOpmaak) Object.keys(uit).forEach(k => { if (!/^(fill|stroke|opacity|font-)/.test(k)) delete uit[k]; });
      return Object.keys(uit).map(k => ' ' + k + '="' + waarde(uit[k]) + '"').join('');
    };
    const kind = el => {
      if (el.nodeType !== 1) return '';
      const t = el.nodeName.toLowerCase().replace(/^svg:/, '');
      if (t === 'svg' || t === 'a' || t === 'switch') {
        weg.add('<' + t + '>');
        return Array.from(el.childNodes).map(kind).join('');
      }
      if (SCHAT_ELEMENTEN.indexOf(t) < 0) { if (t !== 'title' && t !== 'desc') weg.add('<' + t + '>'); return ''; }
      if (t === 'text') return '<text' + attrs(el) + '>' + waarde(el.textContent).replace(/\s+/g, ' ') + '</text>';
      if (t === 'g') {
        const binnen = Array.from(el.childNodes).map(kind).join('');
        return binnen ? '<g' + attrs(el) + '>' + binnen + '</g>' : '';
      }
      return '<' + t + attrs(el) + '/>';
    };
    const binnen = Array.from(wortel.childNodes).map(kind).join('');
    if (!binnen) return { fout: 'Er bleef niets over om te tekenen: alleen vormen tellen mee (path, circle, rect, …).' };
    return { binnen, wortel: attrs(wortel, true), weg: [...weg] };
  }
  function meetSvg(inhoud) {
    const d = document.createElement('div');
    d.style.cssText = 'position:absolute;left:-9999px;top:0;width:400px;height:500px;visibility:hidden';
    d.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 250" width="400" height="500">'
      + inhoud + '</svg>';
    document.body.appendChild(d);
    try { return d.querySelector('svg').getBBox(); }
    catch (e) { return null; }
    finally { d.remove(); }
  }
  function zetOpHoofd(schoon, hoger, groter) {
    const b = meetSvg('<g' + schoon.wortel + '>' + schoon.binnen + '</g>');
    if (!b || !(b.width > 0.5) || !(b.height > 0.5)) {
      return { fout: 'De tekening heeft geen maat. Staat er wel iets zichtbaars in?' };
    }
    const s = Math.min(SCHAT_DOEL.hoog * groter / b.height, SCHAT_DOEL.breed * groter / b.width);
    const onder = SCHAT_DOEL.onder - hoger;
    const r2 = n => Math.round(n * 100) / 100;
    const tx = 100 - (b.x + b.width / 2) * s, ty = onder - (b.y + b.height) * s;
    const svg = '<g transform="translate(' + r2(tx) + ' ' + r2(ty) + ') scale(' + Math.round(s * 1e4) / 1e4 + ')"'
      + schoon.wortel + '>' + schoon.binnen + '</g>';
    const f = meetSvg(svg);
    if (!f) return { fout: 'De tekening kon niet worden gemeten.' };


    const R = SCHAT_RAND;
    const view = [f.x - R, f.y - R, f.width + 2 * R, f.height + 2 * R].map(n => Math.round(n * 10) / 10).join(' ');
    return { svg, view, maat: { x: f.x, y: f.y, w: f.width, h: f.height } };
  }

  function schatFamilie(w) {
    return WORLDS.filter(x => x !== w && x.beloning).map(x => item(x.beloning))
      .filter(it => it && typeof it.draw === 'function')
      .map(it => { const b = meetSvg(it.draw('meisje', 1)); return b ? { h: b.height, w: b.width } : null; })
      .filter(Boolean);
  }
  let schatWereld = null;
  let schatProef = null;
  let schatWegWacht = null;
  function vulSchatVak(w, vrij) {
    const vak = F('st-schat');
    const bel = w.beloning ? item(w.beloning) : null;
    vak.hidden = !!(bel && !bel.uitWereld);
    if (vak.hidden) return;
    F('sc-weg').hidden = !w.schat;
    F('sc-prompt').hidden = !(window.__PROMPTS && window.__PROMPTS.wereldschat);
    if (schatWereld === w.id) return;
    schatWereld = w.id;
    const s = w.schat;
    F('sc-idee').value = '';
    F('sc-svg').value = s ? s.svg : '';
    F('sc-naam').value = s ? s.naam : '';
    F('sc-emoji').value = s ? s.emoji : (w.icon || '✨');
    F('sc-hoogte').value = '0';
    F('sc-grootte').value = '1';
    vak.open = !!s || (!w.beloning && !vrij.length);

    const b = s ? meetSvg(s.svg) : null;
    schatProef = s ? { svg: s.svg, view: s.view, weg: [], opgeslagen: true,
                       maat: b ? { x: b.x, y: b.y, w: b.width, h: b.height } : null } : null;
    tekenSchatProef(false);
  }
  function tekenSchatProef(opnieuw) {
    const w = shown().world;
    if (opnieuw) {
      const tekst = F('sc-svg').value.trim();
      const schoon = tekst ? schoonSvg(tekst) : null;
      schatProef = !schoon ? null : schoon.fout ? schoon
        : Object.assign(zetOpHoofd(schoon, Number(F('sc-hoogte').value), Number(F('sc-grootte').value)),
                        { weg: schoon.weg });
    }
    const vb = F('sc-vb'), let_ = F('sc-let'), knop = F('sc-gebruik');
    const p = schatProef;
    vb.hidden = !p || !!p.fout;
    knop.disabled = true;
    if (!p) { let_.hidden = true; return; }
    if (p.fout) { let_.hidden = false; let_.className = 'st-check'; let_.innerHTML = '<span class="ct-fout">⚠</span> ' + esc(p.fout); return; }

    const naam = F('sc-naam').value.trim() || 'schat';
    const proef = { id: '__schatproef', cat: 'acc', name: naam, full: naam,
                    draw: () => p.svg, thumb: () => beloningThumb(p.view, p.svg) };
    const ster = sterNu();
    ITEMS.push(proef);
    try {
      const pop = base => ster
        ? avatarSVG({ ...ster, base, equipped: { ...ster.equipped, acc: proef.id } }, 110) : '';
      vb.innerHTML = '<div>' + pop('meisje') + 'meisje</div><div>' + pop('jongen') + 'jongen</div>'
        + '<div class="mini">' + proef.thumb() + 'kast</div>';
    } finally { ITEMS.splice(ITEMS.indexOf(proef), 1); }

    const rood = schatFouten({ naam: F('sc-naam').value, emoji: F('sc-emoji').value, view: p.view, svg: p.svg });
    const m = p.maat;
    if (m) {
      if (m.y + m.h > 94) rood.push('zakt onder de nek (y = 94), waar de kleren beginnen');
      if (m.y < -2) rood.push('steekt boven de rand van de pop uit');
      const fam = schatFamilie(w).concat([{ h: m.h, w: m.w }]);
      const hs = fam.map(x => x.h), bs = fam.map(x => x.w);
      if (Math.max.apply(null, hs) / Math.min.apply(null, hs) >= 2) rood.push('te hoog of te laag naast de andere schatten — schuif "groter"');
      if (Math.max.apply(null, bs) / Math.min.apply(null, bs) >= 3) rood.push('te breed of te smal naast de andere schatten — dit is de vorm zelf; een andere tekening');
    }



    if (!rood.length) schatMaatFouten({ view: p.view }, schatUitsneden(w)).forEach(t => rood.push(t));
    const geel = p.weg && p.weg.length ? ['weggehaald omdat het niet mag: ' + p.weg.join(', ')] : [];
    let_.hidden = !rood.length && !geel.length;
    let_.className = 'st-check' + (!rood.length && !geel.length ? ' schoon' : '');
    let_.innerHTML = rood.map(t => '<span class="ct-fout">⚠</span> ' + esc(t)).concat(
      geel.map(t => '<span class="ct-let">·</span> ' + esc(t))).join('<br>');
    knop.disabled = rood.length > 0 || !!p.opgeslagen;
    knop.textContent = w.schat ? '✓ Vervang de schat' : '✓ Maak dit de schat';
  }
  let schatKlok = null;
  F('sc-svg').addEventListener('input', () => { clearTimeout(schatKlok); schatKlok = setTimeout(() => tekenSchatProef(true), 250); });
  ['sc-hoogte', 'sc-grootte'].forEach(id => F(id).addEventListener('input', () => tekenSchatProef(true)));
  ['sc-naam', 'sc-emoji'].forEach(id => F(id).addEventListener('input', () => {
    if (schatProef && schatProef.opgeslagen) schatProef.opgeslagen = false;
    tekenSchatProef(false);
  }));

  ['dragenter', 'dragover'].forEach(n => F('sc-svg').addEventListener(n, e => { e.preventDefault(); F('sc-svg').classList.add('over'); }));
  ['dragleave', 'dragend'].forEach(n => F('sc-svg').addEventListener(n, () => F('sc-svg').classList.remove('over')));
  F('sc-svg').addEventListener('drop', e => {
    e.preventDefault();
    F('sc-svg').classList.remove('over');
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (!f) return;
    if (!/svg/i.test(f.type) && !/\.svg$/i.test(f.name)) { setOut('dat is geen .svg: ' + f.name + ' — een schat is een tekening, geen foto'); return; }
    f.text().then(t => { F('sc-svg').value = t; tekenSchatProef(true); });
  });
  function vrijSchatId(w) {
    const basis = 'acc_wereld_' + w.id.replace(/-/g, '_');
    let id = basis, n = 2;
    while (item(id) && item(id).uitWereld !== w.id) id = basis + '_' + (n++);
    return id;
  }
  F('sc-gebruik').onclick = () => {
    const w = shown().world, p = schatProef;
    if (!p || p.fout) return;
    const s = { naam: F('sc-naam').value.trim(), emoji: F('sc-emoji').value.trim() || w.icon || '✨',
                view: p.view, svg: p.svg };
    const fouten = schatFouten(s);
    if (fouten.length) { setOut(fouten.join('\n')); return; }
    const oud = w.beloning ? item(w.beloning) : null;
    if (oud && !oud.uitWereld) { setOut(w.name + ' heeft al een schat uit de code; die blijft.'); return; }
    w.schat = s;
    w.beloning = oud && oud.uitWereld === w.id ? w.beloning : vrijSchatId(w);
    rebuildWereldschatten();
    schatWereld = null;
    commit(s.naam + ' is de schat van ' + w.name + '. Probeer de laatste show: daar krijg je hem.');
  };
  F('sc-weg').onclick = () => {
    const w = shown().world;
    if (!w.schat) return;
    if (schatWegWacht !== w.id) {
      schatWegWacht = w.id;
      F('sc-weg').textContent = '✕ zeker? nog eens';
      setOut('Nog één tik haalt de getekende schat van ' + w.name + ' weg.');
      return;
    }
    schatWegWacht = null;
    F('sc-weg').textContent = '✕ getekende schat weg';
    const it = item(w.beloning);
    delete w.schat;
    if (it && it.uitWereld === w.id) delete w.beloning;
    rebuildWereldschatten();
    schatWereld = null;
    commit('getekende schat van ' + w.name + ' weggehaald');
  };






  function vulPrompt(sjabloon, waarden) {
    const regels = String(sjabloon || '').split('\n');
    let kop = 0;
    while (kop < regels.length && /^#/.test(regels[kop])) kop++;
    return regels.slice(kop)
      .filter(r => !Object.keys(waarden).some(k => r.indexOf('{{' + k + '}}') >= 0 && !String(waarden[k] || '').trim()))
      .map(r => r.replace(/\{\{([A-Z]+)\}\}/g, (m, k) => waarden[k] != null ? String(waarden[k]).trim() : m))
      .join('\n').trim() + '\n';
  }
  function kopieer(tekst, wat) {
    dump.textContent = tekst + '\n(tik om te sluiten)';
    dump.style.display = 'block';
    const klaar = () => setOut(wat + ' gekopieerd — plak hem in je AI.');
    const mis = () => setOut('Kopiëren lukte niet; selecteer de tekst in het venster.');
    try { navigator.clipboard.writeText(tekst).then(klaar, mis); } catch (e) { mis(); }
  }
  function schatPrompt(w) {
    const t = w.theme || {};
    return vulPrompt(window.__PROMPTS && window.__PROMPTS.wereldschat, {
      WERELD: w.name,
      IDEE: F('sc-idee').value,
      KLEUREN: Object.keys(t).map(k => k + ' ' + t[k]).join(', '),
      VOORBEELDEN: WORLDS.filter(x => x !== w && x.beloning).map(x => item(x.beloning))
        .filter(it => it && typeof it.draw === 'function')
        .map(it => '- ' + (it.full || it.name) + ' (' + beloningWereld(it.id).name + '):\n'
          + '<svg viewBox="0 0 200 250" xmlns="http://www.w3.org/2000/svg">' + it.draw('meisje', 1) + '</svg>')
        .join('\n\n'),
    });
  }
  F('sc-prompt').onclick = () => kopieer(schatPrompt(shown().world), 'De prompt voor de schat');

  const themaVan = w => String(w.name || '').replace(/\s*wereld$/i, '').trim() || w.name;
  let kaartPromptWereld = null;
  function vulKaartPrompt(w) {
    const vak = F('st-kaartprompt');
    vak.hidden = !(window.__PROMPTS && window.__PROMPTS.wereldkaart);
    if (vak.hidden || kaartPromptWereld === w.id) return;
    kaartPromptWereld = w.id;
    F('kp-thema').value = themaVan(w);
    F('kp-insp').value = '';
    vak.open = !w.art;
  }
  F('kp-kopieer').onclick = () => kopieer(vulPrompt(window.__PROMPTS && window.__PROMPTS.wereldkaart, {
    THEMA: F('kp-thema').value || themaVan(shown().world),
    INSPIRATIE: F('kp-insp').value,
  }), 'De prompt voor de wereldkaart');



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


    const dim = Math.round(Number(F('mf-dim').value) * 100) / 100;
    const venue = Object.assign({}, w.venue || {});
    if (Math.abs(dim - DIM_STANDAARD) > .004) venue.dim = dim; else delete venue.dim;
    if (Object.keys(venue).length) w.venue = venue; else delete w.venue;
    commit('');
  }
  panel.querySelectorAll('.st-row input, .st-kleur input').forEach(i => { i.onchange = readSheet; });




  F('mf-released').onchange = () => {
    const w = shown().world;
    if (F('mf-released').checked) delete w.released; else w.released = false;
    commit(F('mf-released').checked
      ? w.name + ' staat op uitgebracht — kijk in Publiceren of de controle nog iets te doen heeft'
      : w.name + ' staat op niet uitgebracht — kinderen zien hem niet');
    if (F('mf-released').checked) toonControle(controleer(), false);
  };


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
    if (!ster || !hier) return;
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



    if (zoneOn) {
      const d = document.createElement('div');
      d.className = 'me-safe';
      d.style.left = ZONE.x0 + '%';
      d.style.right = (100 - ZONE.x1) + '%';
      d.style.top = ZONE.y0 + '%';
      d.style.bottom = (100 - ZONE.y1) + '%';
      frame.appendChild(d);

      const sn = document.createElement('div');
      sn.className = 'me-snee';
      sn.style.left = '11.9%';
      sn.style.right = '11.9%';
      sn.innerHTML = '<span>zichtbaar op elk toestel</span>';
      frame.appendChild(sn);

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



  function toonOnderrand(frame) {
    const fr = frame.getBoundingClientRect();
    const mr = map.getBoundingClientRect();
    if (!fr.height || !mr.height) return;
    const sch = Number(getComputedStyle(R).getPropertyValue('--doos-s')) || 1;
    const lijn = mr.bottom - ONDER_PX * sch;
    const top = (lijn - fr.top) / fr.height * 100;
    if (top >= 100 || top <= 0) return;
    const d = document.createElement('div');
    d.className = 'me-onder';
    d.style.top = top.toFixed(2) + '%';
    d.innerHTML = '<span>navigatiebalk — ' + Math.round(ONDER_PX) + 'px</span>';
    frame.appendChild(d);




    const zone = frame.querySelector('.me-safe');
    const zr = zone ? zone.getBoundingClientRect() : null;
    const uit = [];
    frame.querySelectorAll('.tour-stop').forEach(st => {
      const r = st.getBoundingClientRect();
      const d = st.querySelector('.dot').getBoundingClientRect();
      const cx = d.left + d.width / 2, cy = d.top + d.height / 2;
      const redenen = [];


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





    const botst = [];
    const stops = [...frame.querySelectorAll('.tour-stop')];




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








  function commit(msg) {
    saveWorldDraft();
    if (sterNu() && wereldNu()) showWorld(viewWorldIdx);
    refreshList();
    fillSheet();
    if (typeof tekenSchermen === 'function') tekenSchermen();
    if (typeof tekenDiff === 'function') tekenDiff();
    if (stapNu === '4' && typeof tekenPubliceer === 'function') tekenPubliceer(false);
    if (msg !== undefined) setOut(msg);
  }
  function goWorld(i) {
    viewWorldIdx = i;
    kies(null);
    meldAanStudio();
    wegWacht = null;
    F('st-weg').textContent = '✕ weg';

    if (F('st-pop')) F('st-pop').remove();
    historie.length = 0;
    zetStand(F('st-stand') ? F('st-stand').value : 'halverwege');
  }





  function meldAanStudio() {
    if (window.parent === window) return;
    try {
      const g = WORLDS[viewWorldIdx];
      window.parent.postMessage({ wereldstudio: 'wereld', nr: viewWorldIdx + 1, id: g && g.id },
        location.origin && location.origin !== 'null' ? location.origin : '*');
    } catch (e) { }
  }


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




  function zetStand(stand) {
    const q = sterNu(), w = wereldNu();
    if (!q || !w) { setOut('Geen wereld gekozen — kies er een in de lijst.'); return; }
    for (let l = w.first; l < w.first + w.levels; l++) delete q.stars[l];





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










  const SLOTS = window.__SLOTS || {
    world:   { screen: 'map', label: 'Wereldkaart', waar: 'de kaart, van rand tot rand',
               lever: [1215, 2160], pad: 'assets/world/{wereld}-map.webp', perWereld: true },
  };
  const SCHERMEN = window.__SCHERMEN || [
    { id: 'profile', label: 'Wie speelt er' }, { id: 'map', label: 'Kaart' },
    { id: 'game', label: 'Show' }, { id: 'end', label: 'Einde' },
  ];
  const OP_SCHIJF = window.__ASSETS || {};






  function slotPad(key) {
    const d = SLOTS[key];
    if (!d || !d.pad) return '';
    if (!d.perWereld) return d.pad;
    const w = wereldNu();
    return w ? d.pad.replace('{wereld}', w.world.id) : '';
  }



  function tekenSchermen() {
    tekenWereldbeeld();
    const vak = F('st-schermen');
    if (!vak) return;
    vak.innerHTML = '';
    SCHERMEN.forEach(sc => {



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

















  const MERK = window.__MERK || [];
  function tekenMerk() {
    const vak = F('st-merk');
    if (!vak || !MERK.length) return;
    const kB = p => OP_SCHIJF[p] === undefined ? 'ontbreekt' : OP_SCHIJF[p] + ' kB';
    const rij = d => '<div class="st-merk"><div class="vb" style="background-image:url(\''
      + esc(d.uit[0]) + '?v=' + (OP_SCHIJF[d.uit[0]] || 0) + '\')"></div><div><b>'
      + esc(d.merk) + '</b><small>' + d.uit.map(u => esc(u) + ' · ' + kB(u)).join('<br>')
      + '<br>← ' + esc(d.bron) + ' · ' + kB(d.bron) + '</small></div></div>';


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








  const ART_VERHOUDING = ART_W / ART_H;

  const GEMETEN = {};
  function meetTekening(pad) {
    if (!pad) return;
    if (GEMETEN[pad] !== undefined) return;
    GEMETEN[pad] = null;
    laadBeeld(pad).then(img => {
      GEMETEN[pad] = { w: img.naturalWidth, h: img.naturalHeight };
      tekenWereldbeeld();
    }).catch(() => { GEMETEN[pad] = { w: 0, h: 0 }; tekenWereldbeeld(); });
  }






  function tekeningLet(w, pad, kb) {




    const m = w.art ? GEMETEN[w.art] : (GEMETEN[pad] && GEMETEN[pad].w ? GEMETEN[pad] : null);
    const uit = [];





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




    const gemeten = GEMETEN[w.art] || GEMETEN[pad];
    const erIs = kb || tijdelijk || (gemeten && gemeten.w > 0);
    const staat = (w.art && erIs) ? 'klaar' : (kb || (!w.art && gemeten && gemeten.w > 0)) ? 'los' : 'leeg';
    vak.classList.toggle('er', staat === 'klaar');
    const toon = w.art || ((kb || (GEMETEN[pad] && GEMETEN[pad].w > 0)) ? pad : '');
    F('st-art-vb').style.backgroundImage = toon ? `url("${toon}?v=${kb || 0}")` : '';
    F('st-art-vb').textContent = toon ? '' : '＋';
    F('st-art-vb').style.opacity = staat === 'los' ? '.45' : '1';



    const nogAanHetMeten = w.art && !gemeten && w.art.indexOf('blob:') !== 0;
    F('st-art-st').innerHTML = staat === 'klaar'
        ? 'tekening staat klaar — <b>sleep een nieuwe erop om te vervangen</b>'
      : staat === 'los' ? 'bestand staat er, maar deze wereld gebruikt het niet '
        + '<button id="st-art-koppel">gebruiken</button>'
      : nogAanHetMeten ? 'tekening ophalen…'
      : w.art ? 'bestand ontbreekt nog' : 'nog geen tekening — sleep er een hierheen';
    meetTekening(toon && toon.indexOf('blob:') !== 0 ? toon : null);



    if (!w.art && (OP_SCHIJF[pad] || !Object.keys(OP_SCHIJF).length)) meetTekening(pad);
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


  function verhoudingNaam(v) {
    const bekend = [[9 / 16, '9:16'], [1 / 2, '1:2'], [3 / 4, '3:4'], [2 / 3, '2:3'],
                    [1, '1:1'], [16 / 9, '16:9'], [4 / 5, '4:5']];
    for (const [w, naam] of bekend) if (Math.abs(v - w) / w < 0.015) return naam;
    return v.toFixed(2) + ':1';
  }








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

  ['dragover', 'drop'].forEach(n => addEventListener(n, e => {
    if (!e.target.closest || !e.target.closest('.st-slot, .st-art')) e.preventDefault();
  }));












  function vernieuwBeeld(pad) {
    if (!pad) return;
    const stempel = 'v=' + Date.now();
    const vers = t => String(t).split(pad).join(pad + '?' + stempel);
    const raakt = t => String(t || '').indexOf(pad) >= 0;
    let n = 0;
    for (const blad of Array.from(document.styleSheets)) {
      let regels;


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





  const KWAL_BODEM = 0.55;
  async function naarWebp(src, bw, bh, kwal, doelKb) {
    const img = await laadBeeld(src);
    const c = document.createElement('canvas');
    c.width = bw; c.height = bh;
    const g = c.getContext('2d');
    const sch = Math.max(bw / img.naturalWidth, bh / img.naturalHeight);
    const w = img.naturalWidth * sch, h = img.naturalHeight * sch;
    g.drawImage(img, (bw - w) / 2, (bh - h) / 2, w, h);
    const maak = q => new Promise(r => c.toBlob(r, 'image/webp', q));
    let blob = await maak(kwal);
    if (!blob) throw new Error('omzetten naar webp lukte niet');
    let q = kwal;
    while (doelKb && blob.size / 1024 > doelKb && q > KWAL_BODEM) {
      q = Math.max(KWAL_BODEM, Math.round((q - 0.07) * 100) / 100);
      const kleiner = await maak(q);
      if (!kleiner) break;
      blob = kleiner;
    }
    return { blob, bron: img.naturalWidth + 'x' + img.naturalHeight, kwal: q };
  }















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


    let blob, maat;
    try {
      const gekozen = Number(F('st-kwal').value);
      const r = await naarWebp(url, d.lever[0], d.lever[1], gekozen, d.budget);
      blob = r.blob; maat = r.bron;
      if (r.kwal < gekozen) maat += ' · kwaliteit ' + r.kwal.toFixed(2) + ' (begroting ±' + d.budget + ' kB)';
    } catch (err) {
      opruimen();
      meldFout('Afbeelding kon niet worden omgezet (' + label + ')', err,
        'De huidige versie blijft behouden.');
      return;
    }


    let txt;
    try {
      const r = await fetch('/asset?to=' + encodeURIComponent(pad), { method: 'POST', body: blob });
      txt = (await r.text()).trim();
      if (!r.ok) throw new Error(txt || ('de server gaf ' + r.status));
    } catch (err) {




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




    let klein = '';
    const kpad = key === 'world' ? wereldKleinPad(pad) : null;
    if (kpad) {
      try {
        const k = await naarWebp(url, 560, 996, 0.6);
        const r = await fetch('/asset?to=' + encodeURIComponent(kpad), { method: 'POST', body: k.blob });
        if (!r.ok) throw new Error((await r.text()).trim() || ('de server gaf ' + r.status));
        OP_SCHIJF[kpad] = Math.round(k.blob.size / 1024);
        GEWIJZIGD.add(kpad);
        klein = '\n+ ' + kpad.split('/').pop() + ' voor de reis (' + OP_SCHIJF[kpad] + ' kB)';
      } catch (err) {
        console.error('[wereldstudio] ' + kpad + ' maken mislukt', err);
        klein = '\nHet kleine kaartje voor de reis lukte niet; de reis gebruikt dan de grote tekening.';
      }
    }



    opruimen();
    try {
      OP_SCHIJF[pad] = Math.round(blob.size / 1024);
      delete GEMETEN[pad];


      GEWIJZIGD.add(pad);
      if (key === 'world') { const w = wereldNu(); if (w) w.world.art = pad; }

      vernieuwBeeld(pad);


      if (!eigen) {
        window.__INCOMING = (window.__INCOMING || []).filter(x => x.url !== bron);
        fetch('/incoming-weg?f=' + encodeURIComponent(label), { method: 'POST' }).catch(() => {});
      }
      commit('');
      const klaar = 'Gewijzigd · ' + label + '  ' + maat + ' → ' + txt + klein
        + (eigen ? '' : '\nVervers de pagina: de kaart toont nu nog de kandidaat uit incoming/.');
      setOut(klaar);
      if (key === 'world') autoKleuren(klaar + '\nKleuren en zaal komen uit de tekening.');
    } catch (err) {
      console.error('[wereldstudio] ' + pad + ' is vervangen, maar het paneel bijwerken mislukte', err);
      setOut('Gewijzigd · ' + pad + ' staat op schijf.\n'
        + 'Het paneel kon niet worden bijgewerkt; ververs de pagina.\n'
        + 'Bekijk de console voor technische details.');
    }
  }














  function maakWereld(naam) {
    naam = String(naam || '').trim();
    if (!naam) { setOut('Geef de wereld eerst een naam.'); F('st-nieuwnaam').focus(); return; }



    const al = WORLDS.findIndex((w, i) => i >= WORLDS_SHIPPED.length && w.name === naam);
    if (al >= 0) { goWorld(al); setOut(naam + ' stond al in je concept.'); return; }
    const id = vrijWereldId(naam);
    WORLDS.push({ id, name: naam, icon: '✨', levels: 8, released: false });
    rebuildWorldStarts();
    rebuildWorldBadges();
    F('st-nieuwrij').hidden = true;
    F('st-nieuwid').hidden = true;
    F('st-nieuwnaam').value = '';
    goWorld(WORLDS.length - 1);
    setOut(naam + ' erbij — id ' + id + ', nog niet uitgebracht.\nVolgende stap: sleep de tekening '
      + 'erop (' + SLOTS.world.lever[0] + '×' + SLOTS.world.lever[1] + ', 9:16).');
  }




  function toonNieuwId() {
    const naam = F('st-nieuwnaam').value.trim();
    const id = naam ? vrijWereldId(naam) : null;
    F('st-nieuwid').textContent = (id ? 'Het id wordt ' + id + ' (tekening: ' + wereldArtPad(id) + '). '
      : 'Het id en de bestandsnaam rollen uit deze naam. ')
      + 'Kies de naam met zorg: zodra de wereld uitgebracht is, ligt het id vast — de trofee en de '
      + 'schat van elk kind dat hem speelde hangen eraan. De naam zelf kun je later altijd nog veranderen.';
  }
  F('st-nieuwnaam').oninput = toonNieuwId;
  F('st-new').onclick = () => {
    const rij = F('st-nieuwrij');
    rij.hidden = !rij.hidden;
    F('st-nieuwid').hidden = rij.hidden;
    if (!rij.hidden) { toonNieuwId(); F('st-nieuwnaam').focus(); }
  };
  F('st-nieuwmaak').onclick = () => maakWereld(F('st-nieuwnaam').value);
  F('st-nieuwnaam').onkeydown = e => { if (e.key === 'Enter') maakWereld(F('st-nieuwnaam').value); };




  F('st-weg').onclick = () => {
    const g = wereldNu();
    if (!g) return;
    if (viewWorldIdx < WORLDS_SHIPPED.length) {
      setOut(g.world.name + ' staat al in het project; die haal je niet met een knop weg.');
      return;
    }
    if (wegWacht !== g.world.id) {
      wegWacht = g.world.id;
      F('st-weg').textContent = '✕ zeker? nog eens';
      setOut('Nog één tik haalt ' + g.world.name + ' uit je concept. Een tekening die al op schijf '
        + 'staat blijft liggen.');
      return;
    }
    wegWacht = null;
    F('st-weg').textContent = '✕ weg';
    WORLDS.splice(viewWorldIdx, 1);
    rebuildWorldStarts();
    rebuildWorldBadges();
    goWorld(Math.max(0, viewWorldIdx - 1));
    setOut(g.world.name + ' is uit je concept.');
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
    toonControle(controleer(), true);
    saveWorldDraft();
    setOut('opslaan…');
    fetch('/api/concept', { method: 'POST',
      body: JSON.stringify({ concept: WORLDS, basis: WORLDS_SHIPPED }) })
      .then(r => r.json())
      .then(j => {
        setOut(j.tekst || (j.ok ? 'opgeslagen' : 'niet opgeslagen'));
        if (!j.ok) return;

        WORLDS_SHIPPED.length = 0;
        JSON.parse(JSON.stringify(WORLDS)).forEach(w => WORLDS_SHIPPED.push(w));
        saveWorldDraft();
        commit();
      })
      .catch(() => setOut('Opslaan kan alleen met de studioserver (npm run studio).\n'
        + 'Zonder server: Geavanceerd → Kopieer blok, en plak het in src/20-app.js.'));
  };














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
    const dotStraal = 5.15;
    const kleur = naam => {
      const v = getComputedStyle(frame).getPropertyValue(naam).trim();
      return naarRgb(v || '#fff');
    };
    const goud = kleur('--gold-cta-bottom'), paars = kleur('--purple-shadow');
    const grijs = kleur('--gray-bottom');
    const wegKleur = naarRgb(getComputedStyle(frame).getPropertyValue('--w-road').trim() || 'rgba(255,255,255,.42)');

    const randKleur = naarRgb(getComputedStyle(frame).getPropertyValue('--route-onder').trim() || 'rgba(38,12,64,.78)');

















    const uit = { haltes: [], weg: [], fout: null };



    const ring = naarRgb('rgba(255,255,255,.3)');

    leesNodes().forEach((n, i) => {
      const bg = schijf(data, br, ho, n.x, n.y, dotStraal);
      if (!bg) return;
      const L = lum(bg);

      const vulling = Math.max(verhouding(L, lum(paars)), verhouding(L, lum(goud)), verhouding(L, lum(grijs)));
      const opRing = ring.a < 1 ? meng(ring, bg) : ring;
      const beste = Math.max(vulling, verhouding(L, lum(opRing)));
      uit.haltes.push({ nr: i + 1, licht: Math.round(L * 100), v: beste });
    });

    leesCurve().forEach((pt, i) => {
      const bg = schijf(data, br, ho, pt.x, pt.y, 2.5);
      if (!bg) return;
      const opDeWeg = wegKleur.a < 1 ? meng(wegKleur, bg) : wegKleur;
      const opDeRand = randKleur.a < 1 ? meng(randKleur, bg) : randKleur;

      uit.weg.push({ nr: (i + 1) + '–' + (i + 2), licht: Math.round(lum(bg) * 100),
                     v: Math.max(verhouding(lum(bg), lum(opDeWeg)), verhouding(lum(bg), lum(opDeRand))) });
    });
    return uit;
  }
  function toonContrast(m) {
    const vak = F('st-contrast');
    vak.hidden = false;
    if (m.fout) { vak.className = 'st-check'; vak.textContent = m.fout; return; }



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


      stukken.push('<span class="ct-let">·</span> zet <b>weg</b> lichter voor deze wereld');
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





    const punten = [];
    for (let y = Math.round(ho * .6); y < ho; y += 3) for (let x = 0; x < br; x += 3) {
      const i = (y * br + x) * 4;
      punten.push(naarHsl({ r: data[i], g: data[i + 1], b: data[i + 2] }));
    }
    punten.sort((a, b) => (b.s * b.l) - (a.s * a.l));
    const top = punten.slice(0, Math.max(1, Math.round(punten.length / 10)));
    const gloedH = top.reduce((n, o) => n + o.h, 0) / top.length;
    const gloedS = top.reduce((n, o) => n + o.s, 0) / top.length;












    const beste = hslHex(gloedH, .3, .8);






    let licht = 0, n = 0;
    for (let i = 0; i < data.length; i += 8) {
      licht += (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255; n++;
    }
    licht = n ? licht / n : .5;
    let dim = Math.round(Math.min(.85, Math.max(.5, .54 + (.6 - licht) * 1.18)) * 100) / 100;
    if (Math.abs(dim - DIM_STANDAARD) < .04) dim = DIM_STANDAARD;
    return {
      dim,
      sky:  hslHex(boven.h, Math.min(.72, Math.max(.2, boven.s)), Math.min(.42, Math.max(.16, boven.l))),







      deep: hslHex(boven.h, .6, .12),
      glow: hslHex(gloedH, Math.min(.62, Math.max(.28, gloedS)), .34),
      road: beste,
    };
  }




  const pixelFout = e => {
    console.error('[wereldstudio] de pixels van de tekening uitlezen mislukte', e);
    if (/tainted|cross-origin|SecurityError/i.test(String(e && e.message))) {
      return 'De tekening uitlezen kan alleen via npm run preview'
        + '\n(over file:// geeft de browser de pixels niet vrij).';
    }


    return 'De tekening kon niet worden uitgelezen.\nDe kleuren blijven zoals ze staan.'
      + '\nBekijk de console voor technische details.';
  };






  async function autoKleuren(bericht) {
    const w = shown().world;
    if (!w.art || w.art.indexOf('blob:') === 0) return false;
    try {
      const voor = await kleurenUitTekening();
      if (shown().world !== w) return false;
      Object.keys(voor).forEach(k => { F('mf-' + k).value = String(voor[k]); });
      readSheet();
      if (bericht) setOut(bericht);
      return true;
    } catch (e) {
      console.error('[wereldstudio] kleuren uit de tekening halen mislukte', e);
      return false;
    }
  }
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










  const WAAR_HEET = { tekening: 'Tekening', gegevens: 'Gegevens', beloning: 'Beloning',
                      haltes: 'Haltes & weg', lijst: 'Welke wereld', zaal: 'Zaal', kleuren: 'Kleuren' };




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


    let lijst = punten;
    [/nog geen tekening/].forEach(re => {
      const zonder = lijst.filter(x => re.test(x.t));
      if (zonder.length > 2) {
        lijst = lijst.filter(x => !re.test(x.t));
        lijst.push({ ernst: 'let op', w: zonder.length + ' werelden', t: zonder[0].t, waar: zonder[0].waar });
      }
    });
    const regel = x => '<span class="' + (x.ernst === 'fout' ? (x.blokkeert ? 'ct-fout' : 'ct-let') : 'ct-let') + '">'
      + (x.blokkeert ? '⚠' : '·') + ' ' + esc(x.w) + '</span> ' + esc(x.t)
      + (WAAR_HEET[x.waar] ? ' <em style="color:#9c86bd;font-style:normal">→ ' + WAAR_HEET[x.waar] + '</em>' : '');
    const groep = (kop, l) => l.length ? '<b>' + kop + '</b><br>' + l.map(regel).join('<br>') : '';
    vak.innerHTML = [
      groep('Houdt opslaan tegen', lijst.filter(x => x.blokkeert)),
      groep('Nog te doen vóór uitbrengen', lijst.filter(x => x.ernst === 'fout' && !x.blokkeert)),
      groep('Let op', lijst.filter(x => x.ernst !== 'fout')),
    ].filter(Boolean).join('<br>');
  }
  const controleer = () => wereldControle(OP_SCHIJF);
  F('st-check-knop').onclick = () => toonControle(controleer(), false);













  const STAP_VAN = { tekening: '1', gegevens: '1', kleuren: '1', zaal: '1', haltes: '2', beloning: '3', lijst: 'meer' };
  const STAP_NAAM = { '1': 'Kaart', '2': 'Haltes', '3': 'Schat', meer: 'Meer' };
  function publiceerPunten() {
    const w = shown().world;
    const was = w.released;
    delete w.released;
    let punten;
    try { punten = controleer(); } finally { if (was === false) w.released = false; }
    const naam = (w.icon || '') + ' ' + (w.name || w.id);
    return punten.filter(p => p.ernst === 'fout' && (p.w === naam || p.blokkeert));
  }
  let publicerenBezig = false;
  function tekenPubliceer(kijk) {
    const g = wereldNu();
    if (!g) return;
    const w = g.world;
    const punten = publiceerPunten();
    const vak = F('st-klaar');
    if (punten.length) {
      vak.className = 'st-check';
      vak.innerHTML = '<b>Eerst nog:</b><br>' + punten.map(p => {
        const stap = STAP_VAN[p.waar] || '1';
        return '· ' + esc(p.t) + ' <a href="#" data-stap="' + stap + '">→ ' + STAP_NAAM[stap] + '</a>';
      }).join('<br>');
      vak.querySelectorAll('a').forEach(a => {
        a.onclick = e => { e.preventDefault(); toonStap(a.dataset.stap); };
      });
    } else {
      vak.className = 'st-check schoon';
      vak.textContent = '✓ Klaar om te publiceren';
    }
    const ship = shippedFor(w.id);
    const live = !!ship && ship.released !== false;
    F('st-live').hidden = !live;
    F('st-live').textContent = w.name + ' is al live: kinderen zien je wijziging binnen een paar minuten.';
    const knop = F('st-publiceer');
    knop.textContent = '🚀 Publiceer ' + w.name;
    knop.disabled = !!punten.length || publicerenBezig;
    if (!publicerenBezig) {
      F('st-pubwat').textContent = punten.length ? ''
        : (live ? '' : 'Hij gaat open voor kinderen. ') + 'Opslaan, testen en naar main, in één keer.';
    }
    if (kijk) {
      if (sterNu()) zetStand('halverwege');
      const bel = w.beloning ? item(w.beloning) : null;
      if (bel && !F('st-pop')) F('st-bel-kijk').click();
    }
  }
  F('st-publiceer').onclick = async () => {
    const w = shown().world;
    const ship = shippedFor(w.id);
    if (ship && ship.released !== false
        && !confirm(w.name + ' is al live. Deze wijziging publiceren?\nKinderen zien hem binnen een paar minuten.')) return;
    publicerenBezig = true;
    F('st-publiceer').disabled = true;
    saveWorldDraft();
    setOut('');
    F('st-pubwat').textContent = 'Publiceren…';

    const klok = setInterval(() => {
      fetch('/api/publiceer').then(r => r.json())
        .then(s => { if (s.bezig && s.stap) F('st-pubwat').textContent = s.stap; })
        .catch(() => {});
    }, 1000);
    let j;
    try {
      const r = await fetch('/api/publiceer', { method: 'POST',
        body: JSON.stringify({ id: w.id, naam: w.name, concept: WORLDS, basis: WORLDS_SHIPPED }) });
      j = await r.json();
    } catch (e) {
      console.error('[wereldstudio] publiceren mislukte', e);
      j = { ok: false, tekst: 'Publiceren kan alleen met de studioserver (npm run studio).\nEr is niets veranderd.' };
    }
    clearInterval(klok);
    publicerenBezig = false;
    if (j.ok || j.opgeslagen) {



      delete w.released;
      WORLDS_SHIPPED.length = 0;
      JSON.parse(JSON.stringify(WORLDS)).forEach(x => WORLDS_SHIPPED.push(x));
      saveWorldDraft();

      if (j.ok || ['tests', 'main', 'pushen'].indexOf(j.stap) >= 0) GEWIJZIGD.clear();
      commit();
      if (window.parent !== window) {
        try {
          window.parent.postMessage({ wereldstudio: 'gepubliceerd', id: w.id, live: !!j.live },
            location.origin && location.origin !== 'null' ? location.origin : '*');
        } catch (e) { }
      }
    }
    F('st-pubwat').textContent = '';
    setOut(j.tekst || (j.ok ? 'Gepubliceerd.' : 'Publiceren lukte niet.'));
    tekenPubliceer(false);
  };




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
        if (!sameWorld(ship.schat || null, w.schat || null)) wat.push('getekende schat');
        if (!sameWorld(ship.venue || null, w.venue || null)) wat.push('zaal');
        if ((ship.released !== false) !== (w.released !== false)) wat.push(w.released === false ? 'dicht' : 'uitgebracht');
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




    [...GEWIJZIGD].sort().forEach(f =>
      regels.push('<span class="ct-let">·</span> ' + esc(f) + ' — beeld gewijzigd'));
    vak.className = 'st-check' + (regels.length ? '' : ' schoon');
    vak.innerHTML = regels.length
      ? regels.join('<br>')
      : '✓ je concept is gelijk aan wat er in het spel staat';
  }



















  function toonVoorbeeld(maten, keuze) {
    if (!maten.length) { setOut('kies eerst een toestelmaat'); return; }
    saveWorldDraft();




    const [scherm, st] = String(keuze || F('st-vscherm').value).split(':');
    const stand = st || (F('st-stand') ? F('st-stand').value : 'halverwege');
    const nr = viewWorldIdx + 1;
    let x = 60;
    maten.forEach(m => {
      const w = Number(m.split('x')[0]), h = Number(m.split('x')[1]);
      const url = location.pathname + '?debug&demo&star=p1&onuitgebracht'
        + (scherm === 'profile' ? '' : '&wereld=' + nr + '&stand=' + stand)
        + '&screen=' + scherm + '&fit=' + w + 'x' + h;
      const win = open(url, 'wsvoorbeeld' + w + 'x' + h,
        `popup=1,width=${w},height=${h},left=${x},top=80`);
      if (!win) { setOut('het venster werd geblokkeerd — sta pop-ups toe'); return; }
      x += Math.min(w, 520) + 20;
    });
    setOut(maten.length + ' venster(s) met ' + WORLDS[viewWorldIdx].name
      + ' geopend — ververs ze na een wijziging');
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

        if (r.ok) { F('st-msg').value = ''; GEWIJZIGD.clear(); tekenDiff(); refreshStatus(); }
      }))
      .catch(() => setOut('alleen via npm run preview'))
      .then(() => { knop.disabled = false; });
  };

  F('st-pr').onclick = () => {
    const knop = F('st-pr');
    knop.disabled = true;
    setOut('de snelle keuring, daarna pushen…');
    fetch('/api/pushpr', { method: 'POST' })
      .then(r => r.json())
      .then(j => {
        setOut(j.tekst);
        if (j.ok && j.url) open(j.url, '_blank', 'noopener');
      })
      .catch(() => setOut('alleen via npm run preview'))
      .then(() => { knop.disabled = false; });
  };

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





  (function toonConcept() {
    const info = typeof WORLD_DRAFT_INFO !== 'undefined' ? WORLD_DRAFT_INFO : null;
    const vak = F('st-concept');
    if (!info || !(info.verouderd || info.botsing.length)) return;
    const naam = id => { const w = WORLDS.filter(x => x.id === id)[0]; return w ? w.name : id; };
    vak.hidden = false;
    vak.innerHTML = 'Je concept was gebouwd op een oudere versie van het spel. Alleen jouw '
      + 'werelden (' + info.mijn.map(naam).map(esc).join(', ') + ') staan erop; de rest is zoals '
      + 'het nu in het project staat.'
      + (info.botsing.length ? '<br><b>⚠ Ook in het project veranderd sinds je begon: '
        + info.botsing.map(naam).map(esc).join(', ') + '.</b> Jouw versie staat erop — kijk hem na, '
        + 'of zet hem terug met ↶ deze terug.' : '');
  })();





  const wq = Number(new URLSearchParams(location.search).get('wereld'));
  viewWorldIdx = wq >= 1 && wq <= WORLDS.length ? wq - 1
    : Math.min(worldFor(P().level).index, WORLDS.length - 1);
  goWorld(viewWorldIdx);
  zetToestel(toestelKiezer.value);

  toonStap(new URLSearchParams(location.search).get('stap') || '1');






  const nieuwQ = new URLSearchParams(location.search);
  if (nieuwQ.get('nieuw')) {
    maakWereld(nieuwQ.get('nieuw'));


    nieuwQ.delete('nieuw');
    nieuwQ.set('wereld', String(viewWorldIdx + 1));
    try { history.replaceState(history.state, '', location.pathname + '?' + nieuwQ.toString().replace(/=(&|$)/g, '$1')); }
    catch (e) { }
  } else if (nieuwQ.has('nieuw')) F('st-new').click();
}

