-- Prost-Zeugnis – Bierkatalog (globale, schreibgeschützte Vorschlagsliste)
-- Daten: supabase/catalog.sql (erzeugt aus bierkatalog.md mit `node scripts/import-catalog.ts`)
-- Voraussetzung: 0003_ratings_per_user.sql

create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

-- unaccent ist nur STABLE; für generierte Spalten/Indizes braucht es eine IMMUTABLE-Hülle
-- mit fest angegebenem Wörterbuch (übliches Vorgehen). Macht auch ß → ss, ä → a usw.
create or replace function public.search_normalize(t text)
returns text language sql immutable parallel safe set search_path = '' as $$
  select regexp_replace(lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(t, ''))), '\s+', ' ', 'g');
$$;

create table public.beer_catalog (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(name) between 1 and 80),
  brewery      text check (char_length(brewery) <= 80),
  style        text check (char_length(style) <= 40),
  country      text check (char_length(country) <= 40),
  alcohol_free boolean not null default false,
  search_text  text generated always as (public.search_normalize(name || ' ' || coalesce(brewery, ''))) stored,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create unique index beer_catalog_name_key on public.beer_catalog (lower(name));
-- Trigram-Index über Name + Brauerei (normalisiert) für schnelle, tippfehlertolerante Suche
create index beer_catalog_search_trgm on public.beer_catalog using gin (search_text extensions.gin_trgm_ops);

alter table public.beer_catalog enable row level security;
create policy "catalog_select" on public.beer_catalog for select to authenticated using (true);
-- Keine Insert/Update/Delete-Policies: Nutzer können den Katalog nicht verändern.

-- Biere wissen, aus welchem Katalogeintrag sie stammen
alter table public.beers add column catalog_id uuid references public.beer_catalog(id) on delete set null;
create index beers_catalog_idx on public.beers (catalog_id) where catalog_id is not null;

-- Suche: Top 8 nach Ähnlichkeit. Wortanfang/Teilstring vor Tippfehler-Ähnlichkeit.
create or replace function public.search_catalog(q text)
returns setof public.beer_catalog
language sql stable security invoker set search_path = '' as $$
  with nq as (select public.search_normalize(trim(q)) as v)
  select c.*
  from public.beer_catalog c, nq
  where length(nq.v) >= 2
    and (c.search_text like '%' || nq.v || '%' or extensions.word_similarity(nq.v, c.search_text) >= 0.4)
  order by
    (c.search_text like nq.v || '%') desc,
    (c.search_text like '%' || nq.v || '%') desc,
    extensions.word_similarity(nq.v, c.search_text) desc,
    c.name
  limit 8;
$$;

revoke execute on function public.search_catalog(text) from public, anon;
grant execute on function public.search_catalog(text) to authenticated;
