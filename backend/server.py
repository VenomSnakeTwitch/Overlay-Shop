from fastapi import FastAPI, APIRouter, HTTPException, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReturnDocument
from pydantic import BaseModel, Field
from pathlib import Path
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import os, uuid, logging, requests, jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")
client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]
app = FastAPI()
api_router = APIRouter(prefix="/api")
JWT_SECRET = os.environ["JWT_SECRET"]

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
            {"id": "overlay-pack", "name": "Stream Overlay Pack", "description": "Ein komplettes, animiertes OBS-Overlay für deinen nächsten Stream.", "price": 149, "category": "OVERLAYS", "image": "https://images.unsplash.com/photo-1696710257827-75e2e5954059?auto=format&fit=crop&w=1000&q=80", "featured": True, "active": True},
            {"id": "brand-kit", "name": "Logo & Brand Kit", "description": "Logo, Farben und Panels, die deinen Kanal unverwechselbar machen.", "price": 89, "category": "BRANDING", "image": "https://images.unsplash.com/photo-1548686304-5c3be888a00b?auto=format&fit=crop&w=1000&q=80", "featured": False, "active": True},
            {"id": "music-pack", "name": "Stream Music Pack", "description": "Individuelle Jingles und Loops ohne Copyright-Stress für deine Show.", "price": 59, "category": "MUSIC", "image": "https://images.unsplash.com/photo-1616681255209-368a2cd3e643?auto=format&fit=crop&w=1000&q=80", "featured": False, "active": True},
        ])

@app.on_event("startup")
async def startup(): await seed_offers()

@api_router.get("/offers", response_model=List[Offer])
async def offers(): return await db.offers.find({"active": True}, {"_id": 0}).to_list(100)

@api_router.post("/auth/login")
async def login(data: Login):
    if data.email.lower() != os.environ["ADMIN_EMAIL"].lower() or data.password != os.environ["ADMIN_PASSWORD"]:
        raise HTTPException(401, "E-Mail oder Passwort ist falsch")
    return {"token": admin_token(), "email": os.environ["ADMIN_EMAIL"]}

@api_router.get("/admin/offers", response_model=List[Offer])
async def admin_offers(authorization: Optional[str] = Header(None)):
    require_admin(authorization); return await db.offers.find({}, {"_id": 0}).to_list(100)

@api_router.put("/admin/offers/{offer_id}", response_model=Offer)
async def update_offer(offer_id: str, data: OfferUpdate, authorization: Optional[str] = Header(None)):
    require_admin(authorization)
    result = await db.offers.find_one_and_update({"id": offer_id}, {"$set": data.model_dump()}, return_document=ReturnDocument.AFTER, projection={"_id": 0})
    if not result: raise HTTPException(404, "Angebot nicht gefunden")
    return result

@api_router.post("/paypal/create-order")
async def create_order(data: Customer):
    offer = await db.offers.find_one({"id": data.offer_id, "active": True}, {"_id": 0})
    if not offer: raise HTTPException(404, "Angebot nicht gefunden")
    token = requests.post(f"{os.environ['PAYPAL_BASE_URL']}/v1/oauth2/token", data={"grant_type": "client_credentials"}, auth=(os.environ["PAYPAL_CLIENT_ID"], os.environ["PAYPAL_SECRET"]), headers={"Accept": "application/json"}).json().get("access_token")
    if not token: raise HTTPException(502, "PayPal konnte nicht erreicht werden")
    order = requests.post(f"{os.environ['PAYPAL_BASE_URL']}/v2/checkout/orders", json={"intent": "CAPTURE", "purchase_units": [{"reference_id": offer["id"], "description": offer["name"], "amount": {"currency_code": "EUR", "value": f"{offer['price']:.2f}"}}], "application_context": {"brand_name": "BLACKSOLID", "user_action": "PAY_NOW", "return_url": "https://overlay-hub-4.preview.emergentagent.com/?payment=success", "cancel_url": "https://overlay-hub-4.preview.emergentagent.com/?payment=cancelled"}}, headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json", "Prefer": "return=representation"})
    if order.status_code >= 400: raise HTTPException(502, "PayPal-Bestellung konnte nicht erstellt werden")
    result = order.json(); await db.orders.insert_one({"paypal_id": result["id"], "offer_id": offer["id"], "customer": data.model_dump(), "status": "created", "created_at": datetime.now(timezone.utc).isoformat()})
    approval = next((link["href"] for link in result.get("links", []) if link["rel"] == "approve"), None)
    return {"order_id": result["id"], "approval_url": approval}

@api_router.post("/paypal/capture/{order_id}")
async def capture_order(order_id: str):
    token_response = requests.post(f"{os.environ['PAYPAL_BASE_URL']}/v1/oauth2/token", data={"grant_type": "client_credentials"}, auth=(os.environ["PAYPAL_CLIENT_ID"], os.environ["PAYPAL_SECRET"]), headers={"Accept": "application/json"})
    token = token_response.json().get("access_token")
    response = requests.post(f"{os.environ['PAYPAL_BASE_URL']}/v2/checkout/orders/{order_id}/capture", headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    if response.status_code >= 400: raise HTTPException(502, "Zahlung konnte nicht bestätigt werden")
    data = response.json(); await db.orders.update_one({"paypal_id": order_id}, {"$set": {"status": data.get("status", "COMPLETED")}})
    return {"status": data.get("status", "COMPLETED")}

app.include_router(api_router)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","), allow_methods=["*"], allow_headers=["*"])
@app.on_event("shutdown")
async def shutdown_db_client(): client.close()