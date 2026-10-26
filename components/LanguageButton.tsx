"use client";

import { useEffect, useRef, useState } from "react";

type Language = "uz" | "ru";

export default function LanguageButton() {
  const [language, setLanguage] = useState<Language>("uz");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem("forma3d-language");

    if (savedLanguage === "uz" || savedLanguage === "ru") {
      setLanguage(savedLanguage);
      document.documentElement.lang = savedLanguage;
    }

    function closeMenu(event: globalThis.MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", closeMenu);

    return () => {
      document.removeEventListener("mousedown", closeMenu);
    };
  }, []);

  function changeLanguage(newLanguage: Language) {
    setLanguage(newLanguage);
    setOpen(false);

    window.localStorage.setItem("forma3d-language", newLanguage);
    document.documentElement.lang = newLanguage;

    window.dispatchEvent(
      new CustomEvent("forma3d-language-change", {
        detail: newLanguage,
      })
    );
  }

  return (
    <div className="languageSwitcher" ref={wrapperRef}>
      <button
        type="button"
        className="action languageButton"
        aria-label="Tilni almashtirish"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <i aria-hidden="true">🌐</i>
        {language.toUpperCase()} <span>⌄</span>
      </button>

      {open && (
        <div className="languageMenu">
          <button
            type="button"
            className={language === "uz" ? "active" : ""}
            onClick={() => changeLanguage("uz")}
          >
            O'zbekcha
          </button>

          <button
            type="button"
            className={language === "ru" ? "active" : ""}
            onClick={() => changeLanguage("ru")}
          >
            Русский
          </button>
        </div>
      )}
    </div>
  );
}
