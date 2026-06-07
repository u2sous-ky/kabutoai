"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const EXAMPLES = [
  { code: "7203", label: "トヨタ", flag: "🇯🇵" },
  { code: "9984", label: "ソフトバンクG", flag: "🇯🇵" },
  { code: "6758", label: "ソニー", flag: "🇯🇵" },
  { code: "AAPL", label: "Apple", flag: "🇺🇸" },
  { code: "BRK-B", label: "バークシャー", flag: "🇺🇸" },
  { code: "NVDA", label: "NVIDIA", flag: "🇺🇸" },
];

export default function Home() {
  const router = useRouter();
  const [input, setInput] = useState("");

  const go = (code: string) => {
    const q = code.trim().toUpperCase();
    if (!q) return;
    router.push(`/stock/${q}`);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 pb-24">
      <div className="mb-10 text-center">
        <div className="text-5xl mb-3">⚔️</div>
        <h1 className="text-4xl font-black tracking-tight" style={{ color: "var(--accent)" }}>
          KabutoAI
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
          バフェット思想 × AI — 日本株・米国株の深層リサーチ
        </p>
      </div>

      <div className="w-full max-w-lg">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            go(input);
          }}
          className="flex gap-2"
        >
          <input
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="証券コード or ティッカー (例: 7203 / AAPL)"
            className="flex-1 rounded-xl px-4 py-3 text-base outline-none"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
          />
          <button
            type="submit"
            className="rounded-xl px-5 py-3 font-bold text-sm transition-opacity hover:opacity-80"
            style={{ background: "var(--accent)", color: "#000" }}
          >
            分析
          </button>
        </form>

        <div className="mt-4 flex flex-wrap gap-2 justify-center">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.code}
              onClick={() => go(ex.code)}
              className="rounded-full px-3 py-1 text-xs transition-colors"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text-muted)",
              }}
            >
              {ex.flag} {ex.label} ({ex.code})
            </button>
          ))}
        </div>
      </div>

      <p className="mt-16 text-xs" style={{ color: "var(--text-muted)" }}>
        ⚠️ 本ツールの出力は投資アドバイスではありません。投資判断はご自身の責任で行ってください。
      </p>
    </main>
  );
}
