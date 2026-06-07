import { NextRequest } from "next/server";
import Groq from "groq-sdk";
import { fetchStockData, formatMarketCap } from "@/lib/yahoo-finance";
import { calcBuffettScore } from "@/lib/buffett-score";
import { searchCompanyNews, searchCompetitors } from "@/lib/tavily";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

type StepStatus = "waiting" | "running" | "done" | "error";

type Step = {
  id: number;
  label: string;
  status: StepStatus;
  detail?: string;
};

function fmt(v: number | null, suffix = "", d = 1) {
  if (v === null) return "N/A";
  return `${v.toFixed(d)}${suffix}`;
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")?.toUpperCase();
  if (!code) return new Response("code required", { status: 400 });

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      const send = (line: string) => controller.enqueue(encoder.encode(line + "\n"));
      const step = (s: Step) => send(`step:${JSON.stringify(s)}`);

      const steps: Step[] = [
        { id: 1, label: "📊 財務データ取得", status: "waiting" },
        { id: 2, label: "📰 最新ニュース検索", status: "waiting" },
        { id: 3, label: "🏢 競合他社調査", status: "waiting" },
        { id: 4, label: "📈 アナリスト評価", status: "waiting" },
        { id: 5, label: "🤖 AI総合レポート生成", status: "waiting" },
      ];

      // Initial state
      for (const s of steps) step(s);

      try {
        // ── Step 1: Yahoo Finance ──────────────────────────────────
        steps[0].status = "running";
        step(steps[0]);

        const stock = await fetchStockData(code);
        const score = calcBuffettScore(stock);

        steps[0].status = "done";
        steps[0].detail = `${stock.name} ¥${stock.price.toLocaleString()} | スコア ${score.total}点`;
        step(steps[0]);

        // Send stock metadata to client
        send(`data:${JSON.stringify({ ...stock, score })}`);

        // ── Step 2: News ───────────────────────────────────────────
        steps[1].status = "running";
        step(steps[1]);

        const news = await searchCompanyNews(stock.name, stock.ticker);
        const newsLines = news.split("\n").filter(Boolean).length;

        steps[1].status = "done";
        steps[1].detail = `${newsLines}件取得`;
        step(steps[1]);

        // ── Step 3: Competitors ────────────────────────────────────
        steps[2].status = "running";
        step(steps[2]);

        const competitors = await searchCompetitors(stock.name, stock.sector);

        steps[2].status = "done";
        steps[2].detail = "調査完了";
        step(steps[2]);

        // ── Step 4: Analyst ratings (Yahoo Finance) ────────────────
        steps[3].status = "running";
        step(steps[3]);

        let analystSummary = "アナリスト評価: データなし";
        try {
          const YahooFinance = (await import("yahoo-finance2")).default;
          const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });
          const summary = await yf.quoteSummary(stock.ticker, {
            modules: ["recommendationTrend", "financialData"],
          });
          const trend = summary.recommendationTrend?.trend?.[0];
          const fd = summary.financialData;
          if (trend) {
            const { strongBuy = 0, buy = 0, hold = 0, sell = 0, strongSell = 0 } = trend;
            const total = strongBuy + buy + hold + sell + strongSell;
            analystSummary = `アナリスト評価（直近）: 強買${strongBuy} 買${buy} 保留${hold} 売${sell} 強売${strongSell} (計${total}人)`;
          }
          if (fd?.targetMeanPrice) {
            analystSummary += `\n目標株価（平均）: ${fd.targetMeanPrice.toFixed(0)}${stock.currency === "JPY" ? "円" : "USD"}`;
          }
        } catch {
          // アナリストデータ取得失敗は無視
        }

        steps[3].status = "done";
        steps[3].detail = "評価取得完了";
        step(steps[3]);

        // ── Step 5: AI Report ──────────────────────────────────────
        steps[4].status = "running";
        step(steps[4]);

        const priceStr = stock.currency === "JPY"
          ? `¥${stock.price.toLocaleString()}`
          : `$${stock.price.toFixed(2)}`;

        const context = `
【銘柄基本情報】
銘柄: ${stock.name} (${stock.ticker})
市場: ${stock.market === "JP" ? "東京証券取引所" : "米国市場"}
セクター: ${stock.sector ?? "不明"} / ${stock.industry ?? "不明"}
現在株価: ${priceStr} (前日比: ${stock.changePct > 0 ? "+" : ""}${fmt(stock.changePct)}%)
時価総額: ${formatMarketCap(stock.marketCap, stock.currency)}
従業員数: ${stock.employees?.toLocaleString() ?? "N/A"}名

【財務指標】
PER: ${fmt(stock.pe, "倍")} | PBR: ${fmt(stock.pbr, "倍")} | ROE: ${fmt(stock.roe, "%")}
配当利回り: ${fmt(stock.dividendYield, "%")} | 営業利益率: ${fmt(stock.operatingMargin, "%")}
負債自己資本比率: ${fmt(stock.debtToEquity, "%")} | 流動比率: ${fmt(stock.currentRatio, "倍")}
売上高成長率: ${fmt(stock.revenueGrowth, "%")} | FCF: ${stock.freeCashflow ? (stock.freeCashflow / 1e8).toFixed(0) + "億" : "N/A"}

【バフェットスコア: ${score.total}/100 → ${score.verdictJa}】
経済的堀: ${score.moat}/25 | 収益一貫性: ${score.consistency}/25 | バリュー: ${score.value}/25 | 財務安全性: ${score.safety}/25

【アナリスト評価】
${analystSummary}

【最新ニュース】
${news}

【競合・業界分析】
${competitors}

【企業概要】
${stock.description ? stock.description.slice(0, 500) : "情報なし"}
`.trim();

        const systemPrompt = `あなたはバフェット哲学に精通した日本のAIアナリストです。
収集した多角的なデータを統合し、以下の構成で深層リサーチレポートを作成してください。

## 企業概要・競争優位性
（ビジネスモデル、競合との差別化、経済的堀の有無）

## 財務分析
（主要指標を引用しながら収益性・安全性・成長性を評価）

## ニュース・直近動向
（提供されたニュースから重要な動向を3点抽出し解説）

## 競合・業界ポジション
（競合比較から見た強み弱みとシェアポジション）

## バフェットスコア解説
（4軸の評価理由。バフェット基準で何が評価されるか/されないかを具体的に）

## アナリスト評価との比較
（市場のコンセンサスとAI評価の相違点）

## リスク要因（3点）

## 投資判断サマリー
（${score.verdictJa}（${score.total}点）の根拠を2〜3文で。具体的な数字を引用して説得力を持たせる）

注意: 本レポートは情報提供・教育目的であり投資助言ではない旨を最後に一言添えること。`;

        const stream = await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          stream: true,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: context },
          ],
          max_tokens: 2500,
          temperature: 0.3,
        });

        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content ?? "";
          if (text) send(`text:${text}`);
        }

        steps[4].status = "done";
        steps[4].detail = "レポート生成完了";
        step(steps[4]);

      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        send(`error:${msg}`);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
