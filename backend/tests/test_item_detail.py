from datetime import datetime, timedelta

import pytest
from sqlmodel import select

from app.models import Album, Artist, MusicProvider, Track, TrackHistory

NOW = datetime.utcnow()


@pytest.fixture
def setup(db, make_user):
    a = make_user(session_id="sid-a")
    b = make_user(session_id="sid-b")
    ar1, ar2 = Artist(name="A1", image_url="ar1.jpg"), Artist(name="A2")
    db.add_all([ar1, ar2]); db.commit()
    al1 = Album(name="B1", artist_id=ar1.id, image_url="al1.jpg")
    al2 = Album(name="B2", artist_id=ar2.id)
    db.add_all([al1, al2]); db.commit()
    t1 = Track(title="T1", duration_ms=180000, artist_id=ar1.id, album_id=al1.id)
    t2 = Track(title="T2", duration_ms=180000, artist_id=ar1.id, album_id=al1.id)
    t3 = Track(title="T3", duration_ms=180000, artist_id=ar2.id, album_id=al2.id)
    never = Track(title="Jamais", duration_ms=1000, artist_id=ar2.id, album_id=al2.id)
    db.add_all([t1, t2, t3, never]); db.commit()

    def listen(user, track, when, ms=60000):
        db.add(TrackHistory(played_at=when, ms_played=ms, provider=MusicProvider.SPOTIFY, user_id=user.id,
                            track_id=track.id, artist_id=track.artist_id, album_id=track.album_id))
        db.commit()

    return dict(a=a, b=b, ar1=ar1, ar2=ar2, al1=al1, al2=al2, t1=t1, t2=t2, t3=t3, never=never, listen=listen)


def get(client, path, sid="sid-a", **params):
    client.cookies.set("session_id", sid)
    return client.get(f"/data/my/{path}/detail", params=params)


def test_non_connecte(client, setup):
    client.cookies.clear()
    assert client.get(f"/data/my/tracks/{setup['t1'].id}/detail").status_code == 401


def test_track_complet(client, setup):
    s = setup
    for i in range(3):
        s["listen"](s["a"], s["t1"], datetime(2026, 1, 1 + i, 10), 120000)
    s["listen"](s["a"], s["t2"], datetime(2026, 1, 1, 11), 60000)
    s["listen"](s["a"], s["t3"], datetime(2026, 1, 1, 12), 60000)
    r = get(client, f"tracks/{s['t1'].id}")
    assert r.status_code == 200
    j = r.json()
    assert j["entity"] == {"type": "track", "id": s["t1"].id, "name": "T1", "image": "al1.jpg",
                           "artist": {"id": s["ar1"].id, "name": "A1"}, "album": {"id": s["al1"].id, "name": "B1"}}
    st = j["stats"]
    assert (st["streams"], st["minutes"], st["active_days"]) == (3, 6, 3)
    assert st["avg_minutes_per_active_day"] == 2.0
    assert st["share_of_total_streams"] == 60.0
    assert st["first_played_at"] == "2026-01-01T10:00:00Z" and st["last_played_at"] == "2026-01-03T10:00:00Z"
    assert st["rating"] is not None and st["rating"] > 0
    assert st["rank"] == {"streams": 1, "minutes": 1, "rating": 1, "out_of": 3}
    assert j["children"] == {"tracks": None, "albums": None}
    assert len(j["recent_plays"]) == 3 and j["recent_plays"][0]["played_at"] == "2026-01-03T10:00:00Z"


def test_rang_et_part(client, setup):
    s = setup
    s["listen"](s["a"], s["t1"], datetime(2026, 1, 1))
    for i in range(3):
        s["listen"](s["a"], s["t2"], datetime(2026, 1, 2 + i))
    r = get(client, f"tracks/{s['t1'].id}").json()["stats"]
    assert r["rank"]["streams"] == 2 and r["rank"]["minutes"] == 2 and r["rank"]["out_of"] == 2
    assert r["share_of_total_streams"] == 25.0


def test_album_et_enfants(client, setup):
    s = setup
    s["listen"](s["a"], s["t1"], datetime(2026, 1, 1))
    s["listen"](s["a"], s["t1"], datetime(2026, 1, 2))
    s["listen"](s["a"], s["t2"], datetime(2026, 1, 3))
    s["listen"](s["a"], s["t3"], datetime(2026, 1, 3))
    j = get(client, f"albums/{s['al1'].id}").json()
    assert j["entity"]["type"] == "album" and j["entity"]["artist"]["name"] == "A1" and j["entity"]["album"] is None
    assert j["children"]["albums"] is None
    assert [(c["name"], c["streams"], c["minutes"]) for c in j["children"]["tracks"]] == [("T1", 2, 2), ("T2", 1, 1)]
    assert j["children"]["tracks"][0]["image"] == "al1.jpg"
    assert j["stats"]["streams"] == 3 and j["stats"]["rank"]["streams"] == 1 and j["stats"]["rank"]["out_of"] == 2


def test_artiste_et_enfants(client, setup):
    s = setup
    s["listen"](s["a"], s["t1"], datetime(2026, 1, 1))
    s["listen"](s["a"], s["t1"], datetime(2026, 1, 2))
    s["listen"](s["a"], s["t2"], datetime(2026, 1, 3))
    j = get(client, f"artists/{s['ar1'].id}").json()
    assert j["entity"] == {"type": "artist", "id": s["ar1"].id, "name": "A1", "image": "ar1.jpg", "artist": None, "album": None}
    assert [c["name"] for c in j["children"]["tracks"]] == ["T1", "T2"]
    assert [(c["name"], c["streams"]) for c in j["children"]["albums"]] == [("B1", 3)]


def test_404(client, setup):
    s = setup
    s["listen"](s["a"], s["t1"], datetime(2026, 1, 1))
    assert get(client, "tracks/99999").status_code == 404
    assert get(client, "albums/99999").status_code == 404
    assert get(client, "artists/99999").status_code == 404
    r = get(client, f"tracks/{s['never'].id}")
    assert r.status_code == 404 and "Aucune écoute" in r.json()["detail"]
    assert client.get("/data/my/foo/1/detail").status_code == 422


def test_isolation(client, setup):
    s = setup
    s["listen"](s["a"], s["t1"], datetime(2026, 1, 1))
    s["listen"](s["b"], s["t3"], datetime(2026, 1, 1))
    assert get(client, f"tracks/{s['t1'].id}", sid="sid-b").status_code == 404
    assert get(client, f"artists/{s['ar1'].id}", sid="sid-b").status_code == 404
    j = get(client, f"tracks/{s['t3'].id}", sid="sid-a")
    assert j.status_code == 404
    st = get(client, f"tracks/{s['t1'].id}").json()["stats"]
    assert st["streams"] == 1 and st["share_of_total_streams"] == 100.0 and st["rank"]["out_of"] == 1


def test_periode_vide_ailleurs_ecoutes(client, setup):
    s = setup
    s["listen"](s["a"], s["t1"], datetime(2020, 1, 1))
    s["listen"](s["a"], s["t2"], NOW)
    r = get(client, f"tracks/{s['t1'].id}", range="year")
    assert r.status_code == 200
    j = r.json()
    st = j["stats"]
    assert (st["streams"], st["minutes"], st["active_days"], st["avg_minutes_per_active_day"]) == (0, 0, 0, 0.0)
    assert st["rating"] is None and st["first_played_at"] is None
    assert st["rank"] == {"streams": None, "minutes": None, "rating": None, "out_of": 1}
    assert j["recent_plays"] == [] and j["charts"]["cumulative"] == [] and j["charts"]["annual"] == []
    assert len(j["charts"]["hourly"]) == 24
    # dates personnalisées
    r = get(client, f"tracks/{s['t1'].id}", start_date="2019-12-31T00:00:00", end_date="2020-01-02T00:00:00")
    assert r.json()["stats"]["streams"] == 1
    assert get(client, f"tracks/{s['t1'].id}", range="bad").status_code == 422


def test_recent_plays_bornes_et_tries(client, setup):
    s = setup
    for i in range(25):
        s["listen"](s["a"], s["t1"], datetime(2026, 1, 1) + timedelta(hours=i))
    rp = get(client, f"tracks/{s['t1'].id}").json()["recent_plays"]
    assert len(rp) == 20
    assert rp[0]["played_at"] == "2026-01-02T00:00:00Z"
    assert [p["played_at"] for p in rp] == sorted((p["played_at"] for p in rp), reverse=True)


def test_minutes_exactes(client, setup):
    s = setup
    for i in range(10):
        s["listen"](s["a"], s["t1"], datetime(2026, 1, 1, i), 50000)  # 10 x 50 s = 500 s = 8 min
    j = get(client, f"tracks/{s['t1'].id}").json()
    assert j["stats"]["minutes"] == 8
    assert get(client, f"artists/{s['ar1'].id}").json()["children"]["tracks"][0]["minutes"] == 8


def test_charts_memes_formes_que_le_dashboard(client, setup):
    s = setup
    s["a"].slug = "bob"
    s["listen"](s["a"], s["t1"], datetime(2026, 1, 5, 14), 90000)
    s["listen"](s["a"], s["t1"], datetime(2027, 3, 6, 9), 90000)
    client.cookies.set("session_id", "sid-a")
    dash = client.get("/profile/dashboard/bob")
    if dash.status_code != 200:
        dash = client.get("/dashboard/bob")
    assert dash.status_code == 200
    d = dash.json()
    c = get(client, f"tracks/{s['t1'].id}").json()["charts"]
    assert c["hourly"] == d["clockData"] and c["weekly"] == d["weeklyData"] and c["monthly"] == d["monthlyData"]
    assert c["annual"] == d["annualData"] and c["cumulative"] == d["cumulativeData"]


def test_children_sans_plafond(client, db, make_user):
    """Un artiste avec plus de 10 titres et plus de 10 albums les renvoie tous (liste défilante côté frontend)."""
    user = make_user(session_id="sid-all")
    ar = Artist(name="Prolifique")
    db.add(ar)
    db.commit()
    for i in range(60):
        al = Album(name=f"AL{i}", artist_id=ar.id)
        db.add(al)
        db.commit()
        tr = Track(title=f"T{i}", duration_ms=180000, artist_id=ar.id, album_id=al.id)
        db.add(tr)
        db.commit()
        db.add(TrackHistory(played_at=datetime(2026, 1, 1, 10), ms_played=60000, provider=MusicProvider.SPOTIFY,
                            user_id=user.id, track_id=tr.id, artist_id=ar.id, album_id=al.id))
    db.commit()
    client.cookies.set("session_id", "sid-all")
    j = client.get(f"/data/my/artists/{ar.id}/detail").json()
    assert len(j["children"]["tracks"]) == 60
    assert len(j["children"]["albums"]) == 60
    ids = [t["id"] for t in j["children"]["tracks"]]
    assert ids == sorted(ids)  # égalités : départagées par id, ordre stable
    al_id = db.exec(select(Album).where(Album.name == "AL0")).first().id
    j = client.get(f"/data/my/albums/{al_id}/detail").json()
    assert len(j["children"]["tracks"]) == 1
