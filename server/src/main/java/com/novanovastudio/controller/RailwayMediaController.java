package com.novanovastudio.controller;

import com.novanovastudio.security.TeamScope;
import com.novanovastudio.service.PersistenceService;
import com.novanovastudio.storage.ObjectStorageService;
import com.novanovastudio.storage.RailwayStorageProviderAdapter;
import java.net.URI;
import java.time.Duration;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

/** Redeems an object-specific capability for a fresh private S3 read URL. */
@RestController
@RequiredArgsConstructor
public class RailwayMediaController {
    private final PersistenceService persistenceService;
    private final ObjectStorageService objectStorageService;

    @GetMapping(RailwayStorageProviderAdapter.MEDIA_PATH)
    public Mono<ResponseEntity<Void>> read(@RequestParam String storageId, @RequestParam String key,
            @RequestParam String signature) {
        return persistenceService.getObjectStorageForCleanup(storageId)
                .contextWrite(context -> context.put(TeamScope.SYSTEM_KEY, true))
                .filter(config -> RailwayStorageProviderAdapter.PROVIDER.equals(config.provider())
                        && RailwayStorageProviderAdapter.validSignature(config, key, signature))
                .flatMap(config -> Mono.fromCallable(() -> objectStorageService.createReadUrl(config, key,
                        key.substring(key.lastIndexOf('/') + 1), null, false, Instant.now().plusSeconds(300)))
                        .subscribeOn(Schedulers.boundedElastic()))
                .map(url -> ResponseEntity.status(HttpStatus.FOUND).location(URI.create(url))
                        .cacheControl(CacheControl.maxAge(Duration.ofMinutes(4)).cachePrivate()).<Void>build())
                .defaultIfEmpty(ResponseEntity.notFound().build());
    }
}
