package com.claimgrid.dto;

/**
 * Domain status representing the outcome of a cell claim attempt.
 *
 * Clearly distinguishes success and distinct rejection causes,
 * enabling downstream subsystems (such as WebSocket event dispatch in Phase 5)
 * to accurately serialize CELL_CLAIMED or CLAIM_REJECTED payloads.
 */
public enum ClaimStatus {
    SUCCESS,
    PLAYER_NOT_FOUND,
    CELL_NOT_FOUND,
    CELL_ALREADY_CLAIMED,
    COOLDOWN_ACTIVE,
    INVALID_REQUEST
}
