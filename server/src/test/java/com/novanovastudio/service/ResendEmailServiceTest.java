package com.novanovastudio.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.novanovastudio.config.NovanovaProperties;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import reactor.test.StepVerifier;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ResendEmailServiceTest {
    private HttpServer server;
    private AtomicReference<String> authorization;
    private AtomicReference<String> requestBody;
    private ResendEmailService service;

    @BeforeEach
    void setUp() throws Exception {
        authorization = new AtomicReference<>();
        requestBody = new AtomicReference<>();
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/emails", this::captureRequest);
        server.start();

        NovanovaProperties properties = new NovanovaProperties();
        properties.getEmail().setFrom("no-reply@example.com");
        properties.getEmail().setResendApiKey("re_test_key");
        service = new ResendEmailService(
                properties,
                new ObjectMapper(),
                HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(2)).build(),
                URI.create("http://127.0.0.1:" + server.getAddress().getPort() + "/emails"));
    }

    @AfterEach
    void tearDown() {
        server.stop(0);
    }

    @Test
    void sendsHtmlEmailThroughResendHttpsApi() {
        StepVerifier.create(service.send("user@example.com", "验证码", "<p>123456</p>"))
                .verifyComplete();

        assertEquals("Bearer re_test_key", authorization.get());
        assertTrue(requestBody.get().contains("\"from\":\"no-reply@example.com\""));
        assertTrue(requestBody.get().contains("\"to\":[\"user@example.com\"]"));
        assertTrue(requestBody.get().contains("\"subject\":\"验证码\""));
        assertTrue(requestBody.get().contains("\"html\":\"<p>123456</p>\""));
    }

    private void captureRequest(HttpExchange exchange) {
        try (exchange) {
            authorization.set(exchange.getRequestHeaders().getFirst("Authorization"));
            requestBody.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            byte[] response = "{\"id\":\"email-id\"}".getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(200, response.length);
            exchange.getResponseBody().write(response);
        } catch (Exception exception) {
            throw new RuntimeException(exception);
        }
    }
}
