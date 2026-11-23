package com.novanovastudio.ai;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONObject;
import com.novanovastudio.common.BusinessException;
import com.novanovastudio.common.ErrorCode;
import com.novanovastudio.common.SystemMessage;
import java.net.URI;
import java.net.http.HttpRequest;
import java.util.Map;
import java.util.TreeMap;
import org.springframework.util.StringUtils;

/** 自定义模型请求头解析，保存时与调用时使用同一份校验。 */
public final class AiRequestHeaders {

    private AiRequestHeaders() {
    }

    /** 只接受字符串值，使用JDK校验HTTP名称和值，同名请求头忽略大小写。 */
    public static Map<String, String> parse(String json) {
        if (!StringUtils.hasText(json)) return Map.of();
        try {
            if (!(JSON.parse(json) instanceof JSONObject object)) throw new IllegalArgumentException();
            Map<String, String> headers = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
            HttpRequest.Builder validator = HttpRequest.newBuilder(URI.create("https://localhost"));
            for (var entry : object.entrySet()) {
                if (!(entry.getValue() instanceof String value)) throw new IllegalArgumentException();
                validator.setHeader(entry.getKey(), value);
                headers.put(entry.getKey(), value);
            }
            return headers;
        } catch (Exception exception) {
            // 不把请求头原值写入错误消息，避免鉴权凭证泄露。
            throw new BusinessException(ErrorCode.PARAM_INVALID, SystemMessage.of("business.invalidCustomRequestHeaders"));
        }
    }
}
