import { NextResponse } from "next/server";

import { publicSupabase } from "@/lib/supabase";
import { demoMode, demoBrands } from "@/lib/demo-catalog";

export async function GET() {
  if (demoMode) return NextResponse.json(demoBrands);
  try {
    const { data, error } = await publicSupabase()
      .from("brands")
      .select(`
        id,
        name,
        slug,
        image_url,
        description,
        active,
        created_at
      `)
      .eq("active", true)
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
      status: 200,
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
            : "Brendlarni yuklab bo‘lmadi",
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