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
- 2026-09: BUGFIX — „Angebote werden nicht angezeigt": Die Scroll-Reveal-Animation (framer-motion whileInView) blieb bei direktem Aufruf über #services-Anker hängen (Karten blieben unsichtbar opacity 0). Fix: Offer-Grid animiert jetzt zuverlässig beim Laden statt scroll-abhängig
- 2026-09: SALE-SYSTEM — REC-Uhr in der Nav ersetzt durch Sale-Countdown (db.settings.sale_ends_at, GET /api/settings public, PUT /api/admin/settings). Angebote haben discount (0-90%) + badge (NEU/BELIEBT/LIMITED); rabattierte Preise überall (Karte, Warenkorb, Checkout, PayPal-Order, E-Mail). Admin-Tab „Sale-Timer" mit datetime-picker. Preise auf 149/89/59 zurückgesetzt; Demo: -20% + NEU auf Overlay Pack, Timer +3 Tage (abschaltbar)
