package com.novanovastudio.controller;

import com.novanovastudio.service.CreditPurchaseService;
import java.time.Duration;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.TreeMap;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.buffer.DataBufferUtils;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

/**
 * Waffo支付原始报文回调入口，按渠道规范返回 HTTP 状态。
 *
 * @author zhenglin.cn.cq@gmail.com
 * @date 2026-11-05 14:00
 */
@RestController
@RequestMapping("/api/v1/payment/waffo")
@RequiredArgsConstructor
@Slf4j
public class WaffoPaymentController {
    /** 统一订单结算服务。 */
    private final CreditPurchaseService purchaseService;

    /**
     * 传递原始正文和签名头，完成持久化后应答；超时返回失败供Waffo重试。
     * @param request 含原始正文和Waffo签名头的请求
     * @return 成功返回 200，验签或入账失败返回 500
     */
    @PostMapping("/notify")
    public Mono<ResponseEntity<Map<String, String>>> notify(ServerHttpRequest request) {
        // 直接读字节，绕过全局Fastjson解码器对JSON正文的重新序列化。
        return DataBufferUtils.join(request.getBody(), 256 * 1024)
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Waffo回调正文不能为空")))
                .flatMap(buffer -> {
                    String body;
                    try { body = buffer.toString(StandardCharsets.UTF_8); }
                    finally { DataBufferUtils.release(buffer); }
                    Map<String, String> parameters = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
                    parameters.putAll(request.getHeaders().toSingleValueMap());
                    parameters.put("body", body);
                    return purchaseService.handleWaffoNotification(parameters);
                }).timeout(Duration.ofSeconds(10))
                .thenReturn(ResponseEntity.ok(Map.of("status", "ok")))
                .onErrorResume(error -> {
                    log.error("Waffo支付回调验签或结算失败", error);
                    return Mono.just(ResponseEntity.internalServerError().body(Map.of("code", "FAIL", "message", "支付通知处理失败")));
                });
    }
}
