# Prost-Zeugnis 🍺

Mobile-first Web-App (PWA), in der Freundeskreise in eigenen Gruppen Biere eintragen und nach deutschen Schulnoten (1+ bis 6) bewerten – getrennt nach Dose 🥫, Flasche 🍾 und gezapft 🍺.

**Stack:** Next.js 16 (App Router, TypeScript) · Tailwind CSS 4 · Supabase (Postgres, Auth, RLS) · lucide-react · Vitest · Playwright

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
| `npm run build` / `npm start` | Produktions-Build / -Server |
| `npm test` | Unit-Tests (Vitest) |
| `npm run test:e2e` | Playwright-Smoke-Tests (startet den Dev-Server selbst) |
| `npm run lint` | ESLint |
| `npm run types` | DB-Typen neu generieren → `src/lib/database.types.ts` |
| `node scripts/icons.mjs` | PWA-Icons aus `public/icons/icon.svg` neu erzeugen |

---

## Einrichtung Schritt für Schritt

### 1. Supabase-Projekt

1. Auf [supabase.com](https://supabase.com) ein Projekt anlegen (Region z. B. Frankfurt/Irland).
2. Schema einspielen – **eine** der beiden Varianten:
   - **CLI:** `supabase login` → `supabase link --project-ref <projekt-ref>` → `supabase db push`
   - **Dashboard:** Inhalt von `supabase/migrations/0001_init.sql` im SQL-Editor ausführen.
3. *(Nur lokal/Test)* `supabase/seed.sql` enthält Beispieldaten (3 Personen, 15 Biere). **Nicht** in Produktion ausführen.

> Das Projekt **„Bier Ranking“** (`iczhiknsnmlrsvimperc`) ist bereits eingerichtet – Migration ist eingespielt.

### 2. Umgebungsvariablen

In `.env.local` (lokal) bzw. beim Hoster:

```
NEXT_PUBLIC_SUPABASE_URL=https://<projekt-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable- bzw. anon-Key>
NEXT_PUBLIC_SITE_URL=https://<deine-domain>      # lokal: http://localhost:3000
NEXT_PUBLIC_ENABLE_GOOGLE=false                  # true nur, wenn Google in Supabase eingerichtet ist
```

Beide Supabase-Werte stehen unter **Project Settings → API Keys**. Der `service_role`-/Secret-Key wird **nirgends** gebraucht und darf **nie** ins Frontend.

### 3. Auth-URLs in Supabase (wichtig für den Magic Link!)

Dashboard → **Authentication → URL Configuration**:

- **Site URL:** `https://<deine-domain>` (lokal reicht `http://localhost:3000`)
- **Redirect URLs** (alle hinzufügen):
  - `http://localhost:3000/**`
  - `https://<deine-domain>/**`
  - für Netlify-/Vercel-Previews z. B. `https://*--<site>.netlify.app/**` bzw. `https://*-<team>.vercel.app/**`

Der Magic Link führt auf `/auth/callback?next=…`. Ist eine URL nicht freigegeben, schickt Supabase auf die Site URL zurück – die App leitet einen dort ankommenden `?code=` automatisch zum Callback weiter, der Rücksprung zur ursprünglichen Seite (z. B. Einladungslink) geht dann aber verloren.

**Hinweis:** Der Link muss im **selben Browser** geöffnet werden, in dem er angefordert wurde (PKCE). Wer den Link oft auf einem anderen Gerät öffnet, kann im E-Mail-Template (Authentication → Email Templates → Magic Link) stattdessen
`{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email` verwenden – der Callback unterstützt beides.

### 4. E-Mail-Versand (SMTP) für den Produktivbetrieb

Der eingebaute Supabase-Mailversand ist nur zum Testen gedacht (sehr niedrige Limits, nur wenige Mails pro Stunde). Für echte Nutzung unter **Authentication → Emails → SMTP Settings** einen eigenen SMTP-Server hinterlegen (z. B. Resend, Brevo, Postmark, Mailjet). Danach ggf. das Rate-Limit unter **Authentication → Rate Limits** anheben.

### 5. Optional: Google-Login

Authentication → Sign In / Providers → Google aktivieren (OAuth-Client in der Google Cloud Console anlegen, Redirect-URI `https://<projekt-ref>.supabase.co/auth/v1/callback`). Dann `NEXT_PUBLIC_ENABLE_GOOGLE=true` setzen.

---

## Deployment

### Vercel
1. Repo auf GitHub pushen (privat!) → auf [vercel.com](https://vercel.com) „Add New Project“ → Repo wählen. Framework wird erkannt.
2. Die vier Umgebungsvariablen eintragen (`NEXT_PUBLIC_SITE_URL` = Vercel-Domain).
3. Deploy. Danach Domain in Supabase als Site URL / Redirect URL eintragen (Schritt 3).

### Netlify
1. Auf [netlify.com](https://netlify.com) „Add new site → Import an existing project“ → Repo wählen. Netlify erkennt Next.js automatisch (OpenNext-Adapter, Build-Befehl `npm run build`).
2. Umgebungsvariablen unter **Site configuration → Environment variables** eintragen.
3. Deploy. Danach Domain in Supabase eintragen (Schritt 3).

---

## Datensicherheit & Backups

- Alle Daten liegen in Supabase (Postgres). **Row Level Security** ist auf allen Tabellen aktiv: Nur Gruppenmitglieder sehen die Daten ihrer Gruppe.
- **Soft Delete** für Biere und Bewertungen (`deleted_at`). Gelöschte Biere stellen Admins im **Papierkorb** (Gruppeneinstellungen) wieder her. Endgültig gelöscht wird nur beim Löschen der ganzen Gruppe.
- **Änderungsprotokoll** der Bier-Stammdaten in `beer_history` (im Bier-Menü „Änderungsverlauf“).
- **Export** im Profil: eigene Daten als CSV, Gruppe als CSV oder JSON (CSV = UTF-8 mit BOM, Semikolon → öffnet direkt in Excel).

### Automatisches Backup (GitHub Actions)

`.github/workflows/backup.yml` erstellt **jeden Montag** (und manuell über „Run workflow“) einen `pg_dump` der Schemas `public` und `auth` und legt ihn **gezippt als Workflow-Artifact für 90 Tage** ab.

Einrichtung:
1. Supabase → **Connect** (oben) → **Session pooler** → Connection-String kopieren, z. B.
   `postgresql://postgres.<ref>:<DB-PASSWORT>@aws-0-eu-west-1.pooler.supabase.com:5432/postgres`
   (Das DB-Passwort lässt sich unter Project Settings → Database zurücksetzen.)
2. GitHub-Repo → **Settings → Secrets and variables → Actions → New repository secret**: Name `SUPABASE_DB_URL`, Wert = Connection-String.
3. **Das Repo muss privat sein** – Artifacts enthalten alle Daten.
4. Test: Actions → „Datenbank-Backup“ → „Run workflow“.

Wiederherstellen:
```bash
gunzip prost-zeugnis-2026-01-05_0300.sql.gz
# In ein frisches Projekt (Migration NICHT vorher einspielen – der Dump enthält das Schema):
psql "<connection-string-des-ziel-projekts>" < prost-zeugnis-2026-01-05_0300.sql
```
Für ein bestehendes Projekt vorher die betroffenen Tabellen leeren bzw. nur einzelne Tabellen aus dem Dump übernehmen.

### Pausierte Projekte (Free Plan)

Kostenlose Supabase-Projekte werden nach einer Zeit ohne Aktivität (derzeit ca. 1 Woche) **pausiert**. Die Daten bleiben erhalten; die App zeigt dann nur Ladefehler. Reaktivieren: Supabase-Dashboard → Projekt öffnen → **„Restore project“** (dauert ein paar Minuten). Aktuelle Bedingungen: <https://supabase.com/pricing> und <https://supabase.com/docs/guides/platform/billing-on-supabase>. Wer das vermeiden will, nimmt den Pro-Plan.

---

## Projektstruktur

```
src/
  app/                    Seiten (App Router)
    login/ auth/callback/ onboarding/ groups/ join/[code]/ me/
    g/[groupId]/          Bierliste · rate/ · beer/[beerId]/ · compare/ · settings/
    manifest.ts           PWA-Manifest
  components/             UI (GradeBadge, GradePicker, BeerCard, BottomSheet, GroupProvider …)
  hooks/useRevealed.ts    Verdeckt/aufgedeckt pro Bier (sessionStorage)
  lib/                    grades · servings · search · compare · beerList · export · supabase/*
  proxy.ts                Session-Refresh + Login-Schutz (früher „middleware“)
supabase/
  migrations/0001_init.sql
  seed.sql                Beispieldaten (nur lokal)
e2e/                      Playwright-Smoke-Tests
.github/workflows/backup.yml
```

Entscheidungen und Abweichungen von der Spezifikation: siehe [`DECISIONS.md`](./DECISIONS.md).

## Lokale Supabase (optional)

Mit Docker: `supabase start` → nutzt `supabase/config.toml`, spielt Migration + `seed.sql` ein. Magic-Link-Mails landen in Mailpit unter <http://127.0.0.1:54324>. URL/Key aus `supabase status` in `.env.local` übernehmen.

## Tests

- **Unit (Vitest):** `npm test` – `grades`, `search`, `compare`, `beerList` (Noten, Umlaut-Suche, Einigkeit/Streitbiere, Sortierung inkl. „Unbewertete ans Ende“).
- **Smoke (Playwright):** `npm run test:e2e` – Login-Seite, Weiterleitungen, Join-Vorschau, Manifest/Icons, 375-px-Breite. Braucht keine Zugangsdaten.
- **Kompletter Ablauf (Playwright, optional):** `e2e/flow.spec.ts` spielt mit drei echten Nutzern alles durch (Onboarding, Gruppe, Bewerten/Überschreiben, Duplikat, Einladung → Login → Beitritt, RLS-Prüfung mit Nicht-Mitglied, Verdecken-Modus, Vergleich, CSV-Export, Rückgängig/Papierkorb, „letzter Admin“). Der Magic Link wird dabei per Passwort-Login umgangen.
  1. Drei Testnutzer mit Passwort anlegen (Dashboard → Authentication → Users → „Add user“, „Auto Confirm“ an).
  2. Starten:
     ```bash
     E2E_A_EMAIL=… E2E_B_EMAIL=… E2E_C_EMAIL=… E2E_PASSWORD=… npm run test:e2e
     ```
     Optional `E2E_SCREENSHOTS=<ordner>` für Screenshots jeder Station.
  3. Vor jedem weiteren Lauf die Testnutzer zurücksetzen (Gruppen löschen, `profiles.onboarded = false`) bzw. die Nutzer danach wieder löschen – am besten nur in einem Test-/Branch-Projekt.
