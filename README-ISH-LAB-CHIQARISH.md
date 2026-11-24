# FORMA 3D — Ichki ishlab chiqarish paneli (birinchi versiya)

## Nimalar qo‘shildi

- `/admin/production`: mavjud Dark Luxury admin dizayniga mos, faqat admin sessiyasi bilan ochiladigan ichki panel.
- Sotuv katalogidan mahsulot tanlash yoki katalogda yo‘q ichki model nomini kiritish.
- Bitta model uchun cheksizga yaqin alohida print profillari: variant/o‘lcham, X/Y/Z mm, material turi, sarf (g), vaqt (soat/daqiqa), printer, ixtiyoriy to‘ldirish foizi, izoh.
- Ro‘yxat, qidiruv, material filtri, tahrirlash, o‘chirish.
- Barcha CRUD operatsiyalari admin sessiya bilan himoyalangan API orqali amalga oshadi.
- Supabase jadvaliga `anon` va `authenticated` rollari uchun to‘g‘ridan-to‘g‘ri ruxsat yo‘q; serverdagi `service_role` foydalanadi.

## O‘rnatish tartibi

1. O‘zgartirilgan fayllar ZIP ichidagi papka yo‘llari bilan loyihaga qo‘yiladi. Hozirgi `LuxuryStore.tsx`, `ProductGallery.tsx` va `categories/page.tsx` fayllarini almashtirish **kerak emas**.
2. Supabase Dashboard > SQL Editor > New query bo‘limiga kiring, `supabase/production-profiles.sql` mazmunini joylang va **Run** bosing. Bu yangi `production_profiles` jadvalini yaratadi; eski mahsulotlar jadvalini o‘zgartirmaydi.
3. GitHub'ga kodni commit/push qiling; Vercel automatik deploy qilishi kerak (GitHub integration yoqilgan bo‘lsa).
4. Odatdagi admin login orqali `/admin/production` ga kiring. Sotuv admin sahifasidagi yangi `🖨 Ishlab chiqarish` havolasi ham shu sahifaga olib boradi.

## PowerShell

```powershell
git add components/AdminDashboard.tsx components/ProductionDashboard.tsx middleware.ts app/admin/production/page.tsx app/admin/production/production.css app/api/admin/production/route.ts supabase/production-profiles.sql
git commit -m "Add private production management panel"
git push origin main
```

`main` o‘rniga o‘zingizdagi branch nomini (`git branch --show-current`) yozing. SQL'ni GitHub'ga yuklash jadvalni avtomatik yaratmaydi: 2-qadamni Supabase SQL Editor'da ham bajarish kerak.

## Xavfsizlik

- `.env.local`, `.env.local.bak`, `SUPABASE_SERVICE_ROLE_KEY` yoki maxfiy admin sozlamalarini GitHub'ga yuklamang.
- Panelni jamoa xodimlariga ochish uchun keyinchalik alohida akkauntlar/rollar va audit jurnalini qo‘shish maqsadga muvofiq. Hozir mavjud admin sessiyasidan foydalanadi.
- Savdo saytidagi rasmlar va mahsulot ma'lumotlari o‘zgarmaydi.

## Cheklovlar

- Print sarfi va vaqti **avtomatik 3D fayldan hisoblanmaydi**: slicer (masalan, Elegoo Matrix) chiqargan qiymatlar qo‘lda kiritiladi.
- Tannarx hisoblash, stock, ishlab chiqarish jadvali, fayl/STL importi va printerga to‘g‘ridan-to‘g‘ri ulanish — keyingi bosqichlar.
- Supabase migratsiyasi ishga tushirilmaguncha panel ma'lumotlarni saqlamaydi.
- Mavjud loyihada `brands` yo‘nalishlariga doir TypeScript xatolari avvaldan mavjud. Yangi bo‘limning o‘zi TypeScript tekshiruviga yangi xato qo‘shmadi.
