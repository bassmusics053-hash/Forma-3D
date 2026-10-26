import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminSupabase } from "@/lib/supabase";
import { verifySession } from "@/lib/session";

export const dynamic = "force-dynamic";

async function authorized() {
  return Boolean(await verifySession((await cookies()).get("forma3d_admin_session")?.value));
}
function fail(error: unknown, status = 500) {
  const msg = error instanceof Error ? error.message :
    (error && typeof error === "object" && "message" in error)
      ? String((error as {message:unknown}).message) : String(error);
  const isConflict = /duplicate key|unique constraint|23505/i.test(msg);
  return NextResponse.json({ error: isConflict ? "SKU, slug, o‘lcham yoki rang nomi takrorlangan. O‘zgartirib qayta saqlang." : msg }, { status: isConflict ? 409 : status });
}
function clean(value: unknown, max = 300) { return String(value ?? "").trim().slice(0, max); }
function slugify(value: string) {
  return value.toLowerCase().replace(/[ʻ’‘`']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 150);
}
function validUUID(value: string) { return /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(value); }

export async function GET() {
  if (!(await authorized())) return NextResponse.json({ error: "Ruxsat yo‘q" }, { status: 401 });
  try {
    const { data, error } = await adminSupabase().from("products")
      .select("*, category:categories(id,name,slug), sizes:product_sizes(id,label,price,sort_order), colors:product_colors(id,name,hex_code,swatch_colors,available,sort_order)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json((data || []).map(p => ({
      ...p,
      sizes: [...(p.sizes || [])].sort((a, b) => a.sort_order - b.sort_order),
      colors: [...(p.colors || [])].sort((a, b) => a.sort_order - b.sort_order),
    })), { headers: { "Cache-Control": "no-store" } });
  } catch(e) { return fail(e); }
}

async function save(request: Request, update: boolean) {
  if (!(await authorized())) return NextResponse.json({ error: "Ruxsat yo‘q" }, { status: 401 });
  try {
    const body = await request.json();
    const name = clean(body.name, 150);
    const slug = slugify(clean(body.slug || name, 160));
    const sku = clean(body.sku, 64).toUpperCase();
    const category_id = clean(body.category_id, 40);
    if (name.length < 2 || !slug || !/^[A-Z0-9][A-Z0-9_-]{1,63}$/.test(sku)) {
      return fail("Mahsulot nomi, SKU yoki slug noto‘g‘ri. SKU majburiy.", 400);
    }
    if (!validUUID(category_id)) return fail("Kategoriyani tanlang", 400);
    if (update && !validUUID(String(body.id || ""))) return fail("Mahsulot ID noto‘g‘ri", 400);
    if (!Array.isArray(body.sizes) || !body.sizes.length || body.sizes.length > 30) return fail("Kamida bitta o‘lcham kiriting", 400);
    if (!Array.isArray(body.colors) || !body.colors.length || body.colors.length > 40) return fail("Kamida bitta rang kombinatsiyasi kiriting", 400);
    const sizeNames = new Set<string>();
    const sizes = body.sizes.map((s: any) => {
      const label = clean(s.label, 60);
      const price = Number(s.price);
      if (!label || !Number.isSafeInteger(price) || price <= 0) throw new Error("Har bir o‘lchamga musbat butun narx kiriting");
      if (sizeNames.has(label.toLowerCase())) throw new Error("O‘lcham nomi takrorlangan");
      sizeNames.add(label.toLowerCase());
      return { id: validUUID(String(s.id || "")) ? s.id : null, label, price };
    });
    const colorNames = new Set<string>();
    const colors = body.colors.map((c: any) => {
      const name = clean(c.name, 100);
      const swatch_colors = Array.isArray(c.swatch_colors) ? c.swatch_colors : [c.hex_code];
      if (!name || swatch_colors.length < 1 || swatch_colors.length > 3 || !swatch_colors.every((hex: unknown) => /^#[0-9a-fA-F]{6}$/.test(String(hex)))) throw new Error("Rang kombinatsiyasi nomi yoki rangi noto‘g‘ri");
      if (colorNames.has(name.toLowerCase())) throw new Error("Rang kombinatsiyasi takrorlangan");
      colorNames.add(name.toLowerCase());
      return { id: validUUID(String(c.id || "")) ? c.id : null, name, swatch_colors, available: c.available !== false };
    });
    const product = {
      ...(update ? { id: body.id } : {}), name, slug, sku, category_id,
      description: clean(body.description, 10000),
      image_url: clean(body.image_url, 1000),
      images: Array.isArray(body.images) ? body.images.map((x: unknown) => clean(x, 1000)).filter(Boolean).slice(0, 6) : [],
      active: body.active !== false,
    };
    const { data: id, error } = await adminSupabase().rpc("forma_save_product", {
      p_product: product, p_sizes: sizes, p_colors: colors,
    });
    if (error) throw error;
    return NextResponse.json({ ok: true, id }, { status: update ? 200 : 201 });
  } catch (e) { return fail(e, 400); }
}
export async function POST(request: Request) { return save(request, false); }
export async function PUT(request: Request) { return save(request, true); }
export async function DELETE(request: Request) {
  if (!(await authorized())) return NextResponse.json({ error: "Ruxsat yo‘q" }, { status: 401 });
  try {
    const id = new URL(request.url).searchParams.get("id") || "";
    if (!validUUID(id)) return fail("Mahsulot ID noto‘g‘ri", 400);
    const { error } = await adminSupabase().from("products").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch(e) { return fail(e); }
}
