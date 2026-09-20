package com.claimgrid.entity;

public enum CellType {
    PLAIN(1),
    FOREST(2),
    QUARRY(3),
    HILL(4);

    private final int value;

    CellType(int value) {
        this.value = value;
    }

    public int getValue() {
        return value;
    }
}
