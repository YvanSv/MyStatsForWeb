import pytest
from fastapi import HTTPException
from app.models import Artist, User
from app.utils.profile_defaults import DEFAULT_BANNER, DEFAULT_PROFILE_BANNER, default_artist_image, default_avatar
from app.utils.user_lookup import get_user_by_slug_or_404


def test_lookup_slug_et_id(db, make_user):
    u = make_user(slug="bob")
    assert get_user_by_slug_or_404(db, "bob").id == u.id
    assert get_user_by_slug_or_404(db, str(u.id)).id == u.id


def test_lookup_404_message_par_defaut_et_personnalise(db):
    with pytest.raises(HTTPException) as e:
        get_user_by_slug_or_404(db, "x")
    assert (e.value.status_code, e.value.detail) == (404, "Profil introuvable")
    with pytest.raises(HTTPException) as e:
        get_user_by_slug_or_404(db, "123", detail="Utilisateur non trouvé")
    assert (e.value.status_code, e.value.detail) == (404, "Utilisateur non trouvé")


def test_lookup_slug_numerique_ne_cherche_pas_par_slug(db, make_user):
    make_user(slug="42")  # un slug purement numérique est interprété comme un id
    with pytest.raises(HTTPException):
        get_user_by_slug_or_404(db, "42")


def test_defaults():
    assert default_avatar(User(id=7, email="a", display_name="a")) == "https://api.dicebear.com/7.x/avataaars/svg?seed=7"
    assert default_artist_image(Artist(name="Daft Punk")) == "https://api.dicebear.com/7.x/initials/svg?seed=Daft Punk"
    assert DEFAULT_BANNER == "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=2070"
    assert DEFAULT_PROFILE_BANNER == "/banner_template.jpg"
