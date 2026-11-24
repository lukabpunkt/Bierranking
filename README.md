# Prost-Zeugnis 🍺

Mobile-first Web-App (PWA), in der Freundeskreise in eigenen Gruppen Biere eintragen und nach deutschen Schulnoten (1+ bis 6) bewerten – getrennt nach Dose 🥫, Flasche 🍾 und gezapft 🍺.

**Live:** <https://lukabpunkt.github.io/Bierranking/>

**Stack:** Next.js 16 (App Router, TypeScript, statischer Export) · Tailwind CSS 4 · Supabase (Postgres, Auth, RLS) · lucide-react · Vitest · Playwright · Hosting auf GitHub Pages

---

## Schnellstart (lokal)

```bash
npm install
cp .env.local.example .env.local   # Werte eintragen, siehe unten
npm run dev                        # http://localhost:3000
```

| Befehl | Zweck |
|---|---|
| `npm run dev` | Entwicklungsserver |
| `npm run build` | Statischer Export nach `out/` |
| `npm test` | Unit-Tests (Vitest) |
| `npm run test:e2e` | Playwright-Tests (startet den Dev-Server selbst) |
| `npm run lint` | ESLint |
| `npm run types` | DB-Typen neu generieren → `src/lib/database.types.ts` |
| `node scripts/icons.mjs` | PWA-Icons aus `public/icons/icon.svg` neu erzeugen |

---

## Funktionen

- **Gruppen** mit Einladungslink, Admins, Papierkorb
- **Bewerten** nach Schulnoten (1+ bis 6) getrennt nach Dose 🥫 / Flasche 🍾 / gezapft 🍺
- **Bierliste** mit Suche, Sortierung, Filtern · **Detailseite** mit Ø pro Gebinde, Verteilung, Verlauf
- **Noten verdecken** (Spoiler-Schutz) · **Vergleich** (Nebeneinander, Streitbiere, Einigkeit, Matrix)
- **Profil** mit Statistik, Export (CSV/JSON), Passwort ändern
- **Phase 5:**
  - 📸 **Etikett-Fotos** – direkt mit der Kamera, im Browser auf max. 1200 px verkleinert, privat in Supabase Storage (nur Gruppenmitglieder sehen sie)
  - ⚡ **Live-Updates** – neue Bewertungen, Biere, Mitglieder erscheinen ohne Neuladen (Supabase Realtime)
  - 🔎 **Barcode-Scanner** – EAN scannen → Daten von [Open Food Facts](https://world.openfoodfacts.org); bekanntes Bier wird direkt gewählt. Kamera über `BarcodeDetector` (Chrome/Android) bzw. ZXing (iPhone/Safari), Fallback: Nummer eintippen
  - 🔖 **Wunschliste** „Will ich probieren“ – auch für Biere ohne Bewertung; verschwindet automatisch, sobald man das Bier bewertet
  - 🏆 **Highlights** (Pokal oben rechts): Aktivitäts-Feed, Hall of Fame, Hall of Shame, 13 Abzeichen

## Architektur in einem Satz

Die App ist ein **reiner statischer Export** (kein Node-Server): Next.js erzeugt HTML/JS, das auf GitHub Pages liegt. Login, Daten und Rechte laufen direkt zwischen Browser und Supabase – geschützt durch **Row Level Security** in der Datenbank. Gruppen und Biere stehen deshalb als Parameter in der URL (`/g/?id=…`, `/g/beer/?id=…&beer=…`, `/join/?code=…`).

---

## Einrichtung

### 1. Supabase-Projekt

Das Projekt **„Bier Ranking“** (`iczhiknsnmlrsvimperc`) ist eingerichtet, die Migration ist eingespielt. Für ein neues Projekt:

1. Auf [supabase.com](https://supabase.com) ein Projekt anlegen.
2. Schema einspielen: `supabase link --project-ref <ref>` → `supabase db push` – oder `supabase/migrations/0001_init.sql` im SQL-Editor ausführen.
3. `supabase/seed.sql` enthält Beispieldaten (nur lokal, **nicht** in Produktion).

### 2. Umgebungsvariablen

Lokal in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://<projekt-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable- bzw. anon-Key>
NEXT_PUBLIC_BASE_PATH=                   # lokal leer; auf Pages setzt der Workflow "/Bierranking"
NEXT_PUBLIC_ENABLE_GOOGLE=false
```

Beide Supabase-Werte sind **öffentlich** (sie landen ohnehin im Browser); die Sicherheit kommt aus RLS. Der `service_role`-/Secret-Key wird nirgends gebraucht und darf **nie** ins Repo.

### 3. Anmeldung: E-Mail + Passwort ⚠️ (eine Einstellung in Supabase)

Man registriert sich mit E-Mail-Adresse und Passwort und meldet sich später damit wieder an – **ohne Bestätigungs-Mail oder Link**. Dafür muss in Supabase die E-Mail-Bestätigung aus sein:

Dashboard → **Authentication → Sign In / Providers → Email** → **„Confirm email“ ausschalten** → Save.
(Direktlink: <https://supabase.com/dashboard/project/iczhiknsnmlrsvimperc/auth/providers>)

Ist sie an, versucht Supabase bei jeder Registrierung eine Mail zu verschicken – die App zeigt dann einen Hinweis statt einzuloggen.

- Mindestlänge Passwort: 6 Zeichen (Supabase-Standard, änderbar unter Authentication → Sign In / Providers → Email).
- Passwort ändern geht jederzeit im Profil („Ich“ → „Passwort ändern“), solange man angemeldet ist.
- **Passwort vergessen** gibt es bewusst nicht (würde eine E-Mail brauchen). Ein Admin kann im Supabase-Dashboard unter Authentication → Users ein neues Passwort setzen.
- Sessions bleiben im Browser gespeichert – man bleibt angemeldet, bis man sich abmeldet.

### 4. Nur für Google-Login: Auth-URLs

Für E-Mail + Passwort ist nichts weiter nötig. Nur wenn Google-Login aktiviert wird, unter **Authentication → URL Configuration** eintragen:
- **Site URL:** `https://lukabpunkt.github.io/Bierranking/`
- **Redirect URLs:** `https://lukabpunkt.github.io/Bierranking/**`, `http://localhost:3000/**`

### 5. Optional: Google-Login

Authentication → Sign In / Providers → Google aktivieren, dann im Repo unter **Settings → Secrets and variables → Actions → Variables** `NEXT_PUBLIC_ENABLE_GOOGLE=true` setzen.

---

## Deployment (GitHub Pages)

`.github/workflows/pages.yml` baut bei **jedem Push auf `main`** (oder manuell über „Run workflow“): Unit-Tests → statischer Build → Veröffentlichung auf <https://lukabpunkt.github.io/Bierranking/>.

- Pages-Quelle: **Settings → Pages → Source: GitHub Actions** (ist eingerichtet).
- Supabase-URL/Key stehen als öffentliche Standardwerte im Workflow und lassen sich über Repo-**Variables** (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) überschreiben.
- Den Unterpfad (`/Bierranking`) ermittelt der Workflow automatisch. Mit eigener Domain fällt er weg – dann Site/Redirect-URLs in Supabase anpassen.

---

## Datensicherheit & Backups

- **Row Level Security** auf allen Tabellen: Nur Mitglieder sehen die Daten ihrer Gruppe (auch per direktem API-Zugriff).
- **Soft Delete** für Biere und Bewertungen; gelöschte Biere stellen Admins im **Papierkorb** (Gruppeneinstellungen) wieder her. Endgültig gelöscht wird nur beim Löschen der ganzen Gruppe.
- **Änderungsprotokoll** der Bier-Stammdaten (`beer_history`).
- **Export** im Profil: eigene Daten als CSV, Gruppe als CSV oder JSON (UTF-8 mit BOM, Semikolon → öffnet direkt in Excel).
- **Fotos** liegen im privaten Storage-Bucket `beer-photos` (`{group_id}/{beer_id}.jpg`, max. 5 MB). Zugriff prüft `can_access_photo()`: nur Mitglieder der Gruppe, nur für Biere dieser Gruppe. Angezeigt werden sie über zeitlich begrenzte, signierte URLs. *Hinweis:* Der Datenbank-Dump im Backup enthält die Fotos **nicht** (nur deren Pfad).
- Optional (Supabase Pro): **Leaked Password Protection** unter Authentication → Sign In / Providers → Email aktivieren – blockiert bekannte, geleakte Passwörter.

### Automatisches Backup (verschlüsselt)

`.github/workflows/backup.yml` erstellt **jeden Montag** (und manuell) einen `pg_dump` der Schemas `public` und `auth`, **verschlüsselt ihn mit AES-256** und legt ihn als Workflow-Artifact für **90 Tage** ab. Die Verschlüsselung ist nötig, weil das Repo öffentlich ist (für GitHub Pages im Free-Plan) und Artifacts dann für GitHub-Nutzer abrufbar sind.

Einrichtung (ohne diese Secrets wird das Backup einfach übersprungen):
1. Supabase → **Connect** → **Session pooler** → Connection-String kopieren
   (`postgresql://postgres.<ref>:<DB-PASSWORT>@aws-0-eu-west-1.pooler.supabase.com:5432/postgres`; das DB-Passwort lässt sich unter Project Settings → Database zurücksetzen).
2. GitHub-Repo → **Settings → Secrets and variables → Actions → New repository secret**:
   - `SUPABASE_DB_URL` = Connection-String
   - `BACKUP_PASSPHRASE` = ein langes, zufälliges Passwort – **gut aufbewahren** (Passwortmanager), sonst ist das Backup wertlos.
3. Test: Actions → „Datenbank-Backup“ → „Run workflow“.

Wiederherstellen:
```bash
gpg --decrypt prost-zeugnis-2026-01-05_0300.sql.gz.gpg > backup.sql.gz   # fragt nach BACKUP_PASSPHRASE
gunzip backup.sql.gz
psql "<connection-string-des-ziel-projekts>" < backup.sql   # in ein frisches Projekt (enthält das Schema)
```

### Pausierte Projekte (Free Plan)

Kostenlose Supabase-Projekte werden nach etwa einer Woche ohne Aktivität **pausiert**. Die Daten bleiben erhalten, die App zeigt dann Ladefehler. Reaktivieren: Supabase-Dashboard → Projekt → **„Restore project“**. Aktuelle Bedingungen: <https://supabase.com/pricing>.

---

## Projektstruktur

```
src/
  app/                    Seiten (alle statisch, Daten kommen im Browser dazu)
    login/ auth/callback/ onboarding/ groups/ join/ me/
    g/                    Bierliste (?id=) · rate/ · beer/ · compare/ · settings/
    manifest.ts           PWA-Manifest
  components/             SessionProvider, RequireAuth, GroupProvider, GradeBadge, GradePicker, BeerCard …
  hooks/useRevealed.ts    Verdeckt/aufgedeckt pro Bier (sessionStorage)
  lib/                    grades · servings · search · compare · beerList · export · paths · supabase/client
supabase/
  migrations/0001_init.sql
  migrations/0002_phase5.sql   Storage-Bucket + Policies, Wunschliste, Realtime
  seed.sql                Beispieldaten (nur lokal)
e2e/                      Playwright-Tests
.github/workflows/        pages.yml (Deploy) · backup.yml (verschlüsseltes Backup)
```

Entscheidungen und Abweichungen von der Spezifikation: [`DECISIONS.md`](./DECISIONS.md).

---

## Tests

- **Unit (Vitest):** `npm test` – Noten, Umlaut-Suche, Einigkeit/Streitbiere, Sortierung inkl. „Unbewertete ans Ende“, Abzeichen, Hall of Fame/Shame, Feed, Open-Food-Facts-Auswertung, EAN-Prüfziffer.
- **Phase 5 (Playwright):** `e2e/phase5.spec.ts` – Wunschliste inkl. Auto-Entfernen, Foto-Upload + Sperre für Nicht-Mitglieder, Barcode (Open Food Facts gemockt), Live-Update zwischen zwei Nutzern, Highlights. Gleiche Testnutzer wie unten.
- **Smoke (Playwright):** `npm run test:e2e` – Login-/Registrier-Formular, Weiterleitungen, Join-Vorschau, Manifest/Icons, 375-px-Breite. Ohne Zugangsdaten.
- **Kompletter Ablauf (optional):** `e2e/flow.spec.ts` spielt mit drei echten Nutzern alles durch (Onboarding, Gruppe, Bewerten/Überschreiben, Duplikat, Einladung → Login → Beitritt, RLS-Prüfung, Verdecken-Modus, Vergleich, CSV-Export, Rückgängig/Papierkorb, „letzter Admin“). Enthält Login über das Formular (falsches/richtiges Passwort, Session nach Neuladen). Mit `E2E_SIGNUP=1` zusätzlich: Registrieren → Abmelden → wieder Anmelden → doppelte Registrierung (nur bei ausgeschaltetem „Confirm email“; legt einen Nutzer `e2e-signup-…@example.com` an).
  1. Drei Testnutzer mit Passwort anlegen (Dashboard → Authentication → Users → „Add user“, „Auto Confirm“).
  2. `E2E_A_EMAIL=… E2E_B_EMAIL=… E2E_C_EMAIL=… E2E_PASSWORD=… npm run test:e2e` (optional `E2E_SCREENSHOTS=<ordner>`).
  3. Vor einem weiteren Lauf die Testnutzer zurücksetzen bzw. danach löschen – am besten nur in einem Test-Projekt.

## Lokale Supabase (optional)

Mit Docker: `supabase start` → nutzt `supabase/config.toml`, spielt Migration + `seed.sql` ein. URL/Key aus `supabase status` in `.env.local` übernehmen.
