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
    .trim()
    .toLowerCase()
    .replace(/[ʻ’‘`']/g, "")
    .replace(/o‘/g, "o")
    .replace(/g‘/g, "g")
    .replace(/[^a-z0-9а-яё]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

function toBoolean(value: unknown, defaultValue = false) {
  if (value === undefined || value === null) {
    return defaultValue;
  }

  return (
    value === true ||
    value === "true" ||
    value === "on" ||
    value === "1"
  );
}

function getCategoryData(body: Record<string, unknown>) {
  const name = String(body.name || "").trim();
  const parentId = String(body.parent_id || "").trim() || null;

  return {
    name,
    slug: createSlug(String(body.slug || name)),
    image_url: String(body.image_url || "").trim() || null,
    description: String(body.description || "").trim() || null,
    parent_id: parentId,

    // Ichki kategoriya bosh sahifada ko‘rsatilmaydi
    show_on_home: parentId
      ? false
      : toBoolean(body.show_on_home, true),

    sort_order: Number(body.sort_order || 0),
    active: toBoolean(body.active, true),
  };
}

function categoryError(error: {
  code?: string;
  message?: string;
}) {
  if (error.code === "23505") {
    return NextResponse.json(
      {
        error:
          "Bunday nom yoki slug bilan kategoriya allaqachon mavjud",
      },
      { status: 409 }
    );
  }

  if (error.code === "23503") {
    return NextResponse.json(
      {
        error:
          "Tanlangan ota kategoriya topilmadi",
      },
      { status: 400 }
    );
  }

  return NextResponse.json(
    {
      error: error.message || "Kategoriyalar API xatosi",
    },
    { status: 500 }
  );
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json(
      { error: "Ruxsat yo‘q" },
      { status: 401 }
    );
  }

  const { data, error } = await adminSupabase()
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    return categoryError(error);
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

  try {
    const body = await request.json();
    const category = getCategoryData(body);

    if (!category.name) {
      return NextResponse.json(
        { error: "Kategoriya nomini kiriting" },
        { status: 400 }
      );
    }

    if (!category.slug) {
      return NextResponse.json(
        { error: "Kategoriya slugini kiriting" },
        { status: 400 }
      );
    }

    const { data, error } = await adminSupabase()
      .from("categories")
      .insert(category)
      .select()
      .single();

    if (error) {
      return categoryError(error);
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Yuborilgan ma’lumot noto‘g‘ri" },
      { status: 400 }
    );
  }
}

export async function PUT(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json(
      { error: "Ruxsat yo‘q" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const id = String(body.id || "").trim();

    if (!id) {
      return NextResponse.json(
        { error: "Kategoriya ID topilmadi" },
        { status: 400 }
      );
    }

    const category = getCategoryData(body);

    if (!category.name) {
      return NextResponse.json(
        { error: "Kategoriya nomini kiriting" },
        { status: 400 }
      );
    }

    if (category.parent_id === id) {
      return NextResponse.json(
        {
          error:
            "Kategoriya o‘zini o‘zi ota kategoriya sifatida tanlay olmaydi",
        },
        { status: 400 }
      );
    }

    const { data, error } = await adminSupabase()
      .from("categories")
      .update(category)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return categoryError(error);
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Yuborilgan ma’lumot noto‘g‘ri" },
      { status: 400 }
    );
  }
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
      { error: "Kategoriya ID topilmadi" },
      { status: 400 }
    );
  }

  const supabase = adminSupabase();

  // Kategoriyaga biriktirilgan mahsulot borligini tekshiramiz
  const { count, error: countError } = await supabase
    .from("products")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("category_id", id);

  if (countError) {
    return categoryError(countError);
  }

  if ((count || 0) > 0) {
    return NextResponse.json(
      {
        error:
          "Bu kategoriyada mahsulotlar mavjud. Avval mahsulotlarni boshqa kategoriyaga o‘tkazing",
      },
      { status: 409 }
    );
  }

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id);

  if (error) {
    return categoryError(error);
  }

  return NextResponse.json({
    ok: true,
    message: "Kategoriya o‘chirildi",
  });
}