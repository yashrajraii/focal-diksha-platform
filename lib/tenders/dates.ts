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
  const year=Number(m[3]),day=Number(m[1]),minute=Number(m[5]??0);
  const wall=new Date(Date.UTC(year,month,day,hour,minute));
  if(wall.getUTCFullYear()!==year||wall.getUTCMonth()!==month||wall.getUTCDate()!==day||wall.getUTCHours()!==hour||wall.getUTCMinutes()!==minute)return null;
  const utc = Date.UTC(year, month, day, hour - 5, minute - 30);
  const d = new Date(utc);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function parseIndianNumericDate(input:string|null):{dateLabel:string;iso:string|null;timeVerified:boolean}|null{
  if(!input)return null;
  const clean=input.replace(/\s+/g," ").trim();
  const m=clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::\d{2})?)?$/);
  if(!m)return null;
  const day=Number(m[1]),month=Number(m[2])-1,year=Number(m[3]),hasTime=m[4]!==undefined,hour=Number(m[4]??0),minute=Number(m[5]??0);
  const wall=new Date(Date.UTC(year,month,day,hour,minute));
  if(wall.getUTCFullYear()!==year||wall.getUTCMonth()!==month||wall.getUTCDate()!==day||wall.getUTCHours()!==hour||wall.getUTCMinutes()!==minute)return null;
  // Date-only closings are treated as end of that IST day so expiry stays conservative; timeVerified records the assumption.
  const iso=hasTime?new Date(Date.UTC(year,month,day,hour-5,minute-30)).toISOString():new Date(Date.UTC(year,month,day,23-5,59-30)).toISOString();
  return {dateLabel:`${String(day).padStart(2,"0")}/${String(month+1).padStart(2,"0")}/${year}`,iso,timeVerified:hasTime};
}

export function isExpired(closingAt: string | null, now = new Date()): boolean {
  return closingAt ? new Date(closingAt).getTime() < now.getTime() : false;
}

export function withinLookback(publishedAt: string | null, days: number, now = new Date()): boolean {
  if (!publishedAt) return true;
  const age = now.getTime() - new Date(publishedAt).getTime();
  return age >= 0 && age <= days * 86_400_000;
}
