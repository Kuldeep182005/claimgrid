package com.claimgrid.service;

import com.claimgrid.dto.CellResponse;
import com.claimgrid.dto.GameStateResponse;
import com.claimgrid.entity.Cell;
import com.claimgrid.repository.CellRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class GameService {

    private static final Logger log = LoggerFactory.getLogger(GameService.class);

    public static final int GRID_WIDTH = 50;
    public static final int GRID_HEIGHT = 50;

    private final CellRepository cellRepository;

    public GameService(CellRepository cellRepository) {
        this.cellRepository = cellRepository;
    }

    @Transactional(readOnly = true)
    public GameStateResponse getGameState() {
        List<Cell> cells = cellRepository.findAllGlobalCellsOrderByYAscXAsc();

        long claimedCount = cells.stream()
                .filter(Cell::isClaimed)
                .count();

        List<CellResponse> cellResponses = cells.stream()
                .map(CellResponse::fromEntity)
                .toList();

        log.debug("Loaded authoritative game state: {} total cells, {} claimed", cells.size(), claimedCount);

        return GameStateResponse.builder()
                .width(GRID_WIDTH)
                .height(GRID_HEIGHT)
                .totalCells(cells.size())
                .claimedCells(claimedCount)
                .cells(cellResponses)
                .build();
    }
}
