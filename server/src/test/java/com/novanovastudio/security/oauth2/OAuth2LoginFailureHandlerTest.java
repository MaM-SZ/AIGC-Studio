package com.novanovastudio.security.oauth2;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.web.server.WebFilterExchange;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

/** OAuth2 协议阶段的登录失败提示测试。 */
class OAuth2LoginFailureHandlerTest {

    /** 保留受控的邮箱错误码，其他协议异常统一显示授权失败。 */
    @ParameterizedTest
    @CsvSource({"emailUnavailable,emailUnavailable", "access_denied,accessDenied", "invalid_token,authorizationFailed"})
    void shouldRedirectWithKnownErrorCode(String protocolCode, String frontendCode) {
        OAuth2CallbackRedirector redirector = mock(OAuth2CallbackRedirector.class);
        WebFilterExchange exchange = mock(WebFilterExchange.class);
        when(redirector.redirectFailure(eq(exchange), anyString())).thenReturn(Mono.empty());

        StepVerifier.create(new OAuth2LoginFailureHandler(redirector).onAuthenticationFailure(exchange,
                new OAuth2AuthenticationException(new OAuth2Error(protocolCode)))).verifyComplete();

        verify(redirector).redirectFailure(exchange, frontendCode);
    }
}
