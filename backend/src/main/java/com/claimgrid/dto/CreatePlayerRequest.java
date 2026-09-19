package com.claimgrid.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreatePlayerRequest {

    @NotBlank(message = "Username cannot be blank")
    @Size(min = 2, max = 30, message = "Username must be between 2 and 30 characters")
    @Pattern(regexp = "^[a-zA-Z0-9_.-]+$", message = "Username may only contain alphanumeric characters, underscores, hyphens, and periods")
    private String username;
}
