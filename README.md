# ⚔️ KabutoAI

**Autonomous AI Stock Research Agent — Buffett Philosophy × Multi-Step Analysis**

日本語 | [English below](#english)

---

## 概要

KabutoAIは、バフェット投資哲学を核に据えた自律型AIリサーチエージェントです。
証券コードまたはティッカーを入力するだけで、**5つのステップを自律実行**し、深層レポートを生成します。

日本株（東証）・米国株の両方に対応。

```
Step 1: 📊 財務データ取得    (Yahoo Finance)
Step 2: 📰 最新ニュース検索  (Tavily)
Step 3: 🏢 競合他社調査      (Tavily)
Step 4: 📈 アナリスト評価    (Yahoo Finance)
Step 5: 🤖 AI総合レポート    (Groq / llama-3.3-70b)
```

### バフェットスコア（100点満点）

独自の4軸スコアリングで投資判断を補助します：

| 軸 | 内容 | 満点 |
|---|---|---|
| 経済的堀 | 営業利益率・ROE | 25 |
| 収益一貫性 | 売上成長率・FCF | 25 |
| バリュー | PER・PBR | 25 |
| 財務安全性 | 負債比率・流動比率 | 25 |

---

## クイックスタート

```bash
git clone https://github.com/u2sous-ky/kabutoai.git
cd kabutoai
npm install

# .env.local を作成
cp .env.example .env.local
# GROQ_API_KEY と TAVILY_API_KEY を設定

npm run dev
# → http://localhost:3000 を開く
```

### 必要なAPIキー

| サービス | 用途 | 料金 |
|---|---|---|
| [Groq](https://console.groq.com) | AIレポート生成 | 無料枠あり |
| [Tavily](https://app.tavily.com) | ニュース・競合調査 | 月1,000回まで無料 |

Yahoo Financeは**APIキー不要**です。

---

## 技術スタック

- **Framework**: Next.js 16 (App Router)
- **AI**: Groq API (llama-3.3-70b-versatile) — Streaming
- **Market Data**: yahoo-finance2 v3
- **Web Search**: Tavily API
- **Styling**: Tailwind CSS

---

## 対応銘柄

| 入力例 | 銘柄 |
|---|---|
| `7203` | トヨタ自動車（東証） |
| `9984` | ソフトバンクグループ（東証） |
| `AAPL` | Apple Inc. |
| `BRK-B` | Berkshire Hathaway |
| `NVDA` | NVIDIA |

4桁数字 → 自動で東証（`.T`）として処理します。

---

## ⚠️ 免責事項

本ツールの出力は情報提供・教育目的のみです。
投資判断はご自身の責任で行ってください。

---

<a name="english"></a>

## English

KabutoAI is an autonomous AI stock research agent powered by Buffett investment philosophy.

Enter any stock ticker and it autonomously executes **5 research steps** — financial data, latest news, competitor analysis, analyst ratings, and AI synthesis — then delivers a structured deep-dive report.

Supports both **Japanese stocks (TSE)** and **US stocks**.

### Features

- 🤖 **Autonomous multi-step research** — no manual prompting required
- ⚔️ **Buffett Score** — proprietary 100-point scoring across moat, consistency, value, safety
- 🇯🇵🇺🇸 **Bilingual markets** — Japanese 4-digit codes and US tickers
- ⚡ **Streaming output** — watch each research step complete in real time
- 💚 **Near-zero cost** — ~¥1 per research session

### Setup

```bash
git clone https://github.com/u2sous-ky/kabutoai.git
cd kabutoai
npm install
cp .env.example .env.local   # add GROQ_API_KEY and TAVILY_API_KEY
npm run dev
```

### Inspiration

Inspired by [Dexter](https://github.com/virattt/dexter) — extended for Japanese markets with Buffett-style scoring.

---

MIT License © 2026 u2sous-ky
