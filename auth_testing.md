# Auth Testing Playbook (Emergent Google OAuth)

## Flow
1. Login-Button: `window.location.href = https://auth.emergentagent.com/?redirect=${encodeURIComponent(window.location.origin + "/")}` — NIEMALS hardcoden oder Fallbacks setzen.
2. Redirect zurück: `{redirect_url}#session_id={session_id}`
3. Frontend sendet session_id an `POST /api/auth/google-session`; Backend ruft `GET https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data` mit Header `X-Session-ID` (nur vom Backend!).
4. Backend prüft Admin-E-Mail (ADMIN_EMAIL), speichert user + session (7 Tage), setzt httpOnly-Cookie `session_token` (secure, samesite=none, path=/), gibt Admin-JWT zurück.
5. `GET /api/auth/me` validiert Cookie (Fallback: Authorization Bearer session_token) und gibt frisches Admin-JWT.

## Test (manuell)
1. Test-Session anlegen:
mongosh --eval "
use('test_database');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({ user_id: userId, email: 'blacksolidsnake@web.de', name: 'Test Admin', picture: '', created_at: new Date() });
db.user_sessions.insertOne({ user_id: userId, session_token: sessionToken, expires_at: new Date(Date.now() + 7*24*60*60*1000), created_at: new Date() });
print('Session token: ' + sessionToken);
"
2. Backend testen:
curl -X GET "$API/api/auth/me" -H "Authorization: Bearer SESSION_TOKEN"  → erwartet {"token": ..., "email": ...}
3. Browser: Cookie `session_token` setzen (httpOnly, secure, sameSite None), Seite neu laden → /api/auth/me stellt JWT wieder her.
4. Cleanup:
mongosh --eval "use('test_database'); db.user_sessions.deleteMany({session_token: /test_session/}); db.users.deleteMany({name: 'Test Admin'});"

## Erfolg
- /api/auth/me gibt JWT zurück
- /api/auth/google-session mit ungültiger session_id → 401
- Nicht-Admin-Google-Konto → 403
