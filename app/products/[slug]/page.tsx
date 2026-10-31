
import { notFound } from "next/navigation";
import Link from "next/link";

import ProductVariants from "@/components/ProductVariants";
import ProductBackButton from "@/components/ProductBackButton";

import { publicSupabase } from "@/lib/supabase";
import { demoMode, demoProducts } from "@/lib/demo-catalog";

import ThemeButton from "@/components/ThemeButton";
import ProductGallery from "@/components/ProductGallery";
import ProductViewTracker from "@/components/ProductViewTracker";

export const dynamic = "force-dynamic";

type ProductPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

type ProductSize = {
  id: string;
  label: string;
  price: number;
};


type ProductColor = {
  id: string;
  name: string;
  hex_code: string;
  swatch_colors: string[];
  available: boolean;
};


export default async function ProductPage({
  params,
}: ProductPageProps) {
  const { slug } = await params;

  // 1. Mahsulotni olish
  // Brend jadvali endi ishlatilmaydi

  const result = demoMode
    ? null
    : await publicSupabase()
        .from("products")
        .select(`
          *,
          category:categories(id, name, slug)
        `)
        .eq("slug", slug)
        .eq("active", true)
        .single();

  if (result?.error || (!demoMode && !result?.data)) {
    notFound();
  }

  const product = demoMode
    ? demoProducts.find((item) => item.slug === slug)
    : result?.data;

  if (!product) {
    notFound();
  }

  // 2. O'lchamlar va ranglarni olish

  const [sizesResult, colorsResult] = demoMode
    ? [null, null]
    : await Promise.all([
        publicSupabase()
          .from("product_sizes")
          .select("id, label, price")
          .eq("product_id", product.id)
          .order("sort_order", {
            ascending: true,
          }),

        publicSupabase()
          .from("product_colors")
          
.select("id, name, hex_code, swatch_colors, available")

          .eq("product_id", product.id)
          .order("sort_order", {
            ascending: true,
          }),
      ]);

  if (sizesResult?.error) {
    throw new Error(
      "O'lchamlarni yuklashda xatolik: " +
        sizesResult.error.message
    );
  }

  if (colorsResult?.error) {
    throw new Error(
      "Ranglarni yuklashda xatolik: " +
        colorsResult.error.message
    );
  }

  // 3. O'lchamlar

  const sizes: ProductSize[] = (
    sizesResult?.data || []
  ).map((item) => ({
    id: String(item.id),
    label: String(item.label),
    price: Number(item.price),
  }));

  // 4. Ranglar

 
const colors: ProductColor[] = (
  colorsResult?.data || []
).map((item) => ({
  id: String(item.id),
  name: String(item.name),
  hex_code: String(item.hex_code),
  swatch_colors:
    Array.isArray(item.swatch_colors) &&
    item.swatch_colors.length > 0
      ? item.swatch_colors
      : [String(item.hex_code)],
  available: Boolean(item.available),
}));


  // 5. Demo mahsulot variantlari

  if (demoMode) {
    const basePrice = Number(product.price);

    sizes.push(
      {
        id: "demo-size-10",
        label: "10 sm",
        price: basePrice,
      },
      {
        id: "demo-size-15",
        label: "15 sm",
        price: Math.round(basePrice * 1.4),
      },
      {
        id: "demo-size-20",
        label: "20 sm",
        price: Math.round(basePrice * 1.8),
      },
      {
        id: "demo-size-25",
        label: "25 sm",
        price: Math.round(basePrice * 2.2),
      }
    );


colors.push(
  {
    id: "demo-black",
    name: "Qora",
    hex_code: "#252525",
    swatch_colors: ["#252525"],
    available: true,
  },
  {
    id: "demo-white",
    name: "Oq",
    hex_code: "#eeeeee",
    swatch_colors: ["#eeeeee"],
    available: true,
  },
  {
    id: "demo-orange",
    name: "Orange",
    hex_code: "#ed7618",
    swatch_colors: ["#ed7618"],
    available: false,
  },
  {
    id: "demo-purple",
    name: "Binafsha",
    hex_code: "#7650a3",
    swatch_colors: ["#7650a3"],
    available: true,
  },
  {
    id: "demo-gray",
    name: "Kulrang",
    hex_code: "#888888",
    swatch_colors: ["#888888"],
    available: false,
  }
);

  }

  // 6. Mahsulot rasmlari

  const allImages = [
    product.image_url,
    ...(product.images || []),
  ].filter(
    (image, index, array) =>
      typeof image === "string" &&
      Boolean(image) &&
      array.indexOf(image) === index
  ) as string[];

  const isAvailable = Number(product.stock) > 0;

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

  return (
    <>
      <ProductViewTracker
        productId={String(product.id)}
      />

      {/* Header */}

      <header>
        <div className="wrap productTop">
          <a href="/">
            <img
              className="logo"
              src="/forma3d-brand.webp"
              alt="FORMA 3D"
            />
          </a>

          <ProductBackButton />
        </div>
      </header>

      {/* Mahsulot sahifasi */}

      <main className="wrap productPage">

        {/* Chap tomon: rasmlar */}

        <section className="productLeftColumn">
          <ProductGallery
            images={allImages}
            productName={product.name}
          />

          {product.description && (
            <div className="productDescription">
              <h2>Mahsulot haqida</h2>

              <p>{product.description}</p>
            </div>
          )}
        </section>

        {/* O'ng tomon: mahsulot ma'lumotlari */}

        <aside className="productDetails">

          {demoMode && (
            <div className="demoNotice">
              Namuna mahsulot.
              Narxlar va variantlar
              demo rejimida ko'rsatilmoqda.
            </div>
          )}

          {/* Mahsulot nomi */}

          <h1>{product.name}</h1>

          {/* Mahsulot SKU */}

          {product.sku && (
            <p
              style={{
                color: "#99989f",
                fontSize: "13px",
                marginTop: "8px",
              }}
            >
              SKU: {product.sku}
            </p>
          )}

          {/* Kategoriya */}

          {product.category?.name && (
            <p
              style={{
                color: "#99989f",
                fontSize: "13px",
                marginTop: "6px",
              }}
            >
              Kategoriya: {product.category.name}
            </p>
          )}

          {/* Narx, o'lcham va ranglar */}


<ProductVariants
  product={{
    id: String(product.id),
    name: String(product.name),
    slug: String(product.slug),
    image_url: product.image_url ?? null,
  }}
  sizes={sizes}
  colors={colors}
/>


          {/* Ombor holati */}

          <div
            className={
              isAvailable
                ? "productStock available"
                : "productStock unavailable"
            }
          >
            {isAvailable
              ? `Omborda mavjud: ${product.stock} dona`
              : "Hozircha omborda yo'q"}
          </div>

          {/* Marketplace havolalari */}

          <div className="productOrderButtons">

            {product.uzum_url && (
              <a
                href={product.uzum_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Uzum Market
              </a>
            )}

            {product.yandex_url && (
              <a
                href={product.yandex_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Yandex Market
              </a>
            )}

            {product.ozon_url && (
              <a
                href={product.ozon_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ozon
              </a>
            )}

          </div>

        </aside>
      </main>


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
                href={`/products/${encodeURIComponent(item.slug)}?from=${encodeURIComponent(slug)}`}
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

      <ThemeButton />
    </>
  );
}
