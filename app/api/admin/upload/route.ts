import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";

import { adminSupabase } from "@/lib/supabase";
import { verifySession } from "@/lib/session";

export const runtime = "nodejs";

const BUCKET_NAME = "product-images";

async function isAdmin() {
  const cookieStore = await cookies();
  const session = cookieStore.get("forma3d_admin_session")?.value;

  return verifySession(session);
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json(
      { error: "Ruxsat yo‘q" },
      { status: 401 }
    );
  }

  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files.length) {
      return NextResponse.json(
        { error: "Rasm tanlanmagan" },
        { status: 400 }
      );
    }

    const supabase = adminSupabase();

    // Bucket mavjud bo‘lmasa avtomatik yaratadi
    const { data: buckets } = await supabase.storage.listBuckets();

    const bucketExists = buckets?.some(
      (bucket) => bucket.name === BUCKET_NAME
    );

    if (!bucketExists) {
      const { error: bucketError } =
        await supabase.storage.createBucket(BUCKET_NAME, {
          public: true,
          fileSizeLimit: 10 * 1024 * 1024,
          allowedMimeTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
          ],
        });

      if (bucketError) {
        throw new Error(bucketError.message);
      }
    }

    const uploadedUrls: string[] = [];

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        throw new Error(`${file.name} rasm fayli emas`);
      }

      if (file.size > 10 * 1024 * 1024) {
        throw new Error(`${file.name} hajmi 10 MB dan katta`);
      }

      const extension =
        file.name.split(".").pop()?.toLowerCase() || "jpg";

      const fileName = `${Date.now()}-${randomUUID()}.${extension}`;
      const filePath = `products/${fileName}`;

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, buffer, {
          contentType: file.type,
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { data } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

      uploadedUrls.push(data.publicUrl);
    }

    return NextResponse.json({
      success: true,
      urls: uploadedUrls,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Rasm yuklashda xatolik",
      },
      { status: 500 }
    );
  }
}
