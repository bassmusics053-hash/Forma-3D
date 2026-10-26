# FORMA 3D — Tovarlar tizimi (Dark Luxury)

## Mavjud Supabase loyihasi (siz SQL Editor'da `Success` olgansiz)

**Faqat bitta SQL faylni ishga tushiring:**
`supabase/forma3d-products-upgrade.sql`

SQL Editor → New query → faylning butun mazmunini joylashtiring → **Run**.
Bu kod `product_colors.swatch_colors` ustunini yaratadi va mahsulot/o‘lcham/rangni bir tranzaksiyada saqlaydigan `forma_save_product` funksiyasini qo‘shadi. Mavjud mahsulotlarni o‘chirmaydi.

**`supabase/schema.sql` ni qayta ishga tushirmang.** Bu fayl faqat boshidan yaratiladigan BO‘SH Supabase loyihasi uchun. Bo‘sh baza bo‘lsa: avval `schema.sql`, keyin `forma3d-products-upgrade.sql`.

## VS Code

1. Oldingi `FORMA_3D` papkasini zaxiralang.
2. Yangi ZIP ichidagi `FORMA_3D` fayllaridan foydalaning.
3. Eski kompyuteringizdagi `.env.local`ni yangi papkaga o‘zingiz ko‘chiring. **Bu ZIP ichida parol yoki kalitlar yo‘q.**
4. VS Code'da ochib, PowerShell orqali:

```powershell
npm.cmd install
npm.cmd run dev
```

Sayt: http://localhost:3000
Admin: http://localhost:3000/admin

Agar `.env.local`da `NEXT_PUBLIC_SUPABASE_ANON_KEY` bo‘lsa ham ishlaydi. `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ham qo‘llab-quvvatlanadi.
`SUPABASE_SERVICE_ROLE_KEY` faqat server uchun, uni `NEXT_PUBLIC_` bilan yozmang.

## Mahsulot qo‘shish

Admin → **Mahsulotlar** → **+ Yangi qo‘shish**.

- Nomi, SKU (takrorlanmas), slug va kategoriya.
- Kategoriya tanlangach o‘lcham/narx qismi ochiladi. Birinchi o‘lcham allaqachon turadi; `＋ O‘lcham qo‘shish` bilan ko‘paytiring.
- Rang kombinatsiyalari: 3 ta boshlang‘ich misol, boshqalarini qo‘shish/o‘chirish mumkin. Bir kombinatsiyada 1–3 rang bo‘lishi mumkin.
- Har kombinatsiya uchun `Sotuvda bor` belgisi. O‘chirilsa xaridorga xira/chizilgan holatda ko‘rinadi, tanlanmaydi.
- Narxlar rangga emas, o‘lchamga bog‘liq. O‘lcham tugmasida narx chiqmaydi.
- Mahsulot SKU katalogda va mahsulotning ichki sahifasida ko‘rinadi.
- Kategoriyalarni **Kategoriyalar** bo‘limidan qo‘shing.
- `Brend`, `Uzum`, `Yandex`, `Ozon` va qo‘lda `Ombordagi soni` maydonlari olib tashlangan.
- Eski `stock` ustuni ichki ma’lumot sifatida eski bazalarda saqlanadi, ammo xarid qilish imkoniyati va holati rang kombinatsiyasining `available` qiymatidan olinadi.

## Savatcha va buyurtmalar

Mahsulot tanlovi (o‘lcham/rang) savatga alohida variant sifatida qo‘shiladi. Buyurtma serverda o‘lcham narxi va rang mavjudligini qayta tekshiradi. Oldingi versiyadan brauzerda qolgan savat yozuvlari variantga ega bo‘lmasa, ularni o‘chirib mahsulotni qayta tanlang.

**Telegram tasdiqlangan buyurtmalar** ishlashi uchun bot token va webhook alohida sozlanishi kerak. Real serverga joylashdan oldin bu jarayonni tekshiring.

**Admin akkauntlari:** bu versiyada mavjud eski login saqlangan. Siz va sherigingiz uchun alohida, teng huquqli 2 admin akkaunt yaratish keyingi bosqich.

## Tekshiruvlar

- `tsc --noEmit` — muvaffaqiyatli.
- Next.js to‘liq build testi ushbu muhitda yakunlanmadi: yuborilgan `node_modules` Windows'ga oid; bu muhitda Linux SWC modulini yuklash uchun internet DNS mavjud emas.
- Jonli Supabase/Telegram integratsiya testi lokal maxfiy kalitlarsiz bajarilmadi. Saytni ishga tushirgach Admin → Mahsulotlar oqimini tekshiring.

## Muhim

`.env.local`ni ZIP, GitHub yoki sherikingizga yubormang. Admin uchun alohida hisoblar yaratilguncha bir xil parolni ulashmaslik tavsiya etiladi.
