package com.novanovastudio.storage;

import com.novanovastudio.dto.PersistenceDtos;
import com.sun.net.httpserver.HttpServer;
import java.io.ByteArrayInputStream;
import java.net.InetSocketAddress;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class RailwayStorageTest {
    private ObjectStorageProviderAdapter adapter() {
        Class<?> type = assertDoesNotThrow(() -> Class.forName(
                "com.novanovastudio.storage.RailwayStorageProviderAdapter"), "Railway storage must be supported");
        return (ObjectStorageProviderAdapter) assertDoesNotThrow(() -> type.getConstructor().newInstance());
    }

    private PersistenceDtos.ObjectStorageConfig config(String endpoint) {
        return new PersistenceDtos.ObjectStorageConfig("railwayS3", "test-access", "test-secret", "test-bucket",
                "auto", endpoint, "", "https://studio.example.com", "storage-1", "Railway", "", false);
    }

    @Test
    void signsPrivateReadUrlsWithEncodedKeysAndExpiry() {
        String url = adapter().createReadUrl(config("https://t3.storageapi.dev"), "images/中文 图片.png",
                "中文 图片.png", "image/png", true, Instant.now().plusSeconds(300));
        URI uri = URI.create(url);
        assertEquals("test-bucket.t3.storageapi.dev", uri.getHost());
        assertEquals("/images/中文 图片.png", uri.getPath());
        assertTrue(uri.getQuery().contains("X-Amz-Signature="));
        assertTrue(uri.getQuery().contains("X-Amz-Expires=29") || uri.getQuery().contains("X-Amz-Expires=300"));
        assertTrue(uri.getQuery().contains("response-content-disposition="));
        assertFalse(url.contains("test-secret"));
    }

    @Test
    void uploadsToS3AndReturnsStableApplicationUrlWithoutCredentials() throws Exception {
        AtomicReference<byte[]> uploaded = new AtomicReference<>();
        AtomicReference<String> method = new AtomicReference<>();
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", exchange -> {
            method.set(exchange.getRequestMethod());
            uploaded.set(exchange.getRequestBody().readAllBytes());
            exchange.getResponseHeaders().add("ETag", "\"test-etag\"");
            exchange.sendResponseHeaders(200, -1);
            exchange.close();
        });
        server.start();
        try {
            var config = config("http://127.0.0.1:" + server.getAddress().getPort());
            byte[] bytes = "generated media".getBytes(StandardCharsets.UTF_8);
            String url = adapter().putObject(config, "images/a.png", new ByteArrayInputStream(bytes), bytes.length, "image/png");
            assertEquals("PUT", method.get());
            assertArrayEquals(bytes, uploaded.get());
            assertTrue(url.startsWith("https://studio.example.com/api/v1/media/railwayObject?"));
            assertTrue(url.contains("signature="));
            assertFalse(url.contains("test-secret"));
            assertFalse(url.contains("X-Amz-"), "Saved media URLs must survive S3 signature expiry");
        } finally { server.stop(0); }
    }
}
