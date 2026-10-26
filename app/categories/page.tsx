"use client";

import { useEffect, useMemo, useState } from "react";

import ThemeButton from "@/components/ThemeButton";

type Category = {
  id: string;
  name: string;
  slug: string;
  image_url?: string | null;
  description?: string | null;
  parent_id?: string | null;
  show_on_home?: boolean;
  sort_order?: number;
  active?: boolean;
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedParentSlug, setSelectedParentSlug] =
    useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(
      window.location.search
    );

    setSelectedParentSlug(params.get("parent") || "");

    async function loadCategories() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/categories", {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Kategoriyalarni yuklab bo‘lmadi"
          );
        }

        setCategories(
          Array.isArray(data) ? data : []
        );
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Kategoriyalarni yuklab bo‘lmadi"
        );
      } finally {
        setLoading(false);
      }
    }

    loadCategories();
  }, []);

  const orderedCategories = useMemo(() => {
    return [...categories].sort((first, second) => {
      const firstOrder = Number(first.sort_order || 0);
      const secondOrder = Number(second.sort_order || 0);

      if (firstOrder !== secondOrder) {
        return firstOrder - secondOrder;
      }

      return first.name.localeCompare(second.name);
    });
  }, [categories]);

  const selectedParent = useMemo(() => {
    if (!selectedParentSlug) return null;

    return orderedCategories.find(
      (category) =>
        category.slug === selectedParentSlug &&
        !category.parent_id
    );
  }, [orderedCategories, selectedParentSlug]);

  const shownCategories = useMemo(() => {
    if (!selectedParent) {
      // Barcha kategoriyalar sahifasida ota va
      // ichki kategoriyalarning hammasini ko‘rsatadi
      return orderedCategories;
    }

    // Ota kategoriya ochilganda faqat uning
    // ichki kategoriyalarini ko‘rsatadi
    return orderedCategories.filter(
      (category) =>
        category.parent_id === selectedParent.id
    );
  }, [orderedCategories, selectedParent]);

  function hasChildren(categoryId: string) {
    return orderedCategories.some(
      (category) =>
        category.parent_id === categoryId
    );
  }

  function getCategoryLink(category: Category) {
    if (hasChildren(category.id)) {
      return `/categories?parent=${category.slug}`;
    }

    return `/?category=${category.slug}#products`;
  }

  return (
    <>
      <header>
        <div className="wrap categoriesTop">
          <a href="/" aria-label="Bosh sahifa">
            <img
              className="logo"
              src="/forma3d-brand.webp"
              alt="FORMA 3D"
            />
          </a>

          <div className="categoriesHeaderActions">
            <a
              className="backButton"
              href={
                selectedParent
                  ? "/categories"
                  : "/"
              }
            >
              ←{" "}
              {selectedParent
                ? "Barcha kategoriyalar"
                : "Bosh sahifa"}
            </a>

            <ThemeButton variant="header" />
          </div>
        </div>
      </header>

      <main className="wrap categoriesPage">
        <div className="sectionHead">
          <div>
            <h1>
              {selectedParent
                ? selectedParent.name
                : "Barcha kategoriyalar"}
            </h1>

            <p>
              {selectedParent
                ? `${selectedParent.name} bo‘limini tanlang`
                : "Kerakli mahsulot turini tanlang"}
            </p>
          </div>

          <span>
            {shownCategories.length} ta kategoriya
          </span>
        </div>

        {error && (
          <div className="error">{error}</div>
        )}

        {loading ? (
          <div className="loading">
            Kategoriyalar yuklanmoqda...
          </div>
        ) : (
          <section className="categoriesGrid">
            {shownCategories.map((category) => (
              <a
                className="categoryCard"
                key={category.id}
                href={getCategoryLink(category)}
              >
                <div className="categoryCardImage">
                  {category.image_url ? (
                    <img
                      src={category.image_url}
                      alt={category.name}
                    />
                  ) : (
                    <span>
                      {category.slug.includes("gildirak")
                        ? "♟️"
                        : category.slug.includes("motor")
                          ? "⚙️"
                          : category.slug.includes("servo")
                            ? "🔧"
                            : category.slug.includes("kuzov")
                              ? "🧩"
                              : "✨"}
                    </span>
                  )}
                </div>

                <div className="categoryCardContent">
                  <h2>{category.name}</h2>

                  {category.description && (
                    <p>{category.description}</p>
                  )}

                  <b>
                    {hasChildren(category.id)
                      ? "Bo‘limni ochish →"
                      : "Mahsulotlarni ko‘rish →"}
                  </b>
                </div>
              </a>
            ))}

            {!shownCategories.length && (
              <div className="empty">
                Bu bo‘limda hozircha kategoriya
                mavjud emas
              </div>
            )}
          </section>
        )}
      </main>
    </>
  );
}