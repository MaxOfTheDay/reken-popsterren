-- Rekensterren: handmatige cloudback-up per ouderaccount.
--
-- Eén rij per Supabase-gebruiker (de ouder). backup_data is letterlijk de save
-- van het toestel -- hetzelfde object dat de app in localStorage bewaart en dat
-- "Back-up maken" als bestand uitschrijft (`db` in src/20-app.js): alle sterren
-- met hun voortgang, plus de app-brede schakelaars. Er wordt hier niets van
-- uit elkaar getrokken in aparte tabellen.
--
-- backup_version is de versie van dít formaat (de envelop rond de save), los van
-- db.schemaV binnenin. Zo kan een latere terugzet-stap zien wat hij krijgt.
--
-- Beveiliging: RLS aan, en alleen de rol `authenticated` krijgt SELECT, INSERT
-- en UPDATE -- telkens beperkt tot de eigen rij (auth.uid() = user_id). `anon`
-- krijgt niets. Geen DELETE: het account verwijderen ruimt de rij op via de
-- ON DELETE CASCADE, en de app zelf wist nooit een back-up.

create table public.account_backups (
  user_id        uuid        primary key references auth.users (id) on delete cascade,
  backup_version integer     not null check (backup_version >= 1),
  backup_data    jsonb       not null
                             check (jsonb_typeof(backup_data) = 'object')
                             -- vangrail tegen misbruik; een echte save is een paar tientallen kB
                             check (octet_length(backup_data::text) <= 5000000),
  updated_at     timestamptz not null default now()
);

comment on table public.account_backups is
  'Rekensterren: handmatige cloudback-up, één rij per ouderaccount. backup_data = de volledige lokale save (db).';

-- updated_at komt van de server, niet van de klok van het toestel.
create function public.account_backups_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger account_backups_touch
  before insert or update on public.account_backups
  for each row execute function public.account_backups_touch();

-- Rechten: eerst alles dicht (ook wat een standaardinstelling eventueel
-- toekent), dan alleen wat de app nodig heeft.
revoke all on table public.account_backups from public, anon, authenticated;
grant select, insert, update on table public.account_backups to authenticated;

alter table public.account_backups enable row level security;

create policy account_backups_select_own
  on public.account_backups
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy account_backups_insert_own
  on public.account_backups
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy account_backups_update_own
  on public.account_backups
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
