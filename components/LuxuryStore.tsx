"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import "./luxury-store.css";

type Product = { id: string; name: string; slug: string; sku?: string; price: number; old_price?: number | null; image_url?: string | null; category?: { slug: string; name: string } | null; quantity?: number; size_id?: string; color_id?: string; size_label?: string; color_name?: string };
type Category = { id: string; name: string; slug: string; image_url?: string | null };
type Offer = { id: string; ends_at: string; offer_price: number; original_price: number; product: Product | Product[] };
const money = (n: number) => `${Number(n || 0).toLocaleString("ru-RU")} so‘m`;
const visuals = ["/luxury/prod-figure.webp", "/luxury/prod-phone.webp", "/luxury/prod-dragon.webp", "/luxury/prod-organizer.webp", "/luxury/prod-headphones.webp", "/luxury/prod-planter.webp"];
const categoryArt = ["/luxury/cat-chess.webp", "/luxury/cat-stands.webp", "/luxury/cat-decor.webp", "/luxury/cat-headphones.webp"];
const icons = { cart: "🛒", arrow: "↗" };

export default function LuxuryStore() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [showAll, setShowAll] = useState(false);
  const [clock, setClock] = useState(Date.now());

  useEffect(() => {
    const load = async <T,>(url: string, setter: (data: T[]) => void) => {
      try { const r = await fetch(url, { cache: "no-store" }); if (!r.ok) return; const json = await r.json(); if (Array.isArray(json)) setter(json); } catch { /* Fallback to empty / demo if unavailable */ }
    };
    void load<Product>("/api/products", setProducts);
    void load<Category>("/api/categories", setCategories);
    void load<Offer>("/api/daily-offers", setOffers);
    const tick = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  const currentOffers = useMemo(() => offers.map(o => ({ ...o, product: Array.isArray(o.product) ? o.product[0] : o.product })).filter(o => o.product && new Date(o.ends_at).getTime() > clock && Number(o.offer_price) < Number(o.original_price)), [offers, clock]);
  const priceOf = (p: Product) => currentOffers.find(o => o.product.id === p.id)?.offer_price ?? Number(p.price);
  const chosen = products.filter(p => (category === "all" || p.category?.slug === category) && `${p.name} ${p.category?.name || ""}`.toLowerCase().includes(query.toLowerCase()));
  const visible = showAll || category !== "all" || query ? chosen : chosen.slice(0, 6);
  // All products have size and color choices; choose variant on product detail page.
  const add = (p: Product) => { window.location.href = `/products/${encodeURIComponent(p.slug)}`; };
  const categoryPick = (slug: string) => { setCategory(slug); setShowAll(true); setMenuOpen(false); document.getElementById("products")?.scrollIntoView({ behavior: "smooth" }); };
  const mainOffer = currentOffers[0];
  const seconds = mainOffer ? Math.max(0, Math.floor((new Date(mainOffer.ends_at).getTime() - clock) / 1000)) : 0;
  const countdown = `${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${String(Math.floor(seconds % 3600 / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return <div className="luxury-site">
    <header className="lux-header" id="top"><div className="lux-container lux-nav">
      <a className="lux-logo" href="#top" aria-label="FORMA 3D bosh sahifa"><img src="/forma3d-brand.webp" alt="FORMA 3D" /></a>
      <nav className={menuOpen ? "lux-navlinks open" : "lux-navlinks"} aria-label="Asosiy menyu">
        <a className="active" href="#top" onClick={() => setMenuOpen(false)}>Bosh sahifa</a><a href="#products" onClick={() => setMenuOpen(false)}>Mahsulotlar</a><a href="#categories" onClick={() => setMenuOpen(false)}>Kategoriyalar</a><a href="#offers" onClick={() => setMenuOpen(false)}>Kun takliflari</a><a href="#about" onClick={() => setMenuOpen(false)}>Biz haqimizda</a><a href="#contact" onClick={() => setMenuOpen(false)}>Aloqa</a>
      </nav><div className="lux-actions"><button className="lux-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menyuni ochish">☰</button></div>
    </div></header>
    <main>
      <section className="lux-hero"><div className="lux-container lux-hero-grid"><div className="lux-hero-copy"><p className="lux-eyebrow">G‘OYANGIZNI HAQIQATGA AYLANTIRAMIZ</p><h1><span>3D bosma</span> mahsulotlar — premium sifat va <em>zamonaviy dizayn</em></h1><p className="lux-lead">Shaxsiy va biznes ehtiyojlaringiz uchun sifatli 3D bosma mahsulotlar. Individual dizayn, aniqlik va zamonaviy texnologiyalar.</p><div className="lux-hero-buttons"><a className="lux-btn primary" href="#products">Mahsulotlarni ko‘rish <span>→</span></a><a className="lux-btn secondary" href="#products">Buyurtma berish <span>↗</span></a></div><div className="lux-benefits"><span>◇ Yuqori sifat</span><span>↗ Tez yetkazish</span><span>⬡ Individual dizayn</span></div></div><div className="lux-hero-visual"><img src="/luxury/hero.webp" alt="Premium 3D bosma mahsulotlar kompozitsiyasi"/><span className="lux-visual-label">FORMA 3D / PREMIUM COLLECTION</span></div></div></section>
      <section className="lux-section lux-container" id="categories"><div className="lux-heading"><div><p className="lux-kicker">KOLLEKSIYALAR</p><h2>Kategoriyalar</h2><p>O‘zingizga mos 3D mahsulotlarni tanlang</p></div><a className="lux-text-link" href="#products">Barchasini ko‘rish →</a></div><div className="lux-category-grid">{(categories.length ? categories.slice(0, 4) : [{id:"a",name:"Shaxmat",slug:"chess"},{id:"b",name:"Aksessuarlar",slug:"stands"},{id:"c",name:"Dekor",slug:"decor"},{id:"d",name:"Stendlar",slug:"desk"}]).map((c,i)=><button className="lux-category" key={c.id} onClick={() => categoryPick(c.slug)}><img src={categoryArt[i] || c.image_url || "/luxury/cat-chess.webp"} alt={c.name}/><span className="lux-category-info"><strong>{c.name}</strong><small>To‘plamni ko‘rish</small></span><span className="lux-round-arrow">↗</span></button>)}</div></section>
      <section className="lux-section lux-container" id="offers"><div className="lux-offer"><div className="lux-offer-copy"><div className="lux-offer-line"><span className="lux-kicker">MAXSUS TAKLIF</span>{mainOffer && <span className="lux-timer">◷ {countdown} qoldi</span>}</div><h2>Kun takliflari</h2>{mainOffer ? <><h3>{mainOffer.product.name}</h3><p>Cheklangan muddatga maxsus narx. O‘zingiz yoqtirgan mahsulotni qulayroq narxda xarid qiling.</p><div className="lux-prices"><del>{money(mainOffer.original_price)}</del><strong>{money(mainOffer.offer_price)}</strong><span>-{Math.round((1-mainOffer.offer_price/mainOffer.original_price)*100)}%</span></div><button className="lux-btn primary" onClick={() => add(mainOffer.product)}>Variantlarni ko‘rish →</button></> : <><h3>Premium mahsulotlar — o‘zgacha narxlarda</h3><p>Bu yerda admin panelda faollashtirilgan chegirmali mahsulotlar ko‘rinadi. Yangi takliflarni kuzatib boring.</p><a className="lux-btn primary" href="#products">Mahsulotlarni ko‘rish →</a></>}</div><div className="lux-offer-img"><img src="/luxury/offer.webp" alt="Kun takliflari — shaxmat to‘plami"/></div><div className="lux-offer-points"><span>♛ <b>Premium dizayn</b><small>Noyob ko‘rinish</small></span><span>⬡ <b>Yuqori sifat</b><small>Mustahkam materiallar</small></span><span>✧ <b>Ajoyib sovg‘a</b><small>Har qanday vaziyat uchun</small></span></div></div></section>
      <section className="lux-section lux-container" id="products"><div className="lux-heading"><div><p className="lux-kicker">FORMA 3D KATALOGI</p><h2>Mahsulotlar</h2><p>Siz uchun tanlangan zamonaviy 3D mahsulotlar</p></div><button className="lux-text-link" onClick={() => {setCategory("all");setQuery("");setShowAll(!showAll);}}>{showAll ? "Kamroq ko‘rish" : "Barchasini ko‘rish"} →</button></div><div className="lux-filters"><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Mahsulot qidirish..." aria-label="Mahsulot qidirish"/><select value={category} onChange={e => setCategory(e.target.value)} aria-label="Kategoriya tanlash"><option value="all">Barcha kategoriyalar</option>{categories.map(c => <option value={c.slug} key={c.id}>{c.name}</option>)}</select></div><div className="lux-products">{visible.map((p,i)=>{const effective = priceOf(p);const discount = effective < p.price; return <article className="lux-product" key={p.id}><Link href={`/products/${p.slug}`} className="lux-product-image"><img src={products.length <= 8 && p.id.startsWith("demo-") ? visuals[i % visuals.length] : p.image_url || visuals[i % visuals.length]} alt={p.name}/><span className="lux-hover-view">Batafsil ↗</span></Link><div className="lux-product-details"><div><Link href={`/products/${p.slug}`}>{p.name}</Link>{p.sku && <small className="lux-product-sku">SKU: {p.sku}</small>}<div className="lux-product-price">{discount && <del>{money(p.price)}</del>}<strong>{money(effective)}</strong></div></div><button onClick={() => add(p)} aria-label={`${p.name} variantlarini tanlash`}>↗</button></div></article>})}</div>{!visible.length && <div className="lux-empty">Hozircha mahsulot topilmadi. Kategoriyani o‘zgartirib ko‘ring.</div>}{!showAll && !query && category === "all" && products.length > 6 && <button className="lux-more" onClick={() => setShowAll(true)}>Barcha mahsulotlarni ko‘rish →</button>}</section>
      <section className="lux-section lux-container" id="about"><div className="lux-heading"><div><p className="lux-kicker">TEXNOLOGIYA VA SIFAT</p><h2>Materiallar va sifat</h2><p>Har bir loyiha uchun mos material</p></div></div><div className="lux-material-grid">{[{name:"PLA",image:"pla",desc:"Dekor va kundalik aksessuarlar uchun",items:["Silliq sirt","Aniq detallar"]},{name:"PETG",image:"petg",desc:"Mustahkam funksional mahsulotlar",items:["Namlikka chidamli","Bardavom"]},{name:"ABS",image:"abs",desc:"Texnik buyumlar uchun",items:["Yuqori mustahkamlik","Issiqqa chidamli"]},{name:"TPU",image:"tpu",desc:"Egiluvchan buyumlar uchun",items:["Elastik","Zarbaga chidamli"]}].map(m => <div className="lux-material" key={m.name}><img src={`/luxury/material-${m.image}.webp`} alt={`${m.name} filament`}/><div><h3>{m.name}</h3><p>{m.desc}</p>{m.items.map(t => <small key={t}>✓ {t}</small>)}</div></div>)}</div><div className="lux-trust"><div>♧ <span><b>Tez yetkazib berish</b><small>O‘zbekiston bo‘ylab</small></span></div><div>⬡ <span><b>Individual buyurtma</b><small>G‘oyangiz asosida</small></span></div><div>◇ <span><b>Yuqori sifat</b><small>Har bir detalda aniqlik</small></span></div><div>⚙ <span><b>Zamonaviy uskunalar</b><small>Professional 3D printerlar</small></span></div></div></section>
    </main>
    <footer className="lux-footer" id="contact"><div className="lux-container lux-footer-grid"><div><img src="/forma3d-brand.webp" alt="FORMA 3D"/><p>G‘oyalaringizga yangi shakl beramiz. Dizayn, sifat va innovatsiya bir joyda.</p></div><div><h3>Tezkor havolalar</h3><a href="#top">Bosh sahifa</a><a href="#products">Mahsulotlar</a><a href="#offers">Kun takliflari</a><a href="#about">Biz haqimizda</a></div><div><h3>Aloqa</h3><p>Telegram va Instagram orqali biz bilan bog‘laning. Kontaktlar saytingiz sozlamalaridan qo‘shiladi.</p></div><div><h3>FORMA 3D</h3><p>3D PRINTING STUDIO</p><a href="#products" className="lux-text-link">Katalogni ko‘rish ↗</a></div></div><div className="lux-container lux-copyright"><span>© {new Date().getFullYear()} FORMA 3D. Barcha huquqlar himoyalangan.</span><span>G‘oyadan — haqiqiy mahsulotgacha.</span></div></footer>


  </div>;
}
