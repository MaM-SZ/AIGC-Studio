package com.novanovastudio.config;

import lombok.Data;
import lombok.ToString;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/** Waffo 商户配置；密钥仅在服务端使用。积分商品金额固定为 CNY。 */
@Data
@Component
@ConfigurationProperties(prefix = "novanova.waffo")
public class WaffoProperties {
    private boolean enabled;
    private String merchantId = "";
    @ToString.Exclude
    private String privateKey = "";
    private String webhookPublicKey = "";
    private String storeId = "";
    private String productId = "";
    private String environment = "test";
    private String successUrl = "";
}
