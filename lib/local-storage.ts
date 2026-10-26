export type LocalProfile = {
  customer_name: string;
  phone: string;
  region: string;
  district: string;
  address: string;
};

export const PROFILE_KEY = "forma3d-local-profile-v1";
export const OTHER_DISTRICT = "Boshqa";

export const regions = [
  "Toshkent shahri",
  "Toshkent viloyati",
  "Andijon viloyati",
  "Buxoro viloyati",
  "Farg‘ona viloyati",
  "Jizzax viloyati",
  "Xorazm viloyati",
  "Namangan viloyati",
  "Navoiy viloyati",
  "Qashqadaryo viloyati",
  "Qoraqalpog‘iston Respublikasi",
  "Samarqand viloyati",
  "Sirdaryo viloyati",
  "Surxondaryo viloyati",
] as const;

export type Region = (typeof regions)[number];

export const districtsByRegion: Record<Region, readonly string[]> = {
  "Toshkent shahri": [
    "Bektemir tumani",
    "Chilonzor tumani",
    "Mirobod tumani",
    "Mirzo Ulug‘bek tumani",
    "Olmazor tumani",
    "Sergeli tumani",
    "Shayxontohur tumani",
    "Uchtepa tumani",
    "Yakkasaroy tumani",
    "Yashnobod tumani",
    "Yangihayot tumani",
    "Yunusobod tumani",
  ],

  "Toshkent viloyati": [
    "Angren shahri",
    "Bekobod shahri",
    "Chirchiq shahri",
    "Nurafshon shahri",
    "Ohangaron shahri",
    "Olmaliq shahri",
    "Yangiyo‘l shahri",
    "Bekobod tumani",
    "Bo‘ka tumani",
    "Bo‘stonliq tumani",
    "Chinoz tumani",
    "Ohangaron tumani",
    "Oqqo‘rg‘on tumani",
    "Parkent tumani",
    "Piskent tumani",
    "Qibray tumani",
    "Quyi Chirchiq tumani",
    "Toshkent tumani",
    "O‘rta Chirchiq tumani",
    "Yangiyo‘l tumani",
    "Yuqori Chirchiq tumani",
    "Zangiota tumani",
  ],

  "Andijon viloyati": [
    "Andijon shahri",
    "Xonobod shahri",
    "Andijon tumani",
    "Asaka tumani",
    "Baliqchi tumani",
    "Bo‘ston tumani",
    "Buloqboshi tumani",
    "Izboskan tumani",
    "Jalaquduq tumani",
    "Marhamat tumani",
    "Oltinko‘l tumani",
    "Paxtaobod tumani",
    "Qo‘rg‘ontepa tumani",
    "Shahrixon tumani",
    "Ulug‘nor tumani",
    "Xo‘jaobod tumani",
  ],

  "Buxoro viloyati": [
    "Buxoro shahri",
    "Kogon shahri",
    "Buxoro tumani",
    "G‘ijduvon tumani",
    "Jondor tumani",
    "Kogon tumani",
    "Olot tumani",
    "Peshku tumani",
    "Qorako‘l tumani",
    "Qorovulbozor tumani",
    "Romitan tumani",
    "Shofirkon tumani",
    "Vobkent tumani",
  ],

  "Farg‘ona viloyati": [
    "Farg‘ona shahri",
    "Marg‘ilon shahri",
    "Qo‘qon shahri",
    "Quvasoy shahri",
    "Bag‘dod tumani",
    "Beshariq tumani",
    "Buvayda tumani",
    "Dang‘ara tumani",
    "Farg‘ona tumani",
    "Furqat tumani",
    "Oltiariq tumani",
    "O‘zbekiston tumani",
    "Qo‘shtepa tumani",
    "Quva tumani",
    "Rishton tumani",
    "So‘x tumani",
    "Toshloq tumani",
    "Uchko‘prik tumani",
    "Yozyovon tumani",
  ],

  "Jizzax viloyati": [
    "Jizzax shahri",
    "Arnasoy tumani",
    "Baxmal tumani",
    "Do‘stlik tumani",
    "Forish tumani",
    "G‘allaorol tumani",
    "Mirzacho‘l tumani",
    "Paxtakor tumani",
    "Sharof Rashidov tumani",
    "Yangiobod tumani",
    "Zafarobod tumani",
    "Zarbdor tumani",
    "Zomin tumani",
  ],

  "Xorazm viloyati": [
    "Urganch shahri",
    "Xiva shahri",
    "Bog‘ot tumani",
    "Gurlan tumani",
    "Hazorasp tumani",
    "Xiva tumani",
    "Xonqa tumani",
    "Qo‘shko‘pir tumani",
    "Shovot tumani",
    "Tuproqqal’a tumani",
    "Urganch tumani",
    "Yangiariq tumani",
    "Yangibozor tumani",
  ],

  "Namangan viloyati": [
    "Namangan shahri",
    "Chortoq tumani",
    "Chust tumani",
    "Kosonsoy tumani",
    "Mingbuloq tumani",
    "Namangan tumani",
    "Norin tumani",
    "Pop tumani",
    "To‘raqo‘rg‘on tumani",
    "Uchqo‘rg‘on tumani",
    "Uychi tumani",
    "Yangiqo‘rg‘on tumani",
  ],

  "Navoiy viloyati": [
    "Navoiy shahri",
    "Zarafshon shahri",
    "G‘ozg‘on shahri",
    "Karmana tumani",
    "Konimex tumani",
    "Navbahor tumani",
    "Nurota tumani",
    "Qiziltepa tumani",
    "Tomdi tumani",
    "Uchquduq tumani",
    "Xatirchi tumani",
  ],

  "Qashqadaryo viloyati": [
    "Qarshi shahri",
    "Shahrisabz shahri",
    "Chiroqchi tumani",
    "Dehqonobod tumani",
    "G‘uzor tumani",
    "Kasbi tumani",
    "Kitob tumani",
    "Ko‘kdala tumani",
    "Koson tumani",
    "Mirishkor tumani",
    "Muborak tumani",
    "Nishon tumani",
    "Qamashi tumani",
    "Qarshi tumani",
    "Shahrisabz tumani",
    "Yakkabog‘ tumani",
  ],

  "Qoraqalpog‘iston Respublikasi": [
    "Nukus shahri",
    "Amudaryo tumani",
    "Beruniy tumani",
    "Bo‘zatov tumani",
    "Chimboy tumani",
    "Ellikqal’a tumani",
    "Kegeyli tumani",
    "Mo‘ynoq tumani",
    "Nukus tumani",
    "Qanliko‘l tumani",
    "Qorao‘zak tumani",
    "Qo‘ng‘irot tumani",
    "Shumanay tumani",
    "Taxtako‘pir tumani",
    "Taxiatosh tumani",
    "To‘rtko‘l tumani",
    "Xo‘jayli tumani",
  ],

  "Samarqand viloyati": [
    "Samarqand shahri",
    "Kattaqo‘rg‘on shahri",
    "Bulung‘ur tumani",
    "Ishtixon tumani",
    "Jomboy tumani",
    "Kattaqo‘rg‘on tumani",
    "Narpay tumani",
    "Nurobod tumani",
    "Oqdaryo tumani",
    "Paxtachi tumani",
    "Pastdarg‘om tumani",
    "Payariq tumani",
    "Qo‘shrabot tumani",
    "Samarqand tumani",
    "Toyloq tumani",
    "Urgut tumani",
  ],

  "Sirdaryo viloyati": [
    "Guliston shahri",
    "Shirin shahri",
    "Yangiyer shahri",
    "Boyovut tumani",
    "Guliston tumani",
    "Mirzaobod tumani",
    "Oqoltin tumani",
    "Sardoba tumani",
    "Sayxunobod tumani",
    "Sirdaryo tumani",
    "Xovos tumani",
  ],

  "Surxondaryo viloyati": [
    "Termiz shahri",
    "Denov shahri",
    "Angor tumani",
    "Bandixon tumani",
    "Boysun tumani",
    "Denov tumani",
    "Jarqo‘rg‘on tumani",
    "Muzrabot tumani",
    "Oltinsoy tumani",
    "Qiziriq tumani",
    "Qumqo‘rg‘on tumani",
    "Sariosiyo tumani",
    "Sherobod tumani",
    "Sho‘rchi tumani",
    "Termiz tumani",
    "Uzun tumani",
  ],
};

export function getDistricts(region: string): readonly string[] {
  if (!regions.includes(region as Region)) {
    return [];
  }

  return districtsByRegion[region as Region];
}

export function emptyProfile(): LocalProfile {
  return {
    customer_name: "",
    phone: "+998 ",
    region: "",
    district: "",
    address: "",
  };
}

export function normalizePhone(value: string): string {
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

export function normalizeProfile(
  profile: LocalProfile
): LocalProfile {
  return {
    customer_name: profile.customer_name.trim(),
    phone: normalizePhone(profile.phone),
    region: profile.region.trim(),
    district: profile.district.trim(),
    address: profile.address.trim(),
  };
}

export function validateProfile(profile: LocalProfile): string {
  if (
    profile.customer_name.trim().length < 2 ||
    profile.customer_name.trim().length > 100
  ) {
    return "Ism va familiyangizni to‘liq kiriting.";
  }

  if (!normalizePhone(profile.phone)) {
    return "Telefon raqamini to‘g‘ri kiriting.";
  }

  if (!regions.includes(profile.region as Region)) {
    return "Viloyat yoki shaharni tanlang.";
  }

  if (
    profile.district.trim().length < 2 ||
    profile.district.trim().length > 100
  ) {
    return "Tuman yoki shaharni kiriting.";
  }

  if (
    profile.address.trim().length < 5 ||
    profile.address.trim().length > 300
  ) {
    return "Yetkazib berish manzilini to‘liq kiriting.";
  }

  return "";
}

export function readProfile(): {
  profile: LocalProfile | null;
  error: string;
} {
  if (typeof window === "undefined") {
    return { profile: null, error: "" };
  }

  try {
    const text = window.localStorage.getItem(PROFILE_KEY);

    if (!text) {
      return { profile: null, error: "" };
    }

    const data: unknown = JSON.parse(text);

    if (
      !data ||
      typeof data !== "object" ||
      !("version" in data) ||
      !("profile" in data) ||
      data.version !== 1
    ) {
      return {
        profile: null,
        error: "Saqlangan profilni o‘qib bo‘lmadi.",
      };
    }

    const rawProfile = data.profile;

    if (
      !rawProfile ||
      typeof rawProfile !== "object" ||
      !("customer_name" in rawProfile) ||
      !("phone" in rawProfile) ||
      !("region" in rawProfile) ||
      !("district" in rawProfile) ||
      !("address" in rawProfile)
    ) {
      return {
        profile: null,
        error: "Saqlangan profilni o‘qib bo‘lmadi.",
      };
    }

    const profile = rawProfile as LocalProfile;
    const error = validateProfile(profile);

    if (error) {
      return { profile: null, error };
    }

    return {
      profile: normalizeProfile(profile),
      error: "",
    };
  } catch {
    return {
      profile: null,
      error: "Saqlangan profilni o‘qib bo‘lmadi.",
    };
  }
}

export function saveProfile(
  profile: LocalProfile
): LocalProfile {
  const error = validateProfile(profile);

  if (error) {
    throw new Error(error);
  }

  const normalizedProfile = normalizeProfile(profile);

  if (typeof window === "undefined") {
    throw new Error("Profilni saqlash faqat brauzerda ishlaydi.");
  }

  window.localStorage.setItem(
    PROFILE_KEY,
    JSON.stringify({
      version: 1,
      profile: normalizedProfile,
    })
  );

  return normalizedProfile;
}

export function clearProfile(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(PROFILE_KEY);
  }
}