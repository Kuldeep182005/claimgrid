package com.claimgrid.service;

import com.claimgrid.config.GameProperties;
import com.claimgrid.config.BotProperties;
import com.claimgrid.dto.ClaimCellResponse;
import com.claimgrid.entity.Cell;
import com.claimgrid.entity.GameSession;
import com.claimgrid.entity.GameStatus;
import com.claimgrid.entity.Player;
import com.claimgrid.exception.InvalidGameRequestException;
import com.claimgrid.exception.PlayerNotFoundException;
import com.claimgrid.repository.CellRepository;
import com.claimgrid.repository.GameSessionRepository;
import com.claimgrid.repository.PlayerRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import jakarta.annotation.PreDestroy;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

@Service
public class PracticeBotService {

    public static final String BOT_USERNAME = "RIVAL-01";
    public static final String BOT_COLOR = "#F59E0B";

    private static final Logger log = LoggerFactory.getLogger(PracticeBotService.class);

    private final GameSessionRepository gameSessionRepository;
    private final CellRepository cellRepository;
    private final PlayerRepository playerRepository;
    private final ClaimService claimService;
    private final BattleSessionService battleSessionService;
    private final GameProperties gameProperties;
    private final BotProperties botProperties;
    private final ApplicationEventPublisher eventPublisher;
    private final ExecutorService executor = Executors.newCachedThreadPool();
    private final ConcurrentMap<UUID, Future<?>> workers = new ConcurrentHashMap<>();
    private Random random = new Random();

    public PracticeBotService(GameSessionRepository gameSessionRepository,
                              CellRepository cellRepository,
                              PlayerRepository playerRepository,
                              ClaimService claimService,
                              BattleSessionService battleSessionService,
                              GameProperties gameProperties,
                              BotProperties botProperties,
                              ApplicationEventPublisher eventPublisher) {
        this.gameSessionRepository = gameSessionRepository;
        this.cellRepository = cellRepository;
        this.playerRepository = playerRepository;
        this.claimService = claimService;
        this.battleSessionService = battleSessionService;
        this.gameProperties = gameProperties;
        this.botProperties = botProperties;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public com.claimgrid.dto.GameSessionResponse createPracticeGame(UUID humanPlayerId) {
        if (humanPlayerId == null) {
            throw new InvalidGameRequestException("Player ID must not be null");
        }

        Player human = playerRepository.findById(humanPlayerId)
                .orElseThrow(() -> new PlayerNotFoundException(humanPlayerId));
        Player bot = getOrCreateBot();

        UUID codeId = UUID.randomUUID();
        GameSession session = GameSession.builder()
                .code("PRACTICE" + codeId.toString().substring(0, 2).toUpperCase())
                .status(GameStatus.ACTIVE)
                .player1Id(human.getId())
                .player2Id(bot.getId())
                .currentPlayerId(human.getId())
                .turnNumber(1)
                .startedAt(Instant.now())
                .practice(true)
                .build();
        session = gameSessionRepository.save(session);

        List<Cell> cells = new ArrayList<>(BattleSessionService.TOTAL_CELLS);
        for (int y = 0; y < BattleSessionService.GRID_HEIGHT; y++) {
            for (int x = 0; x < BattleSessionService.GRID_WIDTH; x++) {
                cells.add(Cell.builder()
                        .sessionId(session.getId())
                        .x(x)
                        .y(y)
                        .cellType(com.claimgrid.entity.CellType.PLAIN)
                        .cellValue(1)
                        .build());
            }
        }
        cellRepository.saveAll(cells);
        battleSessionService.assignFairStartingPositions(session);

        log.info("Practice battle created [gameId={}, player={}, bot={}, cells={}]",
                session.getId(), human.getId(), bot.getId(), cells.size());
        eventPublisher.publishEvent(new PracticeGameStartedDomainEvent(session.getId(), bot.getId()));
        return battleSessionService.toResponseForPractice(session);
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void startBot(PracticeGameStartedDomainEvent event) {
        workers.computeIfAbsent(event.gameId(), gameId -> {
            log.info("Starting RIVAL-01 worker [gameId={}, bot={}]", gameId, event.botPlayerId());
            return executor.submit(() -> runBot(gameId, event.botPlayerId()));
        });
    }

    @Transactional
    public void endPracticeGame(UUID gameId, UUID humanPlayerId) {
        GameSession session = gameSessionRepository.findByIdForUpdate(gameId)
                .orElseThrow(() -> new InvalidGameRequestException("Practice battle not found: " + gameId));
        if (!session.isPractice() || !session.hasPlayer(humanPlayerId)) {
            throw new InvalidGameRequestException("Practice battle is not owned by this player");
        }
        if (session.getStatus() == GameStatus.ACTIVE) {
            session.setStatus(GameStatus.FINISHED);
            session.setFinishedAt(Instant.now());
            gameSessionRepository.save(session);
        }
        stopBot(gameId);
    }

    public int getWorkerCount() {
        return workers.size();
    }

    private void runBot(UUID gameId, UUID botPlayerId) {
        try {
            while (!Thread.currentThread().isInterrupted()) {
                GameSession session = gameSessionRepository.findById(gameId).orElse(null);
                if (session == null || session.getStatus() != GameStatus.ACTIVE) {
                    return;
                }
                if (!botPlayerId.equals(session.getCurrentPlayerId())) {
                    sleep(150);
                    continue;
                }

                Cell attackTarget = selectEnemyTarget(gameId, botPlayerId);
                Cell cell = attackTarget != null ? attackTarget : selectTarget(gameId, session.getPlayer1Id(), botPlayerId);
                if (cell == null) {
                    return;
                }

                ClaimCellResponse response = attackTarget != null
                        ? claimService.attackCell(gameId, botPlayerId, cell.getId())
                        : claimService.claimCell(gameId, botPlayerId, cell.getId());
                if (response.isSuccess()) {
                    sleep(Math.max(150, gameProperties.getCooldownMs()));
                } else if (response.getRemainingCooldownMs() != null && response.getRemainingCooldownMs() > 0) {
                    sleep(response.getRemainingCooldownMs());
                } else if (response.getStatus() == com.claimgrid.dto.ClaimStatus.GAME_FINISHED) {
                    return;
                } else {
                    sleep(150);
                }

            }
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            log.debug("RIVAL-01 worker stopped [gameId={}]", gameId);
        } catch (RuntimeException ex) {
            log.error("RIVAL-01 worker failed [gameId={}]", gameId, ex);
        } finally {
            workers.remove(gameId);
            log.info("RIVAL-01 worker ended [gameId={}]", gameId);
        }
    }

    public Cell selectTargetForTests(UUID gameId, UUID humanPlayerId, UUID botPlayerId, double forcedRandomWeight) {
        return selectTarget(gameId, humanPlayerId, botPlayerId, forcedRandomWeight);
    }

    public void setRandomForTests(Random random) {
        this.random = random;
    }

    private Cell selectEnemyTarget(UUID gameId, UUID botPlayerId) {
        List<Cell> allCells = cellRepository.findBySessionIdOrderByYAscXAsc(gameId);
        List<Cell> botCells = allCells.stream().filter(cell -> botPlayerId.equals(cell.getOwnerId())).toList();
        if (botCells.isEmpty()) {
            return null;
        }

        List<Cell> enemyTargets = allCells.stream()
                .filter(cell -> cell.getOwnerId() != null && !botPlayerId.equals(cell.getOwnerId()))
                .filter(cell -> botCells.stream().anyMatch(botCell -> isAdjacent(botCell.getX(), botCell.getY(), cell.getX(), cell.getY())))
                .toList();
        if (enemyTargets.isEmpty()) {
            return null;
        }
        return enemyTargets.get(random.nextInt(enemyTargets.size()));
    }

    private boolean isAdjacent(int x1, int y1, int x2, int y2) {
        return !(x1 == x2 && y1 == y2) && Math.abs(x1 - x2) <= 1 && Math.abs(y1 - y2) <= 1;
    }

    private Cell selectTarget(UUID gameId, UUID humanPlayerId, UUID botPlayerId) {
        double totalWeight = botProperties.getPlayerTargetWeight()
                + botProperties.getOwnTargetWeight()
                + botProperties.getRandomTargetWeight();
        double roll = random.nextDouble() * totalWeight;
        return selectTarget(gameId, humanPlayerId, botPlayerId, roll / totalWeight);
    }

    private Cell selectTarget(UUID gameId, UUID humanPlayerId, UUID botPlayerId, double forcedRandomWeight) {
        List<Cell> allCells = cellRepository.findBySessionIdOrderByYAscXAsc(gameId);
        List<Cell> unclaimed = allCells.stream()
                .filter(cell -> cell.getOwnerId() == null)
                .toList();
        if (unclaimed.isEmpty()) {
            return null;
        }

        List<Cell> humanCells = ownedBy(allCells, humanPlayerId);
        List<Cell> botCells = ownedBy(allCells, botPlayerId);
        double playerWeight = botProperties.getPlayerTargetWeight();
        double ownWeight = botProperties.getOwnTargetWeight();
        double randomWeight = botProperties.getRandomTargetWeight();
        double totalWeight = playerWeight + ownWeight + randomWeight;
        double playerCutoff = playerWeight / totalWeight;
        double ownCutoff = (playerWeight + ownWeight) / totalWeight;

        if (forcedRandomWeight < playerCutoff && !humanCells.isEmpty()) {
            Cell target = selectNearTerritory(unclaimed, humanCells);
            if (target != null) {
                return target;
            }
        }
        if (forcedRandomWeight < ownCutoff && !botCells.isEmpty()) {
            Cell target = selectNearTerritory(unclaimed, botCells);
            if (target != null) {
                return target;
            }
        }
        return unclaimed.get(random.nextInt(unclaimed.size()));
    }

    private List<Cell> ownedBy(List<Cell> cells, UUID ownerId) {
        return cells.stream().filter(cell -> ownerId.equals(cell.getOwnerId())).toList();
    }

    private Cell selectNearTerritory(List<Cell> unclaimed, List<Cell> territory) {
        int radius = Math.max(1, botProperties.getTargetRadius());
        List<ScoredCell> candidates = new ArrayList<>();
        for (Cell candidate : unclaimed) {
            int distance = territory.stream()
                    .mapToInt(owner -> Math.max(Math.abs(candidate.getX() - owner.getX()),
                            Math.abs(candidate.getY() - owner.getY())))
                    .min()
                    .orElse(Integer.MAX_VALUE);
            if (distance <= radius) {
                double score = (distance == 1 ? 100.0 : 0.0)
                        + (radius - distance) * 10.0
                        + random.nextDouble() * 8.0;
                candidates.add(new ScoredCell(candidate, score));
            }
        }
        if (candidates.isEmpty()) {
            return null;
        }

        double bestScore = candidates.stream().mapToDouble(ScoredCell::score).max().orElse(0);
        List<Cell> strongest = candidates.stream()
                .filter(candidate -> candidate.score() >= bestScore - 8.0)
                .map(ScoredCell::cell)
                .toList();
        return strongest.get(random.nextInt(strongest.size()));
    }

    private record ScoredCell(Cell cell, double score) {
    }

    private Player getOrCreateBot() {
        return playerRepository.findByUsername(BOT_USERNAME).orElseGet(() ->
                playerRepository.save(Player.builder()
                        .username(BOT_USERNAME)
                        .color(BOT_COLOR)
                        .bot(true)
                        .build()));
    }

    private void stopBot(UUID gameId) {
        Future<?> worker = workers.remove(gameId);
        if (worker != null) {
            worker.cancel(true);
        }
    }

    private void sleep(long millis) throws InterruptedException {
        Thread.sleep(Math.max(50, millis));
    }

    @PreDestroy
    public void stopAllBots() {
        workers.values().forEach(worker -> worker.cancel(true));
        workers.clear();
        executor.shutdownNow();
    }
}
