import type { Metadata } from "next";

import "./globals.css";
import "./extra.css";
import "./forma3d.css";
import "./admin/admin.css";
import "../components/product-variants.css";


const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "FORMA 3D — 3D bosma mahsulotlar", template: "%s | FORMA 3D" },
  description: "FORMA 3D: shaxmat figuralari, 3D dekor, telefon va noutbuk stendlari, sovg‘alar va individual buyurtmalar. O‘zbekiston bo‘ylab.",
  keywords: ["FORMA 3D", "3D printer Toshkent", "3D bosma", "3D печать Узбекистан", "shaxmat figuralari", "PLA", "PETG", "3D mahsulotlar"],
  applicationName: "FORMA 3D",
  openGraph: { type: "website", locale: "uz_UZ", siteName: "FORMA 3D", title: "FORMA 3D — G‘oyadan tayyor mahsulotgacha", description: "3D printerda tayyorlangan dizaynlar va individual buyurtmalar.", images: [{ url: "/forma3d-brand.webp", alt: "FORMA 3D" }] },
  icons: { icon: "/favicon.png", apple: "/favicon.png" },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="uz" suppressHydrationWarning><body className="dark">{children}</body></html>;
}
