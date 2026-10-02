import pytest

DICEBEAR = "https://api.dicebear.com/7.x/avataaars/svg?seed="
UNSPLASH = "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=2070"


@pytest.fixture
def alice(make_user):
    return make_user(email="alice@t.fr", display_name="Alice", slug="alice", session_id="sid-alice")


@pytest.fixture
def private_user(make_user):
    perms = {"profile": False, "stats": True, "favorites": True, "history": True, "dashboard": True}
    return make_user(email="p@t.fr", display_name="Priv", slug="priv", perms=perms, session_id="sid-priv")


# --- /profile/{slug} -------------------------------------------------------

def test_profile_par_slug_et_par_id(client, alice):
    a = client.get("/profile/alice")
    b = client.get(f"/profile/{alice.id}")
    assert a.status_code == b.status_code == 200
    assert a.json() == b.json()
    assert a.json()["display_name"] == "Alice"


def test_profile_defauts_avatar_banniere(client, alice):
    j = client.get("/profile/alice").json()
    assert j["avatar"] == f"{DICEBEAR}{alice.id}"
    assert j["banner"] == "/banner_template.jpg"  # différent de /simple (unsplash)
    assert j["bio"] == "Aucune biographie."


def test_profile_404(client):
    for slug in ("nope", "9999"):
        r = client.get(f"/profile/{slug}")
        assert r.status_code == 404
        assert r.json()["detail"] == "Profil introuvable"


def test_profile_prive_403_visiteur_et_proprietaire(client, private_user):
    r = client.get("/profile/priv")
    assert r.status_code == 403
    assert r.json()["detail"] == "Profil privé"
    client.cookies.set("session_id", "sid-priv")
    assert client.get("/profile/priv").status_code == 200


# --- /profile/simple/{slug} ------------------------------------------------

def test_simple_slug_id_defauts(client, alice):
    a = client.get("/profile/simple/alice")
    b = client.get(f"/profile/simple/{alice.id}")
    assert a.status_code == 200 and a.json() == b.json()
    assert a.json()["avatar"] == f"{DICEBEAR}{alice.id}"
    assert a.json()["banner"] == UNSPLASH


def test_simple_custom_images(client, make_user):
    make_user(slug="c", avatar_url="https://x.test/a.png", banner_url="https://x.test/b.png")
    j = client.get("/profile/simple/c").json()
    assert j["avatar"] == "https://x.test/a.png" and j["banner"] == "https://x.test/b.png"


def test_simple_404_403(client, private_user):
    r = client.get("/profile/simple/nope")
    assert (r.status_code, r.json()["detail"]) == (404, "Profil introuvable")
    r = client.get("/profile/simple/priv")
    assert (r.status_code, r.json()["detail"]) == (403, "Profil privé")


# --- /profile/tops/{slug} (404/403 avant tout appel Spotify) -----------------

def test_tops_404_403(client, private_user):
    r = client.get("/profile/tops/nope")
    assert (r.status_code, r.json()["detail"]) == (404, "Profil introuvable")
    r = client.get(f"/profile/tops/{private_user.id}")
    assert (r.status_code, r.json()["detail"]) == (403, "Profil privé")


# --- /edit-profile/{slug} --------------------------------------------------

def test_edit_profile_get_slug_et_id(client, alice):
    client.cookies.set("session_id", "sid-alice")
    a = client.get("/edit-profile/alice")
    b = client.get(f"/edit-profile/{alice.id}")
    assert a.status_code == b.status_code == 200
    assert a.json() == b.json()


def test_edit_profile_erreurs(client, alice, private_user):
    r = client.get("/edit-profile/alice")
    assert (r.status_code, r.json()["detail"]) == (401, "Non connecté")
    client.cookies.set("session_id", "bad")
    r = client.get("/edit-profile/alice")
    assert (r.status_code, r.json()["detail"]) == (401, "Session invalide")
    client.cookies.set("session_id", "sid-alice")
    r = client.get("/edit-profile/nope")
    assert (r.status_code, r.json()["detail"]) == (404, "Profil introuvable")
    r = client.get("/edit-profile/9999")
    assert (r.status_code, r.json()["detail"]) == (404, "Profil introuvable")
    r = client.get("/edit-profile/priv")
    assert (r.status_code, r.json()["detail"]) == (403, "Action non autorisée sur ce profil")


def test_edit_profile_patch(client, alice):
    client.cookies.set("session_id", "sid-alice")
    r = client.patch(f"/edit-profile/{alice.id}", json={"bio": "salut"})
    assert r.status_code == 200
    assert r.json()["user"]["bio"] == "salut"


# --- /profile/dashboard/{slug} ---------------------------------------------

def test_dashboard_404_403(client, private_user, make_user):
    r = client.get("/profile/dashboard/nope")
    assert (r.status_code, r.json()["detail"]) == (404, "Utilisateur non trouvé")
    r = client.get("/profile/dashboard/9999")
    assert (r.status_code, r.json()["detail"]) == (404, "Utilisateur non trouvé")
    r = client.get("/profile/dashboard/priv")
    assert (r.status_code, r.json()["detail"]) == (403, "Ce dashboard est privé")
    perms = {"profile": True, "stats": True, "favorites": True, "history": True, "dashboard": False}
    make_user(email="d@t.fr", slug="nodash", perms=perms)
    r = client.get("/profile/dashboard/nodash")
    assert (r.status_code, r.json()["detail"]) == (403, "Ce dashboard est privé")


def test_get_target_user_and_check_perms(db, alice, private_user):
    from app.profile.dashboard.dashboard_data import get_target_user_and_check_perms as f
    u, owner = f("alice", None, db)
    assert u.id == alice.id and owner is False
    u, owner = f(str(alice.id), "sid-alice", db)
    assert u.id == alice.id and owner is True
    u, owner = f("priv", "sid-priv", db)
    assert owner is True
