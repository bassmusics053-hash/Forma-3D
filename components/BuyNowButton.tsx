"use client";
import { trackProductEvent } from "@/lib/product-analytics";
type BuyNowProduct = {
  id: string;
  name: string;
  slug?: string | null;
  image_url?: string | null;
  price: number;
  stock: number;
};

type CartItem = BuyNowProduct & {
  quantity: number;
};

type BuyNowButtonProps = {
  product: BuyNowProduct;
};

export default function BuyNowButton({
  product,
}: BuyNowButtonProps) {
  function buyNow() {
    if (Number(product.stock) < 1) {
      alert("Bu mahsulot hozircha omborda yo‘q.");
      return;
    }
trackProductEvent(product.id, "buy_now");
    try {
      const savedCart = window.localStorage.getItem(
        "forma3d-cart"
      );

      const oldCart: unknown = savedCart
        ? JSON.parse(savedCart)
        : [];

      const cart: CartItem[] = Array.isArray(oldCart)
        ? oldCart
        : [];

      const oldItem = cart.find(
        (item) => item.id === product.id
      );

      if (oldItem) {
        oldItem.quantity = Math.min(
          Number(oldItem.quantity || 1) + 1,
          Number(product.stock)
        );
      } else {
        cart.push({
          id: product.id,
          name: product.name,
          slug: product.slug || null,
          image_url: product.image_url || null,
          price: Number(product.price || 0),
          stock: Number(product.stock || 0),
          quantity: 1,
        });
      }

      window.localStorage.setItem(
        "forma3d-cart",
        JSON.stringify(cart)
      );

      window.location.href = "/checkout";
    } catch {
      alert(
        "Mahsulotni savatga qo‘shib bo‘lmadi. Qaytadan urinib ko‘ring."
      );
    }
  }

  return (
    <button
      type="button"
      className="telegramOrder"
      onClick={buyNow}
      disabled={Number(product.stock) < 1}
    >
      {Number(product.stock) > 0
        ? "Hozirroq buyurtma berish"
        : "Omborda yo‘q"}
    </button>
  );
}