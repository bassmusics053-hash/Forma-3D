import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminSupabase } from "@/lib/supabase";
import { verifySession } from "@/lib/session";

export const dynamic = "force-dynamic";

type Data = Record<string, unknown>;

async function authorized() {
  return Boolean(await verifySession((await cookies()).get("forma3d_admin_session")?.value));
}

function responseError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

function serverError(error: unknown) {
  const e = error as { code?: string; message?: string } | null;
  if (e?.code === "42P01") {
    return responseError("Production jadvali hali yaratilmagan. Supabase SQL Editor'da supabase/production-profiles.sql ni ishga tushiring.", 503);
  }
  // SQL ichki tafsilotlarini API javobida oshkor qilmaymiz.
  console.error("Production API error", e?.code || error);
  return responseError("Ishlab chiqarish ma'lumotlarini saqlash yoki o‘qishda xatolik.", 500);
}

function clean(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

function uuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function numberInRange(value: unknown, min: number, max: number, integer = false) {
  if (value === "" || value === null || value === undefined || typeof value === "boolean") return null;
  const num = Number(value);
  return Number.isFinite(num) && num >= min && num <= max && (!integer || Number.isInteger(num)) ? num : null;
}

function validate(body: Data) {
  const model_name = clean(body.model_name, 150);
  const variant_label = clean(body.variant_label, 100) || "Standart";
  const printer_name = clean(body.printer_name, 100);
  const material_type = clean(body.material_type, 15).toLowerCase();
  const material_name = clean(body.material_name, 100);
  const notes = clean(body.notes, 3000);
  const product_id = body.product_id === null || body.product_id === "" || body.product_id === undefined ? null : body.product_id;
  const material_grams = numberInRange(body.material_grams, 0.01, 100000);
  const print_minutes = numberInRange(body.print_minutes, 1, 525600, true);
  const king_diameter_mm = numberInRange(body.king_diameter_mm, 0.01, 10000);
  const king_height_mm = numberInRange(body.king_height_mm, 0.01, 10000);
  const pawn_diameter_mm = numberInRange(body.pawn_diameter_mm, 0.01, 10000);
  const pawn_height_mm = numberInRange(body.pawn_height_mm, 0.01, 10000);
  const source_url = String(body.source_url ?? "").trim();
  if (source_url) {
    try {
      const url = new URL(source_url);
      if (source_url.length > 2048 || !["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error();
    } catch { return { error: "Model manbasi uchun to‘g‘ri HTTP yoki HTTPS havolasini kiriting." }; }
  }
  const fill_percent = body.fill_percent === "" || body.fill_percent === null || body.fill_percent === undefined
    ? null : numberInRange(body.fill_percent, 1, 100, true);
  const allowed = ["resin", "pla", "petg", "abs", "tpu", "other"];
  if (model_name.length < 2 || !allowed.includes(material_type) ||
    (product_id !== null && !uuid(product_id)) ||
    [material_grams, print_minutes, king_diameter_mm, king_height_mm, pawn_diameter_mm, pawn_height_mm].some(value => value === null) ||
    (body.fill_percent !== "" && body.fill_percent !== null && body.fill_percent !== undefined && fill_percent === null)) {
    return { error: "Model nomi, material turi, o‘lcham, sarf yoki print vaqtini tekshiring." };
  }
  return {
    data: { model_name, variant_label, printer_name, material_type, material_name,
      material_grams, print_minutes, king_diameter_mm, king_height_mm, pawn_diameter_mm, pawn_height_mm, source_url, fill_percent, notes,
      product_id: product_id as string | null },
  };
}

export async function GET() {
  if (!(await authorized())) return responseError("Ruxsat yo‘q", 401);
  try {
    const { data, error } = await adminSupabase().from("production_profiles")
      .select("id,product_id,model_name,variant_label,printer_name,material_type,material_name,material_grams,print_minutes,king_diameter_mm,king_height_mm,pawn_diameter_mm,pawn_height_mm,source_url,fill_percent,notes,created_at,updated_at")
      .order("updated_at", { ascending: false }).limit(2000);
    if (error) throw error;
    return NextResponse.json(data || [], { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return serverError(error); }
}

async function save(request: Request, isUpdate: boolean) {
  if (!(await authorized())) return responseError("Ruxsat yo‘q", 401);
  let body: Data;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return responseError("Noto‘g‘ri ma'lumot", 400);
    body = parsed as Data;
  } catch { return responseError("JSON noto‘g‘ri", 400); }
  const validated = validate(body);
  if ("error" in validated) return responseError(validated.error!, 400);
  if (isUpdate && !uuid(body.id)) return responseError("Profil ID noto‘g‘ri", 400);
  try {
    const db = adminSupabase().from("production_profiles");
    const result = isUpdate
      ? await db.update(validated.data!).eq("id", body.id).select("id").single()
      : await db.insert(validated.data!).select("id").single();
    if (result.error) throw result.error;
    return NextResponse.json({ ok: true, id: result.data.id }, { status: isUpdate ? 200 : 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return serverError(error); }
}
export async function POST(request: Request) { return save(request, false); }
export async function PUT(request: Request) { return save(request, true); }

export async function DELETE(request: Request) {
  if (!(await authorized())) return responseError("Ruxsat yo‘q", 401);
  const id = new URL(request.url).searchParams.get("id");
  if (!uuid(id)) return responseError("Profil ID noto‘g‘ri", 400);
  try {
    const { data, error } = await adminSupabase().from("production_profiles").delete().eq("id", id).select("id").maybeSingle();
    if (error) throw error;
    if (!data) return responseError("Profil topilmadi", 404);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return serverError(error); }
}
