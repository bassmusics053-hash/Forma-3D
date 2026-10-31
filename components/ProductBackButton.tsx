"use client";

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
      router.replace(`/products/${encodeURIComponent(from)}`);
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
