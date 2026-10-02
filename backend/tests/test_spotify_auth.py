"""Cookies posés par le flux Spotify. Aucun appel réseau : httpx.AsyncClient est remplacé par un faux."""
from sqlmodel import select
from app.auth import spotify_auth
from app.auth.utils import auth_utils
from app.models import User
from .test_auth import flags, set_cookie_header


class FakeResp:
    def __init__(self, data, status=200):
        self._d, self.status_code = data, status

    def json(self):
        return self._d


class FakeClient:
    async def __aenter__(self):
        return self

    async def __aexit__(self, *a):
        return False

    async def post(self, *a, **k):
        return FakeResp({"access_token": "at", "refresh_token": "rt", "expires_in": 3600})

    async def get(self, *a, **k):
        return FakeResp({"id": "sp1", "email": "sp@test.fr", "display_name": "Spo"})


def test_spotify_login_ne_pose_pas_le_cookie_state(client, monkeypatch):
    # Bug actuel : le cookie est posé sur le Response injecté, ignoré car la route renvoie un RedirectResponse.
    for prod in (False, True):
        monkeypatch.setattr(auth_utils, "IS_PRODUCTION", prod)
        r = client.get("/auth/spotify-login", follow_redirects=False)
        assert r.status_code in (302, 307)
        assert r.headers["location"].startswith("https://accounts.spotify.com/authorize?")
        assert set_cookie_header(r, "spotify_auth_state") is None


def _callback(client, monkeypatch, prod):
    monkeypatch.setattr(auth_utils, "IS_PRODUCTION", prod)
    monkeypatch.setattr(spotify_auth.httpx, "AsyncClient", FakeClient)
    return client.get("/auth/callback?code=abc", follow_redirects=False)


def test_callback_cookie_session_dev(client, db, monkeypatch):
    r = _callback(client, monkeypatch, False)
    assert r.status_code in (302, 307)
    f = flags(set_cookie_header(r))
    assert f["httponly"] is True and f["samesite"].lower() == "lax" and "secure" not in f
    assert f["max-age"] == str(3600 * 24 * 30) and f["path"] == "/"
    user = db.exec(select(User)).one()
    assert f["value"] == user.session_id and len(user.session_id) == 36


def test_callback_cookie_session_prod(client, monkeypatch):
    f = flags(set_cookie_header(_callback(client, monkeypatch, True)))
    assert f["samesite"].lower() == "none" and f["secure"] is True
