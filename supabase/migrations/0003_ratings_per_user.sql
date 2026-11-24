-- Prost-Zeugnis – Bewertungen gehören der Person, nicht der Gruppe
--
-- Vorher: Biere gehörten einer Gruppe (beers.group_id), Bewertungen damit indirekt auch.
-- Nachher: Biere sind ein gemeinsamer Katalog. Bewertungen/Wunschliste hängen an Person + Bier
-- und erscheinen automatisch in jeder Gruppe, in der die Person Mitglied ist.
-- Eine Gruppe zeigt alle Biere, die ihre Mitglieder bewertet oder auf der Wunschliste haben.

-- ============ 0) Sicherung (nicht über die API erreichbar) ============
create schema if not exists backup_0003;
revoke all on schema backup_0003 from public, anon, authenticated;
create table backup_0003.groups        as table public.groups;
create table backup_0003.group_members as table public.group_members;
create table backup_0003.beers         as table public.beers;
create table backup_0003.ratings       as table public.ratings;
create table backup_0003.wishlist      as table public.wishlist;
create table backup_0003.beer_history  as table public.beer_history;

-- ============ 1) Abhängigkeiten von beers.group_id lösen ============
drop view if exists public.beer_stats;

drop policy if exists "beers_select" on public.beers;
drop policy if exists "beers_insert" on public.beers;
drop policy if exists "beers_update" on public.beers;
drop policy if exists "ratings_select" on public.ratings;
drop policy if exists "ratings_insert_own" on public.ratings;
drop policy if exists "wishlist_select" on public.wishlist;
drop policy if exists "wishlist_insert_own" on public.wishlist;
drop policy if exists "history_select" on public.beer_history;
drop policy if exists "beer_photos_select" on storage.objects;
drop policy if exists "beer_photos_insert" on storage.objects;
drop policy if exists "beer_photos_update" on storage.objects;
drop policy if exists "beer_photos_delete" on storage.objects;
drop function if exists public.can_access_photo(text);

-- ============ 2) Gleiche Biere aus verschiedenen Gruppen zusammenführen ============
-- Kanonisch ist jeweils das älteste Bier mit gleichem Namen + gleicher Brauerei.
create temp table beer_map on commit drop as
select id as old_id,
       first_value(id) over (partition by lower(name), lower(coalesce(brewery, '')) order by created_at, id) as new_id
from public.beers
where deleted_at is null;
delete from beer_map where old_id = new_id;

-- Fehlende Angaben am kanonischen Bier aus den Duplikaten ergänzen
update public.beers c set
  style      = coalesce(c.style,      (select b.style      from public.beers b join beer_map m on m.old_id = b.id where m.new_id = c.id and b.style      is not null order by b.created_at limit 1)),
  abv        = coalesce(c.abv,        (select b.abv        from public.beers b join beer_map m on m.old_id = b.id where m.new_id = c.id and b.abv        is not null order by b.created_at limit 1)),
  country    = coalesce(c.country,    (select b.country    from public.beers b join beer_map m on m.old_id = b.id where m.new_id = c.id and b.country    is not null order by b.created_at limit 1)),
  barcode    = coalesce(c.barcode,    (select b.barcode    from public.beers b join beer_map m on m.old_id = b.id where m.new_id = c.id and b.barcode    is not null order by b.created_at limit 1)),
  photo_path = coalesce(c.photo_path, (select b.photo_path from public.beers b join beer_map m on m.old_id = b.id where m.new_id = c.id and b.photo_path is not null order by b.created_at limit 1))
where c.id in (select new_id from beer_map);

-- Bewertungen umhängen, ohne updated_at zu verändern (sonst erscheinen sie im Feed als „neu bewertet“)
alter table public.ratings disable trigger ratings_updated_at;

-- Konflikt: dieselbe Person hat dasselbe Bier mit demselben Gebinde in zwei Gruppen bewertet
-- → die neueste aktive Bewertung gewinnt, die anderen landen in der Sicherung.
create temp table rating_rank on commit drop as
select r.id,
       row_number() over (
         partition by coalesce(m.new_id, r.beer_id), r.user_id, r.serving
         order by (r.deleted_at is null) desc, r.updated_at desc, r.id
       ) as rn
from public.ratings r
left join beer_map m on m.old_id = r.beer_id;

create table backup_0003.ratings_merged as
select r.* from public.ratings r join rating_rank x on x.id = r.id where x.rn > 1;
delete from public.ratings r using rating_rank x where x.id = r.id and x.rn > 1;

update public.ratings r set beer_id = m.new_id from beer_map m where r.beer_id = m.old_id;
alter table public.ratings enable trigger ratings_updated_at;

insert into public.wishlist (beer_id, user_id, created_at)
select m.new_id, w.user_id, w.created_at from public.wishlist w join beer_map m on m.old_id = w.beer_id
on conflict do nothing;
delete from public.wishlist w using beer_map m where w.beer_id = m.old_id;

update public.beer_history h set beer_id = m.new_id from beer_map m where h.beer_id = m.old_id;

-- Duplikate selbst bleiben als gelöschte Einträge erhalten
update public.beers set deleted_at = now() where id in (select old_id from beer_map);

-- ============ 3) Gruppenbezug der Biere entfernen ============
drop index if exists public.beers_unique_per_group;
drop index if exists public.beers_group_idx;
alter table public.beers drop column group_id;

create unique index beers_unique on public.beers (lower(name), lower(coalesce(brewery, ''))) where deleted_at is null;
create index beers_barcode_idx on public.beers (barcode) where barcode is not null and deleted_at is null;
create index ratings_beer_user_idx on public.ratings (user_id, beer_id) where deleted_at is null;

-- ============ 4) Zugriff ============
-- Ein Bier ist für mich „relevant“, wenn ich oder jemand aus einer meiner Gruppen es angelegt,
-- bewertet oder auf der Wunschliste hat.
create or replace function public.can_access_beer(bid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
           select 1 from public.beers b
           where b.id = bid and (b.created_by = (select auth.uid()) or public.shares_group(b.created_by)))
      or exists (
           select 1 from public.ratings r
           where r.beer_id = bid and r.deleted_at is null
             and (r.user_id = (select auth.uid()) or public.shares_group(r.user_id)))
      or exists (
           select 1 from public.wishlist w
           where w.beer_id = bid and (w.user_id = (select auth.uid()) or public.shares_group(w.user_id)));
$$;

-- Biere: gemeinsamer Katalog – lesen dürfen alle Angemeldeten (Suche, Duplikat-Erkennung)
create policy "beers_select" on public.beers for select to authenticated using (true);
create policy "beers_insert" on public.beers for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy "beers_update" on public.beers for update to authenticated
  using (public.can_access_beer(id)) with check (public.can_access_beer(id));

-- Löschen/Wiederherstellen nur durch die anlegende Person – und nur, solange niemand anderes
-- das Bier bewertet oder auf der Wunschliste hat (sonst würde es aus fremden Gruppen verschwinden).
create or replace function public.guard_beer_delete()
returns trigger language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then return new; end if; -- Wartung (SQL-Editor/Migration)
  if old.deleted_at is null and new.deleted_at is not null then
    if old.created_by is distinct from uid then raise exception 'not_creator'; end if;
    if exists (select 1 from public.ratings r where r.beer_id = old.id and r.deleted_at is null and r.user_id <> uid)
       or exists (select 1 from public.wishlist w where w.beer_id = old.id and w.user_id <> uid) then
      raise exception 'beer_in_use';
    end if;
  elsif old.deleted_at is not null and new.deleted_at is null then
    if old.created_by is distinct from uid then raise exception 'not_creator'; end if;
  end if;
  return new;
end; $$;

create trigger beers_guard_delete before update on public.beers
  for each row execute function public.guard_beer_delete();

-- Bewertungen: eigene + die von Personen, mit denen ich eine Gruppe teile
create policy "ratings_select" on public.ratings for select to authenticated
  using (user_id = (select auth.uid()) or public.shares_group(user_id));
create policy "ratings_insert_own" on public.ratings for insert to authenticated
  with check (user_id = (select auth.uid())
              and exists (select 1 from public.beers b where b.id = beer_id and b.deleted_at is null));

-- Wunschliste: gleiche Logik
create policy "wishlist_select" on public.wishlist for select to authenticated
  using (user_id = (select auth.uid()) or public.shares_group(user_id));
create policy "wishlist_insert_own" on public.wishlist for insert to authenticated
  with check (user_id = (select auth.uid())
              and exists (select 1 from public.beers b where b.id = beer_id and b.deleted_at is null));

-- Änderungsverlauf: wie das Bier selbst
create policy "history_select" on public.beer_history for select to authenticated
  using (public.can_access_beer(beer_id));

-- Fotos: neue Pfade „{beer_id}.jpg“, alte „{group_id}/{beer_id}.jpg“ bleiben gültig.
create or replace function public.can_access_photo(object_name text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare bid uuid;
begin
  -- Foto, das einem Bier bereits zugeordnet ist (auch nach dem Zusammenführen)
  if exists (select 1 from public.beers b where b.photo_path = object_name and public.can_access_beer(b.id)) then
    return true;
  end if;
  begin
    bid := split_part(regexp_replace(object_name, '^.*/', ''), '.', 1)::uuid;
  exception when others then
    return false;
  end;
  return exists (select 1 from public.beers b where b.id = bid and b.deleted_at is null) and public.can_access_beer(bid);
end; $$;

create policy "beer_photos_select" on storage.objects for select to authenticated
  using (bucket_id = 'beer-photos' and public.can_access_photo(name));
create policy "beer_photos_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'beer-photos' and public.can_access_photo(name));
create policy "beer_photos_update" on storage.objects for update to authenticated
  using (bucket_id = 'beer-photos' and public.can_access_photo(name))
  with check (bucket_id = 'beer-photos' and public.can_access_photo(name));
create policy "beer_photos_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'beer-photos' and public.can_access_photo(name));

revoke execute on function public.can_access_beer(uuid), public.can_access_photo(text) from public, anon;
grant execute on function public.can_access_beer(uuid), public.can_access_photo(text) to authenticated;
revoke execute on function public.guard_beer_delete() from public, anon, authenticated;
