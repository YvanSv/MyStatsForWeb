CREATE OR REPLACE FUNCTION repair_track_history()
RETURNS integer AS $$
DECLARE
    rows_updated integer;
BEGIN
    WITH target_ids AS (
        SELECT id 
        FROM trackhistory 
        WHERE artist_id IS NULL OR album_id IS NULL
        LIMIT 25000
    )
    UPDATE trackhistory
    SET 
        artist_id = track.artist_id,
        album_id = track.album_id
    FROM track, target_ids
    WHERE trackhistory.id = target_ids.id
      AND trackhistory.spotify_id = track.spotify_id;
      
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    RETURN rows_updated;
END;
$$ LANGUAGE plpgsql;