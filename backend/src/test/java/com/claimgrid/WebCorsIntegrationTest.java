package com.claimgrid;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.TestPropertySource;

import static org.assertj.core.api.Assertions.assertThat;

@TestPropertySource(properties = {
        "game.cors.allowed-origins=http://localhost:5173,http://localhost:3000,https://claimgrid-r2c7ou85z-kuldeep-a65a.vercel.app"
})
class WebCorsIntegrationTest extends BaseIntegrationTest {

    private static final String VERCEL_ORIGIN = "https://claimgrid-r2c7ou85z-kuldeep-a65a.vercel.app";
    private static final String LOCALHOST_ORIGIN = "http://localhost:5173";
    private static final String UNAUTHORIZED_ORIGIN = "https://unauthorized-malicious-site.com";

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void testPreflightOptions_AllowedVercelOrigin_Accepted() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Origin", VERCEL_ORIGIN);
        headers.set("Access-Control-Request-Method", "POST");
        headers.set("Access-Control-Request-Headers", "Content-Type");

        HttpEntity<Void> request = new HttpEntity<>(headers);
        ResponseEntity<Void> response = restTemplate.exchange(
                "/api/players", HttpMethod.OPTIONS, request, Void.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getHeaders().getAccessControlAllowOrigin()).isEqualTo(VERCEL_ORIGIN);
        assertThat(response.getHeaders().getAccessControlAllowMethods())
                .contains(HttpMethod.GET, HttpMethod.POST, HttpMethod.PUT, HttpMethod.DELETE, HttpMethod.OPTIONS);
        assertThat(response.getHeaders().getFirst("Access-Control-Max-Age")).isEqualTo("3600");
    }

    @Test
    void testPreflightOptions_AllowedLocalhostOrigin_Accepted() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Origin", LOCALHOST_ORIGIN);
        headers.set("Access-Control-Request-Method", "GET");

        HttpEntity<Void> request = new HttpEntity<>(headers);
        ResponseEntity<Void> response = restTemplate.exchange(
                "/api/game/state", HttpMethod.OPTIONS, request, Void.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getHeaders().getAccessControlAllowOrigin()).isEqualTo(LOCALHOST_ORIGIN);
    }

    @Test
    void testPreflightOptions_UnauthorizedOrigin_Rejected() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Origin", UNAUTHORIZED_ORIGIN);
        headers.set("Access-Control-Request-Method", "POST");

        HttpEntity<Void> request = new HttpEntity<>(headers);
        ResponseEntity<Void> response = restTemplate.exchange(
                "/api/players", HttpMethod.OPTIONS, request, Void.class);

        // Preflight from unauthorized origin is rejected with 403 Forbidden or missing allow-origin header
        assertThat(response.getHeaders().getAccessControlAllowOrigin()).isNull();
        assertThat(response.getStatusCode()).isIn(HttpStatus.FORBIDDEN, HttpStatus.OK);
    }

    @Test
    void testActualRequest_AllowedVercelOrigin_IncludesCorsHeader() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Origin", VERCEL_ORIGIN);

        HttpEntity<Void> request = new HttpEntity<>(headers);
        ResponseEntity<String> response = restTemplate.exchange(
                "/api/game/state", HttpMethod.GET, request, String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getHeaders().getAccessControlAllowOrigin()).isEqualTo(VERCEL_ORIGIN);
    }

    @Test
    void testActualRequest_UnauthorizedOrigin_ExcludesCorsHeader() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Origin", UNAUTHORIZED_ORIGIN);

        HttpEntity<Void> request = new HttpEntity<>(headers);
        ResponseEntity<String> response = restTemplate.exchange(
                "/api/game/state", HttpMethod.GET, request, String.class);

        // When origin is not allowed, Spring does not set Access-Control-Allow-Origin
        assertThat(response.getHeaders().getAccessControlAllowOrigin()).isNull();
    }
}
