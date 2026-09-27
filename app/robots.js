const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://aravindbalineni.code2vibe.dev";

export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
