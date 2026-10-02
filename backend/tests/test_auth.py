import pytest
from app.auth.utils import auth_utils

DICEBEAR = "https://api.dicebear.com/7.x/avataaars/svg?seed="


def set_cookie_header(resp, name="session_id"):
    for h in (resp.headers.get_list("set-cookie") if hasattr(resp.headers, "get_list") else resp.headers.getlist("set-cookie")):
        if h.startswith(f"{name}="):
            return h
    return None


def flags(header):
    parts = [p.strip() for p in header.split(";")]
    d = {"value": parts[0].split("=", 1)[1]}
    for p in parts[1:]:
        k, _, v = p.partition("=")
        d[k.lower()] = v or True
    return d


def register_and_login(client, email="a@test.fr"):
    r = client.post("/auth/register", json={"username": "alice", "email": email, "password": "motdepasse1"})
    assert r.status_code == 201
    return r, client.post("/auth/login", json={"email": email, "password": "motdepasse1"})


def test_register_ne_pose_pas_de_cookie(client):
    r, _ = register_and_login(client)
    assert r.json()["message"] == "Compte créé avec succès"
    assert set_cookie_header(r) is None


def test_register_email_deja_pris(client):
    register_and_login(client)
    r = client.post("/auth/register", json={"username": "alice", "email": "a@test.fr", "password": "motdepasse1"})
    assert r.status_code == 400
    assert r.json()["detail"] == "Un compte avec cet email existe déjà."


def test_login_cookie_dev(client, monkeypatch):
    monkeypatch.setattr(auth_utils, "IS_PRODUCTION", False)
    _, r = register_and_login(client)
    f = flags(set_cookie_header(r))
    assert f["httponly"] is True
    assert f["samesite"].lower() == "lax"
    assert "secure" not in f
    assert f["max-age"] == str(3600 * 24 * 30)
    assert f["path"] == "/"
    assert len(f["value"]) == 36  # uuid4


def test_login_cookie_prod(client, monkeypatch):
    monkeypatch.setattr(auth_utils, "IS_PRODUCTION", True)
    _, r = register_and_login(client)
    f = flags(set_cookie_header(r))
    assert f["httponly"] is True
    assert f["samesite"].lower() == "none"
    assert f["secure"] is True
    assert f["max-age"] == str(3600 * 24 * 30)
    assert f["path"] == "/"


def test_login_identifiants_incorrects(client):
    register_and_login(client)
    r = client.post("/auth/login", json={"email": "a@test.fr", "password": "mauvaismdp1"})
    assert r.status_code == 401
    assert r.json()["detail"] == "Identifiants incorrects"
    assert set_cookie_header(r) is None


def test_me_sans_cookie(client):
    r = client.get("/auth/me")
    assert r.status_code == 401
    assert r.json()["detail"] == "Non connecté"


def test_me_cookie_inconnu(client):
    client.cookies.set("session_id", "inconnu")
    r = client.get("/auth/me")
    assert r.status_code == 401
    assert r.json()["detail"] == "Session expirée ou invalide"
    # état actuel : le delete_cookie sur le Response injecté est perdu quand l'HTTPException est levée
    assert set_cookie_header(r) is None


def test_me_connecte_avatar_par_defaut(client, monkeypatch):
    monkeypatch.setattr(auth_utils, "IS_PRODUCTION", False)
    _, login = register_and_login(client)
    uid = login.json()["user_id"]
    client.cookies.set("session_id", flags(set_cookie_header(login))["value"])
    r = client.get("/auth/me")
    assert r.status_code == 200
    body = r.json()
    assert body["id"] == uid
    assert body["user_name"] == "alice"
    assert body["is_logged_in"] is True
    assert body["isAdmin"] is False
    assert body["slug"] is None
    assert body["avatar"] == f"{DICEBEAR}{uid}"
    assert body["providers"] == {"SPOTIFY": {"has": False, "email": None}, "APPLE_MUSIC": {"has": False, "email": None}, "MUSICBRAINZ": {"has": False, "email": None}}


def test_me_avatar_personnalise(client, make_user):
    u = make_user(session_id="sid1", avatar_url="https://x.test/a.png")
    client.cookies.set("session_id", "sid1")
    assert client.get("/auth/me").json()["avatar"] == "https://x.test/a.png"
