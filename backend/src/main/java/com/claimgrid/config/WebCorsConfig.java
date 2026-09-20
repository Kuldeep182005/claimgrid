package com.claimgrid.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Arrays;
import java.util.List;

/**
 * Global REST CORS configuration for /api/** endpoints.
 * Configured via game.cors.allowed-origins (overridable by GAME_CORS_ALLOWED_ORIGINS).
 */
@Configuration
public class WebCorsConfig implements WebMvcConfigurer {

    private final List<String> allowedOrigins;

    public WebCorsConfig(
            @Value("${game.cors.allowed-origins:http://localhost:5173,http://localhost:3000}")
            List<String> allowedOrigins) {
        this.allowedOrigins = allowedOrigins;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        String[] origins = allowedOrigins.stream()
                .flatMap(s -> Arrays.stream(s.split(",")))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toArray(String[]::new);

        registry.addMapping("/api/**")
                .allowedOrigins(origins)
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .maxAge(3600);
    }
}
