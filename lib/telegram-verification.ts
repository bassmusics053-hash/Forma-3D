import {
  createHash,
  randomInt,
  timingSafeEqual,
} from "node:crypto";

export const VERIFICATION_LIFETIME_MINUTES = 10;
export const VERIFIED_LIFETIME_MINUTES = 30;

export function normalizePhone(value: unknown): string {
  const phone = String(value ?? "").trim();

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

export function createVerificationCode(): string {
  return String(randomInt(100000, 1_000_000));
}

function verificationPepper(): string {
  const pepper = process.env.TELEGRAM_VERIFICATION_PEPPER;

  if (!pepper) {
    throw new Error("TELEGRAM_VERIFICATION_PEPPER topilmadi");
  }

  return pepper;
}

export function hashVerificationCode(
  verificationId: string,
  code: string
): string {
  return createHash("sha256")
    .update(`${verificationId}:${code}:${verificationPepper()}`)
    .digest("hex");
}

export function codesMatch(
  actualHash: string,
  expectedHash: string
): boolean {
  const actual = Buffer.from(actualHash, "hex");
  const expected = Buffer.from(expectedHash, "hex");

  return (
    actual.length === expected.length &&
    timingSafeEqual(actual, expected)
  );
}

export function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export function addMinutes(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}
