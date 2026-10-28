import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Buyurtmalar Telegram orqali qabul qilinadi." },
    { status: 410 }
  );
}
