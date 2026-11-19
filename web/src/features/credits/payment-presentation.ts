/** 托管收银台关闭弹窗时保留订单，二维码渠道沿用主动取消流程。 */
export function paymentPresentation(method: string) {
    if (method === "waffo") return { kind: "hosted", titleKey: "credits.waffoCheckout", cancelOnClose: false } as const;
    if (method === "wechat") return { kind: "qr", titleKey: "credits.wechatScanPay", cancelOnClose: true } as const;
    return { kind: "iframe", titleKey: "credits.alipayScanPay", cancelOnClose: true } as const;
}

/** 托管支付直接在当前页跳转，避免异步下单后打开新窗口被浏览器拦截。 */
export function redirectHostedPayment(method: string, paymentUrl: string, navigate: (url: string) => void) {
    if (paymentPresentation(method).kind !== "hosted" || !paymentUrl) return false;
    navigate(paymentUrl);
    return true;
}
