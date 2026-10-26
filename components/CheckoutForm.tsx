"use client";

import { FormEvent, useEffect, useState } from "react";

import {
  OTHER_DISTRICT,
  emptyProfile,
  getDistricts,
  readProfile,
  regions,
  type LocalProfile,
} from "@/lib/local-storage";

type CheckoutItem = {
  id: string;
  name: string;
  image_url?: string | null;
  price: number;
  quantity: number;
};

type CheckoutFormProps = {
  items: CheckoutItem[];
  total: number;
  onClose: () => void;
  onCompleted: () => void;
};

function readText(formData: FormData, field: string) {
  const value = formData.get(field);
  return typeof value === "string" ? value.trim() : "";
}

export default function CheckoutForm({
  items,
  total,
  onClose,
  onCompleted,
}: CheckoutFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [profile, setProfile] =
    useState<LocalProfile>(emptyProfile);
  const [customDistrict, setCustomDistrict] = useState(false);

  useEffect(() => {
    const storedProfile = readProfile().profile;

    if (!storedProfile) {
      return;
    }

    setProfile(storedProfile);
    setCustomDistrict(
      Boolean(
        storedProfile.district &&
          !getDistricts(storedProfile.region).includes(
            storedProfile.district
          )
      )
    );
  }, []);

  const districtOptions = getDistricts(profile.region);

  function updateProfile(
    field: keyof LocalProfile,
    value: string
  ) {
    setProfile((oldProfile) => ({
      ...oldProfile,
      [field]: value,
    }));

    setError("");
  }

  function changeRegion(value: string) {
    setProfile((oldProfile) => ({
      ...oldProfile,
      region: value,
      district: "",
    }));

    setCustomDistrict(false);
    setError("");
  }

  function changeDistrict(value: string) {
    if (value === OTHER_DISTRICT) {
      setCustomDistrict(true);
      updateProfile("district", "");
      return;
    }

    setCustomDistrict(false);
    updateProfile("district", value);
  }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting) return;

    const formData = new FormData(event.currentTarget);
    const customerName = profile.customer_name.trim();
    const phone = profile.phone.trim();
    const region = profile.region.trim();
    const district = profile.district.trim();
    const address = profile.address.trim();
    const customerNote = readText(formData, "customer_note");
    const phoneDigits = phone.replace(/\D/g, "");

    if (!items.length) {
      setError("Savat bo‘sh. Avval mahsulot qo‘shing.");
      return;
    }

    if (customerName.length < 2) {
      setError("Ismingizni to‘liq kiriting.");
      return;
    }

    if (phoneDigits.length < 9 || phoneDigits.length > 15) {
      setError("Telefon raqamini to‘g‘ri kiriting.");
      return;
    }

    if (!regions.includes(region as (typeof regions)[number])) {
      setError("Viloyat yoki shaharni tanlang.");
      return;
    }

    if (district.length < 2) {
      setError("Tuman yoki shahar nomini kiriting.");
      return;
    }

    if (address.length < 5) {
      setError("Yetkazib berish manzilini to‘liq kiriting.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer_name: customerName,
          phone,
          region,
          district,
          address,
          customer_note: customerNote || null,
          items: items.map((item) => ({
            product_id: item.id,
            quantity: item.quantity,
          })),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Buyurtmani yuborib bo‘lmadi");
      }

      const receivedOrderNumber = String(
        data.order_number || ""
      ).trim();

      if (!receivedOrderNumber) {
        throw new Error("Buyurtma saqlandi, lekin raqami qaytmadi");
      }

      setOrderNumber(receivedOrderNumber);
      onCompleted();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Buyurtmani yuborishda xatolik yuz berdi"
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (orderNumber) {
    return (
      <div
        className="checkoutOverlay"
        role="presentation"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <div
          className="checkoutModal checkoutSuccess"
          role="dialog"
          aria-modal="true"
          aria-labelledby="checkout-success-title"
        >
          <div className="checkoutSuccessIcon" aria-hidden="true">
            ✓
          </div>

          <h2 id="checkout-success-title">Buyurtma qabul qilindi!</h2>
          <p>Sizning buyurtma raqamingiz:</p>

          <strong className="checkoutOrderNumber">{orderNumber}</strong>

          <p>
            Tez orada operatorimiz siz bilan telefon yoki Telegram orqali
            bog‘lanadi.
          </p>

          <button
            type="button"
            className="checkoutSubmit"
            onClick={onClose}
          >
            Tushunarli
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="checkoutOverlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <form
        className="checkoutModal"
        onSubmit={submitOrder}
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-title"
      >
        <div className="checkoutHeader">
          <div>
            <h2 id="checkout-title">Buyurtma berish</h2>
            <span>{items.length} xil mahsulot</span>
          </div>

          <button
            type="button"
            aria-label="Yopish"
            onClick={onClose}
            disabled={submitting}
          >
            ✕
          </button>
        </div>

        {error && <div className="checkoutError">{error}</div>}

        <div className="checkoutFields">
          <div className="checkoutField">
            <label htmlFor="customer_name">Ismingiz</label>
            <input
              id="customer_name"
              name="customer_name"
              required
              minLength={2}
              maxLength={100}
              value={profile.customer_name}
              onChange={(event) =>
                updateProfile("customer_name", event.target.value)
              }
              autoComplete="name"
              placeholder="Ismingizni kiriting"
            />
          </div>

          <div className="checkoutField">
            <label htmlFor="phone">Telefon raqamingiz</label>
            <input
              id="phone"
              name="phone"
              required
              type="tel"
              inputMode="tel"
              value={profile.phone}
              onChange={(event) =>
                updateProfile("phone", event.target.value)
              }
              minLength={9}
              maxLength={30}
              pattern="[0-9+()\s-]{9,30}"
              title="Telefon raqamini to‘g‘ri kiriting"
              autoComplete="tel"
              placeholder="+998 90 123 45 67"
            />
          </div>

          <div className="checkoutField">
            <label htmlFor="region">Viloyat yoki shahar</label>
            <select
              id="region"
              name="region"
              required
              value={profile.region}
              onChange={(event) =>
                changeRegion(event.target.value)
              }
            >
              <option value="" disabled>
                Hududni tanlang
              </option>
              {regions.map((region) => (
                <option value={region} key={region}>
                  {region}
                </option>
              ))}
            </select>
          </div>

          <div className="checkoutField">
            <label htmlFor="district">Tuman yoki shahar</label>
            <select
              id="district"
              required
              value={
                customDistrict
                  ? OTHER_DISTRICT
                  : profile.district
              }
              disabled={!profile.region}
              onChange={(event) =>
                changeDistrict(event.target.value)
              }
            >
              <option value="" disabled>
                {profile.region
                  ? "Tuman yoki shaharni tanlang"
                  : "Avval hududni tanlang"}
              </option>

              {districtOptions.map((district) => (
                <option value={district} key={district}>
                  {district}
                </option>
              ))}

              <option value={OTHER_DISTRICT}>
                {OTHER_DISTRICT}
              </option>
            </select>

            {customDistrict && (
              <input
                name="district"
                required
                minLength={2}
                maxLength={100}
                autoFocus
                autoComplete="address-level2"
                value={profile.district}
                onChange={(event) =>
                  updateProfile("district", event.target.value)
                }
                placeholder="Tuman yoki shahar nomini yozing"
              />
            )}
          </div>

          <div className="checkoutField checkoutFull">
            <label htmlFor="address">Yetkazib berish manzili</label>
            <textarea
              id="address"
              name="address"
              required
              minLength={5}
              maxLength={300}
              value={profile.address}
              onChange={(event) =>
                updateProfile("address", event.target.value)
              }
              autoComplete="street-address"
              placeholder="Ko‘cha, uy va mo‘ljalni kiriting"
            />
          </div>

          <div className="checkoutField checkoutFull">
            <label htmlFor="customer_note">Qo‘shimcha izoh</label>
            <textarea
              id="customer_note"
              name="customer_note"
              maxLength={500}
              placeholder="Ixtiyoriy"
            />
          </div>
        </div>

        <div className="checkoutTotal">
          <span>Umumiy summa</span>
          <strong>{Number(total).toLocaleString("ru")} so‘m</strong>
        </div>

        <button
          type="submit"
          className="checkoutSubmit"
          disabled={submitting || !items.length}
        >
          {submitting
            ? "Buyurtma yuborilmoqda..."
            : "Buyurtmani tasdiqlash"}
        </button>
      </form>
    </div>
  );
}
