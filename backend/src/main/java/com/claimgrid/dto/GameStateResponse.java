package com.claimgrid.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GameStateResponse {

    private int width;
    private int height;
    private long totalCells;
    private long claimedCells;
    private List<CellResponse> cells;
}
