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


# --- tops_by_sort ---

@pytest.fixture
def tops_data(db, make_user):
    user = make_user(session_id="sid-r")
    ar = Artist(name="AR")
    db.add(ar)
    db.commit()
    al = Album(name="AL", artist_id=ar.id)
    db.add(al)
    db.commit()
    mk = lambda title, dur: Track(title=title, duration_ms=dur, artist_id=ar.id, album_id=al.id)
    tracks = {"court": mk("Court", 30000), "long": mk("Long", 600000), "note": mk("Note", 240000)}
    db.add_all(tracks.values())
    db.commit()
    y = datetime.utcnow().year

    def listen(t, n, ms, year=y):
        for i in range(n):
            db.add(TrackHistory(played_at=datetime(year, 2, 1 + i % 20, 10), ms_played=ms, provider=MusicProvider.SPOTIFY,
                                user_id=user.id, track_id=t.id, artist_id=ar.id, album_id=al.id))
        db.commit()

    listen(tracks["court"], 20, 30000)      # 20 streams, 10 min, écouté en entier
    listen(tracks["long"], 3, 600000)       # 3 streams, 30 min
    listen(tracks["note"], 8, 240000)       # 8 streams, 32 min, écouté en entier
    listen(tracks["court"], 2, 30000, y - 1)  # hors période
    return {"tracks": tracks}


def names(items):
    return [i["name"] for i in items]


def test_tops_by_sort_ordres_differents(client, tops_data):
    j = get_resume(client, range="lifetime").json()
    t = j["tops_by_sort"]["tracks"]
    assert names(t["streams"]) == ["Court", "Note", "Long"]
    assert names(t["minutes"])[0] == "Note" and names(t["minutes"])[1] == "Long"
    assert names(t["minutes"]) != names(t["streams"])
    assert names(t["rating"]) == ["Note", "Court", "Long"]
    for crit in ("streams", "minutes", "rating"):
        vals = [i[crit] for i in t[crit]]
        assert vals == sorted(vals, reverse=True)
        assert set(t[crit][0]) >= {"id", "name", "image", "streams", "minutes", "rating"}
    assert set(j["tops_by_sort"]) == {"tracks", "albums", "artists"}
    assert set(j["tops_by_sort"]["albums"]) == {"streams", "minutes", "rating"}


def test_tops_by_sort_periode(client, tops_data):
    y = datetime.utcnow().year
    j = get_resume(client, range="year").json()
    assert names(j["tops_by_sort"]["tracks"]["streams"]) == ["Court", "Note", "Long"]
    assert j["tops_by_sort"]["tracks"]["streams"][0]["streams"] == 20
    j = get_resume(client, range="year", offset=1).json()
    assert names(j["tops_by_sort"]["tracks"]["streams"]) == ["Court"]
    assert j["tops_by_sort"]["tracks"]["streams"][0]["streams"] == 2


def test_tops_by_sort_tie_break_et_limite(client, db, make_user):
    user = make_user(session_id="sid-r")
    ar = Artist(name="AR")
    db.add(ar)
    db.commit()
    al = Album(name="AL", artist_id=ar.id)
    db.add(al)
    db.commit()
    ts = [Track(title=f"T{i}", duration_ms=180000, artist_id=ar.id, album_id=al.id) for i in range(7)]
    db.add_all(ts)
    db.commit()
    for t in ts:  # tous strictement égaux
        db.add(TrackHistory(played_at=datetime(2026, 1, 1), ms_played=60000, provider=MusicProvider.SPOTIFY,
                            user_id=user.id, track_id=t.id, artist_id=ar.id, album_id=al.id))
    db.commit()
    ids = sorted(t.id for t in ts)
    for _ in range(2):
        j = get_resume(client, range="lifetime").json()
        for crit in ("streams", "minutes", "rating"):
            lst = j["tops_by_sort"]["tracks"][crit]
            assert len(lst) == 5
            assert [i["id"] for i in lst] == ids[:5]


def test_tops_by_sort_retro_compatibilite(client, tops_data):
    j = get_resume(client, range="lifetime", sort="minutes").json()
    assert names(j["topTracks"]) == ["Note", "Long", "Court"]
    assert j["topTracks"] == j["tops_by_sort"]["tracks"]["minutes"]
    j = get_resume(client, range="lifetime").json()
    assert j["topTracks"] == j["tops_by_sort"]["tracks"]["streams"]
    j = get_resume(client, range="lifetime", sort="rating").json()
    assert j["topTracks"] == j["tops_by_sort"]["tracks"]["rating"]


def test_minutes_affichees_coherentes_avec_le_tri(client, db, make_user):
    """Le tri par temps d'écoute (somme exacte des ms) et la valeur affichée doivent concorder :
    beaucoup d'écoutes courtes (< 1 min) ne doivent pas être comptées 0 minute chacune."""
    user = make_user(session_id="sid-r")
    rows = {}
    for name, plays, ms in (("Courtes", 300, 59_000), ("Longues", 10, 1_500_000)):
        ar = Artist(name=name)
        db.add(ar)
        db.commit()
        al = Album(name=f"AL-{name}", artist_id=ar.id)
        db.add(al)
        db.commit()
        tr = Track(title=f"T-{name}", duration_ms=ms, artist_id=ar.id, album_id=al.id)
        db.add(tr)
        db.commit()
        for _ in range(plays):
            db.add(TrackHistory(played_at=datetime(2026, 1, 1), ms_played=ms, provider=MusicProvider.SPOTIFY,
                                user_id=user.id, track_id=tr.id, artist_id=ar.id, album_id=al.id))
        db.commit()
        rows[name] = plays * ms // 60_000
    j = get_resume(client, range="lifetime").json()
    artists = j["tops_by_sort"]["artists"]["minutes"]
    assert [a["name"] for a in artists] == ["Courtes", "Longues"]  # 295 min contre 250 min
    assert [a["minutes"] for a in artists] == [rows["Courtes"], rows["Longues"]]
    values = [a["minutes"] for a in artists]
    assert values == sorted(values, reverse=True)
