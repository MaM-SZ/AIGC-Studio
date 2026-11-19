package com.novanovastudio.security.oauth2;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONObject;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.client.userinfo.DefaultReactiveOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.client.userinfo.ReactiveOAuth2UserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.util.StringUtils;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

/** 第三方用户资料读取，GitHub 邮箱通过专用接口校验后回填。 */
@Slf4j
public class ThirdPartyOAuth2UserService implements ReactiveOAuth2UserService<OAuth2UserRequest, OAuth2User> {

    /** 标准 OAuth2 用户资料读取器 */
    private final DefaultReactiveOAuth2UserService delegate = new DefaultReactiveOAuth2UserService();

    /** 第三方接口客户端 */
    private final WebClient webClient;

    /** 创建用户资料读取器，复用同一个响应式 HTTP 客户端。 */
    public ThirdPartyOAuth2UserService(WebClient webClient) {
        this.webClient = webClient;
        delegate.setWebClient(webClient);
    }

    /** 按配置读取用户资料；GitHub 的公开邮箱可能为空，统一读取已验证主邮箱。 */
    @Override
    public Mono<OAuth2User> loadUser(OAuth2UserRequest request) {
        return delegate.loadUser(request).flatMap(user -> {
            String userInfoUri = request.getClientRegistration().getProviderDetails().getUserInfoEndpoint().getUri();
            if (!"https://api.github.com/user".equals(userInfoUri)) {
                return Mono.just(user);
            }
            return githubEmail(request).map(email -> {
                Map<String, Object> attributes = new LinkedHashMap<>(user.getAttributes());
                attributes.put("email", email);
                return new DefaultOAuth2User(user.getAuthorities(), attributes,
                        request.getClientRegistration().getProviderDetails().getUserInfoEndpoint().getUserNameAttributeName());
            });
        });
    }

    /** 仅使用已验证主邮箱，不能用未验证邮箱绑定同邮箱的本地账号。 */
    private Mono<String> githubEmail(OAuth2UserRequest request) {
        return webClient.get().uri("https://api.github.com/user/emails")
                .headers(headers -> headers.setBearerAuth(request.getAccessToken().getTokenValue()))
                .header(HttpHeaders.USER_AGENT, "Novanova-Studio")
                .accept(MediaType.APPLICATION_JSON)
                .retrieve().bodyToMono(String.class)
                .timeout(Duration.ofSeconds(15))
                .map(body -> JSON.parseArray(body, JSONObject.class).stream()
                        .filter(email -> email.getBooleanValue("primary") && email.getBooleanValue("verified"))
                        .map(email -> email.getString("email"))
                        .filter(StringUtils::hasText)
                        .findFirst().orElseThrow(() -> new OAuth2AuthenticationException(emailError())))
                .switchIfEmpty(Mono.error(new OAuth2AuthenticationException(emailError())))
                .onErrorMap(error -> !(error instanceof OAuth2AuthenticationException),
                        error -> new OAuth2AuthenticationException(emailError(), error))
                .doOnNext(email -> log.info("GitHub登录邮箱校验成功: provider={}", request.getClientRegistration().getRegistrationId()))
                .doOnError(error -> log.error("GitHub登录邮箱读取失败: provider={}", request.getClientRegistration().getRegistrationId(), error));
    }

    /** 创建可供登录失败页识别的邮箱错误。 */
    private OAuth2Error emailError() {
        return new OAuth2Error("emailUnavailable", "GitHub未返回已验证主邮箱，请确认已授权 user:email 且主邮箱已验证", null);
    }
}
