/**
 * FORMA 3D — related category products + real Back navigation.
 * Run from the Next.js project root:
 *   node .\forma3d_recommendations_back_fix.cjs
 *
 * Only modifies app/products/[slug]/page.tsx and app/forma3d.css,
 * and creates components/ProductBackButton.tsx.
 * Backups saved in OS temporary folder (never Git-tracked).
 * No secret keys are read. Does not change Supabase database schema.
 */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const root = process.cwd();
const pageFile = 'app/products/[slug]/page.tsx';
const cssFile = 'app/forma3d.css';
const backFile = 'components/ProductBackButton.tsx';
const abs = (p) => path.resolve(root, p);
function stop(msg) {
  console.error(`TO'XTATILDI: ${msg}. Hech qanday fayl o'zgartirilmadi.`);
  process.exit(1);
}
if (!fs.existsSync(abs('package.json')) || !fs.existsSync(abs(pageFile)) || !fs.existsSync(abs(cssFile))) {
  stop('FORMA_3D asosiy papkasidan ishga tushiring (package.json yoki mahsulot sahifasi topilmadi)');
}
const originalPage = fs.readFileSync(abs(pageFile), 'utf8');
const originalCss = fs.readFileSync(abs(cssFile), 'utf8');
if (originalPage.includes('FORMA3D_RECOMMENDATIONS_START') || originalCss.includes('FORMA3D_RECOMMENDATIONS_CSS')) {
  stop('Tavsiyalar funksiyasi avval qo\'shilgan: skriptni ikkinchi marta ishga tushirmang');
}
if (fs.existsSync(abs(backFile))) {
  stop(`${backFile} allaqachon bor, mavjud faylni avtomatik almashtirmayman`);
}
if (!originalPage.includes('export default async function ProductPage') ||
    !originalPage.includes('publicSupabase') ||
    !originalPage.includes('demoProducts') ||
    !originalPage.includes('<ThemeButton />') ||
    !originalPage.includes('</main>')) {
  stop('Mahsulot sahifasining tuzilishi kutilgan V2 kodidan farq qiladi');
}

let page = originalPage;
if (!page.includes('import Link from "next/link";')) {
  page = page.replace('import { notFound } from "next/navigation";',
    'import { notFound } from "next/navigation";\nimport Link from "next/link";');
}
if (!page.includes('import Link from "next/link";')) stop('next/link importi uchun joy topilmadi');
page = page.replace('import ProductVariants from "@/components/ProductVariants";',
  'import ProductVariants from "@/components/ProductVariants";\nimport ProductBackButton from "@/components/ProductBackButton";');
if (!page.includes('import ProductBackButton from "@/components/ProductBackButton";')) {
  stop('ProductBackButton importi uchun joy topilmadi');
}
const oldBack = /<a\s+className="backButton"\s+href="\/"\s*>[\s\S]*?<\/a>/;
if (!oldBack.test(page)) stop('Mahsulot sarlavhasidagi eski Orqaga havolasi topilmadi');
page = page.replace(oldBack, '<ProductBackButton />');

const fetchBlock = `
  // FORMA3D_RECOMMENDATIONS_START
  // Shu kategoriyadagi boshqa faol mahsulotlar (hozirgi mahsulotsiz).
  type SuggestedProduct = {
    id: string;
    name: string;
    slug: string;
    sku: string | null;
    price: number;
    image_url: string | null;
  };

  let suggestedProducts: SuggestedProduct[] = [];

  if (demoMode) {
    suggestedProducts = demoProducts
      .filter((item) =>
        item.slug !== slug &&
        item.active &&
        item.category?.slug === product.category?.slug
      )
      .map((item) => ({
        id: String(item.id),
        name: String(item.name),
        slug: String(item.slug),
        sku: item.sku ?? null,
        price: Number(item.price || 0),
        image_url: item.image_url ?? null,
      }));
  } else if (product.category_id) {
    const { data: otherProducts, error: recommendationError } =
      await publicSupabase()
        .from("products")
        .select("id, name, slug, sku, price, image_url")
        .eq("category_id", product.category_id)
        .eq("active", true)
        .neq("id", product.id)
        .limit(100);

    if (recommendationError) {
      console.error("FORMA 3D tavsiyalar:", recommendationError.message);
    } else {
      suggestedProducts = (otherProducts ?? []).map((item) => ({
        id: String(item.id),
        name: String(item.name),
        slug: String(item.slug),
        sku: item.sku ?? null,
        price: Number(item.price || 0),
        image_url: item.image_url ?? null,
      }));
    }
  }

  // Har yangi sahifa yuklanishida Fisher-Yates orqali aralashtirish.
  for (let index = suggestedProducts.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [suggestedProducts[index], suggestedProducts[randomIndex]] =
      [suggestedProducts[randomIndex], suggestedProducts[index]];
  }
  const recommendations = suggestedProducts.slice(0, 6);
  // FORMA3D_RECOMMENDATIONS_END
`;
const returnAnchor = '\n  return (\n';
const returnIndex = page.lastIndexOf(returnAnchor);
if (returnIndex < 0) stop('ProductPage return bloki topilmadi');
page = page.slice(0, returnIndex) + fetchBlock + page.slice(returnIndex);

const suggestionsMarkup = `
      {/* FORMA3D_RECOMMENDATIONS_SECTION_START */}
      {recommendations.length > 0 && (
        <section className="wrap formaRelated" aria-label="O‘xshash mahsulotlar">
          <div className="formaRelatedHeader">
            <div>
              <span className="formaRelatedEyebrow">FORMA 3D · TAVSIYALAR</span>
              <h2>Sizga yana yoqishi mumkin</h2>
              <p>
                {product.category?.name || "Shu kategoriya"} — boshqa modellar
              </p>
            </div>
          </div>

          <div className="formaRelatedGrid">
            {recommendations.map((item) => (
              <Link
                key={item.id}
                className="formaRelatedCard"
                href={[0m\`/products/\${encodeURIComponent(item.slug)}?from=\${encodeURIComponent(slug)}\`[0m}
              >
                <div className="formaRelatedPicture">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} loading="lazy" decoding="async" />
                  ) : (
                    <span>FORMA 3D</span>
                  )}
                </div>
                <div className="formaRelatedBody">
                  <strong>{item.name}</strong>
                  {item.sku && <small>SKU: {item.sku}</small>}
                  <div className="formaRelatedBottom">
                    <b>{item.price.toLocaleString("ru-RU")} so‘m</b>
                    <span aria-hidden="true">↗</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
      {/* FORMA3D_RECOMMENDATIONS_SECTION_END */}
`;
// Replace ESC-wrapped JS template literal with literal backticks (reliable here-doc handling).
const cleanMarkup = suggestionsMarkup.replace(/\x1b\[0m/g, '');
const themeAnchor = '\n      <ThemeButton />';
if (page.indexOf(themeAnchor) < 0) stop('Tavsiyalarni joylash uchun ThemeButton topilmadi');
page = page.replace(themeAnchor, '\n' + cleanMarkup + themeAnchor);

const backComponent = `"use client";

import { useRouter } from "next/navigation";

/** Oldingi mahsulotga yoki oldingi sayt sahifasiga qaytish. */
export default function ProductBackButton() {
  const router = useRouter();

  function goBack() {
    // Mahsulotlar orasida odatiy bosib o'tilganda aynan oldingi sahifaga qaytadi.
    if (window.history.length > 1) {
      router.back();
      return;
    }

    // Masalan, tavsiya mahsuloti yangi tabda ochilganda ?from=... yordam beradi.
    const from = new URLSearchParams(window.location.search).get("from");
    if (from && /^[a-zA-Z0-9_-]+$/.test(from)) {
      router.replace(\`/products/\${encodeURIComponent(from)}\`);
      return;
    }

    // Birinchi kirishda browser tarixida mahsulot bo'lmasa, katalogga qaytadi.
    router.replace("/#products");
  }

  return (
    <button type="button" className="backButton" onClick={goBack}>
      ← Orqaga qaytish
    </button>
  );
}
`;
const css = `

/* FORMA3D_RECOMMENDATIONS_CSS — same-category premium cards */
.formaRelated {
  padding-top: 6px;
  padding-bottom: 75px;
}
.formaRelatedHeader { margin-bottom: 22px; }
.formaRelatedEyebrow {
  color: #ed7618;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 2px;
}
.formaRelatedHeader h2 {
  font-size: clamp(25px, 3vw, 34px);
  line-height: 1.15;
  margin: 10px 0 7px;
  color: var(--ink);
}
.formaRelatedHeader p { margin: 0; color: var(--muted); font-size: 14px; }
.formaRelatedGrid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 17px;
}
.formaRelatedCard {
  display: block;
  overflow: hidden;
  border-radius: 16px;
  background: var(--panel);
  border: 1px solid var(--line);
  color: var(--ink);
  text-decoration: none;
  transition: transform .2s ease, border-color .2s ease, box-shadow .2s ease;
}
.formaRelatedCard:hover {
  transform: translateY(-3px);
  border-color: #ed7618;
  box-shadow: 0 12px 35px rgba(237,118,24,.12);
}
.formaRelatedPicture {
  width: 100%; aspect-ratio: 16 / 9;
  background: #141218; overflow: hidden;
  display: grid; place-items: center;
}
.formaRelatedPicture img {
  width: 100%; height: 100%; display: block;
  object-fit: contain;
}
.formaRelatedPicture span { color: #ed7618; font-weight: 900; }
.formaRelatedBody { padding: 15px 17px 18px; }
.formaRelatedBody > strong {
  display: block; font-size: 16px;
  font-weight: 800; line-height: 1.4;
  min-height: 40px;
}
.formaRelatedBody > small {
  display: block; margin-top: 7px;
  color: var(--muted); font-size: 12px;
}
.formaRelatedBottom {
  margin-top: 15px;
  display: flex; align-items: center; justify-content: space-between;
  gap: 10px;
}
.formaRelatedBottom b { font-size: 16px; color: var(--ink); }
.formaRelatedBottom span {
  color: #111; background: #ed7618;
  border-radius: 9px; width: 35px; height: 35px;
  display: grid; place-items: center; font-size: 21px;
}
.productTop > .backButton {
  border: 0; font: inherit; font-weight: 800;
  cursor: pointer; white-space: nowrap;
}
@media (max-width: 900px) {
  .formaRelatedGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 540px) {
  .formaRelatedGrid { gap: 10px; }
  .formaRelatedBody { padding: 12px; }
  .formaRelatedBody > strong { font-size: 13px; min-height: 38px; }
  .formaRelatedBottom b { font-size: 13px; }
  .formaRelatedBottom span { width: 30px; height: 30px; }
}
`;

// Validate generated content BEFORE writing anything.
if (!page.includes('FORMA3D_RECOMMENDATIONS_SECTION_END') ||
    !page.includes('from=${encodeURIComponent(slug)}') ||
    !page.includes('<ProductBackButton />') ||
    !backComponent.includes('router.back()')) {
  stop('Yangi kodni avtomatik tekshirish bajarilmadi');
}
const backupDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forma3d-recommendations-'));
fs.copyFileSync(abs(pageFile), path.join(backupDir, 'page.tsx'));
fs.copyFileSync(abs(cssFile), path.join(backupDir, 'forma3d.css'));
try {
  fs.writeFileSync(abs(pageFile), page, 'utf8');
  fs.writeFileSync(abs(cssFile), originalCss + css, 'utf8');
  fs.writeFileSync(abs(backFile), backComponent, 'utf8');
} catch (e) {
  fs.copyFileSync(path.join(backupDir, 'page.tsx'), abs(pageFile));
  fs.copyFileSync(path.join(backupDir, 'forma3d.css'), abs(cssFile));
  if (fs.existsSync(abs(backFile))) fs.unlinkSync(abs(backFile));
  stop('Fayllarni yozishda xato: ' + e.message);
}
console.log('TAYYOR! Bir kategoriyadagi 6 tagacha random tavsiya va ortga qaytish qo\'shildi.');
console.log('O\'zgartirildi:', pageFile, 'va', cssFile);
console.log('Yaratildi:', backFile);
console.log('Zaxira (GitHubga tushmaydi):', backupDir);
console.log('Tekshiring: npx.cmd tsc --noEmit  va  npm.cmd run build');
