package com.novanovastudio.storage;

import com.novanovastudio.dto.PersistenceDtos;
import com.novanovastudio.service.PersistenceService;
import java.net.URI;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.reactive.server.WebTestClient;
import reactor.core.publisher.Mono;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class RailwayMediaAccessTest {
    private final PersistenceService persistence = mock(PersistenceService.class);
    private final ObjectStorageService storage = mock(ObjectStorageService.class);
    private final PersistenceDtos.ObjectStorageConfig config = new PersistenceDtos.ObjectStorageConfig("railwayS3",
            "access", "secret", "bucket", "auto", "https://t3.storageapi.dev", "", "https://studio.example.com", "s1", "Railway", "", false);

    private WebTestClient client() {
        Class<?> type = assertDoesNotThrow(() -> Class.forName("com.novanovastudio.controller.RailwayMediaController"));
        Object controller = assertDoesNotThrow(() -> type.getConstructor(PersistenceService.class, ObjectStorageService.class)
                .newInstance(persistence, storage));
        return WebTestClient.bindToController(controller)
                .controllerAdvice(new com.novanovastudio.common.GlobalExceptionHandler())
                .webFilter(new com.novanovastudio.security.TokenAuthenticationWebFilter(
                new com.novanovastudio.security.TokenService(new com.novanovastudio.config.NovanovaProperties()),
                mock(com.novanovastudio.repository.UserRepository.class))).build();
    }

    @Test
    void stableMediaLinkRedirectsToFreshSignature() {
        when(persistence.getObjectStorageForCleanup("s1")).thenReturn(Mono.just(config));
        when(storage.createReadUrl(eq(config), eq("images/a+b & 中文.png"), anyString(), isNull(), eq(false), any()))
                .thenReturn("https://bucket.t3.storageapi.dev/images/a.png?X-Amz-Signature=fresh");
        String url = RailwayStorageProviderAdapter.mediaUrl(config, "images/a+b & 中文.png");
        client().get().uri(URI.create(url)).exchange().expectStatus().isFound()
                .expectHeader().valueEquals("Location", "https://bucket.t3.storageapi.dev/images/a.png?X-Amz-Signature=fresh");
    }

    @Test
    void cannotChangeObjectKeyOnStableLink() {
        when(persistence.getObjectStorageForCleanup("s1")).thenReturn(Mono.just(config));
        String url = RailwayStorageProviderAdapter.mediaUrl(config, "images/a.png").replace("a.png", "private.png");
        client().get().uri(URI.create(url)).exchange().expectStatus().isNotFound();
        verifyNoInteractions(storage);
    }

    @Test
    void cannotReuseSignatureForAnotherStorageConfig() {
        var other = new PersistenceDtos.ObjectStorageConfig("railwayS3", "access", "secret", "bucket", "auto",
                "https://t3.storageapi.dev", "", "https://studio.example.com", "s2", "Other", "", false);
        when(persistence.getObjectStorageForCleanup("s2")).thenReturn(Mono.just(other));
        String url = RailwayStorageProviderAdapter.mediaUrl(config, "images/a.png").replace("storageId=s1", "storageId=s2");
        client().get().uri(URI.create(url)).exchange().expectStatus().isNotFound();
        verifyNoInteractions(storage);
    }
}
