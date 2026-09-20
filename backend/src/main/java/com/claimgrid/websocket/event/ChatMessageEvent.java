package com.claimgrid.websocket.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageEvent {
    @Builder.Default
    private String type = "CHAT_MESSAGE";
    private UUID gameId;
    private UUID playerId;
    private String playerName;
    private String message;
    private Instant timestamp;
}
