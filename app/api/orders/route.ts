import { NextResponse } from "next/server";

import { adminSupabase } from "@/lib/supabase";
import { demoMode } from "@/lib/demo-catalog";
import { normalizePhone } from "@/lib/telegram-verification";

type IncomingCartItem = {
  product_id?: unknown;
  quantity?: unknown;
  size_id?: unknown;
  color_id?: unknown;
};

type ProductRow = {
  id: string;
  name: string;
  slug: string | null;
  image_url: string | null;
  price: number;
};

const allowedRegions = [
  "Toshkent shahri",
  "Toshkent viloyati",
  "Andijon viloyati",
  "Buxoro viloyati",
  "Farg‘ona viloyati",
  "Jizzax viloyati",
  "Xorazm viloyati",
  "Namangan viloyati",
  "Navoiy viloyati",
  "Qashqadaryo viloyati",
  "Qoraqalpog‘iston Respublikasi",
  "Samarqand viloyati",
  "Sirdaryo viloyati",
  "Surxondaryo viloyati",
];

function cleanText(value: unknown, maximumLength: number) {
  return String(value ?? "").trim().slice(0, maximumLength);
}

function isValidUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function formatOrderNumber(orderNumber: number) {
  return `F3D-${String(orderNumber).padStart(6, "0")}`;
}
function escapeTelegramHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatAmount(value: number) {
  return new Intl.NumberFormat("uz-UZ").format(value);
}

async function notifyTelegramAboutOrder({
  orderNumber,
  customerName,
  phone,
  region,
  district,
  address,
  customerNote,
  totalAmount,
  items,
  telegramUsername,
  telegramUserId,
}: {
  orderNumber: string;
  customerName: string;
  phone: string;
  region: string;
  district: string;
  address: string;
  customerNote: string;
  totalAmount: number;
  items: Array<{ product_name: string; size_label?: string; color_name?: string; quantity: number; subtotal: number }>;
  telegramUsername: string;
  telegramUserId: number | null;
}) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ORDERS_CHAT_ID;

  if (!token || !chatId) return;

  const itemLines = items.map(
    (item) =>
      `• ${escapeTelegramHtml(item.product_name)} (${escapeTelegramHtml([item.size_label,item.color_name].filter(Boolean).join(" / "))}) × ${item.quantity} — ${formatAmount(item.subtotal)} so'm`
  );

  const message = [
    "🛒 <b>Yangi buyurtma</b>",
    `<b>Raqam:</b> ${escapeTelegramHtml(orderNumber)}`,
    "",
    `<b>Mijoz:</b> ${escapeTelegramHtml(customerName)}`,
    `<b>Telefon:</b> <code>${escapeTelegramHtml(phone)}</code>`,
    telegramUsername
      ? `<b>Telegram:</b> @${escapeTelegramHtml(telegramUsername)}`
      : telegramUserId
        ? `<b>Telegram ID:</b> <code>${telegramUserId}</code>`
        : "",
    `<b>Manzil:</b> ${escapeTelegramHtml(region)}, ${escapeTelegramHtml(district)}`,
    escapeTelegramHtml(address),
    customerNote ? `<b>Izoh:</b> ${escapeTelegramHtml(customerNote)}` : "",
    "",
    "<b>Mahsulotlar:</b>",
    ...itemLines,
    "",
    `<b>Jami:</b> ${formatAmount(totalAmount)} so'm`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "HTML",
        }),
      }
    );

    if (!response.ok) {
      console.error("Telegram xabari yuborilmadi", await response.text());
    }
  } catch (error) {
    console.error("Telegram xabari yuborilmadi", error);
  }
}

export async function POST(request: Request) {
  if (demoMode) return NextResponse.json({error:"Bu namuna sayt. Real buyurtma uchun Supabase va Telegram sozlang."}, {status:503});
  try {
    const body = await request.json();

    const customerName = cleanText(body.customer_name, 100);
    const phone = cleanText(body.phone, 30);
    const region = cleanText(body.region, 100);
    const district = cleanText(body.district, 100);
    const address = cleanText(body.address, 300);
    const customerNote = cleanText(body.customer_note, 500);
    const verificationId = cleanText(body.verification_id, 36);
    const phoneDigits = phone.replace(/\D/g, "");

    if (customerName.length < 2) {
      
      return NextResponse.json(
        { error: "Ismingizni to‘g‘ri kiriting" },
        { status: 400 }
      );
    }

    if (
      phoneDigits.length < 9 ||
      phoneDigits.length > 15 ||
      !/^[+\d\s()-]+$/.test(phone)
    ) {
      return NextResponse.json(
        { error: "Telefon raqamini to‘g‘ri kiriting" },
        { status: 400 }
      );
    }

    if (!allowedRegions.includes(region)) {
      return NextResponse.json(
        { error: "Viloyat yoki shaharni tanlang" },
        { status: 400 }
      );
    }

    if (district.length < 2) {
      return NextResponse.json(
        { error: "Tuman yoki shahar nomini kiriting" },
        { status: 400 }
      );
    }

    if (address.length < 5) {
      return NextResponse.json(
        { error: "Yetkazib berish manzilini to‘liq kiriting" },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.items)) {
      return NextResponse.json(
        { error: "Savatdagi mahsulotlar topilmadi" },
        { status: 400 }
      );
    }

    const incomingItems = body.items as IncomingCartItem[];

    if (incomingItems.length < 1 || incomingItems.length > 50) {
      return NextResponse.json(
        { error: "Savat bo‘sh yoki mahsulotlar soni juda ko‘p" },
        { status: 400 }
      );
    }

    // Each size + color is a separate line item. Never trust client-side prices.
    const quantityByVariant = new Map<string, {
      productId: string; sizeId: string; colorId: string; quantity: number;
    }>();
    for (const item of incomingItems) {
      const productId = cleanText(item.product_id, 50);
      const sizeId = cleanText(item.size_id, 50);
      const colorId = cleanText(item.color_id, 50);
      const quantity = Math.floor(Number(item.quantity));
      if (![productId,sizeId,colorId].every(isValidUuid))
        return NextResponse.json({error:"Mahsulot o‘lchami va rangini qayta tanlang"},{status:400});
      if (!Number.isFinite(quantity) || quantity < 1 || quantity > 100)
        return NextResponse.json({error:"Mahsulot miqdori noto‘g‘ri"},{status:400});
      const key = `${productId}|${sizeId}|${colorId}`;
      const old = quantityByVariant.get(key);
      const total = (old?.quantity || 0) + quantity;
      if (total > 100) return NextResponse.json({error:"Bir xil variantdan 100 tadan ortiq buyurtma qilib bo‘lmaydi"},{status:400});
      quantityByVariant.set(key,{productId,sizeId,colorId,quantity:total});
    }
    const variants = Array.from(quantityByVariant.values());
    const productIds = [...new Set(variants.map(v=>v.productId))];
    const supabase = adminSupabase();

    if (!isValidUuid(verificationId)) {
      return NextResponse.json(
        { error: "Telefon raqamini Telegram orqali tasdiqlang" },
        { status: 401 }
      );
    }

    const { data: verification, error: verificationError } = await supabase
      .from("telegram_verifications")
      .select(
        "id, phone, status, expires_at, used_at, telegram_user_id, telegram_username"
      )
      .eq("id", verificationId)
      .maybeSingle();

    if (verificationError) {
      return NextResponse.json(
        { error: verificationError.message },
        { status: 500 }
      );
    }

    if (
      !verification ||
      verification.status !== "verified" ||
      verification.used_at ||
      new Date(verification.expires_at).getTime() <= Date.now() ||
      verification.phone !== normalizePhone(phone)
    ) {
      return NextResponse.json(
        {
          error:
            "Telegram tasdiqlashi topilmadi yoki muddati tugagan. Telefonni qayta tasdiqlang.",
        },
        { status: 401 }
      );
    }

    const [{data:productsData,error:productsError},{data:sizesData,error:sizesError},{data:colorsData,error:colorsError}] = await Promise.all([
      supabase.from("products").select("id,name,slug,image_url,price").in("id",productIds).eq("active",true),
      supabase.from("product_sizes").select("id,product_id,label,price").in("id",variants.map(v=>v.sizeId)),
      supabase.from("product_colors").select("id,product_id,name,available").in("id",variants.map(v=>v.colorId)),
    ]);
    if (productsError || sizesError || colorsError)
      return NextResponse.json({error:productsError?.message || sizesError?.message || colorsError?.message},{status:500});
    const products = (productsData || []) as ProductRow[];
    if (products.length !== productIds.length)
      return NextResponse.json({error:"Savatdagi mahsulotlardan biri faol emas"},{status:409});
    const sizeMap = new Map((sizesData || []).map(s=>[s.id,s]));
    const colorMap = new Map((colorsData || []).map(c=>[c.id,c]));
    const productMap = new Map(products.map(p=>[p.id,p]));
    for (const v of variants) {
      const size=sizeMap.get(v.sizeId);
      const color=colorMap.get(v.colorId);
      if (!size || !color || size.product_id!==v.productId || color.product_id!==v.productId || !color.available)
        return NextResponse.json({error:"Tanlangan o‘lcham yoki rang mavjud emas. Savatchani yangilang."},{status:409});
      if (!(Number(size.price)>0))
        return NextResponse.json({error:"O‘lcham narxi belgilangan emas"},{status:409});
    }

    // Calculate final discount server-side to prevent client-side price tampering.
    const currentTime=new Date().toISOString();
    const {data:currentOffers,error:offersError}=await supabase.from("daily_offers")
      .select("product_id,offer_price,original_price,created_at")
      .in("product_id",productIds).eq("active",true)
      .lte("starts_at",currentTime).gt("ends_at",currentTime)
      .order("created_at",{ascending:false});
    if(offersError)return NextResponse.json({error:offersError.message},{status:500});
    const activePrices=new Map<string,number>();
    for(const offer of currentOffers||[]){
      const base=products.find(p=>p.id===offer.product_id);
      if(base && !activePrices.has(offer.product_id) && Number(offer.offer_price)>0 && Number(offer.offer_price)<Number(base.price))
        activePrices.set(offer.product_id,Number(offer.offer_price));
    }
    let totalAmount = 0;
    const orderItems = variants.map(v=>{
      const product=productMap.get(v.productId)!;
      const size=sizeMap.get(v.sizeId)!;
      const color=colorMap.get(v.colorId)!;
      const regular=Number(size.price);
      const discountPrice=activePrices.get(product.id);
      // Daily offer uses the same percentage for each size.
      const price=discountPrice && Number(product.price)>0
        ? Math.max(1,Math.round(regular*(discountPrice/Number(product.price)))) : regular;
      const subtotal=price*v.quantity;
      totalAmount+=subtotal;
      return {
        product_id:product.id,product_name:product.name,product_slug:product.slug,
        image_url:product.image_url,size_id:size.id,color_id:color.id,
        size_label:size.label,color_name:color.name,price,quantity:v.quantity,subtotal,
      };
    });

    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      return NextResponse.json(
        { error: "Buyurtma summasi noto‘g‘ri" },
        { status: 400 }
      );
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        customer_name: customerName,
        phone,
        region,
        district,
        address,
        customer_note: customerNote || null,
        total_amount: totalAmount,
        status: "new",
      })
      .select("id, order_number, total_amount, status, created_at")
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: orderError?.message || "Buyurtmani saqlab bo‘lmadi" },
        { status: 500 }
      );
    }

    const itemsWithOrderId = orderItems.map((item) => ({
      ...item,
      order_id: order.id,
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(itemsWithOrderId);

    if (itemsError) {
      await supabase.from("orders").delete().eq("id", order.id);

      return NextResponse.json(
        { error: itemsError.message },
        { status: 500 }
      );
    }

    const numericOrderNumber = Number(order.order_number);

    if (!Number.isFinite(numericOrderNumber)) {
      return NextResponse.json(
        { error: "Buyurtma raqamini yaratib bo‘lmadi" },
        { status: 500 }
      );
    }

    const { data: usedVerification, error: useVerificationError } =
      await supabase
        .from("telegram_verifications")
        .update({
          status: "used",
          used_at: new Date().toISOString(),
          order_id: order.id,
        })
        .eq("id", verificationId)
        .eq("status", "verified")
        .is("used_at", null)
        .select("id")
        .maybeSingle();

    if (useVerificationError || !usedVerification) {
      await supabase.from("order_items").delete().eq("order_id", order.id);
      await supabase.from("orders").delete().eq("id", order.id);

      return NextResponse.json(
        {
          error:
            "Tasdiqlash kodi avval ishlatilgan. Telefonni qayta tasdiqlang.",
        },
        { status: 409 }
      );
    }

    const formattedOrderNumber = formatOrderNumber(numericOrderNumber);

    await notifyTelegramAboutOrder({
      orderNumber: formattedOrderNumber,
      customerName,
      phone,
      region,
      district,
      address,
      customerNote,
      totalAmount,
      items: orderItems,
      telegramUsername: String(verification.telegram_username || ""),
      telegramUserId: verification.telegram_user_id
        ? Number(verification.telegram_user_id)
        : null,
    });

    return NextResponse.json(
      {
        ok: true,
        id: order.id,
        order_number: formattedOrderNumber,
        total_amount: Number(order.total_amount),
        status: order.status,
        created_at: order.created_at,
      },
      { status: 201 }
    );
  } catch (caughtError) {
    return NextResponse.json(
      {
        error:
          caughtError instanceof Error
            ? caughtError.message
            : "Buyurtmani saqlashda xatolik yuz berdi",
      },
      { status: 500 }
    );
  }
}
