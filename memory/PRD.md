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
- P1: Bestellübersicht für Admin (Käufe einsehen), E-Mail-Benachrichtigung bei Kauf
- P2: Award-Level Redesign (kinetic hero, scroll reveals, smooth scrolling), Produktbilder-Upload, neue Angebote im Admin anlegen (aktuell nur bearbeiten)

## Nächste Tasks
- Design-Upgrade nach User-Freigabe
- Admin: Angebote hinzufügen/löschen
