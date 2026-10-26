import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { adminSupabase } from "@/lib/supabase";
import { verifySession } from "@/lib/session";

async function isAdmin() {
  const cookieStore = await cookies();
  const session = cookieStore.get("forma3d_admin_session")?.value;

  return verifySession(session);
}

function createSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/ʻ|’|'/g, "")
    .replace(/[^a-z0-9а-яё]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

function prepareBrand(body: Record<string, unknown>) {
  const name = String(body.name || "").trim();
  const enteredSlug = String(body.slug || "").trim();

  return {
    name,
    slug: createSlug(enteredSlug || name),
    image_url: body.image_url
      ? String(body.image_url).trim()
      : null,
    description: String(body.description || "").trim(),
    active:
      body.active === true ||
      body.active === "true" ||
      body.active === "on",
  };
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json(
      { error: "Ruxsat yo‘q" },
      { status: 401 }
    );
  }

  const { data, error } = await adminSupabase()
    .from("brands")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(data || []);
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json(
      { error: "Ruxsat yo‘q" },
      { status: 401 }
    );
  }

  const body = await request.json();
  const brand = prepareBrand(body);

  if (!brand.name) {
    return NextResponse.json(
      { error: "Brend nomini kiriting" },
      { status: 400 }
    );
  }

  if (!brand.slug) {
    return NextResponse.json(
      { error: "Slug yaratib bo‘lmadi. Slugni lotin harflarida kiriting." },
      { status: 400 }
    );
  }

  // Shu slug oldin yaratilganligini tekshiramiz
  const { data: existingBrand, error: findError } =
    await adminSupabase()
      .from("brands")
      .select("id")
      .eq("slug", brand.slug)
      .maybeSingle();

  if (findError) {
    return NextResponse.json(
      { error: findError.message },
      { status: 500 }
    );
  }

  // Mavjud bo‘lsa, yangi nusxa yaratmaymiz — mavjudini yangilaymiz
  if (existingBrand) {
    const { data, error } = await adminSupabase()
      .from("brands")
      .update(brand)
      .eq("id", existingBrand.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  }

  const { data, error } = await adminSupabase()
    .from("brands")
    .insert(brand)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      {
        error:
          error.code === "23505"
            ? "Bunday nom yoki slug bilan brend avval yaratilgan"
            : error.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

export async function PUT(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json(
      { error: "Ruxsat yo‘q" },
      { status: 401 }
    );
  }

  const body = await request.json();
  const id = String(body.id || "");
  const brand = prepareBrand(body);

  if (!id) {
    return NextResponse.json(
      { error: "Brend ID topilmadi" },
      { status: 400 }
    );
  }

  if (!brand.name) {
    return NextResponse.json(
      { error: "Brend nomini kiriting" },
      { status: 400 }
    );
  }

  const { data, error } = await adminSupabase()
    .from("brands")
    .update(brand)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      {
        error:
          error.code === "23505"
            ? "Bunday nom yoki slug boshqa brendda mavjud"
            : error.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json(
      { error: "Ruxsat yo‘q" },
      { status: 401 }
    );
  }

  const id = new URL(request.url).searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Brend ID topilmadi" },
      { status: 400 }
    );
  }

  const { error } = await adminSupabase()
    .from("brands")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}