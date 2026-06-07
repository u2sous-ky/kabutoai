import YahooFinance from "yahoo-finance2";
const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export type StockData = {
  ticker: string;
  name: string;
  market: "JP" | "US";
  currency: string;
  price: number;
  change: number;
  changePct: number;
  marketCap: number | null;
  pe: number | null;
  pbr: number | null;
  roe: number | null;
  eps: number | null;
  dividendYield: number | null;
  debtToEquity: number | null;
  freeCashflow: number | null;
  revenueGrowth: number | null;
  operatingMargin: number | null;
  currentRatio: number | null;
  sector: string | null;
  industry: string | null;
  description: string | null;
  employees: number | null;
  country: string | null;
};

function resolveYahooTicker(code: string): { ticker: string; market: "JP" | "US" } {
  // 4桁数字 → 日本株
  if (/^\d{4}$/.test(code)) {
    return { ticker: `${code}.T`, market: "JP" };
  }
  // BRK-B など US
  return { ticker: code, market: "US" };
}

export async function fetchStockData(code: string): Promise<StockData> {
  const { ticker, market } = resolveYahooTicker(code);

  const [quote, summary] = await Promise.all([
    yahooFinance.quote(ticker),
    yahooFinance.quoteSummary(ticker, {
      modules: ["assetProfile", "financialData", "defaultKeyStatistics", "summaryDetail"],
    }),
  ]);

  const fd = summary.financialData;
  const ks = summary.defaultKeyStatistics;
  const sd = summary.summaryDetail;
  const ap = summary.assetProfile;

  return {
    ticker,
    name: quote.longName ?? quote.shortName ?? code,
    market,
    currency: quote.currency ?? (market === "JP" ? "JPY" : "USD"),
    price: quote.regularMarketPrice ?? 0,
    change: quote.regularMarketChange ?? 0,
    changePct: quote.regularMarketChangePercent ?? 0,
    marketCap: quote.marketCap ?? null,
    pe: sd?.trailingPE ?? ks?.trailingPE ?? null,
    pbr: ks?.priceToBook ?? null,
    roe: fd?.returnOnEquity ? fd.returnOnEquity * 100 : null,
    eps: ks?.trailingEps ?? null,
    dividendYield: sd?.dividendYield ? sd.dividendYield * 100 : null,
    debtToEquity: fd?.debtToEquity ?? null,
    freeCashflow: fd?.freeCashflow ?? null,
    revenueGrowth: fd?.revenueGrowth ? fd.revenueGrowth * 100 : null,
    operatingMargin: fd?.operatingMargins ? fd.operatingMargins * 100 : null,
    currentRatio: fd?.currentRatio ?? null,
    sector: ap?.sector ?? null,
    industry: ap?.industry ?? null,
    description: ap?.longBusinessSummary ?? null,
    employees: ap?.fullTimeEmployees ?? null,
    country: ap?.country ?? null,
  };
}

export function formatMarketCap(val: number | null, currency: string): string {
  if (!val) return "N/A";
  if (currency === "JPY") {
    const trillion = val / 1e12;
    if (trillion >= 1) return `${trillion.toFixed(1)}兆円`;
    return `${(val / 1e8).toFixed(0)}億円`;
  }
  if (val >= 1e12) return `$${(val / 1e12).toFixed(1)}T`;
  if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  return `$${(val / 1e6).toFixed(0)}M`;
}
