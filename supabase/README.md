# supabase/

De database achter de cloudback-up. Het spel zelf heeft dit niet nodig: het
praat met Supabase via `src/18-ouderaccount.js` (inloggen) en
`src/19-cloudbackup.js` (back-up), met alleen de projectURL en de publishable
sleutel.

`migrations/` bevat de SQL, in volgorde van de tijdstempel in de naam. Een
migratie gaat **niet vanzelf live** — er is geen CI die ze toepast. Toepassen:

* met de Supabase CLI: `supabase link --project-ref iufyykmcembysfdcoogg` en
  dan `supabase db push`, of
* met de hand: de inhoud van het bestand plakken in de SQL Editor van het
  project en draaien.

Nakijken vóór je toepast: `npm run test:rls` draait alle migraties in een
tijdelijke lokale PostgreSQL en test de RLS-regels (zie `docs/TESTEN.md`).

Hier hoort nooit een secret key, service-role-sleutel, databasewachtwoord of
Google client secret te staan.
