import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

type SlugItem = {
  slug?: unknown;
  active?: unknown;
};

async function loadSlugs(path: string): Promise<string[]> {
  try {
    const response = await fetch(`${SITE_URL}${path}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return [];
    }

    const data: unknown = await response.json();

    if (!Array.isArray(data)) {
      return [];
    }

    const slugs = data.flatMap((item: SlugItem) => {
      if (
        typeof item.slug === "string" &&
        item.slug.trim() &&
        item.active !== false
      ) {
        return [item.slug.trim()];
      }

      return [];
    });

    return [...new Set(slugs)];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const productSlugs = await loadSlugs("/api/products");

  const pages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/categories`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  for (const slug of productSlugs) {
    pages.push({
      url: `${SITE_URL}/products/${encodeURIComponent(slug)}`,
      changeFrequency: "weekly",
      priority: 0.9,
    });
  }

  return pages;
}