import pytest

from app.data.my import currently_playing as cp
from app.models import MusicProvider, UserAccount


@pytest.fixture
def listener(make_user, db):
    user = make_user(email="l@t.fr", display_name="Lou", slug="lou", session_id="sid-lou")
    db.add(UserAccount(provider=MusicProvider.SPOTIFY, provider_user_id="sp-lou", user_id=user.id))
    db.commit()
    return user


def _patch_spotify(monkeypatch, payload):
    async def fake_token(user, db):
        return "token"

    async def fake_task(fn, *a, **kw):
        return payload

    monkeypatch.setattr(cp, "get_valid_access_token", fake_token)
    monkeypatch.setattr(cp, "get_spotify_users_client", lambda token: type("FakeSpotify", (), {"currently_playing": lambda self: None})())
    monkeypatch.setattr(cp, "run_spotify_task", fake_task)


def _track(**over):
    item = {
        "name": "Song", "duration_ms": 200000,
        "artists": [{"name": "Artist"}],
        "album": {"name": "Album", "images": [{"url": "https://img/cover.jpg"}]},
        "external_urls": {"spotify": "https://open.spotify.com/track/abc"},
    }
    item.update(over)
    return {"item": item, "is_playing": True, "progress_ms": 1000, "currently_playing_type": "track"}


def test_renvoie_la_page_spotify_du_titre(client, listener, monkeypatch):
    _patch_spotify(monkeypatch, _track())
    client.cookies.set("session_id", "sid-lou")
    body = client.get("/data/my/currently-playing").json()
    assert body["is_listening"] is True
    assert body["data"]["spotify_url"] == "https://open.spotify.com/track/abc"
    assert body["data"]["title"] == "Song"


def test_spotify_url_vide_quand_spotify_ne_la_fournit_pas(client, listener, monkeypatch):
    _patch_spotify(monkeypatch, _track(external_urls=None))
    client.cookies.set("session_id", "sid-lou")
    assert client.get("/data/my/currently-playing").json()["data"]["spotify_url"] == ""
