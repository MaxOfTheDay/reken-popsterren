/* ================= Ouderaccount ================= */
/* Inloggen met Google, voor de ouder -- en verder nog niets.

   WAT DIT IS
   Een ouder kan in het ouderdeel (Beheer, "Voor alle sterren") een account
   verbinden: Supabase Auth met Google als enige aanbieder. Dit stuk weet alleen
   wíé er verbonden is, en raakt `db` nergens aan. De cloudback-up zelf staat
   ernaast, in src/19-cloudbackup.js, en leunt op de RLS-regels in Supabase --
   niet op wat hier in de browser staat. Wat deze code "verbonden" noemt is dus
   nooit een toestemming.

   Er is één account per toestel, voor de ouder. Sterren (kinderen) hebben geen
   account en krijgen er ook geen.

   WAAROM GEEN supabase-js
   Het spel is één bestand zonder bibliotheek dat ook vanaf file:// draait (zie
   CLAUDE.md). supabase-js is een bibliotheek, en de ESM-versie laadt niet vanaf
   file://. Wat we ervan nodig hebben zijn vier HTTP-aanroepen naar dezelfde
   Auth-API (GoTrue) die supabase-js zelf ook doet:

     GET  /auth/v1/authorize?provider=google&...   (een gewone paginasprong)
     POST /auth/v1/token?grant_type=pkce           code -> sessie
     POST /auth/v1/token?grant_type=refresh_token  verlopen -> vers
     POST /auth/v1/logout?scope=local              afmelden op dit toestel

   De stroom is PKCE, net als supabase-js in de browser: vóór de sprong maken we
   een geheim (verifier) en sturen alleen de hash ervan mee; Google stuurt via
   Supabase een ?code= terug en alleen wie de verifier heeft kan die inwisselen.
   Er komt dus nooit een token in de URL te staan.

   WAT HIER STAAT EN WAT NIET
   Alleen de projectURL en de publishable sleutel. Die zijn bedoeld om openbaar
   te zijn (ze staan in élke browser die de pagina opent). Een secret key, de
   service-role-sleutel of het Google client secret horen hier NOOIT: die geven
   rechten buiten RLS om.

   Google-scopes: geen. Supabase vraagt zelf alleen openid/e-mail/profiel op, en
   meer hebben we niet nodig -- geen Gmail, Drive of contacten.

   OPSLAG
   Twee eigen sleutels in localStorage, allebei los van LS_KEY:
     OUDER_SESSIE_KEY  de sessie (tokens, verloopmoment, id en e-mail)
     OUDER_PKCE_KEY    de verifier, alleen tussen "Doorgaan met Google" en de
                       terugkeer; daarna meteen weg
   Inloggen, afmelden of een mislukte poging schrijven dus nooit in de save van
   een kind. test/ouder.test.js zaak P kijkt dat na.

   NETWERK
   Bij een gewone start gaat er niets naar Supabase: de sessie wordt uit
   localStorage gelezen en pas nagekeken (en zo nodig ververst) als het ouderdeel
   de kaart tekent. Een kind dat offline speelt merkt er niets van.

   file:// en een onveilige herkomst: daar kan de sprong niet terugkomen (Supabase
   stuurt alleen terug naar een toegestane http(s)-URL) en is er geen
   crypto.subtle voor de PKCE-hash. De knop staat er dan uit, met een zin erbij. */

const OUDER_AUTH = {
  url: 'https://iufyykmcembysfdcoogg.supabase.co',
  // publishable: openbaar bedoeld, beperkt tot wat RLS toelaat
  sleutel: 'sb_publishable_oLMDbbWeW-kDd6T7iW6p3A_RsiYsecd',
};
const OUDER_SESSIE_KEY = 'rekensterren-ouderaccount';
const OUDER_PKCE_KEY = 'rekensterren-ouderaccount-pkce';

/* De stand, in het geheugen. `bezig` staat aan zolang er een terugkeer van
   Google wordt ingewisseld of er naar Google gesprongen wordt; de kaart zegt dan
   "even geduld" in plaats van een knop die je twee keer kunt indrukken. */
let ouderSessie = null;
let ouderBezig = false;
let ouderNagekeken = false;   // één keer per start de sessie bij Supabase nakijken

function ouderLees() {
  try {
    const s = JSON.parse(localStorage.getItem(OUDER_SESSIE_KEY) || 'null');
    return (s && s.refresh_token && s.user) ? s : null;
  } catch (e) { return null; }
}
function ouderBewaar(s) {
  ouderSessie = s;
  try {
    if (s) localStorage.setItem(OUDER_SESSIE_KEY, JSON.stringify(s));
    else localStorage.removeItem(OUDER_SESSIE_KEY);
  } catch (e) { /* vol of dicht: dan alleen voor deze sessie */ }
}
// Alleen wat we nodig hebben uit het GoTrue-antwoord; geen naam, foto of
// identiteiten van Google in localStorage.
function ouderUitAntwoord(a) {
  if (!a || !a.access_token || !a.refresh_token || !a.user) return null;
  const nu = Math.floor(Date.now() / 1000);
  return {
    access_token: a.access_token,
    refresh_token: a.refresh_token,
    expires_at: a.expires_at || (nu + (a.expires_in || 3600)),
    user: { id: a.user.id, email: a.user.email || '' },
  };
}

// Kan er hier ingelogd worden? Zie de kop: niet vanaf file://, en niet zonder
// crypto.subtle (dat is er alleen in een veilige context).
function ouderKanInloggen() {
  return /^https?:$/.test(location.protocol)
    && !!window.isSecureContext && !!(window.crypto && window.crypto.subtle);
}
// Waar Google ons terugzet: deze pagina, zonder zoekvraag of hekje. Online is
// dat https://rekensterren.be/; lokaal localhost. Die URL moet in Supabase bij
// de Redirect URLs staan, anders valt Supabase terug op de Site URL.
function ouderTerugUrl() {
  return location.origin + location.pathname;
}

function ouderBase64url(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function ouderPkce() {
  const r = new Uint8Array(32);
  window.crypto.getRandomValues(r);
  const verifier = ouderBase64url(r);
  const hash = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return { verifier, challenge: ouderBase64url(new Uint8Array(hash)) };
}

async function ouderPost(pad, body, token) {
  const headers = { 'Content-Type': 'application/json', apikey: OUDER_AUTH.sleutel };
  if (token) headers.Authorization = 'Bearer ' + token;
  const res = await fetch(OUDER_AUTH.url + '/auth/v1/' + pad, {
    method: 'POST', headers, body: JSON.stringify(body || {}),
  });
  let data = null;
  try { data = await res.json(); } catch (e) { /* leeg antwoord (logout) */ }
  return { ok: res.ok, status: res.status, data };
}

/* "Doorgaan met Google": verifier bewaren, dan de hele pagina naar Supabase.
   Alles wat een kind speelde staat al in localStorage (save() schrijft meteen
   weg), dus weggaan kost niets. */
async function ouderLogin() {
  if (ouderBezig || !ouderKanInloggen()) return;
  ouderBezig = true;
  ouderToon();
  try {
    const { verifier, challenge } = await ouderPkce();
    localStorage.setItem(OUDER_PKCE_KEY, verifier);
    const q = new URLSearchParams({
      provider: 'google',
      redirect_to: ouderTerugUrl(),
      code_challenge: challenge,
      code_challenge_method: 's256',
    });
    location.assign(OUDER_AUTH.url + '/auth/v1/authorize?' + q.toString());
  } catch (e) {
    ouderBezig = false;
    ouderToon();
    ouderMeld('Verbinden lukte niet. Probeer het later nog eens.');
  }
}

// Afmelden: hier meteen, bij Supabase zo goed als het gaat. Mislukt dat laatste
// (geen net), dan is dit toestel toch afgemeld -- de tokens zijn weg.
async function ouderLogout() {
  const s = ouderSessie;
  ouderBewaar(null);
  cloudStand = null;
  ouderToon();
  if (!s) return;
  try { await ouderPost('logout?scope=local', {}, s.access_token); } catch (e) { /* offline */ }
}

/* De sessie nakijken en zo nodig verversen. Wordt aangeroepen als de kaart
   getekend wordt, niet bij het opstarten (zie NETWERK in de kop).
   Supabase zegt "nee" (400/401/403): de sessie is ingetrokken, dan zijn we
   afgemeld. Geen net: niets veranderen, de sessie blijft zoals ze was. */
/* Eén verversing tegelijk: de kaart (ouderNakijken) en een back-up (ouderToken)
   kunnen er tegelijk om vragen, en twee keer hetzelfde refresh token inwisselen
   kan Supabase als hergebruik zien. */
let ouderVerversLoopt = null;
function ouderVervers() {
  if (!ouderVerversLoopt) {
    ouderVerversLoopt = ouderVerversNu().finally(() => { ouderVerversLoopt = null; });
  }
  return ouderVerversLoopt;
}
async function ouderVerversNu() {
  const s = ouderSessie;
  if (!s) return;
  try {
    const r = await ouderPost('token?grant_type=refresh_token', { refresh_token: s.refresh_token });
    if (ouderSessie !== s) return;               // intussen afgemeld of opnieuw ingelogd
    if (r.ok) { const n = ouderUitAntwoord(r.data); if (n) ouderBewaar(n); }
    else if (r.status >= 400 && r.status < 500) ouderBewaar(null);
    ouderToon();
  } catch (e) { /* offline */ }
}
/* Een access token dat nog minstens een minuut meegaat, of null (afgemeld, of
   verlopen en geen net om te verversen). Voor de cloudback-up. */
async function ouderToken() {
  const nu = () => Math.floor(Date.now() / 1000);
  if (!ouderSessie) return null;
  if (ouderSessie.expires_at - nu() > 60) return ouderSessie.access_token;
  await ouderVervers();
  const s = ouderSessie;
  return (s && s.expires_at - nu() > 0) ? s.access_token : null;
}
function ouderNakijken() {
  if (ouderNagekeken || !ouderSessie) return;
  if (ouderSessie.expires_at - Math.floor(Date.now() / 1000) > 60) return;
  ouderNagekeken = true;
  ouderVervers();
}

/* De terugkeer van Google. Draait bij het opstarten (zie "= Start"), vóór er
   iets met de geschiedenis gebeurt.

   Alleen als wíj de sprong maakten -- er staat een verifier klaar -- lezen we
   ?code= of ?error=. Een link met toevallig ?code= erin doet dus niets. De
   parameters gaan meteen uit de adresbalk, zodat herladen niet nog eens
   probeert in te wisselen en de code niet in een bladwijzer belandt.

   Geeft true terug als er een terugkeer was: dan opent de start het ouderdeel
   op Beheer, waar de ouder ook vandaan kwam. */
function ouderStart() {
  ouderSessie = ouderLees();
  let verifier = null;
  try { verifier = localStorage.getItem(OUDER_PKCE_KEY); } catch (e) { /* dicht */ }
  if (!verifier) return false;
  const zoek = new URLSearchParams(location.search || '');
  const hek = new URLSearchParams((location.hash || '').replace(/^#/, ''));
  const code = zoek.get('code');
  const fout = zoek.get('error') || hek.get('error');
  if (!code && !fout) return false;

  try { localStorage.removeItem(OUDER_PKCE_KEY); } catch (e) { /* dicht */ }
  // Met de hand en niet met zoek.toString(): dat maakt van ?debug een ?debug=.
  const weg = ['code', 'error', 'error_code', 'error_description', 'state'];
  const rest = (location.search || '').replace(/^\?/, '').split('&')
    .filter(d => d && !weg.includes(decodeURIComponent(d.split('=')[0]))).join('&');
  try { history.replaceState(history.state, '', location.pathname + (rest ? '?' + rest : '')); } catch (e) { /* file:// */ }

  if (fout || !code) {
    // Geannuleerd of geweigerd: niets veranderd, en een eerdere sessie blijft.
    ouderMeld(fout === 'access_denied' ? 'Inloggen geannuleerd.' : 'Inloggen is niet gelukt.');
    return true;
  }
  ouderBezig = true;
  ouderPost('token?grant_type=pkce', { auth_code: code, code_verifier: verifier })
    .then(r => {
      const n = r.ok ? ouderUitAntwoord(r.data) : null;
      ouderBezig = false;
      if (n) { ouderBewaar(n); ouderNagekeken = true; ouderMeld('✅ Verbonden met ' + n.user.email); }
      else ouderMeld('Inloggen is niet gelukt.');
      ouderToon();
    })
    .catch(() => { ouderBezig = false; ouderMeld('Inloggen is niet gelukt. Is er internet?'); ouderToon(); });
  return true;
}

function ouderMeld(tekst) {
  showToast(esc(tekst));
  setTimeout(hideToast, 2200);
}

// Terug met de terugknop vanaf Google (zonder ?error=): de pagina komt uit de
// bfcache met ouderBezig nog aan. Dan de knop weer vrijgeven.
addEventListener('pageshow', e => {
  if (!e.persisted || !ouderBezig) return;
  ouderBezig = false;
  ouderToon();
});
// Een ander tabblad meldde zich aan of af: meelopen.
addEventListener('storage', e => {
  if (e.key !== OUDER_SESSIE_KEY) return;
  ouderSessie = ouderLees();
  ouderToon();
});

/* ---- De kaart in het ouderdeel ---- */
function ouderAccountKaartHtml() {
  ouderNakijken();
  const s = ouderSessie;
  let body;
  if (ouderBezig) {
    body = `<div class="account-stand">Even geduld…</div>`;
  } else if (s) {
    body = `<div class="account-stand aan">Verbonden</div>
      <div class="account-mail" id="set-account-mail">${esc(s.user.email)}</div>
      ${cloudKaartHtml(s)}`;
  } else {
    const kan = ouderKanInloggen();
    body = `<div class="account-stand">Niet verbonden</div>
      <div class="note" style="margin-top:8px">Bewaar je voortgang veilig en zet hem later terug op een ander toestel.</div>
      <div class="data-btns" style="margin-top:11px">
        <button class="btn small paper" id="set-account-in"${kan ? '' : ' disabled'}>Doorgaan met Google</button>
      </div>${kan ? '' : `
      <div class="note" style="margin-top:8px">Inloggen kan alleen in de online versie, op rekensterren.be.</div>`}`;
  }
  return `
    <div class="set-card" id="set-account">
      <div class="set-card-head"><div class="ico">☁️</div><div><h2>Cloudback-up</h2><div class="sub">Een account voor de ouder, niet voor de sterren</div></div></div>
      ${body}
    </div>`;
}
function ouderAccountBind() {
  const i = $('set-account-in'), u = $('set-account-uit'), m = $('set-cloud-maak');
  if (i) i.onclick = ouderLogin;
  if (u) u.onclick = ouderLogout;
  if (m) m.onclick = cloudBackupMaken;
}
// Stand veranderd: alleen de kaart vervangen als ze er staat. De rest van het
// ouderdeel blijft staan (geen scrollsprong, geen focusverlies).
function ouderToon() {
  const k = document.getElementById('set-account');
  if (!k) return;
  k.outerHTML = ouderAccountKaartHtml().trim();
  ouderAccountBind();
}
