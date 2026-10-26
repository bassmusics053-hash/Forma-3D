import { SignJWT, jwtVerify } from "jose";
const key = () => new TextEncoder().encode(process.env.ADMIN_SESSION_SECRET || "change-this-secret");
export async function createSession(username:string){return new SignJWT({username}).setProtectedHeader({alg:"HS256"}).setIssuedAt().setExpirationTime("7d").sign(key())}
export async function verifySession(token?:string){if(!token||!process.env.ADMIN_SESSION_SECRET)return false;try{await jwtVerify(token,key());return true}catch{return false}}
