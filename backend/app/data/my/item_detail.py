"""Détail statistique d'UN élément (titre, album ou artiste) de l'utilisateur connecté.

GET /data/my/{tracks|albums|artists}/{id}/detail
Toutes les dates sont en UTC (played_at est stocké en UTC) et sérialisées en ISO 8601 avec suffixe « Z ».
"""
from datetime import datetime, timezone
from typing import List, Literal, Optional
from fastapi import APIRouter, Depends, HTTPException, Path, Query
from pydantic import BaseModel
from sqlalchemy import case, desc, func
from sqlmodel import Session, select
from app.auth.utils.auth_utils import get_current_user_id
from app.data.my.resume import get_range_dates
from app.database import get_session
from app.models import Album, Artist, Track, TrackHistory
from app.profile.dashboard.dashboard_data import build_cumulative, process_temporal_data
from app.utils.rating import get_formulas

router = APIRouter()

EntityKind = Literal["tracks", "albums", "artists"]
RangeKind = Literal["lifetime", "day", "month", "season", "year"]
TYPE_NAME = {"tracks": "track", "albums": "album", "artists": "artist"}
HISTORY_COL = {"tracks": TrackHistory.track_id, "albums": TrackHistory.album_id, "artists": TrackHistory.artist_id}


class ParentRef(BaseModel):
    id: int
    name: str


class EntityInfo(BaseModel):
    type: Literal["track", "album", "artist"]
    id: int
    name: str
    image: Optional[str] = None
    artist: Optional[ParentRef] = None
    album: Optional[ParentRef] = None


class Rank(BaseModel):
    streams: Optional[int] = None
    minutes: Optional[int] = None
    rating: Optional[int] = None
    out_of: int


class DetailStats(BaseModel):
    streams: int
    minutes: int
    rating: Optional[float] = None
    first_played_at: Optional[str] = None
    last_played_at: Optional[str] = None
    active_days: int
    avg_minutes_per_active_day: float
    share_of_total_streams: float
    rank: Rank


class ChildItem(BaseModel):
    id: int
    name: str
    image: Optional[str] = None
    streams: int
    minutes: int
    rating: Optional[float] = None


class Children(BaseModel):
    tracks: Optional[List[ChildItem]] = None
    albums: Optional[List[ChildItem]] = None


class RecentPlay(BaseModel):
    played_at: str
    ms_played: int


class ItemDetailResponse(BaseModel):
    entity: EntityInfo
    stats: DetailStats
    charts: dict
    children: Children
    recent_plays: List[RecentPlay]


def _iso(dt: Optional[datetime]) -> Optional[str]:
    if dt is None:
        return None
    if isinstance(dt, str):
        dt = datetime.fromisoformat(dt)
    if dt.tzinfo is not None:
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt.isoformat() + "Z"


def _load_entity(db: Session, kind: str, item_id: int) -> EntityInfo:
    notfound = HTTPException(status_code=404, detail="Élément introuvable")
    if kind == "tracks":
        r = db.exec(
            select(Track.id, Track.title, Album.image_url, Artist.id.label("ar_id"), Artist.name.label("ar_name"),
                   Album.id.label("al_id"), Album.name.label("al_name"))
            .select_from(Track)
            .outerjoin(Album, Album.id == Track.album_id)
            .outerjoin(Artist, Artist.id == Track.artist_id)
            .where(Track.id == item_id)
        ).first()
        if not r: raise notfound
        return EntityInfo(type="track", id=r.id, name=r.title, image=r.image_url,
                          artist=ParentRef(id=r.ar_id, name=r.ar_name) if r.ar_id is not None else None,
                          album=ParentRef(id=r.al_id, name=r.al_name) if r.al_id is not None else None)
    if kind == "albums":
        r = db.exec(
            select(Album.id, Album.name, Album.image_url, Artist.id.label("ar_id"), Artist.name.label("ar_name"))
            .select_from(Album).outerjoin(Artist, Artist.id == Album.artist_id).where(Album.id == item_id)
        ).first()
        if not r: raise notfound
        return EntityInfo(type="album", id=r.id, name=r.name, image=r.image_url,
                          artist=ParentRef(id=r.ar_id, name=r.ar_name) if r.ar_id is not None else None)
    r = db.exec(select(Artist.id, Artist.name, Artist.image_url).where(Artist.id == item_id)).first()
    if not r: raise notfound
    return EntityInfo(type="artist", id=r.id, name=r.name, image=r.image_url)


def _period_filters(user_id, range_, offset, start_date, end_date):
    """Filtres de période : start_date/end_date (comme le dashboard, bornes incluses) priment sur range/offset."""
    filters = [TrackHistory.user_id == user_id]
    if start_date or end_date:
        if start_date: filters.append(TrackHistory.played_at >= start_date)
        if end_date: filters.append(TrackHistory.played_at <= end_date)
    elif range_ != "lifetime":
        start, end = get_range_dates(range_, offset)
        filters += [TrackHistory.played_at >= start, TrackHistory.played_at < end]
    return filters


def _rank(db: Session, kind: str, item_id: int, period: list, formula) -> Rank:
    """Rang = 1 + nombre d'éléments du même type (même période) strictement meilleurs, par agrégats SQL."""
    gid = HISTORY_COL[kind]
    sub = (
        select(gid.label("gid"), func.count(TrackHistory.id).label("s"),
               func.sum(TrackHistory.ms_played).label("ms"), formula.label("r"))
        .select_from(TrackHistory).join(Track, Track.id == TrackHistory.track_id)
        .where(*period, gid.isnot(None)).group_by(gid).subquery()
    )

    def better(col):
        mine = select(col).where(sub.c.gid == item_id).scalar_subquery()
        return func.sum(case((col > mine, 1), else_=0))

    row = db.exec(select(func.count(), better(sub.c.s), better(sub.c.ms), better(sub.c.r)).select_from(sub)).first()
    out_of = int(row[0] or 0)
    present = db.exec(select(func.count()).select_from(sub).where(sub.c.gid == item_id)).first() or 0
    if not present:
        return Rank(streams=None, minutes=None, rating=None, out_of=out_of)
    return Rank(streams=int(row[1] or 0) + 1, minutes=int(row[2] or 0) + 1, rating=int(row[3] or 0) + 1, out_of=out_of)


def _children(db: Session, kind: str, item_id: int, period: list, formula) -> Children:
    def top(group_col, id_col, name_col, image_col, limit, extra_filter, joined_album):
        q = select(id_col.label("id"), name_col.label("name"), image_col.label("image"),
                   func.count(TrackHistory.id).label("streams"),
                   func.sum(TrackHistory.ms_played).label("ms"), formula.label("rating")
                   ).select_from(TrackHistory).join(Track, Track.id == TrackHistory.track_id)
        q = q.outerjoin(Album, Album.id == (Track.album_id if joined_album == "track" else TrackHistory.album_id))
        q = (q.where(*period, extra_filter, group_col.isnot(None))
             .group_by(id_col, name_col, image_col)
             .order_by(desc(func.count(TrackHistory.id)), desc(func.sum(TrackHistory.ms_played)), id_col).limit(limit))
        return [ChildItem(id=r.id, name=r.name, image=r.image, streams=int(r.streams),
                          minutes=int((r.ms or 0) // 60000), rating=float(r.rating or 0.0)) for r in db.exec(q).all()]

    if kind == "tracks":
        return Children()
    if kind == "albums":
        tracks = top(TrackHistory.track_id, Track.id, Track.title, Album.image_url, 50, TrackHistory.album_id == item_id, "track")
        return Children(tracks=tracks)
    tracks = top(TrackHistory.track_id, Track.id, Track.title, Album.image_url, 10, TrackHistory.artist_id == item_id, "track")
    albums = top(TrackHistory.album_id, Album.id, Album.name, Album.image_url, 10, TrackHistory.artist_id == item_id, "history")
    return Children(tracks=tracks, albums=albums)


@router.get("/{entity}/{item_id}/detail", response_model=ItemDetailResponse,
            summary="Détail statistique d'un titre, album ou artiste de l'utilisateur connecté")
async def get_item_detail(
    entity: EntityKind = Path(...),
    item_id: int = Path(...),
    range: RangeKind = Query("lifetime"),
    offset: int = Query(0, ge=0),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_session),
):
    info = _load_entity(db, entity, item_id)
    period = _period_filters(user_id, range, offset, start_date, end_date)
    item_filter = HISTORY_COL[entity] == item_id
    filters = [*period, item_filter]
    f_track, f_album, f_artist = get_formulas()
    formula = {"tracks": f_track, "albums": f_album, "artists": f_artist}[entity]

    agg = db.exec(
        select(func.count(TrackHistory.id).label("streams"),
               func.coalesce(func.sum(TrackHistory.ms_played), 0).label("ms"),
               func.min(TrackHistory.played_at).label("first"), func.max(TrackHistory.played_at).label("last"),
               func.count(func.distinct(func.date(TrackHistory.played_at))).label("days"),
               formula.label("rating"))
        .select_from(TrackHistory).join(Track, Track.id == TrackHistory.track_id).where(*filters)
    ).first()
    streams = int(agg.streams or 0)

    if streams == 0:
        lifetime = db.exec(select(func.count(TrackHistory.id)).where(TrackHistory.user_id == user_id, item_filter)).first() or 0
        if lifetime == 0:
            raise HTTPException(status_code=404, detail="Aucune écoute de cet élément pour cet utilisateur")

    total_streams = db.exec(select(func.count(TrackHistory.id)).where(*period)).first() or 0
    ms = int(agg.ms or 0)
    days = int(agg.days or 0)

    clock, weekly, monthly, day_map, annual = process_temporal_data(db, filters)
    recent = db.exec(
        select(TrackHistory.played_at, TrackHistory.ms_played).where(*filters)
        .order_by(desc(TrackHistory.played_at), desc(TrackHistory.id)).limit(20)
    ).all()

    return ItemDetailResponse(
        entity=info,
        stats=DetailStats(
            streams=streams, minutes=ms // 60000,
            rating=float(agg.rating or 0.0) if streams else None,
            first_played_at=_iso(agg.first), last_played_at=_iso(agg.last),
            active_days=days,
            avg_minutes_per_active_day=round(ms / 60000 / days, 2) if days else 0.0,
            share_of_total_streams=round(streams * 100 / total_streams, 2) if total_streams else 0.0,
            rank=_rank(db, entity, item_id, period, formula),
        ),
        charts={"hourly": clock, "weekly": weekly, "monthly": monthly,
                "annual": sorted(annual.values(), key=lambda x: x["year"]), "cumulative": build_cumulative(day_map)},
        children=_children(db, entity, item_id, period, formula),
        recent_plays=[RecentPlay(played_at=_iso(r.played_at), ms_played=r.ms_played) for r in recent],
    )
