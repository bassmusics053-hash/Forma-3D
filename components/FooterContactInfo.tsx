"use client";

import { useEffect, useState } from "react";

type ContactSettings = {
  phone?: string | null;
  phone_2?: string | null;
  instagram_url?: string | null;
  telegram_channel_url?: string | null;
};

function allowedSocial(value: unknown, allowedHosts: string[]): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  let text = value.trim();
  if (text.startsWith("@")) text = "https://t.me/" + text.slice(1);
  if (text.startsWith("t.me/")) text = "https://" + text;
  try {
    const url = new URL(text);
    if (url.protocol !== "https:" || !allowedHosts.includes(url.hostname)) return null;
    return url.href;
  } catch { return null; }
}

export default function FooterContactInfo() {
  const [settings, setSettings] = useState<ContactSettings>({});
  useEffect(() => {
    let active = true;
    fetch("/api/settings", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => { if (active && data) setSettings(data); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const phones = [settings.phone, settings.phone_2]
    .filter((p): p is string => typeof p === "string" && p.trim().length > 0);
  const instagram = allowedSocial(settings.instagram_url, ["instagram.com", "www.instagram.com"]);
  const telegram = allowedSocial(settings.telegram_channel_url, ["t.me", "telegram.me"]);

  return (
    <>
      <div className="forma-footer-contacts">
        <h3>Aloqa</h3>
        {phones.map((phone, i) => (
          <a key={i} href={"tel:" + phone.replace(/[^\d+]/g, "")}>
            <span className="forma-footer-icon">☎</span>{phone}
          </a>
        ))}
        {phones.length === 0 && <p>Telefon raqamlari sozlanmagan.</p>}
      </div>
      <div className="forma-footer-socials">
        <h3>FORMA 3D</h3>
        {instagram && <a href={instagram} target="_blank" rel="noopener noreferrer"><span className="forma-footer-icon">◎</span>Instagram ↗</a>}
        {telegram && <a href={telegram} target="_blank" rel="noopener noreferrer"><span className="forma-footer-icon">➤</span>Telegram kanal ↗</a>}
        {!instagram && !telegram && <p>Ijtimoiy tarmoq havolalari sozlanmagan.</p>}
      </div>
    </>
  );
}
