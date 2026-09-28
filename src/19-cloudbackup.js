/* ================= Cloudback-up ================= */
/* Een ingelogde ouder kan met één tik de save van dit toestel naar Supabase
   sturen. Handmatig, en alleen die kant op.

   DE RICHTING
     spel -> db -> localStorage (save(), zoals altijd)
                -> "Nu back-up maken" -> Supabase
   Nooit andersom. Er is hier geen terugzetten, geen automatische back-up en geen
   synchronisatie; de lokale save blijft wat het spel leest en schrijft. Deze
   code LEEST de save en schrijft nergens in -- niet in `db`, niet in LS_KEY,
   geen save(), geen migrate(). Mislukt het versturen, dan is er dus niets om
   terug te draaien. test/ouder.test.js zaak Q kijkt dat na.

   WAT ER GAAT
   De lokale save zelf: de tekst onder LS_KEY in localStorage, precies zoals
   save() hem schreef (JSON.stringify(db) -- hetzelfde object dat "Back-up
   maken" als bestand uitschrijft). Geen tweede voorstelling van de spelstand:
   alle sterren met hun voortgang, kast en diamanten, plus de app-brede
   schakelaars, in één object.
   Bewust de opgeslagen save en niet `db` in het geheugen: dat is wat er op dit
   toestel bewaard ís, en een kijkstand achter ?debug (&demo, &wereld=) die met
   opzet nooit wordt opgeslagen kan zo ook nooit in de cloud belanden.
   Hij gaat eerst langs dezelfde keuring als een back-upbestand dat teruggezet
   wordt (backupVormOk), zodat er nooit iets in de cloud belandt dat de
   terugzet-stap straks zou weigeren.

   De rij in account_backups (zie supabase/migrations/):
     user_id         de ouder (auth.users.id) -- één rij per account
     backup_version  CLOUD_BACKUP_VERSIE: de versie van déze envelop. Los van
                     db.schemaV, dat ín de save staat en met de save meereist
     backup_data     de save
     updated_at      gezet door de database, niet door de klok van dit toestel
   Twee keer back-uppen overschrijft dezelfde rij (upsert op user_id).

   WIE MAG WAT
   De database beslist, niet deze code: RLS laat een ouder alleen haar eigen rij
   lezen, maken en bijwerken (test/rls.test.js). Dat we hier ons eigen user_id
   meesturen is dus geen beveiliging maar de sleutel van de upsert.

   NETWERK
   Pas als het ouderdeel de kaart tekent vragen we één keer wanneer de laatste
   back-up was (alleen updated_at, niet de save zelf). De rest gebeurt alleen op
   een tik. Het spel wacht nergens op. */

const CLOUD_BACKUP_VERSIE = 1;

/* Wat de kaart moet weten, per ingelogde ouder. Wisselt de gebruiker (afmelden,
   iemand anders meldt zich aan), dan begint dit opnieuw -- de stand van de één
   hoort nooit bij de ander te staan.
     stand   'onbekend' | 'laden' | 'geen' | 'bewaard' | 'kwijt' (ophalen mislukt)
     laatste updated_at van de laatste back-up (ISO), of null
     bezig   er wordt nu verstuurd; de knop staat dan uit
     fout    de zin die zegt dat het versturen mislukte, tot de volgende poging */
let cloudStand = null;
function cloudVoor(s) {
  if (!s) return null;
  if (!cloudStand || cloudStand.user !== s.user.id) {
    cloudStand = { user: s.user.id, stand: 'onbekend', laatste: null, bezig: false, fout: null };
  }
  return cloudStand;
}

async function cloudRest(methode, pad, token, body, prefer) {
  const headers = { apikey: OUDER_AUTH.sleutel, Authorization: 'Bearer ' + token };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (prefer) headers.Prefer = prefer;
  const res = await fetch(OUDER_AUTH.url + '/rest/v1/' + pad, {
    method: methode, headers, body: body === undefined ? undefined : body,
  });
  let data = null;
  try { data = await res.json(); } catch (e) { /* leeg antwoord */ }
  return { ok: res.ok, status: res.status, data };
}

/* De save klaarmaken: de opgeslagen tekst inlezen. Zo weten we zeker dat hij
   heen en terug kan, en is wat we versturen een losse kopie -- niets hierna kan
   per ongeluk aan `db` komen. Geeft null als er geen save is of als hij niet
   door de keuring komt. */
function cloudPakket(userId) {
  let data;
  try { data = JSON.parse(localStorage.getItem(LS_KEY)); } catch (e) { return null; }
  if (!backupVormOk(data)) return null;
  return { user_id: userId, backup_version: CLOUD_BACKUP_VERSIE, backup_data: data };
}

// Wanneer was de laatste back-up? Eén keer per ouder per start.
async function cloudStatusOphalen() {
  const s = ouderSessie, c = cloudVoor(s);
  if (!c || c.stand !== 'onbekend') return;
  c.stand = 'laden';
  try {
    const token = await ouderToken();
    if (!token) throw new Error('geen sessie');
    const r = await cloudRest('GET', 'account_backups?select=updated_at&user_id=eq.'
      + encodeURIComponent(s.user.id), token);
    if (cloudStand !== c) return;                 // intussen iemand anders
    if (!r.ok || !Array.isArray(r.data)) throw new Error('status ' + r.status);
    c.stand = r.data.length ? 'bewaard' : 'geen';
    c.laatste = r.data.length ? r.data[0].updated_at : null;
  } catch (e) {
    if (cloudStand === c && c.stand === 'laden') c.stand = 'kwijt';
  }
  ouderToon();
}

/* "Nu back-up maken". Afgemeld of al bezig: niets. */
async function cloudBackupMaken() {
  const s = ouderSessie, c = cloudVoor(s);
  if (!c || c.bezig) return;
  c.bezig = true;
  c.fout = null;
  ouderToon();
  try {
    const pakket = cloudPakket(s.user.id);
    if (!pakket) throw Object.assign(new Error('pakket'), { zin: 'De voortgang kon niet klaargemaakt worden. Er is niets verstuurd.' });
    const token = await ouderToken();
    if (!token) throw new Error('geen sessie');
    const r = await cloudRest('POST', 'account_backups?on_conflict=user_id&select=updated_at', token,
      JSON.stringify(pakket), 'resolution=merge-duplicates,return=representation');
    if (!r.ok || !Array.isArray(r.data) || !r.data.length) throw new Error('status ' + r.status);
    if (cloudStand !== c) return;
    c.stand = 'bewaard';
    c.laatste = r.data[0].updated_at;
    ouderMeld('✅ Cloudback-up bewaard');
  } catch (e) {
    if (cloudStand !== c) return;
    c.fout = e.zin || 'Back-up mislukt. Je voortgang op dit toestel is niet veranderd. Probeer het opnieuw.';
  } finally {
    if (cloudStand === c) c.bezig = false;
    ouderToon();
  }
}

function cloudDatum(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  try { return d.toLocaleString('nl-BE', { dateStyle: 'medium', timeStyle: 'short' }); }
  catch (e) { return d.toLocaleString(); }
}

// Het cloudstuk van de kaart, onder "Verbonden" en het adres.
function cloudKaartHtml(s) {
  const c = cloudVoor(s);
  if (c.stand === 'onbekend') cloudStatusOphalen();
  let stand;
  if (c.stand === 'bewaard') {
    stand = `<div class="cloud-stand ok" id="set-cloud-stand">✓ Back-up bewaard</div>
      <div class="note" id="set-cloud-laatste">Laatste back-up: ${esc(cloudDatum(c.laatste))}</div>`;
  } else if (c.stand === 'geen') {
    stand = `<div class="cloud-stand" id="set-cloud-stand">Nog geen cloudback-up</div>`;
  } else if (c.stand === 'kwijt') {
    stand = `<div class="cloud-stand" id="set-cloud-stand">Laatste back-up onbekend</div>
      <div class="note">Kon Supabase niet bereiken. Een nieuwe back-up maken kan wel.</div>`;
  } else {
    stand = `<div class="cloud-stand" id="set-cloud-stand">Even kijken…</div>`;
  }
  const fout = c.fout ? `
      <div class="cloud-fout" id="set-cloud-fout" role="alert">${esc(c.fout)}</div>` : '';
  return `<div class="cloud-blok">${stand}${fout}</div>
      <div class="data-btns" style="margin-top:11px">
        <button class="btn small purple" id="set-cloud-maak"${c.bezig ? ' disabled aria-busy="true"' : ''}>${c.bezig ? 'Bezig met back-up…' : 'Nu back-up maken'}</button>
        <button class="btn small paper" id="set-account-uit">Afmelden</button>
      </div>`;
}
