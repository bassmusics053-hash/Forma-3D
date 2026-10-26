# FORMA 3D — Dark Luxury, 1-bosqich

## O‘rnatish (VS Code PowerShell)

```powershell
npm.cmd install
npm.cmd run dev
```

Brauzer: http://localhost:3000

## Hozir tayyor

- Dark Luxury yangi bosh sahifa (desktop + mobil).
- Katalog API orqali `/api/products` dan ma’lumot oladi; qidirish, kategoriyalarni saralash, mahsulot sahifasiga o‘tish.
- Savatcha localStorage (`forma3d-cart`) da saqlanadi va avvalgi `/checkout` bilan mos.
- Kun takliflari `/api/daily-offers` dan olinadi; aksiya taymeri va chegirmali narx.
- O‘z logotipingiz va tasdiqlangan maketdan olingan illustrativ demo rasmlar.
- Admin/user panel kodi avvalgi loyihadan saqlangan, ammo yangi premium ko‘rinishga hali moslashtirilmagan. Ularni keyingi bosqichda yangilaymiz.

## Supabase

`.env.example` asosida `.env.local` oching; yangi bazangizga mos sozlamalarni kiriting. SQL `supabase/` papkasida. Bo‘sh sozlamada demo katalog chiqadi. Haqiqiy tovar, narx va rasmlarni yangi Supabase bazasiga yuklashingiz kerak.

## Muhim

Maketdan olingan barcha rasmlar faqat konsept mahsulotlarini ko‘rsatadi; haqiqiy mahsulot fotosuratlariga almashtiring. Demo narxlar haqiqiy emas.

Barcha mavjud server funktsiyalarining to‘liq integratsion testi sizning Supabase va Telegram sozlamalaringizni talab qiladi.
