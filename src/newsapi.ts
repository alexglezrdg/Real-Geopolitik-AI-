/**
 * NewsAPI.org integration
 * Free plan: 100 requests/day, top headlines
 * Better deduplication than RSS because it clusters similar stories
 */

export interface NewsAPIArticle {
  source: { id: string | null; name: string };
  author: string | null;
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string | null;
}

interface NewsAPIResponse {
  status: string;
  totalResults: number;
  articles: NewsAPIArticle[];
}

const NEWSAPI_KEY = process.env.NEWSAPI_KEY || "";
const BASE_URL = "https://newsapi.org/v2";

/**
 * Fetch top headlines from NewsAPI
 * Categories: business, entertainment, general, health, science, sports, technology
 */
export async function fetchTopHeadlines(params: {
  country?: string;
  category?: string;
  q?: string;
  pageSize?: number;
}): Promise<NewsAPIArticle[]> {
  if (!NEWSAPI_KEY) {
    console.warn("⚠️  NEWSAPI_KEY not set, skipping NewsAPI");
    return [];
  }

  const url = new URL(`${BASE_URL}/top-headlines`);

  if (params.country) url.searchParams.set("country", params.country);
  if (params.category) url.searchParams.set("category", params.category);
  if (params.q) url.searchParams.set("q", params.q);
  url.searchParams.set("pageSize", String(params.pageSize || 50));
  url.searchParams.set("apiKey", NEWSAPI_KEY);

  try {
    const res = await fetch(url.toString());
    if (!res.ok) {
      console.error(`NewsAPI error: ${res.status} ${res.statusText}`);
      return [];
    }
    const data = (await res.json()) as NewsAPIResponse;
    return data.articles || [];
  } catch (err) {
    console.error(`NewsAPI fetch error: ${(err as Error).message}`);
    return [];
  }
}

/**
 * Search all articles (more flexible but uses more quota)
 */
export async function searchArticles(params: {
  q: string;
  language?: string;
  sortBy?: "relevancy" | "popularity" | "publishedAt";
  pageSize?: number;
}): Promise<NewsAPIArticle[]> {
  if (!NEWSAPI_KEY) {
    console.warn("⚠️  NEWSAPI_KEY not set, skipping NewsAPI");
    return [];
  }

  const url = new URL(`${BASE_URL}/everything`);

  url.searchParams.set("q", params.q);
  url.searchParams.set("language", params.language || "es");
  url.searchParams.set("sortBy", params.sortBy || "publishedAt");
  url.searchParams.set("pageSize", String(params.pageSize || 30));
  url.searchParams.set("apiKey", NEWSAPI_KEY);

  try {
    const res = await fetch(url.toString());
    if (!res.ok) {
      console.error(`NewsAPI error: ${res.status} ${res.statusText}`);
      return [];
    }
    const data = (await res.json()) as NewsAPIResponse;
    return data.articles || [];
  } catch (err) {
    console.error(`NewsAPI fetch error: ${(err as Error).message}`);
    return [];
  }
}

/**
 * Fetch geopolitics news from multiple regions
 * Optimized for 100 req/day limit (uses ~4 requests per run)
 */
export async function fetchGeopoliticsNews(): Promise<NewsAPIArticle[]> {
  const allArticles: NewsAPIArticle[] = [];
  const seen = new Set<string>();

  // Strategy: Use "everything" endpoint with geopolitics keywords
  // This is more efficient than multiple top-headlines calls

  const queries = [
    // Americas focus (75%)
    "(Cuba OR Venezuela OR Mexico OR Colombia OR Brasil) AND (gobierno OR crisis OR sanciones OR diplomacia)",
    // US geopolitics
    "(Trump OR Biden OR Pentagon OR sanctions OR tariffs) AND (Latin America OR Cuba OR Venezuela OR Iran OR China)",
    // World (25%)
    "(NATO OR Russia OR Ukraine OR Iran OR Israel OR Gaza) AND (military OR sanctions OR diplomacy)",
  ];

  for (const q of queries) {
    try {
      const articles = await searchArticles({
        q,
        language: "es",
        sortBy: "publishedAt",
        pageSize: 25,
      });

      for (const article of articles) {
        // Dedupe by title similarity (NewsAPI sometimes returns duplicates)
        const titleNorm = article.title.toLowerCase().slice(0, 50);
        if (!seen.has(titleNorm)) {
          seen.add(titleNorm);
          allArticles.push(article);
        }
      }

      console.log(`  ✓ NewsAPI query: ${articles.length} articles`);
    } catch (err) {
      console.error(`  ✗ NewsAPI query failed: ${(err as Error).message}`);
    }
  }

  // Also get US headlines (good for Trump/foreign policy news)
  try {
    const usHeadlines = await fetchTopHeadlines({
      country: "us",
      category: "general",
      pageSize: 20,
    });

    for (const article of usHeadlines) {
      const titleNorm = article.title.toLowerCase().slice(0, 50);
      if (!seen.has(titleNorm)) {
        seen.add(titleNorm);
        allArticles.push(article);
      }
    }
    console.log(`  ✓ NewsAPI US headlines: ${usHeadlines.length} articles`);
  } catch (err) {
    console.error(`  ✗ NewsAPI US headlines failed: ${(err as Error).message}`);
  }

  return allArticles;
}

/**
 * Convert NewsAPI article to our standard format
 */
export function convertToFeedItem(article: NewsAPIArticle): {
  source: string;
  title: string;
  link: string;
  isoDate: string;
  snippet: string;
  imageUrl?: string;
} {
  return {
    source: `NewsAPI: ${article.source.name}`,
    title: article.title,
    link: article.url,
    isoDate: article.publishedAt,
    snippet: article.description || article.content?.slice(0, 200) || "",
    imageUrl: article.urlToImage || undefined,
  };
}
