import { NextResponse } from "next/server";
import { publicSupabase } from "@/lib/supabase";
import { demoMode, demoProducts } from "@/lib/demo-catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  if (demoMode) return NextResponse.json(demoProducts, { headers: { "X-Forma-Demo": "1" } });
  try {
    const { data, error } = await publicSupabase().from("products")
      .select("id,name,slug,sku,price,old_price,image_url,description,active,category:categories(id,name,slug), sizes:product_sizes(id,label,price,sort_order), colors:product_colors(id,name,hex_code,swatch_colors,available,sort_order)")
      .eq("active", true).order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json((data || []).map(p => ({
      ...p,
      sizes: [...(p.sizes || [])].sort((a,b) => a.sort_order - b.sort_order),
      colors: [...(p.colors || [])].sort((a,b) => a.sort_order - b.sort_order),
    })), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Katalogni yuklab bo‘lmadi" }, { status: 500 });
  }
}
