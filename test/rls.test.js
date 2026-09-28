/*
 * De cloudback-up in de database: klopt de beveiliging?
 *
 * supabase/migrations/*_account_backups.sql maakt de tabel account_backups en
 * zet er RLS op. Dat valt niet na te kijken in de browser -- daar is Supabase
 * nagedaan (zie ouder.test.js zaak Q). Deze suite draait de échte migratie in
 * een échte PostgreSQL, met eromheen het stukje Supabase waar hij op leunt:
 *
 *   * de rollen anon en authenticated,
 *   * het schema auth met auth.users en auth.uid() (net als bij Supabase leest
 *     die de "sub" uit de JWT-claims die PostgREST per aanvraag zet),
 *   * en -- met opzet het slechtste geval -- standaardrechten die élke nieuwe
 *     tabel in public meteen aan anon en authenticated geven. Het project staat
 *     zo níet ingesteld, maar de migratie hoort ook dan dicht te zitten.
 *
 * Daarna doet elke zaak wat PostgREST zou doen: per aanvraag een rol en een
 * gebruiker, en dan één SQL-opdracht.
 *
 *   A  ouder A mag haar eigen rij maken, lezen en bijwerken
 *   B  twee keer back-uppen is één rij, en updated_at komt van de server
 *   C  ouder B ziet de rij van A niet en kan hem niet overschrijven
 *   D  anon mag niets, en niemand mag wissen
 *   E  de vorm: alleen een object, en het account weg = de back-up weg
 *
 * Nodig: PostgreSQL 14+ (initdb, pg_ctl, psql). Staat het er niet, dan zegt de
 * suite dat en stopt ze zonder fout -- ze hoort dus niet in `npm test`, want die
 * moet op elke machine kunnen draaien. Draaien:
 *   npm run test:rls
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const MIGRATIES = path.resolve(__dirname, '..', 'supabase', 'migrations');

function zoekBin(naam) {
  const kandidaten = [];
  const lib = '/usr/lib/postgresql';
  if (fs.existsSync(lib)) {
    fs.readdirSync(lib).sort((a, b) => Number(b) - Number(a))
      .forEach(v => kandidaten.push(path.join(lib, v, 'bin', naam)));
  }
  kandidaten.push('/usr/local/bin/' + naam, '/opt/homebrew/bin/' + naam, '/usr/bin/' + naam);
  return kandidaten.find(k => fs.existsSync(k)) || null;
}
const BIN = { initdb: zoekBin('initdb'), pg_ctl: zoekBin('pg_ctl'), psql: zoekBin('psql') };
if (!BIN.initdb || !BIN.pg_ctl || !BIN.psql) {
  console.log('rls: geen PostgreSQL gevonden (initdb/pg_ctl/psql) -- overgeslagen.');
  process.exit(0);
}

// initdb weigert als root; dan draaien we de server als de gebruiker postgres.
const alsRoot = process.getuid && process.getuid() === 0;
function draai(bin, args, opts) {
  const [cmd, a] = alsRoot ? ['runuser', ['-u', 'postgres', '--', bin, ...args]] : [bin, args];
  return spawnSync(cmd, a, Object.assign({ encoding: 'utf8' }, opts));
}

const map = fs.mkdtempSync(path.join(os.tmpdir(), 'rs-rls-'));
fs.chmodSync(map, 0o777);
const data = path.join(map, 'data');
const poort = String(54000 + Math.floor(Math.random() * 900));
let r = draai(BIN.initdb, ['-D', data, '-U', 'postgres', '-A', 'trust', '--no-sync']);
if (r.status !== 0) { console.error(r.stderr); process.exit(1); }
r = draai(BIN.pg_ctl, ['-D', data, '-w', '-l', path.join(map, 'log'), '-o',
  `-p ${poort} -k ${map} -c listen_addresses=''`, 'start']);
if (r.status !== 0) { console.error(r.stderr, fs.readFileSync(path.join(map, 'log'), 'utf8')); process.exit(1); }

function stop() {
  draai(BIN.pg_ctl, ['-D', data, '-m', 'immediate', 'stop']);
  try { fs.rmSync(map, { recursive: true, force: true }); } catch (e) { /* laat maar */ }
}
process.on('exit', stop);

// Eén opdracht; geeft { ok, uit, fout } terug. -At: kale regels, geen kop.
function sql(tekst) {
  const res = spawnSync(BIN.psql, ['-h', map, '-p', poort, '-U', 'postgres', '-d', 'postgres',
    '-X', '-q', '-At', '-v', 'ON_ERROR_STOP=1', '-c', tekst], { encoding: 'utf8' });
  return { ok: res.status === 0, uit: (res.stdout || '').trim(), fout: (res.stderr || '').trim() };
}
// Zoals PostgREST het doet: binnen één transactie een rol en de claims zetten.
function als(rol, sub, tekst) {
  const claims = sub ? `select set_config('request.jwt.claims', '{"sub":"${sub}","role":"${rol}"}', true);` : '';
  const res = sql(`begin; set local role ${rol}; ${claims} ${tekst}; commit;`);
  // set_config geeft zelf een regel terug; die hoort niet bij de uitkomst
  if (sub) res.uit = res.uit.split('\n').filter(l => l !== `{"sub":"${sub}","role":"${rol}"}`).join('\n').trim();
  return res;
}

const fails = [];
let goed = 0, totaal = 0;
function check(ok, label, detail) {
  totaal++;
  if (ok) { goed++; console.log(' ok    ' + label); }
  else { console.log(' FOUT  ' + label); fails.push(label + ': ' + detail); }
}

// ---- Het stukje Supabase waar de migratie op leunt ----
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
let s = sql(`
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$
    select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''),
                    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid
  $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  grant usage on schema public to anon, authenticated;
  -- het slechtste geval: alles wat er in public bijkomt staat meteen open
  alter default privileges in schema public grant all on tables to anon, authenticated;
  insert into auth.users values ('${A}', 'a@voorbeeld.be'), ('${B}', 'b@voorbeeld.be');
`);
if (!s.ok) { console.error(s.fout); process.exit(1); }

const bestanden = fs.readdirSync(MIGRATIES).filter(f => f.endsWith('.sql')).sort();
for (const f of bestanden) {
  s = sql(fs.readFileSync(path.join(MIGRATIES, f), 'utf8'));
  check(s.ok, `migratie ${f} draait`, s.fout);
  if (!s.ok) process.exit(1);
}

const save = n => `'{"sound":true,"haptics":true,"schemaV":2,"profiles":{"p1":{"name":"Anna","stars":{"1":${n}}}}}'::jsonb`;
const upsert = (wie, n) => `insert into public.account_backups (user_id, backup_version, backup_data)
  values ('${wie}', 1, ${save(n)})
  on conflict (user_id) do update set backup_version = excluded.backup_version, backup_data = excluded.backup_data
  returning user_id`;

/* A · de eigen rij */
r = als('authenticated', A, upsert(A, 1));
check(r.ok && r.uit === A, 'A · ouder A maakt haar eigen back-up', r.fout || r.uit);
r = als('authenticated', A, `select backup_data->'profiles'->'p1'->'stars'->>'1' from public.account_backups`);
check(r.ok && r.uit === '1', 'A · en leest hem terug', r.fout || r.uit);

/* B · twee keer is één rij; de server zet de tijd */
const eerst = sql(`select updated_at from public.account_backups where user_id = '${A}'`).uit;
sql('select pg_sleep(0.02)');
r = als('authenticated', A, upsert(A, 3));
check(r.ok, 'B · nog een back-up van A lukt', r.fout);
r = sql(`select count(*), max(backup_data->'profiles'->'p1'->'stars'->>'1'), max(updated_at) > '${eerst}'::timestamptz
  from public.account_backups where user_id = '${A}'`);
check(r.uit === '1|3|t', 'B · het blijft één rij, met de nieuwe inhoud en een latere updated_at', r.uit);
r = als('authenticated', A, `update public.account_backups set updated_at = '2000-01-01' where user_id = '${A}' returning extract(year from updated_at)`);
check(r.ok && r.uit !== '2000', 'B · updated_at komt van de server, niet van het toestel', r.fout || r.uit);

/* C · B tegen A */
r = als('authenticated', B, 'select count(*) from public.account_backups');
check(r.ok && r.uit === '0', 'C · B ziet de back-up van A niet', r.fout || r.uit);
r = als('authenticated', B, `select count(*) from public.account_backups where user_id = '${A}'`);
check(r.ok && r.uit === '0', 'C · ook niet als B er rechtstreeks om vraagt', r.fout || r.uit);
r = als('authenticated', B, `insert into public.account_backups (user_id, backup_version, backup_data) values ('${A}', 1, ${save(0)})`);
check(!r.ok && /row-level security|duplicate key/.test(r.fout), 'C · B kan geen rij op naam van A maken', r.fout || r.uit);
r = als('authenticated', B, upsert(A, 0));
check(!r.ok, 'C · en ook niet via een upsert op A', r.uit);
r = als('authenticated', B, `update public.account_backups set backup_data = ${save(0)} where user_id = '${A}' returning 1`);
check(r.ok && r.uit === '', 'C · B kan de rij van A niet bijwerken (0 rijen)', r.fout || r.uit);
r = sql(`select backup_data->'profiles'->'p1'->'stars'->>'1' from public.account_backups where user_id = '${A}'`);
check(r.uit === '3', 'C · de back-up van A is onaangeroerd', r.uit);
r = als('authenticated', B, upsert(B, 7));
check(r.ok && r.uit === B, 'C · B heeft wél zijn eigen rij', r.fout || r.uit);
r = als('authenticated', A, `update public.account_backups set user_id = '${B}' where user_id = '${A}'`);
check(!r.ok, 'C · A kan haar rij niet naar B verhangen', r.uit);
r = als('authenticated', A, 'select count(*) from public.account_backups');
check(r.uit === '1', 'C · en A ziet nog altijd alleen de hare', r.uit);

/* D · anon en wissen */
r = als('anon', null, 'select count(*) from public.account_backups');
check(!r.ok && /permission denied/.test(r.fout), 'D · anon kan niet lezen', r.fout || r.uit);
r = als('anon', null, `insert into public.account_backups (user_id, backup_version, backup_data) values ('${A}', 1, ${save(0)})`);
check(!r.ok && /permission denied/.test(r.fout), 'D · anon kan niet schrijven', r.fout || r.uit);
r = als('anon', A, 'select count(*) from public.account_backups');
check(!r.ok && /permission denied/.test(r.fout), 'D · ook niet met een sub in de claims', r.fout || r.uit);
r = als('authenticated', A, `delete from public.account_backups where user_id = '${A}'`);
check(!r.ok && /permission denied/.test(r.fout), 'D · niemand van de app mag een back-up wissen', r.fout || r.uit);
r = als('authenticated', null, 'select count(*) from public.account_backups');
check(r.ok && r.uit === '0', 'D · authenticated zonder gebruiker ziet niets', r.fout || r.uit);
r = sql(`select has_table_privilege('anon', 'public.account_backups', 'select,insert,update,delete,truncate,references,trigger')`);
check(r.uit === 'f', 'D · anon heeft geen enkel tabelrecht, ondanks de standaardrechten', r.uit);
r = sql(`select string_agg(privilege_type, ',' order by privilege_type) from information_schema.role_table_grants
  where grantee = 'authenticated' and table_name = 'account_backups'`);
check(r.uit === 'INSERT,SELECT,UPDATE', 'D · authenticated heeft precies SELECT, INSERT en UPDATE', r.uit);

/* E · vorm en opruimen */
r = als('authenticated', A, `update public.account_backups set backup_data = '[1,2]'::jsonb where user_id = '${A}'`);
check(!r.ok && /check constraint/.test(r.fout), 'E · backup_data moet een object zijn', r.fout || r.uit);
r = sql(`delete from auth.users where id = '${A}'; select count(*) from public.account_backups where user_id = '${A}'`);
check(r.uit.split('\n').pop() === '0', 'E · account weg = back-up weg (on delete cascade)', r.uit);

console.log(`\nrls: ${goed}/${totaal} controles geslaagd.`);
if (fails.length) {
  console.log('\nWat er omviel:');
  fails.forEach(f => console.log('  ' + f));
  process.exitCode = 1;
}
