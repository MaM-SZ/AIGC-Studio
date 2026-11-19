package com.novanovastudio.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;

import com.novanovastudio.security.oauth2.ThirdPartyOAuth2ProviderRegistry;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.core.ResolvableType;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.client.userinfo.ReactiveOAuth2UserService;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.OAuth2AccessToken;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.reactive.function.client.ClientRequest;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

/** GitHub 登录邮箱读取回归测试。 */
class GitHubOAuth2UserServiceTest {

    /** 验证隐藏公开邮箱时仍可使用已验证主邮箱，且保留用户身份和权限。 */
    @Test
    void shouldLoadVerifiedPrimaryEmailWhenPublicEmailIsNull() {
        List<ClientRequest> requests = new ArrayList<>();
        var service = service(requests, "{\"id\":123,\"login\":\"tester\",\"email\":null}", """
                [{"email":"other@example.com","primary":false,"verified":true},
                 {"email":"private@example.com","primary":true,"verified":true}]
                """, HttpStatus.OK);

        StepVerifier.create(service.loadUser(request("https://api.github.com/user")))
                .assertNext(user -> {
                    assertEquals("private@example.com", user.getAttribute("email"));
                    assertEquals("123", user.getName());
                    assertEquals("tester", user.getAttribute("login"));
                    assertTrue(user.getAuthorities().stream().anyMatch(authority -> "SCOPE_user:email".equals(authority.getAuthority())));
                }).verifyComplete();
        assertEquals(List.of("https://api.github.com/user", "https://api.github.com/user/emails"),
                requests.stream().map(item -> item.url().toString()).toList());
        assertEquals("Bearer test-token", requests.get(1).headers().getFirst(HttpHeaders.AUTHORIZATION));
    }

    /** 公开邮箱也必须由 GitHub 邮箱列表验证，防止绑定未经验证的邮箱。 */
    @Test
    void shouldUseVerifiedPrimaryEmailInsteadOfPublicEmail() {
        var service = service(new ArrayList<>(), "{\"id\":123,\"email\":\"public@example.com\"}", """
                [{"email":"verified@example.com","primary":true,"verified":true}]
                """, HttpStatus.OK);

        StepVerifier.create(service.loadUser(request("https://api.github.com/user")))
                .assertNext(user -> assertEquals("verified@example.com", user.getAttribute("email")))
                .verifyComplete();
    }

    /** 未验证的主邮箱和非主邮箱不能用来绑定本地账号。 */
    @Test
    void shouldRejectUnverifiedPrimaryEmail() {
        assertEmailUnavailable("""
                [{"email":"unsafe@example.com","primary":true,"verified":false},
                 {"email":"secondary@example.com","primary":false,"verified":true}]
                """, HttpStatus.OK);
    }

    /** 邮箱列表为空时明确返回邮箱不可用。 */
    @Test
    void shouldRejectEmptyEmailList() {
        assertEmailUnavailable("[]", HttpStatus.OK);
    }

    /** 邮箱授权不足时禁止继续使用公开邮箱。 */
    @Test
    void shouldRejectMissingEmailPermission() {
        assertEmailUnavailable("{\"message\":\"Resource not accessible\"}", HttpStatus.FORBIDDEN);
    }

    /** 自定义渠道和相似域名不得触发 GitHub 邮箱查询或泄露令牌。 */
    @Test
    void shouldLeaveOtherProvidersUnchanged() {
        List<ClientRequest> requests = new ArrayList<>();
        var service = service(requests, "{\"id\":123,\"email\":\"user@example.com\"}", "[]", HttpStatus.OK);

        StepVerifier.create(service.loadUser(request("https://api.github.com.example.com/user")))
                .assertNext(user -> assertEquals("user@example.com", user.getAttribute("email")))
                .verifyComplete();
        assertEquals(1, requests.size());
    }

    /** 验证错误可被登录失败处理器识别。 */
    private void assertEmailUnavailable(String emails, HttpStatus status) {
        var service = service(new ArrayList<>(), "{\"id\":123,\"email\":\"public@example.com\"}", emails, status);
        StepVerifier.create(service.loadUser(request("https://api.github.com/user")))
                .expectErrorSatisfies(error -> {
                    assertTrue(error instanceof OAuth2AuthenticationException);
                    assertEquals("emailUnavailable", ((OAuth2AuthenticationException) error).getError().getErrorCode());
                }).verify();
    }

    /** 从实际 OAuth2 配置获取用户服务，使用模拟 HTTP 响应验证完整资料读取。 */
    @SuppressWarnings("unchecked")
    private ReactiveOAuth2UserService<OAuth2UserRequest, OAuth2User> service(List<ClientRequest> requests,
            String profile, String emails, HttpStatus emailStatus) {
        WebClient.Builder builder = WebClient.builder().exchangeFunction(request -> {
            requests.add(request);
            boolean emailRequest = request.url().getPath().equals("/user/emails");
            return Mono.just(ClientResponse.create(emailRequest ? emailStatus : HttpStatus.OK)
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                    .body(emailRequest ? emails : profile).build());
        });
        try (var context = new AnnotationConfigApplicationContext()) {
            context.registerBean(ThirdPartyOAuth2ProviderRegistry.class, () -> mock(ThirdPartyOAuth2ProviderRegistry.class));
            context.registerBean(WebClient.Builder.class, () -> builder);
            context.register(OAuth2ClientConfiguration.class);
            context.refresh();
            return (ReactiveOAuth2UserService<OAuth2UserRequest, OAuth2User>) context.getBeanProvider(
                    ResolvableType.forClassWithGenerics(ReactiveOAuth2UserService.class, OAuth2UserRequest.class, OAuth2User.class))
                    .getObject();
        }
    }

    /** 渠道标识使用后台生成的随机值，不能靠固定 github 标识判断渠道。 */
    private OAuth2UserRequest request(String userInfoUri) {
        ClientRegistration registration = ClientRegistration.withRegistrationId("c1234567890abcdefghij")
                .clientId("client-id").clientSecret("client-secret")
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .redirectUri("https://studio.example.com/api/v1/auth/oauth/callback/c1234567890abcdefghij")
                .authorizationUri("https://github.com/login/oauth/authorize")
                .tokenUri("https://github.com/login/oauth/access_token")
                .userInfoUri(userInfoUri).userNameAttributeName("id").scope("read:user", "user:email").build();
        return new OAuth2UserRequest(registration, new OAuth2AccessToken(OAuth2AccessToken.TokenType.BEARER,
                "test-token", Instant.now(), Instant.now().plusSeconds(600), registration.getScopes()));
    }
}
