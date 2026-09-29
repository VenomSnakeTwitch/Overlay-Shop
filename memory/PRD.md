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
