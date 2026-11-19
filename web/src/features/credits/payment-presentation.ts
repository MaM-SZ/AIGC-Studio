/** 托管收银台关闭弹窗时保留订单，二维码渠道沿用主动取消流程。 */
export function paymentPresentation(method: string) {
    if (method === "waffo") return { kind: "hosted", titleKey: "credits.waffoCheckout", cancelOnClose: false } as const;
    if (method === "wechat") return { kind: "qr", titleKey: "credits.wechatScanPay", cancelOnClose: true } as const;
    return { kind: "iframe", titleKey: "credits.alipayScanPay", cancelOnClose: true } as const;
}
