package com.claimgrid.websocket.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommsErrorEvent {
    @Builder.Default
    private String type = "COMMS_ERROR";
    private String code;
    private String message;
}
