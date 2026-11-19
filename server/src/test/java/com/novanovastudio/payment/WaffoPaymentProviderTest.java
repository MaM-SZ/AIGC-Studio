package com.novanovastudio.payment;

import static org.junit.jupiter.api.Assertions.*;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONObject;
import com.novanovastudio.common.BusinessException;
import com.novanovastudio.config.WaffoProperties;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.OffsetDateTime;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.http.client.reactive.MockClientHttpRequest;
import org.springframework.web.reactive.function.client.*;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

class WaffoPaymentProviderTest {
    private WaffoProperties properties;
    private WaffoPaymentProvider provider;
    private KeyPair keys;
    private ClientRequest lastRequest;
    private String lastBody;
    private String response;

    @BeforeEach
    void setUp() throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(2048);
        keys = generator.generateKeyPair();
        properties = new WaffoProperties();
        properties.setEnabled(true);
        properties.setMerchantId("MER_test");
        properties.setStoreId("STO_test");
        properties.setProductId("PROD_test");
        properties.setPrivateKey(pem("PRIVATE KEY", keys.getPrivate().getEncoded()).replace("\n", "\\n"));
        properties.setWebhookPublicKey(pem("PUBLIC KEY", keys.getPublic().getEncoded()));
        properties.setSuccessUrl("https://example.com/credits/purchase");
        WebClient client = WebClient.builder().exchangeFunction(request -> {
            lastRequest = request;
            MockClientHttpRequest output = new MockClientHttpRequest(request.method(), request.url());
            return request.writeTo(output, ExchangeStrategies.withDefaults())
                    .then(Mono.defer(output::getBodyAsString)).map(body -> {
                        lastBody = body;
                        return ClientResponse.create(HttpStatus.OK).header("Content-Type", "application/json").body(response).build();
                    });
        }).build();
        provider = new WaffoPaymentProvider(properties, client);
    }

    @Test
    void createsSignedCnyCheckoutWithStableIdempotencyAndLockedAmount() throws Exception {
        response = "{\"data\":{\"sessionId\":\"cs_test\",\"checkoutUrl\":\"https://checkout.waffo.ai/store/checkout/cs_test\"}}";
        var order = new PaymentProvider.PaymentOrder("a123456789abcdef0123456789abcdef", "购买积分", new BigDecimal("2.00"), OffsetDateTime.now().plusMinutes(15));
        String url = provider.createPayment(order).block();
        assertEquals("https://checkout.waffo.ai/store/checkout/cs_test", url);
        JSONObject body = JSON.parseObject(lastBody);
        assertEquals("CNY", body.getString("currency"));
        assertEquals("PROD_test", body.getString("productId"));
        assertEquals(order.orderNo(), body.getString("orderMerchantExternalId"));
        assertEquals("2.00", body.getJSONObject("priceSnapshot").getString("amount"));
        assertTrue(body.getJSONObject("priceSnapshot").getBooleanValue("taxIncluded"));
        assertFalse(body.getBooleanValue("allowPromotionCodes"));
        assertTrue(body.getIntValue("expiresInSeconds") <= 900);
        assertTrue(body.getString("successUrl").endsWith("?orderNo=" + order.orderNo()));
        String timestamp = lastRequest.headers().getFirst("X-Timestamp");
        String hash = Base64.getEncoder().encodeToString(MessageDigest.getInstance("SHA-256").digest(lastBody.getBytes(StandardCharsets.UTF_8)));
        Signature verifier = Signature.getInstance("SHA256withRSA");
        verifier.initVerify(keys.getPublic());
        verifier.update(("POST\n/v1/actions/checkout/create-session\n" + timestamp + "\n" + hash).getBytes(StandardCharsets.UTF_8));
        assertTrue(verifier.verify(Base64.getDecoder().decode(lastRequest.headers().getFirst("X-Signature"))));
        String key = lastRequest.headers().getFirst("X-Idempotency-Key");
        provider.createPayment(order).block();
        assertEquals(key, lastRequest.headers().getFirst("X-Idempotency-Key"));
        assertEquals("MER_test", lastRequest.headers().getFirst("X-Merchant-Id"));
    }

    @Test
    void verifiesRawBodyAndMapsPaymentToPlatformOrder() throws Exception {
        String body = event("test", "CNY", "2.00");
        var notification = provider.verifyNotification(signed(body, System.currentTimeMillis())).block();
        assertEquals("waffo", notification.paymentMethod());
        assertEquals("MER_test", notification.appId());
        assertEquals("order-1", notification.orderNo());
        assertEquals("ORD_test", notification.providerTradeNo());
        assertEquals(new BigDecimal("2.00"), notification.amount());
        assertEquals("SUCCESS", notification.tradeStatus());
        assertNotNull(notification.paidAt());
    }

    @Test
    void rejectsTamperingWrongEnvironmentStoreCurrencyAndMissingCharge() throws Exception {
        String body = event("test", "CNY", "2.00");
        Map<String,String> signed = new HashMap<>(signed(body, System.currentTimeMillis()));
        signed.put("body", body + " ");
        StepVerifier.create(provider.verifyNotification(signed)).expectError(BusinessException.class).verify();
        for (String invalid : List.of(event("prod", "CNY", "2.00"), event("test", "USD", "2.00"),
                body.replace("STO_test", "STO_other"), body.replace("\"chargedAmount\":\"2.00\",", ""),
                body.replace("succeeded", "failed"))) {
            StepVerifier.create(provider.verifyNotification(signed(invalid, System.currentTimeMillis()))).expectError(BusinessException.class).verify();
        }
    }

    @Test
    void acceptsOriginalSignatureOnRetryButRejectsExpiredOrMalformedHeaders() throws Exception {
        String body = event("test", "CNY", "2.00");
        StepVerifier.create(provider.verifyNotification(signed(body, System.currentTimeMillis() - 32*60*1000))).expectNextCount(1).verifyComplete();
        StepVerifier.create(provider.verifyNotification(signed(body, System.currentTimeMillis() - 46*60*1000))).expectError(BusinessException.class).verify();
        for (String signature : List.of("", "t=NaN,v1=bad", "t=1,t=2,v1=bad")) {
            StepVerifier.create(provider.verifyNotification(Map.of("body", body, "X-Waffo-Signature", signature))).expectError(BusinessException.class).verify();
        }
    }

    @Test
    void acknowledgesUnrelatedSignedEventsWithoutGrantingCredits() throws Exception {
        String body = event("test", "CNY", "2.00").replace("order.completed", "refund.succeeded");
        StepVerifier.create(provider.verifyNotification(signed(body, System.currentTimeMillis()))).verifyComplete();
    }

    @Test
    void queriesOrderByBusinessReferenceButDoesNotGrantFromExpectedPriceSnapshot() {
        response = "{\"data\":{\"onetimeOrders\":[{\"id\":\"ORD_test\",\"orderMerchantExternalId\":\"order-1\",\"status\":\"completed\",\"currency\":\"CNY\",\"priceSnapshot\":{\"currency\":\"CNY\",\"total\":\"2.00\"},\"payments\":[{\"id\":\"PAY_test\",\"status\":\"succeeded\",\"createdAt\":\"2026-11-19T00:00:00Z\",\"snapshotAmountDetails\":{\"currency\":\"CNY\",\"total\":\"2.00\"}}]}]}}";
        StepVerifier.create(provider.queryOrder("order-1")).assertNext(result -> {
            assertEquals("AWAITING_NOTIFICATION", result.tradeStatus());
            assertEquals("ORD_test", result.providerTradeNo());
            assertNull(result.amount());
        }).verifyComplete();
        assertEquals("order-1", JSON.parseObject(lastBody).getJSONObject("variables").getString("ref"));
        assertEquals("STO_test", JSON.parseObject(lastBody).getJSONObject("variables").getString("storeId"));
        assertNull(lastRequest.headers().getFirst("X-Idempotency-Key"));
    }

    @Test
    void doesNotCloseAnOrderThatMayStillBePaidAndDoesNotSwallowGraphqlErrors() {
        response = "{\"data\":{\"onetimeOrders\":[]}}";
        StepVerifier.create(provider.closePayment("order-1")).expectError(BusinessException.class).verify();
        response = "{\"data\":null,\"errors\":[{\"message\":\"error\"}]}";
        StepVerifier.create(provider.queryOrder("order-1")).expectError(BusinessException.class).verify();
        response = "{\"data\":{\"onetimeOrders\":[{\"id\":\"ORD_test\",\"orderMerchantExternalId\":\"order-1\",\"currency\":\"CNY\",\"status\":\"canceled\"}]}}";
        StepVerifier.create(provider.closePayment("order-1")).verifyComplete();
    }

    @Test
    void rejectsDisabledCheckoutAndUnsafeCheckoutUrl() {
        response = "{\"data\":{\"sessionId\":\"cs_test\",\"checkoutUrl\":\"javascript:alert(1)\"}}";
        var order = new PaymentProvider.PaymentOrder("order-1", "积分", new BigDecimal("2.00"), OffsetDateTime.now().plusMinutes(15));
        StepVerifier.create(provider.createPayment(order)).expectError(BusinessException.class).verify();
        properties.setEnabled(false);
        StepVerifier.create(provider.createPayment(order)).expectError(BusinessException.class).verify();
    }

    @Test
    void rejectsEmptyProviderResponseInsteadOfSilentlyCompletingCheckout() {
        response = "";
        var order = new PaymentProvider.PaymentOrder("order-1", "积分", new BigDecimal("2.00"), OffsetDateTime.now().plusMinutes(15));
        StepVerifier.create(provider.createPayment(order)).expectError(BusinessException.class).verify();
    }

    private String event(String mode, String currency, String amount) {
        return " {\n\"id\":\"PAY_test\",\"eventType\":\"order.completed\",\"mode\":\"" + mode + "\",\"storeId\":\"STO_test\",\"data\":{\"orderId\":\"ORD_test\",\"orderStatus\":\"completed\",\"orderMerchantExternalId\":\"order-1\",\"currency\":\"" + currency + "\",\"chargedAmount\":\"" + amount + "\",\"paymentId\":\"PAY_test\",\"paymentStatus\":\"succeeded\",\"paymentTimestamp\":\"2026-11-19T00:00:00Z\"}} ";
    }
    private Map<String,String> signed(String body, long timestamp) throws Exception {
        Signature signer = Signature.getInstance("SHA256withRSA");
        signer.initSign(keys.getPrivate());
        signer.update((timestamp + "." + body).getBytes(StandardCharsets.UTF_8));
        return Map.of("body", body, "X-Waffo-Signature", "t=" + timestamp + ",v1=" + Base64.getEncoder().encodeToString(signer.sign()));
    }
    private String pem(String type, byte[] key) {
        return "-----BEGIN " + type + "-----\n" + Base64.getEncoder().encodeToString(key) + "\n-----END " + type + "-----";
    }
}
