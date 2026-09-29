# PRD — BLACKSOLID Streamer-Shop

## Original-Problemstellung
HTML-Seite / Shop für Streamer (Overlays, Logos, Musik). Admin legt Angebote und Preise selbst fest. Bezahlung über PayPal. Design: Gaming / OBS / Streaming-Look (dunkel mit blauen Akzenten).

## Architektur
React SPA (Frontend) + FastAPI (Backend) + MongoDB. Custom JWT Admin-Auth. PayPal REST API (Live-Modus).

## Umgesetzt
- 2026-09: Shop-UI im dunklen Gaming-Look mit Neon-Akzenten, Produkt-Grid, Kategoriefilter
- 2026-09: Admin-Panel (Control Room) zum Bearbeiten von Angeboten und Preisen (JWT-geschützt)
- 2026-09: PayPal-Checkout (create-order / capture) mit Bestellungen in MongoDB
- 2026-09: FIX — PayPal 401 invalid_client behoben: Ursache waren Sandbox-Keys im Live-Modus; Live-Keys des Users hinterlegt, Live-Bestellung erfolgreich getestet (Order-ID + Approval-URL von paypal.com)
- 2026-09: REDESIGN — Award-Level Design-Upgrade: Unbounded/JetBrains Mono Typografie, Neon-Cyan auf Obsidian, Masked Line-Reveal Hero, 3D-Tilt/Parallax Hero-Frame mit HUD-Corners + Scanlines + Audio-EQ, langsamer Editorial-Marquee, Lenis Smooth Scrolling, framer-motion Scroll-Reveals, Cyber Clip-Path Frames, SVG-Favicon, neue Produktnamen (Signalframe / Blackmark / Nightdrive) mit kuratierten Bildern

## Personas
- Shop-Betreiber (Admin): pflegt Angebote/Preise
- Streamer (Kunde): kauft Overlays/Logos/Musik per PayPal

## Backlog
- P0: —
- P1: —
- P2: Produktbilder-Upload (Object Storage), Kunden-Konten mit Kaufhistorie

## Erledigt 2026-09 (zusätzlich)
- Admin: Angebote anlegen/löschen, Bestellübersicht mit Kundendaten + Zahlungsstatus, Kauf-E-Mail an Admin bei erfolgreicher PayPal-Zahlung (managed Resend)
- Google Sign-In für Admin (Emergent-managed OAuth, Admin-Allowlist = ADMIN_EMAIL, Passwort-Login bleibt Fallback). Test-Playbook: /app/auth_testing.md
- Claude-Integration vom User abgelehnt
- Warenkorb: Multi-Item-Cart (localStorage), Drawer mit Entfernen, „Kauf bestätigen" → ein PayPal-Order mit allen Items; Cart wird nach Zahlung geleert
- Kundenkonten: Google-Login für Kunden (role=customer), „Meine Bestellungen"-Ansicht, Kunde kann offene (unbezahlte) Bestellungen löschen, bezahlte bleiben; Logout löscht Server-Session
- Bild-Upload: Object Storage (Emergent), POST /api/admin/upload (nur Admin, max 8MB, JPG/PNG/WebP/GIF), Auslieferung via GET /api/files/{path}; Upload-Button im Create- und Edit-Formular mit Vorschau
- 2026-09: BUGFIX — „PayPal konnte die Bestellung nicht starten": Ursache waren vom User auf 0 € gesetzte Preise (PayPal lehnt 0-€-Orders ab). Fix: Backend blockt 0-€-Checkout mit klarer Meldung, Admin kann keinen Preis ≤ 0 mehr speichern (Validierung gt=0 + min=0.01 im Formular), Frontend zeigt Backend-Fehlertext statt Generik-Meldung
- 2026-09: Kostenlose Artikel: Preis 0 wieder erlaubt (ge=0), „Kostenlos anbieten"-Checkbox in Create/Edit; Shop zeigt „GRATIS". Reine Gratis-Bestellungen laufen ohne PayPal: sofort status=COMPLETED + FREE-ID, Kauf-E-Mail geht direkt an Admin (Lieferung manuell per Mail). Gemischte Warenkörbe: PayPal nur für bezahlte Items, Gratis-Items stehen in der Bestellung. Checkout-Button wechselt zu „Kostenlos bestellen"
- 2026-09: Bestell-Benachrichtigungen gehen an ORDER_EMAIL=venomsnaketwitch@gmail.com (env, Fallback ADMIN_EMAIL) – für PayPal- und Gratis-Bestellungen
- 2026-09: Kunden-Bestätigungsmail „Deine Bestellung ist in Arbeit" geht automatisch an die Kunden-E-Mail (Gratis: sofort bei Bestellung; PayPal: nach erfolgreichem Capture, nur einmal dank Status-Check). Template server-side, escaped, eigene Brand
- 2026-09: Versand-Center im Control Room (Tab „Versand"): Bestellung auswählen → Kunden-E-Mail auto-ausgefüllt, Dateien anhängen (Upload erweitert: ZIP/MP3/WAV/OGG/MP4/PDF bis 50MB, Downloads mit Content-Disposition), Kunde bekommt Mail „Deine Bestellung ist fertig" mit Download-Links, Auftrag wird automatisch als erledigt markiert
- 2026-09: Admin-Bestellverwaltung: Bestellungen als erledigt markieren (POST /api/admin/orders/{id}/complete, Feld done) oder löschen (DELETE); neuer Tab „Erledigt" im Control Room mit Zählern (offen/erledigt)
- 2026-09: Checkout nur mit Google-Konto: create-order erzwingt Customer-JWT (401 für Gäste), Kunden-E-Mail kommt serverseitig aus dem Konto, Bestellung immer mit user_id. Frontend: „Kauf bestätigen" ohne Login öffnet Google-Login (Warenkorb bleibt erhalten), Checkout zeigt „Angemeldet als …", E-Mail-Feld gesperrt
- 2026-09: BUGFIX — „Angebote werden nicht angezeigt": Die Scroll-Reveal-Animation (framer-motion whileInView) blieb bei direktem Aufruf über #services-Anker hängen (Karten blieben unsichtbar opacity 0). Fix: Offer-Grid animiert jetzt zuverlässig beim Laden statt scroll-abhängig
- 2026-09: SALE-SYSTEM — REC-Uhr in der Nav ersetzt durch Sale-Countdown (db.settings.sale_ends_at, GET /api/settings public, PUT /api/admin/settings). Angebote haben discount (0-90%) + badge (NEU/BELIEBT/LIMITED); rabattierte Preise überall (Karte, Warenkorb, Checkout, PayPal-Order, E-Mail). Admin-Tab „Sale-Timer" mit datetime-picker. Preise auf 149/89/59 zurückgesetzt; Demo: -20% + NEU auf Overlay Pack, Timer +3 Tage (abschaltbar)
