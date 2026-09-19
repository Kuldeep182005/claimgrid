-- =============================================
-- ClaimGrid V3 — Add game_sessions and scope cells to sessions
-- =============================================

-- 1. Create game_sessions table for private 2-player battles
CREATE TABLE game_sessions (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code              VARCHAR(10) NOT NULL UNIQUE,
    status            VARCHAR(20) NOT NULL,
    player1_id        UUID NOT NULL REFERENCES players(id),
    player2_id        UUID REFERENCES players(id),
    current_player_id UUID REFERENCES players(id),
    turn_number       INT NOT NULL DEFAULT 0,
    winner_id         UUID REFERENCES players(id),
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    started_at        TIMESTAMP,
    finished_at       TIMESTAMP
);

CREATE INDEX idx_game_sessions_code ON game_sessions(code);
CREATE INDEX idx_game_sessions_status ON game_sessions(status);

-- 2. Add session_id to cells table (nullable to safely preserve existing global 50x50 cells)
ALTER TABLE cells ADD COLUMN session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE;

-- 3. Drop legacy constraint on (x, y) to allow coordinates (0..24) in game sessions
ALTER TABLE cells DROP CONSTRAINT uq_cells_coordinates;

-- 4. Add unique index for session-scoped cells and global cells
CREATE UNIQUE INDEX uq_cells_session_coordinates ON cells (session_id, x, y) WHERE session_id IS NOT NULL;
CREATE UNIQUE INDEX uq_cells_global_coordinates ON cells (x, y) WHERE session_id IS NULL;

-- 5. Index for fast cell queries by session
CREATE INDEX idx_cells_session_id ON cells(session_id);
