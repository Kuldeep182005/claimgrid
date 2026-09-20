package com.claimgrid.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "game.bot")
public class BotProperties {

    private double playerTargetWeight = 0.65;
    private double ownTargetWeight = 0.20;
    private double randomTargetWeight = 0.15;
    private int targetRadius = 2;

    public double getPlayerTargetWeight() {
        return playerTargetWeight;
    }

    public void setPlayerTargetWeight(double playerTargetWeight) {
        this.playerTargetWeight = playerTargetWeight;
    }

    public double getOwnTargetWeight() {
        return ownTargetWeight;
    }

    public void setOwnTargetWeight(double ownTargetWeight) {
        this.ownTargetWeight = ownTargetWeight;
    }

    public double getRandomTargetWeight() {
        return randomTargetWeight;
    }

    public void setRandomTargetWeight(double randomTargetWeight) {
        this.randomTargetWeight = randomTargetWeight;
    }

    public int getTargetRadius() {
        return targetRadius;
    }

    public void setTargetRadius(int targetRadius) {
        this.targetRadius = targetRadius;
    }
}
