package com.claimgrid;

import com.claimgrid.config.BotProperties;
import com.claimgrid.config.GameProperties;
import com.claimgrid.entity.Cell;
import com.claimgrid.entity.GameSession;
import com.claimgrid.entity.GameStatus;
import com.claimgrid.entity.Player;
import com.claimgrid.service.BattleSessionService;
import com.claimgrid.service.PracticeBotService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.HashSet;
import java.util.Random;
import java.util.Set;
import java.util.UUID;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class PracticeBotSelectionTest extends BaseIntegrationTest {

    @Autowired
    private PracticeBotService practiceBotService;

    @Autowired
    private BotProperties botProperties;

    @Autowired
    private GameProperties gameProperties;

    private Player human;
    private Player bot;
    private UUID gameId;

    @BeforeEach
    void setUpBoard() {
        cleanDatabase();
        gameProperties.setCooldownMs(50);
        human = playerRepository.save(Player.builder().username("SelectionHuman").color("#6366F1").build());
        bot = playerRepository.save(Player.builder().username(PracticeBotService.BOT_USERNAME)
                .color(PracticeBotService.BOT_COLOR).bot(true).build());
        GameSession session = gameSessionRepository.save(GameSession.builder()
                .code("SELECT" + UUID.randomUUID().toString().substring(0, 4).toUpperCase())
                .status(GameStatus.ACTIVE)
                .player1Id(human.getId())
                .player2Id(bot.getId())
                .currentPlayerId(human.getId())
                .turnNumber(1)
                .startedAt(Instant.now())
                .practice(true)
                .build());
        gameId = session.getId();
        cellRepository.saveAll(createBoard(gameId));
        practiceBotService.setRandomForTests(new Random(7));
        botProperties.setPlayerTargetWeight(0.65);
        botProperties.setOwnTargetWeight(0.20);
        botProperties.setRandomTargetWeight(0.15);
    }

    @Test
    void targetsUnclaimedCellsNearHumanTerritoryInDifferentDirections() {
        claim(12, 12, human.getId());

        Set<String> selections = new HashSet<>();
        for (int i = 0; i < 40; i++) {
            Cell selected = practiceBotService.selectTargetForTests(gameId, human.getId(), bot.getId(), 0.0);
            selections.add(selected.getX() + "," + selected.getY());
        }

        assertThat(selections).contains("12,11", "12,13", "11,12", "13,12");
        assertThat(selections).allMatch(value -> {
            String[] coordinates = value.split(",");
            int distance = Math.abs(Integer.parseInt(coordinates[0]) - 12)
                    + Math.abs(Integer.parseInt(coordinates[1]) - 12);
            return distance <= botProperties.getTargetRadius();
        });
    }

    @Test
    void randomStrategyChoosesValidCellsWithoutFollowingCellIdOrder() {
        Set<Long> selections = new HashSet<>();
        for (int i = 0; i < 20; i++) {
            selections.add(practiceBotService.selectTargetForTests(gameId, human.getId(), bot.getId(), 1.0).getId());
        }

        assertThat(selections).hasSizeGreaterThan(1);
        assertThat(selections).doesNotContain(cellRepository.findBySessionIdAndXAndY(gameId, 0, 0).orElseThrow().getId());
    }

    @Test
    void fallsBackToRandomWhenHumanHasNoTerritoryAndHandlesEdges() {
        Cell selected = practiceBotService.selectTargetForTests(gameId, human.getId(), bot.getId(), 0.0);

        assertThat(selected.getOwnerId()).isNull();
        assertThat(selected.getX()).isBetween(0, BattleSessionService.GRID_WIDTH - 1);
        assertThat(selected.getY()).isBetween(0, BattleSessionService.GRID_HEIGHT - 1);

        claim(0, 0, human.getId());
        Cell nearEdge = practiceBotService.selectTargetForTests(gameId, human.getId(), bot.getId(), 0.0);
        assertThat(nearEdge.getOwnerId()).isNull();
        assertThat(nearEdge.getX()).isBetween(0, 2);
        assertThat(nearEdge.getY()).isBetween(0, 2);
    }

    @Test
    void prefersBotExpansionWhenPlayerTargetingHasNoCandidates() {
        claim(20, 20, bot.getId());

        Cell selected = practiceBotService.selectTargetForTests(gameId, human.getId(), bot.getId(), 0.0);

        assertThat(Math.abs(selected.getX() - 20) + Math.abs(selected.getY() - 20)).isLessThanOrEqualTo(2);
        assertThat(selected.getOwnerId()).isNull();
    }

    @Test
    void ignoresCellsClaimedBeforeTheDecisionIsUsed() {
        claim(12, 11, human.getId());

        Cell selected = practiceBotService.selectTargetForTests(gameId, human.getId(), bot.getId(), 0.0);

        assertThat(selected.getOwnerId()).isNull();
        assertThat(selected.getX()).isNotEqualTo(12);
    }

    private void claim(int x, int y, UUID ownerId) {
        Cell cell = cellRepository.findBySessionIdAndXAndY(gameId, x, y).orElseThrow();
        cell.setOwnerId(ownerId);
        cellRepository.save(cell);
    }

    private java.util.List<Cell> createBoard(UUID sessionId) {
        java.util.List<Cell> cells = new java.util.ArrayList<>(BattleSessionService.TOTAL_CELLS);
        for (int y = 0; y < BattleSessionService.GRID_HEIGHT; y++) {
            for (int x = 0; x < BattleSessionService.GRID_WIDTH; x++) {
                cells.add(Cell.builder().sessionId(sessionId).x(x).y(y).build());
            }
        }
        return cells;
    }
}
