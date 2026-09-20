-- =============================================
-- ClaimGrid V6 — Add 4-player match support
-- =============================================

ALTER TABLE game_sessions
    ADD COLUMN max_players INT NOT NULL DEFAULT 2,
    ADD COLUMN player3_id UUID REFERENCES players(id),
    ADD COLUMN player4_id UUID REFERENCES players(id),
    ADD COLUMN player3_score INT NOT NULL DEFAULT 0,
    ADD COLUMN player4_score INT NOT NULL DEFAULT 0;
