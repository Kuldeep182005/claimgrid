package com.claimgrid.dto;

/**
 * Domain status representing the outcome of a cell claim attempt.
 *
 * Clearly distinguishes success and distinct rejection causes,
 * enabling downstream subsystems (such as WebSocket event dispatch)
 * to accurately serialize CELL_CLAIMED or CLAIM_REJECTED payloads.
 */
public enum ClaimStatus {
    SUCCESS,
    PLAYER_NOT_FOUND,
    CELL_NOT_FOUND,
    CELL_ALREADY_CLAIMED,
    COOLDOWN_ACTIVE,
    NOT_YOUR_TURN,
    GAME_NOT_ACTIVE,
    NOT_IN_GAME,
    GAME_FINISHED,
    INVALID_REQUEST,
    FRONTIER_INVALID,
    ATTACK_REJECTED,
    ATTACK_SUCCESS
}
