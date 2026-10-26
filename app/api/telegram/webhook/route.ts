import { NextResponse } from "next/server";

import { adminSupabase } from "@/lib/supabase";
import {
  createVerificationCode,
  hashVerificationCode,
  isValidUuid,
} from "@/lib/telegram-verification";

type TelegramMessage = {
  text?: string;
  chat?: { id?: number };
  from?: { id?: number; username?: string };
};

async function sendTelegramMessage(
  token: string,
  chatId: number,
  text: string
) {
  const response = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      }),
    }
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }
}

export async function POST(request: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const receivedSecret = request.headers.get(
    "x-telegram-bot-api-secret-token"
  );

  if (!token || !webhookSecret || receivedSecret !== webhookSecret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    const update = await request.json();
    const message = update?.message as TelegramMessage | undefined;
    const text = String(message?.text || "").trim();
    const chatId = Number(message?.chat?.id);
    const telegramUserId = Number(message?.from?.id);

    if (!text.startsWith("/start verify_") || !Number.isFinite(chatId)) {
      return NextResponse.json({ ok: true });
    }

    const verificationId = text
      .replace(/^\/start\s+verify_/, "")
      .trim();

    if (!isValidUuid(verificationId)) {
      await sendTelegramMessage(
        token,
        chatId,
        "Tasdiqlash havolasi noto‘g‘ri. Saytdan yangi kod oling."
      );

      return NextResponse.json({ ok: true });
    }

    const supabase = adminSupabase();
    const { data, error } = await supabase
      .from("telegram_verifications")
      .select("id, status, expires_at")
      .eq("id", verificationId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data || new Date(data.expires_at).getTime() <= Date.now()) {
      if (data) {
        await supabase
          .from("telegram_verifications")
          .update({ status: "expired" })
          .eq("id", verificationId);
      }

      await sendTelegramMessage(
        token,
        chatId,
        "⏳ Tasdiqlash muddati tugagan. FORMA 3D saytiga qaytib yangi kod oling."
      );

      return NextResponse.json({ ok: true });
    }

    if (data.status === "verified" || data.status === "used") {
      await sendTelegramMessage(
        token,
        chatId,
        "✅ Bu tasdiqlash allaqachon bajarilgan. Saytga qaytishingiz mumkin."
      );

      return NextResponse.json({ ok: true });
    }

    const code = createVerificationCode();
    const codeHash = hashVerificationCode(verificationId, code);

    const { error: updateError } = await supabase
      .from("telegram_verifications")
      .update({
        code_hash: codeHash,
        status: "code_sent",
        attempts: 0,
        telegram_chat_id: chatId,
        telegram_user_id: Number.isFinite(telegramUserId)
          ? telegramUserId
          : null,
        telegram_username: message?.from?.username || null,
      })
      .eq("id", verificationId)
      .in("status", ["waiting_start", "code_sent"]);

    if (updateError) {
      throw new Error(updateError.message);
    }

    await sendTelegramMessage(
      token,
      chatId,
      [
        "🏎 <b>FORMA 3D</b>",
        "",
        "Saytdagi tasdiqlash kodingiz:",
        `<code>${code}</code>`,
        "",
        "Kod 10 daqiqa amal qiladi. Uni hech kimga yubormang.",
      ].join("\n")
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook xatosi", error);
    return NextResponse.json({ ok: true });
  }
}
