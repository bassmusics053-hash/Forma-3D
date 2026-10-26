import { NextResponse } from "next/server";

import { adminSupabase } from "@/lib/supabase";
import {
  addMinutes,
  codesMatch,
  hashVerificationCode,
  isValidUuid,
  normalizePhone,
  VERIFIED_LIFETIME_MINUTES,
} from "@/lib/telegram-verification";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const verificationId = String(body.verification_id || "").trim();
    const code = String(body.code || "").trim();
    const phone = normalizePhone(body.phone);

    if (!isValidUuid(verificationId) || !/^\d{6}$/.test(code) || !phone) {
      return NextResponse.json(
        { error: "Tasdiqlash ma’lumotlari noto‘g‘ri" },
        { status: 400 }
      );
    }

    const supabase = adminSupabase();
    const { data, error } = await supabase
      .from("telegram_verifications")
      .select("id, phone, code_hash, status, attempts, expires_at")
      .eq("id", verificationId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return NextResponse.json(
        { error: "Tasdiqlash so‘rovi topilmadi" },
        { status: 404 }
      );
    }

    if (new Date(data.expires_at).getTime() <= Date.now()) {
      await supabase
        .from("telegram_verifications")
        .update({ status: "expired" })
        .eq("id", verificationId);

      return NextResponse.json(
        { error: "Kodning amal qilish vaqti tugadi. Yangi kod oling." },
        { status: 410 }
      );
    }

    if (data.phone !== phone) {
      return NextResponse.json(
        { error: "Telefon raqami o‘zgargan. Yangi kod oling." },
        { status: 409 }
      );
    }

    if (data.status === "verified") {
      return NextResponse.json({ ok: true, verified: true });
    }

    if (data.status !== "code_sent" || !data.code_hash) {
      return NextResponse.json(
        { error: "Avval Telegram botda Start tugmasini bosing." },
        { status: 409 }
      );
    }

    if (Number(data.attempts) >= 5) {
      return NextResponse.json(
        { error: "Urinishlar soni tugadi. Yangi kod oling." },
        { status: 429 }
      );
    }

    const actualHash = hashVerificationCode(verificationId, code);

    if (!codesMatch(actualHash, data.code_hash)) {
      await supabase
        .from("telegram_verifications")
        .update({ attempts: Number(data.attempts) + 1 })
        .eq("id", verificationId);

      return NextResponse.json(
        { error: "Tasdiqlash kodi noto‘g‘ri" },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase
      .from("telegram_verifications")
      .update({
        status: "verified",
        verified_at: new Date().toISOString(),
        expires_at: addMinutes(VERIFIED_LIFETIME_MINUTES),
      })
      .eq("id", verificationId)
      .eq("status", "code_sent");

    if (updateError) {
      throw new Error(updateError.message);
    }

    return NextResponse.json({ ok: true, verified: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Kodni tasdiqlashda xatolik",
      },
      { status: 500 }
    );
  }
}
