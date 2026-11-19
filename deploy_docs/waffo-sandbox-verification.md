# Waffo 测试环境联调记录

2026-11-19，本机使用 Java REST 实现完成 Waffo 沙箱支付联调，未使用真实资金。

## 配置与启动

- 商户：`MER_7ZG47pOrbDudyWWsaZrZc3`；店铺：`STO_5cUeUQpnJ0LHsc8LmUrgpJ`（Dream Builder Studio）。
- 本次创建的独立测试产品：`PROD_3V5miMPZVeQnOTlulATLqp`，CNY 一次性积分充值，未发布生产版本。
- `.env` 已配置 `WAFFO_ENABLED=true`、商户、私钥、店铺、产品、`WAFFO_ENVIRONMENT=test`、测试平台回调公钥和 HTTPS 回跳地址；文件权限为 `0600`，Git 忽略。
- 测试回调公钥来源：官方 `@waffo/pancake-ts` 0.28.0 内置 `TEST_PUBLIC_KEY`。SDK 未引入项目依赖。
- `.env.waffo-test` 为本地隔离配置，包含数据库、Redis、测试管理员凭据、回调 ID/URL，Git 忽略。不要输出该文件或 `docker compose config` 的完整展开内容。
- PostgreSQL：`novanova-waffo-test-postgres`，仅 `127.0.0.1:15432`；数据库 `novanova_waffo_test`，83 项社区版迁移已执行，当前版本 V84。
- Redis：`novanova-waffo-test-redis`，仅 `127.0.0.1:16379`。
- Java 后端：`http://127.0.0.1:18080`；前端：`http://127.0.0.1:15555`（AIGC-Studio/web 源码）。
- 临时 ngrok HTTPS 入口指向前端 15555，前端 `/api/v1/**` 代理到 18080。测试 Webhook 仅订阅 `order.completed`，`testMode=true`。

`.env.waffo-test` 的变量必须覆盖 `.env` 后再启动 Java。可从项目根目录执行：

```bash
python3 - <<'PY'
import os, subprocess
from pathlib import Path
sandbox_env = os.environ.copy()
for name in ('.env', '.env.waffo-test'):
    sandbox_env.update(line.split('=', 1) for line in Path(name).read_text().splitlines()
                       if '=' in line and not line.lstrip().startswith('#'))
subprocess.run(['mvn', '-f', 'server/pom.xml', 'spring-boot:run'], env=sandbox_env, check=True)
PY
```

本机无全局 Java/Maven 时使用已安装的 JDK 和 Maven 路径。前端以 `NEXT_PUBLIC_SERVER_URL=http://127.0.0.1:18080` 启动，端口 15555。

ngrok 地址是临时地址，隧道退出后失效。重开时更新 `.env` 中的 `WAFFO_SUCCESS_URL` 和现有测试 Webhook 的 URL；不要重复注册 Webhook。Webhook ID 保存在 `.env.waffo-test`。本次隧道和隔离服务保留运行，便于继续联调。

## 实测结果

| 场景 | 证据与结果 |
| --- | --- |
| 商户鉴权与店铺读取 | Waffo REST GraphQL 返回指定 active 店铺 |
| Java REST 下单 | 本地商品 20 积分、CNY 2.00；Waffo 收银台同价且显示测试模式 |
| 支付成功 | CNY 实际展示微信沙箱模拟器，点击模拟成功；渠道订单 `ORD_0xNP41Kz4fuIaMVVsyEO3h` |
| 真实签名回调 | 公网 `/api/v1/payment/waffo/notify` 返回 HTTP 200，本地订单 `6d21ff19203442a491b3e56242d3910d` 为 paid |
| 积分到账 | 初始余额 100 → 120，新增一条 `credit_purchase` 流水，金额 20；未启用首充赠送 |
| 重复通知 | 原始签名回调重放返回 200；余额仍为 120，购买流水仍只有一条 |
| 正文篡改 | 修改内部空白、末尾空白或金额，均返回 HTTP 500，未增加积分 |
| 缺失签名 | 公网请求被拒绝，HTTP 500 |
| 支付失败 | 第二笔 CNY 2.00 订单 `11d3d9793d714dc4984bc1149a797115` 使用模拟失败；渠道 payment 状态 failed、本地 pending、未增加积分 |
| 恢复付款 | 同一新订单重新获取支付链接，复用原 Waffo checkout URL |
| 前端 | 测试账号显示 120 余额、Waffo 入口和托管收银台链接；关闭弹窗保留订单 |
| 回归测试 | 55 项后端支付相关测试通过，涵盖 Waffo、积分结算、支付宝和微信 |

微信沙箱失败不等于订单被渠道取消，因此本地保留 pending，仍可按渠道实际状态处理；没有伪造关闭或到账。此次未测试银行卡通道，不能宣称卡支付已验收。

## 联调修正

应用全局 Fastjson2 解码器会把 `@RequestBody String` 的 JSON 重新序列化。最初只使用默认编解码器的控制器测试未覆盖此行为。现在控制器直接读取最多 256 KiB 的原始请求字节并释放缓冲区，绕过 JSON 解码器；回归测试注册实际应用解码器，先复现失败再验证修正。真实 HTTP 重放确认任何正文变化都无法通过验签。

本地截图保存在被 Git 忽略的 `artifacts/waffo-sandbox/`，服务日志保存在 `/tmp/waffo-local-server-fixed.log` 和 `/tmp/waffo-test-web.log`。截图和记录不含私钥。生产密钥、生产 Webhook 与生产钱包未改动。
