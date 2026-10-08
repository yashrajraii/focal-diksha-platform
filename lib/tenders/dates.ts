const months: Record<string, number> = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 };

export function parseIndianDate(input: string | null): string | null {
  if (!input) return null;
  const clean = input.replace(/\s+/g, " ").trim();
  const m = clean.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})(?:\s+(\d{1,2}):(\d{2})\s*(AM|PM))?$/i);
  if (!m) return null;
  const month = months[m[2].toLowerCase()];
  if (month === undefined) return null;
  let hour = Number(m[4] ?? 0);
  if (m[6]?.toUpperCase() === "PM" && hour !== 12) hour += 12;
  if (m[6]?.toUpperCase() === "AM" && hour === 12) hour = 0;
  const utc = Date.UTC(Number(m[3]), month, Number(m[1]), hour - 5, Number(m[5] ?? 0) - 30);
  const d = new Date(utc);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function isExpired(closingAt: string | null, now = new Date()): boolean {
  return closingAt ? new Date(closingAt).getTime() < now.getTime() : false;
}

export function withinLookback(publishedAt: string | null, days: number, now = new Date()): boolean {
  if (!publishedAt) return true;
  const age = now.getTime() - new Date(publishedAt).getTime();
  return age >= 0 && age <= days * 86_400_000;
}
