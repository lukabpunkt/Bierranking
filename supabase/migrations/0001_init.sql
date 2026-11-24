-- Prost-Zeugnis – Initiales Schema
-- Basis: prost-zeugnis-spec.md, Abschnitt 7. Abweichungen siehe DECISIONS.md.

-- ============ Extensions & Typen ============
-- In Supabase liegt pgcrypto im Schema "extensions" -> Aufrufe voll qualifizieren.
create extension if not exists pgcrypto with schema extensions;

create type public.serving_type as enum ('can', 'bottle', 'tap');

-- ============ Tabellen ============
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text not null default '' check (char_length(display_name) <= 30),
  emoji         text not null default '🍺',
  color         text not null default '#F59E0B',
  hide_grades   boolean not null default false,
  onboarded     boolean not null default false,
  created_at    timestamptz not null default now()
);

create table public.groups (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(name) between 1 and 50),
  invite_code  text not null unique default encode(extensions.gen_random_bytes(6), 'hex'),
  created_by   uuid not null references public.profiles(id),
  created_at   timestamptz not null default now()
);

create table public.group_members (
  group_id   uuid not null references public.groups(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role       text not null default 'member' check (role in ('admin', 'member')),
  joined_at  timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table public.beers (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references public.groups(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 80),
  brewery     text check (char_length(brewery) <= 80),
  style       text check (char_length(style) <= 40),
  abv         numeric(3,1) check (abv >= 0 and abv <= 70),
  country     text check (char_length(country) <= 40),
  photo_path  text,
  barcode     text,
  created_by  uuid not null default auth.uid() references public.profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create unique index beers_unique_per_group
  on public.beers (group_id, lower(name), lower(coalesce(brewery, '')))
  where deleted_at is null;

create index beers_group_idx on public.beers (group_id) where deleted_at is null;

create table public.ratings (
  id          uuid primary key default gen_random_uuid(),
  beer_id     uuid not null references public.beers(id) on delete cascade,
  user_id     uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  grade       numeric(2,1) not null check (grade in
                (0.7,1.0,1.3,1.7,2.0,2.3,2.7,3.0,3.3,3.7,4.0,4.3,4.7,5.0,5.3,6.0)),
  serving     public.serving_type not null,
  comment     text check (char_length(comment) <= 500),
  location    text check (char_length(location) <= 80),
  rated_on    date not null default current_date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  unique (beer_id, user_id, serving)
);

create index ratings_beer_idx on public.ratings (beer_id);
create index ratings_user_idx on public.ratings (user_id);

create table public.beer_history (
  id          bigint generated always as identity primary key,
  beer_id     uuid not null references public.beers(id) on delete cascade,
  changed_by  uuid references public.profiles(id) on delete set null,
  old_data    jsonb not null,
  new_data    jsonb not null,
  changed_at  timestamptz not null default now()
);

-- Zusätzliche Indizes für Fremdschlüssel / RLS-Lookups
create index group_members_user_idx on public.group_members (user_id);
create index groups_created_by_idx  on public.groups (created_by);
create index beers_created_by_idx   on public.beers (created_by);
create index beer_history_beer_idx  on public.beer_history (beer_id);
create index beer_history_user_idx  on public.beer_history (changed_by);

-- ============ Hilfsfunktionen (security definer, gegen RLS-Rekursion) ============
create or replace function public.is_group_member(gid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.group_members
                 where group_id = gid and user_id = (select auth.uid()));
$$;

create or replace function public.is_group_admin(gid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.group_members
                 where group_id = gid and user_id = (select auth.uid()) and role = 'admin');
$$;

create or replace function public.shares_group(other uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.group_members a
    join public.group_members b on a.group_id = b.group_id
    where a.user_id = (select auth.uid()) and b.user_id = other
  );
$$;

-- ============ Trigger ============
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;

create trigger beers_updated_at   before update on public.beers
  for each row execute function public.set_updated_at();
create trigger ratings_updated_at before update on public.ratings
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(coalesce(new.raw_user_meta_data->>'full_name',
                                split_part(new.email, '@', 1), ''), 30));
  return new;
end; $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.log_beer_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (to_jsonb(old) - 'updated_at') is distinct from (to_jsonb(new) - 'updated_at') then
    insert into public.beer_history (beer_id, changed_by, old_data, new_data)
    values (old.id, auth.uid(), to_jsonb(old), to_jsonb(new));
  end if;
  return new;
end; $$;

create trigger beers_history after update on public.beers
  for each row execute function public.log_beer_change();

-- ============ RPCs ============
create or replace function public.create_group(p_name text)
returns public.groups language plpgsql security definer set search_path = '' as $$
declare g public.groups;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  insert into public.groups (name, created_by) values (trim(p_name), auth.uid()) returning * into g;
  insert into public.group_members (group_id, user_id, role) values (g.id, auth.uid(), 'admin');
  return g;
end; $$;

create or replace function public.join_group(p_code text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare gid uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select id into gid from public.groups where invite_code = lower(trim(p_code));
  if gid is null then raise exception 'invalid_invite_code'; end if;
  insert into public.group_members (group_id, user_id) values (gid, auth.uid())
    on conflict do nothing;
  return gid;
end; $$;

create or replace function public.group_preview(p_code text)
returns table (id uuid, name text, member_count bigint)
language sql stable security definer set search_path = '' as $$
  select g.id, g.name, (select count(*) from public.group_members m where m.group_id = g.id)
  from public.groups g where g.invite_code = lower(trim(p_code));
$$;

create or replace function public.regenerate_invite_code(p_group uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare code text;
begin
  if not public.is_group_admin(p_group) then raise exception 'forbidden'; end if;
  update public.groups set invite_code = encode(extensions.gen_random_bytes(6), 'hex')
    where id = p_group returning invite_code into code;
  return code;
end; $$;

create or replace function public.leave_group(p_group uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if public.is_group_admin(p_group)
     and (select count(*) from public.group_members where group_id = p_group and role = 'admin') = 1
     and (select count(*) from public.group_members where group_id = p_group) > 1 then
    raise exception 'last_admin';
  end if;
  delete from public.group_members where group_id = p_group and user_id = auth.uid();
end; $$;

-- ============ Funktionsrechte ============
-- Postgres gibt EXECUTE standardmäßig an PUBLIC; ein reines "revoke from anon" reicht nicht.
revoke execute on function
  public.is_group_member(uuid), public.is_group_admin(uuid), public.shares_group(uuid),
  public.create_group(text), public.join_group(text), public.group_preview(text),
  public.regenerate_invite_code(uuid), public.leave_group(uuid),
  public.handle_new_user(), public.log_beer_change(), public.set_updated_at()
  from public, anon, authenticated;

grant execute on function
  public.is_group_member(uuid), public.is_group_admin(uuid), public.shares_group(uuid),
  public.create_group(text), public.join_group(text), public.group_preview(text),
  public.regenerate_invite_code(uuid), public.leave_group(uuid)
  to authenticated;

-- Join-Vorschau muss vor dem Login funktionieren (Spec 8: /join/* ist öffentlich).
grant execute on function public.group_preview(text) to anon;

-- ============ View: Statistiken pro Bier ============
create view public.beer_stats with (security_invoker = true) as
select
  b.id        as beer_id,
  b.group_id,
  round(avg(r.grade), 2)                                    as avg_grade,
  count(r.id)                                               as rating_count,
  count(distinct r.user_id)                                 as rater_count,
  round(avg(r.grade) filter (where r.serving = 'can'), 2)    as avg_can,
  round(avg(r.grade) filter (where r.serving = 'bottle'), 2) as avg_bottle,
  round(avg(r.grade) filter (where r.serving = 'tap'), 2)    as avg_tap,
  max(r.updated_at)                                         as last_rated_at
from public.beers b
left join public.ratings r on r.beer_id = b.id and r.deleted_at is null
where b.deleted_at is null
group by b.id, b.group_id;

-- ============ RLS ============
alter table public.profiles      enable row level security;
alter table public.groups        enable row level security;
alter table public.group_members enable row level security;
alter table public.beers         enable row level security;
alter table public.ratings       enable row level security;
alter table public.beer_history  enable row level security;

-- profiles
create policy "profiles_select" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.shares_group(id));
create policy "profiles_update_own" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- groups (Insert nur über create_group)
create policy "groups_select_member" on public.groups for select to authenticated
  using (public.is_group_member(id));
create policy "groups_update_admin" on public.groups for update to authenticated
  using (public.is_group_admin(id)) with check (public.is_group_admin(id));
create policy "groups_delete_admin" on public.groups for delete to authenticated
  using (public.is_group_admin(id));

-- group_members (Insert nur über RPC)
create policy "members_select" on public.group_members for select to authenticated
  using (public.is_group_member(group_id));
create policy "members_update_admin" on public.group_members for update to authenticated
  using (public.is_group_admin(group_id)) with check (public.is_group_admin(group_id));
create policy "members_delete_admin" on public.group_members for delete to authenticated
  using (public.is_group_admin(group_id) and user_id <> (select auth.uid()));

-- beers (kein Hard Delete; Löschen = deleted_at setzen)
create policy "beers_select" on public.beers for select to authenticated
  using (public.is_group_member(group_id));
create policy "beers_insert" on public.beers for insert to authenticated
  with check (public.is_group_member(group_id) and created_by = (select auth.uid()));
create policy "beers_update" on public.beers for update to authenticated
  using (public.is_group_member(group_id)) with check (public.is_group_member(group_id));

-- ratings
create policy "ratings_select" on public.ratings for select to authenticated
  using (exists (select 1 from public.beers b
                 where b.id = beer_id and public.is_group_member(b.group_id)));
create policy "ratings_insert_own" on public.ratings for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (
    select 1 from public.beers b
    where b.id = beer_id and b.deleted_at is null and public.is_group_member(b.group_id)));
create policy "ratings_update_own" on public.ratings for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "ratings_delete_own" on public.ratings for delete to authenticated
  using (user_id = (select auth.uid()));

-- beer_history (nur lesen)
create policy "history_select" on public.beer_history for select to authenticated
  using (exists (select 1 from public.beers b
                 where b.id = beer_id and public.is_group_member(b.group_id)));
