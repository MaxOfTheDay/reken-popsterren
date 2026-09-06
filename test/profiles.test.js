/*
 * Test-suite voor de sterren zelf: maken, verwijderen, en wat er gebeurt als er
 * nog géén zijn.
 *
 * De app begint sinds "elke familie maakt haar eigen sterren" met een lege
 * opslag. Dat raakt drie dingen die de andere suites niet aanraken: de lege
 * beginstaat, het maakformulier, en het ouderdeel zonder ster (waar de knop
 * "Back-up terugzetten" zit -- de enige weg voor een familie met een nieuw
 * toestel).
 *
 * Draaien:
 *   npm run test:sterren        (of: npm test voor alle suites)
 */
const { launch, APP_URL } = require('./browser');

const fails = [];
const counts = {};
function check(ok, label, detail) {
  counts[label] = counts[label] || { pass: 0, fail: 0 };
  if (ok) counts[label].pass++;
  else { counts[label].fail++; if (fails.length < 40) fails.push(`${label}: ${detail}`); }
}

(async () => {
  const browser = await launch();
  const pageErrors = [];

  // Elke zaak begint met een schone opslag; anders lekt de vorige erin.
  async function fresh() {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    page.on('pageerror', e => pageErrors.push('PAGEERROR ' + e.message));
    page.on('console', m => { if (m.type() === 'error' && !/ERR_CONNECTION_RESET/.test(m.text())) pageErrors.push('CONSOLE ' + m.text()); });
    await page.goto(APP_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForTimeout(250);
    return { ctx, page };
  }

  // Het formulier invullen en verzenden. `settings` is optioneel: een kaartje
  // {'set-max': '100'} klapt de oefening-openklapper open en tikt die chips aan.
  async function makeStar(page, { name, hair, dress, track, settings } = {}) {
    await page.click('#btn-newstar');
    await page.waitForTimeout(150);
    if (hair)  await page.click(`#newstar-hair  .chip[data-v="${hair}"]`);
    if (dress) await page.click(`#newstar-dress .chip[data-v="${dress}"]`);
    if (track) await page.click(`#newstar-track .chip[data-v="${track}"]`);
    if (settings) {
      await page.click('#newstar-oefen summary');
      await page.waitForTimeout(120);
      for (const [id, v] of Object.entries(settings)) {
        await page.click(`#ns-${id} .chip[data-v="${v}"]`);
        await page.waitForTimeout(120);
      }
    }
    await page.fill('#newstar-name', name);
    await page.click('#newstar-go');
    await page.waitForTimeout(250);
  }

  /* ================= 1 · Verse installatie is leeg ================= */
  {
    const { ctx, page } = await fresh();
    const r = await page.evaluate(() => ({
      n: Object.keys(db.profiles).length,
      cards: document.querySelectorAll('.profile-card').length,
      sub: document.getElementById('profile-subtitle').textContent,
      addLabel: document.getElementById('btn-newstar').textContent,
      hintShown: getComputedStyle(document.getElementById('restore-hint')).display !== 'none',
      stored: localStorage.getItem('rekenPopsterren_v1'),
    }));
    check(r.n === 0, 'verse installatie heeft nul sterren', `n=${r.n}`);
    check(r.cards === 0, 'verse installatie toont geen kaarten', `cards=${r.cards}`);
    check(/Welkom/.test(r.sub), 'verse installatie verwelkomt', r.sub);
    check(/eerste ster/.test(r.addLabel), 'de knop noemt de eerste ster', r.addLabel);
    check(r.hintShown, 'de back-up-hint staat er bij nul sterren', 'verborgen');
    check(r.stored === null, 'een verse start schrijft nog niets weg', `stored=${r.stored && r.stored.slice(0, 40)}`);
    await ctx.close();
  }

  /* ================= 2 · Ster maken, met een lastige naam ================= */
  {
    const { ctx, page } = await fresh();
    await makeStar(page, { name: 'A"<b>x', hair: 'hair_bruin', dress: 'dress_blauw', track: 'count' });
    const r = await page.evaluate(() => {
      const k = Object.keys(db.profiles)[0];
      const p = db.profiles[k];
      openSettings(); setTab = 'beheer'; renderSettings();
      return {
        key: k, n: Object.keys(db.profiles).length,
        name: p.name, hair: p.equipped.hair, dress: p.equipped.dress,
        startHair: p.startHair, startDress: p.startDress,
        order: p.order, track: p.settings.track, perLevel: p.settings.perLevel,
        stageMax: p.settings.stageMax,
        bought: p.owned.length - p.freebies,
        cardText: document.querySelector('.pname') ? document.querySelector('.pname').textContent : null,
        boldInCard: !!document.querySelector('.pname b'),
        fieldValue: document.getElementById('set-name').value,
        sub: document.getElementById('profile-subtitle').textContent,
      };
    });
    check(r.n === 1 && r.key === 'p1', 'eerste ster krijgt sleutel p1', `${r.key} n=${r.n}`);
    check(r.name === 'A"<b>x', 'de naam wordt letterlijk bewaard', r.name);
    check(r.cardText === 'A"<b>x', 'de kaart toont de naam letterlijk', String(r.cardText));
    check(!r.boldInCard, 'html in een naam wordt geen echte opmaak', 'er staat een <b> in de kaart');
    check(r.fieldValue === 'A"<b>x', 'het naamveld geeft de hele naam terug', r.fieldValue);
    check(r.hair === 'hair_bruin' && r.dress === 'dress_blauw', 'gekozen haar en jurk worden gedragen', `${r.hair}/${r.dress}`);
    check(r.startHair === 'hair_bruin' && r.startDress === 'dress_blauw', 'de startlook wordt vastgelegd', `${r.startHair}/${r.startDress}`);
    check(r.order === 0, 'de eerste ster staat vooraan', `order=${r.order}`);
    check(r.track === 'count' && r.perLevel === 5 && r.stageMax === 11, 'telmodus krijgt de hele telvoorinstelling', JSON.stringify(r));
    check(r.bought === 0, 'gratis startspullen tellen niet als gekocht', `bought=${r.bought}`);
    check(/schitteren/.test(r.sub), 'met een ster erbij komt de gewone ondertitel terug', r.sub);
    await ctx.close();
  }

  /* ================= 3 · Volgorde, sleutels en het maximum ================= */
  {
    const { ctx, page } = await fresh();
    for (let i = 1; i <= 6; i++) await makeStar(page, { name: 'Ster' + i });
    let r = await page.evaluate(() => ({
      keys: profileKeys(), orders: profileKeys().map(k => db.profiles[k].order),
      addHidden: getComputedStyle(document.getElementById('btn-newstar')).display === 'none',
      cards: document.querySelectorAll('.profile-card').length,
      rowClass: document.querySelector('.profile-row').className,
    }));
    check(r.keys.join(',') === 'p1,p2,p3,p4,p5,p6', 'sleutels lopen netjes op', r.keys.join(','));
    check(r.orders.join(',') === '0,1,2,3,4,5', 'volgorde loopt netjes op', r.orders.join(','));
    check(r.addHidden, 'bij zes sterren verdwijnt de knop', 'knop staat er nog');
    check(/many/.test(r.rowClass) && /many-6/.test(r.rowClass), 'zes kaarten gaan in het raster', r.rowClass);
    // een zevende mag ook niet via de code zelf
    r = await page.evaluate(() => { openNewStar('profile'); return document.querySelector('.screen.active').id; });
    check(r === 'screen-profile', 'het maakscherm opent niet meer boven het maximum', r);
    await ctx.close();
  }

  /* ================= 4 · Dubbele naam wordt geweigerd ================= */
  {
    const { ctx, page } = await fresh();
    await makeStar(page, { name: 'Emma' });
    await page.click('#btn-newstar');
    await page.waitForTimeout(150);
    await page.fill('#newstar-name', 'emma');
    await page.click('#newstar-go');
    await page.waitForTimeout(200);
    const r = await page.evaluate(() => ({
      n: Object.keys(db.profiles).length,
      screen: document.querySelector('.screen.active').id,
    }));
    check(r.n === 1, 'dezelfde naam levert geen tweede ster op', `n=${r.n}`);
    check(r.screen === 'screen-newstar', 'het formulier blijft open na een dubbele naam', r.screen);
    await ctx.close();
  }

  /* ================= 5 · Ouderdeel zonder sterren ================= */
  /* Dit is de zaak die telt: een familie met een nieuw toestel heeft nul sterren
     en moet juist dan bij "Back-up terugzetten" kunnen. */
  {
    const { ctx, page } = await fresh();
    const r = await page.evaluate(() => {
      openSettings();
      return {
        screen: document.querySelector('.screen.active').id,
        hasImport: !!document.getElementById('set-import'),
        hasExport: !!document.getElementById('set-export'),
        hasNewStar: !!document.getElementById('set-newstar'),
        whoHidden: getComputedStyle(document.getElementById('settings-profiles')).display === 'none',
        tabsHidden: getComputedStyle(document.getElementById('settings-subtabs')).display === 'none',
        hasName: !!document.getElementById('set-name'),
        hasReset: !!document.getElementById('set-reset'),
      };
    });
    check(r.screen === 'screen-settings', 'het ouderdeel opent zonder sterren', r.screen);
    check(r.hasImport && r.hasExport, 'back-up terugzetten is bereikbaar zonder ster', JSON.stringify(r));
    check(r.hasNewStar, 'een ster maken kan ook vanuit Beheer', 'knop ontbreekt');
    check(r.whoHidden && r.tabsHidden, 'de twee keuzerijen verdwijnen als er niets te kiezen is', JSON.stringify(r));
    check(!r.hasName && !r.hasReset, 'zonder ster geen naamveld en geen wisknop', JSON.stringify(r));
    await ctx.close();
  }

  /* ================= 6 · Verwijderen ================= */
  {
    const { ctx, page } = await fresh();
    for (const n of ['Een', 'Twee', 'Drie']) await makeStar(page, { name: n });
    // de middelste weg
    await page.evaluate(() => { openSettings(); setKey = 'p2'; setTab = 'beheer'; renderSettings(); });
    await page.waitForTimeout(150);
    await page.click('#set-danger-del summary');   // net als een ouder: eerst openklappen
    await page.waitForTimeout(150);
    await page.click('#set-delete');
    await page.waitForTimeout(150);
    const asked = await page.isVisible('#confirm-modal');
    await page.click('#confirm-yes');
    await page.waitForTimeout(250);
    let r = await page.evaluate(() => ({
      keys: profileKeys(), names: profileKeys().map(k => db.profiles[k].name),
      setKey: setKey, cur: cur, nextKey: nextProfileKey(),
    }));
    check(asked, 'verwijderen vraagt eerst om bevestiging', 'geen venster');
    check(r.names.join(',') === 'Een,Drie', 'alleen de gekozen ster verdwijnt', r.names.join(','));
    check(r.setKey === 'p1' && !r.cur, 'de selectie blijft niet op een verdwenen ster staan', `${r.setKey}/${r.cur}`);
    check(r.nextKey === 'p2', 'het gat in de sleutels wordt hergebruikt', r.nextKey);
    // en nu alles weg
    for (const k of ['p1', 'p3']) {
      await page.evaluate(key => { openSettings(); setKey = key; setTab = 'beheer'; renderSettings(); }, k);
      await page.waitForTimeout(120);
      await page.click('#set-danger-del summary');
      await page.waitForTimeout(120);
      await page.click('#set-delete');
      await page.waitForTimeout(120);
      await page.click('#confirm-yes');
      await page.waitForTimeout(250);
    }
    r = await page.evaluate(() => ({
      n: Object.keys(db.profiles).length,
      screen: document.querySelector('.screen.active').id,
      sub: document.getElementById('profile-subtitle').textContent,
    }));
    check(r.n === 0, 'de laatste ster mag ook weg', `n=${r.n}`);
    check(r.screen === 'screen-profile', 'na de laatste ster sta je op het welkomscherm', r.screen);
    check(/Welkom/.test(r.sub), 'het welkom komt terug', r.sub);
    // en het ouderdeel doet het daarna nog steeds
    r = await page.evaluate(() => { openSettings(); return !!document.getElementById('set-import'); });
    check(r, 'het ouderdeel werkt nog na het verwijderen van alles', 'geen back-up-knop');
    await ctx.close();
  }

  /* ================= 7 · Terug-navigatie ================= */
  {
    const { ctx, page } = await fresh();
    await page.click('#btn-newstar');
    await page.waitForTimeout(200);
    await page.goBack();
    await page.waitForTimeout(300);
    let r = await page.evaluate(() => ({ screen: document.querySelector('.screen.active') ? document.querySelector('.screen.active').id : null, here: typeof db !== 'undefined', url: location.pathname.endsWith('index.html') }));
    check(r.here && r.url && r.screen === 'screen-profile', 'Android-terug sluit het maakscherm i.p.v. de app', JSON.stringify(r));
    // Escape doet hetzelfde
    await page.click('#btn-newstar');
    await page.waitForTimeout(200);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
    r = await page.evaluate(() => document.querySelector('.screen.active').id);
    check(r === 'screen-profile', 'Escape sluit het maakscherm', r);
    await ctx.close();
  }

  /* ================= 8 · Oude opslag: precies één keer ophalen ================= */
  {
    const { ctx, page } = await fresh();
    // een save van vóór Clara: alleen Marie en Anna, geen schemaV
    await page.evaluate(() => {
      const mk = (naam, jurk) => {
        const p = defaultProfile(naam, jurk);
        delete p.order; delete p.startHair; delete p.startDress;
        return p;
      };
      localStorage.setItem('rekenPopsterren_v1', JSON.stringify({
        sound: true, haptics: true, profiles: { p1: mk('Marie', 'dress_roze'), p2: mk('Anna', 'dress_paars') }
      }));
    });
    await page.reload();
    await page.waitForTimeout(250);
    let r = await page.evaluate(() => ({
      names: profileKeys().map(k => db.profiles[k].name), schemaV: db.schemaV,
    }));
    check(r.names.join(',') === 'Clara,Anna,Marie', 'een oude save krijgt Clara terug, in de juiste volgorde', r.names.join(','));
    check(r.schemaV === 2, 'de ophaalslag wordt gestempeld', String(r.schemaV));
    // nu Clara verwijderen en herladen: ze mag niet terugkomen
    await page.evaluate(() => {
      const k = profileKeys().find(k => db.profiles[k].name === 'Clara');
      delete db.profiles[k];
      save();
    });
    await page.reload();
    await page.waitForTimeout(250);
    r = await page.evaluate(() => profileKeys().map(k => db.profiles[k].name));
    check(!r.includes('Clara'), 'een verwijderde ster blijft weg na herladen', r.join(','));
    await ctx.close();
  }

  /* ================= 9 · Import ================= */
  {
    const { ctx, page } = await fresh();
    await makeStar(page, { name: 'Blijft' });
    // een beschadigd bestand mag de db niet aanraken
    let r = await page.evaluate(async () => {
      const before = JSON.stringify(db);
      const bad = new File([JSON.stringify({ profiles: { x: { name: 'kapot' } } })], 'b.json', { type: 'application/json' });
      importData(bad);
      await new Promise(r => setTimeout(r, 300));
      return { unchanged: JSON.stringify(db) === before, notice: document.getElementById('confirm-title').textContent };
    });
    check(r.unchanged, 'een ongeldig back-upbestand laat de sterren met rust', 'db is veranderd');
    check(/Oeps/.test(r.notice), 'een ongeldig bestand meldt zich', r.notice);
    // een lege back-up is geldig
    r = await page.evaluate(async () => {
      document.getElementById('confirm-modal').classList.remove('open');
      const empty = new File([JSON.stringify({ sound: true, haptics: true, schemaV: 2, profiles: {} })], 'e.json', { type: 'application/json' });
      importData(empty);
      await new Promise(r => setTimeout(r, 250));
      const asked = document.getElementById('confirm-modal').classList.contains('open');
      const yes = document.getElementById('confirm-yes');
      if (yes) yes.click();
      await new Promise(r => setTimeout(r, 250));
      return { asked, n: Object.keys(db.profiles).length, setKey: setKey };
    });
    check(r.asked, 'een lege back-up wordt geaccepteerd', 'geweigerd');
    check(r.n === 0 && r.setKey === null, 'na een lege back-up is er niets geselecteerd', JSON.stringify(r));
    await ctx.close();
  }

  /* ================= 10 · Opnieuw beginnen houdt de identiteit ================= */
  {
    const { ctx, page } = await fresh();
    await makeStar(page, { name: 'Bruin', hair: 'hair_bruin', dress: 'dress_groen' });
    const r = await page.evaluate(async () => {
      const k = profileKeys()[0];
      db.profiles[k].diamonds = 999;
      db.profiles[k].equipped.hair = 'hair_regenboog';   // iets anders aangetrokken
      openSettings(); setKey = k; setTab = 'beheer'; renderSettings();
      document.getElementById('set-reset').click();
      await new Promise(r => setTimeout(r, 200));
      document.getElementById('confirm-yes').click();
      await new Promise(r => setTimeout(r, 200));
      const p = db.profiles[k];
      return { hair: p.equipped.hair, dress: p.equipped.dress, diamonds: p.diamonds, name: p.name };
    });
    check(r.hair === 'hair_bruin', 'opnieuw beginnen geeft haar eigen haar terug, niet blond', r.hair);
    check(r.dress === 'dress_groen', 'opnieuw beginnen geeft haar eigen jurk terug', r.dress);
    check(r.diamonds === 30 && r.name === 'Bruin', 'de voortgang gaat wél weg, de naam blijft', JSON.stringify(r));
    await ctx.close();
  }

  /* ===== 10 · De oefening-openklapper op het maakformulier =====
     Het formulier vroeg alleen naam/haar/jurk/modus; al het andere viel
     stilletjes op de standaard. Nu staat de hele Oefenen-set eronder, dicht,
     met een regel die zegt wát er nu ingesteld staat. Dat mag de snelle weg
     (openklapper niet aanraken) op geen enkele manier veranderen. */

  // 10a · dicht bij het openen, en de samenvatting zegt iets
  {
    const { ctx, page } = await fresh();
    await page.click('#btn-newstar');
    await page.waitForTimeout(150);
    const r = await page.evaluate(() => ({
      open: document.getElementById('newstar-oefen').hasAttribute('open'),
      val: document.querySelector('#newstar-oefen .sr-val').textContent,
    }));
    check(r.open === false, 'de openklapper begint dicht', `open=${r.open}`);
    check(r.val === '➕ ➖ · tot 20 · kiezen uit 4 · 8 vragen', 'de dichte openklapper vertelt de standaard', r.val);
    await ctx.close();
  }

  // 10b · de snelle weg levert exact hetzelfde profiel als hiervoor
  {
    const { ctx, page } = await fresh();
    await makeStar(page, { name: 'Reken' });
    await makeStar(page, { name: 'Tel', track: 'count' });
    const r = await page.evaluate(() => {
      const byName = n => Object.values(db.profiles).find(p => p.name === n).settings;
      return { math: byName('Reken'), count: byName('Tel') };
    });
    const mathWant = { ops: ['+', '-'], max: 20, tables: [2, 5, 10], mode: 'kies', perLevel: 8,
      missNum: true, chain3: true, track: 'math', stage: 1, stageMax: 11, repr: 'objects',
      numerals: true, qmax: 10, memory: true };
    const countWant = { ...mathWant, track: 'count', perLevel: 5 };
    check(JSON.stringify(r.math) === JSON.stringify(mathWant),
      'zonder de openklapper aan te raken blijft de rekenster ongewijzigd', JSON.stringify(r.math));
    check(JSON.stringify(r.count) === JSON.stringify(countWant),
      'zonder de openklapper aan te raken blijft de telster ongewijzigd', JSON.stringify(r.count));
    await ctx.close();
  }

  // 10c · wat een ouder vooraf instelt, komt ook echt in het profiel
  {
    const { ctx, page } = await fresh();
    await makeStar(page, { name: 'Maal', settings: { 'set-ops': 'x', 'set-max': '100' } });
    const s = await page.evaluate(() => Object.values(db.profiles)[0].settings);
    check(s.ops.includes('x'), 'een vooraf gekozen bewerking landt in het profiel', JSON.stringify(s.ops));
    check(s.max === 100, 'een vooraf gekozen bereik landt in het profiel', `max=${s.max}`);
    await ctx.close();
  }

  // 10d · het paneel overleeft zijn eigen hertekening (elke tik bouwt het opnieuw op)
  {
    const { ctx, page } = await fresh();
    await page.click('#btn-newstar');
    await page.waitForTimeout(150);
    await page.click('#newstar-oefen summary');
    await page.waitForTimeout(120);
    await page.click('#ns-set-max .chip[data-v="100"]');
    await page.waitForTimeout(150);
    const r = await page.evaluate(() => ({
      open: document.getElementById('newstar-oefen').hasAttribute('open'),
      val: document.querySelector('#newstar-oefen .sr-val').textContent,
    }));
    check(r.open === true, 'de openklapper blijft open na een tik erin', `open=${r.open}`);
    check(/tot 100/.test(r.val), 'de samenvatting loopt mee met de keuze', r.val);
    await ctx.close();
  }

  // 10e · van modus wisselen wisselt ook de velden eronder
  {
    const { ctx, page } = await fresh();
    await page.click('#btn-newstar');
    await page.waitForTimeout(150);
    await page.click('#newstar-oefen summary');
    await page.waitForTimeout(120);
    await page.click('#newstar-track .chip[data-v="count"]');
    await page.waitForTimeout(150);
    const velden = await page.evaluate(() => ({
      stage: !!document.getElementById('ns-set-stage'),
      ops: !!document.getElementById('ns-set-ops'),
      val: document.querySelector('#newstar-oefen .sr-val').textContent,
    }));
    check(velden.stage && !velden.ops, 'de telmodus toont fases in plaats van bewerkingen', JSON.stringify(velden));
    check(/^fase 1–11/.test(velden.val), 'de samenvatting schakelt mee naar de telmodus', velden.val);
    await page.click('#ns-set-stage .chip[data-v="3"]');
    await page.waitForTimeout(150);
    await page.fill('#newstar-name', 'Fase');
    await page.click('#newstar-go');
    await page.waitForTimeout(250);
    const p = await page.evaluate(() => Object.values(db.profiles)[0]);
    check(p.settings.stage === 3, 'een vooraf gekozen startfase landt in de instellingen', `stage=${p.settings.stage}`);
    check(p.countTrack.stage === 3, 'de live-stand begint op diezelfde fase', `countTrack=${p.countTrack.stage}`);
    await ctx.close();
  }

  // 10f · de twee schermen staan tegelijk in de DOM: hun velden mogen elkaar niet raken
  {
    const { ctx, page } = await fresh();
    await makeStar(page, { name: 'Zus' });
    const r = await page.evaluate(async () => {
      const k = Object.keys(db.profiles)[0];
      openSettings(); setKey = k; setTab = 'oefenen'; renderSettings();
      await new Promise(r => setTimeout(r, 150));
      openNewStar('settings');
      await new Promise(r => setTimeout(r, 150));
      document.querySelector('#newstar-oefen summary').click();
      await new Promise(r => setTimeout(r, 150));
      document.querySelector('#ns-set-max .chip[data-v="100"]').click();
      await new Promise(r => setTimeout(r, 150));
      return { zus: db.profiles[k].settings.max, concept: newStar.settings.max };
    });
    check(r.zus === 20, 'een tik op het maakformulier laat de bestaande ster met rust', `max=${r.zus}`);
    check(r.concept === 100, 'diezelfde tik komt wél in het concept terecht', `max=${r.concept}`);
    await ctx.close();
  }

  // 10g · "kies er minstens 1" geldt ook hier
  {
    const { ctx, page } = await fresh();
    await page.click('#btn-newstar');
    await page.waitForTimeout(150);
    await page.click('#newstar-oefen summary');
    await page.waitForTimeout(120);
    await page.click('#ns-set-ops .chip[data-v="+"]');
    await page.waitForTimeout(150);
    await page.click('#ns-set-ops .chip[data-v="-"]');
    await page.waitForTimeout(150);
    const r = await page.evaluate(() => ({
      ops: newStar.settings.ops.slice(),
      shake: !!document.querySelector('#ns-set-ops .chip.shake'),
    }));
    check(r.ops.length === 1 && r.ops[0] === '-', 'de laatste bewerking kan niet uit', JSON.stringify(r.ops));
    check(r.shake, 'de geweigerde tik schudt', `shake=${r.shake}`);
    await ctx.close();
  }

  await browser.close();

  /* ================= Uitslag ================= */
  check(pageErrors.length === 0, 'geen fouten in de pagina', pageErrors.slice(0, 3).join(' | '));
  const labels = Object.keys(counts).sort();
  let pass = 0, fail = 0;
  for (const l of labels) {
    const c = counts[l];
    pass += c.pass; fail += c.fail;
    console.log(` ${c.fail ? 'FOUT' : 'ok  '}   ${l}  (${c.pass} ok${c.fail ? ', ' + c.fail + ' fout' : ''})`);
  }
  if (fails.length) { console.log('\nEerste fouten:'); fails.forEach(f => console.log('  - ' + f)); }
  console.log(`\n${pass}/${pass + fail} controles geslaagd.`);
  process.exit(fail ? 1 : 0);
})();
