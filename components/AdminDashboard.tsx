"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";


import AdminOrders from "./AdminOrders";
import { readApiJson } from "@/lib/api-response";
import ThemeButton from "./ThemeButton";

type Section =
  | "dashboard"
  | "daily-offers"
  | "products"
  | "categories"
  | "analytics"
  | "orders"
  | "settings";

type Item = {
  id?: string;
  name: string;
  sku?: string;
  slug?: string;
  price?: number;
  old_price?: number;
  description?: string;
  image_url?: string;
  images?: string[];
  category_id?: string;
  active: boolean;
  category?: { id?: string; name: string } | null;
  sizes?: ProductSize[];
  colors?: ProductColor[];
};

type ProductSize = { id?: string; label: string; price: number; sort_order?: number };
type ProductColor = { id?: string; name: string; hex_code: string; swatch_colors: string[]; available: boolean; sort_order?: number };
const newSize = (): ProductSize => ({ label: "", price: 0 });
const newColors = (): ProductColor[] => ([
  { name: "Qora + oq", hex_code: "#1d1d1d", swatch_colors: ["#1d1d1d", "#f5f5f5"], available: true },
  { name: "Oltin + qora", hex_code: "#d8a23c", swatch_colors: ["#d8a23c", "#1d1d1d"], available: true },
  { name: "Oq + oltin", hex_code: "#f5f5f5", swatch_colors: ["#f5f5f5", "#d8a23c"], available: true },
]);

type DailyOffer = { id:string; product_id:string; starts_at:string; ends_at:string; active:boolean; offer_price:number; original_price:number; product?: {id:string; name:string; image_url?:string|null; price:number; slug:string; active:boolean} | null };

type Settings = {
  telegram_url?: string;
  instagram_url?: string;
  phone?: string;
  google_maps_url?: string;
  apple_maps_url?: string;
  phone_2?: string;
  telegram_channel_url?: string;
};

type AnalyticsItem = {
  product_id: string;
  name: string;
  image_url?: string | null;
  views_total: number;
  views_7d: number;
  views_30d: number;
  unique_visitors: number;
  buy_now_total: number;
  buy_now_7d: number;
  buy_now_30d: number;
};

const emptyProduct: Item = {
  name: "",
  slug: "",
  price: 0,
  old_price: 0,
  description: "",
  image_url: "",
  images: [],
  category_id: "",
  active: true,
  sizes: [newSize()],
  colors: newColors(),
};

const emptySimpleItem: Item = {
  name: "",
  slug: "",
  description: "",
  image_url: "",
  active: true,
};

export default function AdminDashboard() {
  const [section, setSection] = useState<Section>("dashboard");

  const [offers, setOffers] = useState<DailyOffer[]>([]);
  const [offerProductId,setOfferProductId] = useState("");
  const [offerDays,setOfferDays] = useState<1|3|5|7>(1);
  const [offerBusy,setOfferBusy] = useState(false);
  const [offerPrice,setOfferPrice] = useState("");
  const [offerFormOpen,setOfferFormOpen] = useState(false);
  const [offerMessage,setOfferMessage] = useState("");
  const [products, setProducts] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Item[]>([]);
  const [settings, setSettings] = useState<Settings>({});
  const [analytics, setAnalytics] = useState<AnalyticsItem[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [chartDays, setChartDays] = useState<7 | 30>(7);
  const [dailyStats, setDailyStats] = useState<{date:string; views:number; carts:number; ordered:number}[]>([]);
  const [topProducts, setTopProducts] = useState<{name:string; views:number; carts:number; ordered:number}[]>([]);

  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [savedPopup, setSavedPopup] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newOrdersCount, setNewOrdersCount] = useState(0);

  async function request(url: string, options?: RequestInit) {
    const response = await fetch(url, options);
    return readApiJson(response);
  }

  async function loadOffers(){
    try { const data=await request("/api/admin/daily-offers",{cache:"no-store"}); setOffers(Array.isArray(data)?data:[]); }
    catch(err){setError(err instanceof Error?err.message:"Takliflarni yuklab bo‘lmadi");}
  }
  async function saveOffer(){
    const original=Number(products.find(p=>p.id===offerProductId)?.price);
    const discounted=Number(offerPrice);
    if(!offerProductId){setOfferMessage("Avval mahsulot tanlang");return;}
    if(!offerPrice.trim() || !Number.isFinite(discounted) || discounted<=0 || !Number.isSafeInteger(discounted) || discounted>=original){
      setOfferMessage("Summani qayta kiriting. Yangi narx eski narxdan arzon bo‘lishi kerak.");return;
    }
    setOfferBusy(true);setOfferMessage("");setError("");
    try {
      await request("/api/admin/daily-offers",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({product_id:offerProductId,days:offerDays,offer_price:discounted})});
      await loadOffers();setOfferMessage("Muvaffaqiyatli saqlandi ✓");
      window.setTimeout(()=>{setOfferFormOpen(false);setOfferMessage("");setOfferProductId("");setOfferPrice("");setOfferDays(1);},500);
    } catch(err){setOfferMessage(err instanceof Error?err.message:"Saqlashda xatolik");}
    finally{setOfferBusy(false);}
  }
  async function stopOffer(id:string){
    if(!confirm("Ushbu taklifni to‘xtatasizmi?"))return;
    setOfferBusy(true);setError("");
    try{await request(`/api/admin/daily-offers?id=${encodeURIComponent(id)}`,{method:"DELETE"});await loadOffers();setSuccess("Taklif to‘xtatildi");}
    catch(err){setError(err instanceof Error?err.message:"To‘xtatib bo‘lmadi");}
    finally{setOfferBusy(false);}
  }

  async function loadProducts() {
    try {
      const data = await request("/api/admin/products");
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? `Mahsulotlar: ${err.message}`
          : "Mahsulotlarni yuklab bo‘lmadi"
      );
    }
  }

  async function loadCategories() {
    try {
      const data = await request("/api/admin/categories");
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? `Kategoriyalar: ${err.message}`
          : "Kategoriyalarni yuklab bo‘lmadi"
      );
    }
  }

  async function loadSettings() {
    try {
      const data = await request("/api/admin/settings");
      setSettings(data || {});
    } catch (err) {
      console.error("Sozlamalarni yuklashda xatolik:", err);
    }
  }

  async function loadAnalytics() {
    try {
      setAnalyticsLoading(true);

      const data = await request("/api/admin/analytics", {
        cache: "no-store",
      });

      setAnalytics(Array.isArray(data?.products) ? data.products : Array.isArray(data) ? data : []);
      setDailyStats(Array.isArray(data?.daily) ? data.daily : []);
      setTopProducts(Array.isArray(data?.top) ? data.top : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? `Statistika: ${err.message}`
          : "Statistikani yuklab bo‘lmadi"
      );
    } finally {
      setAnalyticsLoading(false);
    }
  }

  async function loadAll() {
    setError("");

    // Bitta bo‘lim xato bersa boshqalari to‘xtab qolmaydi
    await Promise.allSettled([
      loadProducts(),
      loadOffers(),
      loadCategories(),
      loadSettings(),
      loadAnalytics(),
    ]);
  }

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    let active = true;

    async function checkNewOrders() {
      try {
        const response = await fetch("/api/admin/orders", {
          cache: "no-store",
        });

        if (!response.ok) return;

        const result = await readApiJson(response);
        const orders = Array.isArray(result)
          ? result
          : Array.isArray(result?.orders)
            ? result.orders
            : [];

        if (active) {
          setNewOrdersCount(
            orders.filter(
              (order: { status?: string }) => order.status === "new"
            ).length
          );
        }
      } catch (notificationError) {
        console.error(
          "Yangi buyurtmalarni tekshirishda xatolik:",
          notificationError
        );
      }
    }

    checkNewOrders();

    const intervalId = window.setInterval(checkNewOrders, 15000);

    function checkWhenFocused() {
      checkNewOrders();
    }

    window.addEventListener("focus", checkWhenFocused);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", checkWhenFocused);
    };
  }, []);

  const currentItems = useMemo(() => {
    if (section === "products") return products;
    if (section === "categories") return categories;

    return [];
  }, [section, products, categories]);

  const filteredItems = useMemo(() => {
    return currentItems.filter((item) =>
      item.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [currentItems, search]);

  const analyticsTotals = useMemo(() => {
    return analytics.reduce(
      (totals, item) => ({
        views7d:
          totals.views7d + Number(item.views_7d || 0),
        views30d:
          totals.views30d + Number(item.views_30d || 0),
        uniqueVisitors:
          totals.uniqueVisitors +
          Number(item.unique_visitors || 0),
        buyNow:
          totals.buyNow + Number(item.buy_now_total || 0),
      }),
      {
        views7d: 0,
        views30d: 0,
        uniqueVisitors: 0,
        buyNow: 0,
      }
    );
  }, [analytics]);

  function openAddModal() {
    setError("");
    setSuccess("");

    if (section === "products") {
      setEditing({ ...emptyProduct, sizes: [newSize()], colors: newColors() });
    } else {
      setEditing({ ...emptySimpleItem });
    }

    setModalOpen(true);
  }

  function openEditModal(item: Item) {
    setError("");
    setSuccess("");

    setEditing({
      ...item,
      category_id: item.category_id || item.category?.id || "",
      images: item.images || [],
      sizes: (item.sizes || []).map(x => ({ ...x })),
      colors: (item.colors || []).map(x => ({ ...x, swatch_colors: [...(x.swatch_colors?.length ? x.swatch_colors : [x.hex_code || "#333333"])] })),
    });

    setModalOpen(true);
  }

  function updateEditing(
    field: keyof Item,
    value: string | number | boolean | string[]
  ) {
    setEditing((current) => {
      if (!current) return current;

      return {
        ...current,
        [field]: value,
      };
    });
  }

  function updateSize(index: number, patch: Partial<ProductSize>) {
    setEditing(cur => cur ? ({ ...cur, sizes: (cur.sizes || []).map((x, i) => i === index ? { ...x, ...patch } : x) }) : cur);
  }
  function updateColor(index: number, patch: Partial<ProductColor>) {
    setEditing(cur => cur ? ({ ...cur, colors: (cur.colors || []).map((x, i) => i === index ? { ...x, ...patch } : x) }) : cur);
  }
  function changeSwatch(index: number, swatchIndex: number, hex: string) {
    setEditing(cur => cur ? ({ ...cur, colors: (cur.colors || []).map((c, i) => i === index ? {
      ...c, swatch_colors: c.swatch_colors.map((swatch, j) => j === swatchIndex ? hex : swatch),
      hex_code: swatchIndex === 0 ? hex : c.hex_code,
    } : c) }) : cur);
  }

  async function uploadImages(files: File[]) {
    if (!files.length) return [];

    const formData = new FormData();

    files.forEach((file) => {
      formData.append("files", file);
    });

    const response = await fetch("/api/admin/upload", {
      method: "POST",
      body: formData,
    });

    const result = await readApiJson(response);

    return result.urls as string[];
  }

  async function handleMainImage(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      setUploading(true);
      setError("");

      const urls = await uploadImages([file]);

      if (urls[0]) {
        updateEditing("image_url", urls[0]);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Rasm yuklashda xatolik"
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function handleGalleryImages(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(event.target.files || []);

    if (!files.length) return;

    if (files.length > 6) {
      setError("Bir martada ko‘pi bilan 6 ta rasm tanlang");
      event.target.value = "";
      return;
    }

    try {
      setUploading(true);
      setError("");

      const urls = await uploadImages(files);

      setEditing((current) => {
        if (!current) return current;

        const oldImages = current.images || [];
        const newImages = [...oldImages, ...urls].slice(0, 6);

        return {
          ...current,
          images: newImages,
        };
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Rasmlarni yuklashda xatolik"
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  function removeGalleryImage(index: number) {
    setEditing((current) => {
      if (!current) return current;

      return {
        ...current,
        images: (current.images || []).filter(
          (_, imageIndex) => imageIndex !== index
        ),
      };
    });
  }

  async function saveItem(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();

  if (!editing || section === "settings") {
    return;
  }

  try {
    setSaving(true);
    setError("");
    setSuccess("");

    const method = editing.id ? "PUT" : "POST";

    await request(`/api/admin/${section}`, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(editing),
    });

    /*
     * Avval yangilangan ro‘yxatni olib kelamiz.
     * Shundan keyingina success oynasi chiqadi.
     */
    if (section === "products") {
      await loadProducts();
    }


    if (section === "categories") {
      await loadCategories();
    }

    setModalOpen(false);
    setEditing(null);

    setSavedPopup(
      section === "products"
        ? "Mahsulot muvaffaqiyatli saqlandi!"
        : "Kategoriya muvaffaqiyatli saqlandi!"
    );
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Saqlashda xatolik yuz berdi"
    );
  } finally {
    setSaving(false);
  }
}

  async function deleteItem(item: Item) {
    if (!item.id) return;

    const confirmed = window.confirm(
      `"${item.name}" o‘chirilsinmi?`
    );

    if (!confirmed) return;

    try {
      setError("");

      await request(
        `/api/admin/${section}?id=${encodeURIComponent(item.id)}`,
        {
          method: "DELETE",
        }
      );

      if (section === "products") await loadProducts();
      if (section === "categories") await loadCategories();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "O‘chirishda xatolik"
      );
    }
  }

  async function toggleActive(item: Item) {
    if (!item.id) return;

    try {
      setError("");

      await request(`/api/admin/${section}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...item,
          active: !item.active,
          images: item.images || [],
        }),
      });

      if (section === "products") await loadProducts();
      if (section === "categories") await loadCategories();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Holatni o‘zgartirib bo‘lmadi"
      );
    }
  }

  async function saveSettings(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const formData = new FormData(event.currentTarget);

      await request("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(Object.fromEntries(formData)),
      });

      setSuccess("Sozlamalar muvaffaqiyatli saqlandi");
      await loadSettings();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Sozlamalarni saqlab bo‘lmadi"
      );
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", {
      method: "POST",
    });

    window.location.href = "/admin";
  }

  return (
    <div className="admin">
      <aside className="side">
        <img src="/forma3d-brand.webp" alt="FORMA 3D" />

        <nav>
          <button className={section === "dashboard" ? "active" : ""} onClick={() => {setSection("dashboard");setError("");void loadAnalytics();}}>▦ Dashboard</button>
          <button className={section === "daily-offers" ? "active" : ""} onClick={()=>{setSection("daily-offers");setError("");setSuccess("");void loadOffers();}}>⚡ Kun takliflari</button>
          <button
            className={section === "products" ? "active" : ""}
            onClick={() => {
              setSection("products");
              setSearch("");
              setError("");
            }}
          >
            ▤ Mahsulotlar
          </button>

          <button
            className={section === "categories" ? "active" : ""}
            onClick={() => {
              setSection("categories");
              setSearch("");
              setError("");
            }}
          >
            ◫ Kategoriyalar
          </button>

          <button
            type="button"
            className={section === "analytics" ? "active" : ""}
            onClick={() => {
              setSection("analytics");
              setSearch("");
              setError("");
              setSuccess("");
              void loadAnalytics();
            }}
          >
            📊 Qiziqish statistikasi
          </button>

          <button
            type="button"
            className={`adminOrdersMenuButton ${
              section === "orders" ? "active" : ""
            }`}
            onClick={() => {
              setSection("orders");
              setSearch("");
              setError("");
              setSuccess("");
            }}
          >
            <span className="adminOrderMenuText">🧾 Buyurtmalar</span>

            {newOrdersCount > 0 && (
              <span
                className="adminOrderNotification"
                title={`${newOrdersCount} ta yangi buyurtma`}
                aria-label={`${newOrdersCount} ta yangi buyurtma`}
              >
                {newOrdersCount > 99 ? "99+" : newOrdersCount}
              </span>
            )}
          </button>

          <button
            type="button"
            className={section === "settings" ? "active" : ""}
            onClick={() => {
              setSection("settings");
              setSearch("");
              setError("");
            }}
          >
            ⚙ Sozlamalar
          </button>

          <a href="/" target="_blank" rel="noreferrer">
            ↗ Do‘konni ochish
          </a>
        </nav>
      </aside>

      <main className="adminMain">
        <header className="adminTop">
          <h1>
            {section === "dashboard" && "Dashboard"}
            {section === "daily-offers" && "Kun takliflari"}
            {section === "products" && "Mahsulotlar"}
            {section === "categories" && "Kategoriyalar"}
            {section === "analytics" && "Qiziqish statistikasi"}
            {section === "orders" && "Buyurtmalar"}
            {section === "settings" && "Sayt sozlamalari"}
          </h1>

          <button className="secondary" onClick={logout}>
            Chiqish
          </button>
        </header>

        <div className="content">
          {error && <div className="error flash">{error}</div>}

          {success && (
            <div className="success flash">{success} ✓</div>
          )}

          {section === "products" && (
            <section className="stats">
              <div className="stat"><span>Jami mahsulotlar</span><strong>{products.length}</strong></div>
              <div className="stat"><span>Faol mahsulotlar</span><strong>{products.filter(p => p.active).length}</strong></div>
              <div className="stat"><span>Kategoriyalar</span><strong>{categories.length}</strong></div>
              <div className="stat"><span>Rang kombinatsiyalari</span><strong>{products.reduce((n,p) => n + (p.colors?.length || 0), 0)}</strong></div>
            </section>
          )}

          {section === "daily-offers" ? (
            <div className="offerAdmin">
              <h2>⚡ Kun takliflari</h2>
              <p>Mahsulotga vaqtinchalik arzon narx belgilang. Taklif muddati tugaganda odatiy narx saqlanadi.</p>
              {!offerFormOpen ? <button type="button" className="primary" onClick={()=>{setOfferFormOpen(true);setOfferMessage("");}}>+ Yangi kun taklifi</button> : <div className="offerForm">
                <label>Mahsulot SKU raqami
                  <select value={offerProductId} onChange={e=>{setOfferProductId(e.target.value);setOfferPrice("");setOfferMessage("");}}>
                    <option value="">— SKU tanlang —</option>
                    {products.filter(p=>p.active&&p.id).map(p=><option key={p.id} value={p.id}>{p.sku || "SKU yo‘q"} — {p.name}</option>)}
                  </select>
                </label>
                <label>Mahsulotning asl narxi (so‘m)
                  <input readOnly aria-readonly="true" tabIndex={-1} className="lockedOfferPrice" value={offerProductId?Number(products.find(p=>p.id===offerProductId)?.price||0).toLocaleString("uz-UZ"):"SKU tanlang"} title="Asl narx mahsulotlar bazasidan avtomatik olinadi va bu yerda o‘zgartirilmaydi"/>
                  <small>🔒 Narx katalogdan avtomatik olinadi. O‘zgartirish mumkin emas.</small>
                </label>
                <label>Yangi narx (so‘m)<input type="number" min="1" step="1" value={offerPrice} onChange={e=>{setOfferPrice(e.target.value);setOfferMessage("");}} placeholder="Chegirmali narx" /></label>
                <label>Muddat
                  <select value={offerDays} onChange={e=>setOfferDays(Number(e.target.value) as 1|3|5|7)}>
                    {[1,3,5,7].map(d=><option key={d} value={d}>{d} kun</option>)}
                  </select>
                </label>
                {offerMessage && <div className={offerMessage.startsWith("Muvaffaqiyatli")?"offerSuccess":"offerError"} role="alert">{offerMessage}</div>}
                <button type="button" className="primary" disabled={offerBusy||!offerProductId} onClick={()=>void saveOffer()}>{offerBusy?"Saqlanmoqda...":"Saqlash"}</button>
                <button type="button" disabled={offerBusy} onClick={()=>{setOfferFormOpen(false);setOfferMessage("");}}>Bekor qilish</button>
              </div>}
              <h3>Belgilangan takliflar</h3>
              <div className="offerList">
                {offers.map(o=>{const live=o.active&&new Date(o.starts_at).getTime()<=Date.now()&&new Date(o.ends_at).getTime()>Date.now();return <div className="offerItem" key={o.id}>
                  {o.product?.image_url?<img src={o.product.image_url} alt=""/>:<span className="offerNoImage">📦</span>}
                  <div><strong>{o.product?.name||"O‘chirilgan mahsulot"}</strong><small><s>{Number(o.original_price).toLocaleString("uz-UZ")} so‘m</s> → <b>{Number(o.offer_price).toLocaleString("uz-UZ")} so‘m</b></small><small>{live?"🟢 Faol":o.active?"⌛ Muddati tugagan":"⛔ To‘xtatilgan"} · {new Date(o.ends_at).toLocaleString("uz-UZ")} gacha</small></div>
                  {live&&<button type="button" disabled={offerBusy} className="danger" onClick={()=>void stopOffer(o.id)}>To‘xtatish</button>}
                </div>})}
                {!offers.length&&<p>Hozircha takliflar yo‘q.</p>}
              </div>
            </div>
          ) : section === "dashboard" ? (
            <div className="dashboardWrap">
              <div className="dashHeading"><div><h2>FORMA 3D statistikasi</h2><p>Ko‘rilishlar, savatchaga qo‘shishlar va haqiqiy buyurtmalar</p></div><div className="dashControls"><button className={chartDays === 7 ? "chosen" : ""} onClick={() => setChartDays(7)}>7 kun</button><button className={chartDays === 30 ? "chosen" : ""} onClick={() => setChartDays(30)}>30 kun</button><button onClick={() => void loadAnalytics()} disabled={analyticsLoading}>↻ Yangilash</button></div></div>
              <section className="stats"><div className="stat"><span>Ko‘rilgan mahsulotlar</span><strong>{dailyStats.slice(-chartDays).reduce((s,d)=>s+d.views,0)}</strong></div><div className="stat"><span>Savatchaga qo‘shilganlar</span><strong>{dailyStats.slice(-chartDays).reduce((s,d)=>s+d.carts,0)}</strong></div><div className="stat"><span>Buyurtma berilgan mahsulotlar</span><strong>{dailyStats.slice(-chartDays).reduce((s,d)=>s+d.ordered,0)}</strong></div><div className="stat"><span>Mahsulotlar soni</span><strong>{products.length}</strong></div></section>
              <div className="dashCharts"><DailyChart title="Mahsulot ko‘rilishlari" accent="#ff7900" data={dailyStats.slice(-chartDays)} field="views"/><DailyChart title="Savatchaga qo‘shishlar" accent="#a347ff" data={dailyStats.slice(-chartDays)} field="carts"/><DailyChart title="Buyurtma qilingan tovarlar" accent="#19c4b0" data={dailyStats.slice(-chartDays)} field="ordered"/></div>
              <section className="dashTop"><h3>Eng mashhur mahsulotlar</h3><div className="table"><table><thead><tr><th>Mahsulot</th><th>Ko‘rishlar</th><th>Savatchaga</th><th>Buyurtma (dona)</th></tr></thead><tbody>{topProducts.slice(0,10).map((x,i)=><tr key={i}><td>{x.name}</td><td>{x.views}</td><td>{x.carts}</td><td>{x.ordered}</td></tr>)}{!topProducts.length&&<tr><td colSpan={4}>Hozircha ma’lumot yo‘q. Supabase ulangach statistika shu yerda chiqadi.</td></tr>}</tbody></table></div></section>
            </div>
          ) : section === "analytics" ? (
            <>
              <section className="stats">
                <div className="stat">
                  <span>Oxirgi 7 kun</span>
                  <strong>{analyticsTotals.views7d}</strong>
                </div>

                <div className="stat">
                  <span>Oxirgi 30 kun</span>
                  <strong>{analyticsTotals.views30d}</strong>
                </div>

                <div className="stat">
                  <span>Noyob ko‘rishlar</span>
                  <strong>{analyticsTotals.uniqueVisitors}</strong>
                </div>

                <div className="stat">
                  <span>Buyurtma tugmasi</span>
                  <strong>{analyticsTotals.buyNow}</strong>
                </div>
              </section>

              <section className="toolbar">
                <div>
                  Mahsulotlar qiziqish darajasi bo‘yicha tartiblangan
                </div>

                <button
                  type="button"
                  className="secondary"
                  onClick={() => void loadAnalytics()}
                  disabled={analyticsLoading}
                >
                  {analyticsLoading
                    ? "Yuklanmoqda..."
                    : "↻ Yangilash"}
                </button>
              </section>

              <div className="table">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Rasm</th>
                      <th>Mahsulot</th>
                      <th>7 kun</th>
                      <th>30 kun</th>
                      <th>Jami ko‘rish</th>
                      <th>Noyob</th>
                      <th>Buyurtma tugmasi</th>
                      <th>Qiziqish foizi</th>
                    </tr>
                  </thead>

                  <tbody>
                    {analytics.map((item, index) => {
                      const viewsTotal = Number(
                        item.views_total || 0
                      );
                      const buyNowTotal = Number(
                        item.buy_now_total || 0
                      );
                      const interestRate = viewsTotal
                        ? Math.min(
                            100,
                            (buyNowTotal / viewsTotal) * 100
                          )
                        : 0;

                      return (
                        <tr key={item.product_id}>
                          <td>
                            <strong>{index + 1}</strong>
                          </td>

                          <td>
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.name}
                                style={{
                                  width: 60,
                                  height: 60,
                                  objectFit: "contain",
                                  borderRadius: 10,
                                }}
                              />
                            ) : (
                              "Rasm yo‘q"
                            )}
                          </td>

                          <td>
                            <strong>{item.name}</strong>
                          </td>

                          <td>{Number(item.views_7d || 0)}</td>
                          <td>{Number(item.views_30d || 0)}</td>
                          <td>{viewsTotal}</td>
                          <td>
                            {Number(item.unique_visitors || 0)}
                          </td>
                          <td>{buyNowTotal}</td>
                          <td>{interestRate.toFixed(1)}%</td>
                        </tr>
                      );
                    })}

                    {!analyticsLoading && !analytics.length && (
                      <tr>
                        <td colSpan={9} className="empty">
                          Hozircha statistika yo‘q
                        </td>
                      </tr>
                    )}

                    {analyticsLoading && !analytics.length && (
                      <tr>
                        <td colSpan={9} className="empty">
                          Statistika yuklanmoqda...
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : section === "orders" ? (
            <AdminOrders />
          ) : section !== "settings" ? (
            <>
              <section className="toolbar">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Qidirish..."
                />

                <button
  type="button"
  className="primary"
  onClick={openAddModal}
>
  + Qo‘shish
</button>
              </section>

              <div className="table">
                <table>
                  <thead>
                    <tr>
                      <th>Rasm</th>
                      <th>Nomi</th>

                      {section === "products" && (
                        <>
                          <th>SKU</th>
                          <th>Boshlang‘ich narx</th>
                          <th>Kategoriya</th>
                          <th>Variantlar</th>
                        </>
                      )}

                      <th>Holati</th>
                      <th>Amallar</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredItems.map((item) => (
                      <tr key={item.id}>
                        <td>
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              style={{
                                width: 60,
                                height: 60,
                                objectFit: "contain",
                                borderRadius: 10,
                              }}
                            />
                          ) : (
                            "Rasm yo‘q"
                          )}
                        </td>

                        <td>
                          <b>{item.name}</b>
                        </td>

                        {section === "products" && (
                          <>
                            <td><code>{item.sku || "—"}</code></td>
                            <td>{Number(item.price || 0).toLocaleString("ru-RU")} so‘m</td>
                            <td>{item.category?.name || "—"}</td>
                            <td>{item.sizes?.length || 0} o‘lcham / {item.colors?.length || 0} rang</td>
                          </>
                        )}

                        <td>
                          <button
                            className={
                              item.active ? "pill on" : "pill"
                            }
                            onClick={() => toggleActive(item)}
                          >
                            {item.active ? "Faol" : "Yashirin"}
                          </button>
                        </td>

                        <td>
                          <div className="rowActions">
                            <button onClick={() => openEditModal(item)}>
                              Tahrirlash
                            </button>

                            <button
                              className="danger"
                              onClick={() => deleteItem(item)}
                            >
                              O‘chirish
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {!filteredItems.length && (
                      <tr>
                        <td
                          colSpan={section === "products" ? 8 : 4}
                          className="empty"
                        >
                          Hozircha ma’lumot yo‘q
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <form className="settingsCard" onSubmit={saveSettings}>
              <div className="field">
                <label>Telegram havolasi</label>
                <input
                  name="telegram_url"
                  defaultValue={settings.telegram_url || ""}
                  placeholder="https://t.me/username"
                />
              </div>
              <div className="field">
                <label>Telegram kanal havolasi</label>
                <input
                  name="telegram_channel_url"
                  type="text"
                  defaultValue={settings.telegram_channel_url || ""}
                  placeholder="https://t.me/kanal_nomi"
                />
              </div>



              <div className="field">
                <label>Instagram havolasi</label>
                <input
                  name="instagram_url"
                  defaultValue={settings.instagram_url || ""}
                  placeholder="https://instagram.com/username"
                />
              </div>

              <div className="field">
                <label>Telefon raqami</label>
                <input
                  name="phone"
                  defaultValue={settings.phone || ""}
                  placeholder="+998 90 123 45 67"
                />
              </div>
              <div className="field">
                <label>Ikkinchi telefon raqami</label>
                <input
                  name="phone_2"
                  type="tel"
                  defaultValue={settings.phone_2 || ""}
                  placeholder="+998 XX XXX XX XX"
                />
              </div>



              <div className="field">
                <label>Google Maps</label>
                <input
                  name="google_maps_url"
                  defaultValue={settings.google_maps_url || ""}
                />
              </div>

              <div className="field">
                <label>Apple Maps</label>
                <input
                  name="apple_maps_url"
                  defaultValue={settings.apple_maps_url || ""}
                />
              </div>

              <button className="primary" disabled={saving}>
                {saving ? "Saqlanmoqda..." : "Sozlamalarni saqlash"}
              </button>
            </form>
          )}
        </div>
      </main>
      {modalOpen && editing && (
        <div className="modalBg">
          <form className="modal" onSubmit={saveItem}>
            <h2>
              {editing.id ? "Tahrirlash" : "Yangi qo‘shish"}
            </h2>

            {error && <div className="error">{error}</div>}

            <div className="formGrid">
              <div className="field full">
                <label>Nomi</label>

                <input
                  required
                  value={editing.name}
                  onChange={(event) =>
                    updateEditing("name", event.target.value)
                  }
                />
              </div>

              <div className="field full">
                <label>Slug</label>

                <input
                  value={editing.slug || ""}
                  onChange={(event) =>
                    updateEditing("slug", event.target.value)
                  }
                  placeholder="Bo‘sh qoldirilsa avtomatik yaratiladi"
                />
              </div>

              <div className="field full">
                <label>Asosiy rasm</label>

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleMainImage}
                  disabled={uploading}
                />

                {uploading && (
                  <span>Rasm yuklanmoqda...</span>
                )}

                {editing.image_url && (
                  <div>
                    <img
                      src={editing.image_url}
                      alt="Asosiy rasm"
                      style={{
                        width: 180,
                        height: 140,
                        objectFit: "contain",
                        marginTop: 10,
                        borderRadius: 12,
                        border: "1px solid var(--line)",
                      }}
                    />

                    <button
                      type="button"
                      className="danger"
                      onClick={() =>
                        updateEditing("image_url", "")
                      }
                    >
                      Rasmni olib tashlash
                    </button>
                  </div>
                )}
              </div>

              {section === "products" && (
                <>
                  <div className="field">
                    <label>SKU (majburiy, takrorlanmas)</label>
                    <input required placeholder="F3D-CHESS-001" value={editing.sku || ""}
                      onChange={e => updateEditing("sku", e.target.value.toUpperCase())}/>
                  </div>
                  <div className="field">
                    <label>Kategoriya</label>
                    <select required value={editing.category_id || ""}
                      onChange={e => updateEditing("category_id", e.target.value)}>
                      <option value="">Kategoriyani tanlang</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <small>Agar kerakli kategoriya yo‘q bo‘lsa, Kategoriyalar bo‘limidan qo‘shing.</small>
                  </div>
                  {!!editing.category_id && <>
                    <div className="field full variantsPanel">
                      <div className="variantsTitle"><div><h3>O‘lchamlar va narxlar</h3><small>Mahsulot uchun birinchi o‘lcham avtomatik ochiladi. Narx faqat o‘lchamga bog‘liq.</small></div>
                        <button type="button" className="secondary" onClick={() => setEditing(cur => cur ? ({...cur, sizes: [...(cur.sizes || []), newSize()]}) : cur)}>＋ O‘lcham qo‘shish</button></div>
                      {(editing.sizes || []).map((size, i) => <div className="variantRow" key={size.id || `size-${i}`}>
                        <div className="field"><label>O‘lcham {i+1}</label>
                          <input required value={size.label} onChange={e => updateSize(i, {label:e.target.value})} placeholder="Masalan: 15 sm" /></div>
                        <div className="field"><label>Narxi (so‘m)</label>
                          <input required type="number" min="1" step="1" value={size.price || ""} onChange={e => updateSize(i, {price:Number(e.target.value)})} placeholder="150000" /></div>
                        <button type="button" className="danger variantRemove" disabled={(editing.sizes || []).length <= 1}
                          onClick={() => setEditing(cur => cur ? ({...cur, sizes:(cur.sizes || []).filter((_,j)=>j!==i)}) : cur)}>✕</button>
                      </div>)}
                    </div>
                    <div className="field full variantsPanel">
                      <div className="variantsTitle"><div><h3>Rang kombinatsiyalari</h3><small>1–3 ta rang tanlang. Sotuvda yo‘q kombinatsiyani o‘chirib qo‘ying — xaridorda chiziq bilan ko‘rinadi.</small></div>
                        <button type="button" className="secondary" onClick={() => setEditing(cur => cur ? ({...cur, colors:[...(cur.colors || []), {name:"",hex_code:"#333333",swatch_colors:["#333333"],available:true}]}) : cur)}>＋ Kombinatsiya</button></div>
                      {(editing.colors || []).map((c,i) => <div className="colorComboRow" key={c.id || `color-${i}`}>
                        <div className="field"><label>Kombinatsiya {i+1} nomi</label><input required value={c.name} onChange={e=>updateColor(i,{name:e.target.value})} placeholder="Qora + oq" /></div>
                        <div className="colorSwatches">
                          {c.swatch_colors.map((hex,j) => <label key={j} title={`${j+1}-rang`}><input type="color" value={hex} onChange={e=>changeSwatch(i,j,e.target.value)}/><small>Rang {j+1}</small></label>)}
                          {c.swatch_colors.length<3 && <button type="button" className="secondary" onClick={() => updateColor(i,{swatch_colors:[...c.swatch_colors,"#ffffff"]})}>＋ Rang</button>}
                          {c.swatch_colors.length>1 && <button type="button" className="secondary" onClick={() => updateColor(i,{swatch_colors:c.swatch_colors.slice(0,-1)})}>−</button>}
                        </div>
                        <label className="comboToggle"><input type="checkbox" checked={c.available} onChange={e=>updateColor(i,{available:e.target.checked})} />{c.available?"Sotuvda bor":"Sotuvda yo‘q"}</label>
                        <button type="button" className="danger variantRemove" disabled={(editing.colors || []).length<=1} onClick={() => setEditing(cur=>cur ? ({...cur,colors:(cur.colors||[]).filter((_,j)=>j!==i)}) : cur)}>✕</button>
                      </div>)}
                    </div>
                  </>}
                  <div className="field full">
                    <label>
                      Qo‘shimcha rasmlar — 6 tagacha
                    </label>

                    <input
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleGalleryImages}
                      disabled={uploading}
                    />

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 10,
                        marginTop: 10,
                      }}
                    >
                      {(editing.images || []).map(
                        (image, index) => (
                          <div key={`${image}-${index}`}>
                            <img
                              src={image}
                              alt={`Rasm ${index + 1}`}
                              style={{
                                width: 100,
                                height: 80,
                                objectFit: "contain",
                                borderRadius: 10,
                                border: "1px solid var(--line)",
                              }}
                            />

                            <button
                              type="button"
                              className="danger"
                              onClick={() =>
                                removeGalleryImage(index)
                              }
                            >
                              Olib tashlash
                            </button>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                </>
              )}

              <div className="field full">
                <label>Tavsif</label>

                <textarea
                  value={editing.description || ""}
                  onChange={(event) =>
                    updateEditing(
                      "description",
                      event.target.value
                    )
                  }
                />
              </div>

              <label className="check full">
                <input
                  type="checkbox"
                  checked={editing.active}
                  onChange={(event) =>
                    updateEditing(
                      "active",
                      event.target.checked
                    )
                  }
                />

                Saytda ko‘rsatilsin
              </label>
            </div>

            <div className="formActions">
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setModalOpen(false);
                  setEditing(null);
                  setError("");
                }}
              >
                Bekor qilish
              </button>

              <button
                type="submit"
                className="primary"
                disabled={saving || uploading}
              >
                {uploading
                  ? "Rasm yuklanmoqda..."
                  : saving
                    ? "Saqlanmoqda..."
                    : "Saqlash"}
              </button>
            </div>
          </form>
        </div>
      )}

           {savedPopup && (
        <div
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSavedPopup("");
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "grid",
            placeItems: "center",
            padding: 20,
            background: "rgba(0, 0, 0, 0.72)",
            backdropFilter: "blur(7px)",
          }}
        >
          <section
            style={{
              width: "min(430px, 100%)",
              padding: "44px 30px 30px",
              textAlign: "center",
              borderRadius: 24,
              background: "var(--panel)",
              color: "var(--ink)",
              border: "1px solid var(--line)",
              boxShadow: "0 25px 70px rgba(0,0,0,.45)",
            }}
          >
            <div
              style={{
                width: 100,
                height: 100,
                display: "grid",
                placeItems: "center",
                margin: "0 auto 22px",
                borderRadius: "50%",
                background: "#21a357",
                color: "#fff",
                fontSize: 62,
                fontWeight: 900,
              }}
            >
              ✓
            </div>

            <h2
              style={{
                margin: "0 0 12px",
                fontSize: 28,
              }}
            >
              {savedPopup}
            </h2>

            <p
              style={{
                margin: "0 0 26px",
                color: "var(--muted)",
                lineHeight: 1.6,
              }}
            >
              Ma’lumotlar saqlandi va ro‘yxat yangilandi.
            </p>

            <button
              type="button"
              className="primary"
              onClick={() => setSavedPopup("")}
              style={{
                width: "100%",
                minHeight: 52,
                borderRadius: 13,
              }}
            >
              Tushunarli
            </button>
          </section>
        </div>
      )}

      <ThemeButton />
    </div>
  );
} 

function DailyChart({title,accent,data,field}:{title:string;accent:string;data:{date:string;views:number;carts:number;ordered:number}[];field:"views"|"carts"|"ordered"}){
 const max=Math.max(1,...data.map(x=>x[field])); const width=640,height=180,pad=20;
 const points=data.map((x,i)=>`${pad+(data.length>1?i/(data.length-1):0.5)*(width-2*pad)},${height-pad-(x[field]/max)*(height-2*pad)}`).join(" ");
 return <article className="dashChart"><h3>{title}</h3><strong>{data.reduce((v,x)=>v+x[field],0).toLocaleString("ru")}</strong><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${title} diagrammasi`} preserveAspectRatio="none"><line x1="20" y1="160" x2="620" y2="160" stroke="currentColor" opacity="0.18"/><polyline points={points} fill="none" stroke={accent} strokeWidth="4" strokeLinejoin="round" strokeLinecap="round"/>{data.map((x,i)=><circle key={x.date} cx={pad+(data.length>1?i/(data.length-1):0.5)*(width-2*pad)} cy={height-pad-(x[field]/max)*(height-2*pad)} r="3" fill={accent}><title>{x.date}: {x[field]}</title></circle>)}</svg><div className="dashChartDates"><span>{data[0]?.date || "—"}</span><span>{data[data.length-1]?.date || "—"}</span></div></article>
}
