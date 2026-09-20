package com.claimgrid.service;

import com.claimgrid.config.GameProperties;
import com.claimgrid.dto.CellResponse;
import com.claimgrid.dto.GameSessionResponse;
import com.claimgrid.dto.PlayerSummaryDto;
import com.claimgrid.dto.SessionGameStateResponse;
import com.claimgrid.dto.SessionResultResponse;
import com.claimgrid.entity.Cell;
import com.claimgrid.entity.CellType;
import com.claimgrid.entity.GameSession;
import com.claimgrid.entity.GameStatus;
import com.claimgrid.entity.Player;
import com.claimgrid.exception.InvalidGameRequestException;
import com.claimgrid.exception.PlayerNotFoundException;
import com.claimgrid.repository.CellRepository;
import com.claimgrid.repository.GameSessionRepository;
import com.claimgrid.repository.PlayerRepository;
import com.claimgrid.websocket.GameSessionManager;
import com.claimgrid.websocket.event.GameStartedDomainEvent;
import com.claimgrid.websocket.event.PlayerJoinedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
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
    private final GameSessionManager sessionManager;
    private final GameProperties gameProperties;

    public BattleSessionService(GameSessionRepository gameSessionRepository,
                                CellRepository cellRepository,
                                PlayerRepository playerRepository,
                                BattleCodeGenerator codeGenerator,
                                ApplicationEventPublisher eventPublisher,
                                GameSessionManager sessionManager,
                                GameProperties gameProperties) {
        this.gameSessionRepository = gameSessionRepository;
        this.cellRepository = cellRepository;
        this.playerRepository = playerRepository;
        this.codeGenerator = codeGenerator;
        this.eventPublisher = eventPublisher;
        this.sessionManager = sessionManager;
        this.gameProperties = gameProperties;
    }

    @Transactional
    public GameSessionResponse createGame(UUID creatorPlayerId) {
        return createGame(creatorPlayerId, 2);
    }

    @Transactional
    public GameSessionResponse createGame(UUID creatorPlayerId, Integer requestedMaxPlayers) {
        int maxPlayers = (requestedMaxPlayers != null) ? requestedMaxPlayers : 2;
        if (maxPlayers != 2 && maxPlayers != 4) {
            throw new InvalidGameRequestException("Invalid player count: must be 2 or 4");
        }

        if (creatorPlayerId == null) {
            throw new InvalidGameRequestException("Creator player ID must not be null");
        }

        Player creator = playerRepository.findById(creatorPlayerId)
                .orElseThrow(() -> new PlayerNotFoundException(creatorPlayerId));

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
                .maxPlayers(maxPlayers)
                .player1Id(creatorPlayerId)
                .turnNumber(0)
                .turnLimit(gameProperties.getMatchTurnLimit())
                .createdAt(now)
                .build();

        session = gameSessionRepository.save(session);

        List<Cell> cells = new ArrayList<>(TOTAL_CELLS);
        for (int y = 0; y < GRID_HEIGHT; y++) {
            for (int x = 0; x < GRID_WIDTH; x++) {
                CellType type = resolveCellType(x, y);
                cells.add(Cell.builder()
                        .sessionId(session.getId())
                        .x(x)
                        .y(y)
                        .cellType(type)
                        .cellValue(type.getValue() + (((x + y) % 2 == 0) ? 0 : 1))
                        .build());
            }
        }
        cellRepository.saveAll(cells);

        log.info("Battle created [gameId={}, code={}, maxPlayers={}, creator='{}' ({}), cells={}, turnLimit={}]",
                session.getId(), code, maxPlayers, creator.getUsername(), creatorPlayerId, cells.size(), session.getTurnLimit());

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

        GameSession session = gameSessionRepository.findByIdForUpdate(initial.getId())
                .orElseThrow(() -> new InvalidGameRequestException("Battle not found with id: " + initial.getId()));

        if (session.getStatus() != GameStatus.WAITING) {
            throw new InvalidGameRequestException("Battle is already " + session.getStatus() + " and cannot be joined");
        }

        if (session.isFull()) {
            throw new InvalidGameRequestException("Battle already has " + session.getMaxPlayers() + " players");
        }

        if (session.hasPlayer(joinerPlayerId)) {
            throw new InvalidGameRequestException("Player cannot join their own battle");
        }

        // Add player to the session
        session.addPlayer(joinerPlayerId);

        // Ensure distinct faction color among players
        List<String> existingColors = session.getPlayerIds().stream()
                .filter(id -> !id.equals(joinerPlayerId))
                .map(id -> playerRepository.findById(id).map(Player::getColor).orElse(""))
                .toList();
        if (existingColors.contains(joiner.getColor())) {
            for (String c : PlayerService.PALETTE) {
                if (!existingColors.contains(c)) {
                    joiner.setColor(c);
                    joiner = playerRepository.save(joiner);
                    break;
                }
            }
        }

        Instant now = Instant.now();

        if (session.getPlayerCount() == session.getMaxPlayers()) {
            session.setStatus(GameStatus.ACTIVE);
            session.setStartedAt(now);
            session.setTurnLimit(gameProperties.getMatchTurnLimit());
            session.setCurrentPlayerId(session.getPlayer1Id());
            session.setTurnNumber(1);

            assignFairStartingPositions(session);
            session = gameSessionRepository.save(session);

            log.info("Battle started [gameId={}, code={}, maxPlayers={}, players={}]",
                    session.getId(), code, session.getMaxPlayers(), session.getPlayerIds());

            eventPublisher.publishEvent(new GameStartedDomainEvent(
                    session.getId(),
                    session.getCode(),
                    session.getPlayer1Id(),
                    session.getPlayer2Id(),
                    session.getCurrentPlayerId(),
                    session.getTurnNumber(),
                    session.getMaxPlayers(),
                    session.getPlayer3Id(),
                    session.getPlayer4Id(),
                    session.getPlayerIds()
            ));
        } else {
            session = gameSessionRepository.save(session);
            log.info("Player '{}' ({}) joined battle [gameId={}, code={}, players={}/{}]",
                    joiner.getUsername(), joinerPlayerId, session.getId(), code, session.getPlayerCount(), session.getMaxPlayers());

            sessionManager.broadcastToGame(session.getId(), PlayerJoinedEvent.builder()
                    .gameId(session.getId())
                    .playerId(joiner.getId())
                    .playerName(joiner.getUsername())
                    .color(joiner.getColor())
                    .onlineCount(sessionManager.getOnlinePlayerCount())
                    .build());
        }

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
                .maxPlayers(session.getMaxPlayers())
                .width(GRID_WIDTH)
                .height(GRID_HEIGHT)
                .totalCells(cells.size())
                .claimedCells(claimedCount)
                .currentPlayerId(session.getCurrentPlayerId())
                .turnNumber(session.getTurnNumber())
                .turnLimit(session.getTurnLimit())
                .winnerId(session.getWinnerId())
                .player1Score(session.getPlayer1Score())
                .player2Score(session.getPlayer2Score())
                .player3Score(session.getPlayer3Score())
                .player4Score(session.getPlayer4Score())
                .startedAt(session.getStartedAt())
                .finishedAt(session.getFinishedAt())
                .practice(session.isPractice())
                .players(players)
                .cells(cellResponses)
                .onlineCount(sessionManager.getOnlinePlayerCount())
                .build();
    }

    @Transactional(readOnly = true)
    public SessionResultResponse getSessionResult(UUID gameId) {
        GameSession session = gameSessionRepository.findById(gameId)
                .orElseThrow(() -> new InvalidGameRequestException("Battle not found with id: " + gameId));

        return SessionResultResponse.builder()
                .gameId(session.getId())
                .maxPlayers(session.getMaxPlayers())
                .player1Id(session.getPlayer1Id())
                .player2Id(session.getPlayer2Id())
                .player3Id(session.getPlayer3Id())
                .player4Id(session.getPlayer4Id())
                .winnerId(session.getWinnerId())
                .status(session.getStatus())
                .turnLimit(session.getTurnLimit())
                .player1Score(session.getPlayer1Score())
                .player2Score(session.getPlayer2Score())
                .player3Score(session.getPlayer3Score())
                .player4Score(session.getPlayer4Score())
                .players(getPlayersSummary(session))
                .build();
    }

    private List<PlayerSummaryDto> getPlayersSummary(GameSession session) {
        List<UUID> playerIds = session.getPlayerIds();
        List<PlayerSummaryDto> players = new ArrayList<>(playerIds.size());
        for (UUID pid : playerIds) {
            playerRepository.findById(pid).ifPresent(p -> players.add(PlayerSummaryDto.builder()
                    .id(p.getId())
                    .username(p.getUsername())
                    .color(p.getColor())
                    .cellsClaimed((int) cellRepository.countBySessionIdAndOwnerId(session.getId(), p.getId()))
                    .score(getSessionScore(session.getId(), p.getId()))
                    .build()));
        }
        return players;
    }

    public GameSessionResponse toResponseForPractice(GameSession session) {
        return toGameSessionResponse(session);
    }

    private GameSessionResponse toGameSessionResponse(GameSession session) {
        return GameSessionResponse.builder()
                .gameId(session.getId())
                .code(session.getCode())
                .status(session.getStatus())
                .maxPlayers(session.getMaxPlayers())
                .playerCount(session.getPlayerCount())
                .currentPlayerId(session.getCurrentPlayerId())
                .turnNumber(session.getTurnNumber())
                .turnLimit(session.getTurnLimit())
                .winnerId(session.getWinnerId())
                .player1Score(session.getPlayer1Score())
                .player2Score(session.getPlayer2Score())
                .player3Score(session.getPlayer3Score())
                .player4Score(session.getPlayer4Score())
                .createdAt(session.getCreatedAt())
                .startedAt(session.getStartedAt())
                .finishedAt(session.getFinishedAt())
                .practice(session.isPractice())
                .players(getPlayersSummary(session))
                .build();
    }

    public void assignFairStartingPositions(GameSession session) {
        Map<UUID, List<StartingCell>> placements = new HashMap<>();
        List<UUID> playerIds = session.getPlayerIds();

        if (playerIds.size() == 2) {
            placements.put(playerIds.get(0), List.of(new StartingCell(7, 7), new StartingCell(8, 8)));
            placements.put(playerIds.get(1), List.of(new StartingCell(17, 16), new StartingCell(17, 17)));
        } else if (playerIds.size() == 4) {
            // Symmetrical distribution on 25x25 (0..24) board:
            // P1 (North): (12, 4), (13, 5)
            // P2 (East):  (20, 12), (19, 13)
            // P3 (South): (12, 20), (11, 19)
            // P4 (West):  (4, 12), (5, 11)
            placements.put(playerIds.get(0), List.of(new StartingCell(12, 4), new StartingCell(13, 5)));
            placements.put(playerIds.get(1), List.of(new StartingCell(20, 12), new StartingCell(19, 13)));
            placements.put(playerIds.get(2), List.of(new StartingCell(12, 20), new StartingCell(11, 19)));
            placements.put(playerIds.get(3), List.of(new StartingCell(4, 12), new StartingCell(5, 11)));
        } else {
            for (int i = 0; i < playerIds.size(); i++) {
                int baseX = 5 + (i % 2) * 14;
                int baseY = 5 + (i / 2) * 14;
                placements.put(playerIds.get(i), List.of(new StartingCell(baseX, baseY), new StartingCell(baseX + 1, baseY + 1)));
            }
        }

        List<Cell> cellsToSave = new ArrayList<>();
        for (Map.Entry<UUID, List<StartingCell>> entry : placements.entrySet()) {
            UUID playerId = entry.getKey();
            for (StartingCell coord : entry.getValue()) {
                Cell cell = cellRepository.findBySessionIdAndXAndY(session.getId(), coord.x(), coord.y())
                        .orElseThrow(() -> new InvalidGameRequestException("Missing starting cell at (" + coord.x() + ", " + coord.y() + ")"));
                cell.setOwnerId(playerId);
                cell.setClaimedAt(Instant.now());
                cell.setCellType(resolveCellType(coord.x(), coord.y()));
                cell.setCellValue(cell.getCellType().getValue() + 1);
                cellsToSave.add(cell);
            }
        }

        if (!cellsToSave.isEmpty()) {
            cellRepository.saveAll(cellsToSave);
        }

        for (UUID pid : playerIds) {
            session.setPlayerScore(pid, getSessionScore(session.getId(), pid));
        }
        gameSessionRepository.save(session);
    }

    private int getSessionScore(UUID sessionId, UUID playerId) {
        List<Cell> owned = cellRepository.findBySessionIdAndOwnerIdOrderByYAscXAsc(sessionId, playerId);
        if (owned.isEmpty()) {
            return 0;
        }

        boolean[] visited = new boolean[owned.size()];
        int total = 0;
        for (int i = 0; i < owned.size(); i++) {
            if (visited[i]) {
                continue;
            }
            List<Cell> component = new ArrayList<>();
            dfs(owned, i, visited, component);
            int connectedSize = component.size();
            int componentScore = component.stream().mapToInt(Cell::getCellValue).sum();
            int bonus = switch (Integer.valueOf(connectedSize)) {
                case Integer size when size >= 10 -> 10;
                case Integer size when size >= 6 -> 6;
                case Integer size when size >= 3 -> 3;
                default -> 0;
            };
            total += componentScore + bonus;
        }
        return total;
    }

    private void dfs(List<Cell> owned, int index, boolean[] visited, List<Cell> component) {
        visited[index] = true;
        component.add(owned.get(index));
        for (int i = 0; i < owned.size(); i++) {
            if (visited[i] || !isAdjacent(owned.get(index), owned.get(i))) {
                continue;
            }
            dfs(owned, i, visited, component);
        }
    }

    private boolean isAdjacent(Cell a, Cell b) {
        return a.getId() != null && b.getId() != null && a.getId().equals(b.getId()) == false &&
                Math.abs(a.getX() - b.getX()) <= 1 && Math.abs(a.getY() - b.getY()) <= 1 &&
                !(a.getX() == b.getX() && a.getY() == b.getY());
    }

    private CellType resolveCellType(int x, int y) {
        CellType[] types = CellType.values();
        int index = (x * 7 + y * 11) % types.length;
        return types[index];
    }

    private record StartingCell(int x, int y) {
    }
}
