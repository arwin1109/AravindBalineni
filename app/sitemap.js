const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://aravindbalineni.code2vibe.dev";

export default function sitemap() {
  const now = new Date();

  return [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${siteUrl}/blog`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
  ];
}
