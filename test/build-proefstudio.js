/*
 * Bouwt proefstudio.html: één bestand dat je aanklikt en waar je je
 * gegenereerde beelden op sleept.
 *
 *   node test/build-proefstudio.js
 *
 * Geen server, geen Node, geen terminal nodig om hem te gebruiken -- alleen om
 * hem te maken. Het resultaat is de hele app plus een sleepvlak, in één
 * bestand, dat overal werkt waar een browser is.
 *
 * Dit is met opzet een kopie en niet de app zelf: je sleept er van alles in,
 * keurt het meeste af, en index.html blijft daar helemaal buiten. Wat door de
 * keuring komt verhuist later netjes naar assets/bg/.
 *
 * De opmaak wordt niet hier nagebouwd maar uit test/scene.js gehaald, dat
 * daarom geen Node-modules gebruikt. Eén bron voor waar een beeld hoort en hoe
 * het eruitziet, gedeeld door npm run try, npm run preview en dit bestand.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'proefstudio.html');

const app = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const sceneSrc = fs.readFileSync(path.join(ROOT, 'test', 'scene.js'), 'utf8');

const OVERLAY = `
<style>
  /* ---- de lade ----
     Altijd zichtbaar, want het gaat om bééldjes: je moet kunnen zien wat je
     hebt zonder ergens overheen te gaan. Vier vakjes, één per plek in het
     spel. Leeg vakje = gestippeld, en het is zelf een sleepdoel, zodat je
     meteen ziet wat er nog kán. */
  #ps{position:fixed;right:12px;bottom:12px;z-index:99999;width:262px;
    font:12px/1.45 system-ui,-apple-system,sans-serif;color:#f1e9f7;
    background:rgba(16,7,27,.95);border:1px solid rgba(255,180,61,.4);
    border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,.55);overflow:hidden}
  #ps.klein{width:auto}
  #ps.klein .body{display:none}

  #ps .kop{display:flex;align-items:center;gap:8px;padding:7px 8px 7px 12px;
    background:rgba(255,255,255,.05);border-bottom:1px solid rgba(255,255,255,.09)}
  #ps.klein .kop{border-bottom:0}
  #ps .kop b{flex:1;font:600 10.5px/1 system-ui;letter-spacing:.13em;
    text-transform:uppercase;color:#ffb43d}
  #ps .kop button{background:none;border:0;color:#a793bc;cursor:pointer;
    font-size:15px;line-height:1;padding:2px 5px;border-radius:5px}
  #ps .kop button:hover{color:#fff;background:rgba(255,255,255,.1)}

  #ps .body{padding:10px 12px 12px}

  /* vier vakjes naast elkaar */
  #ps .lade{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}
  /* min-width:0 -- zonder dit mag een rasterkolom door zijn inhoud uitzetten,
     en liep "Landschap" het vakje van "Wolken" in. */
  #ps .vak{position:relative;display:flex;flex-direction:column;gap:4px;min-width:0;
    background:none;border:0;padding:0;cursor:pointer;font:inherit;color:inherit;text-align:center}
  #ps .beeld{position:relative;aspect-ratio:3/2;border-radius:6px;overflow:hidden;
    border:1.5px dashed rgba(255,255,255,.26);background:rgba(255,255,255,.04);
    display:grid;place-items:center}
  #ps .vak.vol .beeld{border-style:solid;border-color:rgba(255,180,61,.75)}
  #ps .vak:hover .beeld{border-color:#ffb43d}
  #ps .vak.sleepover .beeld{border-color:#8fd6ff;background:rgba(56,189,248,.22)}
  #ps .beeld img{width:100%;height:100%;object-fit:cover;display:block}
  /* wolken zijn doorzichtig; op een donkere duim zie je er niets van */
  #ps .vak[data-slot="sky"] .beeld{background:linear-gradient(#4b1a63,#7b2ff7)}
  #ps .beeld .plus{font-size:17px;color:rgba(255,255,255,.4);line-height:1}
  #ps .vak b{font:600 9px/1.2 system-ui;letter-spacing:.01em;color:#d9cce6;
    overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}
  #ps .vak.vol b{color:#ffb43d}

  /* meerdere kandidaten: stipjes onder het plaatje, klik = volgende */
  #ps .stippen{position:absolute;left:0;right:0;bottom:3px;display:flex;
    justify-content:center;gap:3px;pointer-events:none}
  #ps .stippen i{width:4px;height:4px;border-radius:50%;background:rgba(255,255,255,.45)}
  #ps .stippen i.aan{background:#ffb43d;transform:scale(1.35)}
  #ps .weg{position:absolute;top:2px;right:2px;width:16px;height:16px;border-radius:50%;
    border:0;background:rgba(10,4,18,.8);color:#ffb4b4;cursor:pointer;font-size:11px;
    line-height:1;padding:0;display:none}
  #ps .vak.vol:hover .weg{display:block}
  #ps .weg:hover{background:#d32f2f;color:#fff}

  #ps .uitleg{margin:9px 0 0;font-size:11px;color:#a793bc;line-height:1.45}
  #ps .uitleg b{color:#d9cce6;font-weight:600}

  #ps .streep{height:1px;background:rgba(255,255,255,.1);margin:11px -12px 10px}
  #ps .kopje{font:600 9.5px/1 system-ui;letter-spacing:.12em;text-transform:uppercase;
    color:#8571a0;margin-bottom:6px}
  #ps .knoppen{display:flex;flex-wrap:wrap;gap:4px}
  #ps .knoppen button{background:none;border:1px solid rgba(255,255,255,.2);
    color:#d9cce6;border-radius:5px;padding:3px 8px;cursor:pointer;font:12px system-ui}
  #ps .knoppen button:hover{border-color:#8fd6ff;color:#8fd6ff}
  #ps .knoppen button.aan{background:rgba(255,215,64,.2);border-color:#ffd740;color:#ffd740}
  #ps label{display:flex;align-items:center;gap:6px;cursor:pointer;user-select:none;
    margin-top:6px;font-size:12px}
  #ps label i{color:#8571a0;font-size:11px}
  #ps .maat{position:absolute;left:2px;bottom:2px;font:600 8.5px/1 system-ui;
    background:rgba(10,4,18,.82);color:#d9cce6;border-radius:3px;padding:2px 4px}
  #ps .maat.over{background:#8a2f2f;color:#ffd9d9}
  #ps .bewaar{width:100%;margin-top:9px;background:linear-gradient(#ffc23d,#ff8f00);
    color:#3a0f56;font:700 12px system-ui;border:0;border-radius:7px;padding:7px;cursor:pointer}
  #ps .bewaar:disabled{opacity:.45;cursor:default}
  #ps .bewaar:hover:not(:disabled){filter:brightness(1.07)}

  /* Sleep je een bestand ergens anders op de pagina, dan licht de hele lade op. */
  #ps.sleepaan{border-color:#8fd6ff;box-shadow:0 0 0 3px rgba(56,189,248,.25),0 10px 40px rgba(0,0,0,.55)}

  /* ---- toestelkader ----
     De truc zit in de transform: een element met een transform wordt het
     ankerpunt voor position:fixed eronder, dus de app-lagen die fixed staan
     (.grain, de confettilaag, de kleefkoppen) blijven binnen het kader in
     plaats van naar het venster te ontsnappen. */
  body.ps-kader{background:#0a0410!important;display:grid;place-items:center;
    min-height:100vh;margin:0;overflow:auto}
  body.ps-kader #ps-kader{transform:translateZ(0);overflow:hidden;position:relative;
    box-shadow:0 10px 50px rgba(0,0,0,.6);border-radius:14px;flex:none}
  body:not(.ps-kader) #ps-kader{display:contents}
</style>

<div id="ps">
  <div class="kop">
    <b>Proefstudio</b>
    <button id="ps-vouw" title="inklappen">&#8211;</button>
  </div>
  <div class="body">
    <div class="lade" id="ps-lade"></div>
    <p class="uitleg" id="ps-uitleg"></p>
    <button class="bewaar" id="ps-bewaar" disabled>Bewaar als WebP</button>

    <div class="streep"></div>
    <div class="kopje">Scherm</div>
    <div class="knoppen">
      <button data-ga="start">Startscherm</button>
      <button data-ga="map">Kaart</button><button data-ga="game">Show</button>
      <button data-ga="end">Einde</button><button data-ga="dress">Kleedkamer</button>
      <button data-ga="tro">Trofee&euml;n</button>
      <button data-ga="veeg">&#8644; Scrollen</button>
    </div>

    <div class="streep"></div>
    <div class="kopje">Maat</div>
    <div class="knoppen">
      <button data-maat="390x844">Telefoon</button>
      <button data-maat="320x568">Klein</button>
      <button data-maat="768x1024">Tablet</button>
      <button data-maat="vol" class="aan">Venster</button>
    </div>

    <div class="streep"></div>
    <div class="kopje">Vergelijken</div>
    <label title="Uit = het scherm zoals het zonder jouw beeld was. Zo zie je in een oogwenk wat het beeld toevoegt.">
      <input type="checkbox" id="ps-art" checked> kunstwerk aan <i>ervoor/erna</i></label>
    <label title="De donkere waas die in de app permanent over elke achtergrond ligt, zodat de som en de antwoordtegels leesbaar blijven. Uit = zien wat die waas voor je doet. Let op: aan is hoe het er in het echt uitziet.">
      <input type="checkbox" id="ps-veil" checked> donkere waas <i>leesbaarheid</i></label>
    <p class="uitleg">De <b>waas</b> hoort bij de app, niet bij deze proefopstelling:
      er ligt altijd een donkere sluier over de achtergrond zodat de som leesbaar blijft.
      Zet 'm uit om te zien wat hij voor je doet.</p>
  </div>
</div>
<input type="file" id="ps-invoer" accept="image/*" multiple hidden>

<script>
/* ---- gedeelde indeling en opmaak, letterlijk uit test/scene.js ---- */
${sceneSrc}

/* ---- de proefstudio ---- */
(function () {
  // De app zet zijn kijk-schakelaars aan op grond van de URL, en bij een
  // aangeklikt bestand is die leeg. Eén keer omleiden, vóórdat er iets
  // gesleept is -- daarna nooit meer herladen, want het gesleepte beeld staat
  // alleen in het geheugen.
  if (location.search.indexOf('debug') === -1) {
    location.replace(location.pathname + '?debug&demo&star=p1');
    return;
  }

  var ps = document.getElementById('ps');
  var lade = document.getElementById('ps-lade');
  var uitleg = document.getElementById('ps-uitleg');
  var invoer = document.getElementById('ps-invoer');
  var stVol = document.getElementById('ps-scene-vol');
  var stKaal = document.getElementById('ps-scene-kaal');

  // Per plek een stapel kandidaten. Je maakt er drie of vier per beeld en kiest
  // er één, dus naast elkaar kunnen leggen is de hele bedoeling.
  var plekken = {};                       // { venue: { lijst: [{naam, uri, bytes}], i: 0 } }
  var laatste = null;                     // laatst aangeraakte vakje, voor de bewaarknop
  var sleutels = Object.keys(SLOTS);      // venue, horizon, sky, finale
  sleutels.forEach(function (k) { plekken[k] = { lijst: [], i: 0 }; });

  function huidig() {
    var u = {};
    sleutels.forEach(function (k) {
      var st = plekken[k];
      if (st.lijst.length) u[k] = st.lijst[st.i].uri;
    });
    return u;
  }

  function opmaak() {
    var urls = huidig();
    stVol.textContent = css(urls, { scrim: true });
    stKaal.textContent = css(urls, { scrim: false });
    var art = document.getElementById('ps-art').checked;
    var veil = document.getElementById('ps-veil').checked;
    stVol.disabled = !(art && veil);
    stKaal.disabled = !(art && !veil);
  }

  function teken() {
    lade.textContent = '';
    var totaal = 0;

    sleutels.forEach(function (sleutel) {
      var st = plekken[sleutel];
      var info = SLOTS[sleutel];
      totaal += st.lijst.length;

      var vak = document.createElement('button');
      vak.className = 'vak' + (st.lijst.length ? ' vol' : '');
      vak.dataset.slot = sleutel;
      vak.title = st.lijst.length
        ? st.lijst[st.i].naam + ' — ' + info.waar +
          (st.lijst.length > 1 ? ' — klik voor de volgende van ' + st.lijst.length : '')
        : info.label + ' — ' + info.waar + '. Sleep hier een beeld naartoe.';

      var beeld = document.createElement('span');
      beeld.className = 'beeld';
      if (st.lijst.length) {
        var img = document.createElement('img');
        img.src = st.lijst[st.i].uri;
        img.alt = st.lijst[st.i].naam;
        beeld.appendChild(img);
        if (st.lijst.length > 1) {
          var stippen = document.createElement('span');
          stippen.className = 'stippen';
          st.lijst.forEach(function (_, n) {
            var i = document.createElement('i');
            if (n === st.i) i.className = 'aan';
            stippen.appendChild(i);
          });
          beeld.appendChild(stippen);
        }
        var weg = document.createElement('button');
        weg.className = 'weg'; weg.textContent = '\\u00d7';
        weg.title = 'dit beeld weghalen';
        weg.onclick = function (e) {
          e.stopPropagation();
          st.lijst.splice(st.i, 1);
          st.i = Math.min(st.i, Math.max(0, st.lijst.length - 1));
          teken();
        };
        beeld.appendChild(weg);
        var kb = Math.round((st.lijst[st.i].bytes || 0) / 1024);
        var maat = document.createElement('span');
        maat.className = 'maat' + (kb > 120 ? ' over' : '');
        maat.textContent = kb + ' KB';
        maat.title = kb > 120
          ? 'Boven het budget van 120 KB. Dat geeft niet voor een bronbestand -- druk op "Bewaar als WebP" en het wordt vanzelf klein.'
          : 'Past binnen het budget van 120 KB.';
        beeld.appendChild(maat);
      } else {
        var plus = document.createElement('span');
        plus.className = 'plus'; plus.textContent = '+';
        beeld.appendChild(plus);
      }

      var naam = document.createElement('b');
      naam.textContent = info.label;

      vak.appendChild(beeld); vak.appendChild(naam);

      // Klik: leeg vakje opent de bestandskiezer en onthoudt wáár het heen moet.
      // Gevuld vakje met meerdere kandidaten stapt door naar de volgende.
      vak.onclick = function () {
        laatste = sleutel;
        if (!st.lijst.length) { doel = sleutel; invoer.click(); return; }
        if (st.lijst.length > 1) st.i = (st.i + 1) % st.lijst.length;
        teken();
      };

      // Slepen op een vakje wint altijd van de bestandsnaam: zo kun je een
      // "image (3).png" gewoon op de goede plek laten vallen.
      vak.addEventListener('dragover', function (e) { e.preventDefault(); vak.classList.add('sleepover'); });
      vak.addEventListener('dragleave', function () { vak.classList.remove('sleepover'); });
      vak.addEventListener('drop', function (e) {
        e.preventDefault(); e.stopPropagation();
        vak.classList.remove('sleepover');
        neem(e.dataTransfer.files, sleutel);
      });

      lade.appendChild(vak);
    });

    uitleg.innerHTML = totaal === 0
      ? 'Sleep je gegenereerde beelden hierheen \\u2014 op een vakje, of gewoon ergens op de pagina. Niets wordt bewaard of verstuurd.'
      : 'Meer van hetzelfde? Sleep ze op hetzelfde vakje; <b>klik</b> om te wisselen.';

    opmaak();
    zetBewaarKnop();
  }

  /* ---- zwart omzetten naar doorzichtig ----
     De wolkenplaat wordt met een zwarte achtergrond gemaakt, want dat is voor
     een beeldmaker veel makkelijker dan echte doorzichtigheid. In de app kan
     dat zwart niet met een screen-menging weg (zie test/scene.js), dus bakken
     we het hier om: hoe donkerder een beeldpunt, hoe doorzichtiger. Wat je
     daarna bewaart is een gewone WebP met alfa. */
  function zwartWegbakken(uri) {
    return new Promise(function (klaar) {
      var img = new Image();
      img.onload = function () {
        var c = document.createElement('canvas');
        c.width = img.width; c.height = img.height;
        var ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);
        var d;
        try { d = ctx.getImageData(0, 0, c.width, c.height); }
        catch (e) { return klaar(uri); }      // mag niet lezen: laat maar
        var v = d.data;
        for (var i = 0; i < v.length; i += 4) {
          // alfa = de helderste kanaalwaarde, dus zwart wordt volledig doorzichtig
          var a = Math.max(v[i], v[i + 1], v[i + 2]);
          v[i + 3] = Math.min(255, Math.round(a * 1.15));
        }
        ctx.putImageData(d, 0, 0);
        klaar(c.toDataURL('image/png'));
      };
      img.onerror = function () { klaar(uri); };
      img.src = uri;
    });
  }

  /* ---- opslaan als WebP ----
     Beeldmakers leveren PNG's van een paar megabyte. Prima als bron, niet om
     mee te leveren: het spel is een app die gezinnen op telefoondata laden.
     Gemeten op hetzelfde beeld van 1024x1536 -- PNG 1075 KB, WebP q0.9 67 KB,
     q0.8 41 KB. De browser kan dit zelf, dus er hoeft geen apart gereedschap
     aan te pas. Uitsnijden op de leveringsverhouding, verkleinen naar de
     leveringsmaat, en met de kwaliteit zakken tot het onder de 120 KB zit. */
  function snijEnSchaal(img, sleutel) {
    var lever = SLOTS[sleutel].lever, bw = lever[0], bh = lever[1];
    var c = document.createElement('canvas');
    c.width = bw; c.height = bh;
    var ctx = c.getContext('2d');
    // vullen zoals CSS cover: schalen op de langste kant, de rest valt weg
    var schaal = Math.max(bw / img.width, bh / img.height);
    var w = img.width * schaal, h = img.height * schaal;
    var x = (bw - w) / 2;
    // de horizon wordt onderaan verankerd, want daar zit zijn tekening
    var y = SLOTS[sleutel].anker === 'onder' ? (bh - h) : (bh - h) / 2;
    ctx.drawImage(img, x, y, w, h);
    return c;
  }

  function welkVakje() {
    if (laatste && plekken[laatste].lijst.length) return laatste;
    for (var i = 0; i < sleutels.length; i++) {
      if (plekken[sleutels[i]].lijst.length) return sleutels[i];
    }
    return null;
  }

  function bewaar() {
    var sleutel = welkVakje();
    if (!sleutel) return;
    var st = plekken[sleutel], kandidaat = st.lijst[st.i];
    var knop = document.getElementById('ps-bewaar');
    knop.disabled = true; knop.textContent = 'Bezig\u2026';

    var img = new Image();
    img.onload = function () {
      var c = snijEnSchaal(img, sleutel);
      var data = null;
      var trappen = [0.9, 0.85, 0.8, 0.75, 0.7, 0.65];
      for (var i = 0; i < trappen.length; i++) {
        data = c.toDataURL('image/webp', trappen[i]);
        if (data.length * 3 / 4 <= 120 * 1024) break;
      }
      var kb = Math.round(data.length * 3 / 4 / 1024);
      // naam: die van jou als hij al klopt, anders de officiële
      var basis = kandidaat.naam.replace(/\.[^.]+$/, '');
      var naam = (classify(kandidaat.naam) === sleutel) ? basis + '.webp' : SLOTS[sleutel].canoniek;
      var a = document.createElement('a');
      a.href = data; a.download = naam;
      document.body.appendChild(a); a.click(); a.remove();
      knop.disabled = false;
      knop.textContent = naam + ' \u00b7 ' + kb + ' KB';
      setTimeout(zetBewaarKnop, 4000);
    };
    img.onerror = function () { knop.disabled = false; knop.textContent = 'Omzetten mislukt'; };
    img.src = kandidaat.uri;
  }

  function zetBewaarKnop() {
    var knop = document.getElementById('ps-bewaar');
    var sleutel = welkVakje();
    knop.disabled = !sleutel;
    knop.textContent = sleutel ? 'Bewaar ' + SLOTS[sleutel].label.toLowerCase() + ' als WebP'
                               : 'Bewaar als WebP';
    knop.title = sleutel
      ? 'Snijdt uit op ' + SLOTS[sleutel].lever.join('\u00d7') + ', zet om naar WebP en zakt met de kwaliteit tot het onder de 120 KB blijft.'
      : 'Eerst een beeld toevoegen.';
  }

  // ---- bestanden aannemen ----
  var doel = null;      // gezet als er op een bepaald vakje gemikt wordt
  function neem(files, forceer) {
    var plek = forceer || doel; doel = null;
    Array.prototype.forEach.call(files, function (f) {
      if (!/^image\\//.test(f.type) && !isImage(f.name)) return;
      var r = new FileReader();
      r.onload = function () {
        var sleutel = plek || classify(f.name) || 'venue';
        laatste = sleutel;
        var st = plekken[sleutel];
        // alleen de wolken worden omgebakken; de rest gaat ongemoeid door
        var voor = sleutel === 'sky' ? zwartWegbakken(r.result) : Promise.resolve(r.result);
        voor.then(function (uri) {
          st.lijst.push({ naam: f.name, uri: uri, bytes: f.size });
          st.i = st.lijst.length - 1;        // het nieuwste meteen tonen
          teken();
        });
      };
      r.readAsDataURL(f);
    });
  }

  // Slepen op de rest van de pagina mag ook; dan beslist de bestandsnaam.
  ['dragenter', 'dragover'].forEach(function (e) {
    document.addEventListener(e, function (ev) { ev.preventDefault(); ps.classList.add('sleepaan'); });
  });
  ['dragleave', 'drop'].forEach(function (e) {
    document.addEventListener(e, function (ev) { ev.preventDefault(); ps.classList.remove('sleepaan'); });
  });
  document.addEventListener('drop', function (ev) { neem(ev.dataTransfer.files); });

  invoer.onchange = function () { neem(invoer.files); invoer.value = ''; };
  document.getElementById('ps-bewaar').onclick = bewaar;
  document.getElementById('ps-art').onchange = opmaak;
  document.getElementById('ps-veil').onchange = opmaak;
  document.getElementById('ps-vouw').onclick = function () {
    var dicht = ps.classList.toggle('klein');
    this.textContent = dicht ? '+' : '\\u2013';
    this.title = dicht ? 'uitklappen' : 'inklappen';
  };

  /* ---- scrollen naspelen ----
     De kaart schuift horizontaal en de lagen krijgen daarbij parallax.
     Stilstaand zie je daar niets van, en juist daar zitten de fouten. */
  function wacht(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  async function veegAs(el, as, duur) {
    var max = as === 'x' ? el.scrollWidth - el.clientWidth : el.scrollHeight - el.clientHeight;
    if (max < 8) return;
    var t0 = performance.now();
    for (;;) {
      var t = (performance.now() - t0) / duur;
      if (t >= 1) break;
      var f = (1 - Math.cos(t * 2 * Math.PI)) / 2;    // heen en terug, zacht
      if (as === 'x') el.scrollLeft = max * f; else el.scrollTop = max * f;
      await wacht(16);
    }
    if (as === 'x') el.scrollLeft = 0; else el.scrollTop = 0;
  }
  var veegBezig = false;
  async function veeg() {
    if (veegBezig) return;
    veegBezig = true;
    try {
      var scherm = document.querySelector('.screen.active');
      var kaart = scherm && scherm.querySelector('.tour-map');
      if (kaart) await veegAs(kaart, 'x', 3600);
      if (scherm) await veegAs(scherm, 'y', 2400);
    } finally { veegBezig = false; }
  }

  // ---- schermen wisselen, zonder te herladen ----
  document.querySelectorAll('#ps .knoppen button[data-ga]').forEach(function (b) {
    b.onclick = function () {
      var w = b.dataset.ga;
      if (w === 'veeg') return veeg();
      try {
        if (w === 'start') { cur = null; goProfiles(); }
        else if (w === 'map') goMap();
        else if (w === 'dress') openKleedkamer();
        else if (w === 'tro') openTrophies();
        else if (w === 'game') startLevel(P().level);
        else if (w === 'end') { startLevel(P().level); endLevel(true); }
      } catch (e) { console.warn('scherm wisselen mislukt:', e); }
    };
  });

  /* ---- toestelmaten ----
     De app is in de eerste plaats een telefoonspel. Op een breed scherm
     beoordeel je 'm op een maat die bijna geen kind gebruikt. */
  var kader = document.createElement('div');
  kader.id = 'ps-kader';
  (function () {
    var mee = [document.getElementById('app')]
      .concat([].slice.call(document.querySelectorAll('body > .grain, body > #confetti-layer')))
      .filter(Boolean);
    if (!mee.length) return;
    mee[0].parentNode.insertBefore(kader, mee[0]);
    mee.forEach(function (el) { kader.appendChild(el); });
  })();

  var bodyGedaan = false;
  function zetMaat(maat) {
    if (!bodyGedaan) { kader.style.background = getComputedStyle(document.body).background; bodyGedaan = true; }
    if (maat === 'vol') {
      document.body.classList.remove('ps-kader');
      kader.style.width = kader.style.height = '';
    } else {
      var wh = maat.split('x');
      document.body.classList.add('ps-kader');
      kader.style.width = wh[0] + 'px';
      kader.style.height = wh[1] + 'px';
    }
    document.querySelectorAll('#ps .knoppen button[data-maat]').forEach(function (b) {
      b.classList.toggle('aan', b.dataset.maat === maat);
    });
    window.dispatchEvent(new Event('resize'));
  }
  document.querySelectorAll('#ps .knoppen button[data-maat]').forEach(function (b) {
    b.onclick = function () { zetMaat(b.dataset.maat); };
  });

  teken();
})();

/* Parallax: de grond en de lucht schuiven met de kaart mee, allebei herhalend. */
${'${SCENE_PARALLAX}'}
</script>`;

const OVERLAY2 = OVERLAY.replace('${SCENE_PARALLAX}', require('./scene.js').parallaxJs());

const html = app
  .replace('</head>', '<style id="ps-scene-vol"></style><style id="ps-scene-kaal"></style></head>')
  .replace('</body>', OVERLAY2 + '</body>');

fs.writeFileSync(OUT, html);
const kb = Math.round(Buffer.byteLength(html) / 1024);
console.log('\n  proefstudio.html geschreven — ' + kb + ' KB');
console.log('  Aanklikken en er beelden op slepen. Geen server, geen installatie.\n');
