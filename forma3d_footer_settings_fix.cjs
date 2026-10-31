/**
 * FORMA 3D: fixes the actual Settings form, database save payload, and footer.
 * Run in the project root: node .\forma3d_footer_settings_fix.cjs
 * No credentials are read. Original changed files are backed up to OS temp.
 */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const root = process.cwd();
const paths = {
  admin: 'components/AdminDashboard.tsx',
  adminApi: 'app/api/admin/settings/route.ts',
  store: 'components/LuxuryStore.tsx',
  footer: 'components/FooterContactInfo.tsx',
  css: 'components/luxury-store.css',
};
const original = {};
for (const [key, relative] of Object.entries(paths)) {
  const full = path.join(root, relative);
  if (!fs.existsSync(full) && key !== 'footer') {
    console.error(`To'xtatildi: ${relative} topilmadi. Hech narsa o'zgartirilmadi.`);
    process.exit(1);
  }
  original[key] = fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : null;
}
const updates = { ...original };
function fail(message) {
  console.error(`To'xtatildi: ${message}. Hech narsa o'zgartirilmadi.`);
  process.exit(1);
}

// 1) Add fields within the real settingsCard form, never elsewhere.
const formStartToken = '<form className="settingsCard" onSubmit={saveSettings}>';
const formStart = updates.admin.indexOf(formStartToken);
if (formStart < 0) fail('Sozlamalar formasi settingsCard topilmadi');
const formEnd = updates.admin.indexOf('</form>', formStart);
if (formEnd < 0) fail('Sozlamalar formasi oxiri topilmadi');
let before = updates.admin.slice(0, formStart);
let form = updates.admin.slice(formStart, formEnd + '</form>'.length);
let after = updates.admin.slice(formEnd + '</form>'.length);
if (!form.includes('name="phone"') || !form.includes('name="telegram_url"')) {
  fail('Sozlamalar formasi ichida phone va telegram_url topilmadi');
}
const newPhone = `              <div className="field">
                <label>Ikkinchi telefon raqami</label>
                <input
                  name="phone_2"
                  type="tel"
                  defaultValue={settings.phone_2 || ""}
                  placeholder="+998 XX XXX XX XX"
                />
              </div>

`;
const newChannel = `              <div className="field">
                <label>Telegram kanal havolasi</label>
                <input
                  name="telegram_channel_url"
                  type="text"
                  defaultValue={settings.telegram_channel_url || ""}
                  placeholder="https://t.me/kanal_nomi"
                />
              </div>

`;
if (!form.includes('name="phone_2"')) {
  const match = form.match(/(?=\s*<div className="field">\s*<label>Google Maps<\/label>)/);
  if (!match || match.index == null) fail('Telefon maydonini qo\'shish uchun Google Maps ankori topilmadi');
  form = form.slice(0, match.index) + '\n' + newPhone + form.slice(match.index);
}
if (!form.includes('name="telegram_channel_url"')) {
  const match = form.match(/(?=\s*<div className="field">\s*<label>Instagram havolasi<\/label>)/);
  if (!match || match.index == null) fail('Telegram maydonini qo\'shish uchun Instagram havolasi ankori topilmadi');
  form = form.slice(0, match.index) + '\n' + newChannel + form.slice(match.index);
}
updates.admin = before + form + after;

// Ensure type Settings knows both fields without replacing any existing properties.
updates.admin = updates.admin.replace(/type Settings\s*=\s*\{([\s\S]*?)\};/, (full, inside) => {
  const extra = [
    !/\bphone_2\??\s*:/.test(inside) ? '  phone_2?: string;\n' : '',
    !/\btelegram_channel_url\??\s*:/.test(inside) ? '  telegram_channel_url?: string;\n' : '',
  ].join('');
  return `type Settings = {${inside}${extra}};`;
});
if (!updates.admin.includes('phone_2?: string') || !updates.admin.includes('telegram_channel_url?: string')) {
  fail('Settings turini yangilab bo\'lmadi');
}

// 2) Update the API payload while preserving existing fields & authentication.
let api = updates.adminApi;
if (!/\.from\s*\(\s*['"]settings['"]\s*\)/.test(api)) fail('Settings admin API tuzilishi tanilmadi');
if (!/\bphone_2\s*:/.test(api)) {
  const pattern = /(\bphone\s*:\s*b\.phone\s*\|\|\s*null\s*,?)/;
  if (!pattern.test(api)) fail('Settings API phone payload topilmadi');
  api = api.replace(pattern, match => match.replace(/,?$/, ',') + 'phone_2:b.phone_2||null,');
}
if (!/\btelegram_channel_url\s*:/.test(api)) {
  const pattern = /(\btelegram_url\s*:\s*b\.telegram_url\s*\|\|\s*null\s*,?)/;
  if (!pattern.test(api)) fail('Settings API telegram_url payload topilmadi');
  api = api.replace(pattern, match => match.replace(/,?$/, ',') + 'telegram_channel_url:b.telegram_channel_url||null,');
}
updates.adminApi = api;

// 3) Ensure the actual footer is included in the customer-facing page.
let store = updates.store;
if (!store.includes('FooterContactInfo')) {
  const importMark = 'import "./luxury-store.css";';
  if (!store.includes(importMark)) fail('LuxuryStore import bloki tanilmadi');
  store = store.replace(importMark, `${importMark}\nimport FooterContactInfo from "./FooterContactInfo";`);
}
if (!store.includes('<FooterContactInfo')) {
  const old = /<div><h3>Aloqa<\/h3><p>Telegram va Instagram orqali biz bilan bog‘laning\.[\s\S]*?<\/p><\/div><div><h3>FORMA 3D<\/h3>[\s\S]*?<\/div>/;
  if (!old.test(store)) fail('Footerning eski Aloqa va FORMA 3D bloklari topilmadi');
  store = store.replace(old, '<FooterContactInfo />');
}
updates.store = store;

// 4) Public footer fetches the saved contact fields from the existing GET API.
const footerSource = `"use client";

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
          <a key={i} href={"tel:" + phone.replace(/[^\\d+]/g, "")}>
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
`;
// Preserve user's existing footer if it already supports all requested fields.
updates.footer = original.footer &&
  ['phone_2', 'telegram_channel_url', 'instagram_url', 'phone'].every(x => original.footer.includes(x))
  ? original.footer : footerSource;

// CSS only if not already present.
if (!updates.css.includes('.lux-footer .forma-footer-contacts a')) {
  updates.css += `\n\n/* FORMA 3D footer contacts */
.lux-footer .forma-footer-contacts a,
.lux-footer .forma-footer-socials a {
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 13px; color: #e8e5e9;
  text-decoration: none; font-size: 13px;
}
.lux-footer .forma-footer-contacts a:hover,
.lux-footer .forma-footer-socials a:hover { color: #ed7618; }
.forma-footer-icon { color: #ed7618; font-size: 18px; width: 24px; flex-shrink: 0; }
`;
}

// Verify final in-memory state before committing anything.
const formOut = updates.admin.slice(updates.admin.indexOf(formStartToken));
for (const item of ['name="phone_2"', 'name="telegram_channel_url"']) {
  if (!formOut.slice(0, formOut.indexOf('</form>')).includes(item)) fail(`${item} form ichida yo'q`);
}
for (const item of ['phone_2:', 'telegram_channel_url:']) {
  if (!updates.adminApi.includes(item)) fail(`${item} API da yo'q`);
}
if (!updates.store.includes('<FooterContactInfo')) fail('Footer sahifaga ulanmagan');

// Save files, backing up only modified sources in OS temp (outside the Git repo).
const changes = Object.keys(paths).filter(key => updates[key] !== original[key]);
if (changes.length === 0) {
  console.log('O\'zgarish kerak emas: sozlamalar allaqachon mavjud.');
  process.exit(0);
}
const backupFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'forma3d-footer-backup-'));
for (const key of changes) {
  const relative = paths[key];
  const backup = path.join(backupFolder, relative);
  if (original[key] != null) {
    fs.mkdirSync(path.dirname(backup), { recursive: true });
    fs.writeFileSync(backup, original[key], 'utf8');
  }
}
for (const key of changes) {
  const full = path.join(root, paths[key]);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, updates[key], 'utf8');
  console.log('Yangilandi:', paths[key]);
}
console.log('Zaxira nusxa:', backupFolder);
console.log('Tayyor. Endi npx.cmd tsc --noEmit va npm.cmd run build ni bajaring.');
