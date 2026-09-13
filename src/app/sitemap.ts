import type { MetadataRoute } from "next";

import { oeffentlicheRouten, siteUrl } from "@/lib/site";

/** Nur öffentliche Routen. Auth-Seiten gehören nicht in den Index. */
export default function sitemap(): MetadataRoute.Sitemap {
  const stand = new Date();

  return oeffentlicheRouten.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: stand,
    changeFrequency: route === "/" || route === "/preise" ? "weekly" : "yearly",
    priority: route === "/" ? 1 : route === "/preise" ? 0.8 : 0.3,
  }));
}
