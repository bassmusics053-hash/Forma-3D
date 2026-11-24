"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type MaterialType = "resin" | "pla" | "petg" | "abs" | "tpu" | "other";
type Product = { id: string; name: string; sku?: string; sizes?: { id?: string; label: string }[] };
type Profile = {
  id: string;
  product_id: string | null;
  model_name: string;
  variant_label: string;
  printer_name: string;
  material_type: MaterialType;
  material_name: string;
  material_grams: number;
  print_minutes: number;
  king_diameter_mm: number | null;
  king_height_mm: number | null;
  pawn_diameter_mm: number | null;
  pawn_height_mm: number | null;
  source_url: string;
  fill_percent: number | null;
  notes: string;
  created_at: string;
  updated_at: string;
};
type Form = {
  id?: string;
  product_id: string;
  model_name: string;
  variant_label: string;
  printer_name: string;
  material_type: MaterialType;
  material_name: string;
  material_grams: string;
  hours: string;
  minutes: string;
  king_diameter_mm: string;
  king_height_mm: string;
  pawn_diameter_mm: string;
  pawn_height_mm: string;
  source_url: string;
  fill_percent: string;
  notes: string;
};

const initial: Form = {
  product_id: "", model_name: "", variant_label: "Standart", printer_name: "",
  material_type: "resin", material_name: "", material_grams: "", hours: "", minutes: "",
  king_diameter_mm: "", king_height_mm: "", pawn_diameter_mm: "", pawn_height_mm: "", source_url: "", fill_percent: "", notes: "",
};
const materials: { value: MaterialType; label: string }[] = [
  { value: "resin", label: "Resin (smola)" }, { value: "pla", label: "PLA" },
  { value: "petg", label: "PETG" }, { value: "abs", label: "ABS" },
  { value: "tpu", label: "TPU" }, { value: "other", label: "Boshqa" },
];

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...options });
  let body: any;
  try { body = await response.json(); } catch { throw new Error("Server javobini o‘qib bo‘lmadi."); }
  if (!response.ok) throw new Error(typeof body?.error === "string" ? body.error : `Xatolik: ${response.status}`);
  return body as T;
}
function formatTime(total: number) {
  const h = Math.floor(Number(total) / 60);
  const m = Number(total) % 60;
  return h ? `${h} soat${m ? ` ${m} daq` : ""}` : `${m} daq`;
}
function num(value: number) { return Number(value).toLocaleString("uz-UZ", { maximumFractionDigits: 2 }); }

function dimension(d: number | null, h: number | null) { return d == null || h == null ? "Kiritilmagan" : `Ø ${num(d)} × ${num(h)} mm`; }

export default function ProductionDashboard() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [materialFilter, setMaterialFilter] = useState("");
  const [form, setForm] = useState<Form>(initial);
  const [modal, setModal] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function reload() {
    setLoading(true);
    setError("");
    try {
      const result = await api<Profile[]>("/api/admin/production");
      setProfiles(result);
    } catch (e) { setError(e instanceof Error ? e.message : "Ma'lumotlarni yuklashda xatolik"); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    void reload();
    void api<Product[]>("/api/admin/products")
      .then(setProducts)
      .catch(() => { /* Ichki modellar katalogsiz ham ishlashi mumkin. */ });
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("uz");
    return profiles.filter(profile => {
      if (materialFilter && materialFilter !== profile.material_type) return false;
      return !q || [profile.model_name, profile.variant_label, profile.printer_name, profile.material_name]
        .some(value => value.toLocaleLowerCase("uz").includes(q));
    });
  }, [profiles, search, materialFilter]);
  const selectedProduct = products.find(p => p.id === form.product_id);
  const modelCount = new Set(profiles.map(p => p.product_id || p.model_name.toLocaleLowerCase("uz"))).size;

  function openAdd() { setForm({ ...initial }); setError(""); setMessage(""); setModal(true); }
  function openEdit(profile: Profile) {
    setForm({
      id: profile.id,
      product_id: profile.product_id || "",
      model_name: profile.model_name,
      variant_label: profile.variant_label,
      printer_name: profile.printer_name,
      material_type: profile.material_type,
      material_name: profile.material_name,
      material_grams: String(profile.material_grams),
      hours: String(Math.floor(profile.print_minutes / 60)),
      minutes: String(profile.print_minutes % 60),
      king_diameter_mm: String(profile.king_diameter_mm ?? ""), king_height_mm: String(profile.king_height_mm ?? ""), pawn_diameter_mm: String(profile.pawn_diameter_mm ?? ""), pawn_height_mm: String(profile.pawn_height_mm ?? ""), source_url: profile.source_url || "",
      fill_percent: profile.fill_percent === null ? "" : String(profile.fill_percent),
      notes: profile.notes,
    });
    setError(""); setMessage(""); setModal(true);
  }
  function change<K extends keyof Form>(key: K, value: Form[K]) { setForm(current => ({ ...current, [key]: value })); }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const hours = Number(form.hours || 0);
    const minutes = Number(form.minutes || 0);
    if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || minutes < 0 || minutes > 59 || hours * 60 + minutes < 1) {
      setError("Chop etish vaqtini to‘g‘ri kiriting (daqiqa 0–59)."); return;
    }
    if (![form.material_grams, form.king_diameter_mm, form.king_height_mm, form.pawn_diameter_mm, form.pawn_height_mm]
      .every(value => value.trim() !== "" && Number.isFinite(Number(value)) && Number(value) > 0)) {
      setError("Material sarfi va to‘rtta o‘lcham noldan katta bo‘lishi kerak."); return;
    }
    const payload = {
      ...(form.id ? { id: form.id } : {}),
      product_id: form.product_id || null,
      model_name: form.model_name,
      variant_label: form.variant_label,
      printer_name: form.printer_name,
      material_type: form.material_type,
      material_name: form.material_name,
      material_grams: Number(form.material_grams),
      print_minutes: hours * 60 + minutes,
      king_diameter_mm: Number(form.king_diameter_mm), king_height_mm: Number(form.king_height_mm), pawn_diameter_mm: Number(form.pawn_diameter_mm), pawn_height_mm: Number(form.pawn_height_mm), source_url: form.source_url,
      fill_percent: form.fill_percent === "" ? null : Number(form.fill_percent),
      notes: form.notes,
    };
    setSaving(true); setError("");
    try {
      await api("/api/admin/production", {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      setModal(false); setMessage(form.id ? "Print profili yangilandi." : "Yangi print profili saqlandi.");
      await reload();
    } catch (e) { setError(e instanceof Error ? e.message : "Saqlashda xatolik"); }
    finally { setSaving(false); }
  }

  async function remove(profile: Profile) {
    if (!window.confirm(`“${profile.model_name} — ${profile.variant_label}” profilini o‘chirasizmi?`)) return;
    setError(""); setMessage("");
    try {
      await api(`/api/admin/production?id=${encodeURIComponent(profile.id)}`, { method: "DELETE" });
      setMessage("Profil o‘chirildi.");
      await reload();
    } catch (e) { setError(e instanceof Error ? e.message : "O‘chirishda xatolik"); }
  }
  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin";
  }

  return (
    <div className="admin productionAdmin">
      <aside className="side">
        <img src="/forma3d-brand.webp" alt="FORMA 3D" />
        <nav>
          <a href="/admin/dashboard">▦ Asosiy admin</a>
          <a href="/admin/production" className="active" aria-current="page">🖨 Ishlab chiqarish</a>
          <a href="/" target="_blank" rel="noreferrer">↗ Do‘konni ochish</a>
        </nav>
      </aside>
      <main className="adminMain">
        <header className="adminTop">
          <h1>Ishlab chiqarish</h1>
          <button type="button" className="secondary" onClick={() => void logout()}>Chiqish</button>
        </header>
        <div className="content">
          <div className="productionHeading">
            <div>
              <div className="productionEyebrow">FORMA 3D / ICHKI PANEL</div>
              <h2>Modellar va print profillari</h2>
              <p>Material sarfi, chop etish vaqti va o‘lchamlarni bir joyda boshqaring.</p>
            </div>
            <button type="button" className="primary" onClick={openAdd}>+ Yangi profil</button>
          </div>

          {error && !modal && <div className="productionAlert productionError" role="alert">{error}</div>}
          {message && <div className="productionAlert productionSuccess" role="status">✓ {message}</div>}
          <section className="productionStats" aria-label="Umumiy ko‘rsatkichlar">
            <div className="stat"><span>Jami profillar</span><strong>{profiles.length}</strong></div>
            <div className="stat"><span>Modellar</span><strong>{modelCount}</strong></div>
            <div className="stat"><span>Resin profillari</span><strong>{profiles.filter(p => p.material_type === "resin").length}</strong></div>
          </section>
          <div className="productionToolbar">
            <label className="productionSearch"><span className="srOnly">Model qidirish</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Model, variant yoki printer bo‘yicha qidirish..." />
            </label>
            <label><span className="srOnly">Material bo‘yicha filtrlash</span>
              <select value={materialFilter} onChange={e => setMaterialFilter(e.target.value)}>
                <option value="">Barcha materiallar</option>
                {materials.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </label>
            <button type="button" className="secondary" disabled={loading} onClick={() => void reload()}>↻ Yangilash</button>
          </div>
          <div className="table productionTable">
            <table>
              <thead><tr>
                <th>Model / variant</th><th>O‘lcham (mm)</th><th>Material</th><th>Sarf (g)</th>
                <th>Print vaqti</th><th>Printer</th><th>Amallar</th>
              </tr></thead>
              <tbody>
                {filtered.map(profile => <tr key={profile.id}>
                  <td><strong>{profile.model_name}</strong><small>{profile.variant_label}</small></td>
                  <td className="productionNonwrap"><small>Shoh: {dimension(profile.king_diameter_mm, profile.king_height_mm)}</small><small>Piyoda: {dimension(profile.pawn_diameter_mm, profile.pawn_height_mm)}</small>{profile.source_url && /^https?:\/\//i.test(profile.source_url) && <a href={profile.source_url} target="_blank" rel="noopener noreferrer">Model manbasi ↗</a>}</td>
                  <td>{materials.find(m => m.value === profile.material_type)?.label || profile.material_type}
                    {profile.material_name && <small>{profile.material_name}</small>}
                    {profile.fill_percent !== null && <small>To‘ldirish: {profile.fill_percent}%</small>}</td>
                  <td><strong>{num(profile.material_grams)}</strong></td>
                  <td className="productionNonwrap">{formatTime(profile.print_minutes)}</td>
                  <td>{profile.printer_name || "—"}</td>
                  <td><div className="rowActions">
                    <button type="button" className="secondary" onClick={() => openEdit(profile)}>Tahrirlash</button>
                    <button type="button" className="danger" onClick={() => void remove(profile)}>O‘chirish</button>
                  </div></td>
                </tr>)}
                {!loading && !filtered.length && <tr><td colSpan={7} className="productionEmpty">{profiles.length ? "Qidiruv bo‘yicha profil topilmadi." : "Hali print profili yo‘q. Birinchi modelni qo‘shing."}</td></tr>}
                {loading && <tr><td colSpan={7} className="productionEmpty">Yuklanmoqda...</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="productionHint">Print vaqti va material miqdori qo‘lda kiritiladi. Ular slicer dasturida olingan hisob-kitoblarga asoslanishi kerak.</p>
        </div>
      </main>
      {modal && <div className="modalBg" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget && !saving) setModal(false); }}>
        <div className="modal productionModal" role="dialog" aria-modal="true" aria-labelledby="productionModalTitle">
          <div className="productionModalHeader">
            <div>
              <div className="productionEyebrow">FORMA 3D / PRINT MA'LUMOTLARI</div>
              <h2 id="productionModalTitle">{form.id ? "Profilni tahrirlash" : "Yangi print profili"}</h2>
            </div>
            <button className="secondary" type="button" disabled={saving} onClick={() => setModal(false)} aria-label="Oynani yopish">✕</button>
          </div>
          <form onSubmit={event => void save(event)}>
            <div className="formGrid productionForm">
              <div className="field full">
                <label htmlFor="productionProduct">Sotuv katalogiga bog‘lash (ixtiyoriy)</label>
                <select id="productionProduct" value={form.product_id} onChange={event => {
                  const value = event.target.value;
                  const product = products.find(p => p.id === value);
                  setForm(current => ({ ...current, product_id: value, model_name: product ? product.name : current.model_name }));
                }}>
                  <option value="">— Faqat ichki model, katalogga bog‘lanmagan —</option>
                  {products.map(product => <option value={product.id} key={product.id}>{product.sku ? `${product.sku} · ` : ""}{product.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="productionName">Model nomi *</label>
                <input id="productionName" required maxLength={150} minLength={2} value={form.model_name} onChange={event => change("model_name", event.target.value)} placeholder="Masalan: Chess Knight" />
              </div>
              <div className="field">
                <label htmlFor="productionVariant">O‘lcham / variant *</label>
                <input id="productionVariant" required maxLength={100} value={form.variant_label} onChange={event => change("variant_label", event.target.value)} list="productionSizeSuggestions" placeholder="Masalan: 12 sm, 50%" />
                <datalist id="productionSizeSuggestions">{(selectedProduct?.sizes || []).map(size => <option key={size.id || size.label} value={size.label} />)}</datalist>
              </div>
              <div className="field">
                <label htmlFor="productionPrinter">Printer</label>
                <input id="productionPrinter" maxLength={100} value={form.printer_name} onChange={event => change("printer_name", event.target.value)} placeholder="Masalan: Elegoo CC2" />
              </div>
              <div className="field">
                <label htmlFor="productionMaterial">Material turi *</label>
                <select id="productionMaterial" required value={form.material_type} onChange={event => change("material_type", event.target.value as MaterialType)}>
                  {materials.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="productionMaterialName">Material nomi / markasi</label>
                <input id="productionMaterialName" maxLength={100} value={form.material_name} onChange={event => change("material_name", event.target.value)} placeholder="Masalan: Standard Grey" />
              </div>
              <div className="field">
                <label htmlFor="productionGrams">Material sarfi (gramm) *</label>
                <input id="productionGrams" type="number" required min="0.01" max="100000" step="0.01" value={form.material_grams} onChange={event => change("material_grams", event.target.value)} placeholder="42" />
              </div>
              <fieldset className="productionFieldset full">
                <legend>Chop etish vaqti *</legend>
                <div className="productionDouble">
                  <div className="field"><label htmlFor="productionHours">Soat</label><input id="productionHours" type="number" min="0" max="8760" step="1" value={form.hours} onChange={event => change("hours", event.target.value)} placeholder="2" /></div>
                  <div className="field"><label htmlFor="productionMinutes">Daqiqa (0–59)</label><input id="productionMinutes" type="number" min="0" max="59" step="1" value={form.minutes} onChange={event => change("minutes", event.target.value)} placeholder="30" /></div>
                </div>
              </fieldset>
              <fieldset className="productionFieldset full">
                <legend>Shoh o‘lchami (mm) *</legend>
                <div className="productionDouble">
                  <div className="field"><label htmlFor="king_diameter_mm">Diametri</label><input id="king_diameter_mm" required type="number" min="0.01" max="10000" step="0.01" value={form.king_diameter_mm} onChange={event => change("king_diameter_mm", event.target.value)} /></div>
                  <div className="field"><label htmlFor="king_height_mm">Balandligi</label><input id="king_height_mm" required type="number" min="0.01" max="10000" step="0.01" value={form.king_height_mm} onChange={event => change("king_height_mm", event.target.value)} /></div>
                </div>
              </fieldset>
              <fieldset className="productionFieldset full">
                <legend>Piyoda o‘lchami (mm) *</legend>
                <div className="productionDouble">
                  <div className="field"><label htmlFor="pawn_diameter_mm">Diametri</label><input id="pawn_diameter_mm" required type="number" min="0.01" max="10000" step="0.01" value={form.pawn_diameter_mm} onChange={event => change("pawn_diameter_mm", event.target.value)} /></div>
                  <div className="field"><label htmlFor="pawn_height_mm">Balandligi</label><input id="pawn_height_mm" required type="number" min="0.01" max="10000" step="0.01" value={form.pawn_height_mm} onChange={event => change("pawn_height_mm", event.target.value)} /></div>
                </div>
              </fieldset>
              <div className="field full">
                <label htmlFor="productionSource">3D model manbasi (sayt havolasi)</label>
                <input id="productionSource" type="url" maxLength={2048} value={form.source_url} onChange={event => change("source_url", event.target.value)} placeholder="https://cults3d.com/..." />
              </div>
              <div className="field full">
                <label htmlFor="productionFill">To‘ldirish / zichlik (%) — ixtiyoriy</label>
                <input id="productionFill" type="number" min="1" max="100" step="1" value={form.fill_percent} onChange={event => change("fill_percent", event.target.value)} placeholder="Masalan: 20" />
                <small>Bu parametr barcha resin printlarda qo‘llanilmaydi. Slicer'dagi sozlama mos kelsagina kiriting.</small>
              </div>
              <div className="field full">
                <label htmlFor="productionNotes">Qo‘shimcha izoh</label>
                <textarea id="productionNotes" value={form.notes} maxLength={3000} onChange={event => change("notes", event.target.value)} placeholder="Support, yuvish, pardoz, maxsus sozlamalar..." />
              </div>
            </div>
            {error && <div className="productionAlert productionError" role="alert">{error}</div>}
            <div className="formActions">
              <button type="button" className="secondary" disabled={saving} onClick={() => setModal(false)}>Bekor qilish</button>
              <button type="submit" className="primary" disabled={saving}>{saving ? "Saqlanmoqda..." : "Saqlash"}</button>
            </div>
          </form>
        </div>
      </div>}
    </div>
  );
}
