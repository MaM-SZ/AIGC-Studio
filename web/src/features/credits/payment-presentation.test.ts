import assert from "node:assert/strict";
import test from "node:test";
import { paymentPresentation, redirectHostedPayment } from "./payment-presentation";

test("Waffo immediately navigates to checkout without a second click", () => {
    const destinations: string[] = [];
    const url = "https://pancake.waffo.ai/store/studio/checkout/cs_example";
    const redirected = redirectHostedPayment("waffo", url, (target) => destinations.push(target));
    assert.deepEqual(destinations, [url]);
    assert.equal(redirected, true);
});

test("QR payments and missing checkout links keep the payment dialog", () => {
    for (const [method, url] of [["alipay", "https://example.com/qr"], ["wechat", "weixin://wxpay/example"], ["waffo", ""]]) {
        const destinations: string[] = [];
        const redirected = redirectHostedPayment(method, url, (target) => destinations.push(target));
        assert.equal(redirected, false);
        assert.deepEqual(destinations, []);
    }
});

test("Waffo opens a hosted checkout and closing its dialog preserves the order", () => {
    assert.deepEqual(paymentPresentation("waffo"), { kind: "hosted", titleKey: "credits.waffoCheckout", cancelOnClose: false });
});
test("existing channels retain their QR presentation and cancellation", () => {
    assert.deepEqual(paymentPresentation("wechat"), { kind: "qr", titleKey: "credits.wechatScanPay", cancelOnClose: true });
    assert.deepEqual(paymentPresentation("alipay"), { kind: "iframe", titleKey: "credits.alipayScanPay", cancelOnClose: true });
});
