/*
 * De ontvanger van "Overzetten" (worker/overzetten.js), zonder Cloudflare.
 *
 * De Worker draait bij Cloudflare en daar kan geen test bij (workers.dev is
 * vanaf de testmachine vaak niet eens bereikbaar). Maar het is gewone JavaScript
 * met fetch, Request en Response -- die heeft Node ook -- plus Durable Objects,
 * en die bootsen we hier na: een object per naam, met een opslag in het geheugen
 * en een wekker die we zelf laten aflopen. Zo gaan alle wegen erdoor: neerleggen,
 * ophalen, één keer, verlopen, de stand voor de eigenaar, het remmen per adres,
 * de herkomst en de vorm.
 *
 *   A  herkomst            -> alleen rekensterren.be, en een preflight krijgt CORS
 *   B  neerleggen          -> zes cijfers, een sleutel, een kwartier
 *   C  ophalen             -> precies dezelfde tekst terug, en daarna nooit meer
 *   D  de stand            -> alleen voor wie de sleutel heeft; "opgehaald" na ophalen
 *   E  verlopen            -> na een kwartier is alles weg, ook via de wekker
 *   F  vorm en maat        -> geen save, te groot, geen code van zes cijfers
 *   G  remmen              -> raden en neerleggen hebben elk hun plafond per adres
 *   H  botsing             -> een levende code wordt nooit overschreven
 *
 * Draaien: node test/overzetten.test.js (of npm run test:overzetten).
 */
const fs = require('fs');
const path = require('path');

let ok = 0, fout = 0;
function check(c, naam, extra) {
  if (c) { ok++; console.log('  ✓ ' + naam); }
  else { fout++; console.log('  ✗ ' + naam + (extra ? '  -- ' + extra : '')); }
}

// De klok van de Worker en de objecten: Date.now, die we vooruit kunnen zetten.
let klok = Date.parse('2026-10-27T12:00:00Z');
const echtNu = Date.now;
Date.now = () => klok;

class Opslag {
  constructor() { this.m = new Map(); this.wekker = null; }
  async get(k) { return this.m.get(k); }
  async put(k, v) {
    if (typeof k === 'object') { for (const [a, b] of Object.entries(k)) this.m.set(a, b); }
    else this.m.set(k, v);
  }
  async delete(k) { this.m.delete(k); }
  async deleteAll() { this.m.clear(); }
  async setAlarm(t) { this.wekker = t; }
}
// Een naamruimte van Durable Objects: idFromName -> altijd hetzelfde object.
function naamruimte(Klasse) {
  const objecten = new Map();
  return {
    objecten,
    idFromName: n => n,
    get(id) {
      if (!objecten.has(id)) {
        const opslag = new Opslag();
        objecten.set(id, { opslag, obj: new Klasse({ storage: opslag }) });
      }
      const o = objecten.get(id);
      return { fetch: (url, init) => o.obj.fetch(new Request(url, init)) };
    },
    // laat elke wekker aflopen die op of vóór de klok staat
    async wekkers() {
      for (const o of objecten.values()) {
        if (o.opslag.wekker != null && o.opslag.wekker <= klok) { o.opslag.wekker = null; await o.obj.alarm(); }
      }
    },
  };
}

const HIER = 'https://www.rekensterren.be';
(async () => {
  const bron = fs.readFileSync(path.join(__dirname, '..', 'worker', 'overzetten.js'), 'utf8');
  const mod = await import('data:text/javascript;base64,' + Buffer.from(bron).toString('base64'));
  const worker = mod.default;
  let env;
  const nieuw = () => { env = { CODES: naamruimte(mod.Codes), WACHTER: naamruimte(mod.Wachter) }; };
  nieuw();
  const vraag = (pad, body, o) => worker.fetch(new Request('https://x.workers.dev' + pad, {
    method: (o && o.method) || 'POST',
    headers: { Origin: o && 'origin' in o ? o.origin : HIER, 'CF-Connecting-IP': (o && o.ip) || '1.2.3.4' },
    body: body == null ? undefined : (typeof body === 'string' ? body : JSON.stringify(body)),
  }), env);
  const save = JSON.stringify({ profiles: { p1: { name: 'Lotte', stars: { 1: 3 } } }, sound: true });

  console.log('A · herkomst');
  let r = await vraag('/zet', save, { origin: 'https://boos.example' });
  check(r.status === 403, 'A · een andere site krijgt 403', r.status);
  r = await vraag('/zet', save, { origin: '' });
  check(r.status === 403, 'A · zonder Origin ook', r.status);
  r = await vraag('/zet', null, { method: 'OPTIONS' });
  check(r.status === 204 && r.headers.get('Access-Control-Allow-Origin') === HIER, 'A · preflight krijgt CORS', r.status);
  r = await vraag('/zet', save, { origin: 'https://rekensterren.be' });
  check(r.status === 201 && r.headers.get('Access-Control-Allow-Origin') === 'https://rekensterren.be', 'A · ook zonder www', r.status);

  console.log('B · neerleggen');
  nieuw();
  r = await vraag('/zet', save);
  const z = await r.json();
  check(r.status === 201 && /^\d{6}$/.test(z.code), 'B · een code van zes cijfers', JSON.stringify(z));
  check(typeof z.sleutel === 'string' && z.sleutel.length === 32, 'B · een sleutel voor de stand');
  check(z.tot === klok + 15 * 60 * 1000, 'B · geldig tot over een kwartier', z.tot - klok);

  console.log('C · ophalen');
  r = await vraag('/haal', { code: z.code }, { ip: '5.6.7.8' });
  const h = await r.json();
  check(r.status === 200 && JSON.stringify(h.save) === save, 'C · dezelfde save terug', r.status);
  r = await vraag('/haal', { code: z.code }, { ip: '5.6.7.8' });
  check(r.status === 404, 'C · een tweede keer: weg', r.status);
  const anders = z.code === '000000' ? '000001' : '000000';
  r = await vraag('/haal', { code: anders });
  check(r.status === 404, 'C · een code die niet bestaat: 404', r.status);

  console.log('D · de stand');
  nieuw();
  const z2 = await (await vraag('/zet', save)).json();
  let s = await (await vraag('/stand', { code: z2.code, sleutel: z2.sleutel })).json();
  check(s.opgehaald === false && s.verlopen === false, 'D · nog niet opgehaald', JSON.stringify(s));
  s = await (await vraag('/stand', { code: z2.code, sleutel: 'f'.repeat(32) })).json();
  check(s.verlopen === true && s.opgehaald === false, 'D · een vreemde sleutel leert niets', JSON.stringify(s));
  await vraag('/haal', { code: z2.code });
  s = await (await vraag('/stand', { code: z2.code, sleutel: z2.sleutel })).json();
  check(s.opgehaald === true, 'D · na ophalen: opgehaald', JSON.stringify(s));

  console.log('E · verlopen');
  nieuw();
  const z3 = await (await vraag('/zet', save)).json();
  klok += 15 * 60 * 1000;
  r = await vraag('/haal', { code: z3.code });
  check(r.status === 404, 'E · na een kwartier: weg', r.status);
  s = await (await vraag('/stand', { code: z3.code, sleutel: z3.sleutel })).json();
  check(s.verlopen === true, 'E · de stand zegt verlopen', JSON.stringify(s));
  await env.CODES.wekkers();
  const o = env.CODES.objecten.get('c' + z3.code);
  check(o && o.opslag.m.size === 0, 'E · de wekker wist alles', o && o.opslag.m.size);

  console.log('F · vorm en maat');
  nieuw();
  r = await vraag('/zet', '{"geen":"save"}');
  check(r.status === 400, 'F · geen profiles: 400', r.status);
  r = await vraag('/zet', 'geen json');
  check(r.status === 400, 'F · geen JSON: 400', r.status);
  r = await vraag('/zet', JSON.stringify({ profiles: {}, x: 'a'.repeat(300001) }));
  check(r.status === 413, 'F · te groot: 413', r.status);
  r = await vraag('/haal', { code: '12345' });
  check(r.status === 400, 'F · vijf cijfers: 400', r.status);
  r = await vraag('/haal', { code: 'abcdef' });
  check(r.status === 400, 'F · letters: 400', r.status);
  r = await vraag('/iets', { code: '123456' });
  check(r.status === 404, 'F · onbekend pad: 404', r.status);
  r = await vraag('/zet', null, { method: 'GET' });
  check(r.status === 405, 'F · GET: 405', r.status);

  console.log('G · remmen');
  nieuw();
  let laatste;
  for (let i = 0; i < 21; i++) laatste = await vraag('/haal', { code: String(100000 + i) }, { ip: '9.9.9.9' });
  check(laatste.status === 429, 'G · de 21e gok binnen tien minuten: 429', laatste.status);
  r = await vraag('/haal', { code: '100000' }, { ip: '8.8.8.8' });
  check(r.status === 404, 'G · een ander adres mag nog', r.status);
  klok += 10 * 60 * 1000;
  await env.WACHTER.wekkers();
  r = await vraag('/haal', { code: '100000' }, { ip: '9.9.9.9' });
  check(r.status === 404, 'G · na het venster weer', r.status);
  nieuw();
  for (let i = 0; i < 11; i++) laatste = await vraag('/zet', save, { ip: '7.7.7.7' });
  check(laatste.status === 429, 'G · de 11e code binnen tien minuten: 429', laatste.status);
  const wachters = [...env.WACHTER.objecten.keys()].join(' ');
  check(!wachters.includes('7.7.7.7'), 'G · het adres zelf wordt nergens bewaard', wachters);

  console.log('H · botsing');
  nieuw();
  const echtRandom = crypto.getRandomValues.bind(crypto);
  let keer = 0;
  // de eerste twee pogingen geven dezelfde code (nullen), daarna weer echt
  crypto.getRandomValues = a => { if (a.length === 4 && keer++ < 2) { a.fill(0); return a; } return echtRandom(a); };
  const e1 = await (await vraag('/zet', save)).json();
  const e2 = await (await vraag('/zet', save, { ip: '2.2.2.2' })).json();
  crypto.getRandomValues = echtRandom;
  check(e1.code === '000000' && e2.code && e2.code !== e1.code, 'H · de tweede krijgt een andere code', e1.code + ' / ' + e2.code);
  r = await vraag('/haal', { code: '000000' });
  check(r.status === 200, 'H · de eerste code is heel gebleven', r.status);

  Date.now = echtNu;
  console.log(`\n${ok} geslaagd, ${fout} mislukt`);
  process.exit(fout ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
