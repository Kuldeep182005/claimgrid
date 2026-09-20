package com.claimgrid.dto;

import com.claimgrid.entity.Cell;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CellResponse {

    private Long id;
    private int x;
    private int y;
    private UUID ownerId;
    private Instant claimedAt;
    private String cellType;
    private int cellValue;

    public static CellResponse fromEntity(Cell cell) {
        return CellResponse.builder()
                .id(cell.getId())
                .x(cell.getX())
                .y(cell.getY())
                .ownerId(cell.getOwnerId())
                .claimedAt(cell.getClaimedAt())
                .cellType(cell.getCellType() == null ? null : cell.getCellType().name())
                .cellValue(cell.getCellValue())
                .build();
    }
}
