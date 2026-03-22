from sqlalchemy import Float, cast, func
from app.models import Track, TrackHistory

def get_formula(model, total_ms, potential_dur, play_count):
    # On s'assure que rien n'est NULL avant de commencer
    safe_ms = func.coalesce(cast(total_ms, Float), 0.0)
    safe_cnt = func.coalesce(cast(play_count, Float), 0.0)
    # On évite le log(0) en mettant une valeur minuscule (0.0001) au lieu de 0
    safe_log_m = func.log(func.nullif(safe_ms / 60000.0, 0))
    safe_log_cnt = func.log(func.nullif(safe_cnt, 0))
    
    # Calcul de l'engagement sécurisé
    # Si potential_dur est NULL, on le remplace par safe_ms pour éviter engagement = NULL
    safe_pot = func.nullif(cast(potential_dur, Float), 0)
    e = safe_ms / func.coalesce(safe_pot, safe_ms, 1.0) 

    divider = 3.1 if model == Track else 3.75
    
    # La formule finale entourée d'un COALESCE global
    formula = (safe_log_m + safe_log_cnt) * e / divider
    
    return func.coalesce(formula, 0.0).label("rating")

def get_formulas():
    raw_ms = cast(func.sum(TrackHistory.ms_played), Float)
    raw_duration = func.nullif(cast(func.sum(Track.duration_ms), Float), 0)
    cnt = func.count(TrackHistory.id)
    
    m = raw_ms / 60000.0
    e = raw_ms / raw_duration
    
    f_track = (func.log(func.nullif(m, 0)) + func.log(func.nullif(cnt, 0))) * e / 3.1
    f_album = (func.log(func.nullif(m, 0)) + func.log(func.nullif(cnt, 0))) * e / 3.75
    f_artist = (func.log(func.nullif(m, 0)) + func.log(func.nullif(cnt, 0))) * e / 3.75
    
    return f_track, f_album, f_artist