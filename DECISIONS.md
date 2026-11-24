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
