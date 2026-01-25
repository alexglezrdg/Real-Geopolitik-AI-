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
  { name: "BBC World", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
  { name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml" },
  { name: "The Guardian World", url: "https://www.theguardian.com/world/rss" },
  { name: "NPR World", url: "https://feeds.npr.org/1004/rss.xml" }
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
