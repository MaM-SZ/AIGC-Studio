package com.novanovastudio.storage;

import com.novanovastudio.common.BusinessException;
import com.novanovastudio.common.ErrorCode;
import com.novanovastudio.dto.PersistenceDtos;
import java.io.InputStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.http.ContentDisposition;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.util.UriComponentsBuilder;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.checksums.RequestChecksumCalculation;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

/** Railway private S3 storage. Persist capability URLs, never expiring S3 signatures. */
@Component
public class RailwayStorageProviderAdapter implements ObjectStorageProviderAdapter {
    public static final String PROVIDER = "railwayS3";
    public static final String MEDIA_PATH = "/api/v1/media/railwayObject";

    @Override
    public String provider() { return PROVIDER; }

    @Override
    public void validate(PersistenceDtos.ObjectStorageConfig config) {
        if (!StringUtils.hasText(config.accessKey()) || !StringUtils.hasText(config.secretKey())
                || !StringUtils.hasText(config.bucket()) || !StringUtils.hasText(config.region())
                || !StringUtils.hasText(config.id())) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "S3 存储需要 Access Key、Secret Key、Bucket、Region 和存储标识");
        }
        requireHttpUrl(config.endpoint());
        requireHttpUrl(config.publicBaseUrl());
    }

    private static void requireHttpUrl(String value) {
        try {
            URI uri = URI.create(value.trim());
            if (!java.util.Set.of("http", "https").contains(uri.getScheme()) || uri.getHost() == null
                    || uri.getUserInfo() != null || uri.getRawQuery() != null || uri.getFragment() != null) throw new IllegalArgumentException();
        } catch (Exception error) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "S3 存储 Endpoint 和应用访问地址必须是 HTTP(S) 地址");
        }
    }

    private StaticCredentialsProvider credentials(PersistenceDtos.ObjectStorageConfig config) {
        return StaticCredentialsProvider.create(AwsBasicCredentials.create(config.accessKey().trim(), config.secretKey().trim()));
    }

    private S3Client client(PersistenceDtos.ObjectStorageConfig config) {
        validate(config);
        return S3Client.builder().endpointOverride(URI.create(config.endpoint().trim()))
                .region(Region.of(config.region().trim())).credentialsProvider(credentials(config))
                .serviceConfiguration(S3Configuration.builder().chunkedEncodingEnabled(false).build())
                .requestChecksumCalculation(RequestChecksumCalculation.WHEN_REQUIRED)
                .httpClientBuilder(UrlConnectionHttpClient.builder().connectionTimeout(Duration.ofSeconds(10)).socketTimeout(Duration.ofSeconds(60)))
                .overrideConfiguration(builder -> builder.apiCallTimeout(Duration.ofMinutes(3)).apiCallAttemptTimeout(Duration.ofMinutes(2)))
                .build();
    }

    @Override
    public String putObject(PersistenceDtos.ObjectStorageConfig config, String key, InputStream data, long bytes, String mimeType) {
        try (S3Client client = client(config)) {
            client.putObject(PutObjectRequest.builder().bucket(config.bucket()).key(key).contentType(mimeType).build(),
                    RequestBody.fromInputStream(data, bytes));
        }
        return mediaUrl(config, key);
    }

    @Override
    public void putPrivateObject(PersistenceDtos.ObjectStorageConfig config, String key, Path file) {
        putPrivateObject(config, key, file, "application/octet-stream");
    }

    @Override
    public void putPrivateObject(PersistenceDtos.ObjectStorageConfig config, String key, Path file, String mimeType) {
        try (S3Client client = client(config)) {
            client.putObject(PutObjectRequest.builder().bucket(config.bucket()).key(key).contentType(mimeType).build(), RequestBody.fromFile(file));
        }
    }

    @Override
    public void downloadPrivateObject(PersistenceDtos.ObjectStorageConfig config, String key, Path target) {
        try (S3Client client = client(config); InputStream source = client.getObject(GetObjectRequest.builder().bucket(config.bucket()).key(key).build())) {
            java.nio.file.Files.copy(source, target, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
        } catch (java.io.IOException error) {
            throw new BusinessException(ErrorCode.THIRD_PARTY_CALL_ERROR, "S3 私有文件下载失败");
        }
    }

    @Override
    public void deletePrivateObject(PersistenceDtos.ObjectStorageConfig config, String key) {
        try (S3Client client = client(config)) {
            client.deleteObject(builder -> builder.bucket(config.bucket()).key(key));
        }
    }

    @Override
    public String createReadUrl(PersistenceDtos.ObjectStorageConfig config, String key, String name, String mimeType, boolean download, Instant expiresAt) {
        validate(config);
        Duration lifetime = Duration.between(Instant.now(), expiresAt);
        if (lifetime.isNegative() || lifetime.isZero()) throw new BusinessException(ErrorCode.PARAM_INVALID, "文件访问地址已过期");
        var request = GetObjectRequest.builder().bucket(config.bucket()).key(key)
                .responseContentDisposition(ContentDisposition.builder(download ? "attachment" : "inline")
                        .filename(name, StandardCharsets.UTF_8).build().toString());
        if (StringUtils.hasText(mimeType)) request.responseContentType(mimeType);
        try (S3Presigner signer = S3Presigner.builder().endpointOverride(URI.create(config.endpoint().trim()))
                .region(Region.of(config.region().trim())).credentialsProvider(credentials(config)).build()) {
            return signer.presignGetObject(builder -> builder.signatureDuration(lifetime).getObjectRequest(request.build())).url().toString();
        }
    }

    /** Stable bearer link grants read access to this one object, like existing public media URLs. */
    public static String mediaUrl(PersistenceDtos.ObjectStorageConfig config, String key) {
        return UriComponentsBuilder.fromUriString(config.publicBaseUrl().trim().replaceAll("/+$", "") + MEDIA_PATH)
                .queryParam("storageId", "{storageId}").queryParam("key", "{key}").queryParam("signature", "{signature}")
                .encode().buildAndExpand(java.util.Map.of("storageId", config.id(), "key", key, "signature", signature(config, key))).toUriString();
    }

    public static boolean validSignature(PersistenceDtos.ObjectStorageConfig config, String key, String supplied) {
        return supplied != null && supplied.length() == 64 && MessageDigest.isEqual(
                signature(config, key).getBytes(StandardCharsets.US_ASCII), supplied.getBytes(StandardCharsets.US_ASCII));
    }

    private static String signature(PersistenceDtos.ObjectStorageConfig config, String key) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(config.secretKey().trim().getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            // Length-prefixed storage identity prevents ambiguity between the identity and object key.
            return HexFormat.of().formatHex(mac.doFinal(("railway-media-v1:" + config.id().length() + ":" + config.id() + key).getBytes(StandardCharsets.UTF_8)));
        } catch (java.security.GeneralSecurityException error) { throw new IllegalStateException(error); }
    }
}
