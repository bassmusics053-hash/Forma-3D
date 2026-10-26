import { NextResponse } from "next/server";

import { adminSupabase } from "@/lib/supabase";
import {
  addMinutes,
  normalizePhone,
  VERIFICATION_LIFETIME_MINUTES,
} from "@/lib/telegram-verification";

let cachedBotUsername = "";

async function getBotUsername(token: string): Promise<string> {
  const configured = String(
    process.env.TELEGRAM_BOT_USERNAME || ""
  )
    .trim()
    .replace(/^@/, "");

  if (configured) {
    return configured;
  }

  if (cachedBotUsername) {
    return cachedBotUsername;
  }

  const response = await fetch(
    `https://api.telegram.org/bot${token}/getMe`,
    { cache: "no-store" }
  );

  const result = await response.json().catch(() => null);
  const username = String(result?.result?.username || "").trim();

  if (!response.ok || !result?.ok || !username) {
    throw new Error("Telegram bot username’ini aniqlab bo‘lmadi");
  }

  cachedBotUsername = username;
  return username;
}

export async function POST(request: Request) {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
      throw new Error("TELEGRAM_BOT_TOKEN topilmadi");
    }

    if (!process.env.TELEGRAM_VERIFICATION_PEPPER) {
      throw new Error("TELEGRAM_VERIFICATION_PEPPER topilmadi");
    }

    const body = await request.json();
    const phone = normalizePhone(body.phone);

    if (!phone) {
      return NextResponse.json(
        { error: "Telefon raqamini to‘g‘ri kiriting" },
        { status: 400 }
      );
    }

    const supabase = adminSupabase();
    const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();

    const { count, error: limitError } = await supabase
      .from("telegram_verifications")
      .select("id", { count: "exact", head: true })
      .eq("phone", phone)
      .gte("created_at", oneMinuteAgo);

    if (limitError) {
      throw new Error(limitError.message);
    }

    if ((count || 0) >= 2) {
      return NextResponse.json(
        { error: "Kod juda ko‘p so‘raldi. Bir daqiqadan keyin urinib ko‘ring." },
        { status: 429 }
      );
    }

    const { data, error } = await supabase
      .from("telegram_verifications")
      .insert({
        phone,
        status: "waiting_start",
        expires_at: addMinutes(VERIFICATION_LIFETIME_MINUTES),
      })
      .select("id")
      .single();

    if (error || !data) {
      throw new Error(error?.message || "Tasdiqlashni boshlashda xatolik");
    }

    const username = await getBotUsername(token);

    return NextResponse.json({
      ok: true,
      verification_id: data.id,
      bot_url: `https://t.me/${username}?start=verify_${data.id}`,
      expires_in_seconds: VERIFICATION_LIFETIME_MINUTES * 60,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Tasdiqlashni boshlashda xatolik",
      },
      { status: 500 }
    );
  }
}
