-- =============================================
-- ClaimGrid V1 — Initial Schema
-- =============================================

-- Players table
CREATE TABLE players (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username        VARCHAR(30)  NOT NULL,
    color           VARCHAR(7)   NOT NULL,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cells_claimed   INT          NOT NULL DEFAULT 0,
    current_streak  INT          NOT NULL DEFAULT 0,

    CONSTRAINT uq_players_username UNIQUE (username)
);

-- Cells table
CREATE TABLE cells (
    id          BIGSERIAL PRIMARY KEY,
    x           INT          NOT NULL,
    y           INT          NOT NULL,
    owner_id    UUID         REFERENCES players(id),
    claimed_at  TIMESTAMP,

    CONSTRAINT uq_cells_coordinates UNIQUE (x, y)
);

-- Index for fast lookups by owner
CREATE INDEX idx_cells_owner_id ON cells(owner_id);

-- Seed the 50x50 grid (2,500 cells)
INSERT INTO cells (x, y)
SELECT x, y
FROM generate_series(0, 49) AS x,
     generate_series(0, 49) AS y;
