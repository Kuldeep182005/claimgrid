package com.claimgrid.exception;

public class InvalidGameRequestException extends RuntimeException {

    public InvalidGameRequestException(String message) {
        super(message);
    }
}
