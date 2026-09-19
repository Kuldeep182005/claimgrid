package com.claimgrid.exception;

import com.claimgrid.dto.ClaimStatus;
import lombok.Getter;

@Getter
public class ClaimRejectedException extends RuntimeException {

    private final ClaimStatus status;

    public ClaimRejectedException(String message) {
        super(message);
        this.status = ClaimStatus.CELL_ALREADY_CLAIMED;
    }

    public ClaimRejectedException(ClaimStatus status, String message) {
        super(message);
        this.status = status;
    }
}
