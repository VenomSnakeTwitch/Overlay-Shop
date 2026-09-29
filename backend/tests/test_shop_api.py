import os
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://overlay-hub-4.preview.emergentagent.com").rstrip("/")


def test_public_offers_and_categories():
    response = requests.get(f"{BASE_URL}/api/offers", timeout=20)
    assert response.status_code == 200
    offers = response.json()
    assert len(offers) == 3
    assert {offer["category"] for offer in offers} == {"OVERLAYS", "BRANDING", "MUSIC"}
    assert all("_id" not in offer and offer["active"] for offer in offers)


def test_invalid_admin_login_rejected():
    response = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "wrong@example.com", "password": "wrong"}, timeout=20)
    assert response.status_code == 401


def test_admin_login_and_protected_offers():
    email = "blacksolidsnake@web.de"
    password = "Venom30@@"
    login = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password}, timeout=20)
    assert login.status_code == 200
    token = login.json()["token"]
    response = requests.get(f"{BASE_URL}/api/admin/offers", headers={"Authorization": f"Bearer {token}"}, timeout=20)
    assert response.status_code == 200
    assert len(response.json()) == 3


def test_admin_endpoint_rejects_missing_token():
    response = requests.get(f"{BASE_URL}/api/admin/offers", timeout=20)
    assert response.status_code == 401


def test_paypal_invalid_offer_is_safe_error():
    response = requests.post(f"{BASE_URL}/api/paypal/create-order", json={"offer_id": "does-not-exist", "name": "Test", "email": "test@example.com"}, timeout=20)
    assert response.status_code == 404
    assert "Angebot" in response.text