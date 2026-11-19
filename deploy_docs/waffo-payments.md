# Waffo 积分充值接入

本次接入面向平台钱包的一次性积分充值，使用人民币 **CNY** 和现有商品价格。服务端以官方 REST 协议签名创建托管收银台；积分到账沿用订单抢占、钱包锁、余额流水和首充赠送的同一事务。前端同步回跳只展示订单状态，不发放积分。

## 商户设置

1. 在 Waffo Dashboard → API & Development 获取 **Merchant ID** 并创建测试 API Key，保管生成的 RSA 私钥。Merchant ID 不是 Store ID。
2. 选择目标商店，在其中创建一个支持 **CNY** 的一次性产品（建议税务分类 `saas`）。所有积分档位共享此产品；每次创建会话时，服务端用 `priceSnapshot.amount` 覆盖为本地订单价格，`taxIncluded: true`，禁用收银台优惠码。请勿使用订阅产品。
3. 在 Settings → Webhooks 获取**测试环境的平台 Webhook 公钥**。这是 Waffo 签名公钥，不是商户 API 公钥。TypeScript SDK 内置此公钥；Java REST 接入需显式配置。
4. 添加 HTTP Webhook，订阅 `order.completed`，测试环境选择 `testMode: true`。URL 为 `https://你的后端域名/api/v1/payment/waffo/notify`。反向代理必须原样转发正文和 `X-Waffo-Signature` 请求头。

## 服务端配置

在部署环境中设置以下配置，示例见仓库 `.env.example`；Docker Compose 已透传这些变量。

| 变量 | 用途 |
| --- | --- |
| `WAFFO_ENABLED=true` | 启用支付入口和后台核对 |
| `WAFFO_MERCHANT_ID` | 商户 ID |
| `WAFFO_PRIVATE_KEY` | 对应环境的商户 API RSA 私钥，PKCS#8 / PKCS#1 PEM，支持字面量 `\n` |
| `WAFFO_WEBHOOK_PUBLIC_KEY` | 对应环境的 Waffo 平台回调公钥，SPKI PEM，支持字面量 `\n` |
| `WAFFO_STORE_ID` | 已确认的目标商店 ID |
| `WAFFO_PRODUCT_ID` | 该店铺的一次性积分产品 ID，必须支持 CNY |
| `WAFFO_ENVIRONMENT=test` | 只允许 `test` 或 `prod`，默认 `test` |
| `WAFFO_SUCCESS_URL` | 前端积分购买页，如 `https://dreambuilder.art/credits/purchase`；必须为 HTTPS，不含查询参数或片段 |

Store ID 和 Product ID 是业务配置，亦可用 Spring 配置 `novanova.waffo.store-id` / `product-id` 提供。私钥不能发给前端、写进日志或提交仓库。服务端不会自动创建商店、发布产品或注册生产 Webhook。

启动后 Flyway 自动执行企业版 `V83__Enable_Waffo_Payment.sql` 或社区版 `V84__Enable_Waffo_Payment.sql`，扩展订单渠道约束并建立待支付扫描索引。两套脚本按当前版本对应目录执行，不能一起执行。

前端通过 `GET /api/v1/payment/credit/listPaymentMethods` 展示服务端启用的渠道。主站 `AIGC-Studio/web` 与独立部署前端 `dreambuilder-homepage` 均已接入，需要将后端和使用中的前端一起部署。

## 支付行为与边界

- 下单：`POST /api/v1/payment/credit/createOrder`，`paymentMethod: "waffo"`。金额、积分、赠送和订单有效期全部取服务端快照。
- 下单签名：`POST\nPATH\nUNIX_SECONDS\nBASE64(SHA256(rawBody))`，RSA-SHA256。环境由商户 API Key 决定，不能用请求头把测试 Key 变成生产 Key。
- 同一随机平台订单号对应固定 `X-Idempotency-Key`，15 分钟有效期内恢复付款不会创建第二个收银台。临期不足 60 秒时不重新签发；不自动重试创建请求。
- 支付窗口打开 Waffo 托管收银台，保持本地订单轮询。关闭本地弹窗只关闭展示，保留订单。
- 回调验证原始正文的 `t.rawBody` 签名，保留官方推荐 45 分钟窗口以兼容重试。验签通过后再检查环境、店铺、事件类型、付款状态、CNY、实收 `chargedAmount`、支付时间及本地订单金额。
- 回调成功完成持久化后返回 HTTP 200；验签、事务或超时失败返回非 2xx，让 Waffo 重试。重复成功通知由既有数据库订单抢占和支付渠道唯一约束防止重复入账，首充奖励仍在同一事务内。
- 每 30 秒按平台订单号调用 GraphQL 核对订单，使用 `orderMerchantExternalId` 和店铺定位。GraphQL `priceSnapshot` / `snapshotAmountDetails` 是**预期金额**，不是实收证明，因此不会仅凭 `completed` 和快照发放积分；到账以已验签 `order.completed` 的 `chargedAmount` 为准。回调丢失时需在 Dashboard 重投，不能用跳转参数或手工改订单状态补发。
- 商户 API 不支持直接取消一次性订单；官方取消接口需要客户会话凭证。这里不会伪造取消成功。只有查询到 Waffo `canceled` 才关闭本地订单；已过期但渠道无订单或仍在支付确认的订单保留 `pending`，禁止重签过期支付链接，后台继续核对。无渠道订单的放弃付款可能长期保留待支付，运营可结合控制台核对处理。
- 退款、拒付、订阅事件不发放积分；退款后的积分回收和订阅计费不在此次一次性充值范围内。

## 沙箱验收

1. 用测试商户私钥、测试平台公钥和测试产品配置独立测试环境，不复用生产钱包数据库。
2. 登录用户，选择 Waffo 并购买一个积分商品，核对收银台币种 CNY、含税金额和平台商品一致。
3. 在 Waffo 支持测试卡的支付方式中使用官方成功卡 `4576750000000110`；使用拒绝卡 `4576750000000220` 验证失败不会到账。支付方式取决于该商店的 CNY 渠道开通情况。
4. 确认 Dashboard 投递 `order.completed`，后端响应 200，平台余额和积分流水正确；首次购买的赠送只发一次。
5. 重投同一通知，余额不再增加；篡改正文、错误店铺/环境/公钥、币种或实收金额均不能入账。
6. 测试关闭收银台、刷新、从成功页返回、链接到期、回调处理失败及重试。原签名超过 45 分钟需由 Waffo 重新签名投递；不要关闭时间校验。

生产切换需使用生产 API Key、公钥、`WAFFO_ENVIRONMENT=prod`、生产 Webhook 和已发布的生产产品，并完成 Waffo 商店审核。代码默认不启用生产支付。

已于 2026-11-19 使用测试商户完成真实沙箱联调：REST 下单、CNY 微信沙箱模拟支付、真实签名回调、余额流水、重复回调与失败支付。凭据仅保存在被 Git 忽略的本机环境文件中。详情见 [联调记录](waffo-sandbox-verification.md)。

## 官方依据

- [文档索引](https://docs.waffo.ai/llms.txt)
- [完整文档](https://docs.waffo.ai/llms-full.txt)
- [请求认证](https://docs.waffo.ai/api-reference/authentication)
- [创建收银台](https://docs.waffo.ai/api-reference/endpoints/orders/create-checkout-session)
- [Webhook 签名、金额及重试](https://docs.waffo.ai/api-reference/webhooks)
- [GraphQL 订单和支付](https://docs.waffo.ai/api-reference/endpoints/graphql/orders-and-payments)
- [客户取消一次性订单](https://docs.waffo.ai/api-reference/endpoints/orders/cancel-onetime-order)
