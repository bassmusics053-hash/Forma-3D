import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase";
export const dynamic="force-dynamic";
export async function GET(){
  try {
    const now=new Date().toISOString();
    const {data,error}=await adminSupabase().from("daily_offers")
      .select("id,starts_at,ends_at,offer_price,original_price,product:products(id,name,slug,image_url,price,old_price,active)")
      .eq("active",true).lte("starts_at",now).gt("ends_at",now)
      .order("ends_at",{ascending:true});
    if(error)return NextResponse.json({error:error.message},{status:500});
    return NextResponse.json((data||[]).filter((offer)=>{
      const product=Array.isArray(offer.product)?offer.product[0]:offer.product;
      return Boolean(product?.active);
    }),{headers:{"Cache-Control":"no-store"}});
  } catch { return NextResponse.json([]); }
}
