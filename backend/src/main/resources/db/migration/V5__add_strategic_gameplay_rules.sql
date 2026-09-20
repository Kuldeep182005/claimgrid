ALTER TABLE cells
    ADD COLUMN cell_type VARCHAR(32) NOT NULL DEFAULT 'PLAIN';

ALTER TABLE cells
    ADD COLUMN cell_value INT NOT NULL DEFAULT 1;

ALTER TABLE game_sessions
    ADD COLUMN turn_limit INT NOT NULL DEFAULT 40,
    ADD COLUMN player1_score INT NOT NULL DEFAULT 0,
    ADD COLUMN player2_score INT NOT NULL DEFAULT 0;

UPDATE cells
SET cell_type = 'PLAIN', cell_value = 1
WHERE cell_type IS NULL;

CREATE INDEX idx_cells_session_type ON cells(session_id, cell_type);
