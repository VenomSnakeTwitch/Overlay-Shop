from fastapi import FastAPI, APIRouter, HTTPException, Header, Request, Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReturnDocument
from pydantic import BaseModel, Field
from pathlib import Path
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from html import escape
from html.parser import HTMLParser
from urllib.parse import urlparse
import os, uuid, logging, requests, jwt, asyncio, re, ipaddress, httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")
client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]
app = FastAPI()
api_router = APIRouter(prefix="/api")
JWT_SECRET = os.environ["JWT_SECRET"]
logger = logging.getLogger(__name__)

EMAIL_BASE_URL = "https://integrations.emergentagent.com"
EMAIL_KEY = os.environ["EMERGENT_EMAIL_KEY"]
EMAIL_FROM_NAME = os.environ["EMAIL_FROM_NAME"]
EMAIL_REPLY_TO = os.environ.get("EMAIL_REPLY_TO")

_SHORTENERS = ("bit.ly", "tinyurl.com", "t.co", "is.gd", "cutt.ly", "goo.gl", "rebrand.ly")
_CRED_ASK = ("reply with your password", "reply with the code", "send your password", "cvv",
             "send us your password", "enter your password below", "confirm your card number",
             "your full card number", "seed phrase", "recovery phrase", "verify your card",
             "social security number", "confirm your bank details")
_HOSTISH = re.compile(r"\b(?:https?://)?((?:[a-z0-9-]+\.)+[a-z]{2,})", re.I)

def _host_ok(host: str) -> bool:
    if not host or "xn--" in host:
        return False
    try:
        ipaddress.ip_address(host)
        return False
    except ValueError:
        pass
    return not any(host == s or host.endswith("." + s) for s in _SHORTENERS)

def _same_site(shown: str, real: str) -> bool:
    return shown == real or real.endswith("." + shown) or shown.endswith("." + real)

class _EmailScan(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags, self.urls, self.anchors = set(), [], []
        self._href, self._text = None, []
    def handle_starttag(self, tag, attrs):
        self.tags.add(tag.lower())
        self.urls += [v for k, v in attrs if k.lower() in ("href", "src") and v]
        if tag.lower() == "a":
            self._href = dict((k.lower(), v) for k, v in attrs).get("href")
            self._text = []
    def handle_data(self, data):
        if self._href is not None:
            self._text.append(data)
    def handle_endtag(self, tag):
        if tag.lower() == "a" and self._href is not None:
            self.anchors.append((self._href, "".join(self._text)))
            self._href, self._text = None, []

def _assert_safe_email(subject: str, html: str) -> None:
    scan = _EmailScan(); scan.feed(html)
    if scan.tags & {"form", "input", "textarea", "select"}:
        raise ValueError("No forms or input fields in email (G2)")
    body = f"{subject}\n{html}".lower()
    for p in _CRED_ASK:
        if p in body:
            raise ValueError(f"Email asks the recipient for credentials: {p!r} (G2)")
    for url in scan.urls:
        low = url.strip().lower()
        if low.startswith(("mailto:", "tel:", "cid:", "#")):
            continue
        if not low.startswith("https://"):
            raise ValueError(f"Email links/assets must be absolute https: {url!r} (G3)")
        host = urlparse(low).hostname or ""
        if not _host_ok(host) or urlparse(low).username is not None:
            raise ValueError(f"Shortened, numeric-host or credential-bearing URL: {url!r} (G3)")
    for href, text in scan.anchors:
        real = urlparse(href.strip().lower()).hostname or ""
        if not real:
            continue
        for m in _HOSTISH.finditer(text):
            if not _same_site(m.group(1).lower(), real):
                raise ValueError(f"Anchor text {m.group(1)!r} != real link host {real!r} (G3)")

async def send_email(*, to: str, subject: str, html: str, reply_to: Optional[str] = None) -> Optional[str]:
    _assert_safe_email(subject, html)
    payload = {"to": [to], "subject": subject, "html": html, "from_name": EMAIL_FROM_NAME}
    if reply_to or EMAIL_REPLY_TO:
        payload["contact_email"] = reply_to or EMAIL_REPLY_TO
    try:
        async with httpx.AsyncClient(timeout=30) as client_http:
            resp = await client_http.post(f"{EMAIL_BASE_URL}/api/v1/email/send", headers={"X-Email-Key": EMAIL_KEY}, json=payload)
        resp.raise_for_status()
        return resp.json().get("id")
    except Exception as e:
        logger.error(f"Email send error: {e}")
        return None

async def send_purchase_email(order: dict, offer: dict, order_id: str):
    c = order.get("customer", {})
    subject = f"Neue Bestellung: {offer['name']}"
    notes_row = (f'<tr><td style="padding:6px 0;color:#8B9BB4;font-size:13px">Notiz</td>'
                 f'<td style="padding:6px 0;font-size:13px">{escape(c.get("notes", ""))}</td></tr>') if c.get("notes") else ""
    html = (
        '<table role="presentation" width="100%" style="background:#07090E;padding:32px 0"><tr><td align="center">'
        '<table role="presentation" width="520" style="background:#0E121B;border:1px solid rgba(0,240,255,0.25);padding:32px;font-family:Arial,sans-serif;color:#F0F4F8">'
        '<tr><td><p style="font-size:11px;letter-spacing:3px;color:#00F0FF;margin:0 0 8px">BLACKSOLID / CONTROL ROOM</p>'
        '<h1 style="font-size:22px;margin:0 0 18px">Neue Bestellung eingegangen</h1>'
        f'<p style="font-size:14px;line-height:1.6;margin:0 0 20px">Ein Streamer hat <strong>{escape(offer["name"])}</strong> fuer '
        f'<strong>{offer["price"]:.2f} EUR</strong> bezahlt.</p>'
        '<table role="presentation" width="100%" style="border-top:1px solid rgba(0,240,255,0.15)">'
        f'<tr><td style="padding:6px 0;color:#8B9BB4;font-size:13px">Kunde</td><td style="padding:6px 0;font-size:13px">{escape(c.get("name", ""))}</td></tr>'
        f'<tr><td style="padding:6px 0;color:#8B9BB4;font-size:13px">E-Mail</td><td style="padding:6px 0;font-size:13px">{escape(c.get("email", ""))}</td></tr>'
        f'{notes_row}'
        f'<tr><td style="padding:6px 0;color:#8B9BB4;font-size:13px">PayPal-Nr.</td><td style="padding:6px 0;font-size:13px">{escape(order_id)}</td></tr>'
        '</table>'
        f'<p style="font-size:11px;color:#8B9BB4;margin:24px 0 0">Gesendet von {escape(EMAIL_FROM_NAME)}. Wir fragen niemals nach Passwoertern oder Kartendaten per E-Mail.</p>'
        '</td></tr></table></td></tr></table>'
    )
    return await send_email(to=os.environ["ADMIN_EMAIL"], subject=subject, html=html)

class Offer(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    price: float
    category: str
    image: str
    featured: bool = False
    active: bool = True

class Login(BaseModel):
    email: str
    password: str

class GoogleSession(BaseModel):
    session_id: str

class Customer(BaseModel):
    offer_id: str
    name: str
    email: str
    notes: str = ""

class OfferUpdate(BaseModel):
    name: str
    description: str
    price: float
    category: str
    image: str
    featured: bool = False
    active: bool = True

def admin_token() -> str:
    return jwt.encode({"sub": "admin", "exp": datetime.now(timezone.utc) + timedelta(hours=8)}, JWT_SECRET, algorithm="HS256")

def require_admin(authorization: Optional[str]):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Admin-Anmeldung erforderlich")
    try:
        payload = jwt.decode(authorization.split(" ", 1)[1], JWT_SECRET, algorithms=["HS256"])
        if payload.get("sub") != "admin": raise ValueError()
    except Exception:
        raise HTTPException(401, "Sitzung abgelaufen")

async def seed_offers():
    if await db.offers.count_documents({}) == 0:
        await db.offers.insert_many([
            {"id": "overlay-pack", "name": "Signalframe Overlay Pack", "description": "Ein komplettes, animiertes OBS-Overlay für deinen nächsten Stream.", "price": 149, "category": "OVERLAYS", "image": "https://images.unsplash.com/photo-1636489953081-c4ebbd50fa3a?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NTZ8MHwxfHNlYXJjaHwzfHxnYW1pbmclMjBvdmVybGF5JTIwZXNwb3J0cyUyMHN0cmVhbWluZyUyMHNldHVwJTIwcmdiJTIwZGFyayUyMG5lb258ZW58MHx8fHwxNzkwNjg0ODgzfDA&ixlib=rb-4.1.0&q=85", "featured": True, "active": True},
            {"id": "brand-kit", "name": "Blackmark Brand Kit", "description": "Logo, Farben und Panels, die deinen Kanal unverwechselbar machen.", "price": 89, "category": "BRANDING", "image": "https://images.unsplash.com/photo-1620825937374-87fc7d6bddc2?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA4Mzl8MHwxfHNlYXJjaHxfHxlc3BvcnRzJTIwbG9nbyUyMHN0cmVhbWluZ3xlbnwwfHx8fDE3OTA2ODQ4ODN8MA&ixlib=rb-4.1.0&q=85", "featured": False, "active": True},
            {"id": "music-pack", "name": "Nightdrive Music Pack", "description": "Individuelle Jingles und Loops ohne Copyright-Stress für deine Show.", "price": 59, "category": "MUSIC", "image": "https://images.unsplash.com/photo-1518972559570-7cc1309f3229?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDN8MHwxfHNlYXJjaHwyfHxtdXNpYyUyMHByb2R1Y2VyJTIwc3R1ZGlvJTIwYXVkaW8lMjBuZW9uJTIwc3ludGhlc2l6ZXIlMjBnYW1pbmd8ZW58MHx8fHwxNzkwNjg0ODk2fDA&ixlib=rb-4.1.0&q=85", "featured": False, "active": True},
        ])

async def paypal_access_token():
    response = await asyncio.to_thread(requests.post, f"{os.environ['PAYPAL_BASE_URL']}/v1/oauth2/token", data={"grant_type": "client_credentials"}, auth=(os.environ["PAYPAL_CLIENT_ID"], os.environ["PAYPAL_SECRET"]), headers={"Accept": "application/json"})
    return response.json().get("access_token")

@app.on_event("startup")
async def startup(): await seed_offers()

@api_router.get("/offers", response_model=List[Offer])
async def offers(): return await db.offers.find({"active": True}, {"_id": 0}).to_list(100)

@api_router.post("/auth/login")
async def login(data: Login):
    if data.email.lower() != os.environ["ADMIN_EMAIL"].lower() or data.password != os.environ["ADMIN_PASSWORD"]:
        raise HTTPException(401, "E-Mail oder Passwort ist falsch")
    return {"token": admin_token(), "email": os.environ["ADMIN_EMAIL"]}

@api_router.post("/auth/google-session")
async def google_session(data: GoogleSession, response: Response):
    async with httpx.AsyncClient(timeout=30) as http_client:
        r = await http_client.get("https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data", headers={"X-Session-ID": data.session_id})
    if r.status_code != 200: raise HTTPException(401, "Google-Anmeldung fehlgeschlagen")
    g = r.json()
    if g.get("email", "").lower() != os.environ["ADMIN_EMAIL"].lower():
        raise HTTPException(403, "Dieses Google-Konto ist kein Admin")
    user = await db.users.find_one({"email": g["email"]}, {"_id": 0})
    if not user:
        user = {"user_id": f"user_{uuid.uuid4().hex[:12]}", "email": g["email"], "name": g.get("name", ""), "picture": g.get("picture", ""), "created_at": datetime.now(timezone.utc).isoformat()}
        await db.users.insert_one(dict(user))
    await db.user_sessions.insert_one({"user_id": user["user_id"], "session_token": g["session_token"], "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(), "created_at": datetime.now(timezone.utc).isoformat()})
    response.set_cookie("session_token", g["session_token"], path="/", secure=True, httponly=True, samesite="none", max_age=7 * 24 * 3600)
    return {"token": admin_token(), "email": g["email"], "name": g.get("name", "")}

@api_router.get("/auth/me")
async def auth_me(request: Request):
    token = request.cookies.get("session_token")
    auth = request.headers.get("authorization")
    if not token and auth and auth.startswith("Bearer "):
        token = auth.split(" ", 1)[1]
    if not token: raise HTTPException(401, "Nicht angemeldet")
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session: raise HTTPException(401, "Sitzung ungültig")
    expires_at = session["expires_at"]
    if isinstance(expires_at, str): expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None: expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc): raise HTTPException(401, "Sitzung abgelaufen")
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user or user["email"].lower() != os.environ["ADMIN_EMAIL"].lower(): raise HTTPException(403, "Kein Admin-Konto")
    return {"token": admin_token(), "email": user["email"], "name": user.get("name", "")}

@api_router.get("/admin/offers", response_model=List[Offer])
async def admin_offers(authorization: Optional[str] = Header(None)):
    require_admin(authorization); return await db.offers.find({}, {"_id": 0}).to_list(100)

@api_router.post("/admin/offers", response_model=Offer)
async def create_offer(data: OfferUpdate, authorization: Optional[str] = Header(None)):
    require_admin(authorization)
    offer = Offer(**data.model_dump())
    await db.offers.insert_one(offer.model_dump())
    return offer

@api_router.put("/admin/offers/{offer_id}", response_model=Offer)
async def update_offer(offer_id: str, data: OfferUpdate, authorization: Optional[str] = Header(None)):
    require_admin(authorization)
    result = await db.offers.find_one_and_update({"id": offer_id}, {"$set": data.model_dump()}, return_document=ReturnDocument.AFTER, projection={"_id": 0})
    if not result: raise HTTPException(404, "Angebot nicht gefunden")
    return result

@api_router.delete("/admin/offers/{offer_id}")
async def delete_offer(offer_id: str, authorization: Optional[str] = Header(None)):
    require_admin(authorization)
    result = await db.offers.delete_one({"id": offer_id})
    if result.deleted_count == 0: raise HTTPException(404, "Angebot nicht gefunden")
    return {"deleted": True}

@api_router.get("/admin/orders")
async def admin_orders(authorization: Optional[str] = Header(None)):
    require_admin(authorization)
    return await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)

@api_router.post("/paypal/create-order")
async def create_order(data: Customer):
    offer = await db.offers.find_one({"id": data.offer_id, "active": True}, {"_id": 0})
    if not offer: raise HTTPException(404, "Angebot nicht gefunden")
    token = await paypal_access_token()
    if not token: raise HTTPException(502, "PayPal konnte nicht erreicht werden")
    order_payload = {"intent": "CAPTURE", "purchase_units": [{"reference_id": offer["id"], "description": offer["name"], "amount": {"currency_code": "EUR", "value": f"{offer['price']:.2f}"}}], "application_context": {"brand_name": "BLACKSOLID", "user_action": "PAY_NOW", "return_url": os.environ["PAYPAL_RETURN_URL"], "cancel_url": os.environ["PAYPAL_CANCEL_URL"]}}
    order = await asyncio.to_thread(requests.post, f"{os.environ['PAYPAL_BASE_URL']}/v2/checkout/orders", json=order_payload, headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json", "Prefer": "return=representation"})
    if order.status_code >= 400: raise HTTPException(502, "PayPal-Bestellung konnte nicht erstellt werden")
    result = order.json(); await db.orders.insert_one({"paypal_id": result["id"], "offer_id": offer["id"], "offer_name": offer["name"], "price": offer["price"], "customer": data.model_dump(), "status": "created", "created_at": datetime.now(timezone.utc).isoformat()})
    approval = next((link["href"] for link in result.get("links", []) if link["rel"] == "approve"), None)
    return {"order_id": result["id"], "approval_url": approval}

@api_router.post("/paypal/capture/{order_id}")
async def capture_order(order_id: str):
    token = await paypal_access_token()
    response = await asyncio.to_thread(requests.post, f"{os.environ['PAYPAL_BASE_URL']}/v2/checkout/orders/{order_id}/capture", headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    if response.status_code >= 400: raise HTTPException(502, "Zahlung konnte nicht bestätigt werden")
    data = response.json(); status = data.get("status", "COMPLETED")
    await db.orders.update_one({"paypal_id": order_id}, {"$set": {"status": status}})
    if status == "COMPLETED":
        order = await db.orders.find_one({"paypal_id": order_id}, {"_id": 0})
        offer = await db.offers.find_one({"id": order["offer_id"]}, {"_id": 0}) if order else None
        if order and offer:
            try:
                await send_purchase_email(order, offer, order_id)
            except Exception as e:
                logger.error(f"Kauf-E-Mail fehlgeschlagen: {e}")
    return {"status": status}

app.include_router(api_router)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","), allow_methods=["*"], allow_headers=["*"])
@app.on_event("shutdown")
async def shutdown_db_client(): client.close()
