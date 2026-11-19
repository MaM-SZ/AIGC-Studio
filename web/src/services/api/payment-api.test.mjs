import assert from "node:assert/strict";
import { test } from "node:test";
import { useTeamStore } from "../../features/team/stores/use-team-store.ts";
import { createCreditPurchaseOrder, getCreditPurchaseOrderStatus, listCreditProducts, listCreditPaymentMethods } from "./server.ts";

test("平台积分支付请求不携带团队请求头", async () => {
    const previousFetch = globalThis.fetch;
    const previousTeam = useTeamStore.getState();
    const requests = [];
    useTeamStore.setState({ ...previousTeam, team: { id: 101, teamSlug: "team1", name: "测试团队", logoUrl: "", enabled: true }, ready: true });
    globalThis.fetch = async (input, options) => {
        const headers = new Headers(options?.headers);
        requests.push({ path: new URL(String(input)).pathname, teamId: headers.get("X-Team-Id"), body: options?.body ? JSON.parse(options.body) : null });
        const path = new URL(String(input)).pathname;
        const data = path.endsWith("listProducts")
            ? { products: [] }
            : path.endsWith("createOrder")
              ? { orderNo: "order-1", paymentMethod: "alipay", status: "pending", paymentUrl: "" }
              : { orderNo: "order-1", credits: "10", priceAmount: "1.00", paymentMethod: "alipay", status: "pending", paidAt: null };
        return new Response(JSON.stringify({ code: 0, data, msg: "成功" }), { headers: { "Content-Type": "application/json" } });
    };
    try {
        await listCreditPaymentMethods();
        await listCreditProducts();
        await createCreditPurchaseOrder({ productId: 1, paymentMethod: "alipay" });
        await createCreditPurchaseOrder({ productId: 1, paymentMethod: "wechat" });
        await createCreditPurchaseOrder({ productId: 1, paymentMethod: "waffo" });
        await getCreditPurchaseOrderStatus("order-1");
        assert.deepEqual(
            requests.map((request) => request.teamId),
            [null, null, null, null, null, null],
        );
        assert.deepEqual(requests[3].body, { productId: 1, paymentMethod: "wechat" });
        assert.deepEqual(requests[4].body, { productId: 1, paymentMethod: "waffo" });
        assert.equal(requests[0].path.endsWith("/listPaymentMethods"), true);
    } finally {
        globalThis.fetch = previousFetch;
        useTeamStore.setState(previousTeam);
    }
});
