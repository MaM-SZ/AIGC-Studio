import assert from "node:assert/strict";
import test from "node:test";
import { paymentPresentation } from "./payment-presentation";

test("Waffo opens a hosted checkout and closing its dialog preserves the order", () => {
    assert.deepEqual(paymentPresentation("waffo"), { kind: "hosted", titleKey: "credits.waffoCheckout", cancelOnClose: false });
});
test("existing channels retain their QR presentation and cancellation", () => {
    assert.deepEqual(paymentPresentation("wechat"), { kind: "qr", titleKey: "credits.wechatScanPay", cancelOnClose: true });
    assert.deepEqual(paymentPresentation("alipay"), { kind: "iframe", titleKey: "credits.alipayScanPay", cancelOnClose: true });
});
