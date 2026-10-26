import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { adminSupabase } from "@/lib/supabase";
import { verifySession } from "@/lib/session";

const allowedStatuses = [
  "new",
  "contacted",
  "confirmed",
  "shipping",
  "completed",
  "cancelled",
] as const;

async function isAdmin() {
  const cookieStore = await cookies();

  const session = cookieStore.get(
    "forma3d_admin_session"
  )?.value;

  return verifySession(session);
}

function formatOrderNumber(orderNumber: number) {
  return `F3D-${String(orderNumber).padStart(
    6,
    "0"
  )}`;
}

/*
 * Admin panel uchun barcha buyurtmalarni olish
 */
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json(
      {
        error: "Ruxsat yo‘q",
      },
      {
        status: 401,
      }
    );
  }

  try {
    const { data, error } = await adminSupabase()
      .from("orders")
      .select(`
        id,
        order_number,
        customer_name,
        phone,
        region,
        district,
        address,
        customer_note,
        total_amount,
        status,
        created_at,
        updated_at,
        items:order_items (
          id,
          product_id,
          product_name,
          product_slug,
          size_label,
          color_name,
          image_url,
          price,
          quantity,
          subtotal
        )
      `)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 500,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const orders = (data || []).map((order) => ({
      ...order,

      formatted_order_number:
        formatOrderNumber(
          Number(order.order_number)
        ),

      items: Array.isArray(order.items)
        ? order.items
        : [],
    }));

    return NextResponse.json(orders, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Buyurtmalarni yuklab bo‘lmadi",
      },
      {
        status: 500,
      }
    );
  }
}

/*
 * Buyurtma holatini o‘zgartirish
 */
export async function PUT(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json(
      {
        error: "Ruxsat yo‘q",
      },
      {
        status: 401,
      }
    );
  }

  try {
    const body = await request.json();

    const id = String(body.id || "").trim();
    const status = String(
      body.status || ""
    ).trim();

    if (!id) {
      return NextResponse.json(
        {
          error: "Buyurtma ID topilmadi",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !allowedStatuses.includes(
        status as (typeof allowedStatuses)[number]
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Buyurtma holati noto‘g‘ri",
        },
        {
          status: 400,
        }
      );
    }

    const { data, error } = await adminSupabase()
      .from("orders")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(`
        id,
        order_number,
        customer_name,
        phone,
        region,
        district,
        address,
        customer_note,
        total_amount,
        status,
        created_at,
        updated_at
      `)
      .single();

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      ...data,

      formatted_order_number:
        formatOrderNumber(
          Number(data.order_number)
        ),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Buyurtma holatini o‘zgartirib bo‘lmadi",
      },
      {
        status: 500,
      }
    );
  }
}