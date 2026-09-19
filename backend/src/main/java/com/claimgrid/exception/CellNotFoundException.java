package com.claimgrid.exception;

public class CellNotFoundException extends RuntimeException {

    public CellNotFoundException(Long id) {
        super("Cell not found with ID: " + id);
    }

    public CellNotFoundException(int x, int y) {
        super("Cell not found at coordinates: (" + x + ", " + y + ")");
    }
}
