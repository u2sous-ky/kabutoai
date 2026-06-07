"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { BuffettScore } from "@/lib/buffett-score";

type StockMeta = {
  name: string;
  ticker: string;
  market: "JP" | "US";
  currency: string;
  price: number;
  change: number;
  changePct: number;
  marketCap: number | null;
  pe: number | null;
  pbr: number | null;
  roe: number | null;
  dividendYield: number | null;
  operatingMargin: number | null;
  revenueGrowth: number | null;
  freeCashflow: number | null;
  debtToEquity: number | null;
  score: BuffettScore;
};

type ResearchStep = {
  id: number;
  label: string;
  status: "waiting" | "running" | "done" | "error";
  detail?: string;
};

function fmt(v: number | null, suffix = "", d = 1) {
  if (v === null) return <span style={{ color: "var(--text-muted)" }}>N/A</span>;
  return `${v.toFixed(d)}${suffix}`;
}

function MetricCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl p-3" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
      <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{label}</div>
      <div className="font-bold text-sm">{value}</div>
    </div>
  );
}

function ScoreRing({ score }: { score: BuffettScore }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="w-20 h-20 rounded-full flex flex-col items-center justify-center border-4 font-black"
        style={{ borderColor: score.color, color: score.color }}
      >
        <span className="text-2xl leading-none">{score.total}</span>
        <span className="text-[10px]">/ 100</span>
      </div>
      <span className="text-sm font-bold" style={{ color: score.color }}>{score.verdictJa}</span>
    </div>
  );
}

function StepIndicator({ steps }: { steps: ResearchStep[] }) {
  return (
    <div className="rounded-2xl p-4 mb-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="text-xs font-bold mb-3" style={{ color: "var(--text-muted)" }}>
        自律リサーチ実行中
      </div>
      <div className="space-y-2">
        {steps.map((s) => (
          <div key={s.id} className="flex items-center gap-3">
            <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
              {s.status === "waiting" && <span style={{ color: "var(--border)" }}>○</span>}
              {s.status === "running" && (
                <span className="inline-block w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
              )}
              {s.status === "done" && <span style={{ color: "var(--accent)" }}>✓</span>}
              {s.status === "error" && <span style={{ color: "var(--red)" }}>✗</span>}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm" style={{ color: s.status === "waiting" ? "var(--text-muted)" : s.status === "done" ? "var(--text)" : "var(--accent)" }}>
                {s.label}
              </span>
              {s.detail && (
                <span className="ml-2 text-xs" style={{ color: "var(--text-muted)" }}>{s.detail}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function renderReport(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;
  for (const line of lines) {
    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={key++} className="text-sm font-bold mt-6 mb-2 pb-1" style={{ color: "var(--accent)", borderBottom: "1px solid var(--border)" }}>
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith("- ") || line.startsWith("・")) {
      elements.push(
        <li key={key++} className="ml-4 text-sm leading-relaxed" style={{ color: "#c8d8c8" }}>
          {line.startsWith("- ") ? line.slice(2) : line.slice(1)}
        </li>
      );
    } else if (line.trim()) {
      elements.push(
        <p key={key++} className="text-sm leading-relaxed mb-1" style={{ color: "#c8d8c8" }}>
          {line}
        </p>
      );
    }
  }
  return elements;
}

const INIT_STEPS: ResearchStep[] = [
  { id: 1, label: "📊 財務データ取得", status: "waiting" },
  { id: 2, label: "📰 最新ニュース検索", status: "waiting" },
  { id: 3, label: "🏢 競合他社調査", status: "waiting" },
  { id: 4, label: "📈 アナリスト評価", status: "waiting" },
  { id: 5, label: "🤖 AI総合レポート生成", status: "waiting" },
];

export default function StockPage({ params }: { params: Promise<{ code: string }> }) {
  const [code, setCode] = useState("");
  const [meta, setMeta] = useState<StockMeta | null>(null);
  const [steps, setSteps] = useState<ResearchStep[]>(INIT_STEPS);
  const [report, setReport] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "streaming" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    params.then(({ code: c }) => setCode(c.toUpperCase()));
  }, [params]);

  useEffect(() => {
    if (!code) return;
    setStatus("loading");
    setMeta(null);
    setReport("");
    setSteps(INIT_STEPS.map((s) => ({ ...s })));
    setError("");

    const controller = new AbortController();

    fetch(`/api/research?code=${encodeURIComponent(code)}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text);
        }
        setStatus("streaming");
        const reader = res.body!.getReader();
        const dec = new TextDecoder();
        let buf = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";

          for (const line of lines) {
            if (line.startsWith("step:")) {
              try {
                const s: ResearchStep = JSON.parse(line.slice(5));
                setSteps((prev) => prev.map((p) => (p.id === s.id ? s : p)));
              } catch { /* ignore */ }
            } else if (line.startsWith("data:")) {
              try { setMeta(JSON.parse(line.slice(5))); } catch { /* ignore */ }
            } else if (line.startsWith("text:")) {
              setReport((prev) => prev + line.slice(5));
            } else if (line.startsWith("error:")) {
              setError(line.slice(6));
              setStatus("error");
            }
          }
        }
        setStatus("done");
      })
      .catch((e) => {
        if (e.name === "AbortError") return;
        setError(e.message);
        setStatus("error");
      });

    return () => controller.abort();
  }, [code]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [report]);

  const priceStr = meta
    ? meta.currency === "JPY" ? `¥${meta.price.toLocaleString()}` : `$${meta.price.toFixed(2)}`
    : "";
  const changeColor = meta && meta.changePct >= 0 ? "#00d26a" : "#ff4d4d";
  const allDone = steps.every((s) => s.status === "done");

  return (
    <main className="min-h-screen max-w-3xl mx-auto px-4 py-8">
      {/* Nav */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="text-sm hover:underline" style={{ color: "var(--text-muted)" }}>
          ← ホーム
        </Link>
        <span style={{ color: "var(--border)" }}>/</span>
        <span className="text-sm font-mono" style={{ color: "var(--accent)" }}>{code}</span>
      </div>

      {/* Step Progress */}
      {(status === "loading" || status === "streaming" || (status === "done" && !allDone)) && (
        <StepIndicator steps={steps} />
      )}

      {/* Stock Header */}
      {meta ? (
        <div className="rounded-2xl p-5 mb-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs px-2 py-0.5 rounded font-mono" style={{ background: "var(--surface2)", color: "var(--text-muted)" }}>
                  {meta.market === "JP" ? "🇯🇵 東証" : "🇺🇸 US"}
                </span>
                <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{meta.ticker}</span>
              </div>
              <h1 className="text-xl font-black">{meta.name}</h1>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold">{priceStr}</span>
                <span className="text-sm font-medium" style={{ color: changeColor }}>
                  {meta.changePct >= 0 ? "+" : ""}{meta.changePct.toFixed(2)}%
                </span>
              </div>
            </div>
            <ScoreRing score={meta.score} />
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-4">
            <MetricCard label="PER" value={fmt(meta.pe, "倍")} />
            <MetricCard label="PBR" value={fmt(meta.pbr, "倍")} />
            <MetricCard label="ROE" value={fmt(meta.roe, "%")} />
            <MetricCard label="配当利回り" value={fmt(meta.dividendYield, "%")} />
            <MetricCard label="営業利益率" value={fmt(meta.operatingMargin, "%")} />
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2">
            {[
              { label: "経済的堀", val: meta.score.moat, max: 25 },
              { label: "収益一貫性", val: meta.score.consistency, max: 25 },
              { label: "バリュー", val: meta.score.value, max: 25 },
              { label: "財務安全性", val: meta.score.safety, max: 25 },
            ].map((s) => (
              <div key={s.label} className="rounded-lg p-2" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                <div className="text-[10px] mb-1" style={{ color: "var(--text-muted)" }}>{s.label}</div>
                <div className="flex items-center gap-1">
                  <div className="flex-1 h-1.5 rounded-full" style={{ background: "var(--border)" }}>
                    <div className="h-1.5 rounded-full" style={{ width: `${(s.val / s.max) * 100}%`, background: "var(--accent)" }} />
                  </div>
                  <span className="text-xs font-bold" style={{ color: "var(--accent)" }}>{s.val}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : status === "loading" && (
        <div className="rounded-2xl p-5 mb-6 animate-pulse" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="h-6 w-48 rounded mb-3" style={{ background: "var(--surface2)" }} />
          <div className="h-8 w-32 rounded mb-3" style={{ background: "var(--surface2)" }} />
          <div className="grid grid-cols-5 gap-2">
            {[...Array(5)].map((_, i) => <div key={i} className="h-14 rounded-xl" style={{ background: "var(--surface2)" }} />)}
          </div>
        </div>
      )}

      {/* Report */}
      {(report || status === "loading") && (
        <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm font-bold" style={{ color: "var(--accent)" }}>⚔️ 深層リサーチレポート</span>
            {status === "streaming" && (
              <span className="text-xs animate-pulse" style={{ color: "var(--text-muted)" }}>生成中...</span>
            )}
            {status === "done" && <span className="text-xs" style={{ color: "var(--text-muted)" }}>完了</span>}
          </div>

          {error ? (
            <div className="text-sm p-3 rounded-lg" style={{ background: "#1a0a0a", color: "#ff4d4d" }}>
              エラー: {error}
            </div>
          ) : (
            <div className="text-sm leading-relaxed">
              {report ? renderReport(report) : (
                <div className="space-y-2">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-4 rounded animate-pulse" style={{ background: "var(--surface2)", width: `${70 + (i * 7) % 30}%` }} />
                  ))}
                </div>
              )}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      <p className="mt-6 text-xs text-center" style={{ color: "var(--text-muted)" }}>
        ⚠️ 本レポートは情報提供・教育目的のみです。投資判断はご自身の責任で行ってください。
      </p>
    </main>
  );
}
