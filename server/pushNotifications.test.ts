import { describe, expect, it } from "vitest";
import { sendWebPushNotification } from "./pushNotifications";

describe("Web Push Notifications", () => {
  it("executa simulação resiliente quando VAPID não configurado", async () => {
    const result = await sendWebPushNotification(
      {
        endpoint: "https://fcm.googleapis.com/fcm/send/fake-subscription-endpoint",
        p256dh: "BMk6...fakeKey",
        auth: "fakeAuth123",
      },
      {
        title: "Alerta B3 · PETR4",
        body: "PETR4 cruzou R$ 40,00",
      }
    );

    expect(result.success).toBe(true);
  });
});
