export type ProductEventType =
  | "view"
  | "buy_now"
  | "add_to_cart";

const VISITOR_KEY = "forma3d-visitor-id-v1";

let temporaryVisitorId = "";

function createVisitorId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function getVisitorId(): string {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    const savedId =
      window.localStorage.getItem(VISITOR_KEY);

    if (savedId) {
      return savedId;
    }

    const newId = createVisitorId();

    window.localStorage.setItem(
      VISITOR_KEY,
      newId
    );

    return newId;
  } catch {
    if (!temporaryVisitorId) {
      temporaryVisitorId = createVisitorId();
    }

    return temporaryVisitorId;
  }
}

export function trackProductEvent(
  productId: string,
  eventType: ProductEventType
): void {
  if (typeof window === "undefined" || !productId) {
    return;
  }

  const visitorId = getVisitorId();

  if (!visitorId) {
    return;
  }

  void fetch("/api/product-events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      product_id: productId,
      event_type: eventType,
      visitor_id: visitorId,
    }),
    keepalive: true,
  }).catch(() => {
    /*
     * Statistika xatosi sayt ishlashiga
     * xalaqit bermasligi kerak.
     */
  });
}