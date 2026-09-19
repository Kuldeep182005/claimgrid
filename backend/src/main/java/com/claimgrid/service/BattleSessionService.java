package com.claimgrid.service;

import com.claimgrid.dto.CellResponse;
import com.claimgrid.dto.GameSessionResponse;
import com.claimgrid.dto.PlayerSummaryDto;
import com.claimgrid.dto.SessionGameStateResponse;
import com.claimgrid.entity.Cell;
import com.claimgrid.entity.GameSession;
import com.claimgrid.entity.GameStatus;
import com.claimgrid.entity.Player;
import com.claimgrid.exception.InvalidGameRequestException;
import com.claimgrid.exception.PlayerNotFoundException;
import com.claimgrid.repository.CellRepository;
import com.claimgrid.repository.GameSessionRepository;
import com.claimgrid.repository.PlayerRepository;
import com.claimgrid.websocket.event.GameStartedDomainEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class BattleSessionService {

    private static final Logger log = LoggerFactory.getLogger(BattleSessionService.class);

    public static final int GRID_WIDTH = 25;
    public static final int GRID_HEIGHT = 25;
    public static final int TOTAL_CELLS = GRID_WIDTH * GRID_HEIGHT; // 625 cells

    private final GameSessionRepository gameSessionRepository;
    private final CellRepository cellRepository;
    private final PlayerRepository playerRepository;
    private final BattleCodeGenerator codeGenerator;
    private final ApplicationEventPublisher eventPublisher;

    public BattleSessionService(GameSessionRepository gameSessionRepository,
                                CellRepository cellRepository,
                                PlayerRepository playerRepository,
                                BattleCodeGenerator codeGenerator,
                                ApplicationEventPublisher eventPublisher) {
        this.gameSessionRepository = gameSessionRepository;
        this.cellRepository = cellRepository;
        this.playerRepository = playerRepository;
        this.codeGenerator = codeGenerator;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public GameSessionResponse createGame(UUID creatorPlayerId) {
        if (creatorPlayerId == null) {
            throw new InvalidGameRequestException("Creator player ID must not be null");
        }

        Player creator = playerRepository.findById(creatorPlayerId)
                .orElseThrow(() -> new PlayerNotFoundException(creatorPlayerId));

        // Generate unique battle code
        String code;
        int attempts = 0;
        do {
            code = codeGenerator.generateCode();
            attempts++;
            if (attempts > 50) {
                throw new IllegalStateException("Failed to generate unique battle code after 50 attempts");
            }
        } while (gameSessionRepository.existsByCode(code));

        Instant now = Instant.now();
        GameSession session = GameSession.builder()
                .code(code)
                .status(GameStatus.WAITING)
                .player1Id(creatorPlayerId)
                .turnNumber(0)
                .createdAt(now)
                .build();

        session = gameSessionRepository.save(session);

        // Generate 25x25 = 625 cells for this session
        List<Cell> cells = new ArrayList<>(TOTAL_CELLS);
        for (int y = 0; y < GRID_HEIGHT; y++) {
            for (int x = 0; x < GRID_WIDTH; x++) {
                cells.add(Cell.builder()
                        .sessionId(session.getId())
                        .x(x)
                        .y(y)
                        .build());
            }
        }
        cellRepository.saveAll(cells);

        log.info("Battle created [gameId={}, code={}, creator='{}' ({}), cells={}]",
                session.getId(), code, creator.getUsername(), creatorPlayerId, cells.size());

        return toGameSessionResponse(session);
    }

    @Transactional
    public GameSessionResponse joinGame(String rawCode, UUID joinerPlayerId) {
        if (joinerPlayerId == null) {
            throw new InvalidGameRequestException("Joining player ID must not be null");
        }
        if (rawCode == null || rawCode.trim().isEmpty()) {
            throw new InvalidGameRequestException("Battle code must not be empty");
        }

        String code = BattleCodeGenerator.normalize(rawCode);

        Player joiner = playerRepository.findById(joinerPlayerId)
                .orElseThrow(() -> new PlayerNotFoundException(joinerPlayerId));

        GameSession initial = gameSessionRepository.findByCode(code)
                .orElseThrow(() -> new InvalidGameRequestException("Battle not found with code: " + code));

        // Lock session row to serialize concurrent joins
        GameSession session = gameSessionRepository.findByIdForUpdate(initial.getId())
                .orElseThrow(() -> new InvalidGameRequestException("Battle not found with id: " + initial.getId()));

        if (session.getStatus() != GameStatus.WAITING) {
            throw new InvalidGameRequestException("Battle is already " + session.getStatus() + " and cannot be joined");
        }

        if (session.getPlayer2Id() != null) {
            throw new InvalidGameRequestException("Battle already has 2 players");
        }

        if (joinerPlayerId.equals(session.getPlayer1Id())) {
            throw new InvalidGameRequestException("Player cannot join their own battle");
        }

        Instant now = Instant.now();
        session.setPlayer2Id(joinerPlayerId);
        session.setStatus(GameStatus.ACTIVE);
        session.setStartedAt(now);
        session.setCurrentPlayerId(session.getPlayer1Id()); // Player 1 starts
        session.setTurnNumber(1);

        session = gameSessionRepository.save(session);

        log.info("Battle started [gameId={}, code={}, player1={}, player2='{}' ({})]",
                session.getId(), code, session.getPlayer1Id(), joiner.getUsername(), joinerPlayerId);

        // Publish event for post-commit WebSocket dispatch to both players
        eventPublisher.publishEvent(new GameStartedDomainEvent(
                session.getId(),
                session.getCode(),
                session.getPlayer1Id(),
                session.getPlayer2Id(),
                session.getCurrentPlayerId(),
                session.getTurnNumber()
        ));

        return toGameSessionResponse(session);
    }

    @Transactional(readOnly = true)
    public SessionGameStateResponse getSessionState(UUID gameId) {
        if (gameId == null) {
            throw new InvalidGameRequestException("Game ID must not be null");
        }

        GameSession session = gameSessionRepository.findById(gameId)
                .orElseThrow(() -> new InvalidGameRequestException("Battle not found with id: " + gameId));

        List<Cell> cells = cellRepository.findBySessionIdOrderByYAscXAsc(gameId);
        long claimedCount = cells.stream().filter(Cell::isClaimed).count();

        List<CellResponse> cellResponses = cells.stream()
                .map(CellResponse::fromEntity)
                .toList();

        List<PlayerSummaryDto> players = getPlayersSummary(session);

        return SessionGameStateResponse.builder()
                .gameId(session.getId())
                .code(session.getCode())
                .status(session.getStatus())
                .width(GRID_WIDTH)
                .height(GRID_HEIGHT)
                .totalCells(cells.size())
                .claimedCells(claimedCount)
                .currentPlayerId(session.getCurrentPlayerId())
                .turnNumber(session.getTurnNumber())
                .winnerId(session.getWinnerId())
                .startedAt(session.getStartedAt())
                .finishedAt(session.getFinishedAt())
                .players(players)
                .cells(cellResponses)
                .build();
    }

    private List<PlayerSummaryDto> getPlayersSummary(GameSession session) {
        List<PlayerSummaryDto> players = new ArrayList<>(2);
        if (session.getPlayer1Id() != null) {
            playerRepository.findById(session.getPlayer1Id()).ifPresent(p ->
                    players.add(PlayerSummaryDto.builder()
                            .id(p.getId())
                            .username(p.getUsername())
                            .color(p.getColor())
                            .cellsClaimed((int) cellRepository.countBySessionIdAndOwnerId(session.getId(), p.getId()))
                            .build())
            );
        }
        if (session.getPlayer2Id() != null) {
            playerRepository.findById(session.getPlayer2Id()).ifPresent(p ->
                    players.add(PlayerSummaryDto.builder()
                            .id(p.getId())
                            .username(p.getUsername())
                            .color(p.getColor())
                            .cellsClaimed((int) cellRepository.countBySessionIdAndOwnerId(session.getId(), p.getId()))
                            .build())
            );
        }
        return players;
    }

    private GameSessionResponse toGameSessionResponse(GameSession session) {
        return GameSessionResponse.builder()
                .gameId(session.getId())
                .code(session.getCode())
                .status(session.getStatus())
                .playerCount(session.getPlayerCount())
                .currentPlayerId(session.getCurrentPlayerId())
                .turnNumber(session.getTurnNumber())
                .winnerId(session.getWinnerId())
                .createdAt(session.getCreatedAt())
                .startedAt(session.getStartedAt())
                .finishedAt(session.getFinishedAt())
                .players(getPlayersSummary(session))
                .build();
    }
}
