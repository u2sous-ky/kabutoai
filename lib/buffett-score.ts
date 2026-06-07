import type { StockData } from "./yahoo-finance";

export type BuffettScore = {
  total: number; // 0-100
  moat: number; // 0-25
  consistency: number; // 0-25
  value: number; // 0-25
  safety: number; // 0-25
  verdict: "BUY" | "WATCH" | "HOLD" | "PASS";
  verdictJa: string;
  color: string;
};

export function calcBuffettScore(s: StockData): BuffettScore {
  let moat = 0;
  if (s.operatingMargin !== null) {
    if (s.operatingMargin > 20) moat += 15;
    else if (s.operatingMargin > 10) moat += 10;
    else if (s.operatingMargin > 5) moat += 5;
  }
  if (s.roe !== null) {
    if (s.roe > 20) moat += 10;
    else if (s.roe > 15) moat += 7;
    else if (s.roe > 10) moat += 4;
  }

  let consistency = 0;
  if (s.revenueGrowth !== null) {
    if (s.revenueGrowth > 10) consistency += 15;
    else if (s.revenueGrowth > 5) consistency += 10;
    else if (s.revenueGrowth > 0) consistency += 5;
  }
  if (s.freeCashflow !== null && s.freeCashflow > 0) consistency += 10;

  let value = 0;
  if (s.pe !== null) {
    if (s.pe < 15) value += 15;
    else if (s.pe < 25) value += 10;
    else if (s.pe < 35) value += 5;
  }
  if (s.pbr !== null) {
    if (s.pbr < 1.5) value += 10;
    else if (s.pbr < 3) value += 5;
  }

  let safety = 0;
  if (s.debtToEquity !== null) {
    if (s.debtToEquity < 30) safety += 15;
    else if (s.debtToEquity < 60) safety += 10;
    else if (s.debtToEquity < 100) safety += 5;
  }
  if (s.currentRatio !== null) {
    if (s.currentRatio > 2) safety += 10;
    else if (s.currentRatio > 1.5) safety += 7;
    else if (s.currentRatio > 1) safety += 3;
  }

  const total = moat + consistency + value + safety;

  let verdict: BuffettScore["verdict"];
  let verdictJa: string;
  let color: string;

  if (total >= 70) { verdict = "BUY"; verdictJa = "買い"; color = "#00d26a"; }
  else if (total >= 50) { verdict = "WATCH"; verdictJa = "要注目"; color = "#f5a623"; }
  else if (total >= 35) { verdict = "HOLD"; verdictJa = "保留"; color = "#7a9a7a"; }
  else { verdict = "PASS"; verdictJa = "見送り"; color = "#ff4d4d"; }

  return { total, moat, consistency, value, safety, verdict, verdictJa, color };
}
