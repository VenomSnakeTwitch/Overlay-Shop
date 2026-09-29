# BLACKSOLID Creative Supply — PRD

## Original problem statement
Erstelle mir eine HTML-Seite als Shop, wo ich für Streamer Overlays, Logos und Musik anbiete. Das aktuelle Angebot und die Preise sollen selbst festlegbar sein. Bezahlt werden soll über PayPal. Der Look soll Gaming-OBS-Streaming sein.

## Decisions
- Dark gaming / OBS visual language with blue and cyan accents.
- Public storefront with Stream Overlays, Logos & Branding, and Stream Music & Jingles.
- Protected admin Control Room for editing offer name, description and price.
- Customer name, email and brief collected before redirecting to PayPal Live.
- Currency: EUR.

## Architecture
- React frontend using the existing CRA stack and responsive CSS.
- FastAPI backend with Motor/MongoDB, JWT admin session, offer CRUD, and PayPal REST order/capture endpoints.
- PayPal secrets and admin credentials are environment-only; public frontend uses REACT_APP_BACKEND_URL.
- Offers are seeded idempotently on backend startup and MongoDB `_id` is excluded from API responses.

## Implemented
- High-impact BLACKSOLID storefront with hero, service filters, offer cards, workflow section and responsive mobile navigation.
- Three seeded offers, editable prices/descriptions, featured labels and category filtering.
- Admin login and protected Control Room editing flow.
- Checkout modal with customer details and PayPal Live approval redirect plus capture return handling.
- API error handling, EUR pricing, configurable PayPal return/cancel URLs, and non-blocking PayPal network calls.
- Test credentials documented in `test_credentials.md`.

## Prioritized backlog
- P0: Verify one live PayPal order end-to-end with a real customer transaction and confirm PayPal account/webhook settings.
- P1: Add an admin order list with customer details, payment status and export.
- P1: Add image upload/storage for custom offer artwork instead of remote image URLs.
- P2: Add automated order confirmation email and downloadable delivery links.