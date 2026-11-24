# Entscheidungen & Abweichungen von der Spec

## Datenbank (`supabase/migrations/0001_init.sql`, eingespielt am 2026-11-24 in Projekt „Bier Ranking“)

1. **pgcrypto liegt in Supabase im Schema `extensions`.** `gen_random_bytes` wird daher überall als `extensions.gen_random_bytes` aufgerufen. Die Spec-Version wäre in `regenerate_invite_code` (mit `search_path = public`) mit „function does not exist“ gescheitert.
2. **Alle Funktionen haben `search_path = ''` und voll qualifizierte Namen.** Das ist Supabase-Best-Practice und erzeugt keine Linter-Warnung „mutable search_path“.
3. **Rechte auf Funktionen:** Postgres gibt `EXECUTE` standardmäßig an `PUBLIC`, ein reines `revoke … from anon` (wie in der Spec) wirkt deshalb nicht. Jetzt gilt: Rechte für alle entzogen, RPCs und Hilfsfunktionen nur für `authenticated` freigegeben. Trigger-Funktionen kann niemand direkt aufrufen.
4. **`group_preview` ist für `anon` freigegeben.** Die Spec widerspricht sich hier: Abschnitt 7 entzieht `anon` das Recht, Abschnitt 8 und 14 verlangen aber, dass die Join-Seite vor dem Login den Gruppennamen zeigt. Die Funktion verrät nur Name und Mitgliederzahl, und das nur bei Kenntnis des 12-stelligen Hex-Codes. Der Supabase-Advisor meldet dazu eine Warnung, die bewusst in Kauf genommen wird.
5. **`auth.uid()` steht in Policies als `(select auth.uid())`.** So wird der Wert pro Abfrage nur einmal berechnet (Performance-Empfehlung von Supabase).
6. **Zusätzliche Indizes** auf Fremdschlüssel: `group_members.user_id` (wichtig für jede RLS-Prüfung), `groups.created_by`, `beers.created_by`, `beer_history.beer_id`, `beer_history.changed_by`.
7. **`beer_history.changed_by` hat `on delete set null`**, damit das Löschen eines Accounts nicht am Änderungsprotokoll scheitert.
8. **`handle_new_user` kürzt den Anzeigenamen auf 30 Zeichen.** Sonst würde eine lange E-Mail-Adresse am Check-Constraint scheitern und die Registrierung blockieren.

## App-Architektur

9. **Next.js 16 statt 15:** `create-next-app` installiert aktuell Next 16. Dort heißt die Middleware **`proxy.ts`** (`src/proxy.ts`), die Logik liegt in `src/lib/supabase/proxy.ts`.
10. **Cache Components / PPR sind ausgeschaltet** (`next.config.ts`). Die App ist durchgehend nutzerbezogen (Session-Cookies, RLS). Klassisches dynamisches Rendering ist hier einfacher und robuster, statisches Vorrendern bringt nichts.
11. **Laden der Daten:** Server Components prüfen Login, Onboarding und Mitgliedschaft (Layouts `g/[groupId]` und `/me`) und laden Gruppenliste und Profil. Biere, Bewertungen und Mitglieder einer Gruppe lädt der Client-Kontext `GroupProvider` einmal pro Gruppe. Er lädt neu, wenn man in den Tab zurückkehrt, und nach jeder Mutation. Suche, Sortierung, Filter, Vergleich und Statistik laufen dann ohne Server-Roundtrip (Suche „während des Tippens“). Bei Stammtisch-Größen (Hunderte Biere) ist das unkritisch, Paginierung über 1000 Zeilen ist eingebaut.
12. **Mutationen** laufen einheitlich direkt über den Supabase-Browser-Client. RLS ist die Sicherheitsgrenze.
13. **Durchschnitte** werden clientseitig aus den Bewertungen berechnet. Die View `beer_stats` bleibt für Exporte und spätere Nutzung bestehen. Ø pro Gebinde und gesamt basieren auf allen (nicht gelöschten) Einzelbewertungen.

## Verhalten

14. **Noten verdecken:** Hat man ein Bier selbst bewertet, werden dessen Noten automatisch aufgedeckt (Standard laut Spec). Unbewertete Biere zeigen ein gestricheltes „–“, weil es nichts zu verdecken gibt. Kommentare anderer sind ebenfalls verdeckt, da sie die Note verraten können.
15. **„Neueste“** sortiert nach dem Anlegedatum des Biers.
16. **„Lieblingsgebinde“** ist das Gebinde mit den meisten eigenen Bewertungen, bei Gleichstand das mit der besseren Ø-Note.
17. **„Du bist strenger als X % der Gruppe“:** Anteil der anderen Mitglieder (mit mindestens einer Bewertung), deren Ø-Note besser, also niedriger, ist als die eigene. Unter 50 % wird es als „milder als …“ formuliert.
18. **Gebinde-Filter in der Liste:** Ein Bier passt, wenn es mindestens eine Bewertung mit einem der gewählten Gebinde hat.
19. **Rückgängig nach dem Bewerten:** Gab es vorher schon eine Bewertung (gleiches Bier und Gebinde), werden deren alte Werte wiederhergestellt, sonst wird die neue Bewertung soft-gelöscht. Ein dabei neu angelegtes Bier bleibt bestehen.
20. **Doppelte Biere** prüft die App zuerst lokal (gleicher Schlüssel wie der DB-Index: `lower(name)` + `lower(brauerei)`), danach greift der Unique-Index (`23505`). In beiden Fällen erscheint „Das Bier gibt es schon“ mit Link.
21. **Zuletzt genutzte Gruppe** liegt im Cookie `pz_last_group`, damit `/` serverseitig direkt umleiten kann. Das zuletzt genutzte Gebinde liegt in `localStorage`.
22. **Join-Flow:** Nicht eingeloggt führt `/join/<code>` zu `/login?next=/join/<code>?auto=1`. Nach Login und gegebenenfalls Onboarding tritt man automatisch bei.
23. **Magic Link:** Der Callback unterstützt PKCE (`?code=`) und `token_hash` (für ein angepasstes E-Mail-Template, siehe README). Ein `?code=` auf einer anderen Seite wird zum Callback weitergeleitet, falls Supabase auf die Site URL zurückfällt.
24. **Service Worker** ohne Offline-Cache: Er macht die App nur installierbar. Daten sollen nie veraltet aus einem Cache kommen.
25. **Vergleich, „Gruppen-Matrix“:** Sie ist als vierter Tab „Alle (Matrix)“ umgesetzt und zeigt alle Mitglieder und alle Biere mit mindestens einer Bewertung.
26. **Mitglieder:** Admins können andere zum Admin machen und entfernen. „Admin entziehen“ gibt es nicht (nicht in der Spec). Das schützt auch davor, dass eine Gruppe ohne Admin dasteht.
27. **Phase 5** (Fotos, Realtime, Barcode, Wunschliste …) ist bewusst nicht umgesetzt: Laut Spec erst nach Zustimmung.
