package com.claimgrid.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "game.claim")
public class GameProperties {

    /**
     * Cooldown duration in milliseconds between successful claims by a player.
     * Default: 3000ms (3 seconds).
     */
    private long cooldownMs = 3000;

    public long getCooldownMs() {
        return cooldownMs;
    }

    public void setCooldownMs(long cooldownMs) {
        this.cooldownMs = cooldownMs;
    }
}
