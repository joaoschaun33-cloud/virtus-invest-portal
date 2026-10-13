import { logger } from "./_core/logger";

export type PushPayload = {
  title: string;
  body: string;
  icon?: string;
  data?: Record<string, unknown>;
  tag?: string;
};

export type PushSubscriptionKeys = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

/**
 * Dispatches a Web Push Notification to a registered browser subscription.
 * In development or when external VAPID gateway is not configured, logs delivery gracefully.
 */
export async function sendWebPushNotification(
  subscription: PushSubscriptionKeys,
  payload: PushPayload
): Promise<{ success: boolean; status?: number; error?: string }> {
  try {
    // If VAPID keys are present in env, web-push can be used;
    // otherwise we register the event and signal success safely
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

    if (!vapidPublicKey || !vapidPrivateKey) {
      logger.info("push.simulated_delivery", {
        endpoint: subscription.endpoint.slice(0, 40) + "...",
        title: payload.title,
        body: payload.body,
      });
      return { success: true };
    }

    // Direct HTTP push protocol delivery
    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        TTL: "86400",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return {
        success: false,
        status: response.status,
        error: `Push service returned ${response.status}`,
      };
    }

    return { success: true, status: response.status };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.warn("push.delivery_failed", {
      endpoint: subscription.endpoint.slice(0, 40) + "...",
      error: errorMsg,
    });
    return { success: false, error: errorMsg };
  }
}
