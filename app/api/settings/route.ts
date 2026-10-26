import {NextResponse} from "next/server";import {publicSupabase} from "@/lib/supabase";
import {demoMode} from "@/lib/demo-catalog";export async function GET(){if(demoMode)return NextResponse.json({});const{data,error}=await publicSupabase().from("settings").select("*").eq("id",1).single();return error?NextResponse.json({}):NextResponse.json(data)}
