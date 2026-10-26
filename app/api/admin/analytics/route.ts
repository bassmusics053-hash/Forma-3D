import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { adminSupabase } from "@/lib/supabase";
import { verifySession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function allowed() {
  const token = (await cookies()).get(
    "forma3d_admin_session"
  )?.value;

  return Boolean(await verifySession(token));
}

export async function GET() {
 if (!(await allowed())) return NextResponse.json({error:"Ruxsat yo‘q"},{status:401});
 try {
  const db=adminSupabase();
  const since=new Date(Date.now()-30*86400000).toISOString();
  const [events,items,productList,stats]=await Promise.all([
   db.from("product_events").select("product_id,event_type,created_at").gte("created_at",since).order("created_at",{ascending:false}).limit(50000),
   db.from("order_items").select("product_id,product_name,quantity,created_at").gte("created_at",since).limit(50000),
   db.from("products").select("id,name").limit(10000),
   db.from("product_interest_stats").select("*").order("views_30d",{ascending:false}).limit(10000)
  ]);
  for(const result of [events,items,productList,stats]) if(result.error) throw result.error;
  const days=Array.from({length:30},(_,i)=>{const d=new Date();d.setUTCHours(0,0,0,0);d.setUTCDate(d.getUTCDate()-29+i);return {date:d.toISOString().slice(0,10),views:0,carts:0,ordered:0};});
  const byDate=new Map(days.map(x=>[x.date,x]));
  const names=new Map((productList.data||[]).map(x=>[x.id,x.name]));
  const byProduct=new Map<string,{name:string;views:number;carts:number;ordered:number}>();
  const record=(id:string|null,name:string)=>{const key=id||name;if(!byProduct.has(key))byProduct.set(key,{name:names.get(id||'')||name,views:0,carts:0,ordered:0});return byProduct.get(key)!;};
  for(const e of events.data||[]){const metric=e.event_type==='view'?'views':e.event_type==='add_to_cart'?'carts':null;if(!metric)continue;const day=byDate.get(e.created_at.slice(0,10));if(day)day[metric]++;const product=record(e.product_id,names.get(e.product_id)||'Mahsulot');product[metric]++;}
  for(const item of items.data||[]){const day=byDate.get(item.created_at.slice(0,10));if(day)day.ordered+=item.quantity||0;record(item.product_id,item.product_name||'Mahsulot').ordered+=item.quantity||0;}
  return NextResponse.json({products:stats.data||[],daily:days,top:[...byProduct.values()].sort((a,b)=>b.views-a.views)},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Statistika xatosi'},{status:500});}
}
