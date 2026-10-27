/* De ontvanger van de foutmelder (src/05-foutmelder.js), als Cloudflare Worker.
   Hoort niet bij het spel: deze code draait bij Cloudflare, niet in de browser.
   Zie docs/FOUTEN.md voor het opzetten en het uitlezen.

   Hij neemt één briefje aan, kijkt of het van rekensterren.be komt, knipt elk
   veld kort en schrijft één punt in Workers Analytics Engine (dataset
   rekensterren_fouten, binding FOUTEN). Het IP-adres en de volledige
   user-agent worden niet bewaard; van de user-agent blijft alleen het soort
   systeem over. Het antwoord is altijd een lege 204: het spel kijkt er toch
   niet naar, en wie hem uitprobeert leert er niets uit. */
const HERKOMST = /^https:\/\/(www\.)?rekensterren\.be$/;
const kort = (x, n) => String(x == null ? '' : x).slice(0, n);

function systeem(ua) {
  if (/Android/.test(ua)) return 'Android';
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
  if (/Macintosh/.test(ua)) return 'Mac/iPad';   // een iPad zegt sinds iOS 13 "Macintosh"
  if (/Windows/.test(ua)) return 'Windows';
  return 'anders';
}

export default {
  async fetch(req, env) {
    const leeg = new Response(null, { status: 204 });
    if (req.method !== 'POST' || !HERKOMST.test(req.headers.get('Origin') || '')) return leeg;
    let b;
    try { b = JSON.parse((await req.text()).slice(0, 2000)); } catch (e) { return leeg; }
    if (!b || typeof b !== 'object' || !b.wat) return leeg;
    const versie = kort(b.versie, 8);
    env.FOUTEN.writeDataPoint({
      indexes: [versie || '?'],
      blobs: [kort(b.wat, 120), kort(b.waar, 40), versie, kort(b.scherm, 20), kort(b.toestel, 10),
        systeem(req.headers.get('User-Agent') || '')],
      doubles: [1],
    });
    return leeg;
  },
};
