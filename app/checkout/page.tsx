"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { FormEvent } from "react";

import ThemeButton from "@/components/ThemeButton";

import {
  readProfile,
  regions,
  saveProfile,
  validateProfile,
  normalizeProfile,
  normalizePhone,
} from "@/lib/local-storage";

import type { LocalProfile } from "@/lib/local-storage";

import profileStyles from "../cabinet/cabinet.module.css";

type CartItem = {
  id: string;
  name: string;
  slug?: string | null;
  image_url?: string | null;
  price: number;
  quantity: number;
  size_id?: string;
  color_id?: string;
  size_label?: string;
  color_name?: string;
};

function readText(
  formData: FormData,
  field: string
) {
  const value = formData.get(field);

  return typeof value === "string"
    ? value.trim()
    : "";
}

export default function CheckoutPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [orderNumber, setOrderNumber] = useState("");

  const [profile, setProfile] =
    useState<LocalProfile | null>(null);

  const [profileWarning, setProfileWarning] =
    useState("");

  const [storageWarning, setStorageWarning] =
    useState("");

  const [rememberProfile, setRememberProfile] =
    useState(false);

  const [phoneValue, setPhoneValue] = useState("+998 ");
  const [verificationId, setVerificationId] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [botUrl, setBotUrl] = useState("");
  const [verificationLoading, setVerificationLoading] =
    useState(false);
  const [verificationError, setVerificationError] =
    useState("");

  const sending = useRef(false);

  useEffect(() => {
    const savedProfile = readProfile();

    setProfile(savedProfile.profile);
    setProfileWarning(savedProfile.error);
    setPhoneValue(savedProfile.profile?.phone || "+998 ");

    try {
      const savedCart = localStorage.getItem("forma3d-cart");

      const parsedCart = savedCart
        ? JSON.parse(savedCart)
        : [];

      if (!Array.isArray(parsedCart)) {
        localStorage.removeItem("forma3d-cart");
        return;
      }

      const validItems = parsedCart.filter(
        (item): item is CartItem =>
          Boolean(
            item &&
              typeof item.id === "string" &&
              typeof item.name === "string" &&
              Number.isFinite(Number(item.price)) &&
              Number.isFinite(Number(item.quantity)) &&
              Number(item.quantity) > 0
          )
      );

      setItems(validItems);
    } catch {
      setItems([]);

      setError(
        "Savatni brauzer xotirasidan o‘qib bo‘lmadi. Do‘konga qaytib savatni tekshiring."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const total = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum +
          Number(item.price || 0) * item.quantity,
        0
      ),
    [items]
  );

  function changePhone(value: string) {
    const previousPhone = normalizePhone(phoneValue);
    const nextPhone = normalizePhone(value);

    setPhoneValue(value);
    setVerificationError("");

    if (
      verificationId &&
      nextPhone !== previousPhone
    ) {
      setVerifiedPhone("");
      setVerificationId("");
      setVerificationCode("");
      setBotUrl("");
    }
  }

  async function startTelegramVerification() {
    const normalizedPhone = normalizePhone(phoneValue);

    if (!normalizedPhone) {
      setVerificationError("Telefon raqamini to‘g‘ri kiriting.");
      return;
    }

    const telegramWindow = window.open("", "_blank");

    try {
      setVerificationLoading(true);
      setVerificationError("");
      setVerifiedPhone("");
      setVerificationCode("");

      const response = await fetch(
        "/api/telegram/verification/start",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: normalizedPhone }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.ok !== true) {
        throw new Error(
          data.error || "Telegram tasdiqlashni boshlab bo‘lmadi"
        );
      }

      const nextBotUrl = String(data.bot_url || "");
      const nextVerificationId = String(
        data.verification_id || ""
      );

      if (!nextBotUrl || !nextVerificationId) {
        throw new Error("Bot havolasi yaratilmadi");
      }

      setBotUrl(nextBotUrl);
      setVerificationId(nextVerificationId);

      if (telegramWindow) {
        telegramWindow.location.href = nextBotUrl;
      } else {
        window.location.href = nextBotUrl;
      }
    } catch (caughtError) {
      telegramWindow?.close();
      setVerificationError(
        caughtError instanceof Error
          ? caughtError.message
          : "Telegram tasdiqlashda xatolik"
      );
    } finally {
      setVerificationLoading(false);
    }
  }

  async function confirmTelegramCode() {
    if (!verificationId || !/^\d{6}$/.test(verificationCode)) {
      setVerificationError("Bot yuborgan 6 xonali kodni kiriting.");
      return;
    }

    try {
      setVerificationLoading(true);
      setVerificationError("");

      const response = await fetch(
        "/api/telegram/verification/confirm",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            verification_id: verificationId,
            code: verificationCode,
            phone: phoneValue,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.ok !== true) {
        throw new Error(data.error || "Kodni tasdiqlab bo‘lmadi");
      }

      setVerifiedPhone(normalizePhone(phoneValue));
      setVerificationCode("");
    } catch (caughtError) {
      setVerificationError(
        caughtError instanceof Error
          ? caughtError.message
          : "Kodni tasdiqlashda xatolik"
      );
    } finally {
      setVerificationLoading(false);
    }
  }

  async function submitOrder(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (sending.current) {
      return;
    }

    const formData = new FormData(event.currentTarget);

    const customerName = readText(
      formData,
      "customer_name"
    );

    const phone = readText(formData, "phone");
    const region = readText(formData, "region");
    const district = readText(formData, "district");
    const address = readText(formData, "address");

    const customerNote = readText(
      formData,
      "customer_note"
    );

    const inputProfile: LocalProfile = {
      customer_name: customerName,
      phone,
      region,
      district,
      address,
    };

    if (!items.length) {
      setError("Savat bo‘sh. Avval mahsulot qo‘shing.");
      return;
    }

    const validationError =
      validateProfile(inputProfile);

    if (validationError) {
      setError(validationError);
      return;
    }

    const submittedProfile =
      normalizeProfile(inputProfile);

    if (
      !verificationId ||
      !verifiedPhone ||
      verifiedPhone !== submittedProfile.phone
    ) {
      setError("Telefon raqamingizni Telegram orqali tasdiqlang.");
      return;
    }

    sending.current = true;

    try {
      setSubmitting(true);
      setError("");

      const response = await fetch("/api/orders", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          ...submittedProfile,
          verification_id: verificationId,
          customer_note: customerNote || null,

          items: items.map((item) => ({
            product_id: item.id,
            size_id: item.size_id,
            color_id: item.color_id,
            quantity: item.quantity,
          })),
        }),
      });

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok || data.ok !== true) {
        throw new Error(
          data.error || "Buyurtmani yuborib bo‘lmadi"
        );
      }

      const receivedOrderNumber = String(
        data.order_number || ""
      ).trim();

      if (!receivedOrderNumber) {
        throw new Error("Buyurtma raqami qaytmadi");
      }

      // Buyurtma serverda qabul qilindi.
      // Mahalliy xotira xatosi buyurtmani bekor qilmaydi.
      setOrderNumber(receivedOrderNumber);
      setItems([]);

      const warnings: string[] = [];

      try {
        localStorage.removeItem("forma3d-cart");
      } catch {
        warnings.push(
          "Savatni avtomatik tozalab bo‘lmadi. Shu buyurtmani qayta yubormang."
        );
      }

      if (rememberProfile) {
        try {
          saveProfile(submittedProfile);
        } catch (saveError) {
          warnings.push(
            saveError instanceof Error
              ? saveError.message
              : "Profil saqlanmadi."
          );
        }
      }

      setStorageWarning(warnings.join(" "));

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Buyurtmani yuborishda xatolik yuz berdi"
      );
    } finally {
      sending.current = false;
      setSubmitting(false);
    }
  }

  return (
    <div className="orderPage">
      <header className="orderPageHeader">
        <div className="orderPageHeaderInner">
          <a
            href="/"
            className="orderPageLogo"
            aria-label="Bosh sahifa"
          >
            <img
              src="/forma3d-brand.webp"
              alt="FORMA 3D"
            />
          </a>

          <a href="/" className="orderPageBack">
            ← Do‘konga qaytish
          </a>
        </div>
      </header>

      {process.env.NEXT_PUBLIC_SUPABASE_URL ? null : <div className="wrap"><div className="demoNotice">DEMO: Buyurtmani yakunlash uchun yangi Supabase va Telegram sozlamalari kerak. Hozircha real buyurtma yuborilmaydi.</div></div>}
      <main className="orderPageMain">
        {orderNumber ? (
          <section
            className="orderSuccessCard"
            aria-live="polite"
          >
            <div
              className="orderSuccessIcon"
              aria-hidden="true"
            >
              ✓
            </div>

            <h1>Buyurtma qabul qilindi!</h1>

            <p>Sizning buyurtma raqamingiz:</p>

            <strong>{orderNumber}</strong>

            <p>
              Tez orada operatorimiz siz bilan telefon
              yoki Telegram orqali bog‘lanadi.
            </p>

            {storageWarning && (
              <p role="status">{storageWarning}</p>
            )}

            <a href="/">Bosh sahifaga qaytish</a>
          </section>
        ) : (
          <>
            <div className="orderPageTitle">
              <span>Yakuniy bosqich</span>

              <h1>Buyurtmani rasmiylashtirish</h1>

              <p>
                Ma’lumotlarni to‘ldiring va
                buyurtmangizni tasdiqlang.
              </p>
            </div>

            {loading ? (
              <div className="orderPageState">
                Savat yuklanmoqda...
              </div>
            ) : !items.length ? (
              <div className="orderPageState orderPageEmpty">
                <div>🛒</div>

                <h2>Savatingiz bo‘sh</h2>

                <p>
                  Buyurtma berish uchun avval mahsulot
                  tanlang.
                </p>

                {error && <p role="alert">{error}</p>}

                <a href="/">Mahsulotlarni ko‘rish</a>
              </div>
            ) : (
              <form
                className="orderPageGrid"
                onSubmit={submitOrder}
                noValidate
              >
                <div className="orderPageLeft">
                  <section className="orderSectionCard">
                    <div className="orderSectionHeading">
                      <span>1</span>

                      <div>
                        <h2>Aloqa ma’lumotlari</h2>

                        <p>
                          Operator siz bilan bog‘lanishi
                          uchun
                        </p>
                      </div>
                    </div>

                    <div className={profileStyles.notice}>
                      {profile
                        ? "Kabinetdagi ma’lumotlaringiz avtomatik to‘ldirildi. Bu buyurtma uchun ularni o‘zgartirishingiz mumkin."
                        : "Ma’lumotlaringizni kiriting. Xohlasangiz, ularni keyingi buyurtmalar uchun shu brauzerda saqlang."}
                      {" "}
                      <a href="/cabinet">
                        Kabinetni ochish →
                      </a>
                    </div>

                    {profileWarning && (
                      <p
                        className={profileStyles.error}
                        role="status"
                      >
                        {profileWarning}
                      </p>
                    )}

                    <div className="orderFormGrid">
                      <div className="orderField">
                        <label htmlFor="customer_name">
                          Ism va familiya
                        </label>

                        <input
                          id="customer_name"
                          name="customer_name"
                          defaultValue={
                            profile?.customer_name || ""
                          }
                          required
                          minLength={2}
                          maxLength={100}
                          autoComplete="name"
                          placeholder="Masalan: Sardor Aliyev"
                        />
                      </div>

                      <div className="orderField">
                        <label htmlFor="phone">
                          Telefon raqami
                        </label>

                        <input
                          id="phone"
                          name="phone"
                          required
                          type="tel"
                          inputMode="tel"
                          value={phoneValue}
                          onChange={(event) =>
                            changePhone(event.target.value)
                          }
                          minLength={9}
                          maxLength={30}
                          title="Telefon raqamini to‘g‘ri kiriting"
                          autoComplete="tel"
                          placeholder="+998 90 123 45 67"
                        />
                      </div>

                      <div className="orderField">
                        <label htmlFor="region">
                          Viloyat yoki shahar
                        </label>

                        <select
                          id="region"
                          name="region"
                          required
                          autoComplete="address-level1"
                          defaultValue={
                            profile?.region || ""
                          }
                        >
                          <option value="" disabled>
                            Hududni tanlang
                          </option>

                          {regions.map((region) => (
                            <option
                              value={region}
                              key={region}
                            >
                              {region}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="orderField">
                        <label htmlFor="district">
                          Tuman yoki shahar
                        </label>

                        <input
                          id="district"
                          name="district"
                          defaultValue={
                            profile?.district || ""
                          }
                          required
                          minLength={2}
                          maxLength={100}
                          autoComplete="address-level2"
                          placeholder="Masalan: Chilonzor tumani"
                        />
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: "18px",
                        padding: "18px",
                        border: "1px solid var(--line)",
                        borderRadius: "14px",
                        background: "var(--bg)",
                      }}
                    >
                      <strong>Telefonni Telegram orqali tasdiqlash</strong>

                      {verifiedPhone ? (
                        <p
                          style={{
                            margin: "10px 0 0",
                            color: "#22a657",
                            fontWeight: 800,
                          }}
                        >
                          ✓ Telefon tasdiqlandi
                        </p>
                      ) : (
                        <>
                          <p
                            style={{
                              margin: "8px 0 14px",
                              color: "var(--muted)",
                              lineHeight: 1.55,
                            }}
                          >
                            Botni oching, Start tugmasini bosing va u yuborgan
                            6 xonali kodni shu yerga kiriting.
                          </p>

                          {!verificationId ? (
                            <button
                              type="button"
                              onClick={startTelegramVerification}
                              disabled={verificationLoading}
                              style={{
                                border: 0,
                                borderRadius: "11px",
                                padding: "13px 17px",
                                background: "#229ed9",
                                color: "white",
                                fontWeight: 800,
                                cursor: "pointer",
                              }}
                            >
                              {verificationLoading
                                ? "Ochilmoqda..."
                                : "TELEGRAM BOTNI OCHISH"}
                            </button>
                          ) : (
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: "10px",
                                alignItems: "center",
                              }}
                            >
                              <input
                                value={verificationCode}
                                onChange={(event) =>
                                  setVerificationCode(
                                    event.target.value
                                      .replace(/\D/g, "")
                                      .slice(0, 6)
                                  )
                                }
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                placeholder="6 xonali kod"
                                aria-label="Telegram tasdiqlash kodi"
                                style={{ maxWidth: "180px" }}
                              />

                              <button
                                type="button"
                                onClick={confirmTelegramCode}
                                disabled={verificationLoading}
                              >
                                {verificationLoading
                                  ? "Tekshirilmoqda..."
                                  : "KODNI TASDIQLASH"}
                              </button>

                              <a
                                href={botUrl}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Botni qayta ochish
                              </a>

                              <button
                                type="button"
                                onClick={() => {
                                  setVerificationId("");
                                  setVerificationCode("");
                                  setBotUrl("");
                                  setVerificationError("");
                                }}
                              >
                                Yangi kod olish
                              </button>
                            </div>
                          )}

                          {verificationError && (
                            <p
                              role="alert"
                              style={{
                                margin: "12px 0 0",
                                color: "#c42c24",
                              }}
                            >
                              {verificationError}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </section>

                  <section className="orderSectionCard">
                    <div className="orderSectionHeading">
                      <span>2</span>

                      <div>
                        <h2>Yetkazib berish</h2>

                        <p>
                          Buyurtma yuboriladigan aniq
                          manzil
                        </p>
                      </div>
                    </div>

                    <div className="orderDeliveryChoice">
                      <div className="orderDeliveryIcon">
                        🚚
                      </div>

                      <div>
                        <strong>
                          Kuryer orqali yetkazib berish
                        </strong>

                        <span>
                          O‘zbekiston bo‘ylab · operator
                          bilan kelishiladi
                        </span>
                      </div>

                      <b>Tanlandi</b>
                    </div>

                    <div className="orderField">
                      <label htmlFor="address">
                        Yetkazib berish manzili
                      </label>

                      <textarea
                        id="address"
                        name="address"
                        defaultValue={
                          profile?.address || ""
                        }
                        required
                        minLength={5}
                        maxLength={300}
                        autoComplete="street-address"
                        placeholder="Ko‘cha, uy va mo‘ljalni kiriting"
                      />
                    </div>

                    <div className="orderField">
                      <label htmlFor="customer_note">
                        Buyurtmaga qo‘shimcha izoh{" "}
                        <em>Ixtiyoriy</em>
                      </label>

                      <textarea
                        id="customer_note"
                        name="customer_note"
                        maxLength={500}
                        placeholder="Operatorga qo‘shimcha ma’lumot yozishingiz mumkin"
                      />
                    </div>

                    <label
                      className={profileStyles.remember}
                    >
                      <input
                        type="checkbox"
                        checked={rememberProfile}
                        disabled={submitting}
                        onChange={(event) =>
                          setRememberProfile(
                            event.target.checked
                          )
                        }
                      />

                      <span>
                        Bu ma’lumotlarni kabinetimda
                        saqlash

                        <small>
                          Buyurtma qabul qilingach, shu
                          brauzerdagi profil yangilanadi.
                          Umumiy qurilmada belgilamang.
                        </small>
                      </span>
                    </label>
                  </section>
                </div>

                <aside className="orderSummaryCard">
                  <div className="orderSummaryTitle">
                    <h2>Buyurtmangiz</h2>

                    <span>
                      {items.length} xil mahsulot
                    </span>
                  </div>

                  <div className="orderSummaryItems">
                    {items.map((item) => (
                      <div
                        className="orderSummaryItem"
                        key={`${item.id}-${item.size_id}-${item.color_id}`}
                      >
                        <div className="orderSummaryImage">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                            />
                          ) : (
                            <span>🧩</span>
                          )}

                          <b>{item.quantity}×</b>
                        </div>

                        <div className="orderSummaryInfo">
                          <strong>{item.name}</strong>
                          {(item.size_label || item.color_name) && <small>{[item.size_label,item.color_name].filter(Boolean).join(" · ")}</small>}

                          <span>
                            {item.quantity} dona ×{" "}
                            {Number(
                              item.price
                            ).toLocaleString("ru")}{" "}
                            so‘m
                          </span>
                        </div>

                        <b className="orderSummaryPrice">
                          {(
                            Number(item.price) *
                            item.quantity
                          ).toLocaleString("ru")}{" "}
                          so‘m
                        </b>
                      </div>
                    ))}
                  </div>

                  <div className="orderSummaryTotals">
                    <div>
                      <span>Mahsulotlar</span>

                      <b>
                        {total.toLocaleString("ru")} so‘m
                      </b>
                    </div>

                    <div>
                      <span>Yetkazib berish</span>
                      <b>Kelishiladi</b>
                    </div>

                    <div className="orderSummaryGrandTotal">
                      <span>Jami</span>

                      <strong>
                        {total.toLocaleString("ru")} so‘m
                      </strong>
                    </div>
                  </div>

                  {error && (
                    <div
                      className="orderPageError"
                      role="alert"
                    >
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="orderSubmitButton"
                    disabled={submitting}
                  >
                    {submitting
                      ? "Yuborilmoqda..."
                      : "BUYURTMANI TASDIQLASH"}
                  </button>

                  <p className="orderConsent">
                    Tugmani bosish orqali buyurtma
                    ma’lumotlarini yuborishga rozilik
                    bildirasiz.
                  </p>
                </aside>
              </form>
            )}
          </>
        )}
      </main>

      <ThemeButton />
    </div>
  );
}
