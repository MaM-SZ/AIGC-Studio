package com.novanovastudio.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.novanovastudio.config.NovanovaProperties;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import reactor.core.publisher.Mono;

/** 通过 HTTPS 调用 Resend 邮件 API，绕过 Railway 对 SMTP 出站端口的限制。 */
@Service
public class ResendEmailService {
    private static final URI RESEND_EMAILS_URI = URI.create("https://api.resend.com/emails");

    private final NovanovaProperties properties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final URI endpoint;

    public ResendEmailService(NovanovaProperties properties, ObjectMapper objectMapper) {
        this(properties, objectMapper,
                HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build(),
                RESEND_EMAILS_URI);
    }

    ResendEmailService(NovanovaProperties properties, ObjectMapper objectMapper, HttpClient httpClient, URI endpoint) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.httpClient = httpClient;
        this.endpoint = endpoint;
    }

    /** 当前是否选择 Resend HTTPS 传输。 */
    public boolean isEnabled() {
        return "resend".equalsIgnoreCase(properties.getEmail().getProvider());
    }

    /**
     * 发送一封 HTML 邮件。
     *
     * @param to 收件人
     * @param subject 主题
     * @param html HTML 正文
     * @return 发送结果
     */
    public Mono<Void> send(String to, String subject, String html) {
        String apiKey = properties.getEmail().getResendApiKey();
        String from = properties.getEmail().getFrom();
        if (!StringUtils.hasText(apiKey)) {
            return Mono.error(new IllegalStateException("Resend API Key 未配置"));
        }
        if (!StringUtils.hasText(from)) {
            return Mono.error(new IllegalStateException("邮件发件人未配置"));
        }

        final String requestBody;
        try {
            requestBody = objectMapper.writeValueAsString(Map.of(
                    "from", from,
                    "to", List.of(to),
                    "subject", subject,
                    "html", html));
        } catch (JsonProcessingException exception) {
            return Mono.error(new IllegalStateException("无法组装 Resend 请求", exception));
        }

        HttpRequest request = HttpRequest.newBuilder(endpoint)
                .timeout(Duration.ofSeconds(15))
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .build();
        return Mono.fromFuture(httpClient.sendAsync(request, HttpResponse.BodyHandlers.ofString()))
                .flatMap(response -> response.statusCode() >= 200 && response.statusCode() < 300
                        ? Mono.<Void>empty()
                        : Mono.error(new IllegalStateException("Resend API 返回 HTTP " + response.statusCode())));
    }
}
