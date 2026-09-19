-- =============================================
-- ClaimGrid V2 — Add last_claim_at to players for server-side cooldown tracking
-- =============================================

ALTER TABLE players ADD COLUMN last_claim_at TIMESTAMP;
