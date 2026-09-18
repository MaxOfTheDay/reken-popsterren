/*
 * Een snelkoppeling naar de studio op je bureaublad.
 *
 *   npm run snelkoppeling
 *
 * Daarna is `npm run studio` niet meer nodig: dubbelklik het icoontje, de
 * server start en het venster gaat open. Draait er al een studio, dan opent
 * hij gewoon dat venster (zie --open in test/preview.js).
 *
 * Waarom een generator en geen bestand in de map: een snelkoppeling moet het
 * volledige pad naar jóúw kloon en jóúw node bevatten, en dat weet alleen de
 * machine waar hij gemaakt wordt. Een ingecheckt bestand zou bij iedereen naar
 * de verkeerde plek wijzen.
 *
 * Drie soorten, één per bureaublad dat er bestaat:
 *   macOS    Rekensterren Studio.command   (dubbelklik opent Terminal)
 *   Windows  Rekensterren Studio.cmd
 *   Linux    Rekensterren Studio.desktop
 *
 * En er komen er twéé van:
 *
 *   Rekensterren Studio             start wat er uitgecheckt staat. Dat is de
 *                                   veilige: hij raakt je werkmap niet aan.
 *   Rekensterren Studio (nieuwste)  haalt eerst op en wisselt dan -- Enter voor
 *                                   de laatste main, of een PR-nummer. Dit is de
 *                                   knop voor "laat me gewoon het nieuwste zien",
 *                                   want dát vergeet je anders elke keer.
 *
 * De tweede gooit nog steeds niets weg: staat er werk open, dan weigert de wissel
 * met een uitleg en start de studio op wat er stond (zie naarBron in preview.js).
 *
 * De node die dit draait wordt erin gezet, zodat het ook werkt als node niet
 * in je PATH staat (bij een dubbelklik is dat vaak een andere PATH dan in je
 * terminal). In de twee scriptjes (macOS, Windows) staat er een terugval op
 * gewoon "node" achter, voor als dat pad later verdwijnt.
 *
 * Op Linux niet: een .desktop-bestand heeft geen opdrachtregel waarin je een
 * "anders dit"-tak kwijt kunt, en die er met `sh -c` in wringen levert drie
 * lagen aanhalingstekens op die per bureaubladomgeving anders worden gelezen --
 * meer kans op stuk dan de storing die het zou opvangen. Werk je node bij en
 * doet de snelkoppeling het niet meer, dan is `npm run snelkoppeling` genoeg;
 * dat geldt op alle drie.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

/* Het bestand zelf, per platform. Apart van het wegschrijven zodat een test alle
   drie kan nakijken zonder een bureaublad aan te raken. */
function maak(platform, opties) {
  const o = opties || {};
  const root = o.root || ROOT;
  const node = o.node || process.execPath;
  const server = path.join(root, 'test', 'preview.js');
  /* De tweede snelkoppeling. `--naar=vraag` laat preview.js het vragen in plaats
     van de shell: één implementatie voor drie bureaubladen, en geen drie lagen
     aanhalingstekens in een .desktop-bestand (zie de kop). */
  const nieuwste = !!o.naar;
  const vlaggen = '--open' + (nieuwste ? ' --naar=' + (o.naar === true ? 'vraag' : o.naar) : '');
  const achter = nieuwste ? ' (nieuwste)' : '';

  if (platform === 'win32') {
    return {
      naam: 'Rekensterren Studio' + achter + '.cmd',
      uitvoerbaar: false,
      inhoud: [
        '@echo off',
        'title Rekensterren Dev Studio' + achter,
        'set "NODE=' + node + '"',
        'if not exist "%NODE%" set "NODE=node"',
        'cd /d "' + root + '"',
        '"%NODE%" "' + server + '" ' + vlaggen,
        'echo.',
        'echo De studio is gestopt. Dit venster mag dicht.',
        'pause >nul',
        '',
      ].join('\r\n'),
    };
  }

  if (platform === 'linux') {
    /* Een .desktop-bestand en geen script: dan krijg je een naam en een icoontje
       in plaats van "Rekensterren Studio.sh". Terminal=true, want de server
       blijft draaien en je wilt hem met Ctrl-C kunnen stoppen -- en je ziet het
       meteen als het pad naar node niet meer klopt (zie de kop). */
    return {
      naam: 'Rekensterren Studio' + achter + '.desktop',
      uitvoerbaar: true,
      inhoud: [
        '[Desktop Entry]',
        'Type=Application',
        'Name=Rekensterren Studio' + achter,
        'Comment=' + (nieuwste
          ? 'Eerst ophalen en wisselen, dan de Dev Studio'
          : 'De Dev Studio: versie, werelden, standen en beeldkeuring'),
        // Exec kent zijn eigen aanhalingstekens; zonder die breekt een pad met een spatie
        'Exec="' + node + '" "' + server + '" ' + vlaggen,
        'Path=' + root,
        'Icon=' + path.join(root, 'icon-512.png'),
        'Terminal=true',
        'Categories=Development;',
        '',
      ].join('\n'),
    };
  }

  // macOS (en alles wat verder op een unix lijkt): een .command is het enige
  // wat je op een Mac kunt dubbelklikken zonder er een .app omheen te bouwen.
  return {
    naam: 'Rekensterren Studio' + achter + '.command',
    uitvoerbaar: true,
    inhoud: [
      '#!/bin/sh',
      '# Gemaakt door `npm run snelkoppeling`. Weggooien mag; maak hem dan opnieuw.',
      'NODE="' + node + '"',
      '[ -x "$NODE" ] || NODE=node',
      'cd "' + root + '" || exit 1',
      'exec "$NODE" "' + server + '" ' + vlaggen,
      '',
    ].join('\n'),
  };
}

/* Allebei, want ze horen bij elkaar: de ene start wat er staat, de andere haalt
   eerst het nieuwste op. */
function maakAlle(platform, opties) {
  const o = opties || {};
  return [maak(platform, o), maak(platform, Object.assign({}, o, { naar: o.naar || true }))];
}

/* Waar staat het bureaublad? Drie plekken om te kijken, en als geen ervan
   bestaat is dat geen fout: dan komt de snelkoppeling in de projectmap te staan
   en zegt de melding dat je hem zelf mag verslepen. */
function bureaublad() {
  const thuis = os.homedir();
  const kandidaten = [
    process.env.RP_BUREAUBLAD,                       // voor de test, en voor een eigen plek
    path.join(thuis, 'Desktop'),
    path.join(thuis, 'Bureaublad'),                  // een Nederlandse Windows
    process.env.OneDrive && path.join(process.env.OneDrive, 'Desktop'),
  ].filter(Boolean);
  for (const k of kandidaten) {
    try { if (fs.statSync(k).isDirectory()) return k; } catch (e) { /* volgende */ }
  }
  return null;
}

function schrijf() {
  const waar = bureaublad();
  const map = waar || ROOT;
  const gemaakt = [];
  for (const s of maakAlle(process.platform)) {
    const doel = path.join(map, s.naam);
    fs.writeFileSync(doel, s.inhoud);
    if (s.uitvoerbaar) fs.chmodSync(doel, 0o755);
    gemaakt.push(doel);
  }

  console.log('\n  Gemaakt:');
  gemaakt.forEach(d => console.log('    ' + d));
  if (!waar) {
    console.log('  (geen bureaublad gevonden — versleep ze er zelf heen,');
    console.log('   of zet RP_BUREAUBLAD=/pad/naar/bureaublad en probeer opnieuw)');
  }
  console.log('\n  Rekensterren Studio             start wat er uitgecheckt staat.');
  console.log('  Rekensterren Studio (nieuwste)  haalt eerst op en vraagt dan waarheen:');
  console.log('                                  Enter voor de laatste main, of een PR-nummer.');
  console.log('\n  Geen van beide gooit werk weg: staat er iets open in je werkmap,');
  console.log('  dan weigert de wissel en start de studio op wat er stond.');
  console.log('\n  Draait er al een studio, dan opent de eerste gewoon dat venster.');
  if (process.platform === 'darwin') {
    console.log('\n  De eerste keer zegt macOS misschien dat hij van een onbekende maker is:');
    console.log('  rechtermuisknop -> Open, en daarna één keer op Open. Daarna nooit meer.');
  }
  if (process.platform === 'linux') {
    console.log('\n  Zegt je bureaublad "niet vertrouwd": rechtermuisknop -> Allow launching.');
  }
  console.log('');
}

if (require.main === module) schrijf();

module.exports = { maak, maakAlle, bureaublad, schrijf, ROOT };
