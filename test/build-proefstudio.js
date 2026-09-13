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
  #ps{position:fixed;z-index:99999;font:12px/1.5 system-ui,sans-serif;color:#f1e9f7}
  /* leeg: groot vlak in het midden. gevuld: klein hoekje rechtsonder. */
  #ps.leeg{inset:0;display:grid;place-items:center;background:rgba(8,3,14,.86)}
  #ps.vol{right:10px;bottom:10px}
  #ps .kaart{background:rgba(13,6,22,.95);border:1px solid rgba(255,180,61,.45);
    border-radius:12px;padding:16px 18px;max-width:330px}
  #ps.vol .kaart{padding:8px 10px;border-radius:8px}
  #ps h6{margin:0 0 6px;font-size:10px;letter-spacing:.11em;text-transform:uppercase;color:#ffb43d;cursor:pointer}
  #ps h6::after{content:' ▾';opacity:.55}
  #ps.dicht h6::after{content:' ▸'}
  #ps.dicht .kaart{padding:3px 9px;background:rgba(13,6,22,.62);border-color:rgba(255,180,61,.25)}
  #ps.dicht .kaart > :not(h6){display:none}
  #ps .groot{font-size:15px;font-weight:700;margin:0 0 6px;color:#fff}
  #ps p{margin:0 0 10px;color:#a793bc}
  #ps .knop{display:inline-block;background:linear-gradient(#ffc23d,#ff8f00);color:#3a0f56;
    font-weight:800;border:0;border-radius:8px;padding:7px 13px;cursor:pointer;font-size:13px}
  #ps ul{list-style:none;margin:0 0 7px;padding:0}
  #ps li{display:flex;align-items:center;gap:5px;margin-bottom:3px}
  #ps li span{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:135px}
  #ps select{background:#2a1140;color:#f1e9f7;border:1px solid rgba(255,255,255,.25);
    border-radius:4px;font:11px system-ui;padding:1px 3px}
  #ps .weg{background:none;border:0;color:#ffb4b4;cursor:pointer;font-size:14px;line-height:1;padding:0 3px}
  #ps label{display:block;cursor:pointer;user-select:none}
  #ps nav{display:flex;flex-wrap:wrap;gap:4px;margin-top:7px}
  #ps nav button{background:none;color:#8fd6ff;border:1px solid rgba(143,214,255,.32);
    border-radius:4px;padding:2px 7px;cursor:pointer;font:11px system-ui}
  #ps .sleep{outline:3px dashed #ffb43d;outline-offset:-10px}
  #ps .maten{display:flex;flex-wrap:wrap;gap:4px;margin-top:7px;
    border-top:1px solid rgba(255,255,255,.14);padding-top:7px}
  #ps .maten button{background:none;color:#ffd740;border:1px solid rgba(255,215,64,.3);
    border-radius:4px;padding:2px 7px;cursor:pointer;font:11px system-ui}
  #ps .maten button.aan{background:rgba(255,215,64,.22);border-color:#ffd740}

  /* Het toestelkader. De truc zit in de transform: een element met een
     transform wordt het ankerpunt voor position:fixed eronder, dus de app-lagen
     die fixed staan (.grain, #confetti-layer, de kleefkoppen) blijven binnen
     het kader in plaats van naar het venster te ontsnappen. Zonder dat zou een
     "telefoon" een kader zijn met de helft van de app eromheen. */
  body.ps-kader{background:#0a0410!important;display:grid;place-items:center;
    min-height:100vh;margin:0;overflow:auto}
  body.ps-kader #ps-kader{transform:translateZ(0);overflow:hidden;position:relative;
    box-shadow:0 10px 50px rgba(0,0,0,.6);border-radius:14px;flex:none}
  body:not(.ps-kader) #ps-kader{display:contents}
</style>

<div id="ps" class="leeg">
  <div class="kaart">
    <h6>studio</h6>
    <div id="ps-leeg">
      <p class="groot">Sleep je gegenereerde beeld hierheen</p>
      <p>Of kies een bestand. Heet het <b>venue-…</b>, <b>map-horizon</b>, <b>map-sky</b>
         of <b>finale</b>, dan komt het vanzelf op de goede plek; anders kies je die
         er zo bij. Er wordt niets bewaard en niets verstuurd.</p>
      <p>Daarna krimpt dit tot een hoekje rechtsonder, zodat je het scherm kunt
         beoordelen. Ga er met de muis overheen en het klapt weer open.</p>
      <button class="knop" id="ps-kies">Kies een bestand…</button>
    </div>
    <div id="ps-vol" hidden>
      <ul id="ps-lijst"></ul>
      <label><input type="checkbox" id="ps-art" checked> kunstwerk aan <i>(uit = ervoor/erna)</i></label>
      <label><input type="checkbox" id="ps-veil" checked> donkere sluier</label>
      <div class="maten">
        <button data-maat="390x844">Telefoon</button>
        <button data-maat="320x568">Klein</button>
        <button data-maat="768x1024">Tablet</button>
        <button data-maat="vol" class="aan">Venster</button>
      </div>
      <nav>
        <button data-ga="map">Kaart</button><button data-ga="game">Show</button>
        <button data-ga="end">Einde</button><button data-ga="dress">Kleedkamer</button>
        <button data-ga="tro">Trofee&euml;n</button>
        <button data-ga="veeg">⇄ Scrollen</button>
        <button data-ga="meer">+ nog een beeld</button>
        <button data-ga="vast" id="ps-vast" title="vastzetten zodat het hoekje open blijft">📌</button>
      </nav>
    </div>
  </div>
</div>
<input type="file" id="ps-invoer" accept="image/*" multiple hidden>

<script>
/* ---- gedeelde indeling en opmaak, letterlijk uit test/scene.js ---- */
${sceneSrc}

/* ---- de proefstudio zelf ---- */
(function () {
  // De app zet zijn kijk-schakelaars aan op grond van de URL, en bij een
  // aangeklikt bestand is die leeg. Eén keer omleiden, vóórdat er iets
  // gesleept is -- daarna nooit meer herladen, want het gesleepte beeld staat
  // alleen in het geheugen en zou bij een herlading verdwijnen.
  if (location.search.indexOf('debug') === -1) {
    location.replace(location.pathname + '?debug&demo&star=p1');
    return;
  }

  var urls = {}, namen = {};
  var ps = document.getElementById('ps');
  var lijst = document.getElementById('ps-lijst');
  var invoer = document.getElementById('ps-invoer');
  var stVol = document.getElementById('ps-scene-vol');
  var stKaal = document.getElementById('ps-scene-kaal');

  var vast = false;
  var wasLeeg = true;

  function teken() {
    var leeg = Object.keys(urls).length === 0;
    /* Uitgeklapt bedekt het hoekje precies de antwoordtegels, en daar moet je
       juist naar kunnen kijken. Dus na het eerste beeld klapt het dicht.
       Daarna niet meer: teken() draait ook bij het omzetten van een plek of het
       aanvinken van een schakelaar, en toen klapte het paneel dicht terwijl de
       muis erop stond -- er volgt dan geen nieuwe mouseenter, dus het ging pas
       weer open als je er eerst vanaf ging. */
    var dicht = leeg ? false
      : (wasLeeg ? !vast : ps.classList.contains('dicht'));
    ps.className = leeg ? 'leeg' : ('vol' + (dicht ? ' dicht' : ''));
    wasLeeg = leeg;
    document.getElementById('ps-leeg').hidden = !leeg;
    document.getElementById('ps-vol').hidden = leeg;

    stVol.textContent = css(urls, { scrim: true });
    stKaal.textContent = css(urls, { scrim: false });
    var art = document.getElementById('ps-art').checked;
    var veil = document.getElementById('ps-veil').checked;
    stVol.disabled = !(art && veil);
    stKaal.disabled = !(art && !veil);

    lijst.textContent = '';
    Object.keys(urls).forEach(function (slot) {
      var li = document.createElement('li');
      var naam = document.createElement('span');
      naam.textContent = namen[slot];
      naam.title = namen[slot];
      var kies = document.createElement('select');
      Object.keys(SLOTS).forEach(function (k) {
        var o = document.createElement('option');
        o.value = k; o.textContent = k; o.selected = k === slot;
        kies.appendChild(o);
      });
      kies.onchange = function () {
        var nieuw = kies.value, u = urls[slot], n = namen[slot];
        delete urls[slot]; delete namen[slot];
        urls[nieuw] = u; namen[nieuw] = n;
        teken();
      };
      var weg = document.createElement('button');
      weg.className = 'weg'; weg.textContent = '×'; weg.title = 'weghalen';
      weg.onclick = function () { delete urls[slot]; delete namen[slot]; teken(); };
      li.appendChild(naam); li.appendChild(kies); li.appendChild(weg);
      lijst.appendChild(li);
    });
  }

  function neem(files) {
    Array.prototype.forEach.call(files, function (f) {
      if (!/^image\\//.test(f.type) && !isImage(f.name)) return;
      var r = new FileReader();
      r.onload = function () {
        // onbekende naam? dan venue, en je zet 'm zelf recht met het keuzelijstje
        var slot = classify(f.name) || 'venue';
        urls[slot] = r.result;
        namen[slot] = f.name;
        teken();
      };
      r.readAsDataURL(f);
    });
  }

  ['dragenter', 'dragover'].forEach(function (e) {
    document.addEventListener(e, function (ev) { ev.preventDefault(); ps.classList.add('sleep'); });
  });
  ['dragleave', 'drop'].forEach(function (e) {
    document.addEventListener(e, function (ev) { ev.preventDefault(); ps.classList.remove('sleep'); });
  });
  document.addEventListener('drop', function (ev) { neem(ev.dataTransfer.files); });

  document.getElementById('ps-kies').onclick = function () { invoer.click(); };
  invoer.onchange = function () { neem(invoer.files); invoer.value = ''; };
  document.getElementById('ps-art').onchange = teken;
  document.getElementById('ps-veil').onchange = teken;
  document.querySelector('#ps h6').onclick = function () { ps.classList.toggle('dicht'); };
  ps.addEventListener('mouseenter', function () { if (!ps.classList.contains('leeg')) ps.classList.remove('dicht'); });
  ps.addEventListener('mouseleave', function () { if (!vast && !ps.classList.contains('leeg')) ps.classList.add('dicht'); });

  // Schermen wisselen zonder te herladen: de app-functies staan in dezelfde
  // scope. Herladen zou het gesleepte beeld kwijtraken.
  document.querySelectorAll('#ps nav button').forEach(function (b) {
    b.onclick = function () {
      var w = b.dataset.ga;
      if (w === 'meer') return invoer.click();
      if (w === 'vast') { vast = !vast; b.style.opacity = vast ? 1 : .45; return; }
      if (w === 'veeg') return veeg();
      try {
        if (w === 'map') goMap();
        else if (w === 'dress') openKleedkamer();
        else if (w === 'tro') openTrophies();
        else if (w === 'game') startLevel(P().level);
        else if (w === 'end') { startLevel(P().level); endLevel(true); }
      } catch (e) { console.warn('scherm wisselen mislukt:', e); }
    };
  });

  /* ---- scrollen naspelen ----
     De kaart schuift horizontaal (.tour-map is overflow-x:auto) en de lucht
     krijgt daarbij parallax van updateParallax: -scrollLeft * 0.06. Stilstaand
     zie je daar niets van, en juist daar zitten de fouten -- een rand van de
     wolkenplaat die naar binnen loopt, of een stuk tekening dat pas onder de
     stadspenningen vandaan komt als je doorschuift. Schermen zelf scrollen
     verticaal (overflow-y:auto), wat op de krappe maat uitmaakt.
     Deze knop veegt beide assen heen en terug, zodat je het ziet in plaats van
     het te moeten bedenken. */
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  async function veegAs(el, as, duur) {
    var max = as === 'x' ? el.scrollWidth - el.clientWidth : el.scrollHeight - el.clientHeight;
    if (max < 8) return;
    var t0 = performance.now();
    for (;;) {
      var t = (performance.now() - t0) / duur;
      if (t >= 1) break;
      // heen en terug, met een zachte in- en uitloop
      var f = (1 - Math.cos(t * 2 * Math.PI)) / 2;
      if (as === 'x') el.scrollLeft = max * f; else el.scrollTop = max * f;
      await sleep(16);
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

  /* ---- toestelmaten ----
     De app is in de eerste plaats een telefoonspel. Op een breed scherm
     beoordeel je 'm op een maat die bijna geen kind gebruikt, en juist de
     krappe maat laat zien of de som nog leesbaar is over de tekening heen. */
  var kader = document.createElement('div');
  kader.id = 'ps-kader';
  (function () {
    // #app en de vaste lagen erbij in: anders blijven die achter het kader hangen
    var mee = [document.getElementById('app')]
      .concat([].slice.call(document.querySelectorAll('body > .grain, body > #confetti-layer')))
      .filter(Boolean);
    if (!mee.length) return;
    mee[0].parentNode.insertBefore(kader, mee[0]);
    mee.forEach(function (el) { kader.appendChild(el); });
  })();

  // De achtergrond van body hoort bij de app; binnen een kader moet hij mee
  // naar binnen, anders staat de verloopachtergrond buiten het "toestel".
  var bodyAchtergrond = null;
  function zetMaat(maat) {
    if (bodyAchtergrond === null) {
      var cs = getComputedStyle(document.body);
      bodyAchtergrond = cs.backgroundImage + ' ' + cs.backgroundColor;
      kader.style.background = cs.background;
    }
    if (maat === 'vol') {
      document.body.classList.remove('ps-kader');
      kader.style.width = kader.style.height = '';
    } else {
      var wh = maat.split('x');
      document.body.classList.add('ps-kader');
      kader.style.width = wh[0] + 'px';
      kader.style.height = wh[1] + 'px';
    }
    document.querySelectorAll('#ps .maten button').forEach(function (b) {
      b.classList.toggle('aan', b.dataset.maat === maat);
    });
    // De app rekent bij het formaat opnieuw uit waar dingen staan
    window.dispatchEvent(new Event('resize'));
  }
  document.querySelectorAll('#ps .maten button').forEach(function (b) {
    b.onclick = function () { zetMaat(b.dataset.maat); };
  });

  document.getElementById('ps-vast').style.opacity = .45;
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
