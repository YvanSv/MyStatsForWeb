from fastapi import Response
from app.auth.utils import auth_utils
from .test_auth import flags, set_cookie_header


def test_session_max_age():
    assert auth_utils.SESSION_MAX_AGE == 2592000


def test_set_session_cookie_dev_et_prod(monkeypatch):
    for prod, samesite in ((False, "lax"), (True, "none")):
        monkeypatch.setattr(auth_utils, "IS_PRODUCTION", prod)
        r = Response()
        auth_utils.set_session_cookie(r, "abc")
        f = flags(set_cookie_header(r))
        assert f["value"] == "abc" and f["httponly"] is True
        assert f["samesite"].lower() == samesite and ("secure" in f) is prod
        assert f["max-age"] == "2592000" and f["path"] == "/"


def test_set_spotify_state_cookie(monkeypatch):
    monkeypatch.setattr(auth_utils, "IS_PRODUCTION", True)
    r = Response()
    auth_utils.set_spotify_state_cookie(r)
    f = flags(set_cookie_header(r, "spotify_auth_state"))
    assert f["httponly"] is True and f["samesite"].lower() == "none" and f["secure"] is True
    assert f["max-age"] == "600"


def test_create_uuid_session_unique():
    a, b = auth_utils.create_uuid_session(), auth_utils.create_uuid_session()
    assert a != b and len(a) == 36
