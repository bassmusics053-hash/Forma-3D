import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const productId = String(body.product_id || "").trim();
    const eventType = String(body.event_type || "").trim();
    const visitorId = String(body.visitor_id || "").trim();

    if (!productId) {
      return NextResponse.json(
        { error: "Product ID not found" },
        { status: 400 }
      );
    }

    if (eventType !== "view" && eventType !== "buy_now" && eventType !== "add_to_cart") {
      return NextResponse.json(
        { error: "Invalid event type" },
        { status: 400 }
      );
    }

    if (!visitorId || visitorId.length > 100) {
      return NextResponse.json(
        { error: "Invalid visitor ID" },
        { status: 400 }
      );
    }

    const supabase = adminSupabase();

    const { error } = await supabase
      .from("product_events")
      .insert({
        product_id: productId,
        event_type: eventType,
        visitor_id: visitorId,
      });

    if (error && error.code !== "23505") {
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Product event error:", error);

    return NextResponse.json(
      { error: "Failed to save product event" },
      { status: 500 }
    );
  }
}