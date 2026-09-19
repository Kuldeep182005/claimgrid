package com.claimgrid;

import com.claimgrid.repository.CellRepository;
import com.claimgrid.repository.GameSessionRepository;
import com.claimgrid.repository.PlayerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.PostgreSQLContainer;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public abstract class BaseIntegrationTest {

    protected static final PostgreSQLContainer<?> postgres;

    static {
        postgres = new PostgreSQLContainer<>("postgres:17-alpine")
                .withDatabaseName("claimgrid_test")
                .withUsername("test")
                .withPassword("test");
        postgres.start();
    }

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    protected CellRepository cellRepository;

    @Autowired
    protected GameSessionRepository gameSessionRepository;

    @Autowired
    protected PlayerRepository playerRepository;

    @Autowired
    protected TransactionTemplate transactionTemplate;

    protected void cleanDatabase() {
        transactionTemplate.execute(status -> {
            cellRepository.deleteBySessionIdIsNotNull();
            gameSessionRepository.deleteAll();
            cellRepository.resetAllClaimedCells();
            playerRepository.deleteAll();
            return null;
        });
    }
}
