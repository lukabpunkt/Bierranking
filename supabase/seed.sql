-- Beispieldaten NUR für die lokale Entwicklung (supabase start / supabase db reset).
-- Niemals gegen die Produktionsdatenbank ausführen.
-- Login lokal per Magic Link über Inbucket/Mailpit: http://127.0.0.1:54324
--   anna@example.com · tom@example.com · lea@example.com

-- ---------- Nutzer (Profile entstehen per Trigger) ----------
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                        confirmation_token, recovery_token, email_change_token_new, email_change)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated',
   'anna@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated',
   'tom@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated',
   'lea@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', now(), now(), now()
from auth.users u
where u.email in ('anna@example.com', 'tom@example.com', 'lea@example.com');

update public.profiles set display_name = 'Anna', emoji = '🦊', color = '#EF4444', onboarded = true
  where id = '11111111-1111-1111-1111-111111111111';
update public.profiles set display_name = 'Tom', emoji = '🐻', color = '#3B82F6', onboarded = true
  where id = '22222222-2222-2222-2222-222222222222';
update public.profiles set display_name = 'Lea', emoji = '🐝', color = '#10B981', onboarded = true
  where id = '33333333-3333-3333-3333-333333333333';

-- ---------- Gruppe ----------
insert into public.groups (id, name, invite_code, created_by)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Stammtisch', 'stammtisch01', '11111111-1111-1111-1111-111111111111');

insert into public.group_members (group_id, user_id, role) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'admin'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'member'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'member');

-- ---------- 15 Biere ----------
insert into public.beers (id, group_id, name, brewery, style, abv, country, created_by, created_at) values
  ('b0000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Augustiner Lagerbier Hell', 'Augustiner', 'Helles', 5.2, 'Deutschland', '11111111-1111-1111-1111-111111111111', now() - interval '30 days'),
  ('b0000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tegernseer Hell', 'Tegernsee', 'Helles', 4.8, 'Deutschland', '22222222-2222-2222-2222-222222222222', now() - interval '29 days'),
  ('b0000000-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Löwenbräu Original', 'Löwenbräu', 'Helles', 5.2, 'Deutschland', '11111111-1111-1111-1111-111111111111', now() - interval '27 days'),
  ('b0000000-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Jever Pilsener', 'Jever', 'Pils', 4.9, 'Deutschland', '33333333-3333-3333-3333-333333333333', now() - interval '25 days'),
  ('b0000000-0000-0000-0000-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Rothaus Tannenzäpfle', 'Rothaus', 'Pils', 5.1, 'Deutschland', '22222222-2222-2222-2222-222222222222', now() - interval '22 days'),
  ('b0000000-0000-0000-0000-000000000006', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Weihenstephaner Hefeweissbier', 'Weihenstephan', 'Weizen', 5.4, 'Deutschland', '11111111-1111-1111-1111-111111111111', now() - interval '20 days'),
  ('b0000000-0000-0000-0000-000000000007', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Paulaner Hefe-Weißbier', 'Paulaner', 'Weizen', 5.5, 'Deutschland', '33333333-3333-3333-3333-333333333333', now() - interval '18 days'),
  ('b0000000-0000-0000-0000-000000000008', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Krombacher Pils', 'Krombacher', 'Pils', 4.8, 'Deutschland', '22222222-2222-2222-2222-222222222222', now() - interval '15 days'),
  ('b0000000-0000-0000-0000-000000000009', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Oettinger Pils', 'Oettinger', 'Pils', 4.7, 'Deutschland', '22222222-2222-2222-2222-222222222222', now() - interval '14 days'),
  ('b0000000-0000-0000-0000-000000000010', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Ayinger Celebrator', 'Ayinger', 'Bock', 6.7, 'Deutschland', '11111111-1111-1111-1111-111111111111', now() - interval '12 days'),
  ('b0000000-0000-0000-0000-000000000011', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Köstritzer Schwarzbier', 'Köstritzer', 'Dunkel', 4.8, 'Deutschland', '33333333-3333-3333-3333-333333333333', now() - interval '10 days'),
  ('b0000000-0000-0000-0000-000000000012', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'BrewDog Punk IPA', 'BrewDog', 'IPA', 5.4, 'Schottland', '22222222-2222-2222-2222-222222222222', now() - interval '8 days'),
  ('b0000000-0000-0000-0000-000000000013', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Pilsner Urquell', 'Plzeňský Prazdroj', 'Pils', 4.4, 'Tschechien', '11111111-1111-1111-1111-111111111111', now() - interval '5 days'),
  ('b0000000-0000-0000-0000-000000000014', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Erdinger Alkoholfrei', 'Erdinger', 'Alkoholfrei', 0.4, 'Deutschland', '33333333-3333-3333-3333-333333333333', now() - interval '3 days'),
  ('b0000000-0000-0000-0000-000000000015', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Radeberger Radler', 'Radeberger', 'Radler', 2.5, 'Deutschland', '22222222-2222-2222-2222-222222222222', now() - interval '1 day');

-- ---------- Bewertungen ----------
insert into public.ratings (beer_id, user_id, grade, serving, comment, location, rated_on) values
  ('b0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 0.7, 'bottle', 'Das beste Helle. Punkt.', 'Biergarten', current_date - 29),
  ('b0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 1.3, 'bottle', null, null, current_date - 28),
  ('b0000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 1.0, 'tap', 'Vom Holzfass 🤤', 'Augustiner Keller', current_date - 27),
  ('b0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 1.0, 'tap', null, 'Augustiner Keller', current_date - 27),
  ('b0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 1.7, 'bottle', null, null, current_date - 26),
  ('b0000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 1.0, 'bottle', 'Mein Favorit', null, current_date - 26),
  ('b0000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 2.3, 'can', null, null, current_date - 25),
  ('b0000000-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 2.0, 'bottle', null, null, current_date - 24),
  ('b0000000-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333', 2.7, 'can', null, null, current_date - 24),
  ('b0000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 3.3, 'bottle', 'Zu herb für mich', null, current_date - 23),
  ('b0000000-0000-0000-0000-000000000004', '33333333-3333-3333-3333-333333333333', 1.3, 'bottle', 'Friesisch herb, genau richtig', null, current_date - 23),
  ('b0000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 2.0, 'bottle', null, null, current_date - 21),
  ('b0000000-0000-0000-0000-000000000005', '22222222-2222-2222-2222-222222222222', 1.7, 'bottle', null, null, current_date - 21),
  ('b0000000-0000-0000-0000-000000000005', '33333333-3333-3333-3333-333333333333', 2.0, 'bottle', null, null, current_date - 20),
  ('b0000000-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 1.3, 'bottle', null, null, current_date - 19),
  ('b0000000-0000-0000-0000-000000000006', '33333333-3333-3333-3333-333333333333', 0.7, 'tap', 'Bananig, perfekt', null, current_date - 19),
  ('b0000000-0000-0000-0000-000000000007', '22222222-2222-2222-2222-222222222222', 2.3, 'bottle', null, null, current_date - 17),
  ('b0000000-0000-0000-0000-000000000007', '33333333-3333-3333-3333-333333333333', 2.0, 'tap', null, 'Oktoberfest', current_date - 17),
  ('b0000000-0000-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111', 3.7, 'can', null, null, current_date - 14),
  ('b0000000-0000-0000-0000-000000000008', '22222222-2222-2222-2222-222222222222', 3.0, 'bottle', null, null, current_date - 14),
  ('b0000000-0000-0000-0000-000000000009', '11111111-1111-1111-1111-111111111111', 5.3, 'can', 'Nie wieder.', null, current_date - 13),
  ('b0000000-0000-0000-0000-000000000009', '22222222-2222-2222-2222-222222222222', 3.0, 'can', 'Für den Preis okay', null, current_date - 13),
  ('b0000000-0000-0000-0000-000000000009', '33333333-3333-3333-3333-333333333333', 6.0, 'can', null, null, current_date - 12),
  ('b0000000-0000-0000-0000-000000000010', '11111111-1111-1111-1111-111111111111', 1.0, 'bottle', 'Wie flüssiges Brot', null, current_date - 11),
  ('b0000000-0000-0000-0000-000000000011', '33333333-3333-3333-3333-333333333333', 2.3, 'bottle', null, null, current_date - 9),
  ('b0000000-0000-0000-0000-000000000011', '22222222-2222-2222-2222-222222222222', 4.0, 'bottle', 'Nicht mein Ding', null, current_date - 9),
  ('b0000000-0000-0000-0000-000000000012', '22222222-2222-2222-2222-222222222222', 1.3, 'can', null, null, current_date - 7),
  ('b0000000-0000-0000-0000-000000000012', '11111111-1111-1111-1111-111111111111', 4.7, 'can', 'Viel zu bitter', null, current_date - 7),
  ('b0000000-0000-0000-0000-000000000012', '22222222-2222-2222-2222-222222222222', 1.0, 'tap', 'Gezapft noch besser', 'Craft-Bar', current_date - 6),
  ('b0000000-0000-0000-0000-000000000013', '11111111-1111-1111-1111-111111111111', 1.7, 'tap', null, null, current_date - 4),
  ('b0000000-0000-0000-0000-000000000013', '33333333-3333-3333-3333-333333333333', 2.0, 'bottle', null, null, current_date - 4),
  ('b0000000-0000-0000-0000-000000000014', '33333333-3333-3333-3333-333333333333', 3.0, 'bottle', 'Für alkoholfrei echt gut', null, current_date - 2);
-- Radeberger Radler (Nr. 15) bleibt absichtlich unbewertet.
