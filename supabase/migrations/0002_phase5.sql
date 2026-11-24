-- Prost-Zeugnis – Phase 5: Etikett-Fotos, Wunschliste, Realtime

-- ============ Fotos (Storage) ============
-- Privater Bucket, Pfad: {group_id}/{beer_id}.jpg
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('beer-photos', 'beer-photos', false, 5242880, array['image/jpeg', 'image/webp', 'image/png'])
on conflict (id) do nothing;

-- Darf der aktuelle Nutzer auf dieses Foto zugreifen?
-- Nur wenn er Mitglied der Gruppe ist UND das Bier zu genau dieser Gruppe gehört.
create or replace function public.can_access_photo(object_name text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  gid uuid;
  bid uuid;
begin
  begin
    gid := split_part(object_name, '/', 1)::uuid;
    bid := split_part(split_part(object_name, '/', 2), '.', 1)::uuid;
  exception when others then
    return false;
  end;
  return public.is_group_member(gid)
     and exists (select 1 from public.beers b where b.id = bid and b.group_id = gid);
end; $$;

revoke execute on function public.can_access_photo(text) from public, anon;
grant execute on function public.can_access_photo(text) to authenticated;

create policy "beer_photos_select" on storage.objects for select to authenticated
  using (bucket_id = 'beer-photos' and public.can_access_photo(name));
create policy "beer_photos_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'beer-photos' and public.can_access_photo(name));
create policy "beer_photos_update" on storage.objects for update to authenticated
  using (bucket_id = 'beer-photos' and public.can_access_photo(name))
  with check (bucket_id = 'beer-photos' and public.can_access_photo(name));
create policy "beer_photos_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'beer-photos' and public.can_access_photo(name));

-- ============ Wunschliste „Will ich probieren“ ============
create table public.wishlist (
  beer_id    uuid not null references public.beers(id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (beer_id, user_id)
);
create index wishlist_user_idx on public.wishlist (user_id);

alter table public.wishlist enable row level security;

create policy "wishlist_select" on public.wishlist for select to authenticated
  using (exists (select 1 from public.beers b where b.id = beer_id and public.is_group_member(b.group_id)));
create policy "wishlist_insert_own" on public.wishlist for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (
    select 1 from public.beers b
    where b.id = beer_id and b.deleted_at is null and public.is_group_member(b.group_id)));
create policy "wishlist_delete_own" on public.wishlist for delete to authenticated
  using (user_id = (select auth.uid()));

-- Wer ein Bier bewertet, hat es probiert → von der eigenen Wunschliste nehmen
create or replace function public.clear_wishlist_on_rating()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.deleted_at is null then
    delete from public.wishlist where beer_id = new.beer_id and user_id = new.user_id;
  end if;
  return new;
end; $$;

revoke execute on function public.clear_wishlist_on_rating() from public, anon, authenticated;

create trigger ratings_clear_wishlist after insert or update on public.ratings
  for each row execute function public.clear_wishlist_on_rating();

-- ============ Realtime ============
-- Änderungen werden nur an Nutzer verteilt, die die Zeile laut RLS sehen dürfen.
alter publication supabase_realtime add table public.ratings, public.beers, public.wishlist, public.group_members;
