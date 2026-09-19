package com.claimgrid.service;

import org.springframework.stereotype.Component;

import java.security.SecureRandom;

@Component
public class BattleCodeGenerator {

    private static final String CHARACTERS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    private static final int CODE_LENGTH = 6;
    private final SecureRandom random = new SecureRandom();

    public String generateCode() {
        StringBuilder sb = new StringBuilder(CODE_LENGTH);
        for (int i = 0; i < CODE_LENGTH; i++) {
            int index = random.nextInt(CHARACTERS.length());
            sb.append(CHARACTERS.charAt(index));
        }
        return sb.toString();
    }

    public static String normalize(String code) {
        if (code == null) {
            return "";
        }
        return code.trim().toUpperCase();
    }
}
