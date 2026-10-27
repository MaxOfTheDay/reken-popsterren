/* De ontvanger van "Overzetten" (src/70-ouderdeel.js, = Overzetten), als Cloudflare
   Worker. Hoort niet bij het spel: deze code draait bij Cloudflare, niet in de
   browser. Zie docs/OVERZETTEN.md voor het opzetten.

   Eén toestel legt zijn save neer en krijgt een code van zes cijfers terug; een
   ander toestel haalt hem met die code op. Meer is het niet:

     POST /zet    body = de save (JSON-tekst)    -> { code, tot, sleutel }
     POST /haal   body = { code }                -> { save }  of 404
     POST /stand  body = { code, sleutel }       -> { opgehaald, verlopen }

   Een code leeft OVERZET_MS (een kwartier) en werkt één keer: wie hem ophaalt,
   krijgt de save en de save is meteen weg. /stand is voor het toestel dat de code
   toont, zodat het "Overgezet" kan zeggen; daarvoor heeft het de sleutel nodig die
   alleen het bij /zet kreeg, dus een ander leert er niets uit.

   Bewaard wordt in Durable Objects (met SQLite), niet in KV: één object per code
   en één per IP-adres om het raden af te remmen. Een object is meteen overal
   leesbaar (KV kan een minuut achterlopen), en het opruimen gaat met een wekker
   in het object zelf. Geen naam, geen e-mail, geen IP-adres in wat blijft: het
   wachter-object heet naar een hash van het adres en vergeet zichzelf na
   WACHT_MS.

   Alleen rekensterren.be mag hem aanroepen (CORS); een ander antwoord krijgt
   niets. De body gaat als text/plain, zodat er geen preflight nodig is. */
const HERKOMST = /^https:\/\/(www\.)?rekensterren\.be$/;
const OVERZET_MS = 15 * 60 * 1000;
const MAX_SAVE = 300000;          // tekens; een echte save is een paar tientallen kB
const WACHT_MS = 10 * 60 * 1000;  // het venster waarin we per adres tellen
const MAX_ZET = 10;               // codes maken per adres per venster
const MAX_HAAL = 20;              // codes proberen per adres per venster

function antwoord(data, status, herkomst) {
  const h = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Vary': 'Origin' };
  if (herkomst) h['Access-Control-Allow-Origin'] = herkomst;
  return new Response(data == null ? null : JSON.stringify(data), { status: status || 200, headers: h });
}

function willekeurig(n) {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return b;
}
// zes cijfers, voorloopnullen mogen; een Uint32 modulo 10^6 is gelijk genoeg verdeeld
function nieuweCode() {
  const b = willekeurig(4);
  const n = ((b[0] << 24) >>> 0) + (b[1] << 16) + (b[2] << 8) + b[3];
  return String(n % 1000000).padStart(6, '0');
}
function nieuweSleutel() {
  return Array.from(willekeurig(16), x => x.toString(16).padStart(2, '0')).join('');
}
async function hash(tekst) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(tekst));
  return Array.from(new Uint8Array(d).slice(0, 12), x => x.toString(16).padStart(2, '0')).join('');
}

// Telt één poging voor dit adres; false = te veel in dit venster.
async function magNog(env, ip, soort, max) {
  const id = env.WACHTER.idFromName(soort + ':' + await hash(ip || '?'));
  const r = await env.WACHTER.get(id).fetch('https://wachter/tel', {
    method: 'POST', body: JSON.stringify({ max, venster: WACHT_MS }),
  });
  return r.status === 200;
}
function codeObject(env, code) {
  return env.CODES.get(env.CODES.idFromName('c' + code));
}

export default {
  async fetch(req, env) {
    const herkomst = req.headers.get('Origin') || '';
    if (!HERKOMST.test(herkomst)) return antwoord(null, 403);
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: {
        'Access-Control-Allow-Origin': herkomst, 'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400', 'Vary': 'Origin' } });
    }
    if (req.method !== 'POST') return antwoord(null, 405, herkomst);
    const pad = new URL(req.url).pathname;
    const ip = req.headers.get('CF-Connecting-IP') || '';
    const tekst = await req.text();

    if (pad === '/zet') {
      if (tekst.length > MAX_SAVE) return antwoord({ fout: 'groot' }, 413, herkomst);
      let save;
      try { save = JSON.parse(tekst); } catch (e) { save = null; }
      if (!save || typeof save !== 'object' || Array.isArray(save) || !save.profiles || typeof save.profiles !== 'object') {
        return antwoord({ fout: 'vorm' }, 400, herkomst);
      }
      if (!await magNog(env, ip, 'zet', MAX_ZET)) return antwoord({ fout: 'druk' }, 429, herkomst);
      const sleutel = nieuweSleutel();
      // een code die nog leeft wordt niet overschreven: dan een andere
      for (let i = 0; i < 8; i++) {
        const code = nieuweCode();
        const r = await codeObject(env, code).fetch('https://code/zet', {
          method: 'POST', body: JSON.stringify({ save: tekst, sleutel, duur: OVERZET_MS }),
        });
        if (r.status === 201) {
          const { tot } = await r.json();
          return antwoord({ code, tot, sleutel }, 201, herkomst);
        }
      }
      return antwoord({ fout: 'vol' }, 503, herkomst);
    }

    let vraag;
    try { vraag = JSON.parse(tekst); } catch (e) { vraag = null; }
    const code = vraag && typeof vraag.code === 'string' ? vraag.code : '';
    if (!/^\d{6}$/.test(code)) return antwoord({ fout: 'code' }, 400, herkomst);

    if (pad === '/haal') {
      if (!await magNog(env, ip, 'haal', MAX_HAAL)) return antwoord({ fout: 'druk' }, 429, herkomst);
      const r = await codeObject(env, code).fetch('https://code/haal', { method: 'POST' });
      if (r.status !== 200) return antwoord({ fout: 'onbekend' }, 404, herkomst);
      // de save gaat terug als tekst, precies zoals hij kwam
      return new Response('{"save":' + await r.text() + '}', { status: 200, headers: {
        'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Vary': 'Origin',
        'Access-Control-Allow-Origin': herkomst } });
    }
    if (pad === '/stand') {
      const sleutel = typeof vraag.sleutel === 'string' ? vraag.sleutel : '';
      const r = await codeObject(env, code).fetch('https://code/stand', {
        method: 'POST', body: JSON.stringify({ sleutel }),
      });
      return antwoord(await r.json(), 200, herkomst);
    }
    return antwoord(null, 404, herkomst);
  },
};

/* Eén code. Bewaart de save, de sleutel van wie hem neerlegde, tot wanneer hij
   geldt, en of hij al opgehaald is. De wekker gaat af als de tijd om is en wist
   alles; tot dan blijft "opgehaald" staan, zodat het toestel met de code het nog
   kan horen. */
export class Codes {
  constructor(state) { this.state = state; this.opslag = state.storage; }
  async fetch(req) {
    const pad = new URL(req.url).pathname;
    const nu = Date.now();
    const tot = await this.opslag.get('tot');
    const leeft = typeof tot === 'number' && tot > nu;
    if (pad === '/zet') {
      if (leeft) return new Response(null, { status: 409 });
      const { save, sleutel, duur } = await req.json();
      const t = nu + duur;
      await this.opslag.deleteAll();
      await this.opslag.put({ save, sleutel, tot: t, opgehaald: false });
      await this.opslag.setAlarm(t);
      return new Response(JSON.stringify({ tot: t }), { status: 201 });
    }
    if (pad === '/haal') {
      const save = leeft ? await this.opslag.get('save') : undefined;
      if (typeof save !== 'string') return new Response(null, { status: 404 });
      await this.opslag.delete('save');
      await this.opslag.put('opgehaald', true);
      return new Response(save, { status: 200 });
    }
    if (pad === '/stand') {
      const { sleutel } = await req.json();
      const eigen = leeft && sleutel && sleutel === await this.opslag.get('sleutel');
      if (!eigen) return new Response(JSON.stringify({ opgehaald: false, verlopen: true }));
      return new Response(JSON.stringify({ opgehaald: !!await this.opslag.get('opgehaald'), verlopen: false }));
    }
    return new Response(null, { status: 404 });
  }
  async alarm() { await this.opslag.deleteAll(); }
}

/* Telt pogingen per adres (per soort) in een venster van WACHT_MS. 200 = mag,
   429 = te veel. Vergeet zichzelf aan het eind van het venster. */
export class Wachter {
  constructor(state) { this.state = state; this.opslag = state.storage; }
  async fetch(req) {
    const { max, venster } = await req.json();
    const nu = Date.now();
    let start = await this.opslag.get('start');
    let keer = await this.opslag.get('keer') || 0;
    if (typeof start !== 'number' || nu - start >= venster) {
      start = nu; keer = 0;
      await this.opslag.setAlarm(nu + venster);
    }
    if (keer >= max) return new Response(null, { status: 429 });
    await this.opslag.put({ start, keer: keer + 1 });
    return new Response(null, { status: 200 });
  }
  async alarm() { await this.opslag.deleteAll(); }
}
