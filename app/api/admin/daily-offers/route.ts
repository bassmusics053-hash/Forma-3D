import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";
import { adminSupabase } from "@/lib/supabase";

async function authorized() {
  return Boolean(await verifySession((await cookies()).get("forma3d_admin_session")?.value));
}

export async function GET() {
  try {
    if (!(await authorized())) {
      return NextResponse.json(
        { error: "Admin sifatida tizimga kiring" },
        { status: 401 }
      );
    }

    const db = adminSupabase();

    const { data, error } = await db
      .from("daily_offers")
      .select(`
        id,
        product_id,
        starts_at,
        ends_at,
        active,
        created_at,
        original_price,
        offer_price,
        product:products(
          id,
          name,
          image_url,
          price,
          slug,
          active
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Daily offers Supabase error:", error);

      return NextResponse.json(
        {
          error: `Kun takliflari: ${error.message}`,
          code: error.code,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(data ?? [], {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Daily offers server error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Kun takliflarini yuklashda server xatosi",
      },
      { status: 500 }
    );
  }
}

export async function POST(request:Request) {
  if (!(await authorized())) return NextResponse.json({error:"Ruxsat yo‘q"},{status:401});
  const body=await request.json().catch(()=>null);
  const productId=typeof body?.product_id==="string"?body.product_id:"";
  const days=Number(body?.days);
  const offerPrice=Number(body?.offer_price);
  if(!/^[0-9a-f-]{36}$/i.test(productId)||![1,3,5,7].includes(days))
    return NextResponse.json({error:"Mahsulot va 1, 3, 5 yoki 7 kunni tanlang"},{status:400});
  const db=adminSupabase();
  const {data:product,error:productError}=await db.from("products").select("id,active,price").eq("id",productId).single();
  if(productError||!product?.active)return NextResponse.json({error:"Faol mahsulot topilmadi"},{status:400});
  const originalPrice=Number(product.price);
  if(!Number.isSafeInteger(offerPrice)||offerPrice<=0||offerPrice>=originalPrice) return NextResponse.json({error:"Summani qayta kiriting. Yangi narx eski narxdan arzon bo‘lishi kerak."},{status:400});
  const now=new Date();
  const ends=new Date(now.getTime()+days*24*60*60*1000);
  // Bir mahsulot uchun bir vaqtda faqat bitta faol taklif.
  const {error:stopError}=await db.from("daily_offers").update({active:false})
    .eq("product_id",productId).eq("active",true);
  if(stopError)return NextResponse.json({error:stopError.message},{status:500});
  const {data,error}=await db.from("daily_offers").insert({product_id:productId,starts_at:now.toISOString(),ends_at:ends.toISOString(),active:true,original_price:originalPrice,offer_price:offerPrice}).select().single();
  if(error)return NextResponse.json({error:error.message},{status:500});
  return NextResponse.json(data,{status:201});
}
export async function DELETE(request:Request) {
  if (!(await authorized())) return NextResponse.json({error:"Ruxsat yo‘q"},{status:401});
  const id=new URL(request.url).searchParams.get("id");
  if(!id||!/^[0-9a-f-]{36}$/i.test(id))return NextResponse.json({error:"Noto‘g‘ri ID"},{status:400});
  const {error}=await adminSupabase().from("daily_offers").update({active:false}).eq("id",id);
  if(error)return NextResponse.json({error:error.message},{status:500});
  return NextResponse.json({ok:true});
}
