# Bierkatalog für Prost-Zeugnis (Vorschläge für die Suche)

Stand: November 2026 · 878 Biere von 442 Brauereien/Marken aus 19 Regionen.

## Hinweise für Claude Code

Diese Liste ist ein **globaler, schreibgeschützter Vorschlagskatalog**. Sie ersetzt **nicht** die gruppeneigene Tabelle `beers` aus `prost-zeugnis-spec.md`. Umsetzung:

1. Neue Tabelle `public.beer_catalog` (id, name, brewery, style, country, alcohol_free boolean). Unique auf `lower(name)`. RLS: `select` für `authenticated`, kein Insert/Update/Delete für Nutzer.
2. Ein Seed-Skript (`scripts/import-catalog.ts`) parst die Tabellen unten (Spalten: Bier | Brauerei/Marke | Sorte | Alkoholfrei) und schreibt sie per Upsert nach `beer_catalog`. Das Land ist die jeweilige Zwischenüberschrift. Das Skript muss mehrfach ausführbar sein (idempotent).
3. Für schnelle, tippfehlertolerante Suche `pg_trgm` aktivieren und einen GIN-Trigram-Index auf `name` und `brewery` anlegen. Eine RPC `search_catalog(q text)` liefert die Top 8 nach Ähnlichkeit. Groß-/Kleinschreibung und Umlaute werden normalisiert (`unaccent`).
4. **Suchvorschläge im Bewerten-Flow:** zuerst passende Biere, die es **in der Gruppe schon gibt** (Kennzeichen „in eurer Liste“), danach Treffer aus dem Katalog (Kennzeichen „Vorschlag“). Tippt man einen Katalog-Vorschlag an, wird das Bier in der Gruppe angelegt. Name, Brauerei, Sorte und Land werden übernommen, dann geht es direkt zur Note. Passt nichts: „‚…‘ neu anlegen“ wie bisher.
5. In `beers` optional eine Spalte `catalog_id` (nullable, Referenz auf `beer_catalog`) ergänzen, damit Gruppen-Biere wissen, aus welchem Katalogeintrag sie stammen.
6. Die Sorten-Chips im Formular aus den hier vorkommenden Sorten ableiten.

**Wichtig:** Die Liste wurde ohne Abgleich mit Herstellerseiten zusammengestellt. Sortimente ändern sich, einzelne Sorten können eingestellt oder umbenannt sein. Deshalb gilt: Nutzer können immer frei neue Biere anlegen, und der Katalog ist nur eine Eingabehilfe. Ergänzungen einfach als neue Zeilen in diese Datei schreiben und den Import erneut ausführen.


## Deutschland

| Bier | Brauerei/Marke | Sorte | Alkoholfrei |
|---|---|---|---|
| Veltins Pilsener | C. & A. Veltins | Pils | nein |
| Veltins Helles | C. & A. Veltins | Helles | nein |
| Veltins Alkoholfrei | C. & A. Veltins | Pils | ja |
| Veltins Radler | C. & A. Veltins | Radler | nein |
| Veltins Radler 0,0% | C. & A. Veltins | Radler | ja |
| V+ Lemon | C. & A. Veltins | Biermischgetränk | nein |
| V+ Curuba | C. & A. Veltins | Biermischgetränk | nein |
| V+ Energy | C. & A. Veltins | Biermischgetränk | nein |
| Grevensteiner Original | C. & A. Veltins | Landbier | nein |
| Pülleken | C. & A. Veltins | Pils | nein |
| Krombacher Pils | Krombacher | Pils | nein |
| Krombacher Alkoholfrei | Krombacher | Pils | ja |
| Krombacher Radler | Krombacher | Radler | nein |
| Krombacher Radler 0,0% | Krombacher | Radler | ja |
| Krombacher Weizen | Krombacher | Hefeweizen | nein |
| Krombacher Weizen Alkoholfrei | Krombacher | Hefeweizen | ja |
| Krombacher Hell | Krombacher | Helles | nein |
| Krombacher Kellerbier | Krombacher | Kellerbier | nein |
| Krombacher Dark | Krombacher | Dunkel | nein |
| Krombacher Natur Radler | Krombacher | Radler | nein |
| Bitburger Premium Pils | Bitburger | Pils | nein |
| Bitburger 0,0% Alkoholfrei | Bitburger | Pils | ja |
| Bitburger Radler | Bitburger | Radler | nein |
| Bitburger 0,0% Radler | Bitburger | Radler | ja |
| Bitburger Hell | Bitburger | Helles | nein |
| Warsteiner Premium Pilsener | Warsteiner | Pils | nein |
| Warsteiner Herb | Warsteiner | Pils | nein |
| Warsteiner Alkoholfrei | Warsteiner | Pils | ja |
| Warsteiner Radler | Warsteiner | Radler | nein |
| Warsteiner Radler Alkoholfrei | Warsteiner | Radler | ja |
| Warsteiner Premium Dunkel | Warsteiner | Dunkel | nein |
| Warsteiner Brewers Gold | Warsteiner | Lager | nein |
| Herforder Pils | Herforder | Pils | nein |
| Herforder Landbier | Herforder | Landbier | nein |
| Herforder Export | Herforder | Export | nein |
| Herforder Alkoholfrei | Herforder | Pils | ja |
| Beck's Pils | Beck's | Pils | nein |
| Beck's Gold | Beck's | Lager | nein |
| Beck's Alkoholfrei | Beck's | Pils | ja |
| Beck's Blue | Beck's | Pils | ja |
| Beck's Green Lemon | Beck's | Biermischgetränk | nein |
| Beck's Lemon | Beck's | Biermischgetränk | nein |
| Beck's Ice | Beck's | Biermischgetränk | nein |
| Beck's Unfiltered | Beck's | Kellerbier | nein |
| Haake-Beck Pils | Haake-Beck | Pils | nein |
| Haake-Beck Kräusen | Haake-Beck | Kellerbier | nein |
| Jever Pilsener | Jever | Pils | nein |
| Jever Fun | Jever | Pils | ja |
| Jever Light | Jever | Leichtbier | nein |
| Radeberger Pilsner | Radeberger | Pils | nein |
| Radeberger Alkoholfrei | Radeberger | Pils | ja |
| Radeberger Zwickelbier | Radeberger | Zwickel | nein |
| Oettinger Pils | Oettinger | Pils | nein |
| Oettinger Export | Oettinger | Export | nein |
| Oettinger Hell | Oettinger | Helles | nein |
| Oettinger Urtyp | Oettinger | Export | nein |
| Oettinger Hefeweißbier | Oettinger | Hefeweizen | nein |
| Oettinger Dunkles Hefeweißbier | Oettinger | Weizen Dunkel | nein |
| Oettinger Alkoholfrei | Oettinger | Pils | ja |
| Oettinger Radler | Oettinger | Radler | nein |
| Oettinger Mixbier Cola | Oettinger | Biermischgetränk | nein |
| Oettinger Super Forte | Oettinger | Starkbier | nein |
| Paulaner Original Münchner Hell | Paulaner | Helles | nein |
| Paulaner Münchner Hell Alkoholfrei | Paulaner | Helles | ja |
| Paulaner Original Münchner Dunkel | Paulaner | Dunkel | nein |
| Paulaner Münchner Urtyp | Paulaner | Export | nein |
| Paulaner Hefe-Weißbier Naturtrüb | Paulaner | Hefeweizen | nein |
| Paulaner Hefe-Weißbier Dunkel | Paulaner | Weizen Dunkel | nein |
| Paulaner Weißbier Kristallklar | Paulaner | Kristallweizen | nein |
| Paulaner Hefe-Weißbier Leicht | Paulaner | Leichtbier | nein |
| Paulaner Hefe-Weißbier Alkoholfrei 0,0% | Paulaner | Hefeweizen | ja |
| Paulaner Weißbier-Zitrone Alkoholfrei | Paulaner | Biermischgetränk | ja |
| Paulaner Natur-Radler | Paulaner | Radler | nein |
| Paulaner Salvator | Paulaner | Doppelbock | nein |
| Paulaner Oktoberfest Bier | Paulaner | Festbier | nein |
| Paulaner Oktoberfest Märzen | Paulaner | Märzen | nein |
| Thurn und Taxis Roggen | Thurn und Taxis | Roggenbier | nein |
| Thurn und Taxis Hefeweizen | Thurn und Taxis | Hefeweizen | nein |
| Hacker-Pschorr Münchner Hell | Hacker-Pschorr | Helles | nein |
| Hacker-Pschorr Münchner Gold | Hacker-Pschorr | Export | nein |
| Hacker-Pschorr Kellerbier Anno 1417 | Hacker-Pschorr | Kellerbier | nein |
| Hacker-Pschorr Hefe Weisse | Hacker-Pschorr | Hefeweizen | nein |
| Hacker-Pschorr Dunkle Weisse | Hacker-Pschorr | Weizen Dunkel | nein |
| Hacker-Pschorr Animator | Hacker-Pschorr | Doppelbock | nein |
| Hacker-Pschorr Oktoberfest Märzen | Hacker-Pschorr | Märzen | nein |
| Hacker-Pschorr Münchner Radler | Hacker-Pschorr | Radler | nein |
| Hacker-Pschorr Braumeister Pils | Hacker-Pschorr | Pils | nein |
| Löwenbräu Original | Löwenbräu | Helles | nein |
| Löwenbräu Urtyp | Löwenbräu | Export | nein |
| Löwenbräu Alkoholfrei | Löwenbräu | Helles | ja |
| Löwenbräu Oktoberfestbier | Löwenbräu | Festbier | nein |
| Löwenbräu Triumphator | Löwenbräu | Doppelbock | nein |
| Spaten Münchner Hell | Spaten | Helles | nein |
| Spaten Münchner Dunkel | Spaten | Dunkel | nein |
| Spaten Oktoberfestbier | Spaten | Festbier | nein |
| Spaten Optimator | Spaten | Doppelbock | nein |
| Franziskaner Weissbier Naturtrüb | Franziskaner | Hefeweizen | nein |
| Franziskaner Weissbier Dunkel | Franziskaner | Weizen Dunkel | nein |
| Franziskaner Weissbier Kristallklar | Franziskaner | Kristallweizen | nein |
| Franziskaner Weissbier Alkoholfrei | Franziskaner | Hefeweizen | ja |
| Augustiner Lagerbier Hell | Augustiner-Bräu | Helles | nein |
| Augustiner Edelstoff | Augustiner-Bräu | Export | nein |
| Augustiner Pils | Augustiner-Bräu | Pils | nein |
| Augustiner Dunkel | Augustiner-Bräu | Dunkel | nein |
| Augustiner Weißbier | Augustiner-Bräu | Hefeweizen | nein |
| Augustiner Maximator | Augustiner-Bräu | Doppelbock | nein |
| Augustiner Heller Bock | Augustiner-Bräu | Bock | nein |
| Augustiner Oktoberfestbier | Augustiner-Bräu | Festbier | nein |
| Hofbräu Original | Hofbräu München | Helles | nein |
| Hofbräu Original Alkoholfrei | Hofbräu München | Helles | ja |
| Hofbräu Dunkel | Hofbräu München | Dunkel | nein |
| Hofbräu Münchner Weisse | Hofbräu München | Hefeweizen | nein |
| Hofbräu Schwarze Weisse | Hofbräu München | Weizen Dunkel | nein |
| Hofbräu Oktoberfestbier | Hofbräu München | Festbier | nein |
| Hofbräu Maibock | Hofbräu München | Bock | nein |
| Hofbräu Delicator | Hofbräu München | Doppelbock | nein |
| Erdinger Weißbier | Erdinger Weißbräu | Hefeweizen | nein |
| Erdinger Dunkel | Erdinger Weißbräu | Weizen Dunkel | nein |
| Erdinger Kristall | Erdinger Weißbräu | Kristallweizen | nein |
| Erdinger Urweisse | Erdinger Weißbräu | Hefeweizen | nein |
| Erdinger Pikantus | Erdinger Weißbräu | Weizenbock | nein |
| Erdinger Leicht | Erdinger Weißbräu | Leichtbier | nein |
| Erdinger Alkoholfrei | Erdinger Weißbräu | Hefeweizen | ja |
| Erdinger Alkoholfrei Zitrone | Erdinger Weißbräu | Biermischgetränk | ja |
| Erdinger Alkoholfrei Grapefruit | Erdinger Weißbräu | Biermischgetränk | ja |
| Erdinger Oktoberfest Weißbier | Erdinger Weißbräu | Hefeweizen | nein |
| Erdinger Schneeweiße | Erdinger Weißbräu | Hefeweizen | nein |
| Erdinger Brauhaus Helles | Erdinger Weißbräu | Helles | nein |
| Weihenstephaner Hefeweissbier | Weihenstephan | Hefeweizen | nein |
| Weihenstephaner Hefeweissbier Dunkel | Weihenstephan | Weizen Dunkel | nein |
| Weihenstephaner Kristallweissbier | Weihenstephan | Kristallweizen | nein |
| Weihenstephaner Hefeweissbier Leicht | Weihenstephan | Leichtbier | nein |
| Weihenstephaner Hefeweissbier Alkoholfrei | Weihenstephan | Hefeweizen | ja |
| Weihenstephaner Vitus | Weihenstephan | Weizenbock | nein |
| Weihenstephaner Original Helles | Weihenstephan | Helles | nein |
| Weihenstephaner Pilsner | Weihenstephan | Pils | nein |
| Weihenstephaner Tradition | Weihenstephan | Dunkel | nein |
| Weihenstephaner Festbier | Weihenstephan | Festbier | nein |
| Weihenstephaner Korbinian | Weihenstephan | Doppelbock | nein |
| Weihenstephaner 1516 Kellerbier | Weihenstephan | Kellerbier | nein |
| Schneider Weisse TAP1 Meine Blonde Weisse | Schneider Weisse | Hefeweizen | nein |
| Schneider Weisse TAP2 Mein Kristall | Schneider Weisse | Kristallweizen | nein |
| Schneider Weisse TAP3 Mein Alkoholfreies | Schneider Weisse | Hefeweizen | ja |
| Schneider Weisse TAP5 Meine Hopfenweisse | Schneider Weisse | Weizenbock | nein |
| Schneider Weisse TAP6 Unser Aventinus | Schneider Weisse | Weizenbock | nein |
| Schneider Weisse TAP7 Unser Original | Schneider Weisse | Hefeweizen | nein |
| Schneider Aventinus Eisbock | Schneider Weisse | Eisbock | nein |
| Ayinger Lager Hell | Ayinger | Helles | nein |
| Ayinger Jahrhundert-Bier | Ayinger | Export | nein |
| Ayinger Kellerbier | Ayinger | Kellerbier | nein |
| Ayinger Bräuweisse | Ayinger | Hefeweizen | nein |
| Ayinger Urweisse | Ayinger | Weizen Dunkel | nein |
| Ayinger Celebrator | Ayinger | Doppelbock | nein |
| Ayinger Oktober Fest-Märzen | Ayinger | Märzen | nein |
| Ayinger Altbairisch Dunkel | Ayinger | Dunkel | nein |
| Ayinger Bairisch Pils | Ayinger | Pils | nein |
| Tegernseer Hell | Tegernseer | Helles | nein |
| Tegernseer Spezial | Tegernseer | Export | nein |
| Tegernseer Dunkel Export | Tegernseer | Dunkel | nein |
| Tegernseer Quirinus | Tegernseer | Doppelbock | nein |
| Andechser Vollbier Hell | Klosterbrauerei Andechs | Helles | nein |
| Andechser Spezial Hell | Klosterbrauerei Andechs | Export | nein |
| Andechser Export Dunkel | Klosterbrauerei Andechs | Dunkel | nein |
| Andechser Weissbier Hefetrüb | Klosterbrauerei Andechs | Hefeweizen | nein |
| Andechser Weissbier Dunkel | Klosterbrauerei Andechs | Weizen Dunkel | nein |
| Andechser Doppelbock Dunkel | Klosterbrauerei Andechs | Doppelbock | nein |
| Andechser Bergbock Hell | Klosterbrauerei Andechs | Bock | nein |
| Ettaler Kloster Dunkel | Klosterbrauerei Ettal | Dunkel | nein |
| Ettaler Curator | Klosterbrauerei Ettal | Doppelbock | nein |
| Weltenburger Barock Dunkel | Klosterbrauerei Weltenburg | Dunkel | nein |
| Weltenburger Anno 1050 | Klosterbrauerei Weltenburg | Märzen | nein |
| Weltenburger Hefe-Weißbier Hell | Klosterbrauerei Weltenburg | Hefeweizen | nein |
| Weltenburger Asam Bock | Klosterbrauerei Weltenburg | Doppelbock | nein |
| Benediktiner Weissbier Naturtrüb | Benediktiner | Hefeweizen | nein |
| Benediktiner Weissbier Dunkel | Benediktiner | Weizen Dunkel | nein |
| Benediktiner Hell | Benediktiner | Helles | nein |
| Benediktiner Weissbier Alkoholfrei | Benediktiner | Hefeweizen | ja |
| König Ludwig Weissbier Hell | König Ludwig (Kaltenberg) | Hefeweizen | nein |
| König Ludwig Weissbier Dunkel | König Ludwig (Kaltenberg) | Weizen Dunkel | nein |
| König Ludwig Weissbier Alkoholfrei | König Ludwig (Kaltenberg) | Hefeweizen | ja |
| König Ludwig Dunkel | König Ludwig (Kaltenberg) | Dunkel | nein |
| Schöfferhofer Hefeweizen | Schöfferhofer | Hefeweizen | nein |
| Schöfferhofer Kristallweizen | Schöfferhofer | Kristallweizen | nein |
| Schöfferhofer Dunkles Hefeweizen | Schöfferhofer | Weizen Dunkel | nein |
| Schöfferhofer Hefeweizen Alkoholfrei | Schöfferhofer | Hefeweizen | ja |
| Schöfferhofer Grapefruit | Schöfferhofer | Biermischgetränk | nein |
| Schöfferhofer Grapefruit 0,0% | Schöfferhofer | Biermischgetränk | ja |
| Maisel's Weisse Original | Maisel's | Hefeweizen | nein |
| Maisel's Weisse Dunkel | Maisel's | Weizen Dunkel | nein |
| Maisel's Weisse Kristall | Maisel's | Kristallweizen | nein |
| Maisel's Weisse Alkoholfrei | Maisel's | Hefeweizen | ja |
| Tucher Helles Hefe Weizen | Tucher | Hefeweizen | nein |
| Tucher Dunkles Hefe Weizen | Tucher | Weizen Dunkel | nein |
| Tucher Kristall Weizen | Tucher | Kristallweizen | nein |
| Tucher Übersee Export | Tucher | Export | nein |
| Tucher Pilsener | Tucher | Pils | nein |
| Tucher Urfränkisch Dunkel | Tucher | Dunkel | nein |
| Kulmbacher Edelherb Pils | Kulmbacher | Pils | nein |
| Kulmbacher Eisbock | Kulmbacher | Eisbock | nein |
| Mönchshof Kellerbier | Mönchshof | Kellerbier | nein |
| Mönchshof Kellerbier Alkoholfrei | Mönchshof | Kellerbier | ja |
| Mönchshof Landbier | Mönchshof | Landbier | nein |
| Mönchshof Schwarzbier | Mönchshof | Schwarzbier | nein |
| Mönchshof Bayerisch Hell | Mönchshof | Helles | nein |
| Mönchshof Natur Radler | Mönchshof | Radler | nein |
| Kapuziner Weißbier | Kapuziner | Hefeweizen | nein |
| Kapuziner Schwarz-Weizen | Kapuziner | Weizen Dunkel | nein |
| Kapuziner Kristall-Weizen | Kapuziner | Kristallweizen | nein |
| Kapuziner Weißbier Alkoholfrei | Kapuziner | Hefeweizen | ja |
| Lammsbräu Pils | Neumarkter Lammsbräu | Pils | nein |
| Lammsbräu Edelpils | Neumarkter Lammsbräu | Pils | nein |
| Lammsbräu Dinkel | Neumarkter Lammsbräu | Spezialbier | nein |
| Lammsbräu Weisse | Neumarkter Lammsbräu | Hefeweizen | nein |
| Lammsbräu Alkoholfrei | Neumarkter Lammsbräu | Pils | ja |
| Schönramer Hell | Private Landbrauerei Schönram | Helles | nein |
| Schönramer Pils | Private Landbrauerei Schönram | Pils | nein |
| Schönramer Gold | Private Landbrauerei Schönram | Export | nein |
| Giesinger Erhellung | Giesinger Bräu | Helles | nein |
| Kuchlbauer Weisse | Kuchlbauer | Hefeweizen | nein |
| Kuchlbauer Turmweisse | Kuchlbauer | Hefeweizen | nein |
| Unertl Original Weißbier | Unertl | Hefeweizen | nein |
| Hopf Helle Weisse | Hopf | Hefeweizen | nein |
| Gutmann Hefeweizen | Gutmann | Hefeweizen | nein |
| Gutmann Hellers Weizenbock | Gutmann | Weizenbock | nein |
| Riegele Commerzienrat Privat | Riegele | Export | nein |
| Riegele Feines Urhell | Riegele | Helles | nein |
| Allgäuer Büble Bier Edelbräu | Allgäuer Brauhaus | Export | nein |
| Aecht Schlenkerla Rauchbier Märzen | Brauerei Heller (Schlenkerla) | Rauchbier | nein |
| Aecht Schlenkerla Rauchbier Urbock | Brauerei Heller (Schlenkerla) | Rauchbier | nein |
| Aecht Schlenkerla Helles Lagerbier | Brauerei Heller (Schlenkerla) | Helles | nein |
| Mahrs Bräu Ungespundet (aU) | Mahrs Bräu | Kellerbier | nein |
| Mahrs Bräu Pils | Mahrs Bräu | Pils | nein |
| Fässla Gold-Pils | Fässla | Pils | nein |
| Rothaus Pils Tannenzäpfle | Rothaus | Pils | nein |
| Rothaus Märzen Export Eiszäpfle | Rothaus | Märzen | nein |
| Rothaus Hefeweizen | Rothaus | Hefeweizen | nein |
| Rothaus Hefeweizen Alkoholfrei | Rothaus | Hefeweizen | ja |
| Rothaus Pils Alkoholfrei | Rothaus | Pils | ja |
| Rothaus Radler | Rothaus | Radler | nein |
| Fürstenberg Premium Pilsener | Fürstenberg | Pils | nein |
| Waldhaus Diplom Pils | Waldhaus | Pils | nein |
| Waldhaus Ohne Filter | Waldhaus | Kellerbier | nein |
| Alpirsbacher Spezial | Alpirsbacher Klosterbräu | Export | nein |
| Alpirsbacher Pils | Alpirsbacher Klosterbräu | Pils | nein |
| Alpirsbacher Kloster Weizen | Alpirsbacher Klosterbräu | Hefeweizen | nein |
| Dinkelacker CD-Pils | Dinkelacker | Pils | nein |
| Dinkelacker Privat | Dinkelacker | Export | nein |
| Stuttgarter Hofbräu Herrenpils | Stuttgarter Hofbräu | Pils | nein |
| Schwaben Bräu Meister Pils | Schwaben Bräu | Pils | nein |
| Ganter Pils | Ganter | Pils | nein |
| Distelhäuser Pils | Distelhäuser | Pils | nein |
| Distelhäuser Landbier | Distelhäuser | Landbier | nein |
| Eichbaum Ureich Pils | Eichbaum | Pils | nein |
| Eichbaum Export | Eichbaum | Export | nein |
| Karlsberg UrPils | Karlsberg | Pils | nein |
| Mixery | Karlsberg | Biermischgetränk | nein |
| Park Pilsener | Park & Bellheimer | Pils | nein |
| Bellheimer Lager | Park & Bellheimer | Lager | nein |
| Kirner Pils | Kirner | Pils | nein |
| Licher Pilsner | Licher | Pils | nein |
| Licher Weizen | Licher | Hefeweizen | nein |
| Licher Alkoholfrei | Licher | Pils | ja |
| Binding Römer Pils | Binding | Pils | nein |
| Henninger Pilsner | Henninger | Pils | nein |
| Pfungstädter Pilsner | Pfungstädter | Pils | nein |
| Hasseröder Premium Pils | Hasseröder | Pils | nein |
| Hasseröder Alkoholfrei | Hasseröder | Pils | ja |
| Hasseröder Radler | Hasseröder | Radler | nein |
| Wernesgrüner Pils Legende | Wernesgrüner | Pils | nein |
| Sternburg Export | Sternburg | Export | nein |
| Sternburg Pilsener | Sternburg | Pils | nein |
| Sternburg Schwarzbier | Sternburg | Schwarzbier | nein |
| Köstritzer Schwarzbier | Köstritzer | Schwarzbier | nein |
| Köstritzer Kellerbier | Köstritzer | Kellerbier | nein |
| Köstritzer Edel Pils | Köstritzer | Pils | nein |
| Ur-Krostitzer Feinherbes Pilsner | Ur-Krostitzer | Pils | nein |
| Freiberger Premium Pils | Freiberger | Pils | nein |
| Freiberger Schwarzbier | Freiberger | Schwarzbier | nein |
| Feldschlößchen Pilsner | Feldschlößchen (Dresden) | Pils | nein |
| Landskron Premium Pilsner | Landskron | Pils | nein |
| Neuzeller Schwarzer Abt | Neuzeller Klosterbräu | Schwarzbier | nein |
| Lübzer Pils | Lübzer | Pils | nein |
| Lübzer Export | Lübzer | Export | nein |
| Rostocker Pilsener | Rostocker | Pils | nein |
| Darguner Pilsener | Darguner | Pils | nein |
| Störtebeker Pilsener-Bier | Störtebeker | Pils | nein |
| Störtebeker Keller-Bier 1402 | Störtebeker | Kellerbier | nein |
| Störtebeker Schwarz-Bier | Störtebeker | Schwarzbier | nein |
| Störtebeker Atlantik-Ale | Störtebeker | Pale Ale | nein |
| Störtebeker Bernstein-Weizen | Störtebeker | Hefeweizen | nein |
| Störtebeker Roggen-Weizen | Störtebeker | Roggenbier | nein |
| Störtebeker Baltik-Lager | Störtebeker | Lager | nein |
| Störtebeker Frei-Bier | Störtebeker | Pils | ja |
| Flensburger Pilsener | Flensburger | Pils | nein |
| Flensburger Gold | Flensburger | Export | nein |
| Flensburger Dunkel | Flensburger | Dunkel | nein |
| Flensburger Kellerbier | Flensburger | Kellerbier | nein |
| Flensburger Weizen | Flensburger | Hefeweizen | nein |
| Flensburger Frei | Flensburger | Pils | ja |
| Flensburger Radler | Flensburger | Radler | nein |
| Dithmarscher Pilsener | Dithmarscher | Pils | nein |
| Dithmarscher Dunkel | Dithmarscher | Dunkel | nein |
| Holsten Pilsener | Holsten | Pils | nein |
| Holsten Edel | Holsten | Export | nein |
| Holsten Alkoholfrei | Holsten | Pils | ja |
| Astra Urtyp | Astra | Export | nein |
| Astra Rotlicht | Astra | Lager | nein |
| Astra Kiezmische | Astra | Biermischgetränk | nein |
| Astra Alsterwasser | Astra | Radler | nein |
| Ratsherrn Pilsener | Ratsherrn | Pils | nein |
| Ratsherrn Rotbier | Ratsherrn | Rotbier | nein |
| Duckstein Original | Duckstein | Rotbier | nein |
| Einbecker Brauherren Pils | Einbecker | Pils | nein |
| Einbecker Ur-Bock Dunkel | Einbecker | Bock | nein |
| Einbecker Ur-Bock Hell | Einbecker | Bock | nein |
| Einbecker Mai-Ur-Bock | Einbecker | Bock | nein |
| Herrenhäuser Premium Pilsener | Herrenhäuser | Pils | nein |
| Gilde Pilsener | Gilde Brauerei | Pils | nein |
| Lindener Spezial | Gilde Brauerei | Export | nein |
| Wolters Pilsener | Wolters | Pils | nein |
| Härke Pils | Härke | Pils | nein |
| Barre Pils | Barre | Pils | nein |
| DAB Original | DAB (Dortmunder Actien-Brauerei) | Pils | nein |
| DAB Export | DAB (Dortmunder Actien-Brauerei) | Export | nein |
| Brinkhoff's No. 1 | Brinkhoff's | Pils | nein |
| Kronen Export | Kronen | Export | nein |
| Hansa Pils | Hansa | Pils | nein |
| Hansa Export | Hansa | Export | nein |
| Stauder Pils | Stauder | Pils | nein |
| König Pilsener | König-Brauerei | Pils | nein |
| König Pilsener Alkoholfrei | König-Brauerei | Pils | ja |
| Iserlohner Pilsener | Iserlohner | Pils | nein |
| Paderborner Pilsener | Paderborner | Pils | nein |
| Hövels Original | Hövels | Spezialbier | nein |
| Wicküler Pilsener | Wicküler | Pils | nein |
| Diebels Alt | Diebels | Alt | nein |
| Frankenheim Alt | Frankenheim | Alt | nein |
| Uerige Altbier | Uerige | Alt | nein |
| Uerige Sticke | Uerige | Alt | nein |
| Uerige Doppelsticke | Uerige | Alt | nein |
| Schumacher Alt | Schumacher | Alt | nein |
| Füchschen Alt | Füchschen | Alt | nein |
| Schlüssel Alt | Schlüssel | Alt | nein |
| Hannen Alt | Hannen | Alt | nein |
| Bolten Ur-Alt | Bolten | Alt | nein |
| Gatzweilers Alt | Gatzweilers | Alt | nein |
| Früh Kölsch | Früh | Kölsch | nein |
| Früh Kölsch Alkoholfrei | Früh | Kölsch | ja |
| Reissdorf Kölsch | Reissdorf | Kölsch | nein |
| Gaffel Kölsch | Gaffel | Kölsch | nein |
| Sünner Kölsch | Sünner | Kölsch | nein |
| Mühlen Kölsch | Mühlen | Kölsch | nein |
| Päffgen Kölsch | Päffgen | Kölsch | nein |
| Peters Kölsch | Peters | Kölsch | nein |
| Dom Kölsch | Dom | Kölsch | nein |
| Sion Kölsch | Sion | Kölsch | nein |
| Gilden Kölsch | Gilden | Kölsch | nein |
| Küppers Kölsch | Küppers | Kölsch | nein |
| Berliner Kindl Jubiläums Pilsener | Berliner Kindl | Pils | nein |
| Berliner Kindl Weisse | Berliner Kindl | Berliner Weisse | nein |
| Berliner Kindl Weisse Himbeere | Berliner Kindl | Berliner Weisse | nein |
| Berliner Kindl Weisse Waldmeister | Berliner Kindl | Berliner Weisse | nein |
| Schultheiss Pilsener | Schultheiss | Pils | nein |
| Berliner Pilsner | Berliner Pilsner | Pils | nein |
| BRLO Helles | BRLO | Helles | nein |
| BRLO Pale Ale | BRLO | Pale Ale | nein |
| Crew Republic Drunken Sailor | Crew Republic | IPA | nein |
| Crew Republic Foundation 11 | Crew Republic | Pale Ale | nein |
| Clausthaler Original | Clausthaler | Pils | ja |
| Clausthaler Extra Herb | Clausthaler | Pils | ja |
| 5,0 Original Pils | 5,0 Original | Pils | nein |
| 5,0 Original Export | 5,0 Original | Export | nein |
| Karlskrone Pils | Handelsmarken | Pils | nein |
| Karlskrone Export | Handelsmarken | Export | nein |
| Perlenbacher Pils | Handelsmarken | Pils | nein |
| Perlenbacher Export | Handelsmarken | Export | nein |
| Gerstel Alkoholfrei | Handelsmarken | Pils | ja |

## Österreich

| Bier | Brauerei/Marke | Sorte | Alkoholfrei |
|---|---|---|---|
| Stiegl Goldbräu | Stiegl | Märzen | nein |
| Stiegl Radler Grapefruit | Stiegl | Radler | nein |
| Stiegl Freibier | Stiegl | Märzen | ja |
| Gösser Märzen | Gösser | Märzen | nein |
| Gösser Naturradler | Gösser | Radler | nein |
| Gösser Gold | Gösser | Export | nein |
| Ottakringer Helles | Ottakringer | Helles | nein |
| Ottakringer Wiener Original | Ottakringer | Märzen | nein |
| Zipfer Märzen | Zipfer | Märzen | nein |
| Zipfer Urtyp | Zipfer | Pils | nein |
| Puntigamer Märzen | Puntigamer | Märzen | nein |
| Edelweiss Hofbräu Hefetrüb | Edelweiss | Hefeweizen | nein |
| Edelweiss Alkoholfrei | Edelweiss | Hefeweizen | ja |
| Murauer Märzen | Murauer | Märzen | nein |
| Hirter Privat Pils | Hirter | Pils | nein |
| Trumer Pils | Trumer | Pils | nein |
| Mohren Spezial | Mohrenbräu | Märzen | nein |
| Schwechater Zwickl | Schwechater | Zwickel | nein |
| Egger Märzen | Egger | Märzen | nein |

## Schweiz

| Bier | Brauerei/Marke | Sorte | Alkoholfrei |
|---|---|---|---|
| Feldschlösschen Original | Feldschlösschen | Lager | nein |
| Quöllfrisch | Appenzeller Bier | Lager | nein |
| Calanda Lager | Calanda | Lager | nein |
| Eichhof Lager | Eichhof | Lager | nein |
| Cardinal Lager | Cardinal | Lager | nein |

## Tschechien

| Bier | Brauerei/Marke | Sorte | Alkoholfrei |
|---|---|---|---|
| Pilsner Urquell | Plzeňský Prazdroj | Pils | nein |
| Budweiser Budvar Original | Budějovický Budvar | Lager | nein |
| Budweiser Budvar Dark | Budějovický Budvar | Dunkel | nein |
| Staropramen Premium | Staropramen | Lager | nein |
| Krušovice Imperial | Krušovice | Lager | nein |
| Krušovice Černé | Krušovice | Dunkel | nein |
| Kozel Premium | Velkopopovický Kozel | Lager | nein |
| Kozel Černý | Velkopopovický Kozel | Dunkel | nein |
| Bernard Světlý Ležák | Bernard | Lager | nein |
| Bernard Free | Bernard | Lager | ja |
| Gambrinus Originál | Gambrinus | Lager | nein |
| Radegast Originál | Radegast | Lager | nein |
| Svijany Máz | Svijany | Lager | nein |
| Starobrno Medium | Starobrno | Lager | nein |

## Niederlande

| Bier | Brauerei/Marke | Sorte | Alkoholfrei |
|---|---|---|---|
| Heineken Lager | Heineken | Lager | nein |
| Heineken 0.0 | Heineken | Lager | ja |
| Heineken Silver | Heineken | Lager | nein |
| Amstel Lager | Amstel | Lager | nein |
| Amstel Radler | Amstel | Radler | nein |
| Amstel 0.0 | Amstel | Lager | ja |
| Grolsch Premium Pilsner | Grolsch | Pils | nein |
| Bavaria Premium | Bavaria | Pils | nein |
| Bavaria 0.0 | Bavaria | Pils | ja |
| Hertog Jan Pilsener | Hertog Jan | Pils | nein |
| Brand Pilsener | Brand | Pils | nein |
| La Trappe Blond | La Trappe | Belgisches Blond | nein |
| La Trappe Dubbel | La Trappe | Dubbel | nein |
| La Trappe Tripel | La Trappe | Tripel | nein |
| La Trappe Quadrupel | La Trappe | Quadrupel | nein |
| Desperados Original | Desperados | Biermischgetränk | nein |

## Belgien

| Bier | Brauerei/Marke | Sorte | Alkoholfrei |
|---|---|---|---|
| Stella Artois | Stella Artois | Lager | nein |
| Jupiler | Jupiler | Lager | nein |
| Jupiler 0,0% | Jupiler | Lager | ja |
| Leffe Blonde | Leffe | Belgisches Blond | nein |
| Leffe Brune | Leffe | Dubbel | nein |
| Leffe Ruby | Leffe | Fruchtbier | nein |
| Leffe Triple | Leffe | Tripel | nein |
| Hoegaarden Witbier | Hoegaarden | Witbier | nein |
| Hoegaarden Rosée | Hoegaarden | Fruchtbier | nein |
| Hoegaarden 0,0 | Hoegaarden | Witbier | ja |
| Duvel | Duvel Moortgat | Belgisches Strong Golden Ale | nein |
| Vedett Extra Blond | Duvel Moortgat | Lager | nein |
| Chimay Rouge | Chimay | Dubbel | nein |
| Chimay Bleue | Chimay | Quadrupel | nein |
| Chimay Triple | Chimay | Tripel | nein |
| Westmalle Dubbel | Westmalle | Dubbel | nein |
| Westmalle Tripel | Westmalle | Tripel | nein |
| Orval | Orval | Trappistenbier | nein |
| Rochefort 6 | Rochefort | Trappistenbier | nein |
| Rochefort 8 | Rochefort | Trappistenbier | nein |
| Rochefort 10 | Rochefort | Quadrupel | nein |
| Westvleteren 12 | Westvleteren | Quadrupel | nein |
| Westvleteren 8 | Westvleteren | Dubbel | nein |
| Westvleteren Blond | Westvleteren | Belgisches Blond | nein |
| St. Bernardus Abt 12 | St. Bernardus | Quadrupel | nein |
| St. Bernardus Tripel | St. Bernardus | Tripel | nein |
| La Chouffe Blonde | Brasserie d'Achouffe | Belgisches Strong Golden Ale | nein |
| McChouffe | Brasserie d'Achouffe | Belgisches Strong Dark Ale | nein |
| Houblon Chouffe | Brasserie d'Achouffe | IPA | nein |
| Delirium Tremens | Huyghe | Belgisches Strong Golden Ale | nein |
| Delirium Nocturnum | Huyghe | Belgisches Strong Dark Ale | nein |
| Pauwel Kwak | Bosteels | Belgisches Amber | nein |
| Tripel Karmeliet | Bosteels | Tripel | nein |
| Grimbergen Blonde | Grimbergen | Belgisches Blond | nein |
| Grimbergen Double | Grimbergen | Dubbel | nein |
| Affligem Blond | Affligem | Belgisches Blond | nein |
| Affligem Dubbel | Affligem | Dubbel | nein |
| Affligem Tripel | Affligem | Tripel | nein |
| Kasteel Rouge | Van Honsebrouck | Fruchtbier | nein |
| Kasteel Donker | Van Honsebrouck | Quadrupel | nein |
| Lindemans Kriek | Lindemans | Lambic | nein |
| Lindemans Framboise | Lindemans | Lambic | nein |
| Liefmans Fruitesse | Liefmans | Fruchtbier | nein |
| Gulden Draak | Van Steenberge | Belgisches Strong Dark Ale | nein |
| Brugse Zot Blond | De Halve Maan | Belgisches Blond | nein |
| Brugse Zot Dubbel | De Halve Maan | Dubbel | nein |
| Straffe Hendrik Tripel | De Halve Maan | Tripel | nein |
| Rodenbach Classic | Rodenbach | Flämisches Rotbier | nein |
| Mort Subite Kriek | Mort Subite | Lambic | nein |
| Maes Pils | Maes | Pils | nein |
| Primus Pils | Primus | Pils | nein |

## Dänemark

| Bier | Brauerei/Marke | Sorte | Alkoholfrei |
|---|---|---|---|
| Carlsberg Pilsner | Carlsberg | Pils | nein |
| Carlsberg 0.0 | Carlsberg | Pils | ja |
| Tuborg Grøn | Tuborg | Pils | nein |
| Faxe Premium | Faxe | Lager | nein |

## Großbritannien & Irland

| Bier | Brauerei/Marke | Sorte | Alkoholfrei |
|---|---|---|---|
| Guinness Draught | Guinness | Stout | nein |
| Guinness Extra Stout | Guinness | Stout | nein |
| Guinness Foreign Extra Stout | Guinness | Stout | nein |
| Guinness 0.0 | Guinness | Stout | ja |
| Kilkenny Irish Red Ale | Kilkenny | Red Ale | nein |
| Murphy's Irish Stout | Murphy's | Stout | nein |
| Beamish Irish Stout | Beamish | Stout | nein |
| Smithwick's Red Ale | Smithwick's | Red Ale | nein |
| Harp Lager | Harp | Lager | nein |
| Newcastle Brown Ale | Newcastle | Brown Ale | nein |
| Bass Pale Ale | Bass | Pale Ale | nein |
| Boddingtons Pub Ale | Boddingtons | Bitter | nein |
| Fuller's London Pride | Fuller's | Bitter | nein |
| Fuller's ESB | Fuller's | Bitter | nein |
| Old Speckled Hen | Greene King | Bitter | nein |
| Hobgoblin | Wychwood | Ruby Ale | nein |
| Bishops Finger | Shepherd Neame | Bitter | nein |
| Spitfire | Shepherd Neame | Bitter | nein |
| Theakston Old Peculier | Theakston | Old Ale | nein |
| Tennent's Lager | Tennent's | Lager | nein |
| Belhaven Scottish Ale | Belhaven | Scottish Ale | nein |
| BrewDog Punk IPA | BrewDog | IPA | nein |
| BrewDog Hazy Jane | BrewDog | NEIPA | nein |
| BrewDog Elvis Juice | BrewDog | IPA | nein |
| BrewDog Dead Pony Club | BrewDog | Pale Ale | nein |
| BrewDog Lost Lager | BrewDog | Lager | nein |
| BrewDog Punk AF | BrewDog | IPA | ja |

## USA & Kanada

| Bier | Brauerei/Marke | Sorte | Alkoholfrei |
|---|---|---|---|
| Budweiser | Anheuser-Busch | Lager | nein |
| Bud Light | Anheuser-Busch | Leichtbier | nein |
| Michelob Ultra | Anheuser-Busch | Leichtbier | nein |
| Miller Genuine Draft | Miller | Lager | nein |
| Miller Lite | Miller | Leichtbier | nein |
| Coors Light | Coors | Leichtbier | nein |
| Pabst Blue Ribbon | Pabst | Lager | nein |
| Samuel Adams Boston Lager | Samuel Adams | Lager | nein |
| Sierra Nevada Pale Ale | Sierra Nevada | Pale Ale | nein |
| Sierra Nevada Torpedo | Sierra Nevada | IPA | nein |
| Brooklyn Lager | Brooklyn Brewery | Lager | nein |
| Brooklyn East IPA | Brooklyn Brewery | IPA | nein |
| Blue Moon Belgian White | Blue Moon | Witbier | nein |
| Lagunitas IPA | Lagunitas | IPA | nein |
| Goose Island IPA | Goose Island | IPA | nein |
| Stone IPA | Stone | IPA | nein |
| Molson Canadian | Molson | Lager | nein |
| Labatt Blue | Labatt | Lager | nein |
| Moosehead Lager | Moosehead | Lager | nein |
| Budweiser Zero | Anheuser-Busch | Lager | ja |
| Busch Light | Anheuser-Busch | Leichtbier | nein |
| Natural Light | Anheuser-Busch | Leichtbier | nein |
| Michelob Amber Bock | Anheuser-Busch | Bock | nein |
| Coors Banquet | Molson Coors (USA) | Lager | nein |
| Miller High Life | Molson Coors (USA) | Lager | nein |
| Keystone Light | Molson Coors (USA) | Leichtbier | nein |
| Leinenkugel's Summer Shandy | Molson Coors (USA) | Radler | nein |
| Yuengling Traditional Lager | Yuengling | Amber Lager | nein |
| Yuengling Light Lager | Yuengling | Leichtbier | nein |
| Shiner Bock | Spoetzl | Bock | nein |
| Rolling Rock Extra Pale | Rolling Rock | Lager | nein |
| Samuel Adams Cold Snap | Samuel Adams | Witbier | nein |
| Samuel Adams Octoberfest | Samuel Adams | Märzen | nein |
| Sierra Nevada Hazy Little Thing | Sierra Nevada | NEIPA | nein |
| Sierra Nevada Celebration | Sierra Nevada | IPA | nein |
| Sierra Nevada Kellerweis | Sierra Nevada | Hefeweizen | nein |
| Dogfish Head 60 Minute IPA | Dogfish Head | IPA | nein |
| Dogfish Head 90 Minute IPA | Dogfish Head | Double IPA | nein |
| Bell's Two Hearted | Bell's | IPA | nein |
| Bell's Oberon | Bell's | Weizen | nein |
| Founders All Day IPA | Founders | Session IPA | nein |
| Founders Breakfast Stout | Founders | Stout | nein |
| Founders KBS | Founders | Imperial Stout | nein |
| New Belgium Fat Tire | New Belgium | Amber Ale | nein |
| Voodoo Ranger IPA | New Belgium | IPA | nein |
| Deschutes Fresh Squeezed IPA | Deschutes | IPA | nein |
| Deschutes Black Butte Porter | Deschutes | Porter | nein |
| Ballast Point Sculpin | Ballast Point | IPA | nein |
| Firestone Walker 805 | Firestone Walker | Blonde Ale | nein |
| Firestone Walker Union Jack | Firestone Walker | IPA | nein |
| Pliny the Elder | Russian River | Double IPA | nein |
| Elysian Space Dust | Elysian | IPA | nein |
| Allagash White | Allagash | Witbier | nein |
| Stone Delicious IPA | Stone | IPA | nein |
| Arrogant Bastard Ale | Stone | Strong Ale | nein |
| Lagunitas Little Sumpin' Sumpin' | Lagunitas | Weizen | nein |
| Lagunitas DayTime | Lagunitas | Session IPA | nein |
| Goose Island 312 Urban Wheat | Goose Island | Weizen | nein |
| Goose Island Bourbon County Stout | Goose Island | Imperial Stout | nein |
| Great Lakes Edmund Fitzgerald | Great Lakes | Porter | nein |
| Great Lakes Dortmunder Gold | Great Lakes | Export | nein |
| Alaskan Amber | Alaskan | Amber Ale | nein |
| Tree House Julius | Tree House | NEIPA | nein |
| Athletic Run Wild IPA | Athletic Brewing | IPA | ja |
| Athletic Free Wave | Athletic Brewing | IPA | ja |
| Sleeman Cream Ale | Sleeman (Kanada) | Cream Ale | nein |
| Alexander Keith's India Pale Ale | Alexander Keith's (Kanada) | Pale Ale | nein |
| Kokanee | Kokanee (Kanada) | Lager | nein |
| La Fin du Monde | Unibroue (Kanada) | Tripel | nein |
| Blanche de Chambly | Unibroue (Kanada) | Witbier | nein |
| Maudite | Unibroue (Kanada) | Belgisches Strong Dark Ale | nein |
| Molson Export | Molson | Ale | nein |

## Mexiko & Lateinamerika

| Bier | Brauerei/Marke | Sorte | Alkoholfrei |
|---|---|---|---|
| Corona Extra | Corona | Lager | nein |
| Corona Cero | Corona | Lager | ja |
| Modelo Especial | Modelo | Lager | nein |
| Negra Modelo | Modelo | Dunkel | nein |
| Dos Equis Lager | Dos Equis | Lager | nein |
| Sol | Sol | Lager | nein |
| Pacífico Clara | Pacífico | Lager | nein |
| Tecate | Tecate | Lager | nein |
| Bohemia Clásica | Bohemia | Pils | nein |
| Victoria | Victoria | Lager | nein |
| Brahma | Brahma | Lager | nein |
| Quilmes Clásica | Quilmes | Lager | nein |
| Cusqueña Dorada | Cusqueña | Lager | nein |
| Red Stripe | Red Stripe | Lager | nein |
| Corona Premier | Corona | Leichtbier | nein |
| Coronita | Corona | Lager | nein |
| Estrella Jalisco | Grupo Modelo | Lager | nein |
| Montejo | Grupo Modelo | Lager | nein |
| Barrilito | Grupo Modelo | Lager | nein |
| Victoria Chelada | Grupo Modelo | Biermischgetränk | nein |
| Indio | Cuauhtémoc Moctezuma | Dunkles Lager | nein |
| Carta Blanca | Cuauhtémoc Moctezuma | Lager | nein |
| Bohemia Oscura | Cuauhtémoc Moctezuma | Dunkel | nein |
| Polar Pilsen | Polar (Venezuela) | Pils | nein |
| Solera Verde | Polar (Venezuela) | Lager | nein |
| Club Colombia Dorada | Bavaria (Kolumbien) | Lager | nein |
| Águila | Bavaria (Kolumbien) | Lager | nein |
| Poker | Bavaria (Kolumbien) | Lager | nein |
| Pilsener (Ecuador) | Cervecería Nacional (Ecuador) | Pils | nein |
| Club Premium (Ecuador) | Cervecería Nacional (Ecuador) | Lager | nein |
| Cristal (Peru) | Backus (Peru) | Lager | nein |
| Pilsen Callao | Backus (Peru) | Pils | nein |
| Paceña | Paceña (Bolivien) | Lager | nein |
| Huari | Paceña (Bolivien) | Lager | nein |
| Skol (Brasilien) | Ambev (Brasilien) | Lager | nein |
| Antarctica Original | Ambev (Brasilien) | Lager | nein |
| Brahma Duplo Malte | Ambev (Brasilien) | Lager | nein |
| Eisenbahn Pilsen | Heineken Brasil | Pils | nein |
| Itaipava | Heineken Brasil | Lager | nein |
| Patagonia Amber Lager | Quilmes | Amber Lager | nein |
| Andes Origen Rubia | Quilmes | Lager | nein |
| Isenbeck | Quilmes | Lager | nein |
| Cristal (Chile) | CCU (Chile) | Lager | nein |
| Escudo | CCU (Chile) | Lager | nein |
| Kunstmann Torobayo | CCU (Chile) | Ale | nein |
| Austral Lager | CCU (Chile) | Lager | nein |
| Imperial (Costa Rica) | Florida Bebidas (Costa Rica) | Lager | nein |
| Pilsen (Costa Rica) | Florida Bebidas (Costa Rica) | Pils | nein |
| Toña | Compañía Cervecera de Nicaragua | Lager | nein |
| Victoria Frost | Compañía Cervecera de Nicaragua | Lager | nein |
| Salva Vida | Cervecería Hondureña | Lager | nein |
| Port Royal | Cervecería Hondureña | Lager | nein |
| Gallo | Cervecería Centro Americana (Guatemala) | Lager | nein |
| Moza | Cervecería Centro Americana (Guatemala) | Bock | nein |
| Panamá | Cervecería Nacional (Panama) | Lager | nein |
| Balboa | Cervecería Nacional (Panama) | Lager | nein |
| Atlas | Cervecería Nacional (Panama) | Lager | nein |

## Südeuropa

| Bier | Brauerei/Marke | Sorte | Alkoholfrei |
|---|---|---|---|
| Peroni Nastro Azzurro | Peroni | Lager | nein |
| Peroni Nastro Azzurro 0.0 | Peroni | Lager | ja |
| Peroni Gran Riserva | Peroni | Lager | nein |
| Birra Moretti L'Autentica | Birra Moretti | Lager | nein |
| Birra Moretti La Rossa | Birra Moretti | Doppelbock | nein |
| Birra Moretti Zero | Birra Moretti | Lager | ja |
| Menabrea Bionda | Menabrea | Lager | nein |
| Ichnusa | Ichnusa | Lager | nein |
| Forst Premium | Forst | Lager | nein |
| Estrella Damm | Estrella Damm | Lager | nein |
| Estrella Galicia Especial | Estrella Galicia | Lager | nein |
| Mahou Cinco Estrellas | Mahou | Lager | nein |
| San Miguel Especial | San Miguel | Lager | nein |
| Alhambra Reserva 1925 | Alhambra | Lager | nein |
| Cruzcampo | Cruzcampo | Lager | nein |
| Super Bock | Super Bock | Lager | nein |
| Sagres | Sagres | Lager | nein |
| Mythos | Mythos | Lager | nein |
| Efes Pilsener | Efes | Pils | nein |

## Frankreich

| Bier | Brauerei/Marke | Sorte | Alkoholfrei |
|---|---|---|---|
| Kronenbourg 1664 | Kronenbourg | Lager | nein |
| 1664 Blanc | Kronenbourg | Witbier | nein |
| Pelforth Brune | Pelforth | Belgisches Strong Dark Ale | nein |
| Fischer Tradition | Fischer | Lager | nein |

## Osteuropa & Baltikum

| Bier | Brauerei/Marke | Sorte | Alkoholfrei |
|---|---|---|---|
| Żywiec | Żywiec | Lager | nein |
| Tyskie Gronie | Tyskie | Lager | nein |
| Lech Premium | Lech | Lager | nein |
| Okocim | Okocim | Lager | nein |
| Warka | Warka | Lager | nein |
| Karlovačko | Karlovačko | Lager | nein |
| Ožujsko | Ožujsko | Lager | nein |
| Jelen Pivo | Jelen | Lager | nein |
| Laško Zlatorog | Laško | Lager | nein |
| Union Svetlo | Union | Lager | nein |
| Dreher Classic | Dreher | Lager | nein |
| Ursus Premium | Ursus | Lager | nein |
| Obolon Premium | Obolon | Lager | nein |
| Švyturys Ekstra | Švyturys | Lager | nein |
| Saku Originaal | Saku | Lager | nein |
| Baltika No. 7 | Baltika | Lager | nein |

## Nordeuropa

| Bier | Brauerei/Marke | Sorte | Alkoholfrei |
|---|---|---|---|
| Ringnes Pilsner | Ringnes | Pils | nein |
| Spendrups Original | Spendrups | Lager | nein |
| Mariestads Export | Mariestads | Lager | nein |
| Lapin Kulta | Lapin Kulta | Lager | nein |
| Karhu III | Karhu | Lager | nein |
| Einstök Icelandic White Ale | Einstök | Witbier | nein |

## Asien & Ozeanien

| Bier | Brauerei/Marke | Sorte | Alkoholfrei |
|---|---|---|---|
| Asahi Super Dry | Asahi | Lager | nein |
| Kirin Ichiban | Kirin | Lager | nein |
| Sapporo Premium | Sapporo | Lager | nein |
| Orion Draft | Orion | Lager | nein |
| Tsingtao | Tsingtao | Lager | nein |
| Singha | Singha | Lager | nein |
| Chang Classic | Chang | Lager | nein |
| Leo | Leo | Lager | nein |
| Tiger Lager | Tiger | Lager | nein |
| San Miguel Pale Pilsen | San Miguel (Philippinen) | Pils | nein |
| Kingfisher Premium | Kingfisher | Lager | nein |
| Cobra | Cobra | Lager | nein |
| Saigon Special | Saigon | Lager | nein |
| Foster's Lager | Foster's | Lager | nein |
| Victoria Bitter | Victoria Bitter | Lager | nein |
| Coopers Pale Ale | Coopers | Pale Ale | nein |
| XXXX Gold | XXXX | Lager | nein |
| Carlton Draught | Carlton | Lager | nein |
| Steinlager Classic | Steinlager | Lager | nein |
| Asahi Dry Zero | Asahi | Lager | ja |
| Kirin Lager | Kirin | Lager | nein |
| Yebisu | Sapporo | Lager | nein |
| Sapporo Black Label | Sapporo | Lager | nein |
| Suntory The Premium Malt's | Suntory | Pils | nein |
| Hite | Hite Jinro (Südkorea) | Lager | nein |
| Terra | Hite Jinro (Südkorea) | Lager | nein |
| Cass Fresh | Oriental Brewery (Südkorea) | Lager | nein |
| Kloud | Lotte (Südkorea) | Lager | nein |
| Snow | China Resources Snow | Lager | nein |
| Harbin | Harbin | Lager | nein |
| Yanjing | Yanjing | Lager | nein |
| Taiwan Beer Classic | Taiwan Tobacco & Liquor | Lager | nein |
| Beerlao Lager | Lao Brewery | Lager | nein |
| Beerlao Dark | Lao Brewery | Dunkel | nein |
| Angkor | Cambrew (Kambodscha) | Lager | nein |
| Myanmar Beer | Myanmar Brewery | Lager | nein |
| 333 | Sabeco (Vietnam) | Lager | nein |
| Bia Hà Nội | Habeco (Vietnam) | Lager | nein |
| Larue | Heineken Vietnam | Lager | nein |
| Bintang Pilsener | Multi Bintang (Indonesien) | Pils | nein |
| Bintang Radler | Multi Bintang (Indonesien) | Radler | nein |
| Red Horse | San Miguel Brewery (Philippinen) | Starkbier | nein |
| San Mig Light | San Miguel Brewery (Philippinen) | Leichtbier | nein |
| Bira 91 White | Bira 91 (Indien) | Witbier | nein |
| Bira 91 Blonde | Bira 91 (Indien) | Lager | nein |
| Kingfisher Strong | United Breweries (Indien) | Starkbier | nein |
| Haywards 5000 | SABMiller India | Starkbier | nein |
| Gorkha | Gorkha Brewery (Nepal) | Lager | nein |
| Everest | Gorkha Brewery (Nepal) | Lager | nein |
| Lion Lager (Sri Lanka) | Lion Brewery (Sri Lanka) | Lager | nein |
| Lion Stout | Lion Brewery (Sri Lanka) | Stout | nein |
| Tooheys New | Tooheys (Australien) | Lager | nein |
| James Squire One Fifty Lashes | Lion (Australien) | Pale Ale | nein |
| Little Creatures Pale Ale | Lion (Australien) | Pale Ale | nein |
| Hahn SuperDry | Lion (Australien) | Lager | nein |
| Great Northern Original | Carlton & United (Australien) | Lager | nein |
| Pure Blonde | Carlton & United (Australien) | Leichtbier | nein |
| Cascade Premium Light | Carlton & United (Australien) | Leichtbier | nein |
| Stone & Wood Pacific Ale | Stone & Wood (Australien) | Pale Ale | nein |
| James Boag's Premium Lager | Boag's (Australien) | Lager | nein |
| Speight's Gold Medal Ale | Lion (Neuseeland) | Ale | nein |
| Monteith's Original | Lion (Neuseeland) | Ale | nein |
| Tui East India Pale Ale | DB Breweries (Neuseeland) | Lager | nein |
| Export Gold | DB Breweries (Neuseeland) | Lager | nein |
| Fiji Bitter | Paradise Beverages (Fidschi) | Lager | nein |
| Fiji Gold | Paradise Beverages (Fidschi) | Lager | nein |
| Vailima | Vailima (Samoa) | Lager | nein |
| Hinano | Hinano (Tahiti) | Lager | nein |
| SP Lager | SP Brewery (Papua-Neuguinea) | Lager | nein |

## Nordafrika & Naher Osten

| Bier | Brauerei/Marke | Sorte | Alkoholfrei |
|---|---|---|---|
| Stella (Ägypten) | Al Ahram Beverages (Ägypten) | Lager | nein |
| Sakara Gold | Al Ahram Beverages (Ägypten) | Lager | nein |
| Sakara King | Al Ahram Beverages (Ägypten) | Starkbier | nein |
| Meister Max | Al Ahram Beverages (Ägypten) | Starkbier | nein |
| Birell (Ägypten) | Al Ahram Beverages (Ägypten) | Lager | ja |
| Casablanca Beer | Brasseries du Maroc (Marokko) | Lager | nein |
| Flag Spéciale | Brasseries du Maroc (Marokko) | Lager | nein |
| Stork | Brasseries du Maroc (Marokko) | Lager | nein |
| Celtia | SFBT (Tunesien) | Lager | nein |
| Tango | Tango (Algerien) | Lager | nein |
| Almaza Pilsener | Almaza (Libanon) | Pils | nein |
| Almaza Light | Almaza (Libanon) | Leichtbier | nein |
| Beirut Beer | Beirut Beer (Libanon) | Lager | nein |
| Petra Original | Petra (Jordanien) | Lager | nein |
| Carakale Blonde Ale | Carakale (Jordanien) | Blonde Ale | nein |
| Goldstar | Tempo (Israel) | Dunkles Lager | nein |
| Maccabee | Tempo (Israel) | Lager | nein |
| Taybeh Golden | Taybeh (Palästina) | Lager | nein |
| Taybeh Amber | Taybeh (Palästina) | Amber | nein |
| Taybeh Dark | Taybeh (Palästina) | Dunkel | nein |
| Taybeh Non-Alcoholic | Taybeh (Palästina) | Lager | ja |

## Afrika (südlich der Sahara)

| Bier | Brauerei/Marke | Sorte | Alkoholfrei |
|---|---|---|---|
| Tusker Lager | Tusker (Kenia) | Lager | nein |
| Tusker Malt | Tusker (Kenia) | Lager | nein |
| White Cap Lager | East African Breweries (Kenia) | Lager | nein |
| Serengeti Premium Lager | Serengeti Breweries (Tansania) | Lager | nein |
| Kilimanjaro Premium Lager | Tanzania Breweries | Lager | nein |
| Safari Lager | Tanzania Breweries | Lager | nein |
| Nile Special | Nile Breweries (Uganda) | Lager | nein |
| Bell Lager | Uganda Breweries | Lager | nein |
| St. George | BGI (Äthiopien) | Lager | nein |
| Habesha Cold Gold | Habesha (Äthiopien) | Lager | nein |
| Meta Premium | Meta (Äthiopien) | Lager | nein |
| Bedele Special | Bedele (Äthiopien) | Lager | nein |
| Walia | Dashen (Äthiopien) | Lager | nein |
| Star Lager | Nigerian Breweries | Lager | nein |
| Gulder | Nigerian Breweries | Lager | nein |
| Life Continental | Nigerian Breweries | Lager | nein |
| Goldberg | Nigerian Breweries | Lager | nein |
| Trophy Lager | International Breweries (Nigeria) | Lager | nein |
| Hero Lager | International Breweries (Nigeria) | Lager | nein |
| Club Premium Lager | Accra Brewery (Ghana) | Lager | nein |
| 33 Export | Société Anonyme des Brasseries du Cameroun | Lager | nein |
| Castel Beer | Société Anonyme des Brasseries du Cameroun | Lager | nein |
| Mützig (Kamerun) | Société Anonyme des Brasseries du Cameroun | Lager | nein |
| Primus (Ruanda) | Bralirwa (Ruanda) | Lager | nein |
| Mützig (Ruanda) | Bralirwa (Ruanda) | Lager | nein |
| Primus (Kongo) | Bralima (Kongo) | Lager | nein |
| Skol (Kongo) | Bralima (Kongo) | Lager | nein |
| Castle Lager | SAB (Südafrika) | Lager | nein |
| Castle Lite | SAB (Südafrika) | Leichtbier | nein |
| Castle Milk Stout | SAB (Südafrika) | Stout | nein |
| Carling Black Label | SAB (Südafrika) | Lager | nein |
| Hansa Pilsener (Südafrika) | SAB (Südafrika) | Pils | nein |
| Lion Lager (Südafrika) | SAB (Südafrika) | Lager | nein |
| Windhoek Lager | Namibia Breweries | Lager | nein |
| Windhoek Draught | Namibia Breweries | Lager | nein |
| Tafel Lager | Namibia Breweries | Lager | nein |
| Mosi Lager | Zambian Breweries | Lager | nein |
| Zambezi Lager | Delta Beverages (Simbabwe) | Lager | nein |
| 2M | Cervejas de Moçambique | Lager | nein |
| Laurentina Preta | Cervejas de Moçambique | Dunkel | nein |
| Laurentina Clara | Cervejas de Moçambique | Lager | nein |
| Three Horses Beer (THB) | Star (Madagaskar) | Lager | nein |
| Phoenix Beer | Phoenix Beverages (Mauritius) | Lager | nein |
| Gazelle | SOBOA (Senegal) | Lager | nein |
| Flag (Senegal) | SOBOA (Senegal) | Lager | nein |

## Karibik

| Bier | Brauerei/Marke | Sorte | Alkoholfrei |
|---|---|---|---|
| Presidente | Cervecería Nacional Dominicana | Pils | nein |
| Carib Lager | Carib Brewery (Trinidad) | Lager | nein |
| Stag | Carib Brewery (Trinidad) | Lager | nein |
| Kalik | Commonwealth Brewery (Bahamas) | Lager | nein |
| Banks Beer | Banks (Barbados) | Lager | nein |
| Prestige | Brasserie Nationale d'Haïti | Lager | nein |
| Medalla Light | Cervecería India (Puerto Rico) | Leichtbier | nein |
| Cristal (Kuba) | Cervecería Bucanero (Kuba) | Lager | nein |
| Bucanero Fuerte | Cervecería Bucanero (Kuba) | Starkbier | nein |
| Dragon Stout | Red Stripe | Stout | nein |

## Weiteres Europa

| Bier | Brauerei/Marke | Sorte | Alkoholfrei |
|---|---|---|---|
| Hop House 13 | Guinness | Lager | nein |
| Bofferding Pils | Bofferding (Luxemburg) | Pils | nein |
| Diekirch Premium | Diekirch (Luxemburg) | Pils | nein |
| Cisk Lager | Simonds Farsons Cisk (Malta) | Lager | nein |
| Keo | Keo (Zypern) | Lager | nein |
| Fix Hellas | Fix (Griechenland) | Lager | nein |
| Alfa | Alfa (Griechenland) | Lager | nein |
| Vergina Lager | Vergina (Griechenland) | Lager | nein |
| Zagorka | Zagorka (Bulgarien) | Lager | nein |
| Kamenitza | Zagorka (Bulgarien) | Lager | nein |
| Pirinsko | Zagorka (Bulgarien) | Lager | nein |
| Ciuc | Ursus Breweries (Rumänien) | Lager | nein |
| Timișoreana | Ursus Breweries (Rumänien) | Pils | nein |
| Bergenbier | Bergenbier (Rumänien) | Lager | nein |
| Borsodi | Borsodi (Ungarn) | Lager | nein |
| Soproni | Soproni (Ungarn) | Lager | nein |
| Zlatý Bažant | Heineken Slovensko | Lager | nein |
| Corgoň | Heineken Slovensko | Lager | nein |
| Šariš | Pivovar Šariš (Slowakei) | Lager | nein |
| Nikšićko | Trebjesa (Montenegro) | Lager | nein |
| Lav | Apatinska Pivara (Serbien) | Lager | nein |
| Sarajevsko | Sarajevska Pivara (Bosnien) | Lager | nein |
| Skopsko | Pivara Skopje (Nordmazedonien) | Lager | nein |
| Birra Tirana | Birra Tirana (Albanien) | Lager | nein |
| Birra Peja | Birra Peja (Kosovo) | Lager | nein |
| Aldaris Pilzenes | Aldaris (Lettland) | Pils | nein |
| Utenos | Utenos (Litauen) | Lager | nein |
| Volfas Engelman Rinktinis | Volfas Engelman (Litauen) | Lager | nein |
| A. Le Coq Premium | A. Le Coq (Estland) | Lager | nein |
| Olvi III | Olvi (Finnland) | Lager | nein |
| Sandels | Olvi (Finnland) | Lager | nein |
| Koff III | Sinebrychoff (Finnland) | Lager | nein |
| Sinebrychoff Porter | Sinebrychoff (Finnland) | Porter | nein |
| Pripps Blå | Carlsberg Sverige | Lager | nein |
| Carnegie Porter | Carlsberg Sverige | Porter | nein |
| Norrlands Guld | Spendrups | Lager | nein |
| Mack Pilsner | Mack (Norwegen) | Pils | nein |
| Hansa Pilsner (Norwegen) | Hansa Borg (Norwegen) | Pils | nein |
| Albani Odense Pilsner | Albani (Dänemark) | Pils | nein |
| Royal Pilsner | Royal Unibrew (Dänemark) | Pils | nein |
| Gull (Färöer) | Föroya Bjór (Färöer) | Lager | nein |
| Egils Gull | Ölgerðin (Island) | Lager | nein |
| Víking Gylltur | Vífilfell (Island) | Lager | nein |
| Bomonti Filtresiz | Bomonti (Türkei) | Lager | nein |
| Natakhtari | Natakhtari (Georgien) | Lager | nein |
| Kotayk | Kotayk (Armenien) | Lager | nein |
