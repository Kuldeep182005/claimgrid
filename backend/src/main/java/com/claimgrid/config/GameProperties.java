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

    /**
     * Fixed number of turns for a match; default is 40 turns.
     */
    private int matchTurnLimit = 40;

    private long chatRateLimitMs = 1000;

    private long reactionRateLimitMs = 500;

    public long getCooldownMs() {
        return cooldownMs;
    }

    public void setCooldownMs(long cooldownMs) {
        this.cooldownMs = cooldownMs;
    }

    public int getMatchTurnLimit() {
        return matchTurnLimit;
    }

    public void setMatchTurnLimit(int matchTurnLimit) {
        this.matchTurnLimit = matchTurnLimit;
    }

    public long getChatRateLimitMs() {
        return chatRateLimitMs;
    }

    public void setChatRateLimitMs(long chatRateLimitMs) {
        this.chatRateLimitMs = chatRateLimitMs;
    }

    public long getReactionRateLimitMs() {
        return reactionRateLimitMs;
    }

    public void setReactionRateLimitMs(long reactionRateLimitMs) {
        this.reactionRateLimitMs = reactionRateLimitMs;
    }
}
