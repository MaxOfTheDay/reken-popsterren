/*
 * De uitslag van een suite, in dezelfde vorm als de browsertests.
 *
 * De oudere suites (counting, maths, sterren, rondgang, voortgang, reis,
 * beloning) hebben dit blokje elk in hun eigen kop staan. Voor de drie suites
 * die er hierna bij kwamen staat het één keer hier -- ze delen toch al app.js,
 * en drie keer hetzelfde lijstje bijhouden nodigt uit tot drie keer iets anders.
 * De bestaande suites blijven met rust: hun kopje werkt, en dat omzetten zou een
 * hoop regels raken zonder dat er één controle bij komt.
 *
 * Gebruik:
 *   const { check, klaar } = require('./meld')('kern');
 *   check(voorwaarde, 'A · waar dit over gaat', 'wat er dan wél stond');
 *   klaar();   // print de uitslag per zaak en stopt met 1 als er iets fout is
 */
module.exports = function meld(naam) {
  const fails = [];
  const counts = {};
  function check(ok, label, detail) {
    counts[label] = counts[label] || { pass: 0, fail: 0 };
    if (ok) counts[label].pass++;
    else { counts[label].fail++; if (fails.length < 40) fails.push(`${label}: ${detail}`); }
    return !!ok;
  }
  // Een zaak die zelf omvalt is een fout, geen stille stop: zonder dit zou een
  // TypeError halverwege de suite de rest van de controles overslaan en toch
  // een groen ogende (want korte) uitslag geven.
  function zaak(label, fn) {
    try { fn(); }
    catch (e) { check(false, label, 'viel om: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e)); }
  }
  /* De uitslag per zaak en niet per controle. De browsersuites printen elke
     controle apart en dat leest daar prima -- die hebben er enkele tientallen.
     De inhoudskeuring loopt elke wereld, elk spulletje en elke trofee na en komt
     zo op bijna duizend regels; één regel per zaak met de fouten eronder is dan
     het enige dat nog te lezen is. */
  function klaar() {
    const groepen = {};
    for (const label of Object.keys(counts)) {
      const g = label.split('·')[0].trim() || label;
      groepen[g] = groepen[g] || { pass: 0, fail: 0 };
      groepen[g].pass += counts[label].pass;
      groepen[g].fail += counts[label].fail;
    }
    let ok = 0, nok = 0;
    for (const g of Object.keys(groepen).sort()) {
      const c = groepen[g];
      ok += c.pass; nok += c.fail;
      console.log(`${c.fail ? 'FOUT ' : ' ok  '}  ${g}  (${c.pass} ok${c.fail ? ', ' + c.fail + ' fout' : ''})`);
    }
    if (fails.length) { console.log('\nFouten:'); fails.forEach(f => console.log('  - ' + f)); }
    console.log(`\n${naam}: ${ok}/${ok + nok} controles geslaagd.`);
    process.exit(nok ? 1 : 0);
  }
  return { check, zaak, klaar };
};
