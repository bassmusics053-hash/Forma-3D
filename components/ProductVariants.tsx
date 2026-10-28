
"use client";

import { useEffect, useState } from "react";

type Size = {
  id: string;
  label: string;
  price: number;
};

type Color = {
  id: string;
  name: string;
  hex_code: string;
  swatch_colors: string[];
  available: boolean;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
};

type Props = {
  product: Product;
  sizes: Size[];
  colors: Color[];
};

export default function ProductVariants({
  product,
  sizes,
  colors,
}: Props) {
  const [sizeId, setSizeId] = useState(
    sizes[0]?.id ?? ""
  );

  const [colorId, setColorId] = useState(
    colors.find((c) => c.available)?.id ?? ""
  );

  const [telegramUrl, setTelegramUrl] = useState("");

  const selectedSize = sizes.find(
    (s) => s.id === sizeId
  );

  const selectedColor = colors.find(
    (c) => c.id === colorId
  );

  const canOrder =
    Boolean(selectedSize) &&
    Boolean(selectedColor?.available);

  // Telegram manzilini Supabase sozlamalaridan olish
  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      try {
        const response = await fetch("/api/settings");

        if (!response.ok) return;

        const data = await response.json();
        const raw = data?.telegram_url;

        if (typeof raw !== "string") return;

        let link = raw.trim();

        if (link.startsWith("@")) {
          link = "https://t.me/" + link.slice(1);
        }

        if (link.startsWith("t.me/")) {
          link = "https://" + link;
        }

        const url = new URL(link);

        const valid =
          url.protocol === "https:" &&
          url.hostname === "t.me" &&
          /^\/[a-zA-Z0-9_]{5,32}\/?$/.test(
            url.pathname
          );

        if (valid && !cancelled) {
          setTelegramUrl(url.toString());
        }
      } catch (error) {
        console.error("Telegram sozlamasi:", error);
      }
    }

    void loadSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  function formatPrice(price: number) {
    return (
      new Intl.NumberFormat("ru-RU").format(price) +
      " so‘m"
    );
  }

  return (
    <section className="formaVariants">

      {/* ASOSIY NARX */}
      <div className="formaMainPrice">
        {selectedSize
          ? formatPrice(selectedSize.price)
          : "Narx mavjud emas"}
      </div>

      {/* O'LCHAMLAR */}
      <div className="formaOptionGroup">
        <div className="formaOptionHeader">
          <h3>O‘lcham</h3>
          <span>
            {selectedSize?.label ?? "Tanlanmagan"}
          </span>
        </div>

        <div className="formaSizeGrid">
          {sizes.map((size) => (
            <button
              key={size.id}
              type="button"
              className={
                "formaSizeButton " +
                (sizeId === size.id ? "selected" : "")
              }
              onClick={() => setSizeId(size.id)}
            >
              {size.label}
            </button>
          ))}
        </div>
      </div>

      {/* RANG KOMBINATSIYALARI */}
      <div className="formaOptionGroup">
        <div className="formaOptionHeader">
          <h3>Rang kombinatsiyasi</h3>
          <span>
            {selectedColor?.name ?? "Tanlanmagan"}
          </span>
        </div>

        <div className="formaColorGrid">
          {colors.map((color) => {
            const selected = colorId === color.id;
            const unavailable = !color.available;

            const swatches =
              color.swatch_colors?.length
                ? color.swatch_colors
                : [color.hex_code];

            const background =
              swatches.length > 1
                ? `linear-gradient(110deg, ${swatches.join(", ")})`
                : swatches[0];

            return (
              <button
                key={color.id}
                type="button"
                disabled={unavailable}
                title={
                  unavailable
                    ? `${color.name} — Tugagan`
                    : color.name
                }
                className={
                  "formaColorButton " +
                  (selected ? "selected " : "") +
                  (unavailable ? "unavailable" : "")
                }
                onClick={() => setColorId(color.id)}
              >
                <span
                  className="formaColorSwatch"
                  style={{ background }}
                />

                <span className="formaColorName">
                  {color.name}
                </span>

                {unavailable && (
                  <span className="formaSoldOut">
                    Tugagan
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* TANLANGAN VARIANT */}
      <div className="formaSelectedVariant">
        <span>Tanlangan variant</span>

        <strong>
          {selectedSize?.label ?? "—"} ·{" "}
          {selectedColor?.name ?? "—"}
        </strong>
      </div>

      {/* TELEGRAMGA O'TISH */}
      {canOrder && telegramUrl ? (
        <a
          href={telegramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="formaAddToCart formaOrderButton"
        >
          Buyurtma berish ↗
        </a>
      ) : (
        <button
          type="button"
          className="formaAddToCart"
          disabled
        >
          {!canOrder
            ? "Mavjud variantni tanlang"
            : "Telegram manzili sozlanmagan"}
        </button>
      )}

    </section>
  );
}
