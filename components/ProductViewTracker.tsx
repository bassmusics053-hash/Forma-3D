"use client";

import { useEffect } from "react";

import { trackProductEvent } from "@/lib/product-analytics";

type ProductViewTrackerProps = {
  productId: string;
};

export default function ProductViewTracker({
  productId,
}: ProductViewTrackerProps) {
  useEffect(() => {
    trackProductEvent(productId, "view");
  }, [productId]);

  return null;
}