package com.claimgrid.controller;

import com.claimgrid.dto.ClaimCellRequest;
import com.claimgrid.dto.ClaimCellResponse;
import com.claimgrid.dto.CreateGameRequest;
import com.claimgrid.dto.GameSessionResponse;
import com.claimgrid.dto.JoinGameRequest;
import com.claimgrid.dto.SessionGameStateResponse;
import com.claimgrid.service.BattleSessionService;
import com.claimgrid.service.ClaimService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/games")
public class BattleController {

    private final BattleSessionService battleSessionService;
    private final ClaimService claimService;

    public BattleController(BattleSessionService battleSessionService, ClaimService claimService) {
        this.battleSessionService = battleSessionService;
        this.claimService = claimService;
    }

    @PostMapping
    public GameSessionResponse createGame(@Valid @RequestBody CreateGameRequest request) {
        return battleSessionService.createGame(request.getPlayerId());
    }

    @PostMapping("/{code}/join")
    public GameSessionResponse joinGame(@PathVariable String code, @Valid @RequestBody JoinGameRequest request) {
        return battleSessionService.joinGame(code, request.getPlayerId());
    }

    @GetMapping("/{gameId}/state")
    public SessionGameStateResponse getSessionState(@PathVariable UUID gameId) {
        return battleSessionService.getSessionState(gameId);
    }

    @PostMapping("/{gameId}/cells/{cellId}/claim")
    public ClaimCellResponse claimCell(@PathVariable UUID gameId,
                                       @PathVariable Long cellId,
                                       @Valid @RequestBody ClaimCellRequest request) {
        return claimService.claimCell(gameId, request.getPlayerId(), cellId, request.getTurnNumber());
    }
}
