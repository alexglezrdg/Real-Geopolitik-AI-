import Parser from "rss-parser";

export type FeedItem = {
  source: string;
  title: string;
  link: string;
  isoDate?: string;
  snippet?: string;
};

const parser = new Parser({
  headers: {
    "User-Agent": "Mozilla/5.0 (GeopolitikBot/1.0; +https://example.com)"
  }
});

const DEFAULT_FEEDS: Array<{ name: string; url: string }> = [
  // English - Major international
  { name: "BBC World", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
  { name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml" },
  { name: "The Guardian World", url: "https://www.theguardian.com/world/rss" },
  { name: "NPR World", url: "https://feeds.npr.org/1004/rss.xml" },
  { name: "Reuters World", url: "https://www.reutersagency.com/feed/?taxonomy=best-regions&post_type=best" },

  // Spanish - Spain
  { name: "El País Internacional", url: "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/internacional/portada" },
  { name: "El Mundo", url: "https://e00-elmundo.uecdn.es/elmundo/rss/internacional.xml" },

  // Spanish - Latin America
  { name: "BBC Mundo", url: "https://feeds.bbci.co.uk/mundo/rss.xml" },
  { name: "France24 Español", url: "https://www.france24.com/es/rss" },
  { name: "DW Español", url: "https://rss.dw.com/xml/rss-sp-all" },
  { name: "Infobae América", url: "https://www.infobae.com/america/rss/" },

  // Regional focus - Cuba/Venezuela/Mexico
  { name: "EFE América", url: "https://efe.com/america/feed/" },
  { name: "Proceso México", url: "https://www.proceso.com.mx/rss/portada.xml" }
];

function getFeeds() {
  const env = process.env.RSS_FEEDS?.trim();
  if (!env) return DEFAULT_FEEDS;

  // Format: "Name|https://url,Name2|https://url2"
  return env.split(",").map((part) => {
    const [name, url] = part.split("|").map((s) => s.trim());
    return { name: name || "Feed", url };
  }).filter(f => !!f.url);
}

export async function fetchAllFeeds(): Promise<FeedItem[]> {
  const feeds = getFeeds();
  const items: FeedItem[] = [];

  for (const f of feeds) {
    try {
      const feed = await parser.parseURL(f.url);
      for (const it of feed.items ?? []) {
        const link = (it.link || "").trim();
        const title = (it.title || "").trim();
        if (!link || !title) continue;

        items.push({
          source: f.name,
          title,
          link,
          isoDate: (it.isoDate || it.pubDate || undefined) as any,
          snippet: (it.contentSnippet || it.content || "").toString().slice(0, 600)
        });
      }
      console.log(`  ✓ ${f.name}: ${(feed.items?.length ?? 0)} items`);
    } catch (e: any) {
      console.log(`  ✗ ${f.name}: ${e?.message ?? String(e)}`);
    }
  }

  // newest first if isoDate exists
  items.sort((a, b) => (b.isoDate || "").localeCompare(a.isoDate || ""));
  return items;
}
