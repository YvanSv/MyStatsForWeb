from datetime import date, datetime

import pytest

from app.data.my.resume import compute_streaks
from app.models import Album, Artist, MusicProvider, Track, TrackHistory

TODAY = date(2026, 10, 2)


def d(n):  # jour n d'octobre 2026
    return date(2026, 10, n)


# --- compute_streaks (fonction pure) ---

def test_streaks_vide():
    assert compute_streaks([], TODAY) == (0, 0)


def test_streaks_un_jour():
    assert compute_streaks([d(2)], TODAY) == (1, 1)


def test_streaks_serie_cassee():
    assert compute_streaks([d(1), d(2), d(3), d(5), d(6)], date(2026, 10, 20)) == (3, 0)


def test_streaks_doublons_et_desordre():
    assert compute_streaks([d(3), d(1), d(2), d(2)], d(3)) == (3, 3)


def test_streaks_en_cours_hier_aujourdhui_avant_hier():
    dates = [d(1), d(2)]
    assert compute_streaks(dates, d(2)) == (2, 2)  # aujourd'hui
    assert compute_streaks(dates, d(3)) == (2, 2)  # hier
    assert compute_streaks(dates, d(4)) == (2, 0)  # avant-hier : série terminée


def test_streaks_en_cours_plus_courte_que_la_plus_longue():
    assert compute_streaks([d(1), d(2), d(3), d(5)], d(5)) == (3, 1)


# --- endpoint ---

@pytest.fixture
def setup(db, make_user):
    user = make_user(session_id="sid-r")
    ar1, ar2 = Artist(name="A1"), Artist(name="A2")
    db.add_all([ar1, ar2])
    db.commit()
    al1, al2 = Album(name="B1", artist_id=ar1.id), Album(name="B2", artist_id=ar2.id)
    db.add_all([al1, al2])
    db.commit()
    t1 = Track(title="T1", duration_ms=180000, artist_id=ar1.id, album_id=al1.id)
    t2 = Track(title="T2", duration_ms=180000, artist_id=ar2.id, album_id=al2.id)
    db.add_all([t1, t2])
    db.commit()

    def listen(track, when, ms=60000):
        db.add(TrackHistory(played_at=when, ms_played=ms, provider=MusicProvider.SPOTIFY, user_id=user.id,
                            track_id=track.id, artist_id=track.artist_id, album_id=track.album_id))
        db.commit()

    return {"user": user, "t1": t1, "t2": t2, "listen": listen, "year": datetime.utcnow().year}


def get_resume(client, **params):
    client.cookies.set("session_id", "sid-r")
    return client.get("/data/my/resume", params=params)


def test_previous_et_nouveaux_artistes_sur_deux_annees(client, setup):
    y, listen = setup["year"], setup["listen"]
    # année précédente : A1 x2 (2 min)
    listen(setup["t1"], datetime(y - 1, 3, 1, 10), 60000)
    listen(setup["t1"], datetime(y - 1, 3, 2, 10), 60000)
    # année courante : A1 (déjà connu) + A2 (nouveau)
    listen(setup["t1"], datetime(y, 1, 1, 0, 0, 1), 120000)
    listen(setup["t2"], datetime(y, 1, 2, 10), 60000)
    r = get_resume(client, range="year")
    assert r.status_code == 200
    j = r.json()
    assert j["streams"] == 2 and j["minutes"] == 3
    assert j["previous_streams"] == 2 and j["previous_minutes"] == 2
    assert j["new_artists"] == 1
    assert j["longest_streak_days"] == 2

    # offset=1 : la période précédente (y-2) n'a aucune donnée -> None
    j1 = get_resume(client, range="year", offset=1).json()
    assert j1["streams"] == 2
    assert j1["previous_minutes"] is None and j1["previous_streams"] is None
    assert j1["new_artists"] == 1  # A1 découvert l'année précédente


def test_lifetime(client, setup):
    y, listen = setup["year"], setup["listen"]
    listen(setup["t1"], datetime(y - 1, 3, 1, 10))
    listen(setup["t2"], datetime(y, 1, 1, 0, 0, 1))
    j = get_resume(client, range="lifetime").json()
    assert j["previous_minutes"] is None and j["previous_streams"] is None
    assert j["new_artists"] == 2


def test_serie_en_cours_aujourdhui(client, setup):
    listen = setup["listen"]
    now = datetime.utcnow()
    from datetime import timedelta
    listen(setup["t1"], now)
    listen(setup["t1"], now - timedelta(days=1))
    j = get_resume(client, range="lifetime").json()
    assert j["current_streak_days"] == 2 and j["longest_streak_days"] == 2


def test_retro_compatibilite(client, setup):
    listen = setup["listen"]
    listen(setup["t1"], datetime.utcnow())
    j = get_resume(client, range="lifetime").json()
    for k in ("user", "topArtists", "topTracks", "topAlbums", "minutes", "streams",
              "distinct_tracks", "distinct_albums", "distinct_artists"):
        assert k in j
    assert j["streams"] == 1 and j["distinct_artists"] == 1
