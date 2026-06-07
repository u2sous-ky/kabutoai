const map = new Map<string, { count: number; ts: number }>();

const WINDOW_MS = 60_000; // 1分
const MAX_REQ = 5;        // IP あたり5回/分

export function rateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = map.get(ip);

  if (!entry || now - entry.ts > WINDOW_MS) {
    map.set(ip, { count: 1, ts: now });
    return true;
  }
  if (entry.count >= MAX_REQ) return false;
  entry.count++;
  return true;
}
