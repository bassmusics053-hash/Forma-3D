"use client";

import { useEffect, useState } from "react";

type ThemeButtonProps = {
  variant?: "floating" | "header";
};

type Language = "uz" | "ru";

export default function ThemeButton({
  variant = "floating",
}: ThemeButtonProps) {
  const [dark, setDark] = useState(true);
  const [language, setLanguage] = useState<Language>("uz");

  useEffect(() => {
    const savedTheme = localStorage.getItem("forma3d-theme");
    const isDark = savedTheme !== "light";
    const savedLanguage = localStorage.getItem("forma3d-language");

    setDark(isDark);
    document.body.classList.toggle("dark", isDark);

    if (savedLanguage === "uz" || savedLanguage === "ru") {
      setLanguage(savedLanguage);
    }

    function handleLanguageChange(event: Event) {
      const nextLanguage = (event as CustomEvent<Language>).detail;

      if (nextLanguage === "uz" || nextLanguage === "ru") {
        setLanguage(nextLanguage);
      }
    }

    window.addEventListener("forma3d-language-change", handleLanguageChange);

    return () => {
      window.removeEventListener("forma3d-language-change", handleLanguageChange);
    };
  }, []);

  const t = (uzbek: string, russian: string) =>
    language === "ru" ? russian : uzbek;

  function changeTheme() {
    const newDark = !dark;

    setDark(newDark);
    document.body.classList.toggle("dark", newDark);

    localStorage.setItem(
      "forma3d-theme",
      newDark ? "dark" : "light"
    );
  }

  if (variant === "header") {
    return (
      <button
        type="button"
        className="action"
        onClick={changeTheme}
        title={
          dark
            ? t("Kunduzgi rejim", "Светлая тема")
            : t("Tungi rejim", "Тёмная тема")
        }
      >
        <i>{dark ? "☀️" : "🌙"}</i>
        {dark
          ? t("Kunduzgi", "Светлая")
          : t("Tungi", "Тёмная")}
      </button>
    );
  }

  return (
    <button
      type="button"
      className="theme"
      onClick={changeTheme}
      title={
        dark
          ? t("Kunduzgi rejim", "Светлая тема")
          : t("Tungi rejim", "Тёмная тема")
      }
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
