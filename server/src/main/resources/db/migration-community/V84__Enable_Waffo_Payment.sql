-- Waffo 沿用平台积分订单和幂等结算约束，商品金额保持 CNY。
ALTER TABLE credit_purchase_orders DROP CONSTRAINT ck_credit_purchase_orders_payment_method;
ALTER TABLE credit_purchase_orders ADD CONSTRAINT ck_credit_purchase_orders_payment_method
    CHECK (payment_method IN ('alipay', 'wechat', 'waffo'));
CREATE INDEX idx_credit_purchase_orders_waffo_pending ON credit_purchase_orders(id)
    WHERE status = 'pending' AND payment_method = 'waffo' AND wallet_team_id = 0;
COMMENT ON COLUMN credit_purchase_orders.payment_method IS '支付方式：alipay支付宝、wechat微信Native、waffo托管收银台';
