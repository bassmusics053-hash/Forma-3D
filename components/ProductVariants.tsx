"use client";

import { useMemo, useState } from "react";
import { trackProductEvent } from "@/lib/product-analytics";

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
  const firstAvailableColor =
    colors.find((item) => item.available)?.id ?? "";

  const [selectedSizeId, setSelectedSizeId] = useState(
    sizes[0]?.id ?? ""
  );
  const [selectedColorId, setSelectedColorId] = useState(
    firstAvailableColor
  );
  const [message, setMessage] = useState("");

  const selectedSize = useMemo(
    () => sizes.find((item) => item.id === selectedSizeId),
    [sizes, selectedSizeId]
  );

  const selectedColor = useMemo(
    () => colors.find((item) => item.id === selectedColorId),
    [colors, selectedColorId]
  );

  const canOrder =
    Boolean(selectedSize) &&
    Boolean(selectedColor) &&
    Boolean(selectedColor?.available);

  function formatPrice(price: number) {
    return new Intl.NumberFormat("ru-RU").format(price) + " so‘m";
  }

  function handleAddToCart() {
    if (!selectedSize || !selectedColor || !selectedColor.available) {
      setMessage("Iltimos, o‘lcham va mavjud rangni tanlang.");
      return;
    }

    const cartKey = "forma3d-cart";

    try {
      const saved = localStorage.getItem(cartKey);
      const parsed = saved ? JSON.parse(saved) : [];
      const cart = Array.isArray(parsed) ? parsed : [];

      const existingIndex = cart.findIndex(
        (item) =>
          item.id === product.id &&
          item.size_id === selectedSize.id &&
          item.color_id === selectedColor.id
      );

      if (existingIndex >= 0) {
        cart[existingIndex].quantity += 1;
      } else {
        cart.push({
          id: product.id,
          name: product.name,
          slug: product.slug,
          image_url: product.image_url,
          quantity: 1,
          size_id: selectedSize.id,
          size_label: selectedSize.label,
          color_id: selectedColor.id,
          color_name: selectedColor.name,
          price: selectedSize.price,
        });
      }

      localStorage.setItem(cartKey, JSON.stringify(cart));
      trackProductEvent(product.id, "add_to_cart");
      window.dispatchEvent(new Event("forma3d-cart-updated"));
      setMessage("Mahsulot savatchaga qo‘shildi.");
    } catch {
      setMessage("Savatchaga qo‘shishda xatolik yuz berdi.");
    }
  }

  return (
    <section className="formaVariants">
      <div className="formaMainPrice">
        {selectedSize
          ? formatPrice(selectedSize.price)
          : "Narx mavjud emas"}
      </div>

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
                (selectedSizeId === size.id ? "selected" : "")
              }
              onClick={() => {
                setSelectedSizeId(size.id);
                setMessage("");
              }}
            >
              {size.label}
            </button>
          ))}
        </div>
      </div>

      <div className="formaOptionGroup">
        <div className="formaOptionHeader">
          <h3>Rang</h3>
          <span>
            {selectedColor?.name ?? "Tanlanmagan"}
          </span>
        </div>

        <div className="formaColorGrid">
          {colors.map((color) => {
            const isSelected = selectedColorId === color.id;
            const isUnavailable = !color.available;

            return (
              <button
                key={color.id}
                type="button"
                disabled={isUnavailable}
                title={
                  isUnavailable
                    ? `${color.name} — sotuvda yo‘q`
                    : color.name
                }
                className={
                  "formaColorButton " +
                  (isSelected ? "selected " : "") +
                  (isUnavailable ? "unavailable" : "")
                }
                onClick={() => {
                  setSelectedColorId(color.id);
                  setMessage("");
                }}
              >
                <span
                  className="formaColorSwatch"
                  style={{ background: (color.swatch_colors?.length || 0) > 1
                    ? `linear-gradient(105deg, ${(color.swatch_colors || [color.hex_code]).map((hex, i, all) => `${hex} ${Math.round(i / all.length * 100)}%, ${hex} ${Math.round((i + 1) / all.length * 100)}%`).join(", ")})`
                    : color.hex_code }}
                />
                <span className="formaColorName">
                  {color.name}
                </span>
                {isUnavailable && (
                  <span className="formaSoldOut">
                    Tugagan
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="formaSelectedVariant">
        <span>Tanlangan variant</span>
        <strong>
          {selectedSize?.label ?? "—"} ·{" "}
          {selectedColor?.name ?? "—"}
        </strong>
      </div>

      <button
        type="button"
        className="formaAddToCart"
        disabled={!canOrder}
        onClick={handleAddToCart}
      >
        {canOrder
          ? "Savatchaga qo‘shish"
          : "Hozircha sotuvda yo‘q"}
      </button>

      {message && (
        <p className="formaVariantMessage">{message}</p>
      )}
    </section>
  );
}