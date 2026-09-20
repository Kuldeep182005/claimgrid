ALTER TABLE players
    ADD COLUMN is_bot BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE game_sessions
    ADD COLUMN is_practice BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX idx_players_is_bot ON players(is_bot);
CREATE INDEX idx_game_sessions_is_practice ON game_sessions(is_practice);
