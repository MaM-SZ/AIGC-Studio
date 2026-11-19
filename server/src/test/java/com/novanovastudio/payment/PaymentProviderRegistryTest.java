package com.novanovastudio.payment;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.util.List;
import org.junit.jupiter.api.Test;
class PaymentProviderRegistryTest {
    @Test void listsOnlyEnabledChannels() {
        PaymentProvider enabled = mock(PaymentProvider.class);
        PaymentProvider disabled = mock(PaymentProvider.class);
        when(enabled.method()).thenReturn("waffo");
        when(disabled.method()).thenReturn("wechat");
        when(enabled.isEnabled()).thenReturn(true);
        when(disabled.isEnabled()).thenReturn(false);
        assertEquals(List.of("waffo"), new PaymentProviderRegistry(List.of(enabled, disabled)).enabledMethods());
    }
}
