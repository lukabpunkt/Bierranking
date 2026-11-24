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

9. **Next.js 16**, aktuell von `create-next-app` installiert.
10. **Statischer Export für GitHub Pages** (`output: "export"`, Wunsch: Hosting über GitHub Pages). Pages liefert nur Dateien aus, deshalb gilt:
    - **Kein Server-Code:** kein Proxy/Middleware, keine Route Handler, keine Server Components mit Cookies. Login-Schutz und Onboarding-Prüfung macht `RequireAuth` im Browser. Die eigentliche Sicherheitsgrenze ist ohnehin RLS in der Datenbank.
    - **Session im `localStorage`** (supabase-js, PKCE). `SessionProvider` hält Nutzer, Profil und Gruppenliste.
    - **IDs als Query-Parameter statt Pfadsegmente:** `/g/?id=…`, `/g/beer/?id=…&beer=…`, `/join/?code=…`. Ein statischer Export kann keine beliebigen dynamischen Pfade erzeugen.
    - `basePath` kommt aus `NEXT_PUBLIC_BASE_PATH` (Pages: `/Bierranking`), mit `trailingSlash: true`, damit Pages `…/index.html` findet.
11. **Laden der Daten:** Der Client-Kontext `GroupProvider` lädt Biere, Bewertungen und Mitglieder einer Gruppe einmal. Er lädt neu, wenn man in den Tab zurückkehrt, und nach jeder Mutation. Suche, Sortierung, Filter, Vergleich und Statistik laufen ohne Roundtrip. Paginierung über 1000 Zeilen ist eingebaut.
12. **Mutationen** laufen direkt über den Supabase-Client. RLS ist die Sicherheitsgrenze.
13. **Durchschnitte** werden clientseitig aus den Bewertungen berechnet. Die View `beer_stats` bleibt für spätere Nutzung bestehen.

## Verhalten

14. **Noten verdecken:** Hat man ein Bier selbst bewertet, werden dessen Noten automatisch aufgedeckt (Standard laut Spec). Unbewertete Biere zeigen ein gestricheltes „–“, weil es nichts zu verdecken gibt. Kommentare anderer sind ebenfalls verdeckt, da sie die Note verraten können.
15. **„Neueste“** sortiert nach dem Anlegedatum des Biers.
16. **„Lieblingsgebinde“** ist das Gebinde mit den meisten eigenen Bewertungen, bei Gleichstand das mit der besseren Ø-Note.
17. **„Du bist strenger als X % der Gruppe“:** Anteil der anderen Mitglieder (mit mindestens einer Bewertung), deren Ø-Note besser, also niedriger, ist als die eigene. Unter 50 % wird es als „milder als …“ formuliert.
18. **Gebinde-Filter in der Liste:** Ein Bier passt, wenn es mindestens eine Bewertung mit einem der gewählten Gebinde hat.
19. **Rückgängig nach dem Bewerten:** Gab es vorher schon eine Bewertung (gleiches Bier und Gebinde), werden deren alte Werte wiederhergestellt, sonst wird die neue Bewertung soft-gelöscht. Ein dabei neu angelegtes Bier bleibt bestehen.
20. **Doppelte Biere** prüft die App zuerst lokal (gleicher Schlüssel wie der DB-Index: `lower(name)` + `lower(brauerei)`), danach greift der Unique-Index (`23505`). In beiden Fällen erscheint „Das Bier gibt es schon“ mit Link.
21. **Zuletzt genutzte Gruppe** und zuletzt genutztes Gebinde liegen im `localStorage` (pro Gerät).
22. **Join-Flow:** Nicht eingeloggt führt `/join/?code=…` zu `/login/?next=/join/?code=…&auto=1`. Nach Login und gegebenenfalls Onboarding tritt man automatisch bei.
23. **Anmeldung per E-Mail + Passwort statt Magic Link** (ausdrücklicher Wunsch, abweichend von der Spec): Registrieren und Anmelden ohne Bestätigungs-Mail. Voraussetzung ist „Confirm email“ aus in Supabase. Passwort ändern geht im Profil. „Passwort vergessen“ gibt es bewusst nicht, weil dafür eine E-Mail nötig wäre; Admins setzen notfalls im Supabase-Dashboard ein neues Passwort. Der Callback `/auth/callback/` bleibt nur für den optionalen Google-Login.
24. **Service Worker** ohne Offline-Cache: Er macht die App nur installierbar. Daten sollen nie veraltet aus einem Cache kommen.
25. **Vergleich, „Gruppen-Matrix“:** Sie ist als vierter Tab „Alle (Matrix)“ umgesetzt und zeigt alle Mitglieder und alle Biere mit mindestens einer Bewertung.
26. **Mitglieder:** Admins können andere zum Admin machen und entfernen. „Admin entziehen“ gibt es nicht (nicht in der Spec). Das schützt auch davor, dass eine Gruppe ohne Admin dasteht.
27. **Phase 5** ist nach Zustimmung umgesetzt, siehe Abschnitt „Phase 5“.
28. **Backups verschlüsselt:** Das Repo ist öffentlich (Voraussetzung für Pages im Free-Plan), Workflow-Artifacts wären damit für GitHub-Nutzer abrufbar. Der Dump wird deshalb vor dem Upload mit `BACKUP_PASSPHRASE` per GPG/AES-256 verschlüsselt. Ohne Secrets überspringt der Workflow das Backup mit einer Warnung, statt jede Woche fehlzuschlagen.
29. **Gemeinsamer Origin:** Alle Pages-Projekte eines Accounts teilen sich `lukabpunkt.github.io`, und damit den `localStorage`. Andere eigene Pages-Seiten könnten die Session also theoretisch lesen. Bei eigenen Repos ist das unkritisch. Mit einer eigenen Domain entfällt es.

## Phase 5

30. **Fotos:** Privater Bucket `beer-photos`, Pfad `{group_id}/{beer_id}.jpg` (wie in der Spec). Die Storage-Policies prüfen über `can_access_photo()` zusätzlich, dass das Bier wirklich zu dieser Gruppe gehört. So kann niemand Dateien unter fremden Bier-IDs ablegen. Das Bild wird im Browser auf max. 1200 px (längste Kante, JPEG 82 %) verkleinert, die EXIF-Drehung wird berücksichtigt. Angezeigt wird über signierte URLs (1 Std.), mit `updated_at` als Cache-Bremse, damit ein ersetztes Foto sofort erscheint. Jedes Mitglied darf Fotos hinzufügen, ersetzen und entfernen, analog zu „Bier bearbeiten“.
31. **Realtime:** `ratings`, `beers`, `wishlist` und `group_members` sind in der Publication `supabase_realtime`. Realtime liefert nur Zeilen, die man laut RLS sehen darf. Bei jedem Ereignis lädt der Client die Gruppendaten neu (gedrosselt auf 400 ms), statt Einzeländerungen zusammenzuflicken. Das ist einfacher und konsistent mit Soft Delete. Neue Bewertungen anderer lösen zusätzlich einen kurzen Toast aus.
32. **Barcode:** Zuerst wird die native `BarcodeDetector`-API genutzt (Chrome/Android), sonst ZXing. ZXing wird erst beim Öffnen des Scanners nachgeladen, damit der normale Seitenaufbau schlank bleibt. Ohne Kamera oder Freigabe kann man die Nummer eintippen (mit EAN-Prüfziffer-Check). Der Barcode wird am Bier gespeichert (`beers.barcode`). Ein erneuter Scan wählt das vorhandene Bier direkt, ohne Open Food Facts zu fragen. Die Sorte wird aus den OFF-Kategorien geraten. Alle Daten sind nur Vorschläge und vor dem Speichern editierbar.
33. **Wunschliste:** Eigene Tabelle `wishlist` (Bier × Person). Ein neues Bier kann „nur auf die Wunschliste“ gesetzt werden, ohne Note. Ein DB-Trigger entfernt den Eintrag, sobald man das Bier bewertet. In der Liste gibt es den Filter „Meine Wunschliste“ (`?mine=wish`), auf der Detailseite sieht man, wer es noch probieren will.
34. **Highlights** sind eine eigene Seite (Pokal-Symbol im Kopfbereich), um die feste 4er-Navigation aus der Spec nicht zu verändern. Der Feed wird aus vorhandenen Daten berechnet (Bewertungen, neue Biere, Beitritte) und braucht keine eigene Tabelle. „Neu bewertet“ heißt: mehr als eine Minute nach dem Anlegen geändert. Hall of Fame/Shame verlangt ab 3 Bieren mit ≥ 2 Bewertungen mindestens 2 Bewertungen pro Bier, darunter 1, damit kleine Gruppen trotzdem eine Liste sehen. Der Verdecken-Modus gilt auch hier.
35. **Abzeichen** werden aus den Daten der aktuellen Gruppe berechnet und nicht gespeichert. 13 Stück, unerreichte mit Fortschrittsbalken. Gelöschte Bewertungen zählen nicht.
