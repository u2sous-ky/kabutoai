const API_KEY = process.env.TAVILY_API_KEY;
const BASE = "https://api.tavily.com";

type TavilyResult = {
  title: string;
  url: string;
  content: string;
  published_date?: string;
};

type TavilyResponse = {
  answer?: string;
  results: TavilyResult[];
};

async function search(query: string, maxResults = 5): Promise<TavilyResponse> {
  const res = await fetch(`${BASE}/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: API_KEY,
      query,
      search_depth: "basic",
      max_results: maxResults,
      include_answer: true,
    }),
  });
  if (!res.ok) throw new Error(`Tavily error: ${res.status}`);
  return res.json();
}

export async function searchCompanyNews(name: string, ticker: string): Promise<string> {
  try {
    const data = await search(`${name} ${ticker} 株価 ニュース 2025 2026`, 5);
    const items = data.results
      .slice(0, 5)
      .map((r) => `・${r.title}\n  ${r.content.slice(0, 150)}`)
      .join("\n");
    return items || "ニュースが見つかりませんでした";
  } catch {
    return "ニュース取得失敗";
  }
}

export async function searchCompetitors(name: string, sector: string | null): Promise<string> {
  try {
    const query = sector
      ? `${name} 競合他社 ${sector} 比較分析`
      : `${name} competitors industry comparison`;
    const data = await search(query, 4);
    return data.answer
      ? data.answer.slice(0, 400)
      : data.results
          .slice(0, 3)
          .map((r) => `・${r.title}: ${r.content.slice(0, 120)}`)
          .join("\n");
  } catch {
    return "競合情報取得失敗";
  }
}
