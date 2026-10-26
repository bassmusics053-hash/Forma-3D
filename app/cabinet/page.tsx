"use client";

import {
  useEffect,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";

import ThemeButton from "@/components/ThemeButton";
import {
  OTHER_DISTRICT,
  getDistricts,
  regions,
} from "@/lib/local-storage";

type Profile = {
  customer_name: string;
  phone: string;
  region: string;
  district: string;
  address: string;
};

const PROFILE_KEY = "forma3d-local-profile-v1";

const inputStyle: CSSProperties = {
  width: "100%",
  minHeight: "52px",
  boxSizing: "border-box",
  padding: "13px 14px",
  border: "1px solid var(--line)",
  borderRadius: "12px",
  background: "var(--bg)",
  color: "var(--ink)",
  font: "inherit",
  outline: "none",
};

function emptyProfile(): Profile {
  return {
    customer_name: "",
    phone: "+998 ",
    region: "",
    district: "",
    address: "",
  };
}

function formatPhone(value: string): string {
  const phone = value.trim();

  if (!/^\+?[\d\s()-]+$/.test(phone)) {
    return "";
  }

  const digits = phone.replace(/\D/g, "");

  if (digits.length === 9 && !phone.startsWith("+")) {
    return `+998${digits}`;
  }

  if (/^[1-9]\d{8,14}$/.test(digits)) {
    return `+${digits}`;
  }

  return "";
}

function validateProfile(profile: Profile): string {
  if (profile.customer_name.trim().length < 2) {
    return "Ism va familiyangizni to‘liq kiriting.";
  }

  if (!formatPhone(profile.phone)) {
    return "Telefon raqamini to‘g‘ri kiriting.";
  }

  if (!regions.some(region => region === profile.region)) {
    return "Viloyat yoki shaharni tanlang.";
  }

  if (profile.district.trim().length < 2) {
    return "Tuman yoki shaharni kiriting.";
  }

  if (profile.address.trim().length < 5) {
    return "Yetkazib berish manzilini to‘liq kiriting.";
  }

  return "";
}

function cleanProfile(profile: Profile): Profile {
  return {
    customer_name: profile.customer_name.trim(),
    phone: formatPhone(profile.phone),
    region: profile.region,
    district: profile.district.trim(),
    address: profile.address.trim(),
  };
}

export default function CabinetPage() {
  const [profile, setProfile] =
    useState<Profile>(emptyProfile);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [savedPopup, setSavedPopup] = useState(false);
  const [customDistrict, setCustomDistrict] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(PROFILE_KEY);

      if (saved) {
        const parsed = JSON.parse(saved);

        if (
          parsed &&
          parsed.version === 1 &&
          parsed.profile &&
          typeof parsed.profile.customer_name === "string" &&
          typeof parsed.profile.phone === "string" &&
          typeof parsed.profile.region === "string" &&
          typeof parsed.profile.district === "string" &&
          typeof parsed.profile.address === "string"
        ) {
          setProfile(parsed.profile);
          setCustomDistrict(
            Boolean(
              parsed.profile.district &&
                !getDistricts(parsed.profile.region).includes(
                  parsed.profile.district
                )
            )
          );
        }
      }
    } catch {
      // Eski yoki buzilgan profil e'tiborsiz qoldiriladi.
    } finally {
      setReady(true);
    }
  }, []);

  function update(field: keyof Profile, value: string) {
    setProfile((oldProfile) => ({
      ...oldProfile,
      [field]: value,
    }));

    setError("");
    setMessage("");
  }

  function changeRegion(value: string) {
    setProfile((oldProfile) => ({
      ...oldProfile,
      region: value,
      district: "",
    }));

    setCustomDistrict(false);
    setError("");
    setMessage("");
  }

  function changeDistrict(value: string) {
    if (value === OTHER_DISTRICT) {
      setCustomDistrict(true);
      update("district", "");
      return;
    }

    setCustomDistrict(false);
    update("district", value);
  }

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateProfile(profile);

    if (validationError) {
      setError(validationError);
      return;
    }

    const savedProfile = cleanProfile(profile);

    try {
      window.localStorage.setItem(
        PROFILE_KEY,
        JSON.stringify({
          version: 1,
          profile: savedProfile,
        })
      );

      setProfile(savedProfile);
      setError("");
      setMessage("");
      setSavedPopup(true);
    } catch {
      setError(
        "Ma’lumotlarni saqlab bo‘lmadi. Brauzer xotirasiga ruxsatni tekshiring."
      );
    }
  }

  function deleteProfile() {
    const confirmed = window.confirm(
      "Saqlangan ma’lumotlarni o‘chirasizmi?"
    );

    if (!confirmed) {
      return;
    }

    try {
      window.localStorage.removeItem(PROFILE_KEY);

      setProfile(emptyProfile());
      setCustomDistrict(false);
      setError("");
      setMessage("Profil shu brauzerdan o‘chirildi.");
    } catch {
      setError("Profilni o‘chirib bo‘lmadi.");
    }
  }

  if (!ready) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "var(--bg)",
          color: "var(--ink)",
        }}
      >
        Profil yuklanmoqda...
      </main>
    );
  }

  const districtOptions = getDistricts(profile.region);

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "32px 18px 90px",
        background: "var(--bg)",
        color: "var(--ink)",
      }}
    >
      <div
        style={{
          width: "min(850px, 100%)",
          margin: "0 auto",
        }}
      >
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
            marginBottom: "30px",
          }}
        >
          <a
            href="/"
            style={{
              color: "var(--ink)",
              textDecoration: "none",
              fontWeight: 800,
            }}
          >
            ← Do‘konga qaytish
          </a>

          <span
            style={{
              color: "var(--red)",
              fontWeight: 900,
              fontSize: "13px",
              letterSpacing: "1px",
            }}
          >
            FORMA 3D
          </span>
        </header>

        <section
          style={{
            padding: "clamp(22px, 5vw, 42px)",
            border: "1px solid var(--line)",
            borderRadius: "24px",
            background: "var(--panel)",
            boxShadow: "0 18px 50px rgba(0,0,0,.10)",
          }}
        >
          <span
            style={{
              color: "var(--red)",
              fontSize: "13px",
              fontWeight: 900,
              letterSpacing: "1.2px",
            }}
          >
            SHAXSIY KABINET
          </span>

          <h1
            style={{
              margin: "12px 0 8px",
              fontSize: "clamp(30px, 5vw, 45px)",
              lineHeight: 1.1,
            }}
          >
            Mening ma’lumotlarim
          </h1>

          <p
            style={{
              margin: "0 0 30px",
              color: "var(--muted)",
              lineHeight: 1.65,
            }}
          >
            Ma’lumotlarni bir marta saqlang. Keyingi buyurtmada
            ism, telefon va manzil avtomatik chiqadi.
          </p>

          <form onSubmit={saveProfile}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(235px, 1fr))",
                gap: "18px",
              }}
            >
              <label style={{ display: "grid", gap: "8px" }}>
                <b>Ism va familiya</b>

                <input
                  required
                  minLength={2}
                  value={profile.customer_name}
                  onChange={(event) =>
                    update("customer_name", event.target.value)
                  }
                  placeholder="Masalan: Sardor Aliyev"
                  style={inputStyle}
                />
              </label>

              <label style={{ display: "grid", gap: "8px" }}>
                <b>Telefon raqami</b>

                <input
                  required
                  type="tel"
                  value={profile.phone}
                  onChange={(event) =>
                    update("phone", event.target.value)
                  }
                  placeholder="+998 90 123 45 67"
                  style={inputStyle}
                />
              </label>

              <label style={{ display: "grid", gap: "8px" }}>
                <b>Viloyat yoki shahar</b>

                <select
                  required
                  value={profile.region}
                  onChange={(event) =>
                    changeRegion(event.target.value)
                  }
                  style={inputStyle}
                >
                  <option value="">Hududni tanlang</option>

                  {regions.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
              </label>

              <div style={{ display: "grid", gap: "8px" }}>
                <b>Tuman yoki shahar</b>

                <select
                  required
                  aria-label="Tuman yoki shahar"
                  value={
                    customDistrict
                      ? OTHER_DISTRICT
                      : profile.district
                  }
                  disabled={!profile.region}
                  onChange={(event) =>
                    changeDistrict(event.target.value)
                  }
                  style={inputStyle}
                >
                  <option value="">
                    {profile.region
                      ? "Tuman yoki shaharni tanlang"
                      : "Avval hududni tanlang"}
                  </option>

                  {districtOptions.map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}

                  <option value={OTHER_DISTRICT}>
                    {OTHER_DISTRICT}
                  </option>
                </select>

                {customDistrict && (
                  <input
                    required
                    minLength={2}
                    maxLength={100}
                    autoFocus
                    value={profile.district}
                    onChange={(event) =>
                      update("district", event.target.value)
                    }
                    placeholder="Tuman yoki shahar nomini yozing"
                    style={inputStyle}
                  />
                )}
              </div>

              <label
                style={{
                  display: "grid",
                  gap: "8px",
                  gridColumn: "1 / -1",
                }}
              >
                <b>Yetkazib berish manzili</b>

                <textarea
                  required
                  minLength={5}
                  rows={4}
                  value={profile.address}
                  onChange={(event) =>
                    update("address", event.target.value)
                  }
                  placeholder="Ko‘cha, uy va mo‘ljalni kiriting"
                  style={{
                    ...inputStyle,
                    minHeight: "112px",
                    resize: "vertical",
                  }}
                />
              </label>
            </div>

            {error && (
              <p
                style={{
                  margin: "22px 0 0",
                  padding: "14px 16px",
                  color: "#981c17",
                  background: "#ffeded",
                  borderRadius: "12px",
                }}
              >
                {error}
              </p>
            )}

            {message && (
              <p
                style={{
                  margin: "22px 0 0",
                  padding: "14px 16px",
                  color: "#17652c",
                  background: "#e7f9ea",
                  borderRadius: "12px",
                }}
              >
                ✓ {message}
              </p>
            )}

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "12px",
                marginTop: "30px",
              }}
            >
              <button
                type="submit"
                style={{
                  border: 0,
                  borderRadius: "12px",
                  padding: "16px 23px",
                  background: "var(--red)",
                  color: "#fff",
                  fontSize: "16px",
                  fontWeight: 850,
                  cursor: "pointer",
                }}
              >
                Ma’lumotlarni saqlash
              </button>

              <button
                type="button"
                onClick={deleteProfile}
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: "12px",
                  padding: "16px 23px",
                  background: "transparent",
                  color: "var(--ink)",
                  fontSize: "16px",
                  fontWeight: 750,
                  cursor: "pointer",
                }}
              >
                Profilni o‘chirish
              </button>
            </div>
          </form>
        </section>
      </div>

      {savedPopup && (
        <div
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              window.location.href = "/";
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            display: "grid",
            placeItems: "center",
            padding: "20px",
            background: "rgba(0, 0, 0, 0.72)",
            backdropFilter: "blur(7px)",
          }}
        >
          <section
            style={{
              width: "min(440px, 100%)",
              textAlign: "center",
              padding: "46px 30px 32px",
              borderRadius: "25px",
              background: "var(--panel)",
              color: "var(--ink)",
              border: "1px solid var(--line)",
              boxShadow: "0 30px 75px rgba(0,0,0,.45)",
            }}
          >
            <div
              style={{
                display: "grid",
                placeItems: "center",
                width: "102px",
                height: "102px",
                margin: "0 auto 23px",
                borderRadius: "50%",
                background: "#22a657",
                color: "#fff",
                fontSize: "62px",
                fontWeight: 900,
                boxShadow: "0 13px 32px rgba(34,166,87,.36)",
              }}
            >
              ✓
            </div>

            <h2
              style={{
                margin: "0 0 12px",
                fontSize: "29px",
              }}
            >
              Ma’lumotlar saqlandi!
            </h2>

            <p
              style={{
                margin: "0 0 28px",
                color: "var(--muted)",
                lineHeight: 1.65,
              }}
            >
              Buyurtmani rasmiylashtirish sahifasida
              ma’lumotlaringiz avtomatik to‘ldiriladi.
            </p>

            <button
              type="button"
              onClick={() => {
                window.location.href = "/";
              }}
              style={{
                width: "100%",
                border: 0,
                borderRadius: "12px",
                padding: "16px 20px",
                background: "var(--red)",
                color: "#fff",
                fontSize: "16px",
                fontWeight: 850,
                cursor: "pointer",
              }}
            >
              Do‘konga o‘tish
            </button>
          </section>
        </div>
      )}

      <ThemeButton />
    </main>
  );
}
