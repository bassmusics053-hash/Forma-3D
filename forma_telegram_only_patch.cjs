const fs = require("fs");
const path = require("path");
const os = require("os");

const shopPath = path.join("components", "LuxuryStore.tsx");
const variantPath = path.join("components", "ProductVariants.tsx");
const checkoutPath = path.join("app", "checkout", "page.tsx");
const ordersPath = path.join("app", "api", "orders", "route.ts");

for (const name of [shopPath, variantPath, checkoutPath, ordersPath]) {
  if (!fs.existsSync(name)) {
    console.error(`Fayl topilmadi: ${name}. Hech narsa o‘zgartirilmadi.`);
    process.exit(1);
  }
}
const original = fs.readFileSync(shopPath, "utf8");
const variant = fs.readFileSync(variantPath, "utf8");
if (!variant.includes("Buyurtma berish") || !variant.includes("telegramUrl")) {
  console.error("ProductVariants.tsx hali Telegram tugmasiga mos emas. Hech narsa o‘zgartirilmadi.");
  process.exit(1);
}
if (!original.includes('className="lux-cart-trigger"') || !original.includes('className="lux-cart-backdrop"')) {
  console.error("LuxuryStore.tsx versiyasi kutilganidan farq qiladi. Hech narsa o‘zgartirilmadi.");
  process.exit(1);
}
let out = original;
const removeLine = (token) => {
  const lines = out.split(/\r?\n/);
  const count = lines.filter(s => s.includes(token)).length;
  if (count !== 1) throw new Error(`${token} uchun ${count} ta moslik chiqdi; to‘xtatildi.`);
  out = lines.filter(s => !s.includes(token)).join("\n");
};

// Savatcha uchun state, localStorage, hisob-kitob va eventlarni olib tashlash.
for (const token of [
  'const [cart, setCart]',
  'const [cartReady, setCartReady]',
  'const [cartOpen, setCartOpen]',
  'const [notice, setNotice]',
  'const cartCount =',
  'const cartTotal =',
  'const updateQuantity =',
  'const syncCart=',
  'setCartReady(true)',
  'window.addEventListener("forma3d-cart-updated"',
  'localStorage.getItem("forma3d-cart")',
  'useEffect(() => { if (cartReady)',
  'useEffect(() => { if (!notice)',
]) removeLine(token);

out = out.replace(
  'return () => {clearInterval(tick);window.removeEventListener("forma3d-cart-updated",syncCart);};',
  'return () => clearInterval(tick);'
);

const beforeHeader = out;
out = out.replace(/<button className="lux-cart-trigger"[^>]*>.*?<\/button>/s, "");
if (out === beforeHeader) throw new Error("Savat tugmasi topilmadi. To‘xtatildi.");

const beforePanel = out;
out = out.replace(/^\s*\{cartOpen && <div className="lux-cart-backdrop".*\r?\n/m, "\n");
if (out === beforePanel) throw new Error("Savat paneli topilmadi. To‘xtatildi.");

out = out.replace(/^\s*\{notice && <div className="lux-toast".*\r?\n/m, "\n");
// Mahsulot tanlanmasdan Telegramga o‘tmasin.
out = out.replace('href="#contact">Buyurtma berish', 'href="#products">Buyurtma berish');

for (const forbidden of ['setCart', 'cartOpen', 'cartCount', 'cartTotal', 'updateQuantity', 'forma3d-cart', '/checkout', 'lux-cart-backdrop']) {
  if (out.includes(forbidden)) throw new Error(`${forbidden} hali mavjud. Hech narsa yozilmadi.`);
}

const backupDir = fs.mkdtempSync(path.join(os.tmpdir(), "forma3d-before-telegram-"));
for (const name of [shopPath, checkoutPath, ordersPath]) {
  fs.copyFileSync(name, path.join(backupDir, path.basename(name).replace(/\.tsx?$/, "") + "-" + (name.includes("checkout") ? "checkout" : name.includes("orders") ? "orders" : "store") + path.extname(name)));
}
fs.writeFileSync(shopPath, out, "utf8");
fs.writeFileSync(checkoutPath, 'import { redirect } from "next/navigation";\n\nexport default function CheckoutPage() {\n  redirect("/#products");\n}\n', "utf8");
fs.writeFileSync(ordersPath, 'import { NextResponse } from "next/server";\n\nexport async function POST() {\n  return NextResponse.json(\n    { error: "Buyurtmalar Telegram orqali qabul qilinadi." },\n    { status: 410 }\n  );\n}\n', "utf8");
console.log("Tayyor: savatcha va checkout UI olib tashlandi; buyurtma API yopildi.");
console.log("Asl fayllar zaxirasi:", backupDir);
console.log("Endi npx.cmd tsc --noEmit va npm.cmd run build orqali tekshir.");
