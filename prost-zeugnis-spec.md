# Prost-Zeugnis – Bauauftrag für Claude Code

> **An Claude Code:** Dieses Dokument ist die vollständige Spezifikation einer Web-App. Baue die App **komplett** (Frontend + Supabase-Backend) nach dieser Spezifikation. Arbeite die Phasen in Abschnitt 13 der Reihe nach ab, committe nach jeder Phase und prüfe die Akzeptanzkriterien (Abschnitt 14). Wenn dir Zugangsdaten fehlen (Supabase-URL/Keys), lege `.env.local.example` an und frage mich danach. Triff bei Kleinigkeiten selbst sinnvolle Entscheidungen und dokumentiere sie in `DECISIONS.md`. Die gesamte UI ist **auf Deutsch**.

---

## 1. Was die App ist

Eine **mobile-first Web-App (PWA)**, in der Freundeskreise in **eigenen Gruppen** Biere eintragen und nach **deutschen Schulnoten** (1+ bis 6) bewerten. Man sieht, wer wie bewertet hat, vergleicht sich untereinander, sortiert und durchsucht die Biere und hält fest, ob das Bier aus der **Dose**, der **Flasche** oder **gezapft** war.

### Grundprinzipien
- **Mobile first**, Bedienung mit einer Hand, wichtige Aktionen unten im Daumenbereich.
- **Bewerten in < 15 Sekunden.**
- **Kein Passwort** (Magic Link), man bleibt dauerhaft eingeloggt.
- **Keine Daten gehen verloren** (Server-Datenbank, Soft Delete, Backups, Export).
- **Einfach:** wenig Text, große Touch-Flächen (min. 44 px), klare Icons.

---

## 2. Tech-Stack (verbindlich)

| Bereich | Wahl |
|---|---|
| Framework | **Next.js (App Router) + TypeScript** |
| Styling | **Tailwind CSS** |
| Backend / DB / Auth | **Supabase** (Postgres, Auth, Row Level Security, später Storage) |
| Supabase-Client | `@supabase/supabase-js` + `@supabase/ssr` (Cookie-basierte Sessions, Middleware für Session-Refresh) |
| DB-Migrationen | **Supabase CLI**, SQL-Dateien in `supabase/migrations/` |
| Typen | `supabase gen types typescript` → `src/lib/database.types.ts` |
| Icons | `lucide-react` |
| Hosting | Vercel oder Netlify (README muss beides kurz erklären) |
| PWA | Web-App-Manifest + Icons, installierbar auf dem Homescreen |

Keine weiteren schweren Abhängigkeiten ohne Grund (kein Redux, keine UI-Bibliothek nötig).

### Umgebungsvariablen (`.env.local.example`)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```
Der `service_role`-Key darf **niemals** im Frontend landen.

---

## 3. Notensystem

16 Stufen. Intern als Dezimalzahl gespeichert:

| Label | 1+ | 1 | 1− | 2+ | 2 | 2− | 3+ | 3 | 3− | 4+ | 4 | 4− | 5+ | 5 | 5− | 6 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Wert | 0.7 | 1.0 | 1.3 | 1.7 | 2.0 | 2.3 | 2.7 | 3.0 | 3.3 | 3.7 | 4.0 | 4.3 | 4.7 | 5.0 | 5.3 | 6.0 |

- Kein 6+ / 6−.
- **Niedriger = besser.** „Beste Note zuerst“ = aufsteigend sortieren.
- **Durchschnitt** anzeigen als `Ø 2,1` (deutsches Komma, 1 Nachkommastelle) plus nächstliegendes Label: `Ø 2,1 (≈ 2)`.
- **Farbskala** (Badge-Hintergrund, kontrastreicher Text): 0.7–1.5 sattgrün → 2 grün → 3 gelbgrün → 4 gelb/orange → 5 orange-rot → 6 rot. Als Interpolation implementieren.

Lege dafür `src/lib/grades.ts` an mit:
- `GRADES: { label: string; value: number }[]`
- `gradeLabel(value: number): string` (nächstliegende Stufe)
- `formatAvg(value: number | null): string` → `"2,1"` bzw. `"–"`
- `gradeColor(value: number): { bg: string; fg: string }`
- Unit-Tests dafür (Vitest).

---

## 4. Gebinde

| DB-Wert | Label | Icon |
|---|---|---|
| `can` | Dose | 🥫 |
| `bottle` | Flasche | 🍾 |
| `tap` | Gezapft | 🍺 |

Eine Person kann dasselbe Bier **je Gebinde einmal** bewerten (also max. 3 Bewertungen pro Bier und Person). Erneutes Bewerten mit gleichem Gebinde **überschreibt** die alte Bewertung (Upsert).

---

## 5. Gruppen

- Jede angemeldete Person kann **beliebig viele Gruppen erstellen** und Mitglied in mehreren Gruppen sein.
- Wer eine Gruppe erstellt, ist **Admin**.
- **Einladung per Link**: `https://<site>/join/<invite_code>`. Nicht eingeloggte Nutzer werden erst zum Login geführt und danach automatisch in die Gruppe aufgenommen (Code über den Login hinweg merken, z. B. über `next`-Parameter).
- Admins können: Gruppe umbenennen, Einladungscode neu erzeugen (alter Link wird ungültig), Mitglieder entfernen, andere zu Admins machen, Gruppe löschen.
- Jedes Mitglied kann die Gruppe verlassen. Der letzte Admin kann nicht austreten, solange es noch andere Mitglieder gibt (vorher jemanden zum Admin machen).
- **Biere gehören zur jeweiligen Gruppe.** Dasselbe Bier in zwei Gruppen = zwei separate Einträge.
- Die zuletzt genutzte Gruppe merken (Cookie oder `localStorage`) und beim App-Start direkt öffnen. Gruppenwechsel über einen Umschalter oben im Header.

---

## 6. „Noten verdecken“-Modus

Jeder Nutzer kann einstellen, ob Noten **direkt sichtbar** sind oder **erst nach Antippen** angezeigt werden (Spoiler-Schutz, damit man sich vor dem eigenen Bewerten nicht beeinflussen lässt).

- Einstellung pro Nutzer, gespeichert in `profiles.hide_grades` (gilt geräteübergreifend).
- Schnellschalter: **Auge-Icon** im Header der Bierliste (👁 / 🙈) + Schalter auf der Profilseite.
- Wenn aktiv:
  - Alle **fremden Noten und Durchschnitte** werden als verdecktes Badge angezeigt (graues Badge mit „?“ bzw. weichgezeichnet, ohne Farbe – die Farbe würde die Note verraten).
  - **Antippen** eines verdeckten Badges deckt **alle Noten dieses Biers** auf (Liste, Detailseite, Vergleich) – mit kurzer Aufdeck-Animation.
  - Aufgedeckte Biere bleiben für die laufende Sitzung aufgedeckt (`sessionStorage`).
  - Die **eigene Note** ist immer sichtbar.
  - Hat man ein Bier selbst bewertet, werden dessen Noten automatisch aufgedeckt (Einstellung in `DECISIONS.md` dokumentieren; Standard: ja).
  - Button „Alle aufdecken“ in der Liste.
  - Sortieren nach Note bleibt möglich. Dabei einen dezenten Hinweis anzeigen, dass die Reihenfolge die Noten verrät.
- Hinweis: Das ist reiner UI-Spoiler-Schutz und keine Sicherheitsfunktion. Die Daten dürfen an den Client geliefert werden.

---

## 7. Datenbank (Supabase / Postgres)

Lege die folgende Migration als `supabase/migrations/0001_init.sql` an (bei Bedarf in mehrere Dateien aufteilen). **RLS ist auf allen Tabellen aktiv.** Gruppen werden nur über RPC-Funktionen erstellt oder betreten.

```sql
-- ============ Extensions & Typen ============
create extension if not exists pgcrypto;

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
  invite_code  text not null unique default encode(gen_random_bytes(6), 'hex'),
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
  style       text check (char_length(style) <= 40),          -- Pils, Helles, Weizen, IPA …
  abv         numeric(3,1) check (abv >= 0 and abv <= 70),     -- Alkohol in %
  country     text check (char_length(country) <= 40),
  photo_path  text,                                           -- Phase 2 (Storage)
  barcode     text,                                           -- Phase 3
  created_by  uuid not null default auth.uid() references public.profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

-- Duplikate innerhalb einer Gruppe verhindern (Name + Brauerei, case-insensitive)
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

-- Änderungsprotokoll für Bier-Stammdaten
create table public.beer_history (
  id          bigint generated always as identity primary key,
  beer_id     uuid not null references public.beers(id) on delete cascade,
  changed_by  uuid references public.profiles(id),
  old_data    jsonb not null,
  new_data    jsonb not null,
  changed_at  timestamptz not null default now()
);

-- ============ Hilfsfunktionen (security definer, gegen RLS-Rekursion) ============
create or replace function public.is_group_member(gid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from group_members where group_id = gid and user_id = auth.uid());
$$;

create or replace function public.is_group_admin(gid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from group_members
                 where group_id = gid and user_id = auth.uid() and role = 'admin');
$$;

create or replace function public.shares_group(other uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from group_members a
    join group_members b on a.group_id = b.group_id
    where a.user_id = auth.uid() and b.user_id = other
  );
$$;

-- ============ Trigger ============
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger beers_updated_at   before update on public.beers
  for each row execute function public.set_updated_at();
create trigger ratings_updated_at before update on public.ratings
  for each row execute function public.set_updated_at();

-- Profil automatisch bei Registrierung anlegen
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  return new;
end; $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Bier-Änderungen protokollieren
create or replace function public.log_beer_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (to_jsonb(old) - 'updated_at') is distinct from (to_jsonb(new) - 'updated_at') then
    insert into beer_history (beer_id, changed_by, old_data, new_data)
    values (old.id, auth.uid(), to_jsonb(old), to_jsonb(new));
  end if;
  return new;
end; $$;

create trigger beers_history after update on public.beers
  for each row execute function public.log_beer_change();

-- ============ RPCs ============
create or replace function public.create_group(p_name text)
returns public.groups language plpgsql security definer set search_path = public as $$
declare g groups;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  insert into groups (name, created_by) values (trim(p_name), auth.uid()) returning * into g;
  insert into group_members (group_id, user_id, role) values (g.id, auth.uid(), 'admin');
  return g;
end; $$;

create or replace function public.join_group(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare gid uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select id into gid from groups where invite_code = lower(trim(p_code));
  if gid is null then raise exception 'invalid_invite_code'; end if;
  insert into group_members (group_id, user_id) values (gid, auth.uid())
    on conflict do nothing;
  return gid;
end; $$;

-- Vorschau für die Join-Seite (Gruppenname anzeigen, bevor man beitritt)
create or replace function public.group_preview(p_code text)
returns table (id uuid, name text, member_count bigint)
language sql stable security definer set search_path = public as $$
  select g.id, g.name, (select count(*) from group_members m where m.group_id = g.id)
  from groups g where g.invite_code = lower(trim(p_code));
$$;

create or replace function public.regenerate_invite_code(p_group uuid)
returns text language plpgsql security definer set search_path = public as $$
declare code text;
begin
  if not is_group_admin(p_group) then raise exception 'forbidden'; end if;
  update groups set invite_code = encode(gen_random_bytes(6), 'hex')
    where id = p_group returning invite_code into code;
  return code;
end; $$;

create or replace function public.leave_group(p_group uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if is_group_admin(p_group)
     and (select count(*) from group_members where group_id = p_group and role = 'admin') = 1
     and (select count(*) from group_members where group_id = p_group) > 1 then
    raise exception 'last_admin';
  end if;
  delete from group_members where group_id = p_group and user_id = auth.uid();
end; $$;

revoke execute on function public.create_group, public.join_group, public.group_preview,
  public.regenerate_invite_code, public.leave_group from anon;

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
  using (id = auth.uid() or public.shares_group(id));
create policy "profiles_update_own" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

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
  using (public.is_group_admin(group_id) and user_id <> auth.uid());

-- beers (kein Hard Delete; Löschen = deleted_at setzen)
create policy "beers_select" on public.beers for select to authenticated
  using (public.is_group_member(group_id));
create policy "beers_insert" on public.beers for insert to authenticated
  with check (public.is_group_member(group_id) and created_by = auth.uid());
create policy "beers_update" on public.beers for update to authenticated
  using (public.is_group_member(group_id)) with check (public.is_group_member(group_id));

-- ratings
create policy "ratings_select" on public.ratings for select to authenticated
  using (exists (select 1 from public.beers b
                 where b.id = beer_id and public.is_group_member(b.group_id)));
create policy "ratings_insert_own" on public.ratings for insert to authenticated
  with check (user_id = auth.uid() and exists (
    select 1 from public.beers b
    where b.id = beer_id and b.deleted_at is null and public.is_group_member(b.group_id)));
create policy "ratings_update_own" on public.ratings for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "ratings_delete_own" on public.ratings for delete to authenticated
  using (user_id = auth.uid());

-- beer_history (nur lesen)
create policy "history_select" on public.beer_history for select to authenticated
  using (exists (select 1 from public.beers b
                 where b.id = beer_id and public.is_group_member(b.group_id)));
```

### Hinweise zur Datenlogik
- **Bewertung speichern** = Upsert:
  `supabase.from('ratings').upsert({ beer_id, user_id, grade, serving, comment, location, rated_on, deleted_at: null }, { onConflict: 'beer_id,user_id,serving' })`
- **Bewertung löschen** = `deleted_at = now()` setzen (Soft Delete). Nach dem Löschen 5 s lang „Rückgängig“ anbieten.
- **Bier löschen** = `deleted_at = now()`. Im UI dürfen das nur der Ersteller oder Admins. Gelöschte Biere sind für Admins unter „Papierkorb“ in den Gruppeneinstellungen wiederherstellbar.
- **Bier-Duplikat** (Unique-Verletzung `23505`) → freundliche Meldung „Das Bier gibt es schon“ mit Link zum vorhandenen Bier.
- Fehlermeldungen der RPCs (`invalid_invite_code`, `last_admin`, `forbidden`) auf deutsche Texte mappen.

---

## 8. Authentifizierung

- **Magic Link per E-Mail** (Supabase Auth, `signInWithOtp`). Optional zusätzlich **Google-Login** (per Feature-Flag/ENV abschaltbar, falls nicht konfiguriert).
- Auth-Callback-Route `/auth/callback` (Code-Exchange via `@supabase/ssr`).
- Middleware schützt alle Routen außer `/login`, `/auth/*`, `/join/*` (Join-Vorschau ist öffentlich, der Beitritt erfordert Login).
- **Onboarding** nach dem ersten Login (`profiles.onboarded = false`): Name + Emoji (Auswahl aus ca. 24 Emojis) + Farbe → danach „Gruppe erstellen“ oder „Mit Einladungslink beitreten“.
- README muss erklären: Site URL + Redirect URLs in Supabase setzen; für den Produktivbetrieb eigenen SMTP-Server in Supabase hinterlegen (der eingebaute E-Mail-Versand hat strenge Limits).

---

## 9. Seiten & Routen

```
/login                         Login (E-Mail-Feld, „Link senden“)
/auth/callback                 Auth-Callback
/onboarding                    Name, Emoji, Farbe
/groups                        Meine Gruppen, „Neue Gruppe“, „Beitreten (Code)“
/join/[code]                   Vorschau „Du wurdest zu ‚Stammtisch‘ eingeladen (5 Mitglieder)“ → Beitreten
/g/[groupId]                   Bierliste (Startseite einer Gruppe)
/g/[groupId]/rate              Bewerten-Flow (optional ?beer=<id>)
/g/[groupId]/beer/[beerId]     Bier-Detail
/g/[groupId]/compare           Vergleich
/g/[groupId]/settings          Gruppeneinstellungen (Mitglieder, Einladungslink, Papierkorb)
/me                            Profil, Einstellungen, Statistik, Export
```

### Layout
- **Header:** Gruppenname mit Umschalter (Dropdown/Bottom-Sheet mit allen Gruppen + „Neue Gruppe“), rechts Auge-Icon (Noten verdecken) bzw. Zahnrad.
- **Bottom-Navigation (fest, 4 Einträge):** `Biere` · `➕ Bewerten` (hervorgehoben, Akzentfarbe, größer) · `Vergleich` · `Ich`
- Safe-Area-Insets für iPhone beachten (`env(safe-area-inset-bottom)`).

### 9.1 Bierliste `/g/[groupId]`
- **Suchfeld** oben, sticky. Sucht in Name, Brauerei und Sorte. Groß-/Kleinschreibung und Umlaute werden ignoriert (ä=a, ß=ss), Suche während des Tippens (clientseitig, Debounce 150 ms).
- **Sortier-Chips** (horizontal scrollbar, einer aktiv): `Beste Note` · `Schlechteste` · `A–Z` · `Z–A` · `Neueste` · `Meiste Bewertungen`. Bei Notengleichstand gewinnt mehr Bewertungen, danach A–Z. Biere ohne Bewertung stehen bei Notensortierung immer am Ende.
- **Filter** (Button „Filter“ → Bottom-Sheet): Gebinde (Mehrfachauswahl), Sorte, „Nur von mir bewertet“, „Noch nicht von mir bewertet“, „Bewertet von …“ (Mitglied).
- Gewählte Sortierung und Filter in der URL abbilden (Query-Params), damit Zurück-Navigation und Teilen funktionieren.
- **Bier-Karte:**
  - links großes **Noten-Badge** (Ø-Label groß, darunter `Ø 2,1` klein, farbig nach Skala; verdeckt im Verdecken-Modus)
  - Mitte: **Name** (fett), Brauerei · Sorte (grau)
  - darunter: Gebinde-Icons, mit denen es bewertet wurde, gestapelte **Avatare** (Emoji in Farbkreis) der Bewerter, „5 Bewertungen“
  - kleiner Akzent-Punkt, wenn ich das Bier noch nicht bewertet habe
  - Tap → Detail. Tap auf verdecktes Badge → aufdecken (kein Navigieren).
- **Leerer Zustand:** „Noch kein Bier hier – Durst?“ + Button „Erstes Bier bewerten“.
- Pull-to-Refresh oder automatisches Neuladen beim Zurückkehren in den Tab.

### 9.2 Bewerten-Flow `/g/[groupId]/rate`
Ein einziger Screen mit drei Abschnitten, von oben nach unten:

1. **Welches Bier?**
   - Suchfeld mit Live-Vorschlägen aus der Gruppe (ähnliche Namen zuerst).
   - Kommt man von einer Bier-Detailseite (`?beer=`), ist das Bier vorausgewählt.
   - Letzter Vorschlag: **„➕ ‚<Eingabe>‘ neu anlegen“** → klappt Felder auf: Name (vorausgefüllt), Brauerei, Sorte (Chips: Pils, Helles, Export, Weizen, Dunkel, Bock, IPA, Lager, Radler, Alkoholfrei, Sonstiges), optional Alkohol %, Land.
2. **Note**
   - Reihe mit 6 großen Buttons **1 2 3 4 5 6** (Farbe nach Skala).
   - Darunter ein Segment-Schalter **+ · glatt · −** (Standard „glatt“, bei 6 ausgeblendet).
   - Große Live-Vorschau der gewählten Note, z. B. „**2−**“.
3. **Gebinde**
   - drei große Kacheln 🥫 Dose · 🍾 Flasche · 🍺 Gezapft. Die zuletzt genutzte Auswahl ist vorausgewählt.
   - Existiert für dieses Bier und Gebinde schon eine eigene Bewertung: Hinweis „Du hast das schon mit 2+ bewertet – wird überschrieben“ und alte Werte vorausfüllen.
4. **Optional** (eingeklappt, „Mehr hinzufügen“): Kommentar, Ort/Bar, Datum (Standard: heute).
5. **Speichern-Button**, fixiert unten, deaktiviert solange Bier/Note/Gebinde fehlen.
   → Toast „Gespeichert 🍻“ mit „Rückgängig“ → Weiterleitung zur Bier-Detailseite.

### 9.3 Bier-Detail `/g/[groupId]/beer/[beerId]`
- Kopf: Name, Brauerei, Sorte, Alkohol %, Land, angelegt von (Avatar) am …
- Großes Ø-Badge + Anzahl Bewertungen.
- **Ø pro Gebinde:** drei kleine Kacheln (🥫 3,0 · 🍾 2,3 · 🍺 1,7; „–“ wenn keine Daten).
- **Notenverteilung:** kleines horizontales Balkendiagramm 1–6 (gruppiert nach ganzen Noten), reines CSS/SVG.
- **Alle Bewertungen:** Liste mit Avatar, Name, Note-Badge, Gebinde-Icon, Datum, Ort, Kommentar. Eigene Bewertungen zuerst, mit Bearbeiten/Löschen.
- Button **„Bewerten“** (→ Rate-Flow mit `?beer=`).
- Menü „⋯“: Bier bearbeiten (jedes Mitglied), Änderungsverlauf ansehen, Bier löschen (nur Ersteller/Admin).

### 9.4 Vergleich `/g/[groupId]/compare`
- Oben: Mitglieder als Avatar-Chips zum An-/Abwählen (Standard: ich + die Person mit den meisten gemeinsamen Bewertungen).
- **Gebinde-Filter:** Alle / Dose / Flasche / Gezapft. Bei „Alle“ wird pro Person und Bier der Durchschnitt über die Gebinde genommen.
- **Tab „Nebeneinander“:** Tabelle nur mit Bieren, die **alle** gewählten Personen bewertet haben. Spalten = Personen (Avatar im Kopf, sticky), Zellen = farbige Noten-Badges. Sortierbar nach Bier, nach Person oder nach „Uneinigkeit“. Horizontal scrollbar, erste Spalte sticky.
- **Tab „Streitbiere“:** Biere mit der größten Spanne (max − min), z. B. „Anna 1+ vs. Tom 5“.
- **Tab „Einigkeit“** (bei 2 Personen): Übereinstimmung in % = `max(0, 1 − mittlere absolute Differenz / 5.3) × 100`, gerundet, plus Anzahl gemeinsamer Biere. Bei ≥ 3 Personen paarweise Matrix + Hervorhebung „Geschmackszwillinge 👯“ (höchster Wert).
- **Gruppen-Matrix** („Alle“-Button): Zeilen = Biere, Spalten = alle Mitglieder, leere Zellen = nicht bewertet.
- Verdecken-Modus gilt auch hier: verdeckte Zeilen per Antippen aufdecken.
- Leerer Zustand: „Ihr habt noch keine gemeinsamen Biere bewertet.“

### 9.5 Ich `/me`
- Avatar, Name, Emoji, Farbe bearbeiten.
- Schalter **„Noten verdecken, bis ich sie antippe“** (`hide_grades`).
- Statistik (für die aktuelle Gruppe, Umschalter „alle Gruppen“): Anzahl Bewertungen, Anzahl Biere, meine Ø-Note („Du bist strenger als 70 % der Gruppe“), Lieblingsbier, Hassbier, Lieblingsgebinde.
- Liste „Meine Bewertungen“ (sortierbar, durchsuchbar).
- **Export:** „Meine Daten als CSV“ und „Gruppe als CSV/JSON“ (alle Biere + Bewertungen der Gruppe). Download clientseitig erzeugen.
- Abmelden.

### 9.6 Gruppeneinstellungen `/g/[groupId]/settings`
- Gruppenname (Admin editierbar).
- **Einladungslink** + Buttons „Kopieren“ und „Teilen“ (Web Share API, Fallback Kopieren). Admin: „Neuen Link erzeugen“.
- Mitgliederliste mit Rolle. Admin: zum Admin machen, entfernen.
- Papierkorb (Admin): gelöschte Biere wiederherstellen.
- „Gruppe verlassen“ und (Admin) „Gruppe löschen“ mit Bestätigung durch Eintippen des Gruppennamens.

---

## 10. Design

- **Stil:** warm, freundlich, leicht verspielt. Akzentfarbe **Bernstein/Gold** (`#F59E0B` / Tailwind `amber`), Hintergrund helles Creme (`#FFFBF5`), Text dunkles Braun-Grau. Die Notenfarben stehen für sich und konkurrieren nicht mit dem Akzent.
- **Dark Mode** automatisch über `prefers-color-scheme` (dunkles Braun `#1C1410`, Akzent bleibt Bernstein).
- **Typografie:** Systemschrift-Stack; Noten in großer, fetter, tabellarischer Ziffernschrift (`font-variant-numeric: tabular-nums`).
- **Touch:** alle interaktiven Elemente mindestens 44×44 px, Abstände großzügig, Primäraktionen unten.
- **Feedback:** Toasts unten (über der Navigation), dezente Animationen (Aufdecken, Speichern), `prefers-reduced-motion` respektieren.
- **Keine Bestätigungsdialoge** für Alltägliches. Stattdessen „Rückgängig“-Toast. Bestätigung nur für Gruppe löschen/verlassen.
- **Ladezustände:** Skeleton-Karten statt Spinner.
- **Barrierefreiheit:** Kontrast WCAG AA, `aria-label` für Icon-Buttons, Noten-Badges haben Text (nicht nur Farbe), Fokuszustände sichtbar.
- **Desktop:** Inhalt zentriert, max. Breite ca. 640 px. Die Bottom-Navigation bleibt (simpel halten).
- **App-Name / Logo:** „Prost-Zeugnis“, Icon: Bierglas mit „1+“. Generiere einfache SVG-/PNG-Icons (192, 512, maskable) für das Manifest.

---

## 11. Datensicherheit & Backups (nichts darf verloren gehen)

1. Alle Daten liegen in Supabase (Server), **nie nur im Browser**.
2. **Soft Delete** für Biere und Bewertungen (siehe oben). Hard Delete passiert nur durch das Löschen der ganzen Gruppe.
3. **Änderungsprotokoll** für Bier-Stammdaten (`beer_history`).
4. **Automatisches Backup:** Lege `.github/workflows/backup.yml` an: wöchentlich (und manuell auslösbar) `pg_dump` der Datenbank über das Secret `SUPABASE_DB_URL` (Session-Pooler-Connection-String). Den Dump als gezipptes Workflow-Artifact mit 90 Tagen Aufbewahrung speichern. Im README erklären, wie man das Secret setzt und ein Backup wiederherstellt (`psql < dump.sql`). Hinweis: Das Repo sollte privat sein.
5. **Export-Buttons** im Profil (CSV/JSON).
6. README-Hinweis: Gratis-Supabase-Projekte können bei Inaktivität pausiert werden. Erklären, wie man sie wieder aktiviert, und auf die aktuellen Tarifbedingungen verweisen.

---

## 12. Projektstruktur (Vorschlag)

```
src/
  app/
    (auth)/login/page.tsx
    auth/callback/route.ts
    onboarding/page.tsx
    groups/page.tsx
    join/[code]/page.tsx
    g/[groupId]/layout.tsx          # Header + BottomNav + Gruppen-Kontext
    g/[groupId]/page.tsx            # Bierliste
    g/[groupId]/rate/page.tsx
    g/[groupId]/beer/[beerId]/page.tsx
    g/[groupId]/compare/page.tsx
    g/[groupId]/settings/page.tsx
    me/page.tsx
    manifest.ts
    layout.tsx
  components/
    GradeBadge.tsx  (inkl. verdeckt/aufdecken)
    GradePicker.tsx  ServingPicker.tsx  BeerCard.tsx  BeerSearch.tsx
    Avatar.tsx  AvatarStack.tsx  BottomNav.tsx  GroupSwitcher.tsx
    SortChips.tsx  FilterSheet.tsx  Toast.tsx  BottomSheet.tsx  Skeleton.tsx
  lib/
    supabase/client.ts  supabase/server.ts  supabase/middleware.ts
    grades.ts  servings.ts  search.ts (Normalisierung)  compare.ts  export.ts
    database.types.ts
  hooks/
    useRevealed.ts  (verdeckt/aufgedeckt pro Bier, sessionStorage)
middleware.ts
supabase/
  migrations/0001_init.sql
  seed.sql                         # Beispielgruppe mit 3 Personen, 15 Bieren, Bewertungen
.github/workflows/backup.yml
README.md
DECISIONS.md
.env.local.example
```

---

## 13. Umsetzungsphasen

**Phase 1 – Fundament**
- Next.js + Tailwind + Supabase-Setup, Migration, generierte Typen, Seed-Daten.
- Login (Magic Link), Callback, Middleware, Onboarding.
- Gruppen: erstellen, Liste, Umschalter, Einladungslink, Beitreten-Seite, Einstellungen (inkl. Admin-Funktionen).

**Phase 2 – Kernfunktionen**
- Bierliste mit Suche, Sortierung, Filtern, Karten.
- Bewerten-Flow (inkl. Neuanlage, Upsert, Rückgängig).
- Bier-Detailseite (Ø gesamt/pro Gebinde, Verteilung, Bewertungsliste, Bearbeiten/Löschen, Verlauf).
- Noten-verdecken-Modus überall.

**Phase 3 – Vergleich & Profil**
- Vergleichsseite (Nebeneinander, Streitbiere, Einigkeit, Matrix).
- Profilseite mit Statistik, Einstellungen, Export.

**Phase 4 – Feinschliff & Betrieb**
- PWA-Manifest + Icons, Dark Mode, Skeletons, Leerzustände, Barrierefreiheit.
- Backup-Workflow, README (Setup Schritt für Schritt: Supabase-Projekt anlegen, Migration einspielen per `supabase db push`, Auth-URLs, ENV, Deploy auf Vercel/Netlify).
- Tests: Vitest für `grades.ts`, `search.ts`, `compare.ts`. Playwright-Smoke-Test für Login-freie Seiten und Hauptflows mit Testnutzer (sofern lokal mit `supabase start` möglich).

**Phase 5 – Optional (nur wenn Phase 1–4 fertig und ich zustimme)**
- Fotos vom Etikett (Supabase Storage, privater Bucket `beer-photos`, Pfad `{group_id}/{beer_id}.jpg`, Storage-Policies über `is_group_member`, clientseitige Verkleinerung auf max. 1200 px).
- Realtime-Updates (neue Bewertungen erscheinen live).
- Barcode-Scanner (Kamera, EAN → Open Food Facts) beim Anlegen eines Biers.
- Wunschliste „Will ich probieren“, Aktivitäts-Feed, Hall of Fame / Hall of Shame, Abzeichen.

---

## 14. Akzeptanzkriterien

- [ ] Neuer Nutzer kann sich per Magic Link anmelden, Onboarding abschließen, eine Gruppe erstellen und den Einladungslink teilen.
- [ ] Zweiter Nutzer öffnet den Link, sieht den Gruppennamen, meldet sich an und ist danach Mitglied.
- [ ] Ein Nutzer in mehreren Gruppen sieht pro Gruppe nur deren Biere. Ein Nicht-Mitglied kann per API **keine** Daten der Gruppe lesen (RLS mit zwei Testnutzern prüfen).
- [ ] Alle 16 Noten sind wählbar, 6 hat kein +/−, Durchschnitte werden korrekt mit Komma angezeigt.
- [ ] Gebinde ist Pflicht. Zweite Bewertung desselben Biers mit gleichem Gebinde überschreibt, mit anderem Gebinde entsteht eine zusätzliche Bewertung.
- [ ] Ø pro Gebinde wird auf der Detailseite korrekt angezeigt.
- [ ] Suche findet „Lowenbrau“ bei Eingabe von „löwen“ und umgekehrt.
- [ ] Alle 6 Sortierungen funktionieren. Unbewertete Biere stehen bei Notensortierung am Ende.
- [ ] Doppeltes Bier (gleicher Name + Brauerei, andere Schreibweise) in derselben Gruppe wird verhindert.
- [ ] Verdecken-Modus: fremde Noten sind grau „?“, ein Tap deckt das Bier auf, die eigene Note bleibt sichtbar, „Alle aufdecken“ funktioniert, die Einstellung gilt nach Neuanmeldung auf einem anderen Gerät.
- [ ] Vergleich zeigt nur gemeinsame Biere, die Einigkeit in % ist plausibel, Streitbiere sind nach Spanne sortiert.
- [ ] Gelöschte Bewertungen und Biere sind per „Rückgängig“ bzw. Papierkorb wiederherstellbar.
- [ ] Export liefert eine korrekte CSV (UTF-8 mit BOM, damit Excel Umlaute richtig anzeigt; Semikolon als Trenner).
- [ ] Lighthouse (mobil): Accessibility ≥ 90, PWA installierbar.
- [ ] Auf einem 375-px-Display ist alles ohne horizontales Scrollen bedienbar (außer der Vergleichstabelle).
- [ ] `npm run build` läuft ohne Fehler, `npm test` ist grün.

---

## 15. Arbeitsweise für Claude Code

- Halte dich an diese Spezifikation. Abweichungen und eigene Entscheidungen bitte in `DECISIONS.md` begründen.
- Bevorzuge Server Components für das Laden von Daten und Client Components für Interaktion. Mutationen über Server Actions oder direkt über den Supabase-Client – Hauptsache konsistent.
- Nach jeder Phase: kurz zusammenfassen, was fertig ist und was ich manuell tun muss (z. B. Keys eintragen, Migration pushen, Redirect-URLs setzen).
- Frag mich, bevor du Phase 5 beginnst.
