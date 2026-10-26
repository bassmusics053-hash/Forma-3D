import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
export async function middleware(req:NextRequest){if(!process.env.ADMIN_SESSION_SECRET)return NextResponse.redirect(new URL("/admin",req.url));const token=req.cookies.get("forma3d_admin_session")?.value;if(!token)return NextResponse.redirect(new URL("/admin",req.url));try{await jwtVerify(token,new TextEncoder().encode(process.env.ADMIN_SESSION_SECRET||"change-this-secret"));return NextResponse.next()}catch{return NextResponse.redirect(new URL("/admin",req.url))}}
export const config={matcher:["/admin/dashboard/:path*"]};
