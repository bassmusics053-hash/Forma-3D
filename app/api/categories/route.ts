import { NextResponse } from "next/server";

import { publicSupabase } from "@/lib/supabase";
import { demoMode, demoCategories } from "@/lib/demo-catalog";

export async function GET() {
  if (demoMode) return NextResponse.json(demoCategories);
  try {
    const { data, error } = await publicSupabase()
      .from("categories")
      .select(`
        id,
        name,
        slug,
        image_url,
        description,
        parent_id,
        show_on_home,
        sort_order,
        active,
        created_at
      `)
      .eq("active", true)
      .order("sort_order", {
        ascending: true,
      })
      .order("name", {
        ascending: true,
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

    return NextResponse.json(data || [], {
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
            : "Kategoriyalarni yuklab bo‘lmadi",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}