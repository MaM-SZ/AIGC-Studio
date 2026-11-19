package com.novanovastudio.payment;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import com.novanovastudio.common.BusinessException;
import com.novanovastudio.common.ErrorCode;
import com.novanovastudio.config.WaffoProperties;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.MessageDigest;
import java.security.Signature;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

/** Waffo 官方 REST 协议：RSA 请求签名、托管收银台、原始报文验签及 GraphQL 查单。 */
@Component
@Slf4j
public class WaffoPaymentProvider implements PaymentProvider {
    private static final String API = "https://api.waffo.ai";
    private static final String CHECKOUT_PATH = "/v1/actions/checkout/create-session";
    private static final String QUERY = """
            query($storeId: String!, $ref: String!) {
              onetimeOrders(storeId: $storeId, filter: {orderMerchantExternalId: {eq: $ref}}, limit: 2) {
                id orderMerchantExternalId status currency
              }
            }
            """;
    private final WaffoProperties properties;
    private final WebClient client;

    @Autowired
    public WaffoPaymentProvider(WaffoProperties properties) {
        this(properties, WebClient.builder().codecs(codecs -> codecs.defaultCodecs().maxInMemorySize(256 * 1024)).build());
    }

    WaffoPaymentProvider(WaffoProperties properties, WebClient client) {
        this.properties = properties;
        this.client = client;
    }

    @Override
    public boolean isEnabled() { return properties.isEnabled(); }

    @Override
    public String method() { return "waffo"; }

    @Override
    public String applicationId() { return properties.getMerchantId(); }

    @Override
    public Mono<String> createPayment(PaymentOrder order) {
        return guarded(() -> {
            long seconds = Duration.between(OffsetDateTime.now(), order.expiresAt()).getSeconds();
            if (seconds < 60 || order.amount() == null || order.amount().signum() <= 0) {
                throw failure("订单即将过期或金额无效，请重新下单");
            }
            URI success = URI.create(properties.getSuccessUrl());
            if (!"https".equals(success.getScheme()) || success.getHost() == null || success.getUserInfo() != null
                    || success.getQuery() != null || success.getFragment() != null) throw failure("Waffo 支付成功地址必须为 HTTPS 地址且不含查询或片段");
            Map<String, Object> body = new HashMap<>();
            body.put("productId", properties.getProductId());
            body.put("currency", "CNY");
            body.put("priceSnapshot", Map.of("amount", order.amount().setScale(2, RoundingMode.UNNECESSARY).toPlainString(),
                    "taxIncluded", true, "taxCategory", "saas"));
            body.put("orderMerchantExternalId", order.orderNo());
            body.put("metadata", Map.of("orderNo", order.orderNo()));
            body.put("allowPromotionCodes", false);
            body.put("expiresInSeconds", seconds);
            body.put("successUrl", success + "?orderNo=" + java.net.URLEncoder.encode(order.orderNo(), StandardCharsets.UTF_8));
            // 订单号由平台生成的随机 UUID 构成；恢复支付仍使用同一个键，防止多次付款。
            return post(CHECKOUT_PATH, body, applicationId() + "-credit-checkout-" + order.orderNo()).map(result -> {
                JSONObject data = requiredObject(result, "data");
                required(data, "sessionId");
                String url = required(data, "checkoutUrl");
                URI uri = URI.create(url);
                if (!"https".equals(uri.getScheme()) || uri.getHost() == null || uri.getUserInfo() != null
                        || !(uri.getHost().equals("waffo.ai") || uri.getHost().endsWith(".waffo.ai"))) {
                    throw failure("Waffo 返回的收银台地址无效");
                }
                return url;
            });
        });
    }

    @Override
    public Mono<PaymentNotification> verifyNotification(Map<String, String> parameters) {
        return guarded(() -> {
            String body = required(parameters, "body");
            String header = required(parameters, "X-Waffo-Signature");
            Map<String, String> fields = new HashMap<>();
            for (String part : header.split(",")) {
                String[] pair = part.trim().split("=", 2);
                if (pair.length != 2 || fields.put(pair[0], pair[1]) != null) throw failure("Waffo 回调签名格式无效");
            }
            String timestamp = required(fields, "t");
            long signedAt = Long.parseLong(timestamp);
            long now = System.currentTimeMillis();
            // 官方重试复用原签名，最后一次重试约 31 分钟后到达，必须保留 45 分钟窗口。
            if (signedAt < now - Duration.ofMinutes(45).toMillis() || signedAt > now + Duration.ofMinutes(45).toMillis()) {
                throw failure("Waffo 回调签名已过期");
            }
            Signature verifier = Signature.getInstance("SHA256withRSA");
            verifier.initVerify(KeyFactory.getInstance("RSA").generatePublic(new X509EncodedKeySpec(pemBytes(properties.getWebhookPublicKey()))));
            verifier.update((timestamp + "." + body).getBytes(StandardCharsets.UTF_8));
            if (!verifier.verify(Base64.getDecoder().decode(required(fields, "v1")))) throw failure("Waffo 回调签名校验失败");
            JSONObject event = JSON.parseObject(body);
            if (!properties.getEnvironment().equals(required(event, "mode"))
                    || !properties.getStoreId().equals(required(event, "storeId"))) throw failure("Waffo 回调环境或店铺不匹配");
            required(event, "id");
            if (!"order.completed".equals(required(event, "eventType"))) return Mono.empty();
            JSONObject data = requiredObject(event, "data");
            if (!"completed".equals(required(data, "orderStatus")) || !"succeeded".equals(required(data, "paymentStatus"))) {
                throw failure("Waffo 交易尚未支付成功");
            }
            required(data, "paymentId");
            return Mono.just(new PaymentNotification(method(), applicationId(), required(data, "orderMerchantExternalId"),
                    amount(data, "chargedAmount"), required(data, "orderId"), "SUCCESS", OffsetDateTime.parse(required(data, "paymentTimestamp"))));
        });
    }

    @Override
    public Mono<PaymentNotification> queryOrder(String orderNo) {
        return guarded(() -> post("/v1/graphql", Map.of("query", QUERY,
                "variables", Map.of("storeId", properties.getStoreId(), "ref", orderNo)), null).flatMap(result -> {
            JSONArray orders = requiredObject(result, "data").getJSONArray("onetimeOrders");
            if (orders == null || orders.size() > 1) throw failure("Waffo 查单结果无效或存在重复订单");
            if (orders.isEmpty()) return Mono.empty();
            JSONObject order = orders.getJSONObject(0);
            if (!orderNo.equals(required(order, "orderMerchantExternalId")) || !"CNY".equals(required(order, "currency"))) {
                throw failure("Waffo 支付订单号或币种不匹配");
            }
            String id = required(order, "id");
            String status = required(order, "status");
            if ("canceled".equals(status)) return Mono.just(new PaymentNotification(method(), applicationId(), orderNo, null, id, "CLOSED", null));
            if (!"completed".equals(status)) return Mono.just(new PaymentNotification(method(), applicationId(), orderNo, null, id, "PENDING", null));
            // GraphQL 价格快照表示应付额，不代表实收；只允许签名回调的 chargedAmount 发放积分。
            return Mono.just(new PaymentNotification(method(), applicationId(), orderNo, null, id, "AWAITING_NOTIFICATION", null));
        }));
    }

    /** 商户 API 无法撤销尚未消费的收银台链接，必须等渠道明确关闭，禁止伪造关单成功。 */
    @Override
    public Mono<Void> closePayment(String orderNo) {
        return queryOrder(orderNo).filter(result -> "CLOSED".equals(result.tradeStatus()))
                .switchIfEmpty(Mono.error(failure("Waffo 订单尚未确认关闭，请等待支付结果"))).then();
    }

    private Mono<JSONObject> post(String path, Map<String, ?> data, String idempotencyKey) throws Exception {
        String body = JSON.toJSONString(data);
        String timestamp = Long.toString(System.currentTimeMillis() / 1000);
        String hash = Base64.getEncoder().encodeToString(MessageDigest.getInstance("SHA-256").digest(body.getBytes(StandardCharsets.UTF_8)));
        String pem = properties.getPrivateKey().replace("\\n", "\n");
        byte[] key = pemBytes(pem);
        if (pem.contains("BEGIN RSA PRIVATE KEY")) key = pkcs8(key);
        Signature signature = Signature.getInstance("SHA256withRSA");
        signature.initSign(KeyFactory.getInstance("RSA").generatePrivate(new PKCS8EncodedKeySpec(key)));
        signature.update(("POST\n" + path + "\n" + timestamp + "\n" + hash).getBytes(StandardCharsets.UTF_8));
        return client.post().uri(API + path).header("Content-Type", "application/json")
                .header("X-Merchant-Id", applicationId()).header("X-Timestamp", timestamp)
                .header("X-Signature", Base64.getEncoder().encodeToString(signature.sign()))
                .headers(headers -> { if (idempotencyKey != null) headers.set("X-Idempotency-Key", idempotencyKey); })
                .bodyValue(body).retrieve().bodyToMono(String.class).timeout(Duration.ofSeconds(15))
                .map(response -> {
                    JSONObject result = JSON.parseObject(response);
                    JSONArray errors = result.getJSONArray("errors");
                    if (errors != null && !errors.isEmpty()) throw failure("Waffo 接口返回错误，请稍后查询订单状态");
                    return result;
                });
    }

    private <T> Mono<T> guarded(CheckedSupplier<Mono<T>> action) {
        return Mono.defer(() -> {
            if (!properties.isEnabled() || properties.getMerchantId().isBlank() || properties.getPrivateKey().isBlank()
                    || properties.getWebhookPublicKey().isBlank() || properties.getStoreId().isBlank() || properties.getProductId().isBlank()
                    || !("test".equals(properties.getEnvironment()) || "prod".equals(properties.getEnvironment()))) {
                return Mono.error(failure("Waffo 支付尚未完成配置"));
            }
            try { return action.get(); }
            catch (Exception error) { return Mono.error(error); }
        }).subscribeOn(Schedulers.boundedElastic()).onErrorMap(error -> {
            log.warn("Waffo 支付操作失败: errorType={}", error.getClass().getSimpleName());
            return error instanceof BusinessException ? error : failure("Waffo 支付处理失败，请稍后查询订单状态");
        });
    }

    private BigDecimal amount(JSONObject data, String name) {
        if (!"CNY".equals(required(data, "currency"))) throw failure("Waffo 支付币种不匹配");
        BigDecimal value = new BigDecimal(required(data, name)).setScale(2, RoundingMode.UNNECESSARY);
        if (value.signum() <= 0) throw failure("Waffo 支付金额无效");
        return value;
    }

    private String required(Map<?, ?> data, String key) {
        Object value = data.get(key);
        if (!(value instanceof String text) || text.isBlank()) throw failure("Waffo 支付缺少必要字段");
        return text;
    }

    private JSONObject requiredObject(JSONObject data, String name) {
        JSONObject value = data.getJSONObject(name);
        if (value == null) throw failure("Waffo 支付缺少必要字段");
        return value;
    }

    private byte[] pemBytes(String pem) {
        return Base64.getDecoder().decode(pem.replace("\\n", "\n").replaceAll("-----[^-]+-----", "").replaceAll("\\s", ""));
    }

    /** 兼容控制台导出的 PKCS#1 和 PKCS#8 RSA 私钥。 */
    private byte[] pkcs8(byte[] pkcs1) {
        byte[] algorithm = java.util.HexFormat.of().parseHex("020100300d06092a864886f70d0101010500");
        byte[] octets = der(4, pkcs1);
        byte[] content = new byte[algorithm.length + octets.length];
        System.arraycopy(algorithm, 0, content, 0, algorithm.length);
        System.arraycopy(octets, 0, content, algorithm.length, octets.length);
        return der(48, content);
    }

    private byte[] der(int tag, byte[] value) {
        java.io.ByteArrayOutputStream output = new java.io.ByteArrayOutputStream();
        output.write(tag);
        if (value.length < 128) output.write(value.length);
        else { output.write(130); output.write(value.length >> 8); output.write(value.length & 255); }
        output.writeBytes(value);
        return output.toByteArray();
    }

    private BusinessException failure(String message) { return new BusinessException(ErrorCode.THIRD_PARTY_CALL_ERROR, message); }
    @FunctionalInterface
    private interface CheckedSupplier<T> { T get() throws Exception; }
}
