import os
import hmac
import hashlib
import secrets
import threading
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request as UrlRequest
from urllib.request import urlopen
from pathlib import Path

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from . import crud, models, schemas
from .db import Base, SessionLocal, engine, ensure_schema_updates, get_db

Base.metadata.create_all(bind=engine)
ensure_schema_updates()

# One-time lazy migration of legacy plaintext rows to encrypted storage.
with SessionLocal() as _db:
    crud.ensure_rows_encrypted(_db)

app = FastAPI(title="Daily Scheduling API", version="1.0.0")
api = APIRouter(prefix="/api")
BASE_DIR = Path(__file__).resolve().parent.parent
SESSION_SECRET = os.getenv("SESSION_SECRET", os.getenv("DATABASE_KEY", "dev-secret"))
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"
SESSION_COOKIE = "ds_session"
OAUTH_STATE_COOKIE = "ds_oauth_state"
SESSION_TTL_SECONDS = 60 * 60 * 24 * 7
_SESSIONS: dict[str, dict] = {}
_SESSIONS_LOCK = threading.Lock()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/assets", StaticFiles(directory=BASE_DIR / "assets"), name="assets")
app.mount("/css", StaticFiles(directory=BASE_DIR / "css"), name="css")
app.mount("/js", StaticFiles(directory=BASE_DIR / "js"), name="js")


def get_current_user(request: Request) -> dict:
    user = _get_user_from_request(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


def _now_ts() -> int:
    return int(time.time())


def _cleanup_expired_sessions() -> None:
    now = _now_ts()
    with _SESSIONS_LOCK:
        expired = [sid for sid, entry in _SESSIONS.items() if entry["expires_at"] <= now]
        for sid in expired:
            _SESSIONS.pop(sid, None)


def _sign_value(raw_value: str) -> str:
    digest = hmac.new(
        SESSION_SECRET.encode("utf-8"),
        raw_value.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return f"{raw_value}.{digest}"


def _verify_signed_value(signed_value: str | None) -> str | None:
    if not signed_value or "." not in signed_value:
        return None
    raw_value, provided_digest = signed_value.rsplit(".", 1)
    expected_digest = hmac.new(
        SESSION_SECRET.encode("utf-8"),
        raw_value.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(expected_digest, provided_digest):
        return None
    return raw_value


def _create_session(user: dict) -> str:
    _cleanup_expired_sessions()
    session_id = secrets.token_urlsafe(48)
    with _SESSIONS_LOCK:
        _SESSIONS[session_id] = {"user": user, "expires_at": _now_ts() + SESSION_TTL_SECONDS}
    return session_id


def _delete_session(request: Request) -> None:
    session_id = _verify_signed_value(request.cookies.get(SESSION_COOKIE))
    if not session_id:
        return
    with _SESSIONS_LOCK:
        _SESSIONS.pop(session_id, None)


def _get_user_from_request(request: Request) -> dict | None:
    _cleanup_expired_sessions()
    session_id = _verify_signed_value(request.cookies.get(SESSION_COOKIE))
    if not session_id:
        return None
    with _SESSIONS_LOCK:
        entry = _SESSIONS.get(session_id)
        if not entry:
            return None
        entry["expires_at"] = _now_ts() + SESSION_TTL_SECONDS
        return entry["user"]


def _is_https(request: Request) -> bool:
    forwarded_proto = request.headers.get("x-forwarded-proto")
    if forwarded_proto:
        return forwarded_proto.split(",")[0].strip().lower() == "https"
    return request.url.scheme == "https"


def _http_post_form(url: str, form_data: dict[str, str]) -> dict:
    encoded = urlencode(form_data).encode("utf-8")
    req = UrlRequest(
        url,
        data=encoded,
        method="POST",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    try:
        with urlopen(req, timeout=15) as response:
            payload = response.read().decode("utf-8")
    except HTTPError as exc:
        body = exc.read().decode("utf-8", errors="ignore")
        raise HTTPException(status_code=401, detail=f"Google token exchange failed: {body}") from exc
    except URLError as exc:
        raise HTTPException(status_code=502, detail="Google token exchange network error") from exc
    try:
        import json

        return json.loads(payload)
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=502, detail="Invalid token response from Google") from exc


def _http_get_json(url: str, bearer_token: str) -> dict:
    req = UrlRequest(url, method="GET", headers={"Authorization": f"Bearer {bearer_token}"})
    try:
        with urlopen(req, timeout=15) as response:
            payload = response.read().decode("utf-8")
    except HTTPError as exc:
        body = exc.read().decode("utf-8", errors="ignore")
        raise HTTPException(status_code=401, detail=f"Google userinfo request failed: {body}") from exc
    except URLError as exc:
        raise HTTPException(status_code=502, detail="Google userinfo network error") from exc
    try:
        import json

        return json.loads(payload)
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=502, detail="Invalid userinfo response from Google") from exc

@app.get("/")
def serve_index(request: Request):
    if not _get_user_from_request(request):
        return RedirectResponse(url="/login", status_code=302)
    return FileResponse(BASE_DIR / "pages" / "index.html")


@app.get("/login")
def serve_login(request: Request):
    if _get_user_from_request(request):
        return RedirectResponse(url="/", status_code=302)
    return FileResponse(BASE_DIR / "pages" / "login.html")


@app.get("/auth/google/login")
async def auth_google_login(request: Request):
    if not (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET):
        raise HTTPException(
            status_code=500,
            detail="Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
        )
    state = secrets.token_urlsafe(24)
    signed_state = _sign_value(state)
    redirect_uri = str(request.url_for("auth_google_callback"))
    query = urlencode(
        {
            "client_id": GOOGLE_CLIENT_ID,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": "openid email profile",
            "state": state,
            "prompt": "select_account",
        }
    )
    response = RedirectResponse(url=f"{GOOGLE_AUTH_URL}?{query}", status_code=302)
    response.set_cookie(
        key=OAUTH_STATE_COOKIE,
        value=signed_state,
        max_age=600,
        httponly=True,
        samesite="lax",
        secure=_is_https(request),
    )
    return response


@app.get("/auth/google/callback")
async def auth_google_callback(request: Request):
    if not (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET):
        raise HTTPException(
            status_code=500,
            detail="Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
        )
    state_query = request.query_params.get("state")
    state_cookie = _verify_signed_value(request.cookies.get(OAUTH_STATE_COOKIE))
    if not state_query or not state_cookie or state_query != state_cookie:
        raise HTTPException(status_code=401, detail="Invalid OAuth state")

    error = request.query_params.get("error")
    if error:
        raise HTTPException(status_code=401, detail=f"Google OAuth error: {error}")

    code = request.query_params.get("code")
    if not code:
        raise HTTPException(status_code=401, detail="Missing OAuth code")

    redirect_uri = str(request.url_for("auth_google_callback"))
    token = _http_post_form(
        GOOGLE_TOKEN_URL,
        {
            "code": code,
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        },
    )

    access_token = token.get("access_token")
    if not access_token:
        raise HTTPException(status_code=401, detail="No access token returned by Google")

    userinfo = _http_get_json(GOOGLE_USERINFO_URL, access_token)
    if not userinfo:
        raise HTTPException(status_code=401, detail="Could not fetch Google profile")

    subject = userinfo.get("sub")
    if not subject:
        raise HTTPException(status_code=401, detail="Google profile missing user id")

    user = {
        "sub": userinfo.get("sub"),
        "email": userinfo.get("email"),
        "name": userinfo.get("name"),
        "picture": userinfo.get("picture"),
    }
    session_id = _create_session(user)
    response = RedirectResponse(url="/", status_code=302)
    response.set_cookie(
        key=SESSION_COOKIE,
        value=_sign_value(session_id),
        max_age=SESSION_TTL_SECONDS,
        httponly=True,
        samesite="lax",
        secure=_is_https(request),
    )
    response.delete_cookie(OAUTH_STATE_COOKIE)
    return response


@api.get("/auth/me")
def auth_me(request: Request):
    user = _get_user_from_request(request)
    if not user:
        return {"authenticated": False}
    return {"authenticated": True, "user": user}


@api.post("/auth/logout")
def auth_logout(request: Request):
    _delete_session(request)
    response = JSONResponse({"ok": True})
    response.delete_cookie(SESSION_COOKIE)
    response.delete_cookie(OAUTH_STATE_COOKIE)
    return response


@api.get("/tasks", response_model=list[schemas.TaskOut])
def list_tasks(
    db: Session = Depends(get_db), user: dict = Depends(get_current_user)
):
    return crud.get_tasks(db, user["sub"])


@api.post("/tasks", response_model=schemas.TaskOut)
def create_or_update_task(
    task_in: schemas.TaskIn,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    try:
        task = crud.upsert_task(db, task_in, user["sub"])
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return task


@api.delete("/tasks/{task_id}")
def delete_task(
    task_id: str, db: Session = Depends(get_db), user: dict = Depends(get_current_user)
):
    deleted = crud.delete_task(db, task_id, user["sub"])
    if not deleted:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"ok": True}


@api.get("/settings/{key}", response_model=schemas.SettingOut)
def get_setting(
    key: str, db: Session = Depends(get_db), user: dict = Depends(get_current_user)
):
    setting = crud.get_setting(db, f"{user['sub']}:{key}")
    if not setting:
        raise HTTPException(status_code=404, detail="Setting not found")
    return schemas.SettingOut(key=key, value=setting.value)


@api.post("/settings", response_model=schemas.SettingOut)
def set_setting(
    setting_in: schemas.SettingIn,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    stored = crud.upsert_setting(
        db,
        schemas.SettingIn(key=f"{user['sub']}:{setting_in.key}", value=setting_in.value),
    )
    return schemas.SettingOut(key=setting_in.key, value=stored.value)


@api.post("/clear")
def clear_all(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    tasks = crud.get_tasks(db, user["sub"])
    for task in tasks:
        db.delete(task)
    app_state = crud.get_setting(db, f"{user['sub']}:appState")
    if app_state:
        db.delete(app_state)
    db.commit()
    return {"ok": True}


app.include_router(api)
