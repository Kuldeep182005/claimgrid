package com.claimgrid.controller;

import com.claimgrid.dto.ClaimCellRequest;
import com.claimgrid.dto.ClaimCellResponse;
import com.claimgrid.dto.GameStateResponse;
import com.claimgrid.service.ClaimService;
import com.claimgrid.service.GameService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/game")
public class GameController {

    private final GameService gameService;
    private final ClaimService claimService;

    public GameController(GameService gameService, ClaimService claimService) {
        this.gameService = gameService;
        this.claimService = claimService;
    }

    @GetMapping("/state")
    public GameStateResponse getGameState() {
        return gameService.getGameState();
    }

    @PostMapping("/cells/{id}/claim")
    public ClaimCellResponse claimCell(@PathVariable Long id, @Valid @RequestBody ClaimCellRequest request) {
        return claimService.claimCell(request.getPlayerId(), id);
    }
}
